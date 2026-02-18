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

// Archivos pendientes para adjuntar
var mensajePendingFiles = [];
var _adjuntoListenersBound = false;

function bindAdjuntoListeners() {
    if (_adjuntoListenersBound) return;
    var input = document.getElementById('mensajeAdjuntoInput');
    var btn = document.getElementById('btnAdjuntarDocs');
    if (!input || !btn) return;
    
    btn.addEventListener('click', function() {
        input.value = '';
        input.click();
    });
    
    input.addEventListener('change', function() {
        if (!this.files || !this.files.length) return;
        for (var i = 0; i < this.files.length; i++) {
            mensajePendingFiles.push(this.files[i]);
        }
        this.value = '';
        renderMensajeAdjuntosList();
    });
    
    _adjuntoListenersBound = true;
}

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
    
    // Limpiar adjuntos
    mensajePendingFiles = [];
    var fileInput = document.getElementById('mensajeAdjuntoInput');
    if (fileInput) fileInput.value = '';
    renderMensajeAdjuntosList();
    
    document.getElementById('nuevoMensajeModal').classList.add('active');
    
    // Bind listeners después de que el modal esté visible
    setTimeout(bindAdjuntoListeners, 50);
}

function removeMensajeFile(idx) {
    mensajePendingFiles.splice(idx, 1);
    renderMensajeAdjuntosList();
}

function renderMensajeAdjuntosList() {
    var div = document.getElementById('mensajeAdjuntosList');
    if (!div) return;
    if (mensajePendingFiles.length === 0) {
        div.innerHTML = '';
        return;
    }
    var html = '';
    mensajePendingFiles.forEach(function(f, i) {
        var size = f.size < 1024*1024 ? Math.round(f.size/1024) + ' KB' : (f.size/(1024*1024)).toFixed(1) + ' MB';
        html += '<div style="display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0.5rem;margin-bottom:0.2rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">';
        html += '<span style="font-size:0.85rem;">📄</span>';
        html += '<span style="font-size:0.82rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + f.name + '</span>';
        html += '<span style="font-size:0.72rem;color:var(--text-light);white-space:nowrap;">' + size + '</span>';
        html += '<span onclick="removeMensajeFile(' + i + ')" style="color:var(--danger);cursor:pointer;font-weight:700;font-size:0.95rem;padding:0 0.25rem;line-height:1;" title="Quitar">✕</span>';
        html += '</div>';
    });
    div.innerHTML = html;
}

// Abrir nuevo mensaje desde ficha de inquilino, proveedor o eswu
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
    } else if (tipo === 'eswu') {
        nombre = 'Inmobiliaris ESWU';
        id = 0; // ID especial para ESWU
    }
    
    showNuevoMensajeModal(null, nombre);
    
    // Marcar referencia
    document.getElementById('mensajeRefTipo').value = tipo;
    document.getElementById('mensajeRefId').value = id !== null ? id : '';
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
    
    var adjuntos = []; // [{drive_file_id, nombre}]
    
    // Subir archivos a Google Drive
    if (mensajePendingFiles.length > 0) {
        if (typeof isGoogleConnected !== 'function' || !isGoogleConnected()) {
            alert('Para adjuntar documentos, conecta Google Drive primero.');
            return;
        }
        
        showLoading();
        try {
            var folderId = null;
            
            // Determinar carpeta según referencia
            if (refTipo === 'inquilino' && refId) {
                var inq = inquilinos.find(function(i) { return i.id === parseInt(refId); });
                if (inq) {
                    folderId = sanitizeDriveId(inq.google_drive_folder_id);
                    if (!folderId) {
                        folderId = await getOrCreateInquilinoFolder(inq.nombre);
                        await supabaseClient.from('inquilinos').update({ google_drive_folder_id: folderId }).eq('id', parseInt(refId));
                        inq.google_drive_folder_id = folderId;
                    }
                }
            } else if (refTipo === 'proveedor' && refId) {
                var prov = proveedores.find(function(p) { return p.id === parseInt(refId); });
                if (prov) {
                    folderId = sanitizeDriveId(prov.google_drive_folder_id);
                    if (!folderId) {
                        folderId = await getOrCreateProveedorFolder(prov.nombre);
                        await supabaseClient.from('proveedores').update({ google_drive_folder_id: folderId }).eq('id', parseInt(refId));
                        prov.google_drive_folder_id = folderId;
                    }
                }
            }
            
            var targetFolder = folderId;
            if (!targetFolder) {
                // Mensaje general: guardar en Documentos Generales
                targetFolder = await getOrCreateDocumentosGeneralesFolder();
            }
            
            for (var fi = 0; fi < mensajePendingFiles.length; fi++) {
                var file = mensajePendingFiles[fi];
                var result = await uploadFileToDrive(file, targetFolder);
                adjuntos.push({ drive_file_id: result.id, nombre: file.name });
                
                // Registrar en documentos de la ficha
                if (refTipo === 'inquilino' && refId) {
                    await supabaseClient.from('inquilinos_documentos').insert([{
                        inquilino_id: parseInt(refId),
                        nombre_documento: file.name,
                        fecha_guardado: new Date().toISOString().split('T')[0],
                        usuario_guardo: currentUser.nombre,
                        google_drive_file_id: result.id,
                        archivo_pdf: ''
                    }]);
                } else if (refTipo === 'proveedor' && refId) {
                    await supabaseClient.from('proveedores_documentos').insert([{
                        proveedor_id: parseInt(refId),
                        nombre_documento: file.name,
                        fecha_guardado: new Date().toISOString().split('T')[0],
                        usuario_guardo: currentUser.nombre,
                        google_drive_file_id: result.id,
                        archivo_pdf: ''
                    }]);
                }
            }
        } catch (e) {
            console.error('Error subiendo adjuntos:', e);
            alert('Error al subir documento: ' + e.message);
            hideLoading();
            return;
        }
        hideLoading();
    }
    
    const ok = await enviarMensaje(para, asunto, contenido, refTipo || null, refId || null, adjuntos);
    if (ok) {
        mensajePendingFiles = [];
        closeModal('nuevoMensajeModal');
        
        // Si vino de una ficha, refrescar mensajes Y recargar datos para documentos
        if (refTipo && (refId || refTipo === 'eswu')) {
            if (refTipo === 'inquilino') {
                await loadInquilinos();
                showInquilinoDetail(parseInt(refId));
                setTimeout(function() { switchTab('inquilino', 'notas'); }, 150);
            } else if (refTipo === 'proveedor') {
                await loadProveedores();
                showProveedorDetail(parseInt(refId));
                setTimeout(function() { switchTab('proveedor', 'notas'); }, 150);
            } else if (refTipo === 'eswu') {
                renderMensajesFicha('eswu', 0);
                switchTab('eswu', 'mensajes');
            }
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
        
        // Polling cada 30 seg para badge de notificaciones solamente
        setInterval(async function() {
            try {
                await loadMensajes();
                updateNotificationBadge();
            } catch(e) { /* silencioso */ }
        }, 30000);
        
    } catch (e) {
        console.error('Error init mensajes:', e);
    }
}

// ============================================
// MENSAJES EN FICHAS (inquilino / proveedor)
// ============================================

async function renderMensajesFicha(tipo, id) {
    var divId = tipo === 'inquilino' ? 'inquilinoMensajesFicha' : tipo === 'eswu' ? 'eswuMensajesFicha' : 'proveedorMensajesFicha';
    var container = document.getElementById(divId);
    if (!container) return;
    
    container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:1rem;">Cargando mensajes...</p>';
    
    var msgs = await loadMensajesPorReferencia(tipo, id);
    
    if (!msgs || msgs.length === 0) {
        container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:2rem;">No hay mensajes vinculados.</p>';
        return;
    }
    
    // Agrupar mensajes enviados al mismo tiempo (broadcast "todos")
    var grouped = [];
    var used = {};
    for (var i = 0; i < msgs.length; i++) {
        if (used[msgs[i].id]) continue;
        var m = msgs[i];
        var destinatarios = [];
        var todosLeidos = true;
        
        for (var j = 0; j < msgs.length; j++) {
            if (used[msgs[j].id]) continue;
            var m2 = msgs[j];
            if (m2.de_usuario_id === m.de_usuario_id && m2.asunto === m.asunto && m2.contenido === m.contenido && Math.abs(new Date(m2.fecha_envio) - new Date(m.fecha_envio)) < 5000) {
                var paraUser = m2.para_usuario_id ? usuarios.find(function(u) { return u.id === m2.para_usuario_id; }) : null;
                destinatarios.push(paraUser ? paraUser.nombre : 'Todos');
                if (!m2.leido) todosLeidos = false;
                used[m2.id] = true;
            }
        }
        
        grouped.push({ msg: m, destinatarios: destinatarios, todosLeidos: todosLeidos });
    }
    
    var html = '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
    grouped.forEach(function(g) {
        var m = g.msg;
        var de = usuarios.find(function(u) { return u.id === m.de_usuario_id; });
        var deNombre = de ? de.nombre : 'Sistema';
        var paraNombres = g.destinatarios.join(', ');
        var fecha = new Date(m.fecha_envio);
        var fechaStr = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        var horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        
        var leidoIcon = g.todosLeidos ? ' <span title="Mensaje visto" style="color:#22c55e;font-size:0.8rem;">✓</span>' : '';
        
        html += '<div style="background:white;border:1px solid var(--border);border-radius:8px;padding:0.5rem 0.7rem;">';
        // Línea 1: Asunto + leído
        html += '<div style="font-size:0.88rem;font-weight:600;margin-bottom:0.15rem;">' + (m.asunto || 'Sin asunto') + leidoIcon + '</div>';
        // Línea 2: De → Para + Fecha (misma línea)
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.2rem;">';
        html += '<span style="font-size:0.75rem;color:var(--text-light);">De: ' + deNombre + ' → ' + paraNombres + '</span>';
        html += '<span style="font-size:0.7rem;color:var(--text-light);white-space:nowrap;margin-left:0.5rem;">' + fechaStr + ' ' + horaStr + '</span>';
        html += '</div>';
        // Línea 3: Contenido
        html += '<div style="font-size:0.85rem;white-space:pre-wrap;">' + (m.contenido || '') + '</div>';
        
        // Adjuntos en fila horizontal
        var adjuntos = m.adjuntos || [];
        if (typeof adjuntos === 'string') { try { adjuntos = JSON.parse(adjuntos); } catch(e) { adjuntos = []; } }
        if (adjuntos.length > 0) {
            html += '<div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-top:0.3rem;">';
            adjuntos.forEach(function(adj) {
                html += '<span onclick="viewDriveFileInline(\'' + adj.drive_file_id + '\', \'' + (adj.nombre || '').replace(/'/g, "\\'") + '\')" style="font-size:0.78rem;color:var(--primary);cursor:pointer;text-decoration:underline;background:#f0f7ff;padding:0.15rem 0.4rem;border-radius:4px;white-space:nowrap;">📎 ' + adj.nombre + '</span>';
            });
            html += '</div>';
        }
        
        // Legacy single adjunto
        if (adjuntos.length === 0 && m.adjunto_drive_file_id && m.adjunto_nombre) {
            html += '<div style="margin-top:0.3rem;"><span onclick="viewDriveFileInline(\'' + m.adjunto_drive_file_id + '\', \'' + (m.adjunto_nombre || '').replace(/'/g, "\\'") + '\')" style="font-size:0.78rem;color:var(--primary);cursor:pointer;text-decoration:underline;background:#f0f7ff;padding:0.15rem 0.4rem;border-radius:4px;">📎 ' + m.adjunto_nombre + '</span></div>';
        }
        
        html += '</div>';
    });
    html += '</div>';
    
    container.innerHTML = html;
}

console.log('✅ MENSAJES-UI.JS cargado');
