// Kommer ihåg vilka länder användaren redan har fått som rätt svar,
// så att samma land inte kommer igen förrän alla länder i världsdelen har varit med.
//
// Sparas i webbläsarens localStorage, separat för varje quiztyp och världsdel,
// t.ex. nyckeln 'geoknowledge.seen.flag.Europe'. Fungerar även utan inloggning.

function storageKey(quizType, continent) {
    return `geoknowledge.seen.${quizType}.${continent}`
}

// Id:n på länder som redan varit rätt svar i den här "omgången" av världsdelen
export function getSeenIds(quizType, continent) {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey(quizType, continent)))
        return Array.isArray(saved) ? saved : []
    } catch {
        // T.ex. trasig data eller privat läge där localStorage inte går att läsa
        return []
    }
}

// Sparar länderna från ett avslutat quiz.
//   answerIds – id:n på rätt svar i quizet som nyss spelades
//   regionIds – id:n på ALLA länder i världsdelen
//
// När alla länder har varit med börjar en ny omgång. De länder i quizet som
// redan var sedda (de som fyllde på när de osedda tog slut) blir då de
// första i den nya omgången.
export function markSeen(quizType, continent, answerIds, regionIds) {
    const before = getSeenIds(quizType, continent)
    const all = new Set([...before, ...answerIds])
    const roundComplete = regionIds.every((id) => all.has(id))

    const next = roundComplete
        ? answerIds.filter((id) => before.includes(id))
        : [...all]

    try {
        localStorage.setItem(storageKey(quizType, continent), JSON.stringify(next))
    } catch {
        // Går det inte att spara fungerar quizet ändå, bara utan minne
    }
}
