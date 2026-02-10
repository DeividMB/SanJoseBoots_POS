/**
 * Middleware de Validación
 */

const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: errors.array().map(error => ({
                field: error.path || error.param,
                message: error.msg,
                value: error.value
            }))
        });
    }
    
    next();
};

const validateNumericId = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id || isNaN(id) || parseInt(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: `ID inválido: ${paramName}`,
                received: id
            });
        }
        
        req.params[paramName] = parseInt(id);
        next();
    };
};

module.exports = {
    validateRequest,
    validateNumericId
};