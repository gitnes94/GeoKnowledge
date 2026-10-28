const express = require('express');
const router = express.Router();
const pool = require('./db');
const { XP_PER_CORRECT } = require('./xp');

// Funktion för att hämta topplista baserat på träffsäkerhet (procent rätt).
// Om 'quizType' skickas med, hämtas listan bara för den typen, annars för alla.
async function getAccuracyLeaderboard(quizType) {
    const filter = quizType ? 'WHERE r.quiz_type = ?' : '';
    const params = quizType ? [quizType] : [];

    // Hämtar data från databasen: summerar totala antal rätt och totala antal frågor per användare.
    // Sorterar sedan resultatet med bäst träffsäkerhet (kvot) högst upp.
    const [rows] = await pool.query(
        `
        SELECT
            u.id AS user_id,
            u.username,
            SUM(r.correct_count) AS correct_answers,
            SUM(r.total) AS total_questions
        FROM results r
        JOIN users u ON u.id = r.user_id
        ${filter}
        GROUP BY u.id, u.username
        HAVING SUM(r.total) > 0
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
            [scoreField]: score,
        };
    });
}
// API-endpoint (GET /api/leaderboard) som hämtar och returnerar alla topplistor
router.get('/', async (req, res) => {
    try {
        // Promise.all används för att köra alla databasfrågor parallellt (samtidigt).
        const [
            contour,
            flags,
            capitals,
            allQuizzes,
            xp,
            quizCount,
        ] = await Promise.all([
            // Hämtar träffsäkerhetslistor för specifika quiz
            getAccuracyLeaderboard('shape'),
            getAccuracyLeaderboard('flag'),
            getAccuracyLeaderboard('capital'),
            getAccuracyLeaderboard(null),
            // Bygger och hämtar XP-topplistan (antal rätt multiplicerat med XP-konstanten)
            getMetricLeaderboard(
                `
                SELECT
                    u.id AS user_id,
                    u.username,
                    COALESCE(SUM(r.correct_count), 0) * ? + COALESCE(SUM(r.bonus_xp), 0) AS xp
                FROM results r
                JOIN users u ON u.id = r.user_id
                GROUP BY u.id, u.username
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
                    COUNT(*) AS quiz_count
                FROM results r
                JOIN users u ON u.id = r.user_id
                GROUP BY u.id, u.username
                ORDER BY quiz_count DESC, u.username ASC
                LIMIT 10
                `,
                [],
                'quiz_count'
            ),
        ]);
        // Skickar tillbaka all data snyggt paketerat i ett enda JSON-objekt till frontend
        return res.json({
            contour,
            flags,
            capitals,
            allQuizzes,
            xp,
            quizCount,
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