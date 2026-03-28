#!/usr/bin/env python3
"""
ULTIMA INTERIOR SA - Pointage RH
Main Tornado server
"""
import os
import sys
import tornado.ioloop
import tornado.web
import db
import auth as auth_module

from handlers.auth_handler import (
    LoginHandler, MagicLinkHandler, VerifyLinkHandler,
    VerifyPinHandler, RefreshHandler, LogoutHandler, MeHandler,
    ChangePasswordHandler
)
from handlers.time_handler import (
    TimeEntriesHandler, TimeEntryDetailHandler,
    TeamEntriesHandler, ValidateWeekHandler, ExportHandler
)
from handlers.absence_handler import (
    AbsencesHandler, AbsenceDetailHandler, TeamAbsencesHandler
)
from handlers.project_handler import ProjectsHandler, ProjectDetailHandler
from handlers.user_handler import UsersHandler, UserDetailHandler, StatsHandler


class MainHandler(tornado.web.RequestHandler):
    def get(self, *args):
        self.render('index.html')


class SetupHandler(tornado.web.RequestHandler):
    """Setup: create or reset superadmin account."""
    def get(self):
        self.set_header('Content-Type', 'application/json')
        import json
        user = db.fetchone("SELECT id, email, role, first_name, CASE WHEN password_hash IS NOT NULL THEN 1 ELSE 0 END as has_pw FROM users WHERE email=?", ('stephane@ultima-interior.ch',))
        if user:
            self.finish(json.dumps({'found': True, 'id': user['id'], 'role': user['role'], 'has_pw': user['has_pw']}))
        else:
            self.finish(json.dumps({'found': False}))

    def post(self):
        self.set_header('Content-Type', 'application/json')
        import json
        try:
            data = json.loads(self.request.body)
        except Exception:
            data = {}
        email = data.get('email', 'stephane@ultima-interior.ch')
        password = data.get('password', 'Ultima2026!')
        ph = auth_module.hash_password(password)

        existing = db.fetchone("SELECT id FROM users WHERE email=?", (email,))
        if existing:
            db.execute("UPDATE users SET password_hash=?, role='SUPERADMIN', active=1 WHERE email=?", (ph, email))
            self.finish(json.dumps({'status': 'updated', 'email': email}))
        else:
            uid = 'adm-stephane-001'
            db.execute("""
                INSERT OR IGNORE INTO users
                    (id, email, password_hash, first_name, last_name,
                     role, employee_type, weekly_target_h, annual_leave_d, phone)
                VALUES (?,?,?,?,?,?,?,?,?,?)
            """, (uid, email, ph, 'Stephane', 'Ultima', 'SUPERADMIN', 'ADMIN_STAFF', 45.0, 25, ''))
            self.finish(json.dumps({'status': 'created', 'email': email}))


def make_app():
    settings = {
        'template_path': os.path.join(os.path.dirname(__file__), 'static'),
        'static_path': os.path.join(os.path.dirname(__file__), 'static'),
        'debug': os.environ.get('DEBUG', 'false').lower() == 'true',
        'cookie_secret': os.environ.get('JWT_SECRET', 'ultima-cookie-secret-change-me'),
        'xsrf_cookies': False,
    }
    return tornado.web.Application([
        (r'/api/setup',             SetupHandler),
        (r'/api/auth/login',        LoginHandler),
        (r'/api/auth/magic-link',   MagicLinkHandler),
        (r'/api/auth/verify-link',  VerifyLinkHandler),
        (r'/api/auth/verify-pin',   VerifyPinHandler),
        (r'/api/auth/refresh',      RefreshHandler),
        (r'/api/auth/logout',           LogoutHandler),
        (r'/api/auth/me',               MeHandler),
        (r'/api/auth/change-password',  ChangePasswordHandler),
        (r'/api/time-entries',              TimeEntriesHandler),
        (r'/api/time-entries/team',         TeamEntriesHandler),
        (r'/api/time-entries/validate-week',ValidateWeekHandler),
        (r'/api/time-entries/export',       ExportHandler),
        (r'/api/time-entries/([^/]+)/(\w+)',TimeEntryDetailHandler),
        (r'/api/absences',              AbsencesHandler),
        (r'/api/absences/team',         TeamAbsencesHandler),
        (r'/api/absences/([^/]+)/(\w+)',AbsenceDetailHandler),
        (r'/api/projects',          ProjectsHandler),
        (r'/api/projects/([^/]+)',  ProjectDetailHandler),
        (r'/api/users',             UsersHandler),
        (r'/api/users/([^/]+)',     UserDetailHandler),
        (r'/api/stats',             StatsHandler),
        (r'/static/(.*)',           tornado.web.StaticFileHandler,
         {'path': os.path.join(os.path.dirname(__file__), 'static')}),
        (r'/(.*)',                  tornado.web.StaticFileHandler,
         {'path': os.path.join(os.path.dirname(__file__), 'static'),
          'default_filename': 'index.html'}),
    ], **settings)


if __name__ == '__main__':
    db.init_db()

    try:
        db.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT")
    except Exception:
        pass

    port = int(os.environ.get('PORT', 8000))
    app = make_app()
    app.listen(port)
    print(f"Ultima Pointage started on port {port}", flush=True)

    # Seed on startup (idempotent)
    def do_seed():
        import seed
        seed.run()
    tornado.ioloop.IOLoop.current().call_later(1.0, do_seed)

    tornado.ioloop.IOLoop.current().start()
