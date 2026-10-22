/**
 * Decra mirror contact forms.
 * The mirrored WordPress pages carry Forminator forms that used to post to
 * wp-admin/admin-ajax.php, which no longer exists once the domain serves
 * from Decra. The mirror script marks those forms with data-decra-enquiry
 * and this script sends them to /api/site-enquiry instead, keeping the
 * original markup and styling.
 */
(function () {
  function field(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? String(el.value || '').trim() : '';
  }

  function show(form, ok, text) {
    var box = form.querySelector('.forminator-response-message');
    if (!box) {
      if (!ok) alert(text);
      return;
    }
    box.className = 'forminator-response-message ' + (ok ? 'forminator-success forminator-show' : 'forminator-error forminator-show');
    box.setAttribute('aria-hidden', 'false');
    box.innerHTML = '<p></p>';
    box.firstChild.textContent = text;
  }

  function wire(form) {
    form.style.display = '';
    form.removeAttribute('action');
    // honeypot: hidden from people, filled by naive bots
    var trap = document.createElement('input');
    trap.type = 'text';
    trap.name = 'website';
    trap.tabIndex = -1;
    trap.autocomplete = 'off';
    trap.setAttribute('aria-hidden', 'true');
    trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
    form.appendChild(trap);

    var counter = form.querySelector('[data-limit][data-type="characters"]');
    var area = form.querySelector('textarea');
    if (counter && area) {
      area.addEventListener('input', function () {
        counter.textContent = area.value.length + ' / ' + counter.getAttribute('data-limit');
      });
    }

    form.addEventListener(
      'submit',
      function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var button = form.querySelector('button[type="submit"], .forminator-button-submit');
        var name = field(form, 'name-1');
        var email = field(form, 'email-1');
        if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          show(form, false, 'Please include your name and a valid email address.');
          return;
        }
        if (button) button.disabled = true;
        fetch('/api/site-enquiry', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            property_id: form.getAttribute('data-decra-enquiry'),
            name: name,
            email: email,
            phone: field(form, 'phone-1'),
            message: field(form, 'textarea-1') || '(No message, contact details only)',
            website: field(form, 'website'),
          }),
        })
          .then(function (res) {
            return res.json().catch(function () {
              return { ok: false };
            });
          })
          .then(function (data) {
            if (data && data.ok) {
              form.querySelectorAll('input:not([type="hidden"]), textarea').forEach(function (el) {
                el.value = '';
              });
              if (counter) counter.textContent = '0 / ' + counter.getAttribute('data-limit');
              show(form, true, 'Thank you, your message has been sent. We will be in touch soon.');
            } else {
              show(form, false, (data && data.message) || 'Something went wrong. Please try again, or email us directly.');
            }
          })
          .catch(function () {
            show(form, false, 'Something went wrong. Please try again, or email us directly.');
          })
          .then(function () {
            if (button) button.disabled = false;
          });
      },
      true,
    );
  }

  function init() {
    document.querySelectorAll('form[data-decra-enquiry]').forEach(wire);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
