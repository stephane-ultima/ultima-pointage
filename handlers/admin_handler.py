"""
Admin endpoints – full CRUD on users.
Only accessible to ADMIN and SUPERADMIN roles.
"""
import db
import auth as auth_module
from handlers.base import BaseHandler
from utils import ts_now


class AdminUsersHandler(BaseHandler):
    """GET /api/admin/users  –  list all users
       POST /api/admin/users –  create a new user
    """

    def get(self):
        user = self.require_auth(['ADMIN', 'SUPERADMIN'])
        if not user:
            return
        users = db.fetchall("""
            SELECT id, first_name, last_name, email, phone,
                   role, employee_type, weekly_target_h,
                   annual_leave_d, active
            FROM   users
            ORDER  BY last_name, first_name
        """)
        self.json({'users': users})

    def post(self):
        user = self.require_auth(['ADMIN', 'SUPERADMIN'])
        if not user:
            return
        data = self.body()

        required = ['first_name', 'last_name', 'role']
        if not all(data.get(k) for k in required):
            return self.error(f"Champs requis : {', '.join(required)}")

        uid = db.fetchone("SELECT lower(hex(randomblob(16))) as id")['id']
        ph  = auth_module.hash_password(data['password']) if data.get('password') else None

        db.execute("""
            INSERT INTO users
                (id, email, password_hash, first_name, last_name, role,
                 employee_type, weekly_target_h, annual_leave_d, phone)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (
            uid,
            (data.get('email') or '').lower() or None,
            ph,
            data['first_name'],
            data['last_name'],
            data['role'],
            data.get('employee_type', 'MONTEUR'),
            float(data.get('weekly_target_h', 42.0)),
            int(data.get('annual_leave_d', 25)),
            data.get('phone'),
        ))

        self.audit('ADMIN_USER_CREATED', 'users', uid)

        new_user = db.fetchone("""
            SELECT id, first_name, last_name, email, role,
                   employee_type, weekly_target_h, annual_leave_d,
                   phone, active
            FROM   users WHERE id=?
        """, (uid,))
        self.json(new_user, 201)


class AdminUserDetailHandler(BaseHandler):
    """PATCH /api/admin/users/<id>  –  update a user
       DELETE /api/admin/users/<id> –  deactivate a user
    """

    def patch(self, uid):
        user = self.require_auth(['ADMIN', 'SUPERADMIN'])
        if not user:
            return

        target = db.fetchone("SELECT id FROM users WHERE id=?", (uid,))
        if not target:
            return self.error('Utilisateur introuvable', 404)

        data = self.body()
        allowed = [
            'first_name', 'last_name', 'email', 'role',
            'employee_type', 'weekly_target_h', 'annual_leave_d',
            'phone', 'active',
        ]
        fields = {k: v for k, v in data.items() if k in allowed}
        new_password = data.get('password')

        if not fields and not new_password:
            return self.error('Aucun champ modifiable fourni')

        now = ts_now()
        if fields:
            sets = ', '.join(f"{k}=?" for k in fields)
            vals = list(fields.values()) + [now, uid]
            db.execute(f"UPDATE users SET {sets}, updated_at=? WHERE id=?", vals)

        if new_password:
            ph = auth_module.hash_password(new_password)
            db.execute(
                "UPDATE users SET password_hash=?, updated_at=? WHERE id=?",
                (ph, now, uid),
            )

        self.audit('ADMIN_USER_UPDATED', 'users', uid)

        updated = db.fetchone("""
            SELECT id, first_name, last_name, email, role,
                   employee_type, weekly_target_h, annual_leave_d,
                   phone, active
            FROM   users WHERE id=?
        """, (uid,))
        self.json(updated)

    def delete(self, uid):
        user = self.require_auth(['ADMIN', 'SUPERADMIN'])
        if not user:
            return

        if uid == user['id']:
            return self.error('Vous ne pouvez pas supprimer votre propre compte', 400)

        target = db.fetchone("SELECT id FROM users WHERE id=?", (uid,))
        if not target:
            return self.error('Utilisateur introuvable', 404)

        db.execute(
            "UPDATE users SET active=0, updated_at=? WHERE id=?",
            (ts_now(), uid),
        )
        self.audit('ADMIN_USER_DELETED', 'users', uid)
        self.json({'ok': True, 'id': uid})
