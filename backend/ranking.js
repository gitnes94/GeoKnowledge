// Räknar ut alla topplistor och den inloggades placering.
// Bara vanliga funktioner, så att reglerna går att testa (se test/ranking.test.js).
//
// Reglerna:
//   - Listorna för andel rätt kräver minst minAnswers besvarade frågor av typen.
//   - Bäst resultat först (andel rätt / XP / antal quiz).
//   - Vid lika resultat vinner den som NÅDDE resultatet först. "Nådde" betyder
//     första gången man hade exakt det resultatet – inte senaste quizet. Den som
//     har 30/30 och spelar ett quiz till med 10/10 har fortfarande 100 % sedan
//     30/30, och förlorar alltså inte på att fortsätta spela.
//   - "Först" avgörs av resultatets id i databasen. Det ökar för varje sparat
//     quiz, så två spelare kan aldrig ha nått sitt resultat samtidigt – det
//     blir aldrig delade placeringar.

// Alla listor: vilken sorts poäng och (för andel rätt) vilken quiztyp. null = alla typer.
const LISTS = {
    allQuizzes: { kind: 'accuracy', quizType: null },
    contour: { kind: 'accuracy', quizType: 'shape' },
    flags: { kind: 'accuracy', quizType: 'flag' },
    capitals: { kind: 'accuracy', quizType: 'capital' },
    geoMaster: { kind: 'accuracy', quizType: 'geomaster' },
    xp: { kind: 'xp' },
    quizCount: { kind: 'quizCount' },
};

// Hur många som visas på varje lista
const TOP = 10;

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

// En nyckel som är lika för lika resultat. För andel rätt förkortas bråket,
// så att 27/30 och 36/40 (båda 90 %) räknas som samma resultat.
function scoreKey(kind, state) {
    if (kind === 'accuracy') {
        const divisor = gcd(state.correct, state.total) || 1;
        return `${state.correct / divisor}/${state.total / divisor}`;
    }
    return String(kind === 'xp' ? state.xp : state.quizzes);
}

// Är a bättre än b? (Inte lika – det avgörs av vem som kom först.)
function compareScore(kind, a, b) {
    if (kind === 'accuracy') {
        // a.correct/a.total jämfört med b.correct/b.total, utan avrundningsfel
        return b.correct * a.total - a.correct * b.total;
    }
    const field = kind === 'xp' ? 'xp' : 'quizzes';
    return b[field] - a[field];
}

// Går igenom alla resultat i den ordning de sparades och räknar ut, för varje
// lista och spelare: slutresultatet och när det resultatet nåddes första gången.
//   results – [{ id, user_id, quiz_type, correct_count, total, bonus_xp }, ...]
//   users   – Map: id → { username, picture_url }. Resultat för spelare som
//             inte finns i den här listan räknas inte.
function buildRankings(results, users, { minAnswers, xpPerCorrect }) {
    const sorted = [...results].sort((a, b) => Number(a.id) - Number(b.id));

    // states[list] = Map: userId → { correct, total, xp, quizzes, firstReached: Map(nyckel → id) }
    const states = {};
    for (const list of Object.keys(LISTS)) states[list] = new Map();

    for (const result of sorted) {
        const userId = Number(result.user_id);
        const correct = Number(result.correct_count);
        const total = Number(result.total);
        const xp = correct * xpPerCorrect + Number(result.bonus_xp);

        for (const [list, { kind, quizType }] of Object.entries(LISTS)) {
            // Listorna för en viss quiztyp räknar bara den typens resultat
            if (kind === 'accuracy' && quizType !== null && result.quiz_type !== quizType) continue;

            const map = states[list];
            if (!map.has(userId)) {
                map.set(userId, { correct: 0, total: 0, xp: 0, quizzes: 0, firstReached: new Map() });
            }
            const state = map.get(userId);
            state.correct += correct;
            state.total += total;
            state.xp += xp;
            state.quizzes += 1;

            // Kom ihåg första gången spelaren hade just det här resultatet.
            // På listorna för andel rätt räknas bara resultat som är med på listan.
            const qualified = kind !== 'accuracy' || state.total >= minAnswers;
            const key = scoreKey(kind, state);
            if (qualified && !state.firstReached.has(key)) {
                state.firstReached.set(key, Number(result.id));
            }
        }
    }

    // Sortera varje lista: bäst resultat först, vid lika den som nådde det först
    const ranked = {};
    for (const [list, { kind }] of Object.entries(LISTS)) {
        const entries = [];
        for (const [userId, state] of states[list]) {
            // Spelare som saknas (t.ex. borttagna) kommer inte med – listorna,
            // placeringarna och platsnumren bygger då på samma spelare
            if (!users.has(userId)) continue;
            if (kind === 'accuracy' && state.total < minAnswers) continue;
            entries.push({ userId, state, reachedAt: state.firstReached.get(scoreKey(kind, state)) });
        }
        entries.sort((a, b) => compareScore(kind, a.state, b.state) || a.reachedAt - b.reachedAt);
        ranked[list] = entries;
    }

    // En rad som den skickas till frontenden – samma fält som förut
    function toRow(list, entry, index) {
        const { kind } = LISTS[list];
        const user = users.get(entry.userId);
        const row = {
            place: index + 1,
            userId: entry.userId,
            username: user.username,
            pictureUrl: user.picture_url ?? null,
        };
        if (kind === 'accuracy') {
            row.correctAnswers = entry.state.correct;
            row.totalQuestions = entry.state.total;
            row.percentage = Number(((entry.state.correct / entry.state.total) * 100).toFixed(2));
        } else if (kind === 'xp') {
            row.xp = entry.state.xp;
        } else {
            row.quiz_count = entry.state.quizzes;
        }
        return row;
    }

    // Topp 10 på varje lista
    const lists = {};
    for (const list of Object.keys(LISTS)) {
        lists[list] = ranked[list].slice(0, TOP).map((entry, index) => toRow(list, entry, index));
    }

    // En spelares placering på varje lista, även utanför topp 10.
    //   accuracy: { place, score, answered } – place och score null om för få frågor
    //   xp / quizCount: { place, score } – null om man inte har spelat
    function placementOf(userId) {
        const id = Number(userId);
        const me = {};
        for (const [list, { kind }] of Object.entries(LISTS)) {
            const index = ranked[list].findIndex((entry) => entry.userId === id);
            const row = index >= 0 ? toRow(list, ranked[list][index], index) : null;
            if (kind === 'accuracy') {
                me[list] = {
                    place: row ? row.place : null,
                    score: row ? row.percentage : null,
                    answered: states[list].get(id)?.total ?? 0,
                };
            } else {
                me[list] = {
                    place: row ? row.place : null,
                    score: row ? (kind === 'xp' ? row.xp : row.quiz_count) : null,
                };
            }
        }
        return me;
    }

    return { lists, placementOf };
}

module.exports = { buildRankings, LISTS, TOP };
