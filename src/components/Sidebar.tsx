import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  LayoutDashboard, 
  GraduationCap, 
  Settings, 
  LogOut, 
  Church,
  Calendar,
  FileText,
  BookMarked,
  UserCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export function Sidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Tableau de Bord', path: '/' },
    { icon: Users, label: 'Dossiers Catéchumènes', path: '/catechumens' },
    { icon: BookMarked, label: 'Matières & Cours', path: '/subjects' },
    { icon: FileText, label: 'Bulletins', path: '/all-reports' },
    { icon: UserCircle, label: 'Mon Profil', path: '/profile' },
  ];

  return (
    <aside className="w-64 bg-brown-900 text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3 border-b border-brown-800">
        <Church className="text-amber-400 w-8 h-8" />
        <h1 className="text-xl font-bold tracking-tight">Secrétariat Catéchèse SAP ZOGBO</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              location.pathname === item.path 
                ? "bg-amber-500/10 text-amber-400" 
                : "text-brown-400 hover:bg-brown-800 hover:text-white"
            )}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-brown-800">
        <Link
          to="/profile"
          className={cn(
            "flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-colors",
            location.pathname === '/profile' ? "bg-amber-500/10 text-amber-400" : "text-brown-400 hover:bg-brown-800 hover:text-white"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-brown-700 flex items-center justify-center text-xs font-bold shrink-0">
            {user?.name.substring(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-brown-500 truncate capitalize">{user?.role}</p>
          </div>
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-brown-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
