/* ========================================
   INQUILINOS-UI.JS - Inquilinos Interface Functions
   Última actualización: 2026-02-12 20:30 CST
   ======================================== */

// ============================================
// INQUILINOS - VIEWS
// ============================================

// Estado de ordenamiento
var inquilinosSortColumn = null;
var inquilinosSortOrder = 'asc';

function showInquilinosView(view) {
    document.getElementById('inquilinosSubMenu').classList.remove('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('inquilinosPage').classList.add('active');
    
    document.getElementById('inquilinosListView').classList.add('hidden');
    document.getElementById('inquilinosRentasRecibidasView').classList.add('hidden');
    document.getElementById('inquilinosVencimientoContratosView').classList.add('hidden');
    
    currentSubContext = 'inquilinos-' + view;
    
    document.getElementById('btnRegresa').classList.remove('hidden');
    
    if (view === 'list') {
        document.getElementById('btnSearch').classList.remove('hidden');
        currentSearchContext = 'inquilinos';
    } else {
        document.getElementById('btnSearch').classList.add('hidden');
        currentSearchContext = null;
    }
    
    document.getElementById('contentArea').classList.remove('with-submenu');
    document.getElementById('menuSidebar').classList.add('hidden');
    document.getElementById('contentArea').classList.add('fullwidth');
    
    if (view === 'list') {
        document.getElementById('inquilinosListView').classList.remove('hidden');
        ensureInquilinosFullLoaded().then(() => renderInquilinosTable());
    } else if (view === 'rentasRecibidas') {
        document.getElementById('inquilinosRentasRecibidasView').classList.remove('hidden');
        ensureInquilinosFullLoaded().then(() => renderInquilinosRentasRecibidas());
    } else if (view === 'vencimientoContratos') {
        document.getElementById('inquilinosVencimientoContratosView').classList.remove('hidden');
        ensureInquilinosFullLoaded().then(() => renderInquilinosVencimientoContratos());
    }
}

// ============================================
// RENDER INQUILINOS TABLE
// ============================================

function renderInquilinosTable() {
    const tbody = document.getElementById('inquilinosTable').querySelector('tbody');
    
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--primary)">⏳ Cargando inquilinos...</td></tr>';
    
    setTimeout(() => {
        let sortedInquilinos = [...inquilinos];
        
        if (inquilinosSortColumn) {
            sortedInquilinos.sort((a, b) => {
                let valA, valB;
                
                if (inquilinosSortColumn === 'nombre') {
                    valA = a.nombre.toLowerCase();
                    valB = b.nombre.toLowerCase();
                    return inquilinosSortOrder === 'asc' 
                        ? valA.localeCompare(valB) 
                        : valB.localeCompare(valA);
                } else if (inquilinosSortColumn === 'renta') {
                    valA = parseFloat(a.renta) || 0;
                    valB = parseFloat(b.renta) || 0;
                    return inquilinosSortOrder === 'asc' 
                        ? valA - valB 
                        : valB - valA;
                } else if (inquilinosSortColumn === 'vencimiento') {
                    valA = new Date(a.fecha_vencimiento || '9999-12-31');
                    valB = new Date(b.fecha_vencimiento || '9999-12-31');
                    return inquilinosSortOrder === 'asc' 
                        ? valA - valB 
                        : valB - valA;
                }
                return 0;
            });
        }
        
        const rows = sortedInquilinos.map(inq => {
            const nombreCorto = inq.nombre.length > 25 ? inq.nombre.substring(0, 25) + '...' : inq.nombre;
            const inactivo = !inq.contrato_activo;
            const opacityStyle = inactivo ? 'color:#999;font-style:italic;' : '';
            const contacto = (inq.contactos && inq.contactos.length > 0) ? inq.contactos[0].nombre : '';
            
            return `
                <tr style="cursor:pointer;${opacityStyle}" onclick="showInquilinoDetail(${inq.id})">
                    <td style="font-size:0.9rem">${nombreCorto}</td>
                    <td style="font-size:0.85rem">${contacto}</td>
                    <td>${formatDateVencimiento(inq.fecha_vencimiento)}</td>
                    <td class="currency">${formatCurrency(inq.renta)}</td>
                </tr>
            `;
        }).join('');
        
        if (inquilinos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:2rem">No hay inquilinos</td></tr>';
        } else {
            tbody.innerHTML = rows;
        }
        
        // Actualizar headers de ordenamiento
        document.querySelectorAll('#inquilinosTable th').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
        });
        
        if (inquilinosSortColumn) {
            const columnMap = {
                'nombre': 0,
                'vencimiento': 2,
                'renta': 3
            };
            const thIndex = columnMap[inquilinosSortColumn];
            const th = document.querySelectorAll('#inquilinosTable th')[thIndex];
            if (th) {
                th.classList.add(inquilinosSortOrder === 'asc' ? 'sorted-asc' : 'sorted-desc');
            }
        }
    }, 100);
}

function sortInquilinos(column) {
    if (inquilinosSortColumn === column) {
        // Cambiar dirección
        inquilinosSortOrder = inquilinosSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        // Nueva columna
        inquilinosSortColumn = column;
        inquilinosSortOrder = 'asc';
    }
    
    renderInquilinosTable();
}
function filtrarInquilinos(query) {
    const tbody = document.getElementById('inquilinosTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    const filtrados = inquilinos.filter(inq => {
        const nombre = inq.nombre.toLowerCase();
        const contacto = (inq.contactos && inq.contactos.length > 0) ? inq.contactos[0].nombre.toLowerCase() : '';
        return nombre.includes(query) || contacto.includes(query);
    });
    
    filtrados.forEach(inq => {
        const nombreCorto = inq.nombre.length > 25 ? inq.nombre.substring(0, 25) + '...' : inq.nombre;
        const contacto = (inq.contactos && inq.contactos.length > 0) ? inq.contactos[0].nombre : '';
        tbody.innerHTML += `
            <tr style="cursor: pointer;" onclick="showInquilinoDetail(${inq.id})">
                <td style="font-size:0.9rem">${nombreCorto}</td>
                <td style="font-size:0.85rem">${contacto}</td>
                <td>${formatDateVencimiento(inq.fecha_vencimiento)}</td>
                <td class="currency">${formatCurrency(inq.renta)}</td>
            </tr>
        `;
    });
    
    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:2rem">No se encontraron resultados</td></tr>';
    }
}

// ============================================
// RENTAS RECIBIDAS
// ============================================

function renderInquilinosRentasRecibidas() {
    const tbody = document.getElementById('inquilinosRentasRecibidasTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    const filterType = document.getElementById('inquilinosRentasFilter').value;
    const year = parseInt(document.getElementById('inquilinosRentasYear').value);
    const monthSelect = document.getElementById('inquilinosRentasMonth');
    
    if (filterType === 'mensual') {
        monthSelect.classList.remove('hidden');
    } else {
        monthSelect.classList.add('hidden');
    }
    
    const month = filterType === 'mensual' ? parseInt(monthSelect.value) : null;
    const rentas = [];
    let totalPeriodo = 0;

    inquilinos.forEach(inq => {
        if (inq.pagos) {
            inq.pagos.forEach(pago => {
                const pd = new Date(pago.fecha + 'T00:00:00');
                if (pd.getFullYear() === year && (month === null || pd.getMonth() === month)) {
                    rentas.push({
                        empresa: inq.nombre,
                        monto: pago.monto,
                        fecha: pago.fecha,
                        inquilinoId: inq.id
                    });
                    totalPeriodo += pago.monto;
                }
            });
        }
    });
    
    rentas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    rentas.forEach(r => {
        tbody.innerHTML += `
            <tr class="clickable" style="cursor: pointer;" onclick="showInquilinoDetail(${r.inquilinoId})">
                <td>${r.empresa}</td>
                <td class="currency">${formatCurrency(r.monto)}</td>
                <td>${formatDate(r.fecha)}</td>
            </tr>
        `;
    });
    
    if (rentas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-light)">No hay rentas</td></tr>';
    } else {
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        if (filterType === 'mensual') {
            const row = tbody.insertRow();
            row.style.fontWeight = 'bold';
            row.style.backgroundColor = '#e6f2ff';
            row.innerHTML = `<td style="text-align:right;padding:1rem;font-size:1.1rem">TOTAL ${monthNames[month].toUpperCase()} ${year}:</td><td class="currency" style="color:var(--primary);font-size:1.2rem">${formatCurrency(totalPeriodo)}</td><td></td>`;
        }
        
        let totalAnual = 0;
        inquilinos.forEach(inq => {
            if (inq.pagos) {
                inq.pagos.forEach(pago => {
                    const pd = new Date(pago.fecha + 'T00:00:00');
                    if (pd.getFullYear() === year) {
                        totalAnual += pago.monto;
                    }
                });
            }
        });
        
        const rowAnual = tbody.insertRow();
        rowAnual.style.fontWeight = 'bold';
        rowAnual.style.backgroundColor = '#d4edda';
        rowAnual.innerHTML = `<td style="text-align:right;padding:1rem;font-size:1.1rem">TOTAL ${year}:</td><td class="currency" style="color:var(--success);font-size:1.2rem">${formatCurrency(totalAnual)}</td><td></td>`;
    }
}

// ============================================
// VENCIMIENTO CONTRATOS
// ============================================

function renderInquilinosVencimientoContratos() {
    const tbody = document.getElementById('inquilinosVencimientoContratosTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    inquilinos.forEach(inq => {
        const venc = new Date(inq.fecha_vencimiento + 'T00:00:00');
        const diffDays = Math.ceil((venc - today) / (1000 * 60 * 60 * 24));
        let estado = '';
        let badgeClass = '';
        
        if (diffDays < 0) {
            estado = 'Vencido';
            badgeClass = 'badge-danger';
        } else if (diffDays <= 30) {
            estado = 'Próximo a vencer';
            badgeClass = 'badge-warning';
        } else {
            estado = 'Vigente';
            badgeClass = 'badge-success';
        }
        
        tbody.innerHTML += `
            <tr class="clickable" style="cursor: pointer;" onclick="showInquilinoDetail(${inq.id})">
                <td>${inq.nombre}</td>
                <td>${formatDate(inq.fecha_inicio)}</td>
                <td>${formatDateVencimiento(inq.fecha_vencimiento)}</td>
                <td>${diffDays}</td>
                <td><span class="badge ${badgeClass}">${estado}</span></td>
            </tr>
        `;
    });

    if (inquilinos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light)">No hay contratos</td></tr>';
    }
}

// ============================================
// INQUILINO DETAIL MODAL
// ============================================

function showInquilinoDetail(id) {
    const inq = inquilinos.find(i => i.id === id);
    
    if (!inq) {
        alert('ERROR: Inquilino no encontrado con ID ' + id);
        return;
    }
    
    currentInquilinoId = id;
    
    try {
        document.getElementById('inquilinoDetailNombre').textContent = inq.nombre;
        
        // INFO BOXES (ya están en el HTML como divs fijos)
        document.getElementById('detailRenta').textContent = formatCurrency(inq.renta);
        document.getElementById('detailM2').textContent = inq.m2 || '-';
        document.getElementById('detailDespacho').textContent = inq.numero_despacho || '-';
        document.getElementById('detailFechaInicio').textContent = formatDate(inq.fecha_inicio);
        document.getElementById('detailFechaVenc').innerHTML = formatDateVencimiento(inq.fecha_vencimiento);
        
        // CONTACTOS - Desktop: cards in bordered box; Mobile: compact with dropdown
        const contactosList = document.getElementById('detailContactosList');
        const isMobile = window.innerWidth <= 768;
        
        if (inq.contactos && inq.contactos.length > 0) {
            const first = inq.contactos[0];
            const hasMore = inq.contactos.length > 1;
            
            if (isMobile) {
                // MOBILE: compact box with dropdown
                let html = '<div style="border:1px solid var(--border); border-radius:6px; padding:0.4rem 0.6rem;">';
                html += '<div style="display:flex; align-items:center; gap:0.4rem;">';
                html += '<span style="font-size:0.8rem;">📞</span>';
                
                if (hasMore) {
                    html += '<select id="contactoDropdownMobile" onchange="showContactFromDropdown(this.value)" style="flex:1; border:1px solid var(--border); border-radius:4px; padding:0.25rem 0.4rem; font-size:0.85rem; font-weight:600; color:var(--primary); cursor:pointer; background:white;">';
                    inq.contactos.forEach((c, i) => {
                        html += `<option value="${i}">${c.nombre}</option>`;
                    });
                    html += '</select>';
                } else {
                    html += `<span onclick="showContactDetail('${first.nombre.replace(/'/g,"\\'")}', '${(first.telefono||'').replace(/'/g,"\\'")}', '${(first.email||'').replace(/'/g,"\\'")}' )" style="flex:1; color:var(--primary); font-weight:600; font-size:0.85rem; cursor:pointer; text-decoration:underline;">${first.nombre}</span>`;
                }
                html += '</div></div>';
                contactosList.innerHTML = html;
            } else {
                // DESKTOP: bordered box with cards, dropdown in name card
                let html = '<div style="border:1px solid var(--border); border-radius:8px; padding:0.6rem 0.75rem;">';
                html += '<div id="desktopContactCards" style="display:flex; gap:0.5rem; flex-wrap:wrap;">';
                const telLink = first.telefono ? `<a href="tel:${first.telefono}" style="color:var(--primary); text-decoration:none;">${first.telefono}</a>` : '-';
                const emailLink = first.email ? `<a href="mailto:${first.email}" style="color:var(--primary); text-decoration:none;">${first.email}</a>` : '-';
                
                // Name card - with dropdown if multiple contacts
                html += `<div style="background:white; border:1px solid var(--border); border-radius:6px; padding:0.4rem 0.6rem; flex:2; min-width:160px;">
                    <div style="font-size:0.65rem; color:var(--text-light); text-transform:uppercase; font-weight:600;">Contacto</div>`;
                if (hasMore) {
                    html += '<select id="contactoDropdownDesktop" onchange="showDesktopContactCard(this.value)" style="width:100%; border:none; padding:0; font-size:0.9rem; font-weight:600; cursor:pointer; background:transparent; outline:none;">';
                    inq.contactos.forEach((c, i) => {
                        html += `<option value="${i}">${c.nombre}</option>`;
                    });
                    html += '</select>';
                } else {
                    html += `<div style="font-size:0.9rem; font-weight:600;">${first.nombre}</div>`;
                }
                html += '</div>';
                
                html += `<div id="dcc-telefono" style="background:white; border:1px solid var(--border); border-radius:6px; padding:0.4rem 0.6rem; flex:0.6; min-width:90px;">
                    <div style="font-size:0.65rem; color:var(--text-light); text-transform:uppercase; font-weight:600;">Teléfono</div>
                    <div style="font-size:0.85rem;">📞 ${telLink}</div>
                </div>`;
                html += `<div id="dcc-email" style="background:white; border:1px solid var(--border); border-radius:6px; padding:0.4rem 0.6rem; flex:1; min-width:120px;">
                    <div style="font-size:0.65rem; color:var(--text-light); text-transform:uppercase; font-weight:600;">Email</div>
                    <div style="font-size:0.85rem;">✉️ ${emailLink}</div>
                </div>`;
                html += '</div></div>';
                contactosList.innerHTML = html;
            }
        } else {
            contactosList.innerHTML = '<div style="border:1px solid var(--border); border-radius:6px; padding:0.4rem 0.6rem;"><span style="color:var(--text-light); font-size:0.85rem;">No hay contactos</span></div>';
        }
        
        // RFC y CLABE
        document.getElementById('detailRFC').textContent = inq.rfc || '-';
        document.getElementById('detailClabe').textContent = inq.clabe || '-';
        
        // CONTRATO DE RENTA (con + o ♻ para cargar/recargar)
        const contratoSection = document.getElementById('contratoOriginalSection');
        if (inq.has_contrato) {
            contratoSection.innerHTML = `
                <div style="background:#e8edf3; border-radius:6px; padding:0.4rem 0.4rem; display:flex; align-items:center; gap:0.2rem; height:100%;">
                    <div onclick="fetchAndViewContrato(${inq.id})" style="cursor:pointer; display:flex; align-items:center; gap:0.2rem; flex:1;">
                        <span style="font-size:1rem;">📄</span>
                        <div style="font-size:0.6rem; color:var(--text-light); text-transform:uppercase; font-weight:700;">Contrato Renta</div>
                    </div>
                    <span onclick="event.stopPropagation(); showCargarContratoModal()" title="Reemplazar contrato" style="cursor:pointer; font-size:0.95rem; padding:0.1rem 0.2rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='transparent'">🔄</span>
                </div>
            `;
        } else {
            contratoSection.innerHTML = `
                <div style="background:#e8edf3; border-radius:6px; padding:0.4rem 0.4rem; color:var(--text-light); height:100%; display:flex; align-items:center; gap:0.15rem;">
                    <div style="flex:1;">
                        <div style="font-size:0.6rem; text-transform:uppercase; font-weight:700;">Contrato Renta</div>
                        <div style="font-size:0.7rem;">Sin contrato</div>
                    </div>
                    <span onclick="event.stopPropagation(); showCargarContratoModal()" title="Cargar contrato" style="cursor:pointer; color:var(--success); font-size:1.3rem; font-weight:700; padding:0 0.2rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='transparent'">+</span>
                </div>
            `;
        }
        
        // HISTORIAL DE PAGOS CON ADEUDOS
        const historialDiv = document.getElementById('historialPagos');
        historialDiv.innerHTML = renderHistorialConAdeudos(inq);
        
        // DOCUMENTOS (sin contrato original - se maneja arriba)
        const docsDiv = document.getElementById('documentosAdicionales');
        
        if (inq.documentos && inq.documentos.length > 0) {
            const docRows = inq.documentos.map(d => {
                const safeNombre = (d.nombre || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                return `
                    <tr class="doc-item">
                        <td onclick="fetchAndViewDocInquilino(${d.id})" style="cursor:pointer;">${d.nombre}</td>
                        <td onclick="fetchAndViewDocInquilino(${d.id})" style="cursor:pointer;">${formatDate(d.fecha)}</td>
                        <td onclick="fetchAndViewDocInquilino(${d.id})" style="cursor:pointer;">${d.usuario}</td>
                        <td style="white-space:nowrap;">
                            <span onclick="event.stopPropagation(); openEditDocInquilinoModal(${d.id}, '${safeNombre}')" title="Modificar datos documento" style="cursor:pointer; font-size:1rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'">✏️</span>
                            <span onclick="event.stopPropagation(); deleteDocInquilinoConConfirm(${d.id}, '${safeNombre}')" title="Eliminar documento" style="cursor:pointer; color:var(--danger); font-weight:700; font-size:1.1rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#fed7d7'" onmouseout="this.style.background='transparent'">✕</span>
                        </td>
                    </tr>
                `;
            }).join('');
            docsDiv.innerHTML = '<table style="width:100%"><thead><tr><th>Nombre</th><th>Fecha</th><th>Usuario</th><th style="width:70px;"></th></tr></thead><tbody>' + docRows + '</tbody></table>';
        } else {
            docsDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:2rem">No hay documentos</p>';
        }
        
        // NOTAS
        document.getElementById('notasInquilino').textContent = inq.notas || 'No hay notas para este inquilino.';
        
        document.getElementById('inquilinoDetailModal').classList.add('active');
        
        // Activar primera pestaña (Historial de Pagos)
        document.querySelectorAll('#inquilinoDetailModal .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#inquilinoDetailModal .tab-content').forEach(tc => tc.classList.remove('active'));
        document.querySelector('#inquilinoDetailModal .tab:nth-child(1)').classList.add('active');
        document.getElementById('inquilinoPagosTab').classList.add('active');
        
    } catch (error) {
        console.error('ERROR en showInquilinoDetail:', error);
        alert('Error: ' + error.message);
    }
}

// ============================================
// EDIT INQUILINO
// ============================================

function closeAddInquilinoModal() {
    closeModal('addInquilinoModal');
    if (isEditMode && currentInquilinoId) {
        isEditMode = false;
        showInquilinoDetail(currentInquilinoId);
    }
}

function editInquilino() {
    const inq = inquilinos.find(i => i.id === currentInquilinoId);
    if (!inq) return;
    
    isEditMode = true;
    tempInquilinoContactos = [...(inq.contactos || [])];
    
    document.getElementById('addInquilinoTitle').textContent = 'Editar Inquilino';
    document.getElementById('inquilinoNombre').value = inq.nombre;
    document.getElementById('inquilinoClabe').value = inq.clabe || '';
    document.getElementById('inquilinoRFC').value = inq.rfc || '';
    document.getElementById('inquilinoM2').value = inq.m2 || '';
    document.getElementById('inquilinoDespacho').value = inq.numero_despacho || '';
    document.getElementById('inquilinoRenta').value = inq.renta;
    document.getElementById('inquilinoFechaInicio').value = inq.fecha_inicio;
    document.getElementById('inquilinoFechaVenc').value = inq.fecha_vencimiento;
    
    renderContactosList(tempInquilinoContactos, 'inquilinoContactosList', 'deleteInquilinoContacto', 'showEditContactoInquilinoModal');
    
    closeModal('inquilinoDetailModal');
    document.getElementById('addInquilinoModal').classList.add('active');
}

// ============================================
// CONTACTOS FUNCTIONS
// ============================================

function showAddContactoInquilinoModal() {
    document.getElementById('contactoInquilinoForm').reset();
    delete window.editingContactoIndex;
    document.getElementById('contactoModalTitle').textContent = 'Agregar Contacto';
    document.getElementById('addContactoInquilinoModal').classList.add('active');
}

function saveContactoInquilino(event) {
    event.preventDefault();
    
    const contacto = {
        nombre: document.getElementById('contactoInquilinoNombre').value,
        telefono: document.getElementById('contactoInquilinoTelefono').value,
        email: document.getElementById('contactoInquilinoEmail').value
    };
    
    if (window.editingContactoIndex !== undefined) {
        tempInquilinoContactos[window.editingContactoIndex] = contacto;
        delete window.editingContactoIndex;
    } else {
        tempInquilinoContactos.push(contacto);
    }
    
    renderContactosList(tempInquilinoContactos, 'inquilinoContactosList', 'deleteInquilinoContacto', 'showEditContactoInquilinoModal');
    
    document.getElementById('contactoInquilinoForm').reset();
    closeModal('addContactoInquilinoModal');
}

function deleteInquilinoContacto(index) {
    tempInquilinoContactos.splice(index, 1);
    renderContactosList(tempInquilinoContactos, 'inquilinoContactosList', 'deleteInquilinoContacto', 'showEditContactoInquilinoModal');
}

function showEditContactoInquilinoModal(index) {
    const contacto = tempInquilinoContactos[index];
    
    document.getElementById('contactoInquilinoNombre').value = contacto.nombre;
    document.getElementById('contactoInquilinoTelefono').value = contacto.telefono || '';
    document.getElementById('contactoInquilinoEmail').value = contacto.email || '';
    
    window.editingContactoIndex = index;
    document.getElementById('contactoModalTitle').textContent = 'Editar Contacto';
    
    document.getElementById('addContactoInquilinoModal').classList.add('active');
}

// ============================================
// VIEW DOCUMENTS (on-demand via loaders.js)
// ============================================

function viewContrato() {
    // Usa la función on-demand de loaders.js
    if (currentInquilinoId) {
        fetchAndViewContrato(currentInquilinoId);
    }
}

function viewDocumento(docIdOrArchivo) {
    // Si es un número, es un ID → usar fetch on-demand
    if (typeof docIdOrArchivo === 'number') {
        fetchAndViewDocInquilino(docIdOrArchivo);
    } else if (docIdOrArchivo) {
        // Fallback: si es base64 directo (legacy)
        openPDFViewer(docIdOrArchivo);
    }
}

async function deleteDocumentoAdicional(docId) {
    showLoading();
    try {
        const { error } = await supabaseClient
            .from('inquilinos_documentos')
            .delete()
            .eq('id', docId);
        
        if (error) throw error;
        
        await loadInquilinos();
        showInquilinoDetail(currentInquilinoId);
        setTimeout(() => switchTab('inquilino', 'docs'), 100);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar documento: ' + error.message);
    } finally {
        hideLoading();
    }
}

function deleteDocInquilinoConConfirm(docId, nombreDoc) {
    if (confirm('¿Seguro quieres eliminar ' + nombreDoc + '?')) {
        deleteDocumentoAdicional(docId);
    }
}

async function deleteContratoOriginalConfirm(inquilinoId) {
    if (!confirm('¿Seguro quieres eliminar el Contrato Renta?')) return;
    showLoading();
    try {
        const { error } = await supabaseClient
            .from('inquilinos')
            .update({ contrato_file: null })
            .eq('id', inquilinoId);
        if (error) throw error;
        await loadInquilinos();
        showInquilinoDetail(inquilinoId);
    } catch (e) {
        console.error('Error:', e);
        alert('Error al eliminar contrato: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// CONTACTO DETAIL (MOBILE)
// ============================================

function showContactDetail(nombre, telefono, email) {
    document.getElementById('contactDetailNombre').textContent = nombre;
    const telLink = telefono ? `<a href="tel:${telefono}" style="color:var(--primary); text-decoration:none; font-size:1rem;">${telefono}</a>` : '<span style="color:var(--text-light);">-</span>';
    const emailLink = email ? `<a href="mailto:${email}" style="color:var(--primary); text-decoration:none; font-size:0.95rem;">${email}</a>` : '<span style="color:var(--text-light);">-</span>';
    document.getElementById('contactDetailBody').innerHTML = `
        <div style="margin-bottom:0.75rem;">
            <div style="font-size:0.75rem; color:var(--text-light); text-transform:uppercase; font-weight:600; margin-bottom:0.2rem;">Teléfono</div>
            <div>📞 ${telLink}</div>
        </div>
        <div>
            <div style="font-size:0.75rem; color:var(--text-light); text-transform:uppercase; font-weight:600; margin-bottom:0.2rem;">Email</div>
            <div>✉️ ${emailLink}</div>
        </div>
    `;
    document.getElementById('contactDetailModal').classList.add('active');
}

function showContactFromDropdown(indexStr) {
    const idx = parseInt(indexStr);
    const inq = inquilinos.find(i => i.id === currentInquilinoId);
    if (!inq || !inq.contactos[idx]) return;
    const c = inq.contactos[idx];
    showContactDetail(c.nombre, c.telefono || '', c.email || '');
}

function showDesktopContactCard(indexStr) {
    const idx = parseInt(indexStr);
    const inq = inquilinos.find(i => i.id === currentInquilinoId);
    if (!inq || !inq.contactos[idx]) return;
    const c = inq.contactos[idx];
    const telLink = c.telefono ? `<a href="tel:${c.telefono}" style="color:var(--primary); text-decoration:none;">${c.telefono}</a>` : '-';
    const emailLink = c.email ? `<a href="mailto:${c.email}" style="color:var(--primary); text-decoration:none;">${c.email}</a>` : '-';
    
    const telDiv = document.getElementById('dcc-telefono');
    if (telDiv) telDiv.innerHTML = `<div style="font-size:0.65rem; color:var(--text-light); text-transform:uppercase; font-weight:600;">Teléfono</div><div style="font-size:0.85rem;">📞 ${telLink}</div>`;
    
    const emailDiv = document.getElementById('dcc-email');
    if (emailDiv) emailDiv.innerHTML = `<div style="font-size:0.65rem; color:var(--text-light); text-transform:uppercase; font-weight:600;">Email</div><div style="font-size:0.85rem;">✉️ ${emailLink}</div>`;
}

// ============================================
// NOTAS
// ============================================

function showAgregarNotaModal() {
    const inq = inquilinos.find(i => i.id === currentInquilinoId);
    document.getElementById('nuevaNotaTexto').value = (inq && inq.notas) ? inq.notas : '';
    document.getElementById('agregarNotaModal').classList.add('active');
}

async function saveNotaInquilino() {
    const nota = document.getElementById('nuevaNotaTexto').value || null;
    showLoading();
    try {
        const { error } = await supabaseClient
            .from('inquilinos')
            .update({ notas: nota })
            .eq('id', currentInquilinoId);
        if (error) throw error;
        await loadInquilinos();
        closeModal('agregarNotaModal');
        showInquilinoDetail(currentInquilinoId);
        setTimeout(() => switchTab('inquilino', 'notas'), 100);
    } catch (e) {
        console.error('Error:', e);
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// CARGAR CONTRATO DE RENTA
// ============================================

function showCargarContratoModal() {
    document.getElementById('contratoUploadPDF').value = '';
    document.getElementById('contratoUploadFileName').textContent = '';
    document.getElementById('cargarContratoModal').classList.add('active');
}

async function saveContratoRenta() {
    const file = document.getElementById('contratoUploadPDF').files[0];
    if (!file) { alert('Selecciona un PDF'); return; }
    showLoading();
    try {
        const pdfBase64 = await fileToBase64(file);
        const { error } = await supabaseClient
            .from('inquilinos')
            .update({ contrato_file: pdfBase64 })
            .eq('id', currentInquilinoId);
        if (error) throw error;
        await loadInquilinos();
        closeModal('cargarContratoModal');
        showInquilinoDetail(currentInquilinoId);
    } catch (e) {
        console.error('Error:', e);
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// EDITAR DOCUMENTO - MODAL EN APP
// ============================================

var editingDocId = null;

function openEditDocInquilinoModal(docId, nombreActual) {
    editingDocId = docId;
    document.getElementById('editDocNombreInput').value = nombreActual;
    
    const inq = inquilinos.find(i => i.id === currentInquilinoId);
    const preguntaContrato = document.getElementById('editDocContratoQuestion');
    const saveSection = document.getElementById('editDocSaveSection');
    
    if (inq && !inq.has_contrato) {
        preguntaContrato.classList.remove('hidden');
        saveSection.classList.add('hidden');
    } else {
        preguntaContrato.classList.add('hidden');
        saveSection.classList.remove('hidden');
    }
    
    document.getElementById('editDocInquilinoModal').classList.add('active');
}

async function processEditDocAsContrato() {
    if (!editingDocId) return;
    showLoading();
    try {
        const { data, error } = await supabaseClient
            .from('inquilinos_documentos')
            .select('archivo_pdf')
            .eq('id', editingDocId)
            .single();
        
        if (error) throw error;
        
        const { error: updateError } = await supabaseClient
            .from('inquilinos')
            .update({ contrato_file: data.archivo_pdf })
            .eq('id', currentInquilinoId);
        
        if (updateError) throw updateError;
        
        const { error: deleteError } = await supabaseClient
            .from('inquilinos_documentos')
            .delete()
            .eq('id', editingDocId);
        
        if (deleteError) throw deleteError;
        
        editingDocId = null;
        await loadInquilinos();
        closeModal('editDocInquilinoModal');
        showInquilinoDetail(currentInquilinoId);
    } catch (e) {
        console.error('Error:', e);
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

async function saveEditDocNombre() {
    if (!editingDocId) return;
    const nuevoNombre = document.getElementById('editDocNombreInput').value.trim();
    if (!nuevoNombre) { alert('El nombre no puede estar vacío'); return; }
    
    showLoading();
    try {
        const { error } = await supabaseClient
            .from('inquilinos_documentos')
            .update({ nombre_documento: nuevoNombre })
            .eq('id', editingDocId);
        
        if (error) throw error;
        
        editingDocId = null;
        await loadInquilinos();
        closeModal('editDocInquilinoModal');
        showInquilinoDetail(currentInquilinoId);
        setTimeout(() => switchTab('inquilino', 'docs'), 100);
    } catch (e) {
        console.error('Error:', e);
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// HISTORIAL DE PAGOS CON ADEUDOS MENSUALES
// ============================================

function renderHistorialConAdeudos(inq) {
    if (!inq.fecha_inicio) {
        return '<p style="color:var(--text-light);text-align:center;padding:2rem">Sin fecha de inicio</p>';
    }
    
    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const renta = parseFloat(inq.renta) || 0;
    const pagos = inq.pagos || [];
    
    // Generar meses desde fecha_inicio hasta hoy
    const inicio = new Date(inq.fecha_inicio + 'T00:00:00');
    const hoy = new Date();
    const mesInicio = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    const meses = [];
    let cursor = new Date(mesInicio);
    while (cursor <= mesActual) {
        meses.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    
    // Para cada mes, calcular pagos asociados
    const rows = meses.map(m => {
        const pagosMes = pagos.filter(p => {
            const fp = new Date(p.fecha + 'T00:00:00');
            return fp.getFullYear() === m.year && fp.getMonth() === m.month;
        });
        
        const totalPagado = pagosMes.reduce((sum, p) => sum + p.monto, 0);
        const balance = renta - totalPagado;
        const ultimoPago = pagosMes.length > 0 ? pagosMes[0] : null;
        const mesLabel = monthNames[m.month] + ' ' + m.year;
        
        return { ...m, mesLabel, totalPagado, balance, ultimoPago, pagosMes };
    });
    
    // Ordenar del más reciente al más antiguo
    rows.reverse();
    
    if (rows.length === 0) {
        return '<p style="color:var(--text-light);text-align:center;padding:2rem">No hay historial</p>';
    }
    
    let html = '<table style="width:100%; font-size:0.9rem;"><thead><tr>';
    html += '<th style="text-align:left;">Mes</th>';
    html += '<th style="text-align:left;">Estado</th>';
    html += '<th style="text-align:right;">Monto</th>';
    html += '<th style="width:40px;"></th>';
    html += '</tr></thead><tbody>';
    
    rows.forEach(r => {
        if (r.balance <= 0) {
            // PAGADO (pagó completo o más)
            const fechaPago = r.ultimoPago ? formatDate(r.ultimoPago.fecha) : '';
            html += `<tr style="background:#f0fdf4;">`;
            html += `<td style="padding:0.5rem 0.4rem; font-weight:500;">${r.mesLabel}</td>`;
            html += `<td style="padding:0.5rem 0.4rem;"><span class="badge badge-success" style="font-size:0.75rem;">Pagado</span><br><small style="color:var(--text-light);">${fechaPago}</small></td>`;
            html += `<td style="padding:0.5rem 0.4rem; text-align:right; color:var(--success); font-weight:600; white-space:nowrap;">${formatCurrency(r.totalPagado)}</td>`;
            html += `<td></td>`;
            html += `</tr>`;
        } else if (r.totalPagado > 0) {
            // PAGO PARCIAL
            const fechaPago = r.ultimoPago ? formatDate(r.ultimoPago.fecha) : '';
            html += `<tr style="background:#fffbeb;">`;
            html += `<td style="padding:0.5rem 0.4rem; font-weight:500;">${r.mesLabel}</td>`;
            html += `<td style="padding:0.5rem 0.4rem;"><span class="badge badge-warning" style="font-size:0.75rem;">Adeuda</span><br><small style="color:var(--text-light);">Parcial ${fechaPago}</small></td>`;
            html += `<td style="padding:0.5rem 0.4rem; text-align:right; color:var(--danger); font-weight:600; white-space:nowrap;">-${formatCurrency(r.balance)}</td>`;
            html += `<td style="padding:0.5rem 0.4rem; text-align:center;">`;
            html += `<span onclick="showRegistrarPagoDesdeAdeudo(${r.year}, ${r.month}, ${r.balance})" title="Registrar pago" style="cursor:pointer; font-size:1.1rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'">🏦</span>`;
            html += `</td></tr>`;
        } else {
            // NO HA PAGADO NADA
            html += `<tr style="background:#fef2f2;">`;
            html += `<td style="padding:0.5rem 0.4rem; font-weight:500;">${r.mesLabel}</td>`;
            html += `<td style="padding:0.5rem 0.4rem;"><span class="badge badge-danger" style="font-size:0.75rem;">Adeuda</span></td>`;
            html += `<td style="padding:0.5rem 0.4rem; text-align:right; color:var(--danger); font-weight:600; white-space:nowrap;">-${formatCurrency(r.balance)}</td>`;
            html += `<td style="padding:0.5rem 0.4rem; text-align:center;">`;
            html += `<span onclick="showRegistrarPagoDesdeAdeudo(${r.year}, ${r.month}, ${r.balance})" title="Registrar pago" style="cursor:pointer; font-size:1.1rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'">🏦</span>`;
            html += `</td></tr>`;
        }
    });
    
    // Sum row
    const totalPagos = rows.reduce((sum, r) => sum + r.totalPagado, 0);
    const totalAdeudos = rows.reduce((sum, r) => sum + (r.balance > 0 ? r.balance : 0), 0);
    html += `<tr style="background:#e6f2ff; font-weight:700;">`;
    html += `<td style="padding:0.5rem 0.4rem;">TOTAL</td>`;
    html += `<td style="padding:0.5rem 0.4rem;"></td>`;
    html += `<td style="padding:0.5rem 0.4rem; text-align:right; color:var(--success); white-space:nowrap;">${formatCurrency(totalPagos)}</td>`;
    html += `<td></td>`;
    html += `</tr>`;
    if (totalAdeudos > 0) {
        html += `<tr style="background:#fef2f2; font-weight:700;">`;
        html += `<td style="padding:0.5rem 0.4rem;">ADEUDO</td>`;
        html += `<td style="padding:0.5rem 0.4rem;"></td>`;
        html += `<td style="padding:0.5rem 0.4rem; text-align:right; color:var(--danger); white-space:nowrap;">-${formatCurrency(totalAdeudos)}</td>`;
        html += `<td></td>`;
        html += `</tr>`;
    }
    
    html += '</tbody></table>';
    return html;
}

// ============================================
// EXPORT HISTORIAL DE PAGOS A EXCEL
// ============================================

function exportHistorialPagosExcel() {
    const inq = inquilinos.find(i => i.id === currentInquilinoId);
    if (!inq) return;
    
    const renta = inq.renta || 0;
    const pagos = inq.pagos || [];
    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    
    // Build same data as renderHistorialConAdeudos
    if (!inq.fecha_inicio) { alert('No hay fecha de inicio'); return; }
    
    const inicio = new Date(inq.fecha_inicio + 'T00:00:00');
    const ahora = new Date();
    const months = [];
    let d = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    while (d <= ahora) {
        months.push({ year: d.getFullYear(), month: d.getMonth() });
        d.setMonth(d.getMonth() + 1);
    }
    
    const excelData = months.map(m => {
        const pagosMes = pagos.filter(p => {
            const fp = new Date(p.fecha + 'T00:00:00');
            return fp.getFullYear() === m.year && fp.getMonth() === m.month;
        });
        const totalPagado = pagosMes.reduce((sum, p) => sum + p.monto, 0);
        const balance = renta - totalPagado;
        const estado = balance <= 0 ? 'Pagado' : (totalPagado > 0 ? 'Parcial' : 'Adeuda');
        return {
            'Mes': monthNames[m.month] + ' ' + m.year,
            'Renta': renta,
            'Pagado': totalPagado,
            'Balance': balance > 0 ? -balance : 0,
            'Estado': estado
        };
    }).reverse();
    
    // Add totals row
    const totalPagado = excelData.reduce((s, r) => s + r['Pagado'], 0);
    const totalAdeudo = excelData.reduce((s, r) => s + r['Balance'], 0);
    excelData.push({ 'Mes': 'TOTAL', 'Renta': '', 'Pagado': totalPagado, 'Balance': totalAdeudo, 'Estado': '' });
    
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial Pagos');
    XLSX.writeFile(wb, `Historial_${inq.nombre.replace(/\s+/g,'_')}.xlsx`);
}

function showRegistrarPagoDesdeAdeudo(year, month, balance) {
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    
    // Guardar contexto del mes que se está pagando
    window.pagoMesContext = { year, month, balance };
    
    // Resetear el modal de pago
    document.getElementById('pagoFecha').value = '';
    document.getElementById('pagoCompleto').value = 'si';
    document.getElementById('pagoMontoGroup').classList.add('hidden');
    document.getElementById('pagoPDF').value = '';
    
    // Abrir modal de registrar pago
    document.getElementById('registrarPagoModal').classList.add('active');
}

// ============================================
// EXPORTAR INQUILINOS A EXCEL
// ============================================

function exportarInquilinosExcel() {
    if (!inquilinos || inquilinos.length === 0) {
        alert('No hay inquilinos para exportar');
        return;
    }
    
    const data = inquilinos.map(inq => {
        const contacto = (inq.contactos && inq.contactos.length > 0) ? inq.contactos[0] : {};
        return {
            'Inquilino': inq.nombre,
            'Contacto': contacto.nombre || '',
            'Teléfono': contacto.telefono || '',
            'Email': contacto.email || '',
            'Renta Mensual': inq.renta || 0,
            'M²': inq.m2 || '',
            'Despacho': inq.numero_despacho || '',
            'Inicio Renta': inq.fecha_inicio || '',
            'Vencimiento': inq.fecha_vencimiento || '',
            'RFC': inq.rfc || '',
            'CLABE': inq.clabe || ''
        };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 15 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inquilinos');
    XLSX.writeFile(wb, `Inquilinos_${new Date().toISOString().split('T')[0]}.xlsx`);
}

console.log('✅ INQUILINOS-UI.JS cargado (2026-02-12 20:30 CST)');
