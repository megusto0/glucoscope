import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import Loader from '../components/Loader';
import { CHART_TOOLTIP_STYLE } from '../utils/colors';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RecentVisit {
  ts: string;
  ip: string;
  page: string;
  user_agent: string;
  referrer: string;
}

interface GroupedVisit {
  ip: string;
  count: number;
  last_seen: string;
  user_agent: string;
  visits: { ts: string; ip: string; page: string; user_agent: string; referrer: string }[];
}

interface StatsData {
  total_views: number;
  unique_visitors: number;
  today_views: number;
  daily: { date: string; count: number }[];
  unique_daily: { date: string; count: number }[];
  pages: { page: string; cnt: number }[];
  grouped_visits?: GroupedVisit[];
  recent?: RecentVisit[];
  hourly: { hour: string; cnt: number }[];
}

function groupVisits(visits: RecentVisit[] | undefined): GroupedVisit[] {
  if (!visits || visits.length === 0) return [];

  const byIp = new Map<string, RecentVisit[]>();
  for (const visit of visits) {
    const ip = visit.ip || 'unknown';
    const existing = byIp.get(ip);
    if (existing) existing.push(visit);
    else byIp.set(ip, [visit]);
  }

  return Array.from(byIp.entries())
    .map(([ip, items]) => ({
      ip,
      count: items.length,
      last_seen: items[0]?.ts ?? '',
      user_agent: items[0]?.user_agent ?? '',
      visits: items,
    }))
    .sort((a, b) => b.last_seen.localeCompare(a.last_seen));
}

export default function Stats() {
  const { data, loading } = useApi<StatsData>('/api/analytics/stats');

  if (loading) return <Loader />;
  if (!data) return <div className="p-4 md:p-8" style={{ color: 'var(--text-muted)' }}>Нет данных</div>;

  const groupedVisits = data.grouped_visits ?? groupVisits(data.recent);
  const uniqueByDate = new Map((data.unique_daily ?? []).map((item) => [item.date, item.count]));
  const dailyData = (data.daily ?? []).map((item) => ({
    ...item,
    unique: uniqueByDate.get(item.date) ?? 0,
  }));
  const pages = data.pages ?? [];
  const hourly = data.hourly ?? [];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-xl font-semibold">Аналитика посещений</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card label="Всего просмотров" value={data.total_views} />
        <Card label="Уникальных IP" value={data.unique_visitors} />
        <Card label="Сегодня" value={data.today_views} />
      </div>

      {/* Daily views */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-medium mb-1">Просмотры за 7 дней</h3>
        <div className="flex gap-4 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          <span><span className="inline-block w-2.5 h-2.5 mr-1 rounded" style={{ backgroundColor: 'var(--accent)', verticalAlign: 'middle' }} /> Просмотры</span>
          <span><span className="inline-block w-2.5 h-2.5 mr-1 rounded" style={{ backgroundColor: '#6aafb8', verticalAlign: 'middle' }} /> Уникальные IP</span>
        </div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Просмотры" />
              <Bar dataKey="unique" fill="#6aafb8" radius={[4, 4, 0, 0]} name="Уникальные" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hourly */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-medium mb-3">Распределение по часам (UTC+4)</h3>
          <div style={{ height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={hourly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#8a8a8a' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="cnt" fill="rgba(212,149,106,0.5)" radius={[3, 3, 0, 0]} name="Просмотры" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top pages */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-medium mb-3">Популярные страницы</h3>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {pages.map((p) => (
              <div key={p.page} className="flex justify-between items-center px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <span className="truncate mr-3" style={{ color: 'var(--text-secondary)' }}>{p.page}</span>
                <span className="font-medium shrink-0" style={{ color: 'var(--accent)' }}>{p.cnt}</span>
              </div>
            ))}
            {pages.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Нет данных</p>}
          </div>
        </div>
      </div>

      {/* Grouped visits by IP */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <h3 className="text-sm font-medium">Визиты по IP ({groupedVisits.length})</h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {groupedVisits.map((group) => (
            <IPGroup key={group.ip} group={group} />
          ))}
          {groupedVisits.length === 0 && (
            <div className="px-5 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Нет визитов</div>
          )}
        </div>
      </div>
    </div>
  );
}

function IPGroup({ group }: { group: { ip: string; count: number; last_seen: string; user_agent: string; visits: { ts: string; page: string; user_agent: string }[] } }) {
  const [open, setOpen] = useState(false);

  // Parse short UA
  const ua = group.user_agent || '';
  let shortUa = 'Unknown';
  if (ua.includes('iPhone')) shortUa = 'iPhone';
  else if (ua.includes('Android')) shortUa = 'Android';
  else if (ua.includes('iPad')) shortUa = 'iPad';
  else if (ua.includes('Mac OS')) shortUa = 'macOS';
  else if (ua.includes('Windows')) shortUa = 'Windows';
  else if (ua.includes('Linux')) shortUa = 'Linux';
  if (ua.includes('Chrome') && !ua.includes('Edg')) shortUa += ' Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) shortUa += ' Safari';
  else if (ua.includes('Firefox')) shortUa += ' Firefox';
  else if (ua.includes('Edg')) shortUa += ' Edge';

  return (
    <div style={{ backgroundColor: 'var(--bg-card)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{group.ip}</span>
          <span className="text-xs px-2 py-0.5 rounded-lg" style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)' }}>
            {group.count} просм.
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{shortUa}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{group.last_seen ? group.last_seen.replace('T', ' ') : 'unknown'}</span>
          <span style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            &#9662;
          </span>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-3">
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <th className="text-left px-3 py-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>Время</th>
                  <th className="text-left px-3 py-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>Страница</th>
                </tr>
              </thead>
              <tbody>
                {group.visits.map((v, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}>
                    <td className="px-3 py-1.5 whitespace-nowrap">{v.ts.replace('T', ' ')}</td>
                    <td className="px-3 py-1.5" style={{ color: 'var(--accent)' }}>{v.page}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl px-5 py-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-3xl font-semibold" style={{ color: 'var(--accent)' }}>{value}</div>
    </div>
  );
}
