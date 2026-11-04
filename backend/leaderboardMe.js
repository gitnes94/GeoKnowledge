// Räknar ut den inloggades placering på varje topplista – även när man inte är
// med bland de tio som visas. Bara vanliga funktioner, så att reglerna går att
// testa (se test/leaderboardMe.test.js).
//
// Delade placeringar räknas som på listorna: placering = 1 + antalet spelare
// som är strikt bättre. Två spelare med samma andel rätt får alltså samma plats.

// Listorna för andel rätt och vilken quiztyp de gäller (null = alla typer)
const ACCURACY_LISTS = {
    allQuizzes: null,
    contour: 'shape',
    flags: 'flag',
    capitals: 'capital',
    geoMaster: 'geomaster',
};

// Gör om raderna från databasen till en sammanställning per spelare.
//   rows – [{ user_id, quiz_type, correct, total, bonus, quizzes }, ...]
//          en rad per spelare och quiztyp (GROUP BY user_id, quiz_type)
function summarizePlayers(rows, xpPerCorrect) {
    const players = new Map();
    for (const row of rows) {
        const id = Number(row.user_id);
        if (!players.has(id)) {
            players.set(id, { byType: {}, correct: 0, total: 0, bonus: 0, quizzes: 0 });
        }
        const player = players.get(id);
        const correct = Number(row.correct);
        const total = Number(row.total);
        player.byType[row.quiz_type] = { correct, total };
        player.correct += correct;
        player.total += total;
        player.bonus += Number(row.bonus);
        player.quizzes += Number(row.quizzes);
    }
    for (const player of players.values()) {
        player.xp = player.correct * xpPerCorrect + player.bonus;
    }
    return players;
}

// Antal rätt och antal frågor för en spelare på en lista för andel rätt
function accuracyOf(player, quizType) {
    if (quizType === null) return { correct: player.correct, total: player.total };
    return player.byType[quizType] ?? { correct: 0, total: 0 };
}

// Den inloggades placering och poäng på varje lista.
//   userId – den inloggade
//   rows   – se summarizePlayers
// Svar, en post per lista:
//   allQuizzes/contour/flags/capitals/geoMaster: { place, score, answered }
//     place    – placeringen, eller null om man har svarat på för få frågor
//     score    – andel rätt i procent (två decimaler, som på listan), eller null
//     answered – antal besvarade frågor av den typen
//   xp / quizCount: { place, score } – null om man inte har spelat något
function buildMe(userId, rows, { minAnswers, xpPerCorrect }) {
    const players = summarizePlayers(rows, xpPerCorrect);
    const me = players.get(Number(userId));
    const result = {};

    for (const [list, quizType] of Object.entries(ACCURACY_LISTS)) {
        const mine = me ? accuracyOf(me, quizType) : { correct: 0, total: 0 };
        if (mine.total < minAnswers) {
            result[list] = { place: null, score: null, answered: mine.total };
            continue;
        }
        // Strikt bättre andel rätt: a/b > c/d ⇔ a·d > c·b (inga avrundningsfel)
        let better = 0;
        for (const player of players.values()) {
            const other = accuracyOf(player, quizType);
            if (other.total >= minAnswers && other.correct * mine.total > mine.correct * other.total) {
                better++;
            }
        }
        result[list] = {
            place: better + 1,
            score: Number(((mine.correct / mine.total) * 100).toFixed(2)),
            answered: mine.total,
        };
    }

    for (const [list, field] of [['xp', 'xp'], ['quizCount', 'quizzes']]) {
        if (!me) {
            result[list] = { place: null, score: null };
            continue;
        }
        let better = 0;
        for (const player of players.values()) {
            if (player[field] > me[field]) better++;
        }
        result[list] = { place: better + 1, score: me[field] };
    }

    return result;
}

module.exports = { buildMe, summarizePlayers };
