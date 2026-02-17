/* ========================================
   TABLES.JS - Excel Export Functions
   populateYearSelects → en main.js
   exportProveedores/FacturasPagadas/PorPagar → en proveedores-ui.js
   ======================================== */

// ============================================
// EXCEL EXPORT - CORE
// ============================================

function exportToExcel(data, filename, sheetName) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
}

// ============================================
// EXCEL EXPORT - INQUILINOS
// ============================================

function exportInquilinosToExcel() {
    const data = [
        ['Empresa', 'Renta Mensual', 'Vencimiento Contrato', 'RFC', 'CLABE', 'M²', 'No. Despacho', 'Fecha Inicio', 'Notas']
    ];
    
    inquilinos.forEach(inq => {
        data.push([
            inq.nombre,
            inq.renta,
            inq.fecha_vencimiento,
            inq.rfc || '',
            inq.clabe || '',
            inq.m2 || '',
            inq.numero_despacho || '',
            inq.fecha_inicio,
            inq.notas || ''
        ]);
    });
    
    exportToExcel(data, 'Inquilinos.xlsx', 'Inquilinos');
}

function exportRentasRecibidasToExcel() {
    const filterType = document.getElementById('inquilinosRentasFilter').value;
    const year = parseInt(document.getElementById('inquilinosRentasYear').value);
    const month = filterType === 'mensual' ? parseInt(document.getElementById('inquilinosRentasMonth').value) : null;
    
    const data = [['Empresa', 'Monto', 'Fecha']];
    const rentas = [];
    
    inquilinos.forEach(inq => {
        if (inq.pagos) {
            inq.pagos.forEach(pago => {
                const pd = new Date(pago.fecha + 'T00:00:00');
                if (pd.getFullYear() === year && (month === null || pd.getMonth() === month)) {
                    rentas.push({ empresa: inq.nombre, monto: pago.monto, fecha: pago.fecha });
                }
            });
        }
    });
    
    rentas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    rentas.forEach(r => data.push([r.empresa, r.monto, r.fecha]));
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const filename = filterType === 'mensual' 
        ? `Rentas_${monthNames[month]}_${year}.xlsx`
        : `Rentas_${year}.xlsx`;
    
    exportToExcel(data, filename, 'Rentas Recibidas');
}

function exportVencimientoContratosToExcel() {
    const data = [['Empresa', 'Inicio', 'Vencimiento', 'Días Restantes', 'Estado']];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    inquilinos.forEach(inq => {
        const venc = new Date(inq.fecha_vencimiento + 'T00:00:00');
        const diffDays = Math.ceil((venc - today) / (1000 * 60 * 60 * 24));
        let estado = diffDays < 0 ? 'Vencido' : diffDays <= 30 ? 'Próximo a vencer' : 'Vigente';
        
        data.push([inq.nombre, inq.fecha_inicio, inq.fecha_vencimiento, diffDays, estado]);
    });
    
    exportToExcel(data, 'Vencimiento_Contratos.xlsx', 'Contratos');
}

// ============================================
// EXCEL EXPORT - ADMIN
// ============================================

function exportActivosToExcel() {
    const data = [['Nombre', 'Último Mantenimiento', 'Próximo Mantenimiento', 'Proveedor', 'Notas']];
    
    activos.forEach(act => {
        data.push([act.nombre, act.ultimo_mant || '', act.proximo_mant || '', act.proveedor || '', act.notas || '']);
    });
    
    exportToExcel(data, 'Activos.xlsx', 'Activos');
}

function exportEstacionamientoToExcel() {
    const data = [['Espacio', 'Inquilino', 'No. Despacho']];
    
    estacionamiento.forEach(esp => {
        data.push([esp.numero_espacio, esp.inquilino_nombre || '', esp.numero_despacho || '']);
    });
    
    exportToExcel(data, 'Estacionamiento.xlsx', 'Estacionamiento');
}

function exportBitacoraToExcel() {
    const data = [['Semana', 'Notas']];
    
    const sorted = [...bitacoraSemanal].sort((a, b) => new Date(b.semana_inicio) - new Date(a.semana_inicio));
    sorted.forEach(sem => data.push([sem.semana_texto, sem.notas || '']));
    
    exportToExcel(data, 'Bitacora.xlsx', 'Bitácora');
}

// ============================================
// ALIASES — Corrige botones de HTML que usan nombres distintos
// ============================================

function exportarRentasExcel() { exportRentasRecibidasToExcel(); }
function exportarContratosExcel() { exportVencimientoContratosToExcel(); }

// ============================================
// DROPDOWN CLOSE ON OUTSIDE CLICK
// ============================================

window.addEventListener('click', function(e) {
    if (!e.target.matches('.dropdown-toggle')) {
        document.querySelectorAll('.dropdown-content').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }
});

console.log('✅ TABLES.JS cargado');
