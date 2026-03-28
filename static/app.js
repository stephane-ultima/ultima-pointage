// ═══════════════════════════════════════════════════════════════
//  ULTIMA POINTAGE — React SPA v3.0
//  Design premium — Apple-inspired HR time-tracking
//  Ultima Interior SA
// ═══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useRef, useMemo } = React;

// ─── API CLIENT ─────────────────────────────────────────────────────────

const api = {
  token: null,
  refreshToken: null,

  setTokens(access, refresh) {
    this.token = access;
    this.refreshToken = refresh;
    if (access)  localStorage.setItem('up_token', access);
    if (refresh) localStorage.setItem('up_refresh', refresh);
  },

  loadTokens() {
    this.token = localStorage.getItem('up_token');
    this.refreshToken = localStorage.getItem('up_refresh');
  },

  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('up_token');
    localStorage.removeItem('up_refresh');
  },

  async request(method, path, data = null, retry = true) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (this.token) opts.headers['Authorization'] = `Bearer ${this.token}`;
    if (data) opts.body = JSON.stringify(data);

    let res = await fetch('/api' + path, opts);

    if (res.status === 401 && retry && this.refreshToken) {
      const r = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (r.ok) {
        const d = await r.json();
        this.setTokens(d.token, this.refreshToken);
        opts.headers['Authorization'] = `Bearer ${this.token}`;
        res = await fetch('/api' + path, opts);
      } else {
        this.clearTokens();
        window.location.reload();
        return;
      }
    }

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { error: text.startsWith('<') ? 'Erreur serveur inattendue' : text }; }
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  },

  get:    (path)         => api.request('GET', path),
  post:   (path, data)  => api.request('POST', path, data),
  patch:  (path, data)  => api.request('PATCH', path, data),
  delete: (path)         => api.request('DELETE', path),
};
