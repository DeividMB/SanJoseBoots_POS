// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');

// Verificar token JWT
exports.authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error('❌ Error verificando token:', err.message);
        return res.status(403).json({
          success: false,
          message: 'Token inválido o expirado'
        });
      }

      console.log('✅ Usuario autenticado:', {
        usuarioId: user.usuarioId,
        username: user.username,
        rol: user.rol
      });

      req.user = user;
      next();
    });
  } catch (error) {
    console.error('❌ Error en autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error en autenticación',
      error: error.message
    });
  }
};

// Verificar permiso específico
exports.checkPermission = (recurso, accion = 'ver') => {
  return (req, res, next) => {
    try {
      console.log('🔐 Verificando permiso:', { recurso, accion });
      console.log('👤 Usuario:', req.user.username, 'Rol:', req.user.rol);
      
      const permisos = req.user.permisos;

      // Si no hay permisos definidos, permitir acceso a administradores
      if (!permisos) {
        console.log('⚠️ No hay permisos definidos');
        
        // Si es administrador, permitir acceso
        if (req.user.rol === 'Administrador' || req.user.rol === 'administrador') {
          console.log('✅ Acceso permitido (Administrador sin permisos explícitos)');
          return next();
        }
        
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos asignados'
        });
      }

      console.log('📋 Permisos del usuario:', permisos);
      
      const permiso = permisos[recurso];
      console.log(`📌 Permiso para '${recurso}':`, permiso);

      // Si el permiso es true, tiene acceso completo
      if (permiso === true) {
        console.log('✅ Acceso permitido (permiso = true)');
        return next();
      }

      // Si el permiso es un objeto con propiedades
      if (typeof permiso === 'object' && permiso !== null) {
        // Verificar si tiene la acción específica
        if (permiso[accion] === true || permiso.ver === true || permiso.read === true) {
          console.log('✅ Acceso permitido (permiso objeto)');
          return next();
        }
      }

      // Si el permiso es 'ver' o 'read'
      if (permiso === 'ver' || permiso === 'read') {
        console.log('✅ Acceso permitido (permiso = ver/read)');
        return next();
      }

      // Si es administrador, permitir acceso aunque no tenga el permiso específico
      if (req.user.rol === 'Administrador' || req.user.rol === 'administrador') {
        console.log('✅ Acceso permitido (Administrador)');
        return next();
      }

      // Si no tiene el permiso
      console.log('❌ Acceso denegado');
      return res.status(403).json({
        success: false,
        message: `No tienes permiso para acceder a ${recurso}`,
        debug: {
          recurso,
          accion,
          permisoEncontrado: permiso,
          rol: req.user.rol
        }
      });
    } catch (error) {
      console.error('❌ Error verificando permisos:', error);
      res.status(500).json({
        success: false,
        message: 'Error verificando permisos',
        error: error.message
      });
    }
  };
};

// Verificar rol específico
exports.checkRole = (...rolesPermitidos) => {
  return (req, res, next) => {
    try {
      const rolUsuario = req.user.rol;

      if (!rolUsuario) {
        return res.status(403).json({
          success: false,
          message: 'No tienes un rol asignado'
        });
      }

      if (!rolesPermitidos.includes(rolUsuario)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes el rol necesario para esta acción'
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error verificando rol',
        error: error.message
      });
    }
  };
};