"""
Base Tornado handler with JSON helpers and CORS.
"""
import json
import traceback
import tornado.web
import db
import auth as auth_module
from utils import json_serial


class BaseHandler(tornado.web.RequestHandler):

    def set_default_headers(self):
        origin = self.request.headers.get('Origin', '*')
        self.set_header('Access-Control-Allow-Origin', origin)
        self.set_header('Access-Control-Allow-Credentials', 'true')
        self.set_header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
        self.set_header('Access-Control-Allow-Headers',
                        'Content-Type, Authorization, X-Requested-With')
        self.set_header('Content-Type', 'application/json; charset=utf-8')

    def options(self, *args, **kwargs):
        self.set_status(204)
        self.finish()

    def json(self, data, status=200):
        self.set_status(status)
        self.finish(json.dumps(data, default=json_serial, ensure_ascii=False))

    def error(self, message, status=400):
        self.set_status(status)
        self.finish(json.dumps({'error': message}))

    def body(self):
        try:
            return json.loads(self.request.body)
        except Exception:
            return {}

    @property
    def me(self):
        if not hasattr(self, '_current_user_data'):
            self._current_user_data = auth_module.get_current_user(self)
        return self._current_user_data

    def require_auth(self, roles=None):
        user = self.me
        if not user:
            self.error('Non autorisé', 401)
            return None
        if roles and user['role'] not in roles:
            self.error('Accès refusé', 403)
            return None
        return user

    def audit(self, action, entity_type, entity_id=None, before=None, after=None):
        actor_id = self.me['id'] if self.me else None
        ip = self.request.remote_ip
        db.execute("""
            INSERT INTO audit_logs (actor_id, action, entity_type, entity_id,
                                    before_data, after_data, ip_address)
            VALUES (?,?,?,?,?,?,?)
        """, (actor_id, action, entity_type, entity_id,
              json.dumps(before) if before else None,
              json.dumps(after) if after else None, ip))
