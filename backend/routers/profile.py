from fastapi import APIRouter
from database import get_db
from metrics import calc_all_metrics, calc_time_of_day_profile, calc_daily_metrics, calc_agp_profile

router = APIRouter(prefix="/api/patients", tags=["profile"])


@router.get("/{patient_id}/profile")
def get_profile(patient_id: int):
    with get_db() as conn:
        cur = conn.cursor()

        cur.execute(
            "SELECT ts, value FROM cgm WHERE patient_id = ? ORDER BY ts",
            (patient_id,),
        )
        cgm = [dict(r) for r in cur.fetchall()]

    values = [r["value"] for r in cgm]
    overall = calc_all_metrics(values)
    daily = calc_daily_metrics(cgm)
    time_profile = calc_time_of_day_profile(cgm)
    agp = calc_agp_profile(cgm)

    # Count days with good coverage (>70% of expected 288 points/day)
    good_days = sum(1 for d in daily if d["count"] >= 288 * 0.7)

    return {
        "overall": overall,
        "daily": daily,
        "time_of_day": time_profile,
        "agp": agp,
        "good_coverage_days": good_days,
        "total_days": len(daily),
    }
