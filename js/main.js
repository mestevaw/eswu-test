/* ========================================
   ESWU - MAIN.JS
   Login, inicialización y listeners globales
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
        
        // Initialize Google Drive (non-blocking)
        try {
            if (typeof initGoogleDrive === 'function') {
                initGoogleDrive();
            }
        } catch (e) {
            console.log('Google Drive init diferido');
        }
        
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
// FILE INPUT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const fileInputs = [
        { input: 'inquilinoContrato', display: 'contratoFileName' },
        { input: 'nuevoDocPDF', display: 'nuevoDocPDFFileName' },
        { input: 'pagoPDF', display: 'pagoPDFFileName' },
        { input: 'facturaDocumento', display: 'facturaDocumentoFileName' }
    ];
    
    fileInputs.forEach(({ input, display }) => {
        const el = document.getElementById(input);
        if (el) {
            el.addEventListener('change', function() {
                const fileName = this.files[0]?.name || '';
                const displayEl = document.getElementById(display);
                if (displayEl) displayEl.textContent = fileName ? `Seleccionado: ${fileName}` : '';
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

console.log('✅ MAIN.JS cargado');
