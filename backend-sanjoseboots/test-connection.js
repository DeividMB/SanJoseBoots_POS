// test-connection.js
// Ejecutar con: node test-connection.js

require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('=================================');
  console.log('PRUEBA DE CONEXIÓN A MySQL');
  console.log('=================================\n');

  console.log('Configuración:');
  console.log('  Host:', process.env.DB_HOST || 'localhost');
  console.log('  Puerto:', process.env.DB_PORT || 3306);
  console.log('  Usuario:', process.env.DB_USER || 'root');
  console.log('  Base de datos:', process.env.DB_NAME || 'pos_sanjoseboots');
  console.log('  Password:', process.env.DB_PASSWORD ? '(configurado)' : '(vacío)');
  console.log('');

  try {
    // Crear conexión
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pos_sanjoseboots'
    });

    console.log('✓ Conexión exitosa a MySQL\n');

    // Probar consulta
    console.log('Probando consulta...');
    const [rows] = await connection.query('SELECT DATABASE() as db');
    console.log('✓ Base de datos actual:', rows[0].db);
    console.log('');

    // Verificar usuario admin
    console.log('Buscando usuario admin...');
    const [usuarios] = await connection.query(
      'SELECT UsuarioID, Username, NombreCompleto, Email, Activo, RolID FROM Usuarios WHERE Username = ?',
      ['admin']
    );

    if (usuarios.length > 0) {
      console.log('✓ Usuario admin encontrado:');
      console.log('  ID:', usuarios[0].UsuarioID);
      console.log('  Username:', usuarios[0].Username);
      console.log('  Nombre:', usuarios[0].NombreCompleto);
      console.log('  Email:', usuarios[0].Email);
      console.log('  Activo:', usuarios[0].Activo);
      console.log('  RolID:', usuarios[0].RolID);
    } else {
      console.log('✗ Usuario admin NO encontrado');
    }
    console.log('');

    // Verificar hash de password
    console.log('Verificando hash de password...');
    const [passResult] = await connection.query(
      'SELECT PasswordHash FROM Usuarios WHERE Username = ?',
      ['admin']
    );

    if (passResult.length > 0) {
      const hash = passResult[0].PasswordHash;
      console.log('  Hash actual:', hash);
      console.log('  Hash esperado: $2a$10$8K1p/a0dL3LKlOe6T0q1OeMKK6pUkZxMZp8qBLN2I7GGMrpGkGO6O');
      console.log('  ¿Coinciden?:', hash === '$2a$10$8K1p/a0dL3LKlOe6T0q1OeMKK6pUkZxMZp8qBLN2I7GGMrpGkGO6O');
    }
    console.log('');

    // Probar bcrypt
    console.log('Probando bcrypt...');
    const bcrypt = require('bcryptjs');
    const testPassword = 'Admin123!';
    
    if (passResult.length > 0) {
      const isValid = await bcrypt.compare(testPassword, passResult[0].PasswordHash);
      console.log('  Password de prueba:', testPassword);
      console.log('  ¿Password válido?:', isValid);
      
      if (!isValid) {
        console.log('');
        console.log('⚠️  El hash de password no coincide.');
        console.log('   Ejecuta este query en phpMyAdmin para arreglarlo:');
        console.log('');
        console.log("   UPDATE Usuarios SET PasswordHash = '$2a$10$8K1p/a0dL3LKlOe6T0q1OeMKK6pUkZxMZp8qBLN2I7GGMrpGkGO6O' WHERE Username = 'admin';");
        console.log('');
      }
    }

    await connection.end();
    console.log('✓ Conexión cerrada');

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('');
    console.error('Posibles soluciones:');
    console.error('1. Verifica que MySQL esté corriendo en XAMPP');
    console.error('2. Verifica las credenciales en el archivo .env');
    console.error('3. Verifica que la base de datos pos_sanjoseboots exista');
  }

  console.log('\n=================================');
}

testConnection();