// src/controllers/user.controller.js — VERSIÓN CORREGIDA
// Cambio: executeQuery ahora retorna [rows]. Todos los accesos usan
// const [users] = await executeQuery(...) en vez de users directamente.

const bcrypt = require('bcryptjs');
const { executeQuery, executeTransaction } = require('../config/database');

// ─── 1. Listar usuarios ───────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    console.log('👥 Obteniendo usuarios...');
    const [users] = await executeQuery(`
      SELECT
        u.UsuarioID, u.NombreCompleto, u.Email, u.Username,
        u.RolID, r.NombreRol, r.Permisos,
        u.Activo, u.FechaCreacion, u.UltimoAcceso
      FROM usuarios u
      INNER JOIN roles r ON u.RolID = r.RolID
      ORDER BY u.Activo DESC, u.NombreCompleto ASC
    `);
    console.log(`✅ ${users.length} usuarios obtenidos`);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    res.status(500).json({ success: false, message: 'Error al obtener usuarios', error: error.message });
  }
};

// ─── 2. Obtener usuario por ID ────────────────────────────────
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await executeQuery(`
      SELECT
        u.UsuarioID, u.NombreCompleto, u.Email, u.Username,
        u.RolID, r.NombreRol, r.Permisos,
        u.Activo, u.FechaCreacion, u.UltimoAcceso
      FROM usuarios u
      INNER JOIN roles r ON u.RolID = r.RolID
      WHERE u.UsuarioID = ?
    `, [id]);

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: users[0] });
  } catch (error) {
    console.error('❌ Error obteniendo usuario:', error);
    res.status(500).json({ success: false, message: 'Error al obtener usuario', error: error.message });
  }
};

// ─── 3. Crear usuario ─────────────────────────────────────────
exports.createUser = async (req, res) => {
  try {
    const { NombreCompleto, Email, Username, Password, RolID } = req.body;

    if (!NombreCompleto || !Email || !Username || !Password || !RolID) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos: NombreCompleto, Email, Username, Password, RolID',
      });
    }
    if (Password.length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    console.log(`📝 Creando usuario: ${Username}`);

    const UsuarioID = await executeTransaction(async (conn) => {
      const [existEmail] = await conn.query('SELECT UsuarioID FROM usuarios WHERE Email = ?', [Email]);
      if (existEmail.length) throw new Error('El email ya está registrado');

      const [existUser] = await conn.query('SELECT UsuarioID FROM usuarios WHERE Username = ?', [Username]);
      if (existUser.length) throw new Error('El username ya está en uso');

      const [rol] = await conn.query('SELECT RolID FROM roles WHERE RolID = ?', [RolID]);
      if (!rol.length) throw new Error('El rol seleccionado no existe');

      const PasswordHash = await bcrypt.hash(Password, 10);
      const [result] = await conn.query(`
        INSERT INTO usuarios (NombreCompleto, Email, Username, PasswordHash, RolID, Activo)
        VALUES (?, ?, ?, ?, ?, 1)
      `, [NombreCompleto, Email, Username, PasswordHash, RolID]);

      return result.insertId;
    });

    console.log(`✅ Usuario creado con ID: ${UsuarioID}`);
    res.status(201).json({ success: true, message: 'Usuario creado correctamente', UsuarioID });
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    const known = ['El email ya está registrado', 'El username ya está en uso', 'El rol seleccionado no existe'];
    res.status(known.includes(error.message) ? 400 : 500).json({ success: false, message: error.message });
  }
};

// ─── 4. Actualizar usuario ────────────────────────────────────
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { NombreCompleto, Email, RolID } = req.body;

    if (!NombreCompleto || !Email || !RolID) {
      return res.status(400).json({ success: false, message: 'NombreCompleto, Email y RolID son requeridos' });
    }

    console.log(`📝 Actualizando usuario ID: ${id}`);

    await executeTransaction(async (conn) => {
      const [exist] = await conn.query('SELECT UsuarioID FROM usuarios WHERE UsuarioID = ?', [id]);
      if (!exist.length) throw new Error('Usuario no encontrado');

      const [emailExist] = await conn.query(
        'SELECT UsuarioID FROM usuarios WHERE Email = ? AND UsuarioID != ?', [Email, id]
      );
      if (emailExist.length) throw new Error('El email ya está registrado por otro usuario');

      const [rol] = await conn.query('SELECT RolID FROM roles WHERE RolID = ?', [RolID]);
      if (!rol.length) throw new Error('El rol seleccionado no existe');

      await conn.query(`
        UPDATE usuarios SET NombreCompleto = ?, Email = ?, RolID = ?
        WHERE UsuarioID = ?
      `, [NombreCompleto, Email, RolID, id]);
    });

    console.log(`✅ Usuario ${id} actualizado`);
    res.json({ success: true, message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
    const known = ['Usuario no encontrado', 'El email ya está registrado por otro usuario', 'El rol seleccionado no existe'];
    res.status(known.includes(error.message) ? 400 : 500).json({ success: false, message: error.message });
  }
};

// ─── 5. Activar / Desactivar usuario ─────────────────────────
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.usuarioId;

    if (parseInt(id) === requestingUserId) {
      return res.status(400).json({ success: false, message: 'No puedes desactivar tu propia cuenta' });
    }

    const [users] = await executeQuery(
      'SELECT UsuarioID, Activo, NombreCompleto FROM usuarios WHERE UsuarioID = ?', [id]
    );
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const nuevoEstado = users[0].Activo ? 0 : 1;
    await executeQuery('UPDATE usuarios SET Activo = ? WHERE UsuarioID = ?', [nuevoEstado, id]);

    const accion = nuevoEstado ? 'activado' : 'desactivado';
    console.log(`✅ Usuario ${users[0].NombreCompleto} ${accion}`);
    res.json({ success: true, message: `Usuario ${accion} correctamente`, Activo: nuevoEstado });
  } catch (error) {
    console.error('❌ Error cambiando estado:', error);
    res.status(500).json({ success: false, message: 'Error al cambiar estado del usuario', error: error.message });
  }
};

// ─── 6. Cambiar contraseña ────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { PasswordActual, PasswordNueva } = req.body;
    const requestingUserId = req.user.usuarioId;

    if (parseInt(id) !== requestingUserId && req.user.rol !== 'Administrador') {
      return res.status(403).json({ success: false, message: 'No tienes permiso para cambiar esta contraseña' });
    }
    if (!PasswordNueva || PasswordNueva.length < 6) {
      return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const [users] = await executeQuery(
      'SELECT PasswordHash FROM usuarios WHERE UsuarioID = ?', [id]
    );
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (parseInt(id) === requestingUserId) {
      if (!PasswordActual) {
        return res.status(400).json({ success: false, message: 'La contraseña actual es requerida' });
      }
      const valid = await bcrypt.compare(PasswordActual, users[0].PasswordHash);
      if (!valid) {
        return res.status(400).json({ success: false, message: 'La contraseña actual es incorrecta' });
      }
    }

    const PasswordHash = await bcrypt.hash(PasswordNueva, 10);
    await executeQuery('UPDATE usuarios SET PasswordHash = ? WHERE UsuarioID = ?', [PasswordHash, id]);

    console.log(`✅ Contraseña cambiada para usuario ID: ${id}`);
    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('❌ Error cambiando contraseña:', error);
    res.status(500).json({ success: false, message: 'Error al cambiar contraseña', error: error.message });
  }
};

// ─── 7. Resetear contraseña (solo admin) ─────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { PasswordNueva } = req.body;

    if (!PasswordNueva || PasswordNueva.length < 6) {
      return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const [users] = await executeQuery(
      'SELECT UsuarioID, NombreCompleto FROM usuarios WHERE UsuarioID = ?', [id]
    );
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const PasswordHash = await bcrypt.hash(PasswordNueva, 10);
    await executeQuery('UPDATE usuarios SET PasswordHash = ? WHERE UsuarioID = ?', [PasswordHash, id]);

    console.log(`✅ Contraseña reseteada para: ${users[0].NombreCompleto}`);
    res.json({ success: true, message: `Contraseña reseteada para ${users[0].NombreCompleto}` });
  } catch (error) {
    console.error('❌ Error reseteando contraseña:', error);
    res.status(500).json({ success: false, message: 'Error al resetear contraseña', error: error.message });
  }
};

// ─── 8. Listar roles ──────────────────────────────────────────
exports.getRoles = async (req, res) => {
  try {
    const [roles] = await executeQuery(
      'SELECT RolID, NombreRol, Descripcion, Permisos FROM roles ORDER BY RolID'
    );
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('❌ Error obteniendo roles:', error);
    res.status(500).json({ success: false, message: 'Error al obtener roles', error: error.message });
  }
};
