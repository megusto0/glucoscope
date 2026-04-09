from fastapi import APIRouter
from meals import get_meal_windows, classify_meal_time
from filters import filter_windows

router = APIRouter(prefix="/api/patients", tags=["meals"])


@router.get("/{patient_id}/meals")
def get_meals(patient_id: int):
    windows = get_meal_windows(patient_id)
    windows = filter_windows(patient_id, windows)

    # Add meal time classification
    for w in windows:
        w["meal_time"] = classify_meal_time(w["ts"])
        # Remove curve data from list view for performance
        w.pop("curve", None)

    usable = [w for w in windows if w["status"] == "usable"]
    excluded = [w for w in windows if w["status"] == "excluded"]

    # Aggregate stats for usable windows
    if usable:
        avg_rise = round(
            sum(w["rise"] for w in usable if w["rise"] is not None)
            / max(sum(1 for w in usable if w["rise"] is not None), 1),
            1,
        )
        avg_time_to_peak = round(
            sum(w["time_to_peak"] for w in usable if w["time_to_peak"] is not None)
            / max(sum(1 for w in usable if w["time_to_peak"] is not None), 1),
            1,
        )
    else:
        avg_rise = None
        avg_time_to_peak = None

    # Exclusion reasons breakdown
    reason_counts = {}
    for w in excluded:
        for r in w.get("exclude_reasons", []):
            reason_counts[r] = reason_counts.get(r, 0) + 1

    return {
        "total": len(windows),
        "usable": len(usable),
        "excluded": len(excluded),
        "avg_rise": avg_rise,
        "avg_time_to_peak": avg_time_to_peak,
        "reason_counts": reason_counts,
        "windows": windows,
    }


@router.get("/{patient_id}/meals/curves")
def get_meal_curves(patient_id: int, ids: str = ""):
    """Get curve data for multiple meal windows (for overlay chart)."""
    if not ids:
        return []
    id_list = [int(x) for x in ids.split(",") if x.strip()]
    windows = get_meal_windows(patient_id)
    windows = filter_windows(patient_id, windows)
    result = []
    for w in windows:
        if w["meal_id"] in id_list:
            result.append({"meal_id": w["meal_id"], "curve": w.get("curve", [])})
    return result


@router.get("/{patient_id}/meals/{meal_id}")
def get_meal_detail(patient_id: int, meal_id: int):
    windows = get_meal_windows(patient_id)
    windows = filter_windows(patient_id, windows)

    for w in windows:
        if w["meal_id"] == meal_id:
            w["meal_time"] = classify_meal_time(w["ts"])
            return w

    return {"error": "Meal not found"}
