// Regler för visningsnamn – namnet som syns i headern, på profilen och på topplistan.
// Bara vanliga funktioner, så att reglerna går att testa (se test/username.test.js).

const MIN_LENGTH = 2;
const MAX_LENGTH = 30;

// Bokstäver (även å, ä, ö, é ...), siffror, mellanslag och . _ - '
// Emojis och andra specialtecken tillåts inte – namnet ska gå att läsa på topplistan.
// \p{M} är tecken som sitter ihop med en bokstav, t.ex. ringen i å skrivet som a + ring.
const ALLOWED = /^[\p{L}\p{M}\p{N} ._'-]+$/u;

// Namnet måste innehålla minst en bokstav eller siffra. Annars kan det bli
// osynligt (bara tecken av typen \p{M}) eller bara skiljetecken, t.ex. '._'
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

// Delar upp text i tecken som de ser ut på skärmen, så att t.ex. a + ring
// räknas som ett tecken (å) och inte två
const graphemes = new Intl.Segmenter('sv', { granularity: 'grapheme' });

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

    if (username.length === 0) {
        return { error: 'Skriv ett namn.' };
    }
    if (!ALLOWED.test(username)) {
        return { error: 'Namnet får bara innehålla bokstäver, siffror, mellanslag och . _ - \'' };
    }
    if (!HAS_LETTER_OR_DIGIT.test(username)) {
        return { error: 'Namnet måste innehålla minst en bokstav eller siffra.' };
    }
    // Minsta längd räknas i tecken som de syns, så att t.ex. a + ring inte
    // räknas som två. Största längd räknas i kodpunkter, eftersom det är så
    // databasen räknar (username är VARCHAR(50)).
    if ([...graphemes.segment(username)].length < MIN_LENGTH) {
        return { error: `Namnet måste vara minst ${MIN_LENGTH} tecken.` };
    }
    if ([...username].length > MAX_LENGTH) {
        return { error: `Namnet får vara högst ${MAX_LENGTH} tecken.` };
    }
    return { username };
}

module.exports = { MIN_LENGTH, MAX_LENGTH, normalizeUsername, validateUsername };
