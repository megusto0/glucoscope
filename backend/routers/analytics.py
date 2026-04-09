from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Request
from pydantic import BaseModel
from database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

TZ4 = timezone(timedelta(hours=4))


def now4() -> datetime:
    return datetime.now(TZ4)


class PageView(BaseModel):
    page: str


@router.post("/visit")
def record_visit(pv: PageView, request: Request):
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    ua = request.headers.get("user-agent", "")
    referrer = request.headers.get("referer", "")
    ts = now4().strftime("%Y-%m-%dT%H:%M:%S")

    with get_db() as conn:
        conn.execute(
            "INSERT INTO visits (ts, ip, user_agent, page, referrer) VALUES (?, ?, ?, ?, ?)",
            (ts, ip, ua, pv.page, referrer),
        )
        conn.commit()

    return {"ok": True}


@router.get("/stats")
def get_stats():
    with get_db() as conn:
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) as total FROM visits")
        total = cur.fetchone()["total"]

        cur.execute("SELECT COUNT(DISTINCT ip) as unique_visitors FROM visits")
        unique_visitors = cur.fetchone()["unique_visitors"]

        today = now4().strftime("%Y-%m-%d")
        cur.execute("SELECT COUNT(*) as cnt FROM visits WHERE ts LIKE ?", (f"{today}%",))
        today_count = cur.fetchone()["cnt"]

        daily = []
        for i in range(6, -1, -1):
            d = (now4() - timedelta(days=i)).strftime("%Y-%m-%d")
            cur.execute("SELECT COUNT(*) as cnt FROM visits WHERE ts LIKE ?", (f"{d}%",))
            daily.append({"date": d, "count": cur.fetchone()["cnt"]})

        cur.execute(
            "SELECT page, COUNT(*) as cnt FROM visits GROUP BY page ORDER BY cnt DESC LIMIT 20"
        )
        pages = [dict(r) for r in cur.fetchall()]

        # Recent visits grouped by IP
        cur.execute(
            "SELECT ts, ip, page, user_agent, referrer FROM visits ORDER BY id DESC LIMIT 200"
        )
        all_recent = [dict(r) for r in cur.fetchall()]

        # Group by IP
        by_ip: dict[str, list] = {}
        for v in all_recent:
            ip = v["ip"]
            if ip not in by_ip:
                by_ip[ip] = []
            by_ip[ip].append(v)

        grouped = []
        for ip, visits in by_ip.items():
            grouped.append({
                "ip": ip,
                "count": len(visits),
                "last_seen": visits[0]["ts"],
                "user_agent": visits[0]["user_agent"],
                "visits": visits,
            })
        grouped.sort(key=lambda g: g["last_seen"], reverse=True)

        cur.execute(
            "SELECT substr(ts, 12, 2) as hour, COUNT(*) as cnt FROM visits GROUP BY hour ORDER BY hour"
        )
        hourly = [dict(r) for r in cur.fetchall()]

        unique_daily = []
        for i in range(6, -1, -1):
            d = (now4() - timedelta(days=i)).strftime("%Y-%m-%d")
            cur.execute("SELECT COUNT(DISTINCT ip) as cnt FROM visits WHERE ts LIKE ?", (f"{d}%",))
            unique_daily.append({"date": d, "count": cur.fetchone()["cnt"]})

    return {
        "total_views": total,
        "unique_visitors": unique_visitors,
        "today_views": today_count,
        "daily": daily,
        "unique_daily": unique_daily,
        "pages": pages,
        "grouped_visits": grouped,
        "hourly": hourly,
    }
