/**
 * Decra mirror contact forms.
 * The mirrored WordPress pages carry Forminator forms that used to post to
 * wp-admin/admin-ajax.php, which no longer exists once the domain serves
 * from Decra. Forms marked data-decra-enquiry are sent from the browser to
 * two places, keeping the original markup and styling:
 *  - Web3Forms (free form service), which emails the owner. Its public
 *    access key arrives in <meta name="decra-form-key">, set per property
 *    by the WEB3FORMS_KEYS env var.
 *  - /api/site-enquiry, which keeps a copy in the admin (Reservations).
 * Either one succeeding counts as sent.
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
        var payload = {
          name: name,
          email: email,
          phone: field(form, 'phone-1'),
          message: field(form, 'textarea-1') || '(No message, contact details only)',
        };
        var post = function (url, body) {
          return fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify(body),
          })
            .then(function (res) {
              return res.json().catch(function () {
                return { ok: res.ok };
              });
            })
            .catch(function () {
              return { ok: false };
            });
        };
        var sends = [
          post(
            '/api/site-enquiry',
            Object.assign({ property_id: form.getAttribute('data-decra-enquiry'), website: field(form, 'website') }, payload),
          ),
        ];
        var keyMeta = document.querySelector('meta[name="decra-form-key"]');
        if (keyMeta && !field(form, 'website')) {
          sends.push(
            post(
              'https://api.web3forms.com/submit',
              Object.assign(
                {
                  access_key: keyMeta.getAttribute('content'),
                  subject: 'New website enquiry from ' + location.hostname,
                  from_name: location.hostname,
                  replyto: email,
                  page: location.href,
                },
                payload,
              ),
            ).then(function (d) {
              return { ok: !!(d && d.success) };
            }),
          );
        }
        Promise.all(sends)
          .then(function (results) {
            var sent = results.some(function (r) {
              return r && r.ok;
            });
            return sent ? { ok: true } : results[0];
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
