"""
Auth endpoints:
POST /api/auth/login          — email + password (manager/admin)
POST /api/auth/magic-link     — request magic link (employee)
POST /api/auth/verify-link    — verify magic link token
POST /api/auth/verify-pin     — verify PIN after link auth
POST /api/auth/refresh        — refresh access token
POST /api/auth/logout
GET  /api/auth/me             — current user profile
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
            return self.error('Utilisez le lien d\'accès pour les employés', 403)

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
            # In production: send SMS/email. For demo, return token directly
            print(f"[MAGIC LINK] User: {user['first_name']} {user['last_name']} — Token: {token}")
            self.json({
                'message': 'Lien envoyé',
                '_demo_token': token,  # Remove in production!
                '_demo_user_id': user['id']
            })
        else:
            self.json({'message': 'Si ce contact est enregistré, vous recevrez un lien'})


class VerifyLinkHandler(BaseHandler):
    """Verify magic link token → returns partial session, requires PIN next."""
    def post(self):
        data = self.body()
        token = data.get('token', '').strip()
        if not token:
            return self.error('Token manquant')

        user = db.fetch `tchine