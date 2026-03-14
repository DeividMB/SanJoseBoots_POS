import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import useAuthStore from '../store/authStore';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading, token } = useAuthStore();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [focused,  setFocused]  = useState(null);
  const [error,    setError]    = useState('');

  useEffect(() => { if (token) navigate('/dashboard'); }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const success = await login(formData);
    if (success) navigate('/dashboard');
    else setError('Usuario o contraseña incorrectos');
  };

  const handleChange = (e) => {
    setError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#f5f2ed',   // mismo bg-background del dashboard
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* ── Panel izquierdo verde oscuro — igual al sidebar ── */}
      <div style={{
        width: '44%',
        minHeight: '100vh',
        background: 'linear-gradient(175deg, #111827 0%, #1f2937 60%, #111827 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 48px',
        position: 'relative',
        overflow: 'hidden',
      }} className="login-left">

        {/* Círculo de fondo sutil */}
        <div style={{
          position: 'absolute',
          width: 480, height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{
          width: 140, height: 140,
          borderRadius: 20,
          overflow: 'hidden',
          marginBottom: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          background: '#1f2937',
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img
            src="/logo.jpeg"
            alt="San José Boots"
            style={{ width: '100%', height: '100%', objectFit: 'cover',
                     filter: 'brightness(1.05) contrast(1.05)' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>

        <h1 style={{
          color: '#fff',
          fontSize: 26,
          fontWeight: 700,
          margin: '0 0 6px',
          textAlign: 'center',
          position: 'relative', zIndex: 1,
          letterSpacing: '-0.01em',
        }}>San José Boots</h1>

        <p style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 12,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          margin: '0 0 32px',
          textAlign: 'center',
          position: 'relative', zIndex: 1,
        }}>Aguascalientes, México</p>

        {/* Divisor */}
        <div style={{
          width: 40, height: 1,
          background: 'rgba(255,255,255,0.12)',
          marginBottom: 32,
          position: 'relative', zIndex: 1,
        }} />

        {/* Badges de características */}
        {[
          { emoji: '🛒', text: 'Punto de Venta' },
          { emoji: '📦', text: 'Control de Inventario' },
          { emoji: '📊', text: 'Reportes y Cortes' },
        ].map(b => (
          <div key={b.text} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 12,
            position: 'relative', zIndex: 1,
          }}>
            <span style={{ fontSize: 16 }}>{b.emoji}</span>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{b.text}</span>
          </div>
        ))}
      </div>

      {/* ── Panel derecho — formulario ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Encabezado */}
          <div style={{ marginBottom: 36 }}>
            <h2 style={{
              fontSize: 26, fontWeight: 700,
              color: '#111827', margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}>Iniciar Sesión</h2>
            <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Campo usuario */}
            <div>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 500,
                color: '#374151', marginBottom: 6,
              }}>Usuario</label>
              <div style={{ position: 'relative' }}>
                <User style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16, height: 16,
                  color: focused === 'username' ? '#111827' : '#9ca3af',
                  transition: 'color 0.15s',
                  pointerEvents: 'none',
                }} />
                <input
                  name="username" type="text" placeholder="Tu usuario"
                  value={formData.username} onChange={handleChange}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  required autoComplete="username"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '11px 14px 11px 40px',
                    border: `1.5px solid ${focused === 'username' ? '#111827' : '#e5e7eb'}`,
                    borderRadius: 10, fontSize: 14,
                    color: '#111827', background: '#fff',
                    outline: 'none',
                    boxShadow: focused === 'username' ? '0 0 0 3px rgba(17,24,39,0.06)' : 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                />
              </div>
            </div>

            {/* Campo contraseña */}
            <div>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 500,
                color: '#374151', marginBottom: 6,
              }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16, height: 16,
                  color: focused === 'password' ? '#111827' : '#9ca3af',
                  transition: 'color 0.15s',
                  pointerEvents: 'none',
                }} />
                <input
                  name="password" type={showPass ? 'text' : 'password'}
                  placeholder="Tu contraseña"
                  value={formData.password} onChange={handleChange}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  required autoComplete="current-password"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '11px 40px 11px 40px',
                    border: `1.5px solid ${focused === 'password' ? '#111827' : '#e5e7eb'}`,
                    borderRadius: 10, fontSize: 14,
                    color: '#111827', background: '#fff',
                    outline: 'none',
                    boxShadow: focused === 'password' ? '0 0 0 3px rgba(17,24,39,0.06)' : 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0,
                  color: '#9ca3af', display: 'flex', alignItems: 'center',
                }}>
                  {showPass
                    ? <EyeOff style={{ width: 16, height: 16 }} />
                    : <Eye style={{ width: 16, height: 16 }} />
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                color: '#dc2626',
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: 4,
                width: '100%',
                padding: '12px 20px',
                background: isLoading ? '#9ca3af' : '#111827',
                border: 'none', borderRadius: 10,
                color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                boxShadow: isLoading ? 'none' : '0 4px 12px rgba(17,24,39,0.2)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = '#1f2937'; }}
              onMouseLeave={e => { if (!isLoading) e.currentTarget.style.background = '#111827'; }}
            >
              {isLoading ? (
                <>
                  <span style={{
                    width: 16, height: 16,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'loginSpin 0.7s linear infinite',
                    display: 'inline-block', flexShrink: 0,
                  }} />
                  Verificando...
                </>
              ) : (
                <>Iniciar Sesión <ArrowRight style={{ width: 16, height: 16 }} /></>
              )}
            </button>
          </form>

          <p style={{
            marginTop: 40, color: '#d1d5db',
            fontSize: 12, textAlign: 'center',
          }}>
            © 2026 San José Boots — Sistema POS
          </p>
        </div>
      </div>

      <style>{`
        @keyframes loginSpin { to { transform: rotate(360deg); } }
        @media (max-width: 700px) { .login-left { display: none !important; } }
        input::placeholder { color: #d1d5db; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #fff inset !important;
          -webkit-text-fill-color: #111827 !important;
        }
      `}</style>
    </div>
  );
};

export default Login;