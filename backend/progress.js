const express = require('express');
const router = express.Router();
const { getUserXp, getLevel } = require('./xp');

// GET /api/progress – den inloggade användarens XP och nivå.
// requireAuth (i jwt.js) körs före den här routen och sätter req.user.
router.get('/', async (req, res) => {
    try {
        const xp = await getUserXp(req.user.id);
        return res.json({ xp, ...getLevel(xp) });
    } catch (err) {
        console.error('Database error while fetching progress:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Could not fetch progress.' });
    }
});

module.exports = router;
