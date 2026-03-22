-- ============================================================
-- ULTIMA INTERIOR SA — Pointage RH
-- SQLite Schema v1.0
-- ============================================================

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email           TEXT UNIQUE,
    password_hash   TEXT,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    role            TEXT NOT NULL CHECK(role IN ('EMPLOYEE','ADMIN','MANAGER','SUPERADMIN')),
    employee_type   TEXT NOT NULL DEFAULT 'MONTEUR' CHECK(employee_type IN ('MONTEUR','ADMIN_STAFF','MANAGER')),
    weekly_target_h REAL NOT NULL DEFAULT 42.0,
    annual_leave_d  INTEGER NOT NULL DEFAULT 25,
    manager_id      TEXT REFERENCES users(id),
    phone           TEXT,
    pin_hash        TEXT,
    magic_token     TEXT,
    magic_token_exp INTEGER,
    active          INTEGER NOT NULL DEFAULT 1,
    geoloc_consent  INTEGER NOT NULL DEFAULT 0,
    avatar_url      TEXT,
    created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ─── PROJECTS (CHANTIERS) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    code        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    client_name TEXT,
    address     TEXT,
    status      TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','PAUSED','COMPLETED','ARCHIVED')),
    start_date  TEXT,
    end_date    TEXT,
    manager_id  TEXT REFERENCES users(id),
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ─── TIME ENTRIES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_entries (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL REFERENCES users(id),
    project_id      TEXT REFERENCES projects(id),
    activity_type   TEXT NOT NULL CHECK(activity_type IN (
        'WORK_SITE','WORK_DEPOT','WORK_OFFICE','TRAVEL_PRO','WORK_SAV','WORK_REMOTE','BREAK','TRAINING','OTHER'
    )),
    started_at      INTEGER NOT NULL,
    ended_at        INTEGER,
    duration_min    INTEGER GENERATED ALWAYS AS (
        CASE WHEN ended_at IS NOT NULL THEN (ended_at - started_at) / 60 ELSE NULL END
    ) STORED,
    status          TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN (
        'DRAFT','PENDING','APPROVED','RETURNED','CORRECTED','REJECTED'
    )),
    week_number     INTEGER NOT NULL,
    week_year       INTEGER NOT NULL,
    is_overtime     INTEGER NOT NULL DEFAULT 0,
    meal_allowance  INTEGER NOT NULL DEFAULT 0,
    note            TEXT,
    validated_by    TEXT REFERENCES users(id),
    validated_at    INTEGER,
    source          TEXT NOT NULL DEFAULT 'APP',
    created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_te_user_week ON time_entries(user_id, week_year, week_number);
CREATE INDEX IF NOT EXISTS idx_te_status ON time_entries(status);

-- ─── CORRECTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS corrections (
    id                      TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    time_entry_id           TEXT NOT NULL REFERENCES time_entries(id),
    requested_by            TEXT NOT NULL REFERENCES users(id),
    original_started_at     INTEGER,
    original_ended_at       INTEGER,
    original_activity_type  TEXT,
    proposed_started_at     INTEGER,
    proposed_ended_at       INTEGER,
    proposed_activity_type  TEXT,
    reason_code             TEXT NOT NULL,
    reason_detail           TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
    reviewed_by             TEXT REFERENCES users(id),
    reviewed_at             INTEGER,
    review_note             TEXT,
    created_at              INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ─── ABSENCE REQUESTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS absence_requests (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL REFERENCES users(id),
    type            TEXT NOT NULL CHECK(type IN (
        'HOLIDAY','SICK','ACCIDENT','TRAINING','UNPAID','OTHER'
    )),
    start_date      TEXT NOT NULL,
    end_date        TEXT NOT NULL,
    duration_days   REAL NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN (
        'PENDING','APPROVED','REJECTED','CANCELLED'
    )),
    comment         TEXT,
    reviewed_by     TEXT REFERENCES users(id),
    reviewed_at     INTEGER,
    review_note     TEXT,
    created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ─── AUDIT LOGS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    actor_id        TEXT REFERENCES users(id),
    action          TEXT NOT NULL,
    entity_type     TEXT NOT NULL,
    entity_id       TEXT,
    before_data     TEXT,
    after_data      TEXT,
    ip_address      TEXT,
    created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id, created_at);

-- ─── OVERTIME REQUESTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS overtime_requests (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL REFERENCES users(id),
    week_number     INTEGER NOT NULL,
    week_year       INTEGER NOT NULL,
    requested_hours REAL NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
    reviewed_by     TEXT REFERENCES users(id),
    reviewed_at     INTEGER,
    created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- ─── LEAVE BALANCES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_balances (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL REFERENCES users(id),
    year            INTEGER NOT NULL,
    holiday_total   REAL NOT NULL DEFAULT 25.0,
    holiday_taken   REAL NOT NULL DEFAULT 0.0,
    holiday_pending REAL NOT NULL DEFAULT 0.0,
    comp_balance    REAL NOT NULL DEFAULT 0.0,
    UNIQUE(user_id, year)
);
