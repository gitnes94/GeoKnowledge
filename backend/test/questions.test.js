// Kör med: npm test
const test = require('node:test');
const assert = require('node:assert/strict');

const { countriesById, getQuizPool, hasFlag, REGIONS } = require('../quiz/data');
const { createQuestions, createGeoMasterQuestions, createJourney, mapView, JOURNEY_LENGTH } = require('../quiz/questions');

test('vanligt quiz: 10 frågor, fyra alternativ, rätt svar finns bland dem', () => {
    const questions = createQuestions('shape', 'World');
    assert.equal(questions.length, 10);
    for (const question of questions) {
        assert.equal(question.kind, 'shape');
        assert.equal(question.options.length, 4);
        assert.ok(question.options.includes(question.country_id));
        assert.equal(new Set(question.options).size, 4, 'inga dubbletter');
    }
});

test('samma land kommer inte två gånger i ett quiz', () => {
    const ids = createQuestions('flag', 'World').map((question) => question.country_id);
    assert.equal(new Set(ids).size, ids.length);
});

test('felsvaren kommer från samma världsdel som rätt svar', () => {
    for (const question of createQuestions('capital', 'World')) {
        const continent = countriesById.get(question.country_id).continent;
        for (const id of question.options) {
            assert.equal(countriesById.get(id).continent, continent);
        }
    }
});

test('världsdelen följs', () => {
    for (const question of createQuestions('shape', 'Africa')) {
        assert.equal(countriesById.get(question.country_id).continent, 'Africa');
    }
});

test('flaggquizet tar bara länder med egen flagga', () => {
    const pool = new Set(getQuizPool('flag', 'World').map((country) => country.id));
    for (let i = 0; i < 20; i++) {
        for (const question of createQuestions('flag', 'World')) {
            assert.ok(pool.has(question.country_id));
            question.options.forEach((id) => assert.ok(pool.has(id)));
        }
    }
});

test('länder som redan setts väljs sist', () => {
    const europe = getQuizPool('shape', 'Europe').map((country) => country.id);
    const unseen = europe.slice(0, 10);
    const seen = europe.slice(10);
    const ids = createQuestions('shape', 'Europe', seen).map((question) => question.country_id);
    assert.deepEqual([...ids].sort(), [...unseen].sort());
});

test('alla världsdelar går att skapa frågor för', () => {
    for (const region of REGIONS) {
        for (const type of ['shape', 'flag', 'capital']) {
            const questions = createQuestions(type, region);
            assert.ok(questions.length > 0, `${type} ${region}`);
        }
        assert.ok(createGeoMasterQuestions(region).length > 0, `geomaster ${region}`);
    }
});

test('GeoMaster-resan: inga dubbletter, och oftast till ett grannland', () => {
    let neighborSteps = 0;
    let steps = 0;
    for (let i = 0; i < 20; i++) {
        const journey = createJourney('Europe');
        assert.equal(journey.length, JOURNEY_LENGTH);
        assert.equal(new Set(journey.map((country) => country.id)).size, journey.length);
        for (let j = 1; j < journey.length; j++) {
            steps++;
            if (journey[j - 1].neighbors.includes(journey[j].id)) neighborSteps++;
        }
    }
    assert.ok(neighborSteps / steps > 0.8, `bara ${neighborSteps} av ${steps} steg till granne`);
});

test('GeoMaster: samma frågetyp högst två gånger i rad, flagga bara om den finns', () => {
    for (let i = 0; i < 20; i++) {
        const questions = createGeoMasterQuestions('World');
        for (let j = 2; j < questions.length; j++) {
            const kinds = [questions[j - 2].kind, questions[j - 1].kind, questions[j].kind];
            assert.ok(!(kinds[0] === kinds[1] && kinds[1] === kinds[2]), kinds.join());
        }
        for (const question of questions) {
            if (question.kind === 'flag') assert.ok(hasFlag(question.country_id));
            if (question.kind === 'capital') assert.ok(countriesById.get(question.country_id).capital);
        }
    }
});

test('kartområdet för GeoMaster har minst den minsta storleken', () => {
    const view = mapView(['LUX', 'BEL']);
    assert.ok(view.span[0] >= 30 && view.span[1] >= 16);
    assert.equal(view.center.length, 2);
});
