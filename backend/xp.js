// Här samlas allt som handlar om XP och nivåer.
// XP sparas inte i en egen kolumn – den räknas ut från användarens sparade
// resultat. Då kan totalen aldrig hamna i otakt med resultaten.

const pool = require('./db');

// Hur mycket XP ett rätt svar ger
const XP_PER_CORRECT = 10;

// Combo: från och med 5 rätt i rad ger varje rätt svar 20 % extra XP,
// tills användaren svarar fel. 10 XP + 20 % = 12 XP per rätt svar.
const COMBO_START = 5;
const COMBO_BONUS_PERCENT = 20;
const COMBO_BONUS_PER_CORRECT = XP_PER_CORRECT * COMBO_BONUS_PERCENT / 100; // = 2

// Quiz på tid: klarar man quizet (svarar på alla frågor innan tiden tar slut)
// får man 5 XP extra per rätt svar, plus en bonus för sekunderna som är kvar.
const TIMED_BONUS_PER_CORRECT = 5;
// Tidsgränsen för ett quiz på tid, i sekunder. Samma som i frontendens MODES.
const TIME_LIMIT_SECONDS = 60;

// Nivå 1 kräver 100 XP. Varje ny nivå kräver 50 XP mer än den förra:
//   nivå 1 → 100 XP, nivå 2 → 150 XP, nivå 3 → 200 XP, ...
const BASE_XP_PER_LEVEL = 100;
const XP_INCREASE_PER_LEVEL = 50;

// Räknar ut XP för ett enskilt quiz, t.ex. 7 rätt → 70 XP
function xpForResult(correctCount) {
    return correctCount * XP_PER_CORRECT;
}

// Räknar ut combo-bonusen för ett quiz.
//   answers – ett svar per fråga i ordning, true = rätt, t.ex. [true, true, false, ...]
// Exempel: 10 rätt i rad → fråga 5–10 ger bonus → 6 × 2 = 12 XP extra
function comboBonus(answers) {
    let streak = 0; // antal rätt i rad just nu
    let bonus = 0;

    for (const isCorrect of answers) {
        if (isCorrect) {
            streak++;
            if (streak >= COMBO_START) {
                bonus += COMBO_BONUS_PER_CORRECT;
            }
        } else {
            streak = 0; // fel svar nollställer combon
        }
    }

    return bonus;
}

// Räknar ut bonusen för ett klarat quiz på tid:
// 5 XP per rätt svar + sekunder kvar × andelen rätt, avrundat till heltal.
// Andelen rätt gör att det inte lönar sig att gissa snabbt.
// Exempel: 9 av 10 rätt med 10 s kvar → 45 + 10 × 0,9 = 54 XP
function timedBonus(correctCount, total, secondsLeft) {
    const correctBonus = correctCount * TIMED_BONUS_PER_CORRECT;
    const timeBonus = Math.round(secondsLeft * (correctCount / total));
    return correctBonus + timeBonus;
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

// Hämtar användarens totala XP från databasen:
// 10 XP per rätt svar + all bonus som sparats i bonus_xp (combo och quiz på tid)
//   db – var frågan ställs. Standard är poolen, men results.js skickar in sin
//        transaktion så att den nya totalen räknas med det som just sparats.
async function getUserXp(userId, db = pool) {
    // COALESCE ger 0 i stället för NULL om användaren inte har några resultat
    const [rows] = await db.query(
        `SELECT COALESCE(SUM(correct_count), 0) AS correct,
                COALESCE(SUM(bonus_xp), 0)      AS bonus
         FROM results WHERE user_id = ?`,
        [userId]
    );
    // mysql2 returnerar SUM som text – Number gör om det till ett tal
    return xpForResult(Number(rows[0].correct)) + Number(rows[0].bonus);
}

module.exports = {
    XP_PER_CORRECT,
    COMBO_START,
    COMBO_BONUS_PERCENT,
    xpForResult,
    comboBonus,
    timedBonus,
    TIME_LIMIT_SECONDS,
    xpNeededForLevel,
    getLevel,
    getUserXp
};
