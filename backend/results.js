const express = require('express');
const router = express.Router();
const pool = require('./db');
const { xpForResult, comboBonus, getLevel, getUserXp } = require('./xp');

// Tillåtna värden – samma som frontenden använder
const QUIZ_TYPES = ['shape', 'flag', 'capital', 'geomaster'];

// Frågetyperna i GeoMaster. Varje fråga där räknas mot sin egen typs mästartroféer.
const QUESTION_TYPES = ['shape', 'flag', 'capital'];
const REGIONS = ['World', 'Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];

// POST /api/results – sparar ett quizresultat för den inloggade användaren.
// requireAuth (i jwt.js) körs före den här routen och sätter req.user.
//
// answers (valfritt) är svaren i ordning, t.ex. [true, true, false, ...].
// Den behövs för att räkna ut combo-bonusen. Utan answers blir bonusen 0.
//
// country_ids (valfritt) är landet som var rätt svar på varje fråga, i samma
// ordning som answers, t.ex. ['SWE', 'FRA', ...]. De länder man svarade rätt
// på sparas i correct_countries och används för mästartroféerna.
//
// question_types (bara GeoMaster) är frågetypen för varje fråga, t.ex.
// ['flag', 'shape', ...]. Då sparas varje land under sin frågetyp i stället
// för under 'geomaster', så att en rätt flaggfråga räknas mot flaggtroféerna.
router.post('/', async (req, res) => {
    const { quiz_type, region, correct_count, total, answers, country_ids, question_types } = req.body;

    // 1. Validera det som skickats in
    if (!QUIZ_TYPES.includes(quiz_type)) {
        return res.status(400).json({ error: 'Bad Request', message: 'Invalid quiz_type.' });
    }
    if (!REGIONS.includes(region)) {
        return res.status(400).json({ error: 'Bad Request', message: 'Invalid region.' });
    }
    if (!Number.isInteger(total) || total < 1 || total > 50) {
        return res.status(400).json({ error: 'Bad Request', message: 'total must be an integer between 1 and 50.' });
    }
    if (!Number.isInteger(correct_count) || correct_count < 0 || correct_count > total) {
        return res.status(400).json({ error: 'Bad Request', message: 'correct_count must be between 0 and total.' });
    }
    // answers måste stämma med resultatet, annars kan man fuska till sig bonus
    if (answers !== undefined) {
        const isValidList =
            Array.isArray(answers) &&
            answers.length === total &&
            answers.every((answer) => typeof answer === 'boolean');
        if (!isValidList || answers.filter(Boolean).length !== correct_count) {
            return res.status(400).json({ error: 'Bad Request', message: 'answers must match total and correct_count.' });
        }
    }

    // country_ids kräver answers (annars vet vi inte vilka som var rätt),
    // och varje id måste se ut som en landskod, t.ex. 'SWE'
    if (country_ids !== undefined) {
        const isValidIds =
            Array.isArray(answers) &&
            Array.isArray(country_ids) &&
            country_ids.length === total &&
            country_ids.every((id) => typeof id === 'string' && /^[A-Z0-9-]{2,10}$/.test(id));
        if (!isValidIds) {
            return res.status(400).json({ error: 'Bad Request', message: 'country_ids must match answers.' });
        }
    }
    // GeoMaster måste skicka frågetyperna tillsammans med länderna – andra quiz får inte
    const needsTypes = quiz_type === 'geomaster' && country_ids !== undefined;
    if (needsTypes || question_types !== undefined) {
        const isValidTypes =
            needsTypes &&
            Array.isArray(question_types) &&
            question_types.length === total &&
            question_types.every((type) => QUESTION_TYPES.includes(type));
        if (!isValidTypes) {
            return res.status(400).json({ error: 'Bad Request', message: 'question_types must match country_ids.' });
        }
    }

    // Bonusen räknas ut här i backenden – frontenden får inte bestämma XP:n själv
    const bonusXp = answers ? comboBonus(answers) : 0;

    // En egen anslutning till databasen, för transaktionen nedan
    let connection;

    try {
        // 2. Hämta XP före sparningen, så att vi kan se om användaren går upp en nivå
        const xpBefore = await getUserXp(req.user.id);

        // 3. Spara resultatet och länderna i EN transaktion: antingen sparas
        //    allt eller ingenting. Annars kunde resultatet sparas men länderna
        //    misslyckas – då får frontenden ett fel, användaren försöker igen
        //    och resultatet (och XP:n) sparas två gånger.
        //    En transaktion måste köras på en och samma anslutning, därför
        //    getConnection i stället för pool.query.
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // user_id tas från token – ALDRIG från req.body
        const [result] = await connection.query(
            'INSERT INTO results (user_id, quiz_type, region, correct_count, total, bonus_xp) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, quiz_type, region, correct_count, total, bonusXp]
        );

        // 3b. Spara länderna man svarade rätt på. INSERT IGNORE hoppar över
        //     länder som redan finns, så varje land sparas bara en gång.
        if (country_ids) {
            // Frågetypen per land: från question_types i GeoMaster, annars quizets typ
            const rows = country_ids
                .map((id, i) => [req.user.id, question_types ? question_types[i] : quiz_type, id])
                .filter((row, i) => answers[i]);
            if (rows.length > 0) {
                await connection.query(
                    'INSERT IGNORE INTO correct_countries (user_id, quiz_type, country_id) VALUES ?',
                    [rows]
                );
            }
        }

        // 4. Räkna ut XP efter sparningen. Totalen hämtas på nytt från databasen,
        //    så att den stämmer även om två resultat sparas samtidigt.
        const xpGained = xpForResult(correct_count) + bonusXp;
        //    Frågan ställs i transaktionen, så att det nya resultatet räknas med.
        const xpTotal = await getUserXp(req.user.id, connection);

        // 4b. Allt gick bra – spara på riktigt. Först nu syns ändringarna för andra.
        await connection.commit();
        const levelBefore = getLevel(xpBefore).level;
        const progress = getLevel(xpTotal);

        // 5. Svara med det sparade resultatet och den nya XP:n
        return res.status(201).json({
            message: 'Result saved.',
            result: {
                id: result.insertId,
                user_id: req.user.id,
                quiz_type,
                region,
                correct_count,
                total,
                bonus_xp: bonusXp
            },
            xp: {
                gained: xpGained,  // all XP från quizet, inklusive bonus
                bonus: bonusXp,    // varav combo-bonus
                total: xpTotal,
                leveledUp: progress.level > levelBefore,
                ...progress
            }
        });
    } catch (err) {
        // Något gick fel – ångra allt som gjorts i transaktionen
        if (connection) {
            await connection.rollback().catch(() => {});
        }
        console.error('Database error while saving result:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Could not save result.' });
    } finally {
        // Lämna tillbaka anslutningen till poolen, annars tar de till slut slut
        if (connection) {
            connection.release();
        }
    }
});

// Kolumnerna som skickas tillbaka till frontenden
const RESULT_COLUMNS = 'id, quiz_type, region, correct_count, total, bonus_xp, created_at';

// GET /api/results – den inloggade användarens resultat, senaste först
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT ${RESULT_COLUMNS} FROM results WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
            [req.user.id]
        );
        return res.json(rows);
    } catch (err) {
        console.error('Database error while fetching results:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Could not fetch results.' });
    }
});

// GET /api/results/:id – ett enskilt resultat, bara om det tillhör den inloggade
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Bad Request', message: 'Invalid result id.' });
    }

    try {
        // user_id = ? gör att man aldrig kan hämta någon annans resultat
        const [rows] = await pool.query(
            `SELECT ${RESULT_COLUMNS} FROM results WHERE id = ? AND user_id = ?`,
            [id, req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Result not found.' });
        }
        return res.json(rows[0]);
    } catch (err) {
        console.error('Database error while fetching result:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Could not fetch result.' });
    }
});

module.exports = router;
