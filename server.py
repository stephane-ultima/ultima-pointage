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
    VerifyPinHandler, RefreshHandler, LogoutHandler, MeHandler
)
from handlers.time_handler import (
    TimeEntriesHandler, TimeEntryDetailHandler,
    TeamEntriesHandler, ValidateWeekHandler, ExportHandler
)
from handlers.absence_handler import (
    AbsencesHandler, AbsenceDetailHandler, TeamAbsencesHandler,
    AbsenceCalendarHandler, AbsenceBalancesHandler
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
        # ─── AUTH ────────────────────────────────────────────
        (r'/api/auth/login',        LoginHandler),
        (r'/api/auth/magic-link',   MagicLinkHandler),
        (r'/api/auth/verify-link',  VerifyLinkHandler),
        (r'/api/auth/verify-pin',   VerifyPinHandler),
        (r'/api/auth/refresh',      RefreshHandler),
        (r'/api/auth/logout',       LogoutHandler),
        (r'/api/auth/me',           MeHandler),

        # ─── TIME ENTRIES ────────────────────────────────────
        (r'/api/time-entries',              TimeEntriesHandler),
        (r'/api/time-entries/team',         TeamEntriesHandler),
        (r'/api/time-entries/validate-week',ValidateWeekHandler),
        (r'/api/time-entries/export',       ExportHandler),
        (r'/api/time-entries/([^/]+)/(\w+)',TimeEntryDetailHandler),

        # ─── ABSENCES ────────────────────────────────────────
        (r'/api/absences',              AbsencesHandler),
        (r'/api/absences/team',         TeamAbsencesHandler),
        (r'/api/absences/calendar',     AbsenceCalendarHandler),
        (r'/api/absences/balances',     AbsenceBalancesHandler),
        (r'/api/absences/([^/]+)/(\w+)',AbsenceDetailHandler),

        # ─── PROJECTS ────────────────────────────────────────
        (r'/api/projects',          ProjectsHandler),
        (r'/api/projects/([^/]+)',  ProjectDetailHandler),

        # ─── USERS ───────────────────────────────────────────
        (r'/api/users',             UsersHandler),
        (r'/api/users/([^/]+)',     UserDetailHandler),
        (r'/api/stats',             StatsHandler),

        # ─── STATIC & SPA ────────────────────────────────────
        (r'/static/(.*)',           tornado.web.StaticFileHandler,
         {'path': os.path.join(os.path.dirname(__file__), 'static')}),
        (r'/(.*)',                  tornado.web.StaticFileHandler,
         {'path': os.path.join(os.path.dirname(__file__), 'static'),
          'default_filename': 'index.html'}),
    ], **settings)


if __name__ == '__main__':
    # Initialize database
    db.init_db()

    # Seed demo data if requested
    if '--seed' in sys.argv or os.environ.get('SEED_DB') == '1':
        import seed
        seed.run()

    port = int(os.environ.get('PORT', 8000))
    app = make_app()
    app.listen(port)
    print(f"""
╔══════════════════════════════════════════════════════╗
║  ULTIMA INTERIOR SA — Pointage RH                    ║
║  Server running on http://localhost:{port}               ║
║                                                      ║
║  Demo accounts:                                      ║
║  Manager : marc@ultima.ch / Manager123!              ║
║  Admin   : sophie@ultima.ch / Admin123!              ║
║  Employee: Lien magic link (voir seed output)        ║
╚══════════════════════════════════════════════════════╝
""")
    tornado.ioloop.IOLoop.current().start()
