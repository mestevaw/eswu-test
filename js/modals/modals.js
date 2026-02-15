/* ========================================
   MODALS.JS - Gestión de modales
   ======================================== */

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showAddInquilinoModal() {
    isEditMode = false;
    currentInquilinoId = null;
    tempInquilinoContactos = [];
    
    document.getElementById('addInquilinoTitle').textContent = 'Agregar Inquilino';
    document.getElementById('inquilinoForm').reset();
    document.getElementById('inquilinoContactosList').innerHTML = '<p style="color:var(--text-light);font-size:0.875rem">No hay contactos agregados</p>';
    document.getElementById('contratoFileName').textContent = '';
    
    document.getElementById('addInquilinoModal').classList.add('active');
}

function showAddProveedorModal() {
    isEditMode = false;
    currentProveedorId = null;
    tempProveedorContactos = [];
    
    document.getElementById('addProveedorTitle').textContent = 'Agregar Proveedor';
    document.getElementById('proveedorForm').reset();
    document.getElementById('proveedorContactosList').innerHTML = '';
    document.getElementById('provDocAdicionalFileName').textContent = '';
    document.getElementById('nombreProvDocGroup').classList.add('hidden');
    
    // Limpiar contacto inline
    document.getElementById('proveedorContactoNombreInline').value = '';
    document.getElementById('proveedorContactoTelInline').value = '';
    document.getElementById('proveedorContactoEmailInline').value = '';
    
    document.getElementById('addProveedorModal').classList.add('active');
}

function showAddActivoModal() {
    isEditMode = false;
    currentActivoId = null;
    
    document.getElementById('addActivoTitle').textContent = 'Agregar Activo';
    document.getElementById('activoForm').reset();
    document.getElementById('activoFotosFileName').textContent = '';
    
    populateProveedoresDropdown();
    
    document.getElementById('addActivoModal').classList.add('active');
}

function showAddUsuarioModal() {
    isEditMode = false;
    currentUsuarioId = null;
    
    document.getElementById('addUsuarioTitle').textContent = 'Agregar Usuario';
    document.getElementById('usuarioForm').reset();
    document.getElementById('addUsuarioModal').classList.add('active');
}

function showAddBancoModal() {
    document.getElementById('bancoForm').reset();
    document.getElementById('bancoDocumentoFileName').textContent = '';
    document.getElementById('addBancoModal').classList.add('active');
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

console.log('✅ MODALS.JS cargado');
