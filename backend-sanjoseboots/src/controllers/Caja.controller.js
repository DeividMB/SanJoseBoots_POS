// src/controllers/caja.controller.js — VERSIÓN CORREGIDA
// Cambios clave:
//  1. obtenerCajaActual: busca caja abierta GLOBAL (cualquier usuario)
//     Si el usuario tiene su propia caja abierta → la devuelve
//     Si hay caja abierta de OTRO usuario → la devuelve con flag cajaDeOtroUsuario=true
//     Si no hay ninguna → null
//  2. abrirCaja: bloquea si ya existe UNA caja abierta de cualquier usuario
//  3. cerrarCaja: solo el dueño de la caja O un Administrador puede cerrarla

const { executeProcedure, executeQuery } = require('../config/database');

// ── Obtener caja actual (global, no solo del usuario) ─────────
exports.obtenerCajaActual = async (req, res) => {
  try {
    // Primero buscar la caja del usuario actual
    const resultPropia = await executeProcedure('sp_ObtenerCajaActual', [req.user.usuarioId]);
    let cajaPropia = null;

    if (Array.isArray(resultPropia)) {
      cajaPropia = Array.isArray(resultPropia[0])
        ? resultPropia[0][0] ?? null
        : resultPropia[0] ?? null;
    }

    if (cajaPropia) {
      // El usuario tiene su propia caja abierta
      return res.json({
        success: true,
        data: cajaPropia,
        cajaDeOtroUsuario: false,
      });
    }

    // Si no tiene caja propia, buscar si HAY ALGUNA caja abierta en el sistema
    // Usamos una query directa para buscar cualquier caja abierta
    const [cajasAbiertas] = await executeQuery(
      `SELECT c.*, u.NombreCompleto AS NombreUsuario
       FROM Cajas c
       JOIN Usuarios u ON c.UsuarioID = u.UsuarioID
       WHERE c.Estado = 'Abierta'
       ORDER BY c.FechaHoraApertura DESC
       LIMIT 1`
    );

    if (cajasAbiertas && cajasAbiertas.length > 0) {
      const cajaGlobal = cajasAbiertas[0];
      return res.json({
        success: true,
        data: cajaGlobal,
        // Indica que esta caja pertenece a otro usuario
        cajaDeOtroUsuario: cajaGlobal.UsuarioID !== req.user.usuarioId,
      });
    }

    // No hay ninguna caja abierta
    return res.json({
      success: true,
      data: null,
      cajaDeOtroUsuario: false,
    });

  } catch (err) {
    console.error('Error obtenerCajaActual:', err);
    res.status(500).json({ success: false, message: 'Error al obtener caja' });
  }
};

// ── Abrir caja ────────────────────────────────────────────────
// Bloquea si ya existe alguna caja abierta (de cualquier usuario)
exports.abrirCaja = async (req, res) => {
  try {
    const { montoInicial = 0, notas = null } = req.body;

    // Verificar si ya existe una caja abierta en el sistema
    const [cajasAbiertas] = await executeQuery(
      `SELECT c.CajaID, c.UsuarioID, u.NombreCompleto
       FROM Cajas c
       JOIN Usuarios u ON c.UsuarioID = u.UsuarioID
       WHERE c.Estado = 'Abierta'
       LIMIT 1`
    );

    if (cajasAbiertas && cajasAbiertas.length > 0) {
      const cajaExistente = cajasAbiertas[0];
      if (cajaExistente.UsuarioID === req.user.usuarioId) {
        // Es la caja del mismo usuario — cargarla en vez de bloquear
        const cajaResult = await executeProcedure('sp_ObtenerCajaActual', [req.user.usuarioId]);
        const caja = Array.isArray(cajaResult[0])
          ? cajaResult[0][0] ?? null
          : cajaResult[0] ?? null;
        return res.status(200).json({
          success: true,
          message: 'Ya tienes una caja abierta. Cargada correctamente.',
          data: caja,
        });
      } else {
        // Caja de otro usuario — bloquear apertura
        return res.status(400).json({
          success: false,
          message: `Ya existe una caja abierta por ${cajaExistente.NombreCompleto}. Debes cerrar esa caja antes de abrir una nueva.`,
          cajaExistente: {
            CajaID: cajaExistente.CajaID,
            NombreUsuario: cajaExistente.NombreCompleto,
          },
        });
      }
    }

    // No hay caja abierta → abrir normalmente
    const result = await executeProcedure('sp_AbrirCaja', [
      req.user.usuarioId, montoInicial, notas
    ]);
    const row = Array.isArray(result[0]) ? result[0][0] : result[0];

    if (row?.Estado === 'ERROR') {
      return res.status(400).json({ success: false, message: row.Mensaje });
    }

    // Obtener la caja recién abierta
    let caja = null;
    try {
      const cajaResult = await executeProcedure('sp_ObtenerCajaActual', [req.user.usuarioId]);
      caja = (Array.isArray(cajaResult[0]) ? cajaResult[0][0] : cajaResult[0]) ?? null;
    } catch (_) {}

    // Fallback mínimo
    if (!caja) {
      caja = {
        CajaID:                    row.CajaID,
        UsuarioID:                 req.user.usuarioId,
        MontoInicial:              montoInicial,
        TotalVentas:               0,
        TotalVentasEfectivo:       0,
        TotalVentasTarjeta:        0,
        TotalVentasTransferencia:  0,
        NumeroVentas:              0,
        Estado:                    'Abierta',
        FechaHoraApertura:         new Date().toISOString(),
      };
    }

    res.status(201).json({ success: true, message: row?.Mensaje ?? 'Caja abierta', data: caja });

  } catch (err) {
    console.error('Error abrirCaja:', err);
    res.status(500).json({ success: false, message: 'Error al abrir caja' });
  }
};

// ── Cerrar caja ───────────────────────────────────────────────
// Solo el dueño de la caja o un Administrador puede cerrarla
exports.cerrarCaja = async (req, res) => {
  try {
    const { id } = req.params;
    const { montoFinalDeclarado, notas = null } = req.body;

    // Verificar que la caja existe y el usuario tiene permiso
    const [cajas] = await executeQuery(
      `SELECT CajaID, UsuarioID, Estado FROM Cajas WHERE CajaID = ?`,
      [parseInt(id)]
    );

    if (!cajas || cajas.length === 0) {
      return res.status(404).json({ success: false, message: 'Caja no encontrada' });
    }

    const caja = cajas[0];
    const esAdmin = (req.user.rol ?? '').toLowerCase() === 'administrador';
    const esDuenio = caja.UsuarioID === req.user.usuarioId;

    if (!esAdmin && !esDuenio) {
      return res.status(403).json({
        success: false,
        message: 'Solo el cajero dueño de esta caja o un Administrador pueden cerrarla',
      });
    }

    if (caja.Estado !== 'Abierta') {
      return res.status(400).json({ success: false, message: 'Esta caja ya está cerrada' });
    }

    const result = await executeProcedure('sp_CerrarCaja', [
      parseInt(id), parseFloat(montoFinalDeclarado), notas
    ]);
    const row = Array.isArray(result[0]) ? result[0][0] : result[0];

    if (row?.Estado === 'ERROR') {
      return res.status(400).json({ success: false, message: row.Mensaje });
    }

    // Obtener resumen completo para la pantalla post-cierre
    let resumen = row;
    try {
      const resResult = await executeProcedure('sp_ResumenCajaCompleto', [parseInt(id)]);
      const cajaResumen = Array.isArray(resResult[0]) ? resResult[0][0] : resResult[0];
      if (cajaResumen) resumen = cajaResumen;
    } catch (_) {}

    res.json({ success: true, message: row?.Mensaje ?? 'Caja cerrada', resumen });

  } catch (err) {
    console.error('Error cerrarCaja:', err);
    res.status(500).json({ success: false, message: 'Error al cerrar caja' });
  }
};

// ── Ventas de una caja ────────────────────────────────────────
exports.obtenerVentasCaja = async (req, res) => {
  try {
    const result = await executeProcedure('sp_ObtenerVentasCaja', [req.params.id]);
    res.json({ success: true, data: Array.isArray(result[0]) ? result[0] : result });
  } catch (err) {
    console.error('Error obtenerVentasCaja:', err);
    res.status(500).json({ success: false, message: 'Error al obtener ventas' });
  }
};

// ── Historial de cajas ────────────────────────────────────────
exports.historialCajas = async (req, res) => {
  try {
    const { limite = 50, desde = null, hasta = null } = req.query;
    // Admin ve todo el historial, otros solo el suyo
    const usuarioId = (req.user.rol ?? '').toLowerCase() === 'administrador'
      ? null
      : req.user.usuarioId;
    const fechaDesde = desde ? `${desde} 00:00:00` : null;
    const fechaHasta = hasta ? `${hasta} 23:59:59` : null;
    const result = await executeProcedure('sp_HistorialCajas', [
      usuarioId, parseInt(limite), fechaDesde, fechaHasta
    ]);
    res.json({ success: true, data: Array.isArray(result[0]) ? result[0] : result });
  } catch (err) {
    console.error('Error historialCajas:', err);
    res.status(500).json({ success: false, message: 'Error al obtener historial' });
  }
};

// ── Último cierre ─────────────────────────────────────────────
exports.ultimoCierre = async (req, res) => {
  try {
    const usuarioId = (req.user.rol ?? '').toLowerCase() === 'administrador'
      ? null
      : req.user.usuarioId;
    const result = await executeProcedure('sp_ObtenerUltimoCierre', [usuarioId]);
    const cierre = (Array.isArray(result[0]) ? result[0][0] : result[0]) ?? null;
    res.json({ success: true, data: cierre });
  } catch (err) {
    console.error('Error ultimoCierre:', err);
    res.status(500).json({ success: false, message: 'Error al obtener último cierre' });
  }
};

// ── Registrar movimiento ──────────────────────────────────────
exports.registrarMovimiento = async (req, res) => {
  try {
    const { cajaId, tipo, monto, concepto, notas = null } = req.body;
    if (!cajaId || !tipo || !monto || !concepto) {
      return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
    }
    const tiposValidos = ['ENTRADA', 'SALIDA', 'DEVOLUCION', 'AJUSTE'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ success: false, message: 'Tipo de movimiento inválido' });
    }
    const result = await executeProcedure('sp_RegistrarMovimientoCaja', [
      cajaId, req.user.usuarioId, tipo, parseFloat(monto), concepto, notas
    ]);
    const row = Array.isArray(result[0]) ? result[0][0] : result[0];
    if (row?.Estado === 'ERROR') {
      return res.status(400).json({ success: false, message: row.Mensaje });
    }
    res.status(201).json({ success: true, message: row?.Mensaje, data: row });
  } catch (err) {
    console.error('Error registrarMovimiento:', err);
    res.status(500).json({ success: false, message: 'Error al registrar movimiento' });
  }
};

// ── Movimientos de una caja ───────────────────────────────────
exports.obtenerMovimientos = async (req, res) => {
  try {
    const result = await executeProcedure('sp_ObtenerMovimientosCaja', [req.params.id]);
    res.json({ success: true, data: Array.isArray(result[0]) ? result[0] : result });
  } catch (err) {
    console.error('Error obtenerMovimientos:', err);
    res.status(500).json({ success: false, message: 'Error al obtener movimientos' });
  }
};

// ── Resumen completo ──────────────────────────────────────────
exports.resumenCompleto = async (req, res) => {
  try {
    const result = await executeProcedure('sp_ResumenCajaCompleto', [req.params.id]);
    res.json({
      success: true,
      data: {
        caja:        (Array.isArray(result[0]) ? result[0][0] : result[0]) ?? null,
        ventas:      (Array.isArray(result[1]) ? result[1] : []),
        movimientos: (Array.isArray(result[2]) ? result[2] : []),
        totales:     (Array.isArray(result[3]) ? result[3][0] : result[3]) ?? {},
      }
    });
  } catch (err) {
    console.error('Error resumenCompleto:', err);
    res.status(500).json({ success: false, message: 'Error al obtener resumen' });
  }
};
