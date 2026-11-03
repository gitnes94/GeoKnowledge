// Skapar backend/data/quiz-data.json: allt backenden behöver för att skapa
// och rätta quizfrågor. Kör med: npm run build-quiz-data
//
// Varför en egen fil i backenden? Frågorna skapas numera på servern, så att
// webbläsaren aldrig får veta rätt svar i förväg. Backenden kan inte läsa
// frontendens public/-mapp när de körs på olika servrar, därför samlas
// datan här och checkas in i backend/data/.
//
// Kör om skriptet om world.geojson, countries-detail.geojson, capitals.json,
// neighbors.json eller flaggorna har ändrats.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { geoCentroid } from 'd3'
import { FLAG_EXCLUDED_ISO2 } from '../src/services/quiz.js'

const WORLD_FILE = 'public/data/world.geojson'
const DETAIL_FILE = 'public/data/countries-detail.geojson'
const CAPITALS_FILE = 'public/data/capitals.json'
const NEIGHBORS_FILE = 'public/data/neighbors.json'
const FLAG_FOLDER = 'public/flags'
const OUTPUT_FOLDER = '../backend/data'
const OUTPUT_FILE = `${OUTPUT_FOLDER}/quiz-data.json`

// Antal decimaler i konturernas koordinater. 3 decimaler ≈ 100 meter, vilket
// inte syns när landet ritas – men filen blir ungefär hälften så stor.
const DECIMALS = 3

// Samma regler som getQuizCountries i src/services/quiz.js: bara länder som
// kan förekomma i ett quiz
function isQuizCountry(country) {
  return (
    country.name_sv &&
    country.iso2 !== '-99' &&
    country.continent !== 'Antarctica' &&
    country.continent !== 'Seven seas (open ocean)'
  )
}

// Avrundar alla koordinater i en (nästlad) lista
function round(coordinates) {
  if (typeof coordinates === 'number') {
    return Number(coordinates.toFixed(DECIMALS))
  }
  return coordinates.map(round)
}

const readJson = async (file) => JSON.parse(await readFile(file, 'utf-8'))

const [world, detail, capitals, neighbors] = await Promise.all([
  readJson(WORLD_FILE),
  readJson(DETAIL_FILE),
  readJson(CAPITALS_FILE),
  readJson(NEIGHBORS_FILE),
])

const detailById = new Map(detail.features.map((feature) => [feature.properties.id, feature]))

const countries = []
const shapes = {}
const flags = {}
const missingFlags = []

for (const feature of world.features) {
  const properties = feature.properties
  if (!isQuizCountry(properties)) continue

  const { id, name_sv, continent, iso2 } = properties

  // Mittpunkten räknas på den enkla formen, precis som GeoMaster gjorde förut
  const [lon, lat] = geoCentroid(feature)

  countries.push({
    id,
    name_sv,
    continent,
    iso2,
    capital: capitals[id] ?? null,
    neighbors: neighbors[id] ?? [],
    center: [Number(lon.toFixed(3)), Number(lat.toFixed(3))],
  })

  // Den detaljerade formen om den finns, annars den enkla
  const geometry = (detailById.get(id) ?? feature).geometry
  shapes[id] = { type: geometry.type, coordinates: round(geometry.coordinates) }

  // Flaggan som SVG-text. Områden utan egen flagga får ingen.
  if (!FLAG_EXCLUDED_ISO2.includes(iso2)) {
    try {
      flags[id] = await readFile(`${FLAG_FOLDER}/${iso2.toLowerCase()}.svg`, 'utf-8')
    } catch {
      missingFlags.push(`${id} (${iso2})`)
    }
  }
}

if (missingFlags.length > 0) {
  console.warn(`Flagga saknas för: ${missingFlags.join(', ')} – de kommer inte med i flaggquizet.`)
}

await mkdir(OUTPUT_FOLDER, { recursive: true })
await writeFile(OUTPUT_FILE, JSON.stringify({ countries, shapes, flags }) + '\n')

console.log(
  `Sparade ${countries.length} länder, ${Object.keys(shapes).length} konturer och ` +
    `${Object.keys(flags).length} flaggor i ${OUTPUT_FILE}`
)
