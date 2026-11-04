// Kör med: npm test
const test = require('node:test');
const assert = require('node:assert/strict');

const { buildMe } = require('../leaderboardMe');

const OPTIONS = { minAnswers: 30, xpPerCorrect: 10 };

// En rad per spelare och quiztyp, som från databasen
function row(user_id, quiz_type, correct, total, quizzes = total / 10, bonus = 0) {
    return { user_id, quiz_type, correct, total, bonus, quizzes };
}

test('för få frågor: ingen placering, men antal besvarade', () => {
    const me = buildMe(1, [row(1, 'shape', 10, 10)], OPTIONS);
    assert.deepEqual(me.allQuizzes, { place: null, score: null, answered: 10 });
    assert.deepEqual(me.contour, { place: null, score: null, answered: 10 });
    assert.deepEqual(me.flags, { place: null, score: null, answered: 0 });
});

test('placering räknas bland dem som har minst 30 frågor', () => {
    const rows = [
        row(1, 'shape', 24, 30),   // jag: 80 %
        row(2, 'shape', 27, 30),   // 90 % – bättre
        row(3, 'shape', 21, 30),   // 70 % – sämre
        row(4, 'shape', 10, 10),   // 100 % men för få frågor – räknas inte
    ];
    const me = buildMe(1, rows, OPTIONS);
    assert.deepEqual(me.contour, { place: 2, score: 80, answered: 30 });
    assert.deepEqual(me.allQuizzes, { place: 2, score: 80, answered: 30 });
});

test('delad placering: samma andel rätt ger samma plats', () => {
    const rows = [
        row(1, 'flag', 24, 30),    // jag: 80 %
        row(2, 'flag', 40, 50),    // också 80 %
        row(3, 'flag', 30, 30),    // 100 %
    ];
    assert.equal(buildMe(1, rows, OPTIONS).flags.place, 2);
    assert.equal(buildMe(2, rows, OPTIONS).flags.place, 2);
});

test('"Alla quiz" summerar alla typer', () => {
    const rows = [row(1, 'shape', 18, 20), row(1, 'flag', 7, 10)];
    const me = buildMe(1, rows, OPTIONS);
    assert.deepEqual(me.allQuizzes, { place: 1, score: 83.33, answered: 30 });
    assert.equal(me.contour.place, null, 'bara 20 konturfrågor');
});

test('XP och antal quiz: placering bland alla som spelat', () => {
    const rows = [
        row(1, 'shape', 20, 30, 3, 12),   // jag: 200 + 12 = 212 XP, 3 quiz
        row(2, 'shape', 25, 30, 3, 0),    // 250 XP, 3 quiz
        row(3, 'capital', 5, 10, 1, 0),   // 50 XP, 1 quiz
    ];
    const me = buildMe(1, rows, OPTIONS);
    assert.deepEqual(me.xp, { place: 2, score: 212 });
    assert.deepEqual(me.quizCount, { place: 1, score: 3 }, 'delad etta med spelare 2');
});

test('inte spelat något: inga placeringar alls', () => {
    const me = buildMe(9, [row(1, 'shape', 10, 30)], OPTIONS);
    assert.deepEqual(me.xp, { place: null, score: null });
    assert.deepEqual(me.quizCount, { place: null, score: null });
    assert.deepEqual(me.geoMaster, { place: null, score: null, answered: 0 });
});

test('mysql2 ger summor som text – räknas ändå rätt', () => {
    const rows = [{ user_id: 1, quiz_type: 'shape', correct: '27', total: '30', bonus: '6', quizzes: 3 }];
    const me = buildMe(1, rows, OPTIONS);
    assert.deepEqual(me.contour, { place: 1, score: 90, answered: 30 });
    assert.deepEqual(me.xp, { place: 1, score: 276 });
});
