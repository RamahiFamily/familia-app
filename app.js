const CONFIG = {
  SUPABASE_URL:      'https://kyhbexbfmbtuhiddtvdb.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5aGJleGJmbWJ0dWhpZGR0dmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjY0OTgsImV4cCI6MjA5MzY0MjQ5OH0.Rv2FtqZWGtHzHieCS0SmQjnGTEdSXsqrYTYfJrwddMQ',
  WEATHER_KEY:       '7a6a9fd1087d7335ccb8d3312177225c',
  WEATHER_CITY:      'Newington,CT,US'
};

const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// ─── TAB SWITCHING FIX ────────────────────────────────────────────────────────
function switchProfile(profile, btn) {
  // Reset all buttons
  document.querySelectorAll('.profile-btn').forEach(b => {
    b.style.background = 'transparent';
    b.style.color = 'var(--muted2)';
  });
  // Highlight clicked button
  btn.style.background = 'var(--accent)';
  btn.style.color = 'var(--bg)';
  
  // Switch Dashboard view
  document.querySelectorAll('.dashboard').forEach(d => d.classList.remove('active'));
  document.getElementById('dash-' + profile).classList.add('active');
}

// ─── STORE & REALTIME SYNC (FIXED) ────────────────────────────────────────────
const store = {
  async get(key) {
    try {
      const { data } = await sb.from('familia_data').select('value').eq('key', key).maybeSingle();
      if (data) return JSON.parse(data.value);
    } catch(e) {}
    return JSON.parse(localStorage.getItem('f2_' + key));
  },
  async set(key, value) {
    const serialized = JSON.stringify(value);
    localStorage.setItem('f2_' + key, serialized);
    try {
      await sb.from('familia_data').upsert({ key: key, value: serialized, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    } catch(e) {}
  }
};

function initRealtimeSync() {
  sb.channel('familia_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'familia_data' }, (payload) => {
      const key = (payload.new && payload.new.key);
      if (!key) return;
      if (key === 'grocery_list') renderList('grocery_list', 'groc-list');
      else if (key === 'todo_mahmoud') renderTaskList('todo_mahmoud', 'm-todo-list');
      else if (key === 'todo_haya') renderTaskList('todo_haya', 'h-todo-list');
      else if (key === 'budget_items') renderBudget();
    }).subscribe();
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  var t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => t.style.transform = 'translateX(-50%) translateY(80px)', 2400);
}

// ─── MEDIA / VIDEO FIX ────────────────────────────────────────────────────────
function loadCNBC() {
  const container = document.getElementById('cnbc-container');
  if (!container) return;
  // Fixed Al Jazeera English Live Embed
  container.innerHTML = '<iframe src="https://www.youtube.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg&autoplay=1&mute=0" style="width:100%;height:100%;border:none;" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
}

// ─── PRAYER TIMES (RESTORED) ──────────────────────────────────────────────────
window.prayerTimings = null;
async function loadPrayers() {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=Newington&country=US&method=2`);
    const data = await res.json();
    if(data.data && data.data.timings) {
      window.prayerTimings = data.data.timings;
      const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      const grid = document.getElementById('prayer-grid');
      grid.innerHTML = prayers.map(name => {
        let [h,m] = data.data.timings[name].split(':'); let hh = parseInt(h); const ampm = hh >= 12 ? 'PM' : 'AM'; hh = hh % 12 || 12;
        return `<div class="prayer-item" data-name="${name}" style="display:flex; justify-content:space-between; font-family:'DM Mono',monospace; font-size:0.75rem; padding:6px; background:var(--card2); border-radius:6px;"><span style="color:var(--muted2);">${name}</span><span>${hh}:${m} ${ampm}</span></div>`;
      }).join('');
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
    const hrs = Math.floor(minDiff/3600000); const mins = Math.floor((minDiff%3600000)/60000);
    document.getElementById('prayer-countdown').innerHTML = `<div style="font-family:'Syne',sans-serif; font-size:0.7rem; text-transform:uppercase; color:var(--text); margin-bottom:4px;">Next: <span style="color:var(--gold);">${next}</span></div><div style="font-family:'DM Mono',monospace; font-size:1.1rem; color:var(--text);">${hrs}h ${mins}m</div>`;
    document.querySelectorAll('.prayer-item').forEach(el => {
      el.style.borderLeft = el.dataset.name === next ? '2px solid var(--gold)' : 'none';
    });
  }
}

// ─── BUDGET (RESTORED) ────────────────────────────────────────────────────────
async function addBudgetCat() {
  const name = document.getElementById('b-name').value; const amount = parseFloat(document.getElementById('b-amount').value);
  if (!name || isNaN(amount)) return;
  const b = await store.get('budget_items') || [];
  b.push({name, amount, id: Date.now()}); 
  await store.set('budget_items', b);
  document.getElementById('b-name').value = ''; document.getElementById('b-amount').value = ''; renderBudget();
}

async function renderBudget() {
  let b = await store.get('budget_items') || [];
  const total = b.reduce((s, i) => s + i.amount, 0); 
  document.getElementById('budget-total').textContent = '$' + total.toLocaleString();
  document.getElementById('budget-list').innerHTML = b.map(item => { 
    const pct = total > 0 ? (item.amount / total * 100).toFixed(1) : 0; 
    return `<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;font-size:0.7rem;margin-bottom:4px;"><span>${item.name}</span><span style="font-family:'DM Mono',monospace;color:var(--muted2);">$${item.amount.toLocaleString()}</span></div><div style="width:100%;height:4px;background:var(--card2);border-radius:2px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:var(--accent);"></div></div></div>`; 
  }).join('');
}

// ─── WISDOM ───────────────────────────────────────────────────────────────────
const WISDOM_DB = [
  { arabic: "مَنْ عَرَفَ نَفْسَهُ فَقَدْ عَرَفَ رَبَّهُ", english: "He who knows himself, knows his Lord.", source: "Ali ibn Abi Talib" },
  { arabic: "دَعِ الأَيَّامَ تَفْعَلُ مَا تَشَاءُ", english: "Let days go forth and do as they please, and remain firm when settling a decree.", source: "Imam Al-Shafi'i" },
  { arabic: "الصَّبْرُ مِفْتَاحُ الفَرَجِ", english: "Patience is the key to relief.", source: "Ali ibn Abi Talib" },
  { arabic: "مَا حَكَّ جِلْدَكَ مِثْلُ ظُفْرِكَ", english: "Nothing scratches your skin better than your own nail.", source: "Imam Al-Shafi'i" }
];
function loadWisdom() {
  const quote = WISDOM_DB[Math.floor(Date.now() / 86400000) % WISDOM_DB.length];
  const html = `<div style="font-family:'Instrument Serif',serif;font-size:1rem;direction:rtl;line-height:1.8;margin-bottom:8px;color:var(--gold);">${quote.arabic}</div><div style="font-family:'Montserrat',sans-serif;font-size:0.72rem;font-style:italic;color:var(--muted2);line-height:1.5;margin-bottom:6px;">"${quote.english}"</div><div style="font-family:'DM Mono',monospace;font-size:0.6rem;color:var(--muted);">— ${quote.source}</div>`;
  document.getElementById('wisdom-mahmoud').innerHTML = html; document.getElementById('wisdom-haya').innerHTML = html;
}

// ─── NEWS BRIEF ───────────────────────────────────────────────────────────────
async function loadNewsBrief() {
  try {
    // Using a more reliable proxy for XML parsing
    const proxy = 'https://api.allorigins.win/get?url=';
    const resWorld = await fetch(proxy + encodeURIComponent('http://feeds.bbci.co.uk/news/world/rss.xml'));
    const dataWorld = await resWorld.json();
    const xmlWorld = new DOMParser().parseFromString(dataWorld.contents, "text/xml");
    const worldTitle = xmlWorld.querySelector('item title').textContent;

    document.getElementById('news-brief').innerHTML = `
      <div><b>🌍 World:</b> <span style="color:var(--muted2);">${worldTitle}</span></div>
      <div style="font-size:0.6rem; color:var(--muted); margin-top:5px; text-align:right;">Live BBC Feed</div>
    `;
  } catch(e) {
    document.getElementById('news-brief').innerHTML = '<span style="color:var(--red)">Feed unavailable.</span>';
  }
}

// ─── LTK OUTFITS (REFRESHABLE) ────────────────────────────────────────────────
const LTK_IMAGES = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80',
  'https://images.unsplash.com/photo-1434389678369-182fc221ac11?w=400&q=80',
  'https://images.unsplash.com/photo-1485230895905-eb56f66378ea?w=400&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80',
  'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=400&q=80',
  'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=400&q=80',
  'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=400&q=80'
];

function refreshLTK() {
  const el = document.getElementById('outfits-container');
  // Shuffle array to get 4 random looks
  const shuffled = LTK_IMAGES.sort(() => 0.5 - Math.random()).slice(0, 4);
  
  el.innerHTML = shuffled.map(img => `
    <div style="flex-shrink:0;width:120px;background:var(--card2);border-radius:10px;overflow:hidden;border:1px solid var(--border);">
      <img src="${img}" style="width:100%;height:160px;object-fit:cover;display:block;">
      <div style="padding:8px; text-align:center;">
        <div style="font-family:'Syne',sans-serif;font-size:0.6rem;font-weight:700;color:var(--text);">Zara / H&M Style</div>
      </div>
    </div>
  `).join('');
}

// ─── OLA TASHMAN RECIPES (FIXED) ──────────────────────────────────────────────
var _hayaRecipes = [];
var _hayaRecipeIdx = 0;

async function loadRecipe() {
  try {
    // YouTube blocks direct fetch, using allorigins proxy wrapper
    const channelId = 'UChnE0G0QoWn-z1X1T3A97-g'; 
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId)}`);
    const data = await res.json();
    const xml = new DOMParser().parseFromString(data.contents, "text/xml");
    const entries = Array.from(xml.querySelectorAll("entry"));

    _hayaRecipes = entries.slice(0, 5).map(entry => {
      const title = entry.querySelector("title").textContent;
      const link = entry.querySelector("link").getAttribute("href");
      const mediaGroup = entry.getElementsByTagNameNS("*", "group")[0];
      const thumb = mediaGroup ? mediaGroup.getElementsByTagNameNS("*", "thumbnail")[0].getAttribute("url") : "";
      
      return {
        title: title, description: "Latest from Ola Tashman",
        videoUrl: link, img: thumb,
        ingredients: ["Tap the link below to watch the video for exact measurements."],
        tip: "Watch Full Recipe Video"
      };
    });

    if (_hayaRecipes.length > 0) renderRecipe(_hayaRecipes[0]);
  } catch(e) {
    document.getElementById('recipe-title').textContent = "Failed to load channel data.";
  }
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
  document.getElementById('recipe-ingredients').innerHTML = recipe.ingredients.map(i => `<div style="font-size:0.7rem; color:var(--muted2);">${i}</div>`).join('');
  
  const tipEl = document.getElementById('recipe-tip');
  tipEl.innerHTML = `<a href="${recipe.videoUrl}" target="_blank" style="color:var(--purple); text-decoration:none; font-weight:bold;">▶ ${recipe.tip}</a>`;
  tipEl.style.display = 'block';
}

// ─── LISTS & TODOS (WITH QUICK ADD) ───────────────────────────────────────────
async function addListItem(key, inputId, directText = null) {
  const text = directText || document.getElementById(inputId).value.trim(); 
  if(!text) return;
  
  const list = await store.get(key) || []; 
  list.push({ id: Date.now(), text, done: false });
  await store.set(key, list); 
  
  if(inputId) document.getElementById(inputId).value = '';
  
  if(key === 'grocery_list') renderList(key, 'groc-list');
  else if(key === 'todo_mahmoud') renderTaskList('todo_mahmoud', 'm-todo-list'); 
  else if(key === 'todo_haya') renderTaskList('todo_haya', 'h-todo-list');
}

// Helper for the new Popup buttons
function addQuickItem(itemName) {
  addListItem('grocery_list', null, itemName);
  showToast(itemName + " added ✓");
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
  
  loadWisdom();
  renderBudget();
  refreshLTK();
  setTimeout(loadNewsBrief, 1000);
  setTimeout(loadRecipe, 2000);

  renderList('grocery_list', 'groc-list');
  renderTaskList('todo_mahmoud', 'm-todo-list');
  renderTaskList('todo_haya', 'h-todo-list');
}
