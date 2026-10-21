// Skapar public/data/capitals.json med huvudstaden för varje land i kartdatan.
// Då ligger huvudstäderna i projektet och sidan fungerar utan internet.
// Kör med: npm run fetch-capitals
//
// Huvudstäderna kommer från npm-paketet countries-list (MIT-licens).
// Där är namnen på engelska, så städer som heter annorlunda på svenska
// översätts med listan SWEDISH_NAMES nedan.

import { readFile, writeFile } from 'node:fs/promises'
import { countries } from 'countries-list'

// Kartdatan – vi tar bara med länder som finns i den
const WORLD_FILE = 'public/data/world.geojson'

// Vart resultatet sparas. Allt i /public blir tillgängligt för webbläsaren:
// public/data/capitals.json → http://localhost:5173/data/capitals.json
const OUTPUT_FILE = 'public/data/capitals.json'

// Engelska namn → svenska namn, för städer som heter annorlunda på svenska.
// Städer som heter likadant (Oslo, Paris, Berlin ...) behöver inte stå här.
const SWEDISH_NAMES = {
  'Addis Ababa': 'Addis Abeba',
  Algiers: 'Alger',
  Ashgabat: 'Asjchabad',
  Athens: 'Aten',
  Baghdad: 'Bagdad',
  Beijing: 'Peking',
  Belgrade: 'Belgrad',
  Bishkek: 'Bisjkek',
  Brussels: 'Bryssel',
  Bucharest: 'Bukarest',
  Cairo: 'Kairo',
  Copenhagen: 'Köpenhamn',
  Damascus: 'Damaskus',
  Dushanbe: 'Dusjanbe',
  Havana: 'Havanna',
  'Kuwait City': 'Kuwait',
  Lisbon: 'Lissabon',
  Lobamba: 'Mbabane', // Eswatini – Mbabane är den administrativa huvudstaden
  Luxembourg: 'Luxemburg',
  Moscow: 'Moskva',
  Prague: 'Prag',
  Reykjavik: 'Reykjavík',
  Rome: 'Rom',
  "Sana'a": 'Sanaa',
  Tashkent: 'Tasjkent',
  Tehran: 'Teheran',
  Vienna: 'Wien',
  Warsaw: 'Warszawa',
  Yerevan: 'Jerevan',
}

// Områden som saknar landskod i kartdatan (iso2 = '-99') och därför inte
// finns i countries-list. Nyckeln är id:t från kartdatan.
const MISSING_IN_SOURCE = {
  SOL: 'Hargeisa', // Somaliland
  CYN: 'Nicosia (norra delen)', // Nordcypern
}

// 1. Läs in kartdatan
const world = JSON.parse(await readFile(WORLD_FILE, 'utf-8'))

// 2. Slå upp huvudstaden för varje land
const capitals = {}
const missing = []

for (const feature of world.features) {
  const { id, iso2, name } = feature.properties

  // Huvudstaden från countries-list (tom text om landet saknas eller inte har någon)
  const english = countries[iso2]?.capital || MISSING_IN_SOURCE[id] || ''

  if (english === '') {
    missing.push(name) // t.ex. Antarktis
    continue
  }

  // Svenskt namn om det finns, annars det engelska
  capitals[id] = SWEDISH_NAMES[english] || english
}

// 3. Något har gått fel om nästan ingenting hittades (t.ex. paketet saknas)
if (Object.keys(capitals).length < 100) {
  console.error(`Bara ${Object.keys(capitals).length} huvudstäder hittades – något är fel.`)
  process.exit(1)
}

// 4. Spara. null, 2 = snygg indentering så att filen går att läsa
await writeFile(OUTPUT_FILE, JSON.stringify(capitals, null, 2) + '\n')

console.log(`Klart! Sparade ${Object.keys(capitals).length} huvudstäder i ${OUTPUT_FILE}`)
if (missing.length > 0) {
  console.log('Ingen huvudstad för:', missing)
}
