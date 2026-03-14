// src/controllers/caja.controller.js — VERSIÓN COMPLETA FASE 6
// Reemplaza tu archivo actual completo

const { executeProcedure, executeQuery } = require('../config/database');

// ── Obtener caja actual ───────────────────────────────────────
exports.obtenerCajaActual = async (req, res) => {
  try {
    const result = await executeProcedure('sp_ObtenerCajaActual', [req.user.usuarioId]);
    // executeProcedure con 1 recordset retorna el array directo: [{...caja}]
    // con 0 filas retorna: []
    let caja = null;
    if (Array.isArray(result)) {
      if (Array.isArray(result[0])) {
        caja = result[0][0] ?? null;   // múltiples recordsets
      } else {
        caja = result[0] ?? null;      // 1 recordset, array directo
      }
    }
    res.json({ success: true, data: caja });
  } catch (err) {
    console.error('Error obtenerCajaActual:', err);
    res.status(500).json({ success: false, message: 'Error al obtener caja' });
  }
};

// ── Abrir caja ────────────────────────────────────────────────
exports.abrirCaja = async (req, res) => {
  try {
    const { montoInicial = 0, notas = null } = req.body;
    const result = await executeProcedure('sp_AbrirCaja', [
      req.user.usuarioId, montoInicial, notas
    ]);
    // 1 recordset → result es el array directo, result[0] es el objeto
    const row = Array.isArray(result[0]) ? result[0][0] : result[0];
    if (row?.Estado === 'ERROR') {
      return res.status(400).json({ success: false, message: row.Mensaje });
    }
    // Intentar obtener la caja recién abierta — manejar cualquier estructura de resultado
    let caja = null;
    try {
      const cajaResult = await executeProcedure('sp_ObtenerCajaActual', [req.user.usuarioId]);
      // executeProcedure puede devolver array de arrays o array directo
      // 1 recordset → array directo; múltiples → array de arrays
      caja = (Array.isArray(cajaResult[0]) ? cajaResult[0][0] : cajaResult[0]) ?? null;
    } catch (_) {}
    // Fallback: construir objeto mínimo con el CajaID que devolvió sp_AbrirCaja
    if (!caja) {
      caja = {
        CajaID:             row.CajaID,
        UsuarioID:          req.user.usuarioId,
        MontoInicial:       montoInicial,
        TotalVentas:        0,
        TotalVentasEfectivo: 0,
        TotalVentasTarjeta:  0,
        TotalVentasTransferencia: 0,
        NumeroVentas:       0,
        Estado:             'Abierta',
        FechaHoraApertura:  new Date().toISOString(),
      };
    }
    res.status(201).json({ success: true, message: row.Mensaje, data: caja });
  } catch (err) {
    console.error('Error abrirCaja:', err);
    res.status(500).json({ success: false, message: 'Error al abrir caja' });
  }
};

// ── Cerrar caja ───────────────────────────────────────────────
exports.cerrarCaja = async (req, res) => {
  try {
    const { id } = req.params;
    const { montoFinalDeclarado, notas = null } = req.body;
    // SP acepta (CajaID, MontoFinalDeclarado, Notas) — 3 parámetros
    const result = await executeProcedure('sp_CerrarCaja', [
      parseInt(id), parseFloat(montoFinalDeclarado), notas
    ]);
    const row = Array.isArray(result[0]) ? result[0][0] : result[0];
    if (row?.Estado === 'ERROR') {
      return res.status(400).json({ success: false, message: row.Mensaje });
    }
    res.json({ success: true, message: row.Mensaje, data: row });
  } catch (err) {
    console.error('Error cerrarCaja:', err);
    res.status(500).json({ success: false, message: 'Error al cerrar caja' });
  }
};

// ── Ventas de una caja ────────────────────────────────────────
exports.obtenerVentasCaja = async (req, res) => {
  try {
    const result = await executeProcedure('sp_ObtenerVentasCaja', [req.params.id]);
    // 1 recordset → result ya es el array de ventas
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
    const usuarioId = req.user.rol === 'Administrador' ? null : req.user.usuarioId;
    // Pasar fechas al SP: si vienen, agregar 1 día al hasta para incluir el día completo
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

// ── Último cierre (referencia para apertura) ──────────────────
exports.ultimoCierre = async (req, res) => {
  try {
    // Admin ve el último cierre global; otros solo el suyo
    const usuarioId = req.user.rol === 'Administrador' ? null : req.user.usuarioId;
    const result = await executeProcedure('sp_ObtenerUltimoCierre', [usuarioId]);
    const cierre = (Array.isArray(result[0]) ? result[0][0] : result[0]) ?? null;
    res.json({ success: true, data: cierre });
  } catch (err) {
    console.error('Error ultimoCierre:', err);
    res.status(500).json({ success: false, message: 'Error al obtener último cierre' });
  }
};

// ── Registrar movimiento extra (entrada/salida/devolución) ────
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
    res.status(201).json({ success: true, message: row.Mensaje, data: row });
  } catch (err) {
    console.error('Error registrarMovimiento:', err);
    res.status(500).json({ success: false, message: 'Error al registrar movimiento' });
  }
};

// ── Movimientos extra de una caja ─────────────────────────────
exports.obtenerMovimientos = async (req, res) => {
  try {
    const result = await executeProcedure('sp_ObtenerMovimientosCaja', [req.params.id]);
    res.json({ success: true, data: Array.isArray(result[0]) ? result[0] : result });
  } catch (err) {
    console.error('Error obtenerMovimientos:', err);
    res.status(500).json({ success: false, message: 'Error al obtener movimientos' });
  }
};

// ── Resumen completo de caja (para corte sin cerrar) ──────────
exports.resumenCompleto = async (req, res) => {
  try {
    const result = await executeProcedure('sp_ResumenCajaCompleto', [req.params.id]);
    // sp retorna 4 result sets: caja, ventas, movimientos, totales
    res.json({
      success: true,
      data: {
        // sp_ResumenCajaCompleto tiene 4 recordsets → array de arrays
        caja:          (Array.isArray(result[0]) ? result[0][0] : result[0]) ?? null,
        ventas:        (Array.isArray(result[1]) ? result[1] : []) ?? [],
        movimientos:   (Array.isArray(result[2]) ? result[2] : []) ?? [],
        totales:       (Array.isArray(result[3]) ? result[3][0] : result[3]) ?? {},
      }
    });
  } catch (err) {
    console.error('Error resumenCompleto:', err);
    res.status(500).json({ success: false, message: 'Error al obtener resumen' });
  }
};