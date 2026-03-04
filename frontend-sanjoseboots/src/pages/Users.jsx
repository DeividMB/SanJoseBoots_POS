// frontend/src/pages/Users.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  Users as UsersIcon, UserPlus, Edit2, Lock, ToggleLeft, ToggleRight,
  Search, Shield, CheckCircle, XCircle, Eye, EyeOff, RefreshCw, X
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';
import api from '../api/axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca';

const ROL_COLORS = {
  'Administrador': 'bg-amber-100 text-amber-800 border-amber-200',
  'Gerente':       'bg-blue-100 text-blue-800 border-blue-200',
  'Vendedor':      'bg-green-100 text-green-800 border-green-200',
};

// ─── Medidor de fortaleza de contraseña ──────────────────────────────────────
const PasswordStrength = ({ password }) => {
  if (!password) return null;
  const checks = [
    { label: 'Mínimo 6 caracteres', ok: password.length >= 6 },
    { label: 'Una mayúscula',        ok: /[A-Z]/.test(password) },
    { label: 'Un número',            ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const barColors  = ['bg-red-400', 'bg-yellow-400', 'bg-green-400'];
  const textColors = ['text-red-500', 'text-yellow-600', 'text-green-600'];
  const labels     = ['Débil', 'Regular', 'Fuerte'];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? barColors[score - 1] : 'bg-gray-200'}`} />
        ))}
      </div>
      {score > 0 && (
        <p className={`text-xs font-medium ${textColors[score - 1]}`}>{labels[score - 1]}</p>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((c, i) => (
          <span key={i} className={`text-xs flex items-center gap-1 ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── Modal base ───────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, width = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

// ─── Modal crear / editar usuario ────────────────────────────────────────────
const UserFormModal = ({ open, onClose, user, roles, onSuccess }) => {
  const isEdit = !!user;
  const [form, setForm]     = useState({ NombreCompleto: '', Email: '', Username: '', Password: '', RolID: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (open) {
      setForm(isEdit
        ? { NombreCompleto: user.NombreCompleto, Email: user.Email, Username: user.Username, Password: '', RolID: user.RolID }
        : { NombreCompleto: '', Email: '', Username: '', Password: '', RolID: roles[0]?.RolID || '' }
      );
      setShowPass(false);
    }
  }, [open, user]);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.NombreCompleto || !form.Email || !form.RolID) return toast.error('Completa todos los campos requeridos');
    if (!isEdit && (!form.Username || !form.Password))       return toast.error('Username y contraseña son requeridos');
    if (!isEdit && form.Password.length < 6)                 return toast.error('La contraseña debe tener al menos 6 caracteres');

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/users/${user.UsuarioID}`, {
          NombreCompleto: form.NombreCompleto,
          Email: form.Email,
          RolID: parseInt(form.RolID),
        });
        toast.success('Usuario actualizado');
      } else {
        await api.post('/users', {
          NombreCompleto: form.NombreCompleto,
          Email: form.Email,
          Username: form.Username,
          Password: form.Password,
          RolID: parseInt(form.RolID),
        });
        toast.success('Usuario creado correctamente');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar usuario');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full h-11 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Nombre completo *</label>
          <input className={inputCls} value={form.NombreCompleto} onChange={set('NombreCompleto')} placeholder="Ej. Juan Pérez García" />
        </div>
        <div>
          <label className={labelCls}>Email *</label>
          <input className={inputCls} type="email" value={form.Email} onChange={set('Email')} placeholder="correo@ejemplo.com" />
        </div>
        {isEdit ? (
          <div>
            <label className={labelCls}>Username</label>
            <input className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`} value={user?.Username} disabled />
            <p className="text-xs text-gray-400 mt-1">El username no se puede cambiar</p>
          </div>
        ) : (
          <div>
            <label className={labelCls}>Username *</label>
            <input className={inputCls} value={form.Username} onChange={set('Username')} placeholder="usuario123" autoComplete="off" />
          </div>
        )}
        {!isEdit && (
          <div>
            <label className={labelCls}>Contraseña *</label>
            <div className="relative">
              <input
                className={`${inputCls} pr-10`}
                type={showPass ? 'text' : 'password'}
                value={form.Password}
                onChange={set('Password')}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength password={form.Password} />
          </div>
        )}
        <div>
          <label className={labelCls}>Rol *</label>
          <select className={inputCls} value={form.RolID} onChange={set('RolID')}>
            <option value="">Seleccionar rol...</option>
            {roles.map(r => <option key={r.RolID} value={r.RolID}>{r.NombreRol}</option>)}
          </select>
          {form.RolID && (
            <p className="text-xs text-gray-400 mt-1">
              {roles.find(r => r.RolID == form.RolID)?.Descripcion}
            </p>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 h-11 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 h-11 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Modal cambiar / resetear contraseña ─────────────────────────────────────
const PasswordModal = ({ open, onClose, user, isReset, onSuccess }) => {
  const [form, setForm]         = useState({ PasswordActual: '', PasswordNueva: '', Confirmar: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (open) setForm({ PasswordActual: '', PasswordNueva: '', Confirmar: '' });
  }, [open]);

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async () => {
    if (form.PasswordNueva.length < 6)                   return toast.error('La contraseña debe tener al menos 6 caracteres');
    if (form.PasswordNueva !== form.Confirmar)            return toast.error('Las contraseñas no coinciden');
    if (!isReset && !form.PasswordActual)                 return toast.error('Ingresa tu contraseña actual');

    setLoading(true);
    try {
      const endpoint = isReset
        ? `/users/${user.UsuarioID}/reset-password`
        : `/users/${user.UsuarioID}/change-password`;
      const body = isReset
        ? { PasswordNueva: form.PasswordNueva }
        : { PasswordActual: form.PasswordActual, PasswordNueva: form.PasswordNueva };

      await api.patch(endpoint, body);
      toast.success(isReset ? `Contraseña reseteada para ${user.NombreCompleto}` : 'Contraseña actualizada');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full h-11 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

  return (
    <Modal open={open} onClose={onClose} title={isReset ? `Resetear contraseña — ${user?.NombreCompleto}` : 'Cambiar contraseña'}>
      <div className="space-y-4">
        {isReset && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            ⚠️ Estás reseteando la contraseña de <strong>{user?.NombreCompleto}</strong>. El usuario deberá usar la nueva contraseña en su próximo acceso.
          </div>
        )}
        {!isReset && (
          <div>
            <label className={labelCls}>Contraseña actual *</label>
            <input className={inputCls} type="password" value={form.PasswordActual} onChange={set('PasswordActual')} />
          </div>
        )}
        <div>
          <label className={labelCls}>Nueva contraseña *</label>
          <div className="relative">
            <input
              className={`${inputCls} pr-10`}
              type={showPass ? 'text' : 'password'}
              value={form.PasswordNueva}
              onChange={set('PasswordNueva')}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordStrength password={form.PasswordNueva} />
        </div>
        <div>
          <label className={labelCls}>Confirmar contraseña *</label>
          <input className={inputCls} type="password" value={form.Confirmar} onChange={set('Confirmar')} />
          {form.Confirmar && form.PasswordNueva !== form.Confirmar && (
            <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 h-11 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 h-11 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {isReset ? 'Resetear contraseña' : 'Actualizar contraseña'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Modal confirmar activar / desactivar ────────────────────────────────────
const ToggleStatusModal = ({ open, onClose, user, onConfirm, loading }) => (
  <Modal open={open} onClose={onClose} title={user?.Activo ? 'Desactivar usuario' : 'Activar usuario'} width="max-w-md">
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {user?.Activo
          ? <>¿Desactivar a <strong>{user?.NombreCompleto}</strong>? No podrá iniciar sesión hasta que se reactive.</>
          : <>¿Activar a <strong>{user?.NombreCompleto}</strong>? Podrá volver a iniciar sesión.</>
        }
      </p>
      <div className="flex gap-3 pt-1">
        <button onClick={onClose}
          className="flex-1 h-11 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button onClick={onConfirm} disabled={loading}
          className={`flex-1 h-11 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2
            ${user?.Activo ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}>
          {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
          {user?.Activo ? 'Sí, desactivar' : 'Sí, activar'}
        </button>
      </div>
    </div>
  </Modal>
);

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
const UsersPage = () => {
  const [users, setUsers]     = useState([]);
  const [roles, setRoles]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filterRol, setFilterRol]       = useState('TODOS');
  const [filterStatus, setFilterStatus] = useState('TODOS');

  const [modalForm,   setModalForm]   = useState({ open: false, user: null });
  const [modalPass,   setModalPass]   = useState({ open: false, user: null, isReset: false });
  const [modalToggle, setModalToggle] = useState({ open: false, user: null });
  const [toggleLoading, setToggleLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles'),
      ]);
      setUsers(usersRes.data.data || []);
      setRoles(rolesRes.data.data || []);
    } catch (err) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u => {
    const matchSearch = search === '' ||
      u.NombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
      u.Username.toLowerCase().includes(search.toLowerCase()) ||
      u.Email.toLowerCase().includes(search.toLowerCase());
    const matchRol    = filterRol === 'TODOS' || u.NombreRol === filterRol;
    const matchStatus = filterStatus === 'TODOS' ||
      (filterStatus === 'ACTIVO' ? u.Activo : !u.Activo);
    return matchSearch && matchRol && matchStatus;
  });

  const handleToggle = async () => {
    if (!modalToggle.user) return;
    setToggleLoading(true);
    try {
      await api.patch(`/users/${modalToggle.user.UsuarioID}/toggle-status`);
      toast.success(`Usuario ${modalToggle.user.Activo ? 'desactivado' : 'activado'}`);
      setModalToggle({ open: false, user: null });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar estado');
    } finally {
      setToggleLoading(false);
    }
  };

  const totalActivos   = users.filter(u => u.Activo).length;
  const totalInactivos = users.filter(u => !u.Activo).length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestión de accesos y roles del sistema</p>
          </div>
          <button
            onClick={() => setModalForm({ open: true, user: null })}
            className="flex items-center gap-2 h-10 px-4 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo usuario
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total usuarios', value: users.length,    icon: UsersIcon,   color: 'text-gray-700'  },
            { label: 'Activos',        value: totalActivos,     icon: CheckCircle, color: 'text-green-600' },
            { label: 'Inactivos',      value: totalInactivos,   icon: XCircle,     color: 'text-red-500'   },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-lg bg-gray-50 ${k.color}`}>
                <k.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{k.label}</p>
                <p className="text-2xl font-bold text-gray-800">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Filtros */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, username o email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              />
            </div>
            <select value={filterRol} onChange={e => setFilterRol(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
              <option value="TODOS">Todos los roles</option>
              {roles.map(r => <option key={r.RolID} value={r.NombreRol}>{r.NombreRol}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} usuario(s)</span>
          </div>

          {/* Tabla de datos */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-6 h-6 text-amber-700 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Cargando usuarios...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <UsersIcon className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No se encontraron usuarios</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-6 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Username</th>
                    <th className="px-4 py-3 text-left">Rol</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-left">Creado</th>
                    <th className="px-4 py-3 text-left">Último acceso</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(u => (
                    <tr key={u.UsuarioID} className={`hover:bg-gray-50 transition-colors ${!u.Activo ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-amber-800">
                              {u.NombreCompleto.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{u.NombreCompleto}</p>
                            <p className="text-xs text-gray-400">{u.Email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                          @{u.Username}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${ROL_COLORS[u.NombreRol] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          <Shield className="w-3 h-3" />
                          {u.NombreRol}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {u.Activo
                          ? <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"><CheckCircle className="w-3 h-3" />Activo</span>
                          : <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium"><XCircle className="w-3 h-3" />Inactivo</span>
                        }
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500">{fmtDate(u.FechaCreacion)}</td>
                      <td className="px-4 py-4 text-xs text-gray-500">{fmtDateTime(u.UltimoAcceso)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setModalForm({ open: true, user: u })}
                            title="Editar usuario"
                            className="p-2 hover:bg-amber-50 text-gray-500 hover:text-amber-700 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setModalPass({ open: true, user: u, isReset: true })}
                            title="Resetear contraseña"
                            className="p-2 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-lg transition-colors">
                            <Lock className="w-4 h-4" />
                          </button>
                          <button onClick={() => setModalToggle({ open: true, user: u })}
                            title={u.Activo ? 'Desactivar' : 'Activar'}
                            className={`p-2 rounded-lg transition-colors ${u.Activo
                              ? 'hover:bg-red-50 text-gray-500 hover:text-red-500'
                              : 'hover:bg-green-50 text-gray-500 hover:text-green-600'}`}>
                            {u.Activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <UserFormModal
        open={modalForm.open}
        onClose={() => setModalForm({ open: false, user: null })}
        user={modalForm.user}
        roles={roles}
        onSuccess={fetchUsers}
      />
      <PasswordModal
        open={modalPass.open}
        onClose={() => setModalPass({ open: false, user: null, isReset: false })}
        user={modalPass.user}
        isReset={modalPass.isReset}
        onSuccess={fetchUsers}
      />
      <ToggleStatusModal
        open={modalToggle.open}
        onClose={() => setModalToggle({ open: false, user: null })}
        user={modalToggle.user}
        onConfirm={handleToggle}
        loading={toggleLoading}
      />
    </Layout>
  );
};

export default UsersPage;