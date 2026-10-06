

CREATE TABLE users
(
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50) UNIQUE  NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255)        NOT NULL,
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
    created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_results_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
