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
const { requireAuth } = require('./jwt');


const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/results', requireAuth, resultsRoutes)
app.use('/api/progress', requireAuth, progressRoutes)
app.use('/api/leaderboard', leaderboardRoutes);

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
