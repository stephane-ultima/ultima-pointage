"""
Project (chantier) endpoints
"""
import db
from handlers.base import BaseHandler
from utils import ts_now


class ProjectsHandler(BaseHandler):

    def get(self):
        user = self.require_auth()
        if not user: return
        status = self.get_argument('status', 'ACTIVE')
        projects = db.fetchall("""
            SELECT p.*, u.first_name as manager_first, u.last_name as manager_last
            FROM projects p
            LEFT JOIN users u ON p.manager_id = u.id
            WHERE p.status=?
            ORDER BY p.name
        """, (status,))
        self.json({'projects': projects})

    def post(self):
        user = self.require_auth(['MANAGER', 'ADMIN', 'SUPERADMIN'])
        if not user: return
        data = self.body()
        if not data.get('code') or not data.get('name'):
            return self.error('Code et nom requis')
        proj_id = db.fetchone("SELECT lower(hex(randomblob(16))) as id")['id']
        db.execute("""
            INSERT INTO projects (id, code, name, client_name, address, status,
                                  start_date, end_date, manager_id)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (proj_id, data['code'], data['name'],
              data.get('client_name'), data.get('address'),
              data.get('status', 'ACTIVE'),
              data.get('start_date'), data.get('end_date'),
              data.get('manager_id', user['id'])))
        self.audit('PROJECT_CREATED', 'projects', proj_id)
        project = db.fetchone("SELECT * FROM projects WHERE id=?", (proj_id,))
        self.json(project, 201)


class ProjectDetailHandler(BaseHandler):

    def patch(self, proj_id):
        user = self.require_auth(['MANAGER', 'ADMIN', 'SUPERADMIN'])
        if not user: return
        data = self.body()
        now = ts_now()
        fields = {k: v for k, v in data.items()
                  if k in ('name','client_name','address','status','start_date','end_date')}
        if not fields:
            return self.error('Aucun champ à modifier')
        sets = ', '.join(f"{k}=?" for k in fields)
        vals = list(fields.values()) + [now, proj_id]
        db.execute(f"UPDATE projects SET {sets}, updated_at=? WHERE id=?", vals)
        project = db.fetchone("SELECT * FROM projects WHERE id=?", (proj_id,))
        self.json(project)
