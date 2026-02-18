/* ========================================
   DB-MENSAJES.JS
   Carga y guardado de mensajes, avisos y alertas
   ======================================== */

var mensajes = [];
var avisos = [];
var alertasSistema = [];

// ============================================
// LOAD MENSAJES
// ============================================

async function loadMensajes() {
    try {
        // Mensajes donde soy destinatario (o para todos)
        const { data, error } = await supabaseClient
            .from('mensajes')
            .select('*, de_usuario:de_usuario_id(nombre), para_usuario:para_usuario_id(nombre)')
            .or(`para_usuario_id.eq.${currentUser.id},para_usuario_id.is.null`)
            .order('fecha_envio', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        mensajes = data || [];
        
    } catch (error) {
        console.error('Error loading mensajes:', error);
        mensajes = [];
    }
}

async function loadMensajesEnviados() {
    try {
        const { data, error } = await supabaseClient
            .from('mensajes')
            .select('*, de_usuario:de_usuario_id(nombre), para_usuario:para_usuario_id(nombre)')
            .eq('de_usuario_id', currentUser.id)
            .order('fecha_envio', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        return data || [];
        
    } catch (error) {
        console.error('Error loading enviados:', error);
        return [];
    }
}

// ============================================
// SEND MENSAJE
// ============================================

async function enviarMensaje(paraUsuarioId, asunto, contenido, referenciaTipo, referenciaId, adjuntoDriveId, adjuntoNombre) {
    showLoading();
    try {
        const msgData = {
            de_usuario_id: currentUser.id,
            para_usuario_id: paraUsuarioId || null,
            asunto: asunto,
            contenido: contenido
        };
        
        // Vincular a ficha si viene referencia
        if (referenciaTipo && referenciaId) {
            msgData.referencia_tipo = referenciaTipo;
            msgData.referencia_id = parseInt(referenciaId);
        }
        
        // Adjunto
        if (adjuntoDriveId) {
            msgData.adjunto_drive_file_id = adjuntoDriveId;
            msgData.adjunto_nombre = adjuntoNombre || 'Documento';
        }
        
        if (paraUsuarioId === 'todos') {
            // Enviar uno individual a cada usuario activo
            const otrosUsuarios = usuarios.filter(u => u.id !== currentUser.id && u.activo);
            for (const u of otrosUsuarios) {
                const { error } = await supabaseClient
                    .from('mensajes')
                    .insert([{ ...msgData, para_usuario_id: u.id }]);
                if (error) throw error;
            }
        } else {
            const { error } = await supabaseClient
                .from('mensajes')
                .insert([msgData]);
            if (error) throw error;
        }
        
        await loadMensajes();
        return true;
        
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        alert('Error al enviar mensaje: ' + error.message);
        return false;
    } finally {
        hideLoading();
    }
}

// ============================================
// MARCAR COMO LEÍDO
// ============================================

async function marcarMensajeLeido(msgId) {
    try {
        await supabaseClient
            .from('mensajes')
            .update({ leido: true, fecha_leido: new Date().toISOString() })
            .eq('id', msgId);
        
        // Actualizar local
        const msg = mensajes.find(m => m.id === msgId);
        if (msg) {
            msg.leido = true;
            msg.fecha_leido = new Date().toISOString();
        }
        updateNotificationBadge();
    } catch (error) {
        console.error('Error marcando leído:', error);
    }
}

async function eliminarMensaje(msgId) {
    if (!confirm('¿Eliminar este mensaje?')) return;
    try {
        await supabaseClient
            .from('mensajes')
            .delete()
            .eq('id', msgId);
        
        await loadMensajes();
        renderMensajesView();
        updateNotificationBadge();
    } catch (error) {
        console.error('Error eliminando mensaje:', error);
    }
}

// ============================================
// AVISOS
// ============================================

async function loadAvisos() {
    try {
        const { data, error } = await supabaseClient
            .from('avisos')
            .select('*, usuario:usuario_id(nombre), avisos_leidos(usuario_id)')
            .eq('activo', true)
            .order('fecha_publicacion', { ascending: false });
        
        if (error) throw error;
        avisos = data || [];
        
    } catch (error) {
        console.error('Error loading avisos:', error);
        avisos = [];
    }
}

async function publicarAviso(titulo, contenido, fechaExpiracion) {
    showLoading();
    try {
        const avisoData = {
            usuario_id: currentUser.id,
            titulo: titulo,
            contenido: contenido,
            fecha_expiracion: fechaExpiracion || null
        };
        
        const { error } = await supabaseClient
            .from('avisos')
            .insert([avisoData]);
        
        if (error) throw error;
        
        await loadAvisos();
        return true;
        
    } catch (error) {
        console.error('Error publicando aviso:', error);
        alert('Error al publicar aviso: ' + error.message);
        return false;
    } finally {
        hideLoading();
    }
}

async function marcarAvisoLeido(avisoId) {
    try {
        await supabaseClient
            .from('avisos_leidos')
            .upsert([{ aviso_id: avisoId, usuario_id: currentUser.id }]);
        
        // Actualizar local
        const aviso = avisos.find(a => a.id === avisoId);
        if (aviso && aviso.avisos_leidos) {
            aviso.avisos_leidos.push({ usuario_id: currentUser.id });
        }
        updateNotificationBadge();
    } catch (error) {
        console.error('Error marcando aviso leído:', error);
    }
}

async function desactivarAviso(avisoId) {
    if (!confirm('¿Desactivar este aviso?')) return;
    try {
        await supabaseClient
            .from('avisos')
            .update({ activo: false })
            .eq('id', avisoId);
        
        await loadAvisos();
        renderAvisosView();
        updateNotificationBadge();
    } catch (error) {
        console.error('Error desactivando aviso:', error);
    }
}

// ============================================
// ALERTAS AUTOMÁTICAS DEL SISTEMA
// ============================================

function generarAlertasSistema() {
    alertasSistema = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // 1. Contratos por vencer (30, 60, 90 días)
    inquilinos.forEach(inq => {
        if (!inq.contrato_activo) return;
        const venc = new Date(inq.fecha_vencimiento + 'T00:00:00');
        const dias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
        
        if (dias < 0) {
            alertasSistema.push({
                tipo: 'danger',
                icono: '📄',
                texto: `Contrato de ${inq.nombre} venció hace ${Math.abs(dias)} días`,
                accion: () => showInquilinoDetail(inq.id)
            });
        } else if (dias <= 30) {
            alertasSistema.push({
                tipo: 'warning',
                icono: '📄',
                texto: `Contrato de ${inq.nombre} vence en ${dias} días`,
                accion: () => showInquilinoDetail(inq.id)
            });
        } else if (dias <= 90) {
            alertasSistema.push({
                tipo: 'info',
                icono: '📄',
                texto: `Contrato de ${inq.nombre} vence en ${dias} días`,
                accion: () => showInquilinoDetail(inq.id)
            });
        }
    });
    
    // 2. Facturas vencidas sin pagar
    proveedores.forEach(prov => {
        if (!prov.facturas) return;
        prov.facturas.forEach(f => {
            if (f.fecha_pago) return; // ya pagada
            const venc = new Date(f.vencimiento + 'T00:00:00');
            const dias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
            
            if (dias < 0) {
                alertasSistema.push({
                    tipo: 'danger',
                    icono: '💰',
                    texto: `Factura de ${prov.nombre} vencida hace ${Math.abs(dias)} días (${formatCurrency(f.monto)})`,
                    accion: () => showProveedorDetail(prov.id)
                });
            } else if (dias <= 7) {
                alertasSistema.push({
                    tipo: 'warning',
                    icono: '💰',
                    texto: `Factura de ${prov.nombre} vence en ${dias} días (${formatCurrency(f.monto)})`,
                    accion: () => showProveedorDetail(prov.id)
                });
            }
        });
    });
    
    // 3. Rentas no pagadas del mes actual
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    
    inquilinos.forEach(inq => {
        if (!inq.contrato_activo) return;
        
        const pagoEsteMes = (inq.pagos || []).some(p => {
            const fp = new Date(p.fecha + 'T00:00:00');
            return fp.getMonth() === mesActual && fp.getFullYear() === anioActual;
        });
        
        if (!pagoEsteMes && hoy.getDate() > 5) {
            alertasSistema.push({
                tipo: 'warning',
                icono: '🏠',
                texto: `${inq.nombre} no ha pagado renta de este mes`,
                accion: () => showInquilinoDetail(inq.id)
            });
        }
    });
    
    // Ordenar: danger primero, luego warning, luego info
    const orden = { danger: 0, warning: 1, info: 2 };
    alertasSistema.sort((a, b) => orden[a.tipo] - orden[b.tipo]);
}

// ============================================
// CONTEO DE NO LEÍDOS
// ============================================

function contarNoLeidos() {
    const mensajesNoLeidos = mensajes.filter(m => !m.leido).length;
    
    const avisosNoLeidos = avisos.filter(a => {
        if (a.fecha_expiracion && new Date(a.fecha_expiracion) < new Date()) return false;
        const yaLeido = (a.avisos_leidos || []).some(l => l.usuario_id === currentUser.id);
        return !yaLeido;
    }).length;
    
    return mensajesNoLeidos + avisosNoLeidos + alertasSistema.length;
}

function updateNotificationBadge() {
    const total = contarNoLeidos();
    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

// ============================================
// MENSAJES POR REFERENCIA (ficha inquilino/proveedor)
// ============================================

async function loadMensajesPorReferencia(tipo, id) {
    try {
        const { data, error } = await supabaseClient
            .from('mensajes')
            .select('*')
            .eq('referencia_tipo', tipo)
            .eq('referencia_id', id)
            .order('fecha_envio', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('Error cargando mensajes de referencia:', e);
        return [];
    }
}

console.log('✅ DB-MENSAJES.JS cargado');
