// generate-password-hash.js
// Ejecutar con: node generate-password-hash.js

const bcrypt = require('bcryptjs');

async function generateHash() {
  console.log('=================================');
  console.log('GENERADOR DE HASH DE PASSWORD');
  console.log('=================================\n');

  const password = 'Admin123!';
  
  console.log('Password:', password);
  console.log('Generando hash...\n');

  // Generar hash con 10 rounds (mismo que bcryptjs usa por defecto)
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Hash generado:');
  console.log(hash);
  console.log('');
  
  // Verificar que funciona
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verificación:', isValid ? '✓ Válido' : '✗ Inválido');
  console.log('');
  
  console.log('=================================');
  console.log('EJECUTA ESTE QUERY EN phpMyAdmin:');
  console.log('=================================\n');
  console.log(`UPDATE Usuarios SET PasswordHash = '${hash}' WHERE Username = 'admin';`);
  console.log('');
}

generateHash();