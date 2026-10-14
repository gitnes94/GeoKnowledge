const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('/backend/db');
const generateToken = require('/backend/jwt');

// 1. Configure the Google OAuth2 Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const username = profile.displayName;
        const providerId = profile.id;

        // 2. Check if user already exists in MySQL
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );

        let user;

        if (existingUsers.length > 0) {
            // User exists! Use existing record
            user = existingUsers[0];
        } else {
            // 3. User does not exist - create a new user
            const [result] = await pool.query(
                'INSERT INTO users (username, email, password_hash, provider) VALUES (?, ?, NULL, ?)',
                [username, email, 'google'] // password_hash is null for social login
            );

            user = {
                id: result.insertId,
                username,
                email,
                provider: 'google'
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
        
        // 4. Generate JWT for the session
        const token = generateToken(req.user);

        // 5. Send token back to the Vue frontend
        res.redirect(`http://localhost:5173/auth/success?token=${token}`);
    }
);

module.exports = router;