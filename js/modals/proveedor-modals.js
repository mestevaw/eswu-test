/* ========================================
   PROVEEDOR-MODALS.JS
   Última actualización: 2026-02-12 18:00 CST
   ======================================== */

function showAddContactoProveedorModal() {
    document.getElementById('contactoProveedorForm').reset();
    document.getElementById('addContactoProveedorModal').classList.add('active');
}

function saveContactoProveedor(event) {
    event.preventDefault();
    
    const contacto = {
        nombre: document.getElementById('contactoProveedorNombre').value,
        telefono: document.getElementById('contactoProveedorTelefono').value,
        email: document.getElementById('contactoProveedorEmail').value
    };
    
    if (window.editingContactoProveedorIndex !== undefined) {
        tempProveedorContactos[window.editingContactoProveedorIndex] = contacto;
        delete window.editingContactoProveedorIndex;
    } else {
        tempProveedorContactos.push(contacto);
    }
    
    renderContactosList(tempProveedorContactos, 'proveedorContactosList', 'deleteProveedorContacto', 'showEditContactoProveedorModal');
    
    document.getElementById('contactoProveedorForm').reset();
    closeModal('addContactoProveedorModal');
}

function deleteProveedorContacto(index) {
    tempProveedorContactos.splice(index, 1);
    renderContactosList(tempProveedorContactos, 'proveedorContactosList', 'deleteProveedorContacto', 'showEditContactoProveedorModal');
}

function showEditContactoProveedorModal(index) {
    const contacto = tempProveedorContactos[index];
    
    document.getElementById('contactoProveedorNombre').value = contacto.nombre;
    document.getElementById('contactoProveedorTelefono').value = contacto.telefono || '';
    document.getElementById('contactoProveedorEmail').value = contacto.email || '';
    
    window.editingContactoProveedorIndex = index;
    
    document.getElementById('addContactoProveedorModal').classList.add('active');
}

function showRegistrarFacturaModal() {
    window.isEditingFactura = false;
    currentFacturaId = null;
    
    document.getElementById('facturaNumero').value = '';
    document.getElementById('facturaFecha').value = '';
    document.getElementById('facturaVencimiento').value = '';
    document.getElementById('facturaMonto').value = '';
    document.getElementById('facturaIVA').value = '';
    document.getElementById('facturaDocumento').value = '';
    document.getElementById('facturaDocumentoFileName').textContent = '';
    
    document.querySelector('#registrarFacturaModal .modal-title').textContent = 'Registrar Factura';
    document.getElementById('registrarFacturaModal').classList.add('active');
}

function showEditFacturaModal(facturaId) {
    // Buscar factura — primero en proveedor actual, si no en todos
    let factura = null;
    let provId = currentProveedorId;
    
    const prov = proveedores.find(p => p.id === currentProveedorId);
    if (prov) factura = prov.facturas.find(f => f.id === facturaId);
    
    // Si no se encontró (viene del listado standalone), buscar en todos
    if (!factura) {
        for (const p of proveedores) {
            const found = p.facturas.find(f => f.id === facturaId);
            if (found) { factura = found; provId = p.id; break; }
        }
    }
    if (!factura) return;
    
    currentProveedorId = provId;
    window.isEditingFactura = true;
    currentFacturaId = facturaId;
    
    document.getElementById('facturaNumero').value = factura.numero || '';
    document.getElementById('facturaFecha').value = factura.fecha || '';
    document.getElementById('facturaVencimiento').value = factura.vencimiento || '';
    document.getElementById('facturaMonto').value = factura.monto || '';
    document.getElementById('facturaIVA').value = factura.iva || '';
    document.getElementById('facturaDocumento').value = '';
    
    // Mostrar estado del PDF (base64 no está en memoria, usamos has_documento)
    document.getElementById('facturaDocumentoFileName').textContent = factura.has_documento 
        ? '📎 PDF guardado (seleccione otro para reemplazar)' : '';
    
    document.querySelector('#registrarFacturaModal .modal-title').textContent = 'Modificar Factura';
    document.getElementById('registrarFacturaModal').classList.add('active');
}

function calculateIVA() {
    const monto = parseFloat(document.getElementById('facturaMonto').value);
    if (!isNaN(monto) && monto > 0) {
        const iva = monto * 0.16 / 1.16;
        document.getElementById('facturaIVA').value = iva.toFixed(2);
    }
}

function showPagarFacturaModal(facturaId) {
    currentFacturaId = facturaId;
    document.getElementById('fechaPagoFactura').value = new Date().toISOString().split('T')[0];
    document.getElementById('pagoPDFFactura').value = '';
    document.getElementById('pagoPDFFacturaFileName').textContent = '';
    document.getElementById('pagarFacturaModal').classList.add('active');
}

console.log('✅ PROVEEDOR-MODALS.JS cargado (2026-02-12 18:00 CST)');
