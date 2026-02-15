/* ========================================
   ADMIN-UI.JS - Admin Interface Functions
   Última actualización: 2026-02-12 19:30 CST
   ======================================== */

// ============================================
// ADMIN - VIEWS
// ============================================

function showAdminView(view) {
    document.getElementById('adminSubMenu').classList.remove('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    currentSubContext = 'admin-' + view;
    
    document.getElementById('btnRegresa').classList.remove('hidden');
    document.getElementById('btnSearch').classList.add('hidden');
    
    document.getElementById('contentArea').classList.remove('with-submenu');
    document.getElementById('menuSidebar').classList.add('hidden');
    document.getElementById('contentArea').classList.add('fullwidth');
    
    if (view === 'usuarios') {
        document.getElementById('adminUsuariosPage').classList.add('active');
        ensureUsuariosLoaded().then(() => renderUsuariosTable());
    } else if (view === 'bancos') {
        document.getElementById('adminBancosPage').classList.add('active');
        ensureBancosLoaded().then(() => renderBancosTable());
    }
}

function showActivosPage() {
    document.getElementById('adminSubMenu').classList.remove('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('activosPage').classList.add('active');
    
    currentSubContext = 'admin-activos';
    
    document.getElementById('btnRegresa').classList.remove('hidden');
    document.getElementById('btnSearch').classList.add('hidden');
    
    document.getElementById('contentArea').classList.remove('with-submenu');
    document.getElementById('menuSidebar').classList.add('hidden');
    document.getElementById('contentArea').classList.add('fullwidth');
    
    ensureActivosLoaded().then(() => renderActivosTable());
}

function showNumerosPage() {
    document.getElementById('adminSubMenu').classList.remove('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('numerosPage').classList.add('active');
    
    currentSubContext = 'admin-numeros';
    
    document.getElementById('btnRegresa').classList.remove('hidden');
    document.getElementById('btnSearch').classList.add('hidden');
    
    document.getElementById('contentArea').classList.remove('with-submenu');
    document.getElementById('menuSidebar').classList.add('hidden');
    document.getElementById('contentArea').classList.add('fullwidth');
    
    ensureInquilinosFullLoaded().then(() => {
        ensureProveedoresFullLoaded().then(() => {
            updateHomeView();
        });
    });
}

// ============================================
// NÚMEROS PAGE (HOME)
// ============================================

function toggleHomeTable(tableName) {
    const ingresosContainer = document.getElementById('homeIngresosContainer');
    const pagosContainer = document.getElementById('homePagosContainer');
    
    if (currentHomeTable === tableName) {
        ingresosContainer.classList.add('hidden');
        pagosContainer.classList.add('hidden');
        currentHomeTable = null;
    } else {
        if (tableName === 'ingresos') {
            ingresosContainer.classList.remove('hidden');
            pagosContainer.classList.add('hidden');
            renderHomeIngresos();
        } else if (tableName === 'pagos') {
            ingresosContainer.classList.add('hidden');
            pagosContainer.classList.remove('hidden');
            renderHomePagosDetalle();
        }
        currentHomeTable = tableName;
    }
}

function updateHomeView() {
    const filterType = document.getElementById('homeFilter').value;
    const year = parseInt(document.getElementById('homeYear').value);
    const monthSelect = document.getElementById('homeMonth');
    
    if (filterType === 'mensual') {
        monthSelect.classList.remove('hidden');
    } else {
        monthSelect.classList.add('hidden');
    }
    
    const month = filterType === 'mensual' ? parseInt(monthSelect.value) : null;
    let totalIngresos = 0;
    let totalGastos = 0;
    
    inquilinos.forEach(inq => {
        if (inq.pagos) {
            inq.pagos.forEach(pago => {
                const pd = new Date(pago.fecha + 'T00:00:00');
                if (pd.getFullYear() === year && (month === null || pd.getMonth() === month)) {
                    totalIngresos += pago.monto;
                }
            });
        }
    });
    
    proveedores.forEach(prov => {
        if (prov.facturas) {
            prov.facturas.forEach(fact => {
                if (fact.fecha_pago) {
                    const pd = new Date(fact.fecha_pago + 'T00:00:00');
                    if (pd.getFullYear() === year && (month === null || pd.getMonth() === month)) {
                        totalGastos += fact.monto;
                    }
                }
            });
        }
    });
    
    document.getElementById('summaryIngresos').textContent = formatCurrency(totalIngresos);
    document.getElementById('summaryGastos').textContent = formatCurrency(totalGastos);
    document.getElementById('summaryNeto').textContent = formatCurrency(totalIngresos - totalGastos);
    
    if (currentHomeTable === 'ingresos') {
        renderHomeIngresos();
    } else if (currentHomeTable === 'pagos') {
        renderHomePagosDetalle();
    }
}

function renderHomeIngresos() {
    const filterType = document.getElementById('homeFilter').value;
    const year = parseInt(document.getElementById('homeYear').value);
    const month = filterType === 'mensual' ? parseInt(document.getElementById('homeMonth').value) : null;
    
    const tbody = document.getElementById('homeIngresosTable').querySelector('tbody');
    tbody.innerHTML = '';
    const pagos = [];
    let total = 0;
    
    inquilinos.forEach(inq => {
        if (inq.pagos) {
            inq.pagos.forEach(pago => {
                const pd = new Date(pago.fecha + 'T00:00:00');
                if (pd.getFullYear() === year && (month === null || pd.getMonth() === month)) {
                    pagos.push({
                        inquilino: inq.nombre,
                        inquilinoId: inq.id,
                        fecha: pago.fecha,
                        monto: pago.monto
                    });
                    total += pago.monto;
                }
            });
        }
    });
    
    pagos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    pagos.forEach(p => {
        tbody.innerHTML += `
            <tr class="clickable" style="cursor: pointer;" onclick="showInquilinoDetail(${p.inquilinoId})">
                <td>${p.inquilino}</td>
                <td>${formatDate(p.fecha)}</td>
                <td class="currency">${formatCurrency(p.monto)}</td>
            </tr>
        `;
    });
    
    if (pagos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-light)">No hay ingresos</td></tr>';
    } else {
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        if (filterType === 'mensual') {
            tbody.innerHTML += `<tr style="font-weight:bold;background:#e6f2ff"><td colspan="2" style="text-align:right;padding:1rem;font-size:1.1rem">TOTAL ${monthNames[month].toUpperCase()} ${year}:</td><td class="currency" style="color:var(--primary);font-size:1.2rem">${formatCurrency(total)}</td></tr>`;
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
        
        tbody.innerHTML += `<tr style="font-weight:bold;background:#d4edda"><td colspan="2" style="text-align:right;padding:1rem;font-size:1.1rem">TOTAL ${year}:</td><td class="currency" style="color:var(--success);font-size:1.2rem">${formatCurrency(totalAnual)}</td></tr>`;
    }
}

async function renderHomePagosDetalle() {
    await ensureProveedoresFullLoaded();
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const tbodyPorPagar = document.getElementById('homeFacturasPorPagarTable')?.querySelector('tbody');
    const tbodyPagadas = document.getElementById('homeFacturasPagadasTable')?.querySelector('tbody');
    
    if (!tbodyPorPagar || !tbodyPagadas) return;
    
    tbodyPorPagar.innerHTML = '';
    tbodyPagadas.innerHTML = '';
    
    const porPagar = [];
    const pagadas = [];
    let totalPorPagar = 0;
    let totalPagadas = 0;
    
    proveedores.forEach(prov => {
        if (prov.facturas) {
            prov.facturas.forEach(f => {
                if (!f.fecha_pago) {
                    porPagar.push({
                        proveedor: prov.nombre,
                        proveedorId: prov.id,
                        clabe: prov.clabe || null,
                        monto: f.monto,
                        vencimiento: f.vencimiento
                    });
                    totalPorPagar += f.monto;
                } else {
                    const pd = new Date(f.fecha_pago + 'T00:00:00');
                    if (pd.getMonth() === currentMonth && pd.getFullYear() === currentYear) {
                        pagadas.push({
                            proveedor: prov.nombre,
                            proveedorId: prov.id,
                            monto: f.monto,
                            fecha: f.fecha_pago
                        });
                        totalPagadas += f.monto;
                    }
                }
            });
        }
    });
    
    porPagar.sort((a, b) => new Date(a.vencimiento) - new Date(b.vencimiento));
    const isMobile = window.innerWidth <= 768;
    porPagar.forEach(f => {
        const row = tbodyPorPagar.insertRow();
        row.className = 'clickable';
        row.onclick = () => showProveedorDetail(f.proveedorId);
        const proveedorText = isMobile && f.proveedor.length > 22 ? f.proveedor.substring(0, 22) + '...' : f.proveedor;
        
        const clabeAttr = f.clabe ? `data-clabe="CLABE: ${f.clabe}"` : '';
        
        row.innerHTML = `<td class="proveedor-truncate proveedor-clabe-hover" ${clabeAttr}>${proveedorText}</td><td class="currency">${formatCurrency(f.monto)}</td><td>${formatDateVencimiento(f.vencimiento)}</td>`;
    });
    
    if (porPagar.length === 0) {
        tbodyPorPagar.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-light)">No hay facturas por pagar</td></tr>';
    } else {
        const row = tbodyPorPagar.insertRow();
        row.className = 'total-row';
        row.innerHTML = `<td style="text-align:right;padding:1rem"><strong>TOTAL:</strong></td><td class="currency"><strong>${formatCurrency(totalPorPagar)}</strong></td><td></td>`;
    }
    
    pagadas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    pagadas.forEach(f => {
        const row = tbodyPagadas.insertRow();
        row.className = 'clickable';
        row.onclick = () => showProveedorDetail(f.proveedorId);
        const proveedorText = isMobile && f.proveedor.length > 22 ? f.proveedor.substring(0, 22) + '...' : f.proveedor;
        row.innerHTML = `<td class="proveedor-truncate">${proveedorText}</td><td class="currency">${formatCurrency(f.monto)}</td><td>${formatDate(f.fecha)}</td>`;
    });
    
    if (pagadas.length === 0) {
        tbodyPagadas.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-light)">No hay facturas pagadas este mes</td></tr>';
    } else {
        const row = tbodyPagadas.insertRow();
        row.className = 'total-row';
        row.innerHTML = `<td style="text-align:right;padding:1rem"><strong>TOTAL:</strong></td><td class="currency"><strong>${formatCurrency(totalPagadas)}</strong></td><td></td>`;
    }
}

// ============================================
// USUARIOS
// ============================================

function renderUsuariosTable() {
    const tbody = document.getElementById('usuariosTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    const nivelLabels = { 1: 'Admin', 2: 'Edita', 3: 'Consulta', 4: 'Contabilidad' };
    
    usuarios.forEach(u => {
        const estadoBadge = u.activo 
            ? '<span class="badge badge-success">Activo</span>' 
            : '<span class="badge badge-danger">Inactivo</span>';
        const nivelLabel = nivelLabels[u.nivel] || `Nivel ${u.nivel || '?'}`;
        tbody.innerHTML += `
            <tr>
                <td>${u.nombre}</td>
                <td>••••••••</td>
                <td><span class="badge" style="font-size:0.75rem;">${nivelLabel}</span></td>
                <td>${estadoBadge}</td>
                <td><span onclick="showUsuarioDetail(${u.id})" title="Editar" style="cursor:pointer; font-size:1rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'">✏️</span></td>
            </tr>
        `;
    });
    
    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light)">No hay usuarios</td></tr>';
    }
}

function showUsuarioDetail(id) {
    const usuario = usuarios.find(u => u.id === id);
    currentUsuarioId = id;
    isEditMode = true;
    
    document.getElementById('addUsuarioTitle').textContent = 'Editar Usuario';
    document.getElementById('usuarioNombre').value = usuario.nombre;
    document.getElementById('usuarioPassword').value = usuario.password;
    document.getElementById('usuarioNivel').value = usuario.nivel || 4;
    document.getElementById('usuarioActivo').checked = usuario.activo !== false;
    document.getElementById('addUsuarioModal').classList.add('active');
}

async function saveUsuario(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const usuarioData = {
            nombre: document.getElementById('usuarioNombre').value,
            password: document.getElementById('usuarioPassword').value,
            nivel: parseInt(document.getElementById('usuarioNivel').value),
            activo: document.getElementById('usuarioActivo').checked
        };
        
        if (isEditMode && currentUsuarioId) {
            const { error } = await supabaseClient
                .from('usuarios')
                .update(usuarioData)
                .eq('id', currentUsuarioId);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient
                .from('usuarios')
                .insert([usuarioData]);
            if (error) throw error;
        }
        
        await loadUsuarios();
        closeModal('addUsuarioModal');
        renderUsuariosTable();
        isEditMode = false;
        currentUsuarioId = null;
    } catch (e) {
        console.error('Error:', e);
        alert('Error al guardar usuario: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// BANCOS
// ============================================

function renderBancosTable() {
    const tbody = document.getElementById('bancosTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    bancosDocumentos.forEach(b => {
        tbody.innerHTML += `
            <tr class="banco-clickable" onclick="fetchAndViewBancoDoc(${b.id})">
                <td>${b.tipo || 'Documento'}</td>
                <td>${formatDate(b.fecha_subida)}</td>
            </tr>
        `;
    });
    
    if (bancosDocumentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-light)">No hay documentos</td></tr>';
    }
}

// ============================================
// ACTIVOS
// ============================================

function renderActivosTable() {
    const tbody = document.getElementById('activosTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    activos.forEach(act => {
        tbody.innerHTML += `
            <tr style="cursor: pointer;" onclick="showActivoDetail(${act.id})">
                <td>${act.nombre}</td>
                <td>${formatDate(act.ultimo_mant)}</td>
                <td>${formatDate(act.proximo_mant)}</td>
                <td>${act.proveedor || '-'}</td>
            </tr>
        `;
    });
    
    if (activos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light)">No hay activos</td></tr>';
    }
}

function showActivoDetail(id) {
    const act = activos.find(a => a.id === id);
    currentActivoId = id;
    
    document.getElementById('activoDetailNombre').textContent = act.nombre;
    document.getElementById('detailUltimoMant').textContent = formatDate(act.ultimo_mant);
    document.getElementById('detailProximoMant').textContent = formatDate(act.proximo_mant);
    document.getElementById('detailActivoProveedor').textContent = act.proveedor || '-';
    document.getElementById('detailActivoNotas').textContent = act.notas || '-';
    
    // Fotos: cargar bajo demanda
    const gallery = document.getElementById('photoGallery');
    if (act.fotos && act.fotos.length > 0) {
        gallery.innerHTML = '<p style="color:var(--text-light);text-align:center">Cargando ' + act.fotos.length + ' foto(s)...</p>';
        fetchActivoFotos(act.id);
    } else {
        gallery.innerHTML = '<p style="color:var(--text-light);text-align:center">No hay fotos</p>';
    }
    
    document.getElementById('activoDetailModal').classList.add('active');
}

// ============================================
// ESTACIONAMIENTO
// ============================================

function renderEstacionamientoTable() {
    const tbody = document.getElementById('estacionamientoTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    estacionamiento.forEach(esp => {
        const espacioCell = `<span class="estacionamiento-espacio" style="background: ${esp.color_asignado}">${esp.numero_espacio}</span>`;
        const inquilinoText = esp.inquilino_nombre || '-';
        const despachoText = esp.numero_despacho || '-';
        
        tbody.innerHTML += `
            <tr onclick="showEditEstacionamientoModal(${esp.id})" style="cursor:pointer">
                <td>${espacioCell}</td>
                <td>${inquilinoText}</td>
                <td>${despachoText}</td>
            </tr>
        `;
    });
}

function showEditEstacionamientoModal(espacioId) {
    const espacio = estacionamiento.find(e => e.id === espacioId);
    currentEstacionamientoId = espacioId;
    
    document.getElementById('editEspacioNumero').textContent = espacio.numero_espacio;
    
    const select = document.getElementById('editEspacioInquilino');
    select.innerHTML = '<option value="">-- Seleccione --</option><option value="VISITAS">VISITAS</option>';
    inquilinos.forEach(inq => {
        const option = document.createElement('option');
        option.value = inq.nombre;
        option.textContent = inq.nombre;
        if (inq.nombre === espacio.inquilino_nombre) option.selected = true;
        select.appendChild(option);
    });
    
    document.getElementById('editEspacioDespacho').value = espacio.numero_despacho || '';
    
    document.getElementById('editEstacionamientoModal').classList.add('active');
}

let estacionamientoSortOrder = { espacio: 'asc', inquilino: 'asc' };

function sortEstacionamiento(columna) {
    const tbody = document.getElementById('estacionamientoTable').querySelector('tbody');
    
    let sortedData = [...estacionamiento];
    
    if (columna === 'espacio') {
        sortedData.sort((a, b) => {
            const numA = parseInt(a.numero_espacio);
            const numB = parseInt(b.numero_espacio);
            return estacionamientoSortOrder.espacio === 'asc' ? numA - numB : numB - numA;
        });
        estacionamientoSortOrder.espacio = estacionamientoSortOrder.espacio === 'asc' ? 'desc' : 'asc';
    } else if (columna === 'inquilino') {
        sortedData.sort((a, b) => {
            const nameA = (a.inquilino_nombre || '').toLowerCase();
            const nameB = (b.inquilino_nombre || '').toLowerCase();
            if (estacionamientoSortOrder.inquilino === 'asc') {
                return nameA.localeCompare(nameB);
            } else {
                return nameB.localeCompare(nameA);
            }
        });
        estacionamientoSortOrder.inquilino = estacionamientoSortOrder.inquilino === 'asc' ? 'desc' : 'asc';
    }
    
    tbody.innerHTML = '';
    sortedData.forEach(esp => {
        const espacioCell = `<span class="estacionamiento-espacio" style="background: ${esp.color_asignado}">${esp.numero_espacio}</span>`;
        const inquilinoText = esp.inquilino_nombre || '-';
        const despachoText = esp.numero_despacho || '-';
        
        tbody.innerHTML += `
            <tr onclick="showEditEstacionamientoModal(${esp.id})" style="cursor:pointer">
                <td>${espacioCell}</td>
                <td>${inquilinoText}</td>
                <td>${despachoText}</td>
            </tr>
        `;
    });
}

// ============================================
// BITÁCORA
// ============================================

let bitacoraSortOrder = 'desc';

function renderBitacoraTable() {
    const tbody = document.getElementById('bitacoraTable')?.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!bitacoraSemanal || bitacoraSemanal.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-light);padding:2rem">No hay bitácora semanal</td></tr>';
        return;
    }
    
    const sorted = [...bitacoraSemanal].sort((a, b) => {
        const dateA = new Date(a.semana_inicio);
        const dateB = new Date(b.semana_inicio);
        return bitacoraSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    sorted.forEach((sem, index) => {
        const row = tbody.insertRow();
        
        const esEditable = index < 2;
        
        if (esEditable) {
            row.onclick = () => showEditBitacoraModal(sem.id);
            row.style.cursor = 'pointer';
        } else {
            row.style.cursor = 'default';
            row.style.color = '#999';
        }
        
        const notasPreview = sem.notas ? (sem.notas.length > 100 ? sem.notas.substring(0, 100) + '...' : sem.notas) : 'Sin notas';
        const notasCompletas = sem.notas || 'Sin notas';
        
        const semanaTexto = sem.semana_texto ? sem.semana_texto.replace('Semana del', '').trim() : '';
        
        row.innerHTML = `
            <td><strong>${semanaTexto}</strong></td>
            <td class="bitacora-notas-hover" data-notas="${notasCompletas.replace(/"/g, '&quot;').replace(/\n/g, '&#10;')}">${notasPreview}</td>
        `;
    });
    
    const th = document.querySelector('#bitacoraTable th.sortable');
    if (th) {
        th.classList.remove('sorted-asc', 'sorted-desc');
        th.classList.add(bitacoraSortOrder === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
}

function sortBitacora() {
    bitacoraSortOrder = bitacoraSortOrder === 'asc' ? 'desc' : 'asc';
    renderBitacoraTable();
}

function filtrarBitacora(query) {
    const tbody = document.getElementById('bitacoraTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    const filtradas = bitacoraSemanal.filter(sem => {
        const notas = (sem.notas || '').toLowerCase();
        return notas.includes(query);
    });
    
    const sorted = [...filtradas].sort((a, b) => {
        const dateA = new Date(a.semana_inicio);
        const dateB = new Date(b.semana_inicio);
        return bitacoraSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    sorted.forEach(sem => {
        const notasPreview = sem.notas ? (sem.notas.substring(0, 100) + '...') : 'Sin notas';
        const notasCompletas = sem.notas || 'Sin notas';
        tbody.innerHTML += `
            <tr onclick="showEditBitacoraModal(${sem.id})" style="cursor:pointer">
                <td><strong>${sem.semana_texto}</strong></td>
                <td class="bitacora-notas-hover" data-notas="${notasCompletas.replace(/"/g, '&quot;')}">${notasPreview}</td>
            </tr>
        `;
    });
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-light);padding:2rem">No se encontraron resultados</td></tr>';
    }
}

function showEditBitacoraModal(bitacoraId) {
    const bitacora = bitacoraSemanal.find(b => b.id === bitacoraId);
    currentBitacoraId = bitacoraId;
    
    let fechaBitacora = '';
    if (bitacora.semana_inicio) {
        fechaBitacora = bitacora.semana_inicio;
    } else if (bitacora.semana_texto) {
        const match = bitacora.semana_texto.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
        if (match) {
            const meses = {
                'Ene': '01', 'Feb': '02', 'Mar': '03', 'Abr': '04', 'May': '05', 'Jun': '06',
                'Jul': '07', 'Ago': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dic': '12'
            };
            const dia = match[1].padStart(2, '0');
            const mes = meses[match[2]];
            const anio = match[3];
            fechaBitacora = `${anio}-${mes}-${dia}`;
        }
    }
    
    document.getElementById('editBitacoraFecha').value = fechaBitacora;
    document.getElementById('editBitacoraNotas').value = bitacora.notas || '';
    
    document.getElementById('editBitacoraModal').classList.add('active');
}

function updateBitacoraMenu() {
    // Esta función se llama cuando se abre el dropdown
}

function agregarNuevaSemana() {
    agregarSemanaBitacora();
}

console.log('✅ ADMIN-UI.JS cargado (2026-02-15)');

// ============================================
// CONTABILIDAD - DOCUMENTOS
// ============================================

var contabilidadCarpetas = [];
var contabilidadAnioSeleccionado = null;
var editingCarpetaId = null;

function showContabilidadPage() {
    document.getElementById('adminSubMenu').classList.remove('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('contabilidadPage').classList.add('active');
    
    currentSubContext = 'admin-contabilidad';
    
    document.getElementById('btnRegresa').classList.remove('hidden');
    document.getElementById('btnSearch').classList.add('hidden');
    
    document.getElementById('contentArea').classList.remove('with-submenu');
    document.getElementById('menuSidebar').classList.add('hidden');
    document.getElementById('contentArea').classList.add('fullwidth');
    
    loadContabilidadCarpetas();
}

async function loadContabilidadCarpetas() {
    try {
        const { data, error } = await supabaseClient
            .from('contabilidad_carpetas')
            .select('*')
            .order('anio', { ascending: false })
            .order('mes', { ascending: true });
        if (error) throw error;
        contabilidadCarpetas = data || [];
        renderContabilidad();
    } catch (e) {
        console.error('Error cargando contabilidad:', e);
    }
}

function renderContabilidad() {
    const aniosDiv = document.getElementById('contabilidadAnios');
    const mesesDiv = document.getElementById('contabilidadMeses');
    
    // Get unique years
    const anios = [...new Set(contabilidadCarpetas.map(c => c.anio))].sort((a, b) => b - a);
    
    if (anios.length === 0) {
        aniosDiv.innerHTML = '<p style="color:var(--text-light);">No hay carpetas. Usa el + para agregar.</p>';
        mesesDiv.innerHTML = '';
        return;
    }
    
    // Select first year by default
    if (!contabilidadAnioSeleccionado || !anios.includes(contabilidadAnioSeleccionado)) {
        contabilidadAnioSeleccionado = anios[0];
    }
    
    // Render year buttons
    aniosDiv.innerHTML = anios.map(a => {
        const isActive = a === contabilidadAnioSeleccionado;
        return `<button onclick="selectContabilidadAnio(${a})" style="padding:0.5rem 1rem; border-radius:6px; border:2px solid ${isActive ? 'var(--primary)' : 'var(--border)'}; background:${isActive ? 'var(--primary)' : 'white'}; color:${isActive ? 'white' : 'var(--text)'}; font-weight:600; font-size:1rem; cursor:pointer; transition:all 0.2s;">${a}</button>`;
    }).join('');
    
    // Render months for selected year
    const mesesAnio = contabilidadCarpetas.filter(c => c.anio === contabilidadAnioSeleccionado);
    const mesesNombres = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    if (mesesAnio.length === 0) {
        mesesDiv.innerHTML = '<p style="color:var(--text-light); margin-top:1rem;">No hay carpetas para este año.</p>';
        return;
    }
    
    mesesDiv.innerHTML = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:0.5rem; margin-top:0.5rem;">' +
        mesesAnio.map(c => {
            const mesNum = String(c.mes).padStart(2, '0');
            const mesNombre = mesesNombres[c.mes] || 'Mes ' + c.mes;
            return `
                <div style="background:white; border:1px solid var(--border); border-radius:8px; padding:0.6rem 0.8rem; display:flex; align-items:center; gap:0.5rem; transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.12)'" onmouseout="this.style.boxShadow='none'">
                    <a href="${c.google_drive_url}" target="_blank" rel="noopener" style="flex:1; text-decoration:none; color:var(--text); display:flex; align-items:center; gap:0.5rem;">
                        <span style="font-size:1.3rem;">📁</span>
                        <div>
                            <div style="font-weight:600; font-size:0.95rem;">${mesNum}. ${mesNombre}</div>
                            <div style="font-size:0.7rem; color:var(--text-light);">Abrir en Google Drive</div>
                        </div>
                    </a>
                    <span onclick="editCarpetaContabilidad(${c.id})" title="Editar" style="cursor:pointer; font-size:0.9rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'">✏️</span>
                    <span onclick="deleteCarpetaContabilidad(${c.id}, '${mesNombre} ${c.anio}')" title="Eliminar" style="cursor:pointer; color:var(--danger); font-weight:700; font-size:1rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#fed7d7'" onmouseout="this.style.background='transparent'">✕</span>
                </div>
            `;
        }).join('') + '</div>';
}

function selectContabilidadAnio(anio) {
    contabilidadAnioSeleccionado = anio;
    renderContabilidad();
}

function showAddCarpetaModal() {
    editingCarpetaId = null;
    document.getElementById('addCarpetaTitle').textContent = 'Agregar Carpeta';
    document.getElementById('carpetaAnio').value = new Date().getFullYear();
    document.getElementById('carpetaMes').value = '';
    document.getElementById('carpetaURL').value = '';
    document.getElementById('addCarpetaModal').classList.add('active');
}

function editCarpetaContabilidad(id) {
    const c = contabilidadCarpetas.find(x => x.id === id);
    if (!c) return;
    editingCarpetaId = id;
    document.getElementById('addCarpetaTitle').textContent = 'Editar Carpeta';
    document.getElementById('carpetaAnio').value = c.anio;
    document.getElementById('carpetaMes').value = c.mes;
    document.getElementById('carpetaURL').value = c.google_drive_url;
    document.getElementById('addCarpetaModal').classList.add('active');
}

async function saveCarpetaContabilidad(event) {
    event.preventDefault();
    showLoading();
    
    const mesesNombres = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mes = parseInt(document.getElementById('carpetaMes').value);
    
    const data = {
        anio: parseInt(document.getElementById('carpetaAnio').value),
        mes: mes,
        nombre_mes: mesesNombres[mes] || '',
        google_drive_url: document.getElementById('carpetaURL').value.trim()
    };
    
    try {
        if (editingCarpetaId) {
            const { error } = await supabaseClient
                .from('contabilidad_carpetas')
                .update(data)
                .eq('id', editingCarpetaId);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient
                .from('contabilidad_carpetas')
                .insert([data]);
            if (error) throw error;
        }
        
        closeModal('addCarpetaModal');
        contabilidadAnioSeleccionado = data.anio;
        await loadContabilidadCarpetas();
    } catch (e) {
        console.error('Error:', e);
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

async function deleteCarpetaContabilidad(id, label) {
    if (!confirm('¿Eliminar carpeta ' + label + '?')) return;
    showLoading();
    try {
        const { error } = await supabaseClient
            .from('contabilidad_carpetas')
            .delete()
            .eq('id', id);
        if (error) throw error;
        await loadContabilidadCarpetas();
    } catch (e) {
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// NIVEL 4 - RESTRICCIÓN
// ============================================

function applyUserLevel() {
    const nivel = (currentUser && currentUser.nivel) || 1;
    
    if (nivel === 4) {
        // Level 4: solo ve Contabilidad y Salir en el menú
        document.getElementById('menuInquilinos').style.display = 'none';
        document.getElementById('menuProveedores').style.display = 'none';
        // Replace "Admin" with "Contabilidad" direct link
        const adminBtn = document.getElementById('menuAdmin');
        adminBtn.textContent = 'Contabilidad';
        adminBtn.onclick = function() { showContabilidadPage(); };
        
        // Auto-navigate to Contabilidad
        showContabilidadPage();
    } else {
        // Niveles 1-3: todo visible
        document.getElementById('menuInquilinos').style.display = '';
        document.getElementById('menuProveedores').style.display = '';
        const adminBtn = document.getElementById('menuAdmin');
        adminBtn.textContent = 'Admin';
        adminBtn.onclick = function() { showSubMenu('admin'); };
    }
}
