// FORCED CACHE CLEAR (Runs once upon upgrading to this new file)
if (!localStorage.getItem('v9_cache_clear_done')) {
  localStorage.removeItem('gemini_wisdom_' + new Date().toDateString());
  localStorage.removeItem('gemini_outfits_' + new Date().toDateString());
  localStorage.removeItem('gemini_recipes_array_' + new Date().toDateString());
  // Clear all AI cache to force fresh data
  const keys = Object.keys(localStorage);
  keys.forEach(k => {
    if (k.startsWith('f2_ai_')) localStorage.removeItem(k);
  });
  localStorage.setItem('v9_cache_clear_done', '1');
}

const CONFIG = {
  SUPABASE_URL:      'https://kyhbexbfmbtuhiddtvdb.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5aGJleGJmbWJ0dWhpZGR0dmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjY0OTgsImV4cCI6MjA5MzY0MjQ5OH0.Rv2FtqZWGtHzH[...]',
  PASSWORD:          'familia2024',
  WEATHER_KEY:       '7a6a9fd1087d7335ccb8d3312177225c',
  WEATHER_CITY:      'Newington,CT,US',
  PHONE:             '1860798577',
  SLIDESHOW_SPEED:   5000,
};

// ... rest of your code before initApp remains unchanged

// Add this error handler for initialization feedback
function showInitError(section, err) {
  const msg = `Error in ${section}: ${err && err.message ? err.message : err}`;
  if (window.showToast) showToast(msg);
  if (window.console) console.error(msg, err);
}

// ─── INIT ────────────────────────────────────────────────────────────
async function initApp() {
  try {
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

    // ═══ OPTIMIZED AI LOADER ═══
    console.log('🚀 Loading Familia...');
    setTimeout(() => loadAllWisdom().catch(e => showInitError('Wisdom', e)), 0);
    setTimeout(() => loadNewsBrief().catch(e => showInitError('NewsBrief', e)), 3000);
    setTimeout(() => loadDeals().catch(e => showInitError('Deals', e)), 6000);
    setTimeout(() => loadOutfits(false).catch(e => showInitError('Outfits', e)), 9000);
    setTimeout(() => loadRecipe().catch(e => showInitError('Recipe', e)), 12000);

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
  } catch(e) {
    showInitError('Main', e);
    alert('App failed to initialize. See the console.');
    console.error(e);
  }
}

// ... rest of your code remains unchanged
