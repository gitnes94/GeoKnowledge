const express = require('express');
const router = express.Router();
const pool = require('./db');
const { XP_PER_CORRECT } = require('./xp');
const { optionalAuth } = require('./jwt');
const { buildMe } = require('./leaderboardMe');

// Så många frågor man måste ha svarat på för att komma med på listorna för
// andel rätt. Annars hamnar den som spelat ett enda quiz med 10/10 (100 %)
// före den som har 980 rätt av 1 000. 30 frågor = tre vanliga quiz.
const MIN_ANSWERS = 30;

// Funktion för att hämta topplista baserat på träffsäkerhet (procent rätt).
// Om 'quizType' skickas med, hämtas listan bara för den typen, annars för alla.
// Bara spelare som har svarat på minst MIN_ANSWERS frågor (av den typen) kommer med.
async function getAccuracyLeaderboard(quizType) {
    const filter = quizType ? 'WHERE r.quiz_type = ?' : '';
    const params = quizType ? [quizType, MIN_ANSWERS] : [MIN_ANSWERS];

    // Hämtar data från databasen: summerar totala antal rätt och totala antal frågor per användare.
    // Sorterar sedan resultatet med bäst träffsäkerhet (kvot) högst upp.
    const [rows] = await pool.query(
        `
        SELECT
            u.id AS user_id,
            u.username,
            u.picture_url,
            SUM(r.correct_count) AS correct_answers,
            SUM(r.total) AS total_questions
        FROM results r
        JOIN users u ON u.id = r.user_id
        ${filter}
        GROUP BY u.id, u.username, u.picture_url
        HAVING SUM(r.total) >= ?
        ORDER BY
            SUM(r.correct_count) / SUM(r.total) DESC,
            u.username ASC
        LIMIT 10
        `,
        params
    );

    let previous = null;
    let previousPlace = 0;
    // Går igenom varje rad för att bygga listan och räkna ut vilken placering användaren får
    return rows.map((row, index) => {
        const result = {
            userId: Number(row.user_id),
            username: row.username,
            // Profilbilden från Google (null om den saknas), så att spelare
            // med samma namn går att skilja åt på topplistan
            pictureUrl: row.picture_url ?? null,
            correctAnswers: Number(row.correct_answers),
            totalQuestions: Number(row.total_questions),
        };

        // Kollar om nuvarande användare har exakt samma andel rätt som användaren ovanför (delad placering)        
        const isTie = previous !== null &&
            result.correctAnswers * previous.totalQuestions ===
            previous.correctAnswers * result.totalQuestions;

        const place = isTie ? previousPlace : index + 1;

        previous = result;
        previousPlace = place;

        // Returnerar det färdiga objektet med placering och uträknad procent
        return {
            place,
            ...result,
            percentage: Number(
                ((result.correctAnswers / result.totalQuestions) * 100).toFixed(2)
            ),
        };
    });
}
// Generell hjälpfunktion för att bygga topplistor som baseras på en specifik poäng (t.ex. XP eller antal spelade quiz)
async function getMetricLeaderboard(sql, params, scoreField) {
    const [rows] = await pool.query(sql, params);

    let previousScore = null;
    let previousPlace = 0;

    return rows.map((row, index) => {
        const score = Number(row[scoreField]);
        const isTie = previousScore !== null && score === previousScore;
        const place = isTie ? previousPlace : index + 1;

        previousScore = score;
        previousPlace = place;

        return {
            place,
            userId: Number(row.user_id),
            username: row.username,
            pictureUrl: row.picture_url ?? null,
            [scoreField]: score,
        };
    });
}
// Siffrorna i den gröna rubrikrutan: hur många som spelar, hur många frågor
// som besvarats totalt, och veckans flitigaste (flest besvarade frågor senaste 7 dagarna).
async function getStats() {
    const [[totals], [weekRows]] = await Promise.all([
        pool.query('SELECT COUNT(DISTINCT user_id) AS players, COALESCE(SUM(total), 0) AS answered FROM results'),
        pool.query(
            `SELECT u.id AS user_id, u.username, u.picture_url, SUM(r.total) AS answered
             FROM results r
             JOIN users u ON u.id = r.user_id
             WHERE r.created_at >= NOW() - INTERVAL 7 DAY
             GROUP BY u.id, u.username, u.picture_url
             ORDER BY answered DESC, u.username ASC
             LIMIT 1`
        ),
    ]);
    const week = weekRows[0];
    return {
        players: Number(totals[0].players),
        answered: Number(totals[0].answered),
        weekTop: week
            ? { userId: Number(week.user_id), username: week.username, pictureUrl: week.picture_url ?? null, answered: Number(week.answered) }
            : null,
    };
}

// Den inloggades placering på varje lista, även utanför topp 10 (se leaderboardMe.js)
async function getMe(userId) {
    const [rows] = await pool.query(
        `SELECT user_id, quiz_type,
                SUM(correct_count) AS correct, SUM(total) AS total,
                SUM(bonus_xp) AS bonus, COUNT(*) AS quizzes
         FROM results
         GROUP BY user_id, quiz_type`
    );
    return buildMe(userId, rows, { minAnswers: MIN_ANSWERS, xpPerCorrect: XP_PER_CORRECT });
}

// API-endpoint (GET /api/leaderboard) som hämtar och returnerar alla topplistor.
// Går att se utan inloggning. Är man inloggad kommer även "me" med: ens egen
// placering på varje lista, så att sidan kan visa den även utanför topp 10.
router.get('/', optionalAuth, async (req, res) => {
    try {
        // Promise.all används för att köra alla databasfrågor parallellt (samtidigt).
        const [
            contour,
            flags,
            capitals,
            geoMaster,
            allQuizzes,
            xp,
            quizCount,
            stats,
            me,
        ] = await Promise.all([
            // Hämtar träffsäkerhetslistor för specifika quiz
            getAccuracyLeaderboard('shape'),
            getAccuracyLeaderboard('flag'),
            getAccuracyLeaderboard('capital'),
            getAccuracyLeaderboard('geomaster'),
            getAccuracyLeaderboard(null),
            // Bygger och hämtar XP-topplistan (antal rätt multiplicerat med XP-konstanten)
            getMetricLeaderboard(
                `
                SELECT
                    u.id AS user_id,
                    u.username,
                    u.picture_url,
                    COALESCE(SUM(r.correct_count), 0) * ? + COALESCE(SUM(r.bonus_xp), 0) AS xp
                FROM results r
                JOIN users u ON u.id = r.user_id
                GROUP BY u.id, u.username, u.picture_url
                ORDER BY xp DESC, u.username ASC
                LIMIT 10
                `,
                [XP_PER_CORRECT],
                'xp'
            ),
            // Bygger och hämtar topplistan för flest spelade quiz
            getMetricLeaderboard(
                `
                SELECT
                    u.id AS user_id,
                    u.username,
                    u.picture_url,
                    COUNT(*) AS quiz_count
                FROM results r
                JOIN users u ON u.id = r.user_id
                GROUP BY u.id, u.username, u.picture_url
                ORDER BY quiz_count DESC, u.username ASC
                LIMIT 10
                `,
                [],
                'quiz_count'
            ),
            getStats(),
            req.user ? getMe(req.user.id) : null,
        ]);
        // Skickar tillbaka all data snyggt paketerat i ett enda JSON-objekt till frontend
        return res.json({
            // Gränsen för listorna med andel rätt, så att sidan kan förklara den
            minAnswers: MIN_ANSWERS,
            contour,
            flags,
            capitals,
            geoMaster,
            allQuizzes,
            xp,
            quizCount,
            stats,
            // null för den som inte är inloggad
            me,
        });
    } catch (err) {
        console.error('Database error while fetching leaderboard:', err);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Could not fetch leaderboard.',
        });
    }
});

module.exports = router;