const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
const bcrypt = require('bcrypt');
const { createToken, requireAuth } = require('./jwt');

// Configure the Google OAuth2 Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const username = profile.displayName;

        // Check if user already exists in MySQL
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );

        let user;

        if (existingUsers.length > 0) {
            // User exists! Use existing record
            user = existingUsers[0];
        } else {
            // User does not exist - create a new user
            const saltRounds = 10;
            let passwordHash = await bcrypt.hash(crypto.randomUUID(), saltRounds);

            const [result] = await pool.query(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [username, email, passwordHash]
            );

            user = {
                id: result.insertId,
                username,
                email
            };
        }

        // Pass the user object to the next step
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

// Route 1: Trigger Google OAuth login popup/redirect
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// Route 2: Google OAuth Callback (Handles the response from Google)
router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: '/login-failed' }),
    (req, res) => {
        // At this point, req.user contains our database user object (either found or newly created)
        
        // Generate JWT for the session
        const token = createToken(req.user);

        // Send token back to the Vue frontend
        res.redirect(`http://localhost:5173/auth/success?token=${token}`);
    }
);
// Route för att hämta användare från databasen och spara i res
router.get('/me', requireAuth, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, username FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Användaren hittades inte' });
        }

        return res.json({
            id: users[0].id,
            username: users[0].username
        });
    } catch (err) {
        console.error('Kunde inte hämta användarprofil:', err);
        return res.status(500).json({ error: 'Kunde inte hämta användarprofilen' });
    }
});

module.exports = router;