/* ========================================
   TABLES.JS - Table Functions & Excel Export
   ======================================== */

// ============================================
// YEAR SELECT POPULATION
// ============================================

function populateInquilinosYearSelects() {
    const currentYear = new Date().getFullYear();
    const select = document.getElementById('inquilinosRentasYear');
    select.innerHTML = '';
    
    for (let year = currentYear - 5; year <= currentYear + 1; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        select.appendChild(option);
    }
}

function populateProveedoresYearSelects() {
    const currentYear = new Date().getFullYear();
    ['provFactPagYear', 'provFactPorPagYear'].forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '';
            for (let year = currentYear - 5; year <= currentYear + 1; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === currentYear) option.selected = true;
                select.appendChild(option);
            }
        }
    });
}

// ============================================
// EXCEL EXPORT FUNCTIONS
// ============================================

function exportToExcel(data, filename, sheetName) {
    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    
    // Convertir datos a hoja
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Generar archivo y descargar
    XLSX.writeFile(wb, filename);
}

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

function exportProveedoresToExcel() {
    const data = [
        ['Proveedor', 'Servicio', 'Contacto', 'Teléfono', 'Email', 'RFC', 'CLABE', 'Notas']
    ];
    
    proveedores.forEach(prov => {
        const primerContacto = prov.contactos && prov.contactos.length > 0 ? prov.contactos[0] : {};
        data.push([
            prov.nombre,
            prov.servicio,
            primerContacto.nombre || '',
            primerContacto.telefono || '',
            primerContacto.email || '',
            prov.rfc || '',
            prov.clabe || '',
            prov.notas || ''
        ]);
    });
    
    exportToExcel(data, 'Proveedores.xlsx', 'Proveedores');
}

function exportRentasRecibidasToExcel() {
    const filterType = document.getElementById('inquilinosRentasFilter').value;
    const year = parseInt(document.getElementById('inquilinosRentasYear').value);
    const month = filterType === 'mensual' ? parseInt(document.getElementById('inquilinosRentasMonth').value) : null;
    
    const data = [
        ['Empresa', 'Monto', 'Fecha']
    ];
    
    const rentas = [];
    inquilinos.forEach(inq => {
        if (inq.pagos) {
            inq.pagos.forEach(pago => {
                const pd = new Date(pago.fecha + 'T00:00:00');
                if (pd.getFullYear() === year && (month === null || pd.getMonth() === month)) {
                    rentas.push({
                        empresa: inq.nombre,
                        monto: pago.monto,
                        fecha: pago.fecha
                    });
                }
            });
        }
    });
    
    rentas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    rentas.forEach(r => {
        data.push([r.empresa, r.monto, r.fecha]);
    });
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const filename = filterType === 'mensual' 
        ? `Rentas_${monthNames[month]}_${year}.xlsx`
        : `Rentas_${year}.xlsx`;
    
    exportToExcel(data, filename, 'Rentas Recibidas');
}

function exportFacturasPagadasToExcel() {
    const filterType = document.getElementById('provFactPagFilter').value;
    const year = parseInt(document.getElementById('provFactPagYear').value);
    const month = filterType === 'mensual' ? parseInt(document.getElementById('provFactPagMonth').value) : null;
    
    const data = [
        ['Proveedor', 'Número', 'Monto', 'Fecha Pago']
    ];
    
    const pagadas = [];
    proveedores.forEach(prov => {
        if (prov.facturas) {
            prov.facturas.forEach(f => {
                if (f.fecha_pago) {
                    const pd = new Date(f.fecha_pago + 'T00:00:00');
                    if (pd.getFullYear() === year && (month === null || pd.getMonth() === month)) {
                        pagadas.push({
                            proveedor: prov.nombre,
                            numero: f.numero || 'S/N',
                            monto: f.monto,
                            fecha: f.fecha_pago
                        });
                    }
                }
            });
        }
    });
    
    pagadas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    pagadas.forEach(f => {
        data.push([f.proveedor, f.numero, f.monto, f.fecha]);
    });
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const filename = filterType === 'mensual' 
        ? `Facturas_Pagadas_${monthNames[month]}_${year}.xlsx`
        : `Facturas_Pagadas_${year}.xlsx`;
    
    exportToExcel(data, filename, 'Facturas Pagadas');
}

function exportFacturasPorPagarToExcel() {
    const filterType = document.getElementById('provFactPorPagFilter').value;
    const year = parseInt(document.getElementById('provFactPorPagYear').value);
    const month = filterType === 'mensual' ? parseInt(document.getElementById('provFactPorPagMonth').value) : null;
    
    const data = [
        ['Proveedor', 'Número', 'Monto', 'Vencimiento']
    ];
    
    const porPagar = [];
    proveedores.forEach(prov => {
        if (prov.facturas) {
            prov.facturas.forEach(f => {
                if (!f.fecha_pago) {
                    const vd = new Date(f.vencimiento + 'T00:00:00');
                    if (vd.getFullYear() === year && (month === null || month === vd.getMonth())) {
                        porPagar.push({
                            proveedor: prov.nombre,
                            numero: f.numero || 'S/N',
                            monto: f.monto,
                            vencimiento: f.vencimiento
                        });
                    }
                }
            });
        }
    });
    
    porPagar.sort((a, b) => new Date(a.vencimiento) - new Date(b.vencimiento));
    porPagar.forEach(f => {
        data.push([f.proveedor, f.numero, f.monto, f.vencimiento]);
    });
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const filename = filterType === 'mensual' 
        ? `Facturas_Por_Pagar_${monthNames[month]}_${year}.xlsx`
        : `Facturas_Por_Pagar_${year}.xlsx`;
    
    exportToExcel(data, filename, 'Facturas Por Pagar');
}

function exportVencimientoContratosToExcel() {
    const data = [
        ['Empresa', 'Inicio', 'Vencimiento', 'Días Restantes', 'Estado']
    ];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    inquilinos.forEach(inq => {
        const venc = new Date(inq.fecha_vencimiento + 'T00:00:00');
        const diffDays = Math.ceil((venc - today) / (1000 * 60 * 60 * 24));
        let estado = '';
        
        if (diffDays < 0) {
            estado = 'Vencido';
        } else if (diffDays <= 30) {
            estado = 'Próximo a vencer';
        } else {
            estado = 'Vigente';
        }
        
        data.push([
            inq.nombre,
            inq.fecha_inicio,
            inq.fecha_vencimiento,
            diffDays,
            estado
        ]);
    });
    
    exportToExcel(data, 'Vencimiento_Contratos.xlsx', 'Contratos');
}

function exportActivosToExcel() {
    const data = [
        ['Nombre', 'Último Mantenimiento', 'Próximo Mantenimiento', 'Proveedor', 'Notas']
    ];
    
    activos.forEach(act => {
        data.push([
            act.nombre,
            act.ultimo_mant || '',
            act.proximo_mant || '',
            act.proveedor || '',
            act.notas || ''
        ]);
    });
    
    exportToExcel(data, 'Activos.xlsx', 'Activos');
}

function exportEstacionamientoToExcel() {
    const data = [
        ['Espacio', 'Inquilino', 'No. Despacho']
    ];
    
    estacionamiento.forEach(esp => {
        data.push([
            esp.numero_espacio,
            esp.inquilino_nombre || '',
            esp.numero_despacho || ''
        ]);
    });
    
    exportToExcel(data, 'Estacionamiento.xlsx', 'Estacionamiento');
}

function exportBitacoraToExcel() {
    const data = [
        ['Semana', 'Notas']
    ];
    
    const sorted = [...bitacoraSemanal].sort((a, b) => {
        const dateA = new Date(a.semana_inicio);
        const dateB = new Date(b.semana_inicio);
        return dateB - dateA;
    });
    
    sorted.forEach(sem => {
        data.push([
            sem.semana_texto,
            sem.notas || ''
        ]);
    });
    
    exportToExcel(data, 'Bitacora.xlsx', 'Bitácora');
}

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
