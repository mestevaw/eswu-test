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
    
    // Clear header context so icons don't float over menu
    clearHeaderContext();
    document.getElementById('btnRegresa').classList.add('hidden');
    document.getElementById('btnSearch').classList.add('hidden');
    currentSubContext = null;
    currentSearchContext = null;
    
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
// DASHBOARD
// ============================================

function showDashboard() {
    // Hide all pages, submenus, sidebar
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.getElementById('inquilinosSubMenu').classList.remove('active');
    document.getElementById('proveedoresSubMenu').classList.remove('active');
    document.getElementById('adminSubMenu').classList.remove('active');
    
    document.getElementById('menuSidebar').classList.add('hidden');
    document.getElementById('contentArea').classList.remove('with-submenu');
    document.getElementById('contentArea').classList.add('fullwidth');
    
    document.getElementById('btnRegresa').classList.add('hidden');
    document.getElementById('btnSearch').classList.add('hidden');
    
    // Hide header on dashboard
    var header = document.querySelector('.header');
    if (header) header.classList.add('dash-hidden');
    document.body.classList.add('dash-no-header');
    
    // Show dashboard
    document.getElementById('dashboardPage').classList.add('active');
    
    currentMenuContext = 'main';
    currentSubContext = null;
    currentSearchContext = null;
    clearHeaderContext();
    
    renderDashboard();
}

// Restore header when leaving dashboard
function showHeader() {
    var header = document.querySelector('.header');
    if (header) header.classList.remove('dash-hidden');
    document.body.classList.remove('dash-no-header');
}

function renderDashboard() {
    renderDashInquilinos();
    renderDashProveedores();
    renderDashMensajes();
    updateDashBadge();
}

// --- Dashboard state ---
var dashInqView = 'list';
var dashProvView = 'list';
var dashMsgView = 'mensajes';

function switchDashInqView(view) {
    dashInqView = view;
    var links = document.querySelectorAll('.dash-inquilinos .dash-tile-links-top span');
    links.forEach(function(s) { s.classList.remove('active'); });
    var idx = view === 'list' ? 0 : view === 'rentas' ? 1 : 2;
    if (links[idx]) links[idx].classList.add('active');
    renderDashInquilinos();
}

function switchDashProvView(view) {
    dashProvView = view;
    var links = document.querySelectorAll('.dash-proveedores .dash-tile-links-top span');
    links.forEach(function(s) { s.classList.remove('active'); });
    var idx = view === 'list' ? 0 : view === 'pagadas' ? 1 : 2;
    if (links[idx]) links[idx].classList.add('active');
    // Show green + only on porpagar AND nivel 1
    var addBtn = document.getElementById('dashProvAddFactura');
    if (addBtn) {
        var nivel = (typeof currentUser !== 'undefined' && currentUser && currentUser.nivel) || 1;
        addBtn.style.display = (view === 'porpagar' && nivel === 1) ? '' : 'none';
    }
    renderDashProveedores();
}

function switchDashMsgView(view) {
    dashMsgView = view;
    var tabs = document.querySelectorAll('.dash-msg-tab');
    tabs.forEach(function(s) { s.classList.remove('active'); });
    var idx = view === 'mensajes' ? 0 : view === 'alertas' ? 1 : 2;
    if (tabs[idx]) tabs[idx].classList.add('active');
    renderDashMensajes();
}

function renderDashInquilinos() {
    var div = document.getElementById('dashInquilinosList');
    if (!div) return;
    var q = (document.getElementById('dashInqSearch') || {}).value || '';
    q = q.toLowerCase().trim();
    
    if (dashInqView === 'list') {
        var lista = inquilinos.filter(function(i) { return i.contrato_activo !== false; });
        if (q) lista = lista.filter(function(i) { return i.nombre.toLowerCase().includes(q); });
        if (lista.length === 0) { div.innerHTML = '<div class="dash-empty">Sin resultados</div>'; return; }
        var total = lista.length;
        var show = lista.slice(0, 7);
        var h = '';
        show.forEach(function(inq) {
            var nombre = inq.nombre.length > 25 ? inq.nombre.substring(0, 23) + '…' : inq.nombre;
            var contacto = (inq.contactos && inq.contactos.length > 0) ? inq.contactos[0] : null;
            var tel = contacto ? (contacto.telefono || '') : '';
            h += '<div class="dash-row dash-row-2line" onclick="showInquilinoDetail(' + inq.id + ')">';
            h += '<div class="dash-row-top">';
            h += '<span class="dash-row-name">' + nombre + '</span>';
            if (tel) {
                h += '<a href="tel:' + tel + '" class="dash-row-link" onclick="event.stopPropagation();">📞 ' + tel + '</a>';
            }
            h += '</div>';
            if (contacto) {
                h += '<div class="dash-row-bottom">';
                h += '<span class="dash-row-contact">' + (contacto.nombre || '') + '</span>';
                if (contacto.email) {
                    h += '<a href="mailto:' + contacto.email + '" class="dash-row-link" onclick="event.stopPropagation();">✉️ ' + contacto.email + '</a>';
                }
                h += '</div>';
            }
            h += '</div>';
        });
        if (total > 7) h += '<div class="dash-row-more" onclick="showInquilinosView(\'list\')">ver todos (' + total + ')</div>';
        div.innerHTML = h;
        
    } else if (dashInqView === 'rentas') {
        var rentas = [];
        inquilinos.forEach(function(inq) {
            if (inq.pagos) {
                inq.pagos.forEach(function(p) {
                    rentas.push({ nombre: inq.nombre, monto: p.monto, fecha: p.fecha, id: inq.id });
                });
            }
        });
        rentas.sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); });
        if (q) rentas = rentas.filter(function(r) { return r.nombre.toLowerCase().includes(q); });
        
        // Date range filter
        if (dashRentasDateFrom || dashRentasDateTo) {
            rentas = rentas.filter(function(r) {
                if (!r.fecha) return false;
                if (dashRentasDateFrom && r.fecha < dashRentasDateFrom) return false;
                if (dashRentasDateTo && r.fecha > dashRentasDateTo) return false;
                return true;
            });
        }
        
        // Calendar header
        var headerHtml = '<div style="display:flex;align-items:center;justify-content:flex-end;padding:0.2rem 0.5rem;border-bottom:1px solid var(--border);">';
        if (dashRentasDateFrom || dashRentasDateTo) {
            var fl = dashRentasDateFrom ? fmtFechaDash(dashRentasDateFrom) : '…';
            var tl = dashRentasDateTo ? fmtFechaDash(dashRentasDateTo) : '…';
            headerHtml += '<span style="font-size:0.68rem;color:var(--text-light);margin-right:auto;">' + fl + ' – ' + tl + '</span>';
        } else {
            headerHtml += '<span style="font-size:0.68rem;color:var(--text-light);margin-right:auto;">Todas las fechas</span>';
        }
        headerHtml += '<span onclick="toggleDashRentasDatePicker()" style="cursor:pointer;font-size:0.9rem;padding:0.1rem 0.3rem;border-radius:4px;" onmouseover="this.style.background=\'#e2e8f0\'" onmouseout="this.style.background=\'transparent\'" title="Filtrar por fecha">📅</span>';
        headerHtml += '</div>';
        
        if (rentas.length === 0) { div.innerHTML = headerHtml + '<div class="dash-empty">Sin rentas</div>'; return; }
        var h = headerHtml;
        var totalMonto = 0;
        rentas.forEach(function(r) {
            totalMonto += r.monto;
            var nombre = r.nombre.length > 30 ? r.nombre.substring(0, 28) + '…' : r.nombre;
            h += '<div class="dash-row dash-row-2line" onclick="showInquilinoDetail(' + r.id + ')">';
            h += '<div class="dash-row-top">';
            h += '<span class="dash-row-name">' + nombre + '</span>';
            h += '<span class="dash-row-meta">' + formatCurrency(r.monto) + '</span>';
            h += '</div>';
            h += '<div class="dash-row-bottom">';
            h += '<span class="dash-row-contact">' + formatDate(r.fecha) + '</span>';
            h += '</div>';
            h += '</div>';
        });
        // Sticky total
        if (totalMonto > 0) {
            h += '<div style="position:sticky;bottom:0;background:#d4edda;border-top:2px solid var(--success);padding:0.4rem 0.6rem;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:0.8rem;">';
            h += '<span>Total rentas</span>';
            h += '<span style="color:var(--success);">' + formatCurrency(totalMonto) + '</span>';
            h += '</div>';
        }
        div.innerHTML = h;
        
    } else if (dashInqView === 'contratos') {
        var lista = inquilinos.filter(function(i) { return i.contrato_activo !== false && i.fecha_vencimiento; });
        lista.sort(function(a, b) { return new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento); });
        if (q) lista = lista.filter(function(i) { return i.nombre.toLowerCase().includes(q); });
        if (lista.length === 0) { div.innerHTML = '<div class="dash-empty">Sin contratos</div>'; return; }
        var hoy = new Date(); hoy.setHours(0,0,0,0);
        var total = lista.length;
        var show = lista.slice(0, 7);
        var h = '';
        show.forEach(function(inq) {
            var nombre = inq.nombre.length > 25 ? inq.nombre.substring(0, 23) + '…' : inq.nombre;
            var venc = new Date(inq.fecha_vencimiento + 'T00:00:00');
            var dias = Math.ceil((venc - hoy) / 86400000);
            var metaClass = dias <= 30 ? 'dash-row-meta dash-row-meta-warn' : 'dash-row-meta';
            h += '<div class="dash-row" onclick="showInquilinoDetail(' + inq.id + ')">';
            h += '<span class="dash-row-name">' + nombre + '</span>';
            h += '<span class="' + metaClass + '">' + formatDate(inq.fecha_vencimiento) + '</span>';
            h += '</div>';
        });
        if (total > 7) h += '<div class="dash-row-more" onclick="showInquilinosView(\'vencimientoContratos\')">ver todos (' + total + ')</div>';
        div.innerHTML = h;
    }
}

// --- Dashboard Pagadas date range ---
var dashPagadasDateFrom = null;
var dashPagadasDateTo = null;

// --- Dashboard Rentas date range ---
var dashRentasDateFrom = null;
var dashRentasDateTo = null;

(function() {
    // Default: current month for both
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    var firstDay = new Date(y, m, 1).toISOString().slice(0, 10);
    var lastDay = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    dashPagadasDateFrom = firstDay;
    dashPagadasDateTo = lastDay;
    dashRentasDateFrom = firstDay;
    dashRentasDateTo = lastDay;
})();

function toggleDashPagadasDatePicker() {
    var existing = document.getElementById('dashPagadasDatePicker');
    if (existing) { existing.remove(); return; }
    
    var container = document.getElementById('dashProveedoresList');
    if (!container) return;
    
    var picker = document.createElement('div');
    picker.id = 'dashPagadasDatePicker';
    picker.style.cssText = 'padding:0.5rem 0.6rem;background:#f8fafc;border-bottom:1px solid var(--border);display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;font-size:0.75rem;';
    picker.innerHTML = '<label style="font-weight:500;">De:</label>' +
        '<input type="date" id="dashPagadasFrom" value="' + (dashPagadasDateFrom || '') + '" style="padding:0.2rem 0.3rem;border:1px solid var(--border);border-radius:4px;font-size:0.75rem;">' +
        '<label style="font-weight:500;">A:</label>' +
        '<input type="date" id="dashPagadasTo" value="' + (dashPagadasDateTo || '') + '" style="padding:0.2rem 0.3rem;border:1px solid var(--border);border-radius:4px;font-size:0.75rem;">' +
        '<button onclick="applyDashPagadasFilter()" style="background:var(--primary);color:white;border:none;border-radius:4px;padding:0.2rem 0.6rem;font-size:0.72rem;cursor:pointer;">Aplicar</button>' +
        '<button onclick="clearDashPagadasFilter()" style="background:none;border:1px solid var(--border);border-radius:4px;padding:0.2rem 0.5rem;font-size:0.72rem;cursor:pointer;">Todo</button>';
    
    container.insertBefore(picker, container.firstChild);
}

function applyDashPagadasFilter() {
    var from = document.getElementById('dashPagadasFrom');
    var to = document.getElementById('dashPagadasTo');
    dashPagadasDateFrom = from ? from.value : null;
    dashPagadasDateTo = to ? to.value : null;
    var picker = document.getElementById('dashPagadasDatePicker');
    if (picker) picker.remove();
    renderDashProveedores();
}

function clearDashPagadasFilter() {
    dashPagadasDateFrom = null;
    dashPagadasDateTo = null;
    var picker = document.getElementById('dashPagadasDatePicker');
    if (picker) picker.remove();
    renderDashProveedores();
}

// --- Rentas date picker ---

function toggleDashRentasDatePicker() {
    var existing = document.getElementById('dashRentasDatePicker');
    if (existing) { existing.remove(); return; }
    
    var container = document.getElementById('dashInquilinosList');
    if (!container) return;
    
    var picker = document.createElement('div');
    picker.id = 'dashRentasDatePicker';
    picker.style.cssText = 'padding:0.5rem 0.6rem;background:#f8fafc;border-bottom:1px solid var(--border);display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;font-size:0.75rem;';
    picker.innerHTML = '<label style="font-weight:500;">De:</label>' +
        '<input type="date" id="dashRentasFrom" value="' + (dashRentasDateFrom || '') + '" style="padding:0.2rem 0.3rem;border:1px solid var(--border);border-radius:4px;font-size:0.75rem;">' +
        '<label style="font-weight:500;">A:</label>' +
        '<input type="date" id="dashRentasTo" value="' + (dashRentasDateTo || '') + '" style="padding:0.2rem 0.3rem;border:1px solid var(--border);border-radius:4px;font-size:0.75rem;">' +
        '<button onclick="applyDashRentasFilter()" style="background:var(--primary);color:white;border:none;border-radius:4px;padding:0.2rem 0.6rem;font-size:0.72rem;cursor:pointer;">Aplicar</button>' +
        '<button onclick="clearDashRentasFilter()" style="background:none;border:1px solid var(--border);border-radius:4px;padding:0.2rem 0.5rem;font-size:0.72rem;cursor:pointer;">Todo</button>';
    
    container.insertBefore(picker, container.firstChild);
}

function applyDashRentasFilter() {
    var from = document.getElementById('dashRentasFrom');
    var to = document.getElementById('dashRentasTo');
    dashRentasDateFrom = from ? from.value : null;
    dashRentasDateTo = to ? to.value : null;
    var picker = document.getElementById('dashRentasDatePicker');
    if (picker) picker.remove();
    renderDashInquilinos();
}

function clearDashRentasFilter() {
    dashRentasDateFrom = null;
    dashRentasDateTo = null;
    var picker = document.getElementById('dashRentasDatePicker');
    if (picker) picker.remove();
    renderDashInquilinos();
}

function renderDashProveedores() {
    var div = document.getElementById('dashProveedoresList');
    if (!div) return;
    var q = (document.getElementById('dashProvSearch') || {}).value || '';
    q = q.toLowerCase().trim();
    
    if (dashProvView === 'list') {
        var lista = proveedores.slice();
        if (q) lista = lista.filter(function(p) { return p.nombre.toLowerCase().includes(q) || (p.servicio || '').toLowerCase().includes(q); });
        if (lista.length === 0) { div.innerHTML = '<div class="dash-empty">Sin resultados</div>'; return; }
        var h = '';
        lista.forEach(function(prov) {
            var nombre = prov.nombre.length > 22 ? prov.nombre.substring(0, 20) + '…' : prov.nombre;
            var servicio = (prov.servicio || '').length > 18 ? prov.servicio.substring(0, 16) + '…' : (prov.servicio || '');
            var contacto = (prov.contactos && prov.contactos.length > 0) ? prov.contactos[0] : null;
            h += '<div class="dash-row dash-row-2line" onclick="showProveedorDetail(' + prov.id + ')">';
            h += '<div class="dash-row-top">';
            h += '<span class="dash-row-name">' + nombre + '</span>';
            h += '<span class="dash-row-meta">' + servicio + '</span>';
            h += '</div>';
            if (contacto) {
                h += '<div class="dash-row-bottom">';
                h += '<span class="dash-row-contact">' + (contacto.nombre || '') + '</span>';
                if (contacto.telefono) {
                    h += '<a href="tel:' + contacto.telefono + '" class="dash-row-link" onclick="event.stopPropagation();">📞 ' + contacto.telefono + '</a>';
                }
                if (contacto.email) {
                    h += '<a href="mailto:' + contacto.email + '" class="dash-row-link" onclick="event.stopPropagation();">✉️ ' + contacto.email + '</a>';
                }
                h += '</div>';
            }
            h += '</div>';
        });
        div.innerHTML = h;
        
    } else if (dashProvView === 'pagadas' || dashProvView === 'porpagar') {
        var isPagadas = dashProvView === 'pagadas';
        var viewName = isPagadas ? 'facturasPagadas' : 'facturasPorPagar';
        var facturasList = [];
        proveedores.forEach(function(prov) {
            if (prov.facturas) {
                prov.facturas.forEach(function(f) {
                    var estaPagada = !!f.fecha_pago;
                    if (isPagadas ? estaPagada : !estaPagada) {
                        facturasList.push({
                            provNombre: prov.nombre,
                            provId: prov.id,
                            monto: f.monto,
                            numero: f.numero || '',
                            fechaFactura: f.fecha || '',
                            fechaPago: f.fecha_pago || '',
                            docFileId: f.documento_drive_file_id || ''
                        });
                    }
                });
            }
        });
        facturasList.sort(function(a, b) {
            var da = isPagadas ? (a.fechaPago || a.fechaFactura) : a.fechaFactura;
            var db = isPagadas ? (b.fechaPago || b.fechaFactura) : b.fechaFactura;
            return (db || '').localeCompare(da || '');
        });
        if (q) facturasList = facturasList.filter(function(f) { return f.provNombre.toLowerCase().includes(q); });
        
        // Date range filter for pagadas
        if (isPagadas && (dashPagadasDateFrom || dashPagadasDateTo)) {
            facturasList = facturasList.filter(function(f) {
                var d = f.fechaPago || f.fechaFactura;
                if (!d) return false;
                if (dashPagadasDateFrom && d < dashPagadasDateFrom) return false;
                if (dashPagadasDateTo && d > dashPagadasDateTo) return false;
                return true;
            });
        }
        
        // Calendar icon for pagadas
        var headerHtml = '';
        if (isPagadas) {
            headerHtml += '<div style="display:flex;align-items:center;justify-content:flex-end;padding:0.2rem 0.5rem;border-bottom:1px solid var(--border);">';
            var rangeLabel = '';
            if (dashPagadasDateFrom || dashPagadasDateTo) {
                var fl = dashPagadasDateFrom ? fmtFechaDash(dashPagadasDateFrom) : '…';
                var tl = dashPagadasDateTo ? fmtFechaDash(dashPagadasDateTo) : '…';
                rangeLabel = '<span style="font-size:0.68rem;color:var(--text-light);margin-right:auto;">' + fl + ' – ' + tl + '</span>';
            } else {
                rangeLabel = '<span style="font-size:0.68rem;color:var(--text-light);margin-right:auto;">Todas las fechas</span>';
            }
            headerHtml += rangeLabel;
            headerHtml += '<span onclick="toggleDashPagadasDatePicker()" style="cursor:pointer;font-size:0.9rem;padding:0.1rem 0.3rem;border-radius:4px;" onmouseover="this.style.background=\'#e2e8f0\'" onmouseout="this.style.background=\'transparent\'" title="Filtrar por fecha">📅</span>';
            headerHtml += '</div>';
        }
        
        if (facturasList.length === 0) {
            div.innerHTML = headerHtml + '<div class="dash-empty">Sin facturas</div>';
            return;
        }
        var h = headerHtml;
        var totalMonto = 0;
        facturasList.forEach(function(f) {
            totalMonto += f.monto;
            var nombre = f.provNombre.length > 22 ? f.provNombre.substring(0, 20) + '…' : f.provNombre;
            var clickAction = f.docFileId
                ? 'viewDriveFileInline(\'' + f.docFileId + '\', \'Factura ' + (f.numero || '') + '\')'
                : 'showProveedorDetail(' + f.provId + ')';
            h += '<div class="dash-row dash-row-2line" onclick="' + clickAction + '">';
            h += '<div class="dash-row-top">';
            h += '<span class="dash-row-name">' + nombre + '</span>';
            h += '<span class="dash-row-meta">' + formatCurrency(f.monto) + '</span>';
            h += '</div>';
            h += '<div class="dash-row-bottom">';
            if (isPagadas) {
                h += '<span class="dash-row-contact">';
                if (f.numero) h += 'Factura No. ' + f.numero;
                if (f.fechaFactura) h += ' del ' + formatDate(f.fechaFactura);
                if (f.fechaPago) h += ', pagada el ' + formatDate(f.fechaPago);
                h += '</span>';
            } else {
                h += '<span class="dash-row-contact">';
                if (f.numero) h += 'Fact. No. ' + f.numero;
                if (f.fechaFactura) h += ' del ' + formatDate(f.fechaFactura);
                h += '</span>';
            }
            h += '</div>';
            h += '</div>';
        });
        // Sticky total for both views
        if (totalMonto > 0) {
            var totalLabel = isPagadas ? 'Total pagado' : 'Total por pagar';
            var totalColor = isPagadas ? 'color:var(--text);' : 'color:var(--danger);';
            h += '<div style="position:sticky;bottom:0;background:#e6f2ff;border-top:2px solid var(--primary);padding:0.4rem 0.6rem;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:0.8rem;">';
            h += '<span>' + totalLabel + '</span>';
            h += '<span style="' + totalColor + '">' + formatCurrency(totalMonto) + '</span>';
            h += '</div>';
        }
        div.innerHTML = h;
    }
}

function renderDashMensajes() {
    var div = document.getElementById('dashMensajesList');
    if (!div) return;
    var q = (document.getElementById('dashMsgSearch') || {}).value || '';
    q = q.toLowerCase().trim();
    
    if (dashMsgView === 'alertas') {
        var alertas = (typeof alertasSistema !== 'undefined') ? alertasSistema : [];
        if (alertas.length === 0) { div.innerHTML = '<div class="dash-empty">✅ Sin alertas pendientes</div>'; return; }
        var colorMap = { danger: '#fee2e2', warning: '#fef3c7', info: '#dbeafe' };
        var borderMap = { danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
        var h = '';
        alertas.forEach(function(a, idx) {
            if (q && !a.texto.toLowerCase().includes(q)) return;
            h += '<div class="dash-alerta-item" onclick="alertasSistema[' + idx + '].accion()" style="background:' + colorMap[a.tipo] + ';border-left-color:' + borderMap[a.tipo] + ';">';
            h += '<span style="margin-right:0.3rem;">' + a.icono + '</span>' + a.texto;
            h += '</div>';
        });
        div.innerHTML = h || '<div class="dash-empty">Sin resultados</div>';
        
    } else if (dashMsgView === 'mensajes') {
        var msgs = (typeof mensajes !== 'undefined') ? mensajes : [];
        if (q) msgs = msgs.filter(function(m) { return (m.asunto || '').toLowerCase().includes(q) || (m.de_usuario && m.de_usuario.nombre.toLowerCase().includes(q)); });
        if (msgs.length === 0) { div.innerHTML = '<div class="dash-empty">📭 Sin mensajes</div>'; return; }
        var h = '';
        msgs.forEach(function(m) {
            var de = m.de_usuario ? m.de_usuario.nombre : 'Sistema';
            var fecha = new Date(m.fecha_envio);
            var fechaStr = fecha.toLocaleDateString('es-MX', { day:'numeric', month:'short' });
            var unreadClass = m.leido ? '' : ' dash-msg-unread';
            h += '<div class="dash-msg-row" onclick="abrirMensaje(' + m.id + ')">';
            h += '<div class="dash-msg-subject' + unreadClass + '">' + (m.asunto || 'Sin asunto') + '</div>';
            h += '<div class="dash-msg-meta"><span>' + de + '</span><span>' + fechaStr + '</span></div>';
            h += '</div>';
        });
        div.innerHTML = h;
        
    } else if (dashMsgView === 'avisos') {
        var avisosArr = (typeof avisos !== 'undefined') ? avisos : [];
        var hoy = new Date();
        var vigentes = avisosArr.filter(function(a) {
            if (a.fecha_expiracion && new Date(a.fecha_expiracion) < hoy) return false;
            return true;
        });
        if (q) vigentes = vigentes.filter(function(a) { return (a.titulo || '').toLowerCase().includes(q) || (a.contenido || '').toLowerCase().includes(q); });
        if (vigentes.length === 0) { div.innerHTML = '<div class="dash-empty">📋 Sin avisos activos</div>'; return; }
        var h = '';
        vigentes.forEach(function(a) {
            var yaLeido = currentUser && (a.avisos_leidos || []).some(function(l) { return l.usuario_id === currentUser.id; });
            var bg = yaLeido ? 'white' : '#fffbeb';
            var fecha = new Date(a.fecha_publicacion);
            var fechaStr = fecha.toLocaleDateString('es-MX', { day:'numeric', month:'short' });
            h += '<div class="dash-msg-row" style="background:' + bg + ';" onclick="showMensajesPage(); setTimeout(function(){ switchMensajesTab(\'avisos\'); }, 100);">';
            h += '<div class="dash-msg-subject' + (yaLeido ? '' : ' dash-msg-unread') + '">📢 ' + (a.titulo || 'Sin título') + '</div>';
            h += '<div class="dash-msg-meta"><span>' + (a.usuario ? a.usuario.nombre : '') + '</span><span>' + fechaStr + '</span></div>';
            h += '</div>';
        });
        div.innerHTML = h;
    }
}

function updateDashBadge() {
    var alertBadge = document.getElementById('dashAlertasBadge');
    if (!alertBadge) return;
    var alertasCount = (typeof alertasSistema !== 'undefined') ? alertasSistema.length : 0;
    if (alertasCount > 0) {
        alertBadge.textContent = alertasCount;
        alertBadge.style.display = 'inline-flex';
    } else {
        alertBadge.style.display = 'none';
    }
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
    
    showHeader();
    
    // Hide dashboard and any active pages
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    
    // Show sidebar
    document.getElementById('menuSidebar').classList.remove('hidden');
    document.getElementById('contentArea').classList.remove('fullwidth');
    
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
    
    document.getElementById('btnRegresa').classList.remove('hidden');
    document.getElementById('btnSearch').classList.add('hidden');
    // Only admin uses the submenu sidebar; inquilinos/proveedores use toolbar hamburger
    if (menu === 'admin') {
        document.getElementById('contentArea').classList.add('with-submenu');
    } else {
        document.getElementById('contentArea').classList.remove('with-submenu');
    }
}

function handleRegresa() {
    // Level 4: X button logs them out completely
    if (currentUser && currentUser.nivel === 4) {
        logout();
        return;
    }
    
    // Close any open modals first
    var openModals = document.querySelectorAll('.modal.active');
    if (openModals.length > 0) {
        openModals.forEach(function(m) { m.classList.remove('active'); });
        return;
    }
    
    if (currentSubContext) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // On mobile: show mobile submenu (or main menu for eswu)
        if (isMobile()) {
            currentSubContext = null;
            currentSearchContext = null;
            clearHeaderContext();
            document.getElementById('btnRegresa').classList.add('hidden');
            document.getElementById('btnSearch').classList.add('hidden');
            document.getElementById('contentArea').classList.remove('fullwidth');
            
            if (currentMenuContext === 'eswu') {
                showMobileMenu();
            } else if (mobileMenuCurrentSection || currentMenuContext !== 'main') {
                showMobileSubMenu(mobileMenuCurrentSection || currentMenuContext);
            } else {
                showMobileMenu();
            }
            return;
        }
        
        // Desktop: volver al dashboard
        showDashboard();
    }
}

function showPageFromMenu(pageName) {
    showHeader();
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
    
    // If live search is active, just let it filter (already happening via oninput)
    if (_headerLiveSearchFn) return;
    
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
    
    if (_headerLiveSearchFn && typeof window[_headerLiveSearchFn] === 'function') {
        window[_headerLiveSearchFn]();
    } else if (currentSearchContext === 'bitacora') {
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
    if (type === 'eswu') {
        document.querySelectorAll('#eswuDocsPage .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#eswuDocsPage .tab-content').forEach(tc => tc.classList.remove('active'));
        
        var tabMap = { legales: 1, generales: 2, mensajes: 3, bancos: 4, balance: 5, usuarios: 6 };
        var tabIndex = tabMap[tabName] || 1;
        var tabBtn = document.querySelector('#eswuDocsPage .tab:nth-child(' + tabIndex + ')');
        if (tabBtn) tabBtn.classList.add('active');
        
        var tabContentId = 'eswu' + tabName.charAt(0).toUpperCase() + tabName.slice(1) + 'Tab';
        var tabContent = document.getElementById(tabContentId);
        if (tabContent) tabContent.classList.add('active');
        
        window.eswuActiveTab = tabName;
        
        // Sync mobile dropdown
        var sel = document.querySelector('#eswuDocsPage .tabs-mobile-select');
        if (sel) sel.value = tabName;
        
        // Show/hide balance inline filters
        var isBalance = (tabName === 'balance');
        var desktopFilters = document.getElementById('balanceInlineFilters');
        if (desktopFilters) desktopFilters.style.display = isBalance ? 'inline-block' : 'none';
        document.querySelectorAll('.balance-inline-filter').forEach(function(el) {
            el.style.display = isBalance ? 'inline-block' : 'none';
        });
        
        // Initialize data-dependent tabs when first shown
        if (isBalance && typeof initBalanceTab === 'function') {
            initBalanceTab();
        }
        if (tabName === 'bancos' && typeof renderEswuBancosTable === 'function') {
            renderEswuBancosTable();
        }
        if (tabName === 'usuarios' && typeof renderEswuUsuariosTab === 'function') {
            renderEswuUsuariosTab();
        }
    } else if (type === 'inquilino') {
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
        // Sync mobile dropdown
        var sel = document.querySelector('#inquilinoDetailModal .tabs-mobile-select');
        if (sel) sel.value = tabName;
    } else if (type === 'proveedor') {
        document.querySelectorAll('#proveedorDetailModal .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#proveedorDetailModal .tab-content').forEach(tc => tc.classList.remove('active'));
        
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
        // Sync mobile dropdown
        var sel = document.querySelector('#proveedorDetailModal .tabs-mobile-select');
        if (sel) sel.value = tabName;
    }
}

// ============================================
// DROPDOWN
// ============================================

// Proveedores page navigation hamburger
// ============================================
// SECTION TOOLBAR — Nav menu & search toggle
// ============================================

function toggleNavMenu(btn) {
    var dropdown = btn.nextElementSibling;
    var isOpen = dropdown.style.display === 'block';
    // Close all nav-dropdowns first
    document.querySelectorAll('.nav-dropdown').forEach(function(d) { d.style.display = 'none'; });
    if (!isOpen) dropdown.style.display = 'block';
}

function toggleToolbarSearch(btn) {
    // Find the sibling toolbar-search input (previous sibling)
    var toolbar = btn.closest('.toolbar-right');
    if (!toolbar) return;
    var input = toolbar.querySelector('.toolbar-search');
    if (!input) return;
    if (input.classList.contains('open')) {
        input.classList.remove('open');
        input.value = '';
        // Trigger oninput to refresh
        input.dispatchEvent(new Event('input'));
    } else {
        input.classList.add('open');
        input.focus();
    }
}

// Legacy alias
function toggleProvNav(btn) { toggleNavMenu(btn); }

// Close nav-dropdown on click outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.nav-menu') && !e.target.closest('.prov-nav-menu')) {
        document.querySelectorAll('.nav-dropdown, .prov-nav-dropdown').forEach(function(d) { d.style.display = 'none'; });
    }
});

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

// ============================================
// DATE FORMAT HELPER
// ============================================

function fmtFechaDash(dateStr) {
    if (!dateStr) return '';
    var meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    var d = new Date(dateStr + 'T00:00:00');
    return d.getDate() + ' ' + meses[d.getMonth()] + ' ' + String(d.getFullYear()).slice(-2);
}

// ============================================
// PASSWORD VISIBILITY TOGGLE
// ============================================

function togglePasswordVisibility(inputId, toggleEl) {
    var inp = document.getElementById(inputId);
    if (!inp) return;
    if (inp.type === 'password') {
        inp.type = 'text';
        if (toggleEl) toggleEl.textContent = '🔒';
    } else {
        inp.type = 'password';
        if (toggleEl) toggleEl.textContent = '👁️';
    }
}

// ============================================
// HEADER CONTEXT — unified header bar (desktop)
// ============================================

var _headerLiveSearchFn = null;
var _headerExcelFn = null;
var _headerAddFn = null;
var _headerFilterYearCb = null;
var _headerFilterMonthCb = null;

function _hideAllCtx() {
    ['headerCtxSearchBtn','headerInlineSearch','headerFilterYear','headerFilterMonth','headerCtxExcel','headerCtxAdd'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('visible','open');
    });
    var navMenu = document.getElementById('headerNavMenu');
    if (navMenu) navMenu.style.display = 'none';
    var sub = document.getElementById('headerSubtitle');
    if (sub) sub.textContent = '';
    var header = document.querySelector('.header');
    if (header) header.classList.remove('header-search-open');
    document.body.classList.remove('header-search-open');
    _headerLiveSearchFn = null;
    _headerExcelFn = null;
    _headerAddFn = null;
    _headerFilterYearCb = null;
    _headerFilterMonthCb = null;
}

function setHeaderContext(config) {
    _hideAllCtx();
    
    // Mark body so we can hide section-toolbars via CSS
    document.body.classList.add('header-ctx-active');
    
    // Subtitle
    var sub = document.getElementById('headerSubtitle');
    if (sub) sub.textContent = config.subtitle || '';
    
    // Nav dropdown
    var navMenu = document.getElementById('headerNavMenu');
    var navDropdown = document.getElementById('headerNavDropdown');
    if (config.navItems && config.navItems.length > 0) {
        navMenu.style.display = 'inline-block';
        var html = '';
        config.navItems.forEach(function(item) {
            var cls = 'nav-dropdown-item';
            if (item.isHome) cls += ' nav-home';
            if (item.active) cls += ' active';
            if (item.action && !item.active) {
                html += '<div class="' + cls + '" onclick="' + item.action + '">' + item.label + '</div>';
            } else {
                html += '<div class="' + cls + '">' + item.label + '</div>';
            }
        });
        navDropdown.innerHTML = html;
    }
    
    // Search
    if (config.liveSearch) {
        _headerLiveSearchFn = config.liveSearch;
        document.getElementById('headerCtxSearchBtn').classList.add('visible');
        var si = document.getElementById('headerInlineSearch');
        si.value = '';
        si.classList.remove('open');
    }
    
    // Filters
    if (config.filters) {
        config.filters.forEach(function(f) {
            if (f.type === 'year') {
                var yearSel = document.getElementById('headerFilterYear');
                yearSel.classList.add('visible');
                if (f.syncFrom) {
                    var src = document.getElementById(f.syncFrom);
                    if (src) { yearSel.innerHTML = src.innerHTML; yearSel.value = src.value; }
                }
                _headerFilterYearCb = f.onChange || null;
                yearSel.onchange = function() {
                    if (f.syncFrom) { var s = document.getElementById(f.syncFrom); if (s) s.value = yearSel.value; }
                    if (_headerFilterYearCb) _headerFilterYearCb();
                };
            }
            if (f.type === 'month') {
                var monthSel = document.getElementById('headerFilterMonth');
                monthSel.classList.add('visible');
                monthSel.innerHTML = '<option value="">Todos</option>' +
                    '<option value="0">Ene</option><option value="1">Feb</option><option value="2">Mar</option>' +
                    '<option value="3">Abr</option><option value="4">May</option><option value="5">Jun</option>' +
                    '<option value="6">Jul</option><option value="7">Ago</option><option value="8">Sep</option>' +
                    '<option value="9">Oct</option><option value="10">Nov</option><option value="11">Dic</option>';
                if (f.syncFrom) {
                    var src2 = document.getElementById(f.syncFrom);
                    if (src2) monthSel.value = src2.value;
                }
                _headerFilterMonthCb = f.onChange || null;
                monthSel.onchange = function() {
                    if (f.syncFrom) { var s = document.getElementById(f.syncFrom); if (s) s.value = monthSel.value; }
                    if (_headerFilterMonthCb) _headerFilterMonthCb();
                };
            }
        });
    }
    
    // Actions
    if (config.actions) {
        config.actions.forEach(function(a) {
            if (a.icon === '📊') {
                document.getElementById('headerCtxExcel').classList.add('visible');
                _headerExcelFn = a.onclick;
            } else if (a.icon === '+') {
                document.getElementById('headerCtxAdd').classList.add('visible');
                _headerAddFn = a.onclick;
            }
        });
    }
    
    // Wire up click handlers
    document.getElementById('headerCtxExcel').onclick = function() {
        if (_headerExcelFn) { var fn = new Function(_headerExcelFn); fn(); }
    };
    document.getElementById('headerCtxAdd').onclick = function() {
        if (_headerAddFn) { var fn = new Function(_headerAddFn); fn(); }
    };
    
    document.getElementById('btnSearch').classList.add('hidden');
}

function clearHeaderContext() {
    _hideAllCtx();
    document.body.classList.remove('header-ctx-active');
    var searchBar = document.getElementById('headerSearchBar');
    if (searchBar) searchBar.classList.remove('active');
}

function toggleHeaderInlineSearch() {
    var input = document.getElementById('headerInlineSearch');
    if (!input) return;
    var header = document.querySelector('.header');
    if (header && header.classList.contains('header-search-open')) {
        // Close search
        input.classList.remove('open');
        input.value = '';
        header.classList.remove('header-search-open');
        document.body.classList.remove('header-search-open');
        if (_headerLiveSearchFn && typeof window[_headerLiveSearchFn] === 'function') {
            window[_headerLiveSearchFn]();
        }
    } else {
        // Open search
        input.classList.add('open');
        if (header) header.classList.add('header-search-open');
        document.body.classList.add('header-search-open');
        setTimeout(function() { input.focus(); }, 50);
    }
}

function headerSearchLive() {
    if (_headerLiveSearchFn && typeof window[_headerLiveSearchFn] === 'function') {
        window[_headerLiveSearchFn]();
    }
}

console.log('✅ NAVIGATION.JS v3 cargado (mobile menu)');
