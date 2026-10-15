# GeoKnowledge

**Geografi – fast kul!** GeoKnowledge är en webbapp där du lär dig världens länder genom korta quiz, t.ex. att känna igen länder utifrån deras form. Helt gratis, utan reklam och utan tidsbegränsning.

Gruppprojekt i kurserna *Utveckling av webbapplikationer* och *Agil utveckling*.
**Grupp 2:** Andreas, Edvin, Fredrik och Younes.

---

## Teknik

| Del | Teknik |
|---|---|
| Frontend | Vue 3, Vue Router, Vite, D3 (kartor) |
| Backend | Node.js, Express |
| Databas | MySQL 8.4 (körs i Docker) |
| Inloggning | OAuth2, JSON Web Token |
| Kartdata | [Natural Earth](https://www.naturalearthdata.com/) (public domain) |

---

## Det här behöver du

- **Node.js 22.18 eller nyare** – kontrollera med `node -v`
- **Docker Desktop** – måste vara igång när du kör databasen
- **Git**

Fungerar på både Mac och Windows.

---

## Kom igång (första gången)

### 1. Hämta projektet och installera paketen

```bash
git clone https://github.com/gitnes94/GeoKnowledge.git
cd GeoKnowledge

cd backend
npm install
cd ../frontend
npm install
cd ..
```

### 2. Skapa din egen `.env` i backend

`.env` innehåller lösenord och nycklar och checkas **aldrig** in i Git. Varje person har sin egen.

**Mac:**
```bash
cp backend/.env.example backend/.env
```

**Windows (PowerShell):**
```powershell
Copy-Item backend\.env.example backend\.env
```

Skapa sedan en hemlig nyckel för inloggningen:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Öppna **`backend/.env`** (inte `.env.example`!) och ersätt värdet på `JWT_SECRET=` med nyckeln du fick.

Du behöver även konfigurera Google Oauth2, och ersätta GOOGLE_CLIENT_ID och GOOGLE_CLIENT_SECRET med dina värden.

> ⚠️ Skriv aldrig in riktiga nycklar i `.env.example` – den filen checkas in och syns för alla.

---

## Starta appen

Appen består av tre delar som startas var för sig. Öppna **en terminalflik per del**.

### 1. Databasen (från rotmappen)

```bash
docker compose up -d
```

Första gången skapas tabellerna automatiskt från `backend/database/geoknowledge.sql`.

### 2. Backenden

```bash
cd backend
npm run dev
```

Terminalen ska visa `injected env (7) from .env` och `Servern körs på http://localhost:3000`.

### 3. Frontenden

```bash
cd frontend
npm run dev
```

### Adresser

| Vad | Adress |
|---|---|
| **Appen** | http://localhost:5173 |
| Backend – hälsokontroll | http://localhost:3000/api/health |
| Adminer (se databasen) | http://localhost:8080 – server `db`, användare `root`, lösenord `geopass` |

Quizet fungerar med bara frontenden igång. Backend och databas behövs för konton och sparade resultat.

---

## Projektstruktur

```
GeoKnowledge/
├── docker-compose.yml        ← MySQL + Adminer
├── backend/
│   ├── index.js              ← startar Express-servern
│   ├── db.js                 ← anslutning till MySQL
│   ├── jwt.js                ← skapar inloggningstoken
│   ├── .env.example          ← mall för .env
│   └── database/
│       └── geoknowledge.sql  ← tabellerna users och results
└── frontend/
    ├── public/data/          ← kartdata (GeoJSON)
    ├── scripts/
    │   └── fetch-world.js    ← hämtar ny kartdata (npm run fetch-data)
    └── src/
        ├── router/           ← sidornas adresser
        ├── views/            ← hela sidor (startsida, välj quiz, konturquiz)
        ├── components/       ← återanvändbara delar (karta, landsform, QuizRunner)
        └── services/         ← hämta landdata och skapa quizfrågor
```

---

## Arbetsflöde i Git

1. **Utgå alltid från senaste main**
   ```bash
   git switch main
   git pull
   git switch -c feature/<issue-nummer>-<kort-namn>
   ```
2. **Lägg till filer med namn** – undvik `git add .`, kontrollera alltid med `git status` först.
3. **Pusha och öppna en Pull Request.** Skriv `Closes #<nummer>` i beskrivningen så stängs issuen vid merge.
4. **Minst en annan gruppmedlem granskar** innan PR:en mergas (enligt vår Definition of Done).

### Efter att du har hämtat ändringar (`git pull`)

- Har `package.json` ändrats? → kör `npm install` i den mappen.
- Har `geoknowledge.sql` ändrats? → kör om databasen (se nedan).

---

## Användbara kommandon

| Kommando | Var | Vad det gör |
|---|---|---|
| `docker compose up -d` | rotmappen | startar databasen |
| `docker compose down` | rotmappen | stoppar databasen |
| `docker compose down -v` | rotmappen | stoppar **och raderar** databasen – SQL-filen körs igen vid nästa start |
| `docker compose logs db` | rotmappen | visar databasens logg (bra vid SQL-fel) |
| `npm run dev` | backend / frontend | startar i utvecklingsläge |
| `npm run build` | frontend | testar att appen går att bygga |
| `npm run fetch-data` | frontend | hämtar kartdatan på nytt från Natural Earth |

---

## Felsökning

| Problem | Lösning |
|---|---|
| `'vite' is not recognized` / `command not found` | Kör `npm install` i `frontend` |
| `Cannot find module ...` | Kör `npm install` i mappen du startar från |
| `injected env (0) from .env` | `backend/.env` saknas, är tom eller heter fel (t.ex. `.env.txt`) |
| `ECONNREFUSED` mot databasen | Docker är inte igång – kör `docker compose up -d` |
| `Access denied for user 'root'` | Lösenordet i `.env` matchar inte `geopass` i `docker-compose.yml` |
| `secretOrPrivateKey must have a value` | `JWT_SECRET` saknas i `backend/.env` |
| Tabellerna saknas i Adminer | Kör `docker compose down -v` och sedan `docker compose up -d` |
| Tom sida när man klickar på en länk | Adressen saknas i `frontend/src/router/index.js` |
