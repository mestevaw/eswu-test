/* ========================================
   DB-CORE.JS - Funciones básicas de DB
   ======================================== */

function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
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

console.log('✅ DB-CORE.JS cargado');
