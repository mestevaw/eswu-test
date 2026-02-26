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
    
    if (ctx === 'standalone-porpagar') {
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
}

async function saveFactura(event) {
    event.preventDefault();
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
                var prov = proveedores.find(p => p.id === currentProveedorId);
                if (prov) {
                    try {
                        var folderId = prov.google_drive_folder_id;
                        if (!folderId) {
                            folderId = await getOrCreateProveedorFolder(prov.nombre);
                            await supabaseClient.from('proveedores')
                                .update({ google_drive_folder_id: folderId })
                                .eq('id', currentProveedorId);
                        }
                        var result = await uploadFileToDrive(docFile, folderId);
                        facturaData.documento_drive_file_id = result.id;
                    } catch (e) {
                        console.error('⚠️ Drive upload failed, using base64');
                        facturaData.documento_file = await fileToBase64(docFile);
                    }
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
        closeModal('registrarFacturaModal');
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
                var prov = proveedores.find(p => p.id === currentProveedorId);
                if (prov) {
                    try {
                        var folderId = prov.google_drive_folder_id;
                        if (!folderId) {
                            folderId = await getOrCreateProveedorFolder(prov.nombre);
                            await supabaseClient.from('proveedores')
                                .update({ google_drive_folder_id: folderId })
                                .eq('id', currentProveedorId);
                        }
                        var result = await uploadFileToDrive(pagoFile, folderId);
                        updateData.pago_drive_file_id = result.id;
                    } catch (e) {
                        console.error('⚠️ Drive upload failed, using base64');
                        updateData.pago_file = await fileToBase64(pagoFile);
                    }
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
        closeModal('pagarFacturaModal');
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

console.log('✅ DB-FACTURAS.JS v5 cargado');
