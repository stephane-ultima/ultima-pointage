#!/usr/bin/env python3
"""
ULTIMA INTERIOR SA — Pointage RH
Main Tornado server
"""
import os
import sys
import tornado.ioloop
import tornado.web
import db

# Import handlers
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
    """Serve the React SPA for any non-API route."""
    def get(self, *args):
        self.render('index.html')


def make_app():
    settings = {
        'template_path': os.path.join(os.path.dirname(__file__), 'static'),
        'static_path': os.path.join(os.path.dirname(__file__), 'static'),
        'debug': os.environ.get('DEBUG', 'false').lower() == 'true',
        'cookie_secret': os.environ.get('JWT_SECRET', 'ultima-cookie-secret-change-me'),
        'xsrf_cookies': False,
    }
    return tornado.web.Application([
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
        print("\u2713 Migration: avatar_url column added")
    except Exception:
        pass

    port = int(os.environ.get('PORT', 8000))
    app = make_app()
    app.listen(port)
    print(f"\u2713 Ultima Pointage RH d\u00e9marr\u00e9 sur le port {port}", flush=True)

    def do_seed():
        import seed
        seed.run()
        print("\u2713 Donn\u00e9es de d\u00e9monstration charg\u00e9es", flush=True)

    if '--seed' in sys.argv or os.environ.get('SEED_DB') == '1':
        tornado.ioloop.IOLoop.current().call_later(0.5, do_seed)
    else:
        user_count = db.fetchone("SELECT COUNT(*) as n FROM users")
        if user_count and user_count['n'] == 0:
            print("\u26a1 Base vide d\u00e9tect\u00e9e \u2014 seeding automatique...", flush=True)
            tornado.ioloop.IOLoop.current().call_later(0.5, do_seed)

    tornado.ioloop.IOLoop.current().start()
