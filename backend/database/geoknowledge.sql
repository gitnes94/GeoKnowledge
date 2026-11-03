CREATE TABLE users
(
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)         NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255)        NOT NULL,
    picture_url   VARCHAR(500)        NULL,
    created_at    TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE results
(
    id            INT PRIMARY KEY AUTO_INCREMENT,
    user_id       INT         NOT NULL,
    quiz_type     VARCHAR(30) NOT NULL,
    region        VARCHAR(30) NOT NULL,
    correct_count INT         NOT NULL,
    total         INT         NOT NULL,
    bonus_xp      INT         NOT NULL DEFAULT 0, -- combo-bonus och bonus för quiz på tid
    timed         BOOLEAN     NOT NULL DEFAULT FALSE, -- spelat på tid
    created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_results_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Länder som användaren har svarat rätt på minst en gång, per quiztyp.
-- Används för mästartroféerna ("alla flaggor i Europa" osv).
-- PRIMARY KEY på alla tre kolumnerna gör att samma land bara sparas en gång.
CREATE TABLE correct_countries
(
    user_id    INT         NOT NULL,
    quiz_type  VARCHAR(30) NOT NULL,
    country_id VARCHAR(10) NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, quiz_type, country_id),
    CONSTRAINT fk_correct_countries_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Quiz som pågår eller nyss är klara. Servern skapar frågorna och sparar facit
-- här, så att webbläsaren aldrig får veta rätt svar i förväg. Tiden mäts med
-- serverns klocka (millisekunder sedan 1970, därför BIGINT).
-- user_id är NULL för gäster. Rader äldre än ett dygn tas bort automatiskt.
CREATE TABLE quiz_sessions
(
    id          CHAR(36)    NOT NULL PRIMARY KEY,
    user_id     INT         NULL,
    quiz_type   VARCHAR(30) NOT NULL,
    region      VARCHAR(30) NOT NULL,
    time_limit  INT         NULL,     -- sekunder, NULL = inte på tid
    lives       INT         NULL,     -- GeoMaster: antal fel man får göra
    questions   JSON        NOT NULL, -- [{ country_id, kind, options }, ...] – facit
    answers     JSON        NOT NULL, -- [{ option_id, correct, at }, ...]
    started_at  BIGINT      NOT NULL,
    finished_at BIGINT      NULL,
    result_id   INT         NULL,     -- raden i results när resultatet sparats
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_quiz_sessions_created_at (created_at),
    CONSTRAINT fk_quiz_sessions_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
