import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db, is_data_loaded
from parser import parse_all_xml
from routers import patients, daily, profile, meals_router, compare, analytics

app = FastAPI(title="CGM Glycemic Profile Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(compare.router)  # Must be before patients to match /compare first
app.include_router(patients.router)
app.include_router(daily.router)
app.include_router(profile.router)
app.include_router(meals_router.router)
app.include_router(analytics.router)


@app.on_event("startup")
def startup():
    init_db()
    if not is_data_loaded():
        print("Parsing OhioT1DM XML files...")
        parse_all_xml()
        print("Done parsing.")
    else:
        print("Data already loaded.")


@app.get("/api/dashboard")
def dashboard():
    from database import get_db
    from metrics import calc_tir

    with get_db() as conn:
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) as cnt FROM patients")
        patient_count = cur.fetchone()["cnt"]

        cur.execute("SELECT COUNT(DISTINCT substr(ts, 1, 10)) as days FROM cgm")
        total_days = cur.fetchone()["days"]

        cur.execute("SELECT COUNT(*) as cnt FROM cgm")
        total_cgm = cur.fetchone()["cnt"]

        cur.execute("SELECT COUNT(*) as cnt FROM meals")
        total_meals = cur.fetchone()["cnt"]

        # Average TIR across all patients
        cur.execute("SELECT id FROM patients ORDER BY id")
        pids = [r["id"] for r in cur.fetchall()]

        tir_values = []
        for pid in pids:
            cur.execute("SELECT value FROM cgm WHERE patient_id = ?", (pid,))
            vals = [r["value"] for r in cur.fetchall()]
            tir = calc_tir(vals)
            if tir is not None:
                tir_values.append(tir)

        avg_tir = round(sum(tir_values) / len(tir_values), 1) if tir_values else None

    return {
        "patient_count": patient_count,
        "total_days": total_days,
        "total_cgm": total_cgm,
        "total_meals": total_meals,
        "avg_tir": avg_tir,
    }
