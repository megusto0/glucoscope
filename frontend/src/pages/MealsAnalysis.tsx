import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import MetricCard from '../components/MetricCard';
import MealOverlayChart from '../components/MealOverlayChart';
import Loader from '../components/Loader';
import { riseColor } from '../utils/colors';
import { fmtMmol, toMmol } from '../utils/units';

interface MealWindow {
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
}

interface MealsData {
  total: number;
  usable: number;
  excluded: number;
  avg_rise: number | null;
  avg_time_to_peak: number | null;
  reason_counts: Record<string, number>;
  windows: MealWindow[];
}

interface CurveData {
  meal_id: number;
  curve: { minutes: number; glucose: number }[];
  meal_time?: string;
}

const reasonLabels: Record<string, string> = {
  overlap: 'Пересечение с другим приёмом пищи',
  cgm_gap: 'Недостаточное покрытие CGM',
  no_bolus: 'Нет болюса инсулина',
  high_activity: 'Высокая физическая активность',
};

const mealTimeLabels: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

function calcCompleteness(w: MealWindow): number {
  let score = Math.min(w.coverage, 100) * 0.5;
  if (w.bolus_dose !== null) score += 25;
  if (!w.exclude_reasons.includes('overlap')) score += 25;
  return Math.round(score);
}

function classifyMealTimeFromTs(ts: string): string {
  const hour = parseInt(ts.substring(11, 13), 10);
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 22) return 'dinner';
  return 'snack';
}

export default function MealsAnalysis() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'usable' | 'excluded'>('all');
  const [mealTimeFilter, setMealTimeFilter] = useState<string>('all');
  const [overlayMealTime, setOverlayMealTime] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('ts');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: meals, loading } = useApi<MealsData>(
    patientId ? `/api/patients/${patientId}/meals` : null
  );

  const curvesUrl = useMemo(() => {
    if (!meals || !patientId) return null;
    const usableIds = meals.windows
      .filter(w => w.status === 'usable')
      .slice(0, 40)
      .map(w => w.meal_id);
    if (usableIds.length === 0) return null;
    return `/api/patients/${patientId}/meals/curves?ids=${usableIds.join(',')}`;
  }, [meals, patientId]);

  const { data: curves } = useApi<CurveData[]>(curvesUrl);

  // Attach meal_time to curves for filtering
  const curvesWithMealTime = useMemo(() => {
    if (!curves || !meals) return [];
    return curves.map(c => {
      const win = meals.windows.find(w => w.meal_id === c.meal_id);
      return { ...c, meal_time: win ? classifyMealTimeFromTs(win.ts) : 'snack' };
    });
  }, [curves, meals]);

  const filteredCurves = useMemo(() => {
    if (overlayMealTime === 'all') return curvesWithMealTime;
    return curvesWithMealTime.filter(c => c.meal_time === overlayMealTime);
  }, [curvesWithMealTime, overlayMealTime]);

  const filtered = useMemo(() => {
    if (!meals) return [];
    let result = meals.windows;
    if (filter === 'usable') result = result.filter(w => w.status === 'usable');
    if (filter === 'excluded') result = result.filter(w => w.status === 'excluded');
    if (mealTimeFilter !== 'all') result = result.filter(w => w.meal_time === mealTimeFilter);

    result = [...result].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [meals, filter, mealTimeFilter, sortKey, sortDir]);

  if (loading) return <Loader />;
  if (!meals) return null;

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Постпрандиальный анализ</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Окно наблюдения: от -30 до +240 мин от приёма пищи. Для каждого окна рассчитывается базовый уровень, пик, прирост и время до пика
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard title="Всего окон" value={meals.total}
          description="Количество приёмов пищи с данными CGM" />
        <MetricCard title="Пригодных для анализа" value={`${meals.usable} (${meals.total > 0 ? Math.round(meals.usable / meals.total * 100) : 0}%)`}
          description="Окна, пригодные для анализа параметров терапии: без пересечений, с достаточным покрытием CGM"
          color="#5cb888" />
        <MetricCard title="Исключённых" value={meals.excluded}
          description="Окна, не прошедшие фильтрацию" color="#c75f5f" />
        <MetricCard title="Средний прирост" value={fmtMmol(meals.avg_rise)} unit="ммоль/л"
          description="Средний прирост глюкозы от базового уровня до пика по пригодным окнам"
          norm="< 3.3 ммоль/л" color={riseColor(meals.avg_rise)} />
        <MetricCard title="Время до пика" value={meals.avg_time_to_peak} unit="мин"
          description="Среднее время от приёма пищи до максимума глюкозы" norm="60-90 мин" />
      </div>

      {/* Exclusion reasons */}
      {Object.keys(meals.reason_counts).length > 0 && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Причины исключения окон</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(meals.reason_counts).map(([reason, count]) => (
              <div key={reason} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{reasonLabels[reason] || reason}</span>
                <span className="font-medium" style={{ color: '#c75f5f' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overlay chart */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium">Наложение постпрандиальных кривых</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Тонкие линии: отдельные эпизоды. Жирная линия: среднее. Ось X: минуты от еды
            </p>
          </div>
          <div className="flex gap-1.5">
            {[
              { key: 'all', label: 'Все' },
              { key: 'breakfast', label: 'Завтрак' },
              { key: 'lunch', label: 'Обед' },
              { key: 'dinner', label: 'Ужин' },
            ].map(btn => (
              <button
                key={btn.key}
                onClick={() => setOverlayMealTime(btn.key)}
                className="px-3 py-1 rounded-lg text-xs transition-colors"
                style={{
                  backgroundColor: overlayMealTime === btn.key ? 'var(--accent-dim)' : 'transparent',
                  color: overlayMealTime === btn.key ? 'var(--accent)' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        {filteredCurves.length > 0 ? (
          <MealOverlayChart windows={filteredCurves} />
        ) : (
          <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
            {curvesUrl ? 'Загрузка...' : 'Нет пригодных окон'}
          </div>
        )}
      </div>

      {/* Table filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: `Все (${meals.total})` },
          { key: 'usable', label: `Пригодные (${meals.usable})` },
          { key: 'excluded', label: `Исключённые (${meals.excluded})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as 'all' | 'usable' | 'excluded')}
            className="px-3 py-1.5 rounded-xl text-sm transition-colors"
            style={{
              backgroundColor: filter === f.key ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: filter === f.key ? 'var(--accent)' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}>
            {f.label}
          </button>
        ))}
        <span className="mx-1.5" style={{ borderLeft: '1px solid var(--border)' }} />
        {['all', 'breakfast', 'lunch', 'dinner', 'snack'].map(mt => (
          <button key={mt} onClick={() => setMealTimeFilter(mt)}
            className="px-3 py-1.5 rounded-xl text-sm transition-colors"
            style={{
              backgroundColor: mealTimeFilter === mt ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: mealTimeFilter === mt ? 'var(--accent)' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}>
            {mt === 'all' ? 'Все приёмы' : mealTimeLabels[mt]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-x-auto" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
              {[
                { key: 'ts', label: 'Дата/время' },
                { key: 'meal_time', label: 'Приём' },
                { key: 'carbs', label: 'Углеводы' },
                { key: 'bolus_dose', label: 'Болюс' },
                { key: 'baseline', label: 'До еды' },
                { key: 'peak', label: 'Пик' },
                { key: 'rise', label: 'Прирост' },
                { key: 'time_to_peak', label: 'До пика' },
                { key: 'completeness', label: 'Полнота' },
                { key: 'status', label: 'Статус' },
              ].map(col => (
                <th key={col.key}
                  className="text-left px-3 py-2.5 font-medium cursor-pointer select-none text-xs"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => toggleSort(col.key)}>
                  {col.label}{sortKey === col.key && (sortDir === 'asc' ? ' \u2191' : ' \u2193')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => {
              const comp = calcCompleteness(w);
              return (
                <tr key={w.meal_id}
                  className="cursor-pointer transition-colors"
                  style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
                  onClick={() => navigate(`/patients/${patientId}/meals/${w.meal_id}`)}>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap text-xs">{w.ts.replace('T', ' ').substring(0, 16)}</td>
                  <td className="px-3 py-2.5 text-xs">{mealTimeLabels[w.meal_time] || w.meal_time}</td>
                  <td className="px-3 py-2.5 text-xs">{w.carbs} г</td>
                  <td className="px-3 py-2.5 text-xs">{w.bolus_dose !== null ? `${w.bolus_dose} ед` : '\u2014'}</td>
                  <td className="px-3 py-2.5 text-xs">{fmtMmol(w.baseline)}</td>
                  <td className="px-3 py-2.5 text-xs">{fmtMmol(w.peak)}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: riseColor(w.rise) }}>{w.rise !== null ? `+${fmtMmol(w.rise)}` : '\u2014'}</td>
                  <td className="px-3 py-2.5 text-xs">{w.time_to_peak !== null ? `${Math.round(w.time_to_peak)} мин` : '\u2014'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full" style={{
                          width: `${comp}%`,
                          backgroundColor: comp >= 75 ? '#5cb888' : comp >= 50 ? '#c9a84c' : '#c75f5f',
                          opacity: 0.7,
                        }} />
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{comp}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {w.status === 'usable' ? (
                      <span className="px-2 py-0.5 rounded-lg text-xs" style={{ backgroundColor: 'var(--green-dim)', color: '#5cb888' }}>
                        Пригодно
                      </span>
                    ) : (
                      <span className="group relative">
                        <span className="px-2 py-0.5 rounded-lg text-xs" style={{ backgroundColor: 'var(--red-dim)', color: '#c75f5f' }}>
                          Исключено
                        </span>
                        <span className="hidden group-hover:block absolute right-0 top-6 z-50 w-48 p-2.5 rounded-xl text-xs"
                          style={{ backgroundColor: '#2a2a2a', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', color: 'var(--text-secondary)' }}>
                          {w.exclude_reasons.map(r => reasonLabels[r] || r).join(', ')}
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
