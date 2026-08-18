'use client';

import { useEffect } from 'react';

/**
 * The mirror editor bridge, ported to the bespoke V2 site.
 *
 * Speaks the exact same postMessage protocol as public/mirror-editor.js
 * (mirror-nav / mirror-edit / mirror-collect / mirror-set-image /
 * mirror-dirty / mirror-overrides / mirror-image-request), so the admin
 * Sites workspace drives it unchanged. Overrides are stored in
 * site_pages.blocks under property 'annie-may' with a 'v2-' slug prefix,
 * keeping them apart from the old WordPress-mirror overrides.
 *
 * Mounted on every V2 page render: on the live site it only applies
 * saved overrides after hydration; editing wakes up solely via messages
 * from the embedding admin workspace.
 */

interface Override {
  sel: string;
  prop: 'text' | 'src';
  value: string;
}

const PROPERTY = 'annie-may';

const TEXT_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'LI', 'BLOCKQUOTE', 'FIGCAPTION', 'BUTTON', 'STRONG', 'EM', 'TD', 'CITE', 'DT', 'DD', 'DIV'];
const BLOCK_CHILDREN = ['IMG', 'DIV', 'SECTION', 'UL', 'FIGURE', 'PICTURE', 'VIDEO', 'IFRAME', 'SVG'];

function cssPath(el: Element): string {
  const path: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === 1 && node.tagName !== 'HTML') {
    let seg = node.tagName.toLowerCase();
    if (node.id) {
      path.unshift('#' + CSS.escape(node.id));
      break;
    }
    const parent: Element | null = node.parentElement;
    if (parent) {
      let idx = 1;
      let sib: Element | null = node;
      while ((sib = sib.previousElementSibling)) idx++;
      seg += `:nth-child(${idx})`;
    }
    path.unshift(seg);
    node = parent;
  }
  return path.join(' > ');
}

function applyOverride(o: Override) {
  let el: Element | null = null;
  try {
    el = document.querySelector(o.sel);
  } catch {
    return;
  }
  if (!el) return;
  if (o.prop === 'text') {
    el.innerHTML = o.value;
  } else if (o.prop === 'src' && el instanceof HTMLImageElement) {
    el.src = o.value;
    el.removeAttribute('srcset');
  }
}

function isTextTarget(el: Element): boolean {
  if (!TEXT_TAGS.includes(el.tagName)) return false;
  for (let i = 0; i < el.children.length; i++) {
    if (BLOCK_CHILDREN.includes(el.children[i].tagName)) return false;
  }
  return (el.textContent ?? '').trim().length > 0;
}

export default function AnnieMayEditBridge({ page }: { page: string }) {
  useEffect(() => {
    const slug = `v2-${page}`;
    let editing = false;
    let overrides: Override[] = [];
    let hoverEl: (HTMLElement & { __ravenOutline?: string }) | null = null;
    let cancelled = false;

    const post = (msg: Record<string, unknown>) => window.parent?.postMessage(msg, '*');

    const notifyDirty = () => post({ type: 'mirror-dirty', property: PROPERTY, slug });

    const record = (sel: string, prop: 'text' | 'src', value: string) => {
      const existing = overrides.find((o) => o.sel === sel && o.prop === prop);
      if (existing) existing.value = value;
      else overrides.push({ sel, prop, value });
      notifyDirty();
    };

    // Saved overrides apply after hydration (this effect runs post-hydration,
    // so React never sees a server/client mismatch).
    fetch(`/api/site-overrides?property=${PROPERTY}&slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : { overrides: [] }))
      .then((d) => {
        if (cancelled) return;
        overrides = (d?.overrides ?? []) as Override[];
        overrides.forEach(applyOverride);
      })
      .catch(() => {});

    const onMouseOver = (e: MouseEvent) => {
      if (!editing) return;
      const el = e.target as HTMLElement & { __ravenOutline?: string };
      const ok = el.tagName === 'IMG' || isTextTarget(el);
      if (hoverEl && hoverEl !== el) hoverEl.style.outline = hoverEl.__ravenOutline ?? '';
      if (ok) {
        if (hoverEl !== el) {
          el.__ravenOutline = el.style.outline;
          el.style.outline = '2px dashed #533afd';
        }
        hoverEl = el;
      } else {
        hoverEl = null;
      }
    };

    const onClick = (e: MouseEvent) => {
      if (!editing) return;
      const el = e.target as HTMLElement;

      if (el.tagName === 'IMG') {
        e.preventDefault();
        e.stopPropagation();
        post({
          type: 'mirror-image-request',
          property: PROPERTY,
          slug,
          sel: cssPath(el),
          current: (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src || '',
        });
        return;
      }

      // block navigation while editing
      if (el.closest?.('a')) e.preventDefault();

      if (isTextTarget(el)) {
        e.stopPropagation();
        if (el.getAttribute('contenteditable') !== 'true') {
          el.setAttribute('contenteditable', 'true');
          el.focus();
          const commit = () => {
            el.removeEventListener('blur', commit);
            el.setAttribute('contenteditable', 'false');
            record(cssPath(el), 'text', el.innerHTML);
          };
          el.addEventListener('blur', commit);
        }
      }
    };

    const onMessage = (e: MessageEvent) => {
      const d = e.data ?? {};
      if (d.type === 'mirror-edit') {
        editing = !!d.on;
        document.body.style.cursor = editing ? 'context-menu' : '';
        if (!editing && hoverEl) {
          hoverEl.style.outline = hoverEl.__ravenOutline ?? '';
          hoverEl = null;
        }
      } else if (d.type === 'mirror-collect') {
        post({ type: 'mirror-overrides', property: PROPERTY, slug, overrides });
      } else if (d.type === 'mirror-set-image') {
        let el: Element | null = null;
        try {
          el = document.querySelector(d.sel);
        } catch {
          el = null;
        }
        if (el instanceof HTMLImageElement) {
          el.src = d.value;
          el.removeAttribute('srcset');
          record(d.sel, 'src', d.value);
        }
      }
    };

    window.addEventListener('message', onMessage);
    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('click', onClick, true);

    post({ type: 'mirror-nav', property: PROPERTY, slug });

    return () => {
      cancelled = true;
      window.removeEventListener('message', onMessage);
      document.removeEventListener('mouseover', onMouseOver, true);
      document.removeEventListener('click', onClick, true);
      document.body.style.cursor = '';
    };
  }, [page]);

  return null;
}
