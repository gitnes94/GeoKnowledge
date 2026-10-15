// Kopierar flaggorna för alla länder i kartdatan till public/flags/.
// Då ligger flaggorna i projektet och quizet fungerar utan internet.
// Kör med: npm run copy-flags
//
// Flaggorna kommer från npm-paketet flag-icons (MIT-licens).

import { mkdir, copyFile, readFile, access } from 'node:fs/promises'

// Varifrån flaggorna kopieras (4x3 = alla flaggor har samma proportioner)
const SOURCE_FOLDER = 'node_modules/flag-icons/flags/4x3'

// Vart de kopieras. Allt i /public blir tillgängligt för webbläsaren:
// public/flags/fr.svg → http://localhost:5173/flags/fr.svg
const OUTPUT_FOLDER = 'public/flags'

// Kartdatan – vi kopierar bara flaggor för länder som finns i den
const WORLD_FILE = 'public/data/world.geojson'

// 0. Kontrollera att flag-icons är installerat innan vi börjar.
//    Annars skulle varje kopiering misslyckas av samma anledning.
try {
  await access(SOURCE_FOLDER)
} catch {
  console.error(`Hittar inte ${SOURCE_FOLDER}. Kör "npm install" först.`)
  process.exit(1)
}

// 1. Läs in kartdatan och plocka ut alla landskoder (t.ex. "FR")
const world = JSON.parse(await readFile(WORLD_FILE, 'utf-8'))
const codes = world.features
    .map((feature) => feature.properties.iso2)
    .filter((code) => code !== '-99') // områden utan landskod har ingen flagga

// 2. Skapa mappen om den inte finns
await mkdir(OUTPUT_FOLDER, { recursive: true })

// 3. Kopiera en flagga per land. Filnamnen i flag-icons har små bokstäver.
let copied = 0
const missing = []

for (const code of codes) {
  const fileName = `${code.toLowerCase()}.svg`
  try {
    await copyFile(`${SOURCE_FOLDER}/${fileName}`, `${OUTPUT_FOLDER}/${fileName}`)
    copied++
  } catch (error) {
    // ENOENT = "filen finns inte". Bara då saknas just den här flaggan.
    // Alla andra fel (t.ex. att mappen inte går att skriva till) avbryter skriptet.
    if (error.code === 'ENOENT') {
      missing.push(code)
    } else {
      throw error
    }
  }
}

// 4. Kopierades ingenting har något gått fel – avsluta med ett fel
if (copied === 0) {
  console.error('Inga flaggor kopierades!')
  process.exit(1)
}

console.log(`Klart! Kopierade ${copied} flaggor till ${OUTPUT_FOLDER}`)
if (missing.length > 0) {
  console.warn('Varning! Hittade ingen flagga för:', missing)
}