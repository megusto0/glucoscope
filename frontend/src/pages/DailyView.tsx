import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import CgmChart from '../components/CgmChart';
import MetricCard from '../components/MetricCard';
import Loader from '../components/Loader';
import { tirColor, glucoseColor } from '../utils/colors';
import { fmtMmol } from '../utils/units';

const mealTypeRu: Record<string, string> = {
  Meal: 'Приём пищи',
  Snack: 'Перекус',
  HypoCorrection: 'Коррекция гипо',
  Breakfast: 'Завтрак',
  Lunch: 'Обед',
  Dinner: 'Ужин',
};

interface DailyData {
  date: string;
  cgm: { ts: string; value: number }[];
  meals: { id: number; ts: string; meal_type: string; carbs: number }[];
  boluses: { ts_begin: string; dose: number }[];
  basal: { ts: string; value: number }[];
  heart_rate: { ts: string; value: number }[];
  metrics: {
    mean_glucose: number | null;
    tir: number | null;
    tar: number | null;
    tbr: number | null;
    min: number | null;
    max: number | null;
    count: number;
  };
}

export default function DailyView() {
  const { patientId } = useParams();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: dates, loading: loadingDates } = useApi<string[]>(
    patientId ? `/api/patients/${patientId}/dates` : null
  );

  useEffect(() => {
    if (dates && dates.length > 0 && !selectedDate) setSelectedDate(dates[0]);
  }, [dates, selectedDate]);

  const { data: daily, loading: loadingDaily } = useApi<DailyData>(
    patientId && selectedDate ? `/api/patients/${patientId}/daily/${selectedDate}` : null
  );

  if (loadingDates) return <Loader />;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Суточный обзор</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            CGM, приёмы пищи и болюсы на одной шкале
          </p>
        </div>
        <select value={selectedDate || ''} onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-xl px-4 py-2 text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          {dates?.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {loadingDaily ? <Loader /> : daily ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard title="Средняя глюкоза" value={fmtMmol(daily.metrics.mean_glucose)} unit="ммоль/л"
              description="Среднее значение уровня глюкозы за день" norm="3.9-10.0 ммоль/л"
              color={daily.metrics.mean_glucose ? glucoseColor(daily.metrics.mean_glucose) : undefined} />
            <MetricCard title="TIR" value={daily.metrics.tir !== null ? `${Math.round(daily.metrics.tir)}%` : null}
              description="Доля времени в целевом диапазоне 3.9-10.0 ммоль/л" norm="> 70%"
              color={tirColor(daily.metrics.tir)} progress={daily.metrics.tir ?? undefined} />
            <MetricCard title="TAR" value={daily.metrics.tar !== null ? `${Math.round(daily.metrics.tar)}%` : null}
              description="Доля времени выше 10.0 ммоль/л (гипергликемия)" norm="< 25%"
              color="#d48a4c" progress={daily.metrics.tar ?? undefined} />
            <MetricCard title="TBR" value={daily.metrics.tbr !== null ? `${Math.round(daily.metrics.tbr)}%` : null}
              description="Доля времени ниже 3.9 ммоль/л (гипогликемия)" norm="< 4%"
              color="#5b8ec7" progress={daily.metrics.tbr ?? undefined} />
            <MetricCard title="Минимум" value={fmtMmol(daily.metrics.min)} unit="ммоль/л"
              description="Самое низкое значение глюкозы за день"
              color={daily.metrics.min ? glucoseColor(daily.metrics.min) : undefined} />
            <MetricCard title="Максимум" value={fmtMmol(daily.metrics.max)} unit="ммоль/л"
              description="Самое высокое значение глюкозы за день"
              color={daily.metrics.max ? glucoseColor(daily.metrics.max) : undefined} />
          </div>

          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex gap-4 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              <span><span className="inline-block w-3 h-0.5 mr-1.5 rounded-full" style={{ backgroundColor: '#6aafb8', verticalAlign: 'middle' }} /> CGM</span>
              <span><span className="inline-block w-3 h-0.5 mr-1.5 rounded-full" style={{ backgroundColor: '#c9a84c', verticalAlign: 'middle' }} /> Приём пищи</span>
              <span><span className="inline-block w-3 h-0.5 mr-1.5 rounded-full" style={{ backgroundColor: '#9a7cc7', verticalAlign: 'middle' }} /> Болюс</span>
              <span><span className="inline-block w-2.5 h-2.5 mr-1.5 rounded" style={{ backgroundColor: 'rgba(92,184,136,0.12)', verticalAlign: 'middle' }} /> 3.9-10.0 ммоль/л</span>
            </div>
            <CgmChart cgm={daily.cgm} meals={daily.meals} boluses={daily.boluses} height={340} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Приёмы пищи</h3>
              {daily.meals.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Нет записей за этот день</p>
              ) : (
                <div className="space-y-1.5">
                  {daily.meals.map((m, i) => (
                    <div key={i} className="flex justify-between items-center px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--bg-primary)' }}>
                      <div>
                        <span className="text-sm font-medium">{m.ts.substring(11, 16)}</span>
                        <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{mealTypeRu[m.meal_type] || m.meal_type}</span>
                      </div>
                      <span className="text-sm" style={{ color: 'var(--accent)' }}>{m.carbs} г</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Болюсы инсулина</h3>
              {daily.boluses.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Нет записей за этот день</p>
              ) : (
                <div className="space-y-1.5">
                  {daily.boluses.map((b, i) => (
                    <div key={i} className="flex justify-between items-center px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--bg-primary)' }}>
                      <span className="text-sm font-medium">{b.ts_begin.substring(11, 16)}</span>
                      <span className="text-sm" style={{ color: '#9a7cc7' }}>{b.dose} ед</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Выберите дату</div>
      )}
    </div>
  );
}
