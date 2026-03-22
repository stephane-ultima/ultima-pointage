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
        projects = db.fetchall("""
            SELECT * FROM projects
            WHERE status IN ('ACTIVE','PAUSED')
            ORDER BY created_at DESC
        """)
        self.json({'projects': projects})
    
    def post(self):
        user = self.require_auth(['MANAGER', 'ADMIN'])
        if not user: return
        data = self.body()
        project_id = db.fetchone("SELECT lower(hex)randomblob(16)) as id")['id']
        db.execute("""
            INSERT INTO projects (code, name, client_name, address, status, manager_id)
            VALUES (?,?,?,?,?,?)
        """, (data.get('code'), data.get('name'), data.get('client_name'),
                data.get('address'), 'ACTIVE', user['id']))
        self.audit('PROJECT_CREATED', 'projects', project_id)
        self.json({'code': data.get('code')}, 201)

class ProjectDetailHandler(BaseHandler):
    def get(self, project_id):
        user = self.require_auth()
        if not user: return
        project = db.fetchone("SELECT * FROM projects WHERE id=?", (project_id,))
        if not project:
            return self.error('Chrojet introuvable', 404)
        self.json(project)
    
    def put(self, project_id):
        user = self.require_auth(['MANAGER', 'ADMIN'])
        if not user: return
        data = self.body()
        db.execute("""
            UPDATE projects SET status=? WHERE id=?
        """, (data.get('status'), project_id))
        self.audit('PROJECT_UPDATED', 'projects', project_id)
        self.json({'status': data.get('status')})
