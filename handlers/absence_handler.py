"""
Absence request endpoints
"""
import db
from handlers.base import BaseHandler
from utils import ts_now, get_week_number
import datetime


class AbsencesHandler(BaseHandler):

    def get(self):
        user = self.require_auth()
        if not user: return
        absences = db.fetchall("""
            SELECT ar.*, u.first_name, u.last_name
            FROM absence_requests ar
            JOIN users u ON ar.user_id = u.id
            WHERE ar.user_id=?
            ORDER BY ar.start_date DESC
        """, (user['id'],))
        year = datetime.date.today().year
        balance = db.fetchone("""
            SELECT * FROM leave_balances WHERE user_id=? AND year=?
        """, (user['id'], year))
        if not balance:
            balance = {'holiday_total': user['annual_leave_d'],
                       'holiday_taken': 0.0, 'holiday_pending': 0.0, 'comp_balance': 0.0}
        self.json({'absences': absences, 'balance': balance})

    def post(self):
        user = self.require_auth()
        if not user: return
        data = self.body()

        abs_type = data.get('type')
        if abs_type not in ('HOLIDAY','SICK','ACCIDENT','TRAINING','UNPAID','OTHER',
                            'SERVICE_MILITAIRE','MATERNITE','PATERNITE',
                            'DECES','MARIAGE','DEMENAGEMENT'):
            return self.error('Type d\'absence invalide')

        start = data.get('start_date')
        end = data.get('end_date')
        if not start or not end:
            return self.error('Dates requises')

        try:
            d_start = datetime.date.fromisoformat(start)
            d_end = datetime.date.fromisoformat(end)
        except ValueError:
            return self.error('Format de date invalide (YYYY-MM-DD)')

        if d_end < d_start:
            return self.error('La date de fin doit être après la date de début')

        duration = data.get('duration_days')
        if not duration:
            # Calculate working days (Mon-Fri)
            delta = d_end - d_start
            duration = sum(1 for i in range(delta.days + 1)
                           if (d_start + datetime.timedelta(i)).weekday() < 5)

        abs_id = db.fetchone("SELECT lower(hex(randomblob(16))) as id")['id']
        db.execute("""
            INSERT INTO absence_requests
                (id, user_id, type, start_date, end_date, duration_days, comment)
            VALUES (?,?,?,?,?,?,?)
        """, (abs_id, user['id'], abs_type, start, end, float(duration),
              data.get('comment', '')))

        # Update pending balance for holidays
        if abs_type == 'HOLIDAY':
            year = d_start.year
            db.execute("""
                INSERT INTO leave_balances (user_id, year, holiday_total, holiday_pending)
                VALUES (?,?,?,?)
                ON CONFLICT(user_id, year) DO UPDATE
                SET holiday_pending = holiday_pending + excluded.holiday_pending
            """, (user['id'], year, user['annual_leave_d'], float(duration)))

        self.audit('ABSENCE_REQUESTED', 'absence_requests', abs_id)
        absence = db.fetchone("SELECT * FROM absence_requests WHERE id=?", (abs_id,))
        self.json(absence, 201)


class AbsenceDetailHandler(BaseHandler):

    def patch(self, abs_id, action):
        user = self.require_auth(['MANAGER', 'ADMIN', 'SUPERADMIN'])
        if not user: return
        data = self.body()
        now = ts_now()

        absence = db.fetchone("SELECT * FROM absence_requests WHERE id=?", (abs_id,))
        if not absence:
            return self.error('Absence introuvable', 404)

        if action == 'approve':
            db.execute("""
                UPDATE absence_requests
                SET status='APPROVED', reviewed_by=?, reviewed_at=?, review_note=?
                WHERE id=?
            """, (user['id'], now, data.get('note', ''), abs_id))
            # Update actual taken balance
            if absence['type'] == 'HOLIDAY':
                year = datetime.date.fromisoformat(absence['start_date']).year
                db.execute("""
                    INSERT INTO leave_balances (user_id, year, holiday_total, holiday_taken,
                                               holiday_pending)
                    VALUES (?,?,?,?,?)
                    ON CONFLICT(user_id, year) DO UPDATE
                    SET holiday_taken = holiday_taken + ?,
                        holiday_pending = MAX(0, holiday_pending - ?)
                """, (absence['user_id'], year, absence['duration_days'],
                      absence['duration_days'], -absence['duration_days'],
                      absence['duration_days'], absence['duration_days']))
            self.audit('ABSENCE_APPROVED', 'absence_requests', abs_id)

        elif action == 'reject':
            note = data.get('note', '')
            if not note:
                return self.error('Motif de refus obligatoire')
            db.execute("""
                UPDATE absence_requests
                SET status='REJECTED', reviewed_by=?, reviewed_at=?, review_note=?
                WHERE id=?
            """, (user['id'], now, note, abs_id))
            # Revert pending
            if absence['type'] == 'HOLIDAY':
                year = datetime.date.fromisoformat(absence['start_date']).year
                db.execute("""
                    UPDATE leave_balances
                    SET holiday_pending = MAX(0, holiday_pending - ?)
                    WHERE user_id=? AND year=?
                """, (absence['duration_days'], absence['user_id'], year))
            self.audit('ABSENCE_REJECTED', 'absence_requests', abs_id)

        updated = db.fetchone("SELECT * FROM absence_requests WHERE id=?", (abs_id,))
        self.json(updated)


class TeamAbsencesHandler(BaseHandler):
    def get(self):
        user = self.require_auth(['MANAGER', 'ADMIN', 'SUPERADMIN'])
        if not user: return
        if user['role'] == 'MANAGER':
            absences = db.fetchall("""
                SELECT ar.*, u.first_name, u.last_name
                FROM absence_requests ar
                JOIN users u ON ar.user_id = u.id
                WHERE u.manager_id=?
                ORDER BY ar.created_at DESC
            """, (user['id'],))
        else:
            absences = db.fetchall("""
                SELECT ar.*, u.first_name, u.last_name
                FROM absence_requests ar
                JOIN users u ON ar.user_id = u.id
                ORDER BY ar.created_at DESC
            """)
        self.json({'absences': absences})


def _swiss_holidays(year):
    """Return list of Swiss/Fribourg public holidays for the given year."""
    import datetime as _dt
    holidays = []

    def add(date, name):
        holidays.append({'date': date.isoformat(), 'name': name, 'type': 'holiday'})

    # Fixed holidays
    add(_dt.date(year, 1, 1),  'Nouvel An')
    add(_dt.date(year, 1, 6),  'Épiphanie')
    add(_dt.date(year, 5, 1),  'Fête du Travail')
    add(_dt.date(year, 8, 1),  'Fête nationale suisse')
    add(_dt.date(year, 11, 1), 'Toussaint')
    add(_dt.date(year, 12, 8), 'Immaculée Conception')
    add(_dt.date(year, 12, 25),'Noël')
    add(_dt.date(year, 12, 26),'Saint-Étienne')

    # Easter (Gauss algorithm)
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    easter = _dt.date(year, month, day)

    add(easter - _dt.timedelta(days=2), 'Vendredi Saint')
    add(easter + _dt.timedelta(days=1), 'Lundi de Pâques')
    add(easter + _dt.timedelta(days=39), 'Ascension')
    add(easter + _dt.timedelta(days=50), 'Lundi de Pentecôte')
    add(easter + _dt.timedelta(days=60), 'Fête-Dieu')

    return sorted(holidays, key=lambda x: x['date'])


class AbsenceCalendarHandler(BaseHandler):
    """Return team absences + Swiss holidays for a given month."""

    def get(self):
        user = self.require_auth(['MANAGER', 'ADMIN', 'SUPERADMIN'])
        if not user: return

        month = int(self.get_argument('month', datetime.date.today().month))
        year  = int(self.get_argument('year',  datetime.date.today().year))

        # First/last day of month
        first = datetime.date(year, month, 1)
        if month == 12:
            last = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
        else:
            last = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)

        absences = db.fetchall("""
            SELECT ar.*, u.first_name, u.last_name
            FROM absence_requests ar
            JOIN users u ON ar.user_id = u.id
            WHERE ar.status = 'APPROVED'
              AND ar.end_date >= ?
              AND ar.start_date <= ?
            ORDER BY ar.start_date
        """, (first.isoformat(), last.isoformat()))

        # Pending absences too (so managers can see them on the calendar)
        pending = db.fetchall("""
            SELECT ar.*, u.first_name, u.last_name
            FROM absence_requests ar
            JOIN users u ON ar.user_id = u.id
            WHERE ar.status = 'PENDING'
              AND ar.end_date >= ?
              AND ar.start_date <= ?
            ORDER BY ar.start_date
        """, (first.isoformat(), last.isoformat()))

        holidays = _swiss_holidays(year)
        # Filter to current month only
        holidays = [h for h in holidays
                    if h['date'] >= first.isoformat() and h['date'] <= last.isoformat()]

        self.json({
            'absences': absences,
            'pending': pending,
            'holidays': holidays,
            'month': month,
            'year': year,
            'days_in_month': (last - first).days + 1
        })


class AbsenceBalancesHandler(BaseHandler):
    """Return leave balances for all active employees (admin/manager)."""

    def get(self):
        user = self.require_auth(['MANAGER', 'ADMIN', 'SUPERADMIN'])
        if not user: return

        year = int(self.get_argument('year', datetime.date.today().year))

        employees = db.fetchall(
            "SELECT id, first_name, last_name, annual_leave_d, role FROM users WHERE active=1 AND role='EMPLOYEE'"
        )

        result = []
        for emp in employees:
            bal = db.fetchone("""
                SELECT * FROM leave_balances WHERE user_id=? AND year=?
            """, (emp['id'], year))
            if not bal:
                bal = {
                    'holiday_total': emp['annual_leave_d'] or 25,
                    'holiday_taken': 0.0,
                    'holiday_pending': 0.0,
                    'comp_balance': 0.0
                }
            remaining = (bal['holiday_total'] or 0) - (bal['holiday_taken'] or 0) - (bal['holiday_pending'] or 0)
            result.append({
                'employee': {
                    'id': emp['id'],
                    'first_name': emp['first_name'],
                    'last_name': emp['last_name'],
                },
                'holiday_total': bal['holiday_total'] or 0,
                'holiday_taken': bal['holiday_taken'] or 0,
                'holiday_pending': bal['holiday_pending'] or 0,
                'holiday_remaining': max(0, remaining),
                'comp_balance': bal.get('comp_balance', 0) or 0,
            })

        result.sort(key=lambda x: x['employee']['last_name'])
        self.json({'balances': result, 'year': year})
