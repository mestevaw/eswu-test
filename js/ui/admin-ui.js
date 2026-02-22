/* ========================================
   ADMIN-UI.JS v1
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
        // Bancos moved to ESWU ficha
        if (typeof showEswuFicha === 'function') {
            showEswuFicha();
            setTimeout(function() { switchTab('eswu', 'bancos'); }, 300);
        }
    }
}

function showActivosPage() {
    if (isMobile()) hideMobileMenu();
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

// showNumerosPage, toggleHomeTable, updateHomeView, renderHomeIngresos → en numeros-ui.js

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
    
    // Mobile container
    var mobileDiv = document.getElementById('usuariosMobileCards');
    if (!mobileDiv) {
        mobileDiv = document.createElement('div');
        mobileDiv.id = 'usuariosMobileCards';
        mobileDiv.className = 'show-mobile-only';
        var tableContainer = document.getElementById('usuariosTable').parentElement;
        tableContainer.parentElement.appendChild(mobileDiv);
    }
    mobileDiv.innerHTML = '';
    
    const nivelLabels = { 1: 'Admin', 2: 'Edita', 3: 'Consulta', 4: 'Contabilidad' };
    
    // DESKTOP
    usuarios.forEach(u => {
        const estadoBadge = u.activo 
            ? '<span class="badge badge-success">Activo</span>' 
            : '<span class="badge badge-danger">Inactivo</span>';
        const nivelLabel = nivelLabels[u.nivel] || `Nivel ${u.nivel || '?'}`;
        const email = u.email || '<span style="color:var(--text-light); font-size:0.8rem;">—</span>';
        tbody.innerHTML += `
            <tr>
                <td>${u.nombre}</td>
                <td style="font-size:0.82rem;">${email}</td>
                <td>••••••••</td>
                <td><span class="badge" style="font-size:0.75rem;">${nivelLabel}</span></td>
                <td>${estadoBadge}</td>
                <td><span onclick="showUsuarioDetail(${u.id})" title="Editar" style="cursor:pointer; font-size:1rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'">✏️</span></td>
            </tr>
        `;
    });
    
    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-light)">No hay usuarios</td></tr>';
        mobileDiv.innerHTML = '<p class="mc-empty">No hay usuarios</p>';
        return;
    }
    
    // MOBILE
    var h = '<div class="mc-list"><div class="mc-header">';
    h += '<div class="mc-header-line"><span>Usuario</span><span>Nivel</span></div>';
    h += '<div class="mc-header-line"><span>Email</span><span>Estado</span></div>';
    h += '</div>';
    
    usuarios.forEach((u, idx) => {
        var nivelLabel = nivelLabels[u.nivel] || 'N' + u.nivel;
        var mcBadge = u.activo ? 'mc-badge-success' : 'mc-badge-danger';
        var estado = u.activo ? 'Activo' : 'Inactivo';
        var email = u.email || '—';
        if (email.length > 25) email = email.substring(0, 23) + '…';
        
        h += '<div onclick="showUsuarioDetail(' + u.id + ')" class="mc-row' + (idx % 2 ? ' mc-row-odd' : '') + '">';
        h += '<div class="mc-line"><div class="mc-title">' + u.nombre + '</div>';
        h += '<span class="mc-meta-right">' + nivelLabel + '</span></div>';
        h += '<div class="mc-line"><span class="mc-meta">' + email + '</span>';
        h += '<span class="mc-badge ' + mcBadge + '">' + estado + '</span></div>';
        h += '</div>';
    });
    
    h += '</div>';
    mobileDiv.innerHTML = h;
}

function showUsuarioDetail(id) {
    const usuario = usuarios.find(u => u.id === id);
    currentUsuarioId = id;
    isEditMode = true;
    
    document.getElementById('addUsuarioTitle').textContent = 'Editar Usuario';
    document.getElementById('usuarioNombre').value = usuario.nombre;
    document.getElementById('usuarioEmail').value = usuario.email || '';
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
            email: document.getElementById('usuarioEmail').value.trim(),
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
    // Bancos moved to ESWU ficha - redirect
    if (typeof renderEswuBancosTable === 'function') {
        renderEswuBancosTable();
    }
}

// ============================================
// BANCOS - VINCULAR DESDE DRIVE (herramienta temporal)
// ============================================

var vinculacionMeses = [];
var vinculacionIndex = 0;

async function iniciarVinculacionBancos() {
    // Init Google Drive if not yet
    if (!gdriveInitialized) initGoogleDrive();
    
    if (!isGoogleConnected()) {
        // Trigger sign-in, user will need to click 🔗 again after connecting
        googleSignIn();
        return;
    }
    
    // Make sure contabilidad carpetas are loaded
    if (!contabilidadCarpetas || contabilidadCarpetas.length === 0) {
        await loadContabilidadCarpetas();
    }
    
    console.log('🔗 Iniciando vinculación. Carpetas cargadas:', contabilidadCarpetas.length);
    console.log('   Google conectado:', isGoogleConnected());
    
    // Build list of all months that have "Reportes financieros" subfolder
    vinculacionMeses = [];
    
    var area = document.getElementById('bancoVinculacionArea');
    area.style.display = 'block';
    area.innerHTML = '<p style="text-align:center; color:var(--text-light);">⏳ Preparando lista de carpetas...</p>';
    
    try {
        for (var c = 0; c < contabilidadCarpetas.length; c++) {
            var carpeta = contabilidadCarpetas[c];
            var monthFolderId = extractFolderId(carpeta.google_drive_url);
            if (!monthFolderId) continue;
            
            console.log('📂 Escaneando ' + carpeta.anio + '/' + carpeta.mes + ' folderId=' + monthFolderId);
            var { folders } = await listDriveFolder(monthFolderId);
            console.log('   Subcarpetas encontradas:', folders.map(f => f.name));
            var reportes = folders.find(f => f.name.toLowerCase().includes('reporte'));
            
            if (reportes) {
                console.log('   ✅ Carpeta reportes encontrada: ' + reportes.name + ' id=' + reportes.id);
                vinculacionMeses.push({
                    anio: carpeta.anio,
                    mes: carpeta.mes,
                    mesNombre: MESES_NOMBRES[carpeta.mes],
                    folderId: reportes.id
                });
            } else {
                console.log('   ❌ No se encontró carpeta de reportes');
            }
        }
        
        // Sort by year desc, month desc
        vinculacionMeses.sort((a, b) => {
            if (b.anio !== a.anio) return b.anio - a.anio;
            return b.mes - a.mes;
        });
        
        if (vinculacionMeses.length === 0) {
            area.innerHTML = '<p style="text-align:center; color:var(--text-light);">No se encontraron carpetas de Reportes Financieros</p>';
            return;
        }
        
        vinculacionIndex = 0;
        mostrarVinculacionMes();
        
    } catch (e) {
        console.error('Error:', e);
        area.innerHTML = '<p style="color:var(--danger);">Error: ' + e.message + '</p>';
    }
}

async function mostrarVinculacionMes() {
    if (vinculacionIndex >= vinculacionMeses.length) {
        var area = document.getElementById('bancoVinculacionArea');
        area.innerHTML = '<p style="text-align:center; color:var(--success); font-weight:600; padding:1rem;">✅ Vinculación completada</p>';
        await loadBancosDocumentos();
        renderBancosTable();
        setTimeout(function() { area.style.display = 'none'; }, 2000);
        return;
    }
    
    var m = vinculacionMeses[vinculacionIndex];
    var area = document.getElementById('bancoVinculacionArea');
    area.innerHTML = '<p style="text-align:center; color:var(--text-light);">⏳ Cargando ' + m.mesNombre + ' ' + m.anio + '...</p>';
    
    try {
        var { files } = await listDriveFolder(m.folderId);
        // Filter out folders
        files = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
        
        var progreso = (vinculacionIndex + 1) + ' de ' + vinculacionMeses.length;
        
        var html = '<div style="border:1px solid var(--border); border-radius:8px; padding:0.8rem; margin-bottom:0.5rem;">';
        html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">';
        html += '<strong style="font-size:0.95rem; color:var(--primary);">📁 ' + m.mesNombre + ' ' + m.anio + ' — Reportes Financieros</strong>';
        html += '<span style="font-size:0.75rem; color:var(--text-light);">' + progreso + '</span>';
        html += '</div>';
        
        if (files.length === 0) {
            html += '<p style="color:var(--text-light); font-size:0.85rem;">Carpeta vacía</p>';
        } else {
            files.forEach(f => {
                // Check if already linked
                var yaVinculado = bancosDocumentos.some(b => b.google_drive_file_id === f.id);
                
                if (yaVinculado) {
                    html += '<div style="padding:0.4rem 0.5rem; font-size:0.85rem; color:var(--text-light); display:flex; align-items:center; gap:0.5rem;">✅ ' + f.name + ' <span style="font-size:0.75rem;">(ya vinculado)</span></div>';
                } else {
                    html += '<div style="padding:0.4rem 0.5rem; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">';
                    html += '<span style="font-size:0.85rem; flex:1; min-width:150px; word-break:break-word;">' + f.name + '</span>';
                    html += '<select id="vinc_tipo_' + f.id + '" style="padding:0.25rem; font-size:0.8rem; border:1px solid var(--border); border-radius:4px;">';
                    html += '<option value="">— Omitir —</option>';
                    html += '<option value="Estado de Cuenta">Estado de Cuenta</option>';
                    html += '<option value="Consulta de Movimientos">Consulta de Movimientos</option>';
                    html += '</select>';
                    html += '</div>';
                }
            });
        }
        
        html += '<div style="display:flex; justify-content:space-between; margin-top:0.75rem;">';
        html += '<button onclick="vincularSaltarMes()" style="padding:0.4rem 0.8rem; background:var(--text-light); color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.85rem;">Saltar mes ▶</button>';
        
        if (files.length > 0) {
            var fileIds = files.filter(f => !bancosDocumentos.some(b => b.google_drive_file_id === f.id)).map(f => f.id);
            html += '<button onclick="vincularGuardarMes(' + m.anio + ',' + m.mes + ',\'' + fileIds.join(',') + '\')" style="padding:0.4rem 0.8rem; background:var(--success); color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.85rem;">💾 Guardar y siguiente</button>';
        }
        
        html += '</div></div>';
        
        // Cancel button
        html += '<div style="text-align:center; margin-top:0.3rem;"><span onclick="cancelarVinculacion()" style="font-size:0.8rem; color:var(--danger); cursor:pointer; text-decoration:underline;">Cancelar vinculación</span></div>';
        
        area.innerHTML = html;
        
    } catch (e) {
        area.innerHTML = '<p style="color:var(--danger);">Error cargando archivos: ' + e.message + '</p>';
    }
}

function vincularSaltarMes() {
    vinculacionIndex++;
    mostrarVinculacionMes();
}

async function vincularGuardarMes(anio, mes, fileIdsStr) {
    var fileIds = fileIdsStr ? fileIdsStr.split(',') : [];
    showLoading();
    
    try {
        for (var i = 0; i < fileIds.length; i++) {
            var fid = fileIds[i];
            var selectEl = document.getElementById('vinc_tipo_' + fid);
            if (!selectEl || !selectEl.value) continue; // Omitir
            
            var tipo = selectEl.value;
            
            // Get file name from Drive
            var resp = await fetch('https://www.googleapis.com/drive/v3/files/' + fid + '?fields=name,size,mimeType&key=' + GOOGLE_API_KEY, {
                headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
            });
            var fileData = await resp.json();
            
            // Save to Supabase
            console.log('💾 Guardando:', tipo, fileData.name, 'anio=' + anio, 'mes=' + mes);
            var insertData = {
                tipo: tipo,
                google_drive_file_id: fid,
                nombre_archivo: fileData.name || '',
                anio: anio,
                mes: mes,
                fecha_subida: new Date().toISOString().split('T')[0],
                archivo_pdf: '',
                usuario_subio: (currentUser ? currentUser.nombre : '') || 'Sistema'
            };
            console.log('   Datos a insertar:', JSON.stringify(insertData));
            var { error: insertError } = await supabaseClient
                .from('bancos_documentos')
                .insert([insertData]);
            
            if (insertError) {
                console.error('❌ Error insert:', insertError);
                console.error('   Mensaje:', insertError.message);
                console.error('   Detalle:', insertError.details);
                console.error('   Hint:', insertError.hint);
                console.error('   Code:', insertError.code);
                alert('Error guardando: ' + (insertError.message || JSON.stringify(insertError)) + '\n\nVinculación detenida.');
                hideLoading();
                return;
            } else {
                console.log('✅ Guardado OK');
            }
        }
        
        await loadBancosDocumentos();
        renderBancosTable();
        vinculacionIndex++;
        mostrarVinculacionMes();
        
    } catch (e) {
        console.error('Error vinculando:', e);
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

function cancelarVinculacion() {
    document.getElementById('bancoVinculacionArea').style.display = 'none';
}

// ============================================
// ACTIVOS
// ============================================

function renderActivosTable() {
    const tbody = document.getElementById('activosTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    // Mobile container
    var mobileDiv = document.getElementById('activosMobileCards');
    if (!mobileDiv) {
        mobileDiv = document.createElement('div');
        mobileDiv.id = 'activosMobileCards';
        mobileDiv.className = 'show-mobile-only';
        var tableContainer = document.getElementById('activosTable').parentElement;
        tableContainer.parentElement.appendChild(mobileDiv);
    }
    mobileDiv.innerHTML = '';
    
    // DESKTOP
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
        mobileDiv.innerHTML = '<p class="mc-empty">No hay activos</p>';
        return;
    }
    
    // MOBILE
    var h = '<div class="mc-list"><div class="mc-header">';
    h += '<div class="mc-header-line"><span>Activo</span><span>Próx. Mant.</span></div>';
    h += '<div class="mc-header-line"><span>Proveedor</span><span>Último Mant.</span></div>';
    h += '</div>';
    
    activos.forEach((act, idx) => {
        var nombre = act.nombre.length > 30 ? act.nombre.substring(0, 28) + '…' : act.nombre;
        var prov = act.proveedor || '—';
        if (prov.length > 25) prov = prov.substring(0, 23) + '…';
        
        h += '<div onclick="showActivoDetail(' + act.id + ')" class="mc-row' + (idx % 2 ? ' mc-row-odd' : '') + '">';
        h += '<div class="mc-line"><div class="mc-title">' + nombre + '</div>';
        h += '<span class="mc-meta-right">' + formatDate(act.proximo_mant) + '</span></div>';
        h += '<div class="mc-line"><span class="mc-meta">' + prov + '</span>';
        h += '<span class="mc-meta-right">' + formatDate(act.ultimo_mant) + '</span></div>';
        h += '</div>';
    });
    
    h += '</div>';
    mobileDiv.innerHTML = h;
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
// ACTIVOS: SAVE / EDIT / DELETE
// ============================================

var activoPendingFotoFiles = [];

function activoSelectFotos() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = function() {
        if (input.files.length) addActivoFotos(input.files);
    };
    input.click();
}

function addActivoFotos(fileList) {
    for (var i = 0; i < fileList.length; i++) {
        activoPendingFotoFiles.push(fileList[i]);
    }
    renderActivoPendingFotos();
}

function removeActivoFoto(idx) {
    activoPendingFotoFiles.splice(idx, 1);
    renderActivoPendingFotos();
}

function renderActivoPendingFotos() {
    var div = document.getElementById('activoPendingFotos');
    if (!div) return;
    if (activoPendingFotoFiles.length === 0) { div.innerHTML = ''; return; }
    var html = '';
    activoPendingFotoFiles.forEach(function(f, i) {
        html += '<div style="display:flex; align-items:center; gap:0.4rem; padding:0.25rem 0; border-bottom:1px solid #f1f5f9; font-size:0.82rem;">';
        html += '<span>📷</span><span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + f.name + '</span>';
        html += '<span onclick="removeActivoFoto(' + i + ')" style="cursor:pointer; color:var(--danger); font-weight:700;">✕</span>';
        html += '</div>';
    });
    div.innerHTML = html;
}

async function saveActivo(event) {
    event.preventDefault();
    
    var nombre = document.getElementById('activoNombre').value.trim();
    var ultimoMant = document.getElementById('activoUltimoMant').value;
    var proximoMant = document.getElementById('activoProximoMant').value;
    var proveedor = document.getElementById('activoProveedor').value;
    var notas = document.getElementById('activoNotas').value.trim();
    
    if (!nombre) { alert('Ingresa un nombre'); return; }
    
    showLoading();
    try {
        var record = {
            nombre: nombre,
            ultimo_mant: ultimoMant || null,
            proximo_mant: proximoMant || null,
            proveedor: proveedor || null,
            notas: notas || null
        };
        
        var activoId;
        
        if (isEditMode && currentActivoId) {
            var { error } = await supabaseClient
                .from('activos')
                .update(record)
                .eq('id', currentActivoId);
            if (error) throw error;
            activoId = currentActivoId;
        } else {
            var { data, error } = await supabaseClient
                .from('activos')
                .insert([record])
                .select('id');
            if (error) throw error;
            activoId = data && data[0] ? data[0].id : null;
        }
        
        // Upload photos to Drive if any
        if (activoPendingFotoFiles.length > 0 && activoId && isGoogleConnected()) {
            var provNombre = (proveedor || 'General').replace(/[\/\\]/g, '-');
            var activoNombreSafe = nombre.replace(/[\/\\]/g, '-');
            var fechaHoy = new Date().toISOString().split('T')[0];
            
            // Folder: Activos/{NombreActivo}/
            var activosFolder = await findOrCreateSubfolder('Activos', null);
            var activoFolder = await findOrCreateSubfolder(activoNombreSafe, activosFolder);
            
            // Count existing photos
            var { data: existingFotos } = await supabaseClient
                .from('activos_fotos')
                .select('id')
                .eq('activo_id', activoId);
            var existingCount = (existingFotos || []).length;
            
            for (var i = 0; i < activoPendingFotoFiles.length; i++) {
                var file = activoPendingFotoFiles[i];
                var num = existingCount + i + 1;
                var ext = file.name.split('.').pop() || 'jpg';
                var autoName = activoNombreSafe + ' ' + fechaHoy + ' (' + num + ').' + ext;
                
                var renamedFile = new File([file], autoName, { type: file.type });
                var result = await uploadFileToDrive(renamedFile, activoFolder);
                
                if (result && result.id) {
                    await supabaseClient.from('activos_fotos').insert([{
                        activo_id: activoId,
                        foto_name: autoName,
                        foto_data: 'drive:' + result.id
                    }]);
                }
            }
        } else if (activoPendingFotoFiles.length > 0 && activoId) {
            // Fallback: store as base64 if Drive not connected
            for (var j = 0; j < activoPendingFotoFiles.length; j++) {
                var fotoFile = activoPendingFotoFiles[j];
                var base64 = await fileToBase64(fotoFile);
                await supabaseClient.from('activos_fotos').insert([{
                    activo_id: activoId,
                    foto_name: fotoFile.name,
                    foto_data: base64
                }]);
            }
        }
        
        activoPendingFotoFiles = [];
        closeModal('addActivoModal');
        await loadActivos();
        renderActivosTable();
        
    } catch (e) {
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

function editActivo() {
    var act = activos.find(function(a) { return a.id === currentActivoId; });
    if (!act) return;
    
    isEditMode = true;
    document.getElementById('addActivoTitle').textContent = 'Editar Activo';
    document.getElementById('activoNombre').value = act.nombre || '';
    document.getElementById('activoUltimoMant').value = act.ultimo_mant || '';
    document.getElementById('activoProximoMant').value = act.proximo_mant || '';
    document.getElementById('activoNotas').value = act.notas || '';
    
    populateProveedoresDropdown();
    document.getElementById('activoProveedor').value = act.proveedor || '';
    
    activoPendingFotoFiles = [];
    var pendingDiv = document.getElementById('activoPendingFotos');
    if (pendingDiv) pendingDiv.innerHTML = '';
    
    closeModal('activoDetailModal');
    document.getElementById('addActivoModal').classList.add('active');
}

async function deleteActivo() {
    if (!currentActivoId) return;
    if (!confirm('¿Eliminar este activo y todas sus fotos?')) return;
    
    showLoading();
    try {
        // Delete fotos first
        await supabaseClient.from('activos_fotos').delete().eq('activo_id', currentActivoId);
        
        var { error } = await supabaseClient.from('activos').delete().eq('id', currentActivoId);
        if (error) throw error;
        
        closeModal('activoDetailModal');
        await loadActivos();
        renderActivosTable();
    } catch (e) {
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// ESTACIONAMIENTO
// ============================================

function renderEstacionamientoTable() {
    const tbody = document.getElementById('estacionamientoTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    // Mobile container
    var mobileDiv = document.getElementById('estacionamientoMobileCards');
    if (!mobileDiv) {
        mobileDiv = document.createElement('div');
        mobileDiv.id = 'estacionamientoMobileCards';
        mobileDiv.className = 'show-mobile-only';
        var tableContainer = document.getElementById('estacionamientoTable').parentElement;
        tableContainer.parentElement.appendChild(mobileDiv);
    }
    mobileDiv.innerHTML = '';
    
    // DESKTOP
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
    
    if (estacionamiento.length === 0) {
        mobileDiv.innerHTML = '<p class="mc-empty">No hay espacios</p>';
        return;
    }
    
    // MOBILE
    var h = '<div class="mc-list"><div class="mc-header">';
    h += '<div class="mc-header-line"><span>Espacio</span><span>Despacho</span></div>';
    h += '<div class="mc-header-line"><span>Inquilino</span><span></span></div>';
    h += '</div>';
    
    estacionamiento.forEach((esp, idx) => {
        var inquilino = esp.inquilino_nombre || '—';
        if (inquilino.length > 30) inquilino = inquilino.substring(0, 28) + '…';
        
        h += '<div onclick="showEditEstacionamientoModal(' + esp.id + ')" class="mc-row' + (idx % 2 ? ' mc-row-odd' : '') + '">';
        h += '<div class="mc-line"><div class="mc-title" style="flex:none;"><span class="mc-espacio" style="background:' + esp.color_asignado + ';">' + esp.numero_espacio + '</span></div>';
        h += '<span class="mc-meta-right">' + (esp.numero_despacho || '—') + '</span></div>';
        h += '<div class="mc-line"><span class="mc-meta">' + inquilino + '</span></div>';
        h += '</div>';
    });
    
    h += '</div>';
    mobileDiv.innerHTML = h;
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
    if (columna === 'espacio') {
        estacionamiento.sort((a, b) => {
            const numA = parseInt(a.numero_espacio);
            const numB = parseInt(b.numero_espacio);
            return estacionamientoSortOrder.espacio === 'asc' ? numA - numB : numB - numA;
        });
        estacionamientoSortOrder.espacio = estacionamientoSortOrder.espacio === 'asc' ? 'desc' : 'asc';
    } else if (columna === 'inquilino') {
        estacionamiento.sort((a, b) => {
            const nameA = (a.inquilino_nombre || '').toLowerCase();
            const nameB = (b.inquilino_nombre || '').toLowerCase();
            return estacionamientoSortOrder.inquilino === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        estacionamientoSortOrder.inquilino = estacionamientoSortOrder.inquilino === 'asc' ? 'desc' : 'asc';
    }
    
    renderEstacionamientoTable();
}

// ============================================
// BITÁCORA
// ============================================

let bitacoraSortOrder = 'desc';

function renderBitacoraTable() {
    const tbody = document.getElementById('bitacoraTable')?.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Mobile container
    var mobileDiv = document.getElementById('bitacoraMobileCards');
    if (!mobileDiv) {
        mobileDiv = document.createElement('div');
        mobileDiv.id = 'bitacoraMobileCards';
        mobileDiv.className = 'show-mobile-only';
        var tableContainer = document.getElementById('bitacoraTable').parentElement;
        tableContainer.parentElement.appendChild(mobileDiv);
    }
    mobileDiv.innerHTML = '';
    
    if (!bitacoraSemanal || bitacoraSemanal.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-light);padding:2rem">No hay bitácora semanal</td></tr>';
        mobileDiv.innerHTML = '<p class="mc-empty">No hay bitácora semanal</p>';
        return;
    }
    
    const sorted = [...bitacoraSemanal].sort((a, b) => {
        const dateA = new Date(a.semana_inicio);
        const dateB = new Date(b.semana_inicio);
        return bitacoraSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    _renderBitacoraRows(sorted, tbody);
    _renderBitacoraMobile(sorted, mobileDiv);
    
    const th = document.querySelector('#bitacoraTable th.sortable');
    if (th) {
        th.classList.remove('sorted-asc', 'sorted-desc');
        th.classList.add(bitacoraSortOrder === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
}

function _renderBitacoraRows(sorted, tbody) {
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
}

function _renderBitacoraMobile(sorted, mobileDiv) {
    var h = '<div class="mc-list"><div class="mc-header">';
    h += '<div class="mc-header-line"><span>Semana</span></div>';
    h += '</div>';
    
    sorted.forEach((sem, idx) => {
        var semanaTexto = sem.semana_texto ? sem.semana_texto.replace('Semana del', '').trim() : '';
        var notas = sem.notas || 'Sin notas';
        var notasPreview = notas.length > 60 ? notas.substring(0, 58) + '…' : notas;
        var esEditable = idx < 2;
        
        h += '<div' + (esEditable ? ' onclick="showEditBitacoraModal(' + sem.id + ')"' : '') + ' class="mc-row' + (idx % 2 ? ' mc-row-odd' : '') + '"' + (!esEditable ? ' style="opacity:0.5;"' : '') + '>';
        h += '<div class="mc-line"><div class="mc-title">' + semanaTexto + '</div></div>';
        h += '<div class="mc-line"><span class="mc-meta">' + notasPreview + '</span></div>';
        h += '</div>';
    });
    
    h += '</div>';
    mobileDiv.innerHTML = h;
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
    
    _renderBitacoraRows(sorted, tbody);
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-light);padding:2rem">No se encontraron resultados</td></tr>';
    }
    
    // Update mobile
    var mobileDiv = document.getElementById('bitacoraMobileCards');
    if (mobileDiv) {
        if (sorted.length === 0) {
            mobileDiv.innerHTML = '<p class="mc-empty">No se encontraron resultados</p>';
        } else {
            _renderBitacoraMobile(sorted, mobileDiv);
        }
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

console.log('✅ ADMIN-UI.JS v12 cargado');
