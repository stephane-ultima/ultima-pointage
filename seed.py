"""
Seed demo data for Ultima Pointage
"""
import db
import auth as auth_module
import time
import datetime
from utils import get_week_number


def run():
    print("Seeding demo data...")

    manager_id = 'mgr-marc-001'
    admin_id = 'adm-sophie-001'
    emp1_id = 'emp-lucas-001'
    emp2_id = 'emp-pierre-001'
    emp3_id = 'emp-ana-001'
    superadmin_id = 'adm-stephane-001'

    users = [
        (superadmin_id, 'stephane@ultima-interior.ch', auth_module.hash_password('Ultima2026!'),
         'St\u00e9phane', 'Ultima', 'SUPERADMIN', 'ADMIN_STAFF', 45.0, 25, None, ''),
        (manager_id, 'marc@ultima.ch', auth_module.hash_password('Manager123!'),
         'Marc', 'Responsable', 'MANAGER', 'MANAGER', 42.0, 25, None, '+41 79 111 00 01'),
        (admin_id, 'sophie@ultima.ch', auth_module.hash_password('Admin123!'),
         'Sophie', 'Bureau', 'ADMIN', 'ADMIN_STAFF', 45.0, 25, manager_id, '+41 79 111 00 02'),
        (emp1_id, 'lucas@ultima.ch', None,
         'Lucas', 'Meier', 'EMPLOYEE', 'MONTEUR', 42.0, 25, manager_id, '+41 79 222 00 01'),
        (emp2_id, 'pierre@ultima.ch', None,
         'Pierre', 'Dubois', 'EMPLOYEE', 'MONTEUR', 42.0, 25, manager_id, '+41 79 222 00 02'),
        (emp3_id, 'ana@ultima.ch', None,
         'Ana', 'Ferreira', 'EMPLOYEE', 'MONTEUR', 42.0, 25, manager_id, '+41 79 222 00 03'),
    ]

    for u in users:
        existing = db.fetchone("SELECT id FROM users WHERE id=?", (u[0],))
        if not existing:
            db.execute("""
                INSERT INTO users (id, email, password_hash, first_name, last_name,
                                   role, employee_type, weekly_target_h, annual_leave_d,
                                   manager_id, phone)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """, u)

    print("  Users created")

    projects = [
        ('proj-villars-001', 'VIL-2024-01', 'Cuisine Villars-sur-Gl\u00e2ne',
         'Famille Morel', 'Route de Fribourg 45, 1752 Villars-sur-Gl\u00e2ne', 'ACTIVE',
         '2024-01-15', '2024-06-30', manager_id),
        ('proj-bulle-001', 'BUL-2024-02', 'Agencement Bulle Centre',
         'Martin & Fils S\u00e0rl', 'Grand-Rue 12, 1630 Bulle', 'ACTIVE',
         '2024-02-01', '2024-05-31', manager_id),
        ('proj-romont-001', 'ROM-2024-03', 'Cuisine Romont',
         'H\u00f4tel de la Gare', 'Place de la Gare 2, 1680 Romont', 'ACTIVE',
         '2024-03-01', '2024-07-31', manager_id),
        ('proj-chatel-001', 'CHA-2024-04', 'Boiserie Ch\u00e2tel-Saint-Denis',
         'R\u00e9sidence Les Pr\u00e9alpes', 'Chemin des Alpes 8, 1618 Ch\u00e2tel-St-Denis', 'ACTIVE',
         '2024-04-01', '2024-08-31', manager_id),
    ]

    for p in projects:
        existing = db.fetchone("SELECT id FROM projects WHERE id=?", (p[0],))
        if not existing:
            db.execute("""
                INSERT INTO projects (id, code, name, client_name, address, status,
                                      start_date, end_date, manager_id)
                VALUES (?,?,?,?,?,?,?,?,?)
            """, p)

    print("  Projects created")

    now = int(time.time())
    week, year = get_week_number(now)

    def make_ts(days_ago, hour, minute=0):
        d = datetime.date.today() - datetime.timedelta(days=days_ago)
        dt = datetime.datetime.combine(d, datetime.time(hour, minute))
        return int(dt.timestamp())

    entries = [
        ('te-lucas-mon-1', emp1_id, 'proj-villars-001', 'TRAVEL_PRO',
         make_ts(0, 7, 30), make_ts(0, 8, 15), 'PENDING', week, year),
        ('te-lucas-mon-2', emp1_id, 'proj-villars-001', 'WORK_SITE',
         make_ts(0, 8, 15), make_ts(0, 12, 0), 'PENDING', week, year),
        ('te-lucas-mon-3', emp1_id, 'proj-villars-001', 'BREAK',
         make_ts(0, 12, 0), make_ts(0, 12, 30), 'PENDING', week, year),
        ('te-lucas-mon-4', emp1_id, 'proj-villars-001', 'WORK_SITE',
         make_ts(0, 12, 30), make_ts(0, 17, 30), 'PENDING', week, year),
    ]

    prev_week = week - 1 if week > 1 else 52
    prev_year = year if week > 1 else year - 1
    entries += [
        ('te-pierre-lw-1', emp2_id, 'proj-bulle-001', 'TRAVEL_PRO',
         make_ts(7, 7, 45), make_ts(7, 8, 30), 'APPROVED', prev_week, prev_year),
        ('te-pierre-lw-2', emp2_id, 'proj-bulle-001', 'WORK_SITE',
         make_ts(7, 8, 30), make_ts(7, 17, 0), 'APPROVED', prev_week, prev_year),
        ('te-pierre-lw-3', emp2_id, 'proj-bulle-001', 'TRAVEL_PRO',
         make_ts(6, 7, 45), make_ts(6, 8, 30), 'APPROVED', prev_week, prev_year),
        ('te-pierre-lw-4', emp2_id, 'proj-bulle-001', 'WORK_SITE',
         make_ts(6, 8, 30), make_ts(6, 17, 30), 'APPROVED', prev_week, prev_year),
    ]

    for e in entries:
        existing = db.fetchone("SELECT id FROM time_entries WHERE id=?", (e[0],))
        if not existing:
            db.execute("""
                INSERT INTO time_entries
                    (id, user_id, project_id, activity_type, started_at, ended_at,
                     status, week_number, week_year, meal_allowance)
                VALUES (?,?,?,?,?,?,?,?,?,1)
            """, e)

    print("  Time entries created")

    abs_entries = [
        ('abs-lucas-001', emp1_id, 'HOLIDAY',
         '2024-08-05', '2024-08-16', 10.0, 'PENDING', 'Vacances ete'),
        ('abs-ana-001', emp3_id, 'SICK',
         datetime.date.today().isoformat(),
         datetime.date.today().isoformat(), 1.0, 'APPROVED', 'Grippe'),
    ]
    for a in abs_entries:
        existing = db.fetchone("SELECT id FROM absence_requests WHERE id=?", (a[0],))
        if not existing:
            db.execute("""
                INSERT INTO absence_requests
                    (id, user_id, type, start_date, end_date, duration_days,
                     status, comment)
                VALUES (?,?,?,?,?,?,?,?)
            """, a)

    print("  Absence requests created")

    balances = [
        (emp1_id, year, 25.0, 3.0, 10.0, 2.5),
        (emp2_id, year, 25.0, 5.0, 0.0, 0.0),
        (emp3_id, year, 25.0, 1.0, 0.0, 0.0),
    ]
    for b in balances:
        existing = db.fetchone("""
            SELECT id FROM leave_balances WHERE user_id=? AND year=?
        """, (b[0], b[1]))
        if not existing:
            db.execute("""
                INSERT INTO leave_balances
                    (user_id, year, holiday_total, holiday_taken,
                     holiday_pending, comp_balance)
                VALUES (?,?,?,?,?,?)
            """, b)

    print("  Leave balances created")
    print("Seed complete!")
    print("  Stephane : stephane@ultima-interior.ch / Ultima2026!")
    print("  Manager  : marc@ultima.ch / Manager123!")
    print("  Admin    : sophie@ultima.ch / Admin123!")


if __name__ == '__main__':
    db.init_db()
    run()
