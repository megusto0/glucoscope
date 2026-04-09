export default function About() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-xl font-semibold">О проекте</h1>

      <Section title="Задача">
        <p>
          Система непрерывного мониторинга глюкозы (CGM) измеряет уровень сахара в крови каждые 5 минут.
          Этот модуль автоматически рассчитывает стандартные клинические метрики гликемического контроля
          и проводит постпрандиальный анализ: как уровень глюкозы реагирует на приёмы пищи.
        </p>
        <p className="mt-2">
          Цель: наглядное представление качества гликемического контроля пациента,
          выявление проблемных периодов и паттернов в реакции на еду.
        </p>
      </Section>

      <Section title="Датасет">
        <p>
          OhioT1DM: 6 пациентов с сахарным диабетом 1 типа, ~50 дней наблюдения на пациента.
          Данные CGM с шагом 5 минут, записи о приёмах пищи, болюсах инсулина, базальном инсулине и ЧСС.
        </p>
      </Section>

      <Section title="Алгоритм">
        {/* Flowchart */}
        <div className="flex items-center gap-0 overflow-x-auto py-4 mb-4">
          {[
            'Импорт XML',
            'Нормализация',
            'CGM-метрики',
            'Выделение окон',
            'Фильтрация',
            'Метрики окон',
            'Агрегация',
          ].map((step, i, arr) => (
            <div key={step} className="flex items-center shrink-0">
              <div className="px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                {step}
              </div>
              {i < arr.length - 1 && (
                <div className="px-1.5" style={{ color: 'var(--text-muted)' }}>&rarr;</div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Step n={1} title="Загрузка и нормализация">
            Парсинг XML-файлов OhioT1DM, нормализация временных меток, загрузка в SQLite.
          </Step>
          <Step n={2} title="Расчёт CGM-метрик">
            Средняя глюкоза, TIR (3.9-10.0 ммоль/л), TAR, TBR, CV, SD.
            Расчёт по дням и по трёхчасовым сегментам суток.
          </Step>
          <Step n={3} title="Выделение постпрандиальных окон">
            Для каждого приёма пищи создаётся окно [-30 мин, +240 мин].
            Определяются: базовый уровень, пик, прирост, время до пика.
          </Step>
          <Step n={4} title="Фильтрация окон">
            Проверка на: пересечение с другими приёмами пищи (&lt;4 ч),
            покрытие CGM (&ge;80%), наличие болюса, уровень физической активности (ЧСС &gt;120).
          </Step>
          <Step n={5} title="Визуализация">
            Интерактивные графики, таблицы и карточки метрик с цветовой кодировкой и пояснениями.
          </Step>
        </div>
      </Section>

      <Section title="Архитектура">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--accent)' }}>Backend</h4>
            <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>Python + FastAPI</li>
              <li>SQLite</li>
              <li>Модули: metrics.py, meals.py, filters.py</li>
              <li>REST API, 8+ эндпоинтов</li>
            </ul>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--accent)' }}>Frontend</h4>
            <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>React + TypeScript</li>
              <li>Tailwind CSS</li>
              <li>Recharts</li>
              <li>6 страниц, 6+ компонентов</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Ключевые метрики">
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <th className="text-left px-4 py-2 font-medium text-xs" style={{ color: 'var(--text-muted)' }}>Метрика</th>
                <th className="text-left px-4 py-2 font-medium text-xs" style={{ color: 'var(--text-muted)' }}>Описание</th>
                <th className="text-left px-4 py-2 font-medium text-xs" style={{ color: 'var(--text-muted)' }}>Норма</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['TIR', 'Доля времени в диапазоне 3.9-10.0 ммоль/л', '> 70%'],
                ['TAR', 'Доля времени выше 10.0 ммоль/л', '< 25%'],
                ['TBR', 'Доля времени ниже 3.9 ммоль/л', '< 4%'],
                ['CV', 'Коэффициент вариации (SD / среднее x 100%)', '< 36%'],
                ['SD', 'Стандартное отклонение', '< 2.8 ммоль/л'],
                ['Прирост', 'Разница: пик минус базовый уровень после еды', '< 3.3 ммоль/л'],
              ].map(([metric, desc, norm]) => (
                <tr key={metric} style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
                  <td className="px-4 py-2 font-medium">{metric}</td>
                  <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>{desc}</td>
                  <td className="px-4 py-2" style={{ color: '#5cb888' }}>{norm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Ограничения">
        <ul className="space-y-1.5 text-sm list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
          <li>Записи о приёмах пищи и болюсах могут быть неполными: пациенты не всегда вносят данные вовремя</li>
          <li>Фильтрация отбрасывает значительную долю окон, что ограничивает объём данных для анализа</li>
          <li>Модуль не даёт терапевтических рекомендаций и не оценивает адекватность дозировок</li>
          <li>Датасет ограничен 6 пациентами с СД1, результаты нельзя обобщать на другие группы</li>
        </ul>
      </Section>

      <Section title="Направление развития">
        <ul className="space-y-1.5 text-sm list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
          <li>На основе отфильтрованных окон возможен ретроспективный расчёт углеводных коэффициентов и коэффициентов чувствительности к инсулину</li>
          <li>Добавление анализа correction-response (реакция глюкозы на корректирующие болюсы без еды)</li>
          <li>Интеграция с другими датасетами CGM для валидации алгоритмов</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="text-base font-medium mb-3">{title}</h2>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{children}</div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold"
        style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)' }}>{n}</div>
      <div>
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</div>
        <div className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>{children}</div>
      </div>
    </div>
  );
}
