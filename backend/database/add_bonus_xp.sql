-- Kör en gång på en befintlig databas (Adminer → SQL command).
-- Nya installationer får kolumnen direkt från geoknowledge.sql.
ALTER TABLE results ADD COLUMN bonus_xp INT NOT NULL DEFAULT 0;