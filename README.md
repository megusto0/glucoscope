# Glucoscope

Glucoscope — веб-приложение для просмотра и анализа данных непрерывного мониторинга глюкозы на датасете `OhioT1DM`.

Проект состоит из двух частей:

- `backend/` — FastAPI API, загрузка XML-датасета в SQLite и расчёт метрик
- `frontend/` — React + Vite интерфейс с графиками, страницами пациентов и аналитикой

Что умеет приложение:

- показывать общую сводку по базе данных
- открывать суточный обзор по пациентам
- строить гликемический профиль
- анализировать приёмы пищи
- сравнивать пациентов между собой
- собирать простую аналитику посещений на странице `/stats`

## Структура репозитория

```text
backend/   API, парсинг XML, SQLite, расчёт метрик
frontend/  интерфейс на React/Vite
data/      XML-файлы OhioT1DM и локальная база cgm.db
start.sh   запуск всего проекта одной командой
```

## Быстрый запуск

После клонирования из корня репозитория достаточно выполнить:

```bash
./start.sh
```

Скрипт автоматически:

- создаст `.venv`, если его ещё нет
- установит Python-зависимости из `backend/requirements.txt`
- установит npm-зависимости из `frontend/package-lock.json`
- запустит backend на `http://localhost:8000`
- запустит frontend на `http://localhost:5173/app/`

Открывать приложение:

```text
http://localhost:5173/app/
```

Остановка:

```text
Ctrl+C
```

## Требования

- `python3`
- `node`
- `npm`

Проверенные версии на этой машине:

- Python `3.12`
- Node `22`

## Ручной запуск

Если нужно поднять части проекта отдельно:

### Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm ci
npm run dev -- --host 0.0.0.0
```

## Данные

- XML-файлы датасета лежат в `data/OhioT1DM`
- SQLite-база `data/cgm.db` создаётся автоматически при первом старте backend
- `cgm.db` не коммитится в git и может быть пересоздана из XML

## Настройка портов

Порты можно переопределить через переменные окружения:

```bash
BACKEND_PORT=18000 FRONTEND_PORT=4173 ./start.sh
```

Frontend-прокси подхватит `BACKEND_PORT` автоматически.
