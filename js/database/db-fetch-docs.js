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
        var mime = '';
        var blobUrl;
        
        if (base64Data.startsWith('data:')) {
            var parts = base64Data.split(',');
            mime = parts[0].match(/:(.*?);/)[1];
            var byteString = atob(parts[1]);
            var ab = new ArrayBuffer(byteString.length);
            var ia = new Uint8Array(ab);
            for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            var blob = new Blob([ab], { type: mime });
            blobUrl = URL.createObjectURL(blob);
        } else {
            blobUrl = base64Data;
        }
        
        var overlay = document.getElementById('pdfViewerOverlay');
        var iframe = document.getElementById('pdfViewerIframe');
        var imgViewer = document.getElementById('pdfViewerImg');
        
        if (overlay) {
            overlay.dataset.blobUrl = blobUrl;
            
            // Si es imagen, mostrar como <img> ajustada a pantalla
            if (mime.startsWith('image/')) {
                if (iframe) iframe.style.display = 'none';
                if (imgViewer) {
                    imgViewer.src = blobUrl;
                    imgViewer.style.display = 'block';
                }
            } else {
                // PDF u otro: usar iframe
                if (imgViewer) imgViewer.style.display = 'none';
                if (iframe) {
                    iframe.style.display = 'block';
                    iframe.src = blobUrl;
                }
            }
            
            overlay.style.display = 'block';
            document.body.style.overflow = 'hidden';
            return;
        }
        
        window.open(blobUrl, '_blank');
        
    } catch (e) {
        console.error('Error abriendo documento:', e);
        var w = window.open();
        if (w) {
            w.document.write('<iframe width="100%" height="100%" src="' + base64Data + '" style="border:none;position:fixed;top:0;left:0;right:0;bottom:0;"></iframe>');
        } else {
            alert('No se pudo abrir el documento.');
        }
    }
}

function closePDFViewer() {
    var overlay = document.getElementById('pdfViewerOverlay');
    var iframe = document.getElementById('pdfViewerIframe');
    var imgViewer = document.getElementById('pdfViewerImg');
    
    if (iframe) { iframe.src = 'about:blank'; iframe.style.display = 'block'; }
    if (imgViewer) { imgViewer.src = ''; imgViewer.style.display = 'none'; }
    if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
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
            // Safety check: if data looks like a UUID or short string, it's not a valid document
            var val = data[column];
            if (val.length < 200 && !val.startsWith('data:')) {
                alert('Este documento necesita ser vinculado desde Google Drive (📎)');
                return;
            }
            openPDFViewer(val);
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

async function fetchAndViewDocProveedor(docId) {
    // Check if doc has a Google Drive file ID in local data
    var driveFileId = null;
    if (typeof proveedores !== 'undefined') {
        proveedores.some(function(p) {
            return (p.documentos || []).some(function(d) {
                if (d.id === docId && d.google_drive_file_id) {
                    driveFileId = d.google_drive_file_id;
                    return true;
                }
                return false;
            });
        });
    }
    
    if (driveFileId && typeof gdriveAccessToken !== 'undefined' && gdriveAccessToken) {
        // Download from Google Drive and show in internal viewer
        showLoading();
        try {
            // Get file metadata to know mime type
            var metaResp = await fetch('https://www.googleapis.com/drive/v3/files/' + driveFileId + '?fields=mimeType', {
                headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
            });
            if (!metaResp.ok) throw new Error('Error obteniendo metadata');
            var meta = await metaResp.json();
            var mimeType = meta.mimeType || 'application/pdf';
            var isGoogleDoc = mimeType.includes('google-apps');
            
            // Google native docs → export as PDF
            var downloadUrl;
            if (isGoogleDoc) {
                downloadUrl = 'https://www.googleapis.com/drive/v3/files/' + driveFileId + '/export?mimeType=application/pdf';
                mimeType = 'application/pdf';
            } else {
                downloadUrl = 'https://www.googleapis.com/drive/v3/files/' + driveFileId + '?alt=media';
            }
            
            var resp = await fetch(downloadUrl, {
                headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
            });
            if (!resp.ok) throw new Error('Error descargando archivo');
            var blob = await resp.blob();
            
            // Convert blob to data URI for openPDFViewer
            var reader = new FileReader();
            reader.onload = function() {
                hideLoading();
                openPDFViewer(reader.result); // data:mime;base64,...
            };
            reader.onerror = function() {
                hideLoading();
                alert('Error al leer el archivo de Drive');
            };
            reader.readAsDataURL(new Blob([blob], { type: mimeType }));
            
        } catch (e) {
            hideLoading();
            console.error('Error viewing Drive doc:', e);
            alert('Error al cargar documento de Drive: ' + e.message);
        }
    } else {
        // Fallback to base64 from Supabase
        fetchAndViewDoc('proveedores_documentos', 'archivo_pdf', docId);
    }
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

console.log('✅ DB-FETCH-DOCS.JS v5 cargado');
