require('dotenv').config()

const express = require('express')
const cors = require('cors')

const pool = require('./db')
const migrate = require('./migrate')
const authRoutes = require('./auth')
const usersRoutes = require('./users')
const resultsRoutes = require('./results');
const progressRoutes = require('./progress');
const leaderboardRoutes = require('./leaderboard');
const trophiesRoutes = require('./trophies');
const quizRoutes = require('./quiz/routes');
const { requireAuth } = require('./jwt');
const { allowedOrigins } = require('./corsOrigins');

const app = express()

// Render skickar trafiken via en proxy. Då räknas https som rätt protokoll,
// vilket Google-inloggningen behöver för att bygga callback-adressen.
app.set('trust proxy', 1)

// API:t tar bara emot JSON. Formulärdata (express.urlencoded) läses inte,
// eftersom inget i appen använder det – då kan inte ett formulär på en annan
// webbplats skicka anrop som servern bryr sig om (se CORS ovan).
app.use(express.json())
// Bara frontenden får läsa API:ts svar i en webbläsare (se corsOrigins.js)
app.use(cors({ origin: allowedOrigins(process.env.FRONTEND_URL) }))
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/results', requireAuth, resultsRoutes)
app.use('/api/progress', requireAuth, progressRoutes)
app.use('/api/trophies', requireAuth, trophiesRoutes)
app.use('/api/leaderboard', leaderboardRoutes);
// Quizet – går att spela utan inloggning, därför ingen requireAuth här
app.use('/api/quiz', quizRoutes);

app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1')
        res.json({
            status: 'ok',
            database: 'connected'
        })
    } catch (error) {
        console.error('Health check failed:', error)
        res.status(500).json({
            status: 'error',
            database: 'unavailable'
        })
    }
})

const port = process.env.PORT || 3000

// Uppdatera databasen först (t.ex. nya kolumner), starta sedan servern.
// Går det inte – t.ex. för att Docker inte är igång – startar servern ändå,
// så att felet syns i loggen och /api/health.
migrate()
    .catch((error) => console.error('Kunde inte uppdatera databasen:', error.message))
    .finally(() => {
        app.listen(port, () => {
            console.log(`Servern körs på http://localhost:${port}`)
        })
    })
