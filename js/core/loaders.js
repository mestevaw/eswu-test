/* ========================================
   LOADERS.JS - Data Loading Functions
   ======================================== */

// ============================================
// INQUILINOS
// ============================================

let inquilinosFullLoaded = false;

async function loadInquilinos() {
    try {
        // Cargar TODOS los inquilinos (activos e inactivos)
        const { data, error } = await supabaseClient
            .from('inquilinos')
            .select('id, nombre, renta, fecha_vencimiento, contrato_activo')
            .order('contrato_activo', { ascending: false })
            .order('nombre');
        
        if (error) throw error;
        
        inquilinos = data.map(inq => ({
            id: inq.id,
            nombre: inq.nombre,
            renta: parseFloat(inq.renta || 0),
            fecha_vencimiento: inq.fecha_vencimiento,
            contrato_activo: inq.contrato_activo,
            // Datos que se cargarán después
            contactos: [],
            pagos: [],
            documentos: []
        }));
        
        console.log(`✅ ${inquilinos.length} inquilinos cargados (básico)`);
        
    } catch (error) {
        console.error('Error loading inquilinos:', error);
        throw error;
    }
}

async function ensureInquilinosFullLoaded() {
    // ✅ SIEMPRE RECARGAR - Quitar el if
    try {
        const { data: inquilinosData, error: inquilinosError } = await supabaseClient
            .from('inquilinos')
            .select('*')
            .order('contrato_activo', { ascending: false })
            .order('nombre');
        
        if (inquilinosError) throw inquilinosError;
        
        const { data: contactosData, error: contactosError } = await supabaseClient
            .from('inquilinos_contactos')
            .select('*');
        
        if (contactosError) throw contactosError;
        
        const { data: pagosData, error: pagosError } = await supabaseClient
            .from('pagos_inquilinos')
            .select('*')
            .order('fecha', { ascending: false });
        
        if (pagosError) throw pagosError;
        
        const { data: docsData, error: docsError } = await supabaseClient
            .from('inquilinos_documentos')
            .select('*');
        
        if (docsError) throw docsError;
        
        inquilinos = inquilinosData.map(inq => ({
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
            contrato_file: inq.contrato_file,
            contrato_activo: inq.contrato_activo,
            fecha_terminacion: inq.fecha_terminacion,
            contactos: contactosData.filter(c => c.inquilino_id === inq.id),
            pagos: pagosData.filter(p => p.inquilino_id === inq.id).map(p => ({
                id: p.id,
                fecha: p.fecha,
                monto: parseFloat(p.monto),
                completo: p.completo,
                pago_file: p.pago_file
            })),
            documentos: docsData.filter(d => d.inquilino_id === inq.id)
        }));
        
        inquilinosFullLoaded = true;
        console.log(`✅ ${inquilinos.length} inquilinos recargados (completo)`);
        
    } catch (error) {
        console.error('Error loading inquilinos full:', error);
        throw error;
    }
}

// ============================================
// PROVEEDORES
// ============================================

let proveedoresFullLoaded = false;

async function loadProveedores() {
    try {
        const { data: proveedoresData, error: proveedoresError } = await supabaseClient
            .from('proveedores')
            .select('*')
            .order('nombre');
        
        if (proveedoresError) throw proveedoresError;
        
        const { data: contactosData, error: contactosError } = await supabaseClient
            .from('proveedores_contactos')
            .select('*');
        
        if (contactosError) throw contactosError;
        
        const { data: facturasData, error: facturasError } = await supabaseClient
            .from('facturas')
            .select('*')
            .order('fecha', { ascending: false });
        
        if (facturasError) throw facturasError;
        
        const { data: docsData, error: docsError } = await supabaseClient
            .from('proveedores_documentos')
            .select('*');
        
        if (docsError) throw docsError;
        
        proveedores = proveedoresData.map(prov => ({
            id: prov.id,
            nombre: prov.nombre,
            servicio: prov.servicio,
            clabe: prov.clabe,
            rfc: prov.rfc,
            notas: prov.notas,
            contactos: contactosData.filter(c => c.proveedor_id === prov.id).map(c => ({
                id: c.id,
                nombre: c.nombre,
                telefono: c.telefono,
                email: c.email
            })),
            facturas: facturasData.filter(f => f.proveedor_id === prov.id).map(f => ({
                id: f.id,
                numero: f.numero,
                fecha: f.fecha,
                vencimiento: f.vencimiento,
                monto: parseFloat(f.monto),
                iva: parseFloat(f.iva || 0),
                fecha_pago: f.fecha_pago,
                documento_file: f.documento_file,
                pago_file: f.pago_file
            })),
            documentos: docsData.filter(d => d.proveedor_id === prov.id).map(d => ({
                id: d.id,
                nombre: d.nombre_documento || d.nombre || 'Documento',  // ✅ CORREGIDO
                archivo: d.archivo_pdf || d.archivo,  // ✅ CORREGIDO
                fecha: d.fecha_guardado || d.fecha || new Date().toISOString().split('T')[0],  // ✅ CORREGIDO
                usuario: d.usuario_guardo || d.usuario || 'Sistema'  // ✅ CORREGIDO
            }))
        }));
        
        console.log('✅ Proveedores cargados:', proveedores.length);
        
    } catch (error) {
        console.error('❌ Error loading proveedores:', error);
        throw error;
    }
}

async function ensureProveedoresFullLoaded() {
    // ✅ CRÍTICO: SIEMPRE RECARGAR - Quitar el if que impedía recargar
    try {
        const { data: proveedoresData, error: proveedoresError } = await supabaseClient
            .from('proveedores')
            .select('*')
            .order('nombre');
        
        if (proveedoresError) throw proveedoresError;
        
        const { data: contactosData, error: contactosError } = await supabaseClient
            .from('proveedores_contactos')
            .select('*');
        
        if (contactosError) throw contactosError;
        
        const { data: facturasData, error: facturasError } = await supabaseClient
            .from('facturas')
            .select('*')
            .order('fecha', { ascending: false });
        
        if (facturasError) throw facturasError;
        
        const { data: docsData, error: docsError } = await supabaseClient
            .from('proveedores_documentos')
            .select('*');
        
        if (docsError) throw docsError;
        
        proveedores = proveedoresData.map(prov => ({
            id: prov.id,
            nombre: prov.nombre,
            servicio: prov.servicio,
            clabe: prov.clabe,
            rfc: prov.rfc,
            notas: prov.notas,
            contactos: contactosData.filter(c => c.proveedor_id === prov.id),
            facturas: facturasData.filter(f => f.proveedor_id === prov.id).map(f => ({
                id: f.id,
                numero: f.numero,
                fecha: f.fecha,
                vencimiento: f.vencimiento,
                monto: parseFloat(f.monto),
                iva: parseFloat(f.iva || 0),
                fecha_pago: f.fecha_pago,
                documento_file: f.documento_file,
                pago_file: f.pago_file
            })),
            documentos: docsData.filter(d => d.proveedor_id === prov.id)
        }));
        
        proveedoresFullLoaded = true;
        console.log(`✅ ${proveedores.length} proveedores recargados (completo) - ${proveedores.reduce((sum, p) => sum + p.facturas.length, 0)} facturas totales`);
        
    } catch (error) {
        console.error('Error loading proveedores full:', error);
        throw error;
    }
}

// ============================================
// ACTIVOS
// ============================================

async function loadActivos() {
    try {
        const { data: activosData, error: activosError } = await supabaseClient
            .from('activos')
            .select('*')
            .order('nombre');
        
        if (activosError) throw activosError;
        
        const { data: fotosData, error: fotosError } = await supabaseClient
            .from('activos_fotos')
            .select('*');
        
        if (fotosError) throw fotosError;
        
        activos = activosData.map(act => ({
            id: act.id,
            nombre: act.nombre,
            ultimo_mant: act.ultimo_mant,
            proximo_mant: act.proximo_mant,
            proveedor: act.proveedor,
            notas: act.notas,
            fotos: fotosData.filter(f => f.activo_id === act.id)
        }));
        
        console.log(`✅ ${activos.length} activos cargados`);
        
    } catch (error) {
        console.error('Error loading activos:', error);
        throw error;
    }
}

async function ensureActivosLoaded() {
    return; // Ya están cargados
}

// ============================================
// ESTACIONAMIENTO
// ============================================

async function loadEstacionamiento() {
    try {
        const { data, error } = await supabaseClient
            .from('estacionamiento')
            .select('*')
            .order('numero_espacio');
        
        if (error) throw error;
        
        estacionamiento = data;
        console.log(`✅ ${estacionamiento.length} espacios cargados`);
        
    } catch (error) {
        console.error('Error loading estacionamiento:', error);
        throw error;
    }
}

// ============================================
// BITÁCORA
// ============================================

async function loadBitacoraSemanal() {
    try {
        const { data, error } = await supabaseClient
            .from('bitacora_semanal')
            .select('*')
            .order('semana_inicio', { ascending: false })
            .limit(52);
        
        if (error) throw error;
        
        bitacoraSemanal = data || [];
        console.log(`✅ ${bitacoraSemanal.length} semanas cargadas`);
        
    } catch (error) {
        console.error('Error loading bitacora:', error);
        bitacoraSemanal = [];
    }
}

// ============================================
// USUARIOS
// ============================================

async function loadUsuarios() {
    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .order('nombre');
        
        if (error) throw error;
        
        usuarios = data;
        console.log(`✅ ${usuarios.length} usuarios cargados`);
        
    } catch (error) {
        console.error('Error loading usuarios:', error);
        throw error;
    }
}

async function ensureUsuariosLoaded() {
    if (usuarios.length > 0) return;
    await loadUsuarios();
}

// ============================================
// BANCOS
// ============================================

async function loadBancosDocumentos() {
    try {
        const { data, error } = await supabaseClient
            .from('bancos_documentos')
            .select('*')
            .order('fecha_subida', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        bancosDocumentos = data || [];
        console.log(`✅ ${bancosDocumentos.length} documentos bancarios cargados`);
        
    } catch (error) {
        console.error('Error loading bancos:', error);
        bancosDocumentos = [];
    }
}

async function ensureBancosLoaded() {
    if (bancosDocumentos.length > 0) return;
    await loadBancosDocumentos();
}

console.log('✅ LOADERS.JS cargado');
