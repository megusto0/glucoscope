from fastapi import APIRouter
from database import get_db
from metrics import calc_all_metrics

router = APIRouter(prefix="/api/patients", tags=["daily"])


@router.get("/{patient_id}/dates")
def get_available_dates(patient_id: int):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT DISTINCT substr(ts, 1, 10) as date FROM cgm WHERE patient_id = ? ORDER BY date",
            (patient_id,),
        )
        dates = [r["date"] for r in cur.fetchall()]
    return dates


@router.get("/{patient_id}/daily/{date}")
def get_daily(patient_id: int, date: str):
    with get_db() as conn:
        cur = conn.cursor()

        # CGM data for the day
        cur.execute(
            "SELECT ts, value FROM cgm WHERE patient_id = ? AND ts LIKE ? ORDER BY ts",
            (patient_id, f"{date}%"),
        )
        cgm = [dict(r) for r in cur.fetchall()]

        # Meals for the day
        cur.execute(
            "SELECT id, ts, meal_type, carbs FROM meals WHERE patient_id = ? AND ts LIKE ? ORDER BY ts",
            (patient_id, f"{date}%"),
        )
        meals = [dict(r) for r in cur.fetchall()]

        # Boluses for the day
        cur.execute(
            "SELECT ts_begin, ts_end, bolus_type, dose, bwz_carb_input FROM boluses WHERE patient_id = ? AND ts_begin LIKE ? ORDER BY ts_begin",
            (patient_id, f"{date}%"),
        )
        boluses = [dict(r) for r in cur.fetchall()]

        # Basal for the day
        cur.execute(
            "SELECT ts, value FROM basal WHERE patient_id = ? AND ts LIKE ? ORDER BY ts",
            (patient_id, f"{date}%"),
        )
        basal = [dict(r) for r in cur.fetchall()]

        # Heart rate for the day
        cur.execute(
            "SELECT ts, value FROM heart_rate WHERE patient_id = ? AND ts LIKE ? ORDER BY ts",
            (patient_id, f"{date}%"),
        )
        heart_rate = [dict(r) for r in cur.fetchall()]

    values = [c["value"] for c in cgm]
    metrics = calc_all_metrics(values)

    return {
        "date": date,
        "cgm": cgm,
        "meals": meals,
        "boluses": boluses,
        "basal": basal,
        "heart_rate": heart_rate,
        "metrics": metrics,
    }
