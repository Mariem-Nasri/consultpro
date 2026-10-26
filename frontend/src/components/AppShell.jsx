import { useState } from "react";
import { BarChart3, FileAudio, LayoutDashboard, LogOut, Menu, Settings, TrendingUp, UserRound, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navigation = [
  { to: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { to: "/new-analysis", label: "Nouvelle analyse", icon: FileAudio },
  { to: "/consultations", label: "Mes consultations", icon: BarChart3 },
  { to: "/progress", label: "Ma progression", icon: TrendingUp },
];

export default function AppShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-frame">
      <aside className={`app-sidebar ${menuOpen ? "open" : ""}`}>
        <Link className="sidebar-brand" to="/dashboard" aria-label="ConsultPro, tableau de bord">
          <span className="cp-brand-mark"><i /><i /><i /></span><span>CONSULT<span>PRO</span></span>
        </Link>
        <div className="sidebar-context"><span>ESPACE PRATICIEN</span><strong>Votre activité</strong></div>
        <nav className="app-nav" aria-label="Espace praticien">
          {navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""} onClick={() => setMenuOpen(false)}><Icon size={17} />{label}</NavLink>)}
        </nav>
        <div className="nav-divider" />
        <nav className="app-nav" aria-label="Compte">
          <NavLink to="/profile" className={({ isActive }) => isActive ? "active" : ""} onClick={() => setMenuOpen(false)}><UserRound size={17} />Mon profil</NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? "active" : ""} onClick={() => setMenuOpen(false)}><Settings size={17} />Confidentialité</NavLink>
        </nav>
        <div className="sidebar-bottom"><button onClick={handleSignOut}><LogOut size={16} />Déconnexion</button></div>
      </aside>
      {menuOpen && <button className="sidebar-scrim" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)} />}
      <div className="app-content">
        <header className="app-topbar">
          <button className="mobile-menu-button" aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
          <span className="topbar-context">Espace praticien <i>/</i> <strong>ConsultPro</strong></span>
          <div className="topbar-user"><span>{user?.name}</span><small>Praticien</small><b>{user?.name?.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</b></div>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
