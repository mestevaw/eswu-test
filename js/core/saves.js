/* ========================================
   SAVES.JS - Save Functions
   ======================================== */

// ============================================
// SAVE INQUILINO
// ============================================

async function saveInquilino(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const contratoFile = document.getElementById('inquilinoContrato').files[0];
        let contratoURL = null;
        
        if (contratoFile) {
            const contratoBase64 = await fileToBase64(contratoFile);
            contratoURL = contratoBase64;
        }
        
        const inquilinoData = {
            nombre: document.getElementById('inquilinoNombre').value,
            clabe: document.getElementById('inquilinoClabe').value || null,
            rfc: document.getElementById('inquilinoRFC').value || null,
            m2: document.getElementById('inquilinoM2').value || null,
            numero_despacho: document.getElementById('inquilinoDespacho').value || null,
            renta: parseFloat(document.getElementById('inquilinoRenta').value),
            fecha_inicio: document.getElementById('inquilinoFechaInicio').value,
            fecha_vencimiento: document.getElementById('inquilinoFechaVenc').value,
            contrato_file: contratoURL,
            notas: document.getElementById('inquilinoNotas').value || null
        };
        
        let inquilinoId;
        
        if (isEditMode && currentInquilinoId) {
            if (!contratoURL && inquilinos.find(i => i.id === currentInquilinoId)?.contrato_file) {
                delete inquilinoData.contrato_file;
            }
            
            const { error } = await supabaseClient
                .from('inquilinos')
                .update(inquilinoData)
                .eq('id', currentInquilinoId);
            
            if (error) throw error;
            
            await supabaseClient
                .from('inquilinos_contactos')
                .delete()
                .eq('inquilino_id', currentInquilinoId);
            
            inquilinoId = currentInquilinoId;
        } else {
            const { data, error } = await supabaseClient
                .from('inquilinos')
                .insert([inquilinoData])
                .select();
            
            if (error) throw error;
            inquilinoId = data[0].id;
        }
        
        if (tempInquilinoContactos.length > 0) {
            const contactosToInsert = tempInquilinoContactos.map(c => ({
                inquilino_id: inquilinoId,
                nombre: c.nombre,
                telefono: c.telefono || null,
                email: c.email || null
            }));
            
            const { error: contactosError } = await supabaseClient
                .from('inquilinos_contactos')
                .insert(contactosToInsert);
            
            if (contactosError) throw contactosError;
        }
        
        await loadInquilinos();
        closeModal('addInquilinoModal');
        
        if (currentSubContext === 'inquilinos-list') {
            renderInquilinosTable();
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar inquilino: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// SAVE PROVEEDOR
// ============================================

async function saveProveedor(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const proveedorData = {
            nombre: document.getElementById('proveedorNombre').value,
            servicio: document.getElementById('proveedorServicio').value,
            clabe: document.getElementById('proveedorClabe').value || null,
            rfc: document.getElementById('proveedorRFC').value || null,
            notas: document.getElementById('proveedorNotas').value || null
        };
        
        let proveedorId;
        
        if (isEditMode && currentProveedorId) {
            // MODO EDICIÓN
            const { error } = await supabaseClient
                .from('proveedores')
                .update(proveedorData)
                .eq('id', currentProveedorId);
            
            if (error) throw error;
            
            console.log('✅ Proveedor actualizado:', currentProveedorId);
            
            // Borrar contactos existentes
            await supabaseClient
                .from('proveedores_contactos')
                .delete()
                .eq('proveedor_id', currentProveedorId);
            
            proveedorId = currentProveedorId;
            
            // Resetear modo edición
            isEditMode = false;
            currentProveedorId = null;
        } else {
            // MODO CREAR NUEVO
            const { data, error } = await supabaseClient
                .from('proveedores')
                .insert([proveedorData])
                .select();
            
            if (error) throw error;
            
            console.log('✅ Proveedor creado');
            proveedorId = data[0].id;
        }
        
        // Guardar contactos
        if (tempProveedorContactos.length > 0) {
            const contactosToInsert = tempProveedorContactos.map(c => ({
                proveedor_id: proveedorId,
                nombre: c.nombre,
                telefono: c.telefono || null,
                email: c.email || null
            }));
            
            const { error: contactosError } = await supabaseClient
                .from('proveedores_contactos')
                .insert(contactosToInsert);
            
            if (contactosError) throw contactosError;
        }
        
        // ✅ CRÍTICO: Cerrar modal primero
        closeModal('addProveedorModal');
        
        // ✅ CRÍTICO: Resetear formulario
        document.getElementById('proveedorForm').reset();
        tempProveedorContactos = [];
        
        // ✅ CRÍTICO: Recargar COMPLETO
        await ensureProveedoresFullLoaded();
        
        // ✅ CRÍTICO: Dar tiempo para que cargue
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Recargar vistas según contexto
        if (document.getElementById('proveedorDetailModal').classList.contains('active')) {
            // Si venimos del detalle, recargarlo con el ID correcto
            const idToShow = isEditMode ? currentProveedorId : proveedorId;
            showProveedorDetail(idToShow);
        }
        
        if (currentSubContext === 'proveedores-list') {
            renderProveedoresTable();
        }
        
        alert('✅ Proveedor guardado correctamente');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar proveedor: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// SAVE PAGO RENTA
// ============================================

async function savePagoRenta(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const fecha = document.getElementById('pagoFecha').value;
        const pagoCompleto = document.getElementById('pagoCompleto').value;
        const file = document.getElementById('pagoPDF').files[0];
        
        const inquilino = inquilinos.find(i => i.id === currentInquilinoId);
        if (!inquilino) {
            throw new Error('Inquilino no encontrado');
        }
        
        let monto;
        if (pagoCompleto === 'si') {
            monto = inquilino.renta;
        } else {
            monto = parseFloat(document.getElementById('pagoMonto').value);
            if (!monto || monto <= 0) {
                throw new Error('El monto debe ser mayor a 0');
            }
        }
        
        let pagoFileData = null;
        if (file) {
            pagoFileData = await fileToBase64(file);
        }
        
        const { error } = await supabaseClient
            .from('pagos_inquilinos')
            .insert([{
                inquilino_id: currentInquilinoId,
                fecha: fecha,
                monto: monto,
                completo: pagoCompleto === 'si',
                pago_file: pagoFileData
            }]);
        
        if (error) throw error;
        
        await loadInquilinos();
        
        closeModal('registrarPagoModal');
        
        // Refrescar la vista del inquilino
        if (currentInquilinoId) {
            showInquilinoDetail(currentInquilinoId);
        }
        
        alert('✅ Pago registrado correctamente');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar pago: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// SAVE DOCUMENTO ADICIONAL
// ============================================

async function saveDocumentoAdicional(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const nombre = document.getElementById('nuevoDocNombre').value;
        const file = document.getElementById('nuevoDocPDF').files[0];
        
        if (!file) {
            throw new Error('Seleccione un archivo PDF');
        }
        
        const pdfBase64 = await fileToBase64(file);
        
        const { error } = await supabaseClient
            .from('inquilinos_documentos')
            .insert([{
                inquilino_id: currentInquilinoId,
                nombre_documento: nombre,
                archivo_pdf: pdfBase64,
                fecha_guardado: new Date().toISOString().split('T')[0],
                usuario_guardo: currentUser.nombre
            }]);
        
        if (error) throw error;
        
        await loadInquilinos();
        showInquilinoDetail(currentInquilinoId);
        closeModal('agregarDocumentoModal');
        
        alert('✅ Documento agregado correctamente');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar documento: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// SAVE FACTURA
// ============================================

async function saveFactura(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const numero = document.getElementById('facturaNumero').value;
        const fecha = document.getElementById('facturaFecha').value;
        const vencimiento = document.getElementById('facturaVencimiento').value;
        const monto = parseFloat(document.getElementById('facturaMonto').value);
        const iva = parseFloat(document.getElementById('facturaIVA').value) || null;
        
        const docFile = document.getElementById('facturaDocumento').files[0];
        let docURL = null;
        
        if (docFile) {
            docURL = await fileToBase64(docFile);
        }
        
        const facturaData = {
            proveedor_id: currentProveedorId,
            numero: numero || null,
            fecha: fecha,
            vencimiento: vencimiento,
            monto: monto,
            iva: iva
        };
        
        // Solo agregar documento si hay archivo nuevo
        if (docURL) {
            facturaData.documento_file = docURL;
        }
        
        // Detectar si es edición o creación
        if (isEditMode && currentFacturaId) {
            // MODO EDICIÓN
            const { error } = await supabaseClient
                .from('facturas')
                .update(facturaData)
                .eq('id', currentFacturaId);
            
            if (error) throw error;
            
            console.log('✅ Factura actualizada:', currentFacturaId);
            
            // Resetear modo edición
            isEditMode = false;
            currentFacturaId = null;
        } else {
            // MODO CREAR NUEVA
            const { error } = await supabaseClient
                .from('facturas')
                .insert([facturaData]);
            
            if (error) throw error;
            
            console.log('✅ Factura creada');
        }
        
      // ✅ CRÍTICO: Primero cerrar modal
        closeModal('registrarFacturaModal');
        
        // ✅ CRÍTICO: Resetear formulario
        document.getElementById('facturaForm').reset();
        document.getElementById('facturaDocumentoFileName').textContent = '';
        
        // ✅ CRÍTICO: Recargar COMPLETO proveedores
        await ensureProveedoresFullLoaded();
        
        // ✅ CRÍTICO: Dar tiempo para que cargue
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Recargar vistas según donde estemos
        if (document.getElementById('proveedorDetailModal').classList.contains('active')) {
            showProveedorDetail(currentProveedorId);
        }
        
        if (currentSubContext === 'proveedores-facturasPorPagar') {
            renderProveedoresFacturasPorPagar();
        } else if (currentSubContext === 'proveedores-facturasPagadas') {
            renderProveedoresFacturasPagadas();
        }
        
        alert('✅ Factura guardada correctamente');
        
    } catch (error) {
        console.error('Error guardando factura:', error);
        alert('❌ Error al guardar factura: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function savePagoFactura(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const fechaPago = document.getElementById('fechaPagoFactura').value;
        const pagoCompleto = document.getElementById('pagoFacturaCompleto').value;
        const file = document.getElementById('pagoPDFFactura').files[0];
        
        let pagoFileData = null;
        if (file) {
            pagoFileData = await fileToBase64(file);
        }
        
        // Obtener la factura actual
        let facturaActual = null;
        let proveedorActual = null;
        
        for (const prov of proveedores) {
            if (prov.facturas) {
                facturaActual = prov.facturas.find(f => f.id === currentFacturaId);
                if (facturaActual) {
                    proveedorActual = prov;
                    break;
                }
            }
        }
        
        if (!facturaActual) {
            throw new Error('Factura no encontrada');
        }
        
        if (pagoCompleto === 'si') {
            // PAGO COMPLETO: Solo actualizar fecha_pago y archivo
            const { error } = await supabaseClient
                .from('facturas')
                .update({
                    fecha_pago: fechaPago,
                    pago_file: pagoFileData
                })
                .eq('id', currentFacturaId);
            
            if (error) throw error;
            
        } else {
            // PAGO PARCIAL
            const montoParcial = parseFloat(document.getElementById('montoPagoFacturaParcial').value);
            
            if (!montoParcial || montoParcial <= 0) {
                throw new Error('El monto parcial debe ser mayor a 0');
            }
            
            if (montoParcial >= facturaActual.monto) {
                throw new Error('El monto parcial debe ser menor al total de la factura');
            }
            
            const montoRestante = facturaActual.monto - montoParcial;
            const ivaRestante = facturaActual.iva ? (facturaActual.iva * montoRestante / facturaActual.monto) : null;
            const ivaParcial = facturaActual.iva ? (facturaActual.iva * montoParcial / facturaActual.monto) : null;
            
            // 1. Actualizar factura original con el monto restante (queda pendiente)
            const { error: updateError } = await supabaseClient
                .from('facturas')
                .update({
                    monto: montoRestante,
                    iva: ivaRestante
                })
                .eq('id', currentFacturaId);
            
            if (updateError) throw updateError;
            
            // 2. Crear nueva factura con el monto pagado (marcada como pagada)
            const { error: insertError } = await supabaseClient
                .from('facturas')
                .insert([{
                    proveedor_id: proveedorActual.id,
                    numero: facturaActual.numero + ' (Parcial)',
                    fecha: facturaActual.fecha,
                    vencimiento: facturaActual.vencimiento,
                    monto: montoParcial,
                    iva: ivaParcial,
                    fecha_pago: fechaPago,
                    documento_file: facturaActual.documento_file,
                    pago_file: pagoFileData
                }]);
            
            if (insertError) throw insertError;
        }
        
        // ✅ CRÍTICO: RECARGAR PROVEEDORES COMPLETO
        await ensureProveedoresFullLoaded();
        
        closeModal('pagarFacturaModal');
        
        // Refrescar la vista del proveedor
        if (currentProveedorId && document.getElementById('proveedorDetailModal').classList.contains('active')) {
            showProveedorDetail(currentProveedorId);
        }
        
        // Refrescar vistas si están activas
        if (currentSubContext === 'proveedores-facturasPorPagar') {
            renderProveedoresFacturasPorPagar();
        } else if (currentSubContext === 'proveedores-facturasPagadas') {
            renderProveedoresFacturasPagadas();
        }
        
        alert('✅ Pago registrado correctamente');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar pago: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// SAVE ESTACIONAMIENTO
// ============================================

async function saveEstacionamiento() {
    showLoading();
    try {
        const inquilinoSeleccionado = document.getElementById('editEspacioInquilino').value;
        const despacho = document.getElementById('editEspacioDespacho').value;
        
        const { error } = await supabaseClient
            .from('estacionamiento')
            .update({
                inquilino_nombre: inquilinoSeleccionado || null,
                numero_despacho: despacho || null
            })
            .eq('id', currentEstacionamientoId);
        
        if (error) throw error;
        
        await loadEstacionamiento();
        renderEstacionamientoTable();
        closeModal('editEstacionamientoModal');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// SAVE BITACORA
// ============================================

async function saveBitacora() {
    showLoading();
    try {
        const fecha = document.getElementById('editBitacoraFecha').value;
        const notas = document.getElementById('editBitacoraNotas').value;
        
        const { error } = await supabaseClient
            .from('bitacora_semanal')
            .update({
                semana_inicio: fecha,
                notas: notas
            })
            .eq('id', currentBitacoraId);
        
        if (error) throw error;
        
        await loadBitacoraSemanal();
        renderBitacoraTable();
        closeModal('editBitacoraModal');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar bitácora: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// SAVE BANCO DOCUMENTO
// ============================================

async function saveBancoDoc(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const tipo = document.getElementById('bancoTipo').value;
        const file = document.getElementById('bancoDocumento').files[0];
        
        if (!file) {
            throw new Error('Seleccione un archivo PDF');
        }
        
        const pdfBase64 = await fileToBase64(file);
        
        const { error } = await supabaseClient
            .from('bancos_documentos')
            .insert([{
                tipo: tipo,
                archivo_pdf: pdfBase64,
                fecha_subida: new Date().toISOString().split('T')[0],
                usuario_subio: currentUser.nombre
            }]);
        
        if (error) throw error;
        
        await loadBancosDocumentos();
        renderBancosTable();
        closeModal('addBancoModal');
        
        alert('Documento guardado exitosamente');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar documento: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// SAVE CONTACTO INQUILINO
// ============================================

function saveContactoInquilino(event) {
    event.preventDefault();
    
    const contacto = {
        nombre: document.getElementById('contactoInquilinoNombre').value,
        telefono: document.getElementById('contactoInquilinoTelefono').value,
        email: document.getElementById('contactoInquilinoEmail').value
    };
    
    if (window.editingContactoIndex !== undefined) {
        tempInquilinoContactos[window.editingContactoIndex] = contacto;
        delete window.editingContactoIndex;
    } else {
        tempInquilinoContactos.push(contacto);
    }
    
    renderContactosList(tempInquilinoContactos, 'inquilinoContactosList', 'deleteInquilinoContacto', 'showEditContactoInquilinoModal');
    
    document.getElementById('contactoInquilinoForm').reset();
    closeModal('addContactoInquilinoModal');
}

// ============================================
// SAVE CONTACTO PROVEEDOR
// ============================================

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

// ============================================
// TERMINAR CONTRATO
// ============================================

async function terminarContratoInquilino() {
    if (!confirm('¿Terminar contrato de este inquilino? Se marcará como inactivo.')) return;
    
    showLoading();
    try {
        const { error } = await supabaseClient
            .from('inquilinos')
            .update({ activo: false })
            .eq('id', currentInquilinoId);
        
        if (error) throw error;
        
        await loadInquilinos();
        closeModal('inquilinoDetailModal');
        renderInquilinosTable();
        
        alert('Contrato terminado exitosamente');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al terminar contrato: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// BITÁCORA - AGREGAR SEMANA
// ============================================

async function agregarSemanaBitacora() {
    showLoading();
    try {
        // Obtener la última semana
        const { data: lastWeek, error: lastError } = await supabaseClient
            .from('bitacora_semanal')
            .select('semana_inicio')
            .order('semana_inicio', { ascending: false })
            .limit(1)
            .single();
        
        let nuevaFechaInicio;
        
        if (lastWeek) {
            // Calcular siguiente lunes después de la última semana
            const ultimaFecha = new Date(lastWeek.semana_inicio);
            nuevaFechaInicio = new Date(ultimaFecha);
            nuevaFechaInicio.setDate(nuevaFechaInicio.getDate() + 7);
        } else {
            // Si no hay semanas, usar el próximo lunes
            const hoy = new Date();
            const dia = hoy.getDay();
            const diasHastaLunes = dia === 0 ? 1 : (8 - dia);
            nuevaFechaInicio = new Date(hoy);
            nuevaFechaInicio.setDate(hoy.getDate() + diasHastaLunes);
        }
        
        // Calcular fecha fin (6 días después = domingo)
        const nuevaFechaFin = new Date(nuevaFechaInicio);
        nuevaFechaFin.setDate(nuevaFechaInicio.getDate() + 6);
        
        // Formato de texto para semana
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const semanaTexto = `${nuevaFechaInicio.getDate()} al ${nuevaFechaFin.getDate()} ${meses[nuevaFechaFin.getMonth()]} ${nuevaFechaFin.getFullYear()}`;
        
        const { error } = await supabaseClient
            .from('bitacora_semanal')
            .insert([{
                semana_inicio: nuevaFechaInicio.toISOString().split('T')[0],
                semana_fin: nuevaFechaFin.toISOString().split('T')[0],
                semana_texto: semanaTexto,
                notas: ''
            }]);
        
        if (error) throw error;
        
        await loadBitacoraSemanal();
        renderBitacoraTable();
        
        alert('✅ Semana agregada correctamente');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al agregar semana: ' + error.message);
    } finally {
        hideLoading();
    }
}

console.log('✅ SAVES.JS cargado');
