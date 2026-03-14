// src/components/caja/CorteModal.jsx — NUEVO
// Corte de caja sin cerrar turno — imprimible / descargable en PDF
// Requiere: npm install jspdf jspdf-autotable  (en el frontend)

import { useState, useEffect, useRef } from 'react';
import { X, Printer, Download, Loader, FileText } from 'lucide-react';
import { cajaAPI } from '../../api/endpoints';

function fmt(v) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v ?? 0);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export default function CorteModal({ cajaId, onClose }) {
  const [resumen,  setResumen]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const printRef               = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await cajaAPI.resumenCompleto(cajaId);
        if (res.data?.success) setResumen(res.data.data);
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  }, [cajaId]);

  // ── Imprimir ──────────────────────────────────────────────
  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Corte de Caja</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #111; }
        h1   { font-size: 18px; margin-bottom: 2px; }
        h2   { font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px; }
        table{ width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { text-align: left; padding: 5px 8px; font-size: 11px; }
        th   { background: #f3f4f6; font-weight: bold; }
        tr:nth-child(even) { background: #f9fafb; }
        .right { text-align: right; }
        .total-row { font-weight: bold; background: #e5e7eb !important; }
        .badge-ef  { color: #166534; }
        .badge-tj  { color: #1d4ed8; }
        .badge-tr  { color: #7c3aed; }
        .summary   { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
        .summary-item { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; }
        .summary-item .label { font-size: 10px; color: #6b7280; }
        .summary-item .value { font-size: 16px; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 10px; color: #9ca3af; text-align: center; }
      </style></head><body>
      ${printRef.current?.innerHTML}
      <div class="footer">Impreso el ${new Date().toLocaleString('es-MX')} — San José Boots</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  // ── Exportar PDF ─────────────────────────────────────────
  const handlePDF = async () => {
    // Importación dinámica para no cargar jsPDF si no se usa
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      const { caja, ventas, movimientos, totales } = resumen;

      doc.setFontSize(18);
      doc.text('Corte de Caja — San José Boots', 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Cajero: ${caja.NombreCajero}`, 14, 26);
      doc.text(`Apertura: ${fmtDate(caja.FechaHoraApertura)}`, 14, 31);
      doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 36);

      // Resumen
      doc.setFontSize(12); doc.setTextColor(0);
      doc.text('Resumen de ventas', 14, 46);
      autoTable(doc, {
        startY: 50,
        head: [['Efectivo', 'Tarjeta', 'Transferencia', 'Total ventas', '# Ventas']],
        body: [[
          fmt(totales.TotalEfectivo), fmt(totales.TotalTarjeta),
          fmt(totales.TotalTransferencia), fmt(totales.TotalVentas), totales.NumeroVentas
        ]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [17, 24, 39] },
      });

      // Ventas
      const y1 = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.text('Detalle de ventas', 14, y1);
      autoTable(doc, {
        startY: y1 + 4,
        head: [['# Venta', 'Hora', 'Método de pago', 'Total']],
        body: ventas.map(v => [
          `#${v.VentaID}`, fmtTime(v.FechaVenta), v.MetodoPago, fmt(v.Total)
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [17, 24, 39] },
      });

      // Movimientos extra
      if (movimientos.length > 0) {
        const y2 = doc.lastAutoTable.finalY + 8;
        doc.setFontSize(12);
        doc.text('Movimientos de efectivo (entradas/salidas)', 14, y2);
        autoTable(doc, {
          startY: y2 + 4,
          head: [['Hora', 'Tipo', 'Concepto', 'Monto']],
          body: movimientos.map(m => [
            fmtTime(m.FechaHora), m.Tipo, m.Concepto, fmt(m.Monto)
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [17, 24, 39] },
        });
      }

      // Arqueo
      const y3 = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.text('Arqueo de caja (efectivo)', 14, y3);
      const entradas = movimientos.filter(m => m.Tipo === 'ENTRADA').reduce((a,m) => a + parseFloat(m.Monto), 0);
      const salidas  = movimientos.filter(m => ['SALIDA','DEVOLUCION'].includes(m.Tipo)).reduce((a,m) => a + parseFloat(m.Monto), 0);
      autoTable(doc, {
        startY: y3 + 4,
        head: [['Concepto', 'Monto']],
        body: [
          ['Fondo inicial',         fmt(caja.MontoInicial)],
          ['+ Ventas en efectivo',  fmt(totales.TotalEfectivo)],
          ['+ Entradas de efectivo',fmt(entradas)],
          ['− Salidas / Devoluciones', fmt(salidas)],
          ['= Debería haber en caja', fmt(parseFloat(caja.MontoInicial) + parseFloat(totales.TotalEfectivo) + entradas - salidas)],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [17, 24, 39] },
      });

      doc.save(`Corte_Caja_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (_) {
      // Si jsPDF no está instalado, caer al print
      handlePrint();
    }
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
        <Loader className="h-6 w-6 animate-spin text-gray-600" />
        <span className="text-gray-700 font-medium">Cargando corte...</span>
      </div>
    </div>
  );

  if (!resumen) return null;
  const { caja, ventas, movimientos, totales } = resumen;

  const entradas = movimientos.filter(m => m.Tipo === 'ENTRADA').reduce((a,m) => a + parseFloat(m.Monto), 0);
  const salidas  = movimientos.filter(m => ['SALIDA','DEVOLUCION'].includes(m.Tipo)).reduce((a,m) => a + parseFloat(m.Monto), 0);
  const deberiaHaber = parseFloat(caja.MontoInicial) + parseFloat(totales.TotalEfectivo) + entradas - salidas;

  const metodoBadge = (m) => {
    if (m === 'Efectivo')      return 'bg-green-100 text-green-700';
    if (m === 'Tarjeta')       return 'bg-blue-100 text-blue-700';
    if (m === 'Transferencia') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between bg-gray-900 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-400" />
            <h2 className="text-white font-bold text-lg">Corte de Caja</h2>
            <span className="text-gray-400 text-sm ml-1">— sin cerrar turno</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePDF}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white
                               text-sm font-medium px-3 py-1.5 rounded-lg transition">
              <Download className="h-4 w-4" /> PDF
            </button>
            <button onClick={handlePrint}
                    className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white
                               text-sm font-medium px-3 py-1.5 rounded-lg transition">
              <Printer className="h-4 w-4" /> Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white ml-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="overflow-y-auto flex-1 p-6">
          <div ref={printRef}>

            {/* Info del turno */}
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900">Corte de Caja — San José Boots</h1>
              <p className="text-sm text-gray-500">
                Cajero: <span className="font-medium text-gray-700">{caja.NombreCajero}</span>
                &nbsp;·&nbsp; Apertura: <span className="font-medium text-gray-700">{fmtDate(caja.FechaHoraApertura)}</span>
                &nbsp;·&nbsp; Generado: <span className="font-medium text-gray-700">{new Date().toLocaleString('es-MX')}</span>
              </p>
            </div>

            {/* Resumen tarjetas */}
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 border-b border-gray-200 pb-1">
              Resumen de ventas
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Efectivo',       value: totales.TotalEfectivo,       color: 'text-green-700'  },
                { label: 'Tarjeta',        value: totales.TotalTarjeta,        color: 'text-blue-700'   },
                { label: 'Transferencia',  value: totales.TotalTransferencia,  color: 'text-purple-700' },
                { label: `Total (${totales.NumeroVentas} ventas)`, value: totales.TotalVentas, color: 'text-gray-900' },
              ].map(c => (
                <div key={c.label} className="border border-gray-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500 mb-0.5">{c.label}</p>
                  <p className={`text-lg font-bold ${c.color}`}>{fmt(c.value)}</p>
                </div>
              ))}
            </div>

            {/* Arqueo efectivo */}
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 border-b border-gray-200 pb-1">
              Arqueo de caja (efectivo)
            </h2>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-500">Fondo inicial</span><span className="font-medium">{fmt(caja.MontoInicial)}</span></div>
              <div className="flex justify-between text-green-700"><span>+ Ventas en efectivo</span><span className="font-medium">{fmt(totales.TotalEfectivo)}</span></div>
              {entradas > 0 && <div className="flex justify-between text-green-700"><span>+ Entradas de efectivo</span><span className="font-medium">{fmt(entradas)}</span></div>}
              {salidas  > 0 && <div className="flex justify-between text-red-600"><span>− Salidas / Devoluciones</span><span className="font-medium">{fmt(salidas)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-300">
                <span>= Debería haber en caja</span>
                <span className="text-gray-900">{fmt(deberiaHaber)}</span>
              </div>
            </div>

            {/* Detalle ventas */}
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 border-b border-gray-200 pb-1">
              Detalle de ventas ({ventas.length})
            </h2>
            <div className="mb-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="text-left px-3 py-2 rounded-tl-lg"># Venta</th>
                    <th className="text-left px-3 py-2">Hora</th>
                    <th className="text-left px-3 py-2">Cajero</th>
                    <th className="text-left px-3 py-2">Método</th>
                    <th className="text-right px-3 py-2 rounded-tr-lg">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((v, i) => (
                    <tr key={v.VentaID} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-1.5 text-gray-700 font-medium">#{v.VentaID}</td>
                      <td className="px-3 py-1.5 text-gray-500">{fmtTime(v.FechaVenta)}</td>
                      <td className="px-3 py-1.5 text-gray-500">{v.Cajero}</td>
                      <td className="px-3 py-1.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${metodoBadge(v.MetodoPago)}`}>
                          {v.MetodoPago}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-gray-900">{fmt(v.Total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={4} className="px-3 py-2 text-gray-700">Total</td>
                    <td className="px-3 py-2 text-right text-gray-900">{fmt(totales.TotalVentas)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Movimientos extra */}
            {movimientos.length > 0 && (
              <>
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 border-b border-gray-200 pb-1">
                  Movimientos de efectivo ({movimientos.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600">
                        <th className="text-left px-3 py-2 rounded-tl-lg">Hora</th>
                        <th className="text-left px-3 py-2">Tipo</th>
                        <th className="text-left px-3 py-2">Concepto</th>
                        <th className="text-right px-3 py-2 rounded-tr-lg">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((m, i) => (
                        <tr key={m.MovimientoID} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-1.5 text-gray-500">{fmtTime(m.FechaHora)}</td>
                          <td className="px-3 py-1.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              m.Tipo === 'ENTRADA'    ? 'bg-green-100 text-green-700'  :
                              m.Tipo === 'DEVOLUCION' ? 'bg-orange-100 text-orange-700' :
                              m.Tipo === 'AJUSTE'     ? 'bg-purple-100 text-purple-700' :
                                                        'bg-red-100 text-red-700'}`}>
                              {m.Tipo}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-gray-700">{m.Concepto}{m.Notas && <span className="text-gray-400"> — {m.Notas}</span>}</td>
                          <td className={`px-3 py-1.5 text-right font-semibold
                            ${m.Tipo === 'ENTRADA' ? 'text-green-700' : 'text-red-600'}`}>
                            {m.Tipo === 'ENTRADA' ? '+' : '−'}{fmt(m.Monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}