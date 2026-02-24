/* ========================================
   ESWU - MAIN.JS v15 (LIMPIO)
   Última actualización: 2026-02-21
   Solo: Login, Init, File Listeners, ForgotPassword
   
   Funciones movidas a módulos:
   - showLoading/hideLoading → db-core.js
   - fileToBase64 → db-core.js
   - saveInquilino, savePagoRenta, saveDocumentoAdicional,
     editInquilino, deleteInquilino, terminarContratoInquilino → db-inquilinos.js
   - showRegistrarPagoModal, toggleMontoInput,
     showAgregarDocumentoModal → inquilino-modals.js
   - loadActivos, loadEstacionamiento, loadBitacoraSemanal,
     loadUsuarios, loadBancosDocumentos, saveEstacionamiento,
     saveBitacora, saveBancoDoc, populateYearSelect,
     populateInquilinosYearSelects, populateProveedoresYearSelects,
     loadInquilinosBasico, loadProveedoresBasico,
     ensure*Loaded, eliminarProveedoresMigrados → db-admin.js
   ======================================== */

// ============================================
// LOGIN
// ============================================

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    showLoading();
    
    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('nombre', username)
            .eq('password', password)
            .eq('activo', true)
            .single();
        
        if (error || !data) {
            throw new Error('Usuario o contraseña incorrectos');
        }
        
        currentUser = data;
        
        localStorage.setItem('eswu_remembered_user', username);
        localStorage.setItem('eswu_remembered_pass', password);
        
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('appContainer').classList.add('active');
        document.body.classList.add('logged-in');
        
        await initializeApp();
        
        // Aplicar restricciones de nivel
        applyUserLevel();
        
        // Mostrar dashboard en desktop, menú en móvil
        if (isMobile()) {
            if (!currentUser || currentUser.nivel !== 4) {
                showMobileMenu();
            }
        } else if (!currentUser || currentUser.nivel !== 4) {
            showDashboard();
            // Cargar mensajes y actualizar dashboard
            if (typeof initMensajes === 'function') {
                initMensajes().then(function() { renderDashboard(); });
            }
        }
        
    } catch (error) {
        alert(error.message);
    } finally {
        hideLoading();
    }
});

// ============================================
// AUTO-LOGIN
// ============================================

window.addEventListener('DOMContentLoaded', function() {
    const rememberedUser = localStorage.getItem('eswu_remembered_user');
    const rememberedPass = localStorage.getItem('eswu_remembered_pass');
    
    if (rememberedUser && rememberedPass) {
        document.getElementById('username').value = rememberedUser;
        document.getElementById('password').value = rememberedPass;
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    
    setTimeout(() => {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    }, 1000);
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
        
        // Marcar todas las cargas como completadas
        inquilinosFullLoaded = true;
        proveedoresFullLoaded = true;
        activosLoaded = true;
        usuariosLoaded = true;
        bancosLoaded = true;
        estacionamientoLoaded = true;
        bitacoraLoaded = true;
        
        console.log('✅ App inicializada correctamente');
        
        // Initialize Google Drive (non-blocking, auto-reconnects if previously connected)
        try {
            if (typeof initGoogleDrive === 'function') {
                initGoogleDrive();
            }
        } catch (e) {
            console.log('Google Drive init diferido');
        }
        
        // Pre-load contabilidad carpetas (needed for bancos upload to Drive)
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
// FILE INPUT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const inquilinoContrato = document.getElementById('inquilinoContrato');
    if (inquilinoContrato) {
        inquilinoContrato.addEventListener('change', function() {
            const fileName = this.files[0]?.name || '';
            const display = document.getElementById('contratoFileName');
            if (display) display.textContent = fileName ? 'Seleccionado: ' + fileName : '';
        });
    }
    
    const nuevoDocPDF = document.getElementById('nuevoDocPDF');
    if (nuevoDocPDF) {
        nuevoDocPDF.addEventListener('change', function() {
            const fileName = this.files[0]?.name || '';
            const display = document.getElementById('nuevoDocPDFFileName');
            if (display) display.textContent = fileName ? 'Seleccionado: ' + fileName : '';
        });
    }
    
    const pagoPDF = document.getElementById('pagoPDF');
    if (pagoPDF) {
        pagoPDF.addEventListener('change', function() {
            const fileName = this.files[0]?.name || '';
            const display = document.getElementById('pagoPDFFileName');
            if (display) display.textContent = fileName ? 'Seleccionado: ' + fileName : '';
        });
    }
    
    const facturaDocumento = document.getElementById('facturaDocumento');
    if (facturaDocumento) {
        facturaDocumento.addEventListener('change', function() {
            const fileName = this.files[0]?.name || '';
            const display = document.getElementById('facturaDocumentoFileName');
            if (display) display.textContent = fileName ? 'Seleccionado: ' + fileName : '';
        });
    }
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
        
        // Generate temp password
        var tempPass = 'temp' + Math.floor(1000 + Math.random() * 9000);
        
        // Update in DB
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

console.log('✅ MAIN.JS v15 cargado (limpio - 2026-02-21)');
