// Kör med: npm test
const test = require('node:test');
const assert = require('node:assert/strict');

const { allowedOrigins } = require('../corsOrigins');

test('utan FRONTEND_URL: lokala Vite på 5173, både localhost och 127.0.0.1', () => {
    assert.deepEqual(allowedOrigins(undefined), ['http://localhost:5173', 'http://127.0.0.1:5173']);
});

test('lokal adress med / på slutet eller 127.0.0.1 ger samma par', () => {
    assert.deepEqual(allowedOrigins('http://localhost:5173/'), ['http://localhost:5173', 'http://127.0.0.1:5173']);
    assert.deepEqual(allowedOrigins('http://127.0.0.1:5173'), ['http://localhost:5173', 'http://127.0.0.1:5173']);
});

test('produktionsadress blir bara schema + värd', () => {
    assert.deepEqual(allowedOrigins('https://geoknowledge.example'), ['https://geoknowledge.example']);
    assert.deepEqual(allowedOrigins('https://geoknowledge.example/'), ['https://geoknowledge.example']);
});

test('standardport och sökväg tas bort, som i webbläsarens Origin-header', () => {
    assert.deepEqual(allowedOrigins('https://geoknowledge.example:443'), ['https://geoknowledge.example']);
    assert.deepEqual(allowedOrigins('https://geoknowledge.example/app/'), ['https://geoknowledge.example']);
    assert.deepEqual(allowedOrigins('HTTPS://GeoKnowledge.Example'), ['https://geoknowledge.example']);
});

test('annan port än standard behålls', () => {
    assert.deepEqual(allowedOrigins('https://geoknowledge.example:8443'), ['https://geoknowledge.example:8443']);
});

test('ogiltig adress släpper inte in något', () => {
    for (const value of ['inte en adress', 'localhost:5173', 'geoknowledge.example']) {
        assert.deepEqual(allowedOrigins(value), [], value);
    }
});
