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

var URG = {r: {t: 'Шұғыл', c: 'u-r'}, y: {t: 'Маңызды', c: 'u-y'}, g: {t: 'Жеңіл', c: 'u-g'}};
function $(s) { return document.querySelector(s); }
function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
var store = {
  get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
var toastTimer = null;
function toast(m) {
  var t = $('#toast'); t.textContent = m; t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.style.display = 'none'; }, 2600);
}
var ESCMAP = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ESCMAP[c]; }); }

/* ===== Навигация ===== */
function go(name) {
  $$('.screen').forEach(function (s) { s.classList.remove('active'); });
  $('#s-' + name).classList.add('active');
  $$('nav button').forEach(function (b) {
    var on = b.getAttribute('data-go') === name || (name === 'detail' && b.getAttribute('data-go') === 'guides');
    if (on) { b.classList.add('active'); } else { b.classList.remove('active'); }
  });
  window.scrollTo(0, 0);
  if (name !== 'cpr') stopMetro();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
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
applyPrefs();

/* ===== Нұсқаулық тізімі ===== */
var filter = 'all';
function renderChips() {
  var opts = [['all', 'Барлығы'], ['r', '🔴 Шұғыл'], ['y', '🟡 Маңызды'], ['g', '🟢 Жеңіл']];
  $('#chips').innerHTML = opts.map(function (o) {
    return '<button class="chip' + (filter === o[0] ? ' on' : '') + '" data-f="' + o[0] + '">' + o[1] + '</button>';
  }).join('');
  $$('#chips .chip').forEach(function (c) {
    c.onclick = function () { filter = c.getAttribute('data-f'); renderChips(); renderList(); };
  });
}
function renderList() {
  var q = $('#q').value.replace(/^\s+|\s+$/g, '').toLowerCase();
  var items = GUIDES.filter(function (g) {
    return (filter === 'all' || g.u === filter) &&
      (!q || g.t.toLowerCase().indexOf(q) !== -1 || g.sym.join(' ').toLowerCase().indexOf(q) !== -1);
  });
  $('#list').innerHTML = items.length ? items.map(function (g) {
    return '<button class="item" data-id="' + g.id + '"><span class="e">' + g.e + '</span><span class="t">' +
      esc(g.t) + '</span><span class="tag ' + URG[g.u].c + '">' + URG[g.u].t + '</span></button>';
  }).join('') : '<p class="muted">Ештеңе табылмады.</p>';
  $$('#list .item').forEach(function (b) { b.onclick = function () { openGuide(b.getAttribute('data-id')); }; });
}
$('#q').oninput = renderList;

function sec(cls, title, arr, ordered) {
  if (!arr || !arr.length) return '';
  var tag = ordered ? 'ol' : 'ul';
  return '<div class="sec ' + cls + '"><h3>' + title + '</h3><' + tag + '>' +
    arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</' + tag + '></div>';
}
var currentGuide = null;
function openGuide(id) {
  var g = GUIDES.find(function (x) { return x.id === id; });
  currentGuide = g;
  $('#detail').innerHTML =
    '<h2 style="margin:0 0 4px">' + g.e + ' ' + esc(g.t) + ' <span class="tag ' + URG[g.u].c + '">' + URG[g.u].t + '</span></h2>' +
    '<a class="btn red" href="tel:112">📞 112-ге қоңырау шалу</a>' +
    '<button class="btn gray" id="btnSpeak">🔊 Дауыстап оқу</button>' +
    sec('sym', 'Белгілері', g.sym, false) +
    sec('do', 'Не істеу керек', g['do'], true) +
    sec('dont', 'Не істеуге болмайды', g.dont, false) +
    sec('call', 'Қашан 112/103-ке қоңырау шалу керек', g.call, false) +
    '<p class="warn">Ақпарат жалпы мақсатта берілген және дәрігер көмегін алмастырмайды.</p>';
  $('#btnSpeak').onclick = speakGuide;
  go('detail');
}
function speakGuide() {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    toast('Бұл құрылғы дауыспен оқуды қолдамайды'); return;
  }
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
  var g = currentGuide;
  var text = g.t + '. Не істеу керек. ' + g['do'].map(function (x, i) { return (i + 1) + '. ' + x; }).join(' ') +
    ' Не істеуге болмайды. ' + (g.dont || []).join(' ');
  var u = new SpeechSynthesisUtterance(text);
  var voices = speechSynthesis.getVoices();
  var v = voices.find(function (v) { return /^kk/i.test(v.lang); }) || voices.find(function (v) { return /^ru/i.test(v.lang); });
  if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'kk-KZ'; }
  if (!voices.some(function (v) { return /^kk/i.test(v.lang); })) toast('Қазақша дауыс табылмады, ең жақын дауыс қолданылады');
  speechSynthesis.speak(u);
}

/* ===== Орын және SOS ===== */
var lastLoc = null;
function locText() {
  if (!lastLoc) return 'Көмек керек! Орнымды анықтай алмадым.';
  var c = lastLoc.coords;
  var link = 'https://maps.google.com/?q=' + c.latitude.toFixed(6) + ',' + c.longitude.toFixed(6);
  var med = store.get('med', {});
  var parts = [];
  if (med.blood) parts.push('Қан тобы: ' + med.blood);
  if (med.allergy) parts.push('Аллергия: ' + med.allergy);
  var extra = parts.join('. ');
  return '🆘 Көмек керек! Менің орным: ' + link + ' (дәлдігі шамамен ' + Math.round(c.accuracy) + ' м).' + (extra ? ' ' + extra + '.' : '');
}
function buildSendButtons() {
  var cs = store.get('contacts', []);
  var msg = encodeURIComponent(locText());
  if (!cs.length) {
    $('#sendBox').innerHTML = '<p class="muted">Жақындарға жіберу үшін «Менің» бөлімінде сенімді адамдарды қосыңыз.</p>' +
      '<a class="btn green" href="sms:?&body=' + msg + '">💬 SMS арқылы жіберу</a>';
    return;
  }
  $('#sendBox').innerHTML = cs.map(function (c) {
    var ph = c.phone.replace(/[^\d+]/g, '');
    var wa = ph.replace(/\D/g, '');
    return '<a class="btn green" href="sms:' + ph + '?&body=' + msg + '">💬 ' + esc(c.name) + ': SMS</a>' +
      '<a class="btn" style="background:#128c7e" href="https://wa.me/' + wa + '?text=' + msg + '" target="_blank" rel="noopener">WhatsApp: ' + esc(c.name) + '</a>';
  }).join('');
}
function getLocation() {
  $('#locStatus').textContent = '📍 Орын анықталуда…';
  if (!navigator.geolocation) {
    $('#locStatus').textContent = '⚠️ Бұл құрылғы орынды анықтамайды. Мекенжайды дауыспен айтыңыз.';
    buildSendButtons(); return;
  }
  navigator.geolocation.getCurrentPosition(function (pos) {
    lastLoc = pos;
    var la = pos.coords.latitude, lo = pos.coords.longitude, ac = pos.coords.accuracy;
    $('#locStatus').innerHTML = '📍 Орныңыз анықталды (дәлдігі ~' + Math.round(ac) + ' м)<br><a href="https://maps.google.com/?q=' + la + ',' + lo + '" target="_blank" rel="noopener">Картада көру</a>';
    buildSendButtons();
  }, function (err) {
    var m = err.code === 1 ? 'Орынға рұқсат берілмеді. Браузер баптауынан рұқсат беріңіз.' : 'Орын анықталмады.';
    $('#locStatus').textContent = '⚠️ ' + m + ' Мекенжайды дауыспен айтыңыз.';
    buildSendButtons();
  }, {enableHighAccuracy: true, timeout: 12000, maximumAge: 0});
}
$('#btnSOS').onclick = function () {
  if (navigator.vibrate) navigator.vibrate(200);
  var p = $('#panelSOS');
  p.style.display = 'block';
  try { p.scrollIntoView({behavior: 'smooth'}); } catch (e) { p.scrollIntoView(); }
  getLocation();
};
function copyText(text, done, fail) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, fail);
    return;
  }
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
  copyText(locText(), function () { toast('Көшірілді'); }, function () { toast('Көшіру мүмкін болмады'); });
};

/* ===== Жақындар және мед.карта ===== */
function renderContacts() {
  var cs = store.get('contacts', []);
  $('#contactList').innerHTML = cs.length ? cs.map(function (c, i) {
    return '<div class="contact"><span><b>' + esc(c.name) + '</b><br><span class="muted">' + esc(c.phone) + '</span></span><button data-i="' + i + '" aria-label="Өшіру">🗑</button></div>';
  }).join('') : '<p class="muted">Әлі ешкім қосылмаған.</p>';
  $$('#contactList button').forEach(function (b) {
    b.onclick = function () {
      var a = store.get('contacts', []);
      a.splice(parseInt(b.getAttribute('data-i'), 10), 1);
      store.set('contacts', a); renderContacts();
    };
  });
}
$('#btnAddContact').onclick = function () {
  var name = $('#cName').value.replace(/^\s+|\s+$/g, ''), phone = $('#cPhone').value.replace(/^\s+|\s+$/g, '');
  if (!name || phone.replace(/\D/g, '').length < 10) { toast('Атын және толық нөмірді енгізіңіз'); return; }
  var a = store.get('contacts', []);
  if (a.length >= 5) { toast('Ең көбі 5 адам'); return; }
  a.push({name: name, phone: phone}); store.set('contacts', a);
  $('#cName').value = ''; $('#cPhone').value = ''; renderContacts(); toast('Қосылды');
};
function loadMed() {
  var m = store.get('med', {});
  $('#mBlood').value = m.blood || ''; $('#mAllergy').value = m.allergy || ''; $('#mMeds').value = m.meds || '';
}
function trim(s) { return s.replace(/^\s+|\s+$/g, ''); }
$('#btnSaveMed').onclick = function () {
  store.set('med', {blood: trim($('#mBlood').value), allergy: trim($('#mAllergy').value), meds: trim($('#mMeds').value)});
  toast('Сақталды');
};
$('#btnShare').onclick = function () {
  if (navigator.share) {
    try { navigator.share({title: 'SOS Көмек', text: 'Қазақша алғашқы көмек және SOS қосымшасы (тегін)', url: location.href}); } catch (e) {}
  } else {
    copyText(location.href, function () { toast('Сілтеме көшірілді'); }, function () { toast(location.href); });
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
  $('#btnMetro').textContent = '⏹ Тоқтату';
}
function stopMetro() {
  if (metroTimer) { clearInterval(metroTimer); metroTimer = null; }
  var b = $('#btnMetro'); if (b) b.textContent = '▶ Бастау';
}
$('#btnMetro').onclick = function () { if (metroTimer) { stopMetro(); } else { startMetro(); } };
$('#bpmRange').oninput = function (e) {
  $('#bpm').textContent = this.value;
  if (metroTimer) { stopMetro(); startMetro(); }
};

/* ===== Іске қосу ===== */
renderChips(); renderList(); renderContacts(); loadMed();
