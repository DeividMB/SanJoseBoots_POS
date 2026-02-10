import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import useAuthStore from '../store/authStore';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading, token } = useAuthStore();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(formData);
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent/10 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-4 shadow-lg">
            <span className="text-4xl">🤠</span>
          </div>
          <h1 className="text-4xl font-bold text-primary mb-2">San José Boots</h1>
          <p className="text-gray-600">Sistema de Punto de Venta</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-primary mb-6">Iniciar Sesión</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Usuario"
              name="username"
              type="text"
              placeholder="Ingresa tu usuario"
              icon={User}
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />

            <Input
              label="Contraseña"
              name="password"
              type="password"
              placeholder="Ingresa tu contraseña"
              icon={Lock}
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full mt-6"
            >
              Iniciar Sesión
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-accent/10 rounded-lg">
            <p className="text-sm font-medium text-accent mb-2">👤 Credenciales de prueba:</p>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Usuario:</strong> admin</p>
              <p><strong>Contraseña:</strong> Admin123!</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          © 2026 San José Boots - Aguascalientes, México
        </p>
      </div>
    </div>
  );
};

export default Login;