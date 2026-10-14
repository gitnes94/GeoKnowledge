const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('/backend/db');

// POST /api/users/register
router.post('/register', async (req, res) => {
    const { username, email, password, provider = 'local' } = req.body;

    // 1. Validate required fields
    if (!username || !email) {
        return res.status(400).json({ 
            error: 'Bad Request', 
            message: 'Username and email are required.' 
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
            'INSERT INTO users (username, email, password_hash, provider) VALUES (?, ?, ?, ?)',
            [username, email, passwordHash, provider]
        );

        // 5. Return success response with 201 Created status
        return res.status(201).json({
            message: 'User registered successfully!',
            userId: result.insertId,
            user: { username, email, provider }
        });

    } catch (err) {
        console.error('Database error during user registration:', err);
        return res.status(500).json({ 
            error: 'Internal Server Error', 
            message: 'An error occurred while creating the user.' 
        });
    }
});

module.exports = router;