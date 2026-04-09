import { useApi } from '../hooks/useApi';
import Loader from '../components/Loader';
import { tirColor, cvColor, riseColor, CHART_TOOLTIP_STYLE } from '../utils/colors';
import { fmtMmol, toMmol } from '../utils/units';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell,
  ReferenceLine, LabelList,
} from 'recharts';

interface PatientComparison {
  patient_id: number;
  mean_glucose: number;
  sd: number;
  cv: number;
  tir: number;
  tar: number;
  tbr: number;
  min: number;
  max: number;
  count: number;
  usable_windows: number;
  total_windows: number;
  avg_rise: number | null;
  avg_time_to_peak: number | null;
}

export default function ComparePatients() {
  const { data, loading } = useApi<PatientComparison[]>('/api/patients/compare');

  if (loading) return <Loader />;
  if (!data) return null;

  const chartData = data.map(p => ({ name: `#${p.patient_id}`, ...p }));
  const scatterData = chartData
    .filter(d => d.avg_rise !== null && d.avg_time_to_peak !== null)
    .map(d => ({ ...d, avg_rise_mmol: toMmol(d.avg_rise!), label: `#${d.patient_id}` }));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Сравнение пациентов</h1>
      </div>

      <div className="rounded-2xl overflow-x-auto" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <Th>Пациент</Th>
              <Th sub="ммоль/л">Ср. глюкоза</Th>
              <Th sub="> 70%">TIR</Th>
              <Th sub="< 25%">TAR</Th>
              <Th sub="< 4%">TBR</Th>
              <Th sub="< 36%">CV</Th>
              <Th>Пригодных окон</Th>
              <Th sub="ммоль/л">Прирост</Th>
              <Th sub="мин">До пика</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.patient_id} style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
                <td className="px-4 py-3 font-semibold">#{p.patient_id}</td>
                <td className="px-4 py-3 text-center">{fmtMmol(p.mean_glucose)}</td>
                <Cv value={p.tir} color={tirColor(p.tir)} suffix="%" />
                <Cv value={p.tar} color={p.tar > 25 ? '#c75f5f' : '#5cb888'} suffix="%" />
                <Cv value={p.tbr} color={p.tbr > 4 ? '#c75f5f' : '#5cb888'} suffix="%" />
                <Cv value={p.cv} color={cvColor(p.cv)} suffix="%" />
                <td className="px-4 py-3 text-center">{p.usable_windows} / {p.total_windows}</td>
                <td className="px-4 py-3 text-center font-medium" style={{ color: riseColor(p.avg_rise) }}>{p.avg_rise !== null ? fmtMmol(p.avg_rise) : '\u2014'}</td>
                <td className="px-4 py-3 text-center">{p.avg_time_to_peak !== null ? Math.round(p.avg_time_to_peak) : '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="TIR по пациентам" subtitle="Доля времени в целевом диапазоне">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8a8a8a' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={35} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${Math.round(v)}%`, 'TIR']} />
            <Bar dataKey="tir" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => <Cell key={i} fill={tirColor(entry.tir)} />)}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="CV по пациентам" subtitle="Стабильность глюкозы. Ниже 36%: стабильный контроль">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8a8a8a' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={35} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, 'CV']} />
            <ReferenceLine y={36} stroke="rgba(212,138,76,0.4)" strokeDasharray="5 5" />
            <Bar dataKey="cv" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => <Cell key={i} fill={cvColor(entry.cv)} />)}
            </Bar>
          </BarChart>
        </ChartCard>
      </div>

      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-medium mb-1">Прирост глюкозы и время до пика</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Каждая точка: пациент. Идеально: левый нижний угол (малый прирост, быстрый пик)
        </p>
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" dataKey="avg_rise_mmol" name="Прирост"
                tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false}
                label={{ value: 'Средний прирост, ммоль/л', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#8a8a8a' } }} />
              <YAxis type="number" dataKey="avg_time_to_peak" name="Время до пика"
                tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={50}
                label={{ value: 'Время до пика, мин', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#8a8a8a' } }} />
              <ZAxis range={[200, 200]} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(val: number, name: string) => [
                  name === 'Прирост' ? `${val} ммоль/л` : `${Math.round(val)} мин`, name
                ]} />
              <Scatter data={scatterData} fill="#6aafb8">
                <LabelList dataKey="label" position="top" style={{ fill: '#8a8a8a', fontSize: 11 }} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Th({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <th className="text-center px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-muted)' }}>
      <div>{children}</div>
      {sub && <div className="font-normal mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{sub}</div>}
    </th>
  );
}

function Cv({ value, color, suffix = '' }: { value: number | null; color: string; suffix?: string }) {
  return (
    <td className="px-4 py-3 text-center font-medium" style={{ color }}>
      {value !== null ? `${Math.round(value)}${suffix}` : '\u2014'}
    </td>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-medium mb-0.5">{title}</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      <div style={{ height: 240 }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
