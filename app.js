const CONFIG = {
  SUPABASE_URL:      'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
  PASSWORD:          'familia2024',
  WEATHER_KEY:       '7a6a9fd1087d7335ccb8d3312177225c',
  WEATHER_CITY:      'Newington,CT,US',
  GEMINI_KEY:        'AIzaSyAgN-feorApI-pbPh1iT__kCjnVlTXsq7A'
};

const store = {
  async get(key) {
    var v = localStorage.getItem('f2_' + key);
    return v ? JSON.parse(v) : null;
  },
  async set(key, value) {
    localStorage.setItem('f2_' + key, JSON.stringify(value));
  }
};

async function callGemini(prompt, tokens) {
  if (CONFIG.GEMINI_KEY.includes('PASTE_YOUR_NEW')) return { error: "Key not set in app.js" };
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + CONFIG.GEMINI_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json", maxOutputTokens: tokens||1000 }})
    });
    const d = await r.json();
    if (d.error) return { error: d.error.message };
    return { text: d.candidates[0].content.parts[0].text };
  } catch(e) { return { error: "Network Error" }; }
}

function updateClock() {
  const n = new Date();
  document.getElementById('live-clock').textContent = n.toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true }).replace(',',' ·');
}

// LATEST BRIEF LOGIC (6, 11, 3, 6, 11)
function getBriefKey() {
  const h = new Date().getHours();
  let b = 23;
  if (h < 6) b = 23; else if (h < 11) b = 6; else if (h < 15) b = 11; else if (h < 18) b = 15; else if (h < 23) b = 18;
  return 'gem_brief_' + new Date().toDateString() + '_' + b;
}

async function loadNewsBrief() {
  const k = getBriefKey(); const cached = localStorage.getItem(k); const el = document.getElementById('news-brief');
  if (cached) { el.innerHTML = cached; return; }
  el.innerHTML = "<i>Generating fresh summary...</i>";
  const p = "Provide a news briefing with 4 JSON keys: 'world', 'economy', 'soccer', 'cars'. Each value must be 2-3 sentences of current events.";
  const res = await callGemini(p, 800);
  if (res.text) {
    try {
      const d = JSON.parse(res.text);
      const html = `<b>World:</b> ${d.world}<br><br><b>Economy:</b> ${d.economy}<br><br><b>Soccer:</b> ${d.soccer}<br><br><b>Cars:</b> ${d.cars}`;
      localStorage.setItem(k, html); el.innerHTML = html;
    } catch(e) { el.innerHTML = "Parse Error"; }
  } else el.innerHTML = res.error;
}

async function loadIslamicWisdom(id) {
  const k = 'gem_wisdom_' + (new Date().getHours() < 6 ? 'prev' : 'today') + new Date().toDateString();
  const cached = localStorage.getItem(k); const el = document.getElementById(id);
  if (cached) { el.innerHTML = cached; return; }
  const p = "Give one Islamic wisdom from Ali bin Abi Taleb or Al Shafi'i. JSON keys: 'arabic', 'english', 'source'.";
  const res = await callGemini(p, 400);
  if (res.text) {
    const d = JSON.parse(res.text);
    const h = `<div style="direction:rtl; font-size:1.1rem; margin-bottom:8px;">${d.arabic}</div><div style="font-style:italic; color:var(--muted2);">${d.english}</div><div style="color:var(--gold); font-size:0.6rem; margin-top:4px;">— ${d.source}</div>`;
    localStorage.setItem(k, h); el.innerHTML = h;
  } else el.innerHTML = "Wisdom generation failed.";
}

var _recipes = []; var _recIdx = 0;
async function loadRecipes() {
  const k = 'gem_recipes_v2_' + new Date().toDateString(); const cached = localStorage.getItem(k);
  if (cached) { _recipes = JSON.parse(cached); renderRecipe(); return; }
  const p = "Generate 5 Levantine recipes inspired by Ola Tashman. Return JSON array of objects with keys: 'title', 'description', 'ingredients' (array), 'steps' (array), 'tip'.";
  const res = await callGemini(p, 3000);
  if (res.text) { _recipes = JSON.parse(res.text); localStorage.setItem(k, JSON.stringify(_recipes)); renderRecipe(); }
}

function renderRecipe() {
  const r = _recipes[_recIdx]; if (!r) return;
  const imgs = ['https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600','https://images.unsplash.com/photo-1598103442097-8b74394b95c9?w=600','https://images.unsplash.com/photo-1519676867240-f03562e64548?w=600','https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600','https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600'];
  document.getElementById('recipe-img').src = imgs[_recIdx];
  document.getElementById('recipe-counter').textContent = `Recipe ${_recIdx+1} of 5`;
  document.getElementById('recipe-details').innerHTML = `<b>${r.title}</b><p>${r.description}</p><ul>${r.ingredients.map(i=>`<li>${i}</li>`).join('')}</ul>`;
}
function changeRecipe(d) { _recIdx = (_recIdx + d + 5) % 5; renderRecipe(); }

async function loadOutfits() {
  const el = document.getElementById('outfits-container');
  const p = "List 10 women's outfit ideas for Zara/H&M. JSON array of objects: 'title', 'desc'.";
  const res = await callGemini(p, 1500);
  if (res.text) {
    const d = JSON.parse(res.text);
    el.innerHTML = d.map((o,i)=>`<div style="flex-shrink:0; width:120px; background:var(--card2); padding:8px; border-radius:8px;"><img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200" style="width:100%; border-radius:4px;"><div style="font-size:0.6rem; margin-top:4px;"><b>${o.title}</b><br>${o.desc}</div></div>`).join('');
  }
}

function loadCNBC() { document.getElementById('cnbc-container').innerHTML = '<iframe src="https://www.youtube.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg&autoplay=1&mute=1" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>'; }
function switchProfile(p, b) { document.querySelectorAll('.profile-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); document.querySelectorAll('.dashboard').forEach(x=>x.classList.remove('active')); document.getElementById('dash-'+p).classList.add('active'); }
function openSettings() { document.getElementById('settings-panel').style.right = '0'; document.getElementById('settings-overlay').style.display = 'block'; }
function closeSettings() { document.getElementById('settings-panel').style.right = '-380px'; document.getElementById('settings-overlay').style.display = 'none'; }
function checkLogin() { if(document.getElementById('login-pwd').value === CONFIG.PASSWORD) { sessionStorage.setItem('f_auth','1'); document.getElementById('login-screen').style.display='none'; initApp(); } }

async function initApp() {
  updateClock(); setInterval(updateClock, 1000);
  loadNewsBrief(); loadIslamicWisdom('wisdom-mahmoud'); loadIslamicWisdom('wisdom-haya');
  loadRecipes(); loadOutfits();
}
if(sessionStorage.getItem('f_auth')==='1') { document.getElementById('login-screen').style.display='none'; initApp(); }
