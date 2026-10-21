// Här samlas allt som handlar om XP och nivåer.
// XP sparas inte i en egen kolumn – den räknas ut från användarens sparade
// resultat. Då kan totalen aldrig hamna i otakt med resultaten.

const pool = require('./db');

// Hur mycket XP ett rätt svar ger
const XP_PER_CORRECT = 10;

// Nivå 1 kräver 100 XP. Varje ny nivå kräver 50 XP mer än den förra:
//   nivå 1 → 100 XP, nivå 2 → 150 XP, nivå 3 → 200 XP, ...
const BASE_XP_PER_LEVEL = 100;
const XP_INCREASE_PER_LEVEL = 50;

// Räknar ut XP för ett enskilt quiz, t.ex. 7 rätt → 70 XP
function xpForResult(correctCount) {
    return correctCount * XP_PER_CORRECT;
}

// Hur mycket XP som behövs för att klara en viss nivå
function xpNeededForLevel(level) {
    return BASE_XP_PER_LEVEL + XP_INCREASE_PER_LEVEL * (level - 1);
}

// Räknar ut nivå utifrån total XP.
// Vi "betalar" för en nivå i taget tills XP:n inte räcker till nästa.
// Exempel: 300 XP → nivå 1 kostar 100 (200 kvar), nivå 2 kostar 150 (50 kvar),
//          nivå 3 kostar 200 – räcker inte → nivå 3, med 50 av 200 XP
function getLevel(xp) {
    let level = 1;
    let remaining = xp;

    while (remaining >= xpNeededForLevel(level)) {
        remaining -= xpNeededForLevel(level);
        level++;
    }

    return {
        level,
        xpIntoLevel: remaining,              // hur långt man kommit på nuvarande nivå
        xpPerLevel: xpNeededForLevel(level)  // hur mycket nuvarande nivå kräver
    };
}

// Hämtar användarens totala XP från databasen
async function getUserXp(userId) {
    // COALESCE ger 0 i stället för NULL om användaren inte har några resultat
    const [rows] = await pool.query(
        'SELECT COALESCE(SUM(correct_count), 0) AS correct FROM results WHERE user_id = ?',
        [userId]
    );
    // mysql2 returnerar SUM som text – Number gör om det till ett tal
    return xpForResult(Number(rows[0].correct));
}

module.exports = { XP_PER_CORRECT, xpForResult, xpNeededForLevel, getLevel, getUserXp };