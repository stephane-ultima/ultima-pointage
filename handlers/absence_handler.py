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
