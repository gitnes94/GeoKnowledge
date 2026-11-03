// Rättningen av ett quiz. Här finns bara vanliga funktioner utan databas,
// så att reglerna går att testa (se test/grading.test.js).
//
// En session ser ut så här (en rad i tabellen quiz_sessions):
//   {
//     id, user_id, quiz_type, region,
//     time_limit: 60 | null,   // sekunder, null = inte på tid
//     lives: 3 | null,         // antal fel man får göra, null = inga liv
//     questions: [{ country_id, kind, options: [...] }, ...],
//     answers:   [{ option_id, correct, at }, ...],   // at = millisekunder
//     started_at, finished_at  // millisekunder (finished_at null tills klart)
//   }
//
// Tiden mäts ALLTID med serverns klocka. Det klienten säger om tiden används inte.

// Svar som kommer lite efter tidsgränsen godtas ändå, eftersom det tar en
// stund för svaret att komma fram över nätet. Bonus för tid kvar ges inte för dem.
const ANSWER_GRACE_MS = 3000;

// Tidpunkten då tiden tar slut, eller null om quizet inte är på tid
function deadlineOf(session) {
    return session.time_limit ? session.started_at + session.time_limit * 1000 : null;
}

function mistakesOf(session) {
    return session.answers.filter((answer) => !answer.correct).length;
}

function outOfLives(session) {
    return session.lives !== null && mistakesOf(session) >= session.lives;
}

// Är quizet slut? Alla frågor besvarade, slut på liv eller slut på tid.
function isOver(session, now) {
    const deadline = deadlineOf(session);
    return (
        session.answers.length >= session.questions.length ||
        outOfLives(session) ||
        (deadline !== null && now > deadline + ANSWER_GRACE_MS)
    );
}

// Ett fel att skicka tillbaka: { error: { status, message } }
function fail(status, message) {
    return { error: { status, message } };
}

// Rättar ett svar.
//   index    – vilken fråga (0 = första). Frågorna måste besvaras i ordning.
//   optionId – landet användaren valde, t.ex. 'SWE'
//   now      – serverns klocka i millisekunder
//
// Svar vid OK:
//   { answer: { option_id, correct, at }, correct, correct_id, done }
//   done – true om quizet är slut efter det här svaret
function gradeAnswer(session, index, optionId, now) {
    if (session.finished_at !== null) {
        return fail(409, 'Quizet är redan avslutat.');
    }
    if (!Number.isInteger(index) || index < 0 || index >= session.questions.length) {
        return fail(400, 'Ogiltig fråga.');
    }
    // Samma fråga två gånger, eller en fråga längre fram
    if (index !== session.answers.length) {
        return fail(409, 'Frågorna måste besvaras en gång var, i ordning.');
    }
    if (outOfLives(session)) {
        return fail(409, 'Slut på liv.');
    }
    const deadline = deadlineOf(session);
    if (deadline !== null && now > deadline + ANSWER_GRACE_MS) {
        return fail(409, 'Tiden är slut.');
    }

    const question = session.questions[index];
    if (typeof optionId !== 'string' || !question.options.includes(optionId)) {
        return fail(400, 'Svaret finns inte bland alternativen.');
    }

    const correct = optionId === question.country_id;
    const answer = { option_id: optionId, correct, at: now };
    const after = { ...session, answers: [...session.answers, answer] };

    return {
        answer,
        correct,
        correct_id: question.country_id,
        done: isOver(after, now),
    };
}

// Sammanställer resultatet när quizet avslutas, i samma format som
// saveQuizResult (saveResult.js) vill ha.
// Obesvarade frågor räknas som fel.
function summarize(session) {
    const total = session.questions.length;
    const answers = session.questions.map((_, i) => session.answers[i]?.correct === true);
    const completed = session.answers.length === total;

    // Sekunder kvar när sista frågan besvarades – bara för quiz på tid som
    // man hann klart. Svar i extratiden (efter tidsgränsen) ger 0 sekunder.
    let secondsLeft;
    if (session.time_limit) {
        const last = session.answers[session.answers.length - 1];
        secondsLeft = completed && last
            ? Math.min(session.time_limit, Math.max(0, Math.floor((deadlineOf(session) - last.at) / 1000)))
            : 0;
    }

    return {
        quiz_type: session.quiz_type,
        region: session.region,
        correct_count: answers.filter(Boolean).length,
        total,
        answers,
        timed: session.time_limit !== null,
        completed,
        seconds_left: secondsLeft,
        country_ids: session.questions.map((question) => question.country_id),
        // Frågetypen per fråga – bara GeoMaster blandar typer
        question_types: session.quiz_type === 'geomaster'
            ? session.questions.map((question) => question.kind)
            : undefined,
    };
}

module.exports = {
    ANSWER_GRACE_MS,
    deadlineOf,
    isOver,
    gradeAnswer,
    summarize,
};
