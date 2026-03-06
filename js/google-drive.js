/* ========================================
   GOOGLE-DRIVE.JS v3
   OAuth (persistent) + Drive API + Mobile PDF
   ======================================== */

var gdriveAccessToken = null;
var gdriveTokenClient = null;
var gdriveInitialized = false;
var gdriveAutoConnectAttempted = false;
var gdriveTokenExpiry = 0;
var gdriveRefreshTimer = null;

// ============================================
// INITIALIZATION
// ============================================

function initGoogleDrive() {
    if (gdriveInitialized) return;
    
    try {
        // Restore token from storage if still valid
        var storedToken = localStorage.getItem('gdrive_token');
        var storedExpiry = parseInt(localStorage.getItem('gdrive_token_expiry') || '0');
        var storedHint = localStorage.getItem('gdrive_login_hint') || '';
        
        if (storedToken && storedExpiry > Date.now() + 60000) {
            gdriveAccessToken = storedToken;
            gdriveTokenExpiry = storedExpiry;
            scheduleTokenRefresh();
            console.log('✅ Google Drive token restaurado (' + Math.round((storedExpiry - Date.now()) / 60000) + ' min restantes)');
        }
        
        gdriveTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: GOOGLE_SCOPES,
            callback: handleGoogleAuthResponse,
            hint: storedHint || undefined
        });
        gdriveInitialized = true;
        console.log('✅ Google Drive API inicializada');
        if (typeof updateGdriveStatus === 'function') updateGdriveStatus();
        
        // Auto-reconnect silently if previously connected but token expired
        if (!gdriveAccessToken && !gdriveAutoConnectAttempted && localStorage.getItem('gdrive_was_connected') === 'true') {
            gdriveAutoConnectAttempted = true;
            tryAutoConnect();
        }
    } catch (e) {
        console.error('Error inicializando Google Drive:', e);
    }
}

function tryAutoConnect() {
    try {
        var hint = localStorage.getItem('gdrive_login_hint') || '';
        gdriveTokenClient.requestAccessToken({ 
            prompt: '', 
            login_hint: hint || undefined 
        });
    } catch (e) {
        console.log('Auto-connect silencioso no disponible');
    }
}

function scheduleTokenRefresh() {
    if (gdriveRefreshTimer) clearTimeout(gdriveRefreshTimer);
    
    // Refresh 5 min before expiry
    var msUntilRefresh = gdriveTokenExpiry - Date.now() - (5 * 60 * 1000);
    if (msUntilRefresh < 10000) msUntilRefresh = 10000; // min 10s
    
    gdriveRefreshTimer = setTimeout(function() {
        console.log('🔄 Auto-refrescando token de Google Drive...');
        tryAutoConnect();
    }, msUntilRefresh);
    
    console.log('⏱️ Token refresh programado en ' + Math.round(msUntilRefresh / 60000) + ' min');
}

// ============================================
// AUTH RESPONSE
// ============================================

var gdrivePostConnectCallbacks = [];

function handleGoogleAuthResponse(response) {
    if (response.error) {
        if (response.error === 'user_denied' || response.error === 'access_denied') {
            console.log('Google: acceso denegado o cancelado');
        } else {
            console.error('Google Auth error:', response.error);
        }
        gdrivePostConnectCallbacks = [];
        return;
    }
    
    gdriveAccessToken = response.access_token;
    
    // Persist token + expiry
    var expiresIn = (response.expires_in || 3600) * 1000;
    gdriveTokenExpiry = Date.now() + expiresIn;
    localStorage.setItem('gdrive_was_connected', 'true');
    localStorage.setItem('gdrive_token', gdriveAccessToken);
    localStorage.setItem('gdrive_token_expiry', String(gdriveTokenExpiry));
    
    // Schedule auto-refresh before expiry
    scheduleTokenRefresh();
    
    console.log('✅ Google Drive conectado (' + Math.round(expiresIn / 60000) + ' min)');
    
    // Dismiss connect banner if showing
    if (typeof dismissGdriveBanner === 'function') dismissGdriveBanner();
    if (typeof updateGdriveStatus === 'function') updateGdriveStatus();
    
    // Save login_hint (skips account picker next time)
    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    }).then(function(r) { return r.json(); }).then(function(info) {
        if (info.email) {
            localStorage.setItem('gdrive_login_hint', info.email);
        }
    }).catch(function() {});
    
    // Refresh active views
    if (typeof renderContabilidadContent === 'function') {
        renderContabilidadContent();
    }
    var eswuPage = document.getElementById('eswuDocsPage');
    if (eswuPage && eswuPage.classList.contains('active')) {
        if (typeof loadEswuDocsTab === 'function') {
            loadEswuDocsTab('legales');
            loadEswuDocsTab('generales');
        }
        if (typeof renderEswuBancosTable === 'function') {
            renderEswuBancosTable();
        }
    }
    
    // Execute pending callbacks
    var cbs = gdrivePostConnectCallbacks;
    gdrivePostConnectCallbacks = [];
    cbs.forEach(function(cb) { try { cb(); } catch(e) {} });
}

function googleSignIn() {
    if (!gdriveTokenClient) {
        initGoogleDrive();
    }
    
    // Token still valid → just refresh views
    if (gdriveAccessToken && gdriveTokenExpiry > Date.now() + 60000) {
        if (typeof renderContabilidadContent === 'function') renderContabilidadContent();
        return;
    }
    
    gdriveAccessToken = null;
    
    var hint = localStorage.getItem('gdrive_login_hint') || '';
    gdriveTokenClient.requestAccessToken({ 
        prompt: hint ? '' : 'consent',
        login_hint: hint || undefined
    });
}

function isGoogleConnected() {
    // Also check expiry
    if (gdriveAccessToken && gdriveTokenExpiry > Date.now() + 30000) {
        return true;
    }
    // Token expired — try silent refresh if possible
    if (gdriveAccessToken && gdriveTokenExpiry <= Date.now() + 30000) {
        gdriveAccessToken = null;
        localStorage.removeItem('gdrive_token');
        if (gdriveTokenClient && localStorage.getItem('gdrive_was_connected') === 'true') {
            tryAutoConnect();
        }
    }
    return false;
}

// Ensure valid token before API call (returns promise)
async function ensureGdriveToken() {
    if (gdriveAccessToken && gdriveTokenExpiry > Date.now() + 30000) {
        return true;
    }
    
    // Try silent refresh
    return new Promise(function(resolve) {
        gdrivePostConnectCallbacks.push(function() {
            resolve(!!gdriveAccessToken);
        });
        
        // Timeout after 5s
        setTimeout(function() { resolve(false); }, 5000);
        
        tryAutoConnect();
    });
}

// Helper: require Google Drive connected before an action.
// Tries silent reconnect first. If all fails, triggers interactive sign-in.
// Returns true if connected, false if user still not connected.
async function requireGdrive() {
    // Already connected?
    if (gdriveAccessToken && gdriveTokenExpiry > Date.now() + 30000) {
        return true;
    }
    
    // Try silent auto-connect first
    var ok = await ensureGdriveToken();
    if (ok) return true;
    
    // Last resort: interactive sign-in (returns a promise that resolves when done)
    return new Promise(function(resolve) {
        gdrivePostConnectCallbacks.push(function() {
            resolve(!!gdriveAccessToken);
        });
        setTimeout(function() { resolve(false); }, 30000); // 30s timeout for interactive
        googleSignIn();
    });
}

// ============================================
// DRIVE API - LIST FOLDER CONTENTS
// ============================================

function sanitizeDriveId(id) {
    if (!id) return id;
    if (typeof id === 'object' && id.id) return id.id;
    if (typeof id === 'string' && id.startsWith('{')) {
        try { return JSON.parse(id).id || id; } catch(e) {}
    }
    return id;
}

async function listDriveFolder(folderId, ruta) {
    if (!gdriveAccessToken) throw new Error('No conectado a Google Drive');
    folderId = sanitizeDriveId(folderId);
    
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
    
    const folders = (data.files || [])
        .filter(f => f.mimeType === 'application/vnd.google-apps.folder')
        .sort((a, b) => a.name.localeCompare(b.name));
    
    const files = (data.files || [])
        .filter(f => f.mimeType !== 'application/vnd.google-apps.folder')
        .sort((a, b) => a.name.localeCompare(b.name));
    
    // Index files to Supabase (non-blocking)
    if (files.length > 0 || folders.length > 0) {
        indexDriveItems(data.files || [], folderId, ruta || '');
    }
    
    return { folders, files };
}

// ============================================
// DRIVE INDEX - Index files to Supabase
// ============================================

function indexDriveItems(items, parentFolderId, ruta) {
    if (!items || !items.length) return;
    if (typeof supabaseClient === 'undefined') return;
    
    var rows = items.map(function(f) {
        return {
            drive_file_id: f.id,
            nombre: f.name,
            mime_type: f.mimeType || '',
            tamanio: parseInt(f.size) || 0,
            parent_folder_id: parentFolderId || '',
            ruta: ruta || '',
            fecha_modificacion: f.modifiedTime || null,
            fecha_indexado: new Date().toISOString()
        };
    });
    
    // Upsert in background (non-blocking)
    supabaseClient.from('drive_index')
        .upsert(rows, { onConflict: 'drive_file_id' })
        .then(function(res) {
            if (res.error) {
                console.warn('Index error:', res.error.message);
            } else {
                console.log('📇 Indexados ' + rows.length + ' items' + (ruta ? ' en ' + ruta : ''));
            }
        });
}

async function searchDriveIndex(query) {
    if (!query || query.length < 2) return [];
    
    var { data, error } = await supabaseClient
        .from('drive_index')
        .select('drive_file_id, nombre, mime_type, tamanio, ruta')
        .neq('mime_type', 'application/vnd.google-apps.folder')
        .ilike('nombre', '%' + query + '%')
        .order('fecha_indexado', { ascending: false })
        .limit(20);
    
    if (error) {
        console.error('Search index error:', error);
        return [];
    }
    return data || [];
}

// ============================================
// DRIVE API - UPLOAD, CREATE FOLDER, SEARCH
// ============================================

async function createDriveFolder(folderName, parentId) {
    const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : []
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

async function uploadFileToDrive(file, folderId) {
    console.log('📤 Uploading "' + file.name + '" to folder: ' + folderId);
    const metadata = {
        name: file.name,
        parents: folderId ? [folderId] : []
    };
    console.log('📤 Upload metadata:', JSON.stringify(metadata));
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    form.append('file', file);
    
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,parents', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + gdriveAccessToken
        },
        body: form
    });
    
    if (!response.ok) {
        const err = await response.json();
        console.error('📤 Upload error:', JSON.stringify(err));
        throw new Error(err.error?.message || 'Error subiendo archivo');
    }
    
    var result = await response.json();
    console.log('📤 Upload result:', JSON.stringify(result));
    return result;
}

async function searchDriveFiles(queryText) {
    if (!gdriveAccessToken) throw new Error('No conectado a Google Drive');
    
    const query = `fullText contains '${queryText.replace(/'/g, "\\'")}' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,parents)&orderBy=modifiedTime desc&pageSize=50&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Error buscando');
    }
    
    const data = await response.json();
    return data.files || [];
}

function extractFolderId(url) {
    if (!url) return null;
    var match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

function extractFileId(url) {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

function getGooglePreviewUrl(fileId) {
    return 'https://drive.google.com/file/d/' + fileId + '/preview';
}

// ============================================
// INLINE VIEWER — Mobile-friendly with PDF.js
// ============================================

var pendingViewFile = null;

async function viewDriveFileInline(fileId, fileName) {
    if (!gdriveAccessToken) {
        pendingViewFile = { fileId: fileId, fileName: fileName };
        showDriveViewerOverlay(fileName);
        var contentDiv = document.getElementById('driveViewerContent');
        if (contentDiv) {
            contentDiv.innerHTML = '<div style="text-align:center;padding:2rem;">' +
                '<p style="margin-bottom:1rem;color:var(--text);font-size:0.95rem;">Reconectando Google Drive...</p>' +
                '</div>';
        }
        // Try auto-reconnect
        if (typeof requireGdrive === 'function') {
            var ok = await requireGdrive();
            if (ok && pendingViewFile) {
                var f = pendingViewFile;
                pendingViewFile = null;
                await loadFileInViewer(f.fileId, f.fileName);
            } else if (contentDiv) {
                contentDiv.innerHTML = '<div style="text-align:center;padding:2rem;">' +
                    '<p style="margin-bottom:1rem;color:var(--text);font-size:0.95rem;">No se pudo conectar a Google Drive.</p>' +
                    '<button onclick="connectAndRetryView()" style="background:var(--primary);color:white;border:none;padding:0.5rem 1.2rem;border-radius:6px;cursor:pointer;font-size:0.95rem;">Reintentar</button>' +
                    '</div>';
            }
        }
        return;
    }
    
    showDriveViewerOverlay(fileName);
    await loadFileInViewer(fileId, fileName);
}

function showDriveViewerOverlay(fileName) {
    var overlay = document.getElementById('driveViewerOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'driveViewerOverlay';
        document.body.appendChild(overlay);
    }
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:white; z-index:9999; display:flex; flex-direction:column;';
    overlay.innerHTML = 
        '<div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 1rem; background:var(--primary); color:white; flex-shrink:0;">' +
            '<span style="font-size:0.9rem; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">' + (fileName || 'Documento') + '</span>' +
            '<button onclick="closeDriveViewer()" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer; padding:0 0.5rem;">✕</button>' +
        '</div>' +
        '<div id="driveViewerContent" style="flex:1; display:flex; align-items:center; justify-content:center; overflow:auto; -webkit-overflow-scrolling:touch;">' +
            '<p style="color:var(--text-light);">Cargando documento...</p>' +
        '</div>';
}

function connectAndRetryView() {
    if (pendingViewFile) {
        var f = pendingViewFile;
        gdrivePostConnectCallbacks.push(function() {
            pendingViewFile = null;
            var contentDiv = document.getElementById('driveViewerContent');
            if (contentDiv) contentDiv.innerHTML = '<p style="color:var(--text-light);">Cargando documento...</p>';
            loadFileInViewer(f.fileId, f.fileName);
        });
    }
    googleSignIn();
}

async function loadFileInViewer(fileId, fileName) {
    var contentDiv = document.getElementById('driveViewerContent');
    if (!contentDiv) return;
    
    try {
        var metaResp = await fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?fields=mimeType,name,webViewLink&key=' + GOOGLE_API_KEY, {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
        });
        
        if (!metaResp.ok) {
            var err = await metaResp.json();
            throw new Error(err.error?.message || 'Error accediendo archivo');
        }
        
        var meta = await metaResp.json();
        var mimeType = meta.mimeType || '';
        var isPdf = mimeType.includes('pdf');
        var isGoogleDoc = mimeType.includes('google-apps.document') || mimeType.includes('google-apps.spreadsheet') || mimeType.includes('google-apps.presentation');
        
        // Google native docs → export as PDF
        var downloadUrl;
        if (isGoogleDoc) {
            downloadUrl = 'https://www.googleapis.com/drive/v3/files/' + fileId + '/export?mimeType=application/pdf';
            isPdf = true;
        } else {
            downloadUrl = 'https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media';
        }
        
        if (isPdf || mimeType.includes('image/')) {
            var resp = await fetch(downloadUrl, {
                headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
            });
            if (!resp.ok) throw new Error('Error descargando archivo');
            var blob = await resp.blob();
            var blobUrl = URL.createObjectURL(new Blob([blob], { type: isPdf ? 'application/pdf' : mimeType }));
            
            if (mimeType.includes('image/') && !isPdf) {
                contentDiv.innerHTML = '<img src="' + blobUrl + '" style="max-width:100%;max-height:100%;object-fit:contain;" />';
            } else {
                contentDiv.innerHTML = '<iframe src="' + blobUrl + '" style="width:100%;height:100%;border:none;"></iframe>';
            }
            return;
        }
        
        // Other files
        contentDiv.innerHTML = '<div style="text-align:center;padding:2rem;">' +
            '<p style="margin-bottom:1rem;">Este tipo de archivo no se puede previsualizar.</p>' +
            (meta.webViewLink ? '<a href="' + meta.webViewLink + '" target="_blank" style="color:var(--primary);text-decoration:underline;">Abrir en Google Drive</a>' : '') +
            '</div>';
        
    } catch (e) {
        console.error('Error viewing file:', e);
        contentDiv.innerHTML = '<div style="text-align:center;padding:2rem;">' +
            '<p style="color:var(--danger);margin-bottom:0.5rem;">Error: ' + e.message + '</p>' +
            '<a href="https://drive.google.com/file/d/' + fileId + '/view" target="_blank" style="color:var(--primary);text-decoration:underline;">Abrir en Google Drive</a>' +
            '</div>';
    }
}

// ============================================
// CLOSE VIEWER
// ============================================

function closeDriveViewer() {
    var overlay = document.getElementById('driveViewerOverlay');
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
// Inside: Inmobilaris ESWU > Inmobiliaris ESWU > Inquilinos > [nombre]
// ============================================

async function getOrCreateInquilinoFolder(inquilinoNombre) {
    var rootId = await findEswuRootWithYears();
    console.log('📁 Inquilino folder — ESWU root:', rootId);
    
    // Find or create "Inquilinos" inside ESWU root
    var inquilinosId = await findOrCreateSubfolder('Inquilinos', rootId);
    console.log('📁 Inquilinos parent folder:', inquilinosId);
    
    // Find or create the specific inquilino folder
    var inqFolderId = await findOrCreateSubfolder(inquilinoNombre, inquilinosId);
    console.log('📁 Inquilino folder "' + inquilinoNombre + '":', inqFolderId);
    
    return inqFolderId;
}

// ============================================
// PROVEEDORES - Drive folder management
// Inside: Inmobilaris ESWU > Inmobiliaris ESWU > Proveedores > [nombre]
// ============================================

async function getOrCreateProveedorFolder(proveedorNombre) {
    var rootId = await findEswuRootWithYears();
    console.log('📁 Proveedor folder — ESWU root:', rootId);
    
    // Find or create "Proveedores" inside ESWU root (case-insensitive search)
    var proveedoresId = await findOrCreateSubfolder('Proveedores', rootId);
    console.log('📁 Proveedores parent folder:', proveedoresId);
    
    // Find or create the specific proveedor folder
    var provFolderId = await findOrCreateSubfolder(proveedorNombre, proveedoresId);
    console.log('📁 Proveedor folder "' + proveedorNombre + '":', provFolderId);
    
    return provFolderId;
}

// ============================================
// FACTURAS PROVEEDORES FOLDER (correct structure)
// Inmobilaris ESWU / [year] / [MM. MES] / Facturas proveedores /
// ============================================

var _MESES_DRIVE = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

// Cache the correct ESWU root folder ID
var _eswuRootId = null;

async function findEswuRootWithYears() {
    if (_eswuRootId) {
        console.log('📁 Using cached ESWU root:', _eswuRootId);
        return _eswuRootId;
    }
    
    // Search for ALL folders named "Inmobilaris ESWU" or "Inmobiliaris ESWU"
    var q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false and (name = 'Inmobilaris ESWU' or name = 'Inmobiliaris ESWU')";
    var resp = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name,parents)', {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    });
    var data = await resp.json();
    console.log('📁 All ESWU folders found:', JSON.stringify(data.files));
    
    if (!data.files || data.files.length === 0) {
        throw new Error('No se encontró la carpeta "Inmobilaris ESWU" en Google Drive');
    }
    
    // If only one, use it
    if (data.files.length === 1) {
        _eswuRootId = data.files[0].id;
        console.log('📁 Only one ESWU folder, using:', _eswuRootId);
        return _eswuRootId;
    }
    
    // Multiple found — we want the INNER one.
    // The INNER folder is a CHILD of the OUTER folder.
    // So: find the folder whose parent is ALSO in our list.
    var folderIds = data.files.map(function(f) { return f.id; });
    
    for (var i = 0; i < data.files.length; i++) {
        var folder = data.files[i];
        var parentIds = folder.parents || [];
        for (var j = 0; j < parentIds.length; j++) {
            if (folderIds.indexOf(parentIds[j]) !== -1) {
                // This folder's parent is ALSO named "Inmobilaris ESWU" — this is the INNER one
                _eswuRootId = folder.id;
                console.log('📁 ✅ Found INNER ESWU folder:', _eswuRootId, '(parent', parentIds[j], 'is also ESWU)');
                return _eswuRootId;
            }
        }
    }
    
    // Fallback: find the one with THE MOST year subfolders (the real one has 2018-2026)
    console.log('📁 Parent check did not work, checking children count...');
    var bestId = null;
    var bestYearCount = 0;
    
    for (var i = 0; i < data.files.length; i++) {
        var candidateId = data.files[i].id;
        var yearQ = "'" + candidateId + "' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
        var yearResp = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(yearQ) + '&fields=files(id,name)&pageSize=30', {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
        });
        var yearData = await yearResp.json();
        var yearCount = 0;
        if (yearData.files) {
            yearCount = yearData.files.filter(function(f) { return /^\d{4}$/.test(f.name); }).length;
        }
        console.log('📁 Folder', candidateId, 'has', yearCount, 'year subfolders');
        if (yearCount > bestYearCount) {
            bestYearCount = yearCount;
            bestId = candidateId;
        }
    }
    
    if (bestId) {
        _eswuRootId = bestId;
        console.log('📁 ✅ Using folder with most years (' + bestYearCount + '):', _eswuRootId);
        return _eswuRootId;
    }
    
    // Last fallback
    _eswuRootId = data.files[data.files.length - 1].id;
    console.log('📁 ⚠️ Last fallback ESWU root:', _eswuRootId);
    return _eswuRootId;
}

async function getFacturasProveedoresFolderId(fechaStr) {
    var parts = fechaStr.split('-');
    var year = parts[0];
    var monthIdx = parseInt(parts[1]) - 1;
    var monthNum = String(parseInt(parts[1])).padStart(2, '0');
    var monthName = monthNum + '. ' + _MESES_DRIVE[monthIdx];
    
    console.log('📁 Navigating to: ' + year + ' / ' + monthName + ' / Facturas proveedores');
    
    var rootId = await findEswuRootWithYears();
    console.log('📁 Root ID:', rootId);
    
    var yearId = await findOrCreateSubfolder(year, rootId);
    console.log('📁 Year folder (' + year + '):', yearId);
    
    var monthId = await findOrCreateSubfolder(monthName, yearId);
    console.log('📁 Month folder (' + monthName + '):', monthId);
    
    var facturasId = await findOrCreateSubfolder('Facturas proveedores', monthId);
    console.log('📁 Facturas proveedores folder:', facturasId);
    
    return facturasId;
}

async function getPagosProveedoresFolderId(fechaStr) {
    var parts = fechaStr.split('-');
    var year = parts[0];
    var monthIdx = parseInt(parts[1]) - 1;
    var monthNum = String(parseInt(parts[1])).padStart(2, '0');
    var monthName = monthNum + '. ' + _MESES_DRIVE[monthIdx];
    
    var rootId = await findEswuRootWithYears();
    var yearId = await findOrCreateSubfolder(year, rootId);
    var monthId = await findOrCreateSubfolder(monthName, yearId);
    var pagosId = await findOrCreateSubfolder('Pagos proveedores', monthId);
    
    return pagosId;
}

// ============================================
// GENERIC: Find or create subfolder
// ============================================

async function findOrCreateSubfolder(folderName, parentId) {
    var safeName = folderName.replace(/'/g, "\\'");
    var q;
    if (parentId) {
        q = "'" + parentId + "' in parents and name = '" + safeName + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    } else {
        q = "name = '" + safeName + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    }
    
    var resp = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name,parents)', {
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    });
    var data = await resp.json();
    
    if (data.files && data.files.length > 0) {
        console.log('📁 Found "' + folderName + '" in parent ' + parentId + ' → ' + data.files[0].id);
        return data.files[0].id;
    }
    
    // Create it
    console.log('📁 Creating "' + folderName + '" in parent ' + (parentId || 'root'));
    var result = await createDriveFolder(folderName, parentId || 'root');
    console.log('📁 Created "' + folderName + '" → ' + result.id);
    return result.id;
}

// ============================================
// DELETE FILE IN DRIVE
// ============================================

async function deleteFileInDrive(fileId) {
    if (!fileId || !gdriveAccessToken) return;
    var resp = await fetch('https://www.googleapis.com/drive/v3/files/' + fileId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
    });
    if (!resp.ok && resp.status !== 204) {
        var err = await resp.json().catch(function() { return {}; });
        throw new Error('Drive delete failed: ' + (err.error && err.error.message || resp.status));
    }
    console.log('🗑️ Drive file deleted:', fileId);
}

// ============================================
// RENAME FILE IN DRIVE
// ============================================

async function renameFileInDrive(fileId, newName) {
    if (!fileId || !newName || !gdriveAccessToken) return;
    var resp = await fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?key=' + GOOGLE_API_KEY, {
        method: 'PATCH',
        headers: {
            'Authorization': 'Bearer ' + gdriveAccessToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
    });
    if (!resp.ok) {
        var err = await resp.json().catch(function() { return {}; });
        throw new Error('Drive rename failed: ' + (err.error && err.error.message || resp.status));
    }
    var data = await resp.json();
    console.log('✏️ Drive file renamed to:', data.name, '| ID:', fileId);
    return data;
}

console.log('✅ GOOGLE-DRIVE.JS v5 cargado (2026-03-06)');
