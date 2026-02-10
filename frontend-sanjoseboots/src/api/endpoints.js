import api from './axios';

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
};

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  search: (query) => api.get('/products/search', { params: { q: query } }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id, data) => api.delete(`/products/${id}`, { data }), // CORREGIDO: Enviar data en config
  getCategories: () => api.get('/products/categories/list'),
  getSuppliers: () => api.get('/products/suppliers/list'),
};

export const salesAPI = {
  create: (data) => api.post('/sales', data),
  getById: (id) => api.get(`/sales/${id}`),
  getByPeriod: (params) => api.get('/sales/period', { params }),
  cancel: (id, data) => api.post(`/sales/${id}/cancel`, data),
  getDailySummary: (date) => api.get('/sales/daily-summary', { params: { fecha: date } }),
};

export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getSales: (params) => api.get('/reports/sales', { params }),
  getInventory: () => api.get('/reports/inventory'),
  getTopProducts: (params) => api.get('/reports/top-products', { params }),
};