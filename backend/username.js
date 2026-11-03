// Regler för visningsnamn – namnet som syns i headern, på profilen och på topplistan.
// Bara vanliga funktioner, så att reglerna går att testa (se test/username.test.js).

const MIN_LENGTH = 2;
const MAX_LENGTH = 30;

// Bokstäver (även å, ä, ö, é ...), siffror, mellanslag och . _ - '
// Emojis och andra specialtecken tillåts inte – namnet ska gå att läsa på topplistan.
const ALLOWED = /^[\p{L}\p{M}\p{N} ._'-]+$/u;

// Snyggar till namnet: tar bort mellanslag i början och slutet och gör
// flera mellanslag i rad till ett, t.ex. '  Anna   Svensson ' → 'Anna Svensson'
function normalizeUsername(name) {
    return name.trim().replace(/\s+/g, ' ');
}

// Kontrollerar ett namn.
// Svar: { username } med det snyggade namnet, eller { error } med ett meddelande
// som kan visas för användaren.
function validateUsername(name) {
    if (typeof name !== 'string') {
        return { error: 'Skriv ett namn.' };
    }
    const username = normalizeUsername(name);
    // [...username] räknar tecken rätt även för t.ex. emojis och å skrivet som a + ring
    const length = [...username].length;

    if (length === 0) {
        return { error: 'Skriv ett namn.' };
    }
    if (length < MIN_LENGTH) {
        return { error: `Namnet måste vara minst ${MIN_LENGTH} tecken.` };
    }
    if (length > MAX_LENGTH) {
        return { error: `Namnet får vara högst ${MAX_LENGTH} tecken.` };
    }
    if (!ALLOWED.test(username)) {
        return { error: 'Namnet får bara innehålla bokstäver, siffror, mellanslag och . _ - \'' };
    }
    return { username };
}

module.exports = { MIN_LENGTH, MAX_LENGTH, normalizeUsername, validateUsername };
