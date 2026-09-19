/**
 * ⚠️ IMPORTANT
 * Apna Google Apps Script "Web app" deployment URL yahan paste karein.
 * (Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone)
 * URL kuch aisa dikhega:
 * https://script.google.com/macros/s/AKfycb.../exec
 */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbxtUUVGeRq6DchBqFNQAGk7q1Otgt5bGjEw41lN78hND-1GcPZVCxdFLFGFoZR-_U6mOA/exec',
  // Local cache ki muddat (ms). Isse dashboard turant khulta hai,
  // background me fresh data aa jata hai.
  CACHE_TTL: 60 * 1000,
  COMPANY_NAME: 'Simply Connect'
};
