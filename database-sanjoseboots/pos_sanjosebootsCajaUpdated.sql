-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 14-03-2026 a las 01:37:50
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
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AbrirCaja` (IN `p_UsuarioID` INT, IN `p_MontoInicial` DECIMAL(10,2), IN `p_Notas` TEXT)   BEGIN
    DECLARE v_CajaAbierta INT DEFAULT 0;
    SELECT COUNT(*) INTO v_CajaAbierta FROM Cajas WHERE UsuarioID=p_UsuarioID AND Estado='Abierta';
    IF v_CajaAbierta > 0 THEN
        SELECT 'Ya tienes una caja abierta' AS Mensaje, 0 AS CajaID, 'ERROR' AS Estado;
    ELSE
        INSERT INTO Cajas(UsuarioID,MontoInicial,NotasApertura,Estado) VALUES(p_UsuarioID,p_MontoInicial,p_Notas,'Abierta');
        SELECT 'Caja abierta exitosamente' AS Mensaje, LAST_INSERT_ID() AS CajaID, 'SUCCESS' AS Estado;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ActualizarProducto` (IN `p_ProductoID` INT, IN `p_CodigoProducto` VARCHAR(50), IN `p_NombreProducto` VARCHAR(150), IN `p_Descripcion` TEXT, IN `p_CategoriaID` INT, IN `p_PrecioBase` DECIMAL(10,2), IN `p_ProveedorID` INT, IN `p_Activo` TINYINT)   BEGIN
    UPDATE Productos SET CodigoProducto=p_CodigoProducto, NombreProducto=p_NombreProducto,
        Descripcion=p_Descripcion, CategoriaID=p_CategoriaID, PrecioBase=p_PrecioBase,
        ProveedorID=p_ProveedorID, Activo=p_Activo WHERE ProductoID=p_ProductoID;
    SELECT ROW_COUNT() AS FilasAfectadas;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ActualizarTotalesCaja` (IN `p_CajaID` INT)   BEGIN
    UPDATE Cajas SET
        TotalVentasEfectivo=COALESCE((SELECT SUM(Total) FROM ventas WHERE CajaID=p_CajaID AND MetodoPago='Efectivo'),0),
        TotalVentasTarjeta=COALESCE((SELECT SUM(Total) FROM ventas WHERE CajaID=p_CajaID AND MetodoPago='Tarjeta'),0),
        TotalVentasTransferencia=COALESCE((SELECT SUM(Total) FROM ventas WHERE CajaID=p_CajaID AND MetodoPago='Transferencia'),0),
        TotalVentas=COALESCE((SELECT SUM(Total) FROM ventas WHERE CajaID=p_CajaID),0),
        NumeroVentas=COALESCE((SELECT COUNT(*) FROM ventas WHERE CajaID=p_CajaID),0)
    WHERE CajaID=p_CajaID;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_AnalisisVariantesMasVendidas` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME, IN `p_CategoriaID` INT)   BEGIN
    SELECT p.ProductoID, p.NombreProducto, c.NombreCategoria,
        pv.VarianteID, pv.CodigoVariante, pv.Talla, pv.Color,
        SUM(dv.Cantidad) AS TotalVendido, SUM(dv.Subtotal) AS TotalIngresos,
        COUNT(DISTINCT dv.VentaID) AS NumeroVentas, pv.StockActual AS StockDisponible
    FROM detalleventas dv
    INNER JOIN ventas v ON dv.VentaID=v.VentaID
    INNER JOIN productovariantes pv ON dv.VarianteID=pv.VarianteID
    INNER JOIN productos p ON pv.ProductoID=p.ProductoID
    INNER JOIN categorias c ON p.CategoriaID=c.CategoriaID
    WHERE v.Estado='COMPLETADA'
      AND (p_FechaInicio IS NULL OR v.FechaVenta>=p_FechaInicio)
      AND (p_FechaFin IS NULL OR v.FechaVenta<=p_FechaFin)
      AND (p_CategoriaID IS NULL OR p.CategoriaID=p_CategoriaID)
    GROUP BY pv.VarianteID ORDER BY TotalVendido DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_BuscarProductoPOS` (IN `p_Busqueda` VARCHAR(100))   BEGIN
    SELECT p.ProductoID, p.NombreProducto, p.CodigoProducto, c.NombreCategoria,
        pv.VarianteID, pv.CodigoVariante, pv.Talla, pv.Color, pv.Estilo,
        pv.PrecioVenta, pv.StockActual
    FROM productos p
    INNER JOIN productovariantes pv ON p.ProductoID=pv.ProductoID
    INNER JOIN categorias c ON p.CategoriaID=c.CategoriaID
    WHERE p.Activo=1 AND pv.Activo=1 AND pv.StockActual>0
      AND (p.NombreProducto LIKE CONCAT('%',p_Busqueda,'%')
        OR p.CodigoProducto LIKE CONCAT('%',p_Busqueda,'%')
        OR pv.CodigoVariante LIKE CONCAT('%',p_Busqueda,'%'))
    ORDER BY p.NombreProducto, pv.Talla;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CancelarVenta` (IN `p_VentaID` INT, IN `p_UsuarioID` INT, IN `p_Motivo` TEXT)   BEGIN
    DECLARE v_Estado VARCHAR(20);
    SELECT Estado INTO v_Estado FROM ventas WHERE VentaID=p_VentaID;
    IF v_Estado IS NULL THEN
        SELECT 'Venta no encontrada' AS Mensaje, 'ERROR' AS Estado;
    ELSEIF v_Estado='CANCELADA' THEN
        SELECT 'La venta ya esta cancelada' AS Mensaje, 'ERROR' AS Estado;
    ELSE
        UPDATE ventas SET Estado='CANCELADA',
            Observaciones=CONCAT(IFNULL(Observaciones,''),' | Cancelada: ',p_Motivo)
        WHERE VentaID=p_VentaID;
        UPDATE productovariantes pv INNER JOIN detalleventas dv ON pv.VarianteID=dv.VarianteID
        SET pv.StockActual=pv.StockActual+dv.Cantidad WHERE dv.VentaID=p_VentaID;
        SELECT 'Venta cancelada exitosamente' AS Mensaje, 'SUCCESS' AS Estado;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CerrarCaja` (IN `p_CajaID` INT, IN `p_MontoFinalDeclarado` DECIMAL(10,2), IN `p_Notas` TEXT)   BEGIN
    DECLARE v_MontoInicial       DECIMAL(10,2) DEFAULT 0;
    DECLARE v_TotalEfectivo      DECIMAL(10,2) DEFAULT 0;
    DECLARE v_DeberiaHaber       DECIMAL(10,2) DEFAULT 0;

    SELECT MontoInicial,
           COALESCE(TotalVentasEfectivo, 0)
    INTO   v_MontoInicial, v_TotalEfectivo
    FROM   Cajas
    WHERE  CajaID = p_CajaID AND Estado = 'Abierta';

    IF v_MontoInicial IS NULL THEN
        SELECT 'Caja no encontrada o ya cerrada' AS Mensaje, 'ERROR' AS Estado;
    ELSE
        -- Solo cuenta el efectivo físico
        SET v_DeberiaHaber = v_MontoInicial + v_TotalEfectivo;

        UPDATE Cajas SET
            FechaHoraCierre     = NOW(),
            MontoFinalDeclarado = p_MontoFinalDeclarado,
            MontoFinalReal      = v_DeberiaHaber,
            Diferencia          = p_MontoFinalDeclarado - v_DeberiaHaber,
            NotasCierre         = p_Notas,
            Estado              = 'Cerrada'
        WHERE CajaID = p_CajaID;

        SELECT 'Caja cerrada exitosamente'              AS Mensaje,
               'SUCCESS'                               AS Estado,
               v_DeberiaHaber                          AS MontoFinalReal,
               p_MontoFinalDeclarado - v_DeberiaHaber  AS Diferencia;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CrearProducto` (IN `p_CodigoProducto` VARCHAR(50), IN `p_NombreProducto` VARCHAR(150), IN `p_Descripcion` TEXT, IN `p_CategoriaID` INT, IN `p_PrecioBase` DECIMAL(10,2), IN `p_ProveedorID` INT, IN `p_Activo` TINYINT, OUT `p_ProductoID` INT)   BEGIN
    INSERT INTO Productos(CodigoProducto,NombreProducto,Descripcion,CategoriaID,PrecioBase,ProveedorID,Activo)
    VALUES(p_CodigoProducto,p_NombreProducto,p_Descripcion,p_CategoriaID,p_PrecioBase,p_ProveedorID,p_Activo);
    SET p_ProductoID=LAST_INSERT_ID();
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_CrearVariante` (IN `p_ProductoID` INT, IN `p_CodigoVariante` VARCHAR(50), IN `p_Talla` VARCHAR(10), IN `p_Color` VARCHAR(30), IN `p_Estilo` VARCHAR(50), IN `p_PrecioVenta` DECIMAL(10,2), IN `p_StockActual` INT, IN `p_StockMinimo` INT, IN `p_Activo` TINYINT, OUT `p_VarianteID` INT)   BEGIN
    INSERT INTO ProductoVariantes(ProductoID,CodigoVariante,Talla,Color,Estilo,PrecioVenta,StockActual,StockMinimo,Activo)
    VALUES(p_ProductoID,p_CodigoVariante,p_Talla,p_Color,p_Estilo,p_PrecioVenta,p_StockActual,p_StockMinimo,p_Activo);
    SET p_VarianteID=LAST_INSERT_ID();
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_DashboardKPIs` ()   BEGIN
    SELECT
        COALESCE(SUM(CASE WHEN DATE(FechaVenta)=CURDATE() AND Estado='COMPLETADA' THEN Total ELSE 0 END),0) AS TotalVentasHoy,
        COALESCE(SUM(CASE WHEN DATE(FechaVenta)=CURDATE() AND Estado='COMPLETADA' THEN 1 ELSE 0 END),0) AS NumeroVentasHoy,
        COALESCE(AVG(CASE WHEN DATE(FechaVenta)=CURDATE() AND Estado='COMPLETADA' THEN Total END),0) AS TicketPromedioHoy,
        COALESCE(SUM(CASE WHEN MONTH(FechaVenta)=MONTH(CURDATE()) AND YEAR(FechaVenta)=YEAR(CURDATE()) AND Estado='COMPLETADA' THEN Total ELSE 0 END),0) AS TotalVentasMes,
        COALESCE(SUM(CASE WHEN MONTH(FechaVenta)=MONTH(CURDATE()) AND YEAR(FechaVenta)=YEAR(CURDATE()) AND Estado='COMPLETADA' THEN 1 ELSE 0 END),0) AS NumeroVentasMes,
        COALESCE(AVG(CASE WHEN MONTH(FechaVenta)=MONTH(CURDATE()) AND YEAR(FechaVenta)=YEAR(CURDATE()) AND Estado='COMPLETADA' THEN Total END),0) AS TicketPromedioMes,
        (SELECT COUNT(*) FROM productovariantes WHERE StockActual<=StockMinimo AND Activo=1) AS ProductosStockBajo,
        (SELECT COALESCE(SUM(PrecioVenta*StockActual),0) FROM productovariantes WHERE Activo=1) AS ValorTotalInventario,
        (SELECT COUNT(*) FROM productos WHERE Activo=1) AS TotalProductos,
        (SELECT COUNT(*) FROM productovariantes WHERE Activo=1) AS TotalVariantes,
        (SELECT COALESCE(SUM(StockActual),0) FROM productovariantes WHERE Activo=1) AS StockTotal
    FROM ventas;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_HistorialCajas` (IN `p_UsuarioID` INT, IN `p_Limite` INT, IN `p_FechaDesde` DATETIME, IN `p_FechaHasta` DATETIME)   BEGIN
    DECLARE v_Limite INT DEFAULT 100;
    IF p_Limite IS NOT NULL AND p_Limite > 0 THEN
        SET v_Limite = p_Limite;
    END IF;

    SELECT c.CajaID, c.UsuarioID, c.FechaHoraApertura, c.FechaHoraCierre,
           c.MontoInicial, c.MontoFinalDeclarado, c.MontoFinalReal,
           c.TotalVentasEfectivo, c.TotalVentasTarjeta, c.TotalVentasTransferencia,
           c.TotalVentas, c.NumeroVentas, c.Diferencia,
           c.NotasApertura, c.NotasCierre, c.Estado,
           u.NombreCompleto AS NombreUsuario
    FROM Cajas c
    INNER JOIN Usuarios u ON c.UsuarioID = u.UsuarioID
    WHERE (p_UsuarioID  IS NULL OR c.UsuarioID = p_UsuarioID)
      AND (p_FechaDesde IS NULL OR c.FechaHoraApertura >= p_FechaDesde)
      AND (p_FechaHasta IS NULL OR c.FechaHoraApertura <= p_FechaHasta)
    ORDER BY c.FechaHoraApertura DESC
    LIMIT v_Limite;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerCajaActual` (IN `p_UsuarioID` INT)   BEGIN
    SELECT c.*, u.NombreCompleto AS NombreUsuario
    FROM Cajas c INNER JOIN Usuarios u ON c.UsuarioID=u.UsuarioID
    WHERE c.Estado='Abierta' AND (p_UsuarioID IS NULL OR c.UsuarioID=p_UsuarioID)
    ORDER BY c.FechaHoraApertura DESC LIMIT 1;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerDetalleVenta` (IN `p_VentaID` INT)   BEGIN
    SELECT v.VentaID, v.NumeroTicket, v.FechaVenta, v.Subtotal, v.Descuento,
        v.IVA, v.Total, v.MetodoPago, v.Estado, v.Observaciones,
        u.NombreCompleto AS NombreVendedor
    FROM ventas v INNER JOIN usuarios u ON v.UsuarioID=u.UsuarioID WHERE v.VentaID=p_VentaID;
    SELECT dv.DetalleVentaID, dv.Cantidad, dv.PrecioUnitario, dv.Descuento, dv.Subtotal,
        pv.CodigoVariante, pv.Talla, pv.Color, pv.Estilo, p.NombreProducto, p.CodigoProducto
    FROM detalleventas dv
    INNER JOIN productovariantes pv ON dv.VarianteID=pv.VarianteID
    INNER JOIN productos p ON pv.ProductoID=p.ProductoID
    WHERE dv.VentaID=p_VentaID;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerHistorialMovimientos` (IN `p_VarianteID` INT, IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME)   BEGIN
    SELECT m.*, u.NombreCompleto AS NombreUsuario,
        pv.CodigoVariante, pv.Talla, pv.Color, p.NombreProducto
    FROM movimientosinventario m
    INNER JOIN usuarios u ON m.UsuarioID=u.UsuarioID
    INNER JOIN productovariantes pv ON m.VarianteID=pv.VarianteID
    INNER JOIN productos p ON pv.ProductoID=p.ProductoID
    WHERE (p_VarianteID IS NULL OR m.VarianteID=p_VarianteID)
      AND (p_FechaInicio IS NULL OR m.FechaMovimiento>=p_FechaInicio)
      AND (p_FechaFin IS NULL OR m.FechaMovimiento<=p_FechaFin)
    ORDER BY m.FechaMovimiento DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerMovimientosCaja` (IN `p_CajaID` INT)   BEGIN
    SELECT mc.MovimientoID, mc.Tipo, mc.Monto, mc.Concepto,
           mc.Notas, mc.FechaHora,
           u.Username AS Cajero, u.NombreCompleto
    FROM MovimientosCaja mc
    INNER JOIN Usuarios u ON mc.UsuarioID = u.UsuarioID
    WHERE mc.CajaID = p_CajaID
    ORDER BY mc.FechaHora ASC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerProductoPorID` (IN `p_ProductoID` INT)   BEGIN
    SELECT p.*, c.NombreCategoria, COALESCE(pr.NombreProveedor,'') AS NombreProveedor
    FROM productos p INNER JOIN categorias c ON p.CategoriaID=c.CategoriaID
    LEFT JOIN proveedores pr ON p.ProveedorID=pr.ProveedorID WHERE p.ProductoID=p_ProductoID;
    SELECT pv.VarianteID, pv.CodigoVariante, pv.Talla, pv.Color, pv.Estilo,
        pv.PrecioVenta, pv.StockActual, pv.StockMinimo, pv.Activo, pv.FechaCreacion
    FROM productovariantes pv WHERE pv.ProductoID=p_ProductoID ORDER BY pv.Talla, pv.Color;
    SELECT pi.ImagenID, pi.URLImagen, pi.EsPrincipal, pi.Orden
    FROM productoimagenes pi WHERE pi.ProductoID=p_ProductoID ORDER BY pi.EsPrincipal DESC, pi.Orden;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerProductos` (IN `p_Activo` INT, IN `p_CategoriaID` INT, IN `p_Busqueda` VARCHAR(100))   BEGIN
    SELECT p.ProductoID, p.CodigoProducto, p.NombreProducto, p.Descripcion,
        p.PrecioBase, p.Activo, p.FechaCreacion, p.FechaActualizacion,
        c.NombreCategoria, COALESCE(pr.NombreProveedor,'') AS NombreProveedor,
        COUNT(pv.VarianteID) AS NumeroVariantes,
        COALESCE(SUM(pv.StockActual),0) AS StockTotal,
        MIN(pv.PrecioVenta) AS PrecioMinimo, MAX(pv.PrecioVenta) AS PrecioMaximo
    FROM productos p
    INNER JOIN categorias c ON p.CategoriaID=c.CategoriaID
    LEFT JOIN proveedores pr ON p.ProveedorID=pr.ProveedorID
    LEFT JOIN productovariantes pv ON p.ProductoID=pv.ProductoID AND pv.Activo=1
    WHERE (p_Activo IS NULL OR p.Activo=p_Activo)
      AND (p_CategoriaID IS NULL OR p.CategoriaID=p_CategoriaID)
      AND (p_Busqueda IS NULL OR p.NombreProducto LIKE CONCAT('%',p_Busqueda,'%')
           OR p.CodigoProducto LIKE CONCAT('%',p_Busqueda,'%'))
    GROUP BY p.ProductoID ORDER BY p.NombreProducto;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerProductosStockBajo` ()   BEGIN
    SELECT p.ProductoID, p.NombreProducto, p.CodigoProducto,
        pv.VarianteID, pv.CodigoVariante, pv.Talla, pv.Color,
        pv.StockActual, pv.StockMinimo, (pv.StockMinimo-pv.StockActual) AS Faltante
    FROM productos p INNER JOIN productovariantes pv ON p.ProductoID=pv.ProductoID
    WHERE p.Activo=1 AND pv.Activo=1 AND pv.StockActual<=pv.StockMinimo ORDER BY Faltante DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerUltimoCierre` (IN `p_UsuarioID` INT)   BEGIN
    SELECT c.CajaID, c.FechaHoraApertura, c.FechaHoraCierre,
           c.MontoInicial, c.MontoFinalDeclarado, c.MontoFinalReal,
           c.TotalVentas, c.NumeroVentas, c.Diferencia,
           u.NombreCompleto AS NombreCajero
    FROM Cajas c
    INNER JOIN Usuarios u ON c.UsuarioID = u.UsuarioID
    WHERE c.Estado = 'Cerrada'
      AND (p_UsuarioID IS NULL OR c.UsuarioID = p_UsuarioID)
    ORDER BY c.FechaHoraCierre DESC
    LIMIT 1;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerVentasCaja` (IN `p_CajaID` INT)   BEGIN
    SELECT v.VentaID, v.FechaVenta, v.Total, v.MetodoPago, u.Username AS Cajero
    FROM Ventas v INNER JOIN Usuarios u ON v.UsuarioID=u.UsuarioID
    WHERE v.CajaID=p_CajaID ORDER BY v.FechaVenta DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ObtenerVentasPorPeriodo` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME, IN `p_UsuarioID` INT, IN `p_Estado` VARCHAR(20))   BEGIN
    SELECT v.VentaID, v.NumeroTicket, v.FechaVenta, v.Subtotal, v.Descuento,
        v.IVA, v.Total, v.MetodoPago, v.Estado, u.NombreCompleto AS NombreVendedor,
        COUNT(dv.DetalleVentaID) AS NumeroProductos
    FROM ventas v INNER JOIN usuarios u ON v.UsuarioID=u.UsuarioID
    LEFT JOIN detalleventas dv ON v.VentaID=dv.VentaID
    WHERE (p_FechaInicio IS NULL OR v.FechaVenta>=p_FechaInicio)
      AND (p_FechaFin IS NULL OR v.FechaVenta<=p_FechaFin)
      AND (p_UsuarioID IS NULL OR v.UsuarioID=p_UsuarioID)
      AND (p_Estado IS NULL OR v.Estado=p_Estado)
    GROUP BY v.VentaID ORDER BY v.FechaVenta DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_RegistrarMovimientoCaja` (IN `p_CajaID` INT, IN `p_UsuarioID` INT, IN `p_Tipo` VARCHAR(20), IN `p_Monto` DECIMAL(10,2), IN `p_Concepto` VARCHAR(200), IN `p_Notas` TEXT)   BEGIN
    DECLARE v_Estado VARCHAR(20);
    SELECT Estado INTO v_Estado FROM Cajas WHERE CajaID = p_CajaID;
    IF v_Estado != 'Abierta' THEN
        SELECT 'La caja no está abierta' AS Mensaje, 'ERROR' AS Estado;
    ELSE
        INSERT INTO MovimientosCaja(CajaID, UsuarioID, Tipo, Monto, Concepto, Notas)
        VALUES (p_CajaID, p_UsuarioID, p_Tipo, p_Monto, p_Concepto, p_Notas);
        SELECT 'Movimiento registrado' AS Mensaje, 'SUCCESS' AS Estado,
               LAST_INSERT_ID() AS MovimientoID;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_RegistrarMovimientoInventario` (IN `p_VarianteID` INT, IN `p_TipoMovimiento` VARCHAR(20), IN `p_Cantidad` INT, IN `p_Referencia` VARCHAR(100), IN `p_Observaciones` TEXT, IN `p_UsuarioID` INT)   BEGIN
    DECLARE v_StockActual INT;
    DECLARE v_StockNuevo INT;
    SELECT StockActual INTO v_StockActual FROM productovariantes WHERE VarianteID=p_VarianteID;
    IF p_TipoMovimiento IN ('ENTRADA','AJUSTE_POSITIVO','DEVOLUCION','CANCELACION') THEN
        SET v_StockNuevo=v_StockActual+p_Cantidad;
    ELSE
        SET v_StockNuevo=v_StockActual-p_Cantidad;
    END IF;
    UPDATE productovariantes SET StockActual=v_StockNuevo WHERE VarianteID=p_VarianteID;
    INSERT INTO movimientosinventario(VarianteID,TipoMovimiento,Cantidad,StockAnterior,StockNuevo,Referencia,Observaciones,UsuarioID)
    VALUES(p_VarianteID,p_TipoMovimiento,p_Cantidad,v_StockActual,v_StockNuevo,p_Referencia,p_Observaciones,p_UsuarioID);
    SELECT LAST_INSERT_ID() AS MovimientoID, v_StockNuevo AS StockNuevo;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_RegistrarVenta` (IN `p_NumeroTicket` VARCHAR(50), IN `p_UsuarioID` INT, IN `p_Subtotal` DECIMAL(10,2), IN `p_Descuento` DECIMAL(10,2), IN `p_IVA` DECIMAL(10,2), IN `p_Total` DECIMAL(10,2), IN `p_MetodoPago` VARCHAR(50), IN `p_Observaciones` TEXT, IN `p_DetallesJSON` JSON, IN `p_CajaID` INT)   proc_label: BEGIN
    DECLARE v_VentaID INT DEFAULT 0;
    DECLARE v_Mensaje VARCHAR(255) DEFAULT '';
    DECLARE v_Error INT DEFAULT 0;
    DECLARE v_DetalleIndex INT DEFAULT 0;
    DECLARE v_TotalDetalles INT DEFAULT 0;
    DECLARE v_VarianteID INT;
    DECLARE v_Cantidad INT;
    DECLARE v_PrecioUnitario DECIMAL(10,2);
    DECLARE v_Descuento DECIMAL(10,2);
    DECLARE v_SubtotalDetalle DECIMAL(10,2);
    DECLARE v_StockActual INT;
    DECLARE v_NombreProducto VARCHAR(200);
    DECLARE v_ColorVariante VARCHAR(50);
    DECLARE v_TallaVariante VARCHAR(20);
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN SET v_Error=1; ROLLBACK; SET v_Mensaje='Error al procesar la venta'; END;
    START TRANSACTION;
    IF p_DetallesJSON IS NULL OR JSON_LENGTH(p_DetallesJSON)=0 THEN
        SELECT 0 AS VentaID, 'No se proporcionaron detalles de venta' AS Mensaje, 'ERROR' AS Estado;
        ROLLBACK; LEAVE proc_label;
    END IF;
    INSERT INTO ventas(NumeroTicket,UsuarioID,FechaVenta,Subtotal,Descuento,IVA,Total,MetodoPago,Estado,Observaciones,CajaID)
    VALUES(p_NumeroTicket,p_UsuarioID,NOW(),p_Subtotal,p_Descuento,p_IVA,p_Total,p_MetodoPago,'COMPLETADA',p_Observaciones,p_CajaID);
    SET v_VentaID=LAST_INSERT_ID();
    SET v_TotalDetalles=JSON_LENGTH(p_DetallesJSON);
    SET v_DetalleIndex=0;
    WHILE v_DetalleIndex < v_TotalDetalles DO
        SET v_VarianteID=CAST(JSON_UNQUOTE(JSON_EXTRACT(p_DetallesJSON,CONCAT('$[',v_DetalleIndex,'].VarianteID'))) AS UNSIGNED);
        SET v_Cantidad=CAST(JSON_UNQUOTE(JSON_EXTRACT(p_DetallesJSON,CONCAT('$[',v_DetalleIndex,'].Cantidad'))) AS UNSIGNED);
        SET v_PrecioUnitario=CAST(JSON_UNQUOTE(JSON_EXTRACT(p_DetallesJSON,CONCAT('$[',v_DetalleIndex,'].PrecioUnitario'))) AS DECIMAL(10,2));
        SET v_Descuento=COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_DetallesJSON,CONCAT('$[',v_DetalleIndex,'].Descuento'))) AS DECIMAL(10,2)),0.00);
        SET v_SubtotalDetalle=(v_Cantidad*v_PrecioUnitario)-v_Descuento;
        SELECT pv.StockActual, p.NombreProducto, pv.Color, pv.Talla
        INTO v_StockActual, v_NombreProducto, v_ColorVariante, v_TallaVariante
        FROM productovariantes pv INNER JOIN productos p ON pv.ProductoID=p.ProductoID
        WHERE pv.VarianteID=v_VarianteID;
        IF v_StockActual < v_Cantidad THEN
            SET v_Mensaje=CONCAT('Stock insuficiente para: ',v_NombreProducto,
                IFNULL(CONCAT(' (',v_ColorVariante,')'),''),
                IFNULL(CONCAT(' Talla ',v_TallaVariante),''),
                '. Disponible: ',v_StockActual,', Solicitado: ',v_Cantidad);
            SELECT 0 AS VentaID, v_Mensaje AS Mensaje, 'ERROR' AS Estado;
            ROLLBACK; LEAVE proc_label;
        END IF;
        INSERT INTO detalleventas(VentaID,VarianteID,Cantidad,PrecioUnitario,Descuento,Subtotal)
        VALUES(v_VentaID,v_VarianteID,v_Cantidad,v_PrecioUnitario,v_Descuento,v_SubtotalDetalle);
        UPDATE productovariantes SET StockActual=StockActual-v_Cantidad WHERE VarianteID=v_VarianteID;
        SET v_DetalleIndex=v_DetalleIndex+1;
    END WHILE;
    IF v_Error=0 THEN
        COMMIT;
        IF p_CajaID IS NOT NULL THEN
            UPDATE Cajas SET
                TotalVentasEfectivo=COALESCE((SELECT SUM(Total) FROM ventas WHERE CajaID=p_CajaID AND MetodoPago='Efectivo'),0),
                TotalVentasTarjeta=COALESCE((SELECT SUM(Total) FROM ventas WHERE CajaID=p_CajaID AND MetodoPago='Tarjeta'),0),
                TotalVentasTransferencia=COALESCE((SELECT SUM(Total) FROM ventas WHERE CajaID=p_CajaID AND MetodoPago='Transferencia'),0),
                TotalVentas=COALESCE((SELECT SUM(Total) FROM ventas WHERE CajaID=p_CajaID),0),
                NumeroVentas=COALESCE((SELECT COUNT(*) FROM ventas WHERE CajaID=p_CajaID),0)
            WHERE CajaID=p_CajaID;
        END IF;
        SELECT v_VentaID AS VentaID, p_NumeroTicket AS NumeroTicket, 'Venta registrada exitosamente' AS Mensaje, 'SUCCESS' AS Estado;
    ELSE
        SELECT 0 AS VentaID, v_Mensaje AS Mensaje, 'ERROR' AS Estado;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteInventarioValorizado` ()   BEGIN
    SELECT p.ProductoID, p.CodigoProducto, p.NombreProducto, c.NombreCategoria,
        pv.VarianteID, pv.CodigoVariante, pv.Talla, pv.Color, pv.Estilo,
        pv.PrecioVenta, pv.StockActual, pv.StockMinimo,
        (pv.PrecioVenta*pv.StockActual) AS ValorInventario,
        CASE WHEN pv.StockActual<=0 THEN 'SIN STOCK'
             WHEN pv.StockActual<=pv.StockMinimo THEN 'STOCK BAJO'
             ELSE 'NORMAL' END AS EstadoStock
    FROM productos p
    INNER JOIN categorias c ON p.CategoriaID=c.CategoriaID
    INNER JOIN productovariantes pv ON p.ProductoID=pv.ProductoID
    WHERE p.Activo=1 AND pv.Activo=1 ORDER BY p.NombreProducto, pv.Talla;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteMetodosPago` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME)   BEGIN
    SELECT MetodoPago, COUNT(*) AS NumeroVentas, SUM(Total) AS TotalVentas, AVG(Total) AS TicketPromedio
    FROM ventas WHERE Estado='COMPLETADA'
      AND (p_FechaInicio IS NULL OR FechaVenta>=p_FechaInicio)
      AND (p_FechaFin IS NULL OR FechaVenta<=p_FechaFin)
    GROUP BY MetodoPago ORDER BY TotalVentas DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteMovimientosInventario` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME, IN `p_TipoMovimiento` VARCHAR(20))   BEGIN
    SELECT m.MovimientoID, m.TipoMovimiento, m.Cantidad, m.StockAnterior, m.StockNuevo,
        m.Referencia, m.Observaciones, m.FechaMovimiento,
        pv.CodigoVariante, pv.Talla, pv.Color, p.NombreProducto, u.NombreCompleto AS NombreUsuario
    FROM movimientosinventario m
    INNER JOIN productovariantes pv ON m.VarianteID=pv.VarianteID
    INNER JOIN productos p ON pv.ProductoID=p.ProductoID
    INNER JOIN usuarios u ON m.UsuarioID=u.UsuarioID
    WHERE (p_FechaInicio IS NULL OR m.FechaMovimiento>=p_FechaInicio)
      AND (p_FechaFin IS NULL OR m.FechaMovimiento<=p_FechaFin)
      AND (p_TipoMovimiento IS NULL OR m.TipoMovimiento=p_TipoMovimiento)
    ORDER BY m.FechaMovimiento DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteProductosMasVendidos` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME, IN `p_Top` INT)   BEGIN
    DECLARE v_Top INT DEFAULT 10;
    IF p_Top IS NOT NULL AND p_Top > 0 THEN SET v_Top=p_Top; END IF;
    SELECT p.ProductoID, p.NombreProducto, p.CodigoProducto, c.NombreCategoria,
        SUM(dv.Cantidad) AS TotalVendido, SUM(dv.Subtotal) AS TotalIngresos,
        COUNT(DISTINCT dv.VentaID) AS NumeroVentas
    FROM detalleventas dv
    INNER JOIN ventas v ON dv.VentaID=v.VentaID
    INNER JOIN productovariantes pv ON dv.VarianteID=pv.VarianteID
    INNER JOIN productos p ON pv.ProductoID=p.ProductoID
    INNER JOIN categorias c ON p.CategoriaID=c.CategoriaID
    WHERE v.Estado='COMPLETADA'
      AND (p_FechaInicio IS NULL OR v.FechaVenta>=p_FechaInicio)
      AND (p_FechaFin IS NULL OR v.FechaVenta<=p_FechaFin)
    GROUP BY p.ProductoID ORDER BY TotalVendido DESC LIMIT v_Top;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteRendimientoVendedores` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME)   BEGIN
    SELECT u.UsuarioID, u.NombreCompleto, u.Username,
        COUNT(v.VentaID) AS NumeroVentas,
        COALESCE(SUM(v.Total),0) AS TotalVendido,
        COALESCE(AVG(v.Total),0) AS TicketPromedio
    FROM usuarios u
    LEFT JOIN ventas v ON u.UsuarioID=v.UsuarioID AND v.Estado='COMPLETADA'
      AND (p_FechaInicio IS NULL OR v.FechaVenta>=p_FechaInicio)
      AND (p_FechaFin IS NULL OR v.FechaVenta<=p_FechaFin)
    WHERE u.Activo=1 GROUP BY u.UsuarioID ORDER BY TotalVendido DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteVentasDiarias` (IN `p_FechaInicio` DATE, IN `p_FechaFin` DATE)   BEGIN
    SELECT DATE(FechaVenta) AS Fecha, COUNT(*) AS NumeroVentas,
        SUM(Total) AS TotalVentas, AVG(Total) AS TicketPromedio
    FROM ventas WHERE Estado='COMPLETADA'
      AND (p_FechaInicio IS NULL OR DATE(FechaVenta)>=p_FechaInicio)
      AND (p_FechaFin IS NULL OR DATE(FechaVenta)<=p_FechaFin)
    GROUP BY DATE(FechaVenta) ORDER BY Fecha;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ReporteVentasPorCategoria` (IN `p_FechaInicio` DATETIME, IN `p_FechaFin` DATETIME)   BEGIN
    SELECT c.CategoriaID, c.NombreCategoria,
        COUNT(DISTINCT v.VentaID) AS NumeroVentas,
        SUM(dv.Cantidad) AS TotalProductosVendidos, SUM(dv.Subtotal) AS TotalIngresos
    FROM categorias c
    INNER JOIN productos p ON c.CategoriaID=p.CategoriaID
    INNER JOIN productovariantes pv ON p.ProductoID=pv.ProductoID
    INNER JOIN detalleventas dv ON pv.VarianteID=dv.VarianteID
    INNER JOIN ventas v ON dv.VentaID=v.VentaID
    WHERE v.Estado='COMPLETADA'
      AND (p_FechaInicio IS NULL OR v.FechaVenta>=p_FechaInicio)
      AND (p_FechaFin IS NULL OR v.FechaVenta<=p_FechaFin)
    GROUP BY c.CategoriaID ORDER BY TotalIngresos DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ResumenCajaCompleto` (IN `p_CajaID` INT)   BEGIN
    -- Datos de la caja
    SELECT c.*, u.NombreCompleto AS NombreCajero
    FROM Cajas c INNER JOIN Usuarios u ON c.UsuarioID = u.UsuarioID
    WHERE c.CajaID = p_CajaID;

    -- Ventas del turno
    SELECT v.VentaID, v.NumeroTicket, v.FechaVenta,
           v.Total, v.MetodoPago, v.Estado,
           u2.Username AS Cajero
    FROM ventas v
    INNER JOIN Usuarios u2 ON v.UsuarioID = u2.UsuarioID
    WHERE v.CajaID = p_CajaID AND v.Estado = 'COMPLETADA'
    ORDER BY v.FechaVenta ASC;

    -- Movimientos extra (entradas/salidas)
    SELECT mc.MovimientoID, mc.Tipo, mc.Monto, mc.Concepto,
           mc.Notas, mc.FechaHora, u3.Username AS Cajero
    FROM MovimientosCaja mc
    INNER JOIN Usuarios u3 ON mc.UsuarioID = u3.UsuarioID
    WHERE mc.CajaID = p_CajaID
    ORDER BY mc.FechaHora ASC;

    -- Totales por método de pago
    SELECT
        COALESCE(SUM(CASE WHEN MetodoPago='Efectivo'       THEN Total ELSE 0 END),0) AS TotalEfectivo,
        COALESCE(SUM(CASE WHEN MetodoPago='Tarjeta'        THEN Total ELSE 0 END),0) AS TotalTarjeta,
        COALESCE(SUM(CASE WHEN MetodoPago='Transferencia'  THEN Total ELSE 0 END),0) AS TotalTransferencia,
        COALESCE(SUM(Total),0) AS TotalVentas,
        COUNT(*) AS NumeroVentas
    FROM ventas
    WHERE CajaID = p_CajaID AND Estado = 'COMPLETADA';
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ResumenVentasDia` (IN `p_Fecha` DATE)   BEGIN
    SELECT COUNT(*) AS TotalVentas, COALESCE(SUM(Total),0) AS TotalIngresos,
        COALESCE(AVG(Total),0) AS TicketPromedio,
        COALESCE(SUM(CASE WHEN MetodoPago='Efectivo' THEN Total ELSE 0 END),0) AS TotalEfectivo,
        COALESCE(SUM(CASE WHEN MetodoPago='Tarjeta' THEN Total ELSE 0 END),0) AS TotalTarjeta,
        COALESCE(SUM(CASE WHEN MetodoPago='Transferencia' THEN Total ELSE 0 END),0) AS TotalTransferencia
    FROM ventas WHERE DATE(FechaVenta)=p_Fecha AND Estado='COMPLETADA';
    SELECT HOUR(FechaVenta) AS Hora, COUNT(*) AS Ventas, SUM(Total) AS Total
    FROM ventas WHERE DATE(FechaVenta)=p_Fecha AND Estado='COMPLETADA'
    GROUP BY HOUR(FechaVenta) ORDER BY Hora;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_TopProductosVendidos` ()   BEGIN
    SELECT p.NombreProducto, SUM(dv.Cantidad) AS TotalVendido, SUM(dv.Subtotal) AS TotalIngresos
    FROM detalleventas dv
    INNER JOIN ventas v ON dv.VentaID=v.VentaID
    INNER JOIN productovariantes pv ON dv.VarianteID=pv.VarianteID
    INNER JOIN productos p ON pv.ProductoID=p.ProductoID
    WHERE v.Estado='COMPLETADA'
    GROUP BY p.ProductoID ORDER BY TotalVendido DESC LIMIT 5;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cajas`
--

CREATE TABLE `cajas` (
  `CajaID` int(11) NOT NULL,
  `UsuarioID` int(11) NOT NULL,
  `FechaHoraApertura` datetime NOT NULL DEFAULT current_timestamp(),
  `FechaHoraCierre` datetime DEFAULT NULL,
  `MontoInicial` decimal(10,2) NOT NULL DEFAULT 0.00,
  `MontoFinalDeclarado` decimal(10,2) DEFAULT NULL,
  `MontoFinalReal` decimal(10,2) DEFAULT NULL,
  `TotalVentasEfectivo` decimal(10,2) NOT NULL DEFAULT 0.00,
  `TotalVentasTarjeta` decimal(10,2) NOT NULL DEFAULT 0.00,
  `TotalVentasTransferencia` decimal(10,2) NOT NULL DEFAULT 0.00,
  `TotalVentas` decimal(10,2) NOT NULL DEFAULT 0.00,
  `NumeroVentas` int(11) NOT NULL DEFAULT 0,
  `Diferencia` decimal(10,2) DEFAULT NULL,
  `NotasApertura` text DEFAULT NULL,
  `NotasCierre` text DEFAULT NULL,
  `Estado` enum('Abierta','Cerrada') NOT NULL DEFAULT 'Abierta'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `cajas`
--

INSERT INTO `cajas` (`CajaID`, `UsuarioID`, `FechaHoraApertura`, `FechaHoraCierre`, `MontoInicial`, `MontoFinalDeclarado`, `MontoFinalReal`, `TotalVentasEfectivo`, `TotalVentasTarjeta`, `TotalVentasTransferencia`, `TotalVentas`, `NumeroVentas`, `Diferencia`, `NotasApertura`, `NotasCierre`, `Estado`) VALUES
(1, 1, '2026-03-11 18:34:06', '2026-03-11 18:36:38', 500.00, 500.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0, 0.00, NULL, NULL, 'Cerrada'),
(2, 2, '2026-03-11 18:36:55', '2026-03-11 18:37:08', 500.00, 500.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0, 0.00, NULL, NULL, 'Cerrada'),
(3, 2, '2026-03-11 18:50:09', '2026-03-11 18:51:15', 500.00, 10940.00, 10940.00, 10440.00, 0.00, 0.00, 10440.00, 1, 0.00, NULL, NULL, 'Cerrada'),
(4, 1, '2026-03-11 18:51:33', '2026-03-12 11:27:55', 10540.00, 10540.00, 10540.00, 0.00, 0.00, 0.00, 0.00, 0, 0.00, NULL, NULL, 'Cerrada'),
(5, 1, '2026-03-12 11:32:32', '2026-03-12 11:46:44', 500.00, 1022.00, 5082.00, 1508.00, 986.00, 2088.00, 4582.00, 4, -4060.00, NULL, NULL, 'Cerrada'),
(6, 1, '2026-03-13 17:06:53', '2026-03-13 17:59:36', 500.00, NULL, NULL, 1740.00, 986.00, 1160.00, 3886.00, 3, NULL, NULL, 'Cerrada manualmente por error de sistema', 'Cerrada'),
(7, 1, '2026-03-13 18:00:54', '2026-03-13 18:12:39', 0.00, 650.00, 4477.60, 649.60, 1740.00, 2088.00, 4477.60, 3, -3827.60, '', NULL, 'Cerrada'),
(8, 1, '2026-03-13 18:13:15', '2026-03-13 18:14:51', 500.00, 500.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0, 0.00, '', NULL, 'Cerrada'),
(9, 1, '2026-03-13 18:24:27', '2026-03-13 18:36:38', 500.00, 500.00, 500.00, 0.00, 0.00, 0.00, 0.00, 0, 0.00, '', NULL, 'Cerrada');

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
(3, 'FORMATO_TICKET', 'TICK-{YYYY}{MM}{DD}-{NNNN}', 'Formato para numero de ticket', '2026-02-06 23:01:31'),
(4, 'NOMBRE_TIENDA', 'San Jose Boots', 'Nombre de la tienda', '2026-02-06 23:01:31'),
(5, 'DIRECCION_TIENDA', 'Aguascalientes, Mexico', 'Direccion de la tienda', '2026-02-06 23:01:31'),
(6, 'TELEFONO_TIENDA', '449-123-4567', 'Telefono de contacto', '2026-02-06 23:01:31'),
(7, 'EMAIL_TIENDA', 'contacto@sanjoseboots.com', 'Email de contacto', '2026-02-06 23:01:31'),
(8, 'STOCK_MINIMO_ALERTA', '5', 'Cantidad minima para alertar stock bajo', '2026-02-06 23:01:31'),
(9, 'DIAS_REPORTE_VENTAS', '30', 'Dias a mostrar en reportes de ventas', '2026-02-06 23:01:31');

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
(10, 9, 8, 1, 1200.00, 0.00, 1200.00),
(11, 10, 7, 1, 650.00, 0.00, 650.00),
(12, 11, 7, 1, 650.00, 0.00, 650.00),
(13, 12, 7, 1, 550.00, 0.00, 550.00),
(14, 17, 7, 1, 650.00, 0.00, 650.00),
(15, 18, 7, 1, 650.00, 0.00, 650.00),
(16, 19, 7, 1, 650.00, 0.00, 650.00),
(17, 20, 32, 1, 850.00, 0.00, 850.00),
(18, 21, 26, 1, 280.00, 0.00, 280.00),
(19, 22, 13, 5, 1000.00, 0.00, 5000.00),
(20, 23, 9, 8, 550.00, 0.00, 4400.00),
(21, 24, 4, 6, 450.00, 0.00, 2700.00),
(22, 25, 21, 6, 1500.00, 0.00, 9000.00),
(23, 26, 32, 1, 850.00, 0.00, 850.00),
(24, 27, 1, 1, 1800.00, 0.00, 1800.00),
(25, 28, 5, 1, 450.00, 0.00, 450.00),
(26, 29, 31, 1, 850.00, 0.00, 850.00),
(27, 30, 31, 1, 850.00, 0.00, 850.00),
(28, 31, 13, 1, 1000.00, 0.00, 1000.00),
(29, 32, 22, 1, 1500.00, 0.00, 1500.00),
(30, 33, 27, 2, 280.00, 0.00, 560.00),
(31, 34, 21, 1, 1500.00, 0.00, 1500.00),
(32, 35, 1, 1, 1800.00, 0.00, 1800.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientoscaja`
--

CREATE TABLE `movimientoscaja` (
  `MovimientoID` int(11) NOT NULL,
  `CajaID` int(11) NOT NULL,
  `UsuarioID` int(11) NOT NULL,
  `Tipo` enum('ENTRADA','SALIDA','DEVOLUCION','AJUSTE') NOT NULL,
  `Monto` decimal(10,2) NOT NULL,
  `Concepto` varchar(200) NOT NULL,
  `Notas` text DEFAULT NULL,
  `FechaHora` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `movimientoscaja`
--

INSERT INTO `movimientoscaja` (`MovimientoID`, `CajaID`, `UsuarioID`, `Tipo`, `Monto`, `Concepto`, `Notas`, `FechaHora`) VALUES
(1, 7, 1, 'ENTRADA', 500.00, 'Deposito de Gerencia', 'lo pago la patrona', '2026-03-13 18:10:52'),
(2, 7, 1, 'SALIDA', 20.00, 'Compra de insumos', 'una coca para el chalan', '2026-03-13 18:11:16');

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
(1, 'BOT-001', 'Botas Vaqueras Clasicas', 'Botas de piel genuina estilo tradicional', 1, 1500.00, 1, 1, '2026-02-06 23:01:30', '2026-02-06 23:01:30'),
(2, 'CAM-001', 'Camisa Western Cuadros', 'Camisa de algodon con diseno a cuadros', 2, 350.00, 2, 1, '2026-02-06 23:01:31', '2026-02-06 23:01:31'),
(3, 'PAN-001', 'Jeans Vaqueros Corte Clasico', 'Jeans de mezclilla resistente', 3, 450.00, 2, 1, '2026-02-06 23:01:31', '2026-02-06 23:01:31'),
(4, 'CIN-001', 'Cinturon Piel Grabada', 'Cinturon de piel con hebilla plateada', 4, 280.00, 3, 1, '2026-02-06 23:01:31', '2026-02-06 23:01:31'),
(5, 'SOM-001', 'Sombrero Texano Premium', 'Sombrero de fieltro de alta calidad', 5, 800.00, 1, 1, '2026-02-06 23:01:31', '2026-02-06 23:01:31'),
(6, 'ACC-001', 'Billetera Piel Genuina', 'Billetera con multiples compartimentos', 6, 200.00, 3, 1, '2026-02-06 23:01:31', '2026-02-06 23:01:31'),
(7, 'CHA-001', 'Chamarra Mezclilla Clasica', 'Chamarra de mezclilla resistente', 7, 650.00, 2, 1, '2026-02-06 23:01:31', '2026-02-06 23:01:31'),
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
(1, 1, 'BOT-001-25-NEG', '25', 'Negro', 'Clasico', 1800.00, 0, 2, 1, '2026-02-06 23:01:31'),
(2, 1, 'BOT-001-26-NEG', '26', 'Negro', 'Clasico', 1800.00, 7, 2, 1, '2026-02-06 23:01:31'),
(3, 1, 'BOT-001-27-CAF', '27', 'Cafe', 'Clasico', 1800.00, 6, 2, 1, '2026-02-06 23:01:31'),
(4, 2, 'CAM-001-M-AZ', 'M', 'Azul', 'Cuadros', 450.00, 6, 3, 1, '2026-02-06 23:01:31'),
(5, 2, 'CAM-001-L-AZ', 'L', 'Azul', 'Cuadros', 450.00, 9, 3, 1, '2026-02-06 23:01:31'),
(6, 2, 'CAM-001-XL-RJ', 'XL', 'Rojo', 'Cuadros', 450.00, 8, 3, 1, '2026-02-06 23:01:31'),
(7, 3, 'PAN-001-30-AZ', '30', 'Azul Oscuro', 'Clasico', 550.00, 8, 4, 1, '2026-02-06 23:01:31'),
(8, 3, 'PAN-001-32-AZ', '32', 'Azul Oscuro', 'Clasico', 550.00, 4, 4, 1, '2026-02-06 23:01:31'),
(9, 3, 'PAN-001-34-NEG', '34', 'Negro', 'Clasico', 550.00, 2, 4, 1, '2026-02-06 23:01:31'),
(10, 4, 'CIN-001-34-CAF', '34', 'Cafe', 'Grabado', 350.00, 20, 5, 1, '2026-02-06 23:01:31'),
(11, 4, 'CIN-001-36-CAF', '36', 'Cafe', 'Grabado', 350.00, 18, 5, 1, '2026-02-06 23:01:31'),
(12, 4, 'CIN-001-38-NEG', '38', 'Negro', 'Grabado', 350.00, 15, 5, 1, '2026-02-06 23:01:31'),
(13, 5, 'SOM-001-7-BEI', '7', 'Beige', 'Texano', 1000.00, 0, 2, 1, '2026-02-06 23:01:31'),
(14, 5, 'SOM-001-7.5-NEG', '7 1/2', 'Negro', 'Texano', 1000.00, 4, 2, 1, '2026-02-06 23:01:31'),
(20, 8, 'BOT-002-26-CAF', '26', 'Cafe', 'Trabajo', 1500.00, 10, 3, 1, '2026-02-06 23:01:31'),
(21, 8, 'BOT-002-27-CAF', '27', 'Cafe', 'Trabajo', 1500.00, 5, 3, 1, '2026-02-06 23:01:31'),
(22, 8, 'BOT-002-28-NEG', '28', 'Negro', 'Trabajo', 1500.00, 7, 3, 1, '2026-02-06 23:01:31'),
(26, 6, 'ACC-001-U-CAF', 'Unica', 'Cafe', 'Clasico', 280.00, 24, 8, 1, '2026-02-10 02:15:37'),
(27, 6, 'ACC-001-U-NEG', 'Unica', 'Negro', 'Clasico', 280.00, 20, 8, 1, '2026-02-10 02:15:37'),
(31, 7, 'CHA-001-L-AZ', 'L', 'Azul', 'Clasico', 850.00, 5, 2, 1, '2026-02-16 16:30:35'),
(32, 7, 'CHA-001-M-AZ', 'M', 'Azul', 'Clasico', 850.00, 6, 2, 1, '2026-02-16 16:30:35'),
(33, 7, 'CHA-001-XL-NEG', 'XL', 'Negro', 'Clasico', 850.00, 5, 2, 1, '2026-02-16 16:30:35');

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
(1, 'Botas El Vaquero SA', 'Juan Perez', '4491234567', 'contacto@elvaquero.com', 'Av. Aguascalientes Norte 123, Aguascalientes', 'BEV890123ABC', 1, '2026-02-06 23:01:30'),
(2, 'Textiles Western SRL', 'Maria Gonzalez', '4499876543', 'ventas@textileswestern.com', 'Blvd. Zacatecas 456, Aguascalientes', 'TWE901234DEF', 1, '2026-02-06 23:01:30'),
(3, 'Distribuidora Nortena', 'Carlos Ramirez', '4491122334', 'info@nortena.com', 'Av. Tecnologico 789, Aguascalientes', 'DNO012345GHI', 1, '2026-02-06 23:01:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `RolID` int(11) NOT NULL,
  `NombreRol` varchar(50) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Permisos` longtext NOT NULL,
  `FechaCreacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`RolID`, `NombreRol`, `Descripcion`, `Permisos`, `FechaCreacion`) VALUES
(1, 'Administrador', 'Acceso completo al sistema', '{\"usuarios\": true, \"productos\": true, \"ventas\": true, \"reportes\": true, \"configuracion\": true, \"inventario\": true}', '2026-02-06 23:01:30'),
(2, 'Gerente', 'Gestion de productos, ventas y reportes', '{\"usuarios\": false, \"productos\": true, \"ventas\": true, \"reportes\": true, \"configuracion\": false, \"inventario\": true}', '2026-02-06 23:01:30'),
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
(1, 'Administrador del Sistema', 'admin@sanjoseboots.com', 'admin', '$2a$10$5ULwTtzJegPldP/yFLBSkOT1v7omEKIz5lvNySZlSoZxt.2/4pnly', 1, 1, '2026-02-06 23:01:30', '2026-03-13 18:29:39'),
(2, 'David Gael Martinez Badillo', 'gaelmartinezbadillo10@gmail.com', 'Deivid_MB', '$2a$10$npVeZMQlWW0T.Bar9qT48eDe3d951g.KdmH8fDuFMYTu69mmR6XDO', 3, 1, '2026-03-11 18:35:12', '2026-03-11 18:53:31');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `VentaID` int(11) NOT NULL,
  `NumeroTicket` varchar(50) NOT NULL,
  `FechaVenta` datetime NOT NULL DEFAULT current_timestamp(),
  `UsuarioID` int(11) NOT NULL,
  `Subtotal` decimal(10,2) NOT NULL,
  `Descuento` decimal(10,2) NOT NULL DEFAULT 0.00,
  `IVA` decimal(10,2) NOT NULL,
  `Total` decimal(10,2) NOT NULL,
  `MetodoPago` varchar(50) NOT NULL,
  `Estado` varchar(20) NOT NULL DEFAULT 'COMPLETADA',
  `Observaciones` text DEFAULT NULL,
  `CajaID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ventas`
--

INSERT INTO `ventas` (`VentaID`, `NumeroTicket`, `FechaVenta`, `UsuarioID`, `Subtotal`, `Descuento`, `IVA`, `Total`, `MetodoPago`, `Estado`, `Observaciones`, `CajaID`) VALUES
(1, 'TICK-20250207-0003', '2026-02-07 08:34:32', 1, 1800.00, 0.00, 288.00, 2088.00, 'Efectivo', 'COMPLETADA', 'Venta de prueba', NULL),
(2, 'TKT-20260207-642210', '2026-02-07 19:04:02', 1, 1200.00, 0.00, 192.00, 1392.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(3, 'TKT-20260207-693452', '2026-02-07 19:04:53', 1, 1500.00, 0.00, 240.00, 1740.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(4, 'TKT-20260207-795599', '2026-02-07 19:23:15', 1, 3600.00, 0.00, 576.00, 4176.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(5, 'TKT-FINAL-TEST', '2026-02-07 23:23:52', 1, 100.00, 0.00, 16.00, 116.00, 'Efectivo', 'COMPLETADA', 'Prueba final', NULL),
(6, 'TKT-PRUEBA-FINAL', '2026-02-07 23:36:16', 1, 100.00, 0.00, 16.00, 116.00, 'Efectivo', 'COMPLETADA', 'Prueba final del sistema', NULL),
(7, 'TKT-20260208-222871', '2026-02-08 09:40:22', 1, 2400.00, 0.00, 384.00, 2784.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(8, 'TKT-20260208-396352', '2026-02-08 22:13:16', 1, 1200.00, 0.00, 192.00, 1392.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(9, 'TKT-20260209-515910', '2026-02-09 21:01:55', 1, 1850.00, 0.00, 296.00, 2146.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(10, 'TKT-20260216-860277', '2026-02-16 15:37:40', 1, 650.00, 0.00, 104.00, 754.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(11, 'TICKET-TEST-001', '2026-02-16 15:59:18', 1, 650.00, 0.00, 104.00, 754.00, 'Efectivo', 'COMPLETADA', 'Venta de prueba', NULL),
(12, 'TICKET-TEST-002', '2026-02-16 16:06:20', 1, 550.00, 0.00, 88.00, 638.00, 'Efectivo', 'COMPLETADA', 'Prueba con nuevo procedimiento', NULL),
(17, 'TKT-20260216-464753', '2026-02-16 16:21:04', 1, 650.00, 0.00, 104.00, 754.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(18, 'TKT-20260216-466108', '2026-02-16 16:21:06', 1, 650.00, 0.00, 104.00, 754.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(19, 'TKT-20260216-057135', '2026-02-16 16:30:57', 1, 650.00, 0.00, 104.00, 754.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(20, 'TKT-20260216-894458', '2026-02-16 16:44:54', 1, 850.00, 0.00, 136.00, 986.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(21, 'TKT-20260216-939788', '2026-02-16 16:45:39', 1, 280.00, 0.00, 44.80, 324.80, 'Efectivo', 'COMPLETADA', NULL, NULL),
(22, 'TKT-20260216-980294', '2026-02-16 16:46:20', 1, 5000.00, 0.00, 800.00, 5800.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(23, 'TKT-20260216-014823', '2026-02-16 16:46:54', 1, 4400.00, 0.00, 704.00, 5104.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(24, 'TKT-20260216-045975', '2026-02-16 16:47:26', 1, 2700.00, 0.00, 432.00, 3132.00, 'Efectivo', 'COMPLETADA', NULL, NULL),
(25, 'TKT-20260311-652038', '2026-03-11 18:50:52', 2, 9000.00, 0.00, 1440.00, 10440.00, 'Efectivo', 'COMPLETADA', NULL, 3),
(26, 'TKT-20260312-905244', '2026-03-12 11:35:05', 1, 850.00, 0.00, 136.00, 986.00, 'Tarjeta', 'COMPLETADA', NULL, 5),
(27, 'TKT-20260312-915776', '2026-03-12 11:35:15', 1, 1800.00, 0.00, 288.00, 2088.00, 'Transferencia', 'COMPLETADA', NULL, 5),
(28, 'TKT-20260312-930967', '2026-03-12 11:35:30', 1, 450.00, 0.00, 72.00, 522.00, 'Efectivo', 'COMPLETADA', NULL, 5),
(29, 'TKT-20260312-523361', '2026-03-12 11:45:23', 1, 850.00, 0.00, 136.00, 986.00, 'Efectivo', 'COMPLETADA', NULL, 5),
(30, 'TKT-20260313-489581', '2026-03-13 17:11:29', 1, 850.00, 0.00, 136.00, 986.00, 'Tarjeta', 'COMPLETADA', NULL, 6),
(31, 'TKT-20260313-500198', '2026-03-13 17:11:40', 1, 1000.00, 0.00, 160.00, 1160.00, 'Transferencia', 'COMPLETADA', NULL, 6),
(32, 'TKT-20260313-535197', '2026-03-13 17:12:15', 1, 1500.00, 0.00, 240.00, 1740.00, 'Efectivo', 'COMPLETADA', NULL, 6),
(33, 'TKT-20260313-976249', '2026-03-13 18:09:36', 1, 560.00, 0.00, 89.60, 649.60, 'Efectivo', 'COMPLETADA', NULL, 7),
(34, 'TKT-20260313-986964', '2026-03-13 18:09:47', 1, 1500.00, 0.00, 240.00, 1740.00, 'Tarjeta', 'COMPLETADA', NULL, 7),
(35, 'TKT-20260313-996472', '2026-03-13 18:09:56', 1, 1800.00, 0.00, 288.00, 2088.00, 'Transferencia', 'COMPLETADA', NULL, 7);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `cajas`
--
ALTER TABLE `cajas`
  ADD PRIMARY KEY (`CajaID`),
  ADD KEY `idx_usuario` (`UsuarioID`),
  ADD KEY `idx_estado` (`Estado`);

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
  ADD UNIQUE KEY `Clave` (`Clave`);

--
-- Indices de la tabla `detalleventas`
--
ALTER TABLE `detalleventas`
  ADD PRIMARY KEY (`DetalleVentaID`),
  ADD KEY `idx_venta` (`VentaID`),
  ADD KEY `idx_variante` (`VarianteID`);

--
-- Indices de la tabla `movimientoscaja`
--
ALTER TABLE `movimientoscaja`
  ADD PRIMARY KEY (`MovimientoID`),
  ADD KEY `idx_caja` (`CajaID`),
  ADD KEY `idx_usuario` (`UsuarioID`),
  ADD KEY `idx_tipo` (`Tipo`),
  ADD KEY `idx_fecha` (`FechaHora`);

--
-- Indices de la tabla `movimientosinventario`
--
ALTER TABLE `movimientosinventario`
  ADD PRIMARY KEY (`MovimientoID`),
  ADD KEY `UsuarioID` (`UsuarioID`),
  ADD KEY `idx_variante` (`VarianteID`);

--
-- Indices de la tabla `productoimagenes`
--
ALTER TABLE `productoimagenes`
  ADD PRIMARY KEY (`ImagenID`),
  ADD KEY `idx_producto` (`ProductoID`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`ProductoID`),
  ADD UNIQUE KEY `CodigoProducto` (`CodigoProducto`),
  ADD KEY `ProveedorID` (`ProveedorID`),
  ADD KEY `idx_categoria` (`CategoriaID`);

--
-- Indices de la tabla `productovariantes`
--
ALTER TABLE `productovariantes`
  ADD PRIMARY KEY (`VarianteID`),
  ADD UNIQUE KEY `CodigoVariante` (`CodigoVariante`),
  ADD KEY `idx_producto` (`ProductoID`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`ProveedorID`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`RolID`),
  ADD UNIQUE KEY `NombreRol` (`NombreRol`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`UsuarioID`),
  ADD UNIQUE KEY `Email` (`Email`),
  ADD UNIQUE KEY `Username` (`Username`),
  ADD KEY `RolID` (`RolID`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`VentaID`),
  ADD UNIQUE KEY `NumeroTicket` (`NumeroTicket`),
  ADD KEY `idx_usuario` (`UsuarioID`),
  ADD KEY `idx_caja` (`CajaID`),
  ADD KEY `idx_fecha` (`FechaVenta`),
  ADD KEY `idx_estado` (`Estado`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `cajas`
--
ALTER TABLE `cajas`
  MODIFY `CajaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

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
  MODIFY `DetalleVentaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT de la tabla `movimientoscaja`
--
ALTER TABLE `movimientoscaja`
  MODIFY `MovimientoID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
  MODIFY `VarianteID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

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
  MODIFY `UsuarioID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `VentaID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `cajas`
--
ALTER TABLE `cajas`
  ADD CONSTRAINT `cajas_ibfk_1` FOREIGN KEY (`UsuarioID`) REFERENCES `usuarios` (`UsuarioID`);

--
-- Filtros para la tabla `detalleventas`
--
ALTER TABLE `detalleventas`
  ADD CONSTRAINT `detalleventas_ibfk_1` FOREIGN KEY (`VentaID`) REFERENCES `ventas` (`VentaID`),
  ADD CONSTRAINT `detalleventas_ibfk_2` FOREIGN KEY (`VarianteID`) REFERENCES `productovariantes` (`VarianteID`);

--
-- Filtros para la tabla `movimientoscaja`
--
ALTER TABLE `movimientoscaja`
  ADD CONSTRAINT `movcaja_ibfk_1` FOREIGN KEY (`CajaID`) REFERENCES `cajas` (`CajaID`),
  ADD CONSTRAINT `movcaja_ibfk_2` FOREIGN KEY (`UsuarioID`) REFERENCES `usuarios` (`UsuarioID`);

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
  ADD CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`UsuarioID`) REFERENCES `usuarios` (`UsuarioID`),
  ADD CONSTRAINT `ventas_ibfk_2` FOREIGN KEY (`CajaID`) REFERENCES `cajas` (`CajaID`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
