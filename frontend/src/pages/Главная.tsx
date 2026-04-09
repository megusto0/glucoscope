import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import MetricCard from '../components/MetricCard';
import Loader from '../components/Loader';
import { tirColor } from '../utils/colors';

interface ГлавнаяData {
  patient_count: number;
  total_days: number;
  total_cgm: number;
  total_meals: number;
  avg_tir: number | null;
}

interface Patient {
  id: number;
  days: number;
  cgm_count: number;
  meal_count: number;
}

export default function Главная({ onPatientChange }: { onPatientChange: (id: number) => void }) {
  const { data: главная, loading: l1 } = useApi<ГлавнаяData>('/api/dashboard');
  const { data: patients, loading: l2 } = useApi<Patient[]>('/api/patients');
  const navigate = useNavigate();

  if (l1 || l2) return <Loader />;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Обзор базы данных</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Датасет OhioT1DM, непрерывный мониторинг глюкозы у пациентов с СД1
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Пациенты"
          value={главная?.patient_count ?? null}
          description="Количество пациентов с данными CGM в базе"
        />
        <MetricCard
          title="Дни наблюдения"
          value={главная?.total_days ?? null}
          description="Суммарное количество дней с данными CGM по всем пациентам"
        />
        <MetricCard
          title="CGM-измерений"
          value={главная?.total_cgm ? главная.total_cgm.toLocaleString() : null}
          description="Общее количество точек измерения глюкозы (шаг ~5 мин)"
        />
        <MetricCard
          title="Приёмы пищи"
          value={главная?.total_meals ?? null}
          description="Количество зарегистрированных приёмов пищи по всем пациентам"
        />
        <MetricCard
          title="Средний TIR"
          value={главная?.avg_tir !== null ? `${Math.round(главная!.avg_tir!)}%` : null}
          description="Среднее время в целевом диапазоне 70-180 мг/дл по всем пациентам"
          norm="> 70%"
          color={tirColor(главная?.avg_tir ?? null)}
          progress={главная?.avg_tir ?? undefined}
        />
      </div>

      <div>
        <h2 className="text-base font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>Пациенты</h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <th className="text-left px-5 py-3 font-medium text-xs" style={{ color: 'var(--text-muted)' }}>ID</th>
                <th className="text-left px-5 py-3 font-medium text-xs" style={{ color: 'var(--text-muted)' }}>Дни</th>
                <th className="text-left px-5 py-3 font-medium text-xs" style={{ color: 'var(--text-muted)' }}>CGM точек</th>
                <th className="text-left px-5 py-3 font-medium text-xs" style={{ color: 'var(--text-muted)' }}>Приёмы пищи</th>
                <th className="text-right px-5 py-3 font-medium text-xs" style={{ color: 'var(--text-muted)' }}></th>
              </tr>
            </thead>
            <tbody>
              {patients?.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer transition-colors"
                  style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
                  onClick={() => {
                    onPatientChange(p.id);
                    navigate(`/patients/${p.id}/profile`);
                  }}
                >
                  <td className="px-5 py-3.5 font-medium">#{p.id}</td>
                  <td className="px-5 py-3.5">{p.days}</td>
                  <td className="px-5 py-3.5">{p.cgm_count.toLocaleString()}</td>
                  <td className="px-5 py-3.5">{p.meal_count}</td>
                  <td className="px-5 py-3.5 text-right text-xs" style={{ color: 'var(--accent)' }}>
                    Открыть
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
