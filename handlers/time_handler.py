"""
Time entry endpoints — pointage core
"""
import time
import json
import db
import csv
import io
from handlers.base import BaseHandler
from utils import ts_now, check_alerts
import datetime


class TimeEntriesHandler(BaseHandler):
    def get(self):
        user = self.require_auth()
        if not user: return
        from utils import get_week_number
        week, year = get_week_number()
        entries = db.fetchall("""
            SELECT * FROM time_entries
            WHERE user_id=? AND week_number=? AND week_year=?
            ORDER BY started_at DESC
        """, (user['id'], week, year))
        alerts = check_alerts(user['id'], week, year)
        self.json({'entries': entries, 'alerts': alerts})

    def post(self):
        user = self.require_auth()
        if not user: return
        data = self.body()
        project_id = data.get('project_id')
        activity_type = data.get('activity_type')
        start = data.get('start')# Unix timestamp
        end = data.get('end')
        duration_min = data.get('duration_min')

        if not all((project_id, activity_type, start)):
            return self.error('Camps obligatoires')
        if activity_type not in ('WORK_SITE','WORK_DEPOT','WORK_OFFICE','TRAVEL_PRO','WORK_SAV','WORK_REMOTE','BREAK','TRAINING','OTHER'):
            return self.error('Type d\'activité invalid')

        # Create time entry
        entry_id = db.fetchone("SELECT lower(ex(randomblob(16))) )[0]
        from utils import get_week_number
        week, year = get_week_number(start)
        db.execute("""
            INSERT INTO time_entries
            (id, user_id, project_id, activity_type, started_at, ended_at, status, week_number, week_year, meal_allowance)
            VALUES (?,?,?,?,?,?,t,4?,?)