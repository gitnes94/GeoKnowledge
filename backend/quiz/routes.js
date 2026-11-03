// Quizet körs på servern: servern skapar frågorna, sparar facit, tar tiden
// och rättar varje svar. Klienten får aldrig veta rätt svar innan den har svarat.
//
//   POST /api/quiz/start         – skapar ett quiz och skickar frågorna (utan facit)
//   POST /api/quiz/:id/answer    – rättar ett svar
//   POST /api/quiz/:id/finish    – avslutar quizet och sparar resultatet
//
// Gäster kan också spela. Deras quiz rättas på samma sätt men sparas inte.

const crypto = require('node:crypto');
const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const pool = require('../db');
const { optionalAuth } = require('../jwt');
const { TIME_LIMIT_SECONDS } = require('../xp');
const { REGIONS, countriesById, shapeOf, flagDataUrl } = require('./data');
const { createQuestions, createGeoMasterQuestions, mapView, LIVES } = require('./questions');
const { gradeAnswer, summarize } = require('./grading');
const { saveQuizResult } = require('./saveResult');

const router = express.Router();

const QUIZ_TYPES = ['shape', 'flag', 'capital', 'geomaster'];

// Ett id på ett land, t.ex. 'SWE'
const COUNTRY_ID = /^[A-Z0-9-]{2,10}$/;

// Gamla quiz tas bort efter ett dygn. Det räcker att städa då och då.
const SESSION_MAX_AGE_HOURS = 24;
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = 0;

function cleanUpOldSessions() {
    if (Date.now() - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = Date.now();
    pool.query('DELETE FROM quiz_sessions WHERE created_at < NOW() - INTERVAL ? HOUR', [SESSION_MAX_AGE_HOURS])
        .catch((err) => console.error('Kunde inte städa gamla quiz:', err.message));
}

// Högst 40 nya quiz per 10 minuter och användare (gäster räknas per IP-adress).
// Varje quiz blir en rad i databasen, så det ska inte gå att skapa hur många som helst.
const startLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 40,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip)),
    message: { error: 'Too Many Requests', message: 'Du har startat väldigt många quiz. Vänta en stund.' },
});

function badRequest(res, message) {
    return res.status(400).json({ error: 'Bad Request', message });
}

// Frågan som den skickas till klienten: allt som behövs för att visa den,
// men inte vilket land som är rätt svar.
//   shape   – landets kontur (GeoJSON-geometri, utan namn eller id)
//   flag    – flaggan som data-adress (landskoden syns inte)
//   capital – huvudstadens namn
function toClientQuestion(question) {
    const country = countriesById.get(question.country_id);
    const clientQuestion = {
        kind: question.kind,
        options: question.options.map((id) => ({ id, name: countriesById.get(id).name_sv })),
    };
    if (question.kind === 'shape') clientQuestion.shape = shapeOf(country.id);
    if (question.kind === 'flag') clientQuestion.flag = flagDataUrl(country.id);
    if (question.kind === 'capital') clientQuestion.capital = country.capital;
    return clientQuestion;
}

// Gör om en rad från quiz_sessions till ett vanligt objekt.
// MySQL ger JSON-kolumner som objekt, men vissa versioner ger text.
function toSession(row) {
    const parse = (value) => (typeof value === 'string' ? JSON.parse(value) : value);
    return {
        ...row,
        questions: parse(row.questions),
        answers: parse(row.answers),
        started_at: Number(row.started_at),
        finished_at: row.finished_at === null ? null : Number(row.finished_at),
    };
}

// Hämtar ett quiz och låser raden tills transaktionen är klar (FOR UPDATE).
// Då kan inte två svar på samma fråga rättas samtidigt.
// Svar: sessionen, eller ett fel { status, message }
async function lockSession(connection, id, req) {
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) {
        return { error: { status: 404, message: 'Quizet finns inte.' } };
    }
    const [rows] = await connection.query('SELECT * FROM quiz_sessions WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
        return { error: { status: 404, message: 'Quizet finns inte.' } };
    }
    const session = toSession(rows[0]);

    // Quizets id är hemligt och fungerar som en nyckel. Är man inloggad som
    // någon annan än den som startade quizet får man inte röra det.
    if (req.user && session.user_id !== null && session.user_id !== req.user.id) {
        return { error: { status: 404, message: 'Quizet finns inte.' } };
    }
    return { session };
}

// Kör fn i en transaktion med det låsta quizet. Sköter commit, rollback och
// att anslutningen lämnas tillbaka.
async function withLockedSession(req, res, fn) {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const { session, error } = await lockSession(connection, req.params.id, req);
        if (error) {
            await connection.rollback();
            return res.status(error.status).json({ error: 'Error', message: error.message });
        }

        const response = await fn(connection, session);
        await connection.commit();
        return res.status(response.status ?? 200).json(response.body);
    } catch (err) {
        if (connection) await connection.rollback().catch(() => {});
        console.error('Databasfel i quizet:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Något gick fel i quizet.' });
    } finally {
        if (connection) connection.release();
    }
}

// POST /api/quiz/start
//   body: { quiz_type, region, timed?, seen_ids? }
//   seen_ids – länder användaren redan fått (från webbläsaren). De väljs sist.
router.post('/start', optionalAuth, startLimiter, async (req, res) => {
    const { quiz_type, region, timed = false, seen_ids = [] } = req.body ?? {};

    if (!QUIZ_TYPES.includes(quiz_type)) return badRequest(res, 'Invalid quiz_type.');
    if (!REGIONS.includes(region)) return badRequest(res, 'Invalid region.');
    if (typeof timed !== 'boolean') return badRequest(res, 'timed must be true or false.');
    if (timed && quiz_type === 'geomaster') return badRequest(res, 'GeoMaster cannot be timed.');
    if (!Array.isArray(seen_ids) || seen_ids.length > 300 ||
        !seen_ids.every((id) => typeof id === 'string' && COUNTRY_ID.test(id))) {
        return badRequest(res, 'seen_ids must be a list of country ids.');
    }

    const isGeoMaster = quiz_type === 'geomaster';
    const questions = isGeoMaster
        ? createGeoMasterQuestions(region)
        : createQuestions(quiz_type, region, seen_ids);

    const session = {
        id: crypto.randomUUID(),
        user_id: req.user ? req.user.id : null,
        quiz_type,
        region,
        time_limit: timed ? TIME_LIMIT_SECONDS : null,
        lives: isGeoMaster ? LIVES : null,
        questions,
        started_at: Date.now(),
    };

    try {
        await pool.query(
            `INSERT INTO quiz_sessions (id, user_id, quiz_type, region, time_limit, lives, questions, answers, started_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?)`,
            [session.id, session.user_id, quiz_type, region, session.time_limit, session.lives,
                JSON.stringify(questions), session.started_at]
        );
    } catch (err) {
        // Kontot har tagits bort (t.ex. på en annan enhet) men token gäller fortfarande
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(401).json({ error: 'Unauthorized', message: 'Kontot finns inte längre. Logga ut och in igen.' });
        }
        console.error('Kunde inte skapa quiz:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Kunde inte starta quizet.' });
    }

    cleanUpOldSessions();

    return res.status(201).json({
        session_id: session.id,
        quiz_type,
        region,
        time_limit: session.time_limit,
        lives: session.lives,
        // Sparas resultatet när quizet är klart? Bara för inloggade.
        will_save: session.user_id !== null,
        // Det fanns en inloggning, men den har gått ut
        login_expired: req.authExpired === true,
        // GeoMaster: området kartan ska visa (resvägen skickas inte)
        map_view: isGeoMaster ? mapView(questions.map((question) => question.country_id)) : undefined,
        questions: questions.map(toClientQuestion),
    });
});

// POST /api/quiz/:id/answer
//   body: { index, option_id }
//   svar: { correct, correct_id, option_id, done }
//   Skickas förra frågan igen svarar servern med det redan sparade svaret.
router.post('/:id/answer', optionalAuth, (req, res) =>
    withLockedSession(req, res, async (connection, session) => {
        const { index, option_id } = req.body ?? {};
        const graded = gradeAnswer(session, index, option_id, Date.now());
        if (graded.error) {
            return { status: graded.error.status, body: { error: 'Error', message: graded.error.message } };
        }

        // JSON_ARRAY_APPEND lägger till svaret sist i listan. Var frågan redan
        // besvarad (replay) finns svaret redan sparat.
        if (!graded.replay) {
            await connection.query(
                "UPDATE quiz_sessions SET answers = JSON_ARRAY_APPEND(answers, '$', CAST(? AS JSON)) WHERE id = ?",
                [JSON.stringify(graded.answer), session.id]
            );
        }

        return {
            body: {
                correct: graded.correct,
                correct_id: graded.correct_id,
                option_id: graded.option_id,
                done: graded.done,
            },
        };
    })
);

// POST /api/quiz/:id/finish
//   svar: { result, saved, xp, country_ids }
//   country_ids – länderna i quizet, nu när det är slut (för "redan sedda" i webbläsaren)
router.post('/:id/finish', optionalAuth, (req, res) =>
    withLockedSession(req, res, async (connection, session) => {
        if (session.finished_at !== null) {
            return { status: 409, body: { error: 'Conflict', message: 'Quizet är redan avslutat.' } };
        }

        const summary = summarize(session);

        let saved = null;
        if (session.user_id !== null) {
            saved = await saveQuizResult(connection, session.user_id, summary);
        }

        await connection.query(
            'UPDATE quiz_sessions SET finished_at = ?, result_id = ? WHERE id = ?',
            [Date.now(), saved ? saved.result.id : null, session.id]
        );

        return {
            body: {
                result: {
                    correct_count: summary.correct_count,
                    total: summary.total,
                    completed: summary.completed,
                    timed: summary.timed,
                    seconds_left: summary.seconds_left,
                },
                saved: saved !== null,
                xp: saved ? saved.xp : null,
                country_ids: summary.country_ids,
            },
        };
    })
);

module.exports = router;
