// ═══════════════════════════════════════════════════════════════
//  ULTIMA POINTAGE — React SPA
//  Mobile-first HR time-tracking for Ultima Interior SA
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

    // Try token refresh on 401
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
  TRAVEL_PRO: { label: 'Trajet pro',  icon: '🚗', color: 'bg-blue-100 text-blue-800' },
  WORK_SITE:  { label: 'Chantier',    icon: '🔨', color: 'bg-amber-100 text-amber-800' },
  WORK_OFFICE:{ label: 'Bureau',      icon: '💼', color: 'bg-purple-100 text-purple-800' },
  BREAK:      { label: 'Pause',       icon: '☕', color: 'bg-slate-100 text-slate-600' },
  TRAINING:   { label: 'Formation',   icon: '📚', color: 'bg-green-100 text-green-800' },
  OTHER:      { label: 'Autre',       icon: '📋', color: 'bg-gray-100 text-gray-700' },
};

const ABSENCE_TYPES = {
  HOLIDAY:           { label: 'Vacances',            icon: '🏖️', color: 'bg-sky-100 text-sky-800',      bar: '#38bdf8' },
  SICK:              { label: 'Maladie',             icon: '🤒', color: 'bg-red-100 text-red-800',      bar: '#f87171' },
  ACCIDENT:          { label: 'Accident',            icon: '🏥', color: 'bg-orange-100 text-orange-800', bar: '#fb923c' },
  TRAINING:          { label: 'Formation',           icon: '📚', color: 'bg-green-100 text-green-800',  bar: '#4ade80' },
  UNPAID:            { label: 'Non payé',            icon: '📄', color: 'bg-gray-100 text-gray-700',    bar: '#9ca3af' },
  SERVICE_MILITAIRE: { label: 'Service militaire',   icon: '🪖', color: 'bg-teal-100 text-teal-800',    bar: '#2dd4bf' },
  MATERNITE:         { label: 'Maternité',           icon: '🤱', color: 'bg-pink-100 text-pink-800',    bar: '#f472b6' },
  PATERNITE:         { label: 'Paternité',           icon: '👨‍👶', color: 'bg-indigo-100 text-indigo-800', bar: '#818cf8' },
  DECES:             { label: 'Décès / deuil',       icon: '🕊️', color: 'bg-slate-100 text-slate-600',  bar: '#94a3b8' },
  MARIAGE:           { label: 'Mariage',             icon: '💍', color: 'bg-violet-100 text-violet-800', bar: '#a78bfa' },
  DEMENAGEMENT:      { label: 'Déménagement',        icon: '📦', color: 'bg-amber-100 text-amber-800',  bar: '#fbbf24' },
  OTHER:             { label: 'Autre',               icon: '📋', color: 'bg-purple-100 text-purple-800', bar: '#c084fc' },
};

const EMPLOYEE_TYPES = {
  MONTEUR:     'Monteur',
  ADMIN_STAFF: 'Admin / Staff',
  MANAGER:     'Manager',
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
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  RETURNED: 'Retourné',
  DRAFT:    'Brouillon',
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

function weekLabel(week, year) {
  if (!week || !year) return `Semaine ${week} / ${year}`;
  const jan4 = new Date(year, 0, 4);
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - jan4.getDay() + 1 + (week - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const fmtD = d => d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long' });
  const fmtDY = d => d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });
  return weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getDate()} – ${fmtDY(weekEnd)}`
    : `${fmtD(weekStart)} – ${fmtDY(weekEnd)}`;
}

function monthLabel(month, year) {
  return new Date(year, month - 1, 1).toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });
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

function Alert({ type = 'info', title, children, onClose }) {
  const styles = {
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };
  return (
    <div className={`border rounded-xl p-3 ${styles[type]}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          {title && <p className="font-semibold text-sm">{title}</p>}
          <p className="text-sm">{children}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-current opacity-60 hover:opacity-100 text-lg leading-none">×</button>
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
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
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

function BottomNav({ current, role, onNav }) {
  const isManager = role === 'MANAGER' || role === 'ADMIN' || role === 'SUPERADMIN';
  const tabs = isManager
    ? [
        { id: 'team',       icon: '👥', label: 'Équipe' },
        { id: 'validation', icon: '✅', label: 'Validation' },
        { id: 'calendar',   icon: '📆', label: 'Calendrier' },
        { id: 'absences',   icon: '📅', label: 'Absences' },
        { id: 'account',    icon: '👤', label: 'Compte' },
      ]
    : [
        { id: 'home',     icon: '⏱️', label: 'Pointage' },
        { id: 'hours',    icon: '📊', label: 'Mes heures' },
        { id: 'absences', icon: '📅', label: 'Absences' },
        { id: 'account',  icon: '👤', label: 'Compte' },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-bottom z-40">
      <div className="flex justify-around">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onNav(t.id)}
            className={`flex-1 flex flex-col items-center py-2 pt-3 gap-0.5 transition-colors
              ${current === t.id ? 'text-ultima-600' : 'text-slate-400'}`}
          >
            <span className="text-xl">{t.icon}</span>
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function TopBar({ title, subtitle, onBack, actions }) {
  return (
    <header className="bg-white border-b border-slate-100 px-4 py-3 safe-top sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-slate-500 hover:text-slate-700 text-xl font-light">←</button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-800 text-lg leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, required, autoFocus, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-ultima-400 focus:border-transparent bg-white"
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

// ─── AUTH SCREENS ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('password'); // 'password' | 'magic'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicToken, setMagicToken] = useState('');

  // Check URL for magic token
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

  const useDemoToken = () => {
    onLogin({ needPin: true, token: magicToken, email });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-ultima-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-4xl">⏱</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Ultima Pointage</h1>
        <p className="text-slate-400 text-sm mt-1">Ultima Interior SA — Bulle</p>
      </div>

      <div className="w-full max-w-sm">
        {/* Mode switcher */}
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
                placeholder="manager@ultima.ch"
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
            <p className="text-white font-semibold">Lien envoyé !</p>
            <p className="text-slate-400 text-sm">Vérifiez votre email <strong className="text-slate-200">{email}</strong></p>
            {magicToken && (
              <div className="bg-slate-700 rounded-xl p-4 text-left">
                <p className="text-xs text-ultima-400 font-semibold mb-2">🔧 Mode démo — Token direct :</p>
                <p className="text-xs text-slate-300 font-mono break-all">{magicToken}</p>
                <Button onClick={useDemoToken} className="w-full mt-3" size="sm" variant="secondary">
                  Utiliser ce token →
                </Button>
              </div>
            )}
            <Button onClick={() => setMagicSent(false)} variant="ghost" className="w-full text-slate-300">← Retour</Button>
          </div>
        ) : (
          <form onSubmit={handleMagic} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Votre email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="prenom@ultima.ch"
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ultima-400" />
            </div>
            {error && <Alert type="error">{error}</Alert>}
            <Button type="submit" loading={loading} className="w-full" size="lg">Envoyer le lien</Button>
            <p className="text-center text-slate-400 text-xs">Recevez un lien de connexion sécurisé sans mot de passe</p>
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
  const [step, setStep] = useState('checking'); // checking | set_pin | enter_pin
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
    if (pin.length !== 4) return setError('Le PIN doit être à 4 chiffres');
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
      <div className="w-24 h-24 bg-ultima-500 rounded-2xl flex items-center justify-center mb-6">
        <span className="text-5xl">🔐</span>
      </div>
      {firstName && <p className="text-ultima-400 text-base font-semibold mb-2">Bonjour, {firstName} 👋</p>}
      <h2 className="text-xl font-bold text-white mb-2">
        {step === 'set_pin' && isNew
          ? pin.length < 4 ? 'Créez votre PIN' : 'Confirmez votre PIN'
          : 'Entrez votre PIN'}
      </h2>
      <p className="text-slate-400 text-sm mb-8 text-center">
        {step === 'set_pin' && isNew
          ? 'Choisissez un code à 4 chiffres pour sécuriser votre accès'
          : 'Saisissez votre code PIN à 4 chiffres'}
      </p>

      {/* Dots */}
      <div className="flex gap-4 mb-8">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full transition-colors ${i < currentPin.length ? 'bg-ultima-400' : 'bg-slate-600'}`} />
        ))}
      </div>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      {/* Keypad */}
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
          ⌫
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
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [showStart, setShowStart] = useState(false);
  const [startForm, setStartForm] = useState({ project_id: '', activity_type: 'WORK_SITE' });
  const [actError, setActError] = useState('');
  const [actLoading, setActLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const [te, pr] = await Promise.all([
        api.get('/time-entries'),
        api.get('/projects'),
      ]);
      setEntries(te.entries || []);
      setAlerts(te.alerts || []);
      const act = (te.entries || []).find(e => e.status === 'DRAFT' && !e.ended_at);
      setActive(act || null);
      setProjects(pr.projects || []);
      if (pr.projects?.length && !startForm.project_id) {
        setStartForm(f => ({ ...f, project_id: pr.projects[0].id }));
      }
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
    if (!startForm.project_id) return setActError('Sélectionnez un chantier');
    setActLoading(true); setActError('');
    try {
      await api.post('/time-entries', {
        project_id: startForm.project_id,
        activity_type: startForm.activity_type,
      });
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

  // Today's entries
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter(e => {
    const d = new Date(e.started_at * 1000).toISOString().split('T')[0];
    return d === today;
  });

  const todayWork = todayEntries.filter(e => e.activity_type !== 'BREAK' && e.ended_at)
    .reduce((s, e) => s + (e.duration_min || 0), 0);
  const dailyTarget = (user.weekly_target_h || 42) / 5 * 60;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="space-y-4 pb-4">
      {/* Alerts */}
      {alerts.map((a, i) => (
        <Alert key={i} type="warning" title={a.code}>
          {a.message}
        </Alert>
      ))}

      {/* Active session card */}
      {active ? (
        <Card className="p-5 border-2 border-ultima-300">
          <div className="text-center">
            <div className="text-sm font-medium text-ultima-600 mb-1">Session active</div>
            <div className="text-5xl font-mono font-bold text-slate-800 mb-2 tracking-tight">{elapsed}</div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className={`px-3 py-1 rounded-full text-sm ${ACTIVITY_TYPES[active.activity_type]?.color}`}>
                {ACTIVITY_TYPES[active.activity_type]?.icon} {ACTIVITY_TYPES[active.activity_type]?.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Démarré à {fmt.time(active.started_at)}</p>
            <div className="w-20 h-20 mx-auto relative mb-4">
              <div className="w-20 h-20 bg-red-100 rounded-full pulse-ring flex items-center justify-center cursor-pointer"
                onClick={stopEntry}>
                <div className="text-center">
                  <div className="text-2xl">⏹</div>
                  <div className="text-xs font-semibold text-red-700">Stop</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="text-center">
            <div className="text-slate-400 text-sm mb-3">Aucune session active</div>
            <Button onClick={() => setShowStart(true)} className="w-full" size="lg">
              <span className="text-lg">▶</span> Démarrer le pointage
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
        {meData?.week_summary && (
          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>Semaine S{meData.week_summary.week}</span>
            <span>{fmt.duration(meData.week_summary.total_work_min)} / {(user.weekly_target_h || 42)}h</span>
          </div>
        )}
      </Card>

      {/* Today's entries */}
      {todayEntries.length > 0 && (
        <Card>
          <div className="p-4 border-b border-slate-50">
            <h3 className="font-semibold text-slate-700 text-sm">Activités du jour</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {todayEntries.map(e => (
              <div key={e.id} className="px-4 py-3 flex items-center gap-3">
                <span className="text-xl">{ACTIVITY_TYPES[e.activity_type]?.icon || '📋'}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700">
                    {ACTIVITY_TYPES[e.activity_type]?.label}
                  </div>
                  <div className="text-xs text-slate-400">
                    {fmt.time(e.started_at)} — {e.ended_at ? fmt.time(e.ended_at) : 'en cours'}
                  </div>
                </div>
                <div className="text-right">
                  {e.ended_at
                    ? <span className="text-sm font-semibold text-slate-600">{fmt.duration(e.duration_min)}</span>
                    : <span className="text-xs text-ultima-500 font-medium">En cours</span>}
                  <Badge status={e.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Start session modal */}
      <Modal open={showStart} onClose={() => setShowStart(false)} title="Démarrer une activité">
        <div className="space-y-4">
          <Select
            label="Chantier"
            value={startForm.project_id}
            onChange={v => setStartForm(f => ({ ...f, project_id: v }))}
            options={projects.map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type d'activité</label>
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
                  <div className="text-lg">{v.icon}</div>
                  <div className="text-xs font-medium text-slate-700 mt-1">{v.label}</div>
                </button>
              ))}
            </div>
          </div>
          {actError && <Alert type="error">{actError}</Alert>}
          <div className="flex gap-3">
            <Button onClick={() => setShowStart(false)} variant="secondary" className="flex-1">Annuler</Button>
            <Button onClick={startEntry} loading={actLoading} className="flex-1">▶ Démarrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function HoursScreen({ user }) {
  const [mode, setMode] = useState('week'); // day | week | month | year
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Navigation state
  const now = new Date();
  const [selDate, setSelDate] = useState(now.toISOString().split('T')[0]);
  const [selWeek, setSelWeek] = useState(() => {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dow = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dow);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  });
  const [selWeekYear, setSelWeekYear] = useState(() => {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dow = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dow);
    return d.getUTCFullYear();
  });
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear, setSelYear] = useState(now.getFullYear());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url;
      if (mode === 'day')   url = `/time-entries?mode=day&date=${selDate}`;
      else if (mode === 'month') url = `/time-entries?mode=month&month=${selMonth}&year=${selYear}`;
      else if (mode === 'year')  url = `/time-entries?mode=year&year=${selYear}`;
      else url = `/time-entries?mode=week&week=${selWeek}&year=${selWeekYear}`;
      const d = await api.get(url);
      setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [mode, selDate, selWeek, selWeekYear, selMonth, selYear]);

  useEffect(() => { load(); }, [load]);

  const changeWeek = (delta) => {
    let w = selWeek + delta, y = selWeekYear;
    if (w < 1) { w = 52; y--; } if (w > 52) { w = 1; y++; }
    setSelWeek(w); setSelWeekYear(y);
  };
  const changeMonth = (delta) => {
    let m = selMonth + delta, y = selYear;
    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    setSelMonth(m); setSelYear(y);
  };
  const changeDay = (delta) => {
    const d = new Date(selDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setSelDate(d.toISOString().split('T')[0]);
  };

  const target = (user.weekly_target_h || 42) * 60;
  const dailyTarget = target / 5;

  const computeByDay = (entries) => {
    const map = {};
    (entries || []).forEach(e => {
      const d = new Date(e.started_at * 1000).toISOString().split('T')[0];
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return Object.entries(map).sort(([a], [b]) => a < b ? 1 : -1);
  };

  // ─── Week view
  const WeekView = () => {
    const entries = data?.entries || [];
    const totalWork = entries.filter(e => e.activity_type !== 'BREAK' && e.ended_at)
      .reduce((s, e) => s + (e.duration_min || 0), 0);
    const byDay = computeByDay(entries);
    return (
      <>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => changeWeek(-1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">‹</button>
            <div className="text-center">
              <div className="font-bold text-slate-800 text-sm">{weekLabel(selWeek, selWeekYear)}</div>
              <div className="text-xs text-slate-400">Semaine {selWeek} · {selWeekYear}</div>
            </div>
            <button onClick={() => changeWeek(1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">›</button>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-500">Total semaine</span>
            <span className={`text-sm font-bold ${totalWork >= target ? 'text-green-600' : 'text-slate-700'}`}>
              {fmt.duration(totalWork)} / {user.weekly_target_h || 42}h
            </span>
          </div>
          <ProgressBar value={totalWork} max={target} />
        </Card>
        {byDay.length === 0
          ? <div className="text-center py-12 text-slate-400"><div className="text-4xl mb-3">📭</div><p>Aucune entrée cette semaine</p></div>
          : byDay.map(([day, dayEntries]) => {
              const dayWork = dayEntries.filter(e => e.activity_type !== 'BREAK' && e.ended_at).reduce((s, e) => s + (e.duration_min || 0), 0);
              const hasMeal = dayEntries.some(e => e.meal_allowance);
              return (
                <Card key={day}>
                  <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700 capitalize">{fmt.weekday(day)}</span>
                    <div className="flex items-center gap-2">
                      {hasMeal && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">🍽 Repas</span>}
                      <span className="text-sm font-bold text-slate-600">{fmt.duration(dayWork)}</span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {dayEntries.map(e => (
                      <div key={e.id} className="px-4 py-2.5 flex items-center gap-3">
                        <span>{ACTIVITY_TYPES[e.activity_type]?.icon || '📋'}</span>
                        <div className="flex-1">
                          <div className="text-sm text-slate-700">{ACTIVITY_TYPES[e.activity_type]?.label}</div>
                          <div className="text-xs text-slate-400">{fmt.time(e.started_at)} – {e.ended_at ? fmt.time(e.ended_at) : '…'}|/div>
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
            })}
      </>
    );
  };

  // ─── Day view
  const DayView = () => {
    const entries = data?.entries || [];
    const totalWork = entries.filter(e => e.activity_type !== 'BREAK' && e.ended_at).reduce((s, e) => s + (e.duration_min || 0), 0);
    const hasMeal = entries.some(e => e.meal_allowance);
    return (
      <>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => changeDay(-1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">‹</button>
            <div className="text-center">
              <div className="font-bold text-slate-800 capitalize">{fmt.weekday(selDate)}</div>
              <div className="text-xs text-slate-400">{fmt.date(selDate)}</div>
            </div>
            <button onClick={() => changeDay(1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">›</button>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-500">Total jour</span>
            <div className="flex items-center gap-2">
              {hasMeal && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">🍽 Repas</span>}
              <span className={`text-sm font-bold ${totalWork >= dailyTarget ? 'text-green-600' : 'text-slate-700'}`}>{fmt.duration(totalWork)}</span>
            </div>
          </div>
          <ProgressBar value={totalWork} max={dailyTarget} />
        </Card>
        {entries.length === 0
          ? <div className="text-center py-12 text-slate-400"><div className="text-4xl mb-3">📭</div><p>Aucune entrée ce jour</p></div>
          : <Card><div className="divide-y divide-slate-50">
              {entries.map(e => (
                <div key={e.id} className="px-4 py-3 flex items-center gap-3">
                  <span>{ACTIVITY_TYPES[e.activity_type]?.icon || '📋'}|/span>
                  <div className="flex-1">
                    <div className="text-sm text-slate-700">{ACTIVITY_TYPES[e.activity_type]?.label}</div>
                    <div className="text-xs text-slate-400">{fmt.time(e.started_at)} – {e.ended_at ? fmt.time(e.ended_at) : '…'}</div>
                  </div>
                  <div className="text-right space-y-1">
                    {e.ended_at && <div className="text-sm font-medium">{fmt.duration(e.duration_min)}</div>}
                    <Badge status={e.status} />
                  </div>
                </div>
              ))}
            </div></Card>}
      </>
    );
  };

  // ─── Month view
  const MonthView = () => {
    const days = data?.days || [];
    const totalWork = data?.total_min || 0;
    const daysWorked = days.filter(d => d.work_min > 0).length;
    return (
      <>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => changeMonth(-1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">‹</button>
            <div className="text-center">
              <div className="font-bold text-slate-800 capitalize">{monthLabel(selMonth, selYear)}</div>
              <div className="text-xs text-slate-400">{daysWorked} jour(s) travaillé(s)</div>
            </div>
            <button onClick={() => changeMonth(1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">›</button>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-500">Total mois</span>
            <span className="text-sm font-bold text-slate-700">{fmt.duration(totalWork)}</span>
          </div>
          <ProgressBar value={totalWork} max={(user.weekly_target_h || 42) * 4.33 * 60} />
        </Card>
        {/* Mini bar chart */}
        {days.length > 0 && (
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Détail par jour</h3>
            <div className="flex items-end gap-0.5" style={{ height: '60px' }}>
              {days.map(d => {
                const pct = Math.min(100, (d.work_min / dailyTarget) * 100);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-slate-100 rounded-sm relative" style={{ height: '48px' }}>
                      <div className={`absolute bottom-0 left-0 right-0 rounded-sm ${pct >= 100 ? 'bg-green-400' : 'bg-ultima-400'}`} style={{ height: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 space-y-2">
              {days.slice().reverse().map(d => (
                <div key={d.date} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 capitalize">{fmt.weekday(d.date)}</span>
                  <span className="font-medium text-slate-700">{fmt.duration(d.work_min)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
        {days.length === 0 && <div className="text-center py-12 text-slate-400"><div className="text-4xl mb-3">📭</div><p>Aucune entrée ce mois</p></div>}
      </>
    );
  };

  // ─── Year view
  const YearView = () => {
    const months = data?.months || [];
    const totalWork = data?.total_min || 0;
    const monthNames = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
    const maxMin = Math.max(...months.map(m => m.work_min), 1);
    return (
      <>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setSelYear(y => y - 1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">‹</button>
            <div className="text-center">
              <div className="font-bold text-slate-800">{selYear}</div>
              <div className="text-xs text-slate-400">Vue annuelle</div>
            </div>
            <button onClick={() => setSelYear(y => y + 1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">›</button>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-500">Total {selYear}</span>
            <span className="text-sm font-bold text-slate-700">{fmt.duration(totalWork)}</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-end gap-1" style={{ height: '80px' }}>
            {months.map(m => {
              const pct = (m.work_min / maxMin) * 100;
              const isCurrentMonth = m.month === (new Date().getMonth() + 1) && selYear === new Date().getFullYear();
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-slate-100 rounded-sm relative" style={{ height: '56px' }}>
                    <div className={`absolute bottom-0 left-0 right-0 rounded-sm transition-all ${isCurrentMonth ? 'bg-ultima-500' : 'bg-ultima-300'}`}
                      style={{ height: `${pct}%` }} />
                  </div>
                  <span className={`text-[9px] ${isCurrentMonth ? 'text-ultima-600 font-bold' : 'text-slate-400'}`}>
                    {monthNames[m.month - 1]}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-2">
            {months.filter(m => m.work_min > 0).slice().reverse().map(m => (
              <div key={m.month} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{monthNames[m.month - 1]} {selYear}</span>
                <span className="font-medium text-slate-700">{fmt.duration(m.work_min)}</span>
              </div>
            ))}
          </div>
        </Card>
      </>
    );
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Mode selector */}
      <div className="flex bg-white rounded-2xl border border-slate-100 shadow-sm p-1 gap-1">
        {[['day','Jour'],['week','Semaine'],['month','Mois'],['year','Année']].map(([m, lbl]) => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${mode === m ? 'bg-ultima-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {lbl}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : (
        mode === 'day'   ? <DayView /> :
        mode === 'month' ? <MonthView /> :
        mode === 'year'  ? <YearView /> :
                           <WeekView />
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
    <div className="space-y-4 pb-4">
      {/* Balance card */}
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
              ⏳ {balance.holiday_pending} jour(s) en attente d'approbation
            </div>
          )}
          {balance.comp_balance > 0 && (
            <div className="mt-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
              ⊕ {balance.comp_balance}h de compensation disponibles
            </div>
          )}
        </Card>
      )}

      {/* New absence button */}
      <Button onClick={() => setShowNew(true)} className="w-full">
        + Nouvelle demande d'absence
      </Button>

      {/* Absence list */}
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
                          {fmt.date(a.start_date)} → {fmt.date(a.end_date)} ({a.duration_days}j)
                        </div>
                      </div>
                    </div>
                    <Badge status={a.status} />
                  </div>
                  {a.comment && <p className="text-xs text-slate-400 mt-1 ml-8">💬 {a.comment}</p>}
                  {a.review_note && (
                    <p className="text-xs text-red-500 mt-1 ml-8">📝 {a.review_note}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* New absence modal */}
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
            placeholder="Ex: vacances estivales" />
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

function CalendarScreen() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get(`/absences/calendar?month=${month}&year=${year}`);
      setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const changeMonth = (delta) => {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };

  const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const DAY_NAMES = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  const getDaysInMonth = (m, y) => new Date(y, m, 0).getDate();
  const getFirstWeekday = (m, y) => {
    const d = new Date(y, m - 1, 1).getDay();
    return d === 0 ? 6 : d - 1; // Mon=0
  };

  const buildCalendar = () => {
    const daysInMonth = getDaysInMonth(month, year);
    const firstWd = getFirstWeekday(month, year);
    const cells = [];
    for (let i = 0; i < firstWd; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  };

  const getAbsencesForDay = (day) => {
    if (!data || !day) return [];
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const all = [
      ...(data.absences || []).map(a => ({ ...a, _pending: false })),
      ...(data.pending || []).map(a => ({ ...a, _pending: true })),
    ];
    return all.filter(a => {
      if (filterType !== 'ALL' && a.type !== filterType) return false;
      return a.start_date <= dateStr && a.end_date >= dateStr;
    });
  };

  const getHolidayForDay = (day) => {
    if (!data || !day) return null;
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return (data.holidays || []).find(h => h.date === dateStr) || null;
  };

  const isToday = (day) => {
    if (!day) return false;
    const d = new Date();
    return d.getDate() === day && d.getMonth() + 1 === month && d.getFullYear() === year;
  };

  const isWeekend = (cellIndex) => {
    const dayOfWeek = cellIndex % 7;
    return dayOfWeek === 5 || dayOfWeek === 6; // Sat / Sun
  };

  const cells = buildCalendar();

  // Unique types in current data for filter
  const availableTypes = ['ALL', ...new Set([
    ...(data?.absences || []).map(a => a.type),
    ...(data?.pending || []).map(a => a.type),
  ])];

  return (
    <div className="space-y-4 pb-4">
      {/* Header nav */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeMonth(-1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">‹</button>
          <div className="text-center">
            <div className="font-bold text-slate-800">{MONTH_NAMES[month - 1]} {year}</div>
            <div className="text-xs text-slate-400">{data ? `${(data.absences || []).length} absence(s) approuvée(s)` : '…'}</div>
          </div>
          <button onClick={() => changeMonth(1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">›</button>
        </div>
      </Card>

      {/* Type filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {availableTypes.map(t => {
          const info = ABSENCE_TYPES[t];
          return (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterType === t ? 'bg-ultima-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
              {t === 'ALL' ? '📅 Tous' : `${info?.icon || ''} ${info?.label || t}`}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Calendar grid */}
          <Card className="p-3">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map(d => (
                <div key={d} className={`text-center text-[10px] font-semibold py-1 ${d === 'Sam' || d === 'Dim' ? 'text-slate-300' : 'text-slate-400'}`}>{d}</div>
              ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, idx) => {
                const dayAbsences = getAbsencesForDay(day);
                const holiday = getHolidayForDay(day);
                const weekend = isWeekend(idx);
                return (
                  <div key={idx} className={`min-h-[52px] rounded-lg p-1 ${!day ? '' : holiday ? 'bg-amber-50' : weekend ? 'bg-slate-50/60' : 'bg-white'} ${isToday(day) ? 'ring-2 ring-ultima-400' : ''}`}>
                    {day && (
                      <>
                        <div className={`text-[11px] font-semibold mb-0.5 ${isToday(day) ? 'text-ultima-600' : weekend ? 'text-slate-300' : 'text-slate-600'}`}>{day}</div>
                        {holiday && <div className="text-[9px] text-amber-600 font-medium leading-tight truncate">🎌 {holiday.name.split(' ')[0]}</div>}
                        {dayAbsences.slice(0, 2).map((a, i) => {
                          const t = ABSENCE_TYPES[a.type] || ABSENCE_TYPES.OTHER;
                          return (
                            <div key={i} className={`text-[9px] px-1 rounded leading-tight mb-0.5 truncate ${a._pending ? 'opacity-50' : ''}`}
                              style={{ backgroundColor: t.bar + '33', color: t.bar }}>
                              {a.first_name?.[0]}{a.last_name?.[0]}
                            </div>
                          );
                        })}
                        {dayAbsences.length > 2 && <div className="text-[9px] text-slate-400">+{dayAbsences.length - 2}</div>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Legend */}
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Absences ce mois</h3>
            {(data?.absences?.length === 0 && data?.pending?.length === 0) ? (
              <p className="text-sm text-slate-400 text-center py-2">Aucune absence ce mois</p>
            ) : (
              <div className="space-y-2">
                {[...(data?.absences || []).map(a => ({ ...a, _pending: false })),
                   ...(data?.pending || []).map(a => ({ ...a, _pending: true }))
                ].filter(a => filterType === 'ALL' || a.type === filterType)
                 .sort((a, b) => a.start_date.localeCompare(b.start_date))
                 .map(a => {
                  const t = ABSENCE_TYPES[a.type] || ABSENCE_TYPES.OTHER;
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.bar }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700">{a.first_name} {a.last_name}</div>
                        <div className="text-xs text-slate-400">{t.icon} {t.label} · {fmt.date(a.start_date)} → {fmt.date(a.end_date)} ({a.duration_days}j)</div>
                      </div>
                      {a._pending && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex-shrink-0">En attente</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Swiss holidays */}
          {data?.holidays?.length > 0 && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Jours fériés (Fribourg)</h3>
              <div className="space-y-2">
                {data.holidays.map(h => (
                  <div key={h.date} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">🎌 {h.name}</span>
                    <span className="text-slate-400">{fmt.date(h.date)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function AccountScreen({ user, onLogout }) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
    } catch {}
    api.clearTokens();
    onLogout();
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Profile card */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-ultima-100 rounded-2xl flex items-center justify-center">
            <span className="text-3xl font-bold text-ultima-700">
              {(user.first_name || '?')[0]}{(user.last_name || '')[0]}
            </span>
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{user.first_name} {user.last_name}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {user.role === 'MANAGER' ? '👔 Responsable' : user.role === 'ADMIN' ? '🛠 Admin' : '👷 Monteur'}
            </span>
          </div>
        </div>
      </Card>

      {/* Info grid */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-3">Mes paramètres</h3>
        <div className="space-y-3">
          {[
            { label: 'Cible hebdo', value: `${user.weekly_target_h || 42}h / semaine` },
            { label: 'Congés annuels', value: `${user.annual_leave_d || 25} jours` },
            { label: 'Téléphone', value: user.phone || '—' },
          ].map(item => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{item.label}</span>
              <span className="font-medium text-slate-700">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Legal */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-2">Information légale</h3>
        <p className="text-xs text-slate-400">
          Vos données sont hébergées en Suisse conformément à la nLPD.
          Ultima Interior SA, Bulle (FR). Responsable: direction@ultima-interior.ch
        </p>
      </Card>

      <Button onClick={handleLogout} loading={loading} variant="danger" className="w-full">
        Déconnexion
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
      .then(d => setData((d.team || []).map(m => ({
        ...m, ...(m.employee || {}),
        user_id: m.employee ? m.employee.id : m.user_id,
        total_work_min: m.total_min || 0,
        has_pending: (m.pending_count || 0) > 0,
      }))))
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
      <div className="space-y-4 pb-4">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-slate-600 font-medium">
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
                ? <div className="p-6 text-center text-slate-400">Aucune entrée</div>
                : entries.map(e => (
                  <div key={e.id} className="px-4 py-3 flex items-center gap-3">
                    <span>{ACTIVITY_TYPES[e.activity_type]?.icon || '📋'}|/span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{ACTIVITY_TYPES[e.activity_type]?.label}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(e.started_at * 1000).toLocaleDateString('fr-CH', { weekday: 'short', day: 'numeric' })} · {fmt.time(e.started_at)} – {e.ended_at ? fmt.time(e.ended_at) : '…'}
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
    <div className="space-y-4 pb-4">
      {/* Week nav */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeWeek(-1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">‹</button>
          <div className="text-center">
            <div className="font-bold text-slate-800 text-sm">{weekLabel(week, year)}</div>
            <div className="text-xs text-slate-400">S{week} / {year}</div>
          </div>
          <button onClick={() => changeWeek(1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">›</button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">👥</div>
          <p>Aucune donnée pour cette semaine</p>
        </div>
      ) : (
        data.map(emp => {
          const totalWork = (emp.total_work_min || 0);
          const target = (emp.weekly_target_h || 42) * 60;
          const pct = fmt.pct(totalWork, target);
          const hasAlerts = emp.alerts?.length > 0;

          return (
            <Card key={emp.user_id} className="p-4" onClick={() => viewUser(emp)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-600">
                  {(emp.first_name || '?')[0]}{(emp.last_name || '')[0]}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{emp.first_name} {emp.last_name}</div>
                  <div className="text-xs text-slate-500">{emp.employee_type}</div>
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
                      ⚠ {a.code}
                    </span>
                  ))}
                </div>
              )}
              {emp.status && (
                <div className="mt-2"><Badge status={emp.status} /></div>
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
  const [returnModal, setReturnModal] = useState(null);
  const [returnNote, setReturnNote] = useState('');

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
      .then(d => setData((d.team || []).map(m => ({
        ...m, ...(m.employee || {}),
        user_id: m.employee ? m.employee.id : m.user_id,
        total_work_min: m.total_min || 0,
        has_pending: (m.pending_count || 0) > 0,
      }))))
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
      setSuccess(`${d.validated} entrée(s) approuvée(s)`);
      const res = await api.get(`/time-entries/team?week=${week}&year=${year}`);
      setData(res.team || []);
    } catch (err) { alert(err.message); }
    finally { setValidating(false); }
  };

  const pending = data.filter(e => e.has_pending);

  return (
    <div className="space-y-4 pb-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeWeek(-1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">‹</button>
          <div className="text-center">
            <div className="font-bold text-slate-800 text-sm">{weekLabel(week, year)}</div>
            <div className="text-xs text-slate-400">S{week} / {year}</div>
          </div>
          <button onClick={() => changeWeek(1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">›</button>
        </div>
      </Card>

      {success && <Alert type="success">{success}</Alert>}

      {pending.length > 0 && (
        <Button onClick={validateAll} loading={validating} variant="success" className="w-full">
          ✅ Approuver toute la semaine ({pending.length} employé(s))
        </Button>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">✅</div>
          <p>Aucune donnée pour cette semaine</p>
        </div>
      ) : (
        data.map(emp => (
          <Card key={emp.user_id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-600 text-sm">
                {(emp.first_name || '?')[0]}{(emp.last_name || '')[0]}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800">{emp.first_name} {emp.last_name}</div>
                <div className="text-xs text-slate-500">{fmt.duration(emp.total_work_min || 0)} travaillées</div>
              </div>
              <div>
                {emp.has_pending
                  ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">En attente</span>
                  : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ OK</span>}
              </div>
            </div>
            {emp.alerts?.length > 0 && (
              <div className="mt-3 space-y-1">
                {emp.alerts.map((a, i) => (
                  <div key={i} className="text-xs bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg">
                    ⚠ {a.code}: {a.message}
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
  const [tab, setTab] = useState('requests'); // requests | balances
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [modal, setModal] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [balances, setBalances] = useState([]);
  const [balYear, setBalYear] = useState(new Date().getFullYear());
  const [balLoading, setBalLoading] = useState(false);

  const load = async () => {
    try {
      const d = await api.get('/absences/team');
      setAbsences(d.absences || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadBalances = useCallback(async () => {
    setBalLoading(true);
    try {
      const d = await api.get(`/absences/balances?year=${balYear}`);
      setBalances(d.balances || []);
    } catch (err) { console.error(err); }
    finally { setBalLoading(false); }
  }, [balYear]);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'balances') loadBalances(); }, [tab, loadBalances]);

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
  const pendingCount = absences.filter(a => a.status === 'PENDING').length;

  return (
    <div className="space-y-4 pb-4">
      {/* Tab switcher */}
      <div className="flex bg-white rounded-2xl border border-slate-100 shadow-sm p-1 gap-1">
        <button onClick={() => setTab('requests')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'requests' ? 'bg-ultima-500 text-white' : 'text-slate-500'}`}>
          Demandes {pendingCount > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{pendingCount}</span>}
        </button>
        <button onClick={() => setTab('balances')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'balances' ? 'bg-ultima-500 text-white' : 'text-slate-500'}`}>
          Soldes
        </button>
      </div>

      {tab === 'balances' ? (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => setBalYear(y => y - 1)} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center">‹</button>
            <span className="font-bold text-slate-700">{balYear}</span>
            <button onClick={() => setBalYear(y => y + 1)} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center">›</button>
          </div>
          {balLoading ? (
            <div className="flex justify-center py-8"><Spinner size="lg" /></div>
          ) : balances.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><div className="text-4xl mb-3">📊</div><p>Aucun employé trouvé</p></div>
          ) : (
            balances.map(b => (
              <Card key={b.employee.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-ultima-100 rounded-xl flex items-center justify-center font-bold text-ultima-700 text-sm">
                    {b.employee.first_name?.[0]}{b.employee.last_name?.[0]}
                  </div>
                  <div className="font-semibold text-slate-800">{b.employee.first_name} {b.employee.last_name}</div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="font-bold text-slate-700 text-base">{b.holiday_total}</div>
                    <div className="text-slate-400">Total</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2">
                    <div className="font-bold text-red-600 text-base">{b.holiday_taken}</div>
                    <div className="text-slate-400">Pris</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-2">
                    <div className="font-bold text-yellow-600 text-base">{b.holiday_pending}</div>
                    <div className="text-slate-400">En att.</div>
                  </div>
                  <div className={`rounded-lg p-2 ${b.holiday_remaining < 5 ? 'bg-orange-50' : 'bg-green-50'}`}>
                    <div className={`font-bold text-base ${b.holiday_remaining < 5 ? 'text-orange-600' : 'text-green-600'}`}>{b.holiday_remaining.toFixed(1)}</div>
                    <div className="text-slate-400">Restant</div>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={b.holiday_taken + b.holiday_pending} max={b.holiday_total} />
                </div>
              </Card>
            ))
          )}
        </>
      ) : (
        <>
          {/* Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-ultima-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                {f === 'PENDING' ? 'En attente' : f === 'APPROVED' ? 'Approuvés' : f === 'REJECTED' ? 'Refusés' : 'Tous'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Spinner size="lg" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><div className="text-4xl mb-3">📅</div><p>Aucune demande</p></div>
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
                    {fmt.date(a.start_date)} → {fmt.date(a.end_date)} · {a.duration_days} jour(s)
                  </div>
                  {a.comment && <p className="text-xs text-slate-400">💬 {a.comment}</p>}
                  {a.status === 'PENDING' && (
                    <div className="flex gap-2 mt-3">
                      <Button onClick={() => setModal({ absence: a, action: 'approve' })} variant="success" size="sm" className="flex-1">✓ Approuver</Button>
                      <Button onClick={() => { setModal({ absence: a, action: 'reject' }); setNote(''); }} variant="danger" size="sm" className="flex-1">✗ Refuser</Button>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.action === 'approve' ? 'Approuver la demande' : 'Refuser la demande'}
      >
        {modal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-sm font-semibold">{modal.absence.first_name} {modal.absence.last_name}</p>
              <p className="text-sm text-slate-500">{ABSENCE_TYPES[modal.absence.type]?.label} · {modal.absence.duration_days} jour(s)</p>
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
                {modal.action === 'approve' ? '✓ Confirmer' : '✗ Refuser'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ProjectsScreen({ user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', client_name: '', address: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isManager = ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(user?.role);

  const load = async () => {
    try {
      const d = await api.get('/projects');
      setProjects(d.projects || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.code || !form.name) return setError('Code et nom requis');
    setSaving(true); setError('');
    try {
      await api.post('/projects', form);
      setShowNew(false);
      setForm({ code: '', name: '', client_name: '', address: '', start_date: '', end_date: '' });
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (p) => {
    try {
      await api.patch(`/projects/${p.id}`, { status: p.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' });
      await load();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-4 pb-4">
      {isManager && (
        <Button onClick={() => setShowNew(true)} className="w-full">
          + Nouveau chantier
        </Button>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-3">🏗️</div>
          <p>Aucun chantier actif</p>
        </div>
      ) : (
        projects.map(p => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-semibold text-slate-800">{p.name}</div>
                <div className="text-xs text-ultima-600 font-mono mt-0.5">{p.code}</div>
                {p.client_name && <div className="text-sm text-slate-500 mt-1">👤 {p.client_name}</div>}
                {p.address && <div className="text-xs text-slate-400 mt-0.5">📍 {p.address}</div>}
                <div className="text-xs text-slate-400 mt-1">
                        {p.start_date && `Du ${fmt.date(p.start_date)}`}
                  {p.end_date && ` au ${fmt.date(p.end_date)}`}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {p.status === 'ACTIVE' ? 'Actif' : 'Archivé'}
                </span>
                {isManager && (
                  <button onClick={() => toggleStatus(p)} className="text-xs text-slate-400 hover:text-slate-600">
                    {p.status === 'ACTIVE' ? 'Archiver' : 'Réactiver'}
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nouveau chantier">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Code *" value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))}
              placeholder="VIL-2026-01" />
            <Input label="Nom *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))}
              placeholder="Cuisine Villars" />
          </div>
          <Input label="Client" value={form.client_name} onChange={v => setForm(f => ({ ...f, client_name: v }))}
            placeholder="Famille Morel" />
          <Input label="Adresse" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))}
            placeholder="Route de Fribourg 45, Villars" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Début" type="date" value={form.start_date} onChange={v => setForm(f => ({ ...f, start_date: v }))} />
            <Input label="Fin" type="date" value={form.end_date} onChange={v => setForm(f => ({ ...f, end_date: v }))} />
          </div>
          {error && <Alert type="error">{error}</Alert>}
          <div className="flex gap-3">
            <Button onClick={() => setShowNew(false)} variant="secondary" className="flex-1">Annuler</Button>
            <Button onClick={create} loading={saving} className="flex-1">Créer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

function App() {
  const [auth, setAuth] = useState(null); // null = loading, false = unauthenticated, object = user
  const [pinData, setPinData] = useState(null); // { token, email }
  const [view, setView] = useState('home');
  const [meData, setMeData] = useState(null);

  // Load tokens on mount
  useEffect(() => {
    api.loadTokens();
    if (api.token) {
      api.get('/auth/me')
        .then(d => { setAuth(d.user); setMeData(d); })
        .catch(() => { api.clearTokens(); setAuth(false); });
    } else {
      setAuth(false);
    }
  }, []);

  // Check URL token on mount
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
      // Set default view
      const isManager = ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(user?.role);
      setView(isManager ? 'team' : 'home');
    }
  };

  const handlePinSuccess = (user) => {
    setAuth(user);
    setPinData(null);
    const isManager = ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(user?.role);
    setView(isManager ? 'team' : 'home');
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

  // Loading state
  if (auth === null) return (
    <div className="min-h-screen bg-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-ultima-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⏱</span>
        </div>
        <Spinner size="lg" />
      </div>
    </div>
  );

  // PIN screen
  if (pinData) return (
    <PinScreen token={pinData.token} onSuccess={handlePinSuccess} />
  );

  // Login screen
  if (!auth) return <LoginScreen onLogin={handleLogin} />;

  const isManager = ['MANAGER', 'ADMIN', 'SUPERADMIN'].includes(auth.role);
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(auth.role);

  // Page title mapping
  const titles = {
    home:       { title: 'Pointage', subtitle: `Bonjour, ${auth.first_name} 👋` },
    hours:      { title: 'Mes heures', subtitle: 'Jour · Semaine · Mois · Année' },
    absences:   { title: isManager ? 'Gestion des absences' : 'Mes absences', subtitle: null },
    account:    { title: 'Mon compte', subtitle: null },
    team:       { title: 'Vue équipe', subtitle: 'Semaine en cours' },
    validation: { title: 'Validation', subtitle: 'Approbation des heures' },
    projects:   { title: 'Chantiers', subtitle: 'Projets actifs' },
    calendar:   { title: 'Calendrier', subtitle: 'Absences & jours fériés' },
  };

  const titleInfo = titles[view] || { title: 'Ultima Pointage', subtitle: null };

  const renderView = () => {
    switch (view) {
      case 'home':       return <HomeScreen user={auth} meData={meData} onRefresh={refreshMe} />;
      case 'hours':      return <HoursScreen user={auth} />;
      case 'absences':   return isManager ? <ManagerAbsencesScreen /> : <AbsencesScreen user={auth} />;
      case 'account':    return <AccountScreen user={auth} onLogout={handleLogout} />;
      case 'team':       return <TeamScreen />;
      case 'validation': return <ValidationScreen />;
      case 'projects':   return <ProjectsScreen user={auth} />;
      case 'calendar':   return <CalendarScreen />;
      default:           return <HomeScreen user={auth} meData={meData} onRefresh={refreshMe} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <TopBar
        title={titleInfo.title}
        subtitle={titleInfo.subtitle}
        actions={
          <div className="flex items-center gap-2">
            {isManager && view === 'team' && (
              <a href="/api/time-entries/export" target="_blank"
                className="text-xs text-slate-500 hover:text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                ↓ CSV
              </a>
            )}
          </div>
        }
      />
      <main className="px-4 pt-4 pb-24">
        {renderView()}
      </main>
      <BottomNav current={view} role={auth.role} onNav={setView} />
    </div>
  );
}

// ─── MOUNT ────────────────────────────────────────────────────────────────────

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
