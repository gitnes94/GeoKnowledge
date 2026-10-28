// Allt som handlar om troféer: vilka som finns, när de låses upp och
// vilka som är nya efter ett quiz.
//
// Backenden (GET /api/trophies) ger bara siffrorna:
//   { level, perfect: { shape: 2, ... }, correct: { flag: ['SWE', ...], ... } }
// Här bestäms vilka troféer det blir av dem.

import { apiFetch } from '@/services/api'
import { loadWorld } from '@/services/countries.js'
import { CONTINENTS, getQuizPool } from '@/services/quiz.js'

// Nivåtroféer: låses upp när man når nivån
const LEVEL_TROPHIES = [
  { level: 2, icon: '🌱', name: 'Första steget' },
  { level: 5, icon: '🧭', name: 'Resenär' },
  { level: 10, icon: '🗺️', name: 'Upptäcktsresande' },
  { level: 20, icon: '🌍', name: 'Världsmedborgare' },
]

// Quiztyperna, med namn och ikon för mästartroféerna
export const QUIZ_TYPES = {
  shape: { name: 'Konturer', icon: '🧩' },
  flag: { name: 'Flaggor', icon: '🚩' },
  capital: { name: 'Huvudstäder', icon: '🏛️' },
}

// Rubrikerna på trofésidan, i den ordning de visas
export const TROPHY_GROUPS = {
  level: 'Nivåer',
  perfect: 'Felfria quiz',
  master: 'Mästare – alla länder rätt minst en gång',
}

// Hämtar siffrorna för den inloggade användaren
export async function getTrophyStats() {
  const response = await apiFetch('/api/trophies')
  if (!response.ok) {
    const error = new Error(`Kunde inte hämta troféer (status ${response.status})`)
    error.status = response.status
    throw error
  }
  return response.json()
}

// Kartdatan laddas bara en gång, även om troféerna räknas flera gånger
let worldPromise = null
export function loadTrophyWorld() {
  if (worldPromise === null) {
    worldPromise = loadWorld().catch((error) => {
      worldPromise = null // försök igen nästa gång
      throw error
    })
  }
  return worldPromise
}

// Räknar ut alla troféer utifrån siffrorna från backenden.
// Varje trofé: { id, group, icon, name, description, unlocked, progress? }
//   progress – { current, total } för troféer man kan se hur långt man kommit på
// Mästartroféerna har dessutom quizType och continent, för tabellen på trofésidan.
export function buildTrophies(stats, world) {
  const trophies = []

  // 1. Nivåer
  for (const { level, icon, name } of LEVEL_TROPHIES) {
    trophies.push({
      id: `level-${level}`,
      group: 'level',
      icon,
      name,
      description: `Nå nivå ${level}`,
      unlocked: stats.level >= level,
      progress: { current: Math.min(stats.level, level), total: level },
    })
  }

  // 2. Felfria quiz
  const perfectCounts = Object.values(stats.perfect)
  const perfectTotal = perfectCounts.reduce((sum, count) => sum + count, 0)
  const perfectTypes = perfectCounts.filter((count) => count > 0).length
  const typeCount = Object.keys(QUIZ_TYPES).length

  trophies.push(
    {
      id: 'perfect-1',
      group: 'perfect',
      icon: '⭐',
      name: 'Felfri',
      description: 'Svara rätt på alla frågor i ett quiz',
      unlocked: perfectTotal >= 1,
    },
    {
      id: 'perfect-types',
      group: 'perfect',
      icon: '🎯',
      name: 'Tre av tre',
      description: 'Ett felfritt quiz i varje quiztyp',
      unlocked: perfectTypes >= typeCount,
      progress: { current: perfectTypes, total: typeCount },
    },
    {
      id: 'perfect-10',
      group: 'perfect',
      icon: '🌟',
      name: 'Ofelbar',
      description: 'Tio felfria quiz',
      unlocked: perfectTotal >= 10,
      progress: { current: Math.min(perfectTotal, 10), total: 10 },
    }
  )

  // 3. Mästare: alla länder i en världsdel rätt minst en gång, per quiztyp
  for (const [type, { name, icon }] of Object.entries(QUIZ_TYPES)) {
    const correct = new Set(stats.correct[type] || [])

    for (const [continent, continentName] of Object.entries(CONTINENTS)) {
      const pool = getQuizPool(world, type, continent)
      const current = pool.filter((country) => correct.has(country.id)).length

      trophies.push({
        id: `master-${type}-${continent}`,
        group: 'master',
        quizType: type,
        continent,
        icon: continent === 'World' ? '👑' : icon,
        name: `${name} – ${continentName}`,
        description: `Alla ${pool.length} länder rätt minst en gång`,
        unlocked: pool.length > 0 && current === pool.length,
        progress: { current, total: pool.length },
      })
    }
  }

  return trophies
}

// Används av quizvyerna för att visa "Ny trofé!" på slutskärmen:
//   1. När quizet startar: const before = startTrophyCheck()
//   2. När resultatet är sparat: const nya = await findNewTrophies(before)
// Siffrorna hämtas före och efter quizet, och de troféer som är upplåsta
// efter men inte före är nya.
export function startTrophyCheck() {
  return getTrophyStats().catch(() => null) // går det inte visas bara inga nya
}

export async function findNewTrophies(beforePromise) {
  const [before, after, world] = await Promise.all([
    beforePromise,
    getTrophyStats(),
    loadTrophyWorld(),
  ])
  if (!before) return []

  const unlockedBefore = new Set(
    buildTrophies(before, world).filter((trophy) => trophy.unlocked).map((trophy) => trophy.id)
  )
  return buildTrophies(after, world).filter(
    (trophy) => trophy.unlocked && !unlockedBefore.has(trophy.id)
  )
}
