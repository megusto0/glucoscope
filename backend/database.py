import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "cgm.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    conn = get_connection()
    cur = conn.cursor()
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY,
            weight REAL,
            insulin_type TEXT
        );

        CREATE TABLE IF NOT EXISTS cgm (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            ts TEXT NOT NULL,
            value REAL NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        );
        CREATE INDEX IF NOT EXISTS idx_cgm_patient_ts ON cgm(patient_id, ts);

        CREATE TABLE IF NOT EXISTS meals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            ts TEXT NOT NULL,
            meal_type TEXT,
            carbs REAL,
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        );
        CREATE INDEX IF NOT EXISTS idx_meals_patient_ts ON meals(patient_id, ts);

        CREATE TABLE IF NOT EXISTS boluses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            ts_begin TEXT NOT NULL,
            ts_end TEXT,
            bolus_type TEXT,
            dose REAL,
            bwz_carb_input REAL,
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        );
        CREATE INDEX IF NOT EXISTS idx_boluses_patient_ts ON boluses(patient_id, ts_begin);

        CREATE TABLE IF NOT EXISTS basal (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            ts TEXT NOT NULL,
            value REAL NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        );
        CREATE INDEX IF NOT EXISTS idx_basal_patient_ts ON basal(patient_id, ts);

        CREATE TABLE IF NOT EXISTS heart_rate (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            ts TEXT NOT NULL,
            value REAL NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        );
        CREATE INDEX IF NOT EXISTS idx_hr_patient_ts ON heart_rate(patient_id, ts);

        CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            ip TEXT,
            user_agent TEXT,
            page TEXT,
            referrer TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_visits_ts ON visits(ts);
    """)
    conn.commit()
    conn.close()


def is_data_loaded() -> bool:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM patients")
    count = cur.fetchone()[0]
    conn.close()
    return count > 0
