"""
Auth endpoints:
POST /api/auth/login          Ã¢ÂÂ email + password (manager/admin)
POST /api/auth/magic-link     Ã¢ÂÂ request magic link (employee)
POST /api/auth/verify-link    Ã¢ÂÂ verify magic link token
POST /api/auth/verify-pin     Ã¢ÂÂ verify PIN after link auth
POST /api/auth/refresh        Ã¢ÂÂ refresh access token
POST /api/auth/logout
GET  /api/auth/me             Ã¢ÂÂ current user profile
"""
import time
import db
import auth as auth_module
from handlers.base import BaseHandler


class LoginHandler(BaseHandler):
    """Email + password login for managers and admins."""
    def post(self):
        data = self.body()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        if not email or not password:
            return self.error('Email et mot de passe requis')

        user = db.fetchone("SELECT * FROM users WHERE email=? AND active=1", (email,))
        if not user or not user['password_hash']:
            return self.error('Identifiants incorrects', 401)
        if not auth_module.check_password(password, user['password_hash']):
            return self.error('Identifiants incorrects', 401)
        if user['role'] not in ('MANAGER', 'ADMIN', 'SUPERADMIN'):
            return self.error('Utilisez le lien d\'accÃÂ¨s pour les employÃÂ©s', 403)

        access = auth_module.create_access_token(user['id'], user['role'])
        refresh = auth_module.create_refresh_token(user['id'])

        self.set_cookie('access_token', access, httponly=True, samesite='Lax', max_age=900)
        self.set_cookie('refresh_token', refresh, httponly=True, samesite='Lax',
                        max_age=604800)
        self.audit('LOGIN', 'users', user['id'])
        self.json({
            'token': access,
            'user': _safe_user(user)
        })


class MagicLinkHandler(BaseHandler):
    """Request magic link for employee access."""
    def post(self):
        data = self.body()
        phone_or_email = data.get('contact', '').strip()
        if not phone_or_email:
            return self.error('Email ou téléphone requis')

        user = db.fetchone("""
            SELECT * FROM users
            WHERE (email=? OR phone=?) AND active=1 AND role='EMPLOYEE'
        """, (phone_or_email, phone_or_email))

        # Always return success to prevent enumeration
        if user:
            token = auth_module.generate_magic_token()
            exp = int(time.time()) + auth_module.MAGIC_TTL
            db.execute("UPDATE users SET magic_token=?, magic_token_exp=? WHERE id=?",
                       (token, exp, user['id']))
            # In production: send SMS/email. Token logged server-side for demo.
            print(f"[MAGIC LINK] User: {user['first_name']} {user['last_name']} Ã¢ÂÂ Token: {token}")
            self.json({
                'message': 'Lien envoyÃÂ©',
                '_demo_token': token,  # Remove in production!
                '_demo_user_id': user['id']
            })
        else:
            self.json({'message': 'Si ce contact est enregistrÃÂ©, vous recevrez un lien'})


class VerifyLinkHandler(BaseHandler):
    """Verify magic link token Ã¢ÂÂ returns partial session, requires PIN next."""
    def post(self):
        data = self.body()
        token = data.get('token', '').strip()
        if not token:
            return self.error('Token manquant')

        user = db.fetchone("""
            SELECT * FROM users
            WHERE magic_token=? AND magic_token_exp > ? AND active=1
        """, (token, int(time.time())))
        if not user:
            return self.error('Lien invalide ou expirÃÂ©', 401)

        # Check if user has a PIN set
        if not user['pin_hash']:
            # First login Ã¢ÂÂ set PIN flow
            temp = auth_module.create_access_token(user['id'] + '_setup', 'SETUP')
            db.execute("UPDATE users SET magic_token=NULL, magic_token_exp=NULL WHERE id=?",
                       (user['id'],))
            self.json({
                'next': 'set_pin',
                'user_id': user['id'],
                'first_name': user['first_name'],
                'setup_token': temp
            })
        else:
            # Has PIN Ã¢ÂÂ ask for it
            db.execute("UPDATE users SET magic_token=NULL, magic_token_exp=NULL WHERE id=?",
                       (user['id'],))
            self.json({
                'next': 'enter_pin',
                'user_id': user['id'],
                'first_name': user['first_name']
            })


class VerifyPinHandler(BaseHandler):
    """Verify PIN and issue full JWT."""
    def post(self):
        data = self.body()
        user_id = data.get('user_id', '')
        pin = data.get('pin', '')
        new_pin = data.get('new_pin', '')

        user = db.fetchone("SELECT * FROM users WHERE id=? AND active=1", (user_id,))
        if not user:
            return self.error('Utilisateur introuvable', 404)

        if not user['pin_hash'] and new_pin:
            # Setting PIN for first time
            if len(new_pin) < 4:
                return self.error('PIN doit avoir au moins 4 chiffres')
            db.execute("UPDATE users SET pin_hash=? WHERE id=?",
                       (auth_module.hash_pin(new_pin), user_id))
            pin = new_pin
        elif not auth_module.check_pin(pin, user['pin_hash'] or ''):
            return self.error('PIN incorrect', 401)

        access = auth_module.create_access_token(user['id'], user['role'])
        refresh = auth_module.create_refresh_token(user['id'])
        self.set_cookie('access_token', access, httponly=True, samesite='Lax', max_age=900)
        self.set_cookie('refresh_token', refresh, httponly=True, samesite='Lax',
                        max_age=604800)
        self.audit('LOGIN_PIN', 'users', user['id'])
        self.json({'token': access, 'user': _safe_user(user)})


class RefreshHandler(BaseHandler):
    def post(self):
        token = self.get_cookie('refresh_token')
        if not token:
            data = self.body()
            token = data.get('refresh_token', '')
        if not token:
            return self.error('Refresh token manquant', 401)
        payload = auth_module.verify_token(token)
        if not payload or payload.get('type') != 'refresh':
            return self.error('Token invalide', 401)
        user = db.fetchone("SELECT * FROM users WHERE id=? AND active=1", (payload['sub'],))
        if not user:
            return self.error('Utilisateur introuvable', 404)
        access = auth_module.create_access_token(user['id'], user['role'])
        self.set_cookie('access_token', access, httponly=True, samesite='Lax', max_age=900)
        self.json({'token': access})


class LogoutHandler(BaseHandler):
    def post(self):
        self.clear_cookie('access_token')
        self.clear_cookie('refresh_token')
        self.json({'message': 'DÃÂ©connectÃÂ©'})


class ChangePasswordHandler(BaseHandler):
    """Change password for password-based users."""
    def post(self):
        user = self.require_auth()
        if not user: return
        data = self.body()
        current_pw = data.get('current_password', '')
        new_pw = data.get('new_password', '')
        if not new_pw:
            return self.error('Nouveau mot de passe requis')
        if len(new_pw) < 8:
            return self.error('Le mot de passe doit faire au moins 8 caractÃÂ¨res')
        # If user has an existing password, require current password
        if user['password_hash']:
            if not current_pw:
                return self.error('Mot de passe actuel requis')
            if not auth_module.check_password(current_pw, user['password_hash']):
                return self.error('Mot de passe actuel incorrect', 401)
        db.execute("UPDATE users SET password_hash=? WHERE id=?",
                   (auth_module.hash_password(new_pw), user['id']))
        self.audit('CHANGE_PASSWORD', 'users', user['id'])
        self.json({'message': 'Mot de passe modifie avec succes'})


class MeHandler(BaseHandler):
    def get(self):
        user = self.require_auth()
        if not user:
            return
        from utils import get_week_number
        week, year = get_week_number()
        balance = db.fetchone("""
            SELECT * FROM leave_balances WHERE user_id=? AND year=?
        """, (user['id'], year))
        if not balance:
            balance = {'holiday_total': user['annual_leave_d'],
                       'holiday_taken': 0, 'holiday_pending': 0, 'comp_balance': 0}

        # Week hours
        from utils import get_week_bounds
        start_ts, end_ts = get_week_bounds(week, year)
        week_min = db.fetchone("""
            SELECT COALESCE(SUM(duration_min), 0) as total
            FROM time_entries
            WHERE user_id=? AND week_number=? AND week_year=?
            AND activity_type != 'BREAK' AND ended_at IS NOT NULL
            AND status != 'REJECTED'
        """, (user['id'], week, year))

        # Active session
        active = db.fetchone("""
            SELECT te.*, p.name as project_name FROM time_entries te
            LEFT JOIN projects p ON te.project_id = p.id
            WHERE te.user_id=? AND te.status='DRAFT' AND te.ended_at IS NULL
            ORDER BY te.started_at DESC LIMIT 1
        """, (user['id'],))

        self.json({
            'user': _safe_user(user),
            'balance': balance,
            'week': {
                'number': week,
                'year': year,
                'total_min': week_min['total'] if week_min else 0,
                'target_h': user['weekly_target_h']
            },
            'active_session': dict(active) if active else None
        })


def _safe_user(user):
    safe = dict(user)
    for k in ('password_hash', 'pin_hash', 'magic_token', 'magic_token_exp'):
        safe.pop(k, None)
    return safe
