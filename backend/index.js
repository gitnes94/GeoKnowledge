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

const app = express()

// CORS: bara frontenden får anropa API:t från en webbläsare. Anrop från
// andra webbplatser stoppas av webbläsaren. Samma adress som auth.js
// skickar tillbaka användaren till efter inloggningen.
function allowedOrigins() {
    const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
    // Lokalt svarar Vite på både localhost och 127.0.0.1 – godta båda
    const local = frontend.match(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)
    if (local) {
        const port = local[2] || ''
        return [`http://localhost${port}`, `http://127.0.0.1${port}`]
    }
    return [frontend]
}

// Render skickar trafiken via en proxy. Då räknas https som rätt protokoll,
// vilket Google-inloggningen behöver för att bygga callback-adressen.
app.set('trust proxy', 1)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors({ origin: allowedOrigins() }))
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
