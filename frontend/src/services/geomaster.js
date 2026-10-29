// GeoMaster: en resa genom världen där varje land är granne med det förra.
// Varje land blir en fråga av slumpad typ – kontur, flagga eller huvudstad.

import { geoCentroid, geoDistance } from 'd3'
import { getRegionCountries, buildQuestions, FLAG_EXCLUDED_ISO2 } from './quiz.js'

// Hur många länder en resa har (färre om världsdelen har färre länder)
export const JOURNEY_LENGTH = 20

// Hur många fel man får göra innan resan tar slut
export const LIVES = 3

// Frågetyperna, med frågetexten som visas ovanför bilden
export const QUESTION_KINDS = {
  shape: 'Vilket land är detta?',
  flag: 'Vilket land har den här flaggan?',
  capital: 'Vilket land har den här huvudstaden?',
}

// Grannländerna laddas bara en gång: { SWE: ['FIN', 'NOR'], ... }
let neighborsPromise = null
export function loadNeighbors() {
  if (neighborsPromise === null) {
    neighborsPromise = fetch('/data/neighbors.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Kunde inte ladda grannländer (status ${response.status})`)
        return response.json()
      })
      .catch((error) => {
        neighborsPromise = null // försök igen nästa gång
        throw error
      })
  }
  return neighborsPromise
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)]
}

// Räknar ut resvägen: en lista med länder (landobjekt från kartdatan).
//   1. Börja i ett slumpat land i världsdelen.
//   2. Gå till en granne som inte är besökt. Finns flera väljs den som själv har
//      minst obesökta grannar kvar – då fastnar vägen sällan i en återvändsgränd.
//   3. Har landet inga obesökta grannar (t.ex. en ö) hoppar vi till det närmaste
//      obesökta landet, mätt mellan ländernas mittpunkter.
export function createJourney(world, neighbors, continent = 'World', length = JOURNEY_LENGTH) {
  const countries = getRegionCountries(world, continent)
  const byId = new Map(countries.map((country) => [country.id, country]))

  // Mittpunkten för varje land, för att mäta avstånd vid hopp
  const centers = new Map()
  for (const feature of world.features) {
    if (byId.has(feature.properties.id)) {
      centers.set(feature.properties.id, geoCentroid(feature))
    }
  }

  const unvisited = new Set(byId.keys())
  // Grannar som finns i världsdelen och inte är besökta
  const openNeighbors = (id) => (neighbors[id] || []).filter((other) => unvisited.has(other))

  let current = randomItem([...unvisited])
  const path = [current]
  unvisited.delete(current)

  while (path.length < length && unvisited.size > 0) {
    const options = openNeighbors(current)
    let next

    if (options.length > 0) {
      const fewest = Math.min(...options.map((id) => openNeighbors(id).length))
      next = randomItem(options.filter((id) => openNeighbors(id).length === fewest))
    } else {
      const here = centers.get(current)
      next = [...unvisited].reduce((closest, id) =>
        geoDistance(here, centers.get(id)) < geoDistance(here, centers.get(closest)) ? id : closest
      )
    }

    path.push(next)
    unvisited.delete(next)
    current = next
  }

  return path.map((id) => byId.get(id))
}

// Gör frågor av resvägen. Varje fråga får en slumpad typ bland de som går för
// landet: flagga bara om landet har en egen flagga, huvudstad bara om den finns.
// Samma typ kommer aldrig mer än två gånger i rad.
//   Varje fråga: { correct, options, kind: 'shape' | 'flag' | 'capital' }
export function createGeoMasterQuestions(world, journey, continent, capitals) {
  const countries = getRegionCountries(world, continent)
  const questions = buildQuestions(countries, journey)

  return questions.map((question, index) => {
    const country = journey[index]
    let kinds = ['shape']
    if (!FLAG_EXCLUDED_ISO2.includes(country.iso2)) kinds.push('flag')
    if (capitals[country.id]) kinds.push('capital')

    // Inte samma typ tre gånger i rad
    const previous = questions.slice(Math.max(0, index - 2), index).map((q) => q.kind)
    if (previous.length === 2 && previous[0] === previous[1] && kinds.length > 1) {
      kinds = kinds.filter((kind) => kind !== previous[0])
    }

    question.kind = randomItem(kinds)
    return question
  })
}
