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

test('osynliga namn avvisas: bara tecken som ska sitta på en bokstav', () => {
    // Två "variation selectors" och två kombinerande ringar – syns inte alls
    assert.ok(validateUsername('\uFE0F\uFE0F').error);
    assert.ok(validateUsername('\u030A\u030A').error);
});

test('namn med bara skiljetecken avvisas', () => {
    for (const name of ['._', '--', "''", '. .', '___']) {
        assert.ok(validateUsername(name).error, name);
    }
});

test('a + kombinerande ring räknas som ett tecken (å), inte två', () => {
    assert.ok(validateUsername('a\u030A').error, 'bara "å" är för kort');
    assert.deepEqual(validateUsername('a\u030As'), { username: 'a\u030As' });
});

test('siffror räcker som synligt innehåll', () => {
    assert.deepEqual(validateUsername('42'), { username: '42' });
    assert.deepEqual(validateUsername('R2-D2'), { username: 'R2-D2' });
});
