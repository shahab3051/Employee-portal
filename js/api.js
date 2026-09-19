/**
 * API layer.
 * - GET requests go straight to the Apps Script web app (plain fetch, no
 *   preflight needed since it's a simple GET).
 * - POST requests use text/plain content-type on purpose: Apps Script web
 *   apps don't support CORS preflight (OPTIONS), so sending JSON as
 *   text/plain avoids the browser trying to preflight the request.
 * - A tiny in-memory + localStorage cache makes the dashboard feel instant
 *   on repeat visits while still refreshing from the sheet in the background.
 */

const Api = (() => {
  const memCache = new Map();

  function cacheKey(action, params) {
    return action + '::' + JSON.stringify(params || {});
  }

  function readLocalCache(key) {
    try {
      const raw = localStorage.getItem('sc_cache_' + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.t > CONFIG.CACHE_TTL) return null;
      return parsed.v;
    } catch (_) { return null; }
  }

  function writeLocalCache(key, value) {
    try {
      localStorage.setItem('sc_cache_' + key, JSON.stringify({ t: Date.now(), v: value }));
    } catch (_) { /* storage full / disabled — ignore, cache is best-effort */ }
  }

  async function get(action, params = {}, { useCache = true } = {}) {
    const key = cacheKey(action, params);

    if (useCache) {
      if (memCache.has(key)) return memCache.get(key);
      const cached = readLocalCache(key);
      if (cached) { memCache.set(key, cached); return cached; }
    }

    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) throw new Error('Network error: ' + res.status);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Request failed');

    memCache.set(key, json.data);
    writeLocalCache(key, json.data);
    return json.data;
  }

  async function post(action, payload = {}) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    });
    if (!res.ok) throw new Error('Network error: ' + res.status);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Request failed');
    invalidate();
    return json.data;
  }

  function invalidate() {
    memCache.clear();
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sc_cache_'))
        .forEach(k => localStorage.removeItem(k));
    } catch (_) {}
  }

  return {
    login: (id, password) => get('login', { id, password }, { useCache: false }),
    bootstrap: (opts) => get('bootstrap', {}, opts),
    addEmployee: (employee) => post('addEmployee', { employee }),
    updateEmployee: (row, employee) => post('updateEmployee', { row, employee }),
    deleteEmployee: (row) => post('deleteEmployee', { row }),
    addRequest: (request) => post('addRequest', { request }),
    updateRequestStatus: (row, status, approvedBy) => post('updateRequestStatus', { row, status, approvedBy }),
    markNotificationRead: (row) => post('markNotificationRead', { row }),
    invalidate
  };
})();
