/* ========================================
   DB-INQUILINOS.JS
   Carga, guardado, edición y eliminación de inquilinos
   ======================================== */

// ============================================
// LOAD
// ============================================

async function loadInquilinos() {
    try {
        // SELECT sin campos pesados (contrato_file, pago_file, archivo_pdf)
        const { data, error } = await supabaseClient
            .from('inquilinos')
            .select('id, nombre, clabe, rfc, m2, renta, fecha_inicio, fecha_vencimiento, notas, numero_despacho, contrato_activo, fecha_terminacion, google_drive_folder_id, contrato_drive_file_id, pagos_inquilinos(id, inquilino_id, fecha, monto, completo), inquilinos_documentos(id, inquilino_id, nombre_documento, fecha_guardado, usuario_guardo, google_drive_file_id), inquilinos_contactos(*)')
            .order('nombre');
        
        if (error) throw error;
        
        // Verificar cuáles tienen contrato base64 (sin cargar el PDF)
        const { data: conContrato } = await supabaseClient
            .from('inquilinos')
            .select('id')
            .not('contrato_file', 'is', null);
        const contratoSet = new Set((conContrato || []).map(i => i.id));
        
        // Verificar cuáles pagos tienen comprobante (sin cargar el PDF)
        const { data: conPagoFile } = await supabaseClient
            .from('pagos_inquilinos')
            .select('id')
            .not('pago_file', 'is', null);
        const pagoFileSet = new Set((conPagoFile || []).map(p => p.id));
        
        inquilinos = data.map(inq => ({
            id: inq.id,
            nombre: inq.nombre,
            clabe: inq.clabe,
            rfc: inq.rfc,
            m2: inq.m2,
            renta: parseFloat(inq.renta || 0),
            fecha_inicio: inq.fecha_inicio,
            fecha_vencimiento: inq.fecha_vencimiento,
            notas: inq.notas,
            numero_despacho: inq.numero_despacho,
            contrato_activo: inq.contrato_activo,
            fecha_terminacion: inq.fecha_terminacion,
            google_drive_folder_id: inq.google_drive_folder_id || '',
            contrato_drive_file_id: inq.contrato_drive_file_id || '',
            has_contrato: contratoSet.has(inq.id) || !!(inq.contrato_drive_file_id && inq.contrato_drive_file_id !== ''),
            contactos: inq.inquilinos_contactos ? inq.inquilinos_contactos.map(c => ({
                id: c.id,
                nombre: c.nombre,
                telefono: c.telefono,
                email: c.email
            })) : [],
            pagos: inq.pagos_inquilinos ? inq.pagos_inquilinos.map(p => ({
                id: p.id,
                fecha: p.fecha,
                monto: parseFloat(p.monto),
                completo: p.completo,
                has_pago_file: pagoFileSet.has(p.id)
            })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)) : [],
            documentos: inq.inquilinos_documentos ? inq.inquilinos_documentos.map(d => ({
                id: d.id,
                nombre: d.nombre_documento,
                fecha: d.fecha_guardado,
                usuario: d.usuario_guardo,
                google_drive_file_id: d.google_drive_file_id || ''
            })).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')) : []
        }));
        
        console.log('✅ Inquilinos cargados:', inquilinos.length, '(sin PDFs)');
    } catch (error) {
        console.error('❌ Error loading inquilinos:', error);
        throw error;
    }
}

// ============================================
// SAVE INQUILINO
// ============================================

async function saveInquilino(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const inquilinoData = {
            nombre: document.getElementById('inquilinoNombre').value,
            clabe: document.getElementById('inquilinoClabe').value || null,
            rfc: document.getElementById('inquilinoRFC').value || null,
            m2: document.getElementById('inquilinoM2').value || null,
            numero_despacho: document.getElementById('inquilinoDespacho').value || null,
            renta: parseFloat(document.getElementById('inquilinoRenta').value),
            fecha_inicio: document.getElementById('inquilinoFechaInicio').value,
            fecha_vencimiento: document.getElementById('inquilinoFechaVenc').value,
            notas: document.getElementById('inquilinoNotas').value || null
        };
        
        let inquilinoId;
        
        if (isEditMode && currentInquilinoId) {
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
        isEditMode = false;
        showInquilinoDetail(inquilinoId);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar inquilino: ' + error.message);
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
        const inquilino = inquilinos.find(i => i.id === currentInquilinoId);
        const completo = document.getElementById('pagoCompleto').value === 'si';
        
        let monto;
        if (completo) {
            if (window.pagoMesContext) {
                monto = window.pagoMesContext.balance;
            } else {
                monto = inquilino.renta;
            }
        } else {
            monto = parseFloat(document.getElementById('pagoMonto').value);
        }
        
        const pagoFile = document.getElementById('pagoPDF').files[0];
        let pagoURL = null;
        
        if (pagoFile) {
            pagoURL = await fileToBase64(pagoFile);
        }
        
        const pagoData = {
            inquilino_id: currentInquilinoId,
            fecha: document.getElementById('pagoFecha').value,
            monto: monto,
            completo: completo,
            pago_file: pagoURL
        };
        
        const { error } = await supabaseClient
            .from('pagos_inquilinos')
            .insert([pagoData]);
        
        if (error) throw error;
        
        delete window.pagoMesContext;
        
        await loadInquilinos();
        closeModal('registrarPagoModal');
        showInquilinoDetail(currentInquilinoId);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al registrar pago: ' + error.message);
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
        const inq = inquilinos.find(i => i.id === currentInquilinoId);
        const file = document.getElementById('nuevoDocPDF').files[0];
        
        if (!file) {
            throw new Error('Seleccione un archivo PDF');
        }
        
        // Check if marked as contrato original
        const radioSi = document.querySelector('input[name="esContratoNuevoDoc"][value="si"]');
        const esContratoOriginal = radioSi && radioSi.checked;
        
        if (esContratoOriginal) {
            // Upload contrato to Drive or base64
            if (typeof isGoogleConnected === 'function' && isGoogleConnected() && inq) {
                var folderId = inq.google_drive_folder_id;
                if (!folderId) {
                    folderId = await getOrCreateInquilinoFolder(inq.nombre);
                }
                var result = await uploadFileToDrive(file, folderId);
                await supabaseClient
                    .from('inquilinos')
                    .update({ contrato_drive_file_id: result.id, google_drive_folder_id: folderId })
                    .eq('id', currentInquilinoId);
            } else {
                var pdfBase64 = await fileToBase64(file);
                await supabaseClient
                    .from('inquilinos')
                    .update({ contrato_file: pdfBase64 })
                    .eq('id', currentInquilinoId);
            }
            
            await loadInquilinos();
            closeModal('agregarDocumentoModal');
            showInquilinoDetail(currentInquilinoId);
            setTimeout(() => switchTab('inquilino', 'docs'), 100);
            hideLoading();
            return;
        }
        
        const nombre = document.getElementById('nuevoDocNombre').value;
        
        if (!nombre) {
            throw new Error('Ingresa el nombre del documento');
        }
        
        var docData = {
            inquilino_id: currentInquilinoId,
            nombre_documento: nombre,
            fecha_guardado: new Date().toISOString().split('T')[0],
            usuario_guardo: currentUser ? currentUser.nombre : 'Sistema'
        };
        
        // Upload to Drive if connected
        if (typeof isGoogleConnected === 'function' && isGoogleConnected() && inq) {
            var folderId = inq.google_drive_folder_id;
            if (!folderId) {
                try {
                    folderId = await getOrCreateInquilinoFolder(inq.nombre);
                    await supabaseClient
                        .from('inquilinos')
                        .update({ google_drive_folder_id: folderId })
                        .eq('id', currentInquilinoId);
                } catch (e) {
                    console.error('⚠️ No se encontró carpeta Drive');
                }
            }
            
            if (folderId) {
                var result = await uploadFileToDrive(file, folderId);
                docData.google_drive_file_id = result.id;
                docData.archivo_pdf = '';
            } else {
                docData.archivo_pdf = await fileToBase64(file);
            }
        } else {
            docData.archivo_pdf = await fileToBase64(file);
        }
        
        const { error } = await supabaseClient
            .from('inquilinos_documentos')
            .insert([docData]);
        
        if (error) throw error;
        
        await loadInquilinos();
        closeModal('agregarDocumentoModal');
        showInquilinoDetail(currentInquilinoId);
        setTimeout(() => switchTab('inquilino', 'docs'), 100);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar documento: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// EDIT INQUILINO
// ============================================

function editInquilino() {
    const inq = inquilinos.find(i => i.id === currentInquilinoId);
    if (!inq) return;
    
    isEditMode = true;
    tempInquilinoContactos = [...(inq.contactos || [])];
    
    document.getElementById('addInquilinoTitle').textContent = 'Editar Inquilino';
    document.getElementById('inquilinoNombre').value = inq.nombre;
    document.getElementById('inquilinoClabe').value = inq.clabe || '';
    document.getElementById('inquilinoRFC').value = inq.rfc || '';
    document.getElementById('inquilinoM2').value = inq.m2 || '';
    document.getElementById('inquilinoDespacho').value = inq.numero_despacho || '';
    document.getElementById('inquilinoRenta').value = inq.renta;
    document.getElementById('inquilinoFechaInicio').value = inq.fecha_inicio;
    document.getElementById('inquilinoFechaVenc').value = inq.fecha_vencimiento;
    document.getElementById('inquilinoNotas').value = inq.notas || '';
    
    renderContactosList(tempInquilinoContactos, 'inquilinoContactosList', 'deleteInquilinoContacto', 'showEditContactoInquilinoModal');
    
    closeModal('inquilinoDetailModal');
    document.getElementById('addInquilinoModal').classList.add('active');
}

// ============================================
// DELETE INQUILINO
// ============================================

async function deleteInquilino() {
    if (!confirm('¿Está seguro de eliminar este inquilino? Esta acción no se puede deshacer.')) {
        return;
    }
    
    showLoading();
    
    try {
        const { error } = await supabaseClient
            .from('inquilinos')
            .delete()
            .eq('id', currentInquilinoId);
        
        if (error) throw error;
        
        await loadInquilinos();
        closeModal('inquilinoDetailModal');
        
        if (currentSubContext === 'inquilinos-list') {
            renderInquilinosTable();
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar inquilino: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// TERMINAR CONTRATO
// ============================================

async function terminarContratoInquilino() {
    const fechaTerminacion = prompt('Ingresa la fecha de terminación del contrato (YYYY-MM-DD):');
    
    if (!fechaTerminacion) return;
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTerminacion)) {
        alert('Formato de fecha inválido. Usa YYYY-MM-DD (ejemplo: 2026-02-15)');
        return;
    }
    
    if (!confirm('¿Está seguro de terminar el contrato de este inquilino?')) {
        return;
    }
    
    showLoading();
    
    try {
        const { error } = await supabaseClient
            .from('inquilinos')
            .update({
                contrato_activo: false,
                fecha_terminacion: fechaTerminacion
            })
            .eq('id', currentInquilinoId);
        
        if (error) throw error;
        
        await loadInquilinos();
        closeModal('inquilinoDetailModal');
        
        if (currentSubContext === 'inquilinos-list') {
            renderInquilinosTable();
        }
        
        alert('✅ Contrato terminado correctamente');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al terminar contrato: ' + error.message);
    } finally {
        hideLoading();
    }
}

console.log('✅ DB-INQUILINOS.JS cargado');
