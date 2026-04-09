# Frontend Glucoscope

Это клиентская часть проекта Glucoscope на `React + Vite`.

Основной сценарий запуска описан в корневом [README](../README.md). Если нужен локальный запуск только фронтенда:

```bash
cd frontend
npm ci
npm run dev -- --host 0.0.0.0
```

По умолчанию интерфейс открывается по адресу:

```text
http://localhost:5173/app/
```

Во время разработки запросы к API идут через Vite proxy на backend.
