/* ========================================
   PROVEEDORES-UI.JS v2
   ======================================== */

// ============================================
// FUNCIONES AUXILIARES PARA VER DOCUMENTOS
// ============================================

function viewFacturaDoc(facturaId, tipo) {
    // Check if factura has Drive file ID in memory
    for (var p = 0; p < proveedores.length; p++) {
        var facs = proveedores[p].facturas || [];
        for (var i = 0; i < facs.length; i++) {
            if (facs[i].id === facturaId) {
                var driveId = (tipo === 'pago') ? facs[i].pago_drive_file_id : facs[i].documento_drive_file_id;
                if (driveId) {
                    viewDriveFileInline(driveId, (tipo === 'pago' ? 'Comprobante Pago' : 'Factura'));
                    return;
                }
            }
        }
    }
    // Fallback to base64 fetch
    fetchAndViewFactura(facturaId, tipo || 'documento');
}

function viewDocumento(docId) {
    // Check if doc has Drive file ID in memory
    for (var p = 0; p < proveedores.length; p++) {
        var docs = proveedores[p].documentos || [];
        for (var i = 0; i < docs.length; i++) {
            if (docs[i].id === docId) {
                if (docs[i].google_drive_file_id) {
                    var safeName = (docs[i].nombre || 'Documento').replace(/'/g, "\\'");
                    viewDriveFileInline(docs[i].google_drive_file_id, safeName);
                    return;
                }
            }
        }
    }
    // Fallback to base64 fetch
    fetchAndViewDocProveedor(docId);
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
        
        var shortName = f.proveedor.length > 50 ? f.proveedor.substring(0, 47) + '...' : f.proveedor;
        row.innerHTML = `
            <td style="max-width:180px; word-break:break-word;" title="${f.proveedor}">${shortName}</td>
            <td style="white-space:nowrap; text-align:right; padding-right:0.2rem;">${docIcon}<strong>${f.numero}</strong></td>
            <td style="white-space:nowrap;">${pagoIcon}${formatDate(f.fecha)}</td>
            <td class="currency" style="white-space:nowrap;">${formatCurrency(f.monto)}</td>
        `;
        row.style.cursor = 'pointer';
        row.onclick = (() => {
            var pid = f.proveedorId;
            return () => {
                currentProveedorId = pid;
                window.facturaActionContext = 'standalone-pagadas';
                showProveedorDetail(pid);
            };
        })();
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
        row.onclick = ((provId) => {
            return () => {
                currentProveedorId = provId;
                window.facturaActionContext = 'standalone-porpagar';
                showProveedorDetail(provId);
            };
        })(f.provId);
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
        var isNivel1 = currentUser && currentUser.nivel === 1;
        const rows = facturasPagadas.map(f => {
            totalPagadas += f.monto;
            
            // Icono 📄 clickeable si hay PDF, 📎 para vincular si nivel 1
            var docIcon = '';
            if (f.has_documento) {
                docIcon = `<span onclick="event.stopPropagation(); viewFacturaDoc(${f.id}, 'documento')" title="Ver factura PDF" style="cursor:pointer; margin-right:0.35rem; font-size:0.9rem;">📄</span>`;
            } else if (isNivel1) {
                docIcon = `<span onclick="event.stopPropagation(); showLinkFacturaFileModal(${f.id}, 'documento')" title="Vincular factura PDF" style="cursor:pointer; margin-right:0.35rem; font-size:0.9rem; opacity:0.5;">📎</span>`;
            }
            
            var pagoIcon = '';
            if (f.has_pago) {
                pagoIcon = `<span onclick="event.stopPropagation(); viewFacturaDoc(${f.id}, 'pago')" title="Ver comprobante PDF" style="cursor:pointer; margin-right:0.35rem; font-size:0.9rem;">📄</span>`;
            } else if (isNivel1) {
                pagoIcon = `<span onclick="event.stopPropagation(); showLinkFacturaFileModal(${f.id}, 'pago')" title="Vincular pago PDF" style="cursor:pointer; margin-right:0.35rem; font-size:0.9rem; opacity:0.5;">📎</span>`;
            }
            
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
        var isNivel1pp = currentUser && currentUser.nivel === 1;
        facturasPorPagarDiv.innerHTML = facturasPorPagar.map(f => {
            totalPorPagar += f.monto;
            var clickPDF = '';
            var cursorPDF = '';
            if (f.has_documento) {
                clickPDF = `onclick="viewFacturaDoc(${f.id}, 'documento')" title="Ver PDF"`;
                cursorPDF = 'cursor:pointer;';
            }
            var linkIcon = '';
            if (!f.has_documento && isNivel1pp) {
                linkIcon = `<span onclick="event.stopPropagation(); showLinkFacturaFileModal(${f.id}, 'documento')" title="Vincular factura PDF" style="cursor:pointer; font-size:0.9rem; opacity:0.5; margin-right:0.3rem;">📎</span>`;
            }
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
                            <div><strong>${linkIcon}Factura ${f.numero || 'S/N'}</strong> del ${formatDate(f.fecha)}</div>
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
        
        var docData = {
            proveedor_id: currentProveedorId,
            nombre_documento: nombre,
            fecha_guardado: new Date().toISOString().split('T')[0],
            usuario_guardo: currentUser ? currentUser.nombre : 'Sistema'
        };
        
        if (typeof isGoogleConnected === 'function' && isGoogleConnected()) {
            var prov = proveedores.find(p => p.id === currentProveedorId);
            if (prov) {
                try {
                    var folderId = prov.google_drive_folder_id;
                    if (!folderId) {
                        folderId = await getOrCreateProveedorFolder(prov.nombre);
                        await supabaseClient.from('proveedores')
                            .update({ google_drive_folder_id: folderId })
                            .eq('id', currentProveedorId);
                    }
                    var result = await uploadFileToDrive(file, folderId);
                    docData.google_drive_file_id = result.id;
                    docData.archivo_pdf = '';
                } catch (e) {
                    console.error('⚠️ Drive upload failed, using base64');
                    docData.archivo_pdf = await fileToBase64(file);
                }
            }
        } else {
            docData.archivo_pdf = await fileToBase64(file);
        }
        
        const { error } = await supabaseClient
            .from('proveedores_documentos')
            .insert([docData]);
        
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
            var updateData = {
                fecha_guardado: new Date().toISOString().split('T')[0],
                usuario_guardo: currentUser ? currentUser.nombre : 'Sistema'
            };
            
            if (typeof isGoogleConnected === 'function' && isGoogleConnected()) {
                var prov = proveedores.find(p => p.id === currentProveedorId);
                if (prov) {
                    var folderId = prov.google_drive_folder_id;
                    if (!folderId) {
                        folderId = await getOrCreateProveedorFolder(prov.nombre);
                        await supabaseClient.from('proveedores')
                            .update({ google_drive_folder_id: folderId })
                            .eq('id', currentProveedorId);
                    }
                    var result = await uploadFileToDrive(this.files[0], folderId);
                    updateData.google_drive_file_id = result.id;
                    updateData.archivo_pdf = '';
                }
            } else {
                updateData.archivo_pdf = await fileToBase64(this.files[0]);
            }
            
            const { error } = await supabaseClient
                .from('proveedores_documentos')
                .update(updateData)
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

// ============================================
// VINCULAR PDF A FACTURA (navegar Drive del mes)
// ============================================

var linkFacturaId = null;
var linkFacturaTipo = null;
var linkNavStack = [];

async function showLinkFacturaFileModal(facturaId, tipo) {
    linkFacturaId = facturaId;
    linkFacturaTipo = tipo;
    linkNavStack = [];
    
    // Ensure Drive is connected
    if (!isGoogleConnected()) {
        googleSignIn();
        alert('Conéctate a Google Drive primero, luego intenta de nuevo.');
        return;
    }
    
    var title = (tipo === 'pago') ? 'Vincular Comprobante de Pago' : 'Vincular Factura PDF';
    document.getElementById('linkFacturaFileTitle').textContent = title;
    document.getElementById('linkDriveContent').innerHTML = '<p style="text-align:center; padding:2rem; color:var(--text-light);">⏳ Buscando carpeta...</p>';
    document.getElementById('linkDriveBreadcrumb').innerHTML = '';
    document.getElementById('linkFacturaFileModal').style.display = 'flex';
    
    // Find factura date
    var factura = null;
    for (var p = 0; p < proveedores.length; p++) {
        var facs = proveedores[p].facturas || [];
        for (var i = 0; i < facs.length; i++) {
            if (facs[i].id === facturaId) { factura = facs[i]; break; }
        }
        if (factura) break;
    }
    
    if (!factura) {
        document.getElementById('linkDriveContent').innerHTML = '<p style="color:var(--danger); text-align:center; padding:2rem;">Factura no encontrada</p>';
        return;
    }
    
    // Determine which date and subfolder name to look for
    var dateStr = (tipo === 'pago') ? factura.fecha_pago : factura.fecha;
    var subfolderSearch = (tipo === 'pago') ? 'pago' : 'recibida';
    
    if (!dateStr) {
        document.getElementById('linkDriveContent').innerHTML = '<p style="color:var(--danger); text-align:center; padding:2rem;">La factura no tiene fecha de ' + (tipo === 'pago' ? 'pago' : 'emisión') + '</p>';
        return;
    }
    
    var d = new Date(dateStr);
    var anio = d.getFullYear();
    var mes = d.getMonth() + 1;
    
    // Find carpeta for this month
    var carpeta = contabilidadCarpetas.find(function(c) {
        return parseInt(c.anio) === anio && parseInt(c.mes) === mes;
    });
    
    if (!carpeta || !carpeta.google_drive_url) {
        document.getElementById('linkDriveContent').innerHTML = '<p style="color:var(--danger); text-align:center; padding:2rem;">No se encontró carpeta de contabilidad para ' + anio + '/' + mes + '</p>';
        return;
    }
    
    var monthFolderId = extractFolderId(carpeta.google_drive_url);
    if (!monthFolderId) {
        document.getElementById('linkDriveContent').innerHTML = '<p style="color:var(--danger); text-align:center; padding:2rem;">No se pudo obtener el folder ID del mes</p>';
        return;
    }
    
    try {
        // List month subfolders to find Facturas Recibidas or Pagos Proveedores
        var { folders } = await listDriveFolder(monthFolderId);
        var targetFolder = folders.find(function(f) {
            return f.name.toLowerCase().includes(subfolderSearch);
        });
        
        if (!targetFolder) {
            // If not found, show all month subfolders for user to navigate
            linkNavStack = [{ label: anio + '/' + mes, folderId: monthFolderId }];
            renderLinkBreadcrumb();
            await renderLinkDriveFolder(monthFolderId);
            return;
        }
        
        var mesesNombres = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        linkNavStack = [
            { label: mesesNombres[mes] + ' ' + anio, folderId: monthFolderId },
            { label: targetFolder.name, folderId: targetFolder.id }
        ];
        renderLinkBreadcrumb();
        await renderLinkDriveFolder(targetFolder.id);
        
    } catch (e) {
        document.getElementById('linkDriveContent').innerHTML = '<p style="color:var(--danger); text-align:center; padding:2rem;">Error: ' + e.message + '</p>';
    }
}

function closeLinkModal() {
    document.getElementById('linkFacturaFileModal').style.display = 'none';
}

async function linkNavOpenFolder(name, folderId) {
    linkNavStack.push({ label: name, folderId: folderId });
    renderLinkBreadcrumb();
    await renderLinkDriveFolder(folderId);
}

function linkNavGoTo(index) {
    linkNavStack = linkNavStack.slice(0, index + 1);
    renderLinkBreadcrumb();
    renderLinkDriveFolder(linkNavStack[index].folderId);
}

function renderLinkBreadcrumb() {
    var html = linkNavStack.map(function(item, i) {
        if (i < linkNavStack.length - 1) {
            return '<span onclick="linkNavGoTo(' + i + ')" style="cursor:pointer; color:var(--primary);">' + item.label + '</span>';
        }
        return '<strong>' + item.label + '</strong>';
    }).join(' › ');
    document.getElementById('linkDriveBreadcrumb').innerHTML = html;
}

async function renderLinkDriveFolder(folderId) {
    var contentDiv = document.getElementById('linkDriveContent');
    contentDiv.innerHTML = '<p style="text-align:center; padding:1rem; color:var(--text-light);">⏳</p>';
    
    try {
        var { folders, files } = await listDriveFolder(folderId);
        var html = '';
        
        folders.forEach(function(f) {
            html += '<div onclick="linkNavOpenFolder(\'' + f.name.replace(/'/g, "\\'") + '\', \'' + f.id + '\')" style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 0.6rem; cursor:pointer; border-bottom:1px solid #f0f0f0;" onmouseover="this.style.background=\'#f0f9ff\'" onmouseout="this.style.background=\'white\'">' +
                '<span style="font-size:1.2rem;">📁</span>' +
                '<span style="font-size:0.88rem; font-weight:500;">' + f.name + '</span></div>';
        });
        
        // Only PDFs selectable
        files.forEach(function(f, i) {
            var isPdf = f.name.toLowerCase().endsWith('.pdf');
            var bg = i % 2 === 0 ? 'white' : '#f7fafc';
            if (isPdf) {
                html += '<div onclick="selectLinkFile(\'' + f.id + '\', \'' + f.name.replace(/'/g, "\\'") + '\')" style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 0.6rem; cursor:pointer; border-bottom:1px solid #f0f0f0; background:' + bg + ';" onmouseover="this.style.background=\'#e6fffa\'" onmouseout="this.style.background=\'' + bg + '\'">' +
                    '<span style="font-size:1rem;">📄</span>' +
                    '<span style="font-size:0.83rem; flex:1; word-break:break-word;">' + f.name + '</span>' +
                    '<span style="font-size:0.7rem; color:var(--success); font-weight:600;">Seleccionar</span></div>';
            }
        });
        
        if (!html) {
            html = '<p style="text-align:center; padding:2rem; color:var(--text-light);">📭 No hay PDFs en esta carpeta</p>';
        }
        
        contentDiv.innerHTML = html;
    } catch (e) {
        contentDiv.innerHTML = '<p style="text-align:center; padding:1rem; color:var(--danger);">Error: ' + e.message + '</p>';
    }
}

async function selectLinkFile(fileId, fileName) {
    if (!confirm('¿Vincular "' + fileName + '"?')) return;
    
    showLoading();
    try {
        var column = (linkFacturaTipo === 'pago') ? 'pago_drive_file_id' : 'documento_drive_file_id';
        var updateData = {};
        updateData[column] = fileId;
        
        var { error } = await supabaseClient
            .from('facturas')
            .update(updateData)
            .eq('id', linkFacturaId);
        
        if (error) throw error;
        
        await loadProveedores();
        closeLinkModal();
        showProveedorDetail(currentProveedorId);
        
    } catch (e) {
        console.error('Error vinculando:', e);
        alert('❌ Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

console.log('✅ PROVEEDORES-UI.JS v21 cargado');
