import React from 'react';

/**
 * Input - Componente de input reutilizable con soporte para React Hook Form
 * 
 * Props:
 * - label: Etiqueta del input
 * - error: Mensaje de error (opcional)
 * - type: Tipo de input (default: 'text')
 * - className: Clases CSS adicionales
 * - ...rest: Otras props nativas de input
 */
const Input = React.forwardRef(({ 
  label, 
  error, 
  type = 'text',
  className = '',
  disabled = false,
  ...rest 
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${
          error 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-gray-300'
        } ${
          disabled 
            ? 'bg-gray-100 cursor-not-allowed text-gray-500' 
            : 'bg-white'
        } ${className}`}
        {...rest}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;