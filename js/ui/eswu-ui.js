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
    if (typeof showHeader === 'function') showHeader();
    if (isMobile()) hideMobileMenu();
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
    renderEswuBancosTable();
    if (typeof renderMensajesFicha === 'function') {
        renderMensajesFicha('eswu', 0);
    }
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
    if (typeof requireGdrive === 'function' && !(await requireGdrive())) { return; }
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
    
    contentDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem;">Cargando...</p>';
    
    // ── STRATEGY 1: Try loading from drive_index (no Google Drive needed) ──
    try {
        var indexItems = await loadDocsFromIndex(ESWU_FOLDER_NAMES[tipo]);
        if (indexItems && indexItems.length > 0) {
            // We got indexed data — use it
            eswuNavStacks[tipo] = [{ label: ESWU_FOLDER_NAMES[tipo], folderId: indexItems._parentId || 'index' }];
            eswuCurrentFolders[tipo] = indexItems._parentId || 'index';
            if (indexItems._parentId) eswuFolderIds[tipo] = indexItems._parentId;
            
            renderEswuBreadcrumb(tipo);
            renderEswuDocsList(tipo, indexItems);
            console.log('📇 ' + ESWU_FOLDER_NAMES[tipo] + ': ' + indexItems.length + ' items del índice');
            return;
        }
    } catch (e) {
        console.log('drive_index lookup failed, fallback to Drive API:', e.message);
    }
    
    // ── STRATEGY 2: Fallback to Google Drive API ──
    if (typeof isGoogleConnected !== 'function' || !isGoogleConnected()) {
        if (retryCount < 3) {
            contentDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem;">Conectando a Google Drive...</p>';
            setTimeout(function() { loadEswuDocsTab(tipo, retryCount + 1); }, 2000);
        } else {
            if (typeof requireGdrive === 'function') {
                requireGdrive().then(function(ok) {
                    if (ok) { loadEswuDocsTab(tipo, 0); }
                    else { contentDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1.5rem;">No se pudo conectar a Google Drive.</p>'; }
                });
            } else {
                contentDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1.5rem;">No se pudo conectar a Google Drive.</p>';
            }
        }
        return;
    }
    
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

// Load docs from Supabase drive_index by folder name or parent_folder_id
async function loadDocsFromIndex(folderNameOrId) {
    if (typeof supabaseClient === 'undefined') return null;
    
    var parentId = folderNameOrId;
    
    // If it looks like a folder name (not a Drive ID), find the folder first
    if (folderNameOrId && folderNameOrId.length > 30 && !folderNameOrId.includes(' ')) {
        // Looks like a Drive folder ID — use directly
        parentId = folderNameOrId;
    } else {
        // It's a folder name — find it in the index
        var { data: folderRow, error: fe } = await supabaseClient
            .from('drive_index')
            .select('drive_file_id')
            .eq('nombre', folderNameOrId)
            .eq('mime_type', 'application/vnd.google-apps.folder')
            .limit(1)
            .single();
        
        if (fe || !folderRow) return null;
        parentId = folderRow.drive_file_id;
    }
    
    // Get all items in this folder
    var { data, error } = await supabaseClient
        .from('drive_index')
        .select('drive_file_id, nombre, mime_type, tamanio, ruta, fecha_modificacion')
        .eq('parent_folder_id', parentId)
        .order('nombre');
    
    if (error || !data || data.length === 0) return null;
    
    // Convert to the same format as listDriveFolder results
    var items = data.map(function(row) {
        return {
            id: row.drive_file_id,
            name: row.nombre,
            mimeType: row.mime_type,
            size: row.tamanio || 0,
            modifiedTime: row.fecha_modificacion,
            _fromIndex: true
        };
    });
    
    // Sort: folders first, then files
    items.sort(function(a, b) {
        var aFolder = a.mimeType === 'application/vnd.google-apps.folder' ? 0 : 1;
        var bFolder = b.mimeType === 'application/vnd.google-apps.folder' ? 0 : 1;
        if (aFolder !== bFolder) return aFolder - bFolder;
        return a.name.localeCompare(b.name);
    });
    
    items._parentId = parentId;
    return items;
}

async function renderEswuFolder(tipo, folderId) {
    var contentDiv = document.getElementById('eswu' + cap(tipo) + 'Content');
    if (!contentDiv) return;
    
    contentDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:0.5rem;">Cargando...</p>';
    
    // Build ruta from nav stack
    var stack = eswuNavStacks[tipo] || [];
    var ruta = stack.map(function(s) { return s.label; }).join('/');
    
    try {
        // Try drive_index first (faster, no Google Drive required)
        var indexItems = await loadDocsFromIndex(folderId);
        if (indexItems && indexItems.length > 0) {
            eswuFolderContents[tipo] = indexItems;
            eswuCurrentFolders[tipo] = folderId;
            renderEswuBreadcrumb(tipo);
            renderEswuDocsList(tipo, indexItems);
            return;
        }
        
        // Fallback to Google Drive API
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
    if (typeof requireGdrive === 'function' && !(await requireGdrive())) { return; }
    
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

// findOrCreateSubfolder() → definida en google-drive.js

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
// DRAG & DROP for document tabs (inline handlers in HTML)
// ============================================

async function handleEswuDrop(tipo, files) {
    if (typeof requireGdrive === 'function' && !(await requireGdrive())) {
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

// Handle banco drop - open modal with file pre-loaded
var bancoPendingDropFile = null;

function handleBancoDrop(files) {
    if (!files || !files.length) return;
    bancoPendingDropFile = files[0]; // Take first file
    
    // Open modal
    if (typeof showAddBancoModal === 'function') showAddBancoModal();
    
    // Pre-fill file name display and set current date
    setTimeout(function() {
        var nameEl = document.getElementById('bancoDocumentoFileName');
        if (nameEl) nameEl.textContent = bancoPendingDropFile.name;
        
        // Remove required from file input since we have the drop file
        var fileInput = document.getElementById('bancoDocumento');
        if (fileInput) fileInput.removeAttribute('required');
        
        var now = new Date();
        var anioEl = document.getElementById('bancoAnio');
        if (anioEl && !anioEl.value) anioEl.value = now.getFullYear();
        var mesEl = document.getElementById('bancoMes');
        if (mesEl && !mesEl.value) mesEl.value = now.getMonth() + 1;
    }, 100);
}

// ============================================
// BALANCE TAB - Ingresos vs Egresos
// ============================================

var MESES_CORTOS = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function initBalanceTab() {
    var sel = document.getElementById('balanceYearSelect');
    if (!sel) return;
    
    var years = new Set();
    var thisYear = new Date().getFullYear();
    years.add(thisYear);
    
    (typeof inquilinos !== 'undefined' ? inquilinos : []).forEach(function(inq) {
        (inq.pagos || []).forEach(function(p) {
            if (p.fecha) years.add(new Date(p.fecha).getFullYear());
        });
    });
    (typeof proveedores !== 'undefined' ? proveedores : []).forEach(function(prov) {
        (prov.facturas || []).forEach(function(f) {
            var d = f.fecha_pago || f.fecha;
            if (d) years.add(new Date(d).getFullYear());
        });
    });
    
    var sortedYears = Array.from(years).sort(function(a, b) { return b - a; });
    sel.innerHTML = sortedYears.map(function(y) {
        return '<option value="' + y + '"' + (y === thisYear ? ' selected' : '') + '>' + y + '</option>';
    }).join('');
    
    var mSel = document.getElementById('balanceMonthSelect');
    if (mSel) mSel.value = '0';
    
    renderBalanceTab();
}

// Balance sort state
var balanceSortBy = 'fecha'; // 'fecha' or 'concepto'
var balanceSortAsc = true;

function toggleBalanceSort(field) {
    if (balanceSortBy === field) {
        balanceSortAsc = !balanceSortAsc;
    } else {
        balanceSortBy = field;
        balanceSortAsc = true;
    }
    // Update header indicators
    document.getElementById('balSortFecha').textContent = balanceSortBy === 'fecha' ? (balanceSortAsc ? '▲' : '▼') : '';
    document.getElementById('balSortConcepto').textContent = balanceSortBy === 'concepto' ? (balanceSortAsc ? '▲' : '▼') : '';
    renderBalanceTab();
}

function renderBalanceTab() {
    var tbody = document.querySelector('#eswuBalanceTable tbody');
    if (!tbody) return;
    
    // Get or create mobile div
    var mobileDiv = document.getElementById('balanceMobileCards');
    if (!mobileDiv) {
        var tableContainer = document.getElementById('eswuBalanceTable').closest('.table-container');
        if (tableContainer) {
            mobileDiv = document.createElement('div');
            mobileDiv.id = 'balanceMobileCards';
            mobileDiv.className = 'show-mobile-only';
            tableContainer.parentElement.appendChild(mobileDiv);
        }
    }
    if (mobileDiv) mobileDiv.innerHTML = '';
    
    var yearSel = document.getElementById('balanceYearSelect');
    var monthSel = document.getElementById('balanceMonthSelect');
    var filterYear = yearSel ? parseInt(yearSel.value) : new Date().getFullYear();
    var filterMonth = monthSel ? parseInt(monthSel.value) : 0;
    
    var rows = [];
    
    // INGRESOS — pagos de inquilinos
    (typeof inquilinos !== 'undefined' ? inquilinos : []).forEach(function(inq) {
        (inq.pagos || []).forEach(function(p) {
            if (!p.fecha || !p.monto) return;
            var d = new Date(p.fecha);
            if (d.getFullYear() !== filterYear) return;
            if (filterMonth && (d.getMonth() + 1) !== filterMonth) return;
            rows.push({
                fecha: p.fecha,
                concepto: inq.nombre,
                ingreso: parseFloat(p.monto) || 0,
                egreso: 0
            });
        });
    });
    
    // EGRESOS — facturas de proveedores (pagadas)
    (typeof proveedores !== 'undefined' ? proveedores : []).forEach(function(prov) {
        (prov.facturas || []).forEach(function(f) {
            var fechaRef = f.fecha_pago || f.fecha;
            if (!fechaRef) return;
            var d = new Date(fechaRef);
            if (d.getFullYear() !== filterYear) return;
            if (filterMonth && (d.getMonth() + 1) !== filterMonth) return;
            var montoTotal = (parseFloat(f.monto) || 0) + (parseFloat(f.iva) || 0);
            rows.push({
                fecha: fechaRef,
                concepto: prov.nombre + (f.numero ? ' #' + f.numero : ''),
                ingreso: 0,
                egreso: montoTotal
            });
        });
    });
    
    // Sort
    if (balanceSortBy === 'fecha') {
        rows.sort(function(a, b) {
            var diff = new Date(a.fecha) - new Date(b.fecha);
            return balanceSortAsc ? diff : -diff;
        });
    } else {
        rows.sort(function(a, b) {
            var diff = a.concepto.localeCompare(b.concepto);
            if (diff === 0) diff = new Date(a.fecha) - new Date(b.fecha);
            return balanceSortAsc ? diff : -diff;
        });
    }
    
    // === DESKTOP TABLE ===
    tbody.innerHTML = '';
    var totalIngresos = 0;
    var totalEgresos = 0;
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:1.5rem;">No hay movimientos en este periodo</td></tr>';
    } else {
        // Group for subtotals
        var currentGroup = null;
        var groupIngresos = 0;
        var groupEgresos = 0;
        
        function getGroupKey(row) {
            if (balanceSortBy === 'fecha') {
                return fmtFechaCorta(row.fecha);
            } else {
                // Group by base concept name (without invoice #)
                return row.concepto.split(' #')[0];
            }
        }
        
        function flushGroup() {
            if (currentGroup === null) return;
            if (groupIngresos || groupEgresos) {
                var trSub = document.createElement('tr');
                trSub.style.cssText = 'background:#f0f4f8;font-weight:600;font-size:0.82em;';
                trSub.innerHTML = '<td></td><td style="color:var(--text-light);">Subtotal ' + currentGroup + '</td>' +
                    '<td style="text-align:right;color:var(--success);">' + (groupIngresos ? fmtMonto(groupIngresos) : '') + '</td>' +
                    '<td style="text-align:right;color:var(--danger);">' + (groupEgresos ? fmtMonto(groupEgresos) : '') + '</td>';
                tbody.appendChild(trSub);
            }
        }
        
        rows.forEach(function(r) {
            var groupKey = getGroupKey(r);
            if (groupKey !== currentGroup) {
                flushGroup();
                currentGroup = groupKey;
                groupIngresos = 0;
                groupEgresos = 0;
            }
            
            totalIngresos += r.ingreso;
            totalEgresos += r.egreso;
            groupIngresos += r.ingreso;
            groupEgresos += r.egreso;
            
            var tr = document.createElement('tr');
            tr.innerHTML = '<td style="white-space:nowrap;">' + fmtFechaCorta(r.fecha) + '</td>' +
                '<td>' + r.concepto + '</td>' +
                '<td style="text-align:right;color:var(--success);">' + (r.ingreso ? fmtMonto(r.ingreso) : '') + '</td>' +
                '<td style="text-align:right;color:var(--danger);">' + (r.egreso ? fmtMonto(r.egreso) : '') + '</td>';
            tbody.appendChild(tr);
        });
        // Final group subtotal
        flushGroup();
        
        var balance = totalIngresos - totalEgresos;
        var balColor = balance >= 0 ? 'var(--success)' : 'var(--danger)';
        
        var trTotals = document.createElement('tr');
        trTotals.style.cssText = 'border-top:2px solid var(--primary);font-weight:700;';
        trTotals.innerHTML = '<td></td><td>Totales</td>' +
            '<td style="text-align:right;color:var(--success);">' + fmtMonto(totalIngresos) + '</td>' +
            '<td style="text-align:right;color:var(--danger);">' + fmtMonto(totalEgresos) + '</td>';
        tbody.appendChild(trTotals);
        
        var trBalance = document.createElement('tr');
        trBalance.style.cssText = 'font-weight:700;';
        trBalance.innerHTML = '<td></td><td>Balance</td>' +
            '<td colspan="2" style="text-align:right;color:' + balColor + ';font-size:1em;">' + fmtMonto(balance) + '</td>';
        tbody.appendChild(trBalance);
    }
    
    // === MOBILE CARDS ===
    if (!mobileDiv) return;
    
    if (rows.length === 0) {
        mobileDiv.innerHTML = '<p class="mc-empty">No hay movimientos en este periodo</p>';
        return;
    }
    
    var mh = '';
    // Sort toggle for mobile
    mh += '<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">';
    mh += '<button onclick="toggleBalanceSort(\'fecha\')" style="flex:1;padding:0.35rem;border:1px solid var(--border);border-radius:4px;background:' + (balanceSortBy === 'fecha' ? 'var(--primary);color:white;' : '#f1f5f9;color:var(--text);') + 'font-size:0.72rem;font-weight:600;cursor:pointer;">Fecha ' + (balanceSortBy === 'fecha' ? (balanceSortAsc ? '▲' : '▼') : '') + '</button>';
    mh += '<button onclick="toggleBalanceSort(\'concepto\')" style="flex:1;padding:0.35rem;border:1px solid var(--border);border-radius:4px;background:' + (balanceSortBy === 'concepto' ? 'var(--primary);color:white;' : '#f1f5f9;color:var(--text);') + 'font-size:0.72rem;font-weight:600;cursor:pointer;">Concepto ' + (balanceSortBy === 'concepto' ? (balanceSortAsc ? '▲' : '▼') : '') + '</button>';
    mh += '</div>';
    
    // Scrollable container
    mh += '<div style="max-height:60vh;overflow-y:auto;border:1px solid var(--border);border-radius:6px;position:relative;">';
    // Sticky Header
    mh += '<div style="position:sticky;top:0;z-index:10;background:white;display:flex;padding:0.25rem 0.6rem;border-bottom:2px solid var(--border);font-size:0.62rem;font-weight:600;color:var(--text-light);text-transform:uppercase;">';
    mh += '<div style="flex:1;">Concepto</div>';
    mh += '<div style="width:80px;text-align:right;">Ingreso</div>';
    mh += '<div style="width:80px;text-align:right;">Egreso</div>';
    mh += '</div>';
    
    var mobileGroup = null;
    var mGroupIng = 0;
    var mGroupEgr = 0;
    
    function mobileGroupKey(r) {
        if (balanceSortBy === 'fecha') return fmtFechaCorta(r.fecha);
        return r.concepto.split(' #')[0];
    }
    
    function mobileFlushGroup() {
        if (mobileGroup === null) return '';
        if (!mGroupIng && !mGroupEgr) return '';
        var s = '<div style="display:flex;padding:0.25rem 0.6rem;background:#f0f4f8;font-size:0.68rem;font-weight:600;color:var(--text-light);border-bottom:1px solid var(--border);">';
        s += '<div style="flex:1;">Sub. ' + (mobileGroup.length > 18 ? mobileGroup.substring(0,16) + '…' : mobileGroup) + '</div>';
        s += '<div style="width:80px;text-align:right;color:var(--success);">' + (mGroupIng ? fmtMonto(mGroupIng) : '') + '</div>';
        s += '<div style="width:80px;text-align:right;color:var(--danger);">' + (mGroupEgr ? fmtMonto(mGroupEgr) : '') + '</div>';
        s += '</div>';
        return s;
    }
    
    rows.forEach(function(r, idx) {
        var gk = mobileGroupKey(r);
        if (gk !== mobileGroup) {
            mh += mobileFlushGroup();
            mobileGroup = gk;
            mGroupIng = 0;
            mGroupEgr = 0;
        }
        mGroupIng += r.ingreso;
        mGroupEgr += r.egreso;
        
        var concepto = r.concepto.length > 25 ? r.concepto.substring(0, 23) + '…' : r.concepto;
        var ingresoStr = r.ingreso ? fmtMonto(r.ingreso) : '';
        var egresoStr = r.egreso ? fmtMonto(r.egreso) : '';
        
        mh += '<div class="mc-row' + (idx % 2 ? ' mc-row-odd' : '') + '" style="cursor:default;padding:0.3rem 0.6rem;">';
        mh += '<div class="mc-title" style="font-size:0.75rem;">' + concepto + '</div>';
        mh += '<div style="display:flex;align-items:baseline;gap:0.3rem;">';
        mh += '<div class="mc-meta" style="font-size:0.62rem;flex-shrink:0;">' + fmtFechaCorta(r.fecha) + '</div>';
        mh += '<div style="flex:1;"></div>';
        mh += '<div style="width:80px;text-align:right;font-size:0.72rem;font-weight:600;color:var(--success);flex-shrink:0;">' + ingresoStr + '</div>';
        mh += '<div style="width:80px;text-align:right;font-size:0.72rem;font-weight:600;color:var(--danger);flex-shrink:0;">' + egresoStr + '</div>';
        mh += '</div>';
        mh += '</div>';
    });
    // Final mobile group subtotal
    mh += mobileFlushGroup();
    
    // Sticky Totals — each on its own line
    var balance = totalIngresos - totalEgresos;
    var balColor = balance >= 0 ? 'color:var(--success);' : 'color:var(--danger);';
    mh += '<div style="position:sticky;bottom:0;z-index:10;">';
    mh += '<div style="padding:0.4rem 0.6rem;border-top:2px solid var(--primary);font-weight:700;font-size:0.75rem;background:#e6f2ff;">';
    mh += '<div style="display:flex;margin-bottom:0.15rem;"><div style="flex:1;">Total Ingresos</div><div style="text-align:right;color:var(--success);">' + fmtMonto(totalIngresos) + '</div></div>';
    mh += '<div style="display:flex;"><div style="flex:1;">Total Egresos</div><div style="text-align:right;color:var(--danger);">' + fmtMonto(totalEgresos) + '</div></div>';
    mh += '</div>';
    mh += '<div style="display:flex;padding:0.4rem 0.6rem;font-weight:700;font-size:0.8rem;background:#f0f4f8;">';
    mh += '<div style="flex:1;">Balance</div>';
    mh += '<div style="text-align:right;' + balColor + '">' + fmtMonto(balance) + '</div>';
    mh += '</div>';
    mh += '</div>'; // close sticky totals
    mh += '</div>'; // close scrollable container
    
    mobileDiv.innerHTML = mh;
}

// Formato fecha: "25 feb 26"
function fmtFechaCorta(dateStr) {
    if (!dateStr) return '—';
    var d = new Date(dateStr);
    var dd = d.getDate();
    var mm = MESES_CORTOS[d.getMonth() + 1];
    var yy = String(d.getFullYear()).slice(-2);
    return dd + ' ' + mm + ' ' + yy;
}

// Formato moneda
function fmtMonto(amount) {
    if (!amount && amount !== 0) return '';
    var prefix = amount < 0 ? '-$' : '$';
    return prefix + Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

console.log('✅ ESWU-UI.JS v10 cargado');
