// här samlas allt som handlar om att HÄMTA landdata.
// Komponenterna anropar bara funtionerna och behöver inte veta
// var datan ligger eller vilket format filen har.

// Filer i public/ serveras från webbplatsens root:
// public/data/world.geojson →  http://localhost:5173/data/world.geojson

const WORLD_URL = '/data/world.geojson'
const DETAIL_URL = '/data/countries-detail.geojson'

// Den detaljerade datan laddas bara EN gång – här sparas pågående/klar hämtning
let detailPromise = null

// Hämtar alla länders geometri som GeoJSON
export async function loadWorld() {
    const response = await fetch(WORLD_URL)
    if (!response.ok) {
        throw new Error(`Kunde inte ladda ${WORLD_URL} (status ${response.status})`)
    } 
    return response.json()
}

// Hämtar alla länders DETALJERADE geometri (för landsvyn)
async function fetchCountryDetail() {
    const response = await fetch(DETAIL_URL)
    if (!response.ok) {
        throw new Error(`Kunde inte ladda ${DETAIL_URL} (status ${response.status})`)
    }
    return response.json()
}

// Ger den detaljerade datan. Första anropet startar hämtningen –
// alla senare anrop får samma hämtning i stället för att ladda filen igen.
export function loadCountryDetail() {
    if (detailPromise === null) {
        detailPromise = fetchCountryDetail()
    }
    return detailPromise
}

// ---- Huvudstäder ----
// public/data/capitals.json skapas med: npm run fetch-capitals
// Formatet är { "SWE": "Stockholm", "DNK": "Köpenhamn", ... }

const CAPITALS_URL = '/data/capitals.json'

// Laddas bara EN gång, precis som den detaljerade kartdatan
let capitalsPromise = null

async function fetchCapitals() {
    const response = await fetch(CAPITALS_URL)
    if (!response.ok) {
        throw new Error(`Kunde inte ladda ${CAPITALS_URL} (status ${response.status})`)
    }
    return response.json()
}

// Ger alla huvudstäder. Första anropet startar hämtningen –
// alla senare anrop får samma hämtning i stället för att ladda filen igen.
// Misslyckas hämtningen glömmer vi den, så att nästa anrop kan försöka igen.
export function loadCapitals() {
    if (capitalsPromise === null) {
        capitalsPromise = fetchCapitals().catch((error) => {
            capitalsPromise = null
            throw error
        })
    }
    return capitalsPromise
}
