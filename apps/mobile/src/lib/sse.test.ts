import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SSEParser } from './sse.ts';

test('olayları parça sınırlarından bağımsız çözer', () => {
  const p = new SSEParser();
  assert.deepEqual(p.push('event: meta\ndata: {"model":"gur-meridian","name":"Gur Meridian"}\n\nevent: del'), [
    { type: 'meta', model: 'gur-meridian', name: 'Gur Meridian' },
  ]);
  assert.deepEqual(p.push('ta\ndata: {"t":"Mer"}\n\n: keep-alive\n\nevent: delta\r\ndata: {"t":"haba"}\r\n\r\n'), [
    { type: 'delta', t: 'Mer' },
    { type: 'delta', t: 'haba' },
  ]);
});

test('bilinmeyen ve bozuk olayları atlar', () => {
  const p = new SSEParser();
  assert.deepEqual(p.push('event: x\ndata: {}\n\nevent: delta\ndata: {bozuk\n\nevent: done\ndata: {"usage":null}\n\n'), [
    { type: 'done', usage: null },
  ]);
});
