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
    }
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
    const tbody = document.getElementById('bancosTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    var mesesNombres = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Sort by año desc, mes desc
    var sorted = [...bancosDocumentos].sort((a, b) => {
        if (b.anio !== a.anio) return (b.anio || 0) - (a.anio || 0);
        return (b.mes || 0) - (a.mes || 0);
    });
    
    var lastMonth = null;
    var shadeToggle = true; // start true so first toggle makes it false = white
    
    sorted.forEach(b => {
        var anio = b.anio || '';
        var mes = b.mes ? mesesNombres[b.mes] : '';
        var monthKey = '' + (b.anio || 0) + '-' + (b.mes || 0);
        var tipo = b.tipo || 'Documento';
        var nombre = b.nombre_archivo || '—';
        var clickAction = '';
        var rowStyle = '';
        
        // Toggle shade when month changes
        if (monthKey !== lastMonth) {
            shadeToggle = !shadeToggle;
            lastMonth = monthKey;
        }
        
        var bgColor = shadeToggle ? 'background:#f0f4f8;' : '';
        
        if (b.google_drive_file_id) {
            var safeName = (b.nombre_archivo || tipo).replace(/'/g, "\\'");
            clickAction = `onclick="viewDriveFileInline('${b.google_drive_file_id}', '${safeName}')"`;
            rowStyle = 'cursor:pointer;';
        }
        
        tbody.innerHTML += `
            <tr ${clickAction} style="${rowStyle}${bgColor}">
                <td style="font-size:0.85rem; word-break:break-word;">${nombre}</td>
                <td>${anio}</td>
                <td>${mes}</td>
                <td>${tipo}</td>
            </tr>
        `;
    });
    
    if (bancosDocumentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light)">No hay documentos</td></tr>';
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

console.log('✅ ADMIN-UI.JS v12 cargado');

// ============================================
// CONTABILIDAD - DOCUMENTOS
// ============================================

var contabilidadCarpetas = [];
var contabilidadAnioSeleccionado = null;
var editingCarpetaId = null;
var contabilidadNavStack = []; // breadcrumb: [{label, folderId}]
var currentDriveFolderId = null;

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
    
    contabilidadNavStack = [];
    currentDriveFolderId = null;
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
        // Only render if on contabilidad page
        if (document.getElementById('contabilidadPage') && document.getElementById('contabilidadPage').classList.contains('active')) {
            renderContabilidadContent();
        }
        // Check if next year needs creation (Nov+)
        setTimeout(checkAutoCreateNextYear, 2000);
    } catch (e) {
        console.error('Error cargando contabilidad:', e);
    }
}

function renderContabilidadContent() {
    const connected = isGoogleConnected();
    
    // Show/hide connect bar and search
    if (!connected) {
        document.getElementById('gdriveConnectBar').style.display = 'flex';
        document.getElementById('gdriveConnectBar').innerHTML = '<span style="font-size:0.85rem; color:var(--text-light);">Google Drive no conectado.</span> <span onclick="googleSignIn()" style="font-size:0.85rem; color:var(--primary); cursor:pointer; text-decoration:underline;">Reconectar</span>';
    } else {
        document.getElementById('gdriveConnectBar').style.display = 'none';
    }
    document.getElementById('contabilidadSearchBar').style.display = 'block';
    
    // If we're navigating inside a Drive folder, show that
    if (connected && contabilidadNavStack.length > 0) {
        renderBreadcrumb();
        navigateToDriveFolder(currentDriveFolderId);
        return;
    }
    
    // Otherwise show years + months
    document.getElementById('contabilidadBreadcrumb').style.display = 'none';
    document.getElementById('contabilidadUploadBtn').style.display = 'none';
    renderContabilidadYearsAndMonths();
}

function renderContabilidadYearsAndMonths() {
    const aniosDiv = document.getElementById('contabilidadAnios');
    const contentDiv = document.getElementById('contabilidadContent');
    
    const anios = [...new Set(contabilidadCarpetas.map(c => c.anio))].sort((a, b) => b - a);
    
    if (anios.length === 0) {
        aniosDiv.innerHTML = '';
        var emptyHtml = '<p style="color:var(--text-light);">No hay carpetas registradas.</p>';
        if (isGoogleConnected() && currentUser && currentUser.nivel === 1) {
            emptyHtml += '<div style="margin-top:0.5rem;"><span onclick="importarAniosExistentes()" style="font-size:0.85rem; color:var(--primary); cursor:pointer; text-decoration:underline;">📥 Importar años existentes de Google Drive</span></div>';
        }
        contentDiv.innerHTML = emptyHtml;
        return;
    }
    
    if (!contabilidadAnioSeleccionado || !anios.includes(contabilidadAnioSeleccionado)) {
        contabilidadAnioSeleccionado = anios[0];
    }
    
    // Year buttons
    aniosDiv.innerHTML = anios.map(a => {
        const isActive = a === contabilidadAnioSeleccionado;
        return `<button onclick="selectContabilidadAnio(${a})" style="padding:0.5rem 1rem; border-radius:6px; border:2px solid ${isActive ? 'var(--primary)' : 'var(--border)'}; background:${isActive ? 'var(--primary)' : 'white'}; color:${isActive ? 'white' : 'var(--text)'}; font-weight:600; font-size:1rem; cursor:pointer; transition:all 0.2s;">${a}</button>`;
    }).join('');
    
    // Month cards
    const mesesAnio = contabilidadCarpetas.filter(c => c.anio === contabilidadAnioSeleccionado);
    const mesesNombres = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const connected = isGoogleConnected();
    
    if (mesesAnio.length === 0) {
        contentDiv.innerHTML = '<p style="color:var(--text-light); margin-top:1rem;">No hay carpetas para este año.</p>';
        return;
    }
    
    contentDiv.innerHTML = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:0.5rem;">' +
        mesesAnio.map(c => {
            const mesNum = String(c.mes).padStart(2, '0');
            const mesNombre = mesesNombres[c.mes] || 'Mes ' + c.mes;
            const folderId = extractFolderId(c.google_drive_url);
            
            // If connected, clicking opens inside the app; otherwise opens in Drive
            const clickAction = connected && folderId
                ? `onclick="openMonthFolder(${c.anio}, '${mesNombre}', '${folderId}')"`
                : `onclick="window.open('${c.google_drive_url}', '_blank')"`;
            
            return `
                <div ${clickAction} style="background:white; border:1px solid var(--border); border-radius:8px; padding:0.6rem 0.8rem; display:flex; align-items:center; gap:0.5rem; cursor:pointer; transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.12)'" onmouseout="this.style.boxShadow='none'">
                    <span style="font-size:1.3rem;">📁</span>
                    <div>
                        <div style="font-weight:600; font-size:0.95rem;">${mesNum}. ${mesNombre}</div>
                        <div style="font-size:0.7rem; color:var(--text-light);">${connected ? 'Ver contenido' : 'Abrir en Drive'}</div>
                    </div>
                </div>
            `;
        }).join('') + '</div>';
    
    // Add import link at bottom (only for nivel 1 admin when connected)
    if (connected && currentUser && currentUser.nivel === 1) {
        contentDiv.innerHTML += '<div style="margin-top:1rem; text-align:center; display:flex; flex-direction:column; gap:0.4rem; align-items:center;">'
            + '<span onclick="importarAniosExistentes()" style="font-size:0.8rem; color:var(--primary); cursor:pointer; text-decoration:underline;">📥 Importar años existentes de Google Drive</span>'
            + '<span onclick="sincronizarIndiceCompleto()" style="font-size:0.8rem; color:var(--primary); cursor:pointer; text-decoration:underline;">🔄 Sincronizar índice de documentos</span>'
            + '</div>';
    }
}

function selectContabilidadAnio(anio) {
    contabilidadAnioSeleccionado = anio;
    contabilidadNavStack = [];
    currentDriveFolderId = null;
    renderContabilidadYearsAndMonths();
}

// ============================================
// DRIVE FOLDER NAVIGATION
// ============================================

function openMonthFolder(anio, mesNombre, folderId) {
    contabilidadNavStack = [{ label: anio + ' > ' + mesNombre, folderId: null }];
    currentDriveFolderId = folderId;
    renderBreadcrumb();
    navigateToDriveFolder(folderId);
}

function openDriveSubfolder(name, folderId) {
    contabilidadNavStack.push({ label: name, folderId: currentDriveFolderId });
    currentDriveFolderId = folderId;
    renderBreadcrumb();
    navigateToDriveFolder(folderId);
}

function contabilidadGoHome() {
    navigateBackTo(-1);
}

function navigateBackTo(index) {
    if (index < 0) {
        // Go back to years/months view
        contabilidadNavStack = [];
        currentDriveFolderId = null;
        document.getElementById('contabilidadBreadcrumb').style.display = 'none';
        document.getElementById('contabilidadUploadBtn').style.display = 'none';
        document.getElementById('contabilidadHomeBtn').style.display = 'none';
        document.getElementById('contabilidadAnios').style.display = 'flex';
        // Clear search
        document.getElementById('contabilidadSearchInput').value = '';
        renderContabilidadYearsAndMonths();
        return;
    }
    
    // Navigate to specific breadcrumb level
    const target = contabilidadNavStack[index];
    contabilidadNavStack = contabilidadNavStack.slice(0, index + 1);
    
    if (index === 0) {
        // Back to month level - re-enter the month folder
        const folderId = extractFolderId(
            contabilidadCarpetas.find(c => {
                const label = c.anio + ' > ' + (['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][c.mes] || '');
                return label === target.label;
            })?.google_drive_url
        );
        currentDriveFolderId = folderId;
    } else {
        currentDriveFolderId = contabilidadNavStack[index - 1]?.folderId || currentDriveFolderId;
    }
    
    renderBreadcrumb();
    navigateToDriveFolder(currentDriveFolderId);
}

function renderBreadcrumb() {
    const bcDiv = document.getElementById('contabilidadBreadcrumb');
    bcDiv.style.display = 'block';
    document.getElementById('contabilidadAnios').style.display = 'none';
    
    let html = '<span onclick="navigateBackTo(-1)" style="cursor:pointer; color:var(--primary); font-weight:600;"><span style="background:#fed7d7;padding:0.1rem 0.25rem;border-radius:3px;">📁</span> Contabilidad</span>';
    
    contabilidadNavStack.forEach((item, i) => {
        html += ' <span style="color:var(--text-light);"> › </span> ';
        if (i < contabilidadNavStack.length - 1) {
            html += `<span onclick="navigateBackTo(${i})" style="cursor:pointer; color:var(--primary);">${item.label}</span>`;
        } else {
            html += `<span style="font-weight:600; color:var(--text);">${item.label}</span>`;
        }
    });
    
    bcDiv.innerHTML = html;
}

async function navigateToDriveFolder(folderId) {
    const contentDiv = document.getElementById('contabilidadContent');
    contentDiv.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:2rem;">⏳ Cargando...</p>';
    
    // Show home button when navigating
    document.getElementById('contabilidadHomeBtn').style.display = 'inline';
    
    try {
        const { folders, files } = await listDriveFolder(folderId);
        
        // Only show upload when there are NO subfolders (final folder)
        document.getElementById('contabilidadUploadBtn').style.display = folders.length === 0 ? 'inline' : 'none';
        
        let html = '';
        
        // Subfolders
        if (folders.length > 0) {
            html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:0.5rem; margin-bottom:1rem;">';
            folders.forEach(f => {
                html += `
                    <div onclick="openDriveSubfolder('${f.name.replace(/'/g, "\\'")}', '${f.id}')" style="background:white; border:1px solid var(--border); border-radius:8px; padding:0.6rem 0.8rem; display:flex; align-items:center; gap:0.5rem; cursor:pointer; transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.12)'" onmouseout="this.style.boxShadow='none'">
                        <span style="font-size:1.3rem;">📁</span>
                        <div style="font-weight:600; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // Files
        if (files.length > 0) {
            html += '<div style="border:1px solid var(--border); border-radius:8px; overflow:hidden;">';
            files.forEach((f, i) => {
                const icon = getFileIcon(f.name, f.mimeType);
                const size = formatFileSize(f.size);
                const bgColor = i % 2 === 0 ? 'white' : 'var(--bg)';
                html += `
                    <div onclick="viewDriveFileInline('${f.id}', '${f.name.replace(/'/g, "\\'")}')" style="display:flex; align-items:center; gap:0.6rem; padding:0.5rem 0.8rem; background:${bgColor}; cursor:pointer; border-bottom:1px solid var(--border); transition:background 0.15s; flex-wrap:wrap;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='${bgColor}'">
                        <span style="font-size:1.1rem;">${icon}</span>
                        <div style="flex:1; min-width:150px;">
                            <div style="font-size:0.88rem; font-weight:500; word-break:break-word;">${f.name}</div>
                        </div>
                        <span style="font-size:0.75rem; color:var(--text-light); white-space:nowrap;">${size}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        if (folders.length === 0 && files.length === 0) {
            html = '<p style="text-align:center; color:var(--text-light); padding:2rem;">📭 Carpeta vacía</p>';
        }
        
        contentDiv.innerHTML = html;
        
        // Silently index files in Supabase for fast search
        if (files.length > 0 && contabilidadNavStack.length >= 2) {
            indexFilesToSupabase(files);
        }
        
    } catch (e) {
        console.error('Error navigating folder:', e);
        contentDiv.innerHTML = `<p style="text-align:center; color:var(--danger); padding:2rem;">Error: ${e.message}</p>`;
    }
}

function getFileIcon(name, mimeType) {
    const ext = (name || '').split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
    if (['zip', 'rar'].includes(ext)) return '📦';
    if (mimeType && mimeType.includes('spreadsheet')) return '📊';
    if (mimeType && mimeType.includes('document')) return '📝';
    return '📎';
}

// ============================================
// UPLOAD TO CURRENT FOLDER
// ============================================

function uploadToCurrentFolder() {
    if (!currentDriveFolderId) {
        alert('Navega a una carpeta primero');
        return;
    }
    if (!isGoogleConnected()) {
        alert('Conecta con Google Drive primero');
        return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.xlsx,.xls,.doc,.docx,.csv,.jpg,.jpeg,.png';
    input.multiple = true;
    input.onchange = async function() {
        if (!input.files.length) return;
        showLoading();
        try {
            // Parse path info
            var pathLabel = contabilidadNavStack[0] ? contabilidadNavStack[0].label : '';
            var parts = pathLabel.split(' > ');
            var anio = parseInt(parts[0]) || 0;
            var mesNombre = (parts[1] || '').trim();
            var mesNum = MESES_NOMBRES.indexOf(mesNombre);
            var subcarpeta = contabilidadNavStack.length >= 2 ? contabilidadNavStack[1].label : '';
            
            for (const file of input.files) {
                var result = await uploadFileToDrive(file, currentDriveFolderId);
                
                // Index in Supabase
                if (result && result.id && anio && mesNum > 0 && subcarpeta) {
                    await supabaseClient
                        .from('contabilidad_documentos')
                        .insert([{
                            nombre: file.name,
                            anio: anio,
                            mes: mesNum,
                            subcarpeta: subcarpeta,
                            google_drive_file_id: result.id,
                            size_bytes: file.size || 0,
                            mime_type: file.type || ''
                        }]);
                }
            }
            // Refresh folder view
            await navigateToDriveFolder(currentDriveFolderId);
        } catch (e) {
            console.error('Error uploading:', e);
            alert('Error al subir: ' + e.message);
        } finally {
            hideLoading();
        }
    };
    input.click();
}

// ============================================
// SEARCH
// ============================================

// ============================================
// INDEX FILES TO SUPABASE (silent background)
// ============================================

async function indexFilesToSupabase(files) {
    // Parse current path from nav stack
    // navStack[0] = "2026 > Enero", navStack[1] = "Facturas proveedores"
    var pathLabel = contabilidadNavStack[0] ? contabilidadNavStack[0].label : '';
    var parts = pathLabel.split(' > ');
    var anio = parseInt(parts[0]) || 0;
    var mesNombre = (parts[1] || '').trim();
    var mesNum = MESES_NOMBRES.indexOf(mesNombre);
    if (mesNum < 1) mesNum = 0;
    
    var subcarpeta = contabilidadNavStack.length >= 2 ? contabilidadNavStack[1].label : '';
    
    if (!anio || !mesNum || !subcarpeta) return;
    
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        if (f.mimeType === 'application/vnd.google-apps.folder') continue;
        
        try {
            // Check if already indexed
            var { data: existing } = await supabaseClient
                .from('contabilidad_documentos')
                .select('id')
                .eq('google_drive_file_id', f.id)
                .limit(1);
            
            if (existing && existing.length > 0) continue;
            
            // Index it
            await supabaseClient
                .from('contabilidad_documentos')
                .insert([{
                    nombre: f.name,
                    anio: anio,
                    mes: mesNum,
                    subcarpeta: subcarpeta,
                    google_drive_file_id: f.id,
                    size_bytes: parseInt(f.size) || 0,
                    mime_type: f.mimeType || ''
                }]);
        } catch (e) {
            // Silent fail - indexing is best-effort
        }
    }
}

// Also index when uploading
var _originalUploadFileToDrive = typeof uploadFileToDrive === 'function' ? uploadFileToDrive : null;

// ============================================
// SEARCH (Supabase-powered)
// ============================================

async function searchContabilidadDocs() {
    const term = document.getElementById('contabilidadSearchInput').value.trim();
    if (!term) return;
    
    const contentDiv = document.getElementById('contabilidadContent');
    contentDiv.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:2rem;">🔍 Buscando...</p>';
    
    // Hide years, show breadcrumb
    document.getElementById('contabilidadAnios').style.display = 'none';
    document.getElementById('contabilidadBreadcrumb').style.display = 'block';
    document.getElementById('contabilidadBreadcrumb').innerHTML = '<span onclick="navigateBackTo(-1)" style="cursor:pointer; color:var(--primary); font-weight:600;"><span style="background:#fed7d7;padding:0.1rem 0.25rem;border-radius:3px;">📁</span> Contabilidad</span> <span style="color:var(--text-light);"> › </span> <span style="font-weight:600;">Búsqueda: "' + term + '"</span>';
    document.getElementById('contabilidadUploadBtn').style.display = 'none';
    document.getElementById('contabilidadHomeBtn').style.display = 'inline';
    
    try {
        // Search in Supabase
        const { data: results, error } = await supabaseClient
            .from('contabilidad_documentos')
            .select('*')
            .ilike('nombre', '%' + term + '%')
            .order('anio', { ascending: false })
            .order('mes', { ascending: true })
            .limit(50);
        
        if (error) throw error;
        
        if (!results || results.length === 0) {
            contentDiv.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:2rem;">No se encontraron documentos con "' + term + '"</p>';
            return;
        }
        
        let html = '<div style="border:1px solid var(--border); border-radius:8px; overflow:hidden;">';
        results.forEach((doc, i) => {
            const icon = getFileIcon(doc.nombre, doc.mime_type);
            const size = formatFileSize(doc.size_bytes);
            const bgColor = i % 2 === 0 ? 'white' : 'var(--bg)';
            const displayName = doc.nombre.length > 60 ? doc.nombre.substring(0, 57) + '...' : doc.nombre;
            const mesNombre = MESES_NOMBRES[doc.mes] || '';
            const monthYear = mesNombre + ' ' + doc.anio;
            const safeName = doc.nombre.replace(/'/g, "\\'");
            html += `
                <div onclick="viewDriveFileInline('${doc.google_drive_file_id}', '${safeName}')" style="display:flex; align-items:center; gap:0.6rem; padding:0.5rem 0.8rem; background:${bgColor}; cursor:pointer; border-bottom:1px solid var(--border); transition:background 0.15s; flex-wrap:wrap;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='${bgColor}'">
                    <span style="font-size:1.1rem;">${icon}</span>
                    <div style="flex:1; min-width:120px;">
                        <div style="font-size:0.88rem; font-weight:500; word-break:break-word;" title="${doc.nombre}">${displayName}</div>
                    </div>
                    <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                        <span style="font-size:0.72rem; color:var(--primary); white-space:nowrap;">${monthYear}</span>
                        <span style="font-size:0.72rem; color:var(--text-light); white-space:nowrap;">${doc.subcarpeta}</span>
                        <span style="font-size:0.72rem; color:var(--text-light); white-space:nowrap;">${size}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        contentDiv.innerHTML = html;
        
    } catch (e) {
        console.error('Error searching:', e);
        contentDiv.innerHTML = `<p style="text-align:center; color:var(--danger); padding:2rem;">Error: ${e.message}</p>`;
    }
}

// ============================================
// CREATE YEAR STRUCTURE IN GOOGLE DRIVE
// ============================================

var SUBCARPETAS_MES = [
    'Evidencias para materialidad',
    'Facturas emitidas',
    'Facturas proveedores',
    'Pagos proveedores',
    'Repse empresas',
    'Reportes financieros'
];

var MESES_NOMBRES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function showCrearEstructuraAnio() {
    if (!isGoogleConnected()) {
        alert('Conecta con Google Drive primero');
        return;
    }
    
    // Find the parent folder (Inmobiliaris ESWU)
    // We need any existing year folder to find its parent
    const anyCarpeta = contabilidadCarpetas[0];
    if (!anyCarpeta) {
        alert('Primero agrega al menos un mes manualmente para que el sistema conozca la carpeta raíz.');
        return;
    }
    
    const anioActual = new Date().getFullYear();
    const anioSiguiente = anioActual + 1;
    const anio = prompt('¿Qué año quieres crear? (ej: ' + anioSiguiente + ')', anioSiguiente);
    
    if (!anio || isNaN(anio)) return;
    
    const existe = contabilidadCarpetas.some(c => c.anio === parseInt(anio));
    if (existe) {
        if (!confirm('Ya existen carpetas para ' + anio + '. ¿Quieres crear los meses faltantes?')) return;
    }
    
    crearEstructuraAnio(parseInt(anio));
}

async function crearEstructuraAnio(anio) {
    if (!isGoogleConnected()) {
        alert('Conecta con Google Drive primero');
        return;
    }
    
    showLoading();
    
    try {
        // Find parent folder ID from an existing year folder
        const anyCarpeta = contabilidadCarpetas[0];
        const existingFolderId = extractFolderId(anyCarpeta.google_drive_url);
        
        // Get parent of existing month folder (which is the year folder)
        // Then get parent of year folder (which is the root)
        // We need to find the root "Inmobiliaris ESWU" folder
        const existingInfo = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFolderId}?fields=parents&key=${GOOGLE_API_KEY}`, {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
        });
        const existingData = await existingInfo.json();
        const yearFolderParent = existingData.parents ? existingData.parents[0] : null;
        
        if (!yearFolderParent) {
            throw new Error('No se pudo encontrar la carpeta padre');
        }
        
        // Get parent of year folder (root Inmobiliaris ESWU)
        const yearFolderInfo = await fetch(`https://www.googleapis.com/drive/v3/files/${yearFolderParent}?fields=parents&key=${GOOGLE_API_KEY}`, {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
        });
        const yearFolderData = await yearFolderInfo.json();
        const rootFolderId = yearFolderData.parents ? yearFolderData.parents[0] : yearFolderParent;
        
        // Check if year folder already exists
        const yearQuery = `name = '${anio}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const yearSearch = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(yearQuery)}&fields=files(id,name)&key=${GOOGLE_API_KEY}`, {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
        });
        const yearSearchData = await yearSearch.json();
        
        var yearFolder;
        if (yearSearchData.files && yearSearchData.files.length > 0) {
            yearFolder = yearSearchData.files[0];
            console.log('Carpeta año existente:', yearFolder.name);
        } else {
            yearFolder = await createDriveFolder(String(anio), rootFolderId);
            console.log('Carpeta año creada:', yearFolder.name);
        }
        
        // Determine which months to create
        const existingMeses = contabilidadCarpetas.filter(c => c.anio === anio).map(c => c.mes);
        
        for (var mes = 1; mes <= 12; mes++) {
            if (existingMeses.includes(mes)) {
                console.log('Mes ' + mes + ' ya existe, saltando');
                continue;
            }
            
            var mesNum = String(mes).padStart(2, '0');
            var mesNombre = MESES_NOMBRES[mes].toUpperCase();
            var monthFolderName = mesNum + '. ' + mesNombre;
            
            // Create month folder
            var monthFolder = await createDriveFolder(monthFolderName, yearFolder.id);
            console.log('Creado:', monthFolderName);
            
            // Create subcarpetas
            for (var s = 0; s < SUBCARPETAS_MES.length; s++) {
                await createDriveFolder(SUBCARPETAS_MES[s], monthFolder.id);
            }
            
            // Save to Supabase
            var driveUrl = 'https://drive.google.com/drive/folders/' + monthFolder.id;
            var { error } = await supabaseClient
                .from('contabilidad_carpetas')
                .insert([{
                    anio: anio,
                    mes: mes,
                    nombre_mes: MESES_NOMBRES[mes],
                    google_drive_url: driveUrl
                }]);
            
            if (error) console.error('Error guardando mes ' + mes + ':', error);
        }
        
        alert('✅ Estructura de ' + anio + ' creada exitosamente');
        await loadContabilidadCarpetas();
        
    } catch (e) {
        console.error('Error creando estructura:', e);
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// AUTO-CHECK: CREATE NEXT YEAR (NOV 1)
// ============================================

function checkAutoCreateNextYear() {
    var today = new Date();
    if (today.getMonth() >= 10) { // November = 10 (0-indexed)
        var nextYear = today.getFullYear() + 1;
        var exists = contabilidadCarpetas.some(c => c.anio === nextYear);
        if (!exists && isGoogleConnected()) {
            console.log('📁 Auto-creando estructura para ' + nextYear + '...');
            crearEstructuraAnio(nextYear);
        }
    }
}

// ============================================
// IMPORT EXISTING YEARS FROM GOOGLE DRIVE
// ============================================

async function importarAniosExistentes() {
    if (!isGoogleConnected()) {
        alert('Conecta con Google Drive primero');
        return;
    }
    
    if (contabilidadCarpetas.length === 0) {
        alert('Primero agrega al menos un mes manualmente (con el +) para que el sistema conozca la carpeta raíz en Drive.');
        return;
    }
    
    if (!confirm('Esto escaneará tu Google Drive y registrará todos los años/meses que encuentre. ¿Continuar?')) return;
    
    showLoading();
    
    try {
        // Step 1: Find the root folder (parent of the year folders)
        // Get an existing month folder → its parent is the year → its parent is the root
        var anyCarpeta = contabilidadCarpetas[0];
        var monthFolderId = extractFolderId(anyCarpeta.google_drive_url);
        
        // Get month folder's parent (year folder)
        var monthInfo = await fetch(`https://www.googleapis.com/drive/v3/files/${monthFolderId}?fields=parents&key=${GOOGLE_API_KEY}`, {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
        });
        var monthData = await monthInfo.json();
        var yearFolderId = monthData.parents ? monthData.parents[0] : null;
        
        if (!yearFolderId) throw new Error('No se pudo encontrar la carpeta del año');
        
        // Get year folder's parent (root: Inmobiliaris ESWU)
        var yearInfo = await fetch(`https://www.googleapis.com/drive/v3/files/${yearFolderId}?fields=parents&key=${GOOGLE_API_KEY}`, {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
        });
        var yearData = await yearInfo.json();
        var rootFolderId = yearData.parents ? yearData.parents[0] : null;
        
        if (!rootFolderId) throw new Error('No se pudo encontrar la carpeta raíz');
        
        console.log('Carpeta raíz encontrada:', rootFolderId);
        
        // Step 2: List all year folders in root
        var { folders: yearFolders } = await listDriveFolder(rootFolderId);
        var yearFoldersFiltered = yearFolders.filter(f => /^\d{4}$/.test(f.name));
        
        console.log('Años encontrados:', yearFoldersFiltered.map(f => f.name));
        
        var totalImported = 0;
        var totalSkipped = 0;
        
        // Step 3: For each year, list month folders
        for (var y = 0; y < yearFoldersFiltered.length; y++) {
            var yearFolder = yearFoldersFiltered[y];
            var anio = parseInt(yearFolder.name);
            
            var { folders: monthFolders } = await listDriveFolder(yearFolder.id);
            
            for (var m = 0; m < monthFolders.length; m++) {
                var mFolder = monthFolders[m];
                
                // Parse month number from folder name (e.g., "01. ENERO" → 1)
                var mesMatch = mFolder.name.match(/^(\d{1,2})/);
                if (!mesMatch) continue;
                
                var mesNum = parseInt(mesMatch[1]);
                if (mesNum < 1 || mesNum > 12) continue;
                
                // Check if already exists in Supabase
                var exists = contabilidadCarpetas.some(c => c.anio === anio && c.mes === mesNum);
                if (exists) {
                    totalSkipped++;
                    continue;
                }
                
                // Register in Supabase
                var driveUrl = 'https://drive.google.com/drive/folders/' + mFolder.id;
                var { error } = await supabaseClient
                    .from('contabilidad_carpetas')
                    .insert([{
                        anio: anio,
                        mes: mesNum,
                        nombre_mes: MESES_NOMBRES[mesNum],
                        google_drive_url: driveUrl
                    }]);
                
                if (error) {
                    console.error('Error registrando ' + anio + '/' + mesNum + ':', error);
                } else {
                    totalImported++;
                    console.log('✅ Registrado:', anio, MESES_NOMBRES[mesNum]);
                }
            }
        }
        
        alert('✅ Importación completada!\n\n' + totalImported + ' meses importados\n' + totalSkipped + ' ya existían (saltados)');
        await loadContabilidadCarpetas();
        
    } catch (e) {
        console.error('Error importando:', e);
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// SYNC FULL DOCUMENT INDEX
// ============================================

async function sincronizarIndiceCompleto() {
    if (!isGoogleConnected()) {
        alert('Conecta con Google Drive primero');
        return;
    }
    
    if (!confirm('Esto escaneará todas las carpetas en Drive y registrará los documentos en el índice de búsqueda. Puede tomar unos minutos. ¿Continuar?')) return;
    
    showLoading();
    var totalIndexed = 0;
    var totalSkipped = 0;
    
    try {
        for (var c = 0; c < contabilidadCarpetas.length; c++) {
            var carpeta = contabilidadCarpetas[c];
            var monthFolderId = extractFolderId(carpeta.google_drive_url);
            if (!monthFolderId) continue;
            
            var anio = carpeta.anio;
            var mesNum = carpeta.mes;
            var mesNombre = MESES_NOMBRES[mesNum] || '';
            
            console.log('📁 Escaneando ' + anio + ' ' + mesNombre + '...');
            
            // List subfolders in month
            var { folders: subfolders } = await listDriveFolder(monthFolderId);
            
            for (var s = 0; s < subfolders.length; s++) {
                var sub = subfolders[s];
                
                // List files in subfolder
                var { files } = await listDriveFolder(sub.id);
                
                for (var f = 0; f < files.length; f++) {
                    var file = files[f];
                    if (file.mimeType === 'application/vnd.google-apps.folder') continue;
                    
                    // Check if already indexed
                    var { data: existing } = await supabaseClient
                        .from('contabilidad_documentos')
                        .select('id')
                        .eq('google_drive_file_id', file.id)
                        .limit(1);
                    
                    if (existing && existing.length > 0) {
                        totalSkipped++;
                        continue;
                    }
                    
                    // Index it
                    var { error } = await supabaseClient
                        .from('contabilidad_documentos')
                        .insert([{
                            nombre: file.name,
                            anio: anio,
                            mes: mesNum,
                            subcarpeta: sub.name,
                            google_drive_file_id: file.id,
                            size_bytes: parseInt(file.size) || 0,
                            mime_type: file.mimeType || ''
                        }]);
                    
                    if (!error) {
                        totalIndexed++;
                    } else {
                        console.error('Error indexando:', file.name, error);
                    }
                }
            }
        }
        
        alert('✅ Sincronización completada!\n\n' + totalIndexed + ' documentos indexados\n' + totalSkipped + ' ya existían');
        
    } catch (e) {
        console.error('Error sincronizando:', e);
        alert('Error: ' + e.message + '\n\nSe indexaron ' + totalIndexed + ' documentos antes del error.');
    } finally {
        hideLoading();
    }
}

// ============================================
// CARPETA CRUD
// ============================================

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
