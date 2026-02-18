/* ========================================
   ESWU-UI.JS v1
   Documentos Generales y Legales
   ======================================== */

var eswuCurrentFolder = null;     // current Drive folder ID
var eswuFolderType = 'generales'; // 'generales' or 'legales'
var eswuNavStack = [];            // breadcrumb: [{label, folderId}]

// Nombres de carpetas en Google Drive (dentro de Inmobiliaris ESWU)
var ESWU_FOLDER_NAMES = {
    generales: 'Documentos Generales',
    legales: 'Documentos Legales'
};

// ============================================
// SHOW ESWU DOCS PAGE
// ============================================

function showEswuDocsPage(tipo) {
    eswuFolderType = tipo || 'generales';
    eswuNavStack = [];
    eswuCurrentFolder = null;
    
    document.getElementById('eswuSubMenu').classList.remove('active');
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.getElementById('eswuDocsPage').classList.add('active');
    
    currentSubContext = 'eswu-docs';
    currentMenuContext = 'eswu';
    
    document.getElementById('btnRegresa').classList.remove('hidden');
    document.getElementById('btnSearch').classList.add('hidden');
    document.getElementById('contentArea').classList.remove('with-submenu');
    document.getElementById('menuSidebar').classList.add('hidden');
    document.getElementById('contentArea').classList.add('fullwidth');
    
    var title = tipo === 'legales' ? 'ESWU - Documentos Legales' : 'ESWU - Documentos Generales';
    document.getElementById('eswuDocsTitle').textContent = title;
    
    loadEswuRootFolder();
}

// ============================================
// FIND ROOT FOLDER IN DRIVE
// ============================================

async function loadEswuRootFolder() {
    var content = document.getElementById('eswuDocsContent');
    
    if (typeof isGoogleConnected !== 'function' || !isGoogleConnected()) {
        content.innerHTML = '<div style="text-align:center;padding:2rem;"><p style="color:var(--text-light);margin-bottom:1rem;">Conecta Google Drive para ver documentos.</p><button onclick="googleSignIn()" style="background:var(--primary);color:white;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;">Conectar Google Drive</button></div>';
        document.getElementById('eswuUploadBtn').style.display = 'none';
        return;
    }
    
    content.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:2rem;">Cargando...</p>';
    
    try {
        var folderName = ESWU_FOLDER_NAMES[eswuFolderType];
        var folderId = await findEswuFolder(folderName);
        
        if (!folderId) {
            content.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:2rem;">No se encontró la carpeta "' + folderName + '" en Google Drive.</p>';
            document.getElementById('eswuUploadBtn').style.display = 'none';
            return;
        }
        
        eswuCurrentFolder = folderId;
        eswuNavStack = [{ label: folderName, folderId: folderId }];
        renderEswuBreadcrumb();
        await renderEswuFolderContents(folderId);
        
    } catch (e) {
        console.error('Error cargando carpeta ESWU:', e);
        content.innerHTML = '<p style="color:var(--danger);text-align:center;padding:2rem;">Error: ' + e.message + '</p>';
    }
}

async function findEswuFolder(folderName) {
    // Search for folder by name under root
    var q = "name = '" + folderName.replace(/'/g, "\\'") + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    var resp = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&key=' + GOOGLE_API_KEY, {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    });
    var data = await resp.json();
    return (data.files && data.files.length > 0) ? data.files[0].id : null;
}

// ============================================
// RENDER FOLDER CONTENTS
// ============================================

async function renderEswuFolderContents(folderId) {
    var content = document.getElementById('eswuDocsContent');
    content.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem;">Cargando...</p>';
    
    try {
        var result = await listDriveFolder(folderId);
        var folders = result.folders || [];
        var files = result.files || [];
        
        if (folders.length === 0 && files.length === 0) {
            content.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:2rem;">Carpeta vacía</p>';
            document.getElementById('eswuUploadBtn').style.display = 'inline';
            return;
        }
        
        var html = '<div style="display:flex;flex-direction:column;gap:0.4rem;">';
        
        // Folders
        folders.forEach(function(f) {
            html += '<div onclick="openEswuSubfolder(\'' + f.name.replace(/'/g, "\\'") + '\', \'' + f.id + '\')" style="background:white; border:1px solid var(--border); border-radius:8px; padding:0.6rem 0.8rem; display:flex; align-items:center; gap:0.5rem; cursor:pointer; transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,0.12)\'" onmouseout="this.style.boxShadow=\'none\'">';
            html += '<span style="font-size:1.3rem;">📁</span>';
            html += '<span style="font-weight:500;font-size:0.9rem;">' + f.name + '</span>';
            html += '</div>';
        });
        
        // Files
        files.forEach(function(f) {
            var icon = getFileIcon(f.mimeType);
            var size = formatFileSize(f.size);
            html += '<div style="background:white; border:1px solid var(--border); border-radius:8px; padding:0.5rem 0.8rem; display:flex; align-items:center; gap:0.5rem;">';
            html += '<span style="font-size:1.1rem;">' + icon + '</span>';
            html += '<div style="flex:1;min-width:0;">';
            html += '<span onclick="viewDriveFileInline(\'' + f.id + '\', \'' + f.name.replace(/'/g, "\\'") + '\')" style="font-size:0.88rem;color:var(--primary);cursor:pointer;text-decoration:underline;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + f.name + '</span>';
            if (size) html += '<span style="font-size:0.72rem;color:var(--text-light);">' + size + '</span>';
            html += '</div>';
            html += '</div>';
        });
        
        html += '</div>';
        content.innerHTML = html;
        
        // Show upload button when inside a folder (not root level with subfolders)
        document.getElementById('eswuUploadBtn').style.display = 'inline';
        
    } catch (e) {
        console.error('Error renderizando carpeta:', e);
        content.innerHTML = '<p style="color:var(--danger);text-align:center;padding:2rem;">Error: ' + e.message + '</p>';
    }
}

function getFileIcon(mimeType) {
    if (!mimeType) return '📄';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return '📊';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
    return '📄';
}

// ============================================
// SUBFOLDER NAVIGATION
// ============================================

function openEswuSubfolder(name, folderId) {
    eswuNavStack.push({ label: name, folderId: folderId });
    eswuCurrentFolder = folderId;
    renderEswuBreadcrumb();
    renderEswuFolderContents(folderId);
}

function eswuNavigateTo(index) {
    eswuNavStack = eswuNavStack.slice(0, index + 1);
    eswuCurrentFolder = eswuNavStack[index].folderId;
    renderEswuBreadcrumb();
    renderEswuFolderContents(eswuCurrentFolder);
}

function renderEswuBreadcrumb() {
    var div = document.getElementById('eswuDocsBreadcrumb');
    if (!div || eswuNavStack.length <= 1) {
        if (div) div.innerHTML = '';
        return;
    }
    var html = '';
    eswuNavStack.forEach(function(item, i) {
        if (i > 0) html += ' <span style="color:var(--text-light);margin:0 0.2rem;">›</span> ';
        if (i < eswuNavStack.length - 1) {
            html += '<span onclick="eswuNavigateTo(' + i + ')" style="color:var(--primary);cursor:pointer;font-size:0.85rem;">' + item.label + '</span>';
        } else {
            html += '<span style="font-weight:600;font-size:0.85rem;">' + item.label + '</span>';
        }
    });
    div.innerHTML = html;
}

// ============================================
// UPLOAD TO CURRENT FOLDER
// ============================================

async function uploadToEswuFolder() {
    if (!eswuCurrentFolder) {
        alert('No hay carpeta seleccionada');
        return;
    }
    if (typeof isGoogleConnected !== 'function' || !isGoogleConnected()) {
        alert('Conecta Google Drive primero');
        return;
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
                await uploadFileToDrive(input.files[i], eswuCurrentFolder);
            }
            await renderEswuFolderContents(eswuCurrentFolder);
        } catch (e) {
            alert('Error al subir: ' + e.message);
        } finally {
            hideLoading();
        }
    };
    input.click();
}

// ============================================
// HELPER: Get or create "Documentos Generales" folder
// For general message attachments
// ============================================

async function getOrCreateDocumentosGeneralesFolder() {
    var folderName = 'Documentos Generales';
    var folderId = await findEswuFolder(folderName);
    if (folderId) return folderId;
    
    // Create it under the root (or you could create it under a parent)
    var newFolder = await createDriveFolder(folderName, 'root');
    return newFolder.id;
}

console.log('✅ ESWU-UI.JS cargado');
