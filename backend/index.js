require('dotenv').config()

const express = require('express')
const cors = require('cors')

const pool = require('./db')
const authRoutes = require('./auth')
const usersRoutes = require('./users')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)

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

app.listen(port, () => {
    console.log(`Servern körs på http://localhost:${port}`)
})
