"""
Auth utilities — JWT + bcrypt + PIN + magic link
"""
import jwt
import bcrypt
import os
import secrets
import time
import hashlib
from functools import wraps
import db

SECRET_KEY = os.environ.get('JWT_SECRET', 'ultima-dev-secret-change-in-prod-!!!!')
ALGORITHM = 'HS256'
ACCESS_TTL = 15 * 60        # 15 minutes
REFRESH_TTL = 7 * 24 * 3600 # 7 days
MAGIC_TTL = 30 * 60          # 30 minutes

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def check_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

def check_pin(pin: str, hashed: str) -> bool:
    return hashlib.sha256(pin.encode()).hexdigest() == hashed

def create_access_token(user_id: str, role: str) -> str:
    payload = {
        'sub': user_id,
        'role': role,
        'exp': int(time.time()) + ACCESS_TTL,
        'iat': int(time.time()),
        'type': 'access'
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': int(time.time()) + REFRESH_TTL,
        'iat': int(time.time()),
        'type': 'refresh'
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def generate_magic_token() -> str:
    return secrets.token_urlsafe(32)

def get_current_user(handler):
    """Extract and verify user from Authorization header or cookie."""
    token = None
    auth_header = handler.request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
    if not token:
        token = handler.get_cookie('access_token')
    if not token:
        return None
    payload = verify_token(token)
    if not payload or payload.get('type') != 'access':
        return None
    user = db.fetchone("SELECT * FROM users WHERE id=? AND active=1", (payload['sub'],))
    return user

def require_auth(roles=None):
    """Decorator for Tornado handlers — checks auth and optional role."""
    def decorator(method):
        @wraps(method)
        def wrapper(self, *args, **kwargs):
            user = get_current_user(self)
            if not user:
                self.set_status(401)
                self.finish({'error': 'Non autorisé'})
                return
            if roles and user['role'] not in roles:
                self.set_status(403)
                self.finish({'error': 'Accès refusé'})
                return
            self.current_user_data = user
            return method(self, *args, **kwargs)
        return wrapper
    return decorator
