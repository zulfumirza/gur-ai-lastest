/** Sohbet yanıtları için küçük, bağımlılıksız Markdown ayrıştırıcı. */

export type Inline =
  | { k: 'text'; v: string }
  | { k: 'bold'; v: string }
  | { k: 'italic'; v: string }
  | { k: 'code'; v: string }
  | { k: 'link'; v: string; href: string };

export type Block =
  | { k: 'h'; level: number; inl: Inline[] }
  | { k: 'p'; inl: Inline[] }
  | { k: 'code'; lang: string; text: string; open: boolean }
  | { k: 'list'; ordered: boolean; items: Inline[][] }
  | { k: 'quote'; inl: Inline[] }
  | { k: 'hr' };

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of src.matchAll(INLINE)) {
    const t = m[0];
    const i = m.index ?? 0;
    if (i > last) out.push({ k: 'text', v: src.slice(last, i) });
    if (t.startsWith('**')) out.push({ k: 'bold', v: t.slice(2, -2) });
    else if (t.startsWith('`')) out.push({ k: 'code', v: t.slice(1, -1) });
    else if (t.startsWith('[')) {
      const mm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(t)!;
      out.push({ k: 'link', v: mm[1], href: mm[2] });
    } else out.push({ k: 'italic', v: t.slice(1, -1) });
    last = i + t.length;
  }
  if (last < src.length) out.push({ k: 'text', v: src.slice(last) });
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ k: 'p', inl: parseInline(para.join(' ')) });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = /^\s*```\s*([\w+-]*)/.exec(line);
    if (fence) {
      flush();
      const body: string[] = [];
      let j = i + 1;
      while (j < lines.length && !/^\s*```/.test(lines[j])) body.push(lines[j++]);
      blocks.push({ k: 'code', lang: fence[1] ?? '', text: body.join('\n'), open: j >= lines.length });
      i = j;
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      blocks.push({ k: 'h', level: h[1].length, inl: parseInline(h[2]) });
      continue;
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) {
      flush();
      blocks.push({ k: 'hr' });
      continue;
    }
    const li = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) {
      flush();
      const ordered = /\d/.test(li[1]);
      const prev = blocks[blocks.length - 1];
      if (prev?.k === 'list' && prev.ordered === ordered) prev.items.push(parseInline(li[2]));
      else blocks.push({ k: 'list', ordered, items: [parseInline(li[2])] });
      continue;
    }
    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      flush();
      blocks.push({ k: 'quote', inl: parseInline(q[1]) });
      continue;
    }
    if (line.trim() === '') flush();
    else para.push(line.trim());
  }
  flush();
  return blocks;
}
