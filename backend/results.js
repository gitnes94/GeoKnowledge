const express = require('express');
const router = express.Router();
const pool = require('./db');
const { xpForResult, getLevel, getUserXp } = require('./xp');

// Tillåtna värden – samma som frontenden använder
const QUIZ_TYPES = ['shape', 'flag'];
const REGIONS = ['World', 'Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];

// POST /api/results – sparar ett quizresultat för den inloggade användaren.
// requireAuth (i jwt.js) körs före den här routen och sätter req.user.
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
        // 2. Hämta XP före sparningen, så att vi kan se om användaren går upp en nivå
        const xpBefore = await getUserXp(req.user.id);

        // 3. Spara. user_id tas från token – ALDRIG från req.body
        const [result] = await pool.query(
            'INSERT INTO results (user_id, quiz_type, region, correct_count, total) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, quiz_type, region, correct_count, total]
        );

        // 4. Räkna ut XP efter sparningen
        const xpGained = xpForResult(correct_count);
        const xpTotal = xpBefore + xpGained;
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
                total
            },
            xp: {
                gained: xpGained,
                total: xpTotal,
                leveledUp: progress.level > levelBefore,
                ...progress
            }
        });
    } catch (err) {
        console.error('Database error while saving result:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Could not save result.' });
    }
});

// Kolumnerna som skickas tillbaka till frontenden
const RESULT_COLUMNS = 'id, quiz_type, region, correct_count, total, created_at';

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
