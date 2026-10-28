// Gör om landdatan till quizfrågor.
// Komponenterna anropar bara createQuestions() och behöver inte veta hur det går till.

// Världsdelarna som går att välja. Nyckeln (engelska) används i koden och sparas
// i databasen – värdet (svenska) är det användaren ser.
export const CONTINENTS = {
    World: 'Hela världen',
    Europe: 'Europa',
    Asia: 'Asien',
    Africa: 'Afrika',
    'North America': 'Nordamerika',
    'South America': 'Sydamerika',
    Oceania: 'Oceanien',
}

// Hur många svarsalternativ varje fråga har
const OPTIONS_PER_QUESTION = 4

// Plockar ut länderna ur GeoJSON-datan och tar bort det som inte passar i ett quiz
function getQuizCountries(world) {
    return world.features
        .map((feature) => feature.properties)
        .filter((country) =>
            country.name_sv &&                              // måste ha ett svenskt namn
            country.iso2 !== '-99' &&                       // t.ex. Somaliland, Nordcypern
            country.continent !== 'Antarctica' &&
            country.continent !== 'Seven seas (open ocean)'
        )
}

// Blandar en lista slumpmässigt (Fisher–Yates).
// Gör en kopia så att originallistan inte ändras.
function shuffle(list) {
    const result = [...list]
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
}

// Gör om ett land till det format som frågorna använder
function toOption(country) {
    return { id: country.id, name: country.name_sv }
}

// Områden vars flagga är densamma som ett annat lands, eller som inte har
// en egen officiell flagga. De går inte att gissa på och hoppas över i flaggquizet.
//   SJ = Svalbard (Norges flagga), GF = Franska Guyana (Frankrikes flagga),
//   TF = Franska sydterritorierna, NC = Nya Kaledonien (Frankrikes flagga)
export const FLAG_EXCLUDED_ISO2 = ['SJ', 'GF', 'TF', 'NC']

// Alla länder som kan förekomma i ett quiz för en viss världsdel.
//   continent – 'World' eller en nyckel från CONTINENTS, t.ex. 'Europe'
export function getRegionCountries(world, continent = 'World') {
    const countries = getQuizCountries(world)
    if (continent === 'World') {
        return countries
    }
    return countries.filter((country) => country.continent === continent)
}

// Samma som getRegionCountries, men för en viss quiztyp. Flaggquizet hoppar
// över områden utan egen flagga. Används av troféerna, så att "alla länder"
// betyder exakt de länder som kan komma i quizet.
export function getQuizPool(world, quizType, continent = 'World') {
    const countries = getRegionCountries(world, continent)
    if (quizType === 'flag') {
        return countries.filter((country) => !FLAG_EXCLUDED_ISO2.includes(country.iso2))
    }
    return countries
}

// Väljer vilka länder som blir rätt svar.
// Länder som användaren inte fått på sistone (inte i seenIds) väljs först.
// Räcker de inte fylls det på med redan sedda länder.
function pickAnswers(countries, count, seenIds) {
    const seen = new Set(seenIds)
    const unseen = countries.filter((country) => !seen.has(country.id))
    const alreadySeen = countries.filter((country) => seen.has(country.id))

    const picked = [...shuffle(unseen), ...shuffle(alreadySeen)]
        .slice(0, Math.min(count, countries.length))

    // Blanda igen, så att påfyllda länder inte alltid hamnar sist i quizet
    return shuffle(picked)
}

// Väljer tre felsvar till en fråga.
// Länder som redan varit rätt svar tidigare i samma quiz används bara om det
// inte finns tillräckligt många andra – annars kan man gissa genom uteslutning.
function pickWrongOptions(countries, answer, earlierAnswerIds) {
    // Felsvar från SAMMA världsdel som rätt svar, annars blir det för lätt
    // (t.ex. Kambodja mot Namibia och Bosnien)
    const candidates = countries.filter(
        (country) => country.continent === answer.continent && country.id !== answer.id
    )
    const fresh = candidates.filter((country) => !earlierAnswerIds.has(country.id))
    const earlier = candidates.filter((country) => earlierAnswerIds.has(country.id))

    return [...shuffle(fresh), ...shuffle(earlier)].slice(0, OPTIONS_PER_QUESTION - 1)
}

// Skapar quizfrågor.
//   world     – datan från loadWorld()
//   count     – hur många frågor (blir färre om världsdelen har färre länder)
//   continent – 'World' eller en nyckel från CONTINENTS, t.ex. 'Europe'
//   seenIds   – id:n på länder användaren redan fått i tidigare quiz (se quizHistory.js).
//               De väljs sist, så att alla länder hinner komma innan något upprepas.
//
// Varje fråga ser ut så här:
//   { correct: { id: 'FRA', name: 'Frankrike' },
//     options: [ { id, name }, ... ] }   ← fyra alternativ i slumpad ordning
export function createQuestions(world, count = 10, continent = 'World', seenIds = []) {
    const countries = getRegionCountries(world, continent)
    const answers = pickAnswers(countries, count, seenIds)

    return answers.map((answer, index) => {
        // Rätt svar från frågorna före den här
        const earlierAnswerIds = new Set(answers.slice(0, index).map((a) => a.id))
        const wrong = pickWrongOptions(countries, answer, earlierAnswerIds)

        return {
            correct: toOption(answer),
            options: shuffle([answer, ...wrong]).map(toOption),
        }
    })
}
