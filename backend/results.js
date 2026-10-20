const express = require('express');
const router = express.Router();
const pool = require('./db');

// Tillåtna värden – samma som frontenden använder
const QUIZ_TYPES = ['shape', 'flag'];
const REGIONS = ['World', 'Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];

// POST /api/results – sparar ett quizresultat för den inloggade användaren
router.post('/', async (req, res) => {
    const { quiz_type, region, correct_count, total } = req.body;

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

    try {
        // 2. Spara. user_id tas från token – ALDRIG från req.body
        const [result] = await pool.query(
            'INSERT INTO results (user_id, quiz_type, region, correct_count, total) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, quiz_type, region, correct_count, total]
        );

        // 3. Svara med det sparade resultatet
        return res.status(201).json({
            message: 'Result saved.',
            result: {
                id: result.insertId,
                user_id: req.user.id,
                quiz_type,
                region,
                correct_count,
                total
            }
        });
    } catch (err) {
        console.error('Database error while saving result:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Could not save result.' });
    }
});

module.exports = router;