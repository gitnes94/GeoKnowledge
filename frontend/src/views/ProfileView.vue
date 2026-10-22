<script setup>

import { ref, onMounted, computed } from 'vue'
import { getResults } from '../services/results.js'
import { getProgress } from '../services/progress.js'
import XpBar from '../components/XpBar.vue'

const result = ref(null)
const progress = ref(null)
const totalAnswers = ref(0)
const totalCorrect = ref(0)

const quizMap = {
    flag: 'Flaggquiz',
    shape: 'Konturquiz',
    capital: 'Huvudstadsquiz'
}

const regionMap = {
    World: 'Hela världen',
    Europe: 'Europa',
    Asia: 'Asien',
    Africa: 'Afrika',
    'North America': 'Nordamerika',
    'South America': 'Sydamerika',
    Oceania: 'Oceanien'
}

const currentPage = ref(1)
const itemsPerPage = ref(6)
const totalPages = ref(0)
const paginatedResult = ref(null)

// Navigation methods
const nextPage = () => {
    if (currentPage.value < totalPages.value.value) {
        currentPage.value++
        calcPaginatedResult()
    }
}

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
        calcPaginatedResult()
    }
}

function calcPaginatedResult () {
    paginatedResult.value = computed(() => {
        const start = (currentPage.value - 1) * itemsPerPage.value
        const end = start + itemsPerPage.value
        return result.value.slice(start, end)
    })
}

onMounted(async () => {
    result.value = await getResults()
    progress.value = await getProgress()

    totalCorrect.value = computed(() => {
        return result.value.reduce((accumulator, currentItem) => {
        return accumulator + currentItem.correct_count
        }, 0) // 0 is the initial value of the accumulator
    })

    totalAnswers.value = computed(() => {
        return result.value.reduce((accumulator, currentItem) => {
        return accumulator + currentItem.total
        }, 0) // 0 is the initial value of the accumulator
    })

    totalPages.value = computed(() => {
        return Math.ceil(result.value.length / itemsPerPage.value)
    })

    calcPaginatedResult()
})
</script>

<template>
    <section class="profile">
        <XpBar class="xpBar"
          v-if="progress"
          :level="progress.level"
          :xp-into-level="progress.xpIntoLevel"
          :xp-per-level="progress.xpPerLevel"
        />
        <div class="stats">
            <p>
                Antal korrekta svar: {{ totalCorrect }}
            </p>
            <p>
                Totalt antal svar: {{ totalAnswers }}
            </p>
        </div>
        
        <div v-if="paginatedResult" class="statslist">
            <ul>
                <li v-for="item in paginatedResult.value" :key="item.id">
                    <p> {{ new Date(item.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short'}) }} </p>
                    <p> Quiztyp: {{computed(() => { return quizMap[item.quiz_type] || 'Okänt' })}} </p>
                    <p> Region: {{computed(() => { return regionMap[item.region] || 'Okänt' })}} </p>
                    <p> Resultat: {{ item.correct_count }} / {{ item.total }} rätt! </p>
                </li>
            </ul>

            <div class="pagination-controls">
                <button type="button" @click="prevPage" :disabled="currentPage === 1">Previous</button>
                <span>Page {{ currentPage }} of {{ totalPages }}</span>
                <button type="button" @click="nextPage" :disabled="currentPage === totalPages">Next</button>
            </div>
        </div>
    </section>
</template>

<style scoped>

.xpBar {
    min-width: 300px;
    width: 100%;
}

.profile {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.stats {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    margin: 10px auto;
    gap: 50px;
    width: calc(100% - 40px);
    max-width: 500px;

    background-color: rgba(255, 255, 255, 0.85);
    border-radius: 24px; 
    box-shadow: 0 10px 25px rgba(27, 77, 62, 0.12); 
  
    text-align: center;
    font-weight: bold;
    font-size: 18px;
}

.statslist {
    display: flex;
    flex-direction: column;
    
    padding: 12px 12px 16px 12px;
    margin: 10px auto;
    width: calc(100% - 40px);
    max-width: 600px;

    background-color: rgba(255, 255, 255, 0.85);
    border-radius: 24px; 
    box-shadow: 0 10px 25px rgba(27, 77, 62, 0.12); 
}

.pagination-controls {
    display: flex;
    justify-content: center;
    margin-top: 15px;
    gap: 5px;
}

ul {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    padding: 0;
    margin: 0;
    gap: 15px;
    list-style: none;
    justify-content: center;
    align-items: center;
    text-align: center;
    font-weight: bold;
}

ul li {
    line-height: 8px;
    break-inside: avoid;
    text-align: center;
    background-color: #41ac5a40;
    border-radius: 24px;
}

</style>