<script setup>
import { onMounted, ref } from 'vue'
import { getLeaderboard } from '@/services/leaderboard'

const leaderboard = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')

const tables = [
  { key: 'contour', title: 'Konturquiz', value: (row) => `${row.percentage}%`, kind: 'accuracy' },
  { key: 'flags', title: 'Flaggquiz', value: (row) => `${row.percentage}%`, kind: 'accuracy' },
  { key: 'capitals', title: 'Huvudstadsquiz', value: (row) => `${row.percentage}%`, kind: 'accuracy' },
  { key: 'allQuizzes', title: 'Alla quiz – andel rätt', value: (row) => `${row.percentage}%`, kind: 'accuracy' },
  { key: 'xp', title: 'Mest XP', value: (row) => `${row.xp} XP`, kind: 'xp' },
  { key: 'quizCount', title: 'Flest genomförda quiz', value: (row) => row.quiz_count, kind: 'quiz-count' },
]

onMounted(async () => {
  try {
    leaderboard.value = await getLeaderboard()
  } catch (error) {
    console.error('Kunde inte läsa in topplistan:', error)
    errorMessage.value = 'Topplistan kunde inte hämtas. Försök igen senare.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <main class="leaderboard-view">
    <h2>Topplista</h2>

    <p v-if="isLoading" class="status-message" role="status">
      Hämtar topplistan …
    </p>
    <p v-else-if="errorMessage" class="status-message error" role="alert">
      Topplistan kunde inte hämtas. Försök igen senare.
    </p>

    <div v-else class="leaderboard-grid">
      <section v-for="table in tables" :key="table.key" class="leaderboard-card">
        <h3>{{ table.title }}</h3>

        <p v-if="leaderboard[table.key].length === 0" class="empty-message">
          Inga resultat ännu.
        </p>

        <div v-else class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Plats</th>
                <th scope="col">Användare</th>
                <th scope="col">
                  {{ table.kind === 'accuracy' ? 'Andel rätt' : table.kind === 'xp' ? 'XP' : 'Quiz' }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in leaderboard[table.key]" :key="row.userId">
                <td>{{ row.place }}</td>
                <td>{{ row.username }}</td>
                <td>
                  {{ table.value(row) }}
                  <small v-if="table.kind === 'accuracy'">
                    ({{ row.correctAnswers }}/{{ row.totalQuestions }})
                  </small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.leaderboard-view {
  max-width: 70rem;
  width: calc(100% - 2rem);
  margin: 1.5rem auto;
  padding: 2rem 1.5rem;
  background: var(--card-bg, #ffffff);
  border-radius: 1.75rem;
  box-shadow: 0 10px 25px rgba(27, 77, 62, 0.12);
}

h2 {
  margin: 0 0 1.5rem;
  text-align: center;
  font-size: 1.75rem;
}

.leaderboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.leaderboard-card {
  min-width: 0;
  padding: 1rem;
  border: 2px solid var(--primary-green, #1b4d3e);
  border-radius: 1.25rem;
}

h3 {
  margin: 0 0 0.75rem;
  color: var(--primary-green, #1b4d3e);
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

th,
td {
  padding: 0.55rem 0.4rem;
  border-bottom: 1px solid rgba(27, 77, 62, 0.2);
}

th {
  font-size: 0.9rem;
}

td:first-child {
  width: 3.5rem;
  font-weight: 700;
}

small {
  color: #52675f;
  white-space: nowrap;
}

.empty-message,
.status-message {
  margin: 0.5rem 0;
  text-align: center;
}

.error {
  color: #a11b1b;
}

@media (max-width: 700px) {
  .leaderboard-grid {
    grid-template-columns: 1fr;
  }

  .leaderboard-view {
    padding: 1.5rem 1rem;
  }
}
</style>