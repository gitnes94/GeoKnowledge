// Kör med: npm test
const test = require('node:test');
const assert = require('node:assert/strict');

const { gradeAnswer, summarize, ANSWER_GRACE_MS } = require('../quiz/grading');

const START = 1_000_000;

// Ett litet quiz med tre frågor där rätt svar alltid är 'A'
function makeSession(overrides = {}) {
    return {
        quiz_type: 'shape',
        region: 'World',
        time_limit: null,
        lives: null,
        questions: [
            { country_id: 'AAA', kind: 'shape', options: ['AAA', 'BBB', 'CCC', 'DDD'] },
            { country_id: 'BBB', kind: 'flag', options: ['AAA', 'BBB', 'CCC', 'DDD'] },
            { country_id: 'CCC', kind: 'capital', options: ['AAA', 'BBB', 'CCC', 'DDD'] },
        ],
        answers: [],
        started_at: START,
        finished_at: null,
        ...overrides,
    };
}

// Svarar och lägger till svaret i sessionen, som databasen gör
function answer(session, optionId, at) {
    const graded = gradeAnswer(session, session.answers.length, optionId, at);
    if (!graded.error) session.answers.push(graded.answer);
    return graded;
}

test('rätt och fel svar rättas', () => {
    const session = makeSession();
    const right = answer(session, 'AAA', START + 1000);
    assert.equal(right.correct, true);
    assert.equal(right.correct_id, 'AAA');
    const wrong = answer(session, 'AAA', START + 2000);
    assert.equal(wrong.correct, false);
    assert.equal(wrong.correct_id, 'BBB');
});

test('samma fråga går inte att svara på två gånger', () => {
    const session = makeSession();
    answer(session, 'BBB', START + 1000);
    const again = gradeAnswer(session, 0, 'AAA', START + 2000);
    assert.equal(again.error.status, 409);
});

test('man kan inte hoppa fram till en senare fråga', () => {
    const graded = gradeAnswer(makeSession(), 2, 'CCC', START + 1000);
    assert.equal(graded.error.status, 409);
});

test('ett svar som inte är ett av alternativen avvisas', () => {
    const graded = gradeAnswer(makeSession(), 0, 'SWE', START + 1000);
    assert.equal(graded.error.status, 400);
});

test('avslutat quiz tar inte emot svar', () => {
    const graded = gradeAnswer(makeSession({ finished_at: START + 5 }), 0, 'AAA', START + 1000);
    assert.equal(graded.error.status, 409);
});

test('done blir true efter sista frågan', () => {
    const session = makeSession();
    assert.equal(answer(session, 'AAA', START + 1).done, false);
    assert.equal(answer(session, 'BBB', START + 2).done, false);
    assert.equal(answer(session, 'CCC', START + 3).done, true);
});

test('på tid: svar efter tidsgränsen (plus extratiden) avvisas', () => {
    const session = makeSession({ time_limit: 60 });
    const late = gradeAnswer(session, 0, 'AAA', START + 60_000 + ANSWER_GRACE_MS + 1);
    assert.equal(late.error.status, 409);
});

test('på tid: svar i extratiden godtas men ger 0 sekunder kvar', () => {
    const session = makeSession({ time_limit: 60 });
    answer(session, 'AAA', START + 10_000);
    answer(session, 'BBB', START + 20_000);
    answer(session, 'CCC', START + 61_000);
    const summary = summarize(session);
    assert.equal(summary.completed, true);
    assert.equal(summary.seconds_left, 0);
});

test('på tid: sekunder kvar räknas med serverns klocka', () => {
    const session = makeSession({ time_limit: 60 });
    answer(session, 'AAA', START + 5_000);
    answer(session, 'BBB', START + 10_000);
    answer(session, 'CCC', START + 15_500);
    const summary = summarize(session);
    assert.equal(summary.timed, true);
    assert.equal(summary.seconds_left, 44);
});

test('på tid: hann man inte klart blir completed false och 0 sekunder kvar', () => {
    const session = makeSession({ time_limit: 60 });
    answer(session, 'AAA', START + 5_000);
    const summary = summarize(session);
    assert.equal(summary.completed, false);
    assert.equal(summary.seconds_left, 0);
    assert.deepEqual(summary.answers, [true, false, false]);
});

test('liv: efter sista livet går det inte att svara mer', () => {
    const session = makeSession({ quiz_type: 'geomaster', lives: 2 });
    answer(session, 'DDD', START + 1);
    const second = answer(session, 'DDD', START + 2);
    assert.equal(second.done, true);
    const third = gradeAnswer(session, 2, 'CCC', START + 3);
    assert.equal(third.error.status, 409);
});

test('summarize: obesvarade frågor räknas som fel, GeoMaster får frågetyper', () => {
    const session = makeSession({ quiz_type: 'geomaster', lives: 3 });
    answer(session, 'AAA', START + 1);
    const summary = summarize(session);
    assert.equal(summary.correct_count, 1);
    assert.equal(summary.total, 3);
    assert.deepEqual(summary.answers, [true, false, false]);
    assert.deepEqual(summary.question_types, ['shape', 'flag', 'capital']);
    assert.deepEqual(summary.country_ids, ['AAA', 'BBB', 'CCC']);
});

test('summarize: vanliga quiz skickar inga frågetyper och inga sekunder', () => {
    const summary = summarize(makeSession());
    assert.equal(summary.question_types, undefined);
    assert.equal(summary.seconds_left, undefined);
    assert.equal(summary.timed, false);
});
