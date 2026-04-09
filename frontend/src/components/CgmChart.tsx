import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts';
import { CHART_TOOLTIP_STYLE } from '../utils/colors';
import { toMmol, RANGE } from '../utils/units';

interface CgmPoint { ts: string; value: number }
interface Meal { ts: string; carbs: number; meal_type?: string }
interface Bolus { ts_begin: string; dose: number }

interface CgmChartProps {
  cgm: CgmPoint[];
  meals?: Meal[];
  boluses?: Bolus[];
  height?: number;
}

function formatTime(ts: string): string {
  return ts.substring(11, 16);
}

export default function CgmChart({ cgm, meals, boluses, height = 380 }: CgmChartProps) {
  const data = cgm.map((p) => ({
    time: formatTime(p.ts),
    glucose: toMmol(p.value),
    ts: p.ts,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl" style={{ height, color: 'var(--text-muted)' }}>
        Нет данных CGM за этот день
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#8a8a8a' }}
            interval={Math.floor(data.length / 12) || 1} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} />
          <YAxis domain={[2, 20]} tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(val: number) => [`${val} ммоль/л`, 'Глюкоза']} />
          <ReferenceArea y1={RANGE.low} y2={RANGE.high} fill="rgba(92,184,136,0.04)" />
          <ReferenceArea y1={RANGE.high} y2={RANGE.veryHigh} fill="rgba(212,138,76,0.03)" />
          <ReferenceArea y1={RANGE.veryHigh} y2={22} fill="rgba(199,95,95,0.03)" />
          <ReferenceArea y1={0} y2={RANGE.low} fill="rgba(91,142,199,0.03)" />
          <ReferenceLine y={RANGE.low} stroke="rgba(91,142,199,0.3)" strokeDasharray="5 5" strokeWidth={1} />
          <ReferenceLine y={RANGE.high} stroke="rgba(212,138,76,0.3)" strokeDasharray="5 5" strokeWidth={1} />
          {meals?.map((m, i) => (
            <ReferenceLine key={`meal-${i}`} x={formatTime(m.ts)} stroke="rgba(201,168,76,0.5)" strokeDasharray="4 4"
              label={{ value: `${m.carbs}г`, position: 'top', style: { fontSize: 10, fill: '#c9a84c' } }} />
          ))}
          {boluses?.map((b, i) => (
            <ReferenceLine key={`bolus-${i}`} x={formatTime(b.ts_begin)} stroke="rgba(154,124,199,0.4)" strokeDasharray="2 4"
              label={{ value: `${b.dose}ед`, position: 'bottom', style: { fontSize: 10, fill: '#9a7cc7' } }} />
          ))}
          <Line type="monotone" dataKey="glucose" stroke="#6aafb8" strokeWidth={2} dot={false}
            activeDot={{ r: 3, fill: '#6aafb8', stroke: 'none' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
