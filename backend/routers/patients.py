from fastapi import APIRouter
from database import get_db
from metrics import calc_all_metrics

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("")
def list_patients():
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, weight, insulin_type FROM patients ORDER BY id")
        patients = [dict(r) for r in cur.fetchall()]

        for p in patients:
            cur.execute(
                "SELECT COUNT(*) as cnt FROM cgm WHERE patient_id = ?", (p["id"],)
            )
            p["cgm_count"] = cur.fetchone()["cnt"]

            cur.execute(
                "SELECT COUNT(DISTINCT substr(ts, 1, 10)) as days FROM cgm WHERE patient_id = ?",
                (p["id"],),
            )
            p["days"] = cur.fetchone()["days"]

            cur.execute(
                "SELECT COUNT(*) as cnt FROM meals WHERE patient_id = ?", (p["id"],)
            )
            p["meal_count"] = cur.fetchone()["cnt"]

    return patients


@router.get("/{patient_id}/summary")
def patient_summary(patient_id: int):
    with get_db() as conn:
        cur = conn.cursor()

        cur.execute(
            "SELECT id, weight, insulin_type FROM patients WHERE id = ?",
            (patient_id,),
        )
        patient = dict(cur.fetchone())

        cur.execute(
            "SELECT ts, value FROM cgm WHERE patient_id = ? ORDER BY ts",
            (patient_id,),
        )
        cgm = [dict(r) for r in cur.fetchall()]

        values = [r["value"] for r in cgm]
        metrics = calc_all_metrics(values)

        cur.execute(
            "SELECT COUNT(DISTINCT substr(ts, 1, 10)) as days FROM cgm WHERE patient_id = ?",
            (patient_id,),
        )
        days = cur.fetchone()["days"]

        cur.execute(
            "SELECT MIN(ts) as first_ts, MAX(ts) as last_ts FROM cgm WHERE patient_id = ?",
            (patient_id,),
        )
        date_range = dict(cur.fetchone())

    return {
        **patient,
        **metrics,
        "days": days,
        "first_date": date_range["first_ts"][:10] if date_range["first_ts"] else None,
        "last_date": date_range["last_ts"][:10] if date_range["last_ts"] else None,
    }
