/* ========================================
   NAVIGATION.JS v1
   ======================================== */

// ============================================
// GLOBAL NAVIGATION STATE
// ============================================

let currentMenuContext = 'main';
let currentSubContext = null;
let currentSearchContext = null;

// ============================================
// PDF VIEWER - MOVIDO A db-fetch-docs.js
// (versión con blob URLs compatible con iOS Safari)
// ============================================

// ============================================
// MENU NAVIGATION
// ============================================

function showSubMenu(menu) {
    document.getElementById('menuInquilinos').classList.remove('active');
    document.getElementById('menuProveedores').classList.remove('active');
    document.getElementById('menuAdmin').classList.remove('active');
    
    document.getElementById('inquilinosSubMenu').classList.remove('active');
    document.getElementById('proveedoresSubMenu').classList.remove('active');
    document.getElementById('adminSubMenu').classList.remove('active');
    
    if (menu === 'inquilinos') {
        document.getElementById('inquilinosSubMenu').classList.add('active');
        document.getElementById('menuInquilinos').classList.add('active');
        currentMenuContext = 'inquilinos';
    } else if (menu === 'proveedores') {
        document.getElementById('proveedoresSubMenu').classList.add('active');
        document.getElementById('menuProveedores').classList.add('active');
        currentMenuContext = 'proveedores';
    } else if (menu === 'admin') {
        document.getElementById('adminSubMenu').classList.add('active');
        document.getElementById('menuAdmin').classList.add('active');
        currentMenuContext = 'admin';
    }
    
    document.getElementById('btnRegresa').classList.add('hidden');
    document.getElementById('btnSearch').classList.add('hidden');
    document.getElementById('contentArea').classList.add('with-submenu');
}

function handleRegresa() {
    // Level 4: X button logs them out completely
    if (currentUser && currentUser.nivel === 4) {
        logout();
        return;
    }
    
    if (currentSubContext) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        if (currentMenuContext === 'inquilinos') {
            document.getElementById('inquilinosSubMenu').classList.add('active');
        } else if (currentMenuContext === 'proveedores') {
            document.getElementById('proveedoresSubMenu').classList.add('active');
        } else if (currentMenuContext === 'admin') {
            document.getElementById('adminSubMenu').classList.add('active');
        }
        
        currentSubContext = null;
        currentSearchContext = null;
        document.getElementById('btnRegresa').classList.add('hidden');
        document.getElementById('btnSearch').classList.add('hidden');
        document.getElementById('menuSidebar').classList.remove('hidden');
        document.getElementById('contentArea').classList.remove('fullwidth');
        document.getElementById('contentArea').classList.add('with-submenu');
    }
}

function showPageFromMenu(pageName) {
    document.getElementById('inquilinosSubMenu').classList.remove('active');
    document.getElementById('proveedoresSubMenu').classList.remove('active');
    document.getElementById('adminSubMenu').classList.remove('active');
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageName + 'Page').classList.add('active');
    
    currentSubContext = pageName;
    document.getElementById('btnRegresa').classList.remove('hidden');
    
    if (pageName === 'bitacora') {
        document.getElementById('btnSearch').classList.remove('hidden');
        currentSearchContext = 'bitacora';
    }
    
    document.getElementById('contentArea').classList.remove('with-submenu');
    document.getElementById('menuSidebar').classList.add('hidden');
    document.getElementById('contentArea').classList.add('fullwidth');
    
    if (pageName === 'estacionamiento') renderEstacionamientoTable();
    if (pageName === 'bitacora') renderBitacoraTable();
}

// ============================================
// SEARCH FUNCTIONS
// ============================================

function toggleSearch() {
    const searchBar = document.getElementById('headerSearchBar');
    const btnSearch = document.getElementById('btnSearch');
    
    searchBar.classList.toggle('active');
    
    if (searchBar.classList.contains('active')) {
        btnSearch.classList.add('hidden');
        document.getElementById('searchInput').focus();
    } else {
        btnSearch.classList.remove('hidden');
    }
}

function executeSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!query) {
        alert('Por favor ingresa un término de búsqueda');
        return;
    }
    
    if (currentSearchContext === 'bitacora') {
        filtrarBitacora(query);
    } else if (currentSearchContext === 'proveedores') {
        filtrarProveedores(query);
    } else if (currentSearchContext === 'inquilinos') {
        filtrarInquilinos(query);
    }
    
    // Limpiar barra de búsqueda
    document.getElementById('searchInput').value = '';
    document.getElementById('headerSearchBar').classList.remove('active');
    document.getElementById('btnSearch').classList.remove('hidden');
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    
    if (currentSearchContext === 'bitacora') {
        renderBitacoraTable();
    } else if (currentSearchContext === 'proveedores') {
        renderProveedoresTable();
    } else if (currentSearchContext === 'inquilinos') {
        renderInquilinosTable();
    }
    
    document.getElementById('headerSearchBar').classList.remove('active');
    document.getElementById('btnSearch').classList.remove('hidden');
}

// ============================================
// FORMAT FUNCTIONS
// ============================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', { 
        style: 'currency', 
        currency: 'MXN' 
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateVencimiento(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    const formatted = formatDate(dateString);
    
    if (diffDays <= 7 && diffDays >= 0) {
        return `<span class="vencimiento-proximo">${formatted}</span>`;
    }
    return formatted;
}

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(type, tabName) {
    if (type === 'inquilino') {
        document.querySelectorAll('#inquilinoDetailModal .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#inquilinoDetailModal .tab-content').forEach(tc => tc.classList.remove('active'));
        
        if (tabName === 'pagos') {
            document.querySelector('#inquilinoDetailModal .tab:nth-child(1)').classList.add('active');
            document.getElementById('inquilinoPagosTab').classList.add('active');
        } else if (tabName === 'docs') {
            document.querySelector('#inquilinoDetailModal .tab:nth-child(2)').classList.add('active');
            document.getElementById('inquilinoDocsTab').classList.add('active');
        } else if (tabName === 'notas') {
            document.querySelector('#inquilinoDetailModal .tab:nth-child(3)').classList.add('active');
            document.getElementById('inquilinoNotasTab').classList.add('active');
        }
    } else if (type === 'proveedor') {
        document.querySelectorAll('#proveedorDetailModal .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#proveedorDetailModal .tab-content').forEach(tc => tc.classList.remove('active'));
        
        // Los + verdes ya están en el HTML con clase btn-add-inline
        // El CSS se encarga de mostrarlos solo en la pestaña activa
        
        if (tabName === 'pagadas') {
            document.querySelector('#proveedorDetailModal .tab:nth-child(1)').classList.add('active');
            document.getElementById('proveedorPagadasTab').classList.add('active');
        } else if (tabName === 'porpagar') {
            document.querySelector('#proveedorDetailModal .tab:nth-child(2)').classList.add('active');
            document.getElementById('proveedorPorPagarTab').classList.add('active');
        } else if (tabName === 'docs') {
            document.querySelector('#proveedorDetailModal .tab:nth-child(3)').classList.add('active');
            document.getElementById('proveedorDocsTab').classList.add('active');
        } else if (tabName === 'notas') {
            document.querySelector('#proveedorDetailModal .tab:nth-child(4)').classList.add('active');
            document.getElementById('proveedorNotasTab').classList.add('active');
        }
    }
}

// ============================================
// DROPDOWN
// ============================================

function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    document.querySelectorAll('.dropdown-content').forEach(dd => {
        if (dd.id !== dropdownId) dd.classList.remove('show');
    });
    dropdown.classList.toggle('show');
}

window.addEventListener('click', function(e) {
    if (!e.target.matches('.dropdown-toggle')) {
        document.querySelectorAll('.dropdown-content').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }
});

// ============================================
// LOGOUT
// ============================================

function logout() {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('eswu_remembered_user');
        localStorage.removeItem('eswu_remembered_pass');
        
        document.getElementById('appContainer').classList.remove('active');
        document.getElementById('loginContainer').classList.remove('hidden');
        document.body.classList.remove('logged-in');
        
        document.getElementById('menuSidebar').classList.remove('hidden');
        document.getElementById('contentArea').classList.remove('fullwidth', 'with-submenu');
        
        document.getElementById('inquilinosSubMenu').classList.remove('active');
        document.getElementById('proveedoresSubMenu').classList.remove('active');
        document.getElementById('adminSubMenu').classList.remove('active');
        
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        currentUser = null;
        currentMenuContext = 'main';
        currentSubContext = null;
    }
}

console.log('✅ NAVIGATION.JS cargado (2026-02-13 00:30 CST)');
console.log('   PDF Viewer → db-fetch-docs.js (blob URLs)');
