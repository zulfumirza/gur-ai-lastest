/** Gateway'in gönderdiği SSE olayları. */
export type GurEvent =
  | { type: 'meta'; model: string; name: string }
  | { type: 'delta'; t: string }
  | { type: 'reasoning'; t: string }
  | { type: 'done'; usage: unknown }
  | { type: 'error'; message: string };

/**
 * Parça parça gelen metni SSE olaylarına çevirir.
 * Olaylar boş satırla ayrılır; her olayda `event:` ve `data:` satırları bulunur.
 */
export class SSEParser {
  private buf = '';

  push(text: string): GurEvent[] {
    this.buf += text.replace(/\r\n/g, '\n');
    const out: GurEvent[] = [];
    let idx: number;
    while ((idx = this.buf.indexOf('\n\n')) !== -1) {
      const block = this.buf.slice(0, idx);
      this.buf = this.buf.slice(idx + 2);
      let name = 'message';
      const data: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith(':')) continue;
        if (line.startsWith('event:')) name = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
      if (data.length === 0) continue;
      try {
        const payload = JSON.parse(data.join('\n'));
        if (['meta', 'delta', 'reasoning', 'done', 'error'].includes(name)) {
          out.push({ type: name, ...payload } as GurEvent);
        }
      } catch {
        // bozuk olay: yok say
      }
    }
    return out;
  }
}
