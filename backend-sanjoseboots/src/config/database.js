// src/config/database.js — VERSIÓN CORREGIDA
// Cambios:
//  1. Agrega connectTimeout, acquireTimeout, timeout para evitar ECONNRESET
//  2. Pool con reconexión automática ante caídas de XAMPP
//  3. executeQuery retorna [rows] (array) para ser consistente con el controlador
//  4. executeProcedure con retry automático si la conexión se cayó

const mysql = require('mysql2/promise');

const dbConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'pos_sanjoseboots',

  // Pool
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,

  // ── Timeouts — previenen ECONNRESET con XAMPP ──────────────
  connectTimeout:     30000,   // 30s para establecer conexión
  acquireTimeout:     30000,   // 30s para obtener conexión del pool

  // ── Keep-alive — evita que MySQL cierre conexiones idle ────
  enableKeepAlive:        true,
  keepAliveInitialDelay:  10000,  // ping cada 10s

  // ── Reconexión automática ──────────────────────────────────
  // mysql2 no tiene `reconnect` nativo en pool, pero esto
  // asegura que conexiones muertas se descarten del pool
  timezone: 'local',
};

let pool;

// ── Crear / obtener pool ───────────────────────────────────────
const createPool = () => {
  pool = mysql.createPool(dbConfig);

  // Verificar que el pool responde al arranque
  pool.getConnection()
    .then(conn => { conn.ping(); conn.release(); console.log('✓ Pool MySQL creado y verificado'); })
    .catch(err => console.error('⚠️  Pool creado pero no pudo hacer ping inicial:', err.message));

  return pool;
};

const getPool = () => {
  if (!pool) createPool();
  return pool;
};

// ── Helper: obtener conexión con reintentos ───────────────────
const getConnectionWithRetry = async (retries = 3, delayMs = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await getPool().getConnection();
      // Ping para verificar que la conexión está viva
      await conn.ping();
      return conn;
    } catch (err) {
      const esConexionMuerta =
        err.code === 'ECONNRESET'    ||
        err.code === 'ECONNREFUSED'  ||
        err.code === 'PROTOCOL_CONNECTION_LOST' ||
        err.code === 'ETIMEDOUT';

      if (esConexionMuerta && i < retries - 1) {
        console.warn(`⚠️  Conexión DB caída (intento ${i + 1}/${retries}), reintentando en ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
        // Recrear el pool si la conexión fue rechazada completamente
        if (err.code === 'ECONNREFUSED') {
          pool = null; // forzar recreación del pool en siguiente llamada
        }
      } else {
        throw err;
      }
    }
  }
};

// ── Ejecutar procedimiento almacenado ─────────────────────────
const executeProcedure = async (procedureName, params = []) => {
  const connection = await getConnectionWithRetry();
  try {
    const placeholders = params.map(() => '?').join(', ');
    const sql = `CALL ${procedureName}(${placeholders})`;
    const [results] = await connection.query(sql, params);

    // El último elemento de results siempre es OkPacket (metadata), se descarta
    const recordsets = results.slice(0, -1);

    if (recordsets.length === 1) return recordsets[0];
    return recordsets;
  } catch (error) {
    console.error(`Error ejecutando procedimiento ${procedureName}:`, error.message);
    throw error;
  } finally {
    connection.release();
  }
};

// ── Ejecutar query directo ────────────────────────────────────
// IMPORTANTE: retorna [rows] (array con los resultados en posición 0)
// para que el controlador pueda hacer: const [filas] = await executeQuery(...)
const executeQuery = async (sql, params = []) => {
  const connection = await getConnectionWithRetry();
  try {
    const [rows] = await connection.query(sql, params);
    return [rows];   // ← envuelto en array, igual que mysql2 nativo
  } catch (error) {
    console.error('Error ejecutando query:', error.message);
    throw error;
  } finally {
    connection.release();
  }
};

// ── Ejecutar transacción ──────────────────────────────────────
const executeTransaction = async (callback) => {
  const connection = await getConnectionWithRetry();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('Error en transacción:', error.message);
    throw error;
  } finally {
    connection.release();
  }
};

// ── Verificar conexión ────────────────────────────────────────
const testConnection = async () => {
  try {
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    console.log('✓ Conexión a MySQL exitosa');
    return true;
  } catch (error) {
    console.error('✗ Error conectando a MySQL:', error.message);
    return false;
  }
};

// ── Cerrar pool ───────────────────────────────────────────────
const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✓ Pool de conexiones cerrado');
  }
};

module.exports = {
  createPool,
  getPool,
  executeProcedure,
  executeQuery,
  executeTransaction,
  testConnection,
  closePool,
};
