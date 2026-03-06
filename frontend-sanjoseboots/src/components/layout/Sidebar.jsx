import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Users,
  Wallet,
  LogOut 
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const Sidebar = () => {
  const { user, logout } = useAuthStore();

  // Compatible con user.role y user.rol (por si el authStore usa cualquiera de los dos)
  const userRole = user?.role || user?.rol || '';

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',      roles: ['Administrador', 'Vendedor', 'Gerente', 'Cajero'] },
    { path: '/pos',       icon: ShoppingCart,    label: 'Punto de Venta', roles: ['Administrador', 'Vendedor', 'Gerente', 'Cajero'] },
    { path: '/products',  icon: Package,         label: 'Productos',      roles: ['Administrador', 'Vendedor', 'Gerente'] },
    { path: '/reports',   icon: BarChart3,        label: 'Reportes',       roles: ['Administrador', 'Gerente'] },
    { path: '/caja',      icon: Wallet,          label: 'Caja',           roles: ['Administrador', 'Gerente'] },
    { path: '/users',     icon: Users,           label: 'Usuarios',       roles: ['Administrador'] },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    item.roles.includes(userRole)
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-primary text-white shadow-xl z-40 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10 flex flex-col items-center">
        <div className="bg-white rounded-xl p-3 mb-2">
          <img
            src="/logo-sanjose.png"
            alt="San José Boots"
            className="h-14 w-auto object-contain"
          />
        </div>
        <p className="text-xs text-white/60">Sistema POS</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-accent text-white shadow-lg'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="px-4 py-6 border-t border-white/10">
        <div className="px-4 py-3 bg-white/5 rounded-lg mb-3">
          <p className="text-sm font-medium">{user?.username}</p>
          <p className="text-xs text-white/60">{userRole}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:bg-red-500/20 hover:text-white transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;