/* ========================================
   DB-FACTURAS.JS v2
   ======================================== */

// File captured from any input method (click, paste, drag)
var _facturaFile = null;

function handleFacturaFileSelect(input) {
    if (input.files && input.files[0]) {
        _facturaFile = input.files[0];
        _showFacturaFilePreview(_facturaFile.name);
    }
}

function handleFacturaDrop(event) {
    var files = event.dataTransfer ? event.dataTransfer.files : null;
    if (files && files.length > 0) {
        _facturaFile = files[0];
        _showFacturaFilePreview(_facturaFile.name);
    }
}

function _showFacturaFilePreview(name) {
    var preview = document.getElementById('facturaFilePreview');
    if (preview) {
        preview.style.display = 'block';
        preview.innerHTML = '✅ <strong>' + name + '</strong>';
    }
    // Update the click zone text too
    var fn = document.getElementById('facturaDocumentoFileName');
    if (fn) fn.textContent = name;
}

function _resetFacturaFile() {
    _facturaFile = null;
    var preview = document.getElementById('facturaFilePreview');
    if (preview) preview.style.display = 'none';
    var fn = document.getElementById('facturaDocumentoFileName');
    if (fn) fn.textContent = '';
    var input = document.getElementById('facturaDocumento');
    if (input) input.value = '';
}

// Listen for paste on the paste zone
document.addEventListener('DOMContentLoaded', function() {
    _initFacturaPaste();
});
// Also call after dynamic content
function _initFacturaPaste() {
    var pasteZone = document.getElementById('facturaPasteZone');
    if (!pasteZone || pasteZone._pasteInit) return;
    pasteZone._pasteInit = true;
    pasteZone.addEventListener('paste', function(e) {
        e.preventDefault();
        var items = e.clipboardData ? e.clipboardData.items : [];
        for (var i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                _facturaFile = items[i].getAsFile();
                var name = _facturaFile.name || 'imagen_pegada.' + (_facturaFile.type.split('/')[1] || 'png');
                _showFacturaFilePreview(name);
                return;
            }
        }
        alert('No se detectó archivo. Intenta copiar la imagen primero.');
    });
}

// Función auxiliar: navegar al lugar correcto después de una acción
function navigateAfterFacturaAction(defaultTab) {
    const ctx = window.facturaActionContext;
    window.facturaActionContext = null; // Limpiar
    
    if (ctx === 'dashboard-porpagar') {
        // Came from dashboard — just refresh the dashboard proveedores tile
        // Don't navigate anywhere, the modal is already closed
        if (typeof renderDashProveedores === 'function') {
            renderDashProveedores();
        }
        return; // Done — stay on dashboard
    } else if (ctx === 'standalone-porpagar') {
        renderProveedoresFacturasPorPagar();
    } else if (ctx === 'standalone-pagadas') {
        renderProveedoresFacturasPagadas();
    } else {
        // Estamos en la ficha del proveedor - reabrir con datos frescos
        if (currentProveedorId) {
            showProveedorDetail(currentProveedorId);
            if (defaultTab) {
                setTimeout(() => switchTab('proveedor', defaultTab), 150);
            }
        }
    }
    
    // También refrescar tabla de proveedores si es visible
    if (typeof renderProveedoresTable === 'function' && currentSubContext === 'proveedores-list') {
        renderProveedoresTable();
    }
    
    // Refresh dashboard tiles if on dashboard
    if (typeof renderDashProveedores === 'function') {
        renderDashProveedores();
    }
}

async function saveFactura(event) {
    event.preventDefault();
    
    // If standalone/dashboard mode, pick up proveedor from search
    if (window.facturaActionContext === 'standalone-porpagar' || window.facturaActionContext === 'dashboard-porpagar') {
        var selId = document.getElementById('facturaProveedorId');
        if (selId && selId.value) {
            currentProveedorId = parseInt(selId.value);
        }
        if (!currentProveedorId) {
            alert('Selecciona un proveedor primero');
            return;
        }
    }
    
    showLoading();
    
    try {
        const docFile = _facturaFile || document.getElementById('facturaDocumento').files[0] || null;
        
        const facturaData = {
            proveedor_id: currentProveedorId,
            numero: document.getElementById('facturaNumero').value || null,
            fecha: document.getElementById('facturaFecha').value,
            vencimiento: document.getElementById('facturaVencimiento').value,
            monto: parseFloat(document.getElementById('facturaMonto').value),
            iva: parseFloat(document.getElementById('facturaIVA').value) || 0
        };
        
        // Upload doc to Drive if provided
        if (docFile) {
            if (typeof isGoogleConnected === 'function' && isGoogleConnected()) {
                try {
                    // Use date-based folder: Year / MM. MES / Facturas proveedores /
                    var facturaFecha = facturaData.fecha;
                    var folderId = await getFacturasProveedoresFolderId(facturaFecha);
                    
                    // Rename file: PROVEEDOR original_name.ext
                    var prov = proveedores.find(p => p.id === currentProveedorId);
                    var provName = prov ? prov.nombre.toUpperCase() : '';
                    var originalName = docFile.name;
                    var uploadName = provName ? (provName + ' ' + originalName) : originalName;
                    var renamedFile = new File([docFile], uploadName, { type: docFile.type });
                    
                    var result = await uploadFileToDrive(renamedFile, folderId);
                    facturaData.documento_drive_file_id = result.id;
                } catch (e) {
                    console.error('⚠️ Drive upload failed, using base64:', e);
                    facturaData.documento_file = await fileToBase64(docFile);
                }
            } else {
                facturaData.documento_file = await fileToBase64(docFile);
            }
        }
        
        if (window.isEditingFactura && currentFacturaId) {
            delete facturaData.proveedor_id;
            const { error } = await supabaseClient
                .from('facturas')
                .update(facturaData)
                .eq('id', currentFacturaId);
            
            if (error) throw error;
        } else {
            if (!docFile) facturaData.documento_file = null;
            
            const { error } = await supabaseClient
                .from('facturas')
                .insert([facturaData]);
            
            if (error) throw error;
        }
        
        await loadProveedores();
        var modal = document.getElementById('registrarFacturaModal');
        if (modal) modal.classList.remove('active');
        if (typeof _resetFacturaFile === 'function') _resetFacturaFile();
        navigateAfterFacturaAction('porpagar');
        
        window.isEditingFactura = false;
        currentFacturaId = null;
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al guardar factura: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function savePagoFactura(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const pagoFile = document.getElementById('pagoPDFFactura').files[0];
        const fechaPago = document.getElementById('fechaPagoFactura').value;
        
        const updateData = { fecha_pago: fechaPago };
        
        if (pagoFile) {
            if (typeof isGoogleConnected === 'function' && isGoogleConnected()) {
                try {
                    // Use date-based folder: Year / MM. MES / Pagos proveedores /
                    var folderId = await getPagosProveedoresFolderId(fechaPago);
                    
                    var prov = proveedores.find(p => p.id === currentProveedorId);
                    var provName = prov ? prov.nombre.toUpperCase() : '';
                    var uploadName = provName ? (provName + ' ' + pagoFile.name) : pagoFile.name;
                    var renamedFile = new File([pagoFile], uploadName, { type: pagoFile.type });
                    
                    var result = await uploadFileToDrive(renamedFile, folderId);
                    updateData.pago_drive_file_id = result.id;
                } catch (e) {
                    console.error('⚠️ Drive upload failed, using base64:', e);
                    updateData.pago_file = await fileToBase64(pagoFile);
                }
            } else {
                updateData.pago_file = await fileToBase64(pagoFile);
            }
        }
        
        const { error } = await supabaseClient
            .from('facturas')
            .update(updateData)
            .eq('id', currentFacturaId);
        
        if (error) throw error;
        
        await loadProveedores();
        var pModal = document.getElementById('pagarFacturaModal');
        if (pModal) pModal.classList.remove('active');
        navigateAfterFacturaAction('pagadas');
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al registrar pago: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function deleteFactura(facturaId) {
    showLoading();
    
    try {
        const { error } = await supabaseClient
            .from('facturas')
            .delete()
            .eq('id', facturaId);
        
        if (error) throw error;
        
        await loadProveedores();
        navigateAfterFacturaAction('porpagar');
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al eliminar factura: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// REGISTRAR FACTURA DESDE DASHBOARD
// ============================================

var _proveedorListSorted = [];

function showRegistrarFacturaFromDash() {
    // Prepare sorted list
    _proveedorListSorted = (typeof proveedores !== 'undefined' ? proveedores : []).slice().sort(function(a, b) {
        return a.nombre.localeCompare(b.nombre);
    });
    
    // Mark as dashboard context
    window.facturaActionContext = 'dashboard-porpagar';
    currentProveedorId = null;
    
    // Open the regular factura modal (which will show the proveedor row)
    if (typeof showRegistrarFacturaModal === 'function') {
        showRegistrarFacturaModal();
    }
}

function filterFacturaProveedorList() {
    var input = document.getElementById('facturaProveedorSearch');
    var query = input.value.toLowerCase().trim();
    var results = document.getElementById('facturaProveedorResults');
    
    // Clear selection when typing
    document.getElementById('facturaProveedorId').value = '';
    currentProveedorId = null;
    // Reset styling to normal
    input.style.borderColor = 'var(--border)';
    input.style.background = '';
    
    if (query.length === 0) {
        results.style.display = 'none';
        results.innerHTML = '';
        return;
    }
    
    var matches = _proveedorListSorted.filter(function(p) {
        return p.nombre.toLowerCase().includes(query);
    });
    
    if (matches.length === 0) {
        results.style.display = 'block';
        results.innerHTML = '<div style="padding:0.5rem 0.7rem;color:var(--text-light);font-size:0.85rem;">Sin resultados</div>';
        return;
    }
    
    var html = '';
    matches.forEach(function(p) {
        html += '<div onclick="selectFacturaProveedor(' + p.id + ',\'' + p.nombre.replace(/'/g, "\\'") + '\')" style="padding:0.45rem 0.7rem;cursor:pointer;font-size:0.88rem;border-bottom:1px solid #f1f5f9;transition:background 0.1s;" onmouseover="this.style.background=\'#f0f9ff\'" onmouseout="this.style.background=\'\'">' +
            '<strong>' + p.nombre + '</strong>' +
            (p.servicio ? '<span style="color:var(--text-light);font-size:0.78rem;margin-left:0.5rem;">' + p.servicio + '</span>' : '') +
            '</div>';
    });
    
    results.innerHTML = html;
    results.style.display = 'block';
}

function selectFacturaProveedor(id, nombre) {
    document.getElementById('facturaProveedorId').value = id;
    document.getElementById('facturaProveedorSearch').value = nombre;
    document.getElementById('facturaProveedorResults').style.display = 'none';
    currentProveedorId = id;
    
    // Visual confirmation
    var input = document.getElementById('facturaProveedorSearch');
    input.style.borderColor = '#86efac';
    input.style.background = '#f0fdf4';
}

console.log('✅ DB-FACTURAS.JS v5 cargado');
