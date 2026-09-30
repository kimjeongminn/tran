import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResult, spokenResult } from '../src/lib/result';
const base = { easy_text: ['10월 5일까지 5,000원을 내세요.'], actions: ['10월 5일까지 5,000원 내기'], date: '10월 5일까지', time: null, location: null, items: [], money: '5,000원', warning: null, uncertain: false, uncertain_text: null };
test('retains structured dates and money', () => { assert.deepEqual(validateResult(base), base); });
test('uncertain output never exposes speculative instructions', () => {
  const result = validateResult({ ...base, uncertain: true, uncertain_text: '금액을 다시 말해 주세요.' });
  assert.deepEqual(result.easy_text, []); assert.deepEqual(result.actions, []); assert.equal(result.money, null); assert.equal(result.date, null);
  assert.equal(spokenResult(result), '금액을 다시 말해 주세요.');
});
test('rejects incomplete, empty and malformed responses', () => {
  assert.throws(() => validateResult({ easy_text: ['hello'] }));
  assert.throws(() => validateResult({ ...base, easy_text: [] }));
  assert.throws(() => validateResult({ ...base, uncertain: 'false' }));
  assert.throws(() => validateResult({ ...base, unexpected: true }));
});
test('readout includes warnings', () => { assert.match(spokenResult({ ...base, warning: '두 번 내지 마세요.' }), /두 번 내지 마세요/); });
