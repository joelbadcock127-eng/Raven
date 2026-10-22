/**
 * Mirror the three live property websites into public/mirror.
 *
 * Usage: node scripts/mirror-sites.mjs [--fetch] [--only=pid,pid]
 *   --fetch  re-download the live pages first (otherwise reuses .mirror-src)
 *   --only   limit to these property ids. Ten Fifty Bakers is already served
 *            from Decra, so re-fetching it would download the mirror itself.
 *
 * The pages are stored verbatim (original markup/CSS/JS) with:
 *  - relative asset URLs absolutized to the live domain
 *  - internal page links rewritten to the local mirror
 *  - LiteSpeed cache artifacts undone (lazy images restored, deferred CSS
 *    re-enabled, runtime removed) so pages render fully without its JS
 *  - the Decra editor bridge injected
 */
import * as cheerio from 'cheerio';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url))); // apps/web
const SRC = path.join(ROOT, '.mirror-src');
const OUT = path.join(ROOT, 'public', 'mirror');

const SITES = [
  { pid: 'ten-fifty-bakers', domain: 'tenfiftybakers.com.au',
    slugs: ['home', 'our-accommodation', 'our-story', 'explore', 'contact-us', 'book-now', 'privacy-policy', 'terms-of-service'] },
  { pid: 'prescription-pad', domain: 'theprescriptionpad.com.au',
    slugs: ['home', 'about', 'accommodation', 'explore', 'contact-us', 'bookings', 'privacy-policy',
      'terms-of-service', 'disclaimer', 'competition', 'competition-terms-conditions'] },
  { pid: 'annie-may', domain: 'anniemay.com.au',
    slugs: ['home', 'accommodation', 'annie-mays-story', 'explore', 'contact-us', 'book-now', 'privacy-policy',
      'terms-of-service', 'disclaimer', 'competition', 'competition-terms-conditions'] },
].filter((s) => {
  const only = process.argv.find((a) => a.startsWith('--only='));
  return !only || only.slice(7).split(',').includes(s.pid);
});

function absolutize(url, origin) {
  if (!url) return url;
  const t = url.trim();
  if (/^(https?:|data:|mailto:|tel:|#|javascript:|about:)/i.test(t)) return t;
  if (t.startsWith('//')) return 'https:' + t;
  if (t.startsWith('/')) return origin + t;
  return origin + '/' + t;
}

function absSrcset(v, origin) {
  if (!v) return v;
  return v.split(',').map((part) => {
    const bits = part.trim().split(/\s+/);
    bits[0] = absolutize(bits[0], origin);
    return bits.join(' ');
  }).join(', ');
}

if (process.argv.includes('--fetch')) {
  for (const site of SITES) {
    mkdirSync(`${SRC}/${site.pid}`, { recursive: true });
    for (const slug of site.slugs) {
      const url = `https://${site.domain}/${slug === 'home' ? '' : slug + '/'}`;
      const dest = `${SRC}/${site.pid}/${slug}.html`;
      execFileSync('curl', ['-sL', '--max-time', '40', url, '-o', dest]);
      console.log('fetched', url);
    }
  }
}

for (const site of SITES) {
  const origin = `https://${site.domain}`;
  const pathToSlug = new Map();
  for (const s of site.slugs) pathToSlug.set(s === 'home' ? '' : s, s);

  mkdirSync(`${OUT}/${site.pid}`, { recursive: true });

  for (const slug of site.slugs) {
    const src = `${SRC}/${site.pid}/${slug}.html`;
    if (!existsSync(src)) {
      console.error('missing', src, '— run with --fetch');
      process.exit(1);
    }
    const $ = cheerio.load(readFileSync(src, 'utf8'));

    $('base').remove();

    // ── Undo LiteSpeed cache optimizations ──
    // 1. lazy-loaded images: restore the real src/srcset
    $('img[data-src], img[data-lazyloaded]').each((_, el) => {
      const $el = $(el);
      const real = $el.attr('data-src');
      if (real) $el.attr('src', real);
      const realSet = $el.attr('data-srcset');
      if (realSet) $el.attr('srcset', realSet);
      $el.removeAttr('data-lazyloaded data-src data-srcset');
    });
    // lazy iframes (the Google Maps embeds on the contact pages)
    $('iframe[data-litespeed-src]').each((_, el) => {
      const $el = $(el);
      $el.attr('src', $el.attr('data-litespeed-src')).removeAttr('data-litespeed-src data-lazyloaded');
    });
    // lazy background images
    $('[data-lazy-bg]').each((_, el) => {
      const $el = $(el);
      const bg = $el.attr('data-lazy-bg');
      const style = $el.attr('style') || '';
      $el.attr('style', `${style};background-image:url(${bg})`);
      $el.removeAttr('data-lazy-bg');
    });
    // 2. deferred stylesheets: make them load normally
    $('link[rel="preload"][as="style"]').each((_, el) => {
      $(el).attr('rel', 'stylesheet').removeAttr('as onload');
    });
    $('link[rel="stylesheet"][media="print"]').each((_, el) => {
      $(el).attr('media', 'all').removeAttr('onload');
    });
    // 3. remove the LiteSpeed runtime (it would re-lazy-load everything)
    $('script').each((_, el) => {
      const $el = $(el);
      const srcAttr = $el.attr('src') || '';
      const body = $el.html() || '';
      if (/litespeed/i.test(srcAttr) || /litespeed|lazyload/i.test(body.slice(0, 400))) $el.remove();
    });
    $('noscript').remove(); // duplicate imgs for no-JS browsers; not needed
    // 4. "delay JS": LiteSpeed parks scripts as type="litespeed/javascript"
    //    (src in data-src) for its runtime to start; without the runtime they
    //    never run (analytics, jQuery, menus, MailerLite). Make them normal.
    $('script[type="litespeed/javascript"]').each((_, el) => {
      const $el = $(el);
      $el.removeAttr('type');
      const real = $el.attr('data-src');
      if (real) $el.attr('src', real).removeAttr('data-src');
    });

    // ── Contact forms: Forminator posted to wp-admin, which is gone after
    //    the cutover. Drop its init/nonce scripts and let /mirror-enquiry.js
    //    send the form to /api/site-enquiry instead.
    const forms = $('form.forminator-custom-form');
    if (forms.length > 0) {
      forms.attr('data-decra-enquiry', site.pid).removeAttr('action');
      $('script').each((_, el) => {
        const body = $(el).html() || '';
        if (/admin-ajax\.php|Forminator_Cform_Paginations|forminatorFront\(/.test(body) && !/var ForminatorFront=/.test(body))
          $(el).remove();
      });
    }

    // ── WordPress-only head links (feeds, REST API, XML-RPC, oEmbed,
    //    shortlinks) would send crawlers to 404s once WordPress is gone.
    $('link[rel="EditURI"], link[rel="https://api.w.org/"], link[rel="shortlink"]').remove();
    $('link[rel="alternate"]').each((_, el) => {
      const type = $(el).attr('type') || '';
      if (/rss|atom|json|oembed|xml/i.test(type)) $(el).remove();
    });

    // ── Absolutize every asset reference ──
    $('[src]').each((_, el) => $(el).attr('src', absolutize($(el).attr('src'), origin)));
    $('[srcset]').each((_, el) => $(el).attr('srcset', absSrcset($(el).attr('srcset'), origin)));
    $('link[href]').each((_, el) => $(el).attr('href', absolutize($(el).attr('href'), origin)));

    // ── Rewrite internal page links to the local mirror ──
    $('a[href]').each((_, el) => {
      const raw = $(el).attr('href');
      if (!raw) return;
      let u;
      try { u = new URL(raw, origin + '/'); } catch { return; }
      const isInternal = u.hostname === site.domain || u.hostname === 'www.' + site.domain;
      if (!isInternal) return;
      const p = u.pathname.replace(/^\/+|\/+$/g, '');
      if (pathToSlug.has(p)) {
        $(el).attr('href', `/mirror/${site.pid}/${pathToSlug.get(p)}.html`);
        $(el).removeAttr('target');
      } else {
        $(el).attr('href', u.href);
      }
    });

    // ── Repair rules LiteSpeed's mobile-crawled "used CSS" dropped ──
    // The inline UCSS keeps the mobile menu toggle visible at all widths;
    // restore the desktop behaviour per nav breakpoint.
    const breakpoints = new Set();
    $('[data-gb-mobile-breakpoint]').each((_, el) => {
      const bp = parseInt($(el).attr('data-gb-mobile-breakpoint') || '', 10);
      if (bp) breakpoints.add(bp);
    });
    if (breakpoints.size > 0) {
      const css = [...breakpoints]
        .map(
          (bp) =>
            `@media (min-width:${bp + 1}px){.gb-menu-toggle{display:none!important}` +
            `.gb-navigation .gb-menu-container{display:flex!important}}`,
        )
        .join('');
      $('head').append(`<style id="decra-mirror-fixes">${css}</style>`);
    }

    // ── Identify the page + inject the editor bridge ──
    $('head').prepend(`<meta name="decra-mirror" content="${site.pid}|${slug}">`);
    $('body').append('<script src="/mirror-editor.js" defer></script>');
    if (forms.length > 0) $('body').append('<script src="/mirror-enquiry.js" defer></script>');

    writeFileSync(`${OUT}/${site.pid}/${slug}.html`, $.html());
    console.log(site.pid, slug, 'ok');
  }
}
console.log('mirrors written to', OUT);
