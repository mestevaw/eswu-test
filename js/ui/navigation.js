/* ========================================
   NAVIGATION.JS v2 — Mobile menu support
   ======================================== */

// ============================================
// GLOBAL NAVIGATION STATE
// ============================================

let currentMenuContext = 'main';
let currentSubContext = null;
let currentSearchContext = null;

// ============================================
// MOBILE MENU DATA & HELPERS
// ============================================

var mobileMenuData = {
    admin:       { icon: '⚙️', label: 'Admin', subs: [
        { label: 'Activos',          action: 'showActivosPage()' },
        { label: 'Bitácora',         action: "showPageFromMenu('bitacora')" },
        { label: 'Contabilidad',     action: 'showContabilidadPage()' },
        { label: 'Estacionamiento',  action: "showPageFromMenu('estacionamiento')" },
        { label: 'Números',          action: 'showNumerosPage()' }
    ]},
    eswu:        { icon: '🏢', label: 'ESWU', subs: [
        { label: 'Ficha',            action: 'showEswuFicha()' }
    ]},
    inquilinos:  { icon: '👥', label: 'Inquilinos', subs: [
        { label: 'Listado',          action: "showInquilinosView('list')" },
        { label: 'Rentas',           action: "showInquilinosView('rentasRecibidas')" },
        { label: 'Contratos',        action: "showInquilinosView('vencimientoContratos')" }
    ]},
    proveedores: { icon: '🔧', label: 'Proveedores', subs: [
        { label: 'Listado',          action: "showProveedoresView('list')" },
        { label: 'Facturas Pagadas', action: "showProveedoresView('facturasPagadas')" },
        { label: 'Facturas X Pagar', action: "showProveedoresView('facturasPorPagar')" },
        { label: 'Mantenimiento',    action: "showProveedoresView('mantenimiento')" }
    ]}
};

var mobileMenuCurrentSection = null;

function isMobile() {
    return window.innerWidth <= 768;
}

// ============================================
// MOBILE MENU FUNCTIONS
// ============================================

function showMobileMenu() {
    var mm = document.getElementById('mobileMenu');
    if (!mm) return;
    mm.classList.remove('hidden');
    mm.style.display = '';
    
    // Reset to main menu
    document.getElementById('mobileMenuMain').style.display = '';
    document.getElementById('mobileMenuSub').style.display = 'none';
    
    // Reset all button classes and inline styles
    var btns = document.querySelectorAll('.mm-btn');
    btns.forEach(function(b) {
        b.classList.remove('mm-fadeout');
        b.style.display = '';
        b.style.transition = '';
        b.style.transform = '';
    });
    
    mobileMenuCurrentSection = null;
}

function hideMobileMenu() {
    var mm = document.getElementById('mobileMenu');
    if (mm) {
        mm.classList.add('hidden');
    }
}

function mobileMenuSelect(menu) {
    // ESWU: ir directo a ficha (solo tiene 1 opción)
    if (menu === 'eswu') {
        mobileMenuCurrentSection = 'eswu';
        currentMenuContext = 'eswu';
        var btns = document.querySelectorAll('.mm-btn');
        btns.forEach(function(b) { b.classList.add('mm-fadeout'); });
        setTimeout(function() { showEswuFicha(); }, 300);
        return;
    }
    
    mobileMenuCurrentSection = menu;
    currentMenuContext = menu;
    
    var btns = document.querySelectorAll('.mm-btn');
    var selectedBtn = null;
    
    btns.forEach(function(b) {
        var btnMenu = b.getAttribute('onclick').match(/mobileMenuSelect\('(\w+)'\)/);
        if (btnMenu && btnMenu[1] === menu) {
            selectedBtn = b;
        } else {
            b.classList.add('mm-fadeout');
        }
    });
    
    if (!selectedBtn) return;
    
    // Medir posición actual del botón
    var btnRect = selectedBtn.getBoundingClientRect();
    
    // Renderizar submenú invisible para medir posición del título
    var subDiv = document.getElementById('mobileMenuSub');
    var mainDiv = document.getElementById('mobileMenuMain');
    _renderMobileSubMenu(menu);
    subDiv.style.display = '';
    subDiv.style.visibility = 'hidden';
    
    var titleRect = document.getElementById('mmSubTitle').getBoundingClientRect();
    var deltaY = titleRect.top - btnRect.top;
    
    subDiv.style.display = 'none';
    subDiv.style.visibility = '';
    
    // Animar botón a posición exacta del título
    selectedBtn.style.transition = 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
    selectedBtn.style.transform = 'translateY(' + deltaY + 'px)';
    
    // Después de animación, mostrar submenú
    setTimeout(function() {
        mainDiv.style.display = 'none';
        selectedBtn.style.transition = '';
        selectedBtn.style.transform = '';
        subDiv.style.display = '';
    }, 350);
}

function _renderMobileSubMenu(menu) {
    var data = mobileMenuData[menu];
    if (!data) return;
    
    // Title
    document.getElementById('mmSubTitle').innerHTML = 
        '<span class="mm-sub-title-icon">' + data.icon + '</span>' +
        '<span class="mm-sub-title-text">' + data.label + '</span>';
    
    // Sub buttons
    var html = '';
    data.subs.forEach(function(sub) {
        html += '<button class="mm-sub-btn mm-appear" onclick="' + sub.action + '">' + sub.label + '</button>';
    });
    document.getElementById('mmSubButtons').innerHTML = html;
    
    // Back button animation class
    var backBtn = document.querySelector('.mm-back');
    if (backBtn) {
        backBtn.classList.remove('mm-appear');
        void backBtn.offsetWidth; // force reflow
        backBtn.classList.add('mm-appear');
    }
}

function showMobileSubMenu(menu) {
    var mm = document.getElementById('mobileMenu');
    if (!mm) return;
    mm.classList.remove('hidden');
    mm.style.display = '';
    
    mobileMenuCurrentSection = menu;
    document.getElementById('mobileMenuMain').style.display = 'none';
    _renderMobileSubMenu(menu);
    document.getElementById('mobileMenuSub').style.display = '';
}

function mobileMenuBack() {
    document.getElementById('mobileMenuSub').style.display = 'none';
    document.getElementById('mobileMenuMain').style.display = '';
    
    // Reset button animations and inline styles
    var btns = document.querySelectorAll('.mm-btn');
    btns.forEach(function(b) {
        b.classList.remove('mm-fadeout');
        b.style.display = '';
        b.style.transition = '';
        b.style.transform = '';
    });
    
    mobileMenuCurrentSection = null;
}

// ============================================
// MENU NAVIGATION (desktop + mobile aware)
// ============================================

function showSubMenu(menu) {
    // On mobile, use the mobile menu instead
    if (isMobile()) {
        showMobileSubMenu(menu);
        return;
    }
    
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
        
        // On mobile: show mobile submenu (or main menu for eswu)
        if (isMobile()) {
            currentSubContext = null;
            currentSearchContext = null;
            document.getElementById('btnRegresa').classList.add('hidden');
            document.getElementById('btnSearch').classList.add('hidden');
            document.getElementById('contentArea').classList.remove('fullwidth');
            
            if (currentMenuContext === 'eswu') {
                // ESWU no tiene submenú, regresar al menú principal
                showMobileMenu();
            } else if (mobileMenuCurrentSection || currentMenuContext !== 'main') {
                showMobileSubMenu(mobileMenuCurrentSection || currentMenuContext);
            } else {
                showMobileMenu();
            }
            return;
        }
        
        // Desktop: show sidebar + submenu
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
    // Hide mobile menu
    if (isMobile()) hideMobileMenu();
    
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
        } else if (tabName === 'mantenimiento') {
            document.querySelector('#proveedorDetailModal .tab:nth-child(4)').classList.add('active');
            document.getElementById('proveedorMantenimientoTab').classList.add('active');
            if (typeof renderProveedorMantenimiento === 'function') renderProveedorMantenimiento();
        } else if (tabName === 'notas') {
            document.querySelector('#proveedorDetailModal .tab:nth-child(5)').classList.add('active');
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
        
        // Reset mobile menu
        hideMobileMenu();
        mobileMenuCurrentSection = null;
        
        currentUser = null;
        currentMenuContext = 'main';
        currentSubContext = null;
    }
}

console.log('✅ NAVIGATION.JS v2 cargado (mobile menu)');
