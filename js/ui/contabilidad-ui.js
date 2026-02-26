/* ========================================
   CONTABILIDAD-UI.JS v15 (UNIFICADO)
   Última actualización: 2026-02-21
   
   Explorador de Drive, carpetas, búsqueda,
   vinculación, importación, sincronización,
   upload modal, Supabase index, nivel 4.
   
   Variables compartidas en config.js:
   contabilidadCarpetas, contabilidadAnioSeleccionado,
   editingCarpetaId, contabilidadNavStack,
   currentDriveFolderId, contabilidadPendingFiles,
   SUBCARPETAS_MES, MESES_NOMBRES
   ======================================== */

// ============================================
// SHOW CONTABILIDAD PAGE
// ============================================

function showContabilidadPage() {
    if (typeof showHeader === 'function') showHeader();
    if (isMobile()) hideMobileMenu();
    document.getElementById('adminSubMenu').classList.remove('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('contabilidadPage').classList.add('active');
    
    currentSubContext = 'admin-contabilidad';
    
    document.getElementById('btnRegresa').classList.remove('hidden');
    document.getElementById('btnSearch').classList.add('hidden');
    
    document.getElementById('contentArea').classList.remove('with-submenu');
    document.getElementById('menuSidebar').classList.add('hidden');
    document.getElementById('contentArea').classList.add('fullwidth');
    
    contabilidadNavStack = [];
    currentDriveFolderId = null;
    loadContabilidadCarpetas();
}

// ============================================
// LOAD CARPETAS
// ============================================

async function loadContabilidadCarpetas() {
    try {
        const { data, error } = await supabaseClient
            .from('contabilidad_carpetas')
            .select('*')
            .order('anio', { ascending: false })
            .order('mes', { ascending: true });
        if (error) throw error;
        contabilidadCarpetas = data || [];
        // Only render if on contabilidad page
        if (document.getElementById('contabilidadPage') && document.getElementById('contabilidadPage').classList.contains('active')) {
            renderContabilidadContent();
        }
        // Check if next year needs creation (Nov+)
        setTimeout(checkAutoCreateNextYear, 2000);
    } catch (e) {
        console.error('Error cargando contabilidad:', e);
    }
}

// ============================================
// RENDER CONTENT
// ============================================

function renderContabilidadContent() {
    const connected = isGoogleConnected();
    
    if (!connected) {
        document.getElementById('gdriveConnectBar').style.display = 'flex';
        document.getElementById('gdriveConnectBar').innerHTML = '<span style="font-size:0.85rem; color:var(--text-light);">Reconectando Google Drive...</span>';
        // Auto-reconnect silently
        if (typeof requireGdrive === 'function') {
            requireGdrive().then(function(ok) {
                if (ok) renderContabilidadContent();
            });
        }
    } else {
        document.getElementById('gdriveConnectBar').style.display = 'none';
    }
    document.getElementById('contabilidadSearchBar').style.display = 'block';
    
    if (connected && contabilidadNavStack.length > 0) {
        // Inside a folder
        if (contabilidadNavStack.length >= 2) {
            loadSubcarpetaFromSupabase();
        } else {
            navigateToDriveFolder(currentDriveFolderId);
        }
        return;
    }
    
    document.getElementById('contabilidadUploadBtn').style.display = 'none';
    updateContabilidadTitle('Contabilidad');
    renderContabilidadYearsAndMonths();
}

function renderContabilidadYearsAndMonths() {
    const aniosDiv = document.getElementById('contabilidadAnios');
    const contentDiv = document.getElementById('contabilidadContent');
    
    const anios = [...new Set(contabilidadCarpetas.map(c => c.anio))].sort((a, b) => b - a);
    
    if (anios.length === 0) {
        aniosDiv.innerHTML = '';
        var emptyHtml = '<p style="color:var(--text-light);">No hay carpetas registradas.</p>';
        if (isGoogleConnected() && currentUser && (currentUser.nivel <= 2 || currentUser.nivel === 4)) {
            emptyHtml += '<div style="margin-top:0.5rem;"><span onclick="importarAniosExistentes()" style="font-size:0.85rem; color:var(--primary); cursor:pointer; text-decoration:underline;">📥 Importar años existentes de Google Drive</span></div>';
        }
        contentDiv.innerHTML = emptyHtml;
        return;
    }
    
    if (!contabilidadAnioSeleccionado || !anios.includes(contabilidadAnioSeleccionado)) {
        contabilidadAnioSeleccionado = anios[0];
    }
    
    // Year buttons
    aniosDiv.innerHTML = anios.map(a => {
        const isActive = a === contabilidadAnioSeleccionado;
        return '<button onclick="selectContabilidadAnio(' + a + ')" style="padding:0.5rem 1rem; border-radius:6px; border:2px solid ' + (isActive ? 'var(--primary)' : 'var(--border)') + '; background:' + (isActive ? 'var(--primary)' : 'white') + '; color:' + (isActive ? 'white' : 'var(--text)') + '; font-weight:600; font-size:1rem; cursor:pointer; transition:all 0.2s;">' + a + '</button>';
    }).join('');
    
    // Month cards
    const mesesAnio = contabilidadCarpetas.filter(c => c.anio === contabilidadAnioSeleccionado);
    const connected = isGoogleConnected();
    
    if (mesesAnio.length === 0) {
        contentDiv.innerHTML = '<p style="color:var(--text-light); margin-top:1rem;">No hay carpetas para este año.</p>';
        return;
    }
    
    contentDiv.innerHTML = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:0.5rem;">' +
        mesesAnio.map(c => {
            const mesNum = String(c.mes).padStart(2, '0');
            const mesNombre = MESES_NOMBRES[c.mes] || 'Mes ' + c.mes;
            const folderId = extractFolderId(c.google_drive_url);
            
            const clickAction = connected && folderId
                ? 'onclick="openMonthFolder(' + c.anio + ', \'' + mesNombre + '\', \'' + folderId + '\')"'
                : 'onclick="window.open(\'' + c.google_drive_url + '\', \'_blank\')"';
            
            return '<div ' + clickAction + ' style="background:white; border:1px solid var(--border); border-radius:8px; padding:0.6rem 0.8rem; display:flex; align-items:center; gap:0.5rem; cursor:pointer; transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,0.12)\'" onmouseout="this.style.boxShadow=\'none\'">' +
                '<span style="font-size:1.3rem;">📁</span>' +
                '<div>' +
                    '<div style="font-weight:600; font-size:0.95rem;">' + mesNum + '. ' + mesNombre + '</div>' +
                    '<div style="font-size:0.7rem; color:var(--text-light);">' + (connected ? 'Ver contenido' : 'Abrir en Drive') + '</div>' +
                '</div>' +
            '</div>';
        }).join('') + '</div>';
    
    // Add import link at bottom (nivel 1-2 and nivel 4 contabilidad)
    if (connected && currentUser && (currentUser.nivel <= 2 || currentUser.nivel === 4)) {
        contentDiv.innerHTML += '<div style="margin-top:1rem; text-align:center; display:flex; flex-direction:column; gap:0.4rem; align-items:center;">'
            + '<span onclick="importarAniosExistentes()" style="font-size:0.8rem; color:var(--primary); cursor:pointer; text-decoration:underline;">📥 Importar años existentes de Google Drive</span>'
            + '<span onclick="sincronizarIndiceCompleto()" style="font-size:0.8rem; color:var(--primary); cursor:pointer; text-decoration:underline;">🔄 Sincronizar índice de documentos</span>'
            + '</div>';
    }
}

function selectContabilidadAnio(anio) {
    contabilidadAnioSeleccionado = anio;
    contabilidadNavStack = [];
    currentDriveFolderId = null;
    renderContabilidadYearsAndMonths();
}

// ============================================
// DRIVE FOLDER NAVIGATION
// ============================================

function openMonthFolder(anio, mesNombre, folderId) {
    contabilidadNavStack = [{ label: anio + ' > ' + mesNombre, folderId: null }];
    currentDriveFolderId = folderId;
    document.getElementById('contabilidadAnios').style.display = 'none';
    document.getElementById('contabilidadHomeBtn').style.display = 'inline';
    updateContabilidadTitle(anio + ' › ' + mesNombre);
    navigateToDriveFolder(folderId);
}

function openDriveSubfolder(name, folderId) {
    contabilidadNavStack.push({ label: name, folderId: currentDriveFolderId });
    currentDriveFolderId = folderId;
    
    // Build title from full path
    var titleParts = contabilidadNavStack.map(function(s) { return s.label; });
    updateContabilidadTitle(titleParts.join(' › ').replace(/ > /g, ' › '));
    
    // If we're at subcarpeta level (navStack >= 2), load from Supabase
    if (contabilidadNavStack.length >= 2) {
        loadSubcarpetaFromSupabase();
    } else {
        navigateToDriveFolder(folderId);
    }
}

function contabilidadGoHome() {
    navigateBackTo(-1);
}

function navigateBackTo(index) {
    if (index < 0) {
        // Go back to years/months view
        contabilidadNavStack = [];
        currentDriveFolderId = null;
        document.getElementById('contabilidadUploadBtn').style.display = 'none';
        document.getElementById('contabilidadHomeBtn').style.display = 'none';
        document.getElementById('contabilidadAnios').style.display = 'flex';
        document.getElementById('contabilidadSearchInput').value = '';
        updateContabilidadTitle('Contabilidad');
        renderContabilidadYearsAndMonths();
        return;
    }
    
    // Navigate to specific level
    const target = contabilidadNavStack[index];
    contabilidadNavStack = contabilidadNavStack.slice(0, index + 1);
    
    // Update title
    var titleParts = contabilidadNavStack.map(function(s) { return s.label; });
    updateContabilidadTitle(titleParts.join(' › ').replace(/ > /g, ' › '));
    
    if (index === 0) {
        // Back to month level
        const folderId = extractFolderId(
            contabilidadCarpetas.find(c => {
                const label = c.anio + ' > ' + (MESES_NOMBRES[c.mes] || '');
                return label === target.label;
            })?.google_drive_url
        );
        currentDriveFolderId = folderId;
        navigateToDriveFolder(folderId);
    } else {
        // Inside a subcarpeta
        currentDriveFolderId = contabilidadNavStack[index - 1]?.folderId || currentDriveFolderId;
        loadSubcarpetaFromSupabase();
    }
}

function updateContabilidadTitle(text) {
    var el = document.getElementById('contabilidadTitle');
    if (el) el.textContent = text || 'Contabilidad';
}

// ============================================
// NAVIGATE TO DRIVE FOLDER
// ============================================

async function navigateToDriveFolder(folderId) {
    const contentDiv = document.getElementById('contabilidadContent');
    contentDiv.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:2rem;">⏳ Cargando...</p>';
    
    document.getElementById('contabilidadHomeBtn').style.display = 'inline';
    document.getElementById('contabilidadUploadBtn').style.display = 'none';
    
    try {
        const { folders, files } = await listDriveFolder(folderId);
        
        let html = '';
        
        // Subfolders as cards
        if (folders.length > 0) {
            html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:0.5rem; margin-bottom:1rem;">';
            folders.forEach(f => {
                html += '<div onclick="openDriveSubfolder(\'' + f.name.replace(/'/g, "\\'") + '\', \'' + f.id + '\')" style="background:white; border:1px solid var(--border); border-radius:8px; padding:0.6rem 0.8rem; display:flex; align-items:center; gap:0.5rem; cursor:pointer; transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,0.12)\'" onmouseout="this.style.boxShadow=\'none\'">' +
                    '<span style="font-size:1.3rem;">📁</span>' +
                    '<div style="font-weight:600; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + f.name + '</div>' +
                '</div>';
            });
            html += '</div>';
        }
        
        // If there are also files at this level (month has direct files), show them simply
        if (files.length > 0 && folders.length === 0) {
            // This is a leaf folder — redirect to Supabase view
            loadSubcarpetaFromSupabase();
            return;
        }
        
        if (folders.length === 0 && files.length === 0) {
            html = '<p style="text-align:center; color:var(--text-light); padding:2rem;">📭 Carpeta vacía</p>';
        }
        
        contentDiv.innerHTML = html;
        
        // Background-index any files from Drive into Supabase
        if (files.length > 0 && contabilidadNavStack.length >= 2) {
            indexFilesToSupabase(files);
        }
        
    } catch (e) {
        console.error('Error navigating folder:', e);
        contentDiv.innerHTML = '<p style="text-align:center; color:var(--danger); padding:2rem;">Error: ' + e.message + '</p>';
    }
}

// ============================================
// LOAD FILES FROM SUPABASE (fast)
// ============================================

async function loadSubcarpetaFromSupabase() {
    var contentDiv = document.getElementById('contabilidadContent');
    contentDiv.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:1rem;">⏳ Cargando documentos...</p>';
    
    // Parse path info
    var pathLabel = contabilidadNavStack[0] ? contabilidadNavStack[0].label : '';
    var parts = pathLabel.split(' > ');
    var anio = parseInt(parts[0]) || 0;
    var mesNombre = (parts[1] || '').trim();
    var mesNum = MESES_NOMBRES.indexOf(mesNombre);
    var subcarpeta = contabilidadNavStack.length >= 2 ? contabilidadNavStack[contabilidadNavStack.length - 1].label : '';
    
    document.getElementById('contabilidadUploadBtn').style.display = 'inline';
    
    try {
        var query = supabaseClient
            .from('contabilidad_documentos')
            .select('*')
            .order('nombre', { ascending: true });
        
        if (anio) query = query.eq('anio', anio);
        if (mesNum > 0) query = query.eq('mes', mesNum);
        if (subcarpeta) query = query.eq('subcarpeta', subcarpeta);
        
        var { data: docs, error } = await query;
        if (error) throw error;
        
        var html = '';
        
        // File list
        if (docs && docs.length > 0) {
            html += '<div style="border:1px solid var(--border); border-radius:8px; overflow:hidden;">';
            docs.forEach(function(doc, i) {
                var icon = getFileIcon(doc.nombre, doc.mime_type);
                var bgColor = i % 2 === 0 ? 'white' : 'var(--bg)';
                var safeName = doc.nombre.replace(/'/g, "\\'");
                
                // Date formatting
                var fechaStr = '';
                if (doc.created_at) {
                    var d = new Date(doc.created_at);
                    var dia = d.getDate();
                    var mes = d.getMonth() + 1;
                    var yr = d.getFullYear();
                    fechaStr = dia + '/' + mes + '/' + yr;
                }
                
                var usuario = doc.usuario_subio || '';
                var metaInfo = '';
                if (fechaStr || usuario) {
                    metaInfo = '<span style="font-size:0.72rem; color:var(--text-light); white-space:nowrap;">' + fechaStr + (usuario ? ' · ' + usuario : '') + '</span>';
                }
                
                html += '<div onclick="viewDriveFileInline(\'' + doc.google_drive_file_id + '\', \'' + safeName + '\')" style="display:flex; align-items:center; gap:0.6rem; padding:0.5rem 0.8rem; background:' + bgColor + '; cursor:pointer; border-bottom:1px solid var(--border); transition:background 0.15s;" onmouseover="this.style.background=\'#f0f9ff\'" onmouseout="this.style.background=\'' + bgColor + '\'">';
                html += '<span style="font-size:1.1rem;">' + icon + '</span>';
                html += '<div style="flex:1; min-width:120px;"><div style="font-size:0.88rem; font-weight:500; word-break:break-word;">' + doc.nombre + '</div></div>';
                html += metaInfo;
                html += '</div>';
            });
            html += '</div>';
        } else {
            html += '<p style="text-align:center; color:var(--text-light); padding:1rem;">No hay documentos registrados</p>';
        }
        
        contentDiv.innerHTML = html;
        
        // Also sync from Drive in background (to catch files not yet indexed)
        syncSubcarpetaFromDrive(anio, mesNum, subcarpeta);
        
    } catch (e) {
        console.error('Error loading from Supabase:', e);
        // Fallback to Drive
        contentDiv.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:1rem;">Cargando desde Drive...</p>';
        loadSubcarpetaFromDriveFallback();
    }
}

async function syncSubcarpetaFromDrive(anio, mesNum, subcarpeta) {
    // Silently check if Drive has files not yet in Supabase
    if (!currentDriveFolderId || !isGoogleConnected()) return;
    try {
        var { files } = await listDriveFolder(currentDriveFolderId);
        if (files && files.length > 0) {
            var newCount = 0;
            for (var i = 0; i < files.length; i++) {
                var f = files[i];
                if (f.mimeType === 'application/vnd.google-apps.folder') continue;
                var { data: existing } = await supabaseClient
                    .from('contabilidad_documentos')
                    .select('id')
                    .eq('google_drive_file_id', f.id)
                    .limit(1);
                if (existing && existing.length > 0) continue;
                
                await supabaseClient.from('contabilidad_documentos').insert([{
                    nombre: f.name,
                    anio: anio,
                    mes: mesNum,
                    subcarpeta: subcarpeta,
                    google_drive_file_id: f.id,
                    size_bytes: parseInt(f.size) || 0,
                    mime_type: f.mimeType || ''
                }]);
                newCount++;
            }
            if (newCount > 0) {
                console.log('📇 Sincronizados ' + newCount + ' archivos nuevos de Drive');
                // Reload the view with new data
                loadSubcarpetaFromSupabase();
            }
        }
    } catch (e) {
        // Silent — best effort sync
    }
}

async function loadSubcarpetaFromDriveFallback() {
    // Fallback: load files directly from Drive (old behavior)
    if (!currentDriveFolderId) return;
    try {
        var { files } = await listDriveFolder(currentDriveFolderId);
        var contentDiv = document.getElementById('contabilidadContent');
        var html = '';
        if (files && files.length > 0) {
            html += '<div style="border:1px solid var(--border); border-radius:8px; overflow:hidden;">';
            files.forEach(function(f, i) {
                var icon = getFileIcon(f.name, f.mimeType);
                var bgColor = i % 2 === 0 ? 'white' : 'var(--bg)';
                var safeName = f.name.replace(/'/g, "\\'");
                html += '<div onclick="viewDriveFileInline(\'' + f.id + '\', \'' + safeName + '\')" style="display:flex; align-items:center; gap:0.6rem; padding:0.5rem 0.8rem; background:' + bgColor + '; cursor:pointer; border-bottom:1px solid var(--border);">';
                html += '<span style="font-size:1.1rem;">' + icon + '</span>';
                html += '<div style="flex:1;"><div style="font-size:0.88rem; font-weight:500; word-break:break-word;">' + f.name + '</div></div>';
                html += '</div>';
            });
            html += '</div>';
        } else {
            html = '<p style="text-align:center; color:var(--text-light); padding:1rem;">📭 Carpeta vacía</p>';
        }
        contentDiv.innerHTML = html;
    } catch (e) {
        console.error('Fallback drive load failed:', e);
    }
}

function getFileIcon(name, mimeType) {
    const ext = (name || '').split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
    if (['zip', 'rar'].includes(ext)) return '📦';
    if (mimeType && mimeType.includes('spreadsheet')) return '📊';
    if (mimeType && mimeType.includes('document')) return '📝';
    return '📎';
}

// ============================================
// UPLOAD MODAL
// ============================================

function uploadToCurrentFolder() {
    if (!currentDriveFolderId) {
        alert('Navega a una carpeta primero');
        return;
    }
    if (!isGoogleConnected()) {
        if (typeof requireGdrive === 'function') { requireGdrive(); } return;
        return;
    }
    
    contabilidadPendingFiles = [];
    
    // Build path display
    var pathParts = contabilidadNavStack.map(function(s) { return s.label; });
    var pathDisplay = pathParts.join(' › ').replace(/ > /g, ' › ');
    
    document.getElementById('contabilidadUploadTitle').textContent = 'Subir Documento';
    document.getElementById('contabilidadUploadPath').innerHTML = '📂 ' + pathDisplay;
    document.getElementById('contabilidadPendingList').innerHTML = '';
    document.getElementById('contabilidadDropArea').innerHTML = '📁 Arrastra archivos aquí o haz clic para seleccionar';
    
    var saveBtn = document.getElementById('btnSaveContabilidadUpload');
    if (saveBtn) { saveBtn.style.opacity = '0.4'; saveBtn.style.pointerEvents = 'none'; }
    
    document.getElementById('contabilidadUploadModal').classList.add('active');
}

function contabilidadSelectFiles() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.xlsx,.xls,.doc,.docx,.csv,.jpg,.jpeg,.png';
    input.multiple = true;
    input.onchange = function() {
        if (input.files.length) addContabilidadFiles(input.files);
    };
    input.click();
}

function addContabilidadFiles(fileList) {
    for (var i = 0; i < fileList.length; i++) {
        contabilidadPendingFiles.push(fileList[i]);
    }
    renderContabilidadPendingList();
}

function removeContabilidadFile(idx) {
    contabilidadPendingFiles.splice(idx, 1);
    renderContabilidadPendingList();
}

function renderContabilidadPendingList() {
    var listDiv = document.getElementById('contabilidadPendingList');
    var saveBtn = document.getElementById('btnSaveContabilidadUpload');
    if (!listDiv) return;
    
    if (contabilidadPendingFiles.length === 0) {
        listDiv.innerHTML = '';
        if (saveBtn) { saveBtn.style.opacity = '0.4'; saveBtn.style.pointerEvents = 'none'; }
        return;
    }
    
    if (saveBtn) { saveBtn.style.opacity = '1'; saveBtn.style.pointerEvents = 'auto'; }
    
    var html = '';
    contabilidadPendingFiles.forEach(function(f, i) {
        var size = f.size < 1024*1024 ? Math.round(f.size/1024) + ' KB' : (f.size/(1024*1024)).toFixed(1) + ' MB';
        html += '<div style="display:flex; align-items:center; gap:0.4rem; padding:0.35rem 0; border-bottom:1px solid #f1f5f9;">';
        html += '<span style="font-size:0.85rem;">📄</span>';
        html += '<span style="flex:1; font-size:0.83rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + f.name + '</span>';
        html += '<span style="font-size:0.72rem; color:var(--text-light);">' + size + '</span>';
        html += '<span onclick="removeContabilidadFile(' + i + ')" style="cursor:pointer; color:var(--danger); font-weight:700; font-size:0.85rem; padding:0 0.25rem;">✕</span>';
        html += '</div>';
    });
    listDiv.innerHTML = html;
}

function cancelContabilidadUpload() {
    contabilidadPendingFiles = [];
    closeModal('contabilidadUploadModal');
}

async function saveContabilidadUpload() {
    if (contabilidadPendingFiles.length === 0) return;
    if (!currentDriveFolderId) return;
    
    showLoading();
    try {
        var pathLabel = contabilidadNavStack[0] ? contabilidadNavStack[0].label : '';
        var parts = pathLabel.split(' > ');
        var anio = parseInt(parts[0]) || 0;
        var mesNombre = (parts[1] || '').trim();
        var mesNum = MESES_NOMBRES.indexOf(mesNombre);
        var subcarpeta = contabilidadNavStack.length >= 2 ? contabilidadNavStack[contabilidadNavStack.length - 1].label : '';
        
        for (var i = 0; i < contabilidadPendingFiles.length; i++) {
            var file = contabilidadPendingFiles[i];
            var result = await uploadFileToDrive(file, currentDriveFolderId);
            if (result && result.id) {
                await supabaseClient.from('contabilidad_documentos').insert([{
                    nombre: file.name,
                    anio: anio,
                    mes: mesNum,
                    subcarpeta: subcarpeta,
                    google_drive_file_id: result.id,
                    size_bytes: file.size || 0,
                    mime_type: file.type || '',
                    usuario_subio: currentUser ? currentUser.nombre : ''
                }]);
            }
        }
        
        contabilidadPendingFiles = [];
        closeModal('contabilidadUploadModal');
        loadSubcarpetaFromSupabase();
    } catch (e) {
        alert('Error al subir: ' + e.message);
    } finally {
        hideLoading();
    }
}

// Handle drag&drop — opens modal
async function handleContabilidadDrop(files) {
    if (!files || !files.length) return;
    if (!document.getElementById('contabilidadUploadModal').classList.contains('active')) {
        uploadToCurrentFolder();
    }
    setTimeout(function() { addContabilidadFiles(files); }, 150);
}

// ============================================
// INDEX FILES TO SUPABASE (silent background)
// ============================================

async function indexFilesToSupabase(files) {
    var pathLabel = contabilidadNavStack[0] ? contabilidadNavStack[0].label : '';
    var parts = pathLabel.split(' > ');
    var anio = parseInt(parts[0]) || 0;
    var mesNombre = (parts[1] || '').trim();
    var mesNum = MESES_NOMBRES.indexOf(mesNombre);
    if (mesNum < 1) mesNum = 0;
    
    var subcarpeta = contabilidadNavStack.length >= 2 ? contabilidadNavStack[1].label : '';
    
    if (!anio || !mesNum || !subcarpeta) return;
    
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        if (f.mimeType === 'application/vnd.google-apps.folder') continue;
        
        try {
            var { data: existing } = await supabaseClient
                .from('contabilidad_documentos')
                .select('id')
                .eq('google_drive_file_id', f.id)
                .limit(1);
            
            if (existing && existing.length > 0) continue;
            
            await supabaseClient
                .from('contabilidad_documentos')
                .insert([{
                    nombre: f.name,
                    anio: anio,
                    mes: mesNum,
                    subcarpeta: subcarpeta,
                    google_drive_file_id: f.id,
                    size_bytes: parseInt(f.size) || 0,
                    mime_type: f.mimeType || ''
                }]);
        } catch (e) {
            // Silent fail - indexing is best-effort
        }
    }
}

// ============================================
// SEARCH (Supabase-powered)
// ============================================

async function searchContabilidadDocs() {
    const term = document.getElementById('contabilidadSearchInput').value.trim();
    if (!term) return;
    
    const contentDiv = document.getElementById('contabilidadContent');
    contentDiv.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:2rem;">🔍 Buscando...</p>';
    
    document.getElementById('contabilidadAnios').style.display = 'none';
    document.getElementById('contabilidadUploadBtn').style.display = 'none';
    document.getElementById('contabilidadHomeBtn').style.display = 'inline';
    updateContabilidadTitle('Búsqueda: "' + term + '"');
    
    try {
        const { data: results, error } = await supabaseClient
            .from('contabilidad_documentos')
            .select('*')
            .ilike('nombre', '%' + term + '%')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        if (!results || results.length === 0) {
            contentDiv.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:2rem;">No se encontraron documentos con "' + term + '"</p>';
            return;
        }
        
        let html = '<div style="border:1px solid var(--border); border-radius:8px; overflow:hidden;">';
        results.forEach((doc, i) => {
            const icon = getFileIcon(doc.nombre, doc.mime_type);
            const bgColor = i % 2 === 0 ? 'white' : 'var(--bg)';
            const displayName = doc.nombre.length > 60 ? doc.nombre.substring(0, 57) + '...' : doc.nombre;
            const mesNombre = MESES_NOMBRES[doc.mes] || '';
            const monthYear = mesNombre + ' ' + doc.anio;
            const safeName = doc.nombre.replace(/'/g, "\\'");
            
            var fechaStr = '';
            if (doc.created_at) {
                var d = new Date(doc.created_at);
                fechaStr = d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();
            }
            var usuario = doc.usuario_subio || '';
            
            html += '<div onclick="viewDriveFileInline(\'' + doc.google_drive_file_id + '\', \'' + safeName + '\')" style="display:flex; align-items:center; gap:0.6rem; padding:0.5rem 0.8rem; background:' + bgColor + '; cursor:pointer; border-bottom:1px solid var(--border); transition:background 0.15s; flex-wrap:wrap;" onmouseover="this.style.background=\'#f0f9ff\'" onmouseout="this.style.background=\'' + bgColor + '\'">';
            html += '<span style="font-size:1.1rem;">' + icon + '</span>';
            html += '<div style="flex:1; min-width:120px;">';
            html += '<div style="font-size:0.88rem; font-weight:500; word-break:break-word;" title="' + doc.nombre + '">' + displayName + '</div>';
            html += '</div>';
            html += '<div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">';
            html += '<span style="font-size:0.72rem; color:var(--primary); white-space:nowrap;">' + monthYear + ' › ' + doc.subcarpeta + '</span>';
            html += '<span style="font-size:0.72rem; color:var(--text-light); white-space:nowrap;">' + fechaStr + (usuario ? ' · ' + usuario : '') + '</span>';
            html += '</div></div>';
        });
        html += '</div>';
        contentDiv.innerHTML = html;
        
    } catch (e) {
        console.error('Error searching:', e);
        contentDiv.innerHTML = '<p style="text-align:center; color:var(--danger); padding:2rem;">Error: ' + e.message + '</p>';
    }
}

// ============================================
// CREATE YEAR STRUCTURE IN GOOGLE DRIVE
// ============================================

function showCrearEstructuraAnio() {
    if (!isGoogleConnected()) {
        if (typeof requireGdrive === 'function') { requireGdrive(); } return;
        return;
    }
    
    const anyCarpeta = contabilidadCarpetas[0];
    if (!anyCarpeta) {
        alert('Primero agrega al menos un mes manualmente para que el sistema conozca la carpeta raíz.');
        return;
    }
    
    const anioActual = new Date().getFullYear();
    const anioSiguiente = anioActual + 1;
    const anio = prompt('¿Qué año quieres crear? (ej: ' + anioSiguiente + ')', anioSiguiente);
    
    if (!anio || isNaN(anio)) return;
    
    const existe = contabilidadCarpetas.some(c => c.anio === parseInt(anio));
    if (existe) {
        if (!confirm('Ya existen carpetas para ' + anio + '. ¿Quieres crear los meses faltantes?')) return;
    }
    
    crearEstructuraAnio(parseInt(anio));
}

async function crearEstructuraAnio(anio) {
    if (!isGoogleConnected()) {
        if (typeof requireGdrive === 'function') { requireGdrive(); } return;
        return;
    }
    
    showLoading();
    
    try {
        const anyCarpeta = contabilidadCarpetas[0];
        const existingFolderId = extractFolderId(anyCarpeta.google_drive_url);
        
        const existingInfo = await fetch('https://www.googleapis.com/drive/v3/files/' + existingFolderId + '?fields=parents&key=' + GOOGLE_API_KEY, {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
        });
        const existingData = await existingInfo.json();
        const yearFolderParent = existingData.parents ? existingData.parents[0] : null;
        
        if (!yearFolderParent) {
            throw new Error('No se pudo encontrar la carpeta padre');
        }
        
        const yearFolderInfo = await fetch('https://www.googleapis.com/drive/v3/files/' + yearFolderParent + '?fields=parents&key=' + GOOGLE_API_KEY, {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
        });
        const yearFolderData = await yearFolderInfo.json();
        const rootFolderId = yearFolderData.parents ? yearFolderData.parents[0] : yearFolderParent;
        
        const yearQuery = "name = '" + anio + "' and '" + rootFolderId + "' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
        const yearSearch = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(yearQuery) + '&fields=files(id,name)&key=' + GOOGLE_API_KEY, {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
        });
        const yearSearchData = await yearSearch.json();
        
        var yearFolder;
        if (yearSearchData.files && yearSearchData.files.length > 0) {
            yearFolder = yearSearchData.files[0];
            console.log('Carpeta año existente:', yearFolder.name);
        } else {
            yearFolder = await createDriveFolder(String(anio), rootFolderId);
            console.log('Carpeta año creada:', yearFolder.name);
        }
        
        const existingMeses = contabilidadCarpetas.filter(c => c.anio === anio).map(c => c.mes);
        
        for (var mes = 1; mes <= 12; mes++) {
            if (existingMeses.includes(mes)) {
                console.log('Mes ' + mes + ' ya existe, saltando');
                continue;
            }
            
            var mesNum = String(mes).padStart(2, '0');
            var mesNombre = MESES_NOMBRES[mes].toUpperCase();
            var monthFolderName = mesNum + '. ' + mesNombre;
            
            var monthFolder = await createDriveFolder(monthFolderName, yearFolder.id);
            console.log('Creado:', monthFolderName);
            
            for (var s = 0; s < SUBCARPETAS_MES.length; s++) {
                await createDriveFolder(SUBCARPETAS_MES[s], monthFolder.id);
            }
            
            var driveUrl = 'https://drive.google.com/drive/folders/' + monthFolder.id;
            var { error } = await supabaseClient
                .from('contabilidad_carpetas')
                .insert([{
                    anio: anio,
                    mes: mes,
                    nombre_mes: MESES_NOMBRES[mes],
                    google_drive_url: driveUrl
                }]);
            
            if (error) console.error('Error guardando mes ' + mes + ':', error);
        }
        
        alert('✅ Estructura de ' + anio + ' creada exitosamente');
        await loadContabilidadCarpetas();
        
    } catch (e) {
        console.error('Error creando estructura:', e);
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// AUTO-CHECK: CREATE NEXT YEAR (NOV 1)
// ============================================

function checkAutoCreateNextYear() {
    var today = new Date();
    if (today.getMonth() >= 10) {
        var nextYear = today.getFullYear() + 1;
        var exists = contabilidadCarpetas.some(c => c.anio === nextYear);
        if (!exists && isGoogleConnected()) {
            console.log('📁 Auto-creando estructura para ' + nextYear + '...');
            crearEstructuraAnio(nextYear);
        }
    }
}

// ============================================
// IMPORT EXISTING YEARS FROM GOOGLE DRIVE
// ============================================

async function importarAniosExistentes() {
    if (!isGoogleConnected()) {
        if (typeof requireGdrive === 'function') { requireGdrive(); } return;
        return;
    }
    
    if (contabilidadCarpetas.length === 0) {
        alert('Primero agrega al menos un mes manualmente (con el +) para que el sistema conozca la carpeta raíz en Drive.');
        return;
    }
    
    if (!confirm('Esto escaneará tu Google Drive y registrará todos los años/meses que encuentre. ¿Continuar?')) return;
    
    showLoading();
    
    try {
        var anyCarpeta = contabilidadCarpetas[0];
        var monthFolderId = extractFolderId(anyCarpeta.google_drive_url);
        
        var monthInfo = await fetch('https://www.googleapis.com/drive/v3/files/' + monthFolderId + '?fields=parents&key=' + GOOGLE_API_KEY, {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
        });
        var monthData = await monthInfo.json();
        var yearFolderId = monthData.parents ? monthData.parents[0] : null;
        
        if (!yearFolderId) throw new Error('No se pudo encontrar la carpeta del año');
        
        var yearInfo = await fetch('https://www.googleapis.com/drive/v3/files/' + yearFolderId + '?fields=parents&key=' + GOOGLE_API_KEY, {
            headers: { 'Authorization': 'Bearer ' + gdriveAccessToken }
        });
        var yearData = await yearInfo.json();
        var rootFolderId = yearData.parents ? yearData.parents[0] : null;
        
        if (!rootFolderId) throw new Error('No se pudo encontrar la carpeta raíz');
        
        console.log('Carpeta raíz encontrada:', rootFolderId);
        
        var { folders: yearFolders } = await listDriveFolder(rootFolderId);
        var yearFoldersFiltered = yearFolders.filter(f => /^\d{4}$/.test(f.name));
        
        console.log('Años encontrados:', yearFoldersFiltered.map(f => f.name));
        
        var totalImported = 0;
        var totalSkipped = 0;
        
        for (var y = 0; y < yearFoldersFiltered.length; y++) {
            var yearFolder = yearFoldersFiltered[y];
            var anio = parseInt(yearFolder.name);
            
            var { folders: monthFolders } = await listDriveFolder(yearFolder.id);
            
            for (var m = 0; m < monthFolders.length; m++) {
                var mFolder = monthFolders[m];
                
                var mesMatch = mFolder.name.match(/^(\d{1,2})/);
                if (!mesMatch) continue;
                
                var mesNum = parseInt(mesMatch[1]);
                if (mesNum < 1 || mesNum > 12) continue;
                
                var exists = contabilidadCarpetas.some(c => c.anio === anio && c.mes === mesNum);
                if (exists) {
                    totalSkipped++;
                    continue;
                }
                
                var driveUrl = 'https://drive.google.com/drive/folders/' + mFolder.id;
                var { error } = await supabaseClient
                    .from('contabilidad_carpetas')
                    .insert([{
                        anio: anio,
                        mes: mesNum,
                        nombre_mes: MESES_NOMBRES[mesNum],
                        google_drive_url: driveUrl
                    }]);
                
                if (error) {
                    console.error('Error registrando ' + anio + '/' + mesNum + ':', error);
                } else {
                    totalImported++;
                    console.log('✅ Registrado:', anio, MESES_NOMBRES[mesNum]);
                }
            }
        }
        
        alert('✅ Importación completada!\n\n' + totalImported + ' meses importados\n' + totalSkipped + ' ya existían (saltados)');
        await loadContabilidadCarpetas();
        
    } catch (e) {
        console.error('Error importando:', e);
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// SYNC FULL DOCUMENT INDEX
// ============================================

async function sincronizarIndiceCompleto() {
    if (!isGoogleConnected()) {
        if (typeof requireGdrive === 'function') { requireGdrive(); } return;
        return;
    }
    
    if (!confirm('Esto escaneará todas las carpetas en Drive y registrará los documentos en el índice de búsqueda. Puede tomar unos minutos. ¿Continuar?')) return;
    
    showLoading();
    var totalIndexed = 0;
    var totalSkipped = 0;
    
    try {
        for (var c = 0; c < contabilidadCarpetas.length; c++) {
            var carpeta = contabilidadCarpetas[c];
            var monthFolderId = extractFolderId(carpeta.google_drive_url);
            if (!monthFolderId) continue;
            
            var anio = carpeta.anio;
            var mesNum = carpeta.mes;
            var mesNombre = MESES_NOMBRES[mesNum] || '';
            
            console.log('📁 Escaneando ' + anio + ' ' + mesNombre + '...');
            
            var { folders: subfolders } = await listDriveFolder(monthFolderId);
            
            for (var s = 0; s < subfolders.length; s++) {
                var sub = subfolders[s];
                
                var { files } = await listDriveFolder(sub.id);
                
                for (var f = 0; f < files.length; f++) {
                    var file = files[f];
                    if (file.mimeType === 'application/vnd.google-apps.folder') continue;
                    
                    var { data: existing } = await supabaseClient
                        .from('contabilidad_documentos')
                        .select('id')
                        .eq('google_drive_file_id', file.id)
                        .limit(1);
                    
                    if (existing && existing.length > 0) {
                        totalSkipped++;
                        continue;
                    }
                    
                    var { error } = await supabaseClient
                        .from('contabilidad_documentos')
                        .insert([{
                            nombre: file.name,
                            anio: anio,
                            mes: mesNum,
                            subcarpeta: sub.name,
                            google_drive_file_id: file.id,
                            size_bytes: parseInt(file.size) || 0,
                            mime_type: file.mimeType || ''
                        }]);
                    
                    if (!error) {
                        totalIndexed++;
                    } else {
                        console.error('Error indexando:', file.name, error);
                    }
                }
            }
        }
        
        alert('✅ Sincronización completada!\n\n' + totalIndexed + ' documentos indexados\n' + totalSkipped + ' ya existían');
        
    } catch (e) {
        console.error('Error sincronizando:', e);
        alert('Error: ' + e.message + '\n\nSe indexaron ' + totalIndexed + ' documentos antes del error.');
    } finally {
        hideLoading();
    }
}

// ============================================
// CARPETA CRUD
// ============================================

function showAddCarpetaModal() {
    editingCarpetaId = null;
    document.getElementById('addCarpetaTitle').textContent = 'Agregar Carpeta';
    document.getElementById('carpetaAnio').value = new Date().getFullYear();
    document.getElementById('carpetaMes').value = '';
    document.getElementById('carpetaURL').value = '';
    document.getElementById('addCarpetaModal').classList.add('active');
}

function editCarpetaContabilidad(id) {
    const c = contabilidadCarpetas.find(x => x.id === id);
    if (!c) return;
    editingCarpetaId = id;
    document.getElementById('addCarpetaTitle').textContent = 'Editar Carpeta';
    document.getElementById('carpetaAnio').value = c.anio;
    document.getElementById('carpetaMes').value = c.mes;
    document.getElementById('carpetaURL').value = c.google_drive_url;
    document.getElementById('addCarpetaModal').classList.add('active');
}

async function saveCarpetaContabilidad(event) {
    event.preventDefault();
    showLoading();
    
    const mes = parseInt(document.getElementById('carpetaMes').value);
    
    const data = {
        anio: parseInt(document.getElementById('carpetaAnio').value),
        mes: mes,
        nombre_mes: MESES_NOMBRES[mes] || '',
        google_drive_url: document.getElementById('carpetaURL').value.trim()
    };
    
    try {
        if (editingCarpetaId) {
            const { error } = await supabaseClient
                .from('contabilidad_carpetas')
                .update(data)
                .eq('id', editingCarpetaId);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient
                .from('contabilidad_carpetas')
                .insert([data]);
            if (error) throw error;
        }
        
        closeModal('addCarpetaModal');
        contabilidadAnioSeleccionado = data.anio;
        await loadContabilidadCarpetas();
    } catch (e) {
        console.error('Error:', e);
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

async function deleteCarpetaContabilidad(id, label) {
    if (!confirm('¿Eliminar carpeta ' + label + '?')) return;
    showLoading();
    try {
        const { error } = await supabaseClient
            .from('contabilidad_carpetas')
            .delete()
            .eq('id', id);
        if (error) throw error;
        await loadContabilidadCarpetas();
    } catch (e) {
        alert('Error: ' + e.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// NIVEL 4 - RESTRICCIÓN
// ============================================

function applyUserLevel() {
    const nivel = (currentUser && currentUser.nivel) || 1;
    
    if (nivel === 4) {
        // Level 4: solo ve Contabilidad y Salir en el menú
        document.getElementById('menuInquilinos').style.display = 'none';
        document.getElementById('menuProveedores').style.display = 'none';
        const adminBtn = document.getElementById('menuAdmin');
        adminBtn.textContent = 'Contabilidad';
        adminBtn.onclick = function() { showContabilidadPage(); };
        
        // Mobile: hide buttons for nivel 4
        var mmInq = document.getElementById('mmBtnInquilinos');
        var mmProv = document.getElementById('mmBtnProveedores');
        var mmEswu = document.getElementById('mmBtnEswu');
        if (mmInq) mmInq.style.display = 'none';
        if (mmProv) mmProv.style.display = 'none';
        if (mmEswu) mmEswu.style.display = 'none';
        
        // Auto-navigate to Contabilidad
        showContabilidadPage();
    } else {
        // Niveles 1-3: todo visible
        document.getElementById('menuInquilinos').style.display = '';
        document.getElementById('menuProveedores').style.display = '';
        const adminBtn = document.getElementById('menuAdmin');
        adminBtn.textContent = 'Admin';
        adminBtn.onclick = function() { showSubMenu('admin'); };
        
        // Mobile: show all buttons
        var mmInq = document.getElementById('mmBtnInquilinos');
        var mmProv = document.getElementById('mmBtnProveedores');
        var mmEswu = document.getElementById('mmBtnEswu');
        if (mmInq) mmInq.style.display = '';
        if (mmProv) mmProv.style.display = '';
        if (mmEswu) mmEswu.style.display = '';
    }
}

console.log('✅ CONTABILIDAD-UI.JS v15 cargado (unificado - 2026-02-21)');
