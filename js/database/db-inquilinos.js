/* ========================================
   DB-INQUILINOS.JS v1
   OPTIMIZADO: No carga PDFs en memoria
   Última actualización: 2026-02-12 13:30 CST
   ======================================== */

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

console.log('✅ DB-INQUILINOS.JS cargado');
