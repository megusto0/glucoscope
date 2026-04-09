from fastapi import APIRouter
from database import get_db
from metrics import calc_all_metrics
from meals import get_meal_windows
from filters import filter_windows

router = APIRouter(prefix="/api/patients", tags=["compare"])


@router.get("/compare")
def compare_patients():
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM patients ORDER BY id")
        patient_ids = [r["id"] for r in cur.fetchall()]

    results = []
    for pid in patient_ids:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT value FROM cgm WHERE patient_id = ?", (pid,)
            )
            values = [r["value"] for r in cur.fetchall()]

        metrics = calc_all_metrics(values)

        # Meal stats
        windows = get_meal_windows(pid)
        windows = filter_windows(pid, windows)
        usable = [w for w in windows if w["status"] == "usable"]

        if usable:
            avg_rise = round(
                sum(w["rise"] for w in usable if w["rise"] is not None)
                / max(sum(1 for w in usable if w["rise"] is not None), 1),
                1,
            )
            avg_ttp = round(
                sum(w["time_to_peak"] for w in usable if w["time_to_peak"] is not None)
                / max(sum(1 for w in usable if w["time_to_peak"] is not None), 1),
                1,
            )
        else:
            avg_rise = None
            avg_ttp = None

        results.append({
            "patient_id": pid,
            **metrics,
            "usable_windows": len(usable),
            "total_windows": len(windows),
            "avg_rise": avg_rise,
            "avg_time_to_peak": avg_ttp,
        })

    return results
