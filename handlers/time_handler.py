"""
Time entry endpoints — pointage core
"""
import time
import json
import db
import csv
import io
from handlers.base import BaseHandler
from utils import get_week_number, ts_now, check_alerts, calc_meal_allowance, format_duration


class TimeEntriesHandler(BaseHandler):

    def get(self):
        user = self.require_auth()
        if not user: return

        import datetime
        mode = self.get_argument('mode', 'week')  # week | day | month | year
        status = self.get_argument('status', None)

        if mode == 'day':
            date_str = self.get_argument('date', datetime.date.today().isoformat())
            try:
                d = datetime.date.fromisoformat(date_str)
            except ValueError:
                return self.error('Format de date invalide (YYYY-MM-DD)')
            start_ts = int(datetime.datetime.combine(d, datetime.time.min).timestamp())
            end_ts = int(datetime.datetime.combine(d, datetime.time.max).timestamp())
            params = [user['id'], start_ts, end_ts]
            q = """
                SELECT te.*, p.name as project_name, p.code as project_code,
                       u.first_name, u.last_name
                FROM time_entries te
                LEFT JOIN projects p ON te.project_id = p.id
                LEFT JOIN users u ON te.user_id = u.id
                WHERE te.user_id=? AND te.started_at>=? AND te.started_at<=?
            """
            if status:
                q += " AND te.status=?"
                params.append(status)
            q += " ORDER BY te.started_at DESC"
            entries = db.fetchall(q, params)
            total_min = sum(e['duration_min'] or 0 for e in entries
                            if e['ended_at'] and e['activity_type'] != 'BREAK')
            week, year = get_week_number(start_ts)
            alerts = check_alerts(user['id'], week, year)
            self.json({
                'entries': entries,
                'total_min': total_min,
                'alerts': alerts,
                'date': date_str,
                'mode': 'day'
            })

        elif mode == 'month':
            month = int(self.get_argument('month', datetime.date.today().month))
            year = int(self.get_argument('year', datetime.date.today().year))
            start_ts = int(datetime.datetime(year, month, 1, 0, 0, 0).timestamp())
            if month == 12:
                end_ts = int(datetime.datetime(year + 1, 1, 1, 0, 0, 0).timestamp()) - 1
            else:
                end_ts = int(datetime.datetime(year, month + 1, 1, 0, 0, 0).timestamp()) - 1
            params = [user['id'], start_ts, end_ts]
            q = """
                SELECT te.*, p.name as project_name, p.code as project_code
                FROM time_entries te
                LEFT JOIN projects p ON te.project_id = p.id
                WHERE te.user_id=? AND te.started_at>=? AND te.started_at<=?
                AND te.ended_at IS NOT NULL AND te.status != 'REJECTED'
            """
            if status:
                q += " AND te.status=?"
                params.append(status)
            q += " ORDER BY te.started_at"
            entries = db.fetchall(q, params)

            # Aggregate by day
            by_day = {}
            for e in entries:
                d = datetime.date.fromtimestamp(e['started_at']).isoformat()
                if d not in by_day:
                    by_day[d] = {'date': d, 'work_min': 0, 'break_min': 0, 'entries': []}
                if e['activity_type'] == 'BREAK':
                    by_day[d]['break_min'] += e['duration_min'] or 0
                else:
                    by_day[d]['work_min'] += e['duration_min'] or 0
                by_day[d]['entries'].append(dict(e))

            days = sorted(by_day.values(), key=lambda x: x['date'])
            total_min = sum(d['work_min'] for d in days)
            self.json({
                'days': days,
                'total_min': total_min,
                'month': month,
                'year': year,
                'mode': 'month'
            })

        elif mode == 'year':
            year = int(self.get_argument('year', datetime.date.today().year))
            start_ts = int(datetime.datetime(year, 1, 1, 0, 0, 0).timestamp())
            end_ts = int(datetime.datetime(year + 1, 1, 1, 0, 0, 0).timestamp()) - 1
            entries = db.fetchall("""
                SELECT te.started_at, te.duration_min, te.activity_type
                FROM time_entries te
                WHERE te.user_id=? AND te.started_at>=? AND te.started_at<=?
                AND te.activity_type != 'BREAK' AND te.ended_at IS NOT NULL
                AND te.status != 'REJECTED'
            """, (user['id'], start_ts, end_ts))

            # Aggregate by month
            by_month = {}
            for e in entries:
                m = datetime.date.fromtimestamp(e['started_at']).month
                by_month[m] = by_month.get(m, 0) + (e['duration_min'] or 0)

            months = [{'month': m, 'work_min': by_month.get(m, 0)} for m in range(1, 13)]
            total_min = sum(by_month.values())
            self.json({
                'months': months,
                'total_min': total_min,
                'year': year,
                'mode': 'year'
            })

        else:  # week mode (default)
            week = self.get_argument('week', None)
            year = self.get_argument('year', None)

            if not week or not year:
                w, y = get_week_number()
                week, year = str(w), str(y)

            params = [user['id'], int(week), int(year)]
            q = """
                SELECT te.*, p.name as project_name, p.code as project_code,
                       u.first_name, u.last_name
                FROM time_entries te
                LEFT JOIN projects p ON te.project_id = p.id
                LEFT JOIN users u ON te.user_id = u.id
                WHERE te.user_id=? AND te.week_number=? AND te.week_year=?
            """
            if status:
                q += " AND te.status=?"
                params.append(status)
            q += " ORDER BY te.started_at DESC"
            entries = db.fetchall(q, params)

            # Add alerts
            alerts = check_alerts(user['id'], int(week), int(year))
            total_min = sum(e['duration_min'] or 0 for e in entries
                            if e['ended_at'] and e['activity_type'] != 'BREAK')
            self.json({
                'entries': entries,
                'total_min': total_min,
                'alerts': alerts,
                'week': int(week),
                'year': int(year),
                'mode': 'week'
            })

    def post(self):
        user = self.require_auth()
        if not user: return
        data = self.body()

        activity = data.get('activity_type')
        if activity not in ('WORK_SITE','WORK_DEPOT','TRAVEL_PRO','WORK_SAV','WORK_REMOTE','BREAK'):
            return self.error('Type d\'activité invalide')

        # Close any open session first
        open_session = db.fetchone("""
            SELECT id FROM time_entries WHERE user_id=? AND status='DRAFT' AND ended_at IS NULL
        """, (user['id'],))
        now = ts_now()

        if open_session:
            week, year = get_week_number(now)
            db.execute("""
                UPDATE time_entries SET ended_at=?, status='PENDING', updated_at=?
                WHERE id=?
            """, (now, now, open_session['id']))
            # Trigger meal allowance check
            import datetime
            today = datetime.date.fromtimestamp(now).isoformat()
            if calc_meal_allowance(user['id'], today):
                db.execute("""
                    UPDATE time_entries SET meal_allowance=1
                    WHERE user_id=? AND started_at>=? AND started_at<=?
                    AND activity_type IN ('WORK_SITE','WORK_DEPOT','TRAVEL_PRO','WORK_SAV')
                """, (user['id'],
                      int(datetime.datetime.combine(datetime.date.fromisoformat(today),
                          datetime.time.min).timestamp()),
                      int(datetime.datetime.combine(datetime.date.fromisoformat(today),
                          datetime.time.max).timestamp())))

        week, year = get_week_number(now)
        entry_id = db.fetchone("SELECT lower(hex(randomblob(16))) as id")['id']

        db.execute("""
            INSERT INTO time_entries
                (id, user_id, project_id, activity_type, started_at, status,
                 week_number, week_year, note, source)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (entry_id, user['id'], data.get('project_id'), activity,
              now, 'DRAFT', week, year, data.get('note', ''), 'APP'))

        entry = db.fetchone("""
            SELECT te.*, p.name as project_name FROM time_entries te
            LEFT JOIN projects p ON te.project_id = p.id
            WHERE te.id=?
        """, (entry_id,))
        self.audit('TIME_ENTRY_START', 'time_entries', entry_id)
        self.json(entry, 201)


class TimeEntryDetailHandler(BaseHandler):

    def patch(self, entry_id, action=None):
        user = self.require_auth()
        if not user: return

        entry = db.fetchone("SELECT * FROM time_entries WHERE id=?", (entry_id,))
        if not entry:
            return self.error('Entrée introuvable', 404)

        now = ts_now()

        if action == 'stop':
            if entry['user_id'] != user['id']:
                return self.error('Accès refusé', 403)
            db.execute("""
                UPDATE time_entries SET ended_at=?, status='PENDING', updated_at=?
                WHERE id=? AND ended_at IS NULL
            """, (now, now, entry_id))
            # Check meal allowance
            import datetime
            today = datetime.date.fromtimestamp(entry['started_at']).isoformat()
            if calc_meal_allowance(user['id'], today):
                db.execute("""
                    UPDATE time_entries SET meal_allowance=1
                    WHERE user_id=? AND date(started_at, 'unixepoch')=?
                    AND activity_type IN ('WORK_SITE','WORK_DEPOT','TRAVEL_PRO','WORK_SAV')
                """, (user['id'], today))
            self.audit('TIME_ENTRY_STOP', 'time_entries', entry_id)

        elif action == 'validate':
            if user['role'] not in ('MANAGER', 'ADMIN', 'SUPERADMIN'):
                return self.error('Accès refusé', 403)
            db.execute("""
                UPDATE time_entries
                SET status='APPROVED', validated_by=?, validated_at=?, updated_at=?
                WHERE id=?
            """, (user['id'], now, now, entry_id))
            self.audit('TIME_ENTRY_VALIDATED', 'time_entries', entry_id)

        elif action == 'return':
            if user['role'] not in ('MANAGER', 'ADMIN', 'SUPERADMIN'):
                return self.error('Accès refusé', 403)
            data = self.body()
            note = data.get('note', '')
            db.execute("""
                UPDATE time_entries SET status='RETURNED', note=?, updated_at=?
                WHERE id=?
            """, (note, now, entry_id))
            self.audit('TIME_ENTRY_RETURNED', 'time_entries', entry_id)

        elif action == 'correction':
            data = self.body()
            if not data.get('reason_detail'):
                return self.error('Motif de correction obligatoire')
            corr_id = db.fetchone("SELECT lower(hex(randomblob(16))) as id")['id']
            db.execute("""
                INSERT INTO corrections
                    (id, time_entry_id, requested_by, original_started_at,
                     original_ended_at, original_activity_type,
                     proposed_started_at, proposed_ended_at, proposed_activity_type,
                     reason_code, reason_detail)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """, (corr_id, entry_id, user['id'],
                  entry['started_at'], entry['ended_at'], entry['activity_type'],
                  data.get('proposed_started_at'), data.get('proposed_ended_at'),
                  data.get('proposed_activity_type', entry['activity_type']),
                  data.get('reason_code', 'AUTRE'), data.get('reason_detail')))
            self.audit('CORRECTION_REQUESTED', 'corrections', corr_id)
            self.json({'message': 'Correction soumise', 'correction_id': corr_id})
            return

        updated = db.fetchone("""
            SELECT te.*, p.name as project_name FROM time_entries te
            LEFT JOIN projects p ON te.project_id = p.id WHERE te.id=?
        """, (entry_id,))
        self.json(updated)


class TeamEntriesHandler(BaseHandler):
    """Manager: view all team entries."""

    def get(self):
        user = self.require_auth(['MANAGER', 'ADMIN', 'SUPERADMIN'])
        if not user: return

        week = int(self.get_argument('week', get_week_number()[0]))
        year = int(self.get_argument('year', get_week_number()[1]))

        # Get all employees under this manager
        if user['role'] == 'MANAGER':
            employees = db.fetchall("""
                SELECT * FROM users WHERE manager_id=? AND active=1
            """, (user['id'],))
        else:
            employees = db.fetchall("SELECT * FROM users WHERE active=1 AND role='EMPLOYEE'")

        result = []
        for emp in employees:
            entries = db.fetchall("""
                SELECT te.*, p.name as project_name FROM time_entries te
                LEFT JOIN projects p ON te.project_id = p.id
                WHERE te.user_id=? AND te.week_number=? AND te.week_year=?
                AND te.activity_type != 'BREAK'
                ORDER BY te.started_at
            """, (emp['id'], week, year))
            total_min = sum(e['duration_min'] or 0 for e in entries if e['ended_at'])
            alerts = check_alerts(emp['id'], week, year)
            pending_count = sum(1 for e in entries if e['status'] in ('PENDING','RETURNED','CORRECTED'))
            result.append({
                'employee': {
                    'id': emp['id'],
                    'first_name': emp['first_name'],
                    'last_name': emp['last_name'],
                    'weekly_target_h': emp['weekly_target_h'],
                    'employee_type': emp.get('employee_type', 'MONTEUR'),
                },
                'total_min': total_min,
                'target_min': emp['weekly_target_h'] * 60,
                'alerts': alerts,
                'alert_count': len(alerts),
                'pending_count': pending_count,
                'has_pending': pending_count > 0,
                'entries': entries
            })

        self.json({'team': result, 'week': week, 'year': year})


class ValidateWeekHandler(BaseHandler):
    """Manager: validate entire week for a user."""

    def post(self):
        user = self.require_auth(['MANAGER', 'ADMIN', 'SUPERADMIN'])
        if not user: return
        data = self.body()
        emp_id = data.get('user_id')  # optional – if omitted, validates ALL employees
        week = data.get('week')
        year = data.get('year')
        if not week or not year:
            return self.error('week et year requis')
        now = ts_now()
        if emp_id:
            db.execute("""
                UPDATE time_entries
                SET status='APPROVED', validated_by=?, validated_at=?, updated_at=?
                WHERE user_id=? AND week_number=? AND week_year=?
                AND status IN ('PENDING','CORRECTED')
            """, (user['id'], now, now, emp_id, int(week), int(year)))
            self.audit('WEEK_VALIDATED', 'time_entries', f"{emp_id}_{week}_{year}")
        else:
            # Validate entire week for all employees
            db.execute("""
                UPDATE time_entries
                SET status='APPROVED', validated_by=?, validated_at=?, updated_at=?
                WHERE week_number=? AND week_year=?
                AND status IN ('PENDING','CORRECTED')
            """, (user['id'], now, now, int(week), int(year)))
            self.audit('WEEK_VALIDATED_ALL', 'time_entries', f"all_{week}_{year}")
        self.json({'message': 'Semaine validée', 'validated': True})


class ExportHandler(BaseHandler):
    """Export time entries as CSV."""

    def get(self):
        user = self.require_auth(['MANAGER', 'ADMIN', 'SUPERADMIN'])
        if not user: return

        week = self.get_argument('week', None)
        year = self.get_argument('year', None)
        emp_id = self.get_argument('user_id', None)

        q = """
            SELECT u.first_name, u.last_name, te.activity_type,
                   te.started_at, te.ended_at, te.duration_min,
                   p.code as project_code, p.name as project_name,
                   te.status, te.meal_allowance, te.week_number, te.week_year
            FROM time_entries te
            JOIN users u ON te.user_id = u.id
            LEFT JOIN projects p ON te.project_id = p.id
            WHERE 1=1
        """
        params = []
        if week and year:
            q += " AND te.week_number=? AND te.week_year=?"
            params += [int(week), int(year)]
        if emp_id:
            q += " AND te.user_id=?"
            params.append(emp_id)
        q += " ORDER BY u.last_name, te.started_at"
        rows = db.fetchall(q, params)

        output = io.StringIO()
        writer = csv.writer(output, delimiter=';')
        writer.writerow(['Prénom', 'Nom', 'Activité', 'Début', 'Fin', 'Durée (min)',
                          'Code chantier', 'Chantier', 'Statut', 'Ind. repas',
                          'Semaine', 'Année'])
        import datetime
        for r in rows:
            def fmt_ts(ts):
                if not ts: return ''
                return datetime.datetime.fromtimestamp(ts).strftime('%d.%m.%Y %H:%M')
            writer.writerow([
                r['first_name'], r['last_name'], r['activity_type'],
                fmt_ts(r['started_at']), fmt_ts(r['ended_at']),
                r['duration_min'] or '',
                r['project_code'] or '', r['project_name'] or '',
                r['status'], 'CHF 20.00' if r['meal_allowance'] else '',
                r['week_number'], r['week_year']
            ])

        self.set_header('Content-Type', 'text/csv; charset=utf-8-sig')
        self.set_header('Content-Disposition', 'attachment; filename=pointage_export.csv')
        self.finish(output.getvalue().encode('utf-8-sig'))
