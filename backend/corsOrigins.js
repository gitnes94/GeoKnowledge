// CORS: bara frontendens adress får läsa API:ts svar i en webbläsare.
// Obs: CORS stoppar inte att ett anrop skickas – det hindrar bara en annan
// webbplats från att läsa svaret. Därför tar API:t bara emot JSON (se index.js):
// ett vanligt formulär på en annan webbplats kan inte skicka JSON, och
// JavaScript som försöker måste först få lov via CORS, vilket den inte får.
// Kontot skyddas av att token skickas i Authorization-headern, som andra
// webbplatser inte kommer åt.
//   frontendUrl – FRONTEND_URL från .env (standard: http://localhost:5173)
// Svar: listan med adresser (origins) som släpps in
function allowedOrigins(frontendUrl) {
    const configured = frontendUrl || 'http://localhost:5173'
    let origin
    try {
        // .origin ger bara schema, värd och port, så som webbläsaren skickar
        // Origin-headern: utan sökväg, utan / på slutet och utan standardport
        // (https://example.com:443/ → https://example.com)
        origin = new URL(configured).origin
    } catch {
        origin = 'null'
    }
    // 'null' får man t.ex. om http:// saknas ('localhost:5173')
    if (origin === 'null') {
        console.error(`FRONTEND_URL är ingen giltig adress: "${configured}" – inga webbplatser släpps in via CORS`)
        return []
    }
    // Lokalt svarar Vite på både localhost och 127.0.0.1 – godta båda
    const url = new URL(origin)
    if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
        const port = url.port ? `:${url.port}` : ''
        return [`http://localhost${port}`, `http://127.0.0.1${port}`]
    }
    return [origin]
}

module.exports = { allowedOrigins };
