/**
 * Raven mirror editor bridge.
 * Injected into every mirrored site page. Applies saved overrides on load,
 * and when the parent workspace turns on edit mode it makes text elements
 * contentEditable and images click-to-replace, reporting changes back up.
 */
(function () {
  var meta = document.querySelector('meta[name="raven-mirror"]');
  if (!meta) return;
  var parts = meta.getAttribute('content').split('|');
  var property = parts[0];
  var slug = parts[1];
  var editing = false;
  var overrides = []; // { sel, prop: 'text' | 'src', value }

  var TEXT_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'LI', 'BLOCKQUOTE', 'FIGCAPTION', 'BUTTON', 'STRONG', 'EM', 'TD', 'DIV'];

  function cssPath(el) {
    var path = [];
    while (el && el.nodeType === 1 && el.tagName !== 'HTML') {
      var seg = el.tagName.toLowerCase();
      if (el.id) {
        seg = '#' + CSS.escape(el.id);
        path.unshift(seg);
        break;
      }
      var parent = el.parentNode;
      if (parent) {
        var idx = 1;
        var sib = el;
        while ((sib = sib.previousElementSibling)) idx++;
        seg += ':nth-child(' + idx + ')';
      }
      path.unshift(seg);
      el = parent;
    }
    return path.join(' > ');
  }

  function applyOverride(o) {
    var el;
    try { el = document.querySelector(o.sel); } catch (e) { return; }
    if (!el) return;
    if (o.prop === 'text') {
      el.innerHTML = o.value;
    } else if (o.prop === 'src' && el.tagName === 'IMG') {
      el.src = o.value;
      el.removeAttribute('srcset');
      el.removeAttribute('data-src');
      el.removeAttribute('data-srcset');
    }
  }

  function record(sel, prop, value) {
    for (var i = 0; i < overrides.length; i++) {
      if (overrides[i].sel === sel && overrides[i].prop === prop) {
        overrides[i].value = value;
        notifyDirty();
        return;
      }
    }
    overrides.push({ sel: sel, prop: prop, value: value });
    notifyDirty();
  }

  function notifyDirty() {
    window.parent.postMessage({ type: 'mirror-dirty', property: property, slug: slug }, '*');
  }

  // load saved overrides
  fetch('/api/site-overrides?property=' + encodeURIComponent(property) + '&slug=' + encodeURIComponent(slug))
    .then(function (r) { return r.ok ? r.json() : { overrides: [] }; })
    .then(function (d) {
      overrides = (d && d.overrides) || [];
      overrides.forEach(applyOverride);
    })
    .catch(function () {});

  function isTextTarget(el) {
    if (!el || TEXT_TAGS.indexOf(el.tagName) === -1) return false;
    // only leaf-ish elements: direct text content, no big element subtrees
    for (var i = 0; i < el.children.length; i++) {
      var c = el.children[i];
      if (['IMG', 'DIV', 'SECTION', 'UL', 'FIGURE', 'PICTURE', 'VIDEO', 'IFRAME'].indexOf(c.tagName) !== -1) return false;
    }
    return (el.textContent || '').trim().length > 0;
  }

  var hoverEl = null;

  function onMouseOver(e) {
    if (!editing) return;
    var el = e.target;
    var ok = el.tagName === 'IMG' || isTextTarget(el);
    if (hoverEl && hoverEl !== el) hoverEl.style.outline = hoverEl.__ravenOutline || '';
    if (ok) {
      if (hoverEl !== el) {
        el.__ravenOutline = el.style.outline;
        el.style.outline = '2px dashed #533afd';
      }
      hoverEl = el;
    } else {
      hoverEl = null;
    }
  }

  function onClick(e) {
    if (!editing) return;
    var el = e.target;

    if (el.tagName === 'IMG') {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({
        type: 'mirror-image-request',
        property: property,
        slug: slug,
        sel: cssPath(el),
        current: el.currentSrc || el.src || ''
      }, '*');
      return;
    }

    // block navigation while editing
    var link = el.closest && el.closest('a');
    if (link) e.preventDefault();

    if (isTextTarget(el)) {
      e.stopPropagation();
      if (el.getAttribute('contenteditable') !== 'true') {
        el.setAttribute('contenteditable', 'true');
        el.focus();
        var commit = function () {
          el.removeEventListener('blur', commit);
          el.setAttribute('contenteditable', 'false');
          record(cssPath(el), 'text', el.innerHTML);
        };
        el.addEventListener('blur', commit);
      }
    }
  }

  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.type === 'mirror-edit') {
      editing = !!d.on;
      document.body.style.cursor = editing ? 'context-menu' : '';
      if (!editing && hoverEl) {
        hoverEl.style.outline = hoverEl.__ravenOutline || '';
        hoverEl = null;
      }
    } else if (d.type === 'mirror-collect') {
      window.parent.postMessage({
        type: 'mirror-overrides',
        property: property,
        slug: slug,
        overrides: overrides
      }, '*');
    } else if (d.type === 'mirror-set-image') {
      var el;
      try { el = document.querySelector(d.sel); } catch (err) { el = null; }
      if (el && el.tagName === 'IMG') {
        el.src = d.value;
        el.removeAttribute('srcset');
        el.removeAttribute('data-src');
        el.removeAttribute('data-srcset');
        record(d.sel, 'src', d.value);
      }
    }
  });

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('click', onClick, true);

  window.parent.postMessage({ type: 'mirror-nav', property: property, slug: slug }, '*');
})();
