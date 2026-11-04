// Kör med: npm test
const test = require('node:test');
const assert = require('node:assert/strict');

const { buildRankings } = require('../ranking');

const OPTIONS = { minAnswers: 30, xpPerCorrect: 10 };

// Bygger testdata. Resultaten får id i den ordning de står, som i databasen.
function setup(rows) {
    const users = new Map();
    const results = rows.map(([userId, quizType, correct, total = 10, bonus = 0], i) => {
        users.set(userId, { username: `Spelare ${userId}`, picture_url: null });
        return { id: i + 1, user_id: userId, quiz_type: quizType, correct_count: correct, total, bonus_xp: bonus };
    });
    return buildRankings(results, users, OPTIONS);
}

// Tre flaggquiz för en spelare
const three = (userId, correct) => [[userId, 'flag', correct], [userId, 'flag', correct], [userId, 'flag', correct]];

test('bäst andel rätt först', () => {
    const { lists } = setup([...three(1, 8), ...three(2, 9)]);
    assert.deepEqual(lists.flags.map((r) => r.userId), [2, 1]);
    assert.deepEqual(lists.flags.map((r) => r.place), [1, 2]);
});

test('för få frågor: inte med på listan', () => {
    const { lists, placementOf } = setup([[1, 'flag', 10], ...three(2, 7)]);
    assert.deepEqual(lists.flags.map((r) => r.userId), [2]);
    assert.deepEqual(placementOf(1).flags, { place: null, score: null, answered: 10 });
});

test('lika resultat: den som nådde det först vinner', () => {
    // Spelare 2 blir klar med 30/30 före spelare 1
    const { lists } = setup([...three(2, 10), ...three(1, 10)]);
    assert.deepEqual(lists.flags.map((r) => r.userId), [2, 1]);
    assert.deepEqual(lists.flags.map((r) => r.place), [1, 2], 'inga delade placeringar');
});

test('att fortsätta spela med samma resultat gör en inte sämre placerad', () => {
    // 1 når 100 % först (30/30), sedan når 2 100 %, sedan spelar 1 ett quiz till med 10/10
    const { lists } = setup([...three(1, 10), ...three(2, 10), [1, 'flag', 10]]);
    assert.deepEqual(lists.flags.map((r) => r.userId), [1, 2]);
    assert.equal(lists.flags[0].totalQuestions, 40);
});

test('samma procent med olika antal frågor räknas som samma resultat (27/30 = 36/40)', () => {
    // 1: 9+9+9 = 27/30 (90 %) tidigt. 2: 9+9+9+9 = 36/40 (90 %), men nådde 90 % (27/30) senare.
    const { lists } = setup([...three(1, 9), ...three(2, 9), [2, 'flag', 9]]);
    assert.deepEqual(lists.flags.map((r) => r.userId), [1, 2]);
});

test('man kan nå samma procent igen – det är första gången som gäller', () => {
    // 2 når 27/30 (90 %) först. Sedan når 1 också 90 %. Sedan sjunker 2 till
    // 34/40 (85 %) och 44/50 (88 %) och tar sig tillbaka till 54/60 (90 %).
    // 2 nådde 90 % första gången före 1 och ligger därför först.
    const rows = [...three(2, 9), ...three(1, 9), [2, 'flag', 7], [2, 'flag', 10], [2, 'flag', 10]];
    const { lists } = setup(rows);
    assert.deepEqual(lists.flags.map((r) => [r.userId, r.correctAnswers, r.totalQuestions]), [[2, 54, 60], [1, 27, 30]]);
});

test('"Alla quiz" räknar alla typer, och listorna per typ bara sin typ', () => {
    const { lists, placementOf } = setup([[1, 'shape', 10, 20], [1, 'flag', 5]]);
    assert.equal(lists.allQuizzes[0].percentage, 50);
    assert.deepEqual(placementOf(1).contour, { place: null, score: null, answered: 20 });
});

test('XP: mest först, vid lika den som nådde det först', () => {
    // 1 och 2 får båda 100 XP. 2 är där först. 3 har 50 XP.
    const { lists } = setup([[2, 'shape', 10], [1, 'shape', 10], [3, 'capital', 5]]);
    assert.deepEqual(lists.xp.map((r) => r.userId), [2, 1, 3]);
    assert.deepEqual(lists.xp.map((r) => r.xp), [100, 100, 50]);
});

test('XP: ett quiz med 0 rätt ändrar inte när man nådde sin XP', () => {
    // 1 når 100 XP först, sedan 2, sedan spelar 1 ett quiz med 0 rätt (fortfarande 100 XP)
    const { lists } = setup([[1, 'shape', 10], [2, 'shape', 10], [1, 'flag', 0]]);
    assert.deepEqual(lists.xp.map((r) => r.userId), [1, 2]);
});

test('XP räknar med bonus', () => {
    const { lists } = setup([[1, 'shape', 8, 10, 12]]);
    assert.equal(lists.xp[0].xp, 92);
});

test('flest quiz: flest först, vid lika den som nådde antalet först', () => {
    const { lists } = setup([[1, 'shape', 1], [2, 'shape', 1], [2, 'shape', 1], [1, 'shape', 1]]);
    // Båda har 2 quiz. 2 nådde 2 quiz (resultat 3) före 1 (resultat 4).
    assert.deepEqual(lists.quizCount.map((r) => r.userId), [2, 1]);
});

test('bara topp 10 skickas, men placeringen räknas för alla', () => {
    const rows = [];
    for (let user = 1; user <= 12; user++) rows.push([user, 'shape', user % 10]);
    const { lists, placementOf } = setup(rows);
    assert.equal(lists.xp.length, 10);
    const last = placementOf(10); // 0 rätt – sämst
    assert.deepEqual(last.xp, { place: 12, score: 0 });
});

test('inte spelat: inga placeringar', () => {
    const { placementOf } = setup([[1, 'shape', 5]]);
    assert.deepEqual(placementOf(99).xp, { place: null, score: null });
    assert.deepEqual(placementOf(99).flags, { place: null, score: null, answered: 0 });
});

test('raderna har samma fält som förut', () => {
    const { lists } = setup(three(1, 9));
    assert.deepEqual(lists.flags[0], {
        place: 1, userId: 1, username: 'Spelare 1', pictureUrl: null,
        correctAnswers: 27, totalQuestions: 30, percentage: 90,
    });
    assert.deepEqual(Object.keys(lists.xp[0]).sort(), ['pictureUrl', 'place', 'userId', 'username', 'xp']);
    assert.deepEqual(Object.keys(lists.quizCount[0]).sort(), ['pictureUrl', 'place', 'quiz_count', 'userId', 'username']);
});

test('värden som text (som från mysql2) fungerar', () => {
    const users = new Map([[1, { username: 'A', picture_url: null }]]);
    const results = [{ id: '1', user_id: '1', quiz_type: 'flag', correct_count: '9', total: '10', bonus_xp: '2' }];
    const { lists } = buildRankings(results, users, OPTIONS);
    assert.equal(lists.xp[0].xp, 92);
});
