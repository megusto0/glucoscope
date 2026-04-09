import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DailyView from './pages/DailyView';
import GlycemicProfile from './pages/GlycemicProfile';
import MealsAnalysis from './pages/MealsAnalysis';
import MealDetail from './pages/MealDetail';
import ComparePatients from './pages/ComparePatients';
import About from './pages/About';
import Stats from './pages/Stats';
import { toApiUrl } from './utils/api';
import { usePageTracker } from './hooks/usePageTracker';

function AppContent({ patientId, setPatientId }: { patientId: number | null; setPatientId: (id: number) => void }) {
  usePageTracker();

  return (
    <>
      <Sidebar patientId={patientId} onPatientChange={setPatientId} />
      <main className="flex-1 overflow-auto min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard onPatientChange={setPatientId} />} />
          <Route path="/patients/:patientId/daily" element={<DailyView />} />
          <Route path="/patients/:patientId/profile" element={<GlycemicProfile />} />
          <Route path="/patients/:patientId/meals" element={<MealsAnalysis />} />
          <Route path="/patients/:patientId/meals/:mealId" element={<MealDetail />} />
          <Route path="/compare" element={<ComparePatients />} />
          <Route path="/about" element={<About />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/daily" element={patientId ? <Navigate to={`/patients/${patientId}/daily`} /> : <Dashboard onPatientChange={setPatientId} />} />
          <Route path="/profile" element={patientId ? <Navigate to={`/patients/${patientId}/profile`} /> : <Dashboard onPatientChange={setPatientId} />} />
          <Route path="/meals" element={patientId ? <Navigate to={`/patients/${patientId}/meals`} /> : <Dashboard onPatientChange={setPatientId} />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  const [patientId, setPatientId] = useState<number | null>(null);
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

  useEffect(() => {
    fetch(toApiUrl('/api/patients'))
      .then((r) => r.json())
      .then((patients) => {
        if (patients.length > 0 && !patientId) {
          setPatientId(patients[0].id);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <BrowserRouter basename={basename}>
      <AppContent patientId={patientId} setPatientId={setPatientId} />
    </BrowserRouter>
  );
}
