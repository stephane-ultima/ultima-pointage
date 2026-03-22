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

