/* ========================================
   INQUILINO-MODALS.JS
   ======================================== */

function showAddContactoInquilinoModal() {
    document.getElementById('contactoInquilinoForm').reset();
    document.getElementById('addContactoInquilinoModal').classList.add('active');
}

function saveContactoInquilino(event) {
    event.preventDefault();
    
    const contacto = {
        nombre: document.getElementById('contactoInquilinoNombre').value,
        telefono: document.getElementById('contactoInquilinoTelefono').value,
        email: document.getElementById('contactoInquilinoEmail').value
    };
    
    if (window.editingContactoIndex !== undefined) {
        tempInquilinoContactos[window.editingContactoIndex] = contacto;
        delete window.editingContactoIndex;
    } else {
        tempInquilinoContactos.push(contacto);
    }
    
    renderContactosList(tempInquilinoContactos, 'inquilinoContactosList', 'deleteInquilinoContacto', 'showEditContactoInquilinoModal');
    
    document.getElementById('contactoInquilinoForm').reset();
    closeModal('addContactoInquilinoModal');
}

function deleteInquilinoContacto(index) {
    tempInquilinoContactos.splice(index, 1);
    renderContactosList(tempInquilinoContactos, 'inquilinoContactosList', 'deleteInquilinoContacto', 'showEditContactoInquilinoModal');
}

function showEditContactoInquilinoModal(index) {
    const contacto = tempInquilinoContactos[index];
    
    document.getElementById('contactoInquilinoNombre').value = contacto.nombre;
    document.getElementById('contactoInquilinoTelefono').value = contacto.telefono || '';
    document.getElementById('contactoInquilinoEmail').value = contacto.email || '';
    
    window.editingContactoIndex = index;
    
    document.getElementById('addContactoInquilinoModal').classList.add('active');
}

function renderContactosList(contactos, containerId, deleteCallback, editCallback) {
    const container = document.getElementById(containerId);
    if (!contactos || contactos.length === 0) {
        container.innerHTML = '<p style="color:var(--text-light);font-size:0.875rem">No hay contactos agregados</p>';
        return;
    }
    
    container.innerHTML = contactos.map((c, idx) => `
        <div style="display:flex; align-items:center; gap:0.4rem; padding:0.35rem 0; border-bottom:1px solid var(--bg);">
            <div style="flex:1; min-width:0;">
                <strong style="font-size:0.9rem;">${c.nombre}</strong><br>
                <small style="color:var(--text-light);">Tel: ${c.telefono || '-'} | Email: ${c.email || '-'}</small>
            </div>
            ${editCallback ? `<span onclick="${editCallback}(${idx})" title="Editar" style="cursor:pointer; font-size:0.9rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'">✏️</span>` : ''}
            <span onclick="${deleteCallback}(${idx})" title="Eliminar" style="cursor:pointer; color:var(--danger); font-weight:700; font-size:1rem; padding:0.15rem 0.3rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#fed7d7'" onmouseout="this.style.background='transparent'">✕</span>
        </div>
    `).join('');
}

function showRegistrarPagoModal() {
    document.getElementById('registrarPagoModal').classList.add('active');
}

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

function showAgregarDocumentoModal() {
    document.getElementById('nuevoDocNombre').value = '';
    document.getElementById('nuevoDocPDF').value = '';
    document.getElementById('nuevoDocPDFFileName').textContent = '';
    document.getElementById('agregarDocumentoModal').classList.add('active');
}

function viewContrato() {
    const inq = inquilinos.find(i => i.id === currentInquilinoId);
    if (inq && inq.contrato_file) {
        openPDFViewer(inq.contrato_file);
    }
}

console.log('✅ INQUILINO-MODALS.JS cargado');
