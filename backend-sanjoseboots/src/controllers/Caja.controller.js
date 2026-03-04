// src/controllers/caja.controller.js
const { executeProcedure, executeQuery } = require('../config/database');

const toFloat = (v) => (v == null ? 0 : parseFloat(v)   || 0);
const toInt   = (v) => (v == null ? 0 : parseInt(v, 10) || 0);

// ─── 1. Obtener estado de caja actual ────────────────────────────────────────
exports.getCajaActual = async (req, res) => {
  try {
    console.log('💰 Obteniendo estado de caja...');

    const result = await executeProcedure('sp_ObtenerCajaActual', []);

    // sp_ObtenerCajaActual retorna 2 result sets: apertura + ventas del día
    let apertura = null;
    let ventas   = {};

    if (Array.isArray(result[0])) {
      // Múltiples result sets
      apertura = result[0]?.[0] || null;
      ventas   = result[1]?.[0] || {};
    } else {
      apertura = result?.[0] || null;
    }

    res.json({
      success: true,
      data: {
        apertura,
        ventas: {
          VentasEfectivo:      toFloat(ventas.VentasEfectivo),
          VentasTarjeta:       toFloat(ventas.VentasTarjeta),
          VentasTransferencia: toFloat(ventas.VentasTransferencia),
          TotalVentas:         toFloat(ventas.TotalVentas),
          NumeroVentas:        toInt(ventas.NumeroVentas),
          TotalDescuentos:     toFloat(ventas.TotalDescuentos),
        },
      },
    });
  } catch (error) {
    console.error('❌ Error obteniendo caja:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estado de caja', error: error.message });
  }
};

// ─── 2. Abrir caja ───────────────────────────────────────────────────────────
exports.abrirCaja = async (req, res) => {
  try {
    const { MontoInicial = 0, Observaciones = null } = req.body;
    const UsuarioID = req.user.usuarioId;

    if (MontoInicial < 0) {
      return res.status(400).json({ success: false, message: 'El monto inicial no puede ser negativo' });
    }

    console.log(`📂 Abriendo caja — Usuario: ${req.user.username}, Monto: $${MontoInicial}`);

    const result = await executeProcedure('sp_AbrirCaja', [UsuarioID, MontoInicial, Observaciones]);
    const data   = Array.isArray(result) ? result[0] : result;

    console.log(`✅ Caja abierta ID: ${data?.AperturaID}`);
    res.status(201).json({ success: true, message: 'Caja abierta exitosamente', data });
  } catch (error) {
    console.error('❌ Error abriendo caja:', error);
    const status = error.message.includes('Ya existe') ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// ─── 3. Realizar corte ───────────────────────────────────────────────────────
exports.realizarCorte = async (req, res) => {
  try {
    const { AperturaID, EfectivoContado, Observaciones = null } = req.body;
    const UsuarioID = req.user.usuarioId;

    if (!AperturaID) {
      return res.status(400).json({ success: false, message: 'AperturaID es requerido' });
    }
    if (EfectivoContado === undefined || EfectivoContado === null) {
      return res.status(400).json({ success: false, message: 'EfectivoContado es requerido' });
    }
    if (EfectivoContado < 0) {
      return res.status(400).json({ success: false, message: 'El efectivo contado no puede ser negativo' });
    }

    console.log(`✂️  Realizando corte — Apertura: ${AperturaID}, Efectivo: $${EfectivoContado}`);

    const result = await executeProcedure('sp_RealizarCorte', [
      AperturaID,
      UsuarioID,
      EfectivoContado,
      Observaciones,
    ]);

    const data = Array.isArray(result) ? result[0] : result;

    console.log(`✅ Corte realizado — Estado: ${data?.Estado}, Diferencia: $${data?.Diferencia}`);
    res.json({ success: true, message: 'Corte realizado exitosamente', data });
  } catch (error) {
    console.error('❌ Error realizando corte:', error);
    const status = error.message.includes('No se encontró') ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// ─── 4. Historial de cortes ──────────────────────────────────────────────────
exports.getHistorialCortes = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    const inicio = fechaInicio || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const fin    = fechaFin    || new Date().toISOString().split('T')[0];

    console.log(`📋 Historial cortes: ${inicio} → ${fin}`);

    const cortes = await executeProcedure('sp_HistorialCortes', [inicio, fin]);

    res.json({ success: true, data: Array.isArray(cortes) ? cortes : [] });
  } catch (error) {
    console.error('❌ Error historial cortes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener historial', error: error.message });
  }
};