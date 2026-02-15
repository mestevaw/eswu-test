/* ========================================
   DB-FACTURAS.JS - Database operations for facturas
   Última actualización: 2026-02-12 19:00 CST
   ======================================== */

// Función auxiliar: navegar al lugar correcto después de una acción
function navigateAfterFacturaAction(defaultTab) {
    const ctx = window.facturaActionContext;
    window.facturaActionContext = null; // Limpiar
    
    if (ctx === 'standalone-porpagar') {
        // Volver al listado standalone de facturas por pagar
        renderProveedoresFacturasPorPagar();
    } else if (ctx === 'standalone-pagadas') {
        renderProveedoresFacturasPagadas();
    } else {
        // Estamos en la ficha del proveedor
        showProveedorDetail(currentProveedorId);
        if (defaultTab) {
            setTimeout(() => switchTab('proveedor', defaultTab), 100);
        }
    }
}

async function saveFactura(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const docFile = document.getElementById('facturaDocumento').files[0];
        let docURL = null;
        
        if (docFile) {
            docURL = await fileToBase64(docFile);
        }
        
        const facturaData = {
            proveedor_id: currentProveedorId,
            numero: document.getElementById('facturaNumero').value || null,
            fecha: document.getElementById('facturaFecha').value,
            vencimiento: document.getElementById('facturaVencimiento').value,
            monto: parseFloat(document.getElementById('facturaMonto').value),
            iva: parseFloat(document.getElementById('facturaIVA').value) || 0
        };
        
        if (docURL) {
            facturaData.documento_file = docURL;
        }
        
        if (window.isEditingFactura && currentFacturaId) {
            delete facturaData.proveedor_id;
            const { error } = await supabaseClient
                .from('facturas')
                .update(facturaData)
                .eq('id', currentFacturaId);
            
            if (error) throw error;
        } else {
            if (!docURL) facturaData.documento_file = null;
            
            const { error } = await supabaseClient
                .from('facturas')
                .insert([facturaData]);
            
            if (error) throw error;
        }
        
        await loadProveedores();
        closeModal('registrarFacturaModal');
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
            updateData.pago_file = await fileToBase64(pagoFile);
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

console.log('✅ DB-FACTURAS.JS cargado (2026-02-12 19:00 CST)');
