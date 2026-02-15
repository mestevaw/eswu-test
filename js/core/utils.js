/* ========================================
   UTILS.JS - Utilidades y Helpers
   ======================================== */

// ============================================
// FILE CONVERSION
// ============================================

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================
// POPULATE YEAR SELECTS
// ============================================

function populateYearSelect() {
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('homeYear');
    yearSelect.innerHTML = '';
    
    for (let year = currentYear - 5; year <= currentYear + 1; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
}

function populateInquilinosYearSelects() {
    const currentYear = new Date().getFullYear();
    const select = document.getElementById('inquilinosRentasYear');
    select.innerHTML = '';
    
    for (let year = currentYear - 5; year <= currentYear + 1; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        select.appendChild(option);
    }
}

function populateProveedoresYearSelects() {
    const currentYear = new Date().getFullYear();
    ['provFactPagYear', 'provFactPorPagYear'].forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '';
            for (let year = currentYear - 5; year <= currentYear + 1; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === currentYear) option.selected = true;
                select.appendChild(option);
            }
        }
    });
}

function populateProveedoresDropdown() {
    const select = document.getElementById('activoProveedor');
    select.innerHTML = '<option value="">-- Seleccione un proveedor --</option>';
    
    proveedores.forEach(prov => {
        const option = document.createElement('option');
        option.value = prov.nombre;
        option.textContent = prov.nombre;
        select.appendChild(option);
    });
}

// ============================================
// TOGGLE FUNCTIONS
// ============================================

function toggleMontoInput() {
    const completo = document.getElementById('pagoCompleto').value;
    const montoGroup = document.getElementById('pagoMontoGroup');
    
    if (completo === 'no') {
        montoGroup.classList.remove('hidden');
        document.getElementById('pagoMonto').required = true;
    } else {
        montoGroup.classList.add('hidden');
        document.getElementById('pagoMonto').required = false;
    }
}

function calculateIVA() {
    const monto = parseFloat(document.getElementById('facturaMonto').value);
    if (!isNaN(monto) && monto > 0) {
        const iva = monto * 0.16;
        document.getElementById('facturaIVA').value = iva.toFixed(2);
    }
}

// ============================================
// UPDATE DESPACHO FIELD
// ============================================

function updateDespachoField() {
    const selectedInquilino = document.getElementById('editEspacioInquilino').value;
    const inq = inquilinos.find(i => i.nombre === selectedInquilino);
    document.getElementById('editEspacioDespacho').value = inq?.numero_despacho || '';
}
// ============================================
// LOADING BANNER FUNCTIONS
// ============================================

function showLoadingBanner(mensaje = 'Cargando...') {
    const banner = document.getElementById('loadingBanner');
    if (!banner) return;
    
    const textElement = banner.querySelector('.loading-text');
    if (textElement) {
        textElement.textContent = `⏳ ${mensaje}`;
    }
    banner.classList.remove('hidden');
}

function hideLoadingBanner() {
    const banner = document.getElementById('loadingBanner');
    if (banner) {
        banner.classList.add('hidden');
    }
}

function updateLoadingText(text) {
    const banner = document.getElementById('loadingBanner');
    if (banner) {
        banner.querySelector('.loading-text').textContent = `⏳ ${text}`;
    }
}

function hideLoadingBanner() {
    const banner = document.getElementById('loadingBanner');
    if (banner) {
        banner.classList.add('hidden');
    }
}
// ============================================
// CONTACTOS RENDERING
// ============================================

function renderContactosList(contactos, containerId, deleteCallback, editCallback) {
    const container = document.getElementById(containerId);
    if (!contactos || contactos.length === 0) {
        container.innerHTML = '<p style="color:var(--text-light);font-size:0.875rem">No hay contactos agregados</p>';
        return;
    }
    
    container.innerHTML = contactos.map((c, idx) => `
        <div class="contacto-item">
            <div class="contacto-info">
                <strong>${c.nombre}</strong><br>
                <small>Tel: ${c.telefono || '-'} | Email: ${c.email || '-'}</small>
            </div>
            <div style="display:flex;gap:0.5rem;">
                ${editCallback ? `<button type="button" class="btn btn-sm btn-secondary" onclick="${editCallback}(${idx})" title="Editar">✏️</button>` : ''}
                <button type="button" class="btn btn-sm btn-danger" onclick="${deleteCallback}(${idx})" title="Eliminar">×</button>
            </div>
        </div>
    `).join('');
}

console.log('✅ UTILS.JS cargado');
console.log('✅ UTILS.JS cargado');
