/* ========================================
   DB-ADMIN.JS
   Carga y guardado de: activos, estacionamiento,
   bitácora, usuarios, bancos, year selects
   ======================================== */

// ============================================
// LOADERS (variables de control en config.js)
// ============================================

async function loadActivos() {
    try {
        const { data: activosData, error: activosError } = await supabaseClient
            .from('activos')
            .select('*')
            .order('nombre');
        
        if (activosError) throw activosError;
        
        // Solo contar fotos, NO cargar foto_data base64
        const { data: fotosCount, error: fotosError } = await supabaseClient
            .from('activos_fotos')
            .select('id, activo_id');
        
        if (fotosError) throw fotosError;
        
        activos = activosData.map(act => ({
            ...act,
            fotos: (fotosCount || []).filter(f => f.activo_id === act.id)
        }));
        
    } catch (error) {
        console.error('Error loading activos:', error);
        throw error;
    }
}

async function loadEstacionamiento() {
    try {
        const { data, error } = await supabaseClient
            .from('estacionamiento')
            .select('*')
            .order('numero_espacio');
        
        if (error) throw error;
        
        estacionamiento = data;
        
    } catch (error) {
        console.error('Error loading estacionamiento:', error);
        throw error;
    }
}

async function loadBitacoraSemanal() {
    try {
        const { data, error } = await supabaseClient
            .from('bitacora_semanal')
            .select('id, semana_inicio, semana_texto, notas')
            .order('semana_inicio', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        bitacoraSemanal = data || [];
        
    } catch (error) {
        console.error('Error loading bitacora:', error);
        bitacoraSemanal = [];
    }
}

async function loadUsuarios() {
    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .order('nombre');
        
        if (error) throw error;
        
        usuarios = data;
        
    } catch (error) {
        console.error('Error loading usuarios:', error);
        throw error;
    }
}

async function loadBancosDocumentos() {
    try {
        const { data, error } = await supabaseClient
            .from('bancos_documentos')
            .select('id, tipo, fecha_subida, google_drive_file_id, nombre_archivo, anio, mes')
            .order('anio', { ascending: false })
            .order('mes', { ascending: false })
            .limit(200);
        
        if (error) throw error;
        
        bancosDocumentos = data || [];
        
    } catch (error) {
        console.error('Error loading bancos:', error);
        bancosDocumentos = [];
    }
}

// ============================================
// CARGA BÁSICA (RÁPIDA) - para lazy loading
// ============================================

async function loadInquilinosBasico() {
    try {
        const { data, error } = await supabaseClient
            .from('inquilinos')
            .select('id, nombre, renta, fecha_vencimiento, contrato_activo')
            .order('nombre');
        
        if (error) throw error;
        
        inquilinos = data.map(inq => ({
            id: inq.id,
            nombre: inq.nombre,
            renta: parseFloat(inq.renta || 0),
            fecha_vencimiento: inq.fecha_vencimiento,
            contrato_activo: inq.contrato_activo,
            contactos: [],
            pagos: [],
            documentos: []
        }));
        
    } catch (error) {
        console.error('Error loading inquilinos básico:', error);
        throw error;
    }
}

async function loadProveedoresBasico() {
    try {
        const { data, error } = await supabaseClient
            .from('proveedores')
            .select('id, nombre, servicio')
            .order('nombre');
        
        if (error) throw error;
        
        proveedores = data.map(prov => ({
            id: prov.id,
            nombre: prov.nombre,
            servicio: prov.servicio,
            contactos: [],
            facturas: [],
            documentos: []
        }));
        
    } catch (error) {
        console.error('Error loading proveedores básico:', error);
        throw error;
    }
}

// ============================================
// ENSURES (CARGA LAZY)
// ============================================

async function ensureInquilinosFullLoaded() {
    if (inquilinosFullLoaded) return;
    showLoading();
    try {
        await loadInquilinos();
        inquilinosFullLoaded = true;
    } finally {
        hideLoading();
    }
}

async function ensureProveedoresFullLoaded() {
    if (proveedoresFullLoaded) return;
    showLoading();
    try {
        await loadProveedores();
        proveedoresFullLoaded = true;
    } finally {
        hideLoading();
    }
}

async function ensureActivosLoaded() {
    if (activosLoaded) return;
    showLoading();
    try {
        await loadActivos();
        populateProveedoresDropdown();
        activosLoaded = true;
    } finally {
        hideLoading();
    }
}

async function ensureUsuariosLoaded() {
    if (usuariosLoaded) return;
    showLoading();
    try {
        await loadUsuarios();
        usuariosLoaded = true;
    } finally {
        hideLoading();
    }
}

async function ensureBancosLoaded() {
    if (bancosLoaded) return;
    showLoading();
    try {
        await loadBancosDocumentos();
        bancosLoaded = true;
    } finally {
        hideLoading();
    }
}

async function ensureEstacionamientoLoaded() {
    if (estacionamientoLoaded) return;
    showLoading();
    try {
        await loadEstacionamiento();
        estacionamientoLoaded = true;
    } finally {
        hideLoading();
    }
}

async function ensureBitacoraLoaded() {
    if (bitacoraLoaded) return;
    showLoading();
    try {
        await loadBitacoraSemanal();
        bitacoraLoaded = true;
    } finally {
        hideLoading();
    }
}

// ============================================
// SAVES - ADMIN
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

async function saveBancoDoc(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const tipo = document.getElementById('bancoTipo').value;
        const anio = parseInt(document.getElementById('bancoAnio').value);
        const mes = parseInt(document.getElementById('bancoMes').value);
        const file = (typeof bancoPendingDropFile !== 'undefined' && bancoPendingDropFile) || document.getElementById('bancoDocumento').files[0];
        
        if (!file) {
            throw new Error('Seleccione un archivo PDF');
        }
        
        var docData = {
            tipo: tipo,
            anio: anio,
            mes: mes,
            nombre_archivo: file.name,
            fecha_subida: new Date().toISOString().split('T')[0],
            usuario_subio: currentUser ? currentUser.nombre : 'Sistema'
        };
        
        // Upload to Drive if connected
        if (typeof isGoogleConnected === 'function' && isGoogleConnected()) {
            var carpeta = contabilidadCarpetas.find(c => c.anio === anio && c.mes === mes);
            if (carpeta) {
                var monthFolderId = extractFolderId(carpeta.google_drive_url);
                if (monthFolderId) {
                    var { folders } = await listDriveFolder(monthFolderId);
                    var reportes = folders.find(f => f.name.toLowerCase().includes('reporte'));
                    if (reportes) {
                        var result = await uploadFileToDrive(file, reportes.id);
                        docData.google_drive_file_id = result.id;
                    }
                }
            }
            
            if (!docData.google_drive_file_id) {
                console.log('⚠️ No se encontró carpeta Reportes Financieros para ' + anio + '/' + mes + ', subiendo a raíz');
            }
        }
        
        if (!docData.google_drive_file_id) {
            docData.archivo_pdf = '';
        }
        
        const { error } = await supabaseClient
            .from('bancos_documentos')
            .insert([docData]);
        
        if (error) throw error;
        
        await loadBancosDocumentos();
        renderBancosTable();
        closeModal('addBancoModal');
        if (typeof bancoPendingDropFile !== 'undefined') bancoPendingDropFile = null;
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar documento: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// POPULATE YEAR SELECTS
// ============================================

function populateYearSelect() {
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('homeYear');
    
    if (!yearSelect) return;
    
    yearSelect.innerHTML = '';
    
    for (let year = currentYear - 5; year <= currentYear + 1; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
}

function populateInquilinosYearSelects() {
    const currentYear = new Date().getFullYear();
    const select = document.getElementById('inquilinosRentasYear');
    
    if (!select) return;
    
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
// UTILIDAD: ELIMINAR PROVEEDORES MIGRADOS
// ============================================

async function eliminarProveedoresMigrados() {
    if (!confirm('¿Seguro que quieres eliminar TODOS los proveedores que dicen "migrado desde histórico"?\n\nEsta acción NO se puede deshacer.')) {
        return;
    }
    
    showLoading();
    try {
        const { data: proveedoresMigrados, error: searchError } = await supabaseClient
            .from('proveedores')
            .select('id')
            .ilike('servicio', '%migrado desde histórico%');
        
        if (searchError) throw searchError;
        
        if (!proveedoresMigrados || proveedoresMigrados.length === 0) {
            alert('No se encontraron proveedores con "migrado desde histórico"');
            hideLoading();
            return;
        }
        
        const ids = proveedoresMigrados.map(p => p.id);
        
        const { error: deleteError } = await supabaseClient
            .from('proveedores')
            .delete()
            .in('id', ids);
        
        if (deleteError) throw deleteError;
        
        await loadProveedores();
        renderProveedoresTable();
        
        alert(`✅ Se eliminaron ${ids.length} proveedores migrados correctamente`);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar proveedores: ' + error.message);
    } finally {
        hideLoading();
    }
}

console.log('✅ DB-ADMIN.JS cargado');
