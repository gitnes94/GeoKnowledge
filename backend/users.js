const express = require('express');
const router = express.Router();
const pool = require('./db');
const { requireAuth } = require('./jwt');
const { validateUsername } = require('./username');

// Konton skapas bara via Google-inloggningen (auth.js). Här finns det man
// kan göra med sitt eget konto: byta namn och ta bort det.

// PUT /api/users/me – byter den inloggades visningsnamn.
//   body: { username: 'Nytt namn' }
//   svar: { id, username, picture_url } – samma som GET /api/auth/me
//   fel:  400 ogiltigt namn, 409 upptaget, 503 om låset inte gick att få (sällsynt)
//
// Namnet ligger kvar även efter nästa inloggning med Google, eftersom
// inloggningen bara uppdaterar profilbilden (se auth.js).
// Namnet på låset i MySQL som gör att namnbyten sker ett i taget (se nedan)
const USERNAME_LOCK = 'geoknowledge.username-change';
// Så länge ett namnbyte väntar på låset innan det ger upp, i sekunder
const USERNAME_LOCK_TIMEOUT = 5;

router.put('/me', requireAuth, async (req, res) => {
    const { username, error } = validateUsername(req.body?.username);
    if (error) {
        return res.status(400).json({ error: 'Bad Request', message: error });
    }

    let connection;
    let locked = false;
    try {
        // Kontrollen "är namnet ledigt?" och sparningen måste ske utan att någon
        // annan hinner emellan. Annars kan två som byter till samma namn
        // samtidigt båda se att det är ledigt och båda få det.
        // GET_LOCK är ett lås i MySQL som bara en anslutning i taget kan ha.
        // Låset måste hållas och släppas på samma anslutning, därför getConnection.
        // (En UNIQUE-regel i tabellen fungerar inte här: konton som skapas via
        // Google får sitt Google-namn även om någon annan redan har det.)
        connection = await pool.getConnection();
        const [[lock]] = await connection.query('SELECT GET_LOCK(?, ?) AS locked', [USERNAME_LOCK, USERNAME_LOCK_TIMEOUT]);
        locked = lock.locked === 1;
        if (!locked) {
            return res.status(503).json({ error: 'Service Unavailable', message: 'Många byter namn just nu. Försök igen om en stund.' });
        }

        // Två spelare får inte ha samma namn, annars går de inte att skilja åt
        // på topplistan. Databasens jämförelse struntar i stora/små bokstäver
        // och accenter, så 'anna' och 'Ånna' räknas som samma namn.
        const [taken] = await connection.query(
            'SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1',
            [username, req.user.id]
        );
        if (taken.length > 0) {
            return res.status(409).json({ error: 'Conflict', message: 'Namnet är redan upptaget. Välj ett annat.' });
        }

        const [result] = await connection.query('UPDATE users SET username = ? WHERE id = ?', [username, req.user.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Kontot finns inte.' });
        }

        const [users] = await connection.query('SELECT id, username, picture_url FROM users WHERE id = ?', [req.user.id]);
        return res.json(users[0]);
    } catch (err) {
        console.error('Kunde inte byta namn:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Kunde inte byta namn just nu.' });
    } finally {
        if (connection) {
            // Släpp låset så att nästa namnbyte kan fortsätta, och lämna tillbaka anslutningen
            if (locked) await connection.query('SELECT RELEASE_LOCK(?)', [USERNAME_LOCK]).catch(() => {});
            connection.release();
        }
    }
});

// DELETE /api/users/me – tar bort den inloggades konto.
// Resultat, troféer och pågående quiz tas bort automatiskt av databasen
// (ON DELETE CASCADE på results, correct_countries och quiz_sessions).
// Loggar man in med Google igen skapas ett nytt, tomt konto.
//   svar: 204 utan innehåll
router.delete('/me', requireAuth, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.user.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Kontot finns inte.' });
        }
        return res.status(204).end();
    } catch (err) {
        console.error('Kunde inte ta bort konto:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'Kunde inte ta bort kontot just nu.' });
    }
});

module.exports = router;
