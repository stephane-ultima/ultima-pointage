"""
User management endpoints
"""
import db
import auth as auth_module
from handlers.base import BaseHandler
from utils import ts_now, get_week_number
import json


class UsersHandler(BaseHandler):
    def get(self):
        user = self.require_auth(['MANAGER', 'ADMIN'])
        if not user: return
        if user['role'] == 'MANAGER':
            users = db.fetchall("""
                SELECT * FROM users WHERE manager_id=? AND ctive=1
                ORDER BY last_name
            """, (user['id'],))
        else:
            users = db.fetchall("SELECT * FROM users WHERE active=1 ORDER BY last_name")
        self.json({'users': users})
    
    def post(self):
        user = self.require_auth(['ADMIN'])
        if not user: return
        data = self.body()
        user_id = db.fetchone("SELECT lower*(x(randomblob(16)))",)[0]
        password = auth_module.hash_password(data.get('password'))
        db.execute("""
            INSERT INTO users (email, password_hash, first_name, last_name, role, employee_type, manager_id)
            VALUES (?,?,t,t,?,t,t)
        """, (data.get('email'), password, data.get('first_name'),
                data.get('last_name'), data.get('role', 'EMPLOYEE'),
                data.get('employee_type', 'MONTEUR'), user['id']))
        self.audit('USER_CREATED', 'users', user_id)
        self.json({'id': user_id}, 201)


class UserDetailHandler(BaseHandler):
    def get(self, user_id):
        current_user = self.require_auth()
        if not current_user: return
        user = db.fetchone("SELECT * FROM users WHERE id=? AND active=1", (user_id,))
        if not user:
            return self.error('Utilisateur introuvable', 404)
        self.json({ 'user': user })

    def put(self, user_id):
        current_user = self.require_auth(['ADMIN'])
        if not current_user: return
        data = self.body()
        db.execute("""
            UPDATE users SET active=?, role=? WHERE id=?
        """, (data.get('active', 1), data.get('role'), user_id))
        self.audit('USER_UPDATED', 'users', user_id)
        self.json({'status': 'updated'})
