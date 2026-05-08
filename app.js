// FAMILIA DASHBOARD v7 - STAGGERED LOADER
const CONFIG = {
  SUPABASE_URL:      'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
  PASSWORD:          'familia2024',
  WEATHER_KEY:       '7a6a9fd1087d7335ccb8d3312177225c',
  WEATHER_CITY:      'Newington,CT,US',
  // IMPORTANT: GET A NEW KEY FROM AI STUDIO AND PASTE IT BELOW
  GEMINI_KEY:        'AIzaSyBvVrZVqjDXgt3QqQcDlb-c9YWbW4VweZg'
};

// ----------------------------------------------------
// AI RATE-LIMIT PROTECTION (RPM Safeguard)
// This delays each request by 2 seconds to avoid quota errors.
// ----------------------------------------------------
const requestQueue = [];
let isProcessingQueue = false;

async function addToQueue(callback) {
  requestQueue.push(callback);
  if (!isProcessingQueue) processQueue();
}

async function processQueue() {
  if (requestQueue.length === 0) { isProcessingQueue = false; return; }
  isProcessingQueue = true;
  const task = requestQueue.shift();
  await task();
  await new Promise(r => setTimeout(r, 2200)); // 2.2 second breather
  processQueue();
}

async function callGemini(prompt, tokens) {
  if (CONFIG.GEMINI_KEY.includes('PASTE_YOUR_NEW')) return { error: "Key not set in app.js line 11" };
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + CONFIG.GEMINI_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json", maxOutputTokens: tokens||1000 }})
    });
    const d = await r.json();
    if (d.error) return { error: d.error.message };
    return { text: d.candidates[0].content.parts[0].text };
  } catch(e) { return { error: "Network Error" }; }
}

// ----------------------------------------------------
// UI & CLOCK
// ----------------------------------------------------
function updateClock() {
  const n = new Date();
  document.getElementById('live-clock').textContent = n.toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true }).replace(',',' ·');
}

// ----------------------------------------------------
// WISDOM (Mahmoud & Haya)
// ----------------------------------------------------
async function loadIslamicWisdom(id) {
  const k = 'gem_wisdom_' + (new Date().getHours() < 6 ? 'prev_' : 'today_') + new Date().toDateString();
  const cached = localStorage.getItem(k); 
  const el = document.getElementById(id);
  if (!el) return;

  if (cached) { el.innerHTML = cached; return; }
  
  addToQueue(async () => {
    const p = "Give one authentic Islamic wisdom from Ali bin Abi Taleb or Al Shafi'i. Return JSON: {'arabic':'...','english':'...','source':'...'}";
    const res = await callGemini(p, 400);
    if (res.text) {
      const d = JSON.parse(res.text);
      const h = `<div style="direction:rtl; font-size:1.1rem; margin-bottom:8px;">${d.arabic}</div><div style="font-style:italic; color:var(--muted2); font-size:0.75rem;">${d.english}</div><div style="color:var(--gold); font-size:0.6rem; margin-top:4px;">— ${d.source}</div>`;
      localStorage.setItem(k, h); el.innerHTML = h;
    } else { el.innerHTML = `<span style="color:var(--red); font-size:0.6rem;">${res.error}</span>`; }
  });
}

// ----------------------------------------------------
// NEWS BRIEF (Schedule logic: 6, 11, 3, 6, 11)
// ----------------------------------------------------
function getBriefKey() {
  const h = new Date().getHours();
  let b = 23;
  if (h < 6) b = 23; else if (h < 11) b = 6; else if (h < 15) b = 11; else if (h < 18) b = 15; else if (h < 23) b = 18;
  return 'gem_brief_v7_' + new Date().toDateString() + '_' + b;
}

async function loadNewsBrief() {
  const k = getBriefKey(); const cached = localStorage.getItem(k); const el = document.getElementById('news-brief');
  if (!el) return;
  if (cached) { el.innerHTML = cached; return; }

  addToQueue(async () => {
    const p = "Provide a news brief with 4 JSON keys: 'world', 'economy', 'soccer', 'cars'. Use 2 sentences of real news for each.";
    const res = await callGemini(p, 800);
    if (res.text) {
      const d = JSON.parse(res.text);
      const html = `<div style="margin-bottom:8px;"><b>World:</b> ${d.world}</div><div style="margin-bottom:8px;"><b>Economy:</b> ${d.economy}</div><div style="margin-bottom:8px;"><b>Soccer:</b> ${d.soccer}</div><div><b>Cars:</b> ${d.cars}</div>`;
      localStorage.setItem(k, html); el.innerHTML = html;
    } else { el.innerHTML = res.error; }
  });
}

// ----------------------------------------------------
// RECIPES (Haya Carousel)
// ----------------------------------------------------
let _recipes = []; let _recIdx = 0;
async function loadRecipes() {
  const k = 'gem_recipes_v7_' + new Date().toDateString(); 
  const cached = localStorage.getItem(k);
  if (cached) { _recipes = JSON.parse(cached); renderRecipe(); return; }

  addToQueue(async () => {
    const p = "Generate 5 Levantine recipes inspired by Ola Tashman. Return JSON array of objects: 'title', 'description', 'ingredients' (array).";
    const res = await callGemini(p, 2000);
    if (res.text) { 
      _recipes = JSON.parse(res.text); 
      localStorage.setItem(k, JSON.stringify(_recipes)); 
      renderRecipe(); 
    }
  });
}

function renderRecipe() {
  const r = _recipes[_recIdx]; if (!r) return;
  const imgs = ['https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600','https://images.unsplash.com/photo-1598103442097-8b74394b95c9?w=600','https://images.unsplash.com/photo-1519676867240-f03562e64548?w=600','https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600','https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600'];
  document.getElementById('recipe-img').src = imgs[_recIdx % 5];
  document.getElementById('recipe-counter').textContent = `Recipe ${_recIdx+1} of 5`;
  document.getElementById('recipe-details').innerHTML = `<b style="color:var(--purple);">${r.title}</b><p style="margin:5px 0;">${r.description}</p><ul style="padding-left:15px; margin:0;">${r.ingredients.slice(0,6).map(i=>`<li>${i}</li>`).join('')}</ul>`;
}
function changeRecipe(d) { _recIdx = (_recIdx + d + 5) % 5; renderRecipe(); }

// ----------------------------------------------------
// OUTFITS (Haya Scrolling)
// ----------------------------------------------------
async function loadOutfits() {
  const el = document.getElementById('outfits-container'); if (!el) return;
  const k = 'gem_outfits_v7_' + new Date().toDateString(); const cached = localStorage.getItem(k);
  if (cached) { el.innerHTML = cached; return; }

  addToQueue(async () => {
    const p = "List 10 women outfit ideas for Zara/H&M. JSON array: 'title', 'desc'.";
    const res = await callGemini(p, 1200);
    if (res.text) {
      const d = JSON.parse(res.text);
      const h = d.map(o => `<div style="flex-shrink:0; width:120px; background:var(--card2); padding:8px; border-radius:8px;"><img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200" style="width:100%; border-radius:4px;"><div style="font-size:0.55rem; margin-top:4px;"><b>${o.title}</b><br>${o.desc}</div></div>`).join('');
      localStorage.setItem(k, h); el.innerHTML = h;
    }
  });
}

// ----------------------------------------------------
// DEALS (Home)
// ----------------------------------------------------
async function loadDeals() {
  const el = document.getElementById('deals-row'); if (!el) return;
  addToQueue(async () => {
    const p = "5 grocery deals for Sam's Club, Costco, ALDI, Price Rite, Price Chopper near Newington CT. JSON array: 'store','item','price'.";
    const res = await callGemini(p, 800);
    if (res.text) {
      const d = JSON.parse(res.text);
      el.innerHTML = d.map(x => `<div style="flex-shrink:0; background:var(--card2); padding:8px; border-radius:8px; font-size:0.6rem; min-width:100px;"><b>${x.store}</b><br>${x.item}<br><span style="color:var(--green);">${x.price}</span></div>`).join('');
    }
  });
}

// ----------------------------------------------------
// CORE FUNCTIONS
// ----------------------------------------------------
function loadCNBC() { document.getElementById('cnbc-container').innerHTML = '<iframe src="https://www.youtube.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg&autoplay=1&mute=1" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>'; }
function switchProfile(p, b) { document.querySelectorAll('.profile-btn').forEach(x=>x.style.background='transparent'); b.style.background='var(--accent)'; b.style.color='var(--bg)'; document.querySelectorAll('.dashboard').forEach(x=>x.classList.remove('active')); document.getElementById('dash-'+p).classList.add('active'); }
function openSettings() { document.getElementById('settings-panel').style.right = '0'; document.getElementById('settings-overlay').style.display = 'block'; }
function closeSettings() { document.getElementById('settings-panel').style.right = '-380px'; document.getElementById('settings-overlay').style.display = 'none'; }
function checkLogin() { if(document.getElementById('login-pwd').value === CONFIG.PASSWORD) { sessionStorage.setItem('f_auth','1'); document.getElementById('login-screen').style.display='none'; initApp(); } }

async function initApp() {
  updateClock(); setInterval(updateClock, 1000);
  // These fire into the queue one-by-one
  loadNewsBrief(); 
  loadIslamicWisdom('wisdom-mahmoud'); 
  loadIslamicWisdom('wisdom-haya');
  loadRecipes(); 
  loadOutfits(); 
  loadDeals();
}

if(sessionStorage.getItem('f_auth')==='1') { document.getElementById('login-screen').style.display='none'; initApp(); }
