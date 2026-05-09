// FORCED CACHE CLEAR (Runs once upon upgrading to this new file)
if (!localStorage.getItem('v7_cache_clear_done')) {
  localStorage.removeItem('gemini_wisdom_' + new Date().toDateString());
  localStorage.removeItem('gemini_outfits_' + new Date().toDateString());
  localStorage.removeItem('gemini_recipes_array_' + new Date().toDateString());
  localStorage.setItem('v7_cache_clear_done', '1');
}

const CONFIG = {
  SUPABASE_URL:      'https://kyhbexbfmbtuhiddtvdb.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5aGJleGJmbWJ0dWhpZGR0dmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjY0OTgsImV4cCI6MjA5MzY0MjQ5OH0.Rv2FtqZWGtHzHieCS0SmQjnGTEdSXsqrYTYfJrwddMQ',
  PASSWORD:          'familia2024',
  WEATHER_KEY:       '7a6a9fd1087d7335ccb8d3312177225c',
  WEATHER_CITY:      'Newington,CT,US',
  PHONE:             '1860798577',
  SLIDESHOW_SPEED:   5000,
};

// ─── SUPABASE INIT ────────────────────────────────────────────────────────────
// Only init Supabase when the URL has been filled in
const _sbReady = CONFIG.SUPABASE_URL && CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL';
const sb = _sbReady ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;

// ─── STORE: reads/writes data via Supabase (cross-device) or localStorage ─────
// FIX: upsert now properly uses onConflict so it doesn't error on duplicate keys
const store = {
  async get(key) {
    if (sb) {
      try {
        const { data, error } = await sb
          .from('familia_data')
          .select('value')
          .eq('key', key)
          .maybeSingle();          // maybeSingle() returns null instead of error when row not found
        if (error) throw error;
        return data ? JSON.parse(data.value) : null;
      } catch(e) {
        console.warn('Supabase get failed, using localStorage:', e.message);
      }
    }
    const v = localStorage.getItem('f2_' + key);
    return v ? JSON.parse(v) : null;
  },

  async set(key, value) {
    const serialized = JSON.stringify(value);
    const now = new Date().toISOString();
    localStorage.setItem('f2_' + key, serialized);
    localStorage.setItem('f2_updated_' + key, now);
    if (sb) {
      try {
        const { error } = await sb
          .from('familia_data')
          .upsert(
            { key: key, value: serialized, updated_at: now },
            { onConflict: 'key' }
          );
        if (error) throw error;
      } catch(e) {
        console.warn('Supabase set failed:', e.message);
      }
    }
  }
};

// ─── SYNC: realtime + polling fallback ───────────────────────────────────────
function initRealtimeSync() {
  if (!sb) return;

  // 1. Realtime listener (instant when it works)
  sb.channel('familia_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'familia_data' }, (payload) => {
      const key = (payload.new && payload.new.key) || (payload.old && payload.old.key);
      const rawValue = payload.new && payload.new.value;
      if (!key) return;
      if (rawValue) localStorage.setItem('f2_' + key, rawValue);
      syncRenderKey(key);
    })
    .subscribe();

  // 2. Poll every 10 seconds as reliable fallback
  setInterval(async function() {
    const keys = [
      'grocery_list', 'todo_mahmoud', 'todo_haya', 'budget_items',
      'home_goals_0','home_goals_1','home_goals_2',
      'mahmoud_goals_0','mahmoud_goals_1','mahmoud_goals_2',
      'haya_goals_0','haya_goals_1','haya_goals_2'
    ];
    for (const key of keys) {
      try {
        const { data } = await sb.from('familia_data').select('value,updated_at').eq('key', key).maybeSingle();
        if (!data) continue;
        const localUpdated = localStorage.getItem('f2_updated_' + key);
        // Only re-render if Supabase has a newer version than what we last saw
        if (data.updated_at !== localUpdated) {
          localStorage.setItem('f2_' + key, data.value);
          localStorage.setItem('f2_updated_' + key, data.updated_at);
          syncRenderKey(key);
        }
      } catch(e) {}
    }
  }, 10000);
}

function syncRenderKey(key) {
  if (key === 'grocery_list')       renderList('grocery_list', 'groc-list');
  else if (key === 'todo_mahmoud')  renderTaskList('todo_mahmoud', 'm-todo-list');
  else if (key === 'todo_haya')     renderTaskList('todo_haya', 'h-todo-list');
  else if (key === 'budget_items')  renderBudget();
  else if (key.includes('goals'))   renderGoalPanelList(key);
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
var _toastTimer;
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() {
    t.style.transform = 'translateX(-50%) translateY(80px)';
  }, 2400);
}

function switchProfile(profile, btn) {
  // Update all buttons — reset inactive, highlight active
  document.querySelectorAll('.profile-btn').forEach(function(b) {
    b.classList.remove('active');
    b.style.background = 'transparent';
    b.style.color = 'var(--muted2)';
  });
  document.querySelectorAll('.dashboard').forEach(function(d) { d.classList.remove('active'); });
  btn.classList.add('active');
  btn.style.background = 'var(--accent)';
  btn.style.color = 'var(--bg)';
  document.getElementById('dash-' + profile).classList.add('active');
}

function switchTab(btn, prefix) {
  var tabRow = btn.closest('.tabs');
  var card = btn.closest('.card');
  var tabs = tabRow.querySelectorAll('.tab');
  var idx = Array.from(tabs).indexOf(btn);
  tabs.forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  card.querySelectorAll('.tab-panel').forEach(function(p, i) { p.classList.toggle('active', i === idx); });
}

function openSettings() { document.getElementById('settings-panel').style.right = '0'; document.getElementById('settings-overlay').style.display = 'block'; }
function closeSettings() { document.getElementById('settings-panel').style.right = '-380px'; document.getElementById('settings-overlay').style.display = 'none'; }

function checkLogin() {
  const pwd = document.getElementById('login-pwd').value;
  if(pwd === CONFIG.PASSWORD) {
    sessionStorage.setItem('f_auth', '1');
    document.getElementById('login-screen').style.display = 'none';
    initApp();
  } else { document.getElementById('login-err').textContent = 'Incorrect password.'; }
}

document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('f_auth') === '1') {
    document.getElementById('login-screen').style.display = 'none';
    initApp();
  }
});

function updateClock() {
  const now = new Date();
  const opts = { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true };
  document.getElementById('live-clock').textContent = now.toLocaleString('en-US', opts).replace(',', ' ·');
}

// ─── ADHAN ────────────────────────────────────────────────────────────────────
let _audioCtx = null;
let _adhanPlayedToday = {};
function unlockAudio() { try { if (!_audioCtx) { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } if (_audioCtx.state === 'suspended') { _audioCtx.resume(); } } catch(e) {} }
['touchstart','touchend','mousedown','click','keydown'].forEach(function(evt) { document.addEventListener(evt, unlockAudio, { passive: true, capture: true }); });

function handleAdhanUpload(event) {
  var file = event.target.files && event.target.files[0];
  var nameEl = document.getElementById('sp-adhan-name');
  var msgEl = document.getElementById('adhan-test-msg');
  if (!file) { if (nameEl) nameEl.textContent = 'No file selected'; return; }
  if (nameEl) nameEl.textContent = 'Reading...';
  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result; var player = document.getElementById('adhan-player');
    try { localStorage.setItem('f_adhan', dataUrl); localStorage.setItem('f_adhan_name', file.name); } catch(err) { window._adhanFallback = dataUrl; }
    player.src = dataUrl; player.load();
    if (nameEl) nameEl.textContent = '✓ ' + file.name;
    if (msgEl) msgEl.textContent = 'File loaded — tap Play to test';
    unlockAudio();
    var p = player.play();
    if (p && p.then) {
      p.then(function() {
        setTimeout(function() { player.pause(); player.currentTime = 0; if (msgEl) msgEl.textContent = '✓ Ready — will play at prayer time'; }, 150);
      }).catch(function() { if (msgEl) msgEl.textContent = '✓ Loaded — tap page then test'; });
    }
    showToast('Adhan loaded: ' + file.name);
  };
  reader.onerror = function() { if (nameEl) nameEl.textContent = 'Error reading file'; showToast('Could not read file'); };
  reader.readAsDataURL(file);
}

function getAdhanSrc() { return localStorage.getItem('f_adhan') || window._adhanFallback || null; }

function restoreAdhan() {
  var src = getAdhanSrc(); var name = localStorage.getItem('f_adhan_name');
  if (src) {
    var player = document.getElementById('adhan-player'); player.src = src; player.load();
    var nameEl = document.getElementById('sp-adhan-name'); if (nameEl && name) nameEl.textContent = '✓ ' + name;
  }
}

function testAdhan() {
  var msgEl = document.getElementById('adhan-test-msg'); var src = getAdhanSrc();
  if (!src) { if (msgEl) msgEl.textContent = 'Upload an MP3 file first'; showToast('Upload an MP3 first'); return; }
  var player = document.getElementById('adhan-player');
  if (!player.src || player.src === window.location.href) { player.src = src; player.load(); }
  unlockAudio(); player.currentTime = 0; var p = player.play();
  if (p && p.then) { p.then(function() { if (msgEl) msgEl.textContent = '▶ Playing...'; }).catch(function(err) { if (msgEl) msgEl.textContent = 'Tap anywhere on page first, then test again'; }); }
}

function checkAndPlayAdhan() {
  if (!window.prayerTimings) return;
  var prayers = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
  var now = new Date(); var todayStr = now.toDateString();
  prayers.forEach(function(name) {
    var raw = window.prayerTimings[name]; if (!raw) return;
    var parts = raw.split(':'); var h = parseInt(parts[0]); var m = parseInt(parts[1]);
    var pTime = new Date(); pTime.setHours(h, m, 0, 0); var diffSec = (pTime - now) / 1000;
    var flagKey = name + '_' + todayStr;
    if (diffSec >= -5 && diffSec <= 30 && !_adhanPlayedToday[flagKey]) {
      _adhanPlayedToday[flagKey] = true; var src = getAdhanSrc();
      if (!src) { showToast('🕌 ' + name + ' — Upload adhan in Settings'); return; }
      var player = document.getElementById('adhan-player');
      if (!player.src || player.src === window.location.href) { player.src = src; player.load(); }
      unlockAudio();
      var doPlay = function() { player.currentTime = 0; var p = player.play(); if (p && p.then) { p.then(function() { showToast('🕌 ' + name + ' — وقت الصلاة'); }).catch(function() { setTimeout(doPlay, 800); }); } };
      if (_audioCtx && _audioCtx.state === 'suspended') { _audioCtx.resume().then(doPlay).catch(doPlay); } else { doPlay(); }
    }
  });
}

function loadCNBC() {
  var container = document.getElementById('cnbc-container'); if (!container) return;
  container.innerHTML = '<iframe src="https://www.youtube.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg&autoplay=1&mute=1" style="width:100%;height:100%;border:none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
}

// ─── STOCKS ───────────────────────────────────────────────────────────────────
var STOCK_FALLBACK = [
  {sym:'AMD',price:'178.42',chg:'+2.14',up:true},{sym:'NVDA',price:'924.61',chg:'+1.87',up:true},{sym:'SPY',price:'527.33',chg:'+0.42',up:true},
  {sym:'QQQ',price:'456.12',chg:'+0.61',up:true},{sym:'BTC',price:'68,240',chg:'-0.83',up:false},{sym:'ETH',price:'3,512',chg:'+1.22',up:true},
  {sym:'^DJI',price:'39,411',chg:'+0.18',up:true},{sym:'TSLA',price:'176.90',chg:'-1.43',up:false},{sym:'AAPL',price:'220.45',chg:'+0.74',up:true},
  {sym:'META',price:'512.77',chg:'+2.01',up:true},{sym:'MSFT',price:'415.32',chg:'+0.55',up:true},{sym:'AMZN',price:'189.45',chg:'+1.18',up:true},
];
var tickerData = STOCK_FALLBACK.slice();

function renderTicker() {
  var el = document.getElementById('ticker-inner'); if (!el) return;
  var html = tickerData.map(function(t) {
    return '<div class="ticker-item"><span style="font-family:\'DM Mono\',monospace;font-weight:700;color:var(--text);">' + t.sym + '</span> ' +
      '<span style="font-family:\'DM Mono\',monospace;color:var(--muted2);">$' + t.price + '</span> ' +
      '<span style="font-family:\'DM Mono\',monospace;color:' + (t.up ? 'var(--green)' : 'var(--red)') + ';">' + (t.up ? '▲' : '▼') + ' ' + Math.abs(t.chg) + '%</span>' +
      '<span style="color:var(--border2);margin:0 12px;">|</span></div>';
  }).join('');
  el.innerHTML = html + html;
}

async function fetchStocks() {
  var symbols = ['AMD','NVDA','SPY','QQQ','BTC-USD','ETH-USD','^DJI','TSLA','AAPL','META','MSFT','AMZN'];
  var updated = [];
  for (var i = 0; i < symbols.length; i++) {
    try {
      var url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(symbols[i]) + '?interval=1d&range=1d';
      var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
      var r = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
      var d = await r.json(); var meta = d.chart && d.chart.result && d.chart.result[0] && d.chart.result[0].meta;
      if (meta && meta.regularMarketPrice) {
        var price = meta.regularMarketPrice; var prev = meta.chartPreviousClose || meta.previousClose || price;
        var chgPct = ((price - prev) / prev * 100).toFixed(2);
        updated.push({ sym: symbols[i].replace('-USD','').replace('^',''), price: price > 999 ? Math.round(price).toLocaleString() : price.toFixed(2), chg: chgPct, up: parseFloat(chgPct) >= 0 });
      }
    } catch(e) { }
  }
  if (updated.length >= 6) { tickerData = updated; renderTicker(); }
}

// ─── AI CORE: GEMINI (key stored in Supabase DB, never in code) ──────────────
var _geminiKey = null;

async function getGeminiKey() {
  if (_geminiKey) return _geminiKey;
  try {
    const { data } = await sb
      .from('familia_data')
      .select('value')
      .eq('key', 'config_gemini_key')
      .maybeSingle();
    if (data && data.value) {
      _geminiKey = JSON.parse(data.value);
      return _geminiKey;
    }
  } catch(e) {
    console.error('Could not fetch Gemini key from Supabase:', e);
  }
  return null;
}

async function callGemini(prompt, maxTokens) {
  maxTokens = maxTokens || 800;
  var key = await getGeminiKey();
  if (!key) return { error: 'Gemini key not found in Supabase. Check config_gemini_key row.' };
  try {
    var r = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' + key,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.7
          }
        })
      }
    );
    var d = await r.json();
    if (d.error) {
      console.error('Gemini API Error:', d.error);
      return { error: d.error.message || 'Gemini API error' };
    }
    if (d.candidates && d.candidates[0] && d.candidates[0].content) {
      return { text: d.candidates[0].content.parts[0].text.trim() };
    }
    return { error: 'Unknown response from Gemini' };
  } catch(e) {
    console.error('Fetch Error:', e);
    return { error: 'Network failed. Check internet connection.' };
  }
}
var callAI = callGemini;

// ─── WISDOM ───────────────────────────────────────────────────────────────────
function getWisdomCacheKey() {
  var d = new Date();
  if (d.getHours() < 6) {
    var y = new Date(d); y.setDate(y.getDate() - 1);
    return 'ai_wisdom_' + y.toDateString();
  }
  return 'ai_wisdom_' + d.toDateString();
}

async function loadIslamicWisdom(elementId) {
  var cacheKey = getWisdomCacheKey() + '_' + elementId;
  var el = document.getElementById(elementId);

  // Check Supabase cache first (shared across all devices)
  var cached = await store.get(cacheKey);
  if (cached) { renderWisdom(elementId, cached); return; }

  if (el) el.innerHTML = '<span style="color:var(--muted2);font-size:0.7rem;">Generating new wisdom...</span>';

  var prompt = 'Give me one authentic Islamic quote or wisdom from EITHER Imam Al-Shafi\'i OR Ali ibn Abi Talib. Choose a different quote each time. Return ONLY a valid JSON object exactly in this schema with no markdown: {"arabic":"string text","english":"string text","source":"string name"}';
  var result = await callAI(prompt, 300);
  var wisdom = null;

  if (result && result.text) {
    try {
      var clean = result.text.replace(/```json|```/g, '').trim();
      wisdom = JSON.parse(clean);
      await store.set(cacheKey, wisdom); // save to Supabase so all devices share it
    } catch(e) {
      wisdom = { arabic: 'Parse Error', english: 'AI returned an invalid format. Try refreshing.', source: 'System' };
    }
  } else {
    wisdom = { arabic: 'API Error', english: 'Error: ' + (result ? result.error : 'Unknown'), source: 'System' };
  }

  renderWisdom(elementId, wisdom);
}

function renderWisdom(elementId, wisdom) {
  var el = document.getElementById(elementId);
  if (!el || !wisdom) return;
  var color = wisdom.source === 'System' ? 'var(--red)' : 'var(--gold)';

  el.innerHTML =
    '<div style="font-family:\'Instrument Serif\',serif;font-size:1rem;direction:rtl;line-height:1.8;margin-bottom:8px;">' + wisdom.arabic + '</div>' +
    '<div style="font-family:\'Montserrat\',sans-serif;font-size:0.72rem;font-style:italic;color:var(--muted2);line-height:1.5;margin-bottom:6px;">"' + wisdom.english + '"</div>' +
    '<div style="font-family:\'DM Mono\',monospace;font-size:0.6rem;color:' + color + ';">— ' + wisdom.source + '</div>';
}

// ─── NEWS BRIEF ───────────────────────────────────────────────────────────────
function getNewsScheduleKey() {
  // One cache per day only — saves Gemini quota on free tier
  var d = new Date();
  if (d.getHours() < 6) { var y = new Date(d); y.setDate(y.getDate() - 1); return 'ai_news_' + y.toDateString(); }
  return 'ai_news_' + d.toDateString();
}

async function loadNewsBrief() {
  var cacheKey = getNewsScheduleKey();
  var cached = localStorage.getItem(cacheKey);
  var briefEl = document.getElementById('news-brief');

  // Check Supabase cache (shared across all devices)
  var cachedObj = await store.get(cacheKey);
  if (cachedObj) {
    if (briefEl) briefEl.innerHTML = cachedObj;
    return;
  }

  if (briefEl) briefEl.innerHTML = '<span style="color:var(--muted2);font-style:italic;font-size:0.7rem;">Generating latest brief (updates 6AM, 11AM, 3PM, 6PM, 11PM)...</span>';

  var prompt = 'Write a daily briefing with exactly 4 sections. Keep each section to 1-2 short sentences only. Return ONLY a valid JSON object with no markdown: {"world":"string","economy":"string","soccer":"string","cars":"string"}';
  var result = await callAI(prompt, 600);

  if (result && result.text) {
    try {
      var clean = result.text.replace(/```json|```/g,'').trim();
      // Repair truncated JSON by closing any open string/object
      if (!clean.endsWith('}')) {
        clean = clean.replace(/,?\s*"[^"]*$/, '').replace(/,\s*$/, '') + '}';
      }
      var d = JSON.parse(clean);
      var html =
        '<div style="margin-bottom:10px;"><b>🌍 World:</b> ' + (d.world||'No data') + '</div>' +
        '<div style="margin-bottom:10px;"><b>📈 Economy:</b> ' + (d.economy||'No data') + '</div>' +
        '<div style="margin-bottom:10px;"><b>⚽ Soccer:</b> ' + (d.soccer||'No data') + '</div>' +
        '<div><b>🚗 Cars:</b> ' + (d.cars||'No data') + '</div>';

      await store.set(cacheKey, html); // save to Supabase so all devices share it
      if (briefEl) briefEl.innerHTML = html;
    } catch(e) {
      if (briefEl) briefEl.innerHTML = '<span style="color:var(--red)">AI failed to format brief: ' + e.message + '</span>';
    }
  } else {
    var errorMsg = result ? result.error : 'Connection died completely.';
    if (briefEl) briefEl.innerHTML = '<span style="color:var(--red);font-weight:bold;">API Error:</span><br><span style="color:var(--red);font-size:0.7rem;">' + errorMsg + '</span>';
  }
}

// ─── DEALS ────────────────────────────────────────────────────────────────────
async function loadDeals() {
  var cacheKey = 'ai_deals_' + new Date().toDateString();
  var cached = localStorage.getItem(cacheKey);
  var el = document.getElementById('deals-row');

  var cachedDeals = await store.get(cacheKey);
  if (cachedDeals) { renderDeals(cachedDeals); return; }

  if (el) el.innerHTML = '<span style="color:var(--muted2);font-size:0.7rem;">Fetching today\'s deals...</span>';

  var prompt = 'Generate 5 realistic grocery store deals for today. One deal per store for these stores: Sam\'s Club, Costco, ALDI, Price Rite, Price Chopper. Make prices realistic for 2025. Return ONLY a valid JSON array with no markdown of exactly 5 objects. Schema: [{"store":"string","item":"string","price":"string","url":"string"}]';
  var result = await callAI(prompt, 600);
  var deals = null;

  if (result && result.text) {
    try {
      var clean = result.text.replace(/```json|```/g,'').trim();
      deals = JSON.parse(clean);
      if (Array.isArray(deals) && deals.length >= 5) {
        await store.set(cacheKey, deals); // save to Supabase so all devices share it
      }
    } catch(e) {}
  }

  if (!deals || !Array.isArray(deals)) {
    var errMsg = result ? result.error : 'Gemini quota exceeded. Resets in 24 hours.';
    var el2 = document.getElementById('deals-row');
    if (el2) el2.innerHTML = '<div style="color:var(--red);font-size:0.72rem;padding:10px;">⚠️ ' + errMsg + '</div>';
    return;
  }
  renderDeals(deals);
}

function renderDeals(deals) {
  var el = document.getElementById('deals-row');
  if (!el) return;
  el.innerHTML = deals.slice(0,5).map(function(d) {
    return '<a href="' + d.url + '" target="_blank" style="flex-shrink:0;width:130px;background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:10px;cursor:pointer;text-decoration:none;display:block;transition:border-color 0.2s;" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'">' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:0.56rem;color:var(--accent);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">' + d.store + '</div>' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:0.68rem;color:var(--text);line-height:1.3;margin-bottom:4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + d.item + '</div>' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:0.75rem;color:var(--green);font-weight:500;">' + d.price + '</div>' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:0.54rem;color:var(--muted2);margin-top:3px;">View Deal →</div></a>';
  }).join('');
}

// ─── OUTFITS ──────────────────────────────────────────────────────────────────
async function loadOutfits(refresh) {
  var cacheKey = 'ai_outfits_' + new Date().toDateString();
  if (refresh) localStorage.removeItem(cacheKey);
  var cached = localStorage.getItem(cacheKey);
  var el = document.getElementById('outfits-container');

  var cachedOutfits = await store.get(cacheKey);
  if (cachedOutfits) { renderOutfits(cachedOutfits); return; }
  if (el) el.innerHTML = '<span style="color:var(--muted2);font-size:0.7rem;padding:10px;">Generating 10 fresh looks from Zara & H&M...</span>';

  var prompt = 'Generate 10 fresh outfit ideas for women inspired by current Zara and H&M styles. Return ONLY a valid JSON array with no markdown of exactly 10 objects. Schema: [{"title":"string", "desc":"string"}]';
  var result = await callAI(prompt, 1500);
  var looks = [];

  if (result && result.text) {
    try {
      var clean = result.text.replace(/```json|```/g,'').trim();
      looks = JSON.parse(clean);
      if (Array.isArray(looks) && looks.length > 0) {
        await store.set(cacheKey, looks); // save to Supabase so all devices share it
      }
    } catch(e) {}
  }

  if (!looks || looks.length === 0) {
    looks = [{
      title: 'Gemini Error',
      desc: result ? result.error : 'Quota may be exceeded. Refreshes tomorrow.'
    }];
  }
  renderOutfits(looks);
}

function renderOutfits(looks) {
  var el = document.getElementById('outfits-container');
  if (!el) return;
  var images = [
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80',
    'https://images.unsplash.com/photo-1434389678369-182fc221ac11?w=400&q=80',
    'https://images.unsplash.com/photo-1485230895905-eb56f66378ea?w=400&q=80',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80',
    'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400&q=80',
    'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=400&q=80',
    'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=400&q=80',
    'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=400&q=80',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&q=80'
  ];

  el.innerHTML = looks.map(function(look, i) {
    var img = images[i % images.length];
    return '<div style="flex-shrink:0;width:140px;background:var(--card2);border-radius:10px;overflow:hidden;border:1px solid var(--border);">' +
      '<img src="' + img + '" style="width:100%;height:160px;object-fit:cover;">' +
      '<div style="padding:10px;">' +
        '<div style="font-family:\'Syne\',sans-serif;font-size:0.65rem;font-weight:700;color:var(--text);margin-bottom:4px;line-height:1.2;">' + (look.title||'Look') + '</div>' +
        '<div style="font-family:\'Montserrat\',sans-serif;font-size:0.58rem;color:var(--muted2);line-height:1.4;">' + (look.desc||'') + '</div>' +
      '</div></div>';
  }).join('');
}

// ─── RECIPES ──────────────────────────────────────────────────────────────────
var _hayaRecipes = [];
var _hayaRecipeIdx = 0;

async function loadRecipe() {
  var today = new Date().toDateString();
  var cacheKey = 'ai_recipes_array_' + today;
  var cached = localStorage.getItem(cacheKey);

  var counterEl = document.getElementById('recipe-counter');
  if (counterEl) counterEl.textContent = 'Generating 5 recipes...';

  var cachedRecipes = await store.get(cacheKey);
  if (cachedRecipes) {
    _hayaRecipes = cachedRecipes;
    renderRecipe(_hayaRecipes[_hayaRecipeIdx]);
    return;
  }

  var prompt = 'Generate 5 different authentic Jordanian/Levantine recipes inspired by the cooking style of Ola Tashman. Return ONLY a valid JSON array with no markdown of exactly 5 objects. Schema MUST be exactly this: [{"title":"string","description":"string","time":45,"servings":4,"ingredients":["string"],"steps":["string"],"tip":"string"}]';
  var result = await callAI(prompt, 3000);

  if (result && result.text) {
    try {
      var clean = result.text.replace(/```json|```/g,'').trim();
      _hayaRecipes = JSON.parse(clean);
      if (Array.isArray(_hayaRecipes) && _hayaRecipes.length > 0) {
        await store.set(cacheKey, _hayaRecipes); // save to Supabase so all devices share it
      }
    } catch(e) {}
  }

  if (!_hayaRecipes || _hayaRecipes.length === 0) {
    _hayaRecipes = [{
      title: 'Gemini Error',
      description: result ? result.error : 'Could not load recipes. Try refreshing tomorrow when quota resets.',
      time: 0, servings: 0,
      ingredients: ['Gemini quota may be exceeded — check aistudio.google.com'],
      steps: ['Quota resets every 24 hours', 'Refresh the page tomorrow', 'Or upgrade Gemini to paid at aistudio.google.com'],
      tip: 'Free tier allows 20 requests per day.'
    }];
  }

  renderRecipe(_hayaRecipes[_hayaRecipeIdx]);
}

function changeRecipe(dir) {
  if (!_hayaRecipes || !_hayaRecipes.length) return;
  _hayaRecipeIdx += dir;
  if (_hayaRecipeIdx < 0) _hayaRecipeIdx = _hayaRecipes.length - 1;
  if (_hayaRecipeIdx >= _hayaRecipes.length) _hayaRecipeIdx = 0;
  renderRecipe(_hayaRecipes[_hayaRecipeIdx]);
}

function renderRecipe(recipe) {
  if (!recipe) return;

  var FOOD_IMAGES = [
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
    'https://images.unsplash.com/photo-1598103442097-8b74394b95c9?w=600&q=80',
    'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=600&q=80',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80'
  ];

  var imgEl = document.getElementById('recipe-img');
  if (imgEl) imgEl.src = FOOD_IMAGES[_hayaRecipeIdx % FOOD_IMAGES.length];

  var titleEl = document.getElementById('recipe-title');
  if (titleEl) {
    titleEl.textContent = recipe.title || '';
    titleEl.style.color = recipe.title === 'API Not Connected' ? 'var(--red)' : '#fff';
  }

  var descEl = document.getElementById('recipe-desc');
  if (descEl) descEl.textContent = recipe.description || '';

  var metaEl = document.getElementById('recipe-meta');
  if (metaEl) metaEl.innerHTML = '<span>⏱ ' + (recipe.time||'--') + ' min</span> <span>👥 ' + (recipe.servings||'--') + ' servings</span>';

  var counterEl = document.getElementById('recipe-counter');
  if (counterEl) counterEl.textContent = 'Recipe ' + (_hayaRecipeIdx + 1) + ' of ' + _hayaRecipes.length;

  var ingEl = document.getElementById('recipe-ingredients');
  if (ingEl && recipe.ingredients) {
    ingEl.innerHTML = (recipe.ingredients||[]).map(function(i) {
      return '<div style="padding:4px 0;border-bottom:1px solid var(--border);font-family:\'Montserrat\',sans-serif;font-size:0.72rem;">• ' + i + '</div>';
    }).join('');
  }

  var stepsEl = document.getElementById('recipe-steps');
  if (stepsEl && recipe.steps) {
    stepsEl.innerHTML = (recipe.steps||[]).map(function(s, i) {
      return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);"><span style="font-family:\'DM Mono\',monospace;font-size:0.65rem;color:var(--purple);font-weight:600;flex-shrink:0;">' + (i+1) + '.</span><span style="font-family:\'Montserrat\',sans-serif;font-size:0.72rem;line-height:1.45;">' + s + '</span></div>';
    }).join('');
  }

  var tipEl = document.getElementById('recipe-tip');
  if (tipEl && recipe.tip) {
    tipEl.innerHTML = '💡 <em>' + recipe.tip + '</em>';
    tipEl.style.display = 'block';
  }

  window._recipeIngredients = recipe.ingredients || [];
}

async function addRecipeIngredients() {
  var items = window._recipeIngredients || [];
  if (!items.length) { showToast('No ingredients to add'); return; }
  var list = await store.get('grocery_list') || [];
  var added = 0;
  items.forEach(function(item) {
    if (!list.find(function(i) { return i.text === item; })) {
      list.push({ id: Date.now() + added, text: item, done: false });
      added++;
    }
  });
  await store.set('grocery_list', list);
  renderList('grocery_list', 'groc-list');
  showToast(added + ' ingredients added to grocery list ✓');
}

// ─── PRAYERS ──────────────────────────────────────────────────────────────────
window.prayerTimings = null;
async function loadPrayers() {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=Newington&country=US&method=2`);
    const data = await res.json();
    if(data.data && data.data.timings) {
      window.prayerTimings = data.data.timings;
      const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      const grid = document.getElementById('prayer-grid');
      if(grid) {
        grid.innerHTML = prayers.map(name => {
          let [h,m] = data.data.timings[name].split(':'); let hh = parseInt(h); const ampm = hh >= 12 ? 'PM' : 'AM'; hh = hh % 12 || 12;
          return `<div class="prayer-item" data-name="${name}" style="display:flex; justify-content:space-between; font-family:'DM Mono',monospace; font-size:0.75rem; padding:6px; background:var(--card2); border-radius:6px;"><span style="color:var(--muted2);">${name}</span><span>${hh}:${m} ${ampm}</span></div>`;
        }).join('');
      }
    }
  } catch(e) {}
}

function updateCountdown() {
  if(!window.prayerTimings) return;
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const now = new Date(); let next = null; let minDiff = Infinity;
  prayers.forEach(name => {
    const [h,m] = window.prayerTimings[name].split(':'); let pTime = new Date(); pTime.setHours(h, m, 0, 0);
    if(pTime < now) pTime.setDate(pTime.getDate()+1); const diff = pTime - now;
    if(diff < minDiff) { minDiff = diff; next = name; }
  });
  if(next) {
    const hrs = Math.floor(minDiff/3600000); const mins = Math.floor((minDiff%3600000)/60000); const secs = Math.floor((minDiff%60000)/1000);
    const cd = document.getElementById('prayer-countdown');
    if(cd) cd.innerHTML = `<div style="font-family:'Syne',sans-serif; font-size:0.7rem; text-transform:uppercase; color:var(--text); margin-bottom:4px;">Next: <span style="color:var(--gold);">${next}</span></div><div style="font-family:'DM Mono',monospace; font-size:1.1rem; color:var(--text);">${hrs}h ${mins}m ${secs}s</div>`;
    document.querySelectorAll('.prayer-item').forEach(el => {
      if(el.dataset.name === next) el.style.borderLeft = '2px solid var(--gold)'; else el.style.borderLeft = 'none';
    });
  }
}

// ─── WEATHER ──────────────────────────────────────────────────────────────────
async function loadWeather() {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${CONFIG.WEATHER_CITY}&appid=${CONFIG.WEATHER_KEY}&units=imperial`);
    const data = await res.json();
    if(data.list) {
      const current = data.list[0];
      const html = `<div style="display:flex; justify-content:space-between; align-items:center;"><div style="font-family:'Instrument Serif',serif; font-size:2.8rem; line-height:1;">${Math.round(current.main.temp)}°</div><img src="https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png" style="width:50px;"></div><div style="font-family:'Montserrat',sans-serif; font-size:0.8rem; margin-bottom:12px;">${current.weather[0].description} | H:${Math.round(current.main.temp_max)}° L:${Math.round(current.main.temp_min)}°</div><div style="display:flex; justify-content:space-between; font-family:'DM Mono',monospace; font-size:0.6rem; color:var(--muted2); border-top:1px solid var(--border); padding-top:8px;"><span>Feels: ${Math.round(current.main.feels_like)}°</span><span>Hum: ${current.main.humidity}%</span><span>Wind: ${Math.round(current.wind.speed)}mph</span></div>`;
      const hourly = data.list.slice(1,7).map(h => `<div style="display:flex; flex-direction:column; align-items:center;"><span style="font-size:0.6rem;">${new Date(h.dt*1000).getHours()}:00</span><img src="https://openweathermap.org/img/wn/${h.weather[0].icon}.png" style="width:24px;"><span style="font-size:0.7rem; font-weight:600;">${Math.round(h.main.temp)}°</span></div>`).join('');
      document.querySelectorAll('.weather-basic').forEach(el => el.innerHTML = html);
      const strip = document.getElementById('weather-hourly');
      if(strip) strip.innerHTML = `<div style="display:flex; justify-content:space-between; margin-top:12px; border-top:1px solid var(--border); padding-top:12px; font-family:'DM Mono',monospace;">${hourly}</div>`;
    }
  } catch(e) {}
}

// ─── LISTS & GOALS ────────────────────────────────────────────────────────────
async function addListItem(key, inputId) {
  const input = document.getElementById(inputId); const text = input.value.trim(); if(!text) return;
  const list = await store.get(key) || []; list.push({ id: Date.now(), text, done: false });
  await store.set(key, list); input.value = '';
  if(key === 'grocery_list') renderList(key, 'groc-list'); else if(key === 'todo_mahmoud') renderTaskList('todo_mahmoud', 'm-todo-list'); else if(key === 'todo_haya') renderTaskList('todo_haya', 'h-todo-list');
}

async function renderList(key, containerId) {
  const list = await store.get(key) || []; const el = document.getElementById(containerId); if(!el) return;
  el.innerHTML = list.map(item => `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);"><div style="display:flex; align-items:center; gap:8px;"><input type="checkbox" ${item.done?'checked':''} onchange="toggleItem('${key}', ${item.id})" style="accent-color:var(--accent);"><span style="font-size:0.75rem; ${item.done?'text-decoration:line-through;color:var(--muted2);':''}">${item.text}</span></div><button onclick="deleteItem('${key}', ${item.id})" style="background:transparent; border:none; cursor:pointer; color:var(--red); padding:0; font-size:0.8rem;">×</button></div>`).join('');
}

async function renderTaskList(key, containerId) {
  const list = await store.get(key) || []; const el = document.getElementById(containerId); if(!el) return;
  el.innerHTML = list.map(item => `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);"><div style="display:flex; align-items:center; gap:8px;"><input type="checkbox" onchange="deleteItem('${key}', ${item.id})" style="accent-color:var(--accent);"><span style="font-size:0.75rem;">${item.text}</span></div><button onclick="deleteItem('${key}', ${item.id})" style="background:transparent; border:none; cursor:pointer; color:var(--red); padding:0; font-size:0.8rem;">×</button></div>`).join('');
}

function renderHayaTodo() { renderTaskList('todo_haya', 'h-todo-list'); }

async function toggleItem(key, id) {
  const list = await store.get(key) || []; const item = list.find(i => i.id === id);
  if(item) { item.done = !item.done; await store.set(key, list); renderList(key, key==='grocery_list'?'groc-list':null); }
}

async function deleteItem(key, id) {
  let list = await store.get(key) || []; list = list.filter(i => i.id !== id); await store.set(key, list);
  if(key === 'grocery_list') renderList(key, 'groc-list'); else if(key === 'todo_mahmoud') renderTaskList('todo_mahmoud', 'm-todo-list'); else if(key === 'todo_haya') renderTaskList('todo_haya', 'h-todo-list');
}

async function addGoal(key, inputId) {
  const input = document.getElementById(inputId); const text = input.value.trim(); if(!text) return;
  const list = await store.get(key) || []; list.push({ id: Date.now(), text, done: false }); await store.set(key, list); input.value = ''; renderGoalPanelList(key);
}

async function renderGoalPanel(panelId, key) {
  const el = document.getElementById(panelId); if(!el) return; el.dataset.key = key; renderGoalPanelList(key);
}

async function renderGoalPanelList(key) {
  const panels = document.querySelectorAll(`[data-key="${key}"]`); if(!panels.length) return;
  // Read from localStorage first (already updated by realtime listener) then fallback to store
  const raw = localStorage.getItem('f2_' + key);
  const list = raw ? JSON.parse(raw) : (await store.get(key) || []);
  const html = list.map(item => `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);"><div style="display:flex; align-items:center; gap:8px;"><input type="checkbox" ${item.done?'checked':''} onchange="toggleGoal('${key}', ${item.id})" style="accent-color:var(--accent);"><span style="font-size:0.75rem; ${item.done?'text-decoration:line-through;color:var(--muted2);':''}">${item.text}</span></div><button onclick="deleteGoal('${key}', ${item.id})" style="background:transparent; border:none; cursor:pointer; color:var(--red); padding:0; font-size:0.8rem;">×</button></div>`).join('');
  panels.forEach(p => p.querySelector('.goal-list').innerHTML = html);
}

async function toggleGoal(key, id) {
  const list = await store.get(key) || []; const item = list.find(i => i.id === id);
  if(item) { item.done = !item.done; await store.set(key, list); renderGoalPanelList(key); }
}

async function deleteGoal(key, id) {
  let list = await store.get(key) || []; list = list.filter(i => i.id !== id); await store.set(key, list); renderGoalPanelList(key);
}

// ─── MEDIA & BUDGET ───────────────────────────────────────────────────────────
let mediaInterval;
function handleMediaLoad(event) {
  const files = event.target.files; if (!files.length) return;
  const urls = Array.from(files).map(f => URL.createObjectURL(f));
  const container = document.getElementById('media-container');
  if (urls.length > 0) {
    let idx = 0; container.innerHTML = `<img src="${urls[idx]}" style="width:100%;height:100%;object-fit:contain;display:block;">`;
    if (urls.length > 1) { clearInterval(mediaInterval); mediaInterval = setInterval(() => { idx = (idx + 1) % urls.length; container.innerHTML = `<img src="${urls[idx]}" style="width:100%;height:100%;object-fit:contain;display:block;">`; }, CONFIG.SLIDESHOW_SPEED); }
  }
}

async function addBudgetCat() {
  const name = document.getElementById('b-name').value; const amount = parseFloat(document.getElementById('b-amount').value);
  if (!name || isNaN(amount)) return;
  const b = await store.get('budget_items') || [ {name:'Mortgage', amount:2500}, {name:'Food', amount:800}, {name:'Utilities', amount:300}, {name:'Transport', amount:400}, {name:'Kids', amount:200}, {name:'Other', amount:150} ];
  b.push({name, amount}); await store.set('budget_items', b);
  document.getElementById('b-name').value = ''; document.getElementById('b-amount').value = ''; renderBudget();
}

async function renderBudget() {
  let b = await store.get('budget_items');
  if (!b || !b.length) { b = [ {name:'Mortgage', amount:2500}, {name:'Food', amount:800}, {name:'Utilities', amount:300}, {name:'Transport', amount:400}, {name:'Kids', amount:200}, {name:'Other', amount:150} ]; await store.set('budget_items', b); }
  const total = b.reduce((s, i) => s + i.amount, 0); const el = document.getElementById('budget-list'); if (!el) return;
  document.getElementById('budget-total').textContent = '$' + total.toLocaleString();
  el.innerHTML = b.map(item => { const pct = total > 0 ? (item.amount / total * 100).toFixed(1) : 0; return `<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;font-size:0.7rem;margin-bottom:4px;"><span>${item.name}</span><span style="font-family:'DM Mono',monospace;color:var(--muted2);">$${item.amount.toLocaleString()}</span></div><div style="width:100%;height:4px;background:var(--card2);border-radius:2px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:var(--accent);"></div></div></div>`; }).join('');
}

function importCSV(event) { showToast("CSV data loaded ✓"); }

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function initApp() {
  updateClock();
  setInterval(updateClock, 1000);

  restoreAdhan();
  loadPrayers();
  setInterval(function() {
    updateCountdown();
    checkAndPlayAdhan();
  }, 1000);

  loadWeather();

  renderTicker();
  fetchStocks();
  setInterval(fetchStocks, 60000);

  // STAGGERED LOADER: one AI request every 3s, only if not cached today
  // Max 6 Gemini calls per day total — safely under the 20 free tier limit
  setTimeout(function() { loadIslamicWisdom('wisdom-mahmoud'); }, 0);
  setTimeout(function() { loadIslamicWisdom('wisdom-haya');    }, 3000);
  setTimeout(function() { loadNewsBrief();                     }, 6000);
  setTimeout(function() { loadDeals();                         }, 9000);
  setTimeout(function() { loadOutfits(false);                  }, 12000);
  setTimeout(function() { loadRecipe();                        }, 15000);
  // NO hourly refresh — cache lasts all day, Gemini only called once per feature per day

  renderList('grocery_list', 'groc-list');
  renderGoalPanel('hgoals-0', 'home_goals_0');
  renderGoalPanel('hgoals-1', 'home_goals_1');
  renderGoalPanel('hgoals-2', 'home_goals_2');
  renderGoalPanel('mgoals-0', 'mahmoud_goals_0');
  renderGoalPanel('mgoals-1', 'mahmoud_goals_1');
  renderGoalPanel('mgoals-2', 'mahmoud_goals_2');
  renderGoalPanel('hgoals2-0', 'haya_goals_0');
  renderGoalPanel('hgoals2-1', 'haya_goals_1');
  renderGoalPanel('hgoals2-2', 'haya_goals_2');
  renderTaskList('todo_mahmoud', 'm-todo-list');
  renderHayaTodo();
  renderBudget();

  // Start realtime cross-device sync (only works when Supabase URL is configured)
  initRealtimeSync();
}
