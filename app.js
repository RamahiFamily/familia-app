const CONFIG = {
  SUPABASE_URL:      'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5aGJleGJmbWJ0dWhpZGR0dmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjY0OTgsImV4cCI6MjA5MzY0MjQ5OH0.Rv2FtqZWGtHzHieCS0SmQjnGTEdSXsqrYTYfJrwddMQ',
  PASSWORD:          'familia2024',
  WEATHER_KEY:       '7a6a9fd1087d7335ccb8d3312177225c',
  WEATHER_CITY:      'Newington,CT,US',
  PHONE:             '1860798577',
  SLIDESHOW_SPEED:   5000,
  NEWS_KEY:          'ca38c78594f84d46ad1e36c63276d9b8',
  GEMINI_KEY:        'AIzaSyDYsZiybG8lY-SIwkJ4Ye7KjgLCwjLWgsk',
  PEXELS_KEY:        'PrZrvPl6N4jISjj2ehsAmYPwhaHq2Kc3JEdPgaeusXMfmWl0oWxktdue',
};

const sb = (CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL') ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;

const store = {
  async get(key) {
    if (sb && CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
      try {
        var result = await sb.from('familia_data').select('value').eq('key',key).single();
        return result.data ? JSON.parse(result.data.value) : null;
      } catch(e) { return null; }
    }
    var v = localStorage.getItem('f2_' + key);
    return v ? JSON.parse(v) : null;
  },
  async set(key, value) {
    if (sb && CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
      try {
        await sb.from('familia_data').upsert({
          key: key,
          value: JSON.stringify(value),
          updated_at: new Date().toISOString()
        });
        return;
      } catch(e) {}
    }
    localStorage.setItem('f2_' + key, JSON.stringify(value));
  }
};

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
  document.querySelectorAll('.profile-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  document.querySelectorAll('.dashboard').forEach(function(d) {
    d.classList.remove('active');
  });
  btn.classList.add('active');
  document.getElementById('dash-' + profile).classList.add('active');
}

function switchTab(btn, prefix) {
  var tabRow = btn.closest('.tabs');
  var card = btn.closest('.card');
  var tabs = tabRow.querySelectorAll('.tab');
  var idx = Array.from(tabs).indexOf(btn);
  tabs.forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  card.querySelectorAll('.tab-panel').forEach(function(p, i) {
    p.classList.toggle('active', i === idx);
  });
}

function openSettings() {
  document.getElementById('settings-panel').style.right = '0';
  document.getElementById('settings-overlay').style.display = 'block';
}
function closeSettings() {
  document.getElementById('settings-panel').style.right = '-380px';
  document.getElementById('settings-overlay').style.display = 'none';
}
function checkLogin() {
  const pwd = document.getElementById('login-pwd').value;
  if(pwd === CONFIG.PASSWORD) {
    sessionStorage.setItem('f_auth', '1');
    document.getElementById('login-screen').style.display = 'none';
    initApp();
  } else {
    document.getElementById('login-err').textContent = 'Incorrect password.';
  }
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

// ADHAN SYSTEM EXACT CODE
let _audioCtx = null;
let _adhanPlayedToday = {};

function unlockAudio() {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === 'suspended') {
      _audioCtx.resume();
    }
  } catch(e) {}
}

['touchstart','touchend','mousedown','click','keydown'].forEach(function(evt) {
  document.addEventListener(evt, unlockAudio, { passive: true, capture: true });
});

function handleAdhanUpload(event) {
  var file = event.target.files && event.target.files[0];
  var nameEl = document.getElementById('sp-adhan-name');
  var msgEl = document.getElementById('adhan-test-msg');

  if (!file) {
    if (nameEl) nameEl.textContent = 'No file selected';
    return;
  }

  if (nameEl) nameEl.textContent = 'Reading...';

  var reader = new FileReader();

  reader.onload = function(e) {
    var dataUrl = e.target.result;
    var player = document.getElementById('adhan-player');

    try {
      localStorage.setItem('f_adhan', dataUrl);
      localStorage.setItem('f_adhan_name', file.name);
    } catch(err) {
      window._adhanFallback = dataUrl;
    }

    player.src = dataUrl;
    player.load();

    if (nameEl) nameEl.textContent = '✓ ' + file.name;
    if (msgEl) msgEl.textContent = 'File loaded — tap Play to test';

    unlockAudio();
    var p = player.play();
    if (p && p.then) {
      p.then(function() {
        setTimeout(function() {
          player.pause();
          player.currentTime = 0;
          if (msgEl) msgEl.textContent = '✓ Ready — will play at prayer time';
        }, 150);
      }).catch(function() {
        if (msgEl) msgEl.textContent = '✓ Loaded — tap page then test';
      });
    }
    showToast('Adhan loaded: ' + file.name);
  };

  reader.onerror = function() {
    if (nameEl) nameEl.textContent = 'Error reading file';
    showToast('Could not read file');
  };

  reader.readAsDataURL(file);
}

function getAdhanSrc() {
  return localStorage.getItem('f_adhan') || window._adhanFallback || null;
}

function restoreAdhan() {
  var src = getAdhanSrc();
  var name = localStorage.getItem('f_adhan_name');
  if (src) {
    var player = document.getElementById('adhan-player');
    player.src = src;
    player.load();
    var nameEl = document.getElementById('sp-adhan-name');
    if (nameEl && name) nameEl.textContent = '✓ ' + name;
  }
}

function testAdhan() {
  var msgEl = document.getElementById('adhan-test-msg');
  var src = getAdhanSrc();
  if (!src) {
    if (msgEl) msgEl.textContent = 'Upload an MP3 file first';
    showToast('Upload an MP3 first');
    return;
  }
  var player = document.getElementById('adhan-player');
  if (!player.src || player.src === window.location.href) {
    player.src = src;
    player.load();
  }
  unlockAudio();
  player.currentTime = 0;
  var p = player.play();
  if (p && p.then) {
    p.then(function() {
      if (msgEl) msgEl.textContent = '▶ Playing...';
    }).catch(function(err) {
      if (msgEl) msgEl.textContent = 'Tap anywhere on page first, then test again';
    });
  }
}

function checkAndPlayAdhan() {
  if (!window.prayerTimings) return;
  var prayers = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
  var now = new Date();
  var todayStr = now.toDateString();

  prayers.forEach(function(name) {
    var raw = window.prayerTimings[name];
    if (!raw) return;
    var parts = raw.split(':');
    var h = parseInt(parts[0]);
    var m = parseInt(parts[1]);
    var pTime = new Date();
    pTime.setHours(h, m, 0, 0);
    var diffSec = (pTime - now) / 1000;
    var flagKey = name + '_' + todayStr;

    if (diffSec >= -5 && diffSec <= 30 && !_adhanPlayedToday[flagKey]) {
      _adhanPlayedToday[flagKey] = true;
      var src = getAdhanSrc();
      if (!src) {
        showToast('🕌 ' + name + ' — Upload adhan in Settings');
        return;
      }
      var player = document.getElementById('adhan-player');
      if (!player.src || player.src === window.location.href) {
        player.src = src;
        player.load();
      }
      unlockAudio();
      var doPlay = function() {
        player.currentTime = 0;
        var p = player.play();
        if (p && p.then) {
          p.then(function() {
            showToast('🕌 ' + name + ' — وقت الصلاة');
          }).catch(function() {
            setTimeout(doPlay, 800);
          });
        }
      };
      if (_audioCtx && _audioCtx.state === 'suspended') {
        _audioCtx.resume().then(doPlay).catch(doPlay);
      } else {
        doPlay();
      }
    }
  });
}

function loadCNBC() {
  var container = document.getElementById('cnbc-container');
  if (!container) return;
  container.innerHTML =
    '<iframe ' +
    'src="https://www.youtube.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg' +
    '&autoplay=1&mute=1" ' +
    'style="width:100%;height:100%;border:none;" ' +
    'allow="accelerometer; autoplay; clipboard-write; encrypted-media; ' +
    'gyroscope; picture-in-picture; web-share" ' +
    'allowfullscreen></iframe>';
}

var STOCK_FALLBACK = [
  {sym:'AMD',   price:'178.42', chg:'+2.14', up:true},
  {sym:'NVDA',  price:'924.61', chg:'+1.87', up:true},
  {sym:'SPY',   price:'527.33', chg:'+0.42', up:true},
  {sym:'QQQ',   price:'456.12', chg:'+0.61', up:true},
  {sym:'BTC',   price:'68,240', chg:'-0.83', up:false},
  {sym:'ETH',   price:'3,512',  chg:'+1.22', up:true},
  {sym:'^DJI',  price:'39,411', chg:'+0.18', up:true},
  {sym:'TSLA',  price:'176.90', chg:'-1.43', up:false},
  {sym:'AAPL',  price:'220.45', chg:'+0.74', up:true},
  {sym:'META',  price:'512.77', chg:'+2.01', up:true},
  {sym:'MSFT',  price:'415.32', chg:'+0.55', up:true},
  {sym:'AMZN',  price:'189.45', chg:'+1.18', up:true},
];

var tickerData = STOCK_FALLBACK.slice();

function renderTicker() {
  var el = document.getElementById('ticker-inner');
  if (!el) return;
  var html = tickerData.map(function(t) {
    return '<div class="ticker-item">' +
      '<span style="font-family:\'DM Mono\',monospace;font-weight:700;color:var(--text);">' +
        t.sym + '</span> ' +
      '<span style="font-family:\'DM Mono\',monospace;color:var(--muted2);">$' +
        t.price + '</span> ' +
      '<span style="font-family:\'DM Mono\',monospace;color:' +
        (t.up ? 'var(--green)' : 'var(--red)') + ';">' +
        (t.up ? '▲' : '▼') + ' ' + Math.abs(t.chg) + '%</span>' +
      '<span style="color:var(--border2);margin:0 12px;">|</span>' +
      '</div>';
  }).join('');
  el.innerHTML = html + html;
}

async function fetchStocks() {
  var symbols = ['AMD','NVDA','SPY','QQQ','BTC-USD','ETH-USD','^DJI','TSLA','AAPL','META','MSFT','AMZN'];
  var updated = [];
  for (var i = 0; i < symbols.length; i++) {
    try {
      var sym = symbols[i];
      var url = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
        encodeURIComponent(sym) + '?interval=1d&range=1d';
      var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
      var r = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
      var d = await r.json();
      var meta = d.chart && d.chart.result && d.chart.result[0] && d.chart.result[0].meta;
      if (meta && meta.regularMarketPrice) {
        var price = meta.regularMarketPrice;
        var prev = meta.chartPreviousClose || meta.previousClose || price;
        var chgPct = ((price - prev) / prev * 100).toFixed(2);
        updated.push({
          sym: sym.replace('-USD','').replace('^',''),
          price: price > 999 ? Math.round(price).toLocaleString() : price.toFixed(2),
          chg: chgPct,
          up: parseFloat(chgPct) >= 0
        });
      }
    } catch(e) { }
  }
  if (updated.length >= 6) {
    tickerData = updated;
    renderTicker();
  }
}

async function callGemini(prompt, maxTokens) {
  maxTokens = maxTokens || 300;
  try {
    var r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' +
      CONFIG.GEMINI_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
        })
      }
    );
    var d = await r.json();
    if (d.candidates && d.candidates[0] && d.candidates[0].content) {
      return d.candidates[0].content.parts[0].text.trim();
    }
    return null;
  } catch(e) {
    console.warn('Gemini API error:', e);
    return null;
  }
}

async function loadIslamicWisdom(elementId) {
  var cacheKey = 'gemini_wisdom_' + new Date().toDateString();
  var cached = localStorage.getItem(cacheKey);

  if (cached) {
    try { renderWisdom(elementId, JSON.parse(cached)); return; } catch(e) {}
  }

  var prompt = 'Give me one authentic Islamic quote or wisdom. ' +
    'It must be from EITHER Imam Al-Shafi\'i (الإمام الشافعي) OR Ali ibn Abi Talib (علي بن أبي طالب). ' +
    'Choose a different quote each time. ' +
    'Return ONLY valid JSON in this exact format with no other text: ' +
    '{"arabic":"Arabic text here","english":"English translation here","source":"Imam Al-Shafi\'i or Ali ibn Abi Talib"}';

  var result = await callGemini(prompt, 200);
  var wisdom = null;

  if (result) {
    try {
      var clean = result.replace(/```json|```/g, '').trim();
      wisdom = JSON.parse(clean);
      localStorage.setItem(cacheKey, JSON.stringify(wisdom));
    } catch(e) {}
  }

  if (!wisdom) {
    wisdom = {
      arabic: 'قيمة كل امرئ ما يحسنه',
      english: 'The value of every person is in what they excel at.',
      source: 'Ali ibn Abi Talib'
    };
  }
  renderWisdom(elementId, wisdom);
}

function renderWisdom(elementId, wisdom) {
  var el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML =
    '<div style="font-family:\'Instrument Serif\',serif;font-size:1rem;' +
    'direction:rtl;line-height:1.8;margin-bottom:8px;">' + wisdom.arabic + '</div>' +
    '<div style="font-family:\'Montserrat\',sans-serif;font-size:0.72rem;' +
    'font-style:italic;color:var(--muted2);line-height:1.5;margin-bottom:6px;">' +
    '"' + wisdom.english + '"</div>' +
    '<div style="font-family:\'DM Mono\',monospace;font-size:0.6rem;color:var(--gold);">' +
    '— ' + wisdom.source + '</div>';
}

async function loadNewsBrief() {
  var now = new Date();
  var hourKey = 'gemini_news_' + now.toDateString() + '_' + now.getHours();
  var cached = localStorage.getItem(hourKey);

  var briefEl = document.getElementById('news-brief');
  var headlinesEl = document.getElementById('news-headlines');

  var headlines = [];
  try {
    var proxy = 'https://corsproxy.io/?';
    var newsUrl = 'https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=6&apiKey=' + CONFIG.NEWS_KEY;
    var r = await fetch(proxy + encodeURIComponent(newsUrl));
    var d = await r.json();
    if (d.articles) {
      headlines = d.articles.map(function(a) { return a.title; });
    }
  } catch(e) {}

  try {
    var proxy2 = 'https://corsproxy.io/?';
    var sportsUrl = 'https://newsapi.org/v2/top-headlines?category=sports&language=en&pageSize=4&apiKey=' + CONFIG.NEWS_KEY;
    var r2 = await fetch(proxy2 + encodeURIComponent(sportsUrl));
    var d2 = await r2.json();
    if (d2.articles) {
      d2.articles.forEach(function(a) { headlines.push(a.title); });
    }
  } catch(e) {}

  if (headlinesEl && headlines.length > 0) {
    headlinesEl.innerHTML = headlines.slice(0,6).map(function(h) {
      return '<div style="padding:8px 0;border-bottom:1px solid var(--border);' +
        'font-size:0.78rem;line-height:1.4;">' + h + '</div>';
    }).join('');
  }

  if (cached) {
    if (briefEl) briefEl.textContent = cached;
    return;
  }

  if (headlines.length > 0) {
    var prompt = 'Here are today\'s top news headlines:\n' +
      headlines.slice(0,8).join('\n') + '\n\n' +
      'Write a 2-3 sentence market and world summary in plain English. ' +
      'Be concise, informative, and direct. No bullet points. Just a short paragraph.';

    var brief = await callGemini(prompt, 150);
    if (brief) {
      localStorage.setItem(hourKey, brief);
      if (briefEl) briefEl.textContent = brief;
    }
  } else {
    if (briefEl) briefEl.textContent = 'Markets active today. Check back for latest updates.';
  }
}

async function loadDeals() {
  var cacheKey = 'gemini_deals_' + new Date().toDateString();
  var cached = localStorage.getItem(cacheKey);

  if (cached) {
    try { renderDeals(JSON.parse(cached)); return; } catch(e) {}
  }

  var prompt = 'Generate 5 realistic grocery store deals for today. ' +
    'One deal per store for these stores: Sam\'s Club, Costco, ALDI, Price Rite, Price Chopper. ' +
    'These are stores near Newington CT. Make prices realistic for 2024. ' +
    'Return ONLY valid JSON array, no other text: ' +
    '[{"store":"Sam\'s Club","item":"Member\'s Mark Chicken 10lb","price":"$14.98",' +
    '"url":"https://www.samsclub.com/savings"}]';

  var result = await callGemini(prompt, 300);
  var deals = null;

  if (result) {
    try {
      var clean = result.replace(/```json|```/g,'').trim();
      deals = JSON.parse(clean);
      if (Array.isArray(deals) && deals.length >= 5) {
        localStorage.setItem(cacheKey, JSON.stringify(deals));
      }
    } catch(e) {}
  }

  if (!deals || !Array.isArray(deals)) {
    deals = [
      {store:"Sam's Club", item:"Member's Mark Chicken 10lb", price:"$14.98", url:"https://www.samsclub.com/savings"},
      {store:"Costco",     item:"Kirkland Olive Oil 2L",      price:"$12.49", url:"https://www.costco.com/todays-deals.html"},
      {store:"ALDI",       item:"Whole Milk 1 Gallon",        price:"$2.99",  url:"https://www.aldi.us/en/weekly-specials/"},
      {store:"Price Rite", item:"Basmati Rice 20lb",          price:"$14.99", url:"https://www.pricerite.com/weekly-circular"},
      {store:"Price Chopper", item:"Atlantic Salmon per lb",  price:"$6.99",  url:"https://www.pricechopper.com/specials/"},
    ];
  }
  renderDeals(deals);
}

function renderDeals(deals) {
  var el = document.getElementById('deals-row');
  if (!el) return;
  el.innerHTML = deals.slice(0,5).map(function(d) {
    return '<a href="' + d.url + '" target="_blank" ' +
      'style="flex-shrink:0;width:130px;background:var(--card2);' +
      'border:1px solid var(--border);border-radius:10px;padding:10px;' +
      'cursor:pointer;text-decoration:none;display:block;' +
      'transition:border-color 0.2s;" ' +
      'onmouseover="this.style.borderColor=\'var(--accent)\'" ' +
      'onmouseout="this.style.borderColor=\'var(--border)\'">' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:0.56rem;' +
        'color:var(--accent);text-transform:uppercase;letter-spacing:0.06em;' +
        'margin-bottom:4px;">' + d.store + '</div>' +
      '<div style="font-family:\'Syne\',sans-serif;font-size:0.68rem;' +
        'color:var(--text);line-height:1.3;margin-bottom:4px;' +
        'overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;' +
        '-webkit-box-orient:vertical;">' + d.item + '</div>' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:0.75rem;' +
        'color:var(--green);font-weight:500;">' + d.price + '</div>' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:0.54rem;' +
        'color:var(--muted2);margin-top:3px;">View Deal →</div>' +
      '</a>';
  }).join('');
}

var _outfitPage = parseInt(localStorage.getItem('outfit_page') || '1');

async function loadOutfits(refresh) {
  if (refresh) {
    _outfitPage++;
    if (_outfitPage > 15) _outfitPage = 1;
    localStorage.setItem('outfit_page', _outfitPage);
  }

  var QUERIES = ['modest fashion outfit','elegant women style',
    'casual chic women','minimalist outfit women',
    'professional women fashion','summer women outfit',
    'feminine style aesthetic','modern abaya fashion',
    'boho women style','street fashion women',
    'autumn women outfit','cozy fashion women',
    'evening style women','neutral tones fashion'];

  var dayIdx = Math.floor(Date.now() / 86400000);
  var query = QUERIES[dayIdx % QUERIES.length];
  var el = document.getElementById('outfit-grid');

  try {
    var r = await fetch(
      'https://api.pexels.com/v1/search?query=' +
      encodeURIComponent(query) + '&per_page=2&page=' + _outfitPage,
      { headers: { Authorization: CONFIG.PEXELS_KEY } }
    );
    var d = await r.json();
    if (d.photos && d.photos.length >= 2 && el) {
      el.innerHTML = d.photos.slice(0,2).map(function(p) {
        return '<div style="border-radius:12px;overflow:hidden;aspect-ratio:2/3;">' +
          '<img src="' + p.src.medium + '" alt="outfit" ' +
          'style="width:100%;height:100%;object-fit:cover;display:block;">' +
          '</div>';
      }).join('');
    }
  } catch(e) {
    if (el) el.innerHTML =
      '<div style="aspect-ratio:2/3;background:var(--card2);border-radius:12px;' +
      'display:flex;align-items:center;justify-content:center;font-size:2.5rem;">👗</div>' +
      '<div style="aspect-ratio:2/3;background:var(--card2);border-radius:12px;' +
      'display:flex;align-items:center;justify-content:center;font-size:2.5rem;">✨</div>';
  }
}

async function loadRecipe() {
  var today = new Date().toDateString();
  var cacheKey = 'gemini_recipe_' + today;
  var cached = localStorage.getItem(cacheKey);

  if (cached) {
    try { renderRecipe(JSON.parse(cached)); return; } catch(e) {}
  }

  var prompt = 'Generate one authentic Arab/Jordanian/Levantine recipe inspired by ' +
    'the cooking style of Ola Tashman (Jordanian food influencer). ' +
    'Choose from: Mansaf, Musakhan, Knafeh, Fattet Hummus, Maqlouba, Kibbeh, ' +
    'Zarb, Sayadieh, Maqluba, Arayes, Shawarma, or any authentic Levantine dish. ' +
    'Return ONLY valid JSON, no other text:\n' +
    '{"title":"","description":"one sentence","time":45,"servings":4,' +
    '"ingredients":["item 1","item 2"],' +
    '"steps":["Step 1 text","Step 2 text"],' +
    '"tip":"Chef tip from Ola Tashman style"}';

  var result = await callGemini(prompt, 500);
  var recipe = null;

  if (result) {
    try {
      var clean = result.replace(/```json|```/g,'').trim();
      recipe = JSON.parse(clean);
      if (recipe && recipe.title) {
        localStorage.setItem(cacheKey, JSON.stringify(recipe));
      }
    } catch(e) {}
  }

  if (!recipe) {
    recipe = {
      title: 'Traditional Mansaf',
      description: 'Jordan\'s national dish — slow-cooked lamb in jameed broth over rice.',
      time: 90, servings: 6,
      ingredients: ['2 lbs lamb shoulder','2 cups jameed','3 cups basmati rice',
        '1 tsp turmeric','Pine nuts','Fresh parsley','Salt and pepper'],
      steps: ['Soak jameed in warm water 2 hours, strain smooth.',
        'Brown lamb in olive oil over high heat.',
        'Add water, spices, simmer 45 min.',
        'Cook rice in lamb broth with turmeric.',
        'Layer flatbread, rice, lamb, jameed sauce. Garnish with pine nuts.'],
      tip: 'The key is stirring the jameed sauce continuously without boiling.'
    };
  }

  var FOOD_IMAGES = [
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
    'https://images.unsplash.com/photo-1598103442097-8b74394b95c9?w=600&q=80',
    'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=600&q=80',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80',
  ];
  var dayIdx = Math.floor(Date.now() / 86400000);
  recipe._image = FOOD_IMAGES[dayIdx % FOOD_IMAGES.length];
  renderRecipe(recipe);
}

function renderRecipe(recipe) {
  var imgEl = document.getElementById('recipe-img');
  if (imgEl && recipe._image) imgEl.src = recipe._image;

  var titleEl = document.getElementById('recipe-title');
  if (titleEl) titleEl.textContent = recipe.title || '';

  var descEl = document.getElementById('recipe-desc');
  if (descEl) descEl.textContent = recipe.description || '';

  var metaEl = document.getElementById('recipe-meta');
  if (metaEl) metaEl.innerHTML =
    '<span>⏱ ' + (recipe.time||'--') + ' min</span> ' +
    '<span>👥 ' + (recipe.servings||'--') + ' servings</span>';

  var ingEl = document.getElementById('recipe-ingredients');
  if (ingEl && recipe.ingredients) {
    ingEl.innerHTML = (recipe.ingredients||[]).map(function(i) {
      return '<div style="padding:4px 0;border-bottom:1px solid var(--border);' +
        'font-family:\'Montserrat\',sans-serif;font-size:0.72rem;">• ' + i + '</div>';
    }).join('');
  }

  var stepsEl = document.getElementById('recipe-steps');
  if (stepsEl && recipe.steps) {
    stepsEl.innerHTML = (recipe.steps||[]).map(function(s, i) {
      return '<div style="display:flex;gap:10px;padding:8px 0;' +
        'border-bottom:1px solid var(--border);">' +
        '<span style="font-family:\'DM Mono\',monospace;font-size:0.65rem;' +
          'color:var(--purple);font-weight:600;flex-shrink:0;">' + (i+1) + '.</span>' +
        '<span style="font-family:\'Montserrat\',sans-serif;font-size:0.72rem;' +
          'line-height:1.45;">' + s + '</span></div>';
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
          let [h,m] = data.data.timings[name].split(':');
          let hh = parseInt(h);
          const ampm = hh >= 12 ? 'PM' : 'AM';
          hh = hh % 12 || 12;
          return `<div class="prayer-item" data-name="${name}" style="display:flex; justify-content:space-between; font-family:'DM Mono',monospace; font-size:0.75rem; padding:6px; background:var(--card2); border-radius:6px;"><span style="color:var(--muted2);">${name}</span><span>${hh}:${m} ${ampm}</span></div>`;
        }).join('');
      }
    }
  } catch(e) {}
}

function updateCountdown() {
  if(!window.prayerTimings) return;
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const now = new Date();
  let next = null;
  let minDiff = Infinity;
  prayers.forEach(name => {
    const [h,m] = window.prayerTimings[name].split(':');
    let pTime = new Date();
    pTime.setHours(h, m, 0, 0);
    if(pTime < now) pTime.setDate(pTime.getDate()+1);
    const diff = pTime - now;
    if(diff < minDiff) { minDiff = diff; next = name; }
  });
  
  if(next) {
    const hrs = Math.floor(minDiff/3600000);
    const mins = Math.floor((minDiff%3600000)/60000);
    const secs = Math.floor((minDiff%60000)/1000);
    const cd = document.getElementById('prayer-countdown');
    if(cd) cd.innerHTML = `
      <div style="font-family:'Syne',sans-serif; font-size:0.7rem; text-transform:uppercase; color:var(--text); margin-bottom:4px;">Next: <span style="color:var(--gold);">${next}</span></div>
      <div style="font-family:'DM Mono',monospace; font-size:1.1rem; color:var(--text);">${hrs}h ${mins}m ${secs}s</div>
    `;
    document.querySelectorAll('.prayer-item').forEach(el => {
      if(el.dataset.name === next) el.style.borderLeft = '2px solid var(--gold)';
      else el.style.borderLeft = 'none';
    });
  }
}

async function loadWeather() {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${CONFIG.WEATHER_CITY}&appid=${CONFIG.WEATHER_KEY}&units=imperial`);
    const data = await res.json();
    if(data.list) {
      const current = data.list[0];
      const html = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-family:'Instrument Serif',serif; font-size:2.8rem; line-height:1;">${Math.round(current.main.temp)}°</div>
          <img src="https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png" style="width:50px;">
        </div>
        <div style="font-family:'Montserrat',sans-serif; font-size:0.8rem; margin-bottom:12px;">
          ${current.weather[0].description} | H:${Math.round(current.main.temp_max)}° L:${Math.round(current.main.temp_min)}°
        </div>
        <div style="display:flex; justify-content:space-between; font-family:'DM Mono',monospace; font-size:0.6rem; color:var(--muted2); border-top:1px solid var(--border); padding-top:8px;">
          <span>Feels: ${Math.round(current.main.feels_like)}°</span>
          <span>Hum: ${current.main.humidity}%</span>
          <span>Wind: ${Math.round(current.wind.speed)}mph</span>
        </div>
      `;
      const hourly = data.list.slice(1,7).map(h => `
        <div style="display:flex; flex-direction:column; align-items:center;">
          <span style="font-size:0.6rem;">${new Date(h.dt*1000).getHours()}:00</span>
          <img src="https://openweathermap.org/img/wn/${h.weather[0].icon}.png" style="width:24px;">
          <span style="font-size:0.7rem; font-weight:600;">${Math.round(h.main.temp)}°</span>
        </div>
      `).join('');
      
      document.querySelectorAll('.weather-basic').forEach(el => el.innerHTML = html);
      const strip = document.getElementById('weather-hourly');
      if(strip) strip.innerHTML = `<div style="display:flex; justify-content:space-between; margin-top:12px; border-top:1px solid var(--border); padding-top:12px; font-family:'DM Mono',monospace;">${hourly}</div>`;
    }
  } catch(e) {}
}

async function addListItem(key, inputId) {
  const input = document.getElementById(inputId);
  const text = input.value.trim();
  if(!text) return;
  const list = await store.get(key) || [];
  list.push({ id: Date.now(), text, done: false });
  await store.set(key, list);
  input.value = '';
  if(key === 'grocery_list') renderList(key, 'groc-list');
  else if(key === 'todo_mahmoud') renderTaskList('todo_mahmoud', 'm-todo-list');
  else if(key === 'todo_haya') renderTaskList('todo_haya', 'h-todo-list');
}

async function renderList(key, containerId) {
  const list = await store.get(key) || [];
  const el = document.getElementById(containerId);
  if(!el) return;
  el.innerHTML = list.map(item => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
      <div style="display:flex; align-items:center; gap:8px;">
        <input type="checkbox" ${item.done?'checked':''} onchange="toggleItem('${key}', ${item.id})" style="accent-color:var(--accent);">
        <span style="font-size:0.75rem; ${item.done?'text-decoration:line-through;color:var(--muted2);':''}">${item.text}</span>
      </div>
      <button onclick="deleteItem('${key}', ${item.id})" style="background:transparent; border:none; cursor:pointer; color:var(--red); padding:0; font-size:0.8rem;">×</button>
    </div>
  `).join('');
}

async function renderTaskList(key, containerId) {
    const list = await store.get(key) || [];
    const el = document.getElementById(containerId);
    if(!el) return;
    el.innerHTML = list.map(item => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" onchange="deleteItem('${key}', ${item.id})" style="accent-color:var(--accent);">
                <span style="font-size:0.75rem;">${item.text}</span>
            </div>
            <button onclick="deleteItem('${key}', ${item.id})" style="background:transparent; border:none; cursor:pointer; color:var(--red); padding:0; font-size:0.8rem;">×</button>
        </div>
    `).join('');
}

function renderHayaTodo() { renderTaskList('todo_haya', 'h-todo-list'); }

async function toggleItem(key, id) {
  const list = await store.get(key) || [];
  const item = list.find(i => i.id === id);
  if(item) { item.done = !item.done; await store.set(key, list); renderList(key, key==='grocery_list'?'groc-list':null); }
}

async function deleteItem(key, id) {
  let list = await store.get(key) || [];
  list = list.filter(i => i.id !== id);
  await store.set(key, list);
  if(key === 'grocery_list') renderList(key, 'groc-list');
  else if(key === 'todo_mahmoud') renderTaskList('todo_mahmoud', 'm-todo-list');
  else if(key === 'todo_haya') renderTaskList('todo_haya', 'h-todo-list');
}

async function addGoal(key, inputId) {
  const input = document.getElementById(inputId);
  const text = input.value.trim();
  if(!text) return;
  const list = await store.get(key) || [];
  list.push({ id: Date.now(), text, done: false });
  await store.set(key, list);
  input.value = '';
  renderGoalPanelList(key);
}

async function renderGoalPanel(panelId, key) {
  const el = document.getElementById(panelId);
  if(!el) return;
  el.dataset.key = key;
  renderGoalPanelList(key);
}

async function renderGoalPanelList(key) {
  const panels = document.querySelectorAll(`[data-key="${key}"]`);
  if(!panels.length) return;
  const list = await store.get(key) || [];
  const html = list.map(item => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
      <div style="display:flex; align-items:center; gap:8px;">
        <input type="checkbox" ${item.done?'checked':''} onchange="toggleGoal('${key}', ${item.id})" style="accent-color:var(--accent);">
        <span style="font-size:0.75rem; ${item.done?'text-decoration:line-through;color:var(--muted2);':''}">${item.text}</span>
      </div>
      <button onclick="deleteGoal('${key}', ${item.id})" style="background:transparent; border:none; cursor:pointer; color:var(--red); padding:0; font-size:0.8rem;">×</button>
    </div>
  `).join('');
  panels.forEach(p => p.querySelector('.goal-list').innerHTML = html);
}

async function toggleGoal(key, id) {
  const list = await store.get(key) || [];
  const item = list.find(i => i.id === id);
  if(item) { item.done = !item.done; await store.set(key, list); renderGoalPanelList(key); }
}

async function deleteGoal(key, id) {
  let list = await store.get(key) || [];
  list = list.filter(i => i.id !== id);
  await store.set(key, list);
  renderGoalPanelList(key);
}

let mediaInterval;
function handleMediaLoad(event) {
    const files = event.target.files;
    if (!files.length) return;
    const urls = Array.from(files).map(f => URL.createObjectURL(f));
    const container = document.getElementById('media-container');
    if (urls.length > 0) {
        let idx = 0;
        container.innerHTML = `<img src="${urls[idx]}" style="width:100%;height:100%;object-fit:contain;display:block;">`;
        if (urls.length > 1) {
            clearInterval(mediaInterval);
            mediaInterval = setInterval(() => {
                idx = (idx + 1) % urls.length;
                container.innerHTML = `<img src="${urls[idx]}" style="width:100%;height:100%;object-fit:contain;display:block;">`;
            }, CONFIG.SLIDESHOW_SPEED);
        }
    }
}

async function addBudgetCat() {
    const name = document.getElementById('b-name').value;
    const amount = parseFloat(document.getElementById('b-amount').value);
    if (!name || isNaN(amount)) return;
    const b = await store.get('budget_items') || [
        {name:'Mortgage', amount:2500},
        {name:'Food', amount:800},
        {name:'Utilities', amount:300},
        {name:'Transport', amount:400},
        {name:'Kids', amount:200},
        {name:'Other', amount:150}
    ];
    b.push({name, amount});
    await store.set('budget_items', b);
    document.getElementById('b-name').value = '';
    document.getElementById('b-amount').value = '';
    renderBudget();
}

async function renderBudget() {
    let b = await store.get('budget_items');
    if (!b || !b.length) {
        b = [
            {name:'Mortgage', amount:2500},
            {name:'Food', amount:800},
            {name:'Utilities', amount:300},
            {name:'Transport', amount:400},
            {name:'Kids', amount:200},
            {name:'Other', amount:150}
        ];
        await store.set('budget_items', b);
    }
    const total = b.reduce((s, i) => s + i.amount, 0);
    const el = document.getElementById('budget-list');
    if (!el) return;
    document.getElementById('budget-total').textContent = '$' + total.toLocaleString();
    el.innerHTML = b.map(item => {
        const pct = total > 0 ? (item.amount / total * 100).toFixed(1) : 0;
        return `
        <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;font-size:0.7rem;margin-bottom:4px;">
                <span>${item.name}</span>
                <span style="font-family:'DM Mono',monospace;color:var(--muted2);">$${item.amount.toLocaleString()}</span>
            </div>
            <div style="width:100%;height:4px;background:var(--card2);border-radius:2px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:var(--accent);"></div>
            </div>
        </div>
        `;
    }).join('');
}

function importCSV(event) {
  showToast("CSV data loaded ✓");
}

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

  loadIslamicWisdom('wisdom-mahmoud');
  loadIslamicWisdom('wisdom-haya');
  loadNewsBrief();
  setInterval(loadNewsBrief, 3600000);
  loadDeals();
  loadOutfits(false);
  loadRecipe();

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
}
