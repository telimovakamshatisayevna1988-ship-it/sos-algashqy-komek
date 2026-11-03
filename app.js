/* ===== Ескі браузерлерге арналған қосымшалар (polyfill) ===== */
if (!Array.prototype.find) {
  Array.prototype.find = function (f) {
    for (var i = 0; i < this.length; i++) { if (f(this[i], i, this)) return this[i]; }
    return undefined;
  };
}
if (!String.prototype.includes) {
  String.prototype.includes = function (s, p) { return this.indexOf(s, p || 0) !== -1; };
}

function $(s) { return document.querySelector(s); }
function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
var store = {
  get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
var ESCMAP = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ESCMAP[c]; }); }
function trim(s) { return String(s).replace(/^\s+|\s+$/g, ''); }

/* ===== Тіл ===== */
var LANGS = ['kk', 'ru', 'en'];
var VOICE_LANG = {kk: 'kk-KZ', ru: 'ru-RU', en: 'en-US'};
var lang = store.get('lang', 'kk');
if (LANGS.indexOf(lang) < 0) lang = 'kk';
function t(k, vars) {
  var s = (I18N[lang] && I18N[lang][k] != null) ? I18N[lang][k] : I18N.kk[k];
  if (typeof s === 'string' && vars) {
    for (var p in vars) { if (vars.hasOwnProperty(p)) s = s.split('{' + p + '}').join(vars[p]); }
  }
  return s;
}
var URGKEY = {r: 'tagR', y: 'tagY', g: 'tagG'};
var URGCLS = {r: 'u-r', y: 'u-y', g: 'u-g'};

var toastTimer = null;
function toast(m) {
  var el = $('#toast'); el.textContent = m; el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.style.display = 'none'; }, 3200);
}

function applyStatic() {
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
  $$('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
  $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
  document.title = t('appName');
  $('#lang').value = lang;
  $('#btnMetro').textContent = metroTimer ? t('stop') : t('start');
  $('#cprSteps').innerHTML = t('cprSteps').map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
}

/* ===== Навигация ===== */
var currentScreen = 'home';
function go(name) {
  currentScreen = name;
  $$('.screen').forEach(function (s) { s.classList.remove('active'); });
  $('#s-' + name).classList.add('active');
  $$('nav button').forEach(function (b) {
    var g = b.getAttribute('data-go');
    var on = g === name || (name === 'detail' && g === 'guides');
    if (on) { b.classList.add('active'); } else { b.classList.remove('active'); }
  });
  window.scrollTo(0, 0);
  if (name !== 'cpr') stopMetro();
  stopSpeech();
}
$$('nav button').forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-go')); }; });
$('#btnBack').onclick = function () { go('guides'); };

/* ===== Тақырып / қаріп ===== */
var root = document.documentElement;
function applyPrefs() {
  root.setAttribute('data-theme', store.get('theme', 'light'));
  root.style.fontSize = store.get('fs', 16) + 'px';
}
$('#btnTheme').onclick = function () { store.set('theme', store.get('theme', 'light') === 'dark' ? 'light' : 'dark'); applyPrefs(); };
$('#btnFont').onclick = function () { var f = store.get('fs', 16); store.set('fs', f >= 22 ? 16 : f + 3); applyPrefs(); };

/* ===== Нұсқаулық тізімі ===== */
function guideView(g) {
  var title = g.t, body = g, translated = true;
  if (lang !== 'kk') {
    var tr = GT[lang];
    if (tr && tr.titles[g.id]) title = tr.titles[g.id];
    if (tr && tr.g[g.id]) { body = tr.g[g.id]; } else { translated = false; }
  }
  return {id: g.id, e: g.e, u: g.u, t: title, sym: body.sym, 'do': body['do'], dont: body.dont, call: body.call, translated: translated};
}
var filter = 'all';
function renderChips() {
  var opts = [['all', 'chipAll'], ['r', 'chipUrgent'], ['y', 'chipImp'], ['g', 'chipLight']];
  $('#chips').innerHTML = opts.map(function (o) {
    return '<button class="chip' + (filter === o[0] ? ' on' : '') + '" data-f="' + o[0] + '">' + esc(t(o[1])) + '</button>';
  }).join('');
  $$('#chips .chip').forEach(function (c) {
    c.onclick = function () { filter = c.getAttribute('data-f'); renderChips(); renderList(); };
  });
}
function renderList() {
  var q = trim($('#q').value).toLowerCase();
  var items = GUIDES.map(guideView).filter(function (g) {
    return (filter === 'all' || g.u === filter) &&
      (!q || g.t.toLowerCase().indexOf(q) !== -1 || g.sym.join(' ').toLowerCase().indexOf(q) !== -1);
  });
  $('#list').innerHTML = items.length ? items.map(function (g) {
    return '<button class="item" data-id="' + g.id + '"><span class="e">' + g.e + '</span><span class="t">' +
      esc(g.t) + '</span><span class="tag ' + URGCLS[g.u] + '">' + esc(t(URGKEY[g.u])) + '</span></button>';
  }).join('') : '<p class="muted">' + esc(t('noResults')) + '</p>';
  $$('#list .item').forEach(function (b) { b.onclick = function () { openGuide(b.getAttribute('data-id')); }; });
}
$('#q').oninput = renderList;

function sec(cls, title, arr, ordered) {
  if (!arr || !arr.length) return '';
  var tag = ordered ? 'ol' : 'ul';
  return '<div class="sec ' + cls + '"><h3>' + esc(title) + '</h3><' + tag + '>' +
    arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</' + tag + '></div>';
}
var currentGuide = null;
function openGuide(id) {
  var raw = GUIDES.find(function (x) { return x.id === id; });
  var g = guideView(raw);
  currentGuide = g;
  $('#detail').innerHTML =
    '<h2 style="margin:0 0 4px">' + g.e + ' ' + esc(g.t) + ' <span class="tag ' + URGCLS[g.u] + '">' + esc(t(URGKEY[g.u])) + '</span></h2>' +
    '<a class="btn red" href="tel:112">' + esc(t('call112')) + '</a>' +
    '<button class="btn gray" id="btnSpeak">' + esc(t('speak')) + '</button>' +
    (g.translated ? '' : '<div class="notr">' + esc(t('notTranslated')) + '</div>') +
    sec('sym', t('secSym'), g.sym, false) +
    sec('do', t('secDo'), g['do'], true) +
    sec('dont', t('secDont'), g.dont, false) +
    sec('call', t('secCall'), g.call, false) +
    '<p class="warn">' + esc(t('guideWarn')) + '</p>';
  $('#btnSpeak').onclick = speakGuide;
  go('detail');
}

/* ===== Дауыспен оқу ===== */
function stopSpeech() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {} }
function speakText(text, forceLang) {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') { toast(t('noTTS')); return; }
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
  var code = VOICE_LANG[forceLang || lang];
  var prefix = code.split('-')[0];
  var voices = speechSynthesis.getVoices();
  var match = voices.find(function (v) { return v.lang && v.lang.toLowerCase().indexOf(prefix) === 0; });
  if (voices.length && !match) { toast(t('noVoice')); return; }
  var u = new SpeechSynthesisUtterance(text);
  u.lang = code;
  if (match) { u.voice = match; u.lang = match.lang; }
  speechSynthesis.speak(u);
}
function speakGuide() {
  var g = currentGuide;
  var text = g.t + '. ' + t('secDo') + '. ' + g['do'].map(function (x, i) { return (i + 1) + '. ' + x; }).join(' ') +
    ' ' + t('secDont') + '. ' + (g.dont || []).join(' ');
  speakText(text, g.translated ? lang : 'kk');
}
$('#btnCprSpeak').onclick = function () {
  speakText(t('cprTitle').replace(/^[^\wА-Яа-яӘәҒғҚқҢңӨөҰұҮүІіҺһ]+/, '') + '. ' + t('cprSteps').join(' '));
};
if ('speechSynthesis' in window) { try { speechSynthesis.getVoices(); } catch (e) {} }

/* ===== Орын және SOS ===== */
var lastLoc = null;
var locState = {kind: 'idle'};
function mapLink() {
  var c = lastLoc.coords;
  return 'https://maps.google.com/?q=' + c.latitude.toFixed(6) + ',' + c.longitude.toFixed(6);
}
function locText() {
  if (!lastLoc) return t('sosMsgNoLoc');
  var med = store.get('med', {});
  var parts = [];
  if (med.blood) parts.push(t('bloodLbl') + ': ' + med.blood);
  if (med.allergy) parts.push(t('allergyLbl') + ': ' + med.allergy);
  return t('sosMsg', {link: mapLink(), m: Math.round(lastLoc.coords.accuracy)}) + (parts.length ? ' ' + parts.join('. ') + '.' : '');
}
function buildSendButtons() {
  var cs = store.get('contacts', []);
  var msg = encodeURIComponent(locText());
  var html = '';
  if (!cs.length) {
    html += '<p class="muted">' + esc(t('addContactsHint')) + '</p>';
    html += '<a class="btn green" href="sms:?&body=' + msg + '">' + esc(t('smsGeneric')) + '</a>';
    html += '<a class="btn" style="background:#128c7e" href="https://wa.me/?text=' + msg + '" target="_blank" rel="noopener">' + esc(t('waGeneric')) + '</a>';
  } else {
    cs.forEach(function (c) {
      var ph = c.phone.replace(/[^\d+]/g, '');
      var wa = ph.replace(/\D/g, '');
      html += '<a class="btn green" href="sms:' + ph + '?&body=' + msg + '">💬 ' + esc(c.name) + ': ' + esc(t('smsTo')) + '</a>';
      html += '<a class="btn" style="background:#128c7e" href="https://wa.me/' + wa + '?text=' + msg + '" target="_blank" rel="noopener">🟢 ' + esc(c.name) + ': ' + esc(t('waTo')) + '</a>';
    });
  }
  $('#sendBox').innerHTML = html;
}
function renderLoc() {
  var el = $('#locStatus');
  if (locState.kind === 'finding') { el.textContent = t('locFinding'); return; }
  if (locState.kind === 'ok') {
    var c = lastLoc.coords;
    el.innerHTML = esc(t('locFound', {m: Math.round(c.accuracy)})) + '<br><a href="' + mapLink() + '" target="_blank" rel="noopener">' + esc(t('viewMap')) + '</a>';
  } else if (locState.kind === 'err') {
    el.textContent = '⚠️ ' + t(locState.key) + ' ' + t('sayAddress');
  } else { el.textContent = ''; }
  if (locState.kind === 'ok' || locState.kind === 'err') buildSendButtons();
}
function getLocation() {
  locState = {kind: 'finding'}; renderLoc();
  if (window.isSecureContext === false) { locState = {kind: 'err', key: 'locInsecure'}; renderLoc(); return; }
  if (!navigator.geolocation) { locState = {kind: 'err', key: 'locNoSupport'}; renderLoc(); return; }
  navigator.geolocation.getCurrentPosition(function (pos) {
    lastLoc = pos; locState = {kind: 'ok'}; renderLoc();
  }, function (err) {
    locState = {kind: 'err', key: err.code === 1 ? 'locDenied' : 'locFail'}; renderLoc();
  }, {enableHighAccuracy: true, timeout: 12000, maximumAge: 0});
}
$('#btnSOS').onclick = function () {
  if (navigator.vibrate) navigator.vibrate(200);
  var p = $('#panelSOS');
  p.style.display = 'block';
  buildSendButtons();
  try { p.scrollIntoView({behavior: 'smooth'}); } catch (e) { p.scrollIntoView(); }
  getLocation();
};
function copyText(text, done, fail) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text, done, fail); });
    return;
  }
  legacyCopy(text, done, fail);
}
function legacyCopy(text, done, fail) {
  try {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) { done(); } else { fail(); }
  } catch (e) { fail(); }
}
$('#btnCopyLoc').onclick = function () {
  copyText(locText(), function () { toast(t('copied')); }, function () { toast(t('copyFail')); });
};

/* ===== Жақындар және мед.карта ===== */
function renderContacts() {
  var cs = store.get('contacts', []);
  $('#contactList').innerHTML = cs.length ? cs.map(function (c, i) {
    return '<div class="contact"><span><b>' + esc(c.name) + '</b><br><span class="muted">' + esc(c.phone) + '</span></span><button data-i="' + i + '" aria-label="' + esc(t('delAria')) + '">🗑</button></div>';
  }).join('') : '<p class="muted">' + esc(t('ctNone')) + '</p>';
  $$('#contactList button').forEach(function (b) {
    b.onclick = function () {
      var a = store.get('contacts', []);
      a.splice(parseInt(b.getAttribute('data-i'), 10), 1);
      store.set('contacts', a); renderContacts(); buildSendButtons();
    };
  });
}
$('#btnAddContact').onclick = function () {
  var name = trim($('#cName').value), phone = trim($('#cPhone').value);
  if (!name || phone.replace(/\D/g, '').length < 10) { toast(t('ctInvalid')); return; }
  var a = store.get('contacts', []);
  if (a.length >= 5) { toast(t('ctMax')); return; }
  a.push({name: name, phone: phone}); store.set('contacts', a);
  $('#cName').value = ''; $('#cPhone').value = ''; renderContacts(); toast(t('ctAdded'));
};
function loadMed() {
  var m = store.get('med', {});
  $('#mBlood').value = m.blood || ''; $('#mAllergy').value = m.allergy || ''; $('#mMeds').value = m.meds || '';
}
$('#btnSaveMed').onclick = function () {
  store.set('med', {blood: trim($('#mBlood').value), allergy: trim($('#mAllergy').value), meds: trim($('#mMeds').value)});
  toast(t('saved'));
};

/* ===== Резервтік көшірме ===== */
function backupJSON() {
  return JSON.stringify({app: 'sos-komek', v: 1, contacts: store.get('contacts', []), med: store.get('med', {})});
}
function applyBackup(text) {
  try {
    var d = JSON.parse(trim(text));
    if (!d || d.app !== 'sos-komek') throw new Error('bad');
    var cs = [];
    (d.contacts || []).slice(0, 5).forEach(function (c) {
      if (c && typeof c.name === 'string' && typeof c.phone === 'string') cs.push({name: c.name.slice(0, 60), phone: c.phone.slice(0, 30)});
    });
    var m = d.med || {};
    store.set('contacts', cs);
    store.set('med', {blood: String(m.blood || '').slice(0, 60), allergy: String(m.allergy || '').slice(0, 120), meds: String(m.meds || '').slice(0, 200)});
    renderContacts(); loadMed(); toast(t('bkDone'));
  } catch (e) { toast(t('bkBad')); }
}
$('#btnExport').onclick = function () {
  try {
    var blob = new Blob([backupJSON()], {type: 'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'sos-komek-backup.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast(t('bkExported'));
  } catch (e) { toast(t('copyFail')); }
};
$('#btnBackupCopy').onclick = function () {
  copyText(backupJSON(), function () { toast(t('copied')); }, function () { $('#backupText').value = backupJSON(); toast(t('copyFail')); });
};
$('#fileImport').onchange = function () {
  var f = this.files && this.files[0];
  if (!f) return;
  var r = new FileReader();
  r.onload = function () { applyBackup(String(r.result)); };
  r.onerror = function () { toast(t('bkBad')); };
  r.readAsText(f);
  this.value = '';
};
$('#btnRestore').onclick = function () { applyBackup($('#backupText').value); $('#backupText').value = ''; };

$('#btnShare').onclick = function () {
  if (navigator.share) {
    try { navigator.share({title: t('appName'), text: t('shareDesc'), url: location.href}); } catch (e) {}
  } else {
    copyText(location.href, function () { toast(t('linkCopied')); }, function () { toast(location.href); });
  }
};

/* ===== CPR метроном ===== */
var metroTimer = null, actx = null;
function beep() {
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = actx || new AC();
    var o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = 880; g.gain.value = 0.25; o.connect(g); g.connect(actx.destination);
    o.start(0); o.stop(actx.currentTime + 0.06);
  } catch (e) {}
}
function tick() {
  beep(); if (navigator.vibrate) navigator.vibrate(40);
  var b = $('#beat'); b.classList.add('on');
  setTimeout(function () { b.classList.remove('on'); }, 90);
}
function startMetro() {
  var bpm = parseInt($('#bpmRange').value, 10);
  tick(); metroTimer = setInterval(tick, 60000 / bpm);
  $('#btnMetro').textContent = t('stop');
}
function stopMetro() {
  if (metroTimer) { clearInterval(metroTimer); metroTimer = null; }
  var b = $('#btnMetro'); if (b) b.textContent = t('start');
}
$('#btnMetro').onclick = function () { if (metroTimer) { stopMetro(); } else { startMetro(); } };
$('#bpmRange').oninput = function () {
  $('#bpm').textContent = this.value;
  if (metroTimer) { stopMetro(); startMetro(); }
};

/* ===== Тест ===== */
var quiz = {i: 0, score: 0, answered: false, started: false, done: false};
function renderQuiz() {
  var qs = QUIZ[lang] || QUIZ.kk, box = $('#quizBox'), total = qs.length;
  var best = store.get('quizBest', null);
  var bestLine = best !== null ? '<p class="muted">' + esc(t('quizBest', {b: best, t: total})) + '</p>' : '';
  if (!quiz.started) {
    box.innerHTML = '<h2>' + esc(t('quizTitle')) + '</h2><p class="muted">' + esc(t('quizIntro')) + '</p>' + bestLine +
      '<button class="btn green" id="qStart">' + esc(t('quizStart')) + '</button>';
    $('#qStart').onclick = function () { quiz = {i: 0, score: 0, answered: false, started: true, done: false}; renderQuiz(); };
    return;
  }
  if (quiz.done) {
    box.innerHTML = '<h2>' + esc(t('quizTitle')) + '</h2><div class="qscore">' + esc(t('result', {s: quiz.score, t: total})) + '</div>' + bestLine +
      '<button class="btn green" id="qAgain">' + esc(t('again')) + '</button>';
    $('#qAgain').onclick = function () { quiz = {i: 0, score: 0, answered: false, started: true, done: false}; renderQuiz(); };
    return;
  }
  var q = qs[quiz.i];
  var html = '<div class="qprog">' + esc(t('quizQ', {n: quiz.i + 1, t: total})) + '</div><div class="qtext">' + esc(q.q) + '</div>';
  q.o.forEach(function (o, idx) {
    var cls = 'opt';
    if (quiz.answered) { if (idx === q.a) cls += ' ok'; else if (idx === quiz.picked) cls += ' no'; }
    html += '<button class="' + cls + '" data-i="' + idx + '">' + esc(o) + '</button>';
  });
  if (quiz.answered) {
    html += '<div class="qexp"><b>' + esc(quiz.picked === q.a ? t('correct') : t('wrong')) + '</b> ' + esc(q.e) + '</div>';
    html += '<button class="btn" id="qNext">' + esc(quiz.i + 1 >= total ? t('quizFinish') : t('next')) + '</button>';
  }
  box.innerHTML = html;
  if (!quiz.answered) {
    $$('#quizBox .opt').forEach(function (b) {
      b.onclick = function () {
        quiz.picked = parseInt(b.getAttribute('data-i'), 10);
        quiz.answered = true;
        if (quiz.picked === q.a) quiz.score++;
        renderQuiz();
      };
    });
  } else {
    $('#qNext').onclick = function () {
      quiz.answered = false; quiz.i++;
      if (quiz.i >= total) {
        quiz.done = true;
        var b = store.get('quizBest', null);
        if (b === null || quiz.score > b) store.set('quizBest', quiz.score);
      }
      renderQuiz();
    };
  }
}

/* ===== Тіл ауыстыру ===== */
function renderAll() {
  applyStatic(); renderChips(); renderList(); renderContacts(); renderQuiz(); renderLoc();
  if ($('#panelSOS').style.display === 'block') buildSendButtons();
  if (currentScreen === 'detail' && currentGuide) openGuide(currentGuide.id);
}
$('#lang').onchange = function () {
  lang = this.value; store.set('lang', lang); stopSpeech(); renderAll();
};

/* ===== Іске қосу ===== */
applyPrefs();
loadMed();
renderAll();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').then(null, function () {}); });
}
