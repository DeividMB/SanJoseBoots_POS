-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 10-02-2026 a las 22:37:34
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `pos_sanjoseboots`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ActualizarProducto` (IN `p_ProductoID` INT, IN `p_CodigoProducto` VARCHAR(50), IN `p_NombreProducto` VARCHAR(150), IN `p_Descripcion` TEXT, IN `p_CategoriaID` INT, IN `p_PrecioBase` DECIMAL(10,2), IN `p_ProveedorID` INT, IN `p_Activo` TINYINT)   BEGIN
    UPDATE Productos SET
        CodigoProducto = p_CodigoProducto,
        NombreProducto = p_NombreProducto,
        Descripcion = p_Descripcion,
        CategoriaID = p_CategoriaID,
        PrecioBase = p_PrecioBase,
        ProveedorID = p_ProveedorID,
        Activo = p_Activo
    WHERE ProductoID = p_ProductoID;
    
    SELECT ROW_COUNT() AS FilasAfectadas;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AnalisisVariantesMasVendidas` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME, IN `p_CategoriaID` INT)   BEGIN
    SELECT 
        p.ProductoID,
        p.NombreProducto,
        c.NombreCategoria,
        pv.VarianteID,
        pv.CodigoVariante,
        pv.Talla,
        pv.Color,
        pv.Estilo,
        pv.PrecioVenta,
        COALESCE(SUM(dv.Cantidad), 0) AS CantidadVendida,
        COALESCE(SUM(dv.Subtotal), 0) AS TotalVentas,
        COALESCE(AVG(dv.PrecioUnitario), 0) AS PrecioPromedioVenta,
        pv.StockActual,
        COUNT(DISTINCT v.VentaID) AS NumeroVentas
    FROM ProductoVariantes pv
    INNER JOIN Productos p ON pv.ProductoID = p.ProductoID
    INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
    LEFT JOIN DetalleVentas dv ON pv.VarianteID = dv.VarianteID
    LEFT JOIN Ventas v ON dv.VentaID = v.VentaID
        AND v.FechaVenta >= p_FechaInicio
        AND v.FechaVenta <= p_FechaFin
        AND v.Estado = 'COMPLETADA'
    WHERE 
        pv.Activo = 1
        AND p.Activo = 1
        AND (p_CategoriaID IS NULL OR p.CategoriaID = p_CategoriaID)
    GROUP BY p.ProductoID, p.NombreProducto, c.NombreCategoria,
             pv.VarianteID, pv.CodigoVariante, pv.Talla, pv.Color,
             pv.Estilo, pv.PrecioVenta, pv.StockActual
    ORDER BY CantidadVendida DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_BuscarProductoPOS` (IN `p_Busqueda` VARCHAR(100))   BEGIN
    SELECT 
        pv.VarianteID,
        p.ProductoID,
        p.CodigoProducto,
        p.NombreProducto,
        pv.CodigoVariante,
        pv.Talla,
        pv.Color,
        pv.Estilo,
        pv.PrecioVenta,
        pv.StockActual,
        c.NombreCategoria
    FROM ProductoVariantes pv
    INNER JOIN Productos p ON pv.ProductoID = p.ProductoID
    INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
    WHERE 
        pv.Activo = 1
        AND p.Activo = 1
        AND pv.StockActual > 0
        AND (
            p.NombreProducto LIKE CONCAT('%', p_Busqueda, '%')
            OR p.CodigoProducto LIKE CONCAT('%', p_Busqueda, '%')
            OR pv.CodigoVariante LIKE CONCAT('%', p_Busqueda, '%')
        )
    ORDER BY p.NombreProducto, pv.Talla
    LIMIT 20;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CancelarVenta` (IN `p_VentaID` INT, IN `p_UsuarioID` INT, IN `p_Motivo` TEXT)   BEGIN
    DECLARE v_NumeroTicket VARCHAR(20);
    DECLARE v_Estado VARCHAR(20);
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_VarianteID INT;
    DECLARE v_Cantidad INT;
    DECLARE v_StockActual INT;
    
    DECLARE cur_detalles CURSOR FOR
        SELECT VarianteID, Cantidad
        FROM DetalleVentas
        WHERE VentaID = p_VentaID;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    -- Obtener información de la venta
    SELECT NumeroTicket, Estado INTO v_NumeroTicket, v_Estado
    FROM Ventas
    WHERE VentaID = p_VentaID;
    
    IF v_Estado = 'CANCELADA' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'La venta ya está cancelada';
    END IF;
    
    START TRANSACTION;
    
    -- Actualizar estado de la venta
    UPDATE Ventas
    SET Estado = 'CANCELADA',
        Observaciones = CONCAT(COALESCE(Observaciones, ''), ' | CANCELADA: ', p_Motivo)
    WHERE VentaID = p_VentaID;
    
    -- Devolver productos al inventario
    OPEN cur_detalles;
    
    read_loop: LOOP
        FETCH cur_detalles INTO v_VarianteID, v_Cantidad;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Obtener stock actual
        SELECT StockActual INTO v_StockActual
        FROM ProductoVariantes
        WHERE VarianteID = v_VarianteID;
        
        -- Devolver al inventario
        UPDATE ProductoVariantes
        SET StockActual = StockActual + v_Cantidad
        WHERE VarianteID = v_VarianteID;
        
        -- Registrar movimiento
        INSERT INTO MovimientosInventario (
            VarianteID, TipoMovimiento, Cantidad,
            StockAnterior, StockNuevo, Referencia,
            Observaciones, UsuarioID
        ) VALUES (
            v_VarianteID,
            'DEVOLUCION',
            v_Cantidad,
            v_StockActual,
            v_StockActual + v_Cantidad,
            v_NumeroTicket,
            CONCAT('Cancelación de venta - Ticket: ', v_NumeroTicket, ' - Motivo: ', p_Motivo),
            p_UsuarioID
        );
    END LOOP;
    
    CLOSE cur_detalles;
    
    COMMIT;
    
    SELECT 'Venta cancelada exitosamente' AS Mensaje, p_VentaID AS VentaID;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CrearProducto` (IN `p_CodigoProducto` VARCHAR(50), IN `p_NombreProducto` VARCHAR(150), IN `p_Descripcion` TEXT, IN `p_CategoriaID` INT, IN `p_PrecioBase` DECIMAL(10,2), IN `p_ProveedorID` INT, IN `p_Activo` TINYINT, OUT `p_ProductoID` INT)   BEGIN
    INSERT INTO Productos (
        CodigoProducto, NombreProducto, Descripcion,
        CategoriaID, PrecioBase, ProveedorID, Activo
    ) VALUES (
        p_CodigoProducto, p_NombreProducto, p_Descripcion,
        p_CategoriaID, p_PrecioBase, p_ProveedorID, p_Activo
    );
    
    SET p_ProductoID = LAST_INSERT_ID();
    
    SELECT p_ProductoID AS ProductoID;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CrearVariante` (IN `p_ProductoID` INT, IN `p_CodigoVariante` VARCHAR(50), IN `p_Talla` VARCHAR(10), IN `p_Color` VARCHAR(30), IN `p_Estilo` VARCHAR(50), IN `p_PrecioVenta` DECIMAL(10,2), IN `p_StockActual` INT, IN `p_StockMinimo` INT, IN `p_Activo` TINYINT, OUT `p_VarianteID` INT)   BEGIN
    INSERT INTO ProductoVariantes (
        ProductoID, CodigoVariante, Talla, Color, Estilo,
        PrecioVenta, StockActual, StockMinimo, Activo
    ) VALUES (
        p_ProductoID, p_CodigoVariante, p_Talla, p_Color, p_Estilo,
        p_PrecioVenta, p_StockActual, p_StockMinimo, p_Activo
    );
    
    SET p_VarianteID = LAST_INSERT_ID();
    
    SELECT p_VarianteID AS VarianteID;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DashboardKPIs` ()   BEGIN
    -- Crear tabla temporal con todos los KPIs
    SELECT 
        -- KPIs de Hoy
        (SELECT COALESCE(SUM(Total), 0) FROM ventas WHERE DATE(FechaVenta) = CURDATE() AND Estado = 'COMPLETADA') AS TotalVentasHoy,
        (SELECT COUNT(*) FROM ventas WHERE DATE(FechaVenta) = CURDATE() AND Estado = 'COMPLETADA') AS NumeroVentasHoy,
        (SELECT COALESCE(AVG(Total), 0) FROM ventas WHERE DATE(FechaVenta) = CURDATE() AND Estado = 'COMPLETADA') AS TicketPromedioHoy,
        (SELECT COALESCE(SUM(dv.Cantidad), 0) FROM detalleventas dv INNER JOIN ventas v ON dv.VentaID = v.VentaID WHERE DATE(v.FechaVenta) = CURDATE() AND v.Estado = 'COMPLETADA') AS ProductosVendidosHoy,
        
        -- KPIs del Mes
        (SELECT COALESCE(SUM(Total), 0) FROM ventas WHERE YEAR(FechaVenta) = YEAR(CURDATE()) AND MONTH(FechaVenta) = MONTH(CURDATE()) AND Estado = 'COMPLETADA') AS TotalVentasMes,
        (SELECT COUNT(*) FROM ventas WHERE YEAR(FechaVenta) = YEAR(CURDATE()) AND MONTH(FechaVenta) = MONTH(CURDATE()) AND Estado = 'COMPLETADA') AS NumeroVentasMes,
        (SELECT COALESCE(AVG(Total), 0) FROM ventas WHERE YEAR(FechaVenta) = YEAR(CURDATE()) AND MONTH(FechaVenta) = MONTH(CURDATE()) AND Estado = 'COMPLETADA') AS TicketPromedioMes,
        (SELECT COALESCE(SUM(dv.Cantidad), 0) FROM detalleventas dv INNER JOIN ventas v ON dv.VentaID = v.VentaID WHERE YEAR(v.FechaVenta) = YEAR(CURDATE()) AND MONTH(v.FechaVenta) = MONTH(CURDATE()) AND v.Estado = 'COMPLETADA') AS ProductosVendidosMes,
        
        -- Stock Bajo
        (SELECT COUNT(*) FROM productovariantes WHERE StockActual < 5 AND Activo = 1) AS ProductosStockBajo,
        
        -- Inventario
        (SELECT COALESCE(SUM(pv.StockActual * pv.PrecioVenta), 0) FROM productovariantes pv WHERE pv.Activo = 1) AS ValorTotalInventario,
        (SELECT COUNT(DISTINCT p.ProductoID) FROM productos p INNER JOIN productovariantes pv ON p.ProductoID = pv.ProductoID WHERE p.Activo = 1 AND pv.Activo = 1) AS TotalProductos,
        (SELECT COUNT(pv.VarianteID) FROM productovariantes pv WHERE pv.Activo = 1) AS TotalVariantes,
        (SELECT COALESCE(SUM(pv.StockActual), 0) FROM productovariantes pv WHERE pv.Activo = 1) AS StockTotal;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerDetalleVenta` (IN `p_VentaID` INT)   BEGIN
    -- Recordset 1: Información de la venta
    SELECT 
        v.VentaID,
        v.NumeroTicket,
        v.FechaVenta,
        v.UsuarioID,
        u.NombreCompleto AS NombreVendedor,
        v.Subtotal,
        v.Descuento,
        v.IVA,
        v.Total,
        v.MetodoPago,
        v.Estado,
        v.Observaciones
    FROM Ventas v
    INNER JOIN Usuarios u ON v.UsuarioID = u.UsuarioID
    WHERE v.VentaID = p_VentaID;
    
    -- Recordset 2: Detalles de la venta
    SELECT 
        dv.DetalleVentaID,
        dv.VentaID,
        dv.VarianteID,
        pv.CodigoVariante,
        p.NombreProducto,
        pv.Talla,
        pv.Color,
        pv.Estilo,
        dv.Cantidad,
        dv.PrecioUnitario,
        dv.Descuento,
        dv.Subtotal
    FROM DetalleVentas dv
    INNER JOIN ProductoVariantes pv ON dv.VarianteID = pv.VarianteID
    INNER JOIN Productos p ON pv.ProductoID = p.ProductoID
    WHERE dv.VentaID = p_VentaID
    ORDER BY dv.DetalleVentaID;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerHistorialMovimientos` (IN `p_VarianteID` INT, IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME)   BEGIN
    SELECT 
        m.MovimientoID,
        m.VarianteID,
        pv.CodigoVariante,
        p.NombreProducto,
        pv.Talla,
        pv.Color,
        m.TipoMovimiento,
        m.Cantidad,
        m.StockAnterior,
        m.StockNuevo,
        m.Referencia,
        m.Observaciones,
        m.UsuarioID,
        u.NombreCompleto AS NombreUsuario,
        m.FechaMovimiento
    FROM MovimientosInventario m
    INNER JOIN ProductoVariantes pv ON m.VarianteID = pv.VarianteID
    INNER JOIN Productos p ON pv.ProductoID = p.ProductoID
    INNER JOIN Usuarios u ON m.UsuarioID = u.UsuarioID
    WHERE 
        (p_VarianteID IS NULL OR m.VarianteID = p_VarianteID)
        AND (p_FechaInicio IS NULL OR m.FechaMovimiento >= p_FechaInicio)
        AND (p_FechaFin IS NULL OR m.FechaMovimiento <= p_FechaFin)
    ORDER BY m.FechaMovimiento DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerProductoPorID` (IN `p_ProductoID` INT)   BEGIN
    -- Recordset 1: Información del producto
    SELECT 
        p.ProductoID,
        p.CodigoProducto,
        p.NombreProducto,
        p.Descripcion,
        p.CategoriaID,
        c.NombreCategoria,
        p.PrecioBase,
        p.ProveedorID,
        pr.NombreProveedor,
        p.Activo,
        p.FechaCreacion,
        p.FechaActualizacion
    FROM Productos p
    INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
    LEFT JOIN Proveedores pr ON p.ProveedorID = pr.ProveedorID
    WHERE p.ProductoID = p_ProductoID;
    
    -- Recordset 2: Variantes del producto
    SELECT 
        VarianteID,
        ProductoID,
        CodigoVariante,
        Talla,
        Color,
        Estilo,
        PrecioVenta,
        StockActual,
        StockMinimo,
        Activo,
        FechaCreacion
    FROM ProductoVariantes
    WHERE ProductoID = p_ProductoID
    ORDER BY Talla, Color;
    
    -- Recordset 3: Imágenes del producto
    SELECT 
        ImagenID,
        ProductoID,
        URLImagen,
        EsPrincipal,
        Orden,
        FechaSubida
    FROM ProductoImagenes
    WHERE ProductoID = p_ProductoID
    ORDER BY EsPrincipal DESC, Orden;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerProductos` (IN `p_Activo` INT, IN `p_CategoriaID` INT, IN `p_Busqueda` VARCHAR(100))   BEGIN
    SELECT 
        p.ProductoID,
        p.CodigoProducto,
        p.NombreProducto,
        p.Descripcion,
        p.CategoriaID,
        c.NombreCategoria,
        p.PrecioBase,
        p.ProveedorID,
        pr.NombreProveedor,
        p.Activo,
        p.FechaCreacion,
        p.FechaActualizacion,
        COUNT(DISTINCT pv.VarianteID) AS TotalVariantes,
        COALESCE(SUM(pv.StockActual), 0) AS StockTotal
    FROM Productos p
    INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
    LEFT JOIN Proveedores pr ON p.ProveedorID = pr.ProveedorID
    LEFT JOIN ProductoVariantes pv ON p.ProductoID = pv.ProductoID AND pv.Activo = 1
    WHERE 
        (p_Activo IS NULL OR p.Activo = p_Activo)
        AND (p_CategoriaID IS NULL OR p.CategoriaID = p_CategoriaID)
        AND (p_Busqueda IS NULL OR p_Busqueda = '' OR 
             p.NombreProducto LIKE CONCAT('%', p_Busqueda, '%') OR
             p.CodigoProducto LIKE CONCAT('%', p_Busqueda, '%'))
    GROUP BY p.ProductoID, p.CodigoProducto, p.NombreProducto, p.Descripcion,
             p.CategoriaID, c.NombreCategoria, p.PrecioBase, p.ProveedorID,
             pr.NombreProveedor, p.Activo, p.FechaCreacion, p.FechaActualizacion
    ORDER BY p.NombreProducto;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerProductosStockBajo` ()   BEGIN
    SELECT 
        pv.VarianteID,
        p.ProductoID,
        p.CodigoProducto,
        p.NombreProducto,
        pv.CodigoVariante,
        pv.Talla,
        pv.Color,
        pv.Estilo,
        pv.StockActual,
        pv.StockMinimo,
        c.NombreCategoria,
        pr.NombreProveedor
    FROM ProductoVariantes pv
    INNER JOIN Productos p ON pv.ProductoID = p.ProductoID
    INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
    LEFT JOIN Proveedores pr ON p.ProveedorID = pr.ProveedorID
    WHERE pv.StockActual <= pv.StockMinimo
      AND pv.Activo = 1
      AND p.Activo = 1
    ORDER BY pv.StockActual ASC, p.NombreProducto;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerVentasPorPeriodo` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME, IN `p_UsuarioID` INT, IN `p_Estado` VARCHAR(20))   BEGIN
    SELECT 
        v.VentaID,
        v.NumeroTicket,
        v.FechaVenta,
        v.UsuarioID,
        u.NombreCompleto AS NombreVendedor,
        v.Subtotal,
        v.Descuento,
        v.IVA,
        v.Total,
        v.MetodoPago,
        v.Estado,
        COUNT(dv.DetalleVentaID) AS TotalArticulos
    FROM Ventas v
    INNER JOIN Usuarios u ON v.UsuarioID = u.UsuarioID
    LEFT JOIN DetalleVentas dv ON v.VentaID = dv.VentaID
    WHERE 
        v.FechaVenta >= p_FechaInicio
        AND v.FechaVenta <= p_FechaFin
        AND (p_UsuarioID IS NULL OR v.UsuarioID = p_UsuarioID)
        AND (p_Estado IS NULL OR v.Estado = p_Estado)
    GROUP BY v.VentaID, v.NumeroTicket, v.FechaVenta, v.UsuarioID,
             u.NombreCompleto, v.Subtotal, v.Descuento, v.IVA,
             v.Total, v.MetodoPago, v.Estado
    ORDER BY v.FechaVenta DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_RegistrarMovimientoInventario` (IN `p_VarianteID` INT, IN `p_TipoMovimiento` VARCHAR(20), IN `p_Cantidad` INT, IN `p_Referencia` VARCHAR(100), IN `p_Observaciones` TEXT, IN `p_UsuarioID` INT)   BEGIN
    DECLARE v_StockAnterior INT;
    DECLARE v_StockNuevo INT;
    
    -- Obtener stock actual
    SELECT StockActual INTO v_StockAnterior
    FROM ProductoVariantes
    WHERE VarianteID = p_VarianteID;
    
    -- Calcular nuevo stock según tipo de movimiento
    IF p_TipoMovimiento IN ('ENTRADA', 'DEVOLUCION') THEN
        SET v_StockNuevo = v_StockAnterior + p_Cantidad;
    ELSEIF p_TipoMovimiento IN ('SALIDA', 'VENTA', 'AJUSTE') THEN
        SET v_StockNuevo = v_StockAnterior - p_Cantidad;
    ELSE
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Tipo de movimiento inválido';
    END IF;
    
    -- Actualizar stock
    UPDATE ProductoVariantes
    SET StockActual = v_StockNuevo
    WHERE VarianteID = p_VarianteID;
    
    -- Registrar movimiento
    INSERT INTO MovimientosInventario (
        VarianteID, TipoMovimiento, Cantidad,
        StockAnterior, StockNuevo, Referencia,
        Observaciones, UsuarioID
    ) VALUES (
        p_VarianteID, p_TipoMovimiento, p_Cantidad,
        v_StockAnterior, v_StockNuevo, p_Referencia,
        p_Observaciones, p_UsuarioID
    );
    
    SELECT LAST_INSERT_ID() AS MovimientoID, v_StockNuevo AS StockNuevo;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_RegistrarVenta` (IN `p_numeroTicket` VARCHAR(50), IN `p_usuarioId` INT, IN `p_subtotal` DECIMAL(10,2), IN `p_descuento` DECIMAL(10,2), IN `p_iva` DECIMAL(10,2), IN `p_total` DECIMAL(10,2), IN `p_metodoPago` VARCHAR(20), IN `p_observaciones` TEXT, IN `p_detallesJSON` JSON)   BEGIN
    DECLARE v_ventaId INT;
    DECLARE v_index INT DEFAULT 0;
    DECLARE v_totalItems INT;
    DECLARE v_varianteId INT;
    DECLARE v_cantidad INT;
    DECLARE v_precioUnitario DECIMAL(10,2);
    DECLARE v_stockActual INT;
    DECLARE v_nombreProducto VARCHAR(255);
    DECLARE v_error VARCHAR(500);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT 
            0 AS VentaID,
            NULL AS NumeroTicket,
            'Error al procesar la venta' AS Error;
    END;

    START TRANSACTION;

    SET v_totalItems = JSON_LENGTH(p_detallesJSON);
    
    IF v_totalItems = 0 OR v_totalItems IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La venta debe tener al menos un producto';
    END IF;

    SET v_index = 0;
    
    WHILE v_index < v_totalItems DO
        SET v_varianteId = JSON_UNQUOTE(JSON_EXTRACT(p_detallesJSON, CONCAT('$[', v_index, '].varianteId')));
        SET v_cantidad = JSON_UNQUOTE(JSON_EXTRACT(p_detallesJSON, CONCAT('$[', v_index, '].cantidad')));
        
        SELECT 
            pv.StockActual,
            p.NombreProducto
        INTO v_stockActual, v_nombreProducto
        FROM productovariantes pv
        INNER JOIN productos p ON pv.ProductoID = p.ProductoID
        WHERE pv.VarianteID = v_varianteId
        AND pv.Activo = 1;
        
        IF v_stockActual IS NULL THEN
            SET v_error = CONCAT('La variante con ID ', v_varianteId, ' no existe o está inactiva');
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = v_error;
        END IF;
        
        IF v_stockActual < v_cantidad THEN
            SET v_error = CONCAT('Stock insuficiente para ', v_nombreProducto, '. Disponible: ', v_stockActual, ', Solicitado: ', v_cantidad);
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = v_error;
        END IF;
        
        SET v_index = v_index + 1;
    END WHILE;

    INSERT INTO ventas (
        NumeroTicket,
        FechaVenta,
        UsuarioID,
        Subtotal,
        Descuento,
        IVA,
        Total,
        MetodoPago,
        Estado,
        Observaciones
    ) VALUES (
        p_numeroTicket,
        NOW(),
        p_usuarioId,
        p_subtotal,
        p_descuento,
        p_iva,
        p_total,
        p_metodoPago,
        'COMPLETADA',
        p_observaciones
    );
    
    SET v_ventaId = LAST_INSERT_ID();

    SET v_index = 0;
    
    WHILE v_index < v_totalItems DO
        SET v_varianteId = JSON_UNQUOTE(JSON_EXTRACT(p_detallesJSON, CONCAT('$[', v_index, '].varianteId')));
        SET v_cantidad = JSON_UNQUOTE(JSON_EXTRACT(p_detallesJSON, CONCAT('$[', v_index, '].cantidad')));
        SET v_precioUnitario = JSON_UNQUOTE(JSON_EXTRACT(p_detallesJSON, CONCAT('$[', v_index, '].precioUnitario')));
        
        INSERT INTO detalleventas (
            VentaID,
            VarianteID,
            Cantidad,
            PrecioUnitario,
            Subtotal
        ) VALUES (
            v_ventaId,
            v_varianteId,
            v_cantidad,
            v_precioUnitario,
            v_cantidad * v_precioUnitario
        );
        
        UPDATE productovariantes
        SET StockActual = StockActual - v_cantidad
        WHERE VarianteID = v_varianteId;
        
        SET v_index = v_index + 1;
    END WHILE;

    COMMIT;
    
    SELECT 
        v_ventaId AS VentaID,
        p_numeroTicket AS NumeroTicket,
        'Venta registrada exitosamente' AS Mensaje;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteInventarioValorizado` ()   BEGIN
    -- Recordset 1: Detalle por variante
    SELECT 
        c.NombreCategoria,
        p.NombreProducto,
        p.CodigoProducto,
        pv.CodigoVariante,
        pv.Talla,
        pv.Color,
        pv.Estilo,
        pv.StockActual,
        pv.StockMinimo,
        pv.PrecioVenta,
        (pv.StockActual * pv.PrecioVenta) AS ValorInventario,
        CASE 
            WHEN pv.StockActual <= pv.StockMinimo THEN 'BAJO'
            WHEN pv.StockActual <= (pv.StockMinimo * 2) THEN 'MEDIO'
            ELSE 'NORMAL'
        END AS NivelStock
    FROM ProductoVariantes pv
    INNER JOIN Productos p ON pv.ProductoID = p.ProductoID
    INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
    WHERE pv.Activo = 1 AND p.Activo = 1
    ORDER BY c.NombreCategoria, p.NombreProducto, pv.Talla;
    
    -- Recordset 2: Resumen por categoría
    SELECT 
        c.NombreCategoria,
        COUNT(DISTINCT p.ProductoID) AS TotalProductos,
        COUNT(pv.VarianteID) AS TotalVariantes,
        COALESCE(SUM(pv.StockActual), 0) AS TotalUnidades,
        COALESCE(SUM(pv.StockActual * pv.PrecioVenta), 0) AS ValorTotal
    FROM Categorias c
    LEFT JOIN Productos p ON c.CategoriaID = p.CategoriaID AND p.Activo = 1
    LEFT JOIN ProductoVariantes pv ON p.ProductoID = pv.ProductoID AND pv.Activo = 1
    WHERE c.Activo = 1
    GROUP BY c.CategoriaID, c.NombreCategoria
    ORDER BY ValorTotal DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteMetodosPago` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME)   BEGIN
    SELECT 
        MetodoPago,
        COUNT(*) AS TotalVentas,
        COALESCE(SUM(CASE WHEN Estado = 'COMPLETADA' THEN Total ELSE 0 END), 0) AS TotalIngresos,
        COALESCE(AVG(CASE WHEN Estado = 'COMPLETADA' THEN Total ELSE NULL END), 0) AS TicketPromedio,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Ventas WHERE FechaVenta >= p_FechaInicio AND FechaVenta <= p_FechaFin)), 2) AS PorcentajeVentas
    FROM Ventas
    WHERE FechaVenta >= p_FechaInicio
      AND FechaVenta <= p_FechaFin
    GROUP BY MetodoPago
    ORDER BY TotalIngresos DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteMovimientosInventario` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME, IN `p_TipoMovimiento` VARCHAR(20))   BEGIN
    SELECT 
        m.MovimientoID,
        m.FechaMovimiento,
        p.NombreProducto,
        pv.CodigoVariante,
        pv.Talla,
        pv.Color,
        m.TipoMovimiento,
        m.Cantidad,
        m.StockAnterior,
        m.StockNuevo,
        m.Referencia,
        m.Observaciones,
        u.NombreCompleto AS Usuario
    FROM MovimientosInventario m
    INNER JOIN ProductoVariantes pv ON m.VarianteID = pv.VarianteID
    INNER JOIN Productos p ON pv.ProductoID = p.ProductoID
    INNER JOIN Usuarios u ON m.UsuarioID = u.UsuarioID
    WHERE 
        m.FechaMovimiento >= p_FechaInicio
        AND m.FechaMovimiento <= p_FechaFin
        AND (p_TipoMovimiento IS NULL OR m.TipoMovimiento = p_TipoMovimiento)
    ORDER BY m.FechaMovimiento DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteProductosMasVendidos` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME, IN `p_Top` INT)   BEGIN
    SELECT 
        p.ProductoID,
        p.NombreProducto,
        c.NombreCategoria,
        pv.CodigoVariante,
        pv.Talla,
        pv.Color,
        COALESCE(SUM(dv.Cantidad), 0) AS CantidadVendida,
        COALESCE(SUM(dv.Subtotal), 0) AS TotalVentas,
        pv.StockActual
    FROM DetalleVentas dv
    INNER JOIN ProductoVariantes pv ON dv.VarianteID = pv.VarianteID
    INNER JOIN Productos p ON pv.ProductoID = p.ProductoID
    INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
    INNER JOIN Ventas v ON dv.VentaID = v.VentaID
    WHERE v.FechaVenta >= p_FechaInicio
      AND v.FechaVenta <= p_FechaFin
      AND v.Estado = 'COMPLETADA'
    GROUP BY p.ProductoID, p.NombreProducto, c.NombreCategoria,
             pv.CodigoVariante, pv.Talla, pv.Color, pv.StockActual
    ORDER BY CantidadVendida DESC
    LIMIT p_Top;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteRendimientoVendedores` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME)   BEGIN
    SELECT 
        u.UsuarioID,
        u.NombreCompleto,
        r.NombreRol,
        COUNT(v.VentaID) AS TotalVentas,
        COALESCE(SUM(CASE WHEN v.Estado = 'COMPLETADA' THEN 1 ELSE 0 END), 0) AS VentasCompletadas,
        COALESCE(SUM(CASE WHEN v.Estado = 'CANCELADA' THEN 1 ELSE 0 END), 0) AS VentasCanceladas,
        COALESCE(SUM(CASE WHEN v.Estado = 'COMPLETADA' THEN v.Total ELSE 0 END), 0) AS TotalIngresos,
        COALESCE(AVG(CASE WHEN v.Estado = 'COMPLETADA' THEN v.Total ELSE NULL END), 0) AS TicketPromedio,
        COALESCE(SUM(dv_sum.TotalArticulos), 0) AS TotalArticulosVendidos
    FROM Usuarios u
    INNER JOIN Roles r ON u.RolID = r.RolID
    LEFT JOIN Ventas v ON u.UsuarioID = v.UsuarioID
        AND v.FechaVenta >= p_FechaInicio
        AND v.FechaVenta <= p_FechaFin
    LEFT JOIN (
        SELECT dv.VentaID, SUM(dv.Cantidad) AS TotalArticulos
        FROM DetalleVentas dv
        GROUP BY dv.VentaID
    ) dv_sum ON v.VentaID = dv_sum.VentaID
    WHERE u.Activo = 1
    GROUP BY u.UsuarioID, u.NombreCompleto, r.NombreRol
    ORDER BY TotalIngresos DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteVentasDiarias` (IN `p_FechaInicio` DATE, IN `p_FechaFin` DATE)   BEGIN
    SELECT 
        DATE(v.FechaVenta) AS Fecha,
        COUNT(v.VentaID) AS TotalVentas,
        COALESCE(SUM(CASE WHEN v.Estado = 'COMPLETADA' THEN v.Total ELSE 0 END), 0) AS TotalIngresos,
        COALESCE(AVG(CASE WHEN v.Estado = 'COMPLETADA' THEN v.Total ELSE NULL END), 0) AS TicketPromedio,
        COALESCE(SUM(CASE WHEN v.Estado = 'COMPLETADA' THEN 1 ELSE 0 END), 0) AS VentasCompletadas,
        COALESCE(SUM(CASE WHEN v.Estado = 'CANCELADA' THEN 1 ELSE 0 END), 0) AS VentasCanceladas,
        COALESCE(SUM(dv_count.TotalArticulos), 0) AS TotalArticulosVendidos
    FROM Ventas v
    LEFT JOIN (
        SELECT VentaID, SUM(Cantidad) AS TotalArticulos
        FROM DetalleVentas
        GROUP BY VentaID
    ) dv_count ON v.VentaID = dv_count.VentaID
    WHERE DATE(v.FechaVenta) >= p_FechaInicio
      AND DATE(v.FechaVenta) <= p_FechaFin
    GROUP BY DATE(v.FechaVenta)
    ORDER BY Fecha;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteVentasPorCategoria` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME)   BEGIN
    SELECT 
        c.CategoriaID,
        c.NombreCategoria,
        COALESCE(COUNT(DISTINCT v.VentaID), 0) AS TotalVentas,
        COALESCE(SUM(dv.Cantidad), 0) AS UnidadesVendidas,
        COALESCE(SUM(dv.Subtotal), 0) AS TotalIngresos,
        COALESCE(AVG(dv.PrecioUnitario), 0) AS PrecioPromedio
    FROM Categorias c
    LEFT JOIN Productos p ON c.CategoriaID = p.CategoriaID
    LEFT JOIN ProductoVariantes pv ON p.ProductoID = pv.ProductoID
    LEFT JOIN DetalleVentas dv ON pv.VarianteID = dv.VarianteID
    LEFT JOIN Ventas v ON dv.VentaID = v.VentaID 
        AND v.FechaVenta >= p_FechaInicio
        AND v.FechaVenta <= p_FechaFin
        AND v.Estado = 'COMPLETADA'
    WHERE c.Activo = 1
    GROUP BY c.CategoriaID, c.NombreCategoria
    ORDER BY TotalIngresos DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ResumenVentasDia` (IN `p_Fecha` DATE)   BEGIN
    DECLARE v_FechaInicio DATETIME;
    DECLARE v_FechaFin DATETIME;
    
    SET v_FechaInicio = CONCAT(p_Fecha, ' 00:00:00');
    SET v_FechaFin = CONCAT(p_Fecha, ' 23:59:59');
    
    -- Recordset 1: Resumen general del día
    SELECT 
        COUNT(*) AS TotalVentas,
        COALESCE(SUM(CASE WHEN Estado = 'COMPLETADA' THEN 1 ELSE 0 END), 0) AS VentasCompletadas,
        COALESCE(SUM(CASE WHEN Estado = 'CANCELADA' THEN 1 ELSE 0 END), 0) AS VentasCanceladas,
        COALESCE(SUM(CASE WHEN Estado = 'COMPLETADA' THEN Total ELSE 0 END), 0) AS TotalIngresos,
        COALESCE(AVG(CASE WHEN Estado = 'COMPLETADA' THEN Total ELSE NULL END), 0) AS TicketPromedio,
        COALESCE(SUM(CASE WHEN MetodoPago = 'EFECTIVO' AND Estado = 'COMPLETADA' THEN Total ELSE 0 END), 0) AS TotalEfectivo,
        COALESCE(SUM(CASE WHEN MetodoPago = 'TARJETA' AND Estado = 'COMPLETADA' THEN Total ELSE 0 END), 0) AS TotalTarjeta
    FROM Ventas
    WHERE FechaVenta >= v_FechaInicio AND FechaVenta <= v_FechaFin;
    
    -- Recordset 2: Ventas por hora
    SELECT 
        HOUR(FechaVenta) AS Hora,
        COUNT(*) AS TotalVentas,
        COALESCE(SUM(CASE WHEN Estado = 'COMPLETADA' THEN Total ELSE 0 END), 0) AS TotalIngresos
    FROM Ventas
    WHERE FechaVenta >= v_FechaInicio AND FechaVenta <= v_FechaFin
    GROUP BY HOUR(FechaVenta)
    ORDER BY Hora;
    
    -- Recordset 3: Top vendedores del día
    SELECT 
        u.UsuarioID,
        u.NombreCompleto,
        COUNT(*) AS TotalVentas,
        COALESCE(SUM(CASE WHEN v.Estado = 'COMPLETADA' THEN v.Total ELSE 0 END), 0) AS TotalIngresos
    FROM Ventas v
    INNER JOIN Usuarios u ON v.UsuarioID = u.UsuarioID
    WHERE v.FechaVenta >= v_FechaInicio AND v.FechaVenta <= v_FechaFin
    GROUP BY u.UsuarioID, u.NombreCompleto
    ORDER BY TotalIngresos DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_TopProductosVendidos` ()   BEGIN
    SELECT 
        p.NombreProducto,
        COALESCE(SUM(dv.Cantidad), 0) AS TotalVendido,
        COALESCE(SUM(dv.Cantidad * dv.PrecioUnitario), 0) AS TotalIngresos
    FROM productos p
    INNER JOIN productovariantes pv ON p.ProductoID = pv.ProductoID
    INNER JOIN detalleventas dv ON pv.VarianteID = dv.VarianteID
    INNER JOIN ventas v ON dv.VentaID = v.VentaID
    WHERE v.Estado = 'COMPLETADA'
    GROUP BY p.ProductoID, p.NombreProducto
    ORDER BY TotalVendido DESC
    LIMIT 5;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `CategoriaID` int(11) NOT NULL,
  `NombreCategoria` varchar(50) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Activo` tinyint(1) NOT NULL DEFAULT 1,
  `FechaCreacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`CategoriaID`, `NombreCategoria`, `Descripcion`, `Activo`, `FechaCreacion`) VALUES
(1, 'Botas', 'Botas vaqueras y de trabajo', 1, '2026-02-06 23:01:30'),
(2, 'Camisas', 'Camisas western y casuales', 1, '2026-02-06 23:01:30'),
(3, 'Pantalones', 'Jeans y pantalones vaqueros', 1, '2026-02-06 23:01:30'),
(4, 'Cinturones', 'Cinturones de piel y hebillas', 1, '2026-02-06 23:01:30'),
(5, 'Sombreros', 'Sombreros texanos y vaqueros', 1, '2026-02-06 23:01:30'),
(6, 'Accesorios', 'Billeteras, carteras y otros accesorios', 1, '2026-02-06 23:01:30'),
(7, 'Chamarras', 'Chamarras de mezclilla y piel', 1, '2026-02-06 23:01:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion`
--

CREATE TABLE `configuracion` (
  `ConfiguracionID` int(11) NOT NULL,
  `Clave` varchar(50) NOT NULL,
  `Valor` text NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `FechaActualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `configuracion`
--

INSERT INTO `configuracion` (`ConfiguracionID`, `Clave`, `Valor`, `Descripcion`, `FechaActualizacion`) VALUES
(1, 'IVA', '0.16', 'Porcentaje de IVA aplicable', '2026-02-06 23:01:31'),
(2, 'MONEDA', 'MXN', 'Moneda utilizada en el sistema', '2026-02-06 23:01:31'),
(3, 'FORMATO_TICKET', 'TICK-{YYYY}{MM}{DD}-{NNNN}', 'Formato para número de ticket', '2026-02-06 23:01:31'),
(4, 'NOMBRE_TIENDA', 'San José Boots', 'Nombre de la tienda', '2026-02-06 23:01:31'),
(5, 'DIRECCION_TIENDA', 'Aguascalientes, México', 'Dirección de la tienda', '2026-02-06 23:01:31'),
(6, 'TELEFONO_TIENDA', '449-123-4567', 'Teléfono de contacto', '2026-02-06 23:01:31'),
(7, 'EMAIL_TIENDA', 'contacto@sanjoseboots.com', 'Email de contacto', '2026-02-06 23:01:31'),
(8, 'STOCK_MINIMO_ALERTA', '5', 'Cantidad mínima para alertar stock bajo', '2026-02-06 23:01:31'),
(9, 'DIAS_REPORTE_VENTAS', '30', 'Días a mostrar en reportes de ventas', '2026-02-06 23:01:31');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalleventas`
--

CREATE TABLE `detalleventas` (
  `DetalleVentaID` int(11) NOT NULL,
  `VentaID` int(11) NOT NULL,
  `VarianteID` int(11) NOT NULL,
  `Cantidad` int(11) NOT NULL,
  `PrecioUnitario` decimal(10,2) NOT NULL,
  `Descuento` decimal(10,2) NOT NULL DEFAULT 0.00,
  `Subtotal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `detalleventas`
--

INSERT INTO `detalleventas` (`DetalleVentaID`, `VentaID`, `VarianteID`, `Cantidad`, `PrecioUnitario`, `Descuento`, `Subtotal`) VALUES
(1, 1, 2, 1, 1800.00, 0.00, 1800.00),
(2, 2, 8, 1, 1200.00, 0.00, 1200.00),
(3, 3, 1, 1, 1500.00, 0.00, 1500.00),
(4, 4, 8, 3, 1200.00, 0.00, 3600.00),
(5, 5, 1, 1, 100.00, 0.00, 100.00),
(6, 6, 1, 1, 100.00, 0.00, 100.00),
(7, 7, 8, 2, 1200.00, 0.00, 2400.00),
(8, 8, 8, 1, 1200.00, 0.00, 1200.00),
(9, 9, 7, 1, 650.00, 0.00, 650.00),
(10, 9, 8, 1, 1200.00, 0.00, 1200.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientosinventario`
--

CREATE TABLE `movimientosinventario` (
  `MovimientoID` int(11) NOT NULL,
  `VarianteID` int(11) NOT NULL,
  `TipoMovimiento` varchar(20) NOT NULL,
  `Cantidad` int(11) NOT NULL,
  `StockAnterior` int(11) NOT NULL,
  `StockNuevo` int(11) NOT NULL,
  `Referencia` varchar(100) DEFAULT NULL,
  `Observaciones` text DEFAULT NULL,
  `UsuarioID` int(11) NOT NULL,
  `FechaMovimiento` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `movimientosinventario`
--

INSERT INTO `movimientosinventario` (`MovimientoID`, `VarianteID`, `TipoMovimiento`, `Cantidad`, `StockAnterior`, `StockNuevo`, `Referencia`, `Observaciones`, `UsuarioID`, `FechaMovimiento`) VALUES
(1, 2, 'VENTA', 1, 8, 7, 'TICK-20250207-0003', 'Venta - Ticket: TICK-20250207-0003', 1, '2026-02-07 08:34:32'),
(2, 8, 'VENTA', 1, 12, 11, 'TKT-20260207-642210', 'Venta - Ticket: TKT-20260207-642210', 1, '2026-02-07 19:04:02'),
(3, 1, 'VENTA', 1, 5, 4, 'TKT-20260207-693452', 'Venta - Ticket: TKT-20260207-693452', 1, '2026-02-07 19:04:53'),
(4, 8, 'VENTA', 3, 11, 8, 'TKT-20260207-795599', 'Venta - Ticket: TKT-20260207-795599', 1, '2026-02-07 19:23:15');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productoimagenes`
--

CREATE TABLE `productoimagenes` (
  `ImagenID` int(11) NOT NULL,
  `ProductoID` int(11) NOT NULL,
  `URLImagen` varchar(500) NOT NULL,
  `EsPrincipal` tinyint(1) NOT NULL DEFAULT 0,
  `Orden` int(11) NOT NULL DEFAULT 0,
  `FechaSubida` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `ProductoID` int(11) NOT NULL,
  `CodigoProducto` varchar(50) NOT NULL,
  `NombreProducto` varchar(150) NOT NULL,
  `Descripcion` text DEFAULT NULL,
  `CategoriaID` int(11) NOT NULL,
  `PrecioBase` decimal(10,2) NOT NULL,
  `ProveedorID` int(11) DEFAULT NULL,
  `Activo` tinyint(1) NOT NULL DEFAULT 1,
  `FechaCreacion` datetime NOT NULL DEFAULT current_timestamp(),
  `FechaActualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`ProductoID`, `CodigoProducto`, `NombreProducto`, `Descripcion`, `CategoriaID`, `PrecioBase`, `ProveedorID`, `Activo`, `FechaCreacion`, `FechaActualizacion`) VALUES
(1, 'BOT-001', 'Botas Vaqueras Clásicas', 'Botas de piel genuina estilo tradicional', 1, 1500.00, 1, 1, '2026-02-06 23:01:30', '2026-02-06 23:01:30'),
(2, 'CAM-001', 'Camisa Western Cuadros', 'Camisa de algodón con diseño a cuadros', 2, 350.00, 2, 1, '2026-02-06 23:01:31', '2026-02-06 23:01:31'),
(3, 'PAN-001', 'Jeans Vaqueros Corte Clásico', 'Jeans de mezclilla resistente', 3, 450.00, 2, 1, '2026-02-06 23:01:31', '2026-02-06 23:01:31'),
(4, 'CIN-001', 'Cinturón Piel Grabada', 'Cinturón de piel con hebilla plateada', 4, 280.00, 3, 1, '2026-02-06 23:01:31', '2026-02-06 23:01:31'),
(5, 'SOM-001', 'Sombrero Texano Premium', 'Sombrero de fieltro de alta calidad', 5, 800.00, 1, 1, '2026-02-06 23:01:31', '2026-02-06 23:01:31'),
(6, 'ACC-001', 'Billetera Piel Genuina', 'Billetera con múltiples compartimentos', 6, 200.00, 3, 1, '2026-02-06 23:01:31', '2026-02-06 23:01:31'),
(7, 'CHA-001', 'Chamarra Mezclilla Clásica', 'Chamarra de mezclilla resistente', 7, 650.00, 2, 1, '2026-02-06 23:01:31', '2026-02-06 23:01:31'),
(8, 'BOT-002', 'Botas de Trabajo Reforzadas', 'Botas con puntera de acero', 1, 1200.00, 1, 1, '2026-02-06 23:01:31', '2026-02-06 23:01:31');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productovariantes`
--

CREATE TABLE `productovariantes` (
  `VarianteID` int(11) NOT NULL,
  `ProductoID` int(11) NOT NULL,
  `CodigoVariante` varchar(50) NOT NULL,
  `Talla` varchar(10) DEFAULT NULL,
  `Color` varchar(30) DEFAULT NULL,
  `Estilo` varchar(50) DEFAULT NULL,
  `PrecioVenta` decimal(10,2) NOT NULL,
  `StockActual` int(11) NOT NULL DEFAULT 0,
  `StockMinimo` int(11) NOT NULL DEFAULT 0,
  `Activo` tinyint(1) NOT NULL DEFAULT 1,
  `FechaCreacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productovariantes`
--

INSERT INTO `productovariantes` (`VarianteID`, `ProductoID`, `CodigoVariante`, `Talla`, `Color`, `Estilo`, `PrecioVenta`, `StockActual`, `StockMinimo`, `Activo`, `FechaCreacion`) VALUES
(1, 1, 'BOT-001-25-NEG', '25', 'Negro', 'Clásico', 1800.00, 2, 2, 1, '2026-02-06 23:01:31'),
(2, 1, 'BOT-001-26-NEG', '26', 'Negro', 'Clásico', 1800.00, 7, 2, 1, '2026-02-06 23:01:31'),
(3, 1, 'BOT-001-27-CAF', '27', 'Café', 'Clásico', 1800.00, 6, 2, 1, '2026-02-06 23:01:31'),
(4, 2, 'CAM-001-M-AZ', 'M', 'Azul', 'Cuadros', 450.00, 12, 3, 1, '2026-02-06 23:01:31'),
(5, 2, 'CAM-001-L-AZ', 'L', 'Azul', 'Cuadros', 450.00, 10, 3, 1, '2026-02-06 23:01:31'),
(6, 2, 'CAM-001-XL-RJ', 'XL', 'Rojo', 'Cuadros', 450.00, 8, 3, 1, '2026-02-06 23:01:31'),
(7, 3, 'PAN-001-30-AZ', '30', 'Azul Oscuro', 'Clásico', 550.00, 14, 4, 1, '2026-02-06 23:01:31'),
(8, 3, 'PAN-001-32-AZ', '32', 'Azul Oscuro', 'Clásico', 550.00, 4, 4, 1, '2026-02-06 23:01:31'),
(9, 3, 'PAN-001-34-NEG', '34', 'Negro', 'Clásico', 550.00, 10, 4, 1, '2026-02-06 23:01:31'),
(10, 4, 'CIN-001-34-CAF', '34', 'Café', 'Grabado', 350.00, 20, 5, 1, '2026-02-06 23:01:31'),
(11, 4, 'CIN-001-36-CAF', '36', 'Café', 'Grabado', 350.00, 18, 5, 1, '2026-02-06 23:01:31'),
(12, 4, 'CIN-001-38-NEG', '38', 'Negro', 'Grabado', 350.00, 15, 5, 1, '2026-02-06 23:01:31'),
(13, 5, 'SOM-001-7-BEI', '7', 'Beige', 'Texano', 1000.00, 6, 2, 1, '2026-02-06 23:01:31'),
(14, 5, 'SOM-001-7.5-NEG', '7 1/2', 'Negro', 'Texano', 1000.00, 4, 2, 1, '2026-02-06 23:01:31'),
(17, 7, 'CHA-001-M-AZ', 'M', 'Azul', 'Clásico', 850.00, 8, 2, 1, '2026-02-06 23:01:31'),
(18, 7, 'CHA-001-L-AZ', 'L', 'Azul', 'Clásico', 850.00, 7, 2, 1, '2026-02-06 23:01:31'),
(19, 7, 'CHA-001-XL-NEG', 'XL', 'Negro', 'Clásico', 850.00, 5, 2, 1, '2026-02-06 23:01:31'),
(20, 8, 'BOT-002-26-CAF', '26', 'Café', 'Trabajo', 1500.00, 10, 3, 1, '2026-02-06 23:01:31'),
(21, 8, 'BOT-002-27-CAF', '27', 'Café', 'Trabajo', 1500.00, 12, 3, 1, '2026-02-06 23:01:31'),
(22, 8, 'BOT-002-28-NEG', '28', 'Negro', 'Trabajo', 1500.00, 8, 3, 1, '2026-02-06 23:01:31'),
(26, 6, 'ACC-001-U-CAF', 'Única', 'Café', 'Clásico', 280.00, 25, 8, 1, '2026-02-10 02:15:37'),
(27, 6, 'ACC-001-U-NEG', 'Única', 'Negro', 'Clásico', 280.00, 22, 8, 1, '2026-02-10 02:15:37');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `ProveedorID` int(11) NOT NULL,
  `NombreProveedor` varchar(100) NOT NULL,
  `NombreContacto` varchar(100) DEFAULT NULL,
  `Telefono` varchar(20) DEFAULT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `Direccion` varchar(255) DEFAULT NULL,
  `RFC` varchar(13) DEFAULT NULL,
  `Activo` tinyint(1) NOT NULL DEFAULT 1,
  `FechaRegistro` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `proveedores`
--

INSERT INTO `proveedores` (`ProveedorID`, `NombreProveedor`, `NombreContacto`, `Telefono`, `Email`, `Direccion`, `RFC`, `Activo`, `FechaRegistro`) VALUES
(1, 'Botas El Vaquero SA', 'Juan Pérez', '4491234567', 'contacto@elvaquero.com', 'Av. Aguascalientes Norte 123, Aguascalientes', 'BEV890123ABC', 1, '2026-02-06 23:01:30'),
(2, 'Textiles Western SRL', 'María González', '4499876543', 'ventas@textileswestern.com', 'Blvd. Zacatecas 456, Aguascalientes', 'TWE901234DEF', 1, '2026-02-06 23:01:30'),
(3, 'Distribuidora Norteña', 'Carlos Ramírez', '4491122334', 'info@norteña.com', 'Av. Tecnológico 789, Aguascalientes', 'DNO012345GHI', 1, '2026-02-06 23:01:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `RolID` int(11) NOT NULL,
  `NombreRol` varchar(50) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Permisos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`Permisos`)),
  `FechaCreacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`RolID`, `NombreRol`, `Descripcion`, `Permisos`, `FechaCreacion`) VALUES
(1, 'Administrador', 'Acceso completo al sistema', '{\"usuarios\": true, \"productos\": true, \"ventas\": true, \"reportes\": true, \"configuracion\": true, \"inventario\": true}', '2026-02-06 23:01:30'),
(2, 'Gerente', 'Gestión de productos, ventas y reportes', '{\"usuarios\": false, \"productos\": true, \"ventas\": true, \"reportes\": true, \"configuracion\": false, \"inventario\": true}', '2026-02-06 23:01:30'),
(3, 'Vendedor', 'Realizar ventas y consultar productos', '{\"usuarios\": false, \"productos\": \"read\", \"ventas\": true, \"reportes\": \"read\", \"configuracion\": false, \"inventario\": \"read\"}', '2026-02-06 23:01:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `UsuarioID` int(11) NOT NULL,
  `NombreCompleto` varchar(100) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `Username` varchar(50) NOT NULL,
  `PasswordHash` varchar(255) NOT NULL,
  `RolID` int(11) NOT NULL,
  `Activo` tinyint(1) NOT NULL DEFAULT 1,
  `FechaCreacion` datetime NOT NULL DEFAULT current_timestamp(),
  `UltimoAcceso` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`UsuarioID`, `NombreCompleto`, `Email`, `Username`, `PasswordHash`, `RolID`, `Activo`, `FechaCreacion`, `UltimoAcceso`) VALUES
(1, 'Administrador del Sistema', 'admin@sanjoseboots.com', 'admin', '$2a$10$5ULwTtzJegPldP/yFLBSkOT1v7omEKIz5lvNySZlSoZxt.2/4pnly', 1, 1, '2026-02-06 23:01:30', '2026-02-10 14:43:07');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `VentaID` int(11) NOT NULL,
  `NumeroTicket` varchar(20) NOT NULL,
  `FechaVenta` datetime NOT NULL DEFAULT current_timestamp(),
  `UsuarioID` int(11) NOT NULL,
  `Subtotal` decimal(10,2) NOT NULL,
  `Descuento` decimal(10,2) NOT NULL DEFAULT 0.00,
  `IVA` decimal(10,2) NOT NULL,
  `Total` decimal(10,2) NOT NULL,
  `MetodoPago` varchar(20) NOT NULL,
  `Estado` varchar(20) NOT NULL DEFAULT 'COMPLETADA',
  `Observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ventas`
--

INSERT INTO `ventas` (`VentaID`, `NumeroTicket`, `FechaVenta`, `UsuarioID`, `Subtotal`, `Descuento`, `IVA`, `Total`, `MetodoPago`, `Estado`, `Observaciones`) VALUES
(1, 'TICK-20250207-0003', '2026-02-07 08:34:32', 1, 1800.00, 0.00, 288.00, 2088.00, 'EFECTIVO', 'COMPLETADA', 'Venta de prueba'),
(2, 'TKT-20260207-642210', '2026-02-07 19:04:02', 1, 1200.00, 0.00, 192.00, 1392.00, 'Efectivo', 'COMPLETADA', NULL),
(3, 'TKT-20260207-693452', '2026-02-07 19:04:53', 1, 1500.00, 0.00, 240.00, 1740.00, 'Efectivo', 'COMPLETADA', NULL),
(4, 'TKT-20260207-795599', '2026-02-07 19:23:15', 1, 3600.00, 0.00, 576.00, 4176.00, 'Efectivo', 'COMPLETADA', NULL),
(5, 'TKT-FINAL-TEST', '2026-02-07 23:23:52', 1, 100.00, 0.00, 16.00, 116.00, 'Efectivo', 'COMPLETADA', 'Prueba final'),
(6, 'TKT-PRUEBA-FINAL', '2026-02-07 23:36:16', 1, 100.00, 0.00, 16.00, 116.00, 'Efectivo', 'COMPLETADA', 'Prueba final del sistema'),
(7, 'TKT-20260208-222871', '2026-02-08 09:40:22', 1, 2400.00, 0.00, 384.00, 2784.00, 'Efectivo', 'COMPLETADA', NULL),
(8, 'TKT-20260208-396352', '2026-02-08 22:13:16', 1, 1200.00, 0.00, 192.00, 1392.00, 'Efectivo', 'COMPLETADA', NULL),
(9, 'TKT-20260209-515910', '2026-02-09 21:01:55', 1, 1850.00, 0.00, 296.00, 2146.00, 'Efectivo', 'COMPLETADA', NULL);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`CategoriaID`),
  ADD UNIQUE KEY `NombreCategoria` (`NombreCategoria`),
  ADD KEY `idx_activo` (`Activo`);

--
-- Indices de la tabla `configuracion`
--
ALTER TABLE `configuracion`
  ADD PRIMARY KEY (`ConfiguracionID`),
  ADD UNIQUE KEY `Clave` (`Clave`),
  ADD KEY `idx_clave` (`Clave`);

--
-- Indices de la tabla `detalleventas`
--
ALTER TABLE `detalleventas`
  ADD PRIMARY KEY (`DetalleVentaID`),
  ADD KEY `idx_venta` (`VentaID`),
  ADD KEY `idx_variante` (`VarianteID`);

--
-- Indices de la tabla `movimientosinventario`
--
ALTER TABLE `movimientosinventario`
  ADD PRIMARY KEY (`MovimientoID`),
  ADD KEY `UsuarioID` (`UsuarioID`),
  ADD KEY `idx_variante` (`VarianteID`),
  ADD KEY `idx_tipo` (`TipoMovimiento`),
  ADD KEY `idx_fecha` (`FechaMovimiento`);

--
-- Indices de la tabla `productoimagenes`
--
ALTER TABLE `productoimagenes`
  ADD PRIMARY KEY (`ImagenID`),
  ADD KEY `idx_producto` (`ProductoID`),
  ADD KEY `idx_principal` (`EsPrincipal`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`ProductoID`),
  ADD UNIQUE KEY `CodigoProducto` (`CodigoProducto`),
  ADD KEY `ProveedorID` (`ProveedorID`),
  ADD KEY `idx_codigo` (`CodigoProducto`),
  ADD KEY `idx_categoria` (`CategoriaID`),
  ADD KEY `idx_activo` (`Activo`),
  ADD KEY `idx_nombre` (`NombreProducto`);

--
-- Indices de la tabla `productovariantes`
--
ALTER TABLE `productovariantes`
  ADD PRIMARY KEY (`VarianteID`),
  ADD UNIQUE KEY `CodigoVariante` (`CodigoVariante`),
  ADD KEY `idx_producto` (`ProductoID`),
  ADD KEY `idx_codigo` (`CodigoVariante`),
  ADD KEY `idx_stock` (`StockActual`),
  ADD KEY `idx_activo` (`Activo`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`ProveedorID`),
  ADD KEY `idx_activo` (`Activo`),
  ADD KEY `idx_nombre` (`NombreProveedor`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`RolID`),
  ADD UNIQUE KEY `NombreRol` (`NombreRol`),
  ADD KEY `idx_nombrerol` (`NombreRol`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`UsuarioID`),
  ADD UNIQUE KEY `Email` (`Email`),
  ADD UNIQUE KEY `Username` (`Username`),
  ADD KEY `RolID` (`RolID`),
  ADD KEY `idx_email` (`Email`),
  ADD KEY `idx_username` (`Username`),
  ADD KEY `idx_activo` (`Activo`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`VentaID`),
  ADD UNIQUE KEY `NumeroTicket` (`NumeroTicket`),
  ADD KEY `idx_ticket` (`NumeroTicket`),
  ADD KEY `idx_fecha` (`FechaVenta`),
  ADD KEY `idx_estado` (`Estado`),
  ADD KEY `idx_usuario` (`UsuarioID`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `CategoriaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `configuracion`
--
ALTER TABLE `configuracion`
  MODIFY `ConfiguracionID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `detalleventas`
--
ALTER TABLE `detalleventas`
  MODIFY `DetalleVentaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `movimientosinventario`
--
ALTER TABLE `movimientosinventario`
  MODIFY `MovimientoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `productoimagenes`
--
ALTER TABLE `productoimagenes`
  MODIFY `ImagenID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `ProductoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `productovariantes`
--
ALTER TABLE `productovariantes`
  MODIFY `VarianteID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  MODIFY `ProveedorID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `RolID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `UsuarioID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `VentaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `detalleventas`
--
ALTER TABLE `detalleventas`
  ADD CONSTRAINT `detalleventas_ibfk_1` FOREIGN KEY (`VentaID`) REFERENCES `ventas` (`VentaID`),
  ADD CONSTRAINT `detalleventas_ibfk_2` FOREIGN KEY (`VarianteID`) REFERENCES `productovariantes` (`VarianteID`);

--
-- Filtros para la tabla `movimientosinventario`
--
ALTER TABLE `movimientosinventario`
  ADD CONSTRAINT `movimientosinventario_ibfk_1` FOREIGN KEY (`VarianteID`) REFERENCES `productovariantes` (`VarianteID`),
  ADD CONSTRAINT `movimientosinventario_ibfk_2` FOREIGN KEY (`UsuarioID`) REFERENCES `usuarios` (`UsuarioID`);

--
-- Filtros para la tabla `productoimagenes`
--
ALTER TABLE `productoimagenes`
  ADD CONSTRAINT `productoimagenes_ibfk_1` FOREIGN KEY (`ProductoID`) REFERENCES `productos` (`ProductoID`) ON DELETE CASCADE;

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`CategoriaID`) REFERENCES `categorias` (`CategoriaID`),
  ADD CONSTRAINT `productos_ibfk_2` FOREIGN KEY (`ProveedorID`) REFERENCES `proveedores` (`ProveedorID`);

--
-- Filtros para la tabla `productovariantes`
--
ALTER TABLE `productovariantes`
  ADD CONSTRAINT `productovariantes_ibfk_1` FOREIGN KEY (`ProductoID`) REFERENCES `productos` (`ProductoID`);

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`RolID`) REFERENCES `roles` (`RolID`);

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`UsuarioID`) REFERENCES `usuarios` (`UsuarioID`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
