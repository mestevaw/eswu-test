/* ========================================
   ESWU-UI.JS v5
   Ficha ESWU - Select dropdown contacts, subfolder nav
   ======================================== */

var eswuFolderIds = { legales: null, generales: null };
var eswuFolderContents = { legales: [], generales: [] };
var eswuNavStacks = { legales: [], generales: [] };
var eswuCurrentFolders = { legales: null, generales: null };

var ESWU_FOLDER_NAMES = {
    generales: 'DOCUMENTOS GENERALES',
    legales: 'DOCUMENTOS LEGALES'
};

// ============================================
// SHOW ESWU FICHA
// ============================================

function showEswuFicha() {
    document.querySelectorAll('.submenu-container').forEach(function(s) { s.classList.remove('active'); });
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.getElementById('eswuDocsPage').classList.add('active');
    
    currentSubContext = 'eswu-docs';
    currentMenuContext = 'eswu';
    window.eswuActiveTab = 'legales'; // default tab
    
    document.getElementById('btnRegresa').classList.remove('hidden');
    document.getElementById('btnSearch').classList.add('hidden');
    document.getElementById('contentArea').classList.remove('with-submenu');
    document.getElementById('menuSidebar').classList.add('hidden');
    document.getElementById('contentArea').classList.add('fullwidth');
    
    renderEswuFicha();
}

function renderEswuFicha() {
    renderEswuActa();
    renderEswuContacts();
    loadEswuDocsTab('legales');
    loadEswuDocsTab('generales');
    if (typeof renderMensajesFicha === 'function') {
        renderMensajesFicha('eswu', 0);
    }
    setTimeout(initEswuDropZones, 200);
}

// ============================================
// ACTA CONSTITUTIVA
// ============================================

function renderEswuActa() {
    var div = document.getElementById('eswuActaSection');
    var fileId = localStorage.getItem('eswu_acta_file_id');
    var fileName = localStorage.getItem('eswu_acta_file_name') || 'Acta Constitutiva';
    
    var html = '<div style="display:flex;gap:0.4rem;align-items:stretch;flex-wrap:wrap;">';
    if (fileId) {
        html += '<div style="flex:1;min-width:200px;background:var(--bg);border-radius:6px;padding:0.4rem 0.6rem;display:flex;align-items:center;gap:0.4rem;">';
        html += '<div style="flex:1;"><div style="font-size:0.65rem;color:var(--text-light);text-transform:uppercase;font-weight:600;">Acta Constitutiva</div>';
        html += '<span onclick="viewDriveFileInline(\'' + fileId + '\', \'' + fileName.replace(/'/g, "\\'") + '\')" style="font-size:0.85rem;color:var(--primary);cursor:pointer;text-decoration:underline;">📄 ' + fileName + '</span></div>';
        html += '<span onclick="selectEswuActa()" title="Cambiar" style="cursor:pointer;font-size:1rem;padding:0.2rem;border-radius:4px;" onmouseover="this.style.background=\'#e2e8f0\'" onmouseout="this.style.background=\'transparent\'">🔄</span>';
        html += '</div>';
    } else {
        html += '<div style="flex:1;min-width:200px;background:var(--bg);border-radius:6px;padding:0.4rem 0.6rem;display:flex;align-items:center;gap:0.4rem;">';
        html += '<div style="flex:1;"><div style="font-size:0.65rem;color:var(--text-light);text-transform:uppercase;font-weight:600;">Acta Constitutiva</div>';
        html += '<span style="font-size:0.82rem;color:var(--text-light);font-style:italic;">No vinculada</span></div>';
        html += '<span onclick="selectEswuActa()" title="Seleccionar" style="color:var(--success);font-size:1.4rem;font-weight:700;cursor:pointer;padding:0 0.3rem;">+</span>';
        html += '</div>';
    }
    html += '</div>';
    div.innerHTML = html;
}

async function selectEswuActa() {
    if (typeof isGoogleConnected !== 'function' || !isGoogleConnected()) { alert('Conecta Google Drive primero'); return; }
    if (!eswuFolderIds.legales) eswuFolderIds.legales = await findEswuFolder(ESWU_FOLDER_NAMES.legales);
    if (!eswuFolderIds.legales) { alert('No se encontró DOCUMENTOS LEGALES'); return; }
    
    showLoading();
    try {
        var result = await listDriveFolder(eswuFolderIds.legales);
        var files = (result.folders || []).concat(result.files || []);
        hideLoading();
        if (files.length === 0) { alert('No hay archivos en DOCUMENTOS LEGALES'); return; }
        
        var selected = prompt('Selecciona el número:\n\n' + files.map(function(n, i) { return (i+1) + '. ' + n.name; }).join('\n'));
        if (selected) {
            var idx = parseInt(selected) - 1;
            if (idx >= 0 && idx < files.length) {
                localStorage.setItem('eswu_acta_file_id', files[idx].id);
                localStorage.setItem('eswu_acta_file_name', files[idx].name);
                renderEswuActa();
            }
        }
    } catch (e) { hideLoading(); alert('Error: ' + e.message); }
}

// ============================================
// CONTACTOS (select dropdown)
// ============================================

function renderEswuContacts() {
    var div = document.getElementById('eswuContactsList');
    var allUsers = (typeof usuarios !== 'undefined') ? usuarios : [];
    var activeUsers = allUsers.filter(function(u) { return u.activo; });
    
    // Sort alphabetically
    activeUsers.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });
    
    var html = '<div style="background:var(--bg);border-radius:8px;padding:0.4rem 0.6rem;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">';
    html += '<span style="font-size:0.65rem;color:var(--text-light);text-transform:uppercase;font-weight:600;">Usuarios</span>';
    
    // Select dropdown — first user is default
    html += '<select id="eswuUsuarioSelect" onchange="onEswuUsuarioSelect(this.value)" style="flex:1;min-width:140px;padding:0.3rem 0.4rem;border:1px solid var(--border);border-radius:4px;font-size:0.85rem;cursor:pointer;">';
    activeUsers.forEach(function(u, i) {
        var nivel = {1:'Admin',2:'Edita',3:'Consulta',4:'Contabilidad'}[u.nivel] || '';
        html += '<option value="' + u.id + '"' + (i === 0 ? ' selected' : '') + '>' + u.nombre + (nivel ? ' (' + nivel + ')' : '') + '</option>';
    });
    html += '</select>';
    
    // Add button
    html += '<span onclick="showEswuAddUsuario()" title="Agregar usuario" style="color:var(--success);font-size:1.3rem;font-weight:700;cursor:pointer;padding:0 0.3rem;border-radius:4px;" onmouseover="this.style.background=\'#dcfce7\'" onmouseout="this.style.background=\'transparent\'">+</span>';
    html += '</div>';
    
    div.innerHTML = html;
}

function onEswuUsuarioSelect(val) {
    if (!val) return;
    showEswuEditUsuario(parseInt(val));
}

function editEswuUsuarios() {
    // Pencil icon: open edit for currently selected user
    var sel = document.getElementById('eswuUsuarioSelect');
    if (sel && sel.value) {
        showEswuEditUsuario(parseInt(sel.value));
    }
}

// ============================================
// USUARIO EDIT MODAL
// ============================================

function showEswuEditUsuario(id) {
    var u = usuarios.find(function(x) { return x.id === id; });
    if (!u) return;
    
    document.getElementById('eswuEditUsuarioTitle').textContent = u.nombre;
    document.getElementById('eswuUsuarioId').value = u.id;
    document.getElementById('eswuUsuarioNombre').value = u.nombre;
    document.getElementById('eswuUsuarioEmail').value = u.email || '';
    document.getElementById('eswuUsuarioPassword').value = u.password || '';
    document.getElementById('eswuUsuarioNivel').value = u.nivel || 4;
    document.getElementById('eswuUsuarioActivo').checked = u.activo !== false;
    
    document.getElementById('eswuEditUsuarioModal').classList.add('active');
}

function showEswuAddUsuario() {
    document.getElementById('eswuEditUsuarioTitle').textContent = 'Nuevo Usuario';
    document.getElementById('eswuUsuarioId').value = '';
    document.getElementById('eswuUsuarioNombre').value = '';
    document.getElementById('eswuUsuarioEmail').value = '';
    document.getElementById('eswuUsuarioPassword').value = '';
    document.getElementById('eswuUsuarioNivel').value = '3';
    document.getElementById('eswuUsuarioActivo').checked = true;
    
    document.getElementById('eswuEditUsuarioModal').classList.add('active');
}

async function saveEswuUsuario(event) {
    event.preventDefault();
    var id = document.getElementById('eswuUsuarioId').value;
    var data = {
        nombre: document.getElementById('eswuUsuarioNombre').value.trim(),
        email: document.getElementById('eswuUsuarioEmail').value.trim(),
        password: document.getElementById('eswuUsuarioPassword').value,
        nivel: parseInt(document.getElementById('eswuUsuarioNivel').value),
        activo: document.getElementById('eswuUsuarioActivo').checked
    };
    
    if (!data.nombre || !data.password) { alert('Nombre y password son requeridos'); return; }
    
    showLoading();
    try {
        if (id) {
            var r = await supabaseClient.from('usuarios').update(data).eq('id', parseInt(id));
            if (r.error) throw r.error;
        } else {
            var r = await supabaseClient.from('usuarios').insert([data]);
            if (r.error) throw r.error;
        }
        
        var res = await supabaseClient.from('usuarios').select('*');
        if (!res.error) usuarios = res.data || [];
        
        closeModal('eswuEditUsuarioModal');
        renderEswuContacts();
    } catch (e) {
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// DOCS TABS - WITH SUBFOLDER NAVIGATION
// ============================================

async function loadEswuDocsTab(tipo, retryCount) {
    var contentDiv = document.getElementById('eswu' + cap(tipo) + 'Content');
    if (!contentDiv) return;
    retryCount = retryCount || 0;
    
    if (typeof isGoogleConnected !== 'function' || !isGoogleConnected()) {
        if (retryCount < 3) {
            contentDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem;">Conectando a Google Drive...</p>';
            setTimeout(function() { loadEswuDocsTab(tipo, retryCount + 1); }, 2000);
        } else {
            contentDiv.innerHTML = '<div style="text-align:center;padding:1.5rem;"><p style="color:var(--text-light);margin-bottom:0.5rem;">No se pudo conectar a Google Drive.</p><button onclick="googleSignIn()" style="background:var(--primary);color:white;border:none;padding:0.35rem 0.7rem;border-radius:6px;cursor:pointer;font-size:0.85rem;">Conectar</button></div>';
        }
        return;
    }
    
    contentDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem;">Cargando...</p>';
    
    try {
        if (!eswuFolderIds[tipo]) {
            eswuFolderIds[tipo] = await findEswuFolder(ESWU_FOLDER_NAMES[tipo]);
        }
        if (!eswuFolderIds[tipo]) {
            contentDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1.5rem;">No se encontró "' + ESWU_FOLDER_NAMES[tipo] + '" en Drive.</p>';
            return;
        }
        
        eswuNavStacks[tipo] = [{ label: ESWU_FOLDER_NAMES[tipo], folderId: eswuFolderIds[tipo] }];
        eswuCurrentFolders[tipo] = eswuFolderIds[tipo];
        
        await renderEswuFolder(tipo, eswuFolderIds[tipo]);
    } catch (e) {
        console.error('Error cargando docs ESWU:', e);
        contentDiv.innerHTML = '<p style="color:var(--danger);text-align:center;padding:1rem;">Error: ' + e.message + '</p>';
    }
}

async function renderEswuFolder(tipo, folderId) {
    var contentDiv = document.getElementById('eswu' + cap(tipo) + 'Content');
    if (!contentDiv) return;
    
    contentDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:0.5rem;">Cargando...</p>';
    
    // Build ruta from nav stack
    var stack = eswuNavStacks[tipo] || [];
    var ruta = stack.map(function(s) { return s.label; }).join('/');
    
    try {
        var result = await listDriveFolder(folderId, ruta);
        var allItems = (result.folders || []).concat(result.files || []);
        eswuFolderContents[tipo] = allItems;
        eswuCurrentFolders[tipo] = folderId;
        
        renderEswuBreadcrumb(tipo);
        renderEswuDocsList(tipo, allItems);
    } catch (e) {
        contentDiv.innerHTML = '<p style="color:var(--danger);text-align:center;">Error: ' + e.message + '</p>';
    }
}

function renderEswuBreadcrumb(tipo) {
    var bcDiv = document.getElementById('eswu' + cap(tipo) + 'Breadcrumb');
    if (!bcDiv) return;
    
    var stack = eswuNavStacks[tipo] || [];
    if (stack.length <= 1) { bcDiv.innerHTML = ''; return; }
    
    var html = '';
    stack.forEach(function(item, i) {
        if (i > 0) html += ' <span style="color:var(--text-light);margin:0 0.15rem;">›</span> ';
        if (i < stack.length - 1) {
            html += '<span onclick="eswuNavTo(\'' + tipo + '\',' + i + ')" style="color:var(--primary);cursor:pointer;font-size:0.82rem;">' + item.label + '</span>';
        } else {
            html += '<span style="font-weight:600;font-size:0.82rem;">' + item.label + '</span>';
        }
    });
    bcDiv.innerHTML = html;
}

function openEswuSubfolder(tipo, name, folderId) {
    eswuNavStacks[tipo].push({ label: name, folderId: folderId });
    renderEswuFolder(tipo, folderId);
}

function eswuNavTo(tipo, index) {
    eswuNavStacks[tipo] = eswuNavStacks[tipo].slice(0, index + 1);
    renderEswuFolder(tipo, eswuNavStacks[tipo][index].folderId);
}

function renderEswuDocsList(tipo, items) {
    var contentDiv = document.getElementById('eswu' + cap(tipo) + 'Content');
    if (!contentDiv) return;
    
    if (!items || items.length === 0) {
        contentDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1.5rem;">Carpeta vacía</p>';
        return;
    }
    
    var html = '<div style="display:flex;flex-direction:column;gap:0.3rem;">';
    items.forEach(function(f) {
        var isFolder = f.mimeType === 'application/vnd.google-apps.folder';
        if (isFolder) {
            html += '<div onclick="openEswuSubfolder(\'' + tipo + '\', \'' + f.name.replace(/'/g, "\\'") + '\', \'' + f.id + '\')" style="background:white;border:1px solid var(--border);border-radius:8px;padding:0.5rem 0.7rem;display:flex;align-items:center;gap:0.5rem;cursor:pointer;transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow=\'0 2px 6px rgba(0,0,0,0.1)\'" onmouseout="this.style.boxShadow=\'none\'">';
            html += '<span style="font-size:1.1rem;">📁</span>';
            html += '<span style="font-size:0.88rem;font-weight:500;">' + f.name + '</span>';
            html += '</div>';
        } else {
            var icon = eswuFileIcon(f.mimeType);
            html += '<div style="background:white;border:1px solid var(--border);border-radius:8px;padding:0.45rem 0.7rem;display:flex;align-items:center;gap:0.5rem;">';
            html += '<span style="font-size:1rem;">' + icon + '</span>';
            html += '<span onclick="viewDriveFileInline(\'' + f.id + '\', \'' + f.name.replace(/'/g, "\\'") + '\')" style="flex:1;font-size:0.85rem;color:var(--primary);cursor:pointer;text-decoration:underline;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + f.name + '</span>';
            if (f.size) html += '<span style="font-size:0.72rem;color:var(--text-light);white-space:nowrap;">' + formatFileSize(f.size) + '</span>';
            html += '</div>';
        }
    });
    html += '</div>';
    contentDiv.innerHTML = html;
}

// ============================================
// SEARCH
// ============================================

function filterEswuDocs(tipo) {
    var input = document.getElementById('eswu' + cap(tipo) + 'Search');
    var q = input ? input.value.toLowerCase().trim() : '';
    var items = eswuFolderContents[tipo] || [];
    
    if (!q) {
        renderEswuDocsList(tipo, items);
    } else {
        renderEswuDocsList(tipo, items.filter(function(f) {
            return f.name.toLowerCase().includes(q);
        }));
    }
}

// ============================================
// UPLOAD TO CURRENT FOLDER
// ============================================

async function uploadToEswuFolder(tipo) {
    if (typeof isGoogleConnected !== 'function' || !isGoogleConnected()) { alert('Conecta Google Drive primero'); return; }
    
    var targetFolder = eswuCurrentFolders[tipo] || eswuFolderIds[tipo];
    if (!targetFolder) {
        eswuFolderIds[tipo] = await findEswuFolder(ESWU_FOLDER_NAMES[tipo]);
        targetFolder = eswuFolderIds[tipo];
        if (!targetFolder) { alert('No se encontró "' + ESWU_FOLDER_NAMES[tipo] + '"'); return; }
    }
    
    var input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.xlsx,.xls,.doc,.docx,.csv,.jpg,.jpeg,.png,.txt';
    input.onchange = async function() {
        if (!input.files.length) return;
        showLoading();
        try {
            for (var i = 0; i < input.files.length; i++) {
                await uploadFileToDrive(input.files[i], targetFolder);
            }
            await renderEswuFolder(tipo, targetFolder);
        } catch (e) {
            alert('Error al subir: ' + e.message);
        } finally {
            hideLoading();
        }
    };
    input.click();
}

// ============================================
// HELPERS
// ============================================

async function findEswuFolder(folderName) {
    var q = "name = '" + folderName.replace(/'/g, "\\'") + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    var resp = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name,webViewLink)&key=' + GOOGLE_API_KEY, {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    });
    var data = await resp.json();
    return (data.files && data.files.length > 0) ? data.files[0].id : null;
}

function eswuFileIcon(mt) {
    if (!mt) return '📄';
    if (mt.includes('pdf')) return '📄';
    if (mt.includes('image')) return '🖼️';
    if (mt.includes('spreadsheet') || mt.includes('excel')) return '📊';
    if (mt.includes('document') || mt.includes('word')) return '📝';
    return '📄';
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

async function getOrCreateDocumentosGeneralesFolder() {
    var folderId = await findEswuFolder(ESWU_FOLDER_NAMES.generales);
    if (folderId) return folderId;
    var newFolder = await createDriveFolder(ESWU_FOLDER_NAMES.generales, 'root');
    return newFolder.id;
}

// Find existing ESWU docs folder by name
async function getOrCreateEswuDocsFolder(folderName) {
    var folderId = await findEswuFolder(folderName);
    if (folderId) return folderId;
    // Create under root if not found
    var newFolder = await createDriveFolder(folderName, 'root');
    return newFolder.id;
}

// Create/find: Inmobiliaris ESWU / YEAR / MONTH / Reportes financieros
async function getOrCreateEswuReportesFolder() {
    var mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var now = new Date();
    var year = String(now.getFullYear());
    var month = mesesNombres[now.getMonth()];
    
    // 1. Find or create "Inmobiliaris ESWU"
    var eswuRoot = await findOrCreateSubfolder('Inmobiliaris ESWU', null);
    
    // 2. Find or create YEAR folder
    var yearFolder = await findOrCreateSubfolder(year, eswuRoot);
    
    // 3. Find or create MONTH folder
    var monthFolder = await findOrCreateSubfolder(month, yearFolder);
    
    // 4. Find or create "Reportes financieros"
    var reportesFolder = await findOrCreateSubfolder('Reportes financieros', monthFolder);
    
    return reportesFolder;
}

// Helper: find or create a subfolder inside a parent
async function findOrCreateSubfolder(name, parentId) {
    var safeName = name.replace(/'/g, "\\'");
    var q;
    if (parentId) {
        q = "'" + parentId + "' in parents and name = '" + safeName + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    } else {
        q = "name = '" + safeName + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    }
    
    var resp = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&key=' + GOOGLE_API_KEY, {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    });
    var data = await resp.json();
    
    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    }
    
    // Create it
    var folder = await createDriveFolder(name, parentId || 'root');
    return folder.id;
}

// ============================================
// BANCOS TABLE (moved from Admin)
// ============================================

function renderEswuBancosTable() {
    var table = document.getElementById('eswuBancosTable');
    if (!table) return;
    var tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (typeof bancosDocumentos === 'undefined' || !bancosDocumentos || bancosDocumentos.length === 0) {
        // Try loading first
        if (typeof ensureBancosLoaded === 'function') {
            ensureBancosLoaded().then(function() { renderEswuBancosTable(); });
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:1rem;">Cargando...</td></tr>';
            return;
        }
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light)">No hay documentos</td></tr>';
        return;
    }
    
    var mesesNombres = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    var sorted = bancosDocumentos.slice().sort(function(a, b) {
        if ((b.anio || 0) !== (a.anio || 0)) return (b.anio || 0) - (a.anio || 0);
        return (b.mes || 0) - (a.mes || 0);
    });
    
    var lastMonth = null;
    var shadeToggle = true;
    
    sorted.forEach(function(b) {
        var anio = b.anio || '';
        var mes = b.mes ? mesesNombres[b.mes] : '';
        var monthKey = '' + (b.anio || 0) + '-' + (b.mes || 0);
        var tipo = b.tipo || 'Documento';
        var nombre = b.nombre_archivo || '—';
        var clickAction = '';
        var rowStyle = '';
        
        if (monthKey !== lastMonth) {
            shadeToggle = !shadeToggle;
            lastMonth = monthKey;
        }
        
        var bgColor = shadeToggle ? 'background:#f0f4f8;' : '';
        
        if (b.google_drive_file_id) {
            var safeName = (b.nombre_archivo || tipo).replace(/'/g, "\\'");
            clickAction = "viewDriveFileInline('" + b.google_drive_file_id + "', '" + safeName + "')";
            rowStyle = 'cursor:pointer;';
        }
        
        var tr = document.createElement('tr');
        tr.innerHTML = '<td style="font-size:0.85rem;word-break:break-word;">' + nombre + '</td>' +
            '<td>' + anio + '</td><td>' + mes + '</td><td>' + tipo + '</td>';
        tr.style.cssText = rowStyle + bgColor;
        if (clickAction) {
            tr.onclick = new Function(clickAction);
        }
        tbody.appendChild(tr);
    });
}

// Also keep renderBancosTable pointing to eswu table
function renderBancosTable() {
    renderEswuBancosTable();
}

// ============================================
// DRAG & DROP for document tabs
// ============================================

function initEswuDropZones() {
    initDropZone('eswuLegalesTab', 'legales');
    initDropZone('eswuGeneralesTab', 'generales');
}

function initDropZone(containerId, tipo) {
    var container = document.getElementById(containerId);
    if (!container || container._dropBound) return;
    container._dropBound = true;
    container.style.position = 'relative';
    
    // Create overlay
    var overlay = document.createElement('div');
    overlay.className = 'drop-overlay';
    overlay.style.cssText = 'display:none; position:absolute; top:0; left:0; right:0; bottom:0; min-height:80px; background:rgba(59,130,246,0.08); border:2px dashed var(--primary); border-radius:8px; z-index:10; pointer-events:none; align-items:center; justify-content:center;';
    overlay.innerHTML = '<span style="font-size:1rem; color:var(--primary); font-weight:600; background:white; padding:0.4rem 1rem; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">📁 Suelta aquí para subir</span>';
    container.appendChild(overlay);
    
    var dragCounter = 0;
    
    container.addEventListener('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        overlay.style.display = 'flex';
    });
    
    container.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            overlay.style.display = 'none';
        }
    });
    
    container.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
    
    container.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        overlay.style.display = 'none';
        
        var files = e.dataTransfer.files;
        if (!files || !files.length) return;
        
        handleEswuDrop(tipo, files);
    });
}

async function handleEswuDrop(tipo, files) {
    if (typeof isGoogleConnected !== 'function' || !isGoogleConnected()) {
        alert('Conecta Google Drive primero');
        return;
    }
    
    var targetFolder = eswuCurrentFolders[tipo] || eswuFolderIds[tipo];
    if (!targetFolder) {
        eswuFolderIds[tipo] = await findEswuFolder(ESWU_FOLDER_NAMES[tipo]);
        targetFolder = eswuFolderIds[tipo];
        if (!targetFolder) {
            alert('No se encontró "' + ESWU_FOLDER_NAMES[tipo] + '"');
            return;
        }
    }
    
    showLoading();
    try {
        for (var i = 0; i < files.length; i++) {
            await uploadFileToDrive(files[i], targetFolder);
        }
        await renderEswuFolder(tipo, targetFolder);
    } catch (e) {
        alert('Error al subir: ' + e.message);
    } finally {
        hideLoading();
    }
}

console.log('✅ ESWU-UI.JS v7 cargado');
