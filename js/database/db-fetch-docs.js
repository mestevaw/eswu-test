/* ========================================
   DB-FETCH-DOCS.JS - Carga de documentos bajo demanda
   Obtiene PDFs/fotos base64 solo cuando el usuario los necesita
   Última actualización: 2026-02-12 17:00 CST
   ======================================== */

// ============================================
// VISOR DE PDFs (compatible con móvil)
// ============================================

function openPDFViewer(base64Data) {
    if (!base64Data) {
        alert('No hay documento adjunto');
        return;
    }
    
    try {
        // Convertir base64 data URI a Blob URL (Safari iOS no soporta data URIs en iframes)
        let blobUrl;
        if (base64Data.startsWith('data:')) {
            const parts = base64Data.split(',');
            const mime = parts[0].match(/:(.*?);/)[1];
            const byteString = atob(parts[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mime });
            blobUrl = URL.createObjectURL(blob);
        } else {
            blobUrl = base64Data;
        }
        
        // Intentar overlay (funciona en mobile y desktop con blob URL)
        const overlay = document.getElementById('pdfViewerOverlay');
        const iframe = document.getElementById('pdfViewerIframe');
        
        if (overlay && iframe) {
            // Guardar blob URL para liberar memoria al cerrar
            overlay.dataset.blobUrl = blobUrl;
            iframe.src = blobUrl;
            overlay.style.display = 'block';
            document.body.style.overflow = 'hidden';
            return;
        }
        
        // Fallback: abrir blob URL directamente
        window.open(blobUrl, '_blank');
        
    } catch (e) {
        console.error('Error abriendo PDF:', e);
        // Último fallback: intentar window.open con data URI original
        const w = window.open();
        if (w) {
            w.document.write(`<iframe width='100%' height='100%' src='${base64Data}' style='border:none;position:fixed;top:0;left:0;right:0;bottom:0;'></iframe>`);
        } else {
            alert('No se pudo abrir el documento.');
        }
    }
}

function closePDFViewer() {
    const overlay = document.getElementById('pdfViewerOverlay');
    const iframe = document.getElementById('pdfViewerIframe');
    
    if (iframe) {
        iframe.src = 'about:blank';
    }
    if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
        // Liberar memoria del blob URL
        if (overlay.dataset.blobUrl) {
            URL.revokeObjectURL(overlay.dataset.blobUrl);
            delete overlay.dataset.blobUrl;
        }
    }
}

// ============================================
// FUNCIÓN GENÉRICA DE FETCH Y VISTA
// ============================================

async function fetchAndViewDoc(table, column, id) {
    showLoading();
    try {
        const { data, error } = await supabaseClient
            .from(table)
            .select(column)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        if (data && data[column]) {
            openPDFViewer(data[column]);
        } else {
            alert('No hay documento adjunto');
        }
    } catch (e) {
        console.error('Error fetching document:', e);
        alert('Error al cargar documento: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// INQUILINOS - Documentos bajo demanda
// ============================================

function fetchAndViewContrato(inquilinoId) {
    const id = inquilinoId || currentInquilinoId;
    if (!id) return;
    fetchAndViewDoc('inquilinos', 'contrato_file', id);
}

function fetchAndViewDocInquilino(docId) {
    fetchAndViewDoc('inquilinos_documentos', 'archivo_pdf', docId);
}

function fetchAndViewPagoInquilino(pagoId) {
    fetchAndViewDoc('pagos_inquilinos', 'pago_file', pagoId);
}

// ============================================
// PROVEEDORES - Documentos bajo demanda
// ============================================

function fetchAndViewDocProveedor(docId) {
    fetchAndViewDoc('proveedores_documentos', 'archivo_pdf', docId);
}

// ============================================
// FACTURAS - Documentos bajo demanda
// ============================================

function fetchAndViewFactura(facturaId, tipo) {
    const column = (tipo === 'pago') ? 'pago_file' : 'documento_file';
    fetchAndViewDoc('facturas', column, facturaId);
}

// ============================================
// BANCOS - Documentos bajo demanda
// ============================================

function fetchAndViewBancoDoc(bancoId) {
    fetchAndViewDoc('bancos_documentos', 'archivo_pdf', bancoId);
}

// ============================================
// ACTIVOS - Fotos bajo demanda
// ============================================

async function fetchActivoFotos(activoId) {
    const gallery = document.getElementById('photoGallery');
    gallery.innerHTML = '<p style="color:var(--text-light);text-align:center">Cargando fotos...</p>';
    
    try {
        const { data, error } = await supabaseClient
            .from('activos_fotos')
            .select('id, foto_data, foto_name')
            .eq('activo_id', activoId);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            gallery.innerHTML = data.map(f => `
                <div class="photo-item">
                    <img src="${f.foto_data}" alt="${f.foto_name}">
                </div>
            `).join('');
        } else {
            gallery.innerHTML = '<p style="color:var(--text-light);text-align:center">No hay fotos</p>';
        }
    } catch (e) {
        console.error('Error fetching photos:', e);
        gallery.innerHTML = '<p style="color:var(--danger);text-align:center">Error cargando fotos</p>';
    }
}

console.log('✅ DB-FETCH-DOCS.JS cargado (2026-02-12 17:00 CST)');
