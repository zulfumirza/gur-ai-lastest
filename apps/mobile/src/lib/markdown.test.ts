import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInline, parseMarkdown } from './markdown.ts';

test('satır içi biçimler', () => {
  assert.deepEqual(parseInline('**axum** ile `SSE` ve [doküman](https://x.dev) *kısaca*'), [
    { k: 'bold', v: 'axum' },
    { k: 'text', v: ' ile ' },
    { k: 'code', v: 'SSE' },
    { k: 'text', v: ' ve ' },
    { k: 'link', v: 'doküman', href: 'https://x.dev' },
    { k: 'text', v: ' ' },
    { k: 'italic', v: 'kısaca' },
  ]);
});

test('bloklar ve akış sırasında açık kalan kod bloğu', () => {
  const b = parseMarkdown('# Başlık\n\nBir paragraf\ndevamı.\n\n- bir\n- iki\n1. üç\n\n```rust\nfn main() {}');
  assert.equal(b[0].k, 'h');
  assert.deepEqual(b[1], { k: 'p', inl: [{ k: 'text', v: 'Bir paragraf devamı.' }] });
  assert.equal(b[2].k === 'list' && b[2].items.length, 2);
  assert.equal(b[3].k === 'list' && b[3].ordered, true);
  assert.deepEqual(b[4], { k: 'code', lang: 'rust', text: 'fn main() {}', open: true });
});
