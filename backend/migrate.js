// Uppdaterar databasen automatiskt när backenden startar.
//
// Docker kör bara geoknowledge.sql när databasen skapas för första gången.
// Den som redan har en databas får därför inte nya kolumner av sig själv –
// det fixar den här filen. Varje ändring kollar först om den redan är gjord,
// så det är ofarligt att köra den vid varje start.

const pool = require('./db')

// Finns kolumnen redan i tabellen? information_schema är MySQL:s egen
// beskrivning av alla tabeller och kolumner.
async function columnExists(table, column) {
    const [rows] = await pool.query(
        `SELECT COUNT(*) AS count
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
    )
    return rows[0].count > 0
}

async function migrate() {
    // Combo-bonus (5 rätt i rad) – tillagd oktober 2026
    if (!(await columnExists('results', 'bonus_xp'))) {
        await pool.query('ALTER TABLE results ADD COLUMN bonus_xp INT NOT NULL DEFAULT 0')
        console.log('Databasen uppdaterad: kolumnen results.bonus_xp lades till')
    }

    // Quiz på tid
    if (!(await columnExists('results', 'timed'))) {
        await pool.query('ALTER TABLE results ADD COLUMN timed BOOLEAN NOT NULL DEFAULT FALSE')
        console.log('Databasen uppdaterad: kolumnen results.timed lades till')
    }
}

module.exports = migrate
