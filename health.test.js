/**
 * Basic health tests – run with: npm test
 * Database tests require MySQL running with correct .env
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('response helpers', () => {
  it('success helper shapes payload', () => {
    const { success } = require('../src/utils/response');
    const res = {
      statusCode: 0,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };
    success(res, { ok: true }, 'OK', 200);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.deepStrictEqual(res.body.data, { ok: true });
  });

  it('error helper shapes payload', () => {
    const { error } = require('../src/utils/response');
    const res = {
      statusCode: 0,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };
    error(res, 'TEST_CODE', 'Test message', 400);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'TEST_CODE');
  });
});

describe('simulator module loads', () => {
  it('exports start/stop/getStatus', () => {
    const sim = require('../src/simulation/simulator');
    assert.strictEqual(typeof sim.start, 'function');
    assert.strictEqual(typeof sim.stop, 'function');
    assert.strictEqual(typeof sim.getStatus, 'function');
    assert.strictEqual(typeof sim.isRunning, 'function');
  });
});
