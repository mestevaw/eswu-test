/* ========================================
   ESWU - MAIN.JS v16
   Última actualización: 2026-02-25
   Solo: Login, Init, File Listeners, ForgotPassword
   ======================================== */

// ============================================
// LOGIN
// ============================================

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;
    
    showLoading();
    
    try {
        var resp = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('nombre', username)
            .eq('password', password)
            .eq('activo', true)
            .single();
        
        if (resp.error || !resp.data) {
            throw new Error('Usuario o contraseña incorrectos');
        }
        
        currentUser = resp.data;
        
        localStorage.setItem('eswu_remembered_user', username);
        localStorage.setItem('eswu_remembered_pass', password);
        
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('loginContainer').style.visibility = '';
        document.getElementById('appContainer').classList.add('active');
        document.body.classList.add('logged-in');
        
        await initializeApp();
        
        applyUserLevel();
        
        if (isMobile()) {
            if (!currentUser || currentUser.nivel !== 4) {
                showMobileMenu();
            }
        } else if (!currentUser || currentUser.nivel !== 4) {
            showDashboard();
            if (typeof initMensajes === 'function') {
                initMensajes().then(function() { renderDashboard(); });
            }
        }
        
    } catch (error) {
        document.getElementById('loginContainer').classList.remove('hidden');
        document.getElementById('loginContainer').style.visibility = '';
        alert(error.message);
    } finally {
        hideLoading();
    }
});

// ============================================
// AUTO-LOGIN (flash-free)
// ============================================

window.addEventListener('DOMContentLoaded', function() {
    // Limpiar estado visual ANTES de cualquier cosa
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.modal').forEach(function(m) { m.classList.remove('active'); });
    
    var rememberedUser = localStorage.getItem('eswu_remembered_user');
    var rememberedPass = localStorage.getItem('eswu_remembered_pass');
    
    if (rememberedUser && rememberedPass) {
        // 1) Mostrar loading overlay inmediatamente (cubre toda la pantalla, z-index 10000)
        showLoading();
        // 2) Esconder login container por completo (no flash del gradiente azul)
        document.getElementById('loginContainer').style.visibility = 'hidden';
        // 3) Llenar credenciales y disparar submit
        document.getElementById('username').value = rememberedUser;
        document.getElementById('password').value = rememberedPass;
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
});

// ============================================
// INITIALIZE APP
// ============================================

async function initializeApp() {
    showLoadingBanner('Cargando datos...');
    
    try {
        await Promise.all([
            loadInquilinos(),
            loadProveedores(),
            loadActivos(),
            loadUsuarios(),
            loadBancosDocumentos(),
            loadEstacionamiento(),
            loadBitacoraSemanal()
        ]);
        
        populateYearSelect();
        populateInquilinosYearSelects();
        populateProveedoresYearSelects();
        
        inquilinosFullLoaded = true;
        proveedoresFullLoaded = true;
        activosLoaded = true;
        usuariosLoaded = true;
        bancosLoaded = true;
        estacionamientoLoaded = true;
        bitacoraLoaded = true;
        
        console.log('✅ App inicializada correctamente');
        
        // Initialize Google Drive — espera a que cargue la librería GSI (async defer)
        waitForGoogleAndConnect();
        
        // Pre-load contabilidad carpetas
        try {
            if (typeof loadContabilidadCarpetas === 'function') {
                loadContabilidadCarpetas();
            }
        } catch (e) {
            console.log('Contabilidad carpetas diferidas');
        }
        
    } catch (error) {
        console.error('❌ Error inicializando app:', error);
        alert('Error cargando datos: ' + error.message);
    } finally {
        hideLoadingBanner();
    }
}

// ============================================
// WAIT FOR GOOGLE GSI LIBRARY & CONNECT
// ============================================

function waitForGoogleAndConnect(attempt) {
    attempt = attempt || 0;
    
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        try {
            if (typeof initGoogleDrive === 'function') initGoogleDrive();
        } catch (e) {
            console.warn('Error init Google Drive:', e);
        }
        
        // Dar 3 seg para auto-reconnect silencioso, luego mostrar banner si no conectó
        setTimeout(function() {
            if (typeof isGoogleConnected === 'function' && !isGoogleConnected()) {
                showGdriveConnectBanner();
            }
        }, 3000);
        return;
    }
    
    if (attempt < 30) {
        setTimeout(function() { waitForGoogleAndConnect(attempt + 1); }, 500);
    } else {
        console.warn('Google GSI library no cargó después de 15 segundos');
    }
}

// ============================================
// GOOGLE DRIVE — BANNER VISIBLE PARA CONECTAR
// ============================================

function showGdriveConnectBanner() {
    if (document.getElementById('gdriveConnectBanner')) return;
    
    var overlay = document.createElement('div');
    overlay.id = 'gdriveConnectBanner';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9998;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = '<div style="background:white;border-radius:12px;padding:2rem 1.5rem;max-width:360px;width:90%;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.3);">' +
        '<div style="font-size:2.5rem;margin-bottom:0.8rem;">📁</div>' +
        '<h3 style="margin:0 0 0.5rem;font-size:1.1rem;color:#1a365d;">Conectar Google Drive</h3>' +
        '<p style="margin:0 0 1.2rem;font-size:0.85rem;color:#64748b;line-height:1.4;">Conecta tu cuenta de Google para ver documentos y estados de cuenta bancarios.</p>' +
        '<button onclick="connectGdriveFromBanner()" style="background:linear-gradient(135deg,#1a365d,#2d4a7c);color:white;border:none;border-radius:8px;padding:0.7rem 2rem;font-weight:600;font-size:0.95rem;cursor:pointer;width:100%;margin-bottom:0.6rem;">Conectar</button>' +
        '<button onclick="dismissGdriveBanner()" style="background:none;border:none;color:#94a3b8;font-size:0.82rem;cursor:pointer;padding:0.3rem;">Ahora no</button>' +
        '</div>';
    
    document.body.appendChild(overlay);
}

function connectGdriveFromBanner() {
    dismissGdriveBanner();
    if (typeof googleSignIn === 'function') googleSignIn();
}

function dismissGdriveBanner() {
    var banner = document.getElementById('gdriveConnectBanner');
    if (banner) banner.remove();
}

// ============================================
// FILE INPUT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    var inputs = [
        ['inquilinoContrato', 'contratoFileName'],
        ['nuevoDocPDF', 'nuevoDocPDFFileName'],
        ['pagoPDF', 'pagoPDFFileName'],
        ['facturaDocumento', 'facturaDocumentoFileName']
    ];
    inputs.forEach(function(pair) {
        var el = document.getElementById(pair[0]);
        if (el) {
            el.addEventListener('change', function() {
                var name = this.files[0] ? this.files[0].name : '';
                var display = document.getElementById(pair[1]);
                if (display) display.textContent = name ? 'Seleccionado: ' + name : '';
            });
        }
    });
});

// ============================================
// OLVIDÉ MI PASSWORD
// ============================================

async function showForgotPasswordDialog() {
    var email = prompt('Ingresa tu correo electrónico:');
    if (!email || !email.trim()) return;
    
    email = email.trim().toLowerCase();
    
    try {
        var { data, error } = await supabaseClient
            .from('usuarios')
            .select('id, nombre, email')
            .eq('email', email)
            .eq('activo', true)
            .single();
        
        if (error || !data) {
            alert('No se encontró un usuario activo con ese correo.');
            return;
        }
        
        var tempPass = 'temp' + Math.floor(1000 + Math.random() * 9000);
        
        var { error: updateErr } = await supabaseClient
            .from('usuarios')
            .update({ password: tempPass })
            .eq('id', data.id);
        
        if (updateErr) {
            alert('Error al restablecer: ' + updateErr.message);
            return;
        }
        
        alert('Hola ' + data.nombre + ', tu nuevo password temporal es:\n\n' + tempPass + '\n\nCámbialo después de iniciar sesión.');
        
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

console.log('✅ MAIN.JS v16 cargado');
