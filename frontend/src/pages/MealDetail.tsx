import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import MetricCard from '../components/MetricCard';
import Loader from '../components/Loader';
import { riseColor, glucoseColor, CHART_TOOLTIP_STYLE } from '../utils/colors';
import { fmtMmol, toMmol, RANGE } from '../utils/units';

const mealTypeRu: Record<string, string> = {
  Meal: 'Приём пищи',
  Snack: 'Перекус',
  HypoCorrection: 'Коррекция гипо',
  Breakfast: 'Завтрак',
  Lunch: 'Обед',
  Dinner: 'Ужин',
};
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts';

interface MealDetailData {
  meal_id: number;
  ts: string;
  meal_type: string;
  carbs: number;
  baseline: number | null;
  peak: number | null;
  rise: number | null;
  time_to_peak: number | null;
  end_glucose: number | null;
  bolus_dose: number | null;
  coverage: number;
  status: string;
  exclude_reasons: string[];
  meal_time: string;
  curve: { minutes: number; glucose: number; ts: string }[];
}

const reasonLabels: Record<string, string> = {
  overlap: 'Пересечение с другим приёмом пищи',
  cgm_gap: 'Недостаточное покрытие CGM',
  no_bolus: 'Нет болюса инсулина',
  high_activity: 'Высокая физическая активность',
};

export default function MealDetail() {
  const { patientId, mealId } = useParams();
  const navigate = useNavigate();

  const { data: meal, loading } = useApi<MealDetailData>(
    patientId && mealId ? `/api/patients/${patientId}/meals/${mealId}` : null
  );

  if (loading) return <Loader />;
  if (!meal || 'error' in meal) {
    return <div className="p-4 md:p-8 text-center" style={{ color: 'var(--text-muted)' }}>Данные не найдены</div>;
  }

  const peakPoint = meal.curve.find(
    (p) => meal.peak !== null && p.glucose === meal.peak && p.minutes >= 0 && p.minutes <= 180
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => navigate(`/patients/${patientId}/meals`)}
          className="px-3 py-1.5 rounded-xl text-sm"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          ← Назад
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Постпрандиальный эпизод</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {meal.ts.replace('T', ' ').substring(0, 16)}, {mealTypeRu[meal.meal_type] || meal.meal_type || 'приём пищи'}
          </p>
        </div>
        {meal.status === 'usable' ? (
          <span className="px-3 py-1 rounded-xl text-xs" style={{ backgroundColor: 'var(--green-dim)', color: '#5cb888' }}>
            Пригодно
          </span>
        ) : (
          <span className="px-3 py-1 rounded-xl text-xs" style={{ backgroundColor: 'var(--red-dim)', color: '#c75f5f' }}>
            Исключено: {meal.exclude_reasons.map(r => reasonLabels[r] || r).join(', ')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Углеводы" value={meal.carbs} unit="г" description="Количество углеводов в приёме пищи" />
        <MetricCard title="Болюс" value={meal.bolus_dose !== null ? meal.bolus_dose : '\u2014'} unit={meal.bolus_dose !== null ? 'ед' : ''}
          description="Доза быстрого инсулина, введённая для компенсации углеводов" />
        <MetricCard title="До еды" value={fmtMmol(meal.baseline)} unit="ммоль/л"
          description="Средний уровень глюкозы за 30 мин до еды" norm="3.9-7.2 ммоль/л"
          color={meal.baseline ? glucoseColor(meal.baseline) : undefined} />
        <MetricCard title="Пик" value={fmtMmol(meal.peak)} unit="ммоль/л"
          description="Максимальный уровень глюкозы в течение 3 ч после еды" norm="< 10.0 ммоль/л"
          color={meal.peak ? glucoseColor(meal.peak) : undefined} />
        <MetricCard title="Прирост" value={meal.rise !== null ? `+${fmtMmol(meal.rise)}` : null} unit="ммоль/л"
          description="Разница между пиком и базовым уровнем" norm="< 3.3 ммоль/л"
          color={riseColor(meal.rise)} />
        <MetricCard title="До пика" value={meal.time_to_peak !== null ? Math.round(meal.time_to_peak) : null} unit="мин"
          description="Время от приёма пищи до максимума глюкозы" norm="60-90 мин" />
        <MetricCard title="В конце окна" value={fmtMmol(meal.end_glucose)} unit="ммоль/л"
          description="Средний уровень глюкозы через 3.5-4 ч после еды"
          color={meal.end_glucose ? glucoseColor(meal.end_glucose) : undefined} />
        <MetricCard title="Покрытие CGM" value={`${Math.round(meal.coverage)}%`}
          description="Процент ожидаемых CGM-измерений в окне. Ниже 80%: данные ненадёжны" norm="> 80%"
          color={meal.coverage >= 80 ? '#5cb888' : '#c75f5f'} />
      </div>

      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-medium mb-1">Постпрандиальная кривая</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Вертикальная линия: момент еды (0 мин). Пунктир: базовый уровень
        </p>
        <div style={{ height: 380 }}>
          <ResponsiveContainer>
            <LineChart data={meal.curve.map(p => ({ ...p, glucoseMmol: toMmol(p.glucose) }))} margin={{ top: 20, right: 16, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="minutes" tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false}
                label={{ value: 'Минуты от приёма пищи', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#8a8a8a' } }} />
              <YAxis domain={[2, 'dataMax + 2']} tick={{ fontSize: 11, fill: '#8a8a8a' }} axisLine={false} tickLine={false} width={36}
                label={{ value: 'ммоль/л', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#8a8a8a' } }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(val: number) => [`${val} ммоль/л`, 'Глюкоза']}
                labelFormatter={(min: number) => `${min} мин`} />
              <ReferenceArea y1={RANGE.low} y2={RANGE.high} fill="rgba(92,184,136,0.04)" />
              <ReferenceLine y={RANGE.low} stroke="rgba(91,142,199,0.25)" strokeDasharray="5 5" strokeWidth={1} />
              <ReferenceLine y={RANGE.high} stroke="rgba(212,138,76,0.25)" strokeDasharray="5 5" strokeWidth={1} />
              <ReferenceLine x={0} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="6 3" />
              {meal.baseline && (
                <ReferenceLine y={toMmol(meal.baseline)!} stroke="rgba(138,138,138,0.3)" strokeDasharray="8 4" strokeWidth={1}
                  label={{ value: `${fmtMmol(meal.baseline)}`, position: 'right', style: { fill: '#8a8a8a', fontSize: 10 } }} />
              )}
              <Line type="monotone" dataKey="glucoseMmol" stroke="#6aafb8" strokeWidth={2} dot={false}
                activeDot={{ r: 3, fill: '#6aafb8', stroke: 'none' }} />
              {peakPoint && (
                <ReferenceLine x={peakPoint.minutes} stroke="transparent"
                  label={{ value: `Пик: ${fmtMmol(meal.peak)} ммоль/л`, position: 'top', style: { fill: '#c75f5f', fontSize: 11 } }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
