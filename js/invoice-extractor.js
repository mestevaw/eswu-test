/* ========================================
   INVOICE-EXTRACTOR.JS v1
   Extracción inteligente de datos de facturas PDF
   Fecha: 2026-02-28
   ======================================== */

// ============================================
// PDF.js WORKER SETUP
// ============================================
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ============================================
// ESTADO DEL EXTRACTOR
// ============================================
var _extractedInvoiceData = null;
var _invoicePdfFile = null;
var _invoicePdfThumbnailUrl = null;

// ============================================
// 1. MODAL: SUBIR PDF DE FACTURA
// ============================================

function showUploadInvoicePdfModal(fromContext) {
    // Guardar contexto de origen
    window._invoiceUploadContext = fromContext || window.facturaActionContext || null;
    _extractedInvoiceData = null;
    _invoicePdfFile = null;
    _invoicePdfThumbnailUrl = null;

    // Reset UI
    var modal = document.getElementById('uploadInvoicePdfModal');
    var dropArea = document.getElementById('invoicePdfDropArea');
    var processing = document.getElementById('invoicePdfProcessing');
    var resultArea = document.getElementById('invoicePdfResult');

    if (dropArea) dropArea.style.display = '';
    if (processing) processing.style.display = 'none';
    if (resultArea) resultArea.style.display = 'none';
    
    // Reset file input
    var fileInput = document.getElementById('invoicePdfInput');
    if (fileInput) fileInput.value = '';

    modal.classList.add('active');
    
    // Init paste listener after modal is visible
    setTimeout(function() {
        _initInvoicePdfPaste();
    }, 100);
}

function closeUploadInvoicePdfModal() {
    document.getElementById('uploadInvoicePdfModal').classList.remove('active');
}

// Handle file selection (click, paste, drag)
function handleInvoicePdfSelect(input) {
    if (input.files && input.files[0]) {
        _processInvoicePdf(input.files[0]);
    }
}

function handleInvoicePdfDrop(event) {
    event.preventDefault();
    var el = document.getElementById('invoicePdfDragZone');
    if (el) { el.style.borderColor = 'var(--border)'; el.style.background = ''; }
    var files = event.dataTransfer ? event.dataTransfer.files : null;
    if (files && files.length > 0) {
        _processInvoicePdf(files[0]);
    }
}

function _initInvoicePdfPaste() {
    var pasteZone = document.getElementById('invoicePdfPasteZone');
    if (!pasteZone || pasteZone._pasteInit) return;
    pasteZone._pasteInit = true;
    pasteZone.addEventListener('paste', function(e) {
        e.preventDefault();
        var items = e.clipboardData ? e.clipboardData.items : [];
        for (var i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                _processInvoicePdf(items[i].getAsFile());
                return;
            }
        }
        alert('No se detectó archivo. Intenta copiar el PDF primero.');
    });
}

// ============================================
// 2. PROCESAMIENTO DEL PDF
// ============================================

async function _processInvoicePdf(file) {
    _invoicePdfFile = file;

    // Show processing state
    var dropArea = document.getElementById('invoicePdfDropArea');
    var processing = document.getElementById('invoicePdfProcessing');
    if (dropArea) dropArea.style.display = 'none';
    if (processing) processing.style.display = '';

    try {
        // Read file as ArrayBuffer
        var arrayBuffer = await file.arrayBuffer();

        // Extract text and generate thumbnail in parallel
        var [textContent, thumbnailUrl] = await Promise.all([
            _extractPdfText(arrayBuffer.slice(0)),
            _generatePdfThumbnail(arrayBuffer.slice(0))
        ]);

        _invoicePdfThumbnailUrl = thumbnailUrl;

        // Parse the extracted text
        var parsed = _parseInvoiceText(textContent);
        _extractedInvoiceData = parsed;

        console.log('📄 Texto extraído del PDF:', textContent.substring(0, 500));
        console.log('📋 Datos parseados:', JSON.stringify(parsed, null, 2));

        // Show results
        _showExtractionResults(parsed, thumbnailUrl);

    } catch (err) {
        console.error('❌ Error procesando PDF:', err);
        // Fallback: let user continue without extraction
        _extractedInvoiceData = {};
        _invoicePdfThumbnailUrl = null;
        alert('No se pudieron extraer datos del PDF. Puedes llenar los datos manualmente.');
        _proceedToRegistrarFactura();
    }
}

async function _extractPdfText(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js no está cargado');
    }
    // Ensure worker is set
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    var fullText = '';

    // Extract text from all pages (most invoices are 1-2 pages)
    var maxPages = Math.min(pdf.numPages, 4);
    for (var i = 1; i <= maxPages; i++) {
        var page = await pdf.getPage(i);
        var content = await page.getTextContent();
        var pageText = content.items.map(function(item) { return item.str; }).join(' ');
        fullText += pageText + '\n';
    }

    return fullText;
}

async function _generatePdfThumbnail(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') return null;
    // Ensure worker is set
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    try {
        var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        var page = await pdf.getPage(1);
        var scale = 0.5; // Small thumbnail
        var viewport = page.getViewport({ scale: scale });

        var canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        var ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        return canvas.toDataURL('image/png');
    } catch (e) {
        console.warn('⚠️ No se pudo generar thumbnail:', e);
        return null;
    }
}

// ============================================
// 3. PARSER INTELIGENTE DE FACTURAS MEXICANAS
// ============================================

function _parseInvoiceText(text) {
    var result = {
        rfc_emisor: null,
        nombre_emisor: null,
        numero_factura: null,
        fecha_factura: null,
        total: null,
        iva: null,
        fecha_vencimiento: null
    };

    if (!text || text.trim().length === 0) return result;

    // Normalizar texto
    var t = text.replace(/\s+/g, ' ').trim();
    var tUpper = t.toUpperCase();

    // --- RFC EMISOR ---
    // RFC pattern: 3-4 letters + 6 digits + 3 alphanumeric
    var rfcPattern = /\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/gi;
    var rfcMatches = [];
    var m;
    while ((m = rfcPattern.exec(t)) !== null) {
        rfcMatches.push(m[1].toUpperCase());
    }
    // Filter out common non-RFC matches and our own company RFC
    rfcMatches = rfcMatches.filter(function(rfc) {
        // Exclude common false positives
        if (/^(XAXX|XEXX)/.test(rfc)) return false; // RFC genérico
        return true;
    });
    if (rfcMatches.length > 0) {
        // First RFC found is usually the emisor
        result.rfc_emisor = rfcMatches[0];
    }

    // --- NOMBRE DEL EMISOR ---
    // Look for common patterns: "Razón Social:", "Emisor:", "Nombre:", near the top
    var nombrePatterns = [
        /(?:raz[oó]n\s*social|nombre\s*(?:del?\s*)?emisor|emisor)\s*[:;]\s*([^\n\r]{3,80})/i,
        /(?:nombre|empresa)\s*[:;]\s*([^\n\r]{3,80})/i
    ];
    for (var i = 0; i < nombrePatterns.length; i++) {
        var nm = nombrePatterns[i].exec(t);
        if (nm) {
            result.nombre_emisor = nm[1].trim().replace(/\s+/g, ' ');
            break;
        }
    }
    
    // If no name found via patterns, try to find it near the RFC
    if (!result.nombre_emisor && result.rfc_emisor) {
        var rfcPos = tUpper.indexOf(result.rfc_emisor);
        if (rfcPos > 0) {
            // Look for text before the RFC that looks like a company name
            var before = t.substring(Math.max(0, rfcPos - 150), rfcPos).trim();
            // Take the last line-like segment before RFC
            var segments = before.split(/[.\n\r|]+/);
            var lastSeg = segments[segments.length - 1].trim();
            if (lastSeg.length >= 5 && lastSeg.length <= 100) {
                result.nombre_emisor = lastSeg.replace(/\s+/g, ' ');
            }
        }
    }

    // --- NÚMERO DE FACTURA ---
    var folioPatterns = [
        /(?:folio\s*(?:fiscal)?|no\.?\s*(?:de\s*)?factura|factura\s*(?:no\.?|número|num\.?))\s*[:;#]?\s*([A-Z0-9\-]{1,30})/i,
        /(?:serie\s*y\s*folio|folio)\s*[:;]?\s*([A-Z]{0,4})\s*[-]?\s*(\d{1,10})/i,
        /(?:N[uú]mero\s*de\s*documento|Documento\s*No\.?)\s*[:;]?\s*([A-Z0-9\-]{1,30})/i
    ];
    for (var i = 0; i < folioPatterns.length; i++) {
        var fm = folioPatterns[i].exec(t);
        if (fm) {
            if (fm[2]) {
                result.numero_factura = (fm[1] + fm[2]).trim();
            } else {
                result.numero_factura = fm[1].trim();
            }
            break;
        }
    }

    // --- FECHA DE FACTURA ---
    var fechaPatterns = [
        /(?:fecha\s*(?:de\s*)?(?:emisi[oó]n|expedici[oó]n|factura|comprobante|cfdi))\s*[:;]?\s*(\d{1,4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,4})/i,
        /(?:fecha\s*(?:de\s*)?(?:emisi[oó]n|expedici[oó]n|factura))\s*[:;]?\s*(\d{1,2}\s+(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?\d{2,4})/i,
        /(?:fecha)\s*[:;]?\s*(\d{4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,2})/i
    ];
    for (var i = 0; i < fechaPatterns.length; i++) {
        var fd = fechaPatterns[i].exec(t);
        if (fd) {
            result.fecha_factura = _normalizeDateString(fd[1].trim());
            break;
        }
    }
    // Fallback: look for any date-like pattern near "fecha"
    if (!result.fecha_factura) {
        var anyDateNearFecha = /fecha[^0-9]{0,20}(\d{4}[\-\/]\d{2}[\-\/]\d{2})/i.exec(t);
        if (anyDateNearFecha) {
            result.fecha_factura = _normalizeDateString(anyDateNearFecha[1]);
        }
    }

    // --- TOTAL ---
    var totalPatterns = [
        /(?:total\s*(?:a\s*pagar|con\s*letra|cfdi|factura)?)\s*[:;$]?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
        /(?:importe\s*total|monto\s*total|gran\s*total)\s*[:;$]?\s*\$?\s*([\d,]+\.?\d{0,2})/i
    ];
    var totalCandidates = [];
    for (var i = 0; i < totalPatterns.length; i++) {
        // Find ALL matches for total patterns
        var totalRegex = new RegExp(totalPatterns[i].source, 'gi');
        var tm;
        while ((tm = totalRegex.exec(t)) !== null) {
            var val = parseFloat(tm[1].replace(/,/g, ''));
            if (!isNaN(val) && val > 0) {
                totalCandidates.push(val);
            }
        }
    }
    if (totalCandidates.length > 0) {
        // The largest "total" is usually the real total (with IVA)
        result.total = Math.max.apply(null, totalCandidates);
    }

    // --- IVA ---
    var ivaPatterns = [
        /(?:i\.?v\.?a\.?\s*(?:\(?\s*16\s*%?\s*\)?)?\s*(?:trasladado)?)\s*[:;$]?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
        /(?:impuesto\s*(?:al\s*valor\s*agregado|trasladado))\s*[:;$]?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
        /(?:iva\s*16)\s*[:;$%]?\s*\$?\s*([\d,]+\.?\d{0,2})/i
    ];
    for (var i = 0; i < ivaPatterns.length; i++) {
        var iv = ivaPatterns[i].exec(t);
        if (iv) {
            var ivaVal = parseFloat(iv[1].replace(/,/g, ''));
            if (!isNaN(ivaVal) && ivaVal > 0) {
                result.iva = ivaVal;
                break;
            }
        }
    }
    // If no IVA found but total exists, calculate it
    if (!result.iva && result.total) {
        result.iva = Math.round((result.total * 0.16 / 1.16) * 100) / 100;
    }

    // --- FECHA DE VENCIMIENTO ---
    var vencPatterns = [
        /(?:fecha\s*(?:de\s*)?(?:vencimiento|pago|l[ií]mite\s*(?:de\s*)?pago))\s*[:;]?\s*(\d{1,4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,4})/i,
        /(?:vence|vencimiento|pagar\s*antes\s*(?:del?)?)\s*[:;]?\s*(\d{1,2}\s+(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?\d{2,4})/i,
        /(?:pago|vencimiento)\s*[:;]?\s*(\d{4}[\-\/]\d{2}[\-\/]\d{2})/i
    ];
    for (var i = 0; i < vencPatterns.length; i++) {
        var vd = vencPatterns[i].exec(t);
        if (vd) {
            result.fecha_vencimiento = _normalizeDateString(vd[1].trim());
            break;
        }
    }

    return result;
}

// ============================================
// UTILIDADES DE FECHA
// ============================================

function _normalizeDateString(dateStr) {
    if (!dateStr) return null;

    // Try YYYY-MM-DD or YYYY/MM/DD
    var isoMatch = /^(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})$/.exec(dateStr);
    if (isoMatch) {
        return isoMatch[1] + '-' + isoMatch[2].padStart(2, '0') + '-' + isoMatch[3].padStart(2, '0');
    }

    // Try DD/MM/YYYY or DD-MM-YYYY
    var dmyMatch = /^(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{4})$/.exec(dateStr);
    if (dmyMatch) {
        return dmyMatch[3] + '-' + dmyMatch[2].padStart(2, '0') + '-' + dmyMatch[1].padStart(2, '0');
    }

    // Try "DD de MES de YYYY"
    var meses = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };
    var spanishDate = /(\d{1,2})\s+(?:de\s+)?(\w+)\s+(?:de\s+)?(\d{2,4})/i.exec(dateStr);
    if (spanishDate) {
        var mesNum = meses[spanishDate[2].toLowerCase()];
        if (mesNum) {
            var year = spanishDate[3].length === 2 ? '20' + spanishDate[3] : spanishDate[3];
            return year + '-' + mesNum + '-' + spanishDate[1].padStart(2, '0');
        }
    }

    return null;
}

function _calcDefaultVencimiento(fechaFactura) {
    // 2 días hábiles antes del fin del mes de la fecha de factura
    var d;
    if (fechaFactura) {
        d = new Date(fechaFactura + 'T12:00:00');
    } else {
        d = new Date();
    }

    // Fin del mes
    var endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);

    // Retroceder 2 días hábiles
    var diasHabiles = 0;
    var candidate = new Date(endOfMonth);
    while (diasHabiles < 2) {
        candidate.setDate(candidate.getDate() - 1);
        var dow = candidate.getDay();
        if (dow !== 0 && dow !== 6) { // No sábado ni domingo
            diasHabiles++;
        }
    }

    return candidate.toISOString().split('T')[0];
}

// ============================================
// 4. MOSTRAR RESULTADOS DE EXTRACCIÓN
// ============================================

function _showExtractionResults(parsed, thumbnailUrl) {
    var processing = document.getElementById('invoicePdfProcessing');
    var resultArea = document.getElementById('invoicePdfResult');
    if (processing) processing.style.display = 'none';
    if (resultArea) resultArea.style.display = '';

    // Thumbnail
    var thumbEl = document.getElementById('invoicePdfThumb');
    if (thumbEl && thumbnailUrl) {
        thumbEl.src = thumbnailUrl;
        thumbEl.style.display = '';
    } else if (thumbEl) {
        thumbEl.style.display = 'none';
    }

    // Show extracted data summary
    var summaryEl = document.getElementById('invoiceExtractedSummary');
    var html = '';
    
    var fields = [
        { label: 'Proveedor', value: parsed.nombre_emisor },
        { label: 'RFC', value: parsed.rfc_emisor },
        { label: 'No. Factura', value: parsed.numero_factura },
        { label: 'Fecha', value: parsed.fecha_factura },
        { label: 'Total', value: parsed.total ? '$' + _formatNumber(parsed.total) : null },
        { label: 'IVA', value: parsed.iva ? '$' + _formatNumber(parsed.iva) : null },
        { label: 'Vencimiento', value: parsed.fecha_vencimiento }
    ];

    var foundCount = 0;
    fields.forEach(function(f) {
        if (f.value) foundCount++;
        var icon = f.value ? '✅' : '⚠️';
        var val = f.value || '<span style="color:var(--text-light);font-style:italic;">No detectado</span>';
        html += '<div style="display:flex;justify-content:space-between;padding:0.2rem 0;font-size:0.85rem;">' +
            '<span>' + icon + ' ' + f.label + '</span>' +
            '<span style="font-weight:500;text-align:right;">' + val + '</span></div>';
    });

    if (summaryEl) summaryEl.innerHTML = html;

    // Status message
    var statusEl = document.getElementById('invoiceExtractStatus');
    if (statusEl) {
        if (foundCount >= 5) {
            statusEl.innerHTML = '<span style="color:#16a34a;">✅ Se detectaron ' + foundCount + '/7 campos</span>';
        } else if (foundCount >= 3) {
            statusEl.innerHTML = '<span style="color:#ca8a04;">⚠️ Se detectaron ' + foundCount + '/7 campos. Verifica los datos.</span>';
        } else {
            statusEl.innerHTML = '<span style="color:#dc2626;">⚠️ Solo se detectaron ' + foundCount + '/7 campos. Completa manualmente.</span>';
        }
    }

    // Check RFC against proveedores
    _checkRfcAgainstProveedores(parsed);
}

function _formatNumber(n) {
    return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================
// 5. VERIFICAR RFC CONTRA BASE DE DATOS
// ============================================

function _checkRfcAgainstProveedores(parsed) {
    var matchEl = document.getElementById('invoiceProveedorMatch');
    if (!matchEl) return;

    if (!parsed.rfc_emisor) {
        matchEl.innerHTML = '<div style="padding:0.5rem;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;font-size:0.85rem;">' +
            '⚠️ No se detectó RFC. Selecciona el proveedor manualmente al registrar la factura.</div>';
        matchEl.style.display = '';
        return;
    }

    // Search by RFC in proveedores
    var rfcUpper = parsed.rfc_emisor.toUpperCase();
    var found = null;
    if (typeof proveedores !== 'undefined') {
        found = proveedores.find(function(p) {
            return p.rfc && p.rfc.toUpperCase().replace(/[\s\-]/g, '') === rfcUpper.replace(/[\s\-]/g, '');
        });
    }

    if (found) {
        // Proveedor encontrado
        _extractedInvoiceData._proveedorId = found.id;
        _extractedInvoiceData._proveedorNombre = found.nombre;
        matchEl.innerHTML = '<div style="padding:0.5rem;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;font-size:0.85rem;">' +
            '✅ Proveedor encontrado: <strong>' + found.nombre + '</strong></div>';
        matchEl.style.display = '';
    } else {
        // Proveedor NO encontrado
        _extractedInvoiceData._proveedorId = null;
        _extractedInvoiceData._proveedorNombre = null;
        matchEl.innerHTML = '<div style="padding:0.5rem;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;font-size:0.85rem;">' +
            '🆕 RFC <strong>' + parsed.rfc_emisor + '</strong> no encontrado en proveedores.' +
            '<div style="margin-top:0.4rem;display:flex;gap:0.4rem;">' +
            '<button onclick="_proceedToNewProveedor()" style="padding:0.3rem 0.6rem;background:#3b82f6;color:white;border:none;border-radius:4px;font-size:0.82rem;cursor:pointer;">Dar de Alta Proveedor</button>' +
            '<button onclick="_proceedToRegistrarFactura()" style="padding:0.3rem 0.6rem;background:#6b7280;color:white;border:none;border-radius:4px;font-size:0.82rem;cursor:pointer;">Continuar sin Alta</button>' +
            '</div></div>';
        matchEl.style.display = '';
    }
}

// ============================================
// 6. ACCIONES POST-EXTRACCIÓN
// ============================================

function _proceedToRegistrarFactura() {
    closeUploadInvoicePdfModal();

    var data = _extractedInvoiceData || {};

    // Restaurar contexto
    window.facturaActionContext = window._invoiceUploadContext || null;

    // Prepare the factura file so saveFactura() can pick it up
    _facturaFile = _invoicePdfFile;

    // Now open the real registrar factura modal
    window.isEditingFactura = false;
    currentFacturaId = null;

    // Reset form
    document.getElementById('facturaNumero').value = data.numero_factura || '';
    document.getElementById('facturaFecha').value = data.fecha_factura || '';
    document.getElementById('facturaVencimiento').value = data.fecha_vencimiento || _calcDefaultVencimiento(data.fecha_factura);
    document.getElementById('facturaMonto').value = data.total || '';
    document.getElementById('facturaIVA').value = data.iva || '';

    // Show/hide proveedor row
    var provRow = document.getElementById('facturaProveedorRow');
    var needsProvSearch = (window.facturaActionContext === 'standalone-porpagar' || window.facturaActionContext === 'dashboard-porpagar');
    var comingFromProvDetail = (!window.facturaActionContext && currentProveedorId);
    
    if (provRow) {
        if (comingFromProvDetail) {
            // Coming from proveedor detail — keep current proveedor, hide search
            provRow.style.display = 'none';
        } else if (needsProvSearch) {
            provRow.style.display = '';
            document.getElementById('facturaProveedorSearch').value = '';
            document.getElementById('facturaProveedorId').value = '';
            document.getElementById('facturaProveedorResults').style.display = 'none';
            document.getElementById('facturaProveedorSearch').style.borderColor = 'var(--border)';
            document.getElementById('facturaProveedorSearch').style.background = '';

            // If we found the proveedor by RFC, pre-select it
            if (data._proveedorId) {
                selectFacturaProveedor(data._proveedorId, data._proveedorNombre);
            }
        } else if (data._proveedorId) {
            provRow.style.display = 'none';
            currentProveedorId = data._proveedorId;
        } else {
            provRow.style.display = 'none';
        }
    }

    // --- REPLACE FILE UPLOAD AREA WITH PDF THUMBNAIL ---
    var facturaFileSection = document.getElementById('facturaFileUploadSection');
    if (facturaFileSection && _invoicePdfFile) {
        var thumbHtml = '<div style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;">';
        if (_invoicePdfThumbnailUrl) {
            thumbHtml += '<img src="' + _invoicePdfThumbnailUrl + '" style="width:48px;height:auto;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;" onclick="_previewInvoicePdf()" title="Click para ver">';
        } else {
            thumbHtml += '<span style="font-size:2rem;">📄</span>';
        }
        thumbHtml += '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:0.85rem;font-weight:500;color:#166534;">✅ ' + _invoicePdfFile.name + '</div>' +
            '<div style="font-size:0.75rem;color:var(--text-light);">' + (_invoicePdfFile.size / 1024).toFixed(0) + ' KB</div>' +
            '</div>' +
            '<button type="button" onclick="_clearInvoicePdfAndShowUpload()" style="background:none;border:none;font-size:1rem;cursor:pointer;color:var(--text-light);" title="Cambiar archivo">✕</button>' +
            '</div>';
        facturaFileSection.innerHTML = thumbHtml;
    }

    document.querySelector('#registrarFacturaModal .modal-title').textContent = 'Registrar Factura';
    document.getElementById('registrarFacturaModal').classList.add('active');

    // Focus: if proveedor search is visible and no match, focus it
    setTimeout(function() {
        if (needsProvSearch && !data._proveedorId) {
            var searchInput = document.getElementById('facturaProveedorSearch');
            if (searchInput) searchInput.focus();
        }
    }, 100);
}

function _proceedToNewProveedor() {
    closeUploadInvoicePdfModal();

    var data = _extractedInvoiceData || {};

    // Open the add proveedor modal and pre-fill data
    isEditMode = false;
    currentProveedorId = null;
    tempProveedorContactos = [];

    document.getElementById('addProveedorTitle').textContent = 'Agregar Proveedor';
    document.getElementById('proveedorForm').reset();
    document.getElementById('proveedorContactosList').innerHTML = '';
    document.getElementById('provDocAdicionalFileName').textContent = '';
    document.getElementById('nombreProvDocGroup').classList.add('hidden');

    // Pre-fill with extracted data
    document.getElementById('proveedorNombre').value = data.nombre_emisor || '';
    document.getElementById('proveedorRFC').value = data.rfc_emisor || '';
    document.getElementById('proveedorServicio').value = ''; // User must fill this

    // Limpiar contacto inline
    document.getElementById('proveedorContactoNombreInline').value = '';
    document.getElementById('proveedorContactoTelInline').value = '';
    document.getElementById('proveedorContactoEmailInline').value = '';

    // Store invoice data so we can use it after proveedor is created
    window._pendingInvoiceAfterProveedor = {
        data: data,
        file: _invoicePdfFile,
        thumbnailUrl: _invoicePdfThumbnailUrl,
        context: window._invoiceUploadContext
    };

    document.getElementById('addProveedorModal').classList.add('active');
}

function _clearInvoicePdfAndShowUpload() {
    _facturaFile = null;
    _invoicePdfFile = null;
    _invoicePdfThumbnailUrl = null;

    // Restore original file upload section
    var facturaFileSection = document.getElementById('facturaFileUploadSection');
    if (facturaFileSection) {
        facturaFileSection.innerHTML = _getOriginalFileUploadHtml();
        setTimeout(function() {
            if (typeof _initFacturaPaste === 'function') _initFacturaPaste();
        }, 50);
    }
}

function _previewInvoicePdf() {
    if (!_invoicePdfFile) return;
    var url = URL.createObjectURL(_invoicePdfFile);
    // Use existing PDF viewer if available
    if (typeof showPDFViewer === 'function') {
        showPDFViewer(url);
    } else {
        window.open(url, '_blank');
    }
}

function _getOriginalFileUploadHtml() {
    return '<label style="font-weight:500; font-size:0.9rem; display:block; margin-bottom:0.4rem;">Factura</label>' +
        '<div id="facturaClickZone" onclick="document.getElementById(\'facturaDocumento\').click()" style="padding:0.5rem; border:1px dashed var(--border); border-radius:6px; cursor:pointer; text-align:center; font-size:0.85rem; color:var(--text-light); transition:border-color 0.2s;" onmouseover="this.style.borderColor=\'var(--primary)\'" onmouseout="this.style.borderColor=\'var(--border)\'">' +
        '<input type="file" id="facturaDocumento" accept="*/*,.pdf,.xlsx,.xls,.doc,.docx,.csv,.jpg,.jpeg,.png,.heic" style="display:none;" onchange="handleFacturaFileSelect(this)">' +
        '📎 Click para seleccionar documento' +
        '<div id="facturaDocumentoFileName" style="color:var(--success); margin-top:0.25rem; font-weight:500;"></div>' +
        '</div>' +
        '<div style="text-align:center; color:var(--text-light); font-size:0.78rem; margin:0.4rem 0;">— o —</div>' +
        '<div style="display:flex; gap:0.5rem;">' +
        '<div id="facturaPasteZone" tabindex="0" style="flex:1; padding:0.5rem; border:1px dashed var(--border); border-radius:6px; cursor:pointer; text-align:center; font-size:0.82rem; color:var(--text-light); transition:all 0.2s; outline:none;" onclick="this.focus();" onfocus="this.style.borderColor=\'var(--primary)\';this.style.background=\'#f0f9ff\';" onblur="this.style.borderColor=\'var(--border)\';this.style.background=\'\';">' +
        '📋 Pega aquí<br><span style="font-size:0.72rem;">(Ctrl+V)</span></div>' +
        '<div id="facturaDragZone" style="flex:1; padding:0.5rem; border:1px dashed var(--border); border-radius:6px; text-align:center; font-size:0.82rem; color:var(--text-light); transition:all 0.2s;" ondragover="event.preventDefault();this.style.borderColor=\'var(--primary)\';this.style.background=\'#f0f9ff\';" ondragleave="this.style.borderColor=\'var(--border)\';this.style.background=\'\';" ondrop="event.preventDefault();this.style.borderColor=\'var(--border)\';this.style.background=\'\';handleFacturaDrop(event);">' +
        '📁 Arrastra aquí</div></div>' +
        '<div id="facturaFilePreview" style="display:none; margin-top:0.4rem; padding:0.35rem 0.6rem; background:#f0fdf4; border:1px solid #86efac; border-radius:6px; font-size:0.82rem; color:#166534;"></div>';
}

// ============================================
// 7. INTERCEPTAR FLOW DE "REGISTRAR FACTURA"
// ============================================

// Guardar referencia original
var _originalShowRegistrarFacturaModal = null;

function _interceptRegistrarFactura() {
    // Replace showRegistrarFacturaModal to show PDF upload first
    if (typeof showRegistrarFacturaModal === 'function' && !_originalShowRegistrarFacturaModal) {
        _originalShowRegistrarFacturaModal = showRegistrarFacturaModal;
    }

    window.showRegistrarFacturaModal = function() {
        // Show PDF upload modal instead
        showUploadInvoicePdfModal(window.facturaActionContext);
    };

    // Also intercept showRegistrarFacturaFromDash
    var _origFromDash = window.showRegistrarFacturaFromDash;
    window.showRegistrarFacturaFromDash = function() {
        // Prepare sorted list (same as original)
        _proveedorListSorted = (typeof proveedores !== 'undefined' ? proveedores : []).slice().sort(function(a, b) {
            return a.nombre.localeCompare(b.nombre);
        });
        window.facturaActionContext = 'dashboard-porpagar';
        currentProveedorId = null;
        // Show PDF upload instead
        showUploadInvoicePdfModal('dashboard-porpagar');
    };
}

// Button: "Continuar" from the extraction results (when proveedor IS found)
function _continueToRegistrarFactura() {
    _proceedToRegistrarFactura();
}

// Button: "Saltar extracción" (skip extraction, go directly to registrar)
function _skipExtractionAndRegister() {
    closeUploadInvoicePdfModal();
    _extractedInvoiceData = {};
    
    // Use original modal function
    window.facturaActionContext = window._invoiceUploadContext || null;
    if (_originalShowRegistrarFacturaModal) {
        _originalShowRegistrarFacturaModal();
    }
}

// ============================================
// 8. HOOK POST-SAVE PROVEEDOR (para continuar con factura)
// ============================================

// This should be called after a proveedor is saved, to check if we have pending invoice data
function checkPendingInvoiceAfterProveedor(newProveedorId) {
    var pending = window._pendingInvoiceAfterProveedor;
    if (!pending) return;
    window._pendingInvoiceAfterProveedor = null;

    // Update extracted data with new proveedor
    pending.data._proveedorId = newProveedorId;
    
    // Use the actual saved proveedor name (not the extracted one)
    var newProv = proveedores.find(function(p) { return p.id === newProveedorId; });
    pending.data._proveedorNombre = newProv ? newProv.nombre : (pending.data.nombre_emisor || '');
    
    _extractedInvoiceData = pending.data;
    _invoicePdfFile = pending.file;
    _invoicePdfThumbnailUrl = pending.thumbnailUrl;
    window._invoiceUploadContext = pending.context;

    // Small delay to let proveedor modal close
    setTimeout(function() {
        _proceedToRegistrarFactura();
    }, 300);
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Intercept the factura flow after a short delay to ensure other scripts loaded
    setTimeout(function() {
        _interceptRegistrarFactura();
        console.log('✅ INVOICE-EXTRACTOR.JS v1 cargado — flujo de factura interceptado');
    }, 200);
});
