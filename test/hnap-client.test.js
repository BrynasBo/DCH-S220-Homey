'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readTag, hmacMd5 } = require('../lib/hnap-client');

test('readTag extracts an HNAP value', () => {
  assert.equal(readTag('<IsSounding>false</IsSounding>', 'IsSounding'), 'false');
});

test('hmacMd5 returns uppercase hexadecimal output', () => {
  assert.match(hmacMd5('key', 'value'), /^[0-9A-F]{32}$/);
});
