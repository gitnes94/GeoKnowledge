const express = require('express');
const router = express.Router();
const pool = require('./db');
const { XP_PER_CORRECT } = require('./xp');
const { optionalAuth } = require('./jwt');
const { buildRankings } = require('./ranking');

// Så många frågor man måste ha svarat på för att komma med på listorna för
// andel rätt. Annars hamnar den som spelat ett enda quiz med 10/10 (100 %)
// före den som har 980 rätt av 1 000. 30 frågor = tre vanliga quiz.
const MIN_ANSWERS = 30;

// Alla topplistor och (för den inloggade) ens egen placering.
// Själva rankningen – bäst först, och vid lika den som nådde resultatet först –
// görs i ranking.js. Där behöver resultaten gås igenom i den ordning de
// sparades, därför hämtas de här i stället för att summeras i SQL.
//
// Resultaten och spelarnas namn hämtas i EN fråga (JOIN). Med två separata
// frågor kunde ett konto tas bort mellan dem, och då fanns resultat vars
// spelare saknades – sidan kraschade på ett namn som var undefined.
async function getRankings() {
    const [rows] = await pool.query(
        `SELECT r.id, r.user_id, r.quiz_type, r.correct_count, r.total, r.bonus_xp,
                u.username, u.picture_url
         FROM results r
         JOIN users u ON u.id = r.user_id
         ORDER BY r.id`
    );
    const usersById = new Map(rows.map((row) => [Number(row.user_id), row]));
    return buildRankings(rows, usersById, { minAnswers: MIN_ANSWERS, xpPerCorrect: XP_PER_CORRECT });
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
             ORDER BY answered DESC, MIN(r.id) ASC
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

// GET /api/leaderboard – alla topplistor (topp 10 på varje).
// Går att se utan inloggning. Är man inloggad kommer även "me" med: ens egen
// placering på varje lista, så att sidan kan visa den även utanför topp 10.
router.get('/', optionalAuth, async (req, res) => {
    try {
        const [rankings, stats] = await Promise.all([getRankings(), getStats()]);
        const { lists } = rankings;

        return res.json({
            // Gränsen för listorna med andel rätt, så att sidan kan förklara den
            minAnswers: MIN_ANSWERS,
            contour: lists.contour,
            flags: lists.flags,
            capitals: lists.capitals,
            geoMaster: lists.geoMaster,
            allQuizzes: lists.allQuizzes,
            xp: lists.xp,
            quizCount: lists.quizCount,
            stats,
            // null för den som inte är inloggad
            me: req.user ? rankings.placementOf(req.user.id) : null,
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
