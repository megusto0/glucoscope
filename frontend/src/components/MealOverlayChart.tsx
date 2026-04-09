import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts';
import { CHART_TOOLTIP_STYLE } from '../utils/colors';
import { toMmol, RANGE } from '../utils/units';

interface MealWindow {
  meal_id: number;
  curve: { minutes: number; glucose: number }[];
}

interface MealOverlayChartProps {
  windows: MealWindow[];
  height?: number;
}

export default function MealOverlayChart({ windows, height = 420 }: MealOverlayChartProps) {
  if (!windows.length) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
        Нет данных для отображения
      </div>
    );
  }

  const timePoints: number[] = [];
  for (let m = -30; m <= 240; m += 5) timePoints.push(m);

  const data = timePoints.map((min) => {
    const row: Record<string, number | null> = { minutes: min };
    const vals: number[] = [];

    windows.forEach((w, i) => {
      const closest = w.curve.reduce<{ minutes: number; glucose: number } | null>((best, p) => {
        if (Math.abs(p.minutes - min) <= 3) {
          if (!best || Math.abs(p.minutes - min) < Math.abs(best.minutes - min)) return p;
        }
        return best;
      }, null);

      if (closest) {
        const mmol = toMmol(closest.glucose)!;
        row[`w${i}`] = mmol;
        vals.push(mmol);
      } else {
        row[`w${i}`] = null;
      }
    });

    if (vals.length > 0) {
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      row['avg'] = Math.round(mean * 10) / 10;
    } else {
      row['avg'] = null;
    }
    return row;
  });

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="minutes" tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false}
            label={{ value: 'Минуты от приёма пищи', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#8a8a8a' } }} />
          <YAxis domain={[2, 20]} tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(val: number | null, name: string) => {
              if (val === null) return ['\u2014'];
              if (name === 'avg') return [`${val} ммоль/л`, 'Среднее'];
              return [`${val} ммоль/л`];
            }}
            labelFormatter={(min: number) => `${min} мин`} />
          <ReferenceArea y1={RANGE.low} y2={RANGE.high} fill="rgba(92,184,136,0.04)" />
          <ReferenceLine x={0} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="6 3" />
          <ReferenceLine y={RANGE.low} stroke="rgba(91,142,199,0.25)" strokeDasharray="5 5" strokeWidth={1} />
          <ReferenceLine y={RANGE.high} stroke="rgba(212,138,76,0.25)" strokeDasharray="5 5" strokeWidth={1} />
          {windows.map((_, i) => (
            <Line key={`w${i}`} type="monotone" dataKey={`w${i}`} stroke="rgba(106,175,184,0.12)" strokeWidth={1}
              dot={false} connectNulls isAnimationActive={false} />
          ))}
          <Line type="monotone" dataKey="avg" stroke="#6aafb8" strokeWidth={2.5} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
