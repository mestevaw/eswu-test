/* ========================================
   MENSAJES-UI.JS
   UI de mensajes, avisos, alertas y panel de notificaciones
   ======================================== */

var currentMensajesTab = 'alertas';

// ============================================
// SHOW MENSAJES PAGE (desde menú)
// ============================================

function showMensajesPage() {
    // Cerrar submenús
    document.querySelectorAll('.submenu-container').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('mensajesPage').classList.add('active');
    
    currentSubContext = 'mensajes';
    
    document.getElementById('btnRegresa').classList.remove('hidden');
    document.getElementById('btnSearch').classList.add('hidden');
    
    document.getElementById('contentArea').classList.remove('with-submenu');
    document.getElementById('menuSidebar').classList.add('hidden');
    document.getElementById('contentArea').classList.add('fullwidth');
    
    generarAlertasSistema();
    renderMensajesPage();
}

// ============================================
// RENDER TABS
// ============================================

function renderMensajesPage() {
    switchMensajesTab(currentMensajesTab);
}

function switchMensajesTab(tab) {
    currentMensajesTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('#mensajesPage .tab').forEach(t => t.classList.remove('active'));
    const tabBtn = document.querySelector(`#mensajesPage .tab[data-tab="${tab}"]`);
    if (tabBtn) tabBtn.classList.add('active');
    
    // Update tab badge counts
    updateTabBadges();
    
    // Render content
    const container = document.getElementById('mensajesContent');
    
    if (tab === 'alertas') {
        renderAlertasView(container);
    } else if (tab === 'recibidos') {
        renderMensajesView(container);
    } else if (tab === 'avisos') {
        renderAvisosView(container);
    }
}

function updateTabBadges() {
    const alertasCount = alertasSistema.length;
    const mensajesCount = mensajes.filter(m => !m.leido).length;
    const avisosCount = avisos.filter(a => {
        if (a.fecha_expiracion && new Date(a.fecha_expiracion) < new Date()) return false;
        return !(a.avisos_leidos || []).some(l => l.usuario_id === currentUser.id);
    }).length;
    
    const setBadge = (id, count) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = count;
            el.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    };
    
    setBadge('tabBadgeAlertas', alertasCount);
    setBadge('tabBadgeMensajes', mensajesCount);
    setBadge('tabBadgeAvisos', avisosCount);
}

// ============================================
// ALERTAS DEL SISTEMA
// ============================================

function renderAlertasView(container) {
    if (!container) container = document.getElementById('mensajesContent');
    
    if (alertasSistema.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-light)"><div style="font-size:2.5rem;margin-bottom:0.5rem">✅</div>No hay alertas pendientes</div>';
        return;
    }
    
    const colorMap = { danger: '#fee2e2', warning: '#fef3c7', info: '#dbeafe' };
    const borderMap = { danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    
    container.innerHTML = alertasSistema.map((a, idx) => `
        <div onclick="alertasSistema[${idx}].accion()" style="padding:0.75rem 1rem; margin-bottom:0.5rem; background:${colorMap[a.tipo]}; border-left:4px solid ${borderMap[a.tipo]}; border-radius:6px; cursor:pointer; transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
            <span style="margin-right:0.4rem">${a.icono}</span>
            <span style="font-size:0.9rem">${a.texto}</span>
        </div>
    `).join('');
}

// ============================================
// MENSAJES RECIBIDOS
// ============================================

function renderMensajesView(container) {
    if (!container) container = document.getElementById('mensajesContent');
    
    // Botón de nuevo mensaje
    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:0.75rem;">
        <span onclick="showNuevoMensajeModal()" title="Nuevo Mensaje" style="color:var(--success); font-size:1.6rem; font-weight:700; cursor:pointer; padding:0 0.4rem; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='transparent'">+</span>
    </div>`;
    
    if (mensajes.length === 0) {
        html += '<div style="text-align:center;padding:3rem;color:var(--text-light)"><div style="font-size:2.5rem;margin-bottom:0.5rem">📭</div>No hay mensajes</div>';
        container.innerHTML = html;
        return;
    }
    
    html += mensajes.map(m => {
        const fecha = new Date(m.fecha_envio);
        const fechaStr = fecha.toLocaleDateString('es-MX', { day:'numeric', month:'short' }) + ' ' + fecha.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });
        const de = m.de_usuario ? m.de_usuario.nombre : 'Sistema';
        const bgColor = m.leido ? 'white' : '#f0f7ff';
        const fontWeight = m.leido ? 'normal' : '600';
        
        return `
        <div onclick="abrirMensaje(${m.id})" style="padding:0.75rem 1rem; margin-bottom:0.4rem; background:${bgColor}; border:1px solid var(--border); border-radius:6px; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='${bgColor}'">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:${fontWeight};font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.asunto}</div>
                    <div style="font-size:0.8rem;color:var(--text-light);margin-top:0.15rem;">De: ${de}</div>
                </div>
                <div style="font-size:0.75rem;color:var(--text-light);white-space:nowrap;margin-left:0.5rem;">${fechaStr}</div>
            </div>
        </div>`;
    }).join('');
    
    container.innerHTML = html;
}

// ============================================
// AVISOS
// ============================================

function renderAvisosView(container) {
    if (!container) container = document.getElementById('mensajesContent');
    
    const nivel = (currentUser && currentUser.nivel) || 3;
    
    // Botón de nuevo aviso (solo admin)
    let html = '';
    if (nivel <= 2) {
        html += `<div style="display:flex;justify-content:flex-end;margin-bottom:0.75rem;">
            <button onclick="showNuevoAvisoModal()" style="background:var(--success);color:white;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-size:0.85rem;">📢 Nuevo Aviso</button>
        </div>`;
    }
    
    // Filtrar avisos vigentes
    const hoy = new Date();
    const avisosVigentes = avisos.filter(a => {
        if (a.fecha_expiracion && new Date(a.fecha_expiracion) < hoy) return false;
        return true;
    });
    
    if (avisosVigentes.length === 0) {
        html += '<div style="text-align:center;padding:3rem;color:var(--text-light)"><div style="font-size:2.5rem;margin-bottom:0.5rem">📋</div>No hay avisos activos</div>';
        container.innerHTML = html;
        return;
    }
    
    html += avisosVigentes.map(a => {
        const fecha = new Date(a.fecha_publicacion);
        const fechaStr = fecha.toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' });
        const autor = a.usuario ? a.usuario.nombre : 'Sistema';
        const yaLeido = (a.avisos_leidos || []).some(l => l.usuario_id === currentUser.id);
        const bgColor = yaLeido ? 'white' : '#fffbeb';
        const canDelete = nivel <= 2;
        
        return `
        <div style="padding:1rem; margin-bottom:0.5rem; background:${bgColor}; border:1px solid var(--border); border-left:4px solid var(--primary); border-radius:6px;">
            <div style="display:flex;justify-content:space-between;align-items:start;">
                <div style="flex:1;">
                    <div style="font-weight:600;font-size:0.95rem;">📢 ${a.titulo}</div>
                    <div style="font-size:0.85rem;margin-top:0.4rem;white-space:pre-wrap;">${a.contenido}</div>
                    <div style="font-size:0.75rem;color:var(--text-light);margin-top:0.5rem;">Publicado por ${autor} — ${fechaStr}</div>
                </div>
                <div style="display:flex;gap:0.3rem;margin-left:0.5rem;">
                    ${!yaLeido ? `<button onclick="event.stopPropagation();marcarAvisoLeido(${a.id});renderAvisosView();updateNotificationBadge();" title="Marcar leído" style="background:none;border:none;cursor:pointer;font-size:1rem;">✓</button>` : ''}
                    ${canDelete ? `<button onclick="event.stopPropagation();desactivarAviso(${a.id})" title="Desactivar" style="background:none;border:none;cursor:pointer;font-size:1rem;color:var(--danger);">✕</button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
    
    container.innerHTML = html;
}

// ============================================
// ABRIR MENSAJE (detalle)
// ============================================

function abrirMensaje(msgId) {
    const msg = mensajes.find(m => m.id === msgId);
    if (!msg) return;
    
    // Marcar como leído
    if (!msg.leido) {
        marcarMensajeLeido(msgId);
    }
    
    const fecha = new Date(msg.fecha_envio);
    const fechaStr = fecha.toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' }) + ' ' + fecha.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });
    const de = msg.de_usuario ? msg.de_usuario.nombre : 'Sistema';
    const para = msg.para_usuario ? msg.para_usuario.nombre : 'Todos';
    
    document.getElementById('detalleMensajeDe').textContent = de;
    document.getElementById('detalleMensajePara').textContent = para;
    document.getElementById('detalleMensajeFecha').textContent = fechaStr;
    document.getElementById('detalleMensajeAsunto').textContent = msg.asunto;
    document.getElementById('detalleMensajeContenido').textContent = msg.contenido;
    
    // Botón eliminar
    document.getElementById('btnEliminarMensaje').onclick = () => {
        eliminarMensaje(msgId);
        closeModal('detalleMensajeModal');
    };
    
    // Botón responder
    document.getElementById('btnResponderMensaje').onclick = () => {
        closeModal('detalleMensajeModal');
        showNuevoMensajeModal(msg.de_usuario_id, 'Re: ' + msg.asunto);
    };
    
    document.getElementById('detalleMensajeModal').classList.add('active');
}

// ============================================
// MODAL: NUEVO MENSAJE
// ============================================

function showNuevoMensajeModal(paraId, asuntoPrefill) {
    const select = document.getElementById('mensajeDestinatario');
    select.innerHTML = '<option value="todos">📢 Todos los usuarios</option>';
    
    usuarios.filter(u => u.id !== currentUser.id && u.activo).forEach(u => {
        const option = document.createElement('option');
        option.value = u.id;
        option.textContent = u.nombre;
        select.appendChild(option);
    });
    
    if (paraId) select.value = paraId;
    
    document.getElementById('mensajeAsunto').value = asuntoPrefill || '';
    document.getElementById('mensajeContenido').value = '';
    document.getElementById('mensajeRefTipo').value = '';
    document.getElementById('mensajeRefId').value = '';
    
    document.getElementById('nuevoMensajeModal').classList.add('active');
}

// Abrir nuevo mensaje desde ficha de inquilino o proveedor
function showNuevoMensajeFicha(tipo) {
    var nombre = '';
    var id = null;
    
    if (tipo === 'inquilino' && currentInquilinoId) {
        var inq = inquilinos.find(i => i.id === currentInquilinoId);
        nombre = inq ? inq.nombre : '';
        id = currentInquilinoId;
    } else if (tipo === 'proveedor' && currentProveedorId) {
        var prov = proveedores.find(p => p.id === currentProveedorId);
        nombre = prov ? prov.nombre : '';
        id = currentProveedorId;
    }
    
    showNuevoMensajeModal(null, nombre);
    
    // Marcar referencia
    document.getElementById('mensajeRefTipo').value = tipo;
    document.getElementById('mensajeRefId').value = id || '';
}

async function submitNuevoMensaje(event) {
    event.preventDefault();
    
    const para = document.getElementById('mensajeDestinatario').value;
    const asunto = document.getElementById('mensajeAsunto').value;
    const contenido = document.getElementById('mensajeContenido').value;
    const refTipo = document.getElementById('mensajeRefTipo').value;
    const refId = document.getElementById('mensajeRefId').value;
    
    if (!asunto || !contenido) {
        alert('Completa el asunto y el mensaje');
        return;
    }
    
    const ok = await enviarMensaje(para, asunto, contenido, refTipo || null, refId || null);
    if (ok) {
        closeModal('nuevoMensajeModal');
        
        // Si vino de una ficha, refrescar la pestaña de mensajes de esa ficha
        if (refTipo && refId) {
            renderMensajesFicha(refTipo, parseInt(refId));
        } else {
            switchMensajesTab('recibidos');
        }
        updateNotificationBadge();
    }
}

// ============================================
// MODAL: NUEVO AVISO
// ============================================

function showNuevoAvisoModal() {
    document.getElementById('avisoTitulo').value = '';
    document.getElementById('avisoContenido').value = '';
    document.getElementById('avisoExpiracion').value = '';
    
    document.getElementById('nuevoAvisoModal').classList.add('active');
}

async function submitNuevoAviso(event) {
    event.preventDefault();
    
    const titulo = document.getElementById('avisoTitulo').value;
    const contenido = document.getElementById('avisoContenido').value;
    const expiracion = document.getElementById('avisoExpiracion').value || null;
    
    if (!titulo || !contenido) {
        alert('Completa el título y el contenido');
        return;
    }
    
    const ok = await publicarAviso(titulo, contenido, expiracion);
    if (ok) {
        closeModal('nuevoAvisoModal');
        switchMensajesTab('avisos');
        updateNotificationBadge();
    }
}

// ============================================
// NOTIFICATION BELL CLICK
// ============================================

function toggleNotifPanel() {
    showMensajesPage();
}

// ============================================
// INIT MENSAJES (llamar después de initializeApp)
// ============================================

async function initMensajes() {
    try {
        await Promise.all([loadMensajes(), loadAvisos()]);
        generarAlertasSistema();
        updateNotificationBadge();
    } catch (e) {
        console.error('Error init mensajes:', e);
    }
}

// ============================================
// MENSAJES EN FICHAS (inquilino / proveedor)
// ============================================

async function renderMensajesFicha(tipo, id) {
    var divId = tipo === 'inquilino' ? 'inquilinoMensajesFicha' : 'proveedorMensajesFicha';
    var container = document.getElementById(divId);
    if (!container) return;
    
    container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem;">Cargando mensajes...</p>';
    
    var msgs = await loadMensajesPorReferencia(tipo, id);
    
    if (!msgs || msgs.length === 0) {
        container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:2rem;">No hay mensajes vinculados.</p>';
        return;
    }
    
    var html = '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
    msgs.forEach(function(m) {
        var de = usuarios.find(function(u) { return u.id === m.de_usuario_id; });
        var para = m.para_usuario_id ? usuarios.find(function(u) { return u.id === m.para_usuario_id; }) : null;
        var deNombre = de ? de.nombre : 'Sistema';
        var paraNombre = para ? para.nombre : 'Todos';
        var fecha = new Date(m.fecha_envio);
        var fechaStr = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        var horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        
        html += '<div style="background:white;border:1px solid var(--border);border-radius:8px;padding:0.6rem 0.8rem;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">';
        html += '<strong style="font-size:0.85rem;">' + (m.asunto || 'Sin asunto') + '</strong>';
        html += '<span style="font-size:0.7rem;color:var(--text-light);white-space:nowrap;">' + fechaStr + ' ' + horaStr + '</span>';
        html += '</div>';
        html += '<div style="font-size:0.8rem;color:var(--text-light);margin-bottom:0.3rem;">De: ' + deNombre + ' → Para: ' + paraNombre + '</div>';
        html += '<div style="font-size:0.85rem;white-space:pre-wrap;">' + (m.contenido || '') + '</div>';
        html += '</div>';
    });
    html += '</div>';
    
    container.innerHTML = html;
}

console.log('✅ MENSAJES-UI.JS cargado');
