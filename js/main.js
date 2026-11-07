import { Header } from "./components/header.js";
import { Footer } from "./components/footer.js";
import { router } from "./router.js";
import { limpiarSesion, esModoDemo } from "./services/api.js";
import { resetDemoData } from "./services/mockApi.js";
 

// ============================================================
// 📊 ACTUALIZAR CONTADOR DEL CARRITO
// ============================================================
export function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const total = carrito.reduce((acc, p) => acc + p.cantidad, 0);
    
    const contador = document.getElementById("contador-carrito");
    if (contador) {
        contador.textContent = total;
        if (total > 0) {
            contador.classList.remove("d-none");
        } else {
            contador.classList.add("d-none");
        }
    }
}

// ============================================================
// 🎨 RENDERIZAR LAYOUT PRINCIPAL
// ============================================================
function renderLayout() {
    const root = document.getElementById("root");
 
    if (!root) {
        console.error("No se encontró el elemento #root");
        return;
    }
 
    root.innerHTML = `
        <header id="main-header">${Header()}</header>
        <main id="app" class="flex-fill"></main>
        <footer id="main-footer">${Footer()}</footer>
    `;
}

// ============================================================
// 🔄 ACTUALIZAR HEADER CUANDO CAMBIA LA SESIÓN
// ============================================================
export function refreshHeader() {
    const headerElement = document.getElementById("main-header");
    if (headerElement) {
        headerElement.innerHTML = Header();
        setupMenu();
    }
    actualizarContadorCarrito();
}
const updateHeader = refreshHeader;

// ============================================================
// 🔗 CONFIGURAR FILTROS DEL FOOTER
// ============================================================
function setupFooterFilters() {
    const footer = document.getElementById("main-footer");
    if (!footer) return;

    footer.querySelectorAll(".footer-filter-link").forEach(enlace => {
        enlace.onclick = (e) => {
            const link = e.target.closest('.footer-filter-link');
            const categoria = link?.dataset.categoria;
            if (!categoria) return;

            localStorage.setItem('filtro_pendiente_categoria', categoria);

            if (location.hash === '#/catalogo' && window.agroSeleccionarCategoria) {
                e.preventDefault();
                window.agroSeleccionarCategoria(categoria);
                localStorage.removeItem('filtro_pendiente_categoria');
                window.scrollTo(0, 0);
            }
        };
    });
}

// ============================================================
// ☰ MENÚ MÓVIL
// ============================================================
function setupMenu() {
    const btn = document.getElementById("menu-toggle");
    const nav = document.getElementById("nav-menu");
    const backdrop = document.getElementById("menu-backdrop");
 
    if (btn && nav) {
        btn.onclick = () => {
            nav.classList.toggle("active");
            if (backdrop) {
                backdrop.classList.toggle("active");
            }
        };
 
        nav.querySelectorAll("a").forEach(link => {
            link.onclick = () => {
                nav.classList.remove("active");
                if (backdrop) {
                    backdrop.classList.remove("active");
                }
            };
        });
    }
 
    if (backdrop) {
        backdrop.onclick = () => {
            nav.classList.remove("active");
            backdrop.classList.remove("active");
        };
    }
}

// ============================================================
// 🚪 LOGOUT — Delegación de eventos (funciona tras re-render del header)
// ============================================================
function setupLogout() {
    const handleLogout = (isMobile = false) => {
        limpiarSesion();
        updateHeader();
        if (isMobile) {
            const nav = document.getElementById("nav-menu");
            if (nav) nav.classList.remove("active");
        }
        window.location.hash = "#/";
    };

    // Usar delegación en document para que funcione aunque el header se re-renderice
    document.addEventListener("click", (e) => {
        if (e.target.closest("#logoutBtn")) {
            handleLogout(false);
        } else if (e.target.closest("#logoutBtnMobile")) {
            handleLogout(true);
        }
    });
}

// ============================================================
// 🎯 EVENT LISTENER PRINCIPAL
// ============================================================
window.addEventListener("hashchange", () => {
    refreshHeader();
    router();
    setupFooterFilters();
});

// ============================================================
// ⏱️ INICIALIZACIÓN
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    renderLayout();
    router();
    setupMenu();
    setupLogout();
    setupFooterFilters();
    actualizarContadorCarrito();
    setupDemoBadge();
});

// ============================================================
// 🧪 INDICADOR DE MODO DEMO
// ============================================================
function setupDemoBadge() {
    if (!esModoDemo()) return;
    const badge = document.createElement("div");
    badge.className = "demo-badge";
    badge.innerHTML = `
        <span><i class="bi bi-lightning-charge-fill"></i> Modo demo</span>
        <button type="button" title="Restaurar productos, pedidos y usuarios de ejemplo">Reiniciar datos</button>`;
    badge.querySelector("button").onclick = () => {
        if (!confirm("¿Restaurar los datos de ejemplo? Se borrarán los cambios hechos en la demo.")) return;
        resetDemoData();
        localStorage.removeItem("carrito");
        limpiarSesion();
        location.hash = "#/";
        location.reload();
    };
    document.body.appendChild(badge);
}