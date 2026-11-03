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

    // Profilbild från Google
    if (!(await columnExists('users', 'picture_url'))) {
        await pool.query('ALTER TABLE users ADD COLUMN picture_url VARCHAR(500) NULL')
        console.log('Databasen uppdaterad: kolumnen users.picture_url lades till')
    }

    // Troféer: länder man svarat rätt på – tillagd oktober 2026.
    // IF NOT EXISTS gör att inget händer om tabellen redan finns.
    await pool.query(`
        CREATE TABLE IF NOT EXISTS correct_countries
        (
            user_id    INT         NOT NULL,
            quiz_type  VARCHAR(30) NOT NULL,
            country_id VARCHAR(10) NOT NULL,
            created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (user_id, quiz_type, country_id),
            CONSTRAINT fk_correct_countries_user
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `)

    // Quiz som körs på servern (facit och tid sparas här) – tillagd november 2026
    await pool.query(`
        CREATE TABLE IF NOT EXISTS quiz_sessions
        (
            id          CHAR(36)    NOT NULL PRIMARY KEY,
            user_id     INT         NULL,
            quiz_type   VARCHAR(30) NOT NULL,
            region      VARCHAR(30) NOT NULL,
            time_limit  INT         NULL,
            lives       INT         NULL,
            questions   JSON        NOT NULL,
            answers     JSON        NOT NULL,
            started_at  BIGINT      NOT NULL,
            finished_at BIGINT      NULL,
            result_id   INT         NULL,
            created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_quiz_sessions_created_at (created_at),
            CONSTRAINT fk_quiz_sessions_user
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    `)
}

module.exports = migrate
