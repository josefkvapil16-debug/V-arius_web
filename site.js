// V-arius web - živý čas/datum a klikací galerie screenů v telefonu.
(function () {
  // Čas ve stavovém řádku telefonu (.js-clock) a dnešní datum (.js-today)
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function tick() {
    var now = new Date();
    var time = now.getHours() + ':' + pad(now.getMinutes());
    var date = now.getDate() + '. ' + (now.getMonth() + 1) + '. ' + now.getFullYear();
    document.querySelectorAll('.js-clock').forEach(function (el) { el.textContent = time; });
    document.querySelectorAll('.js-today').forEach(function (el) { el.textContent = date; });
  }
  tick();
  setInterval(tick, 15000);

  // Světlý/tmavý vzhled screenů - společný pro celou stránku, pamatuje se.
  var mode = 'light';
  try { mode = localStorage.getItem('varius-screen-mode') || 'light'; } catch (e) {}

  function applyMode(m) {
    mode = m;
    document.documentElement.setAttribute('data-screen-mode', m);
    try { localStorage.setItem('varius-screen-mode', m); } catch (e) {}
    document.querySelectorAll('.phone-slide img[data-' + m + ']').forEach(function (img) {
      var src = img.getAttribute('data-' + m);
      if (img.getAttribute('src') !== src) {
        img.parentNode.classList.remove('is-missing');
        img.setAttribute('src', src);
      }
    });
    document.querySelectorAll('.mode-switch [data-mode]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false');
    });
  }

  // Každý slide dostane místo pro ukázku, které se ukáže, když screen chybí.
  document.querySelectorAll('.phone-slide').forEach(function (s) {
    var img = s.querySelector('img');
    if (!img) return;
    var ph = document.createElement('div');
    ph.className = 'phone-placeholder';
    ph.innerHTML = '<b></b><span>Ukázka bude doplněna</span>';
    ph.querySelector('b').textContent = s.dataset.caption || '';
    s.appendChild(ph);
    img.addEventListener('error', function () { s.classList.add('is-missing'); });
    img.addEventListener('load', function () { s.classList.remove('is-missing'); });
  });

  document.querySelectorAll('.mode-switch [data-mode]').forEach(function (b) {
    b.addEventListener('click', function () { applyMode(b.dataset.mode); });
  });
  applyMode(mode);

  // Galerie: [data-gallery] s .phone-slide (data-caption). Klik na telefon,
  // šipky nebo tečky přepínají.
  document.querySelectorAll('[data-gallery]').forEach(function (g) {
    var slides = Array.prototype.slice.call(g.querySelectorAll('.phone-slide'));
    if (!slides.length) return;
    var caption = g.querySelector('.gallery-caption');
    var dots = g.querySelector('.gallery-dots');
    var cur = 0;

    if (dots && slides.length > 1) {
      slides.forEach(function (s, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', s.dataset.caption || ('' + (i + 1)));
        b.addEventListener('click', function (e) { e.stopPropagation(); show(i); });
        dots.appendChild(b);
      });
    }

    function show(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, j) { s.classList.toggle('is-active', j === cur); });
      if (caption) caption.textContent = slides[cur].dataset.caption || '';
      if (dots) {
        Array.prototype.forEach.call(dots.children, function (d, j) {
          d.setAttribute('aria-current', j === cur ? 'true' : 'false');
        });
      }
    }

    var phone = g.querySelector('.phone-mockup');
    if (phone && slides.length > 1) phone.addEventListener('click', function () { show(cur + 1); });
    g.querySelectorAll('[data-dir]').forEach(function (b) {
      b.addEventListener('click', function () { show(cur + Number(b.dataset.dir)); });
    });
    show(0);
  });
})();

// Upozornění na vydání: aspoň jeden telefon (iPhone / Android), odeslání do
// Google tabulky (Apps Script). Odpověď je kvůli CORS neprůhledná (no-cors),
// takže úspěch = požadavek odešel.
document.querySelectorAll('.newsletter-form').forEach(function (f) {
  var err = f.querySelector('.form-error');
  var done = f.querySelector('.form-done');
  var btn = f.querySelector('button[type="submit"]');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!f.querySelector('.platform-choice input:checked')) {
      if (err) { err.textContent = 'Vyberte prosím aspoň jeden telefon.'; err.hidden = false; }
      return;
    }
    if (btn) btn.disabled = true;
    fetch(f.dataset.endpoint, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(new FormData(f)) })
      .then(function () {
        f.querySelectorAll('input, fieldset, .consent, button, .form-error').forEach(function (el) { el.hidden = true; });
        if (done) done.hidden = false;
      })
      .catch(function () {
        if (err) { err.textContent = 'Odeslání se nepovedlo, zkuste to prosím znovu.'; err.hidden = false; }
        if (btn) btn.disabled = false;
      });
  });
  f.addEventListener('change', function () {
    if (err && f.querySelector('.platform-choice input:checked')) err.hidden = true;
  });
});
