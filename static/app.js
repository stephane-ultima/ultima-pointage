// ═══════════════════════════════════════════════════════════════
//  ULTIMA POINTAGE — React SPA v2.0
//  Mobile-first HR time-tracking for Ultima Interior SA
//  Left sidebar navigation, enhanced profile management
// ═══════════════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useRef, useMemo } = React;

// ─── API CLIENT ──────────────────────────────────────────────────────────────

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
    try { json = JSON.parse(text); } catch { json = { error: text }; }
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  },

  get:    (path)        => api.request('GET', path),
  post:   (path, data)  => api.request('POST', path, data),
  patch:  (path, data)  => api.request('PATCH', path, data),
  delete: (path)        => api.request('DELETE', path),
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES = {
  WORK_SITE:   { label: 'Sur chantier',  icon: '🔨', color: 'bg-amber-100 text-amber-800' },
  WORK_OFFICE: { label: 'Au bureau',     icon: '💼', color: 'bg-purple-100 text-purple-800' },
  WORK_DEPOT:  { label: 'Au depot',      icon: '🏭', color: 'bg-orange-100 text-orange-800' },
  TRAVEL_PRO:  { label: 'Trajet pro',    icon: '🚗', color: 'bg-blue-100 text-blue-800' },
  BREAK:       { label: 'Pause',         icon: '☕', color: 'bg-slate-100 text-slate-600' },
  OTHER:       { label: 'Autre',         icon: '📋', color: 'bg-gray-100 text-gray-700' },
};

const ABSENCE_TYPES = {
  HOLIDAY:  { label: 'Vacances',    icon: '🏖️', color: 'bg-sky-100 text-sky-800' },
  SICK:     { label: 'Maladie',     icon: '🤒', color: 'bg-red-100 text-red-800' },
  ACCIDENT: { label: 'Accident',    icon: '🏥', color: 'bg-orange-100 text-orange-800' },
  TRAINING: { label: 'Formation',   icon: '📚', color: 'bg-green-100 text-green-800' },
  UNPAID:   { label: 'Non paye',    icon: '📄', color: 'bg-gray-100 text-gray-700' },
  OTHER:    { label: 'Autre',       icon: '📋', color: 'bg-purple-100 text-purple-800' },
};

const STATUS_COLORS = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  APPROVED:  'bg-green-100 text-green-800',
  REJECTED:  'bg-red-100 text-red-800',
  RETURNED:  'bg-orange-100 text-orange-800',
  DRAFT:     'bg-slate-100 text-slate-600',
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
  MANAGER:    'Chef d\'equipe',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = {
  time: (ts) => {
    if (!ts) return '--:--';
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
  },
  date: (str) => {
    if (!str) return '';
    const d = new Date(str);
    return d.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
  weekday: (dayStr) => {
    if (!dayStr) return '';
    const d = new Date(dayStr + 'T12:00:00');
    return d.toLocaleDateString('fr-CH', { weekday: 'short', day: 'numeric', month: 'short' });
  },
  pct: (val, max) => Math.min(100, Math.round((val / max) * 100)),
};

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

// ─── ICONS ────────────────────────────────────────────────────────────────────

const ICON_PATHS = {
  timer:    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z',
  chart:    'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
  calendar: 'M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z',
  users:    'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  check:    'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  cog:      'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  user:     'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  logout:   'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
  menu:     'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  x:        'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  camera:   'M12 15.2c1.77 0 3.2-1.43 3.2-3.2 0-1.77-1.43-3.2-3.2-3.2-1.77 0-3.2 1.43-3.2 3.2 0 1.77 1.43 3.2 3.2 3.2zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z',
  lock:     'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
  edit:     'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  plus:     'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  phone:    'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
  shield:   'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
};

function Icon({ name, size = 20, className = '' }) {
  const d = ICON_PATHS[name] || ICON_PATHS.user;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={d} />
    </svg>
  );
}

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────

function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  return (
    <div className={`${s} border-2 border-slate-200 border-t-ultima-500 rounded-full spin`} />
  );
}

function Badge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function Alert({ type = 'info', title, children, onClose, className = '' }) {
  const styles = {
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };
  return (
    <div className={`border rounded-xl p-3 ${styles[type]} ${className}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          {title && <p className="font-semibold text-sm">{title}</p>}
          <p className="text-sm">{children}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-current opacity-60 hover:opacity-100 text-lg leading-none">x</button>
        )}
      </div>
    </div>
  );
}

function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = 'primary', size = 'md', disabled, loading, className = '', type = 'button' }) {
  const base = 'font-semibold rounded-xl transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-2 text-sm', md: 'px-5 py-3 text-base', lg: 'px-6 py-4 text-lg' };
  const variants = {
    primary:   'bg-ultima-500 hover:bg-ultima-600 text-white shadow-sm',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    danger:    'bg-red-500 hover:bg-red-600 text-white',
    ghost:     'hover:bg-slate-100 text-slate-600',
    success:   'bg-green-500 hover:bg-green-600 text-white',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto slide-up" onClick={e => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">x</button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color = 'bg-ultima-500' }) {
  const pct = fmt.pct(value, max);
  const barColor = pct >= 100 ? 'bg-green-500' : pct > 90 ? 'bg-amber-500' : color;
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, required, autoFocus, className = '', disabled = false }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        disabled={disabled}
        className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-ultima-400 focus:border-transparent bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-ultima-400 bg-white"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── AVATAR HELPER ────────────────────────────────────────────────────────────

function UserAvatar({ user, size = 'md', className = '' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-2xl', xl: 'w-20 h-20 text-3xl' };
  const sz = sizes[size] || sizes.md;
  if (user && user.avatar_url) {
    return <img src={user.avatar_url} className={`${sz} rounded-full object-cover flex-shrink-0 ${className}`} alt="" />;
  }
  const initials = `${(user && user.first_name || '?')[0]}${(user && user.last_name || '')[0]}`;
  return (
    <div className={`${sz} rounded-full bg-ultima-100 flex items-center justify-center font-bold text-ultima-700 flex-shrink-0 ${className}`}>
      {initials}
    </div>
  );
}

// ─── SIDE NAVIGATION ─────────────────────────────────────────────────────────

function SideNav({ current, role, onNav, isOpen, onClose, user }) {
  const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
  const isManager = role === 'MANAGER' || isAdmin;

  const mainItems = isAdmin
    ? [
        { id: 'team',       icon: 'users',    label: 'Equipe' },
        { id: 'validation', icon: 'check',    label: 'Validation' },
        { id: 'absences',   icon: 'calendar', label: 'Absences' },
        { id: 'admin',      icon: 'cog',      label: 'Administration' },
      ]
    : isManager
    ? [
        { id: 'team',       icon: 'users',    label: 'Equipe' },
        { id: 'validation', icon: 'check',    label: 'Validation' },
        { id: 'absences',   icon: 'calendar', label: 'Absences' },
      ]
    : [
        { id: 'home',    icon: 'timer',    label: 'Pointage' },
        { id: 'hours',   icon: 'chart',    label: 'Mes heures' },
        { id: 'absences',icon: 'calendar', label: 'Absences' },
      ];

  const roleLabel = role === 'SUPERADMIN' ? 'Super Admin' : role === 'ADMIN' ? 'Administrateur' : role === 'MANAGER' ? 'Responsable' : 'Employe';

  const navBtn = (item) => (
    <button
      key={item.id}
      onClick={() => { onNav(item.id); onClose(); }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        current === item.id
          ? 'bg-ultima-500 text-white shadow-sm'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon name={item.icon} size={18} />
      {item.label}
    </button>
  );

  const content = (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Logo header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/60">
        <div className="w-9 h-9 bg-ultima-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white text-lg">⏱</span>
        </div>
        <div className="flex-1">
          <div className="font-bold text-white text-base leading-tight">Ultima</div>
          <div className="text-slate-400 text-xs">Pointage RH</div>
        </div>
        <button onClick={onClose} className="md:hidden text-slate-500 hover:text-white transition-colors p-1">
          <Icon name="x" size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {mainItems.map(navBtn)}

        <div className="border-t border-slate-700/60 my-3" />

        {navBtn({ id: 'profile', icon: 'user', label: 'Mon profil' })}
      </nav>

      {/* User info */}
      <div className="border-t border-slate-700/60 px-4 py-4">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user && user.first_name} {user && user.last_name}</div>
            <div className="text-xs text-slate-400 truncate">{roleLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 z-30">
        {content}
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 w-64 z-50 md:hidden shadow-2xl">
            {content}
          </div>
        </>
      )}
    </>
  );
}

// ─── MOBILE HEADER ────────────────────────────────────────────────────────────

function MobileHeader({ title, subtitle, onMenu, actions }) {
  return (
    <header className="md:hidden bg-white border-b border-slate-100 px-4 py-3 safe-top sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="text-slate-500 hover:text-slate-800 transition-colors p-1 -ml-1">
          <Icon name="menu" size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-800 text-lg leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

// ─── LOGIN / PIN SCREENS ──────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicToken, setMagicToken] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      window.history.replaceState({}, '', '/');
      onLogin({ needPin: true, token: t, email: '' });
    }
  }, []);

  const handlePassword = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const d = await api.post('/auth/login', { email, password });
      api.setTokens(d.token, null);
      onLogin({ user: d.user });
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleMagic = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const d = await api.post('/auth/magic-link', { contact: email });
      setMagicSent(true);
      if (d._demo_token) setMagicToken(d._demo_token);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-ultima-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-4xl">⏱</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Ultima Pointage</h1>
        <p className="text-slate-400 text-sm mt-1">Ultima Interior SA</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="flex bg-slate-700 rounded-xl p-1 mb-6">
          <button
            onClick={() => { setMode('password'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'password' ? 'bg-white text-slate-800' : 'text-slate-300'}`}
          >Mot de passe</button>
          <button
            onClick={() => { setMode('magic'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'magic' ? 'bg-white text-slate-800' : 'text-slate-300'}`}
          >Lien magique</button>
        </div>

        {mode === 'password' ? (
          <form onSubmit={handlePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="prenom@ultima-interior.ch"
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ultima-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ultima-400" />
            </div>
            {error && <Alert type="error">{error}</Alert>}
            <Button type="submit" loading={loading} className="w-full" size="lg">Se connecter</Button>
          </form>
        ) : magicSent ? (
          <div className="text-center space-y-4">
            <div className="text-5xl">📧</div>
            <p className="text-white font-semibold">Lien envoye!</p>
            <p className="text-slate-400 text-sm">Verifiez votre email <strong className="text-slate-200">{email}</strong></p>
            {magicToken && (
              <div className="bg-slate-700 rounded-xl p-4 text-left">
                <p className="text-xs text-ultima-400 font-semibold mb-2">Mode demo — Token direct :</p>
                <p className="text-xs text-slate-300 font-mono break-all">{magicToken}</p>
                <Button onClick={() => onLogin({ needPin: true, token: magicToken, email })} className="w-full mt-3" size="sm" variant="secondary">
                  Utiliser ce token
                </Button>
              </div>
            )}
            <Button onClick={() => setMagicSent(false)} variant="ghost" className="w-full text-slate-300">Retour</Button>
          </div>
        ) : (
          <form onSubmit={handleMagic} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Votre email ou telephone</label>
              <input type="text" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="prenom@ultima-interior.ch"
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ultima-400" />
            </div>
            {error && <Alert type="error">{error}</Alert>}
            <Button type="submit" loading={loading} className="w-full" size="lg">Envoyer le lien</Button>
            <p className="text-center text-slate-400 text-xs">Recevez un lien de connexion securise sans mot de passe</p>
          </form>
        )}
      </div>
    </div>
  );
}

function PinScreen({ token, onSuccess }) {
  const [pin, setPin] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState('checking');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [firstName, setFirstName] = useState('');

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
      const body = isNew
        ? { user_id: userId, pin, new_pin: pin }
        : { user_id: userId, pin };
      const d = await api.post('/auth/verify-pin', body);
      api.setTokens(d.token, null);
      onSuccess(d.user);
    } catch (err) {
      setError(err.message);
      setPin(''); setConfirm('');
    } finally { setLoading(false); }
  };

  const addDigit = (d) => {
    if (step === 'set_pin') {
      if (!isNew || pin.length < 4) {
        setPin(p => p.length < 4 ? p + d : p);
      } else {
        setConfirm(p => p.length < 4 ? p + d : p);
      }
    } else {
      setPin(p => p.length < 4 ? p + d : p);
    }
  };

  const delDigit = () => {
    if (step === 'set_pin' && isNew && confirm.length > 0) setConfirm(p => p.slice(0,-1));
    else setPin(p => p.slice(0,-1));
  };

  const currentPin = step === 'set_pin' && isNew && pin.length === 4 ? confirm : pin;

  if (step === 'checking') return (
    <div className="min-h-screen bg-slate-800 flex items-center justify-center">
      {error ? <Alert type="error">{error}</Alert> : <Spinner size="lg" />}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col items-center justify-center px-6">
      <div className="w-24 h-24 bg-ultima-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <span className="text-5xl">🔐</span>
      </div>
      {firstName && <p className="text-ultima-400 text-base font-semibold mb-2">Bonjour, {firstName} 👋</p>}
      <h2 className="text-xl font-bold text-white mb-2">
        {step === 'set_pin' && isNew
          ? pin.length < 4 ? 'Creez votre PIN' : 'Confirmez votre PIN'
          : 'Entrez votre PIN'}
      </h2>
      <p className="text-slate-400 text-sm mb-8 text-center">
        {step === 'set_pin' && isNew
          ? 'Choisissez un code a 4 chiffres pour securiser votre acces'
          : 'Saisissez votre code PIN a 4 chiffres'}
      </p>

      <div className="flex gap-4 mb-8">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full transition-colors ${i < currentPin.length ? 'bg-ultima-400' : 'bg-slate-600'}`} />
        ))}
      </div>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <div className="grid grid-cols-3 gap-3 w-64">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => addDigit(String(n))}
            className="h-16 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-2xl text-white text-2xl font-medium transition-colors">
            {n}
          </button>
        ))}
        <div />
        <button onClick={() => addDigit('0')}
          className="h-16 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-2xl text-white text-2xl font-medium transition-colors">
          0
        </button>
        <button onClick={delDigit}
          className="h-16 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-2xl text-white text-2xl transition-colors">
          del
        </button>
      </div>

      {(currentPin.length === 4) && (
        <Button onClick={handlePin} loading={loading} className="w-64 mt-6" size="lg">
          Confirmer
        </Button>
      )}
    </div>
  );
}

// ─── EMPLOYEE SCREENS ─────────────────────────────────────────────────────────

function HomeScreen({ user, meData, onRefresh }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [showStart, setShowStart] = useState(false);
  const [startForm, setStartForm] = useState({ activity_type: 'WORK_SITE' });
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
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
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
      await api.post('/time-entries', { activity_type: startForm.activity_type });
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
  const dailyTarget = (user.weekly_target_h || 42) / 5 * 60;

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  );

  return (
    <div className="space-y-4 pb-4 max-w-2xl">
      {alerts.map((a, i) => (
        <Alert key={i} type="warning" title={a.code}>{a.message}</Alert>
      ))}

      {/* Active session */}
      {active ? (
        <Card className="p-6 border-2 border-ultima-300">
          <div className="text-center">
            <div className="text-sm font-semibold text-ultima-600 mb-1 uppercase tracking-wide">Session active</div>
            <div className="text-5xl font-mono font-bold text-slate-800 mb-3 tracking-tight">{elapsed}</div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className={`px-3 py-1 rounded-full text-sm ${ACTIVITY_TYPES[active.activity_type]?.color}`}>
                {ACTIVITY_TYPES[active.activity_type]?.icon} {ACTIVITY_TYPES[active.activity_type]?.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-5">Demarre a {fmt.time(active.started_at)}</p>
            <button
              onClick={stopEntry}
              disabled={actLoading}
              className="w-20 h-20 mx-auto bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="text-2xl">⏹</span>
              <span className="text-xs font-bold text-red-600 mt-0.5">Arreter</span>
            </button>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-center">
            <div className="text-slate-400 text-sm mb-4">Aucune session active</div>
            <Button onClick={() => setShowStart(true)} className="w-full" size="lg">
              <span className="text-lg">▶</span> Demarrer le pointage
            </Button>
          </div>
        </Card>
      )}

      {/* Today progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Aujourd'hui</span>
          <span className="text-sm text-slate-500">{fmt.duration(todayWork)} / {fmt.duration(dailyTarget)}</span>
        </div>
        <ProgressBar value={todayWork} max={dailyTarget} />
        {meData?.week && (
          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>Semaine S{meData.week.number}</span>
            <span>{fmt.duration(meData.week.total_min)} / {user.weekly_target_h || 42}h</span>
          </div>
        )}
      </Card>

      {/* Today's entries */}
      {todayEntries.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-slate-50">
            <h3 className="font-semibold text-slate-700 text-sm">Activites du jour</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {todayEntries.map(e => (
              <div key={e.id} className="px-4 py-3 flex items-center gap-3">
                <span className="text-xl">{ACTIVITY_TYPES[e.activity_type]?.icon || '📋'}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700">
                    {ACTIVITY_TYPES[e.activity_type]?.label || e.activity_type}
                  </div>
                  <div className="text-xs text-slate-400">
                    {fmt.time(e.started_at)} — {e.ended_at ? fmt.time(e.ended_at) : 'en cours'}
                  </div>
                </div>
                <div className="text-right">
                  {e.ended_at
                    ? <span className="text-sm font-semibold text-slate-600">{fmt.duration(e.duration_min)}</span>
                    : <span className="text-xs text-ultima-500 font-medium">En cours</span>}
                  <div><Badge status={e.status} /></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Start session modal */}
      <Modal open={showStart} onClose={() => setShowStart(false)} title="Demarrer une activite">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Type d'activite</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setStartForm(f => ({ ...f, activity_type: k }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    startForm.activity_type === k
                      ? 'border-ultima-400 bg-ultima-50'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="text-2xl">{v.icon}</div>
                  <div className="text-xs font-semibold text-slate-700 mt-1">{v.label}</div>
                </button>
              ))}
            </div>
          </div>
          {actError && <Alert type="error">{actError}</Alert>}
          <div className="flex gap-3">
            <Button onClick={() => setShowStart(false)} variant="secondary" className="flex-1">Annuler</Button>
            <Button onClick={startEntry} loading={actLoading} className="flex-1">▶ Demarrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function HoursScreen({ user }) {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState(null);
  const [year, setYear] = useState(null);

  useEffect(() => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dow = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dow);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const wk = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    setWeek(wk);
    setYear(d.getUTCFullYear());
  }, []);

  useEffect(() => {
    if (!week || !year) return;
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
    let w = week + delta;
    let y = year;
    if (w < 1) { w = 52; y -= 1; }
    if (w > 52) { w = 1; y += 1; }
    setWeek(w); setYear(y);
  };

  const byDay = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const d = new Date(e.started_at * 1000).toISOString().split('T')[0];
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return Object.entries(map).sort(([a], [b]) => a < b ? 1 : -1);
  }, [entries]);

  const totalWork = entries.filter(e => e.activity_type !== 'BREAK' && e.ended_at)
    .reduce((s, e) => s + (e.duration_min || 0), 0);
  const target = (user.weekly_target_h || 42) * 60;

  return (
    <div className="space-y-4 pb-4 max-w-2xl">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeWeek(-1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 text-xl">‹</button>
          <div className="text-center">
            <div className="font-bold text-slate-800">Semaine {week} / {year}</div>
          </div>
          <button onClick={() => changeWeek(1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 text-xl">›</button>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-slate-500">Total semaine</span>
          <span className={`text-sm font-bold ${totalWork >= target ? 'text-green-600' : 'text-slate-700'}`}>
            {fmt.duration(totalWork)} / {user.weekly_target_h || 42}h
          </span>
        </div>
        <ProgressBar value={totalWork} max={target} />
      </Card>

      {stats.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Par jour</h3>
          <div className="flex items-end gap-1 h-16">
            {stats.map(d => {
              const dailyTarget2 = (user.weekly_target_h || 42) / 5 * 60;
              const pct2 = Math.min(100, (d.work_min / dailyTarget2) * 100);
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-slate-100 rounded-t relative" style={{ height: '48px' }}>
                    <div
                      className={`absolute bottom-0 left-0 right-0 rounded-t transition-all ${pct2 >= 100 ? 'bg-green-400' : 'bg-ultima-400'}`}
                      style={{ height: `${pct2}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400">
                    {new Date(d.day + 'T12:00:00').toLocaleDateString('fr-CH', { weekday: 'narrow' })}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : byDay.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">📭</div>
          <p>Aucune entree cette semaine</p>
        </div>
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
                  {hasMeal && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Repas</span>}
                  <span className="text-sm font-bold text-slate-600">{fmt.duration(dayWork)}</span>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {dayEntries.map(e => (
                  <div key={e.id} className="px-4 py-2.5 flex items-center gap-3">
                    <span>{ACTIVITY_TYPES[e.activity_type]?.icon || '📋'}</span>
                    <div className="flex-1">
                      <div className="text-sm text-slate-700">{ACTIVITY_TYPES[e.activity_type]?.label || e.activity_type}</div>
                      <div className="text-xs text-slate-400">
                        {fmt.time(e.started_at)} – {e.ended_at ? fmt.time(e.ended_at) : '...'}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {e.ended_at && <div className="text-sm font-medium text-slate-600">{fmt.duration(e.duration_min)}</div>}
                      <Badge status={e.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

function AbsencesScreen({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ type: 'HOLIDAY', start_date: '', end_date: '', comment: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const d = await api.get('/absences');
      setData(d);
    } catch (err) { console.error(err); }
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

  const balance = data?.balance;
  const absences = data?.absences || [];
  const remaining = balance ? balance.holiday_total - balance.holiday_taken - balance.holiday_pending : 0;

  return (
    <div className="space-y-4 pb-4 max-w-2xl">
      {balance && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Solde vacances {new Date().getFullYear()}</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-slate-800">{balance.holiday_total}</div>
              <div className="text-xs text-slate-500">Total</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-red-600">{balance.holiday_taken}</div>
              <div className="text-xs text-slate-500">Pris</div>
            </div>
            <div className={`rounded-xl p-3 ${remaining < 5 ? 'bg-orange-50' : 'bg-green-50'}`}>
              <div className={`text-2xl font-bold ${remaining < 5 ? 'text-orange-600' : 'text-green-600'}`}>{remaining.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Restant</div>
            </div>
          </div>
          {balance.holiday_pending > 0 && (
            <div className="mt-3 text-xs text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2">
              {balance.holiday_pending} jour(s) en attente d'approbation
            </div>
          )}
        </Card>
      )}

      <Button onClick={() => setShowNew(true)} className="w-full">
        + Nouvelle demande d'absence
      </Button>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : absences.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">📅</div>
          <p>Aucune demande d'absence</p>
        </div>
      ) : (
        <Card>
          <div className="divide-y divide-slate-50">
            {absences.map(a => {
              const t = ABSENCE_TYPES[a.type] || ABSENCE_TYPES.OTHER;
              return (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{t.icon}</span>
                      <div>
                        <div className="text-sm font-semibold text-slate-700">{t.label}</div>
                        <div className="text-xs text-slate-500">
                          {fmt.date(a.start_date)} — {fmt.date(a.end_date)} ({a.duration_days}j)
                        </div>
                      </div>
                    </div>
                    <Badge status={a.status} />
                  </div>
                  {a.comment && <p className="text-xs text-slate-400 mt-1 ml-8">{a.comment}</p>}
                  {a.review_note && <p className="text-xs text-red-500 mt-1 ml-8">{a.review_note}</p>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Demande d'absence">
        <div className="space-y-4">
          <Select
            label="Type"
            value={form.type}
            onChange={v => setForm(f => ({ ...f, type: v }))}
            options={Object.entries(ABSENCE_TYPES).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Du" type="date" value={form.start_date} onChange={v => setForm(f => ({ ...f, start_date: v }))} />
            <Input label="Au" type="date" value={form.end_date} onChange={v => setForm(f => ({ ...f, end_date: v }))} />
          </div>
          <Input label="Commentaire (optionnel)" value={form.comment} onChange={v => setForm(f => ({ ...f, comment: v }))}
            placeholder="Vacances estivales..." />
          {error && <Alert type="error">{error}</Alert>}
          <div className="flex gap-3">
            <Button onClick={() => setShowNew(false)} variant="secondary" className="flex-1">Annuler</Button>
            <Button onClick={submit} loading={saving} className="flex-1">Envoyer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────────────────

function ProfileScreen({ user, onLogout, onUserUpdate }) {
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || null);
  const [info, setInfo] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone: user.phone || '',
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState(null);

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const [loggingOut, setLoggingOut] = useState(false);

  const fileRef = useRef();

  const isManagerOrAdmin = ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(user.role);
  const roleLabel = {
    SUPERADMIN: 'Super Admin',
    ADMIN: 'Administrateur',
    MANAGER: 'Responsable',
    EMPLOYEE: 'Employe',
  }[user.role] || user.role;

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
        // Center-crop
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarPreview(dataUrl);
        api.patch(`/users/${user.id}`, { avatar_url: dataUrl })
          .then(() => onUserUpdate && onUserUpdate())
          .catch(err => alert('Erreur sauvegarde photo: ' + err.message));
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
    } catch (err) {
      setInfoMsg({ type: 'error', text: err.message });
    } finally { setSavingInfo(false); }
  };

  const changePassword = async () => {
    if (!pwForm.new_password) return setPwMsg({ type: 'error', text: 'Nouveau mot de passe requis' });
    if (pwForm.new_password !== pwForm.confirm_password)
      return setPwMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
    if (pwForm.new_password.length < 8)
      return setPwMsg({ type: 'error', text: 'Minimum 8 caracteres requis' });
    setSavingPw(true); setPwMsg(null);
    try {
      await api.post('/auth/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwMsg({ type: 'success', text: 'Mot de passe modifie avec succes' });
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message });
    } finally { setSavingPw(false); }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await api.post('/auth/logout'); } catch {}
    api.clearTokens();
    onLogout();
  };

  return (
    <div className="space-y-5 pb-8 max-w-lg">

      {/* Profile photo + identity */}
      <Card className="p-6">
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden bg-ultima-100 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => fileRef.current && fileRef.current.click()}
            >
              {avatarPreview ? (
                <img src={avatarPreview} className="w-full h-full object-cover" alt="avatar" />
              ) : (
                <span className="text-3xl font-bold text-ultima-700">
                  {(user.first_name || '?')[0]}{(user.last_name || '')[0]}
                </span>
              )}
            </div>
            <button
              onClick={() => fileRef.current && fileRef.current.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-ultima-500 hover:bg-ultima-600 rounded-full flex items-center justify-center shadow-md transition-colors"
            >
              <Icon name="camera" size={13} className="text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-800 text-xl leading-tight">{user.first_name} {user.last_name}</h2>
            <p className="text-sm text-slate-500 mt-0.5 truncate">{user.email}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                isManagerOrAdmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
              }`}>{roleLabel}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-500">
                {EMPLOYEE_TYPES[user.employee_type] || user.employee_type}
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">Cliquez sur la photo pour la modifier</p>
      </Card>

      {/* Personal information */}
      <Card className="p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-base">
          <Icon name="edit" size={17} className="text-slate-400" />
          Informations personnelles
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prenom"
              value={info.first_name}
              onChange={v => setInfo(f => ({ ...f, first_name: v }))}
            />
            <Input
              label="Nom"
              value={info.last_name}
              onChange={v => setInfo(f => ({ ...f, last_name: v }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <div className="w-full border border-slate-100 rounded-xl px-4 py-3 text-slate-400 bg-slate-50 text-sm">
              {user.email || '—'}
            </div>
            <p className="text-xs text-slate-400 mt-1">L'email est gere par l'administrateur</p>
          </div>
          <Input
            label="Telephone"
            value={info.phone}
            onChange={v => setInfo(f => ({ ...f, phone: v }))}
            placeholder="+41 79 000 00 00"
          />
        </div>
        {infoMsg && <Alert type={infoMsg.type} className="mt-3">{infoMsg.text}</Alert>}
        <Button onClick={saveInfo} loading={savingInfo} className="w-full mt-4">
          Enregistrer les modifications
        </Button>
      </Card>

      {/* Account parameters */}
      <Card className="p-5">
        <h3 className="font-bold text-slate-800 mb-3 text-base flex items-center gap-2">
          <Icon name="shield" size={17} className="text-slate-400" />
          Parametres du compte
        </h3>
        <div className="divide-y divide-slate-50">
          {[
            { label: 'Cible hebdomadaire', value: `${user.weekly_target_h || 42}h / semaine` },
            { label: 'Conges annuels', value: `${user.annual_leave_d || 25} jours` },
          ].map(item => (
            <div key={item.label} className="flex justify-between py-2.5 text-sm">
              <span className="text-slate-500">{item.label}</span>
              <span className="font-semibold text-slate-700">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Change password (managers/admins only) */}
      {isManagerOrAdmin && (
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4 text-base flex items-center gap-2">
            <Icon name="lock" size={17} className="text-slate-400" />
            Changer le mot de passe
          </h3>
          <div className="space-y-3">
            <Input
              label="Mot de passe actuel"
              type="password"
              value={pwForm.current_password}
              onChange={v => setPwForm(f => ({ ...f, current_password: v }))}
              placeholder="Mot de passe actuel"
            />
            <Input
              label="Nouveau mot de passe"
              type="password"
              value={pwForm.new_password}
              onChange={v => setPwForm(f => ({ ...f, new_password: v }))}
              placeholder="Minimum 8 caracteres"
            />
            <Input
              label="Confirmer le mot de passe"
              type="password"
              value={pwForm.confirm_password}
              onChange={v => setPwForm(f => ({ ...f, confirm_password: v }))}
              placeholder="Retapez le nouveau mot de passe"
            />
          </div>
          {pwMsg && <Alert type={pwMsg.type} className="mt-3">{pwMsg.text}</Alert>}
          <Button onClick={changePassword} loading={savingPw} variant="secondary" className="w-full mt-4">
            Modifier le mot de passe
          </Button>
        </Card>
      )}

      {/* Legal */}
      <Card className="p-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          Vos donnees sont hebergees en Suisse conformement a la nLPD.
          Ultima Interior SA, Bulle (FR). Responsable : direction@ultima-interior.ch
        </p>
      </Card>

      {/* Logout */}
      <Button onClick={handleLogout} loading={loggingOut} variant="danger" className="w-full">
        <Icon name="logout" size={18} />
        Se deconnecter
      </Button>
    </div>
  );
}

// ─── MANAGER SCREENS ──────────────────────────────────────────────────────────

function TeamScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState(null);
  const [year, setYear] = useState(null);
  const [selected, setSelected] = useState(null);
  const [userEntries, setUserEntries] = useState(null);
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dow = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dow);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const wk = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    setWeek(wk);
    setYear(d.getUTCFullYear());
  }, []);

  useEffect(() => {
    if (!week || !year) return;
    setLoading(true);
    api.get(`/time-entries/team?week=${week}&year=${year}`)
      .then(d => setData(d.team || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [week, year]);

  const changeWeek = (delta) => {
    let w = week + delta;
    let y = year;
    if (w < 1) { w = 52; y -= 1; }
    if (w > 52) { w = 1; y += 1; }
    setWeek(w); setYear(y);
  };

  const viewUser = async (emp) => {
    setSelected(emp);
    setUserLoading(true);
    try {
      const d = await api.get(`/time-entries/team?week=${week}&year=${year}&user_id=${emp.user_id}`);
      setUserEntries(d.entries || []);
    } catch {}
    finally { setUserLoading(false); }
  };

  if (selected) {
    const entries = userEntries || [];
    const totalWork = entries.filter(e => e.activity_type !== 'BREAK' && e.ended_at)
      .reduce((s, e) => s + (e.duration_min || 0), 0);

    return (
      <div className="space-y-4 pb-4 max-w-2xl">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-slate-600 font-medium hover:text-slate-800">
          ← {selected.first_name} {selected.last_name}
        </button>
        <Card className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-500">Total semaine {week}</span>
            <span className="font-bold text-slate-800">{fmt.duration(totalWork)}</span>
          </div>
          <ProgressBar value={totalWork} max={(selected.weekly_target_h || 42) * 60} />
        </Card>
        {userLoading ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : (
          <Card>
            <div className="divide-y divide-slate-50">
              {entries.length === 0
                ? <div className="p-6 text-center text-slate-400">Aucune entree</div>
                : entries.map(e => (
                  <div key={e.id} className="px-4 py-3 flex items-center gap-3">
                    <span>{ACTIVITY_TYPES[e.activity_type]?.icon || '📋'}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{ACTIVITY_TYPES[e.activity_type]?.label || e.activity_type}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(e.started_at * 1000).toLocaleDateString('fr-CH', { weekday: 'short', day: 'numeric' })} · {fmt.time(e.started_at)} – {e.ended_at ? fmt.time(e.ended_at) : '...'}
                      </div>
                    </div>
                    <div className="text-right">
                      {e.ended_at && <div className="text-sm font-medium">{fmt.duration(e.duration_min)}</div>}
                      <Badge status={e.status} />
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4 max-w-2xl">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeWeek(-1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">‹</button>
          <span className="font-bold text-slate-800">Semaine {week} / {year}</span>
          <button onClick={() => changeWeek(1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">›</button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">👥</div>
          <p>Aucune donnee pour cette semaine</p>
        </div>
      ) : (
        data.map(emp => {
          const totalWork = (emp.total_work_min || 0);
          const target = (emp.weekly_target_h || 42) * 60;
          const pct = fmt.pct(totalWork, target);
          const hasAlerts = emp.alerts && emp.alerts.length > 0;

          return (
            <Card key={emp.user_id} className="p-4" onClick={() => viewUser(emp)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-ultima-100 rounded-xl flex items-center justify-center font-bold text-ultima-600 text-sm flex-shrink-0">
                  {(emp.first_name || '?')[0]}{(emp.last_name || '')[0]}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{emp.first_name} {emp.last_name}</div>
                  <div className="text-xs text-slate-500">{EMPLOYEE_TYPES[emp.employee_type] || emp.employee_type}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-700">{fmt.duration(totalWork)}</div>
                  <div className="text-xs text-slate-400">/ {emp.weekly_target_h || 42}h</div>
                </div>
              </div>
              <ProgressBar value={totalWork} max={target} />
              {hasAlerts && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {emp.alerts.map((a, i) => (
                    <span key={i} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                      {a.code}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

function ValidationScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState(null);
  const [year, setYear] = useState(null);
  const [validating, setValidating] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dow = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dow);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const wk = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    setWeek(wk);
    setYear(d.getUTCFullYear());
  }, []);

  useEffect(() => {
    if (!week || !year) return;
    setLoading(true);
    api.get(`/time-entries/team?week=${week}&year=${year}`)
      .then(d => setData(d.team || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [week, year]);

  const changeWeek = (delta) => {
    let w = week + delta;
    let y = year;
    if (w < 1) { w = 52; y -= 1; }
    if (w > 52) { w = 1; y += 1; }
    setWeek(w); setYear(y);
  };

  const validateAll = async () => {
    setValidating(true); setSuccess('');
    try {
      const d = await api.post('/time-entries/validate-week', { week, year });
      setSuccess(`${d.validated} entree(s) approuvee(s)`);
      const res = await api.get(`/time-entries/team?week=${week}&year=${year}`);
      setData(res.team || []);
    } catch (err) { alert(err.message); }
    finally { setValidating(false); }
  };

  const pending = data.filter(e => e.has_pending);

  return (
    <div className="space-y-4 pb-4 max-w-2xl">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeWeek(-1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">‹</button>
          <span className="font-bold text-slate-800">Semaine {week} / {year}</span>
          <button onClick={() => changeWeek(1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">›</button>
        </div>
      </Card>

      {success && <Alert type="success">{success}</Alert>}

      {pending.length > 0 && (
        <Button onClick={validateAll} loading={validating} variant="success" className="w-full">
          Approuver toute la semaine ({pending.length} employe(s))
        </Button>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">✅</div>
          <p>Aucune donnee pour cette semaine</p>
        </div>
      ) : (
        data.map(emp => (
          <Card key={emp.user_id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ultima-100 rounded-xl flex items-center justify-center font-bold text-ultima-600 text-sm flex-shrink-0">
                {(emp.first_name || '?')[0]}{(emp.last_name || '')[0]}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800">{emp.first_name} {emp.last_name}</div>
                <div className="text-xs text-slate-500">{fmt.duration(emp.total_work_min || 0)} travaillees</div>
              </div>
              <div>
                {emp.has_pending
                  ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">En attente</span>
                  : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">OK</span>}
              </div>
            </div>
            {emp.alerts && emp.alerts.length > 0 && (
              <div className="mt-3 space-y-1">
                {emp.alerts.map((a, i) => (
                  <div key={i} className="text-xs bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg">
                    {a.code}: {a.message}
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

function ManagerAbsencesScreen() {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [modal, setModal] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const d = await api.get('/absences/team');
      setAbsences(d.absences || []);
    } catch (err) { console.error(err); }
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

  const filtered = filter === 'ALL' ? absences : absences.filter(a => a.status === filter);

  return (
    <div className="space-y-4 pb-4 max-w-2xl">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-ultima-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            {f === 'PENDING' ? 'En attente' : f === 'APPROVED' ? 'Approuves' : f === 'REJECTED' ? 'Refuses' : 'Tous'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">📅</div>
          <p>Aucune demande</p>
        </div>
      ) : (
        filtered.map(a => {
          const t = ABSENCE_TYPES[a.type] || ABSENCE_TYPES.OTHER;
          return (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold text-slate-800">{a.first_name} {a.last_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">{t.icon}</span>
                    <span className="text-sm text-slate-600">{t.label}</span>
                  </div>
                </div>
                <Badge status={a.status} />
              </div>
              <div className="text-sm text-slate-500 mb-1">
                {fmt.date(a.start_date)} — {fmt.date(a.end_date)} · {a.duration_days} jour(s)
              </div>
              {a.comment && <p className="text-xs text-slate-400">{a.comment}</p>}

              {a.status === 'PENDING' && (
                <div className="flex gap-2 mt-3">
                  <Button onClick={() => setModal({ absence: a, action: 'approve' })}
                    variant="success" size="sm" className="flex-1">Approuver</Button>
                  <Button onClick={() => { setModal({ absence: a, action: 'reject' }); setNote(''); }}
                    variant="danger" size="sm" className="flex-1">Refuser</Button>
                </div>
              )}
            </Card>
          );
        })
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal && modal.action === 'approve' ? 'Approuver la demande' : 'Refuser la demande'}
      >
        {modal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-sm font-semibold">{modal.absence.first_name} {modal.absence.last_name}</p>
              <p className="text-sm text-slate-500">{ABSENCE_TYPES[modal.absence.type] && ABSENCE_TYPES[modal.absence.type].label} · {modal.absence.duration_days} jour(s)</p>
            </div>
            {modal.action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motif de refus *</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Expliquez la raison du refus..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ultima-400"
                />
              </div>
            )}
            {modal.action === 'approve' && (
              <Input label="Note (optionnel)" value={note} onChange={setNote} placeholder="Commentaire..." />
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

// ─── ADMIN SCREEN ─────────────────────────────────────────────────────────────

function AdminScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ROLES = ['EMPLOYEE', 'MANAGER', 'ADMIN'];
  const TYPES = [
    { value: 'MONTEUR',     label: 'Monteur / Poseur' },
    { value: 'ADMIN_STAFF', label: 'Administratif' },
    { value: 'MANAGER',     label: "Chef d'equipe" },
  ];

  const load = async () => {
    try {
      const d = await api.get('/users');
      setUsers(d.users || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const managers = users.filter(u => ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(u.role));

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
    if (role === 'ADMIN' || role === 'SUPERADMIN') return 'bg-purple-100 text-purple-700';
    if (role === 'MANAGER') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="space-y-4 pb-4 max-w-2xl">
      <Button onClick={openCreate} className="w-full">
        <Icon name="plus" size={18} />
        Nouvel utilisateur
      </Button>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">👤</div>
          <p>Aucun utilisateur</p>
        </div>
      ) : users.map(u => (
        <Card key={u.id} className={`p-4 ${!u.active ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3">
            <UserAvatar user={u} size="md" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800">{u.first_name} {u.last_name}</div>
              <div className="text-xs text-slate-500 truncate">{u.email}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${roleColor(u.role)}`}>
              {u.role}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex gap-1 flex-wrap">
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {EMPLOYEE_TYPES[u.employee_type] || u.employee_type}
              </span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{u.weekly_target_h}h/sem</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{u.annual_leave_d}j conges</span>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button onClick={() => openEdit(u)} className="text-xs text-ultima-600 font-semibold hover:text-ultima-700">Modifier</button>
              <button onClick={() => toggleActive(u)}
                className={`text-xs font-semibold ${u.active ? 'text-red-400 hover:text-red-500' : 'text-green-500 hover:text-green-600'}`}>
                {u.active ? 'Desactiver' : 'Activer'}
              </button>
            </div>
          </div>
        </Card>
      ))}

      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal && modal.mode === 'create' ? 'Nouvel utilisateur' : 'Modifier utilisateur'}>
        {modal && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Prenom *" value={form.first_name || ''} onChange={v => setForm(f => ({ ...f, first_name: v }))} />
              <Input label="Nom *" value={form.last_name || ''} onChange={v => setForm(f => ({ ...f, last_name: v }))} />
            </div>
            <Input label="Email" value={form.email || ''} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="prenom@ultima-interior.ch" />
            <Input
              label={modal.mode === 'create' ? 'Mot de passe' : 'Nouveau mot de passe (laisser vide = inchange)'}
              type="password"
              value={form.password || ''}
              onChange={v => setForm(f => ({ ...f, password: v }))}
            />
            <Input label="Telephone" value={form.phone || ''} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+41 79 000 00 00" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select value={form.role || 'EMPLOYEE'} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ultima-400">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select value={form.employee_type || 'MONTEUR'} onChange={e => setForm(f => ({ ...f, employee_type: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ultima-400">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Heures / semaine" type="number" value={form.weekly_target_h ?? 42}
                onChange={v => setForm(f => ({ ...f, weekly_target_h: parseFloat(v) || 42 }))} />
              <Input label="Jours conges / an" type="number" value={form.annual_leave_d ?? 25}
                onChange={v => setForm(f => ({ ...f, annual_leave_d: parseInt(v) || 25 }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Manager assigne</label>
              <select value={form.manager_id || ''} onChange={e => setForm(f => ({ ...f, manager_id: e.target.value || null }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ultima-400">
                <option value="">— Aucun —</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
              </select>
            </div>
            {error && <Alert type="error">{error}</Alert>}
            <div className="flex gap-3 pt-1">
              <Button onClick={() => setModal(null)} variant="secondary" className="flex-1">Annuler</Button>
              <Button onClick={save} loading={saving} className="flex-1">
                {modal.mode === 'create' ? 'Creer' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

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
          const isManager = ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(d.user && d.user.role);
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
      setAuth(user);
      setPinData(null);
      const isManager = ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(user && user.role);
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
    setView('home');
  };

  const refreshMe = async () => {
    try {
      const d = await api.get('/auth/me');
      setAuth(d.user);
      setMeData(d);
    } catch {}
  };

  if (auth === null) return (
    <div className="min-h-screen bg-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-ultima-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl">⏱</span>
        </div>
        <Spinner size="lg" />
      </div>
    </div>
  );

  if (pinData) return (
    <PinScreen token={pinData.token} onSuccess={handlePinSuccess} />
  );

  if (!auth) return <LoginScreen onLogin={handleLogin} />;

  const isManager = ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(auth.role);
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(auth.role);

  const titles = {
    home:       { title: 'Pointage',        subtitle: `Bonjour, ${auth.first_name}` },
    hours:      { title: 'Mes heures',      subtitle: 'Recapitulatif hebdomadaire' },
    absences:   { title: isManager ? 'Gestion des absences' : 'Mes absences', subtitle: null },
    profile:    { title: 'Mon profil',      subtitle: null },
    team:       { title: 'Vue equipe',      subtitle: 'Semaine en cours' },
    validation: { title: 'Validation',      subtitle: 'Approbation des heures' },
    admin:      { title: 'Administration',  subtitle: 'Gestion des utilisateurs' },
  };

  const titleInfo = titles[view] || { title: 'Ultima Pointage', subtitle: null };

  const exportAction = isManager && view === 'team' ? (
    <a href="/api/time-entries/export" target="_blank"
      className="text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors font-medium">
      CSV
    </a>
  ) : null;

  const renderView = () => {
    switch (view) {
      case 'home':       return <HomeScreen user={auth} meData={meData} onRefresh={refreshMe} />;
      case 'hours':      return <HoursScreen user={auth} />;
      case 'absences':   return isManager ? <ManagerAbsencesScreen /> : <AbsencesScreen user={auth} />;
      case 'profile':    return <ProfileScreen user={auth} onLogout={handleLogout} onUserUpdate={refreshMe} />;
      case 'team':       return <TeamScreen />;
      case 'validation': return <ValidationScreen />;
      case 'admin':      return <AdminScreen />;
      default:           return <HomeScreen user={auth} meData={meData} onRefresh={refreshMe} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <SideNav
        current={view}
        role={auth.role}
        onNav={v => { setView(v); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={auth}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden md:ml-64">
        {/* Mobile header */}
        <MobileHeader
          title={titleInfo.title}
          subtitle={titleInfo.subtitle}
          onMenu={() => setSidebarOpen(true)}
          actions={exportAction}
        />

        {/* Desktop page header */}
        <div className="hidden md:flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{titleInfo.title}</h1>
            {titleInfo.subtitle && <p className="text-sm text-slate-500 mt-0.5">{titleInfo.subtitle}</p>}
          </div>
          {exportAction && <div>{exportAction}</div>}
        </div>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

// ─── MOUNT ────────────────────────────────────────────────────────────────────

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
