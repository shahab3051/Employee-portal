/**
 * ⚠️ IMPORTANT
 * Apna Google Apps Script "Web app" deployment URL yahan paste karein.
 * (Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone)
 * URL kuch aisa dikhega:
 * https://script.google.com/macros/s/AKfycb.../exec
 */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzcroyXhl8z_oII5YKn09uNU26j-Dpzxe6vUX796zO_IaQBpdPAerpnOzSptnjNjNYl/exec',
  // Local cache ki muddat (ms). Isse dashboard turant khulta hai,
  // background me fresh data aa jata hai.
  CACHE_TTL: 60 * 1000,
  COMPANY_NAME: 'Simply Connect'
};
