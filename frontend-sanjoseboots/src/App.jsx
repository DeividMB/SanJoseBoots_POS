// src/App.jsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import useAuthStore  from './store/authStore';
import useCajaStore  from './store/cajaStore';
import { cajaAPI }   from './api/endpoints';

// Pages
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS       from './pages/POS';
import Products  from './pages/Products';
import Reports   from './pages/Reports';
import Users     from './pages/Users';
import Caja      from './pages/Caja';
import Debug     from './pages/Debug';

// Components
import AperturaCajaModal from './components/caja/AperturaCajaModal';

// ── Ruta protegida ────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

// ── Inner App (necesita useNavigate, que requiere estar dentro del Router) ────
function AppInner() {
  const { token, user }                           = useAuthStore();
  const { setCajaActual, hasCajaAbierta,
          setLoadingCaja, setInitialized }         = useCajaStore();
  const [showAperturaModal, setShowAperturaModal] = useState(false);
  const navigate = useNavigate();

  // Verificar caja cada vez que el usuario se autentica
  useEffect(() => {
    if (!token) {
      setShowAperturaModal(false);
      return;
    }

    const checkCaja = async () => {
      setLoadingCaja(true);
      try {
        const res = await cajaAPI.obtenerActual();
        if (res.data.caja) {
          setCajaActual(res.data.caja);
          setShowAperturaModal(false);
        } else {
          setCajaActual(null);
          setShowAperturaModal(true);
        }
      } catch (err) {
        console.warn('No se pudo verificar estado de caja:', err.message);
        setShowAperturaModal(true);
      } finally {
        setLoadingCaja(false);
        setInitialized(true);
      }
    };

    checkCaja();
  }, [token]);

  // Cuando se abre la caja exitosamente → cerrar modal y navegar al dashboard
  const handleCajaAbierta = () => {
    setShowAperturaModal(false);
    navigate('/dashboard', { replace: true });
  };

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/pos"       element={<ProtectedRoute><POS /></ProtectedRoute>} />
        <Route path="/products"  element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/reports"   element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/users"     element={<ProtectedRoute><Users /></ProtectedRoute>} />
        <Route path="/caja"      element={<ProtectedRoute><Caja /></ProtectedRoute>} />
        <Route path="/debug"     element={<ProtectedRoute><Debug /></ProtectedRoute>} />

        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Modal de apertura obligatoria */}
      {token && showAperturaModal && (
        <AperturaCajaModal
          usuario={user}
          onSuccess={handleCajaAbierta}
        />
      )}
    </>
  );
}

function App() {
  return <AppInner />;
}

export default App;