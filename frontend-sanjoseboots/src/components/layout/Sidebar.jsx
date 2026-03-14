// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package,
  BarChart2, Archive, Users, LogOut,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useCajaStore from '../../store/cajaStore';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'      },
  { to: '/pos',       icon: ShoppingCart,    label: 'Punto de Venta' },
  { to: '/products',  icon: Package,         label: 'Productos'      },
  { to: '/reports',   icon: BarChart2,       label: 'Reportes'       },
  { to: '/caja',      icon: Archive,         label: 'Caja'           },
  { to: '/users',     icon: Users,           label: 'Usuarios'       },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { clearCaja }    = useCajaStore();
  const navigate         = useNavigate();

  const handleLogout = () => {
    clearCaja();
    logout();
    navigate('/login');
  };

  return (
    // w-72 = 288px
    <aside className="w-72 min-h-screen bg-gray-900 flex flex-col select-none fixed left-0 top-0 z-20">

      {/* ── Nombre sistema ── */}
      <div className="px-7 pt-7 pb-6 border-b border-white/10">
        <p className="text-white text-xs font-semibold tracking-widest uppercase opacity-40">
          Sistema POS
        </p>
        <p className="text-white text-xl font-bold mt-1 leading-tight">
          San José Boots
        </p>
      </div>

      {/* ── Navegación ── */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px] flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Usuario + logout ── */}
      <div className="px-4 pb-5 border-t border-white/10 pt-4 space-y-1">
        <div className="px-4 py-2">
          <p className="text-white text-sm font-semibold leading-tight truncate">
            {user?.NombreCompleto ?? user?.nombre ?? user?.username ?? 'Usuario'}
          </p>
          <p className="text-gray-500 text-xs mt-0.5 truncate">
            {user?.rol ?? user?.Rol ?? 'Cajero'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                     text-gray-400 hover:bg-red-500/15 hover:text-red-400
                     text-sm font-medium transition-colors"
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}