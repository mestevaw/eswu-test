/* ========================================
   PROVEEDORES UI - TODAS LAS FUNCIONES
   Diseño restaurado sesiones 3-6 + optimización sesiones 7-8
   Última actualización: 2026-02-12 20:00 CST
   ======================================== */

// ============================================
// FUNCIONES AUXILIARES PARA VER DOCUMENTOS
// ============================================

function viewFacturaDoc(facturaIdOrArchivo, tipo) {
    if (typeof facturaIdOrArchivo === 'number') {
        fetchAndViewFactura(facturaIdOrArchivo, tipo || 'documento');
    } else if (facturaIdOrArchivo) {
        openPDFViewer(facturaIdOrArchivo);
    }
}

function viewDocumento(docIdOrArchivo) {
    if (typeof docIdOrArchivo === 'number') {
        fetchAndViewDocProveedor(docIdOrArchivo);
    } else if (docIdOrArchivo) {
        openPDFViewer(docIdOrArchivo);
    }
}

// ============================================
// NAVEGACIÓN Y VISTAS
// ============================================

function showProveedoresView(view) {
    document.getElementById('proveedoresSubMenu').classList.remove('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('proveedoresPage').classList.add('active');
    
    document.getElementById('proveedoresListView').classList.add('hidden');
    document.getElementById('proveedoresFacturasPagadasView').classList.add('hidden');
    document.getElementById('proveedoresFacturasPorPagarView').classList.add('hidden');
    
    currentSubContext = 'proveedores-' + view;
    
    document.getElementById('btnRegresa').classList.remove('hidden');
    
    if (view === 'list') {
        document.getElementById('btnSearch').classList.remove('hidden');
        currentSearchContext = 'proveedores';
    } else {
        document.getElementById('btnSearch').classList.add('hidden');
        currentSearchContext = null;
    }
    
    document.getElementById('contentArea').classList.remove('with-submenu');
    document.getElementById('menuSidebar').classList.add('hidden');
    document.getElementById('contentArea').classList.add('fullwidth');
    
    if (view === 'list') {
        document.getElementById('proveedoresListView').classList.remove('hidden');
        renderProveedoresTable();
    } else if (view === 'facturasPagadas') {
        document.getElementById('proveedoresFacturasPagadasView').classList.remove('hidden');
        renderProveedoresFacturasPagadas();
    } else if (view === 'facturasPorPagar') {
        document.getElementById('proveedoresFacturasPorPagarView').classList.remove('hidden');
        renderProveedoresFacturasPorPagar();
    }
}

// ============================================
// RENDERIZADO DE TABLAS
// ============================================

function renderProveedoresTable() {
    const tbody = document.getElementById('proveedoresTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    proveedores.forEach(prov => {
        const primerContacto = prov.contactos && prov.contactos.length > 0 ? prov.contactos[0] : {};
        const row = tbody.insertRow();
        
        const telLink = primerContacto.telefono 
            ? `<a href="tel:${primerContacto.telefono}" style="color:var(--primary);text-decoration:none;" onclick="event.stopPropagation();">${primerContacto.telefono}</a>` 
            : '-';
        const emailLink = primerContacto.email 
            ? `<a href="mailto:${primerContacto.email}" style="color:var(--primary);text-decoration:none;" onclick="event.stopPropagation();">${primerContacto.email}</a>` 
            : '-';
        
        row.innerHTML = `
            <td>${prov.nombre}</td>
            <td>${prov.servicio || '-'}</td>
            <td>${primerContacto.nombre || '-'}</td>
            <td>${telLink}</td>
            <td>${emailLink}</td>
        `;
        row.style.cursor = 'pointer';
        row.onclick = () => showProveedorDetail(prov.id);
    });
    
    if (proveedores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light)">No hay proveedores</td></tr>';
    }
}

function filtrarProveedores(query) {
    const tbody = document.getElementById('proveedoresTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    const filtrados = proveedores.filter(prov => 
        prov.nombre.toLowerCase().includes(query) || 
        (prov.servicio || '').toLowerCase().includes(query) ||
        (prov.contactos || []).some(c => (c.nombre || '').toLowerCase().includes(query))
    );
    
    filtrados.forEach(prov => {
        const row = tbody.insertRow();
        const primerContacto = prov.contactos && prov.contactos.length > 0 ? prov.contactos[0] : {};
        
        const telLink = primerContacto.telefono 
            ? `<a href="tel:${primerContacto.telefono}" style="color:var(--primary);text-decoration:none;" onclick="event.stopPropagation();">${primerContacto.telefono}</a>` 
            : '-';
        const emailLink = primerContacto.email 
            ? `<a href="mailto:${primerContacto.email}" style="color:var(--primary);text-decoration:none;" onclick="event.stopPropagation();">${primerContacto.email}</a>` 
            : '-';
        
        row.innerHTML = `
            <td>${prov.nombre}</td>
            <td>${prov.servicio || '-'}</td>
            <td>${primerContacto.nombre || '-'}</td>
            <td>${telLink}</td>
            <td>${emailLink}</td>
        `;
        row.style.cursor = 'pointer';
        row.onclick = () => showProveedorDetail(prov.id);
    });
    
    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:2rem">No se encontraron proveedores</td></tr>';
    }
}

function renderProveedoresFacturasPagadas() {
    const tbody = document.getElementById('proveedoresFacturasPagadasTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    const filterType = document.getElementById('provFactPagFilter').value;
    const year = parseInt(document.getElementById('provFactPagYear').value);
    const monthSelect = document.getElementById('provFactPagMonth');
    const searchInput = document.getElementById('provFactPagSearch');
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    if (filterType === 'mensual') {
        monthSelect.classList.remove('hidden');
    } else {
        monthSelect.classList.add('hidden');
    }
    
    const month = filterType === 'mensual' ? parseInt(monthSelect.value) : null;
    const pagadas = [];
    let totalPagadas = 0;
    
    proveedores.forEach(prov => {
        // Filtrar por nombre de proveedor si hay búsqueda
        if (searchQuery && !prov.nombre.toLowerCase().includes(searchQuery)) return;
        
        if (prov.facturas) {
            prov.facturas.forEach(f => {
                if (f.fecha_pago) {
                    const pd = new Date(f.fecha_pago + 'T00:00:00');
                    if (pd.getFullYear() === year && (month === null || pd.getMonth() === month)) {
                        pagadas.push({
                            proveedor: prov.nombre,
                            proveedorId: prov.id,
                            facturaId: f.id,
                            numero: f.numero || 'S/N',
                            monto: f.monto,
                            fecha: f.fecha_pago,
                            has_documento: f.has_documento,
                            has_pago: f.has_pago
                        });
                        totalPagadas += f.monto;
                    }
                }
            });
        }
    });
    
    pagadas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    pagadas.forEach(f => {
        const row = tbody.insertRow();
        
        // Icono 📄 clickeable si hay PDF
        const docIcon = f.has_documento 
            ? `<span onclick="event.stopPropagation(); viewFacturaDoc(${f.facturaId}, 'documento')" title="Ver factura PDF" style="cursor:pointer; margin-right:0.3rem; font-size:0.9rem;">📄</span>`
            : '';
        const pagoIcon = f.has_pago
            ? `<span onclick="event.stopPropagation(); viewFacturaDoc(${f.facturaId}, 'pago')" title="Ver comprobante PDF" style="cursor:pointer; margin-right:0.3rem; font-size:0.9rem;">📄</span>`
            : '';
        
        row.innerHTML = `
            <td>${f.proveedor}</td>
            <td>${docIcon}<strong>${f.numero}</strong></td>
            <td>${pagoIcon}${formatDate(f.fecha)}</td>
            <td class="currency">${formatCurrency(f.monto)}</td>
        `;
    });
    
    if (pagadas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light)">No hay facturas pagadas</td></tr>';
    } else {
        const row = tbody.insertRow();
        row.className = 'total-row';
        row.innerHTML = `<td colspan="3" style="text-align:right;padding:1rem"><strong>TOTAL:</strong></td><td class="currency"><strong>${formatCurrency(totalPagadas)}</strong></td>`;
    }
}

// ============================================
// STANDALONE: FACTURAS POR PAGAR (con botones de acción)
// ============================================

function renderProveedoresFacturasPorPagar() {
    const tbody = document.getElementById('proveedoresFacturasPorPagarTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    const filterType = document.getElementById('provFactPorPagFilter').value;
    const year = parseInt(document.getElementById('provFactPorPagYear').value);
    const monthSelect = document.getElementById('provFactPorPagMonth');
    
    if (filterType === 'mensual') {
        monthSelect.classList.remove('hidden');
    } else {
        monthSelect.classList.add('hidden');
    }
    
    const month = filterType === 'mensual' ? parseInt(monthSelect.value) : null;
    const porPagar = [];
    let totalPorPagar = 0;
    
    proveedores.forEach(prov => {
        if (prov.facturas) {
            prov.facturas.forEach(f => {
                if (!f.fecha_pago) {
                    const vd = new Date(f.vencimiento + 'T00:00:00');
                    if (vd.getFullYear() === year && (month === null || month === vd.getMonth())) {
                        porPagar.push({
                            provId: prov.id,
                            factId: f.id,
                            proveedor: prov.nombre,
                            numero: f.numero || 'S/N',
                            monto: f.monto,
                            vencimiento: f.vencimiento,
                            has_documento: f.has_documento
                        });
                        totalPorPagar += f.monto;
                    }
                }
            });
        }
    });
    
    porPagar.sort((a, b) => new Date(a.vencimiento) - new Date(b.vencimiento));
    porPagar.forEach(f => {
        const row = tbody.insertRow();
        const escapedNum = (f.numero).replace(/'/g, "\\'");
        row.innerHTML = `
            <td>${f.proveedor}</td>
            <td>${f.numero}</td>
            <td class="currency">${formatCurrency(f.monto)}</td>
            <td>${formatDateVencimiento(f.vencimiento)}</td>
            <td style="white-space:nowrap;" onclick="event.stopPropagation()">
                <span onclick="currentProveedorId=${f.provId}; window.facturaActionContext='standalone-porpagar'; showEditFacturaModal(${f.factId})" title="Modificar factura" style="cursor:pointer; font-size:1rem; padding:0.15rem 0.3rem; border-radius:4px;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'">✏️</span>
                <span onclick="currentProveedorId=${f.provId}; window.facturaActionContext='standalone-porpagar'; showPagarFacturaModal(${f.factId})" title="Dar factura x pagada" style="cursor:pointer; font-size:1.1rem; padding:0.15rem 0.3rem; border-radius:4px;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'">🏦</span>
                <span onclick="window.facturaActionContext='standalone-porpagar'; deleteFacturaConConfirm(${f.factId}, '${escapedNum}')" title="Eliminar factura" style="cursor:pointer; color:var(--danger); font-size:1.1rem; font-weight:700; padding:0.15rem 0.3rem; border-radius:4px;" onmouseover="this.style.background='#fed7d7'" onmouseout="this.style.background='transparent'">✕</span>
            </td>
        `;
        
        row.style.cursor = 'pointer';
        if (f.has_documento) {
            row.title = 'Ver PDF';
            row.onclick = () => viewFacturaDoc(f.factId, 'documento');
        }
    });
    
    if (porPagar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light)">No hay facturas por pagar</td></tr>';
    } else {
        const row = tbody.insertRow();
        row.className = 'total-row';
        row.innerHTML = `<td colspan="2" style="text-align:right;padding:1rem"><strong>TOTAL:</strong></td><td class="currency"><strong>${formatCurrency(totalPorPagar)}</strong></td><td colspan="2"></td>`;
    }
}

// ============================================
// MODAL DE DETALLE (diseño restaurado sesiones 3-6)
// ============================================

function showProveedorDetail(id) {
    const prov = proveedores.find(p => p.id === id);
    if (!prov) {
        alert('ERROR: Proveedor no encontrado');
        return;
    }
    
    currentProveedorId = id;
    
    // ── Nombre con auto-size ──
    const nombreEl = document.getElementById('proveedorDetailNombre');
    nombreEl.textContent = prov.nombre;
    nombreEl.classList.remove('nombre-largo');
    if (prov.nombre.length > 30) {
        nombreEl.classList.add('nombre-largo');
    }
    
    document.getElementById('proveedorDetailServicio').textContent = prov.servicio || '';
    
    // ── Teléfono y Email (recuadros sombreados) ──
    const primaryDiv = document.getElementById('provDetailContactPrimary');
    const first = (prov.contactos && prov.contactos.length > 0) ? prov.contactos[0] : {};
    
    const telDisplay = first.telefono || '-';
    const emailDisplay = first.email || '-';
    const emailLink = first.email 
        ? `<a href="mailto:${first.email}">${first.email}</a>` 
        : '-';
    
    primaryDiv.innerHTML = `
        <div class="prov-info-box">📞 ${telDisplay}</div>
        <div class="prov-info-box">✉️ ${emailLink}</div>
    `;
    
    // ── RFC y CLABE ──
    document.getElementById('detailProvClabe').textContent = prov.clabe || '-';
    document.getElementById('detailProvRFC').textContent = prov.rfc || '-';
    
    // ── Contactos adicionales (dropdown colapsable) ──
    const additionalDiv = document.getElementById('provDetailAdditionalContacts');
    
    if (prov.contactos && prov.contactos.length > 1) {
        const extras = prov.contactos.slice(1);
        const contactCards = extras.map(c => {
            const cEmail = c.email ? `<a href="mailto:${c.email}" style="color:var(--primary);text-decoration:none;">${c.email}</a>` : '-';
            return `
                <div class="contact-card">
                    <strong>${c.nombre}</strong><br>
                    <small>📞 ${c.telefono || '-'} &nbsp;|&nbsp; ✉️ ${cEmail}</small>
                </div>
            `;
        }).join('');
        
        additionalDiv.innerHTML = `
            <div class="prov-contacts-toggle" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('open');">
                <span>👥 ${extras.length} contacto${extras.length > 1 ? 's' : ''} adicional${extras.length > 1 ? 'es' : ''}</span>
                <span class="chevron">▼</span>
            </div>
            <div class="prov-contacts-list">
                ${contactCards}
            </div>
        `;
    } else {
        additionalDiv.innerHTML = '';
    }
    
    // Notas
    const notasDiv = document.getElementById('proveedorNotasContent');
    if (notasDiv) {
        notasDiv.textContent = prov.notas || 'Sin notas';
    }
    
    // ── Pestaña: Facturas Pagadas (tabla 3 columnas con encabezado sticky) ──
    const facturasPagadasDiv = document.getElementById('facturasPagadas');
    const facturasPagadas = prov.facturas.filter(f => f.fecha_pago);
    let totalPagadas = 0;
    
    if (facturasPagadas.length > 0) {
        const rows = facturasPagadas.map(f => {
            totalPagadas += f.monto;
            
            // Icono 📄 clickeable si hay PDF, gris si no hay
            const docIcon = f.has_documento 
                ? `<span onclick="fetchAndViewFactura(${f.id}, 'documento')" title="Ver factura PDF" style="cursor:pointer; margin-right:0.35rem; font-size:0.9rem;">📄</span>`
                : '';
            const pagoIcon = f.has_pago
                ? `<span onclick="fetchAndViewFactura(${f.id}, 'pago')" title="Ver comprobante PDF" style="cursor:pointer; margin-right:0.35rem; font-size:0.9rem;">📄</span>`
                : '';
            
            return `<tr>
                <td style="padding:0.4rem 0.5rem;">${docIcon}<strong>${f.numero || 'S/N'}</strong> del ${formatDate(f.fecha)}</td>
                <td style="padding:0.4rem 0.5rem;">${pagoIcon}${formatDate(f.fecha_pago)}</td>
                <td class="currency" style="padding:0.4rem 0.5rem;">${formatCurrency(f.monto)}</td>
            </tr>`;
        }).join('');
        
        facturasPagadasDiv.innerHTML = `
            <table style="width:100%; border-collapse:collapse;">
                <thead><tr style="background:var(--bg); position:sticky; top:0; z-index:1;">
                    <th style="text-align:left; padding:0.5rem; border-bottom:2px solid var(--border); font-size:0.85rem;">Factura No. y Fecha</th>
                    <th style="text-align:left; padding:0.5rem; border-bottom:2px solid var(--border); font-size:0.85rem;">Pagada en</th>
                    <th style="text-align:right; padding:0.5rem; border-bottom:2px solid var(--border); font-size:0.85rem;">Monto</th>
                </tr></thead>
                <tbody>${rows}
                <tr style="background:#e6f2ff;"><td colspan="2" style="text-align:right;padding:0.5rem;"><strong>TOTAL:</strong></td><td class="currency"><strong>${formatCurrency(totalPagadas)}</strong></td></tr>
                </tbody>
            </table>`;
    } else {
        facturasPagadasDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:2rem">No hay facturas pagadas</p>';
    }
    
    // ── Pestaña: Facturas Por Pagar (iconos 🏦 y ✕) ──
    const facturasPorPagarDiv = document.getElementById('facturasPorPagar');
    const facturasPorPagar = prov.facturas.filter(f => !f.fecha_pago);
    let totalPorPagar = 0;
    
    if (facturasPorPagar.length > 0) {
        facturasPorPagarDiv.innerHTML = facturasPorPagar.map(f => {
            totalPorPagar += f.monto;
            const clickPDF = f.has_documento ? `onclick="fetchAndViewFactura(${f.id}, 'documento')" title="Ver PDF"` : '';
            const cursorPDF = f.has_documento ? 'cursor:pointer;' : '';
            const escapedNumero = (f.numero || 'S/N').replace(/'/g, "\\'");
            
            return `
                <div style="border:1px solid var(--border); border-radius:6px; padding:0; margin-bottom:0.5rem; background:white; position:relative;">
                    <div style="position:absolute; top:0.5rem; right:0.5rem; display:flex; gap:0.25rem; z-index:2;">
                        <span onclick="event.stopPropagation(); showEditFacturaModal(${f.id})" title="Modificar factura" style="cursor:pointer; font-size:1rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'">✏️</span>
                        <span onclick="event.stopPropagation(); showPagarFacturaModal(${f.id})" title="Dar factura x pagada" style="cursor:pointer; font-size:1.1rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'">🏦</span>
                        <span onclick="event.stopPropagation(); deleteFacturaConConfirm(${f.id}, '${escapedNumero}')" title="Eliminar factura" style="cursor:pointer; color:var(--danger); font-size:1.1rem; font-weight:700; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#fed7d7'" onmouseout="this.style.background='transparent'">✕</span>
                    </div>
                    <div style="display:flex; align-items:stretch;">
                        <div ${clickPDF} style="flex:1; background:var(--bg); border-radius:6px 0 0 6px; padding:0.75rem; ${cursorPDF} transition:background 0.2s;" onmouseover="if(this.getAttribute('onclick'))this.style.background='#dbeafe'" onmouseout="this.style.background='var(--bg)'">
                            <div><strong>Factura ${f.numero || 'S/N'}</strong> del ${formatDate(f.fecha)}</div>
                            <div style="margin-top:0.25rem; color:var(--text-light);">A ser pagada el <strong>${formatDate(f.vencimiento)}</strong></div>
                        </div>
                        <div style="display:flex; align-items:flex-end; padding:0.75rem; min-width:120px; justify-content:flex-end;">
                            <span style="font-weight:700; color:var(--primary); font-size:1.05rem;">${formatCurrency(f.monto)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('') + `<div style="text-align:right;padding:1rem;background:#e6f2ff;font-weight:bold;margin-top:1rem">TOTAL: <strong>${formatCurrency(totalPorPagar)}</strong></div>`;
    } else {
        facturasPorPagarDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:2rem">No hay facturas por pagar</p>';
    }
    
    // ── Pestaña: Documentos Adicionales (con ✏️ y ✕) ──
    const docsDiv = document.getElementById('proveedorDocumentosAdicionales');
    if (prov.documentos && prov.documentos.length > 0) {
        const escapedDocs = prov.documentos.map(d => {
            const escapedNombre = (d.nombre || '').replace(/'/g, "\\'");
            return `
                <tr class="doc-item">
                    <td onclick="fetchAndViewDocProveedor(${d.id})" title="Ver PDF" style="cursor:pointer; word-wrap:break-word">${d.nombre}</td>
                    <td onclick="fetchAndViewDocProveedor(${d.id})" title="Ver PDF" style="cursor:pointer;">${formatDate(d.fecha)}</td>
                    <td onclick="fetchAndViewDocProveedor(${d.id})" title="Ver PDF" style="cursor:pointer;">${d.usuario}</td>
                    <td style="width:60px; text-align:center; white-space:nowrap;">
                        <span onclick="event.stopPropagation(); replaceProveedorDoc(${d.id})" title="Cambiar PDF" style="cursor:pointer; font-size:1rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'">✏️</span>
                        <span onclick="event.stopPropagation(); deleteProveedorDocConConfirm(${d.id}, '${escapedNombre}')" title="Eliminar documento" style="cursor:pointer; color:var(--danger); font-weight:700; font-size:1.1rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#fed7d7'" onmouseout="this.style.background='transparent'">✕</span>
                    </td>
                </tr>
            `;
        }).join('');
        docsDiv.innerHTML = '<table style="width:100%;table-layout:fixed"><thead><tr><th style="width:38%">Nombre</th><th style="width:20%">Fecha</th><th style="width:20%">Usuario</th><th style="width:60px"></th></tr></thead><tbody>' + escapedDocs + '</tbody></table>';
    } else {
        docsDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:2rem">No hay documentos adicionales</p>';
    }
    
    // ── Altura fija con scroll: header y pestañas no se mueven ──
    const tabHeight = '260px';
    ['proveedorPagadasTab','proveedorPorPagarTab','proveedorDocsTab','proveedorNotasTab'].forEach(id => {
        const el = document.getElementById(id);
        el.style.minHeight = tabHeight;
        el.style.maxHeight = tabHeight;
        el.style.overflowY = 'auto';
    });
    
    // ── Abrir modal y activar primera pestaña ──
    document.getElementById('proveedorDetailModal').classList.add('active');
    switchTab('proveedor', 'pagadas');
}

// ============================================
// DELETE FACTURA WITH CUSTOM CONFIRM
// ============================================

function deleteFacturaConConfirm(facturaId, numeroFactura) {
    if (confirm('¿Seguro quiere eliminar la factura ' + numeroFactura + '?')) {
        deleteFactura(facturaId);
    }
}

// ============================================
// DOCUMENTOS ADICIONALES PROVEEDOR
// ============================================

function showAgregarDocumentoProveedorModal() {
    document.getElementById('provNuevoDocNombre').value = '';
    document.getElementById('provNuevoDocPDF').value = '';
    const fileName = document.getElementById('provNuevoDocPDFFileName');
    if (fileName) fileName.textContent = '';
    document.getElementById('agregarDocumentoProveedorModal').classList.add('active');
}

async function saveDocumentoProveedor(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const nombre = document.getElementById('provNuevoDocNombre').value;
        const file = document.getElementById('provNuevoDocPDF').files[0];
        
        if (!file) {
            throw new Error('Seleccione un archivo PDF');
        }
        
        const pdfBase64 = await fileToBase64(file);
        
        const { error } = await supabaseClient
            .from('proveedores_documentos')
            .insert([{
                proveedor_id: currentProveedorId,
                nombre_documento: nombre,
                archivo_pdf: pdfBase64,
                fecha_guardado: new Date().toISOString().split('T')[0],
                usuario_guardo: currentUser.nombre
            }]);
        
        if (error) throw error;
        
        await loadProveedores();
        closeModal('agregarDocumentoProveedorModal');
        showProveedorDetail(currentProveedorId);
        setTimeout(() => switchTab('proveedor', 'docs'), 100);
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al guardar documento: ' + error.message);
    } finally {
        hideLoading();
    }
}

function deleteProveedorDocConConfirm(docId, nombreDoc) {
    if (confirm('¿Seguro quiere eliminar el documento ' + nombreDoc + '?')) {
        deleteProveedorDocumento(docId);
    }
}

async function deleteProveedorDocumento(docId) {
    showLoading();
    try {
        const { error } = await supabaseClient
            .from('proveedores_documentos')
            .delete()
            .eq('id', docId);
        
        if (error) throw error;
        
        await loadProveedores();
        showProveedorDetail(currentProveedorId);
        setTimeout(() => switchTab('proveedor', 'docs'), 100);
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al eliminar documento: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// NOTAS PROVEEDOR
// ============================================

function showEditNotasProveedorModal() {
    const prov = proveedores.find(p => p.id === currentProveedorId);
    if (prov) {
        document.getElementById('proveedorNotasEdit').value = prov.notas || '';
    }
    document.getElementById('editNotasProveedorModal').classList.add('active');
}

async function saveNotasProveedor() {
    showLoading();
    try {
        const notas = document.getElementById('proveedorNotasEdit').value;
        
        const { error } = await supabaseClient
            .from('proveedores')
            .update({ notas: notas })
            .eq('id', currentProveedorId);
        
        if (error) throw error;
        
        await loadProveedores();
        closeModal('editNotasProveedorModal');
        showProveedorDetail(currentProveedorId);
        setTimeout(() => switchTab('proveedor', 'notas'), 100);
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al guardar notas: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// REEMPLAZAR PDF DE DOCUMENTO
// ============================================

function replaceProveedorDoc(docId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async function() {
        if (!this.files[0]) return;
        showLoading();
        try {
            const pdfBase64 = await fileToBase64(this.files[0]);
            const { error } = await supabaseClient
                .from('proveedores_documentos')
                .update({
                    archivo_pdf: pdfBase64,
                    fecha_guardado: new Date().toISOString().split('T')[0],
                    usuario_guardo: currentUser.nombre
                })
                .eq('id', docId);
            
            if (error) throw error;
            
            await loadProveedores();
            showProveedorDetail(currentProveedorId);
            setTimeout(() => switchTab('proveedor', 'docs'), 100);
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error al reemplazar PDF: ' + error.message);
        } finally {
            hideLoading();
        }
    };
    input.click();
}

// ============================================
// EXPORTAR PROVEEDORES A EXCEL
// ============================================

function exportProveedoresToExcel() {
    if (!proveedores || proveedores.length === 0) {
        alert('No hay proveedores para exportar');
        return;
    }
    
    const data = proveedores.map(prov => {
        const first = (prov.contactos && prov.contactos.length > 0) ? prov.contactos[0] : {};
        return {
            'Proveedor': prov.nombre,
            'Servicio': prov.servicio || '',
            'Contacto': first.nombre || '',
            'Teléfono': first.telefono || '',
            'Email': first.email || '',
            'RFC': prov.rfc || '',
            'CLABE': prov.clabe || '',
            'Notas': prov.notas || ''
        };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
    XLSX.writeFile(wb, `Proveedores_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ============================================
// EXPORTAR FACTURAS PAGADAS A EXCEL
// ============================================

function exportFacturasPagadasToExcel() {
    const rows = [];
    proveedores.forEach(prov => {
        if (prov.facturas) {
            prov.facturas.forEach(f => {
                if (f.fecha_pago) {
                    rows.push({
                        'Proveedor': prov.nombre,
                        'No. Factura': f.numero || 'S/N',
                        'Fecha Factura': f.fecha,
                        'Pagada en': f.fecha_pago,
                        'Monto': f.monto,
                        'IVA': f.iva || 0
                    });
                }
            });
        }
    });
    
    if (rows.length === 0) { alert('No hay facturas pagadas para exportar'); return; }
    rows.sort((a, b) => new Date(b['Pagada en']) - new Date(a['Pagada en']));
    
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas Pagadas');
    XLSX.writeFile(wb, `Facturas_Pagadas_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ============================================
// EXPORTAR FACTURAS POR PAGAR A EXCEL
// ============================================

function exportFacturasPorPagarToExcel() {
    const rows = [];
    proveedores.forEach(prov => {
        if (prov.facturas) {
            prov.facturas.forEach(f => {
                if (!f.fecha_pago) {
                    rows.push({
                        'Proveedor': prov.nombre,
                        'No. Factura': f.numero || 'S/N',
                        'Fecha Factura': f.fecha,
                        'Vencimiento': f.vencimiento,
                        'Monto': f.monto,
                        'IVA': f.iva || 0
                    });
                }
            });
        }
    });
    
    if (rows.length === 0) { alert('No hay facturas por pagar para exportar'); return; }
    rows.sort((a, b) => new Date(a['Vencimiento']) - new Date(b['Vencimiento']));
    
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas Por Pagar');
    XLSX.writeFile(wb, `Facturas_Por_Pagar_${new Date().toISOString().split('T')[0]}.xlsx`);
}

console.log('✅ PROVEEDORES-UI.JS cargado (2026-02-12 20:00 CST)');
