// src/config/database.js
const mysql = require('mysql2/promise');

// Configuración de la conexión
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pos_sanjoseboots',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Pool de conexiones
let pool;

const createPool = () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log('✓ Pool de conexiones MySQL creado');
  }
  return pool;
};

// Obtener pool
const getPool = () => {
  if (!pool) {
    return createPool();
  }
  return pool;
};

// Ejecutar procedimiento almacenado
const executeProcedure = async (procedureName, params = []) => {
  const connection = await getPool().getConnection();
  
  try {
    // Preparar placeholders para los parámetros
    const placeholders = params.map(() => '?').join(', ');
    const sql = `CALL ${procedureName}(${placeholders})`;
    
    // Ejecutar procedimiento
    const [results] = await connection.query(sql, params);
    
    // MySQL retorna un array de resultsets
    // El último elemento es siempre metadata, lo removemos
    const recordsets = results.slice(0, -1);
    
    // Si solo hay un recordset, retornarlo directamente
    if (recordsets.length === 1) {
      return recordsets[0];
    }
    
    // Si hay múltiples recordsets, retornarlos todos
    return recordsets;
  } catch (error) {
    console.error(`Error ejecutando procedimiento ${procedureName}:`, error);
    throw error;
  } finally {
    connection.release();
  }
};

// Ejecutar query directo
const executeQuery = async (sql, params = []) => {
  const connection = await getPool().getConnection();
  
  try {
    const [results] = await connection.query(sql, params);
    return results;
  } catch (error) {
    console.error('Error ejecutando query:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Ejecutar transacción
const executeTransaction = async (callback) => {
  const connection = await getPool().getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('Error en transacción:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Verificar conexión
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

// Cerrar pool
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
  closePool
};