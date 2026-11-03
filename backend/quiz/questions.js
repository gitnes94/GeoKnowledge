// Skapar quizfrågor. Flyttat hit från frontendens quiz.js och geomaster.js,
// så att rätt svar bara finns på servern.
//
// En fråga ser ut så här (sparas i quiz_sessions.questions):
//   { country_id: 'FRA', kind: 'shape', options: ['FRA', 'DEU', 'ESP', 'ITA'] }
// kind är 'shape', 'flag' eller 'capital'. options är i den ordning de visas.

const { countriesById, getRegionCountries, getQuizPool, hasFlag } = require('./data');

// Hur många svarsalternativ varje fråga har
const OPTIONS_PER_QUESTION = 4;

// Antal frågor i de vanliga quizen
const QUESTION_COUNT = 10;

// GeoMaster: antal länder i en resa och antal liv
const JOURNEY_LENGTH = 20;
const LIVES = 3;

// Blandar en lista slumpmässigt (Fisher–Yates). Gör en kopia.
//   random – slumpfunktionen, kan bytas ut i testerna
function shuffle(list, random = Math.random) {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function randomItem(list, random = Math.random) {
    return list[Math.floor(random() * list.length)];
}

// Väljer länderna som blir rätt svar. Länder som inte finns i seenIds väljs
// först, så att alla länder hinner komma innan något upprepas.
function pickAnswers(countries, count, seenIds, random) {
    const seen = new Set(seenIds);
    const unseen = countries.filter((country) => !seen.has(country.id));
    const alreadySeen = countries.filter((country) => seen.has(country.id));

    const picked = [...shuffle(unseen, random), ...shuffle(alreadySeen, random)]
        .slice(0, Math.min(count, countries.length));

    return shuffle(picked, random);
}

// Väljer tre felsvar från samma världsdel som rätt svar. Länder som redan
// varit rätt svar i quizet används sist, annars kan man gissa genom uteslutning.
function pickWrongOptions(countries, answer, earlierAnswerIds, random) {
    const candidates = countries.filter(
        (country) => country.continent === answer.continent && country.id !== answer.id
    );
    const fresh = candidates.filter((country) => !earlierAnswerIds.has(country.id));
    const earlier = candidates.filter((country) => earlierAnswerIds.has(country.id));

    return [...shuffle(fresh, random), ...shuffle(earlier, random)].slice(0, OPTIONS_PER_QUESTION - 1);
}

// Gör frågor av länder som redan är valda som rätt svar, i den ordningen
function buildQuestions(countries, answers, kind, random) {
    return answers.map((answer, index) => {
        const earlierAnswerIds = new Set(answers.slice(0, index).map((a) => a.id));
        const wrong = pickWrongOptions(countries, answer, earlierAnswerIds, random);
        return {
            country_id: answer.id,
            kind,
            options: shuffle([answer, ...wrong], random).map((country) => country.id),
        };
    });
}

// Frågor till de vanliga quizen: kontur, flagga eller huvudstad
function createQuestions(quizType, region, seenIds = [], { count = QUESTION_COUNT, random = Math.random } = {}) {
    const pool = getQuizPool(quizType, region);
    const answers = pickAnswers(pool, count, seenIds, random);
    return buildQuestions(pool, answers, quizType, random);
}

// Vinkelavståndet mellan två punkter på jorden ([longitud, latitud] i grader).
// Samma som d3:s geoDistance – vi behöver bara veta vilket land som är närmast.
function distance([lon1, lat1], [lon2, lat2]) {
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
    return 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

// GeoMaster-resan: en lista med länder där varje land är granne med det förra.
//   1. Börja i ett slumpat land i världsdelen.
//   2. Gå till en obesökt granne. Välj den som själv har minst obesökta grannar
//      kvar – då fastnar vägen sällan i en återvändsgränd.
//   3. Finns ingen obesökt granne (t.ex. en ö) hoppar vi till det närmaste
//      obesökta landet, mätt mellan ländernas mittpunkter.
function createJourney(region = 'World', { length = JOURNEY_LENGTH, random = Math.random } = {}) {
    const countries = getRegionCountries(region);
    const byId = new Map(countries.map((country) => [country.id, country]));

    const unvisited = new Set(byId.keys());
    const openNeighbors = (id) => byId.get(id).neighbors.filter((other) => unvisited.has(other));

    let current = randomItem([...unvisited], random);
    const path = [current];
    unvisited.delete(current);

    while (path.length < length && unvisited.size > 0) {
        const options = openNeighbors(current);
        let next;

        if (options.length > 0) {
            const fewest = Math.min(...options.map((id) => openNeighbors(id).length));
            next = randomItem(options.filter((id) => openNeighbors(id).length === fewest), random);
        } else {
            const here = byId.get(current).center;
            next = [...unvisited].reduce((closest, id) =>
                distance(here, byId.get(id).center) < distance(here, byId.get(closest).center) ? id : closest
            );
        }

        path.push(next);
        unvisited.delete(next);
        current = next;
    }

    return path.map((id) => byId.get(id));
}

// GeoMaster-frågor: en per land i resan, med slumpad typ bland de som går för
// landet (flagga bara med egen flagga, huvudstad bara om den finns).
// Samma typ kommer aldrig mer än två gånger i rad.
function createGeoMasterQuestions(region, { random = Math.random, length = JOURNEY_LENGTH } = {}) {
    const journey = createJourney(region, { random, length });
    const questions = buildQuestions(getRegionCountries(region), journey, null, random);

    questions.forEach((question, index) => {
        const country = journey[index];
        let kinds = ['shape'];
        if (hasFlag(country.id)) kinds.push('flag');
        if (country.capital) kinds.push('capital');

        const previous = questions.slice(Math.max(0, index - 2), index).map((q) => q.kind);
        if (previous.length === 2 && previous[0] === previous[1] && kinds.length > 1) {
            kinds = kinds.filter((kind) => kind !== previous[0]);
        }

        question.kind = randomItem(kinds, random);
    });

    return questions;
}

// Länder vars mittpunkt hamnar fel på resekartan: Rysslands mittpunkt ligger
// i Sibirien, men resan går oftast genom europeiska Ryssland. [longitud, latitud]
const MAP_POSITION_OVERRIDES = {
    RUS: [37.6, 55.75], // Moskva
};

// Minsta område resekartan visar, i grader
const MIN_SPAN_LON = 30;
const MIN_SPAN_LAT = 16;

// Området som GeoMaster-kartan ska visa. Räknas här i stället för i frontenden,
// eftersom frontenden annars hade behövt hela resvägen – alltså alla rätt svar.
//   Svar: { center: [lon, lat], span: [lon, lat] } i grader
function mapView(countryIds) {
    const points = countryIds.map((id) => MAP_POSITION_OVERRIDES[id] || countriesById.get(id).center);
    let lons = points.map(([lon]) => lon);
    const lats = points.map(([, lat]) => lat);

    // Över datumlinjen (t.ex. Fiji): räkna västliga längder som +360°
    if (Math.max(...lons) - Math.min(...lons) > 180) {
        lons = lons.map((lon) => (lon < 0 ? lon + 360 : lon));
    }

    const round = (value) => Math.round(value * 10) / 10;
    return {
        center: [
            round((Math.min(...lons) + Math.max(...lons)) / 2),
            round((Math.min(...lats) + Math.max(...lats)) / 2),
        ],
        span: [
            round(Math.max(Math.max(...lons) - Math.min(...lons), MIN_SPAN_LON)),
            round(Math.max(Math.max(...lats) - Math.min(...lats), MIN_SPAN_LAT)),
        ],
    };
}

module.exports = {
    QUESTION_COUNT,
    JOURNEY_LENGTH,
    LIVES,
    shuffle,
    createQuestions,
    createJourney,
    createGeoMasterQuestions,
    mapView,
};
