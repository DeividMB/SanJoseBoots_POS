/**
 * Utilidades para formatear valores
 */

// =======================
// Moneda
// =======================

export const formatCurrency = (value) => {
  const amount = Number(value);

  if (isNaN(amount)) return '$0.00';

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// =======================
// Números
// =======================

export const formatNumber = (value) => {
  const number = Number(value);
  if (isNaN(number)) return '0';

  return new Intl.NumberFormat('es-MX').format(number);
};

// =======================
// Fechas
// =======================

const safeDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDate = (date) => {
  const d = safeDate(date);
  if (!d) return '-';

  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

export const formatDateTime = (date) => {
  const d = safeDate(date);
  if (!d) return '-';

  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatShortDate = (date) => {
  const d = safeDate(date);
  if (!d) return '-';

  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

// =======================
// Porcentajes
// =======================

export const formatPercentage = (value, decimals = 1) => {
  const number = Number(value);
  if (isNaN(number)) return '0%';

  return `${number.toFixed(decimals)}%`;
};

export const calculatePercentageChange = (current, previous) => {
  const curr = Number(current);
  const prev = Number(previous);

  if (isNaN(curr) || isNaN(prev) || prev === 0) return 0;

  return ((curr - prev) / prev) * 100;
};

// =======================
// Texto
// =======================

export const truncateText = (text, length = 50) => {
  if (!text) return '';
  if (text.length <= length) return text;

  return `${text.slice(0, length)}...`;
};

// =======================
// Utilidades
// =======================

export const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};
