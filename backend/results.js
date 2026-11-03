const express = require('express');
const router = express.Router();
const pool = require('./db');

// Resultat sparas inte här längre. De sparas när ett quiz avslutas
// (POST /api/quiz/:id/finish i quiz/routes.js), utifrån serverns egen rättning.
// Förut kunde klienten skicka in vilket resultat som helst hit.

// Kolumnerna som skickas tillbaka till frontend
const RESULT_COLUMNS = 'id, quiz_type, region, correct_count, total, bonus_xp, timed, created_at';

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
