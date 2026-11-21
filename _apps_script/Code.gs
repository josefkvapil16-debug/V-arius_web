/**
 * V-arius – upozornění na vydání (Google Apps Script u Google tabulky).
 * Kód žije v repu webu jen jako záloha (_apps_script/ GitHub Pages nepublikuje).
 *
 * Co dělá (podle zásad, kapitola 10):
 *  • doPost  – přijme formulář z webu a zapíše řádek (stejný e-mail = jen doplní telefony),
 *  • odhlášení – odkaz v každé zprávě → potvrzovací stránka → řádek se hned smaže,
 *  • úklid   – každý den smaže řádky starší 2 let,
 *  • rozeslání – menu V-arius → Rozeslat iPhone / Android; kdo už na nic nečeká, smaže se.
 *    Při vyčerpání denní kvóty Gmailu pokračuje sám další den.
 *
 * Nasazení: viz README.md ve stejné složce.
 */

const SHEET = 'Přihlášky';
const HEAD = ['email', 'iphone', 'android', 'prihlaseno', 'token', 'odeslano_iphone', 'odeslano_android'];
const C = { email: 0, iphone: 1, android: 2, at: 3, token: 4, sentI: 5, sentA: 6 };
const KEEP_DAYS = 730;          // 2 roky – stejně jako v zásadách
const NOTIFY_OWNER = true;      // poslat si e-mail o nové přihlášce
const PLATFORM = { iphone: { col: C.iphone, sent: C.sentI, name: 'iPhone' },
                   android: { col: C.android, sent: C.sentA, name: 'Android' } };

// ─────────────────────────── tabulka ───────────────────────────

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
  }
  return sh;
}

function rows_() {
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, HEAD.length).getValues() : [];
}

/** Smaže řádky (indexy od 0 v datech) odspodu, ať se indexy neposunou. */
function deleteRows_(idx) {
  const sh = sheet_();
  idx.sort((a, b) => b - a).forEach(i => sh.deleteRow(i + 2));
}

// ─────────────────────────── web ───────────────────────────

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'unsubscribe') return unsubscribe_(p.token);

  // Past na roboty: skryté pole musí zůstat prázdné.
  if (p.web) return text_('ok');
  const email = String(p.email || '').trim().toLowerCase();
  const ios = p.ios === 'ano', android = p.android === 'ano';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return text_('bad');
  if (p.souhlas !== 'ano' || (!ios && !android)) return text_('bad');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const data = rows_();
    const i = data.findIndex(r => r[C.email] === email);
    if (i >= 0) {
      if (ios) sh.getRange(i + 2, C.iphone + 1).setValue('ano');
      if (android) sh.getRange(i + 2, C.android + 1).setValue('ano');
    } else {
      sh.appendRow([email, ios ? 'ano' : '', android ? 'ano' : '', new Date(),
                    Utilities.getUuid(), '', '']);
      if (NOTIFY_OWNER) {
        MailApp.sendEmail(Session.getEffectiveUser().getEmail(),
          'V-arius: nová přihláška',
          'Nová přihláška k upozornění na vydání (' +
          [ios && 'iPhone', android && 'Android'].filter(Boolean).join(', ') + ').\n' +
          'Celkem přihlášených: ' + (data.length + 1));
      }
    }
  } finally {
    lock.releaseLock();
  }
  return text_('ok');
}

/** Odkaz z e-mailu jen ZOBRAZÍ potvrzení – mazat až po kliknutí na tlačítko
 *  (antiviry v poště odkazy samy otevírají a nesmí nikoho odhlásit). */
function doGet(e) {
  const token = String(((e && e.parameter) || {}).token || '');
  const url = ScriptApp.getService().getUrl();
  return page_('Odhlásit upozornění na vydání V-arius',
    '<p>Po potvrzení se váš e-mail okamžitě smaže a žádná další zpráva už nepřijde.</p>' +
    '<form method="post" action="' + url + '" target="_top">' +
    '<input type="hidden" name="action" value="unsubscribe">' +
    '<input type="hidden" name="token" value="' + escape_(token) + '">' +
    '<button type="submit">Odhlásit a smazat e-mail</button></form>');
}

function unsubscribe_(token) {
  token = String(token || '');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = rows_();
    const idx = [];
    data.forEach((r, i) => { if (token && r[C.token] === token) idx.push(i); });
    deleteRows_(idx);
  } finally {
    lock.releaseLock();
  }
  return page_('Hotovo', '<p>E-mail je smazaný. Děkujeme za zájem o V-arius.</p>' +
    '<p><a href="https://www.v-arius.cz/" target="_top">Zpět na web</a></p>');
}

function text_(s) {
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT);
}

function escape_(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function page_(title, body) {
  return HtmlService.createHtmlOutput(
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>body{font:16px/1.5 system-ui,sans-serif;background:#F4E9D6;color:#2B2118;margin:0;padding:24px}' +
    'main{max-width:480px;margin:40px auto;background:#FFFBF4;border:1.5px solid #C78F56;border-radius:12px;padding:24px}' +
    'h1{font-size:1.2rem;margin:0 0 12px}button{font:700 .9rem system-ui;padding:12px 20px;border-radius:10px;' +
    'border:1.5px solid #C78F56;background:#F1DEC6;color:#2B2118;cursor:pointer}a{color:#8B5A2B}</style>' +
    '<main><h1>' + title + '</h1>' + body + '</main>')
    .setTitle(title);
}

// ─────────────────────────── úklid ───────────────────────────

/** Denně: smaže přihlášky starší 2 let. */
function purgeOld() {
  const limit = Date.now() - KEEP_DAYS * 86400000;
  const idx = [];
  rows_().forEach((r, i) => { if (new Date(r[C.at]).getTime() < limit) idx.push(i); });
  deleteRows_(idx);
}

/** Smaže řádky, které už nečekají na žádný telefon. */
function purgeDone_() {
  const idx = [];
  rows_().forEach((r, i) => {
    const waitI = r[C.iphone] === 'ano' && !r[C.sentI];
    const waitA = r[C.android] === 'ano' && !r[C.sentA];
    if (!waitI && !waitA) idx.push(i);
  });
  deleteRows_(idx);
}

// ─────────────────────────── rozeslání ───────────────────────────

function onOpen() {
  SpreadsheetApp.getUi().createMenu('V-arius')
    .addItem('Rozeslat: vyšlo pro iPhone', 'releaseIphone')
    .addItem('Rozeslat: vyšlo pro Android', 'releaseAndroid')
    .addSeparator()
    .addItem('Zapnout denní úklid (jednou)', 'setup')
    .addToUi();
}

/** Jednorázově: denní úklid. Spustit jednou z menu. */
function setup() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'purgeOld')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('purgeOld').timeBased().everyDays(1).atHour(3).create();
  sheet_();
  SpreadsheetApp.getUi().alert('Denní úklid je zapnutý.');
}

function releaseIphone() { startRelease_('iphone'); }
function releaseAndroid() { startRelease_('android'); }

function startRelease_(key) {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Vyšlo pro ' + PLATFORM[key].name,
    'Vlož odkaz do obchodu (App Store / Google Play):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK || !/^https:\/\//.test(r.getResponseText().trim())) return;
  PropertiesService.getScriptProperties().setProperty('link_' + key, r.getResponseText().trim());
  const left = sendBatch_(key);
  scheduleIfPending_();
  ui.alert(left ? 'Odesláno, kolik dnes šlo. Zbylých ' + left + ' se rozešle samo zítra.'
                : 'Hotovo, všem odesláno.');
}

/** Pokračování rozesílání další den (spouští časovač). */
function continueRelease() {
  ['iphone', 'android'].forEach(k => {
    if (PropertiesService.getScriptProperties().getProperty('link_' + k)) sendBatch_(k);
  });
  scheduleIfPending_();
}

/** Jeden časovač na zítřek, dokud některé rozesílání nedoběhlo. */
function scheduleIfPending_() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'continueRelease')
    .forEach(t => ScriptApp.deleteTrigger(t));
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('link_iphone') || props.getProperty('link_android')) {
    ScriptApp.newTrigger('continueRelease').timeBased().after(24 * 3600 * 1000).create();
  }
}

/** Pošle, kolik dovolí kvóta; vrací počet zbývajících. */
function sendBatch_(key) {
  const P = PLATFORM[key];
  const props = PropertiesService.getScriptProperties();
  const link = props.getProperty('link_' + key);
  const url = ScriptApp.getService().getUrl();
  const sh = sheet_();
  const data = rows_();
  let left = 0;
  data.forEach((r, i) => {
    if (r[P.col] !== 'ano' || r[P.sent]) return;
    if (MailApp.getRemainingDailyQuota() < 2) { left++; return; }
    MailApp.sendEmail({
      to: r[C.email],
      subject: 'V-arius je venku pro ' + P.name,
      body: 'Dobrý den,\n\n' +
        'V-arius je k dispozici pro ' + P.name + ':\n' + link + '\n\n' +
        'Tuto zprávu dostáváte, protože jste na webu www.v-arius.cz požádali o upozornění na vydání. ' +
        'Další zprávy už nepřijdou' + (otherWaiting_(r, key) ? ' (kromě upozornění pro druhý zvolený telefon)' : '') + '.\n\n' +
        'Odhlásit a smazat e-mail: ' + url + '?token=' + r[C.token] + '\n\n' +
        'Josef Kvapil, V-arius',
      name: 'V-arius',
    });
    sh.getRange(i + 2, P.sent + 1).setValue(new Date());
  });
  if (!left) props.deleteProperty('link_' + key);
  purgeDone_();
  trashSentCopies_();
  return left;
}

/** Odeslané zprávy zůstávají v Odeslané poště s adresou příjemce – do koše
 *  (Gmail koš sám vysype do 30 dnů). */
function trashSentCopies_() {
  GmailApp.search('in:sent subject:"V-arius je venku pro"').forEach(t => t.moveToTrash());
}

function otherWaiting_(r, key) {
  return key === 'iphone' ? (r[C.android] === 'ano' && !r[C.sentA])
                          : (r[C.iphone] === 'ano' && !r[C.sentI]);
}
