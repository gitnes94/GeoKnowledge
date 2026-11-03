// Kör med: npm test
const test = require('node:test');
const assert = require('node:assert/strict');

const { validateUsername, normalizeUsername } = require('../username');

test('vanliga namn godtas, även med å, ä, ö och accenter', () => {
    for (const name of ['Younes', 'Anna Svensson', 'Åsa-Märta', 'José', "O'Brien", 'geo_master.99']) {
        assert.deepEqual(validateUsername(name), { username: name });
    }
});

test('mellanslag i början, slutet och flera i rad tas bort', () => {
    assert.equal(normalizeUsername('  Anna   Svensson  '), 'Anna Svensson');
    assert.deepEqual(validateUsername('  Anna   Svensson  '), { username: 'Anna Svensson' });
});

test('tomt namn eller inget namn avvisas', () => {
    for (const name of ['', '   ', undefined, null, 42, {}]) {
        assert.ok(validateUsername(name).error, String(name));
    }
});

test('för kort och för långt avvisas', () => {
    assert.ok(validateUsername('A').error);
    assert.deepEqual(validateUsername('Ab'), { username: 'Ab' });
    assert.deepEqual(validateUsername('a'.repeat(30)), { username: 'a'.repeat(30) });
    assert.ok(validateUsername('a'.repeat(31)).error);
});

test('emojis och specialtecken avvisas', () => {
    for (const name of ['Anna 🌍', '<script>', 'a@b.se', 'Anna\nSvensson'.replace('\n', '\u0007'), 'x/y']) {
        assert.ok(validateUsername(name).error, name);
    }
});
