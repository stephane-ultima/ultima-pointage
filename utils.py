"""
Utility functions — week numbers, business logic, alerts
"""
import datetime
import json
import time

def get_week_number(ts=None):
    if ts is None:
        ts = int(time.time())
    d = datetime.date.fromtimestamp(ts)
    iso = d.isocalendar()
    return iso[1], iso[0]  # week, year

def ts_now():
    return int(time.time())

def format_duration(minutes):
    if minutes is None:
        return "—"
    h = minutes // 60
    m = minutes % 60
    return f"{h}h{m:02d}"

def date_today():
    return datetime.date.today().isoformat()

def get_week_bounds(week, year):
    """Return (start_ts, end_ts) for given ISO week."""
    jan4 = datetime.date(year, 1, 4)
    week1_mon = jan4 - datetime.timedelta(days=jan4.weekday())
    week_start = week1_mon + datetime.timedelta(weeks=week - 1)
    week_end = week_start + datetime.timedelta(days=6)
    start_ts = int(datetime.datetime.combine(week_start, datetime.time.min).timestamp())
    end_ts = int(datetime.datetime.combine(week_end, datetime.time.max).timestamp())
    return start_ts, end_ts

def check_alerts(user_id, week, year):
    """
    Check business rule violations for a user-week.
    Returns list of alert dicts.
    """
    import db
    alerts = []
    start_ts, end_ts = get_week_bounds(week, year)

    # Get all work entries for this week (non-BREAK, non-DRAFT)
    entries = db.fetchall("""
        SELECT * FROM time_entries
        WHERE user_id=? AND week_number=? AND week_year=?
        AND activity_type != 'BREAK'
        AND status != 'REJECTED'
        ORDER BY started_at
    """, (user_id, week, year))

    user = db.fetchone("SELECT * FROM users WHERE id=?", (user_id,))
    target_h = user['weekly_target_h'] if user else 42.0

    # Total minutes worked
    total_min = sum(e['duration_min'] or 0 for e in entries if e['ended_at'])
    total_h = total_min / 60

    # ALT001: Minimum rest between sessions (only between different calendar days)
    work_entries = [e for e in entries if e['ended_at']]
    for i in range(1, len(work_entries)):
        prev_day = datetime.date.fromtimestamp(work_entries[i-1]['ended_at'])
        curr_day = datetime.date.fromtimestamp(work_entries[i]['started_at'])
        if prev_day == curr_day:
            continue  # same-day sessions: no overnight rest required
        gap_h = (work_entries[i]['started_at'] - work_entries[i-1]['ended_at']) / 3600
        if gap_h < 11:
            alerts.append({
                'code': 'ALT001',
                'level': 'CRITIQUE',
                'message': f"Repos < 11h détecté entre deux sessions",
                'entry_id': work_entries[i]['id']
            })

    # ALT002: Weekly hours over target (but under max)
    if total_h > target_h:
        alerts.append({
            'code': 'ALT002',
            'level': 'HAUTE',
            'message': f"Semaine > {target_h}h : {total_h:.1f}h travaillées"
        })

    # ALT003: Over 50h absolute max
    if total_h > 50:
        alerts.append({
            'code': 'ALT003',
            'level': 'CRITIQUE',
            'message': f"Maximum légal 50h/semaine dépassé : {total_h:.1f}h"
        })

    # Group by day, check for missing pause after 5h30
    from collections import defaultdict
    by_day = defaultdict(list)
    for e in entries:
        d = datetime.date.fromtimestamp(e['started_at']).isoformat()
        by_day[d].append(e)

    breaks = db.fetchall("""
        SELECT * FROM time_entries
        WHERE user_id=? AND week_number=? AND week_year=?
        AND activity_type = 'BREAK' AND ended_at IS NOT NULL
    """, (user_id, week, year))
    break_days = {datetime.date.fromtimestamp(b['started_at']).isoformat() for b in breaks}

    for day, day_entries in by_day.items():
        day_min = sum(e['duration_min'] or 0 for e in day_entries if e['ended_at'])
        if day_min > 330 and day not in break_days:  # > 5h30
            alerts.append({
                'code': 'ALT004',
                'level': 'MOYENNE',
                'message': f"Pause manquante le {day} ({format_duration(day_min)} travaillées)"
            })

    return alerts

def calc_meal_allowance(user_id, date_str):
    """MVP rule: MONTEUR employees working > 4h (240 min) get meal allowance CHF 20."""
    import db
    user = db.fetchone("SELECT employee_type FROM users WHERE id=?", (user_id,))
    if not user or user['employee_type'] != 'MONTEUR':
        return False
    d = datetime.date.fromisoformat(date_str)
    start_ts = int(datetime.datetime.combine(d, datetime.time.min).timestamp())
    end_ts = int(datetime.datetime.combine(d, datetime.time.max).timestamp())
    work_entries = db.fetchall("""
        SELECT duration_min FROM time_entries
        WHERE user_id=? AND started_at>=? AND started_at<=?
        AND activity_type IN ('WORK_SITE','WORK_DEPOT','TRAVEL_PRO','WORK_SAV')
        AND ended_at IS NOT NULL
        AND status != 'REJECTED'
    """, (user_id, start_ts, end_ts))
    total_min = sum(e['duration_min'] or 0 for e in work_entries)
    return total_min > 240

def json_serial(obj):
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")
