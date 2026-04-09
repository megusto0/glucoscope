"""CGM metrics calculation module."""

import math
from typing import Optional


def calc_mean(values: list[float]) -> Optional[float]:
    if not values:
        return None
    return sum(values) / len(values)


def calc_sd(values: list[float]) -> Optional[float]:
    if len(values) < 2:
        return None
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / (len(values) - 1)
    return math.sqrt(variance)


def calc_cv(values: list[float]) -> Optional[float]:
    mean = calc_mean(values)
    sd = calc_sd(values)
    if mean is None or sd is None or mean == 0:
        return None
    return (sd / mean) * 100


def calc_tir(values: list[float], low: float = 70, high: float = 180) -> Optional[float]:
    """Time in Range: % of values in [low, high]."""
    if not values:
        return None
    in_range = sum(1 for v in values if low <= v <= high)
    return (in_range / len(values)) * 100


def calc_tar(values: list[float], threshold: float = 180) -> Optional[float]:
    """Time Above Range: % of values > threshold."""
    if not values:
        return None
    above = sum(1 for v in values if v > threshold)
    return (above / len(values)) * 100


def calc_tbr(values: list[float], threshold: float = 70) -> Optional[float]:
    """Time Below Range: % of values < threshold."""
    if not values:
        return None
    below = sum(1 for v in values if v < threshold)
    return (below / len(values)) * 100


def calc_all_metrics(values: list[float]) -> dict:
    """Calculate all CGM metrics for a list of glucose values."""
    return {
        "mean_glucose": round(calc_mean(values), 1) if calc_mean(values) is not None else None,
        "sd": round(calc_sd(values), 1) if calc_sd(values) is not None else None,
        "cv": round(calc_cv(values), 1) if calc_cv(values) is not None else None,
        "tir": round(calc_tir(values), 1) if calc_tir(values) is not None else None,
        "tar": round(calc_tar(values), 1) if calc_tar(values) is not None else None,
        "tbr": round(calc_tbr(values), 1) if calc_tbr(values) is not None else None,
        "min": min(values) if values else None,
        "max": max(values) if values else None,
        "count": len(values),
    }


def calc_time_of_day_profile(rows: list[dict]) -> list[dict]:
    """
    Calculate metrics for 8 three-hour segments of the day.
    rows: list of dicts with 'ts' (ISO string) and 'value' (float).
    """
    segments = []
    segment_labels = [
        ("00:00-03:00", 0, 3),
        ("03:00-06:00", 3, 6),
        ("06:00-09:00", 6, 9),
        ("09:00-12:00", 9, 12),
        ("12:00-15:00", 12, 15),
        ("15:00-18:00", 15, 18),
        ("18:00-21:00", 18, 21),
        ("21:00-00:00", 21, 24),
    ]

    for label, h_start, h_end in segment_labels:
        values = []
        for r in rows:
            ts = r["ts"]
            # Extract hour from ISO timestamp
            hour = int(ts[11:13])
            if h_start <= hour < h_end:
                values.append(r["value"])

        if values:
            sorted_vals = sorted(values)
            n = len(sorted_vals)
            median = sorted_vals[n // 2] if n % 2 == 1 else (sorted_vals[n // 2 - 1] + sorted_vals[n // 2]) / 2
            segments.append({
                "segment": label,
                "mean": round(calc_mean(values), 1),
                "median": round(median, 1),
                "tir": round(calc_tir(values), 1),
                "tar": round(calc_tar(values), 1),
                "tbr": round(calc_tbr(values), 1),
                "count": len(values),
            })
        else:
            segments.append({
                "segment": label,
                "mean": None,
                "median": None,
                "tir": None,
                "tar": None,
                "tbr": None,
                "count": 0,
            })

    return segments


def calc_daily_metrics(rows: list[dict]) -> list[dict]:
    """
    Calculate metrics per day.
    rows: list of dicts with 'ts' and 'value', sorted by ts.
    Returns list of {date, ...metrics}.
    """
    from collections import defaultdict

    by_day = defaultdict(list)
    for r in rows:
        date = r["ts"][:10]  # YYYY-MM-DD
        by_day[date].append(r["value"])

    result = []
    for date in sorted(by_day.keys()):
        vals = by_day[date]
        m = calc_all_metrics(vals)
        m["date"] = date
        result.append(m)

    return result


def calc_agp_profile(rows: list[dict]) -> list[dict]:
    """
    Ambulatory Glucose Profile: for each 5-min slot in 24h,
    compute percentiles across all days.
    rows: list of dicts with 'ts' and 'value'.
    """
    import numpy as np
    from collections import defaultdict

    # Group by time-of-day slot (HH:MM)
    slots = defaultdict(list)
    for r in rows:
        time_key = r["ts"][11:16]  # HH:MM
        slots[time_key].append(r["value"])

    result = []
    for time_key in sorted(slots.keys()):
        vals = slots[time_key]
        if len(vals) >= 3:
            arr = np.array(vals)
            result.append({
                "time": time_key,
                "p10": round(float(np.percentile(arr, 10)), 1),
                "p25": round(float(np.percentile(arr, 25)), 1),
                "median": round(float(np.median(arr)), 1),
                "p75": round(float(np.percentile(arr, 75)), 1),
                "p90": round(float(np.percentile(arr, 90)), 1),
            })

    return result
