const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./db');
const { requireAuth } = require('./jwt');
const { validateUsername } = require('./username');

// POST /api/users/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // 1. Validate required fields
    if (!username || !email || !password) {
        return res.status(400).json({ 
            error: 'Bad Request', 
            message: 'Username, email and password are required.' 
        });
    }

    try {
        // 2. Check if user already exists by email
        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE email = ?', 
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ 
                error: 'Conflict', 
                message: 'A user with this email already exists.' 
            });
        }

        // 3. Hash password if it's a local registration
        let passwordHash = null;
        if (password) {
            const saltRounds = 10;
            passwordHash = await bcrypt.hash(password, saltRounds);
        }

        // 4. Insert the new user into the database
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash]
        );

        // 5. Return success response with 201 Created status
        return res.status(201).json({
            message: 'User registered successfully!',
            userId: result.insertId,
            user: { username, email }
        });

    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Conflict',
                message: 'A user with this email already exists.'
            });
        }
        console.error('Database error during user registration:', err);
        return res.status(500).json({ 
            error: 'Internal Server Error', 
            message: 'An error occurred while creating the user.' 
        });
    }
});

// PUT /api/users/me – byter den inloggades visningsnamn.
//   body: { username: 'Nytt namn' }
//   svar: { id, username, picture_url } – samma som GET /api/auth/me
//
// Namnet ligger kvar även efter nästa inloggning med Google, eftersom
// inloggningen bara uppdaterar profilbilden (se auth.js).
router.put('/me', requireAuth, async (req, res) => {
    const { username, error } = validateUsername(req.body?.username);
    if (error) {
        return res.status(400).json({ error: 'Bad Request', message: error });
    }

    try {
        // Två spelare får inte ha samma namn, annars går de inte att skilja åt
        // på topplistan. Databasens jämförelse struntar i stora/små bokstäver
        // och accenter, så 'anna' och 'Ånna' räknas som samma namn.
        const [taken] = await pool.query(
            'SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1',
            [username, req.user.id]
        );
        if (taken.length > 0) {
            return res.status(409).json({ error: 'Conflict', message: 'Namnet är redan upptaget. Välj ett annat.' });
        }

        const [result] = await pool.query('UPDATE users SET username = ? WHERE id = ?', [username, req.user.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Kontot finns inte.' });
        }

        const [users] = await pool.query('SELECT id, username, picture_url FROM users WHERE id = ?', [req.user.id]);
        return res.json(users[0]);
    } catch (err) {
        console.error('Kunde inte byta namn:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Kunde inte byta namn just nu.' });
    }
});

// DELETE /api/users/me – tar bort den inloggades konto.
// Resultat, troféer och pågående quiz tas bort automatiskt av databasen
// (ON DELETE CASCADE på results, correct_countries och quiz_sessions).
// Loggar man in med Google igen skapas ett nytt, tomt konto.
//   svar: 204 utan innehåll
router.delete('/me', requireAuth, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.user.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Kontot finns inte.' });
        }
        return res.status(204).end();
    } catch (err) {
        console.error('Kunde inte ta bort konto:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Kunde inte ta bort kontot just nu.' });
    }
});

module.exports = router;
