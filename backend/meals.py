"""Postprandial meal window analysis module."""

from datetime import datetime, timedelta
from typing import Optional
from database import get_db


def get_meal_windows(patient_id: int) -> list[dict]:
    """
    For each meal event, compute the postprandial window [-30, +240] min
    with CGM data, baseline, peak, etc.
    """
    with get_db() as conn:
        cur = conn.cursor()

        # Get all meals
        cur.execute(
            "SELECT id, ts, meal_type, carbs FROM meals WHERE patient_id = ? ORDER BY ts",
            (patient_id,),
        )
        meals_list = [dict(r) for r in cur.fetchall()]

        if not meals_list:
            return []

        # Get all CGM data
        cur.execute(
            "SELECT ts, value FROM cgm WHERE patient_id = ? ORDER BY ts",
            (patient_id,),
        )
        cgm_data = [dict(r) for r in cur.fetchall()]

        # Get all boluses
        cur.execute(
            "SELECT ts_begin, dose FROM boluses WHERE patient_id = ? ORDER BY ts_begin",
            (patient_id,),
        )
        boluses = [dict(r) for r in cur.fetchall()]

        # Get heart rate data
        cur.execute(
            "SELECT ts, value FROM heart_rate WHERE patient_id = ? ORDER BY ts",
            (patient_id,),
        )
        hr_data = [dict(r) for r in cur.fetchall()]

    # Pre-parse timestamps for CGM
    cgm_parsed = []
    for c in cgm_data:
        cgm_parsed.append({
            "dt": datetime.fromisoformat(c["ts"]),
            "ts": c["ts"],
            "value": c["value"],
        })

    bolus_parsed = []
    for b in boluses:
        bolus_parsed.append({
            "dt": datetime.fromisoformat(b["ts_begin"]),
            "dose": b["dose"],
        })

    hr_parsed = []
    for h in hr_data:
        hr_parsed.append({
            "dt": datetime.fromisoformat(h["ts"]),
            "value": h["value"],
        })

    meal_dts = []
    for m in meals_list:
        meal_dts.append(datetime.fromisoformat(m["ts"]))

    windows = []

    for idx, meal in enumerate(meals_list):
        meal_dt = meal_dts[idx]
        window_start = meal_dt - timedelta(minutes=30)
        window_end = meal_dt + timedelta(minutes=240)

        # Extract CGM in window
        cgm_window = [
            c for c in cgm_parsed
            if window_start <= c["dt"] <= window_end
        ]

        if len(cgm_window) < 3:
            continue

        # Baseline: average CGM in [-30, 0]
        baseline_points = [
            c["value"] for c in cgm_window
            if c["dt"] <= meal_dt
        ]
        baseline = sum(baseline_points) / len(baseline_points) if baseline_points else None

        # Peak: max in [0, +180]
        peak_window = [
            c for c in cgm_window
            if meal_dt <= c["dt"] <= meal_dt + timedelta(minutes=180)
        ]
        if peak_window:
            peak_point = max(peak_window, key=lambda c: c["value"])
            peak_value = peak_point["value"]
            time_to_peak = (peak_point["dt"] - meal_dt).total_seconds() / 60
        else:
            peak_value = None
            time_to_peak = None

        # Rise = peak - baseline
        rise = round(peak_value - baseline, 1) if (peak_value is not None and baseline is not None) else None

        # End glucose: average in [+210, +240]
        end_points = [
            c["value"] for c in cgm_window
            if meal_dt + timedelta(minutes=210) <= c["dt"] <= meal_dt + timedelta(minutes=240)
        ]
        end_glucose = round(sum(end_points) / len(end_points), 1) if end_points else None

        # Find matching bolus [-10, +20] from meal
        matched_bolus = None
        for b in bolus_parsed:
            diff = (b["dt"] - meal_dt).total_seconds() / 60
            if -10 <= diff <= 20:
                matched_bolus = b["dose"]
                break

        # CGM curve data for the window
        curve = []
        for c in cgm_window:
            minutes_from_meal = (c["dt"] - meal_dt).total_seconds() / 60
            curve.append({
                "minutes": round(minutes_from_meal, 1),
                "glucose": c["value"],
                "ts": c["ts"],
            })

        # CGM coverage check
        expected_points = 54  # 270 min / 5 min = 54 points
        coverage = len(cgm_window) / expected_points

        window = {
            "meal_id": meal["id"],
            "ts": meal["ts"],
            "meal_type": meal["meal_type"],
            "carbs": meal["carbs"],
            "baseline": round(baseline, 1) if baseline is not None else None,
            "peak": round(peak_value, 1) if peak_value is not None else None,
            "rise": rise,
            "time_to_peak": round(time_to_peak, 1) if time_to_peak is not None else None,
            "end_glucose": end_glucose,
            "bolus_dose": matched_bolus,
            "coverage": round(coverage * 100, 1),
            "cgm_points": len(cgm_window),
            "curve": curve,
        }

        windows.append(window)

    return windows


def classify_meal_time(ts: str) -> str:
    """Classify meal by time of day."""
    hour = int(ts[11:13])
    if 6 <= hour < 10:
        return "breakfast"
    elif 11 <= hour < 15:
        return "lunch"
    elif 17 <= hour < 21:
        return "dinner"
    else:
        return "snack"
