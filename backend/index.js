require('dotenv').config()

const express = require('express')
const cors = require('cors')

const pool = require('./database/db')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1')
        res.json({
            status: 'ok',
            database: 'connected'
        })
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        })
    }
})

const port = process.env.PORT

app.listen(port, () => {
    console.log(`Servern körs på http://localhost:${port}`)
})
