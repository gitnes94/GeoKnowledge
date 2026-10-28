const express = require('express');
const router = express.Router();
const pool = require('./db');
const { getUserXp, getLevel } = require('./xp');

// Quiztyperna som har troféer – samma som i results.js
const QUIZ_TYPES = ['shape', 'flag', 'capital'];

// GET /api/trophies – det som behövs för att räkna ut den inloggades troféer.
// Vilka troféer som finns och när de låses upp bestäms i frontenden
// (services/trophies.js). Backenden levererar bara siffrorna:
//   {
//     level: 4,
//     perfect: { shape: 2, flag: 0, capital: 1 },        // antal felfria quiz
//     correct: { shape: ['SWE', ...], flag: [...], ... } // länder rätt minst en gång
//   }
// requireAuth (i jwt.js) körs före den här routen och sätter req.user.
router.get('/', async (req, res) => {
    try {
        const xp = await getUserXp(req.user.id);

        // Felfria quiz: alla frågor rätt
        const [perfectRows] = await pool.query(
            `SELECT quiz_type, COUNT(*) AS count
             FROM results
             WHERE user_id = ? AND correct_count = total
             GROUP BY quiz_type`,
            [req.user.id]
        );

        const [countryRows] = await pool.query(
            'SELECT quiz_type, country_id FROM correct_countries WHERE user_id = ?',
            [req.user.id]
        );

        // Gör om raderna till ett objekt per quiztyp, med 0 / [] som standard
        const perfect = {};
        const correct = {};
        for (const type of QUIZ_TYPES) {
            perfect[type] = 0;
            correct[type] = [];
        }
        for (const row of perfectRows) {
            if (row.quiz_type in perfect) perfect[row.quiz_type] = Number(row.count);
        }
        for (const row of countryRows) {
            if (row.quiz_type in correct) correct[row.quiz_type].push(row.country_id);
        }

        return res.json({ level: getLevel(xp).level, perfect, correct });
    } catch (err) {
        console.error('Database error while fetching trophies:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Could not fetch trophies.' });
    }
});

module.exports = router;
