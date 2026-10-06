// Hämtar världens länder EN gång och sparar en förenklad kopia i projektet.
// Kör med: npm run fetch-data

// Node:s inbyggda verktyg för att skapa mappar och skriva filer
import { mkdir, writeFile } from 'node:fs/promises'

// D3:s geografi-funktioner fungerar även i Node
import { geoBounds, geoCentroid } from 'd3'

// Varifrån datan hämtas (Natural Earth, skala 1:110 miljoner)
const COUNTRIES_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'

// Samma data, men avlägsna områden (t.ex. Franska Guyana, Svalbard) är egna former
const MAP_UNITS_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_map_units.geojson'

// Samma två filer i mer detaljerad skala (1:50 miljoner) – för landsvyn
const DETAIL_COUNTRIES_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'
const DETAIL_MAP_UNITS_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_map_units.geojson'


// Vart datan sparas. Allt i /public blir tillgängligt för webbläsaren.
const OUTPUT_FOLDER = 'public/data'
const OUTPUT_FILE = `${OUTPUT_FOLDER}/world.geojson`
const DETAIL_FILE = `${OUTPUT_FOLDER}/countries-detail.geojson`

// Völjer en stabil ISO alpha-3-kod för ett land.
// Natural Earth har "-99" när koden saknas:
//   - ISO_A3_EH fixar t.ex. Frankrike (FRA) och Norge (NOR)
//   - ADM0_A3 används för områden utan officiell kod, t.ex. Kosovo (KOS)
function getCountryId(properties) {
    if (properties.ISO_A3_EH !== '-99') {
        return properties.ISO_A3_EH
    }
    return properties.ADM0_A3
}

// Laddar ner en GeoJSON-fil och returnerar innehållet
async function downloadGeoJson(url) {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Kunde inte hämta ${url} (status ${response.status})`)
    }
    return response.json()
}

// Hur många grader utanför ett lands område en del får ligga och ändå räknas med
const MARGIN = 3

// Ger alla polygoner i en geometri som en lista.
// Polygon = en sammanhängande yta, MultiPolygon = flera ytor (t.ex. öar)
function getPolygons(geometry) {
    if (geometry.type === 'Polygon') {
        return [geometry.coordinates]
    }
    return geometry.coordinates
}

// Ligger punkten [longitud, latitud] inom området (plus marginal)?
// Området kommer från geoBounds: [[väst, syd], [öst, nord]]
function isInsideBounds([longitude, latitude], bounds) {
    const [[west, south], [east, north]] = bounds

    if (latitude < south - MARGIN || latitude > north + MARGIN) {
        return false
    }

    // Vanligt fall: området korsar inte 180-graderslinjen
    if (west <= east) {
        return longitude >= west - MARGIN && longitude <= east + MARGIN
    }

    // Området korsar 180-graderslinjen (t.ex. Ryssland, Fiji): väst > öst
    return longitude >= west - MARGIN || longitude <= east + MARGIN
}

// 1. Hämta orginaldatan
console.log('Hämtar data från Natural Earth...')
const countries = await downloadGeoJson(COUNTRIES_URL)

const mapUnits = await downloadGeoJson(MAP_UNITS_URL)


// 2. Räkna hur många delar varje id har i map units
//    (t.ex. är Storbritannien uppdelat i England, Skottland, Wales och Nordirland)
const partsPerId = {}
for (const feature of mapUnits.features) {
    const id = getCountryId(feature.properties)
    partsPerId[id] = (partsPerId[id] || 0) + 1
}
const splitIds = Object.keys(partsPerId).filter((id) => partsPerId[id] > 1)
console.log('Uppdelade länder:', splitIds)


// 3. Välj vilka former som ska användas:
//    - map units för allt som INTE är uppdelat
//    - hela landet från countries för det som är uppdelat
const unsplitUnits = mapUnits.features.filter(
    (feature) => partsPerId[getCountryId(feature.properties)] === 1
)
const wholeCountries = countries.features.filter(
    (feature) => splitIds.includes(getCountryId(feature.properties))
)
const selectedFeatures = [...unsplitUnits, ...wholeCountries]

// 2. Bygg en ny, mindre GeoJASON med bara det vi behöver
const world = {
    type: 'FeatureCollection',
    features: selectedFeatures.map((feature) => ({
        type: 'Feature',
        properties: {
            id: getCountryId(feature.properties),
            name: feature.properties.NAME,
            name_sv: feature.properties.NAME_SV,      // svenskt namn, t.ex. "Frankrike"
            continent: feature.properties.CONTINENT,  // världsdel, t.ex. "Europe"
            iso2: feature.properties.ISO_A2_EH,       // tvåbokstavskod, t.ex. "FR" (till flaggor)
        },
        geometry: feature.geometry,
    })),
}

// 3. Spara till film (mkdir skapar mappen om den inte redan finns)
await mkdir(OUTPUT_FOLDER, { recursive: true })
await writeFile(OUTPUT_FILE, JSON.stringify(world))
console.log(`Klart! Sparade ${world.features.length} länder i ${OUTPUT_FILE}`)

// ---- Detaljerade former för landsvyn (1:50m) ----

console.log('Hämtar detaljerad data (1:50m)...')
const detailCountries = await downloadGeoJson(DETAIL_COUNTRIES_URL)
const detailMapUnits = await downloadGeoJson(DETAIL_MAP_UNITS_URL)


const detailFeatures = world.features.map((simpleFeature) => {
    const id = simpleFeature.properties.id

    // Leta först bland hela länder, annars bland map units (t.ex. GUF, SJM)
    let sources = detailCountries.features.filter(
        (feature) => getCountryId(feature.properties) === id
    )
    if (sources.length === 0) {
        sources = detailMapUnits.features.filter(
            (feature) => getCountryId(feature.properties) === id
        )
    }

    // Alla detaljerade delar – och bara de som ligger där den enkla formen ligger
    const allPolygons = sources.flatMap((feature) => getPolygons(feature.geometry))
    const bounds = geoBounds(simpleFeature)
    const keptPolygons = allPolygons.filter((polygon) =>
        isInsideBounds(geoCentroid({ type: 'Polygon', coordinates: polygon }), bounds)
    )

    return {
        type: 'Feature',
        properties: { id },
        geometry: { type: 'MultiPolygon', coordinates: keptPolygons },
    }
})


// Kontroll: fick något land inga former alls?
const emptyIds = detailFeatures
    .filter((feature) => feature.geometry.coordinates.length === 0)
    .map((feature) => feature.properties.id)
if (emptyIds.length > 0) {
    console.warn('Varning! Inga detaljerade former för:', emptyIds)
}

const detail = { type: 'FeatureCollection', features: detailFeatures }
await writeFile(DETAIL_FILE, JSON.stringify(detail))
console.log(`Klart! Sparade ${detailFeatures.length} detaljerade länder i ${DETAIL_FILE}`)