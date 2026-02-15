/* ========================================
   AUTH.JS - Authentication & Initialization
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
        
    } catch (error) {
        alert(error.message);
    } finally {
        hideLoading();
    }
});

// ============================================
// AUTO-LOGIN ON PAGE LOAD
// ============================================

window.addEventListener('DOMContentLoaded', function() {
    const rememberedUser = localStorage.getItem('eswu_remembered_user');
    const rememberedPass = localStorage.getItem('eswu_remembered_pass');
    
    if (rememberedUser && rememberedPass) {
        document.getElementById('username').value = rememberedUser;
        document.getElementById('password').value = rememberedPass;
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    } else if (rememberedUser) {
        document.getElementById('username').value = rememberedUser;
        document.getElementById('password').focus();
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
    try {
        showLoadingBanner('Cargando inquilinos...');
        await loadInquilinos();
        
        updateLoadingText('Cargando proveedores...');
        await loadProveedores();
        
        updateLoadingText('Cargando activos...');
        await loadActivos();
        
        updateLoadingText('Cargando usuarios...');
        await loadUsuarios();
        
        updateLoadingText('Cargando documentos bancarios...');
        await loadBancosDocumentos();
        
        updateLoadingText('Cargando estacionamiento...');
        await loadEstacionamiento();
        
        updateLoadingText('Cargando bitácora...');
        await loadBitacoraSemanal();
        
        updateLoadingText('Finalizando...');
        populateYearSelect();
        populateInquilinosYearSelects();
        populateProveedoresYearSelects();
        
        hideLoadingBanner();
        
    } catch (error) {
        hideLoadingBanner();
        console.error('Error inicializando app:', error);
        alert('Error cargando datos: ' + error.message);
    }
}

// ============================================
// LOGOUT
// ============================================

function logout() {
    if (confirm('¿Cerrar sesión?')) {
        document.getElementById('appContainer').classList.remove('active');
        document.getElementById('loginContainer').classList.remove('hidden');
        document.body.classList.remove('logged-in');
        
        // Resetear menús
        document.querySelectorAll('.submenu-container').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('menuSidebar').classList.remove('hidden');
    }
}

// ============================================
// LOADING OVERLAY
// ============================================

function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}
console.log('✅ AUTH.JS cargado');
