/* ========================================
   GOOGLE-DRIVE.JS v1
   OAuth + Drive API for Contabilidad
   ======================================== */

var gdriveAccessToken = null;
var gdriveTokenClient = null;
var gdriveInitialized = false;
var gdriveAutoConnectAttempted = false;

// ============================================
// INITIALIZATION
// ============================================

function initGoogleDrive() {
    if (gdriveInitialized) return;
    
    try {
        gdriveTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: GOOGLE_SCOPES,
            callback: handleGoogleAuthResponse
        });
        gdriveInitialized = true;
        console.log('✅ Google Drive API inicializada');
        
        // Try silent auto-connect if previously connected
        if (!gdriveAutoConnectAttempted && localStorage.getItem('gdrive_was_connected') === 'true') {
            gdriveAutoConnectAttempted = true;
            tryAutoConnect();
        }
    } catch (e) {
        console.error('Error inicializando Google Drive:', e);
    }
}

function tryAutoConnect() {
    try {
        gdriveTokenClient.requestAccessToken({ prompt: '' });
    } catch (e) {
        console.log('Auto-connect silencioso no disponible');
    }
}

function handleGoogleAuthResponse(response) {
    if (response.error) {
        if (response.error === 'user_denied' || response.error === 'access_denied') {
            console.log('Google: acceso denegado o cancelado');
        } else {
            console.error('Google Auth error:', response.error);
        }
        return;
    }
    
    gdriveAccessToken = response.access_token;
    localStorage.setItem('gdrive_was_connected', 'true');
    console.log('✅ Google Drive conectado');
    
    // Refresh contabilidad view
    if (typeof renderContabilidadContent === 'function') {
        renderContabilidadContent();
    }
}

function googleSignIn() {
    if (!gdriveTokenClient) {
        initGoogleDrive();
    }
    
    if (gdriveAccessToken) {
        if (typeof renderContabilidadContent === 'function') {
            renderContabilidadContent();
        }
        return;
    }
    
    gdriveTokenClient.requestAccessToken({ prompt: 'consent' });
}

function isGoogleConnected() {
    return !!gdriveAccessToken;
}

// ============================================
// DRIVE API - LIST FOLDER CONTENTS
// ============================================

async function listDriveFolder(folderId) {
    if (!gdriveAccessToken) throw new Error('No conectado a Google Drive');
    
    const query = `'${folderId}' in parents and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&orderBy=name&pageSize=100&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Error listando carpeta');
    }
    
    const data = await response.json();
    
    // Separate folders and files, sort alphabetically
    const folders = (data.files || [])
        .filter(f => f.mimeType === 'application/vnd.google-apps.folder')
        .sort((a, b) => a.name.localeCompare(b.name));
    
    const files = (data.files || [])
        .filter(f => f.mimeType !== 'application/vnd.google-apps.folder')
        .sort((a, b) => a.name.localeCompare(b.name));
    
    return { folders, files };
}

// ============================================
// DRIVE API - CREATE FOLDER
// ============================================

async function createDriveFolder(name, parentFolderId) {
    if (!gdriveAccessToken) throw new Error('No conectado a Google Drive');
    
    const metadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId]
    };
    
    const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + gdriveAccessToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Error creando carpeta');
    }
    
    return await response.json();
}

// ============================================
// DRIVE API - UPLOAD FILE
// ============================================

async function uploadFileToDrive(file, folderId) {
    if (!gdriveAccessToken) throw new Error('No conectado a Google Drive');
    
    // Use resumable upload for reliability
    const metadata = {
        name: file.name,
        parents: [folderId]
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken },
        body: form
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Error subiendo archivo');
    }
    
    return await response.json();
}

// ============================================
// DRIVE API - SEARCH FILES
// ============================================

async function searchDriveFiles(searchTerm, rootFolderIds) {
    if (!gdriveAccessToken) throw new Error('No conectado a Google Drive');
    
    const query = `name contains '${searchTerm.replace(/'/g, "\\'")}' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,parents)&orderBy=modifiedTime desc&pageSize=50&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Error buscando archivos');
    }
    
    const data = await response.json();
    var files = data.files || [];
    
    // Resolve paths in 3 parallel batches (subfolder → month → year)
    var cache = {};
    
    // Batch 1: Get all unique parent IDs (subfolder level)
    var parentIds = [...new Set(files.map(f => f.parents && f.parents[0]).filter(Boolean))];
    await fetchFoldersBatch(parentIds, cache);
    
    // Batch 2: Get month level (parents of subfolders)
    var monthIds = [...new Set(parentIds.map(id => cache[id] && cache[id].parents && cache[id].parents[0]).filter(Boolean))];
    await fetchFoldersBatch(monthIds, cache);
    
    // Batch 3: Get year level (parents of months)
    var yearIds = [...new Set(monthIds.map(id => cache[id] && cache[id].parents && cache[id].parents[0]).filter(Boolean))];
    await fetchFoldersBatch(yearIds, cache);
    
    // Assign resolved paths to files
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var parentId = f.parents && f.parents[0];
        if (!parentId || !cache[parentId]) continue;
        
        f._subfolder = cache[parentId].name || '';
        var monthId = cache[parentId].parents && cache[parentId].parents[0];
        if (monthId && cache[monthId]) {
            f._month = cache[monthId].name || '';
            var yearId = cache[monthId].parents && cache[monthId].parents[0];
            if (yearId && cache[yearId]) {
                f._year = cache[yearId].name || '';
            }
        }
    }
    
    return files;
}

async function fetchFoldersBatch(ids, cache) {
    if (!ids.length) return;
    // Fetch all in parallel
    var promises = ids.filter(id => !cache[id]).map(id =>
        fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=name,parents&key=${GOOGLE_API_KEY}`, {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
        })
        .then(r => r.ok ? r.json() : { name: '', parents: [] })
        .then(data => { cache[id] = data; })
        .catch(() => { cache[id] = { name: '', parents: [] }; })
    );
    await Promise.all(promises);
}

// ============================================
// HELPER - Extract folder ID from URL
// ============================================

function extractFolderId(url) {
    if (!url) return null;
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

// ============================================
// HELPER - Extract file ID from URL
// ============================================

function extractFileId(url) {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

// ============================================
// HELPER - Get Google Drive preview URL
// ============================================

function getGooglePreviewUrl(fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
}

// ============================================
// INLINE VIEWER - View Drive file in app
// ============================================

function viewDriveFileInline(fileId, fileName) {
    const previewUrl = getGooglePreviewUrl(fileId);
    
    // Reuse the existing PDF viewer pattern
    const viewer = document.getElementById('pdfViewerModal');
    if (viewer) {
        document.getElementById('pdfViewerTitle').textContent = fileName || 'Documento';
        const container = document.getElementById('pdfViewerContainer');
        container.innerHTML = `<iframe src="${previewUrl}" style="width:100%; height:100%; border:none;" allow="autoplay"></iframe>`;
        viewer.classList.add('active');
        return;
    }
    
    // Fallback: create simple fullscreen viewer
    const overlay = document.createElement('div');
    overlay.id = 'driveViewerOverlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:white; z-index:9999; display:flex; flex-direction:column;';
    
    overlay.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 1rem; background:var(--primary); color:white; flex-shrink:0;">
            <span style="font-size:0.9rem; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${fileName || 'Documento'}</span>
            <button onclick="closeDriveViewer()" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer; padding:0 0.5rem;">✕</button>
        </div>
        <iframe src="${previewUrl}" style="flex:1; border:none;" allow="autoplay"></iframe>
    `;
    
    document.body.appendChild(overlay);
}

function closeDriveViewer() {
    const overlay = document.getElementById('driveViewerOverlay');
    if (overlay) overlay.remove();
}

// ============================================
// HELPER - Format file size
// ============================================

function formatFileSize(bytes) {
    if (!bytes) return '';
    const num = parseInt(bytes);
    if (num < 1024) return num + ' B';
    if (num < 1024 * 1024) return (num / 1024).toFixed(0) + ' KB';
    return (num / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============================================
// INQUILINOS - Drive folder management
// ============================================

async function getOrCreateInquilinoFolder(inquilinoNombre) {
    // Search for "Inquilinos" parent folder in Drive
    var q = "name = 'Inquilinos' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    var resp = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&key=' + GOOGLE_API_KEY, {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    });
    var data = await resp.json();
    
    if (!data.files || data.files.length === 0) {
        throw new Error('No se encontró la carpeta "Inquilinos" en Google Drive');
    }
    
    var inquilinosParentId = data.files[0].id;
    
    // Search for inquilino subfolder
    var safeName = inquilinoNombre.replace(/'/g, "\\'");
    var q2 = "'" + inquilinosParentId + "' in parents and name = '" + safeName + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    var resp2 = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q2) + '&fields=files(id,name)&key=' + GOOGLE_API_KEY, {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    });
    var data2 = await resp2.json();
    
    if (data2.files && data2.files.length > 0) {
        return data2.files[0].id;
    }
    
    // Create it
    return await createDriveFolder(inquilinoNombre, inquilinosParentId);
}

// ============================================
// PROVEEDORES - Drive folder management
// ============================================

async function getOrCreateProveedorFolder(proveedorNombre) {
    var q = "name = 'Proveedores' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    var resp = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&key=' + GOOGLE_API_KEY, {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    });
    var data = await resp.json();
    
    if (!data.files || data.files.length === 0) {
        throw new Error('No se encontró la carpeta "Proveedores" en Google Drive');
    }
    
    var proveedoresParentId = data.files[0].id;
    
    var safeName = proveedorNombre.replace(/'/g, "\\'");
    var q2 = "'" + proveedoresParentId + "' in parents and name = '" + safeName + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    var resp2 = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q2) + '&fields=files(id,name)&key=' + GOOGLE_API_KEY, {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    });
    var data2 = await resp2.json();
    
    if (data2.files && data2.files.length > 0) {
        return data2.files[0].id;
    }
    
    return await createDriveFolder(proveedorNombre, proveedoresParentId);
}

console.log('✅ GOOGLE-DRIVE.JS v2 cargado');
