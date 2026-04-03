// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
//  ULTIMA POINTAGE — React SPA v3.0
//  Design premium — Apple-inspired HR time-tracking
//  Ultima Interior SA
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const { useState, useEffect, useCallback, useRef, useMemo } = React;

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ API CLIENT ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

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

  get:    (path)        => api.request('GET', path),
  post:   (path, data)  => api.request('POST', path, data),
  patch:  (path, data)  => api.request('PATCH', path, data),
  delete: (path)        => api.request('DELETE', path),
};

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ CONSTANTS ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

const ACTIVITY_TYPES = {
  WORK_SITE:   { label: 'Sur chantier',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  WORK_OFFICE: { label: 'Au bureau',     color: 'bg-violet-50 text-violet-700 border-violet-200' },
  WORK_DEPOT:  { label: 'Au depot',      color: 'bg-orange-50 text-orange-700 border-orange-200' },
  TRAVEL_PRO:  { label: 'Trajet pro',    color: 'bg-sky-50 text-sky-700 border-sky-200' },
  BREAK:       { label: 'Pause',         color: 'bg-slate-50 text-slate-500 border-slate-200' },
  OTHER:       { label: 'Autre',         color: 'bg-gray-50 text-gray-600 border-gray-200' },
};

const ABSENCE_TYPES = {
  HOLIDAY:  { label: 'Vacances',    color: 'bg-sky-50 text-sky-700' },
  SICK:     { label: 'Maladie',     color: 'bg-red-50 text-red-700' },
  ACCIDENT: { label: 'Accident',    color: 'bg-orange-50 text-orange-700' },
  TRAINING: { label: 'Formation',   color: 'bg-emerald-50 text-emerald-700' },
  UNPAID:   { label: 'Non paye',    color: 'bg-gray-50 text-gray-600' },
  OTHER:    { label: 'Autre',       color: 'bg-purple-50 text-purple-700' },
};

const STATUS_COLORS = {
  PENDING:   'bg-amber-50 text-amber-700',
  APPROVED:  'bg-emerald-50 text-emerald-700',
  REJECTED:  'bg-red-50 text-red-700',
  RETURNED:  'bg-orange-50 text-orange-700',
  DRAFT:     'bg-slate-100 text-slate-500',
};

const STATUS_LABELS = {
  PENDING:  'En attente',
  APPROVED: 'Approuve',
  REJECTED: 'Refuse',
  RETURNED: 'Retourne',
  DRAFT:    'Brouillon',
};

const EMPLOYEE_TYPES = {
  MONTEUR:    'Monteur / Poseur',
  ADMIN_STAFF:'Administratif',
  MANAGER:    "Chef d'equipe",
};

// SVG icon paths (Heroicons outline)
const IC = {
  clock:      'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  check:      'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  checkPlain: 'M4.5 12.75l6 6 9-13.5',
  team:       'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  calendar:   'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z',
  absences:   'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
  account:    'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  admin:      'M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  home:       'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  bars:       'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  x:          'M6 18L18 6M6 6l12 12',
  chevLeft:   'M15.75 19.5L8.25 12l7.5-7.5',
  chevRight:  'M8.25 4.5l7.5 7.5-7.5 7.5',
  chevDown:   'M19.5 8.25l-7.5 7.5-7.5-7.5',
  plus:       'M12 4.5v15m7.5-7.5h-15',
  pencil:     'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125',
  trash:      'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  eye:        'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  logout:     'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9',
  shield:     'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  bell:       'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
  star:       'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  camera:     'M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z',
  search:     'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  lock:       'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
  warning:    'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  info:       'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
  edit:       'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  download:   'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
  play:       'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z',
  stop:       'M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z',
  briefcase:  'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z',
  truck:      'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
};

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ HELPERS ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

const fmt = {
  time: (ts) => {
    if (!ts) return '--:--';
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
  },
  date: (str) => {
    if (!str) return '';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  dateShort: (str) => {
    if (!str) return '';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
  },
  duration: (min) => {
    if (!min && min !== 0) return '--';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}min`;
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
  },
  elapsed: (startTs) => {
    if (!startTs) return '00:00:00';
    const secs = Math.floor(Date.now() / 1000) - startTs;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },
  elapsedMins: (startTs) => {
    if (!startTs) return 0;
    return Math.floor((Date.now() / 1000 - startTs) / 60);
  },
  weekday: (dayStr) => {
    if (!dayStr) return '';
    const d = new Date(dayStr + 'T12:00:00');
    return d.toLocaleDateString('fr-CH', { weekday: 'short', day: 'numeric', month: 'short' });
  },
  pct: (val, max) => max > 0 ? Math.min(100, Math.round((val / max) * 100)) : 0,
  initials: (first, last) => `${(first || '?')[0]}${(last || ' ')[0]}`.toUpperCase(),
};

function isoWeeksInYear(y) {
  const jan1 = new Date(y, 0, 1).getDay();
  const dec31 = new Date(y, 11, 31).getDay();
  return jan1 === 4 || dec31 === 4 ? 53 : 52;
}

function getISOWeek() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wk = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { week: wk, year: d.getUTCFullYear() };
}

function useInterval(callback, delay) {
  const savedCallback = useRef();
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ BASE COMPONENTS ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

// SVG icon component
function Ic({ name, size = 20, className = '' }) {
  const path = IC[name];
  if (!path) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width={size}
      height={size}
      className={className}
      style={{ flexShrink: 0 }}
    >
      {path.includes('M') && path.split(' M').length > 2
        ? path.split(' M').map((p, i) => i === 0
            ? <path key={i} strokeLinecap="round" strokeLinejoin="round" d={p} />
            : <path key={i} strokeLinecap="round" strokeLinejoin="round" d={'M' + p} />)
        : <path strokeLinecap="round" strokeLinejoin="round" d={path} />
      }
    </svg>
  );
}

function Spinner({ size = 'md' }) {
  const s = { sm: 16, md: 24, lg: 40 }[size];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" className="spin text-blue-600">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"
        strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  );
}

function Badge({ status }) {
  const cls = STATUS_COLORS[status] || 'bg-slate-100 text-slate-500';
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function Card({ children, className = '', onClick }) {
  const base = 'bg-white rounded-2xl shadow-card border border-slate-100/80';
  if (onClick) {
    return (
      <div
        className={`${base} cursor-pointer transition-all duration-150 hover:shadow-card-hover active:scale-[0.99] ${className}`}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }
  return <div className={`${base} ${className}`}>{children}</div>;
}

function Button({ children, onClick, variant = 'primary', size = 'md', disabled, loading, className = '', type = 'button' }) {
  const variants = {
    primary:   'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm',
    secondary: 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700',
    success:   'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm',
    danger:    'bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200',
    ghost:     'hover:bg-slate-100 active:bg-slate-200 text-slate-600',
    outline:   'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
  };
  const sizes = {
    xs: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    sm: 'px-3.5 py-2 text-sm rounded-xl gap-2',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-5 py-3 text-base rounded-xl gap-2.5',
    xl: 'px-6 py-4 text-base rounded-2xl gap-3',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}

function Alert({ type = 'info', title, children, onClose }) {
  const styles = {
    info:    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'info' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'checkPlain' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'warning' },
    error:   { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'x' },
  };
  const s = styles[type] || styles.info;
  return (
    <div className={`flex gap-3 px-4 py-3 rounded-xl border ${s.bg} ${s.border} slide-up`}>
      <Ic name={s.icon} size={16} className={`${s.text} mt-0.5 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold ${s.text}`}>{title}</p>}
        {children && <p className={`text-sm ${s.text} ${title ? 'mt-0.5' : ''}`}>{children}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className={`${s.text} opacity-60 hover:opacity-100 flex-shrink-0`}>
          <Ic name="x" size={14} />
        </button>
      )}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 fade-in" style={{ background: 'rgba(15,23,42,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto scale-in">
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <Ic name="x" size={16} className="text-slate-500" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, required, autoFocus, className = '', readOnly }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}{required && ' *'}</label>}
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        readOnly={readOnly}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-50 read-only:bg-slate-50 read-only:text-slate-500"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>}
      <select
        value={value || ''}
        onChange={e => onChange && onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// User avatar with initials or photo
function UserAvatar({ user, size = 'md' }) {
  const sizes = { xs: 'w-7 h-7 text-xs', sm: 'w-9 h-9 text-sm', md: 'w-11 h-11 text-base', lg: 'w-16 h-16 text-xl', xl: 'w-24 h-24 text-3xl' };
  const s = sizes[size] || sizes.md;
  const initials = fmt.initials(user.first_name, user.last_name);
  if (user.avatar_url) {
    return <img src={user.avatar_url} className={`${s} rounded-2xl object-cover flex-shrink-0`} alt={initials} />;
  }
  // Color based on initials
  const colors = ['bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700', 'bg-pink-100 text-pink-700', 'bg-cyan-100 text-cyan-700'];
  const idx = ((user.first_name || '').charCodeAt(0) || 0) % colors.length;
  return (
    <div className={`${s} ${colors[idx]} rounded-2xl flex items-center justify-center font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function ProgressRing({ value, max, size = 140, strokeWidth = 10, className = '' }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const offset = circumference * (1 - pct);
  const color = pct >= 1 ? '#10b981' : pct >= 0.7 ? '#3b82f6' : pct >= 0.4 ? '#f59e0b' : '#94a3b8';

  return (
    <svg width={size} height={size} className={className} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
      <circle
        cx={size/2} cy={size/2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease' }}
      />
    </svg>
  );
}

function ProgressBar({ value, max, color }) {
  const pct = fmt.pct(value, max);
  const barColor = color || (pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-400' : 'bg-slate-300');
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${barColor} rounded-full transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ NAVIGATION ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

function SideNav({ current, role, onNav, isOpen, onClose, user }) {
  const isManager = ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(role);
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(role);

  const tabs = isManager
    ? [
        { id: 'team',       icon: 'team',       label: 'Equipe' },
        { id: 'validation', icon: 'check',       label: 'Validation' },
        { id: 'calendar',   icon: 'calendar',    label: 'Calendrier' },
        { id: 'absences',   icon: 'absences',    label: 'Absences' },
        ...(isAdmin ? [{ id: 'admin', icon: 'admin', label: 'Administration' }] : []),
        { id: 'account',    icon: 'account',     label: 'Compte' },
      ]
    : [
        { id: 'home',     icon: 'clock',    label: 'Pointage' },
        { id: 'hours',    icon: 'absences', label: 'Mes heures' },
        { id: 'absences', icon: 'calendar', label: 'Absences' },
        { id: 'account',  icon: 'account',  label: 'Compte' },
      ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center gap-3 border-b border-slate-100 flex-shrink-0">
        <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
          <Ic name="clock" size={18} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900 leading-none">Ultima</div>
          <div className="text-xs text-slate-400 mt-0.5 leading-none">Pointage</div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {tabs.map(t => {
          const active = current === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { onNav(t.id); onClose && onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <Ic name={t.icon} size={18} className="flex-shrink-0" />
              <span className="text-sm font-medium">{t.label}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 bg-white/70 rounded-full" />}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="p-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={() => { onNav('account'); onClose && onClose(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-slate-100 ${current === 'account' ? 'bg-blue-600 text-white' : ''}`}
          >
            <UserAvatar user={user} size="xs" />
            <div className="flex-1 min-w-0 text-left">
              <div className={`text-sm font-semibold truncate ${current === 'account' ? 'text-white' : 'text-slate-800'}`}>
                {user.first_name} {user.last_name}
              </div>
              <div className={`text-xs truncate ${current === 'account' ? 'text-white/70' : 'text-slate-400'}`}>
                {role}
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 z-40">
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex fade-in">
          <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.5)' }} onClick={onClose} />
          <aside className="relative w-72 bg-white h-full shadow-2xl slide-up">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}

function MobileHeader({ title, subtitle, onMenu, actions }) {
  return (
    <div className="md:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-slate-100 flex-shrink-0 glass sticky top-0 z-30">
      <button
        onClick={onMenu}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
      >
        <Ic name="bars" size={20} />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="font-bold text-slate-900 text-base truncate leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ LOGIN SCREEN ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handlePassword = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const d = await api.post('/auth/login', { email, password });
      if (d.need_pin) {
        onLogin({ needPin: true, token: d.pin_token, email });
      } else {
        api.setTokens(d.token, d.refresh_token);
        onLogin({ user: d.user });
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/magic-link', { email });
      setSent(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/40">
          <Ic name="clock" size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Ultima Pointage</h1>
        <p className="text-slate-400 text-sm mt-1">Ultima Interior SA</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Mode tabs */}
        <div className="flex border-b border-slate-100">
          {[
            { id: 'password', label: 'Mot de passe' },
            { id: 'magic',    label: 'Lien magique' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setMode(t.id); setError(''); setSent(false); }}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${mode === t.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {mode === 'password' ? (
            <form onSubmit={handlePassword} className="space-y-4">
              <Input label="Adresse email" type="email" value={email} onChange={setEmail} placeholder="vous@ultima-interior.ch" required autoFocus />
              <Input label="Mot de passe" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
              {error && <Alert type="error">{error}</Alert>}
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Se connecter
              </Button>
            </form>
          ) : sent ? (
            <div className="py-4 text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Ic name="checkPlain" size={20} className="text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">Email envoye</h3>
              <p className="text-sm text-slate-500">Verifiez votre boite mail et cliquez sur le lien pour vous connecter.</p>
              <button onClick={() => setSent(false)} className="mt-4 text-sm text-blue-600 font-medium hover:underline">
                Renvoyer un lien
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <p className="text-sm text-slate-500">Recevez un lien de connexion par email, sans mot de passe.</p>
              <Input label="Adresse email" type="email" value={email} onChange={setEmail} placeholder="vous@ultima-interior.ch" required autoFocus />
              {error && <Alert type="error">{error}</Alert>}
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Envoyer le lien
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ PIN SCREEN ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

function PinScreen({ token, onSuccess }) {
  const [step, setStep] = useState('checking');
  const [userId, setUserId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.post('/auth/verify-link', { token })
      .then(d => {
        setUserId(d.user_id || '');
        setFirstName(d.first_name || '');
        if (d.next === 'set_pin') { setStep('set_pin'); setIsNew(true); }
        else setStep('enter_pin');
      })
      .catch(err => setError(err.message));
  }, [token]);

  const handlePin = async () => {
    if (pin.length !== 4) return setError('Le PIN doit etre a 4 chiffres');
    if (isNew && pin !== confirm) return setError('Les PINs ne correspondent pas');
    setLoading(true); setError('');
    try {
      const body = isNew ? { user_id: userId, pin, new_pin: pin } : { user_id: userId, pin };
      const d = await api.post('/auth/verify-pin', body);
      api.setTokens(d.token, null);
      onSuccess(d.user);
    } catch (err) {
      setError(err.message);
      setPin(''); setConfirm('');
    } finally { setLoading(false); }
  };

  const addDigit = (d) => {
    if (step === 'set_pin' && isNew && pin.length === 4) {
      setConfirm(p => p.length < 4 ? p + d : p);
    } else {
      setPin(p => p.length < 4 ? p + d : p);
    }
  };

  const delDigit = () => {
    if (step === 'set_pin' && isNew && pin.length === 4 && confirm.length > 0) setConfirm(p => p.slice(0,-1));
    else setPin(p => p.slice(0,-1));
  };

  const currentPin = step === 'set_pin' && isNew && pin.length === 4 ? confirm : pin;
  const showConfirm = (currentPin.length === 4) && !loading;

  if (step === 'checking') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      {error ? <Alert type="error">{error}</Alert> : <Spinner size="lg" />}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/40">
        <Ic name="lock" size={26} className="text-white" />
      </div>

      {firstName && (
        <p className="text-blue-400 text-sm font-semibold mb-2">Bonjour, {firstName}</p>
      )}
      <h2 className="text-xl font-bold text-white mb-2">
        {step === 'set_pin' && isNew
          ? pin.length < 4 ? 'Creez votre PIN' : 'Confirmez votre PIN'
          : 'Entrez votre PIN'}
      </h2>
      <p className="text-slate-400 text-sm mb-8 text-center">
        {step === 'set_pin' && isNew
          ? 'Choisissez un code a 4 chiffres'
          : 'Saisissez votre code PIN'}
      </p>

      {/* Dots */}
      <div className="flex gap-4 mb-8">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${
            i < currentPin.length ? 'bg-blue-400 scale-110' : 'bg-slate-600'
          }`} />
        ))}
      </div>

      {error && <div className="mb-4 max-w-xs w-full"><Alert type="error">{error}</Alert></div>}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => addDigit(String(n))}
            className="h-16 bg-slate-700/80 hover:bg-slate-600 active:bg-slate-500 active:scale-95 rounded-2xl text-white text-2xl font-medium transition-all duration-100">
            {n}
          </button>
        ))}
        <div />
        <button onClick={() => addDigit('0')}
          className="h-16 bg-slate-700/80 hover:bg-slate-600 active:bg-slate-500 active:scale-95 rounded-2xl text-white text-2xl font-medium transition-all duration-100">
          0
        </button>
        <button onClick={delDigit}
          className="h-16 bg-slate-700/80 hover:bg-slate-600 active:bg-slate-500 active:scale-95 rounded-2xl text-slate-300 transition-all duration-100 flex items-center justify-center">
          <Ic name="chevLeft" size={20} />
        </button>
      </div>

      {showConfirm && (
        <Button onClick={handlePin} loading={loading} className="w-64 mt-6" size="lg">
          Confirmer
        </Button>
      )}
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ HOME SCREEN (Pointage) ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

function HomeScreen({ user, meData, onRefresh }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [showStart, setShowStart] = useState(false);
  const [actType, setActType] = useState('WORK_SITE');
  const [actError, setActError] = useState('');
  const [actLoading, setActLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const te = await api.get('/time-entries');
      setEntries(te.entries || []);
      setAlerts(te.alerts || []);
      const act = (te.entries || []).find(e => e.status === 'DRAFT' && !e.ended_at);
      setActive(act || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, []);

  useInterval(() => {
    if (active) setElapsed(fmt.elapsed(active.started_at));
  }, active ? 1000 : null);

  useEffect(() => {
    if (active) setElapsed(fmt.elapsed(active.started_at));
  }, [active]);

  const startEntry = async () => {
    setActLoading(true); setActError('');
    try {
      await api.post('/time-entries', { activity_type: actType });
      setShowStart(false);
      await loadData();
    } catch (err) { setActError(err.message); }
    finally { setActLoading(false); }
  };

  const stopEntry = async () => {
    if (!active) return;
    setActLoading(true);
    try {
      await api.patch(`/time-entries/${active.id}/stop`);
      await loadData();
    } catch (err) { alert(err.message); }
    finally { setActLoading(false); }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter(e => {
    const d = new Date(e.started_at * 1000).toISOString().split('T')[0];
    return d === today;
  });

  const todayWork = todayEntries.filter(e => e.activity_type !== 'BREAK' && e.ended_at)
    .reduce((s, e) => s + (e.duration_min || 0), 0);
  const activeMins = active ? fmt.elapsedMins(active.started_at) : 0;
  const totalWithActive = todayWork + (active && active.activity_type !== 'BREAK' ? activeMins : 0);
  const dailyTarget = (user.weekly_target_h || 42) / 5 * 60;
  const pct = fmt.pct(totalWithActive, dailyTarget);
  const greetHour = new Date().getHours();
  const greet = greetHour < 12 ? 'Bonjour' : greetHour < 18 ? 'Bon apres-midi' : 'Bonsoir';

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  );

  return (
    <div className="space-y-4 pb-6 max-w-lg">
      {/* Greeting */}
      <div className="pt-2">
        <p className="text-sm text-slate-500">{greet},</p>
        <h2 className="text-2xl font-bold text-slate-900">{user.first_name}</h2>
      </div>

      {/* Alerts */}
      {alerts.map((a, i) => (
        <Alert key={i} type="warning" title="Anomalie">{a.message || a.code}</Alert>
      ))}

      {/* Main pointage card */}
      <Card className="p-6">
        <div className="flex flex-col items-center">
          {/* Circular progress */}
          <div className="relative mb-6">
            <ProgressRing value={totalWithActive} max={dailyTarget} size={180} strokeWidth={12} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {active ? (
                <>
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">En cours</span>
                  <span className="text-3xl font-mono font-bold text-slate-900 tabular-nums leading-none">{elapsed}</span>
                  <span className="text-xs text-slate-400 mt-1">{ACTIVITY_TYPES[active.activity_type]?.label}</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold text-slate-900">{fmt.duration(todayWork)}</span>
                  <span className="text-xs text-slate-400 mt-1">aujourd'hui</span>
                  <span className="text-xs font-medium text-slate-500 mt-0.5">{pct}% de l'objectif</span>
                </>
              )}
            </div>
          </div>

          {/* Action button */}
          {active ? (
            <div className="w-full space-y-3">
              <button
                onClick={stopEntry}
                disabled={actLoading}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-[0.97] disabled:opacity-60 pulse-ring ${
                  actLoading ? 'bg-slate-200 text-slate-500' : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200'
                }`}
              >
                <Ic name="stop" size={22} />
                {actLoading ? 'Arret en cours...' : 'Pointer la fin'}
              </button>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Ic name="clock" size={12} />
                <span>Demarre a {fmt.time(active.started_at)}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowStart(true)}
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white shadow-lg shadow-blue-200 transition-all"
            >
              <Ic name="play" size={22} />
              Pointer l'arrivee
            </button>
          )}
        </div>
      </Card>

      {/* Daily summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Travaille', value: fmt.duration(todayWork), color: 'text-slate-800' },
          { label: 'Objectif', value: `${fmt.duration(dailyTarget)}`, color: 'text-slate-500' },
          { label: 'Reste', value: totalWithActive >= dailyTarget ? 'Atteint' : fmt.duration(Math.max(0, dailyTarget - totalWithActive)), color: totalWithActive >= dailyTarget ? 'text-emerald-600' : 'text-amber-600' },
        ].map(item => (
          <Card key={item.label} className="p-3 text-center">
            <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{item.label}</div>
          </Card>
        ))}
      </div>

      {/* Week summary */}
      {meData?.week && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">Semaine S{meData.week.number}</span>
            <span className="text-sm text-slate-500">{fmt.duration(meData.week.total_min)} / {user.weekly_target_h || 42}h</span>
          </div>
          <ProgressBar value={meData.week.total_min} max={(user.weekly_target_h || 42) * 60} />
        </Card>
      )}

      {/* Solde vacances */}
      {meData?.balance && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Ic name="star" size={16} className="text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-slate-700">Solde vacances</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-emerald-600">
                {Math.max(0, meData.balance.holiday_total - meData.balance.holiday_taken - meData.balance.holiday_pending).toFixed(1)}j
              </span>
              <div className="text-xs text-slate-400">sur {meData.balance.holiday_total}j</div>
            </div>
          </div>
          {meData.balance.holiday_pending > 0 && (
            <p className="text-xs text-amber-600 mt-2">{meData.balance.holiday_pending}j en attente</p>
          )}
        </Card>
      )}

      {/* Today entries */}
      {todayEntries.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-600">Activites du jour</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {todayEntries.map(e => {
              const at = ACTIVITY_TYPES[e.activity_type] || ACTIVITY_TYPES.OTHER;
              return (
                <div key={e.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold border ${at.color}`}>
                    {e.activity_type === 'WORK_SITE' ? <Ic name="briefcase" size={16} /> :
                     e.activity_type === 'WORK_OFFICE' ? <Ic name="home" size={16} /> :
                     e.activity_type === 'TRAVEL_PRO' ? <Ic name="truck" size={16} /> :
                     e.activity_type === 'BREAK' ? <Ic name="star" size={16} /> :
                     <Ic name="clock" size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700">{at.label}</div>
                    <div className="text-xs text-slate-400">
                      {fmt.time(e.started_at)} — {e.ended_at ? fmt.time(e.ended_at) : 'en cours'}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {e.ended_at
                      ? <span className="text-sm font-semibold text-slate-600">{fmt.duration(e.duration_min)}</span>
                      : <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">En cours</span>}
                    <div className="mt-0.5"><Badge status={e.status} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Start modal */}
      <Modal open={showStart} onClose={() => setShowStart(false)} title="Demarrer une activite">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Choisissez le type d'activite</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setActType(k)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  actType === k
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`text-xs font-semibold mt-1 ${actType === k ? 'text-blue-700' : 'text-slate-700'}`}>{v.label}</div>
              </button>
            ))}
          </div>
          {actError && <Alert type="error">{actError}</Alert>}
          <div className="flex gap-3 pt-1">
            <Button onClick={() => setShowStart(false)} variant="secondary" className="flex-1">Annuler</Button>
            <Button onClick={startEntry} loading={actLoading} className="flex-1">
              <Ic name="play" size={16} />
              Demarrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ HOURS SCREEN ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

function HoursScreen({ user }) {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [{ week, year }, setWeekYear] = useState(() => getISOWeek());

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/time-entries?week=${week}&year=${year}`),
      api.get(`/stats?week=${week}&year=${year}`),
    ]).then(([te, st]) => {
      setEntries(te.entries || []);
      setStats(st.days || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [week, year]);

  const changeWeek = (delta) => {
    setWeekYear(({ week: w, year: y }) => {
      let nw = w + delta;
      let ny = y;
      if (nw < 1) { nw = 52; ny -= 1; }
      if (nw > 52) { nw = 1; ny += 1; }
      return { week: nw, year: ny };
    });
  };

  const byDay = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const d = new Date(e.started_at * 1000).toISOString().split('T')[0];
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [entries]);

  const totalWork = entries.filter(e => e.activity_type !== 'BREAK' && e.ended_at)
    .reduce((s, e) => s + (e.duration_min || 0), 0);
  const target = (user.weekly_target_h || 42) * 60;

  // DAY names for chart
  const dayNames = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

  return (
    <div className="space-y-4 pb-6 max-w-lg">
      {/* Week nav */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => changeWeek(-1)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <Ic name="chevLeft" size={18} className="text-slate-600" />
          </button>
          <div className="text-center">
            <div className="text-sm font-bold text-slate-800">Semaine {week} — {year}</div>
          </div>
          <button onClick={() => changeWeek(1)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <Ic name="chevRight" size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Weekly total */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500">Total semaine</span>
          <span className={`text-sm font-bold ${totalWork >= target ? 'text-emerald-600' : 'text-slate-700'}`}>
            {fmt.duration(totalWork)} / {user.weekly_target_h || 42}h
          </span>
        </div>
        <ProgressBar value={totalWork} max={target} />
      </Card>

      {/* Bar chart */}
      {stats.length > 0 && (
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Repartition par jour</h3>
          <div className="flex items-end gap-2 h-28">
            {stats.map((d, i) => {
              const dailyTarget = (user.weekly_target_h || 42) / 5 * 60;
              const pct = Math.min(100, d.work_min > 0 ? (d.work_min / dailyTarget) * 100 : 0);
              const dayName = new Date(d.day + 'T12:00:00').toLocaleDateString('fr-CH', { weekday: 'narrow' });
              const isToday = d.day === new Date().toISOString().split('T')[0];
              const color = pct >= 95 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct > 0 ? 'bg-amber-400' : 'bg-slate-100';
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                  {d.work_min > 0 && (
                    <span className="text-[9px] font-medium text-slate-400">{fmt.duration(d.work_min)}</span>
                  )}
                  <div className="w-full bg-slate-100 rounded-lg relative overflow-hidden" style={{ height: '80px' }}>
                    <div
                      className={`absolute bottom-0 left-0 right-0 rounded-lg ${color} transition-all duration-700`}
                      style={{ height: `${Math.max(pct, pct > 0 ? 5 : 0)}%` }}
                    />
                    {d.meal && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-orange-400 rounded-full" />}
                  </div>
                  <span className={`text-[10px] font-semibold ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                    {dayName}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm inline-block" /> Complet</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-sm inline-block" /> En cours</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-sm inline-block" /> Partiel</span>
          </div>
        </Card>
      )}

      {/* Day-by-day */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : byDay.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Ic name="clock" size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Aucune entrée cette semaine</p>
        </Card>
      ) : (
        byDay.map(([day, dayEntries]) => {
          const dayWork = dayEntries.filter(e => e.activity_type !== 'BREAK' && e.ended_at)
            .reduce((s, e) => s + (e.duration_min || 0), 0);
          const hasMeal = dayEntries.some(e => e.meal_allowance);
          return (
            <Card key={day}>
              <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 capitalize">{fmt.weekday(day)}</span>
                <div className="flex items-center gap-2">
                  {hasMeal && <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full font-medium">Repas</span>}
                  <span className="text-sm font-bold text-slate-700">{fmt.duration(dayWork)}</span>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {dayEntries.map(e => {
                  const at = ACTIVITY_TYPES[e.activity_type] || ACTIVITY_TYPES.OTHER;
                  return (
                    <div key={e.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${at.color}`}>
                        <Ic name="clock" size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-700 font-medium">{at.label}</div>
                        <div className="text-xs text-slate-400">
                          {fmt.time(e.started_at)} — {e.ended_at ? fmt.time(e.ended_at) : '...'}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {e.ended_at && <div className="text-sm font-semibold text-slate-600">{fmt.duration(e.duration_min)}</div>}
                        <Badge status={e.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ ABSENCES SCREEN ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

function AbsencesScreen({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ type: 'HOLIDAY', start_date: '', end_date: '', comment: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try { const d = await api.get('/absences'); setData(d); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.start_date || !form.end_date) return setError('Les dates sont requises');
    setSaving(true); setError('');
    try {
      await api.post('/absences', form);
      setShowNew(false);
      setForm({ type: 'HOLIDAY', start_date: '', end_date: '', comment: '' });
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Spinner size="lg" /></div>;

  const absences = data?.absences || [];
  const balances = data?.balances || {};

  return (
    <div className="space-y-4 pb-6 max-w-lg">
      {/* Balance cards */}
      {balances && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{balances.available_leave ?? (user.annual_leave_d || 25)}</div>
            <div className="text-xs text-slate-500 mt-1">Jours disponibles</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{balances.pending_days ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1">En attente</div>
          </Card>
        </div>
      )}

      <Button onClick={() => setShowNew(true)} className="w-full">
        <Ic name="plus" size={18} />
        Nouvelle demande
      </Button>

      {absences.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Ic name="calendar" size={22} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Aucune absence enregistree</p>
        </Card>
      ) : (
        absences.map(a => {
          const t = ABSENCE_TYPES[a.type] || ABSENCE_TYPES.OTHER;
          return (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.color}`}>
                    <Ic name="calendar" size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800">{t.label}</div>
                    <div className="text-sm text-slate-500">
                      {fmt.dateShort(a.start_date)} — {fmt.dateShort(a.end_date)}
                      <span className="ml-2 text-xs text-slate-400">{a.duration_days}j</span>
                    </div>
                    {a.comment && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.comment}</p>}
                  </div>
                </div>
                <Badge status={a.status} />
              </div>
            </Card>
          );
        })
      )}

      <Modal open={showNew} onClose={() => { setShowNew(false); setError(''); }} title="Nouvelle demande">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ABSENCE_TYPES).map(([k, v]) => (
                <button key={k} onClick={() => setForm(f => ({ ...f, type: k }))}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all border-2 ${
                    form.type === k ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-600 hover:border-slate-200'
                  }`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Du" type="date" value={form.start_date} onChange={v => setForm(f => ({ ...f, start_date: v }))} required />
            <Input label="Au" type="date" value={form.end_date} onChange={v => setForm(f => ({ ...f, end_date: v }))} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Commentaire (optionnel)</label>
            <textarea
              value={form.comment}
              onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              rows={2}
              placeholder="Precisions eventuelles..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {error && <Alert type="error">{error}</Alert>}
          <div className="flex gap-3 pt-1">
            <Button onClick={() => { setShowNew(false); setError(''); }} variant="secondary" className="flex-1">Annuler</Button>
            <Button onClick={submit} loading={saving} className="flex-1">Envoyer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ CALENDAR SCREEN ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

function CalendarScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  useEffect(() => {
    setLoading(true);
    api.get(`/absences/calendar?year=${month.year}&month=${month.month}`)
      .then(d => setData(d.entries || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month.year, month.month]);

  const changeMonth = (delta) => {
    setMonth(({ year, month: m }) => {
      let nm = m + delta;
      let ny = year;
      if (nm < 1) { nm = 12; ny -= 1; }
      if (nm > 12) { nm = 1; ny += 1; }
      return { year: ny, month: nm };
    });
  };

  const monthName = new Date(month.year, month.month - 1, 1)
    .toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4 pb-6 max-w-2xl">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeMonth(-1)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <Ic name="chevLeft" size={18} className="text-slate-600" />
          </button>
          <span className="font-bold text-slate-800 capitalize">{monthName}</span>
          <button onClick={() => changeMonth(1)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <Ic name="chevRight" size={18} className="text-slate-600" />
          </button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : data.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Ic name="calendar" size={22} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Aucune absence ce mois</p>
        </Card>
      ) : (
        data.map(entry => {
          const t = ABSENCE_TYPES[entry.type] || ABSENCE_TYPES.OTHER;
          return (
            <Card key={entry.id} className="p-4">
              <div className="flex items-center gap-3">
                <UserAvatar user={entry} size="sm" />
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{entry.first_name} {entry.last_name}</div>
                  <div className="text-sm text-slate-500">{t.label} ÃÂÃÂÃÂÃÂ· {fmt.dateShort(entry.start_date)} — {fmt.dateShort(entry.end_date)}</div>
                </div>
                <Badge status={entry.status} />
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ ACCOUNT SCREEN ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

function AccountScreen({ user, onLogout, onUserUpdate }) {
  const [info, setInfo] = useState({ first_name: user.first_name || '', last_name: user.last_name || '', phone: user.phone || '' });
  const [infoMsg, setInfoMsg] = useState(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || null);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [savingPw, setSavingPw] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const fileRef = useRef();

  const isManagerOrAdmin = ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(user.role);
  const roleLabel = { SUPERADMIN: 'Super Admin', ADMIN: 'Administrateur', MANAGER: 'Responsable', EMPLOYEE: 'Employé' }[user.role] || user.role;

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 160;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarPreview(dataUrl);
        api.patch(`/users/${user.id}`, { avatar_url: dataUrl })
          .then(() => onUserUpdate && onUserUpdate())
          .catch(err => alert('Erreur: ' + err.message));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveInfo = async () => {
    setSavingInfo(true); setInfoMsg(null);
    try {
      await api.patch(`/users/${user.id}`, info);
      setInfoMsg({ type: 'success', text: 'Informations mises a jour' });
      onUserUpdate && onUserUpdate();
    } catch (err) { setInfoMsg({ type: 'error', text: err.message }); }
    finally { setSavingInfo(false); }
  };

  const changePassword = async () => {
    if (!pwForm.new_password) return setPwMsg({ type: 'error', text: 'Nouveau mot de passe requis' });
    if (pwForm.new_password !== pwForm.confirm_password)
      return setPwMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
    if (pwForm.new_password.length < 8)
      return setPwMsg({ type: 'error', text: 'Minimum 8 caracteres' });
    setSavingPw(true); setPwMsg(null);
    try {
      await api.post('/auth/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwMsg({ type: 'success', text: 'Mot de passe modifie' });
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) { setPwMsg({ type: 'error', text: err.message }); }
    finally { setSavingPw(false); }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await api.post('/auth/logout'); } catch {}
    api.clearTokens();
    onLogout();
  };

  return (
    <div className="space-y-4 pb-8 max-w-lg">
      {/* Profile header */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0" onClick={() => fileRef.current?.click()}>
            <div className="cursor-pointer hover:opacity-90 transition-opacity">
              {avatarPreview
                ? <img src={avatarPreview} className="w-20 h-20 rounded-2xl object-cover" alt="avatar" />
                : <UserAvatar user={user} size="lg" />
              }
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
              <Ic name="camera" size={13} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-800 text-xl">{user.first_name} {user.last_name}</h2>
            <p className="text-sm text-slate-500 truncate">{user.email}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isManagerOrAdmin ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                {roleLabel}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                {EMPLOYEE_TYPES[user.employee_type] || user.employee_type}
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">Cliquez sur la photo pour la modifier</p>
      </Card>

      {/* Info */}
      <Card className="p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Ic name="edit" size={16} className="text-slate-400" />
          Informations personnelles
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prenom" value={info.first_name} onChange={v => setInfo(f => ({ ...f, first_name: v }))} />
            <Input label="Nom" value={info.last_name} onChange={v => setInfo(f => ({ ...f, last_name: v }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
            <div className="w-full border border-slate-100 rounded-xl px-4 py-2.5 text-slate-400 bg-slate-50 text-sm">{user.email || '—'}</div>
            <p className="text-xs text-slate-400 mt-1">L'email est gere par l'administrateur</p>
          </div>
          <Input label="Téléphone" value={info.phone} onChange={v => setInfo(f => ({ ...f, phone: v }))} placeholder="+41 79 000 00 00" />
        </div>
        {infoMsg && <div className="mt-3"><Alert type={infoMsg.type}>{infoMsg.text}</Alert></div>}
        <Button onClick={saveInfo} loading={savingInfo} className="w-full mt-4">Enregistrer</Button>
      </Card>

      {/* Contract info */}
      <Card className="p-5">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Ic name="briefcase" size={16} className="text-slate-400" />
          Contrat
        </h3>
        <div className="space-y-1">
          {[
            { label: 'Cible hebdomadaire', value: `${user.weekly_target_h || 42}h / semaine` },
            { label: 'Congés annuels', value: `${user.annual_leave_d || 25} jours` },
          ].map(item => (
            <div key={item.label} className="flex justify-between py-2.5 text-sm border-b border-slate-50 last:border-0">
              <span className="text-slate-500">{item.label}</span>
              <span className="font-semibold text-slate-700">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Password (managers/admins) */}
      {isManagerOrAdmin && (
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Ic name="lock" size={16} className="text-slate-400" />
            Changer le mot de passe
          </h3>
          <div className="space-y-3">
            <Input label="Mot de passe actuel" type="password" value={pwForm.current_password} onChange={v => setPwForm(f => ({ ...f, current_password: v }))} placeholder="Mot de passe actuel" />
            <Input label="Nouveau mot de passe" type="password" value={pwForm.new_password} onChange={v => setPwForm(f => ({ ...f, new_password: v }))} placeholder="8 caractères minimum" />
            <Input label="Confirmation" type="password" value={pwForm.confirm_password} onChange={v => setPwForm(f => ({ ...f, confirm_password: v }))} placeholder="Repetez le nouveau mot de passe" />
          </div>
          {pwMsg && <div className="mt-3"><Alert type={pwMsg.type}>{pwMsg.text}</Alert></div>}
          <Button onClick={changePassword} loading={savingPw} variant="outline" className="w-full mt-4">Modifier le mot de passe</Button>
        </Card>
      )}

      {/* Logout */}
      <Button onClick={handleLogout} loading={loggingOut} variant="danger" className="w-full">
        <Ic name="logout" size={18} />
        Se deconnecter
      </Button>
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ TEAM SCREEN ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ


function getPeriodLabel(mode, date) {
  const d = new Date(date);
  const M = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const J = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  if (mode === 'day')   return J[d.getDay()] + ' ' + d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
  if (mode === 'week')  { const w = _isoWk(d); return 'Semaine ' + w.w + ' — ' + w.y; }
  if (mode === 'month') return M[d.getMonth()] + ' ' + d.getFullYear();
  return '' + d.getFullYear();
}
function _isoWk(d) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7; dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const y1 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return { w: Math.ceil((((dt - y1) / 86400000) + 1) / 7), y: dt.getUTCFullYear() };
}
function getPeriodParams(mode, date) {
  const d = new Date(date); const iso = x => x.toISOString().slice(0,10);
  if (mode === 'day') return 'from_date=' + iso(d) + '&to_date=' + iso(d);
  if (mode === 'week') {
    const day = d.getDay() || 7; const mon = new Date(d); mon.setDate(d.getDate() + 1 - day);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return 'from_date=' + iso(mon) + '&to_date=' + iso(sun);
  }
  if (mode === 'month') {
    return 'from_date=' + iso(new Date(d.getFullYear(), d.getMonth(), 1)) +
           '&to_date='   + iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  }
  return 'from_date=' + d.getFullYear() + '-01-01&to_date=' + d.getFullYear() + '-12-31';
}
function workingDaysInMonth(date) {
  const d = new Date(date), y = d.getFullYear(), m = d.getMonth();
  let n = 0; const cur = new Date(y, m, 1);
  while (cur.getMonth() === m) { const wd = cur.getDay(); if (wd && wd < 6) n++; cur.setDate(cur.getDate() + 1); }
  return n;
}
function getTargetForPeriod(weeklyH, mode, anchorDate) {
  const wh = weeklyH || 42;
  if (mode === 'day')   return wh / 5 * 60;
  if (mode === 'week')  return wh * 60;
  if (mode === 'month') return wh / 5 * workingDaysInMonth(anchorDate) * 60;
  return wh * 52 * 60;
}
function fmtTarget(weeklyH, mode, anchorDate) {
  const wh = weeklyH || 42;
  if (mode === 'day')   return (wh / 5).toFixed(1) + 'h';
  if (mode === 'week')  return wh + 'h';
  if (mode === 'month') return Math.round(wh / 5 * workingDaysInMonth(anchorDate)) + 'h';
  return Math.round(wh * 52) + 'h';
}

function TeamScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [{ week, year }, setWeekYear] = useState(() => getISOWeek());
  const [viewMode, setViewMode] = useState('week');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selected, setSelected] = useState(null);
  const [userEntries, setUserEntries] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/time-entries/team?' + getPeriodParams(viewMode, anchorDate))
      .then(d => setData(d.team || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [viewMode, anchorDate]);

  const changeWeek = (delta) => {
    setAnchorDate(d => {
      const nd = new Date(d);
      if (viewMode === 'day') nd.setDate(nd.getDate() + delta);
      else if (viewMode === 'week') nd.setDate(nd.getDate() + delta * 7);
      else if (viewMode === 'month') nd.setMonth(nd.getMonth() + delta);
      else nd.setFullYear(nd.getFullYear() + delta);
      return nd;
    });
  };

  const viewUser = async (emp) => {
    setSelected(emp);
    setUserLoading(true);
    try {
      const d = await api.get(`/time-entries/team?week=${week}&year=${year}&user_id=${emp.employee?.id}`);
      setUserEntries(d.entries || []);
    } catch {}
    finally { setUserLoading(false); }
  };

  // User detail view
  if (selected) {
    const entries = userEntries || [];
    const totalWork = entries.filter(e => e.activity_type !== 'BREAK' && e.ended_at)
      .reduce((s, e) => s + (e.duration_min || 0), 0);

    return (
      <div className="space-y-4 pb-6 max-w-lg">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors">
          <Ic name="chevLeft" size={18} />
          {selected.employee?.first_name} {selected.employee?.last_name}
        </button>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <UserAvatar user={selected} size="md" />
            <div>
              <div className="font-bold text-slate-800">{selected.first_name} {selected.last_name}</div>
              <div className="text-sm text-slate-500">{EMPLOYEE_TYPES[selected.employee?.employee_type] || selected.employee_type}</div>
            </div>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-500">Semaine {week}</span>
            <span className="font-bold text-slate-800">{fmt.duration(totalWork)} / {selected.employee?.weekly_target_h || 42}h</span>
          </div>
          <ProgressBar value={totalWork} max={(selected.weekly_target_h || 42) * 60} />
        </Card>

        {userLoading ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : entries.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-400">Aucune entrée cette semaine</p>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-slate-50">
              {entries.map(e => {
                const at = ACTIVITY_TYPES[e.activity_type] || ACTIVITY_TYPES.OTHER;
                return (
                  <div key={e.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border text-xs ${at.color}`}>
                      <Ic name="clock" size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-700">{at.label}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(e.started_at * 1000).toLocaleDateString('fr-CH', { weekday: 'short', day: 'numeric' })}
                        {' ÃÂÃÂÃÂÃÂ· '}{fmt.time(e.started_at)} — {e.ended_at ? fmt.time(e.ended_at) : '...'}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {e.ended_at && <div className="text-sm font-semibold">{fmt.duration(e.duration_min)}</div>}
                      <Badge status={e.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Calculate team stats
  const present = data.filter(e => (e.entries_today || 0) > 0).length;
  const alerts = data.reduce((sum, e) => sum + (e.alerts?.length || 0), 0);
  const pending = data.filter(e => e.has_pending).length;

  const filtered = search
    ? data.filter(e => `${e.employee?.first_name} ${e.employee?.last_name}`.toLowerCase().includes(search.toLowerCase()))
    : data;

  return (
    <div className="space-y-4 pb-6 max-w-2xl">
      {/* View mode */}
      <div className="flex gap-1 mb-3 bg-slate-100 p-1 rounded-xl">
        {[{id:'day',label:'Jour'},{id:'week',label:'Semaine'},{id:'month',label:'Mois'},{id:'year',label:'Année'}].map(m => (
          <button key={m.id}
            onClick={() => { setViewMode(m.id); setAnchorDate(new Date()); }}
            className={'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ' + (viewMode === m.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
          >{m.label}</button>
        ))}
      </div>
      {/* Week nav */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeWeek(-1)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <Ic name="chevLeft" size={18} className="text-slate-600" />
          </button>
          <div className="text-center">
            <div className="text-sm font-bold text-slate-800">{getPeriodLabel(viewMode, anchorDate)}</div>
          </div>
          <button onClick={() => changeWeek(1)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <Ic name="chevRight" size={18} className="text-slate-600" />
          </button>
        </div>
      </Card>

      {/* KPI summary */}
      {data.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Employés', value: data.length, color: 'text-slate-800' },
            { label: 'En attente', value: pending, color: pending > 0 ? 'text-amber-600' : 'text-slate-800' },
            { label: 'Alertes', value: alerts, color: alerts > 0 ? 'text-red-600' : 'text-slate-800' },
          ].map(s => (
            <Card key={s.label} className="p-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      {data.length > 4 && (
        <div className="relative">
          <Ic name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un employé..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Employee cards */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Ic name="team" size={22} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Aucun employé</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(emp => {
            const totalWork = emp.total_min || 0;
            const target = getTargetForPeriod(emp.weekly_target_h || 42, viewMode, anchorDate);
            const pct = fmt.pct(totalWork, target);
            const hasAlerts = emp.alerts && emp.alerts.length > 0;
            const isActive = emp.is_active_now;

            return (
              <Card key={emp.employee?.id} className="p-4" onClick={() => viewUser(emp)}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-shrink-0">
                    <UserAvatar user={emp.employee} size="sm" />
                    {isActive && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{emp.employee?.first_name} {emp.employee?.last_name}</div>
                    <div className="text-xs text-slate-500 truncate">{EMPLOYEE_TYPES[emp.employee?.employee_type] || emp.employee?.employee_type}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-slate-700 text-sm">{fmt.duration(totalWork)}</div>
                    <div className="text-xs text-slate-400">/ {fmtTarget(emp.weekly_target_h || 42, viewMode, anchorDate)}</div>
                  </div>
                </div>
                <ProgressBar value={totalWork} max={target} />
                {hasAlerts && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {emp.alerts.map((a, i) => (
                      <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                        {a.message || a.code}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ VALIDATION SCREEN ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

function ValidationScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [{ week, year }, setWeekYear] = useState(() => getISOWeek());
  const [validating, setValidating] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/time-entries/team?week=${week}&year=${year}`)
      .then(d => setData(d.team || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [week, year]);

  const changeWeek = (delta) => {
    setWeekYear(({ week: w, year: y }) => {
      let nw = w + delta;
      let ny = y;
      if (nw < 1) { nw = 52; ny -= 1; }
      if (nw > 52) { nw = 1; ny += 1; }
      return { week: nw, year: ny };
    });
  };

  const validateAll = async () => {
    setValidating(true); setSuccess('');
    try {
      const d = await api.post('/time-entries/validate-week', { week, year });
      setSuccess(`Semaine ${week} approuvée avec succès`);
      const res = await api.get(`/time-entries/team?week=${week}&year=${year}`);
      setData(res.team || []);
    } catch (err) { alert(err.message); }
    finally { setValidating(false); }
  };

  const pending = data.filter(e => e.has_pending);

  return (
    <div className="space-y-4 pb-6 max-w-lg">
      {/* Week nav */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeWeek(-1)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <Ic name="chevLeft" size={18} className="text-slate-600" />
          </button>
          <span className="font-bold text-slate-800">Semaine {week} — {year}</span>
          <button onClick={() => changeWeek(1)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <Ic name="chevRight" size={18} className="text-slate-600" />
          </button>
        </div>
      </Card>

      {success && <Alert type="success">{success}</Alert>}

      {pending.length > 0 && (
        <Button onClick={validateAll} loading={validating} variant="success" className="w-full" size="lg">
          <Ic name="checkPlain" size={20} />
          Approuver toute la semaine ({pending.length} employe{pending.length > 1 ? 's' : ''})
        </Button>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : data.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Ic name="check" size={22} className="text-emerald-600" />
          </div>
          <p className="text-emerald-700 font-medium">Toutes les heures sont validées</p>
        </Card>
      ) : (
        data.map(emp => (
          <Card key={emp.employee?.id} className="p-4">
            <div className="flex items-center gap-3">
              <UserAvatar user={emp.employee} size="sm" />
              <div className="flex-1">
                <div className="font-semibold text-slate-800">{emp.employee?.first_name} {emp.employee?.last_name}</div>
                <div className="text-xs text-slate-500">{fmt.duration(emp.total_min || 0)} travaillées</div>
              </div>
              {emp.has_pending
                ? <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">En attente</span>
                : <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                    <Ic name="checkPlain" size={10} /> Valide
                  </span>}
            </div>
            {emp.alerts && emp.alerts.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {emp.alerts.map((a, i) => (
                  <div key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-3 py-2 rounded-xl flex items-start gap-2">
                    <Ic name="warning" size={12} className="mt-0.5 flex-shrink-0" />
                    <span>{a.message || a.code}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ MANAGER ABSENCES SCREEN ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

function ManagerAbsencesScreen() {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [modal, setModal] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { const d = await api.get('/absences/team'); setAbsences(d.absences || []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const act = async (absId, action) => {
    if (action === 'reject' && !note) return alert('Le motif de refus est obligatoire');
    setSaving(true);
    try {
      await api.patch(`/absences/${absId}/${action}`, { note });
      setModal(null); setNote('');
      await load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const filters = [
    { id: 'PENDING', label: 'En attente' },
    { id: 'APPROVED', label: 'Approuvés' },
    { id: 'REJECTED', label: 'Refusés' },
    { id: 'ALL', label: 'Tous' },
  ];

  const filtered = filter === 'ALL' ? absences : absences.filter(a => a.status === filter);
  const pendingCount = absences.filter(a => a.status === 'PENDING').length;

  return (
    <div className="space-y-4 pb-6 max-w-lg">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              filter === f.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {f.label}
            {f.id === 'PENDING' && pendingCount > 0 && (
              <span className={`ml-1.5 ${filter === 'PENDING' ? 'bg-white/20' : 'bg-amber-100 text-amber-700'} text-xs px-1.5 py-0.5 rounded-full`}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Ic name="calendar" size={22} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Aucune demande</p>
        </Card>
      ) : (
        filtered.map(a => {
          const t = ABSENCE_TYPES[a.type] || ABSENCE_TYPES.OTHER;
          return (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <UserAvatar user={a} size="sm" />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800">{a.first_name} {a.last_name}</div>
                    <div className="text-xs text-slate-500">{t.label} ÃÂÃÂÃÂÃÂ· {fmt.dateShort(a.start_date)} — {fmt.dateShort(a.end_date)} ({a.duration_days}j)</div>
                    {a.comment && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.comment}</p>}
                  </div>
                </div>
                <Badge status={a.status} />
              </div>
              {a.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button onClick={() => setModal({ absence: a, action: 'approve' })} variant="success" size="sm" className="flex-1">
                    <Ic name="checkPlain" size={14} /> Approuver
                  </Button>
                  <Button onClick={() => { setModal({ absence: a, action: 'reject' }); setNote(''); }} variant="danger" size="sm" className="flex-1">
                    <Ic name="x" size={14} /> Refuser
                  </Button>
                </div>
              )}
            </Card>
          );
        })
      )}

      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal?.action === 'approve' ? 'Confirmer l\'approbation' : 'Motif du refus'}>
        {modal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="font-semibold text-slate-800">{modal.absence.first_name} {modal.absence.last_name}</p>
              <p className="text-sm text-slate-500">{ABSENCE_TYPES[modal.absence.type]?.label} ÃÂÃÂÃÂÃÂ· {modal.absence.duration_days} jour(s)</p>
            </div>
            {modal.action === 'reject' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Motif de refus *</label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Expliquez la raison..." rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            )}
            {modal.action === 'approve' && (
              <p className="text-sm text-slate-500">Confirmez-vous l'approbation de cette demande ?</p>
            )}
            <div className="flex gap-3">
              <Button onClick={() => setModal(null)} variant="secondary" className="flex-1">Annuler</Button>
              <Button
                onClick={() => act(modal.absence.id, modal.action)}
                loading={saving}
                variant={modal.action === 'approve' ? 'success' : 'danger'}
                className="flex-1"
              >
                {modal.action === 'approve' ? 'Confirmer' : 'Refuser'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ ADMIN SCREEN ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

function AdminScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const ROLES = ['EMPLOYEE', 'MANAGER', 'ADMIN'];
  const TYPES = [
    { value: 'MONTEUR',     label: 'Monteur / Poseur' },
    { value: 'ADMIN_STAFF', label: 'Administratif' },
    { value: 'MANAGER',     label: "Chef d'equipe" },
  ];

  const load = async () => {
    try {
      const d = await api.get('/admin/users');
      setUsers(d.users || []);
    } catch {
      // fallback to /users
      try { const d = await api.get('/users'); setUsers(d.users || []); } catch (err) { console.error(err); }
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ role: 'EMPLOYEE', employee_type: 'MONTEUR', weekly_target_h: 42, annual_leave_d: 25 });
    setError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (u) => {
    setForm({ ...u, password: '' });
    setError('');
    setModal({ mode: 'edit', user: u });
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      if (modal.mode === 'create') {
        if (!form.first_name || !form.last_name) throw new Error('Prénom et nom obligatoires');
      await api.post('/users', form);
      } else {
        const payload = { ...form };
        delete payload.id;
        if (!payload.password) delete payload.password;
        await api.patch(`/users/${modal.user.id}`, payload);
      }
      setModal(null);
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    try {
      await api.patch(`/users/${u.id}`, { active: u.active ? 0 : 1 });
      await load();
    } catch (err) { alert(err.message); }
  };

  const roleColor = (role) => {
    if (role === 'ADMIN' || role === 'SUPERADMIN') return 'bg-blue-100 text-blue-700';
    if (role === 'MANAGER') return 'bg-violet-100 text-violet-700';
    return 'bg-slate-100 text-slate-500';
  };

  const filtered = search
    ? users.filter(u => `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase()))
    : users;

  const activeCount = users.filter(u => u.active !== 0).length;

  return (
    <div className="space-y-4 pb-6 max-w-2xl">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: users.length },
          { label: 'Actifs', value: activeCount },
          { label: 'Inactifs', value: users.length - activeCount },
        ].map(s => (
          <Card key={s.label} className="p-3 text-center">
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Actions bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Ic name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <Button onClick={openCreate}>
          <Ic name="plus" size={18} />
          Nouveau
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-400">Aucun utilisateur</p>
        </Card>
      ) : (
        filtered.map(u => (
          <Card key={u.id} className={`p-4 ${!u.active ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              <UserAvatar user={u} size="md" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800">{u.first_name} {u.last_name}</div>
                <div className="text-xs text-slate-500 truncate">{u.email}</div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${roleColor(u.role)}`}>
                {u.role}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{EMPLOYEE_TYPES[u.employee_type] || u.employee_type}</span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{u.weekly_target_h}h/sem</span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{u.annual_leave_d}j congés</span>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => openEdit(u)} className="text-xs text-blue-600 font-semibold hover:text-blue-700">Modifier</button>
                <button onClick={() => toggleActive(u)}
                  className={`text-xs font-semibold ${u.active ? 'text-red-500 hover:text-red-600' : 'text-emerald-600 hover:text-emerald-700'}`}>
                  {u.active ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          </Card>
        ))
      )}

      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}>
        {modal && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Prénom *" value={form.first_name || ''} onChange={v => setForm(f => ({ ...f, first_name: v }))} />
              <Input label="Nom *" value={form.last_name || ''} onChange={v => setForm(f => ({ ...f, last_name: v }))} />
            </div>
            <Input label="Email" value={form.email || ''} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="prenom@ultima-interior.ch" />
            <Input
              label={modal.mode === 'create' ? 'Mot de passe' : 'Nouveau mot de passe (vide = inchangé)'}
              type="password" value={form.password || ''} onChange={v => setForm(f => ({ ...f, password: v }))}
            />
            <Input label="Telephone" value={form.phone || ''} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+41 79 000 00 00" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
                <select value={form.role || 'EMPLOYEE'} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Type</label>
                <select value={form.employee_type || 'MONTEUR'} onChange={e => setForm(f => ({ ...f, employee_type: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="H / semaine" type="number" value={form.weekly_target_h ?? 42} onChange={v => setForm(f => ({ ...f, weekly_target_h: parseFloat(v) || 42 }))} />
              <Input label="Jours congés / an" type="number" value={form.annual_leave_d ?? 25} onChange={v => setForm(f => ({ ...f, annual_leave_d: parseInt(v) || 25 }))} />
            </div>
            {error && <Alert type="error">{error}</Alert>}
            <div className="flex gap-3 pt-1">
              <Button onClick={() => setModal(null)} variant="secondary" className="flex-1">Annuler</Button>
              <Button onClick={save} loading={saving} className="flex-1">
                {modal.mode === 'create' ? 'Créer' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ MAIN APP ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

function App() {
  const [auth, setAuth] = useState(null);
  const [pinData, setPinData] = useState(null);
  const [view, setView] = useState('home');
  const [meData, setMeData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.loadTokens();
    if (api.token) {
      api.get('/auth/me')
        .then(d => {
          setAuth(d.user);
          setMeData(d);
          const isManager = ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(d.user?.role);
          setView(isManager ? 'team' : 'home');
        })
        .catch(() => { api.clearTokens(); setAuth(false); });
    } else {
      setAuth(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      window.history.replaceState({}, '', '/');
      setPinData({ token: t });
      setAuth(false);
    }
  }, []);

  const handleLogin = ({ user, needPin, token, email }) => {
    if (needPin) {
      setPinData({ token, email });
    } else {
      api.setTokens(user.token, user.refresh_token);
      setAuth(user);
      setPinData(null);
      const isManager = ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(user?.role);
      setView(isManager ? 'team' : 'home');
    }
  };

  const handlePinSuccess = (user) => {
    setAuth(user);
    setPinData(null);
    setView('home');
  };

  const handleLogout = () => {
    setAuth(false);
    setMeData(null);
    setView('home');
  };

  const refreshMe = async () => {
    try {
      const d = await api.get('/auth/me');
      setAuth(d.user);
      setMeData(d);
    } catch {}
  };

  // Loading
  if (auth === null) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/40">
          <Ic name="clock" size={32} className="text-white" />
        </div>
        <Spinner size="lg" />
      </div>
    </div>
  );

  if (pinData) return <PinScreen token={pinData.token} onSuccess={handlePinSuccess} />;
  if (!auth) return <LoginScreen onLogin={handleLogin} />;

  const isManager = ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(auth.role);
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(auth.role);

  const pageInfo = {
    home:       { title: 'Pointage',        subtitle: null },
    hours:      { title: 'Mes heures',      subtitle: 'Recapitulatif hebdomadaire' },
    absences:   { title: isManager ? 'Absences equipe' : 'Mes absences', subtitle: null },
    account:    { title: 'Mon compte',      subtitle: null },
    team:       { title: 'Equipe',          subtitle: 'Semaine en cours' },
    validation: { title: 'Validation',      subtitle: 'Approbation des heures' },
    calendar:   { title: 'Calendrier',      subtitle: 'Absences du mois' },
    admin:      { title: 'Administration',  subtitle: 'Gestion des utilisateurs' },
  };

  const info = pageInfo[view] || { title: 'Ultima Pointage', subtitle: null };

  const exportAction = isManager && view === 'team' ? (() => {
    const { week: ew, year: ey } = getISOWeek();
    return (
      <a href={`/api/time-entries/export?week=${ew}&year=${ey}`} target="_blank"
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors font-semibold">
        <Ic name="download" size={13} />
        Export
      </a>
    );
  })() : null;

  const renderView = () => {
    switch (view) {
      case 'home':       return <HomeScreen user={auth} meData={meData} onRefresh={refreshMe} />;
      case 'hours':      return <HoursScreen user={auth} />;
      case 'absences':   return isManager ? <ManagerAbsencesScreen /> : <AbsencesScreen user={auth} />;
      case 'account':    return <AccountScreen user={auth} onLogout={handleLogout} onUserUpdate={refreshMe} />;
      case 'team':       return <TeamScreen />;
      case 'validation': return <ValidationScreen />;
      case 'calendar':   return <CalendarScreen />;
      case 'admin':      return <AdminScreen />;
      default:           return <HomeScreen user={auth} meData={meData} onRefresh={refreshMe} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SideNav
        current={view}
        role={auth.role}
        onNav={v => { setView(v); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={auth}
      />

      <div className="flex-1 flex flex-col overflow-hidden md:ml-64">
        {/* Mobile header */}
        <MobileHeader
          title={info.title}
          subtitle={info.subtitle}
          onMenu={() => setSidebarOpen(true)}
          actions={exportAction}
        />

        {/* Desktop page header */}
        <div className="hidden md:flex items-center justify-between px-8 pt-8 pb-2 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{info.title}</h1>
            {info.subtitle && <p className="text-sm text-slate-500 mt-0.5">{info.subtitle}</p>}
          </div>
          {exportAction && <div>{exportAction}</div>}
        </div>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ MOUNT ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
