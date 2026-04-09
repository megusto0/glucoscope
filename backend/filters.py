"""Postprandial window filtering module."""

from datetime import datetime, timedelta
from database import get_db


def filter_windows(patient_id: int, windows: list[dict]) -> list[dict]:
    """
    Apply filters to meal windows. Each window gets a 'status' and 'exclude_reasons'.
    """
    # Get heart rate data for activity filter
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT ts, value FROM heart_rate WHERE patient_id = ? ORDER BY ts",
            (patient_id,),
        )
        hr_data = [dict(r) for r in cur.fetchall()]

    hr_parsed = []
    for h in hr_data:
        hr_parsed.append({
            "dt": datetime.fromisoformat(h["ts"]),
            "value": h["value"],
        })

    # Build meal timestamp list for overlap check
    meal_times = []
    for w in windows:
        meal_times.append(datetime.fromisoformat(w["ts"]))

    for i, window in enumerate(windows):
        reasons = []
        meal_dt = meal_times[i]

        # 1. Overlap: another meal within 4 hours
        for j, other_dt in enumerate(meal_times):
            if i == j:
                continue
            diff_hours = abs((other_dt - meal_dt).total_seconds()) / 3600
            if diff_hours < 4:
                reasons.append("overlap")
                break

        # 2. CGM gap: coverage < 80%
        if window["coverage"] < 80:
            reasons.append("cgm_gap")

        # 3. No bolus
        if window["bolus_dose"] is None:
            reasons.append("no_bolus")

        # 4. High activity: HR > 120 during window
        window_start = meal_dt - timedelta(minutes=30)
        window_end = meal_dt + timedelta(minutes=240)
        hr_in_window = [
            h for h in hr_parsed
            if window_start <= h["dt"] <= window_end
        ]
        if hr_in_window:
            max_hr = max(h["value"] for h in hr_in_window)
            if max_hr > 120:
                reasons.append("high_activity")

        window["exclude_reasons"] = reasons
        # Usable if no critical reasons (overlap or cgm_gap are critical)
        critical = {"overlap", "cgm_gap"}
        has_critical = bool(critical & set(reasons))
        window["status"] = "excluded" if has_critical else "usable"

    return windows
