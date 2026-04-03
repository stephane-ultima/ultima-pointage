"""
Database layer — SQLite with connection pooling
Supports PostgreSQL via environment variable DATABASE_URL
"""
import sqlite3
import os
import json
import threading
from contextlib import contextmanager

# Env var priority: DATABASE_PATH (Railway/Docker) > DB_PATH (legacy) > /data/ultima.db
DB_PATH = os.environ.get('DATABASE_PATH', os.environ.get('DB_PATH', '/data/ultima.db'))

_local = threading.local()

def get_conn():
    if not hasattr(_local, 'conn') or _local.conn is None:
        _local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
        _local.conn.execute("PRAGMA foreign_keys=ON")
    return _local.conn

@contextmanager
def transaction():
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise

def init_db():
    schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
    with open(schema_path) as f:
        sql = f.read()
    conn = get_conn()
    conn.executescript(sql)
    conn.commit()
    print("✓ Database initialized")

def fetchone(sql, params=()):
    row = get_conn().execute(sql, params).fetchone()
    return dict(row) if row else None

def fetchall(sql, params=()):
    rows = get_conn().execute(sql, params).fetchall()
    return [dict(r) for r in rows]

def execute(sql, params=()):
    with transaction() as conn:
        cur = conn.execute(sql, params)
        return cur.lastrowid

def executemany(sql, params_list):
    with transaction() as conn:
        conn.executemany(sql, params_list)
