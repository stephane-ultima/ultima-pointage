"""
Absence request endpoints
"""
import db
from handlers.base import BaseHandler
from utils import ts_now, get_week_number
import datetime


def swiss_holidays(year):
    """Jours fériés fédéraux suisses pour l'année donnée."""
    a = year % 19
    b, c = year // 100, year % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month, day = divmod(h + l - 7 * m + 114, 31)
    easter = datetime.date(year, month, day + 1)
    return {
        datetime.date(year, 1, 1),              # Nouvel An
        datetime.date(year, 1, 2),              # Berchtoldstag
        easter - datetime.timedelta(days=2),    # Vendredi Saint
        easter + datetime.timedelta(days=1),    # Lundi de Pâques
        datetime.date(year, 5, 1),              # Fête du Travail
        easter + datetime.timedelta(days=39),   # Ascension
        easter + datetime.timedelta(days=50),   # Lundi de Pentecôte
        datetime.date(year, 8, 1),              # Fête Nationale
        datetime.date(year, 12, 25),            # Noël
        datetime.date(year, 12, 26),            # Saint-Étienne
    }


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
        if abs_type not in ('HOLIDAY','SICK','ACCIDENT','TRAINING','UNPAID','OTHER'):
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
            # P1-05: Working days Mon-Fri, hors jours fériés suisses
            delta = d_end - d_start
            ch_holidays = swiss_holidays(d_start.year)
            if d_start.year != d_end.year:
                ch_holidays |= swiss_holidays(d_end.year)
            duration = sum(1 for i in range(delta.days + 1)
                           if (d := d_start + datetime.timedelta(i)).weekday() < 5
                           and d not in ch_holidays)

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
        user = self.require_auth()
        if not user: return
        data = self.body()
        now = ts_now()

        absence = db.fetchone("SELECT * FROM absence_requests WHERE id=?", (abs_id,))
        if not absence:
            return self.error('Absence introuvable', 404)

        if action in ('approve', 'reject'):
            if user['role'] not in ('MANAGER', 'ADMIN', 'SUPERADMIN'):
                return self.error('Accès non autorisé', 403)

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

        elif action == 'cancel':
            # P1-04: L'employé peut annuler sa propre demande PENDING
            if absence['user_id'] != user['id'] and user['role'] not in ('MANAGER', 'ADMIN', 'SUPERADMIN'):
                return self.error('Accès non autorisé', 403)
            if absence['status'] not in ('PENDING',):
                return self.error('Seules les demandes en attente peuvent être annulées')
            db.execute("""
                UPDATE absence_requests
                SET status='CANCELLED', reviewed_by=?, reviewed_at=?
                WHERE id=?
            """, (user['id'], now, abs_id))
            # Remettre le solde en attente
            if absence['type'] == 'HOLIDAY':
                year = datetime.date.fromisoformat(absence['start_date']).year
                db.execute("""
                    UPDATE leave_balances
                    SET holiday_pending = MAX(0, holiday_pending - ?)
                    WHERE user_id=? AND year=?
                """, (absence['duration_days'], absence['user_id'], year))
            self.audit('ABSENCE_CANCELLED', 'absence_requests', abs_id)

        updated = db.fetchone("SELECT * FROM absence_requests WHERE id=?", (abs_id,))
        self.json(updated)


class AbsenceCalendarHandler(BaseHandler):
    """Return approved/pending absences for a given month (for calendar display)."""

    def get(self):
        user = self.require_auth()
        if not user: return

        try:
            year = int(self.get_argument('year', datetime.date.today().year))
            month = int(self.get_argument('month', datetime.date.today().month))
        except (ValueError, TypeError):
            return self.error('Paramètres year/month invalides')

        # First and last day of the month as ISO strings
        first_day = datetime.date(year, month, 1).isoformat()
        if month == 12:
            last_day = datetime.date(year, 12, 31).isoformat()
        else:
            last_day = (datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)).isoformat()

        absences = db.fetchall("""
            SELECT ar.id, ar.user_id, ar.type, ar.start_date, ar.end_date,
                   ar.duration_days, ar.status, u.first_name, u.last_name
            FROM absence_requests ar
            JOIN users u ON ar.user_id = u.id
            WHERE ar.user_id=?
              AND ar.start_date <= ? AND ar.end_date >= ?
              AND ar.status IN ('PENDING', 'APPROVED')
            ORDER BY ar.start_date
        """, (user['id'], last_day, first_day))

        self.json({'absences': absences, 'year': year, 'month': month})


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
