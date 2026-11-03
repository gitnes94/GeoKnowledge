// Landdatan som quizfrågorna skapas av. Filen byggs från frontendens kartdata
// med `npm run build-quiz-data` (i frontend-mappen) och laddas en gång när
// servern startar.
//
//   countries – [{ id, name_sv, continent, iso2, capital, neighbors, center }, ...]
//   shapes    – { SWE: <GeoJSON-geometri>, ... }  konturerna
//   flags     – { SWE: '<svg ...>', ... }         flaggorna som SVG-text

const path = require('node:path');
const fs = require('node:fs');

const DATA_FILE = path.join(__dirname, '..', 'data', 'quiz-data.json');

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

const countries = data.countries;
const countriesById = new Map(countries.map((country) => [country.id, country]));

// Världsdelarna som går att välja – samma som CONTINENTS i frontendens quiz.js
const REGIONS = ['World', 'Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];

// Alla länder i en världsdel ('World' = alla)
function getRegionCountries(region = 'World') {
    if (region === 'World') return countries;
    return countries.filter((country) => country.continent === region);
}

// Har landet en egen flagga? (Svalbard, Franska Guyana m.fl. har inte det)
function hasFlag(id) {
    return id in data.flags;
}

// Länderna som kan komma i en viss quiztyp. Flaggquizet tar bara länder med
// egen flagga. Ska stämma med getQuizPool i frontendens quiz.js (troféerna).
function getQuizPool(quizType, region = 'World') {
    const regionCountries = getRegionCountries(region);
    if (quizType === 'flag') {
        return regionCountries.filter((country) => hasFlag(country.id));
    }
    return regionCountries;
}

// Flaggan som en data-adress som kan läggas direkt i <img src>.
// Då syns inte landskoden i adressen, som den gör i /flags/se.svg.
function flagDataUrl(id) {
    const svg = data.flags[id];
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function shapeOf(id) {
    return data.shapes[id];
}

module.exports = {
    REGIONS,
    countries,
    countriesById,
    getRegionCountries,
    getQuizPool,
    hasFlag,
    flagDataUrl,
    shapeOf,
};
