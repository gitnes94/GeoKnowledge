// Quizinställningar och vilka länder som kan komma i ett quiz.
//
// Själva frågorna skapas på servern (backend/quiz/questions.js), så att
// webbläsaren aldrig får veta rätt svar i förväg. Det som finns kvar här
// används av quizvalet och troféerna. Reglerna för vilka länder som är med
// måste stämma med backend/quiz/data.js.

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

// Lägen för quizet.
export const MODES = [
    { id: 'normal', name: 'Vanligt', timeLimit: null },
    { id: 'timed', name: '⏱ På tid', timeLimit: 60 },
]

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
