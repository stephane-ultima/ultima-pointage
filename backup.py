"""
SQLite hot-backup module — Ultima Pointage
==========================================
Uses sqlite3.Connection.backup() (safe with WAL, no writer blocking).
Keeps the last KEEP_COUNT backups and rotates older ones.
Backup location: same directory as the DB, in a 'backups/' sub-folder.

Usage (called from server.py):
    import backup
    backup.schedule(db_path)        # starts hourly PeriodicCallback
    backup.run_backup(db_path)      # one-shot backup (also callable via API)
"""
import sqlite3
import os
import glob
import logging
import tornado.ioloop

log = logging.getLogger(__name__)

# How many backup files to keep (default 24 → 24 h rolling window at 1 h interval)
KEEP_COUNT = int(os.environ.get('BACKUP_KEEP', '24'))

# Interval in milliseconds (default 1 h)
INTERVAL_MS = int(os.environ.get('BACKUP_INTERVAL_MS', str(60 * 60 * 1000)))


def _backup_dir(db_path: str) -> str:
    d = os.path.join(os.path.dirname(os.path.abspath(db_path)), 'backups')
    os.makedirs(d, exist_ok=True)
    return d


def _rotate(db_path: str):
    """Delete oldest backups beyond KEEP_COUNT."""
    pattern = os.path.join(_backup_dir(db_path), 'ultima_*.db')
    files = sorted(glob.glob(pattern))
    while len(files) > KEEP_COUNT:
        oldest = files.pop(0)
        try:
            os.remove(oldest)
            log.info('[backup] removed old backup: %s', oldest)
        except OSError as e:
            log.warning('[backup] could not remove %s: %s', oldest, e)


def run_backup(db_path: str) -> dict:
    """
    Perform a hot backup of the SQLite database.
    Returns a dict with status, path, and size_kb.
    """
    from datetime import datetime
    ts = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    dest = os.path.join(_backup_dir(db_path), f'ultima_{ts}.db')
    try:
        src = sqlite3.connect(db_path)
        dst = sqlite3.connect(dest)
        # pages=-1 means copy everything in one shot (safe for small DBs)
        src.backup(dst, pages=-1)
        src.close()
        dst.close()
        size_kb = os.path.getsize(dest) // 1024
        log.info('[backup] OK \u2192 %s (%d KB)', dest, size_kb)
        _rotate(db_path)
        return {'ok': True, 'path': dest, 'size_kb': size_kb, 'ts': ts}
    except Exception as e:
        log.error('[backup] FAILED: %s', e)
        try:
            os.remove(dest)
        except OSError:
            pass
        return {'ok': False, 'error': str(e)}


def schedule(db_path: str):
    """
    Schedule hourly backups via Tornado IOLoop.
    Also runs one initial backup 60 s after startup.
    """
    def _do():
        result = run_backup(db_path)
        if not result['ok']:
            log.error('[backup] scheduled backup failed: %s', result.get('error'))

    # First backup 60 s after startup (let the server warm up)
    tornado.ioloop.IOLoop.current().call_later(60, _do)

    # Then every INTERVAL_MS
    cb = tornado.ioloop.PeriodicCallback(_do, INTERVAL_MS)
    cb.start()
    log.info('[backup] scheduled every %d ms, keeping %d copies', INTERVAL_MS, KEEP_COUNT)
