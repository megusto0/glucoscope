# Glucoscope

Start the whole project from the repo root with one command:

```bash
./start.sh
```

What it does:

- creates `.venv` if needed
- installs backend Python dependencies if `backend/requirements.txt` changed
- installs frontend npm dependencies if `frontend/package-lock.json` changed
- starts the backend on `http://localhost:8000`
- starts the frontend on `http://localhost:5173/app/`

Requirements:

- `python3`
- `node`
- `npm`
