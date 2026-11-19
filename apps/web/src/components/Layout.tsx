import { Activity, ChartNoAxesCombined } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark"><Activity size={18} /></span>
          <span>pulsecheck</span>
        </NavLink>
        <nav>
          <NavLink to="/" end>Тест</NavLink>
          <NavLink to="/analytics"><ChartNoAxesCombined size={16} /> Аналитика</NavLink>
        </nav>
      </header>
      <main><Outlet /></main>
      <footer>Локальный тест загрузки · данные остаются в вашей SQLite</footer>
    </div>
  );
}
