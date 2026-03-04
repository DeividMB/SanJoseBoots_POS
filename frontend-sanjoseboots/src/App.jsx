import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Pages
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS       from './pages/POS';
import Products  from './pages/Products';
import Reports   from './pages/Reports';
import Users     from './pages/Users';
import Caja      from './pages/Caja';
import Debug     from './pages/Debug';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
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
  );
}

export default App;