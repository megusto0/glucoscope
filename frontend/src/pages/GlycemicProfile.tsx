import { useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import MetricCard from '../components/MetricCard';
import Loader from '../components/Loader';
import { tirColor, cvColor, CHART_TOOLTIP_STYLE } from '../utils/colors';
import { fmtMmol, toMmol, RANGE } from '../utils/units';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Line,
  ReferenceLine, ReferenceArea,
} from 'recharts';

interface ProfileData {
  overall: { mean_glucose: number; sd: number; cv: number; tir: number; tar: number; tbr: number; min: number; max: number; count: number };
  daily: { date: string; tir: number; tar: number; tbr: number; mean_glucose: number; count: number }[];
  time_of_day: { segment: string; mean: number | null; median: number | null; tir: number | null; tar: number | null; tbr: number | null; count: number }[];
  agp: { time: string; p10: number; p25: number; median: number; p75: number; p90: number }[];
  good_coverage_days: number;
  total_days: number;
}

export default function GlycemicProfile() {
  const { patientId } = useParams();
  const { data: profile, loading } = useApi<ProfileData>(
    patientId ? `/api/patients/${patientId}/profile` : null
  );

  if (loading) return <Loader />;
  if (!profile) return null;

  const { overall, daily, time_of_day, agp } = profile;

  const agpMmol = agp.map(a => ({
    time: a.time,
    p10: toMmol(a.p10),
    p25: toMmol(a.p25),
    median: toMmol(a.median),
    p75: toMmol(a.p75),
    p90: toMmol(a.p90),
  }));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-xl font-semibold">Пациент #{patientId}: гликемический профиль</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <MetricCard title="Средняя глюкоза" value={fmtMmol(overall.mean_glucose)} unit="ммоль/л"
          description="Среднее значение всех CGM-измерений за период наблюдения" norm="3.9-10.0 ммоль/л" />
        <MetricCard title="TIR" value={`${Math.round(overall.tir)}%`}
          description="Доля времени в целевом диапазоне 3.9-10.0 ммоль/л" norm="> 70%"
          color={tirColor(overall.tir)} progress={overall.tir} />
        <MetricCard title="TAR" value={`${Math.round(overall.tar)}%`}
          description="Доля времени выше 10.0 ммоль/л (гипергликемия)" norm="< 25%"
          color="#d48a4c" progress={overall.tar} />
        <MetricCard title="TBR" value={`${Math.round(overall.tbr)}%`}
          description="Доля времени ниже 3.9 ммоль/л (гипогликемия)" norm="< 4%"
          color="#5b8ec7" progress={overall.tbr} />
        <MetricCard title="CV" value={`${overall.cv}%`}
          description="Коэффициент вариации: SD / среднее x 100%. Характеризует стабильность глюкозы" norm="< 36%"
          color={cvColor(overall.cv)} />
        <MetricCard title="SD" value={fmtMmol(overall.sd)} unit="ммоль/л"
          description="Стандартное отклонение. Мера разброса значений глюкозы" norm="< 2.8 ммоль/л" />
        <MetricCard title="Покрытие" value={`${profile.good_coverage_days}/${profile.total_days}`}
          description="Дни с покрытием CGM более 70% от ожидаемых 288 точек в сутки" />
      </div>

      {/* Daily TIR */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-medium mb-1">Распределение по дням</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Каждый столбик: один день. Зелёный: в диапазоне, оранжевый: выше, синий: ниже
        </p>
        <div style={{ height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#8a8a8a' }} interval={Math.floor(daily.length / 10)} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number, name: string) => [`${Math.round(v)}%`, name === 'tbr' ? 'TBR' : name === 'tir' ? 'TIR' : 'TAR']} />
              <Bar dataKey="tbr" stackId="a" fill="#5b8ec7" radius={0} />
              <Bar dataKey="tir" stackId="a" fill="#5cb888" radius={0} />
              <Bar dataKey="tar" stackId="a" fill="#d48a4c" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time of day */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-medium mb-4">Профиль по времени суток</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {time_of_day.map((seg) => {
            const problem = (seg.tir !== null && seg.tir < 50) || (seg.tar !== null && seg.tar > 40);
            return (
              <div key={seg.segment} className="rounded-xl p-3 text-center"
                style={{
                  backgroundColor: problem ? 'var(--red-dim)' : 'var(--bg-primary)',
                  border: problem ? '1px solid rgba(199,95,95,0.2)' : '1px solid var(--border)',
                }}>
                <div className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>{seg.segment}</div>
                <div className="text-lg font-semibold" style={{ color: seg.mean ? tirColor(seg.tir) : 'var(--text-muted)' }}>
                  {seg.mean !== null ? fmtMmol(seg.mean) : '\u2014'}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ммоль/л</div>
                <div className="text-xs mt-1" style={{ color: tirColor(seg.tir) }}>
                  TIR {seg.tir !== null ? `${Math.round(seg.tir)}%` : '\u2014'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AGP */}
      {agpMmol.length > 0 && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-medium mb-1">Амбулаторный гликемический профиль (AGP)</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Все дни наложены. Линия: медиана. Тёмная зона: 25-75 перцентили. Светлая зона: 10-90 перцентили
          </p>
          <div style={{ height: 340 }}>
            <ResponsiveContainer>
              <AreaChart data={agpMmol} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#8a8a8a' }} interval={Math.floor(agpMmol.length / 12) || 1}
                  axisLine={false} tickLine={false}
                  label={{ value: 'Время суток', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#8a8a8a' } }} />
                <YAxis domain={[2, 20]} tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={36}
                  label={{ value: 'ммоль/л', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#8a8a8a' } }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <ReferenceArea y1={RANGE.low} y2={RANGE.high} fill="rgba(92,184,136,0.03)" />
                <ReferenceLine y={RANGE.low} stroke="rgba(91,142,199,0.2)" strokeDasharray="5 5" strokeWidth={1} />
                <ReferenceLine y={RANGE.high} stroke="rgba(212,138,76,0.2)" strokeDasharray="5 5" strokeWidth={1} />
                <Area type="monotone" dataKey="p90" stroke="none" fill="rgba(106,175,184,0.06)" />
                <Area type="monotone" dataKey="p75" stroke="none" fill="rgba(106,175,184,0.12)" />
                <Area type="monotone" dataKey="p25" stroke="none" fill="var(--bg-card)" />
                <Area type="monotone" dataKey="p10" stroke="none" fill="var(--bg-card)" />
                <Line type="monotone" dataKey="median" stroke="#6aafb8" strokeWidth={2} dot={false} name="Медиана" />
                <Line type="monotone" dataKey="p75" stroke="rgba(106,175,184,0.25)" strokeWidth={1} dot={false} name="75 перц." />
                <Line type="monotone" dataKey="p25" stroke="rgba(106,175,184,0.25)" strokeWidth={1} dot={false} name="25 перц." />
                <Line type="monotone" dataKey="p90" stroke="rgba(106,175,184,0.12)" strokeWidth={1} dot={false} strokeDasharray="4 4" name="90 перц." />
                <Line type="monotone" dataKey="p10" stroke="rgba(106,175,184,0.12)" strokeWidth={1} dot={false} strokeDasharray="4 4" name="10 перц." />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
