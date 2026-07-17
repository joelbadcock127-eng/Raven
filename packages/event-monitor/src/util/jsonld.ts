/** Extract schema.org JSON-LD blocks from an HTML document. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonLd = Record<string, any>;

export function extractJsonLd(html: string): JsonLd[] {
  const blocks: JsonLd[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch {
      // malformed block — skip
    }
  }
  return blocks;
}

/** Flatten JSON-LD (including @graph and ItemList) into schema.org Event objects. */
export function findEvents(blocks: JsonLd[]): JsonLd[] {
  const out: JsonLd[] = [];
  const visit = (node: JsonLd | undefined) => {
    if (!node || typeof node !== 'object') return;
    const type = node['@type'];
    const types = Array.isArray(type) ? type : [type];
    if (types.some((t) => typeof t === 'string' && /event/i.test(t))) out.push(node);
    if (Array.isArray(node['@graph'])) node['@graph'].forEach(visit);
    if (Array.isArray(node.itemListElement)) {
      for (const li of node.itemListElement) visit(li?.item ?? li);
    }
  };
  blocks.forEach(visit);
  return out;
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/%26/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
