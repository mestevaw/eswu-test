/* ========================================
   DB-PROVEEDORES.JS v2
   OPTIMIZADO: No carga PDFs en memoria
   ======================================== */

async function loadProveedores() {
    try {
        const { data, error } = await supabaseClient
            .from('proveedores')
            .select('id, nombre, servicio, clabe, rfc, notas, google_drive_folder_id, facturas(id, proveedor_id, numero, fecha, vencimiento, monto, iva, fecha_pago, documento_drive_file_id, pago_drive_file_id), proveedores_documentos(id, proveedor_id, nombre_documento, fecha_guardado, usuario_guardo, google_drive_file_id), proveedores_contactos(*)')
            .order('nombre');
        
        if (error) throw error;
        
        // Verificar cuáles facturas tienen documento base64 (sin cargar)
        const { data: conDocumento } = await supabaseClient
            .from('facturas')
            .select('id')
            .not('documento_file', 'is', null);
        const docSet = new Set((conDocumento || []).map(f => f.id));
        
        const { data: conPago } = await supabaseClient
            .from('facturas')
            .select('id')
            .not('pago_file', 'is', null);
        const pagoSet = new Set((conPago || []).map(f => f.id));
        
        proveedores = data.map(prov => ({
            id: prov.id,
            nombre: prov.nombre,
            servicio: prov.servicio,
            clabe: prov.clabe,
            rfc: prov.rfc,
            notas: prov.notas,
            google_drive_folder_id: prov.google_drive_folder_id || '',
            contactos: prov.proveedores_contactos ? prov.proveedores_contactos.map(c => ({
                id: c.id,
                nombre: c.nombre,
                telefono: c.telefono,
                email: c.email
            })) : [],
            facturas: prov.facturas ? prov.facturas.map(f => ({
                id: f.id,
                numero: f.numero,
                fecha: f.fecha,
                vencimiento: f.vencimiento,
                monto: parseFloat(f.monto),
                iva: parseFloat(f.iva || 0),
                fecha_pago: f.fecha_pago,
                documento_drive_file_id: f.documento_drive_file_id || '',
                pago_drive_file_id: f.pago_drive_file_id || '',
                has_documento: docSet.has(f.id) || !!(f.documento_drive_file_id),
                has_pago: pagoSet.has(f.id) || !!(f.pago_drive_file_id)
            })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)) : [],
            documentos: prov.proveedores_documentos ? prov.proveedores_documentos.map(d => ({
                id: d.id,
                nombre: d.nombre_documento,
                fecha: d.fecha_guardado,
                usuario: d.usuario_guardo,
                google_drive_file_id: d.google_drive_file_id || ''
            })).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')) : []
        }));
        
        console.log('✅ Proveedores cargados:', proveedores.length, '(sin PDFs)');
    } catch (error) {
        console.error('❌ Error loading proveedores:', error);
        throw error;
    }
}

async function saveProveedor(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const docFile = document.getElementById('proveedorDocAdicional').files[0];
        let docNombre = null;
        
        if (docFile) {
            docNombre = document.getElementById('proveedorNombreDoc').value;
        }
        
        const proveedorData = {
            nombre: document.getElementById('proveedorNombre').value,
            servicio: document.getElementById('proveedorServicio').value,
            clabe: document.getElementById('proveedorClabe').value || null,
            rfc: document.getElementById('proveedorRFC').value || null,
            notas: document.getElementById('proveedorNotas').value || null
        };
        
        let proveedorId;
        var nombre = proveedorData.nombre;
        
        if (isEditMode && currentProveedorId) {
            const { error } = await supabaseClient
                .from('proveedores')
                .update(proveedorData)
                .eq('id', currentProveedorId);
            
            if (error) throw error;
            
            await supabaseClient
                .from('proveedores_contactos')
                .delete()
                .eq('proveedor_id', currentProveedorId);
            
            proveedorId = currentProveedorId;
        } else {
            const { data, error } = await supabaseClient
                .from('proveedores')
                .insert([proveedorData])
                .select();
            
            if (error) throw error;
            proveedorId = data[0].id;
            
            // Create Drive folder for new proveedor
            if (typeof isGoogleConnected === 'function' && isGoogleConnected()) {
                try {
                    var folderId = await getOrCreateProveedorFolder(nombre);
                    await supabaseClient
                        .from('proveedores')
                        .update({ google_drive_folder_id: folderId })
                        .eq('id', proveedorId);
                } catch (driveErr) {
                    console.error('⚠️ No se pudo crear carpeta Drive:', driveErr);
                }
            }
        }
        
        // Contactos
        const inlineNombre = document.getElementById('proveedorContactoNombreInline').value.trim();
        const inlineTel = document.getElementById('proveedorContactoTelInline').value.trim();
        const inlineEmail = document.getElementById('proveedorContactoEmailInline').value.trim();
        
        if (inlineNombre) {
            const inlineContacto = { nombre: inlineNombre, telefono: inlineTel, email: inlineEmail };
            if (tempProveedorContactos.length > 0) {
                tempProveedorContactos[0] = inlineContacto;
            } else {
                tempProveedorContactos.unshift(inlineContacto);
            }
        }
        
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
        
        // Upload doc to Drive if provided
        if (docFile && docNombre) {
            var docData = {
                proveedor_id: proveedorId,
                nombre_documento: docNombre,
                fecha_guardado: new Date().toISOString().split('T')[0],
                usuario_guardo: currentUser ? currentUser.nombre : 'Sistema'
            };
            
            if (typeof isGoogleConnected === 'function' && isGoogleConnected()) {
                try {
                    var folderId = await getOrCreateProveedorFolder(nombre);
                    var result = await uploadFileToDrive(docFile, folderId);
                    docData.google_drive_file_id = result.id;
                    docData.archivo_pdf = '';
                } catch (e) {
                    console.error('⚠️ Drive upload failed, using base64');
                    docData.archivo_pdf = await fileToBase64(docFile);
                }
            } else {
                docData.archivo_pdf = await fileToBase64(docFile);
            }
            
            const { error: docError } = await supabaseClient
                .from('proveedores_documentos')
                .insert([docData]);
            if (docError) throw docError;
        }
        
        await loadProveedores();
        closeModal('addProveedorModal');
        
        if (currentSubContext === 'proveedores-list') {
            renderProveedoresTable();
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al guardar proveedor: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function deleteProveedor() {
    if (!confirm('¿Está seguro de eliminar este proveedor? Esta acción no se puede deshacer.')) {
        return;
    }
    
    showLoading();
    
    try {
        const { error } = await supabaseClient
            .from('proveedores')
            .delete()
            .eq('id', currentProveedorId);
        
        if (error) throw error;
        
        await loadProveedores();
        closeModal('proveedorDetailModal');
        renderProveedoresTable();
        
        alert('✅ Proveedor eliminado correctamente');
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al eliminar proveedor: ' + error.message);
    } finally {
        hideLoading();
    }
}

function editProveedor() {
    const prov = proveedores.find(p => p.id === currentProveedorId);
    if (!prov) return;
    
    isEditMode = true;
    tempProveedorContactos = [...(prov.contactos || [])];
    
    document.getElementById('addProveedorTitle').textContent = 'Editar Proveedor';
    document.getElementById('proveedorNombre').value = prov.nombre;
    document.getElementById('proveedorServicio').value = prov.servicio;
    document.getElementById('proveedorClabe').value = prov.clabe || '';
    document.getElementById('proveedorRFC').value = prov.rfc || '';
    document.getElementById('proveedorNotas').value = prov.notas || '';
    
    // Llenar contacto inline (primer contacto)
    const first = (prov.contactos && prov.contactos.length > 0) ? prov.contactos[0] : {};
    document.getElementById('proveedorContactoNombreInline').value = first.nombre || '';
    document.getElementById('proveedorContactoTelInline').value = first.telefono || '';
    document.getElementById('proveedorContactoEmailInline').value = first.email || '';
    
    // Contactos adicionales (sin el primero, que ya está inline)
    const extraContactos = tempProveedorContactos.length > 1 ? tempProveedorContactos.slice(1) : [];
    renderContactosList(extraContactos, 'proveedorContactosList', 'deleteProveedorContacto', 'showEditContactoProveedorModal');
    
    closeModal('proveedorDetailModal');
    document.getElementById('addProveedorModal').classList.add('active');
}

console.log('✅ DB-PROVEEDORES.JS v5 cargado');
