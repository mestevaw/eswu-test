/* ========================================
   js/database/db-core.js — V1
   Fecha: 2026-02-27
   Descripción: Funciones básicas compartidas
   (loading, fileToBase64, todayLocal, uploadFileOrBase64)
   ======================================== */

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function showLoadingBanner(mensaje) {
    const banner = document.getElementById('loadingBanner');
    const text = banner.querySelector('.loading-text');
    if (text) text.textContent = mensaje || '⏳ Cargando...';
    banner.classList.remove('hidden');
}

function hideLoadingBanner() {
    document.getElementById('loadingBanner').classList.add('hidden');
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/* Local date string (YYYY-MM-DD) — evita bug de timezone UTC */
function todayLocal() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* Helper: sube archivo a Drive si está conectado, o devuelve base64 como fallback */
async function uploadFileOrBase64(file, folderId) {
    if (typeof isGoogleConnected === 'function' && isGoogleConnected() && folderId) {
        try {
            var result = await uploadFileToDrive(file, folderId);
            return { driveFileId: result.id, base64: null };
        } catch (e) {
            console.error('⚠️ Drive upload failed, using base64:', e);
        }
    }
    var base64 = await fileToBase64(file);
    return { driveFileId: null, base64: base64 };
}

console.log('✅ DB-CORE.JS V1 cargado (2026-02-27)');
