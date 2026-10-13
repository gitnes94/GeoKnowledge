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

// Skapar quizfrågor.
//   world     – datan från loadWorld()
//   count     – hur många frågor (blir färre om världsdelen har färre länder)
//   continent – 'World' eller en nyckel från CONTINENTS, t.ex. 'Europe'
//
// Varje fråga ser ut så här:
//   { correct: { id: 'FRA', name: 'Frankrike' },
//     options: [ { id, name }, ... ] }   ← fyra alternativ i slumpad ordning
export function createQuestions(world, count = 10, continent = 'World') {
    let countries = getQuizCountries(world)

    if (continent !== 'World') {
        countries = countries.filter((country) => country.continent === continent)
    }

    // Varje land blir rätt svar högst en gång per quiz
    const answers = shuffle(countries).slice(0, Math.min(count, countries.length))

    return answers.map((answer) => {
        // Felsvar: tre andra länder från SAMMA världsdel som rätt svar.
        // Annars blir det för lätt (t.ex. Kambodja mot Namibia och Bosnien).
        const sameContinent = countries.filter(
            (country) => country.continent === answer.continent && country.id !== answer.id
        )
        const wrong = shuffle(sameContinent).slice(0, OPTIONS_PER_QUESTION - 1)

        return {
            correct: toOption(answer),
            options: shuffle([answer, ...wrong]).map(toOption),
        }
    })
}