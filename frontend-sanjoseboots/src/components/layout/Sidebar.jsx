import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Users, 
  Settings,
  LogOut 
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const Sidebar = () => {
  const { user, logout } = useAuthStore();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Administrador', 'Vendedor', 'Cajero'] },
    { path: '/pos', icon: ShoppingCart, label: 'Punto de Venta', roles: ['Administrador', 'Vendedor', 'Cajero'] },
    { path: '/products', icon: Package, label: 'Productos', roles: ['Administrador', 'Vendedor'] },
    { path: '/reports', icon: BarChart3, label: 'Reportes', roles: ['Administrador'] },
    { path: '/users', icon: Users, label: 'Usuarios', roles: ['Administrador'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-primary text-white shadow-xl z-40 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-white/10">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-gold">🤠</span>
          San José Boots
        </h1>
        <p className="text-xs text-white/60 mt-1">Sistema POS</p>
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
          <p className="text-xs text-white/60">{user?.role}</p>
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