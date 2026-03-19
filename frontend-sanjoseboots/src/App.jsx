// src/App.jsx — VERSIÓN CORREGIDA v2
// Cambio: /caja es ProtectedRoute (todos), /reports y /users son AdminRoute

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import useAuthStore  from './store/authStore';
import useCajaStore  from './store/cajaStore';
import { cajaAPI }   from './api/endpoints';

import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS       from './pages/POS';
import Products  from './pages/Products';
import Reports   from './pages/Reports';
import Users     from './pages/Users';
import Caja      from './pages/Caja';
import Debug     from './pages/Debug';
import AperturaCajaModal from './components/caja/AperturaCajaModal';

// Ruta protegida genérica
const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

// Solo Admin o Cajero — Vendedor redirige al dashboard
const AdminRoute = ({ children }) => {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  const rol = (user?.rol ?? user?.role ?? '').toLowerCase();
  if (rol === 'vendedor') return <Navigate to="/dashboard" replace />;
  return children;
};

function AppInner() {
  const { token, user }                           = useAuthStore();
  const { setCajaActual, setLoadingCaja,
          setInitialized }                         = useCajaStore();
  const [showAperturaModal, setShowAperturaModal] = useState(false);
  const navigate = useNavigate();

  const rolActual  = (user?.rol ?? user?.role ?? '').toLowerCase();

  useEffect(() => {
    if (!token) {
      setShowAperturaModal(false);
      return;
    }

    const checkCaja = async () => {
      setLoadingCaja(true);
      try {
        const res             = await cajaAPI.obtenerActual();
        const caja            = res.data?.data ?? null;
        const esDeOtroUsuario = res.data?.cajaDeOtroUsuario ?? false;

        if (caja) {
          setCajaActual(caja, esDeOtroUsuario);
          setShowAperturaModal(false);
        } else {
          setCajaActual(null, false);
          // Todos los roles deben abrir caja antes de operar
          setShowAperturaModal(true);
        }
      } catch (err) {
        console.warn('checkCaja error:', err.message);
        setCajaActual(null, false);
        setShowAperturaModal(true);
      } finally {
        setLoadingCaja(false);
        setInitialized(true);
      }
    };

    checkCaja();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <>
      <Routes>
        <Route path="/login"     element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/pos"       element={<ProtectedRoute><POS /></ProtectedRoute>} />
        <Route path="/products"  element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/caja"      element={<ProtectedRoute><Caja /></ProtectedRoute>} />
        <Route path="/reports"   element={<AdminRoute><Reports /></AdminRoute>} />
        <Route path="/users"     element={<AdminRoute><Users /></AdminRoute>} />
        <Route path="/debug"     element={<ProtectedRoute><Debug /></ProtectedRoute>} />
        <Route path="/"          element={<Navigate to="/dashboard" replace />} />
        <Route path="*"          element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Modal apertura — todos los roles lo ven si no hay caja */}
      {token && showAperturaModal && (
        <AperturaCajaModal
          usuario={user}
          onSuccess={() => {
            setShowAperturaModal(false);
            navigate('/dashboard', { replace: true });
          }}
        />
      )}
    </>
  );
}

export default function App() {
  return <AppInner />;
}
