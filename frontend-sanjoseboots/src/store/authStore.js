import { create } from 'zustand';
import { authAPI } from '../api/endpoints';
import toast from 'react-hot-toast';

const useAuthStore = create((set) => ({
  user: (() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem('token') || null,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(credentials);
      
      console.log('✅ Login exitoso - procesando respuesta...');
      
      let token, user;
      
      // Tu backend responde: { success: true, data: { token, usuario } }
      if (response.data.success && response.data.data) {
        token = response.data.data.token;
        user = response.data.data.usuario; // ← CAMBIO: 'usuario' en lugar de 'user'
      }
      // Fallback: { data: { token, usuario } }
      else if (response.data.data) {
        token = response.data.data.token;
        user = response.data.data.usuario;
      } 
      // Fallback: { token, usuario } directamente
      else if (response.data.token) {
        token = response.data.token;
        user = response.data.usuario;
      }
      // No reconocida
      else {
        console.error('❌ Estructura no reconocida:', response.data);
        throw new Error('Estructura de respuesta no reconocida');
      }
      
      if (!token || !user) {
        console.error('❌ Token o usuario faltante');
        console.error('Token:', token);
        console.error('User:', user);
        throw new Error('Token o usuario no encontrado en la respuesta');
      }
      
      // Normalizar el objeto user para usar 'role' en lugar de 'rol'
      const normalizedUser = {
        ...user,
        role: user.rol || user.role, // Asegurar que tenga 'role'
      };
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      
      set({ user: normalizedUser, token, isLoading: false });
      toast.success(`¡Bienvenido ${normalizedUser.username}!`);
      return true;
    } catch (error) {
      console.error('❌ Error en login:', error.message);
      
      const errorMessage = error.response?.data?.message || error.message || 'Error al iniciar sesión';
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
    toast.success('Sesión cerrada correctamente');
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;