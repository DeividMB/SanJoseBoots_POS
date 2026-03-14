// src/components/layout/Layout.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import useAuthStore from '../../store/authStore';

const Layout = ({ children }) => {
  const { token } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      {/* ml-72 = 288px, igual al w-72 del Sidebar */}
      <div className="flex-1 flex flex-col ml-72 relative">

        {/* ── Logo marca de agua — UNO solo, centrado, grande ── */}
        <img
          src="/logo.jpeg"
          alt=""
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: '50%',
            left: 'calc(50% + 144px)',  /* centro del área de contenido (sidebar 288px / 2 = 144px) */
            transform: 'translate(-50%, -50%)',
            width: '580px',
            maxWidth: '48vw',
            opacity: 0.1,
            filter: 'grayscale(1)',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
            objectFit: 'contain',
          }}
        />

        <Header />

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;