const CONFIG = {
  SUPABASE_URL:      'https://kyhbexbfmbtuhiddtvdb.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5aGJleGJmbWJ0dWhpZGR0dmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjY0OTgsImV4cCI6MjA5MzY0MjQ5OH0.Rv2FtqZWGtHzHieCS0SmQjnGTEdSXsqrYTYfJrwddMQ',
  WEATHER_KEY:       '7a6a9fd1087d7335ccb8d3312177225c',
  WEATHER_CITY:      'Newington,CT,US',
  SLIDESHOW_SPEED:   5000
};

const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

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

// ─── STORE & REALTIME SYNC (FIXED SYNC) ───────────────────────────────────────
const store = {
  async get(key) {
    const local = localStorage.getItem('f2_' + key);
    if (local) return JSON.parse(local);
    try {
      const { data } = await sb.from('familia_data').select('value').eq('key', key).maybeSingle();
      if (data) { localStorage.setItem('f2_' + key, data.value); return JSON.parse(data.value); }
    } catch(e) {}
    return null;
  },
  async set(key, value) {
    const serialized = JSON.stringify(value);
    localStorage.setItem('f2_' + key, serialized);
    try { await sb.from('familia_data').upsert({ key: key, value: serialized, updated_at: new Date().toISOString() }, { onConflict: 'key' }); } catch(e) {}
  }
};

function initRealtimeSync() {
  sb.channel('familia_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'familia_data' }, (payload) => {
      const key = payload.new && payload.new.key;
      if (!key) return;
      // Force local storage update BEFORE rendering so the render function reads the new data immediately
      localStorage.setItem('f2_' + key, payload.new.value);
      if (key === 'grocery_list') renderList('grocery_list', 'groc-list');
      else if (key === 'todo_mahmoud') renderTaskList('todo_mahmoud', 'm-todo-list');
      else if (key === 'todo_haya') renderTaskList('todo_haya', 'h-todo-list');
      else if (key === 'budget_items') renderBudget();
      else if (key.includes('goals')) renderGoalPanelList(key);
    }).subscribe();
}

// ─── MEDIA SLIDESHOW (RESTORED) ───────────────────────────────────────────────
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

// ─── ADHAN UPLOAD (RESTORED) ──────────────────────────────────────────────────
function handleAdhanUpload(event) {
  var file = event.target.files && event.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) { localStorage.setItem('f_adhan', e.target.result); showToast('Adhan audio saved ✓'); };
  reader.readAsDataURL(file);
}
function testAdhan() {
  const src = localStorage.getItem('f_adhan');
  if (!src) { showToast('Upload audio first'); return; }
  let audio = new Audio(src); audio.play().catch(e => showToast('Tap screen first to enable audio'));
}

// ─── WEATHER (RESTORED) ───────────────────────────────────────────────────────
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

// ─── PRAYER TIMES (RESTORED SECONDS) ──────────────────────────────────────────
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

// ─── NEWS BRIEF (FIXED PROXY) ─────────────────────────────────────────────────
async function loadNewsBrief() {
  try {
    // Switching to rss2json which is far more stable than parsing XML through cors proxies
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

// ─── TRENDING OUTFITS & MAKEUP DEALS ──────────────────────────────────────────
const OUTFIT_IMAGES = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80', 'https://images.unsplash.com/photo-1434389678369-182fc221ac11?w=400&q=80',
  'https://images.unsplash.com/photo-1485230895905-eb56f66378ea?w=400&q=80', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80', 'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=400&q=80'
];
function refreshLTK() {
  const shuffled = OUTFIT_IMAGES.sort(() => 0.5 - Math.random()).slice(0, 4);
  document.getElementById('outfits-container').innerHTML = shuffled.map(img => `<div style="flex-shrink:0;width:120px;background:var(--card2);border-radius:10px;overflow:hidden;border:1px solid var(--border);"><img src="${img}" style="width:100%;height:160px;object-fit:cover;display:block;"></div>`).join('');
}

async function loadBeautyDeals() {
  try {
    const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fslickdeals.net%2Fnewsearch.php%3Fq%3Dsephora%2BOR%2Bulta%2BOR%2Bdior%26searcharea%3Ddeals%26searchin%3Dfirst%26rss%3D1');
    const data = await res.json();
    document.getElementById('beauty-deals-container').innerHTML = data.items.slice(0,3).map(item => `<a href="${item.link}" target="_blank" style="background:var(--card2); border:1px solid var(--border); border-radius:6px; padding:10px; text-decoration:none; display:block;">
      <div style="font-family:'Syne',sans-serif;font-size:0.68rem;color:var(--text);margin-bottom:4px;line-height:1.3;">${item.title}</div>
      <div style="font-family:'DM Mono',monospace;font-size:0.55rem;color:var(--pink);text-transform:uppercase;">View on Slickdeals ↗</div></a>`).join('');
  } catch(e) { document.getElementById('beauty-deals-container').innerHTML = '<span style="color:var(--muted2);font-size:0.7rem;">No active deals found.</span>'; }
}

// ─── LISTS & GOALS (RESTORED) ─────────────────────────────────────────────────
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
  if (key === 'mahmoud_goals_0') document.querySelector('#mgoals-0 .goal-list').innerHTML = html;
  if (key === 'mahmoud_goals_1') document.querySelector('#mgoals-1 .goal-list').innerHTML = html;
  if (key === 'mahmoud_goals_2') document.querySelector('#mgoals-2 .goal-list').innerHTML = html;
  if (key === 'haya_goals_0') document.querySelector('#hgoals2-0 .goal-list').innerHTML = html;
  if (key === 'haya_goals_1') document.querySelector('#hgoals2-1 .goal-list').innerHTML = html;
  if (key === 'haya_goals_2') document.querySelector('#hgoals2-2 .goal-list').innerHTML = html;
}

async function toggleGoal(key, id) { const list = await store.get(key) || []; const item = list.find(i => i.id === id); if(item) { item.done = !item.done; await store.set(key, list); renderGoalPanelList(key); } }
async function deleteGoal(key, id) { let list = await store.get(key) || []; list = list.filter(i => i.id !== id); await store.set(key, list); renderGoalPanelList(key); }

// ─── INITIALIZATION ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => { initApp(); });

function initApp() {
  setInterval(() => {
    const opts = { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true };
    document.getElementById('live-clock').textContent = new Date().toLocaleString('en-US', opts).replace(',', ' ·');
  }, 1000);
  
  initRealtimeSync();
  loadPrayers();
  setInterval(updateCountdown, 1000);
  
  loadWeather();
  // Simplified Wisdom init
  const WISDOM_DB = [
    { arabic: "مَنْ عَرَفَ نَفْسَهُ فَقَدْ عَرَفَ رَبَّهُ", english: "He who knows himself, knows his Lord.", source: "Ali ibn Abi Talib" },
    { arabic: "الصَّبْرُ مِفْتَاحُ الفَرَجِ", english: "Patience is the key to relief.", source: "Ali ibn Abi Talib" }
  ];
  const q = WISDOM_DB[Math.floor(Date.now() / 86400000) % WISDOM_DB.length];
  const wHtml = `<div style="font-family:'Instrument Serif',serif;font-size:1rem;direction:rtl;line-height:1.8;margin-bottom:8px;color:var(--gold);">${q.arabic}</div><div style="font-family:'Montserrat',sans-serif;font-size:0.72rem;font-style:italic;color:var(--muted2);line-height:1.5;margin-bottom:6px;">"${q.english}"</div><div style="font-family:'DM Mono',monospace;font-size:0.6rem;color:var(--muted);">— ${q.source}</div>`;
  document.getElementById('wisdom-mahmoud').innerHTML = wHtml; document.getElementById('wisdom-haya').innerHTML = wHtml;

  refreshLTK();
  setTimeout(loadNewsBrief, 1000);
  setTimeout(loadBeautyDeals, 2000);

  renderList('grocery_list', 'groc-list');
  renderTaskList('todo_mahmoud', 'm-todo-list'); renderTaskList('todo_haya', 'h-todo-list');
  ['mahmoud_goals_0','mahmoud_goals_1','mahmoud_goals_2','haya_goals_0','haya_goals_1','haya_goals_2'].forEach(renderGoalPanelList);
}
