const CONFIG = {
  SUPABASE_URL:      'https://kyhbexbfmbtuhiddtvdb.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5aGJleGJmbWJ0dWhpZGR0dmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjY0OTgsImV4cCI6MjA5MzY0MjQ5OH0.Rv2FtqZWGt[...]',
  PASSWORD:          'familia2024',
  WEATHER_KEY:       '7a6a9fd1087d7335ccb8d3312177225c',
  WEATHER_CITY:      'Newington,CT,US',
  SLIDESHOW_SPEED:   5000
};

// ─── SAFE DATABASE INITIALIZATION ─────────────────────────────────────────────
let sb = null;
try {
  if (typeof window.supabase !== 'undefined' && CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
} catch (error) { console.warn("Database init delayed", error); }

// ─── LOGIN FLOW ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('f_auth') === '1') {
    document.getElementById('login-screen').style.display = 'none';
    initAppSafe();
  }
});

function checkLogin() {
  const inputEl = document.getElementById('login-pwd');
  const errorEl = document.getElementById('login-err');
  if (inputEl.value === CONFIG.PASSWORD) {
    sessionStorage.setItem('f_auth', '1');
    document.getElementById('login-screen').style.display = 'none';
    initAppSafe();
  } else { errorEl.textContent = 'Incorrect password.'; }
}

function initAppSafe() { try { initApp(); } catch(e) { console.error("Init error:", e); showToast("Dashboard loading error."); } }

// ─── UTILS & UI CONTROLS ──────────────────────────────────────────────────────
function showToast(msg) {
  var t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => t.style.transform = 'translateX(-50%) translateY(80px)', 2400);
}
function openSettings() { document.getElementById('settings-panel').style.right = '0'; document.getElementById('settings-overlay').style.display = 'block'; }
function closeSettings() { document.getElementById('settings-panel').style.right = '-380px'; document.getElementById('settings-overlay').style.display = 'none'; }

// ─── STORE & REALTIME SYNC ────────────────────────────────────────────────────
const store = {
  async get(key) {
    const local = localStorage.getItem('f2_' + key);
    if (local) return JSON.parse(local);
    if (sb) {
      try {
        const { data } = await sb.from('familia_data').select('value').eq('key', key).maybeSingle();
        if (data) { localStorage.setItem('f2_' + key, data.value); return JSON.parse(data.value); }
      } catch(e) {}
    }
    return null;
  },
  async set(key, value) {
    const serialized = JSON.stringify(value);
    localStorage.setItem('f2_' + key, serialized);
    if (sb) { try { await sb.from('familia_data').upsert({ key: key, value: serialized, updated_at: new Date().toISOString() }, { onConflict: 'key' }); } catch(e) {} }
  }
};

function initRealtimeSync() {
  if (!sb) return;
  sb.channel('familia_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'familia_data' }, (payload) => {
      const key = payload.new && payload.new.key;
      if (!key) return;
      localStorage.setItem('f2_' + key, payload.new.value);
    }).subscribe();
}

// ─── ADHAN LOGIC ───────────────────────────────────────────────────────
let _audioCtx = null;
let _adhanPlayedToday = {};

function unlockAudio() { 
  try { 
    if (!_audioCtx) { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } 
    if (_audioCtx.state === 'suspended') { _audioCtx.resume(); } 
  } catch(e) {} 
}

if (typeof document !== 'undefined') {
  ['touchstart','touchend','mousedown','click','keydown'].forEach(function(evt) { 
    document.addEventListener(evt, unlockAudio, { passive: true, capture: true }); 
  });
}

function updateAdhanStatus() {
  const nameEl = document.getElementById('sp-adhan-name');
  if (!nameEl) return;
  
  const name = localStorage.getItem('f_adhan_name');
  if (name) {
    nameEl.textContent = '✓ ' + name;
  } else {
    nameEl.textContent = 'No adhan file loaded';
  }
}

function handleAdhanUpload(event) {
  var file = event.target.files && event.target.files[0];
  var nameEl = document.getElementById('sp-adhan-name');
  var msgEl = document.getElementById('adhan-test-msg');
  if (!file) { if (nameEl) nameEl.textContent = 'No file selected'; return; }
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
      console.warn("Storage quota exceeded, using fallback memory.");
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
  }
  updateAdhanStatus();
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
    
    // FIXED: Play exactly at prayer time (0 to 5 seconds after, not -5 to +30)
    if (diffSec >= 0 && diffSec <= 5 && !_adhanPlayedToday[flagKey]) {
      _adhanPlayedToday[flagKey] = true; 
      var src = getAdhanSrc();
      if (!src) { 
        showToast('🕌 ' + name + ' time'); 
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
          p.then(function() { showToast('🕌 ' + name + ' — وقت الصلاة'); })
           .catch(function() { setTimeout(doPlay, 800); }); 
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

// ─── MEDIA SLIDESHOW ───────────────────────────────────────────────────────
let mediaInterval;
function handleMediaLoad(event) {
  const files = event.target.files; if (!files.length) return;
  const urls = Array.from(files).map(f => URL.createObjectURL(f));
  const container = document.getElementById('media-container');
  if (urls.length > 0) {
    let idx = 0; container.innerHTML = `<img src="${urls[idx]}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
    if (urls.length > 1) { clearInterval(mediaInterval); mediaInterval = setInterval(() => { idx = (idx + 1) % urls.length; container.innerHTML = `<img src="${urls[idx]}" style="width:100%;height:100%;object-fit:cover;display:block;">`; }, CONFIG.SLIDESHOW_SPEED); }
  }
  showToast(`📸 ${urls.length} photo(s) loaded`);
}

// ─── WEATHER ──────────────────────────────────────────────────────────
async function loadWeather() {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${CONFIG.WEATHER_CITY}&appid=${CONFIG.WEATHER_KEY}&units=imperial`);
    const data = await res.json();
    if(data.list) {
      const current = data.list[0];
      const html = `<div style="display:flex; justify-content:space-between; align-items:center;"><div style="font-family:'Instrument Serif',serif; font-size:2.8rem; line-height:1;">${Math.round(current.main.temp)}°</div><div style="font-size:0.9rem; line-height:1.3; text-transform:capitalize;">${current.weather[0].main}</div></div>`;
      document.querySelectorAll('.weather-basic').forEach(el => el.innerHTML = html);
    }
  } catch(e) { console.warn("Weather load error:", e); }
}

// ─── PRAYER TIMES ────────────────────────────────────────────────────────
window.prayerTimings = null;
async function loadPrayers() {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=Newington&country=US&method=2`);
    const data = await res.json();
    if(data.data && data.data.timings) {
      window.prayerTimings = data.data.timings;
      const grid = document.getElementById('prayer-grid');
      grid.innerHTML = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(name => {
        let [h,m] = data.data.timings[name].split(':'); let hh = parseInt(h); const ampm = hh >= 12 ? 'PM' : 'AM'; hh = hh % 12 || 12;
        return `<div style="display:flex; justify-content:space-between; font-family:'DM Mono',monospace; font-size:0.75rem; padding:6px; background:rgba(245,158,11,0.1); border-radius:6px; border:1px solid rgba(245,158,11,0.3);"><span>${name}</span><span>${hh}:${m} ${ampm}</span></div>`;
      }).join('');
      updateCountdown();
    }
  } catch(e) { console.warn("Prayer times load error:", e); }
}

function updateCountdown() {
  if(!window.prayerTimings) return;
  const now = new Date(); let next = null; let minDiff = Infinity;
  ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach(name => {
    const [h,m] = window.prayerTimings[name].split(':'); let pTime = new Date(); pTime.setHours(h, m, 0, 0);
    if(pTime < now) pTime.setDate(pTime.getDate()+1); const diff = pTime - now;
    if(diff < minDiff) { minDiff = diff; next = name; }
  });
  if(next) {
    const hrs = Math.floor(minDiff/3600000); const mins = Math.floor((minDiff%3600000)/60000); const secs = Math.floor((minDiff%60000)/1000);
    document.getElementById('prayer-countdown').innerHTML = `<div style="font-family:'DM Mono',monospace; font-size:0.7rem; text-transform:uppercase; color:var(--text); margin-bottom:4px;">Next: ${next}</div><div style="font-family:'DM Mono',monospace; font-size:1.1rem; font-weight:bold; color:var(--accent);">${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}</div>`;
  }
}

// ─── ISLAMIC WISDOM ───────────────────────────────────────────────────────
const WISDOM_DB = [
  { arabic: "مَنْ عَرَفَ نَفْسَهُ فَقَدْ عَرَفَ رَبَّهُ", english: "He who knows himself, knows his Lord.", source: "Ali ibn Abi Talib" },
  { arabic: "الصَّبْرُ مِفْتَاحُ الفَرَجِ", english: "Patience is the key to relief.", source: "Ali ibn Abi Talib" },
  { arabic: "إِنَّ مَعَ العُسْرِ يُسْرًا", english: "Indeed, with hardship [will be] ease.", source: "Quran 94:5" },
  { arabic: "اللهُ مع الصابرين", english: "Allah is with the patient ones.", source: "Quran 2:153" },
  { arabic: "الحكمة ضالة المؤمن", english: "Wisdom is the lost property of the believer.", source: "Hadith" },
  { arabic: "أحسن الأعمال أتقاها", english: "The best of deeds is the most God-fearing.", source: "Hadith" }
];

function loadWisdom() {
  const container = document.getElementById('wisdom-container');
  if (!container) return;
  
  const daySeed = Math.floor(Date.now() / 86400000);
  const q = WISDOM_DB[daySeed % WISDOM_DB.length];
  
  const wHtml = `
    <div class="wisdom-card">
      <div class="wisdom-arabic">"${q.arabic}"</div>
      <div class="wisdom-english">"${q.english}"</div>
      <div class="wisdom-source">— ${q.source}</div>
    </div>
  `;
  
  container.innerHTML = wHtml;
}

// ─── APP INITIALIZATION ──────────────────────────────────────────────────────
function initApp() {
  setInterval(() => {
    const opts = { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true };
    const clk = document.getElementById('live-clock'); if (clk) clk.textContent = new Date().toLocaleString('en-US', opts).replace(',', ' ·');
  }, 1000);
  
  initRealtimeSync();
  
  // FIXED: Load Adhan and immediately update status
  restoreAdhan();
  
  // Load Prayers with status
  var countdownEl = document.getElementById('prayer-countdown');
  if (countdownEl) {
    countdownEl.innerHTML = '<div style="font-family:\'DM Mono\',monospace; font-size:0.7rem; text-transform:uppercase; color:var(--muted2);">Loading prayer times...</div>';
  }
  loadPrayers();
  
  setInterval(() => { 
    updateCountdown(); 
    checkAndPlayAdhan(); 
  }, 1000);
  
  // Load Weather
  loadWeather();
  
  // Load Wisdom with status
  var wisdomEl = document.getElementById('wisdom-container');
  if (wisdomEl) {
    wisdomEl.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--muted2);">⏳ Loading wisdom...</div>';
  }
  setTimeout(loadWisdom, 300);
}
