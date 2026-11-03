// Läser in variablerna från .env till process.env
require('dotenv').config()

const mysql = require('mysql2/promise')
const fs = require('fs')

// SSL till databasen. Lokalt i Docker används ingen SSL.
// Aiven kräver SSL, och med Aivens CA-certifikat kontrollerar vi också
// att det verkligen är Aivens server vi ansluter till.
function sslOptions() {
    if (process.env.DB_SSL !== 'true') {
        return undefined
    }
    if (!process.env.DB_CA_PATH) {
        throw new Error('DB_SSL=true kräver DB_CA_PATH, sökvägen till Aivens CA-certifikat')
    }
    return {
        ca: fs.readFileSync(process.env.DB_CA_PATH),
        rejectUnauthorized: true,
    }
}


// En pool = flera återanvändbara anslutningar till databasen
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: sslOptions(),
})

module.exports = pool
