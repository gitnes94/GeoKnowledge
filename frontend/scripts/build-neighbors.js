// Skapar public/data/neighbors.json: vilka länder som gränsar till varandra.
// Används av GeoMaster-quizet för att resan ska gå från land till grannland.
// Kör med: npm run build-neighbors
//
// Två länder räknas som grannar om de delar en gränslinje i kartdatan.
// topojson-server gör om GeoJSON till TopoJSON, där varje gränslinje bara
// sparas en gång – då kan topojson-client se vilka länder som delar linjer.

import { readFile, writeFile } from 'node:fs/promises'
import { topology } from 'topojson-server'
import { neighbors } from 'topojson-client'

const WORLD_FILE = 'public/data/world.geojson'
const OUTPUT_FILE = 'public/data/neighbors.json'

// 1. Läs in kartdatan
const world = JSON.parse(await readFile(WORLD_FILE, 'utf-8'))

// 2. Gör om till TopoJSON. 'countries' är bara ett namn på lagret.
const topo = topology({ countries: world })

// 3. neighbors ger, för varje land, en lista med index på grannländerna
const geometries = topo.objects.countries.geometries
const neighborIndexes = neighbors(geometries)

// 4. Gör om index till landskoder: { SWE: ['NOR', 'FIN'], ... }
const ids = world.features.map((feature) => feature.properties.id)
const result = {}
ids.forEach((id, index) => {
  result[id] = neighborIndexes[index].map((other) => ids[other]).sort()
})

// 5. Något har gått fel om nästan inga länder har grannar
const withNeighbors = Object.values(result).filter((list) => list.length > 0).length
if (withNeighbors < 100) {
  console.error(`Bara ${withNeighbors} länder har grannar – något är fel.`)
  process.exit(1)
}

await writeFile(OUTPUT_FILE, JSON.stringify(result, null, 2) + '\n')
console.log(`Klart! ${withNeighbors} av ${ids.length} länder har grannar. Sparat i ${OUTPUT_FILE}`)
