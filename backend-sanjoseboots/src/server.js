/**
 * Servidor Principal - San José Boots POS Backend
 */
const supplierRoutes = require('./routes/supplier.routes');


require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { testConnection, closePool } = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const saleRoutes = require('./routes/sale.routes');
const reportRoutes = require('./routes/report.routes');

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = 'v1';

// ============================================
// MIDDLEWARES GLOBALES
// ============================================

app.use(helmet());

const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// ============================================
// RUTAS DE HEALTH CHECK
// ============================================

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🎯 San José Boots POS API',
        version: API_VERSION,
        timestamp: new Date().toISOString()
    });
});

app.get('/health', async (req, res) => {
    try {
        const dbConnected = await testConnection();
        
        res.json({
            success: true,
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: {
                connected: dbConnected,
                server: process.env.DB_SERVER,
                database: process.env.DB_DATABASE
            }
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'ERROR',
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// ============================================
// RUTAS DE LA API
// ============================================

const apiRouter = express.Router();

// Rutas públicas
apiRouter.use('/auth', authRoutes);

// Rutas protegidas
apiRouter.use('/products', productRoutes);
apiRouter.use('/sales', saleRoutes);
apiRouter.use('/reports', reportRoutes);

app.use(`/api/${API_VERSION}`, apiRouter);

// ============================================
// MANEJO DE ERRORES 404
// ============================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado',
        path: req.originalUrl,
        method: req.method
    });
});

// ============================================
// MANEJO GLOBAL DE ERRORES
// ============================================

app.use((error, req, res, next) => {
    console.error('❌ Error:', error);
    
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Error interno del servidor';
    
    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { 
            stack: error.stack 
        })
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const startServer = async () => {
    try {
        console.log('🔄 Verificando conexión a la base de datos...');
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ No se pudo conectar a la base de datos');
            console.error('⚠️  Verifica tu archivo .env');
            console.error('');
            console.error('Configuración actual:');
            console.error(`   DB_SERVER: ${process.env.DB_SERVER}`);
            console.error(`   DB_DATABASE: ${process.env.DB_DATABASE}`);
            console.error(`   DB_USER: ${process.env.DB_USER}`);
            console.error('');
            process.exit(1);
        }
        
        app.listen(PORT, () => {
            console.log('');
            console.log('╔════════════════════════════════════════════════════╗');
            console.log('║                                                    ║');
            console.log('║        🎯 SAN JOSÉ BOOTS POS - BACKEND API        ║');
            console.log('║                                                    ║');
            console.log('╚════════════════════════════════════════════════════╝');
            console.log('');
            console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
            console.log(`🌍 URL: http://localhost:${PORT}`);
            console.log(`📚 API: http://localhost:${PORT}/api/${API_VERSION}`);
            console.log(`💚 Health: http://localhost:${PORT}/health`);
            console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
            console.log('');
            console.log('📋 ENDPOINTS DISPONIBLES:');
            console.log(`   POST   /api/${API_VERSION}/auth/login`);
            console.log(`   GET    /api/${API_VERSION}/auth/profile`);
            console.log(`   GET    /api/${API_VERSION}/products`);
            console.log(`   POST   /api/${API_VERSION}/products`);
            console.log(`   POST   /api/${API_VERSION}/sales`);
            console.log(`   GET    /api/${API_VERSION}/sales`);
            console.log(`   GET    /api/${API_VERSION}/reports/dashboard`);
            console.log('');
            console.log('✨ ¡Servidor listo para recibir peticiones!');
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

// Manejo de cierre graceful
process.on('SIGINT', async () => {
    console.log('\n⏳ Cerrando servidor...');
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n⏳ Cerrando servidor...');
    await closePool();
    process.exit(0);
});

// Iniciar el servidor
startServer();

module.exports = app;