const jwt = require('jsonwebtoken')

// Skapar en JWT för en användare
function createToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    )
}

module.exports = { createToken }
