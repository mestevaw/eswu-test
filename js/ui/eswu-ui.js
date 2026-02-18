/* ========================================
   ESWU-UI.JS v2
   Ficha ESWU - Docs Legales, Generales, Mensajes
   ======================================== */

var eswuFolderIds = { legales: null, generales: null };
var eswuFolderContents = { legales: [], generales: [] };

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
    
    document.getElementById('btnRegresa').classList.remove('hidden');
    document.getElementById('btnSearch').classList.add('hidden');
    document.getElementById('contentArea').classList.remove('with-submenu');
    document.getElementById('menuSidebar').classList.add('hidden');
    document.getElementById('contentArea').classList.add('fullwidth');
    
    renderEswuFicha();
}

// ============================================
// RENDER FICHA
// ============================================

function renderEswuFicha() {
    // Acta Constitutiva link
    var actaDiv = document.getElementById('eswuActaSection');
    actaDiv.innerHTML = '<div style="background:var(--bg);border-radius:6px;padding:0.5rem 0.75rem;display:inline-block;margin-bottom:0.1rem;">' +
        '<div style="font-size:0.65rem;color:var(--text-light);text-transform:uppercase;font-weight:600;">Acta Constitutiva</div>' +
        '<div style="font-size:0.85rem;color:var(--text-light);font-style:italic;">Ver en Documentos Legales</div>' +
        '</div>';
    
    // Contactos = usuarios activos
    var contactsDiv = document.getElementById('eswuContactsList');
    var activeUsers = (typeof usuarios !== 'undefined') ? usuarios.filter(function(u) { return u.activo; }) : [];
    
    if (activeUsers.length > 0) {
        var html = '<div style="display:flex;flex-wrap:wrap;gap:0.35rem;">';
        activeUsers.forEach(function(u) {
            html += '<div style="flex:1;min-width:140px;background:var(--bg);border-radius:8px;padding:0.4rem 0.6rem;">';
            html += '<div style="font-size:0.88rem;font-weight:600;">' + u.nombre + '</div>';
            if (u.email) html += '<div style="font-size:0.75rem;color:var(--text-light);">✉️ ' + u.email + '</div>';
            html += '</div>';
        });
        html += '</div>';
        contactsDiv.innerHTML = html;
    } else {
        contactsDiv.innerHTML = '';
    }
    
    // Load doc tabs
    loadEswuDocsTab('legales');
    loadEswuDocsTab('generales');
    
    // Load messages
    if (typeof renderMensajesFicha === 'function') {
        renderMensajesFicha('eswu', 0);
    }
}

// ============================================
// LOAD DOCS TAB
// ============================================

async function loadEswuDocsTab(tipo) {
    var contentDiv = document.getElementById('eswu' + cap(tipo) + 'Content');
    if (!contentDiv) return;
    
    if (typeof isGoogleConnected !== 'function' || !isGoogleConnected()) {
        contentDiv.innerHTML = '<div style="text-align:center;padding:1.5rem;"><p style="color:var(--text-light);margin-bottom:0.5rem;">Conecta Google Drive para ver documentos.</p></div>';
        return;
    }
    
    contentDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem;">Cargando...</p>';
    
    try {
        if (!eswuFolderIds[tipo]) {
            eswuFolderIds[tipo] = await findEswuFolder(ESWU_FOLDER_NAMES[tipo]);
        }
        
        if (!eswuFolderIds[tipo]) {
            contentDiv.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1.5rem;">No se encontró la carpeta "' + ESWU_FOLDER_NAMES[tipo] + '" en Google Drive.</p>';
            return;
        }
        
        var result = await listDriveFolder(eswuFolderIds[tipo]);
        var allItems = (result.folders || []).concat(result.files || []);
        eswuFolderContents[tipo] = allItems;
        renderEswuDocsList(tipo, allItems);
        
    } catch (e) {
        console.error('Error cargando docs ESWU:', e);
        contentDiv.innerHTML = '<p style="color:var(--danger);text-align:center;padding:1rem;">Error: ' + e.message + '</p>';
    }
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
            var fUrl = f.webViewLink || ('https://drive.google.com/drive/folders/' + f.id);
            html += '<div onclick="window.open(\'' + fUrl + '\', \'_blank\')" style="background:white;border:1px solid var(--border);border-radius:8px;padding:0.5rem 0.7rem;display:flex;align-items:center;gap:0.5rem;cursor:pointer;transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow=\'0 2px 6px rgba(0,0,0,0.1)\'" onmouseout="this.style.boxShadow=\'none\'">';
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
// UPLOAD
// ============================================

async function uploadToEswuFolder(tipo) {
    if (typeof isGoogleConnected !== 'function' || !isGoogleConnected()) {
        alert('Conecta Google Drive primero');
        return;
    }
    
    if (!eswuFolderIds[tipo]) {
        eswuFolderIds[tipo] = await findEswuFolder(ESWU_FOLDER_NAMES[tipo]);
        if (!eswuFolderIds[tipo]) {
            alert('No se encontró la carpeta "' + ESWU_FOLDER_NAMES[tipo] + '" en Google Drive.');
            return;
        }
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
                await uploadFileToDrive(input.files[i], eswuFolderIds[tipo]);
            }
            eswuFolderIds[tipo] = null;
            await loadEswuDocsTab(tipo);
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

console.log('✅ ESWU-UI.JS v2 cargado');
