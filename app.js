const CONFIG = {
  SUPABASE_URL:      'https://kyhbexbfmbtuhiddtvdb.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5aGJleGJmbWJ0dWhpZGR0dmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjY0OTgsImV4cCI6MjA5MzY0MjQ5OH0.Rv2FtqZWGtHzHieCS0SmQjnGTEdSXsqrYTYfJrwddMQ',
  WEATHER_KEY:       '7a6a9fd1087d7335ccb8d3312177225c',
  WEATHER_CITY:      'Newington,CT,US',
  SLIDESHOW_SPEED:   5000
};

// Safe Supabase Initialization
const _sbReady = CONFIG.SUPABASE_URL && CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL';
const sb = _sbReady ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;

// ─── LOGIN FLOW ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('f_auth') === '1') {
    document.getElementById('login-screen').style.display = 'none';
    initAppSafe();
  }
});

function checkLogin() {
  if (document.getElementById('login-pwd').value === 'familia2024') {
    sessionStorage.setItem('f_auth', '1');
    document.getElementById('login-screen').style.display = 'none';
    initAppSafe();
  } else {
    document.getElementById('login-err').textContent = 'Incorrect password.';
  }
}

function initAppSafe() {
  try { initApp(); } 
  catch(e) { console.error("Initialization error:", e); showToast("App error, check connection"); }
}

// ─── UTILS & UI CONTROLS ──────────────────────────────────────────────────────
function showToast(msg) {
  var t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => t.style.transform = 'translateX(-50%) translateY(80px)', 2400);
}
function openSettings() { document.getElementById('settings-panel').style.right = '0'; document.getElementById('settings-overlay').style.display = 'block'; }
function closeSettings() { document.getElementById('settings-panel').style.right = '-380px'; document.getElementById('settings-overlay').style.display = 'none'; }

function switchProfile(profile, btn) {
  document.querySelectorAll('.profile-btn').forEach(b => { b.style.background = 'transparent'; b.style.color = 'var(--muted2)'; });
  btn.style.background = 'var(--accent)'; btn.style.color = 'var(--bg)';
  document.querySelectorAll('.dashboard').forEach(d => d.classList.remove('active'));
  document.getElementById('dash-' + profile).classList.add('active');
}

function switchTab(btn) {
  var tabRow = btn.closest('.tabs'); var card = btn.closest('.card');
  var tabs = tabRow.querySelectorAll('.tab'); var idx = Array.from(tabs).indexOf(btn);
  tabs.forEach(t => t.classList.remove('active')); btn.classList.add('active');
  card.querySelectorAll('.tab-panel').forEach((p, i) => p.classList.toggle('active', i === idx));
}

// ─── STORE & REALTIME SYNC (FIXED) ────────────────────────────────────────────
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
    if (sb) {
      try { await sb.from('familia_data').upsert({ key: key, value: serialized, updated_at: new Date().toISOString() }, { onConflict: 'key' }); } catch(e) {}
    }
  }
};

function initRealtimeSync() {
  if (!sb) return;
  sb.channel('familia_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'familia_data' }, (payload) => {
      const key = payload.new && payload.new.key;
      if (!key) return;
      localStorage.setItem('f2_' + key, payload.new.value);
      if (key === 'grocery_list') renderList('grocery_list', 'groc-list');
      else if (key === 'todo_mahmoud') renderTaskList('todo_mahmoud', 'm-todo-list');
      else if (key === 'todo_haya') renderTaskList('todo_haya', 'h-todo-list');
      else if (key === 'budget_items') renderBudget();
      else if (key.includes('goals')) renderGoalPanelList(key);
    }).subscribe();
}

// ─── ADHAN AUDIO (RESTORED ORIGINAL LOGIC) ────────────────────────────────────
let _audioCtx = null;
let _adhanPlayedToday = {};

function unlockAudio() { 
  try { 
    if (!_audioCtx) { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } 
    if (_audioCtx.state === 'suspended') { _audioCtx.resume(); } 
  } catch(e) {} 
}
['touchstart','touchend','mousedown','click','keydown'].forEach(evt => document.addEventListener(evt, unlockAudio, { passive: true, capture: true }));

function handleAdhanUpload(event) {
  var file = event.target.files && event.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) { 
    localStorage.setItem('f_adhan', e.target.result); 
    var player = document.getElementById('adhan-player');
    if (player) { player.src = e.target.result; player.load(); }
    showToast('Adhan audio saved ✓'); 
  };
  reader.readAsDataURL(file);
}

function testAdhan() {
  const src = localStorage.getItem('f_adhan');
  if (!src) { showToast('Upload audio in Settings first'); return; }
  var player = document.getElementById('adhan-player');
  if (!player.src || player.src === window.location.href) { player.src = src; player.load(); }
  unlockAudio();
  player.currentTime = 0;
  player.play().catch(e => showToast('Tap screen anywhere first to allow audio'));
}

function checkAndPlayAdhan() {
  if (!window.prayerTimings) return;
  var prayers = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
  var now = new Date(); var todayStr = now.toDateString();
  prayers.forEach(function(name) {
    var raw = window.prayerTimings[name]; if (!raw) return;
    var parts = raw.split(':');
    var pTime = new Date(); pTime.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
    var diffSec = (pTime - now) / 1000;
    var flagKey = name + '_' + todayStr;
    
    if (diffSec >= -5 && diffSec <= 30 && !_adhanPlayedToday[flagKey]) {
      _adhanPlayedToday[flagKey] = true;
      var src = localStorage.getItem('f_adhan');
      if (!src) { showToast('🕌 ' + name + ' time'); return; }
      
      var player = document.getElementById('adhan-player');
      if (!player.src || player.src === window.location.href) { player.src = src; player.load(); }
      unlockAudio(); player.currentTime = 0; 
      player.play().catch(e => console.log('Autoplay blocked'));
      showToast('🕌 ' + name + ' — وقت الصلاة');
    }
  });
}

// ─── MEDIA SLIDESHOW ──────────────────────────────────────────────────────────
let mediaInterval;
function handleMediaLoad(event) {
  const files = event.target.files; if (!files.length) return;
  const urls = Array.from(files).map(f => URL.createObjectURL(f));
  const container = document.getElementById('media-container');
  if (urls.length > 0) {
    let idx = 0; container.innerHTML = `<img src="${urls[idx]}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
    if (urls.length > 1) { clearInterval(mediaInterval); mediaInterval = setInterval(() => { idx = (idx + 1) % urls.length; container.innerHTML = `<img src="${urls[idx]}" style="width:100%;height:100%;object-fit:cover;display:block;">`; }, CONFIG.SLIDESHOW_SPEED); }
  }
}

// ─── WEATHER ──────────────────────────────────────────────────────────────────
async function loadWeather() {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${CONFIG.WEATHER_CITY}&appid=${CONFIG.WEATHER_KEY}&units=imperial`);
    const data = await res.json();
    if(data.list) {
      const current = data.list[0];
      const html = `<div style="display:flex; justify-content:space-between; align-items:center;"><div style="font-family:'Instrument Serif',serif; font-size:2.8rem; line-height:1;">${Math.round(current.main.temp)}°</div><img src="https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png" style="width:50px;"></div><div style="font-family:'Montserrat',sans-serif; font-size:0.8rem; margin-bottom:12px;">${current.weather[0].description} | H:${Math.round(current.main.temp_max)}° L:${Math.round(current.main.temp_min)}°</div>`;
      document.querySelectorAll('.weather-basic').forEach(el => el.innerHTML = html);
    }
  } catch(e) {}
}

// ─── PRAYER TIMES ─────────────────────────────────────────────────────────────
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
        return `<div class="prayer-item" data-name="${name}" style="display:flex; justify-content:space-between; font-family:'DM Mono',monospace; font-size:0.75rem; padding:6px; background:var(--card2); border-radius:6px;"><span style="color:var(--muted2);">${name}</span><span>${hh}:${m} ${ampm}</span></div>`;
      }).join('');
    }
  } catch(e) {}
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
    document.getElementById('prayer-countdown').innerHTML = `<div style="font-family:'Syne',sans-serif; font-size:0.7rem; text-transform:uppercase; color:var(--text); margin-bottom:4px;">Next: <span style="color:var(--gold);">${next}</span></div><div style="font-family:'DM Mono',monospace; font-size:1.1rem; color:var(--text);">${hrs}h ${mins}m ${secs}s</div>`;
  }
}

// ─── BUDGET ───────────────────────────────────────────────────────────────────
async function renderBudget() {
  let b = await store.get('budget_items') || [];
  const total = b.reduce((s, i) => s + i.amount, 0); 
  const elTotal = document.getElementById('budget-total');
  const elList = document.getElementById('budget-list');
  if(elTotal) elTotal.textContent = '$' + total.toLocaleString();
  if(elList) elList.innerHTML = b.map(item => { 
    const pct = total > 0 ? (item.amount / total * 100).toFixed(1) : 0; 
    return `<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;font-size:0.7rem;margin-bottom:4px;"><span>${item.name}</span><span style="font-family:'DM Mono',monospace;color:var(--muted2);">$${item.amount.toLocaleString()}</span></div><div style="width:100%;height:4px;background:var(--card2);border-radius:2px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:var(--accent);"></div></div></div>`; 
  }).join('');
}

// ─── NEWS & VIDEO ─────────────────────────────────────────────────────────────
async function loadNewsBrief() {
  try {
    const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=http%3A%2F%2Ffeeds.bbci.co.uk%2Fnews%2Fworld%2Frss.xml');
    const data = await res.json();
    if(data.items && data.items.length > 0) {
      document.getElementById('news-brief').innerHTML = `
        <div><b>🌍 World:</b> <span style="color:var(--muted2);">${data.items[0].title}</span></div>
        <div style="font-size:0.6rem; color:var(--muted); margin-top:5px; text-align:right;">BBC News RSS</div>
      `;
    }
  } catch(e) { document.getElementById('news-brief').innerHTML = '<span style="color:var(--red)">Feed unavailable.</span>'; }
}

function loadCNBC() {
  const c = document.getElementById('cnbc-container'); if(c) c.innerHTML = '<iframe src="https://www.youtube.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg&autoplay=1&mute=0" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>';
}

// ─── OUTFITS (WITH LINKS) & BEAUTY DEALS (WITH PICTURES/PRICE) ────────────────
const OUTFIT_DATA = [
  { img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80', link: 'https://www.zara.com/us/en/woman-new-in-l1180.html' },
  { img: 'https://images.unsplash.com/photo-1434389678369-182fc221ac11?w=400&q=80', link: 'https://www2.hm.com/en_us/women/new-arrivals/clothes.html' },
  { img: 'https://images.unsplash.com/photo-1485230895905-eb56f66378ea?w=400&q=80', link: 'https://www.nordstrom.com/browse/women/clothing/new' },
  { img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80', link: 'https://www.zara.com/us/en/woman-dresses-l1066.html' },
  { img: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80', link: 'https://www.aritzia.com/us/en/new' },
  { img: 'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=400&q=80', link: 'https://www.mango.com/us/women/new-in_c52994437' }
];

function refreshOutfits() {
  const shuffled = OUTFIT_DATA.sort(() => 0.5 - Math.random()).slice(0, 4);
  document.getElementById('outfits-container').innerHTML = shuffled.map(item => `
    <a href="${item.link}" target="_blank" style="flex-shrink:0;width:120px;background:var(--card2);border-radius:10px;overflow:hidden;border:1px solid var(--border);text-decoration:none;display:block;">
      <img src="${item.img}" style="width:100%;height:160px;object-fit:cover;display:block;">
      <div style="padding:6px;text-align:center;"><span style="font-family:'DM Mono',monospace;font-size:0.5rem;color:var(--muted2);">View Item ↗</span></div>
    </a>
  `).join('');
}

function loadBeautyDeals() {
  const BEAUTY_DEALS = [
    { store: "Sephora", item: "Dior Lip Glow Oil", price: "$28.00", oldPrice: "$40.00", discount: "30% OFF", img: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=200&q=80", link: "https://www.sephora.com/sale" },
    { store: "Ulta", item: "Chanel Coco Perfume", price: "$105.00", oldPrice: "$135.00", discount: "22% OFF", img: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=200&q=80", link: "https://www.ulta.com/promotion/sale" },
    { store: "Sephora", item: "Rare Beauty Blush", price: "$16.00", oldPrice: "$23.00", discount: "30% OFF", img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=80", link: "https://www.sephora.com/sale" }
  ];

  document.getElementById('beauty-deals-container').innerHTML = BEAUTY_DEALS.map(deal => `
    <a href="${deal.link}" target="_blank" style="background:var(--card2); border:1px solid var(--border); border-radius:8px; padding:8px; text-decoration:none; display:flex; gap:10px; align-items:center;">
      <img src="${deal.img}" style="width:50px;height:50px;border-radius:6px;object-fit:cover;">
      <div style="flex:1;">
        <div style="font-family:'Syne',sans-serif;font-size:0.65rem;font-weight:700;color:var(--text);margin-bottom:2px;">${deal.item}</div>
        <div style="font-family:'DM Mono',monospace;font-size:0.55rem;color:var(--muted2);text-transform:uppercase;">${deal.store}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'DM Mono',monospace;font-size:0.65rem;color:var(--green);font-weight:bold;">${deal.price}</div>
        <div style="font-family:'DM Mono',monospace;font-size:0.5rem;color:var(--muted);text-decoration:line-through;">${deal.oldPrice}</div>
        <div style="background:rgba(236, 72, 153, 0.2); color:var(--pink); font-family:'DM Mono',monospace; font-size:0.45rem; padding:2px 4px; border-radius:3px; margin-top:2px;">${deal.discount}</div>
      </div>
    </a>
  `).join('');
}

// ─── OLA TASHMAN RECIPES (BULLETPROOF FALLBACK) ───────────────────────────────
var _hayaRecipes = [];
var _hayaRecipeIdx = 0;

async function loadRecipe() {
  const fallback = [
    { title: "Mansaf - Authentic Recipe", description: "The traditional Jordanian dish.", videoUrl: "https://www.youtube.com/@OlaTashman", img: "https://images.unsplash.com/photo-1565557612199-5264b321a5b6?w=600&q=80", ingredients: ["1 kg Lamb", "Jameed", "Rice", "Almonds", "Ghee"], tip: "Watch video for full steps" },
    { title: "Chicken Maqluba", description: "Flipped upside down chicken and rice.", videoUrl: "https://www.youtube.com/@OlaTashman", img: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80", ingredients: ["1 Whole Chicken", "Eggplant", "Cauliflower", "Rice", "Spices"], tip: "Watch video for full steps" },
    { title: "Musakhan Rolls", description: "Chicken, onions, sumac wrapped in bread.", videoUrl: "https://www.youtube.com/@OlaTashman", img: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80", ingredients: ["Shredded Chicken", "Sumac", "Onions", "Olive Oil", "Shrak Bread"], tip: "Watch video for full steps" }
  ];

  try {
    const channelId = 'UChnE0G0QoWn-z1X1T3A97-g'; 
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId)}`);
    const data = await res.json();
    if (data && data.items && data.items.length > 0) {
      _hayaRecipes = data.items.slice(0, 5).map(item => ({
        title: item.title, description: "Latest from Ola Tashman", videoUrl: item.link, img: item.thumbnail, 
        ingredients: ["Tap the link below to watch the video for exact ingredients."], tip: "Watch Full Recipe Video"
      }));
    } else { _hayaRecipes = fallback; }
  } catch(e) { _hayaRecipes = fallback; } 

  if (_hayaRecipes.length > 0) renderRecipe(_hayaRecipes[0]);
}

function changeRecipe(dir) {
  if (!_hayaRecipes.length) return;
  _hayaRecipeIdx = (_hayaRecipeIdx + dir + _hayaRecipes.length) % _hayaRecipes.length;
  renderRecipe(_hayaRecipes[_hayaRecipeIdx]);
}

function renderRecipe(recipe) {
  document.getElementById('recipe-img').src = recipe.img;
  document.getElementById('recipe-title').textContent = recipe.title;
  document.getElementById('recipe-counter').textContent = `Recipe ${_hayaRecipeIdx + 1} of ${_hayaRecipes.length}`;
  document.getElementById('recipe-ingredients').innerHTML = recipe.ingredients.map(i => `<div style="font-size:0.7rem; color:var(--muted2); padding:2px 0;">• ${i}</div>`).join('');
  const tipEl = document.getElementById('recipe-tip');
  tipEl.innerHTML = `<a href="${recipe.videoUrl}" target="_blank" style="color:var(--purple); text-decoration:none; font-weight:bold;">▶ ${recipe.tip}</a>`;
  tipEl.style.display = 'block';
}

// ─── LISTS & GOALS ────────────────────────────────────────────────────────────
function addQuickItem(itemName) {
  addListItem('grocery_list', null, itemName);
  document.getElementById('quick-add-modal').style.display='none';
}

async function addListItem(key, inputId, directText = null) {
  const text = directText || document.getElementById(inputId).value.trim(); if(!text) return;
  const list = await store.get(key) || []; list.push({ id: Date.now(), text, done: false });
  await store.set(key, list); 
  if(inputId) document.getElementById(inputId).value = '';
  if(key === 'grocery_list') renderList(key, 'groc-list');
  else if(key === 'todo_mahmoud') renderTaskList('todo_mahmoud', 'm-todo-list'); 
  else if(key === 'todo_haya') renderTaskList('todo_haya', 'h-todo-list');
}

async function renderList(key, containerId) {
  const list = await store.get(key) || []; const el = document.getElementById(containerId); if(!el) return;
  el.innerHTML = list.map(item => `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);"><div style="display:flex; align-items:center; gap:8px;"><input type="checkbox" ${item.done?'checked':''} onchange="toggleItem('${key}', ${item.id})" style="accent-color:var(--accent);"><span style="font-size:0.75rem; ${item.done?'text-decoration:line-through;color:var(--muted2);':''}">${item.text}</span></div><button onclick="deleteItem('${key}', ${item.id})" style="background:transparent; border:none; cursor:pointer; color:var(--red); padding:0; font-size:0.8rem;">×</button></div>`).join('');
}

async function renderTaskList(key, containerId) {
  const list = await store.get(key) || []; const el = document.getElementById(containerId); if(!el) return;
  el.innerHTML = list.map(item => `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);"><div style="display:flex; align-items:center; gap:8px;"><input type="checkbox" onchange="deleteItem('${key}', ${item.id})" style="accent-color:var(--accent);"><span style="font-size:0.75rem;">${item.text}</span></div><button onclick="deleteItem('${key}', ${item.id})" style="background:transparent; border:none; cursor:pointer; color:var(--red); padding:0; font-size:0.8rem;">×</button></div>`).join('');
}

async function toggleItem(key, id) {
  const list = await store.get(key) || []; const item = list.find(i => i.id === id);
  if(item) { item.done = !item.done; await store.set(key, list); renderList(key, key==='grocery_list'?'groc-list':null); }
}

async function deleteItem(key, id) {
  let list = await store.get(key) || []; list = list.filter(i => i.id !== id); await store.set(key, list);
  if(key === 'grocery_list') renderList(key, 'groc-list');
  else if(key === 'todo_mahmoud') renderTaskList('todo_mahmoud', 'm-todo-list'); 
  else if(key === 'todo_haya') renderTaskList('todo_haya', 'h-todo-list');
}

async function addGoal(key, inputId) {
  const input = document.getElementById(inputId); const text = input.value.trim(); if(!text) return;
  const list = await store.get(key) || []; list.push({ id: Date.now(), text, done: false }); await store.set(key, list); input.value = ''; renderGoalPanelList(key);
}

async function renderGoalPanelList(key) {
  const list = await store.get(key) || [];
  const html = list.map(item => `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);"><div style="display:flex; align-items:center; gap:8px;"><input type="checkbox" ${item.done?'checked':''} onchange="toggleGoal('${key}', ${item.id})" style="accent-color:var(--accent);"><span style="font-size:0.75rem; ${item.done?'text-decoration:line-through;color:var(--muted2);':''}">${item.text}</span></div><button onclick="deleteGoal('${key}', ${item.id})" style="background:transparent; border:none; cursor:pointer; color:var(--red); padding:0; font-size:0.8rem;">×</button></div>`).join('');
  const map = { 'mahmoud_goals_0':'#mgoals-0', 'mahmoud_goals_1':'#mgoals-1', 'mahmoud_goals_2':'#mgoals-2', 'haya_goals_0':'#hgoals2-0', 'haya_goals_1':'#hgoals2-1', 'haya_goals_2':'#hgoals2-2' };
  const target = document.querySelector(`${map[key]} .goal-list`);
  if (target) target.innerHTML = html;
}

async function toggleGoal(key, id) { const list = await store.get(key) || []; const item = list.find(i => i.id === id); if(item) { item.done = !item.done; await store.set(key, list); renderGoalPanelList(key); } }
async function deleteGoal(key, id) { let list = await store.get(key) || []; list = list.filter(i => i.id !== id); await store.set(key, list); renderGoalPanelList(key); }

// ─── APP INITIALIZATION ───────────────────────────────────────────────────────
function initApp() {
  setInterval(() => {
    const opts = { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true };
    const clk = document.getElementById('live-clock'); if (clk) clk.textContent = new Date().toLocaleString('en-US', opts).replace(',', ' ·');
  }, 1000);
  
  initRealtimeSync();
  loadPrayers();
  setInterval(() => { updateCountdown(); checkAndPlayAdhan(); }, 1000);
  
  loadWeather();
  const WISDOM_DB = [
    { arabic: "مَنْ عَرَفَ نَفْسَهُ فَقَدْ عَرَفَ رَبَّهُ", english: "He who knows himself, knows his Lord.", source: "Ali ibn Abi Talib" },
    { arabic: "الصَّبْرُ مِفْتَاحُ الفَرَجِ", english: "Patience is the key to relief.", source: "Ali ibn Abi Talib" }
  ];
  const q = WISDOM_DB[Math.floor(Date.now() / 86400000) % WISDOM_DB.length];
  const wHtml = `<div style="font-family:'Instrument Serif',serif;font-size:1rem;direction:rtl;line-height:1.8;margin-bottom:8px;color:var(--gold);">${q.arabic}</div><div style="font-family:'Montserrat',sans-serif;font-size:0.72rem;font-style:italic;color:var(--muted2);line-height:1.5;margin-bottom:6px;">"${q.english}"</div><div style="font-family:'DM Mono',monospace;font-size:0.6rem;color:var(--muted);">— ${q.source}</div>`;
  const wm = document.getElementById('wisdom-mahmoud'); if(wm) wm.innerHTML = wHtml; 
  const wh = document.getElementById('wisdom-haya'); if(wh) wh.innerHTML = wHtml;

  refreshOutfits(); loadBeautyDeals();
  setTimeout(loadNewsBrief, 1000); setTimeout(loadRecipe, 2000);

  renderList('grocery_list', 'groc-list');
  renderTaskList('todo_mahmoud', 'm-todo-list'); renderTaskList('todo_haya', 'h-todo-list');
  ['mahmoud_goals_0','mahmoud_goals_1','mahmoud_goals_2','haya_goals_0','haya_goals_1','haya_goals_2'].forEach(renderGoalPanelList);
  renderBudget();
}
