/* ========================================
   GOOGLE-DRIVE.JS - Google Drive Integration
   OAuth + Drive API for Contabilidad
   ======================================== */

var gdriveAccessToken = null;
var gdriveTokenClient = null;
var gdriveInitialized = false;

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
    } catch (e) {
        console.error('Error inicializando Google Drive:', e);
    }
}

function handleGoogleAuthResponse(response) {
    if (response.error) {
        console.error('Google Auth error:', response.error);
        alert('Error al conectar con Google: ' + response.error);
        return;
    }
    
    gdriveAccessToken = response.access_token;
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
        // Already signed in, just refresh
        if (typeof renderContabilidadContent === 'function') {
            renderContabilidadContent();
        }
        return;
    }
    
    gdriveTokenClient.requestAccessToken();
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
    
    // Search across all known folders
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
    return data.files || [];
}

// ============================================
// HELPER - Extract folder ID from URL
// ============================================

function extractFolderId(url) {
    if (!url) return null;
    // Handles: https://drive.google.com/drive/folders/FOLDER_ID
    // And: https://drive.google.com/drive/folders/FOLDER_ID?...
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
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

console.log('✅ GOOGLE-DRIVE.JS cargado');
