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
    var processingMsg = document.getElementById('invoicePdfProcessingMsg');
    if (dropArea) dropArea.style.display = 'none';
    if (processing) processing.style.display = '';
    if (processingMsg) processingMsg.textContent = 'Extrayendo datos de la factura...';

    try {
        // Read file as ArrayBuffer
        var arrayBuffer = await file.arrayBuffer();

        // Generate thumbnail
        var thumbnailUrl = await _generatePdfThumbnail(arrayBuffer.slice(0));
        _invoicePdfThumbnailUrl = thumbnailUrl;

        // Try pdf.js text extraction first
        var textContent = await _extractPdfText(arrayBuffer.slice(0));

        // Parse the extracted text
        var parsed = _parseInvoiceText(textContent);
        
        // Count how many fields were found
        var fieldCount = [parsed.rfc_emisor, parsed.numero_factura, parsed.fecha_factura, 
                          parsed.total, parsed.iva, parsed.fecha_vencimiento].filter(Boolean).length;

        // If text was found but parsing got poor results (≤2 fields), try OCR and merge
        var usedOcr = false;
        if (fieldCount <= 2 && typeof Tesseract !== 'undefined') {
            console.log('⚠️ Solo ' + fieldCount + ' campos del texto PDF, intentando OCR para mejorar...');
            if (processingMsg) processingMsg.textContent = 'Mejorando extracción con OCR...';
            try {
                var ocrText = await _extractPdfWithOCR(arrayBuffer.slice(0));
                var ocrParsed = _parseInvoiceText(ocrText);
                usedOcr = true;
                
                // Merge: use OCR values for fields that pdf.js didn't find
                if (!parsed.rfc_emisor && ocrParsed.rfc_emisor) parsed.rfc_emisor = ocrParsed.rfc_emisor;
                if (!parsed.nombre_emisor && ocrParsed.nombre_emisor) parsed.nombre_emisor = ocrParsed.nombre_emisor;
                if (!parsed.numero_factura && ocrParsed.numero_factura) parsed.numero_factura = ocrParsed.numero_factura;
                if (!parsed.fecha_factura && ocrParsed.fecha_factura) parsed.fecha_factura = ocrParsed.fecha_factura;
                if (!parsed.total && ocrParsed.total) parsed.total = ocrParsed.total;
                if (!parsed.iva && ocrParsed.iva) parsed.iva = ocrParsed.iva;
                if (!parsed.fecha_vencimiento && ocrParsed.fecha_vencimiento) parsed.fecha_vencimiento = ocrParsed.fecha_vencimiento;
                
                console.log('📋 Datos mejorados con OCR:', JSON.stringify(parsed, null, 2));
            } catch (ocrErr) {
                console.warn('⚠️ OCR fallback falló:', ocrErr);
            }
        }
        
        // If no text at all, use pure OCR
        if ((!textContent || textContent.trim().length < 20) && !usedOcr) {
            console.log('⚠️ PDF sin texto extraíble, intentando OCR...');
            if (processingMsg) processingMsg.textContent = 'PDF sin texto... aplicando OCR (puede tardar unos segundos)...';
            textContent = await _extractPdfWithOCR(arrayBuffer.slice(0));
            parsed = _parseInvoiceText(textContent);
        }

        _extractedInvoiceData = parsed;

        console.log('📄 Texto extraído del PDF:', textContent.substring(0, 500));
        console.log('📋 Datos parseados:', JSON.stringify(parsed, null, 2));

        // Show results
        _showExtractionResults(parsed, thumbnailUrl);

    } catch (err) {
        console.error('❌ Error procesando PDF:', err);
        // Fallback: let user continue without extraction
        _extractedInvoiceData = {};
        _invoicePdfThumbnailUrl = thumbnailUrl || null;
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
    
    console.log('📄 PDF tiene', pdf.numPages, 'páginas');

    // Extract text from all pages (most invoices are 1-2 pages)
    var maxPages = Math.min(pdf.numPages, 4);
    for (var i = 1; i <= maxPages; i++) {
        var page = await pdf.getPage(i);
        var content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
        
        console.log('📄 Página', i, ':', content.items.length, 'items de texto');
        
        // Log first few items for debugging
        if (i <= 2 && content.items.length > 0) {
            var sample = content.items.slice(0, 10).map(function(item) {
                return JSON.stringify({ str: item.str, dir: item.dir, width: item.width ? item.width.toFixed(1) : 0 });
            });
            console.log('  📄 Muestra items pág', i, ':', sample.join(', '));
        }
        
        // Build text: join items with space, but use newline when Y position changes significantly
        var lastY = null;
        var pageLines = [];
        var currentLine = '';
        
        for (var j = 0; j < content.items.length; j++) {
            var item = content.items[j];
            var text = item.str;
            if (!text && item.chars) {
                // Some PDFs store text in chars array
                text = item.chars.map(function(c) { return c.unicode || c.str || ''; }).join('');
            }
            if (!text) continue;
            
            // Check if Y position changed (new line)
            var y = item.transform ? item.transform[5] : null;
            if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
                if (currentLine.trim()) pageLines.push(currentLine.trim());
                currentLine = '';
            }
            
            currentLine += text + ' ';
            lastY = y;
        }
        if (currentLine.trim()) pageLines.push(currentLine.trim());
        
        var pageText = pageLines.join('\n');
        fullText += pageText + '\n';
        
        console.log('📄 Texto pág', i, '(' + pageText.length + ' chars):', pageText.substring(0, 200));
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
        var scale = 1.5; // Good quality for half-screen preview
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
// 2b. OCR FALLBACK (for image-based PDFs)
// ============================================

async function _extractPdfWithOCR(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js no está cargado');
    if (typeof Tesseract === 'undefined') throw new Error('Tesseract.js no está cargado');

    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    var fullText = '';
    
    // OCR the first 2 pages (invoices rarely need more)
    var maxPages = Math.min(pdf.numPages, 2);
    
    for (var i = 1; i <= maxPages; i++) {
        console.log('🔍 OCR página', i, 'de', maxPages, '...');
        
        var page = await pdf.getPage(i);
        // Render at 2x scale for better OCR accuracy
        var scale = 2.0;
        var viewport = page.getViewport({ scale: scale });

        var canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        var ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        // Run Tesseract OCR on the rendered canvas
        var result = await Tesseract.recognize(canvas, 'spa', {
            logger: function(info) {
                if (info.status === 'recognizing text') {
                    var pct = Math.round((info.progress || 0) * 100);
                    var msg = document.getElementById('invoicePdfProcessingMsg');
                    if (msg) msg.textContent = 'OCR página ' + i + '/' + maxPages + '... ' + pct + '%';
                }
            }
        });

        var pageText = result.data.text || '';
        console.log('🔍 OCR pág', i, '(' + pageText.length + ' chars):', pageText.substring(0, 200));
        fullText += pageText + '\n';
    }

    return fullText;
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

    // RFCs a ignorar
    var rfcIgnore = ['IES9804035B5', 'SAT970701NN3'];

    // --- RFC EMISOR ---
    // Method 1: Standard RFC pattern (3-4 letters + 6 digits + optional hyphen + 3 alphanum)
    var rfcPattern = /\b([A-ZÑ&]{3,4}\d{6})-?([A-Z0-9]{3})\b/gi;
    var rfcMatches = [];
    var m;
    while ((m = rfcPattern.exec(t)) !== null) {
        var rfc = (m[1] + m[2]).toUpperCase();
        if (rfcIgnore.indexOf(rfc) === -1 && !/^(XAXX|XEXX)/.test(rfc)) {
            rfcMatches.push(rfc);
        }
    }
    
    // Method 2: Look for "RFC:" label and grab whatever follows (handles OCR errors)
    if (rfcMatches.length === 0) {
        var rfcLabelPattern = /RFC\s*[:;]\s*([A-Z0-9Ñ&\-]{9,18})/gi;
        var rm;
        while ((rm = rfcLabelPattern.exec(t)) !== null) {
            var rawRfc = rm[1].replace(/[\-\s]/g, '').toUpperCase();
            // Skip our own RFC and SAT (even with OCR errors - fuzzy match)
            if (rawRfc.indexOf('IES') === 0 || rawRfc.indexOf('1ES') === 0) continue; // OCR: I→1
            if (rawRfc.indexOf('SAT') === 0) continue;
            if (rawRfc.length >= 12 && rawRfc.length <= 14) {
                rfcMatches.push(rawRfc);
            }
        }
    }
    
    if (rfcMatches.length > 0) {
        result.rfc_emisor = rfcMatches[0];
    }

    // --- NOMBRE DEL EMISOR ---
    // Method 1: Common label patterns
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
    
    // Method 2: Find company-like names (S.A., S.A.B., S.C., S. DE R.L., etc.)
    if (!result.nombre_emisor) {
        var companyPattern = /([A-ZÁÉÍÓÚÑ\s]{5,60})\s*(?:S\.?\s*A\.?\s*B?\.?\s*(?:DE\s*)?C\.?\s*V\.?|S\.?\s*(?:DE\s*)?R\.?\s*L\.?|S\.?\s*C\.?|A\.?\s*C\.?)/i;
        var cm = companyPattern.exec(t);
        if (cm) {
            var fullMatch = cm[0].trim().replace(/\s+/g, ' ');
            // Skip our own company name
            if (!/INMOBILIARIS|ESWU/i.test(fullMatch)) {
                result.nombre_emisor = fullMatch;
            }
        }
    }
    
    // Method 3: Look for text near the first RFC label
    if (!result.nombre_emisor) {
        var rfcLabelPos = tUpper.indexOf('RFC:');
        if (rfcLabelPos > 10) {
            var before = t.substring(Math.max(0, rfcLabelPos - 120), rfcLabelPos).trim();
            // Take text that looks like a company/person name
            var segments = before.split(/[\n\r|]+/);
            for (var s = segments.length - 1; s >= 0; s--) {
                var seg = segments[s].trim();
                // Skip addresses, codes, short fragments
                if (seg.length >= 8 && seg.length <= 80 && !/^(C\.?P\.|Parque|Ave|Calle|\d)/i.test(seg)) {
                    // Skip our company
                    if (!/INMOBILIARIS|ESWU/i.test(seg)) {
                        result.nombre_emisor = seg.replace(/\s+/g, ' ');
                        break;
                    }
                }
            }
        }
    }

    // --- NÚMERO DE FACTURA ---
    var folioPatterns = [
        // "Factura No.:" followed by numbers
        /factura\s*(?:no\.?|n[uú]mero|num\.?)\s*[:;#]?\s*(?:\d\s*:\s*)?(\d{4,20})/i,
        // "Folio:" or "Folio interno:" followed by number (must start with digit)
        /(?:serie\s*\/?\s*)?folio\s*(?:interno)?\s*[:;]\s*(\d[\dA-Z\-]{0,19})/i,
        // "Folio: 2236" simple
        /\bfolio\s*[:;]\s*(\d{1,10})\b/i,
        // "Folio fiscal:" UUID-like (skip in post-check below)
        /(?:folio\s*fiscal)\s*[:;#]?\s*([A-Z0-9\-]{8,40})/i,
        /(?:no\.?\s*(?:de\s*)?factura)\s*[:;#]?\s*([A-Z0-9\-]{1,30})/i,
        /(?:serie\s*y\s*folio)\s*[:;]?\s*([A-Z]{0,4})\s*[-]?\s*(\d{1,10})/i,
        /(?:N[uú]mero\s*de\s*documento|Documento\s*No\.?)\s*[:;]?\s*([A-Z0-9\-]{1,30})/i,
        // CFE: "NO. DE SERVICIO:" as fallback
        /no\.?\s*de\s*servicio\s*[:;]?\s*(\d{6,20})/i
    ];
    for (var i = 0; i < folioPatterns.length; i++) {
        var fm = folioPatterns[i].exec(t);
        if (fm) {
            if (fm[2]) {
                result.numero_factura = (fm[1] + fm[2]).trim();
            } else {
                result.numero_factura = fm[1].trim();
            }
            // Skip UUID-like folio fiscal (it's not the invoice number users want)
            if (result.numero_factura && result.numero_factura.indexOf('-') > -1 && result.numero_factura.length > 20) {
                result.numero_factura = null;
                continue;
            }
            break;
        }
    }

    // --- FECHA DE FACTURA ---
    // Meses abreviados y completos para parsing
    var mesesAbrev = {
        'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AGO': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
    };
    var mesesFull = {
        'ENERO': '01', 'FEBRERO': '02', 'MARZO': '03', 'ABRIL': '04', 'MAYO': '05', 'JUNIO': '06',
        'JULIO': '07', 'AGOSTO': '08', 'SEPTIEMBRE': '09', 'OCTUBRE': '10', 'NOVIEMBRE': '11', 'DICIEMBRE': '12'
    };

    var fechaPatterns = [
        // "Fecha/Hora expedición: 04/02/2026 11:43:03" or "Fecha expedición: 2026-02-04"
        { rx: /fecha\s*(?:\/?\s*hora)?\s*(?:de\s*)?expedici[oó]n\s*[:;]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i, type: 'standard' },
        { rx: /fecha\s*(?:\/?\s*hora)?\s*(?:de\s*)?expedici[oó]n\s*[:;]?\s*(\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2})/i, type: 'standard' },
        // "Fecha de emisión:" or "Fecha emisión:"
        { rx: /fecha\s*(?:de\s*)?emisi[oó]n\s*[:;]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i, type: 'standard' },
        { rx: /fecha\s*(?:de\s*)?emisi[oó]n\s*[:;]?\s*(\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2})/i, type: 'standard' },
        // Flexible: "expedición" then closest date within 80 chars (handles table column mixing)
        { rx: /expedici[oó]n[^0-9]{0,80}(\d{1,2}\/\d{1,2}\/\d{4})/i, type: 'standard' },
        { rx: /expedici[oó]n[^0-9]{0,80}(\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2})/i, type: 'standard' },
        // Flexible: "emisión" then closest date within 80 chars
        { rx: /emisi[oó]n[^0-9]{0,80}(\d{1,2}\/\d{1,2}\/\d{4})/i, type: 'standard' },
        { rx: /emisi[oó]n[^0-9]{0,80}(\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2})/i, type: 'standard' },
        // CFDI: "Fecha" seguido de AAAA MM DD (con espacios)
        { rx: /(?:fecha)\s*[:;]?\s*(\d{4})\s+(\d{1,2})\s+(\d{1,2})/i, type: 'ymd_groups' },
        // DD-MES-AAAA (abbreviated month): 21-ENE-2026, 22-FEB-2026
        { rx: /(?:fecha|emisi[oó]n|expedici[oó]n|facturaci[oó]n)[^0-9]{0,30}(\d{1,2})[\-\/\s]+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[\-\/\s]+(\d{4})/i, type: 'dmy_abrev' },
        // Standalone DD-MES-AAAA near RFC line
        { rx: /RFC[^0-9]{0,30}[\-_\s]*(\d{1,2})[\-\/\s]+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[\-\/\s]+(\d{4})/i, type: 'dmy_abrev' },
        // YYYY-MM-DD standard
        { rx: /(?:fecha\s*(?:de\s*)?(?:emisi[oó]n|expedici[oó]n|factura|comprobante|cfdi))\s*[:;]?\s*(\d{4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,4})/i, type: 'standard' },
        // "Fecha y Hora de Certificación: 2026-01-28T07:12:04"
        { rx: /(?:certificaci[oó]n)\s*[:;]?\s*(\d{4})-(\d{2})-(\d{2})/i, type: 'ymd_groups' },
        // Any YYYY-MM-DD near "fecha"
        { rx: /fecha[^0-9]{0,20}(\d{4}[\-\/]\d{2}[\-\/]\d{2})/i, type: 'standard' },
        // Any YYYY MM DD (spaces) near "fecha"
        { rx: /fecha[^0-9]{0,20}(\d{4})\s+(\d{1,2})\s+(\d{1,2})/i, type: 'ymd_groups' },
        // "Mes de Facturación: Enero" + year from nearby context
        { rx: /mes\s*de\s*facturaci[oó]n\s*[:;]?\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i, type: 'month_only' },
        // CFE: "PERIODO FACTURADO:20 ENE 26-19 FEB 26" — use end date
        { rx: /periodo\s*facturado\s*[:;]?\s*\d{1,2}\s*(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s*\d{2,4}\s*[-–]\s*(\d{1,2})\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s*(\d{2,4})/i, type: 'dmy_abrev' },
        // "Fecha de impresion:25/02/2026"
        { rx: /fecha[^0-9]{0,30}impresi[oó]n\s*[:;]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i, type: 'standard' }
    ];
    
    for (var i = 0; i < fechaPatterns.length; i++) {
        var fp = fechaPatterns[i];
        var fd = fp.rx.exec(t);
        if (!fd) continue;
        
        if (fp.type === 'ymd_groups' && fd[1] && fd[2] && fd[3]) {
            result.fecha_factura = fd[1] + '-' + fd[2].padStart(2, '0') + '-' + fd[3].padStart(2, '0');
        } else if (fp.type === 'dmy_abrev' && fd[1] && fd[2] && fd[3]) {
            var mesNum = mesesAbrev[fd[2].toUpperCase()];
            if (mesNum) {
                var yr = fd[3].length === 2 ? '20' + fd[3] : fd[3];
                result.fecha_factura = yr + '-' + mesNum + '-' + fd[1].padStart(2, '0');
            }
        } else if (fp.type === 'standard' && fd[1]) {
            result.fecha_factura = _normalizeDateString(fd[1].trim());
        } else if (fp.type === 'month_only' && fd[1]) {
            // Month only — assume first of that month + find year nearby
            var mesN = mesesFull[fd[1].toUpperCase()];
            if (mesN) {
                var yearMatch = /\b(20\d{2})\b/.exec(t);
                var yr = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
                result.fecha_factura = yr + '-' + mesN + '-01';
            }
        }
        
        if (result.fecha_factura) break;
    }

    // --- TOTAL ---
    var totalPatterns = [
        // "TOTAL A PAGAR: $490" or "Total a Pagar: $ 1,234.56"
        /(?:total\s*a\s*pagar)\s*[:;]?\s*\$\s*([\d,]+\.?\d{0,2})/i,
        // "Total 490.28" (right side of table in CFE)
        /\bTotal\s+([\d,]+\.\d{2})\b/,
        // Generic total patterns
        /(?:total\s*(?:a\s*pagar|con\s*letra|cfdi|factura)?)\s*[:;$]?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
        /(?:importe\s*total|monto\s*total|gran\s*total)\s*[:;$]?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
        /(?:saldo\s*(?:al\s*corte|total))\s*[:;$]?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
        // "$490" standalone with dollar sign (CFE big display)
        /\$\s*([\d,]{3,}\.?\d{0,2})/
    ];
    var totalCandidates = [];
    for (var i = 0; i < totalPatterns.length; i++) {
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
        result.total = Math.max.apply(null, totalCandidates);
    }

    // --- IVA ---
    var ivaPatterns = [
        // "Impuestos trasladados IVA 16.00% $ 272.00" — skip the percentage, get the amount
        /(?:impuestos?\s*trasladados?)\s*(?:IVA)?\s*\d{1,2}[\.,]?\d{0,2}\s*%\s*\$?\s*([\d,]+\.?\d{0,2})/i,
        // "IVA 16% $ 272.00" or "IVA 16.00% $272.00" — skip percentage, get amount after
        /\bIVA\s*\d{1,2}[\.,]?\d{0,2}\s*%\s*\$?\s*([\d,]+\.?\d{0,2})/i,
        // "IVA Traslado ... 272.000000" (CFDI table format with Importe column)
        /\bIVA\s+Traslad[oa]\w*\s+[\d,]+\.?\d*\s+\w+\s+\d{1,2}[\.,]\d{2}%?\s+([\d,]+\.?\d{0,6})/i,
        // "I.V.A. $ 55.03" or "IVA: $55.03" (no percentage)
        /(?:i\.?v\.?a\.?)\s*[:;]?\s*\$\s*([\d,]+\.?\d{0,2})/i,
        // "IVA trasladado: 272.00" or "Impuesto trasladado $272.00"
        /(?:i\.?v\.?a\.?\s*trasladado|impuesto\s*trasladado)\s*[:;$]?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
        // "IVA 16% 55.03" (percentage then amount, no $ sign)
        /\bIVA\s*\d{1,2}[\.,]?\d{0,2}\s*%\s*([\d,]+\.\d{2})\b/i
    ];
    for (var i = 0; i < ivaPatterns.length; i++) {
        var iv = ivaPatterns[i].exec(t);
        if (iv) {
            var ivaVal = parseFloat(iv[1].replace(/,/g, ''));
            // Sanity check: IVA should not be the percentage itself (16 or less is suspicious unless total is very small)
            if (!isNaN(ivaVal) && ivaVal > 0) {
                // If IVA looks like a percentage (e.g. 16.00) and we have a total, verify
                if (ivaVal <= 16.01 && result.total && result.total > 200) {
                    continue; // Skip, this is probably the rate not the amount
                }
                result.iva = ivaVal;
                break;
            }
        }
    }
    if (!result.iva && result.total) {
        result.iva = Math.round((result.total * 0.16 / 1.16) * 100) / 100;
    }

    // --- FECHA DE VENCIMIENTO ---
    var vencPatterns = [
        // CFE: "FECHA LÍMITE DE PAGO:07 MAR 2026" (possibly no space after colon)
        { rx: /fecha\s*l[ií]mite\s*(?:de\s*)?pago\s*[:;]?\s*(\d{1,2})\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s*(\d{4})/i, type: 'dmy_abrev' },
        { rx: /fecha\s*l[ií]mite\s*(?:de\s*)?pago\s*[:;]?\s*(\d{1,4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,4})/i, type: 'standard' },
        // "Pagar antes de:" DD-MES-AAAA
        { rx: /pagar\s*antes\s*(?:de|del?)?\s*[:;]?\s*[\-_]?\s*(\d{1,2})[\-\/\s]+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[\-\/\s]+(\d{4})/i, type: 'dmy_abrev' },
        // "Pagar antes de:" DD/MM/YYYY
        { rx: /pagar\s*antes\s*(?:de|del?)?\s*[:;]?\s*(\d{1,4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,4})/i, type: 'standard' },
        // "Fecha de vencimiento:" various formats
        { rx: /(?:fecha\s*(?:de\s*)?(?:vencimiento|l[ií]mite\s*(?:de\s*)?pago))\s*[:;]?\s*(\d{1,2})[\-\/\s]+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[\-\/\s]+(\d{4})/i, type: 'dmy_abrev' },
        { rx: /(?:fecha\s*(?:de\s*)?(?:vencimiento|pago|l[ií]mite\s*(?:de\s*)?pago))\s*[:;]?\s*(\d{1,4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,4})/i, type: 'standard' },
        // "Vencimiento:" with full month names
        { rx: /(?:vence|vencimiento|pagar\s*antes\s*(?:del?)?)\s*[:;]?\s*(\d{1,2}\s+(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?\d{2,4})/i, type: 'standard' },
        { rx: /(?:pago|vencimiento)\s*[:;]?\s*(\d{4}[\-\/]\d{2}[\-\/]\d{2})/i, type: 'standard' },
        // "CORTE A PARTIR:" (CFE disconnect date, useful as reference)
        { rx: /corte\s*a\s*partir\s*[:;]?\s*(\d{1,2})\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s*(\d{4})/i, type: 'dmy_abrev' }
    ];
    for (var i = 0; i < vencPatterns.length; i++) {
        var vp = vencPatterns[i];
        var vd = vp.rx.exec(t);
        if (!vd) continue;
        
        if (vp.type === 'dmy_abrev' && vd[1] && vd[2] && vd[3]) {
            var vMes = mesesAbrev[vd[2].toUpperCase()];
            if (vMes) {
                var vYr = vd[3].length === 2 ? '20' + vd[3] : vd[3];
                result.fecha_vencimiento = vYr + '-' + vMes + '-' + vd[1].padStart(2, '0');
            }
        } else if (vp.type === 'standard' && vd[1]) {
            result.fecha_vencimiento = _normalizeDateString(vd[1].trim());
        }
        
        if (result.fecha_vencimiento) break;
    }

    // Si no se encontró vencimiento, calcular default: 2 días hábiles antes del fin del mes en curso
    if (!result.fecha_vencimiento) {
        result.fecha_vencimiento = _calcDefaultVencimiento();
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

    // Try DD-MES-YYYY (abbreviated months: ENE, FEB, etc.)
    var mesesAbr = {
        'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AGO': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
    };
    var abrMatch = /(\d{1,2})[\-\/\s]+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[\-\/\s]+(\d{2,4})/i.exec(dateStr);
    if (abrMatch) {
        var mesNum = mesesAbr[abrMatch[2].toUpperCase()];
        if (mesNum) {
            var yr = abrMatch[3].length === 2 ? '20' + abrMatch[3] : abrMatch[3];
            return yr + '-' + mesNum + '-' + abrMatch[1].padStart(2, '0');
        }
    }

    // Try "DD de MES de YYYY" (full month names)
    var meses = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };
    var spanishDate = /(\d{1,2})\s+(?:de\s+)?(\w+)\s+(?:de\s+)?(\d{2,4})/i.exec(dateStr);
    if (spanishDate) {
        var mesN = meses[spanishDate[2].toLowerCase()];
        if (mesN) {
            var year = spanishDate[3].length === 2 ? '20' + spanishDate[3] : spanishDate[3];
            return year + '-' + mesN + '-' + spanishDate[1].padStart(2, '0');
        }
    }

    return null;
}

function _calcDefaultVencimiento(fechaFactura) {
    // 2 días hábiles antes del fin del mes EN CURSO (no el de la factura)
    var d = new Date();

    // Fin del mes actual
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
        { label: 'Fecha', value: _formatDateDisplay(parsed.fecha_factura) },
        { label: 'Total', value: parsed.total ? '$' + _formatNumber(parsed.total) : null },
        { label: 'IVA', value: parsed.iva ? '$' + _formatNumber(parsed.iva) : null },
        { label: 'Vencimiento', value: _formatDateDisplay(parsed.fecha_vencimiento) }
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

// Format date as "28 Feb 26" for display
function _formatDateDisplay(dateStr) {
    if (!dateStr) return null;
    var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    var parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    var y = parts[0];
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    if (isNaN(m) || isNaN(d) || m < 1 || m > 12) return dateStr;
    var shortYear = y.length === 4 ? y.substring(2) : y;
    return d + ' ' + meses[m - 1] + ' ' + shortYear;
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
        _extractedInvoiceData.nombre_emisor = found.nombre;
        matchEl.innerHTML = '<div style="padding:0.5rem;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;font-size:0.85rem;">' +
            '✅ Proveedor encontrado: <strong>' + found.nombre + '</strong></div>';
        matchEl.style.display = '';
        
        // Update the Proveedor name in the summary above
        var summaryEl = document.getElementById('invoiceExtractedSummary');
        if (summaryEl) {
            var rows = summaryEl.querySelectorAll('div');
            if (rows.length > 0) {
                // First row is Proveedor
                rows[0].innerHTML = '<span>✅ Proveedor</span>' +
                    '<span style="font-weight:500;text-align:right;">' + found.nombre + '</span>';
            }
        }
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
    
    // Show PDF preview in the form if we have a thumbnail
    var pdfPreviewPanel = document.getElementById('facturaFormPdfPreview');
    var pdfPreviewImg = document.getElementById('facturaFormPdfImg');
    if (pdfPreviewPanel && pdfPreviewImg && _invoicePdfThumbnailUrl) {
        pdfPreviewImg.src = _invoicePdfThumbnailUrl;
        pdfPreviewPanel.style.display = '';
    } else if (pdfPreviewPanel) {
        pdfPreviewPanel.style.display = 'none';
    }
    
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
