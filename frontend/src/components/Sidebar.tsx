import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

interface Patient {
  id: number;
  days: number;
  cgm_count: number;
}

interface SidebarProps {
  patientId: number | null;
  onPatientChange: (id: number) => void;
}

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/daily', label: 'Суточный обзор', needsPatient: true },
  { path: '/profile', label: 'Гликемический профиль', needsPatient: true },
  { path: '/meals', label: 'Приёмы пищи', needsPatient: true },
  { path: '/compare', label: 'Сравнение пациентов' },
  { path: '/about', label: 'О проекте' },
];

export default function Sidebar({ patientId, onPatientChange }: SidebarProps) {
  const { data: patients } = useApi<Patient[]>('/api/patients');
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getPath = (item: typeof navItems[0]) => {
    if (item.needsPatient && patientId) return `/patients/${patientId}${item.path}`;
    return item.path;
  };

  const isActive = (item: typeof navItems[0]) => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.includes(item.path);
  };

  const handleNav = (item: typeof navItems[0]) => {
    navigate(getPath(item));
    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Глюкоскоп
        </h1>
        {/* Close button on mobile */}
        <button className="md:hidden p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}
          onClick={() => setMobileOpen(false)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>

      <div className="px-4 pb-5">
        <select
          value={patientId || ''}
          onChange={(e) => {
            const newId = Number(e.target.value);
            onPatientChange(newId);
            const currentPath = location.pathname;
            if (currentPath.includes('/patients/')) {
              const suffix = currentPath.replace(/\/patients\/\d+/, '');
              navigate(`/patients/${newId}${suffix}`);
            }
            setMobileOpen(false);
          }}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          {patients?.map((p) => (
            <option key={p.id} value={p.id}>Пациент #{p.id}</option>
          ))}
        </select>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNav(item)}
            className="block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: isActive(item) ? 'var(--bg-card)' : 'transparent',
              color: isActive(item) ? 'var(--accent)' : 'var(--text-secondary)',
            }}>
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        onClick={() => setMobileOpen(true)}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-56 min-h-screen flex-col shrink-0"
        style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside
            className="relative w-64 min-h-full flex flex-col"
            style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
