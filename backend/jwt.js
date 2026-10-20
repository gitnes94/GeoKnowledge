const jwt = require('jsonwebtoken')

// Skapar en JWT för en användare
function createToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    )
}

// Middleware som skyddar routes som kräver inloggning.
// Släpper bara igenom anrop med en giltig token och sätter då req.user
function requireAuth(req, res, next) {
    // Läs header
    const header = req.headers.authorization

    // Saknas headern så stoppar vi
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Du måste vara inloggad' })
    }

    // Plocka ut själva token
    const token = header.split(' ')[1]

    try {
        // Kontrollera stämpeln. Kastar ett fel om token är falsk eller har gått ut.
        const payload = jwt.verify(token, process.env.JWT_SECRET)

        // Berätta för route vem användaren är
        req.user = { id: payload.id, username: payload.username }

        // Släpp igenom anropet till routen
        next()
    } catch {
        return res.status(401).json({ error: 'Ogiltig eller utgången inloggning' })
    }
}

module.exports = { createToken, requireAuth }
