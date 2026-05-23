const CONFIG = {
  SUPABASE_URL:      'https://kyhbexbfmbtuhiddtvdb.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5aGJleGJmbWJ0dWhpZGR0dmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjY0OTgsImV4cCI6MjA5MzY0MjQ5OH0.Rv2FtqZWGtHzHieCS0SmQjnGTEdSXsqrYTYfJrwddMQ',
  PASSWORD:          'familia2024',
  WEATHER_KEY:       '7a6a9fd1087d7335ccb8d3312177225c',
  WEATHER_CITY:      'Newington,CT,US',
  SLIDESHOW_SPEED:   5000
};

const _sbReady = CONFIG.SUPABASE_URL && CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL';
const sb = _sbReady ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;

// ─── STORE & SYNC ─────────────────────────────────────────────────────────────
const store = {
  async get(key) {
    if (sb) {
      try {
        const { data } = await sb.from('familia_data').select('value').eq('key', key).maybeSingle();
        if (data) return JSON.parse(data.value);
      } catch(e) {}
    }
    const v = localStorage.getItem('f2_' + key);
    return v ? JSON.parse(v) : null;
  },
  async set(key, value) {
    const serialized = JSON.stringify(value);
    localStorage.setItem('f2_' + key, serialized);
    if (sb) {
      try {
        await sb.from('familia_data').upsert({ key: key, value: serialized, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      } catch(e) {}
    }
  }
};

function syncRenderKey(key) {
  if (key === 'grocery_list') { renderList('grocery_list', 'groc-list'); loadDeals(); }
  else if (key === 'todo_mahmoud') renderTaskList('todo_mahmoud', 'm-todo-list');
  else if (key === 'todo_haya') renderTaskList('todo_haya', 'h-todo-list');
  else if (key === 'budget_items') renderBudget();
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  var t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => t.style.transform = 'translateX(-50%) translateY(80px)', 2400);
}

async function fetchRSS(url) {
  try {
    const proxy = 'https://corsproxy.io/?' + encodeURIComponent(url);
    const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    return Array.from(xml.querySelectorAll("item, entry"));
  } catch (e) {
    console.error("RSS Fetch Error:", e);
    return [];
  }
}

// ─── UI CONTROLS ──────────────────────────────────────────────────────────────
function switchProfile(profile, btn) {
  document.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.dashboard').forEach(d => d.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('dash-' + profile).classList.add('active');
}
function openSettings() { document.getElementById('settings-panel').style.right = '0'; document.getElementById('settings-overlay').style.display = 'block'; }
function closeSettings() { document.getElementById('settings-panel').style.right = '-380px'; document.getElementById('settings-overlay').style.display = 'none'; }
function checkLogin() {
  if (document.getElementById('login-pwd').value === CONFIG.PASSWORD) {
    sessionStorage.setItem('f_auth', '1'); document.getElementById('login-screen').style.display = 'none'; initApp();
  } else { document.getElementById('login-err').textContent = 'Incorrect password.'; }
}

// ─── TIME & WEATHER ───────────────────────────────────────────────────────────
function updateClock() {
  const opts = { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true };
  document.getElementById('live-clock').textContent = new Date().toLocaleString('en-US', opts).replace(',', ' ·');
}

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

// ─── WISDOM (SEEDED DATABASE APPROACH) ────────────────────────────────────────
const WISDOM_DB = [
  { arabic: "مَنْ عَرَفَ نَفْسَهُ فَقَدْ عَرَفَ رَبَّهُ", english: "He who knows himself, knows his Lord.", source: "Ali ibn Abi Talib" },
  { arabic: "دَعِ الأَيَّامَ تَفْعَلُ مَا تَشَاءُ", english: "Let days go forth and do as they please, and remain firm when settling a decree.", source: "Imam Al-Shafi'i" },
  { arabic: "الصَّبْرُ مِفْتَاحُ الفَرَجِ", english: "Patience is the key to relief.", source: "Ali ibn Abi Talib" },
  { arabic: "مَا حَكَّ جِلْدَكَ مِثْلُ ظُفْرِكَ", english: "Nothing scratches your skin better than your own nail (rely on yourself).", source: "Imam Al-Shafi'i" },
  { arabic: "رُبَّمَا كَانَ السُّكُوتُ جَوَاباً", english: "Sometimes silence is an answer.", source: "Ali ibn Abi Talib" }
];

function loadWisdom() {
  // Use days since epoch as a seed so it changes daily but is exactly the same on all devices
  const daySeed = Math.floor(Date.now() / 86400000);
  const quote = WISDOM_DB[daySeed % WISDOM_DB.length];
  
  const html = `<div style="font-family:'Instrument Serif',serif;font-size:1rem;direction:rtl;line-height:1.8;margin-bottom:8px;color:var(--gold);">${quote.arabic}</div>
                <div style="font-family:'Montserrat',sans-serif;font-size:0.72rem;font-style:italic;color:var(--muted2);line-height:1.5;margin-bottom:6px;">"${quote.english}"</div>
                <div style="font-family:'DM Mono',monospace;font-size:0.6rem;color:var(--muted);">— ${quote.source}</div>`;
  
  document.getElementById('wisdom-mahmoud').innerHTML = html;
  document.getElementById('wisdom-haya').innerHTML = html;
}

// ─── NEWS BRIEF (LIVE RSS) ────────────────────────────────────────────────────
async function loadNewsBrief() {
  const el = document.getElementById('news-brief');
  try {
    // Fetch 3 different feeds in parallel
    const [worldFeed, soccerFeed] = await Promise.all([
      fetchRSS('http://feeds.bbci.co.uk/news/world/rss.xml'),
      fetchRSS('https://www.espn.com/espn/rss/soccer/news')
    ]);

    const world = worldFeed[0] ? worldFeed[0].querySelector('title').textContent : "World news unavailable";
    const soccer = soccerFeed[0] ? soccerFeed[0].querySelector('title').textContent : "Soccer news unavailable";

    el.innerHTML = `
      <div><b>🌍 World:</b> <span style="color:var(--muted2);">${world}</span></div>
      <div><b>⚽ Soccer:</b> <span style="color:var(--muted2);">${soccer}</span></div>
      <div style="font-size:0.6rem; color:var(--muted); margin-top:5px; text-align:right;">Live RSS Feed Data</div>
    `;
  } catch(e) {
    el.innerHTML = '<span style="color:var(--red)">Failed to load live feeds.</span>';
  }
}

// ─── LOCAL GROCERY DEALS (LIST MATCHER) ───────────────────────────────────────
async function loadDeals() {
  const el = document.getElementById('deals-row');
  const list = await store.get('grocery_list') || [];
  
  // This simulates a local API response for Newington area stores
  const localCirculars = [
    { keywords: ["milk"], deal: "Whole Milk 1 Gal - $2.99", store: "ALDI Newington" },
    { keywords: ["chicken", "breast"], deal: "Chicken Breast - $1.99/lb", store: "Price Rite Wethersfield" },
    { keywords: ["eggs"], deal: "Large Eggs 2 Dozen - $4.49", store: "Costco New Britain" },
    { keywords: ["rice", "basmati"], deal: "Basmati Rice 20lb - $15.99", store: "Sam's Club Newington" },
    { keywords: ["coffee"], deal: "Dunkin Ground Coffee - $7.99", store: "Stop & Shop" }
  ];

  let matchedDeals = [];
  list.forEach(item => {
    const text = item.text.toLowerCase();
    localCirculars.forEach(circ => {
      if (circ.keywords.some(kw => text.includes(kw)) && !matchedDeals.includes(circ)) {
        matchedDeals.push(circ);
      }
    });
  });

  if (matchedDeals.length === 0) {
    el.innerHTML = '<div style="font-size:0.65rem; color:var(--muted2);">Add common items to your list to see local matches.</div>';
    return;
  }

  el.innerHTML = matchedDeals.map(d => `
    <div style="background:var(--card2); border:1px solid var(--border); border-radius:6px; padding:8px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:0.68rem;color:var(--text);">${d.deal}</div>
        <div style="font-family:'DM Mono',monospace;font-size:0.55rem;color:var(--accent);">${d.store}</div>
      </div>
      <div style="color:var(--green); font-size:0.8rem;">✓</div>
    </div>
  `).join('');
}

// ─── TRENDING OUTFITS (PINTEREST RSS) ─────────────────────────────────────────
async function loadOutfits() {
  const el = document.getElementById('outfits-container');
  // Fetching a public Pinterest RSS feed for fashion
  const items = await fetchRSS('https://www.pinterest.com/pinterest/fashion.rss');
  
  if (!items || items.length === 0) {
    el.innerHTML = '<span style="color:var(--red);font-size:0.7rem;padding:10px;">Failed to load outfits feed.</span>';
    return;
  }

  el.innerHTML = items.slice(0, 10).map(item => {
    const title = item.querySelector('title').textContent;
    const link = item.querySelector('link').textContent;
    const descHTML = item.querySelector('description').textContent;
    
    // Extract the image URL from the Pinterest description HTML
    const imgMatch = descHTML.match(/src="([^"]+)"/);
    const imgSrc = imgMatch ? imgMatch[1] : '';

    if(!imgSrc) return '';

    return `<a href="${link}" target="_blank" style="flex-shrink:0;width:120px;background:var(--card2);border-radius:10px;overflow:hidden;border:1px solid var(--border);text-decoration:none;display:block;">
      <img src="${imgSrc}" style="width:100%;height:150px;object-fit:cover;display:block;">
      <div style="padding:8px;">
        <div style="font-family:'Syne',sans-serif;font-size:0.6rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
      </div>
    </a>`;
  }).join('');
}

// ─── BEAUTY DEALS (SLICKDEALS RSS) ────────────────────────────────────────────
async function loadBeautyDeals() {
  const el = document.getElementById('beauty-deals-container');
  // Querying Slickdeals specifically for Sephora or Ulta
  const items = await fetchRSS('https://slickdeals.net/newsearch.php?q=sephora+OR+ulta+OR+dior&searcharea=deals&searchin=first&rss=1');
  
  if (!items || items.length === 0) {
    el.innerHTML = '<span style="color:var(--muted2);font-size:0.7rem;">No active deals found right now.</span>';
    return;
  }

  el.innerHTML = items.slice(0, 4).map(item => {
    const title = item.querySelector('title').textContent;
    const link = item.querySelector('link').textContent;
    
    return `<a href="${link}" target="_blank" style="background:var(--card2); border:1px solid var(--border); border-radius:6px; padding:10px; text-decoration:none; display:block; transition:border-color 0.2s;">
      <div style="font-family:'Syne',sans-serif;font-size:0.68rem;color:var(--text);margin-bottom:4px;line-height:1.3;">${title}</div>
      <div style="font-family:'DM Mono',monospace;font-size:0.55rem;color:var(--pink);text-transform:uppercase;">View Deal on Slickdeals ↗</div>
    </a>`;
  }).join('');
}

// ─── YOUTUBE RECIPES (OLA TASHMAN) ────────────────────────────────────────────
var _hayaRecipes = [];
var _hayaRecipeIdx = 0;

async function loadRecipe() {
  const channelId = 'UChnE0G0QoWn-z1X1T3A97-g'; // Ola Tashman ID
  const entries = await fetchRSS('https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId);
  
  if (!entries || entries.length === 0) return;

  _hayaRecipes = entries.slice(0, 10).map(entry => {
    const title = entry.querySelector("title").textContent;
    const link = entry.querySelector("link").getAttribute("href");
    
    const mediaGroup = entry.getElementsByTagNameNS("*", "group")[0];
    const description = mediaGroup ? mediaGroup.getElementsByTagNameNS("*", "description")[0].textContent : "";
    const thumbnail = mediaGroup ? mediaGroup.getElementsByTagNameNS("*", "thumbnail")[0].getAttribute("url") : "";

    // Parse the wall of text based on line length
    const lines = description.split('\n').map(l => l.trim()).filter(l => l.length > 2 && !l.includes('http') && !l.includes('#'));
    let ingredients = []; let steps = [];

    lines.forEach(line => {
      if (line.length < 45) ingredients.push(line);
      else steps.push(line);
    });

    return {
      title: title,
      description: "Authentic recipe straight from YouTube",
      ingredients: ingredients.length ? ingredients : ["Watch video for ingredients"],
      steps: steps.length ? steps : ["Tap the tip below to watch the recipe steps!"],
      tip: "Tap here to watch on YouTube",
      videoUrl: link,
      img: thumbnail
    };
  });

  if (_hayaRecipes.length > 0) renderRecipe(_hayaRecipes[_hayaRecipeIdx]);
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
  
  document.getElementById('recipe-img').src = recipe.img;
  document.getElementById('recipe-title').textContent = recipe.title;
  document.getElementById('recipe-desc').textContent = recipe.description;
  document.getElementById('recipe-counter').textContent = `Recipe ${_hayaRecipeIdx + 1} of ${_hayaRecipes.length}`;
  
  document.getElementById('recipe-ingredients').innerHTML = recipe.ingredients.map(i => `<div style="padding:4px 0;border-bottom:1px solid var(--border);font-family:'Montserrat',sans-serif;font-size:0.72rem;">• ${i}</div>`).join('');
  document.getElementById('recipe-steps').innerHTML = recipe.steps.map((s, i) => `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);"><span style="font-family:'DM Mono',monospace;font-size:0.65rem;color:var(--purple);font-weight:600;flex-shrink:0;">${i+1}.</span><span style="font-family:'Montserrat',sans-serif;font-size:0.72rem;line-height:1.45;">${s}</span></div>`).join('');
  
  const tipEl = document.getElementById('recipe-tip');
  tipEl.innerHTML = `<a href="${recipe.videoUrl}" target="_blank" style="color:var(--purple); text-decoration:none;">💡 <em>${recipe.tip} ↗</em></a>`;
  tipEl.style.display = 'block';

  window._recipeIngredients = recipe.ingredients || [];
}

async function addRecipeIngredients() {
  const items = window._recipeIngredients || [];
  if (!items.length || items[0] === "Watch video for ingredients") { showToast('No parseable ingredients to add'); return; }
  const list = await store.get('grocery_list') || [];
  let added = 0;
  items.forEach(item => {
    if (!list.find(i => i.text === item)) { list.push({ id: Date.now() + added, text: item, done: false }); added++; }
  });
  await store.set('grocery_list', list);
  renderList('grocery_list', 'groc-list');
  loadDeals(); // Re-trigger local deal scanner
  showToast(`${added} ingredients added ✓`);
}

// ─── LISTS & TODOS ────────────────────────────────────────────────────────────
async function addListItem(key, inputId) {
  const input = document.getElementById(inputId); const text = input.value.trim(); if(!text) return;
  const list = await store.get(key) || []; list.push({ id: Date.now(), text, done: false });
  await store.set(key, list); input.value = '';
  if(key === 'grocery_list') { renderList(key, 'groc-list'); loadDeals(); }
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
  if(key === 'grocery_list') { renderList(key, 'groc-list'); loadDeals(); }
  else if(key === 'todo_mahmoud') renderTaskList('todo_mahmoud', 'm-todo-list'); 
  else if(key === 'todo_haya') renderTaskList('todo_haya', 'h-todo-list');
}

// ─── INITIALIZATION ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('f_auth') === '1') {
    document.getElementById('login-screen').style.display = 'none';
    initApp();
  }
});

function initApp() {
  updateClock(); setInterval(updateClock, 60000);
  loadWeather();
  loadWisdom();
  
  // Non-blocking async loads
  setTimeout(loadNewsBrief, 1000);
  setTimeout(loadOutfits, 2000);
  setTimeout(loadBeautyDeals, 3000);
  setTimeout(loadRecipe, 4000);

  // Render initial lists
  renderList('grocery_list', 'groc-list').then(loadDeals);
  renderTaskList('todo_mahmoud', 'm-todo-list');
  renderTaskList('todo_haya', 'h-todo-list');
}
