/**
 * Servidor Principal - San José Boots POS Backend
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { testConnection, closePool } = require('./config/database');

// Importar rutas
const authRoutes     = require('./routes/auth.routes');
const productRoutes  = require('./routes/product.routes');
const saleRoutes     = require('./routes/sale.routes');
const reportRoutes   = require('./routes/report.routes');
const userRoutes     = require('./routes/user.routes');
const supplierRoutes = require('./routes/supplier.routes');
const cajaRoutes     = require('./routes/caja.routes');

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
            database: { connected: dbConnected }
        });
    } catch (error) {
        res.status(503).json({ success: false, status: 'ERROR', message: error.message });
    }
});

// ============================================
// RUTAS DE LA API
// ============================================
const apiRouter = express.Router();

apiRouter.use('/auth',      authRoutes);
apiRouter.use('/products',  productRoutes);
apiRouter.use('/sales',     saleRoutes);
apiRouter.use('/reports',   reportRoutes);
apiRouter.use('/users',     userRoutes);
apiRouter.use('/suppliers', supplierRoutes);
apiRouter.use('/caja',      cajaRoutes);

app.use(`/api/${API_VERSION}`, apiRouter);

// ============================================
// MANEJO DE ERRORES
// ============================================
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint no encontrado', path: req.originalUrl });
});

app.use((error, req, res, next) => {
    console.error('❌ Error:', error);
    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
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
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log('');
            console.log('╔════════════════════════════════════════════════════╗');
            console.log('║        🎯 SAN JOSÉ BOOTS POS - BACKEND API        ║');
            console.log('╚════════════════════════════════════════════════════╝');
            console.log(`🚀 Puerto: ${PORT}`);
            console.log(`📚 API:    http://localhost:${PORT}/api/${API_VERSION}`);
            console.log('');
            console.log('📋 Módulos activos: auth, products, sales, reports, users, suppliers, caja');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Error al iniciar:', error);
        process.exit(1);
    }
};

process.on('SIGINT',  async () => { await closePool(); process.exit(0); });
process.on('SIGTERM', async () => { await closePool(); process.exit(0); });

startServer();
module.exports = app;