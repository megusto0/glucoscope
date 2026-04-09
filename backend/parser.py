import os
import glob
import xml.etree.ElementTree as ET
from datetime import datetime
from database import get_connection

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "OhioT1DM")
TS_FORMAT = "%d-%m-%Y %H:%M:%S"


def parse_ts(ts_str: str) -> str:
    """Parse OhioT1DM timestamp to ISO format string."""
    dt = datetime.strptime(ts_str.strip(), TS_FORMAT)
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def parse_all_xml():
    """Parse all OhioT1DM XML files and insert into SQLite."""
    conn = get_connection()
    cur = conn.cursor()

    xml_files = sorted(glob.glob(os.path.join(DATA_DIR, "*.xml")))
    patients_seen = set()

    for xml_path in xml_files:
        tree = ET.parse(xml_path)
        root = tree.getroot()

        patient_id = int(root.attrib["id"])
        weight = float(root.attrib.get("weight", 0))
        insulin_type = root.attrib.get("insulin_type", "")

        if patient_id not in patients_seen:
            cur.execute(
                "INSERT OR IGNORE INTO patients (id, weight, insulin_type) VALUES (?, ?, ?)",
                (patient_id, weight, insulin_type),
            )
            patients_seen.add(patient_id)

        # CGM glucose_level
        gl = root.find("glucose_level")
        if gl is not None:
            rows = []
            for ev in gl.findall("event"):
                ts = ev.attrib.get("ts")
                val = ev.attrib.get("value")
                if ts and val:
                    try:
                        rows.append((patient_id, parse_ts(ts), float(val)))
                    except (ValueError, KeyError):
                        continue
            cur.executemany(
                "INSERT INTO cgm (patient_id, ts, value) VALUES (?, ?, ?)", rows
            )

        # Meals
        ml = root.find("meal")
        if ml is not None:
            rows = []
            for ev in ml.findall("event"):
                ts = ev.attrib.get("ts")
                carbs = ev.attrib.get("carbs")
                meal_type = ev.attrib.get("type", "")
                if ts and carbs:
                    try:
                        rows.append(
                            (patient_id, parse_ts(ts), meal_type, float(carbs))
                        )
                    except (ValueError, KeyError):
                        continue
            cur.executemany(
                "INSERT INTO meals (patient_id, ts, meal_type, carbs) VALUES (?, ?, ?, ?)",
                rows,
            )

        # Boluses
        bl = root.find("bolus")
        if bl is not None:
            rows = []
            for ev in bl.findall("event"):
                ts_begin = ev.attrib.get("ts_begin")
                ts_end = ev.attrib.get("ts_end")
                btype = ev.attrib.get("type", "")
                dose = ev.attrib.get("dose")
                bwz = ev.attrib.get("bwz_carb_input")
                if ts_begin and dose:
                    try:
                        rows.append((
                            patient_id,
                            parse_ts(ts_begin),
                            parse_ts(ts_end) if ts_end else None,
                            btype,
                            float(dose),
                            float(bwz) if bwz else None,
                        ))
                    except (ValueError, KeyError):
                        continue
            cur.executemany(
                "INSERT INTO boluses (patient_id, ts_begin, ts_end, bolus_type, dose, bwz_carb_input) VALUES (?, ?, ?, ?, ?, ?)",
                rows,
            )

        # Basal
        ba = root.find("basal")
        if ba is not None:
            rows = []
            for ev in ba.findall("event"):
                ts = ev.attrib.get("ts")
                val = ev.attrib.get("value")
                if ts and val:
                    try:
                        rows.append((patient_id, parse_ts(ts), float(val)))
                    except (ValueError, KeyError):
                        continue
            cur.executemany(
                "INSERT INTO basal (patient_id, ts, value) VALUES (?, ?, ?)", rows
            )

        # Heart rate
        hr = root.find("basis_heart_rate")
        if hr is not None:
            rows = []
            for ev in hr.findall("event"):
                ts = ev.attrib.get("ts")
                val = ev.attrib.get("value")
                if ts and val:
                    try:
                        rows.append((patient_id, parse_ts(ts), float(val)))
                    except (ValueError, KeyError):
                        continue
            cur.executemany(
                "INSERT INTO heart_rate (patient_id, ts, value) VALUES (?, ?, ?)",
                rows,
            )

    conn.commit()
    conn.close()
    print(f"Parsed {len(xml_files)} XML files, {len(patients_seen)} patients")
