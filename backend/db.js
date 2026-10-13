// Läser in variablerna från .env till process.env
require('dotenv').config()

const mysql = require('mysql2/promise')

// En pool = flera återanvändbara anslutningar till databasen
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
})

module.exports = pool