// Sparar ett färdigt quiz i results och correct_countries och räknar ut XP.
// Flyttat hit från POST /api/results. Resultatet kommer nu från serverns egen
// rättning (grading.js) – aldrig direkt från klienten.

const { xpForResult, comboBonus, timedBonus, getLevel, getUserXp } = require('../xp');

// Sparar resultatet. Körs i en transaktion som anroparen har startat, så att
// resultatet och sessionen (quiz_sessions) sparas tillsammans eller inte alls.
//   connection – anslutningen som transaktionen körs på
//   userId     – den inloggade användaren
//   summary    – från summarize() i grading.js
//
// Svar: { result, xp } – samma format som POST /api/results gav förut
async function saveQuizResult(connection, userId, summary) {
    const {
        quiz_type, region, correct_count, total, answers,
        timed, completed, seconds_left, country_ids, question_types,
    } = summary;

    const bonusXp = comboBonus(answers);
    // Bonus för quiz på tid – bara om man hann svara på alla frågor
    const timedXp = timed && completed ? timedBonus(correct_count, total, seconds_left ?? 0) : 0;

    // XP före sparningen, för att se om användaren går upp en nivå
    const xpBefore = await getUserXp(userId, connection);

    const [inserted] = await connection.query(
        'INSERT INTO results (user_id, quiz_type, region, correct_count, total, bonus_xp, timed) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, quiz_type, region, correct_count, total, bonusXp + timedXp, timed]
    );

    // Länderna man svarade rätt på, för mästartroféerna. I GeoMaster räknas
    // varje land under sin frågetyp (en rätt flaggfråga → flaggtroféerna).
    const rows = country_ids
        .map((id, i) => [userId, question_types ? question_types[i] : quiz_type, id])
        .filter((row, i) => answers[i]);
    if (rows.length > 0) {
        await connection.query(
            'INSERT IGNORE INTO correct_countries (user_id, quiz_type, country_id) VALUES ?',
            [rows]
        );
    }

    const xpTotal = await getUserXp(userId, connection);
    const progress = getLevel(xpTotal);

    return {
        result: {
            id: inserted.insertId,
            user_id: userId,
            quiz_type,
            region,
            correct_count,
            total,
            bonus_xp: bonusXp + timedXp,
            timed,
        },
        xp: {
            gained: xpForResult(correct_count) + bonusXp + timedXp,
            bonus: bonusXp,
            timedBonus: timedXp,
            total: xpTotal,
            leveledUp: progress.level > getLevel(xpBefore).level,
            ...progress,
        },
    };
}

module.exports = { saveQuizResult };
