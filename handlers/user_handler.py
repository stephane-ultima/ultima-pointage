"""
User management endpoints
"""
import db
import auth as auth_module
from handlers.base import BaseHandler
from utils import ts_now, get_week_number


class UsersHandler(BaseHandler):

    def get(self):
        user = self.require_auth(['MANAGER', 'ADMIN', 'SUPERADMIN'])
        if not user: return
        if user['role'] == 'MANAGER':
            users = db.fetchall("""
                SELECT id, first_name, last_name, email, phone, role,
                       employee_type, weekly_target_h, annual_leave_d, active
                FROM users WHERE manager_id=? ORDER BY last_name
            """, (user['id'],))
        else:
            users = db.fetchall("""
                SELECT id, first_name, last_name, email, phone, role,
                       employee_type, weekly_target_h, annual_leave_d, active
                FROM users ORDER BY last_name
            """)
        self.json({'users': users})

    def post(self):
        user = self.require_auth(['ADMIN', 'SUPERADMIN'])
        if not user: return
        data = self.body()
        required = ['first_name', 'last_name', 'role']
        if not all(data.get(k) for k in required):
            return self.error(f"Champs requis : {', '.join(required)}")

        uid = db.fetchone("SELECT lower(hex(randomblob(16))) as id")['id']
        ph = auth_module.hash_password(data['password']) if data.get('password') else None

        db.execute("""
            INSERT INTO users (id, email, password_hash, first_name, last_name,
                               role, employee_type, weekly_target_h, annual_leave_d,
                               manager_id, phone)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (uid, data.get('email', '').lower() or None, ph,
              data['first_name'], data['last_name'],
              data['role'], data.get('employee_type', 'MONTEUR'),
              data.get('weekly_target_h', 42.0), data.get('annual_leave_d', 25),
              data.get('manager_id'), data.get('phone')))

        self.audit('USER_CREATED', 'users', uid)
        new_user = db.fetchone("""
            SELECT id, first_name, last_name, email, role, employee_type,
                   weekly_target_h, annual_leave_d, phone, active
            FROM users WHERE id=?
        """, (uid,))
        self.json(new_user, 201)


class UserDetailHandler(BaseHandler):

    def patch(self, uid):
        user = self.require_auth()
        if not user: return
        # Users can update their own profile; admins can update anyone
        if uid != user['id'] and user['role'] not in ('ADMIN', 'SUPERADMIN'):
            return self.error('Accès refusé', 403)
        data = self.body()
        allowed = ['first_name', 'last_name', 'phone', 'geoloc_consent']
        if user['role'] in ('ADMIN', 'SUPERADMIN'):
            allowed += ['email', 'role', 'employee_type', 'weekly_target_h',
                        'annual_leave_d', 'manager_id', 'active']
        fields = {k: v for k, v in data.items() if k in allowed}
        if not fields:
            return self.error('Aucun champ modifiable fourni')
        now = ts_now()
        sets = ', '.join(f"{k}=?" for k in fields)
        vals = list(fields.values()) + [now, uid]
        db.execute(f"UPDATE users SET {sets}, updated_at=? WHERE id=?", vals)
        updated = db.fetchone("""
            SELECT id, first_name, last_name, email, role, employee_type,
                   weekly_target_h, annual_leave_d, phone, active, geoloc_consent
            FROM users WHERE id=?
        """, (uid,))
        self.json(updated)


class StatsHandler(BaseHandler):
    """Summary stats for dashboard."""

    def get(self):
        user = self.require_auth()
        if not user: return

        w, y = get_week_number()
        week = int(self.get_argument('week', w))
        year = int(self.get_argument('year', y))

        # Per-day breakdown for current week
        days = db.fetchall("""
            SELECT
                date(started_at, 'unixepoch') as day,
                SUM(CASE WHEN activity_type != 'BREAK' AND ended_at IS NOT NULL
                         THEN duration_min ELSE 0 END) as work_min,
                MAX(meal_allowance) as meal
            FROM time_entries
            WHERE user_id=? AND week_number=? AND week_year=?
            GROUP BY day ORDER BY day
        """, (user['id'], week, year))

        self.json({'days': days, 'week': week, 'year': year})
