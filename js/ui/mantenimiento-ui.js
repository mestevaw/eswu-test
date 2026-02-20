// ============================================
// MANTENIMIENTO-UI.JS v1
// Módulo de mantenimiento preventivo/correctivo
// ============================================

var mantenimientoTrabajos = [];
var mantenimientoSortAsc = true;

// ============================================
// DATA LOADING
// ============================================

async function loadMantenimientoTrabajos() {
    try {
        var { data, error } = await supabaseClient
            .from('mantenimiento_trabajos')
            .select('*')
            .order('fecha_entrega_estimada', { ascending: true });
        
        if (error) throw error;
        mantenimientoTrabajos = data || [];
        return mantenimientoTrabajos;
    } catch (e) {
        console.error('Error cargando mantenimiento:', e);
        return [];
    }
}

// ============================================
// GLOBAL VIEW: Pendientes agrupados por proveedor
// ============================================

async function renderMantenimientoGlobal() {
    var contentDiv = document.getElementById('mantenimientoGlobalContent');
    if (!contentDiv) return;
    contentDiv.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:2rem;">⏳ Cargando...</p>';
    
    await loadMantenimientoTrabajos();
    
    // Filter only pendiente + en_proceso
    var pendientes = mantenimientoTrabajos.filter(function(t) {
        return t.estado === 'pendiente' || t.estado === 'en_proceso';
    });
    
    if (pendientes.length === 0) {
        contentDiv.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:2rem;">✅ No hay trabajos pendientes</p>';
        return;
    }
    
    // Group by proveedor
    var groups = {};
    pendientes.forEach(function(t) {
        var provId = t.proveedor_id || 0;
        if (!groups[provId]) groups[provId] = [];
        groups[provId].push(t);
    });
    
    var html = '';
    var hoy = new Date();
    hoy.setHours(0,0,0,0);
    
    // Sort groups by earliest due date
    var sortedKeys = Object.keys(groups).sort(function(a, b) {
        var aMin = groups[a].reduce(function(min, t) {
            var d = t.fecha_entrega_estimada ? new Date(t.fecha_entrega_estimada) : new Date('2099-01-01');
            return d < min ? d : min;
        }, new Date('2099-01-01'));
        var bMin = groups[b].reduce(function(min, t) {
            var d = t.fecha_entrega_estimada ? new Date(t.fecha_entrega_estimada) : new Date('2099-01-01');
            return d < min ? d : min;
        }, new Date('2099-01-01'));
        return aMin - bMin;
    });
    
    sortedKeys.forEach(function(provId) {
        var trabajos = groups[provId];
        var prov = proveedores.find(function(p) { return p.id === parseInt(provId); });
        var provNombre = prov ? prov.nombre : 'Proveedor desconocido';
        
        html += '<div style="margin-bottom:1.25rem;">';
        html += '<div style="font-weight:600; font-size:0.95rem; color:var(--primary); margin-bottom:0.4rem; cursor:pointer;" onclick="showProveedorDetail(' + provId + '); setTimeout(function(){switchTab(\'proveedor\',\'mantenimiento\');},200);">' + provNombre + ' ›</div>';
        html += '<div style="border:1px solid var(--border); border-radius:8px; overflow:hidden;">';
        
        trabajos.forEach(function(t, i) {
            var activo = activos.find(function(a) { return a.id === t.activo_id; });
            var activoNombre = activo ? activo.nombre : '—';
            var bgColor = i % 2 === 0 ? 'white' : 'var(--bg)';
            
            // Due date styling
            var fechaStr = '';
            var fechaStyle = 'color:var(--text-light);';
            if (t.fecha_entrega_estimada) {
                var fecha = new Date(t.fecha_entrega_estimada + 'T00:00:00');
                fechaStr = fecha.getDate() + '/' + (fecha.getMonth()+1) + '/' + fecha.getFullYear();
                if (fecha < hoy) {
                    fechaStyle = 'color:var(--danger); font-weight:600;';
                } else if (fecha - hoy < 7 * 86400000) {
                    fechaStyle = 'color:#d97706; font-weight:500;';
                }
            }
            
            var estadoBadge = t.estado === 'en_proceso' 
                ? '<span style="font-size:0.7rem; background:#dbeafe; color:#1e40af; padding:0.1rem 0.4rem; border-radius:3px;">En proceso</span>'
                : '<span style="font-size:0.7rem; background:#fef3c7; color:#92400e; padding:0.1rem 0.4rem; border-radius:3px;">Pendiente</span>';
            
            var recurrente = t.es_recurrente ? ' 🔄' : '';
            
            html += '<div onclick="showTrabajoDetail(' + t.id + ')" style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 0.75rem; background:' + bgColor + '; cursor:pointer; border-bottom:1px solid var(--border); transition:background 0.15s;" onmouseover="this.style.background=\'#f0f9ff\'" onmouseout="this.style.background=\'' + bgColor + '\'">';
            html += '<div style="flex:1; min-width:0;">';
            html += '<div style="font-size:0.85rem; font-weight:500;">' + t.descripcion + recurrente + '</div>';
            html += '<div style="font-size:0.75rem; color:var(--text-light);">' + activoNombre + '</div>';
            html += '</div>';
            html += estadoBadge;
            html += '<span style="font-size:0.78rem; white-space:nowrap; ' + fechaStyle + '">' + fechaStr + '</span>';
            html += '</div>';
        });
        
        html += '</div></div>';
    });
    
    contentDiv.innerHTML = html;
}

// ============================================
// PROVEEDOR TAB: Mantenimiento
// ============================================

async function renderProveedorMantenimiento() {
    var contentDiv = document.getElementById('proveedorMantenimientoContent');
    if (!contentDiv) return;
    contentDiv.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:1rem;">⏳ Cargando...</p>';
    
    await loadMantenimientoTrabajos();
    
    var provTrabajos = mantenimientoTrabajos.filter(function(t) {
        return t.proveedor_id === currentProveedorId;
    });
    
    if (provTrabajos.length === 0) {
        contentDiv.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:2rem;">No hay trabajos de mantenimiento</p>';
        return;
    }
    
    var hoy = new Date();
    hoy.setHours(0,0,0,0);
    
    // Split into pending and completed
    var pendientes = provTrabajos.filter(function(t) { return t.estado === 'pendiente' || t.estado === 'en_proceso'; });
    var completados = provTrabajos.filter(function(t) { return t.estado === 'completado' || t.estado === 'cancelado'; });
    
    // Sort pending by due date ascending
    pendientes.sort(function(a, b) {
        var da = a.fecha_entrega_estimada || '2099-01-01';
        var db = b.fecha_entrega_estimada || '2099-01-01';
        return da.localeCompare(db);
    });
    
    // Sort completed by date descending
    completados.sort(function(a, b) {
        var da = a.fecha_completado || a.created_at || '';
        var db = b.fecha_completado || b.created_at || '';
        return db.localeCompare(da);
    });
    
    var html = '';
    
    // Pending
    if (pendientes.length > 0) {
        html += '<div style="border:1px solid var(--border); border-radius:8px; overflow:hidden; margin-bottom:0.75rem;">';
        pendientes.forEach(function(t, i) {
            html += renderTrabajoRow(t, i, false, hoy);
        });
        html += '</div>';
    }
    
    // Completed
    if (completados.length > 0) {
        html += '<div style="margin-top:0.5rem; font-size:0.78rem; color:var(--text-light); font-weight:500; margin-bottom:0.3rem;">Completados</div>';
        html += '<div style="border:1px solid var(--border); border-radius:8px; overflow:hidden; opacity:0.6;">';
        completados.forEach(function(t, i) {
            html += renderTrabajoRow(t, i, true, hoy);
        });
        html += '</div>';
    }
    
    contentDiv.innerHTML = html;
}

function renderTrabajoRow(t, i, isCompleted, hoy) {
    var activo = activos.find(function(a) { return a.id === t.activo_id; });
    var activoNombre = activo ? activo.nombre : '—';
    var bgColor = i % 2 === 0 ? 'white' : 'var(--bg)';
    
    var fechaStr = '';
    var fechaStyle = 'color:var(--text-light);';
    var fechaField = isCompleted ? (t.fecha_completado || '') : (t.fecha_entrega_estimada || '');
    if (fechaField) {
        var fecha = new Date(fechaField + 'T00:00:00');
        fechaStr = fecha.getDate() + '/' + (fecha.getMonth()+1) + '/' + fecha.getFullYear();
        if (!isCompleted && fecha < hoy) {
            fechaStyle = 'color:var(--danger); font-weight:600;';
        } else if (!isCompleted && (fecha - hoy) < 7 * 86400000) {
            fechaStyle = 'color:#d97706; font-weight:500;';
        }
    }
    
    var estadoBadges = {
        'pendiente': '<span style="font-size:0.68rem; background:#fef3c7; color:#92400e; padding:0.1rem 0.35rem; border-radius:3px;">Pendiente</span>',
        'en_proceso': '<span style="font-size:0.68rem; background:#dbeafe; color:#1e40af; padding:0.1rem 0.35rem; border-radius:3px;">En proceso</span>',
        'completado': '<span style="font-size:0.68rem; background:#dcfce7; color:#166534; padding:0.1rem 0.35rem; border-radius:3px;">Completado</span>',
        'cancelado': '<span style="font-size:0.68rem; background:#f1f5f9; color:#64748b; padding:0.1rem 0.35rem; border-radius:3px;">Cancelado</span>'
    };
    var badge = estadoBadges[t.estado] || '';
    var recurrente = t.es_recurrente ? ' 🔄' : '';
    
    var row = '<div onclick="showTrabajoDetail(' + t.id + ')" style="display:flex; align-items:center; gap:0.5rem; padding:0.45rem 0.7rem; background:' + bgColor + '; cursor:pointer; border-bottom:1px solid var(--border); transition:background 0.15s;" onmouseover="this.style.background=\'#f0f9ff\'" onmouseout="this.style.background=\'' + bgColor + '\'">';
    row += '<div style="flex:1; min-width:0;">';
    row += '<div style="font-size:0.84rem; font-weight:500;">' + t.descripcion + recurrente + '</div>';
    row += '<div style="font-size:0.73rem; color:var(--text-light);">' + activoNombre + '</div>';
    row += '</div>';
    row += badge;
    row += '<span style="font-size:0.75rem; white-space:nowrap; ' + fechaStyle + '">' + fechaStr + '</span>';
    row += '</div>';
    return row;
}

// ============================================
// MODAL: Nuevo Trabajo
// ============================================

function showNuevoTrabajoModal() {
    var modal = document.getElementById('nuevoTrabajoModal');
    if (!modal) return;
    
    // Populate activos dropdown
    var sel = document.getElementById('trabajoActivo');
    if (sel) {
        sel.innerHTML = '<option value="">-- Seleccione activo --</option>';
        activos.forEach(function(a) {
            sel.innerHTML += '<option value="' + a.id + '">' + a.nombre + '</option>';
        });
    }
    
    // Defaults
    document.getElementById('trabajoDescripcion').value = '';
    document.getElementById('trabajoFechaSolicitud').value = new Date().toISOString().split('T')[0];
    document.getElementById('trabajoFechaEntrega').value = '';
    document.getElementById('trabajoEsRecurrente').checked = false;
    document.getElementById('trabajoRecurrenciaFields').style.display = 'none';
    document.getElementById('trabajoFrecuencia').value = '';
    document.getElementById('trabajoNotas').value = '';
    
    modal.classList.add('active');
}

function toggleRecurrenciaFields() {
    var checked = document.getElementById('trabajoEsRecurrente').checked;
    document.getElementById('trabajoRecurrenciaFields').style.display = checked ? 'block' : 'none';
}

async function saveNuevoTrabajo(event) {
    event.preventDefault();
    
    var activoId = document.getElementById('trabajoActivo').value;
    var descripcion = document.getElementById('trabajoDescripcion').value.trim();
    var fechaSolicitud = document.getElementById('trabajoFechaSolicitud').value;
    var fechaEntrega = document.getElementById('trabajoFechaEntrega').value;
    var esRecurrente = document.getElementById('trabajoEsRecurrente').checked;
    var frecuencia = esRecurrente ? document.getElementById('trabajoFrecuencia').value : null;
    var notas = document.getElementById('trabajoNotas').value.trim();
    
    if (!descripcion) { alert('Ingresa una descripción'); return; }
    
    showLoading();
    try {
        var record = {
            proveedor_id: currentProveedorId,
            activo_id: activoId ? parseInt(activoId) : null,
            descripcion: descripcion,
            estado: 'pendiente',
            fecha_solicitud: fechaSolicitud || null,
            fecha_entrega_estimada: fechaEntrega || null,
            es_recurrente: esRecurrente,
            frecuencia: frecuencia,
            notas: notas || null,
            usuario_creo: currentUser ? currentUser.nombre : ''
        };
        
        // Calculate proxima_fecha for recurrent
        if (esRecurrente && fechaEntrega && frecuencia) {
            record.proxima_fecha = calcularProximaFecha(fechaEntrega, frecuencia);
        }
        
        var { error } = await supabaseClient
            .from('mantenimiento_trabajos')
            .insert([record]);
        
        if (error) throw error;
        
        closeModal('nuevoTrabajoModal');
        renderProveedorMantenimiento();
        
    } catch (e) {
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

function calcularProximaFecha(fechaBase, frecuencia) {
    var d = new Date(fechaBase + 'T00:00:00');
    if (frecuencia === 'mensual') d.setMonth(d.getMonth() + 1);
    else if (frecuencia === 'semestral') d.setMonth(d.getMonth() + 6);
    else if (frecuencia === 'anual') d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
}

// ============================================
// PLACEHOLDER: Detalle trabajo (Fase C)
// ============================================

function showTrabajoDetail(trabajoId) {
    var t = mantenimientoTrabajos.find(function(w) { return w.id === trabajoId; });
    if (!t) return;
    
    var activo = activos.find(function(a) { return a.id === t.activo_id; });
    var activoNombre = activo ? activo.nombre : '—';
    var prov = proveedores.find(function(p) { return p.id === t.proveedor_id; });
    var provNombre = prov ? prov.nombre : '—';
    
    // For now, simple alert with details - will be full modal in Fase C
    var msg = '📋 ' + t.descripcion + '\n\n';
    msg += 'Proveedor: ' + provNombre + '\n';
    msg += 'Activo: ' + activoNombre + '\n';
    msg += 'Estado: ' + t.estado + '\n';
    if (t.fecha_solicitud) msg += 'Solicitado: ' + t.fecha_solicitud + '\n';
    if (t.fecha_entrega_estimada) msg += 'Entrega estimada: ' + t.fecha_entrega_estimada + '\n';
    if (t.es_recurrente) msg += 'Recurrente: ' + t.frecuencia + '\n';
    if (t.notas) msg += '\nNotas: ' + t.notas;
    
    alert(msg);
}

// ============================================
// DOCUMENT SORTING (reusable)
// ============================================

var _docSortStates = {};

function toggleDocSort(tableId, columnIdx) {
    if (!_docSortStates[tableId]) _docSortStates[tableId] = { col: columnIdx, asc: true };
    var state = _docSortStates[tableId];
    
    if (state.col === columnIdx) {
        state.asc = !state.asc;
    } else {
        state.col = columnIdx;
        state.asc = true;
    }
    
    var table = document.getElementById(tableId);
    if (!table) return;
    var tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    var rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort(function(a, b) {
        var cellA = a.cells[columnIdx] ? a.cells[columnIdx].textContent.trim().toLowerCase() : '';
        var cellB = b.cells[columnIdx] ? b.cells[columnIdx].textContent.trim().toLowerCase() : '';
        var cmp = cellA.localeCompare(cellB);
        return state.asc ? cmp : -cmp;
    });
    
    rows.forEach(function(row) { tbody.appendChild(row); });
    
    // Update header indicator
    var headers = table.querySelectorAll('thead th');
    headers.forEach(function(th, idx) {
        // Remove existing arrows
        var text = th.textContent.replace(/ [▲▼]/g, '');
        if (idx === columnIdx) {
            th.textContent = text + (state.asc ? ' ▲' : ' ▼');
        } else {
            th.textContent = text;
        }
    });
}

console.log('✅ MANTENIMIENTO-UI.JS v1 cargado');
