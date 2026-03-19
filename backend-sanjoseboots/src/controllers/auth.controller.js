// src/controllers/auth.controller.js — VERSIÓN CORREGIDA
// Cambio: executeQuery ahora retorna [rows] en vez de rows directo.
// Todos los accesos a resultados usan desestructuración: const [rows] = await executeQuery(...)

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { executeProcedure, executeQuery } = require('../config/database');

// ── Login ─────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Buscar usuario — desestructuramos [usuarios] del resultado
    const [usuarios] = await executeQuery(
      `SELECT u.UsuarioID, u.NombreCompleto, u.Email, u.Username, u.PasswordHash,
              u.RolID, u.Activo, r.NombreRol, r.Permisos
       FROM Usuarios u
       INNER JOIN Roles r ON u.RolID = r.RolID
       WHERE u.Username = ? AND u.Activo = 1`,
      [username]
    );

    if (!usuarios || usuarios.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];

    // Verificar password
    const passwordValid = await bcrypt.compare(password, usuario.PasswordHash);
    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // Actualizar último acceso
    await executeQuery(
      'UPDATE Usuarios SET UltimoAcceso = NOW() WHERE UsuarioID = ?',
      [usuario.UsuarioID]
    );

    // Parsear permisos de forma segura
    let permisos = {};
    try { permisos = JSON.parse(usuario.Permisos); } catch (_) {}

    // Generar token
    const token = jwt.sign(
      {
        usuarioId: usuario.UsuarioID,
        username:  usuario.Username,
        rolId:     usuario.RolID,
        rol:       usuario.NombreRol,
        permisos,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
        usuario: {
          id:             usuario.UsuarioID,
          NombreCompleto: usuario.NombreCompleto,
          nombreCompleto: usuario.NombreCompleto,
          email:          usuario.Email,
          username:       usuario.Username,
          rol:            usuario.NombreRol,
          permisos,
        },
      },
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error al iniciar sesión', error: error.message });
  }
};

// ── Get Profile ───────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const [usuarios] = await executeQuery(
      `SELECT u.UsuarioID, u.NombreCompleto, u.Email, u.Username,
              u.RolID, r.NombreRol, r.Permisos, u.FechaCreacion, u.UltimoAcceso
       FROM Usuarios u
       INNER JOIN Roles r ON u.RolID = r.RolID
       WHERE u.UsuarioID = ?`,
      [req.user.usuarioId]
    );

    if (!usuarios || usuarios.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];
    let permisos = {};
    try { permisos = JSON.parse(usuario.Permisos); } catch (_) {}

    res.json({
      success: true,
      data: {
        id:             usuario.UsuarioID,
        NombreCompleto: usuario.NombreCompleto,
        nombreCompleto: usuario.NombreCompleto,
        email:          usuario.Email,
        username:       usuario.Username,
        rol:            usuario.NombreRol,
        permisos,
        fechaCreacion:  usuario.FechaCreacion,
        ultimoAcceso:   usuario.UltimoAcceso,
      },
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ success: false, message: 'Error al obtener perfil', error: error.message });
  }
};

// ── Register (solo admin) ─────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { nombreCompleto, email, username, password, rolId } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await executeQuery(
      `INSERT INTO Usuarios (NombreCompleto, Email, Username, PasswordHash, RolID, Activo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [nombreCompleto, email, username, passwordHash, rolId]
    );

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: { usuarioId: result.insertId },
    });
  } catch (error) {
    console.error('Error en registro:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'El email o username ya existe' });
    }
    res.status(500).json({ success: false, message: 'Error al crear usuario', error: error.message });
  }
};
