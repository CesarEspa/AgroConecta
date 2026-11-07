import { getProductos, manejarErrorAPI } from '../services/api.js';
import { actualizarContadorCarrito } from "../main.js";
import { products as productosEstaticos } from "../../data/products.js";

const formatPrice = (valor) => {
    return valor.toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export function Catalogo() {
    setTimeout(() => initCatalogo(), 0);

    return `
        <button id="btn-scroll-top" class="btn-scroll-top" title="Ir hacia arriba">↑</button>

        <section class="hero">
            <span class="badge">Productos</span>
            <h1>Catálogo de Productos</h1>
            <p>Explora nuestra selección de insumos agropecuarios de alta calidad para potenciar tu producción.</p>
        </section>

        <section class="catalogo-container">
            <aside class="filtros">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3 class="m-0">Filtros</h3>
                    <button id="btn-limpiar" class="btn btn-sm btn-outline-success border-0">Limpiar</button>
                </div>

                <p class="small fw-bold text-muted text-uppercase mb-3">Categoría</p>
                <div class="filter-options" id="filter-categorias">
                    <label><input type="radio" name="cat" value="TODOS" checked><span> Todos</span></label>
                </div>

                <p class="small fw-bold text-muted text-uppercase mt-4 mb-3">Precio</p>
                <div class="filter-options">
                    <label><input type="radio" name="price" value="ALL" checked><span> Todos</span></label>
                    <label><input type="radio" name="price" value="LOW"><span> Menos de $50k</span></label>
                    <label><input type="radio" name="price" value="MID"><span> $50k - $150k</span></label>
                    <label><input type="radio" name="price" value="HIGH"><span> Más de $150k</span></label>
                </div>
            </aside>

            <div class="catalog-main">
                <div id="contenedor-productos" class="productos"></div>
            </div>
        </section>

        <div id="modal-producto" class="modal-agro-overlay">
            <div class="modal-agro-content animate-fade-in">
                <button class="modal-agro-close" id="close-modal">&times;</button>
                <div class="modal-agro-body">
                    <div class="modal-agro-img">
                        <img id="modal-img" src="" alt="Producto">
                    </div>
                    
                    <div class="modal-agro-info">
                        <div class="mb-2">
                            <span id="modal-cat" class="modal-badge-cat"></span>
                        </div>
                        <h2 id="modal-nombre" class="fw-bold mb-3"></h2>
                        
                        <div class="modal-price-container mb-4">
                            <h3 id="modal-precio" class="text-dark fw-bold m-0"></h3>
                            <span class="text-success small fw-bold">IVA incluido</span>
                        </div>

                        <p id="modal-desc" class="text-muted mb-4 small" style="line-height: 1.6;"></p>

                        <div class="modal-trust-box p-3 rounded-3 mb-4 bg-light border">
                            <div class="d-flex align-items-center gap-2 text-success mb-2">
                                <i class="bi bi-truck fs-5"></i>
                                <span class="small fw-bold">Envío rápido a todo el país</span>
                            </div>
                            <div class="d-flex align-items-center gap-2 text-muted">
                                <i class="bi bi-shield-lock-fill"></i>
                                <span class="small">Compra Protegida con AgroConecta</span>
                            </div>
                        </div>

                        <div class="modal-agro-actions">
                            <div class="d-flex align-items-stretch gap-3">
                                <div class="quantity-pill shadow-sm flex-shrink-0">
                                    <button class="btn btn-light border-end" type="button" id="modal-minus">-</button>
                                    <input type="number" value="1" min="1" class="form-control text-center fw-bold border-0 bg-white" id="modal-qty" style="width:65px;font-size:0.85rem" readonly>
                                    <button class="btn btn-light border-start" type="button" id="modal-plus">+</button>
                                </div>
                                <button class="btn btn-success flex-grow-1 fw-bold rounded-4 shadow d-flex align-items-center justify-content-center gap-2" id="btn-add-from-modal" style="white-space: nowrap; font-size: 0.8rem;">
                                    <i class="bi bi-cart-plus"></i> AGREGAR AL CARRITO
                                </button>
                            </div>
                            <span id="modal-stock" class="small text-muted d-block mt-2"></span>
                        </div>

                        <div class="mt-4 pt-3 border-top d-flex justify-content-between">
                            <div class="d-flex align-items-center gap-1 text-muted" style="font-size: 0.7rem;">
                                <i class="bi bi-award text-success"></i> Calidad Superior
                            </div>
                            <div class="d-flex align-items-center gap-1 text-muted" style="font-size: 0.7rem;">
                                <i class="bi bi-check-circle text-success"></i> Stock Real
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function initCatalogo() {
    const contenedor = document.getElementById('contenedor-productos');
    const modal = document.getElementById('modal-producto');
    const inputQty = document.getElementById('modal-qty');
    const scrollTopBtn = document.getElementById('btn-scroll-top');
    
    if (!contenedor || !modal) return;

    // ============================================================
    // 📦 CARGAR PRODUCTOS DESDE API
    // ============================================================
    let todosLosProductos = [];

    try {
        const productosAPI = await getProductos();
        todosLosProductos = productosAPI.map((p, i) => mapearProducto(p, i));
    } catch (error) {
        console.error("Error cargando productos de la API, usando fallback:", error);
        // Fallback a data estática
        todosLosProductos = productosEstaticos.map((p, i) => mapearProducto(p, i));
    }

    // ============================================================
    // 🛠️ UTILIDADES
    // ============================================================
    function mapearProducto(p, index) {
        // Extraer primera imagen
        let imagenSegura = 'placeholder.jpg';
        if (p.imagen) {
            const imagenes = p.imagen.split('|').filter(s => s);
            imagenSegura = imagenes[0] || imagenSegura;
        }

        // Datos de descuento desde detalles
        const enDescuento = p.detalles?.enDescuento === true;
        const porcentajeDescuento = p.detalles?.porcentajeDescuento ?? 0;
        const precioOriginal = Number(p.precio) || 0;
        const precioFinal = enDescuento ? precioOriginal * (1 - porcentajeDescuento / 100) : precioOriginal;

        return {
            id: `prod-${p.id || index}`,
            productId: p.id,
            nombre: p.nombre,
            cat: p.categoriaNombre || "Otros",
            precio: precioFinal,
            precioOriginal,
            enDescuento,
            porcentajeDescuento,
            stock: Number(p.cantidad) || 0,
            img: imagenSegura,
            desc: p.descripcion || "",
            esBase64: typeof imagenSegura === 'string' && imagenSegura.startsWith('data:image')
        };
    }

    function formatoImagen(img, esBase64) {
        if (esBase64) return img;
        return img.startsWith('data:') ? img : `${img}`;
    }

    // ============================================================
    // 🎨 RENDER PRODUCTOS
    // ============================================================
    const render = (lista) => {
        if (lista.length === 0) {
            contenedor.innerHTML = '<div class="text-center p-5"><p class="text-muted">No encontramos productos con esos filtros.</p></div>';
            return;
        }

        contenedor.innerHTML = lista.map(p => {
            const srcImagen = formatoImagen(p.img, p.esBase64);
            const badgeDescuento = p.enDescuento
                ? `<span class="badge-descuento">${p.porcentajeDescuento}% OFF</span>`
                : '';
            const precioHtml = p.enDescuento
                ? `<span class="precio-original">${formatPrice(p.precioOriginal)}</span>
                   <strong class="h5 text-danger d-block mb-3">${formatPrice(p.precio)}</strong>`
                : `<strong class="h5 text-dark d-block mb-3">${formatPrice(p.precio)}</strong>`;
            return `
                <div class="card" data-id="${p.id}" data-product-id="${p.productId}">
                    <div class="card-img trigger-modal" style="position:relative;">
                        <img src="${srcImagen}" alt="${p.nombre}">
                        <span class="stock">${p.stock} en stock</span>
                        ${badgeDescuento}
                    </div>
                    <div class="card-body">
                        <small class="text-success fw-bold text-uppercase">${p.cat}</small>
                        <h3 class="trigger-modal h6 fw-bold mb-2">${p.nombre}</h3>
                        ${precioHtml}
                        <button class="btn btn-success btn-sm w-100 btn-agregar" 
                            data-product-id="${p.productId}"
                            data-nombre="${p.nombre}" 
                            data-precio="${p.precio}" 
                            data-img="${srcImagen}"
                            data-stock="${p.stock}">
                            Agregar al Carrito
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Bind modal
        document.querySelectorAll('.trigger-modal').forEach(el => {
            el.onclick = (e) => {
                const card = e.target.closest('.card');
                const producto = todosLosProductos.find(item => item.id == card.dataset.id);
                if (producto) abrirModal(producto);
            };
        });
    };

    // ============================================================
    // 📱 MODAL Y NOTIFICACIONES
    // ============================================================
    const mostrarError = (mensaje) => {
        const toast = document.createElement("div");
        toast.className = "agro-toast agro-toast-error shadow-lg";
        toast.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <i class="bi bi-exclamation-circle-fill fs-3 text-white"></i>
                <div>
                    <h6 class="m-0 fw-bold text-white">Stock insuficiente</h6>
                    <p class="m-0 small text-white opacity-75">${mensaje}</p>
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add("agro-toast-exit");
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };

    const mostrarNotificacion = (nombre) => {
        const toast = document.createElement("div");
        toast.className = "agro-toast shadow-lg";
        toast.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <i class="bi bi-cart-check-fill fs-3 text-white"></i>
                <div>
                    <h6 class="m-0 fw-bold text-white">¡Añadido!</h6>
                    <p class="m-0 small text-white opacity-75">${nombre}</p>
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add("agro-toast-exit");
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };

    const abrirModal = (p) => {
        const srcImg = formatoImagen(p.img, p.esBase64);
        document.getElementById('modal-img').src = srcImg;
        document.getElementById('modal-nombre').textContent = p.nombre;
        document.getElementById('modal-cat').textContent = p.cat;
        document.getElementById('modal-desc').textContent = p.desc;
        // Precio en modal: muestra el precio final (ya descontado si aplica)
        document.getElementById('modal-precio').textContent = formatPrice(p.precio);
        const modalStock = document.getElementById('modal-stock');
        modalStock.textContent = `(${p.stock} disponibles)`;
        modalStock.dataset.stock = p.stock;
        document.getElementById('modal-qty').value = 1;
        modal.dataset.productId = p.productId;
        modal.classList.add('active');
    };

   // ============================================================
   // 🛒 AGREGAR AL CARRITO DESDE TARJETAS
   // Listener scoped al section del catálogo para evitar acumulación al navegar.
   // ============================================================
   const section = contenedor.closest('section') || contenedor;
   section.addEventListener('click', (e) => {
      const btnAgregar = e.target.closest('.btn-agregar');
      if (!btnAgregar) return;

      const pData = {
         productId: Number(btnAgregar.dataset.productId),
         nombre: btnAgregar.dataset.nombre,
         precio: Number(btnAgregar.dataset.precio),
         img: btnAgregar.dataset.img,
         stock: Number(btnAgregar.dataset.stock)
      };

      agregarAlCarrito(pData, 1);
   });

   // ============================================================
   // 🛒 AGREGAR AL CARRITO DESDE MODAL
   // Listener scoped al propio modal (vive fuera del section).
   // ============================================================
   const btnAddModal = document.getElementById('btn-add-from-modal');
   if (btnAddModal) {
      btnAddModal.addEventListener('click', () => {
         const rawPriceText = document.getElementById('modal-precio').textContent;
         const cleanPrice = Number(rawPriceText.replace(/[^0-9]/g, "")) / 100;
         const pData = {
            productId: Number(modal.dataset.productId) || 0,
            nombre: document.getElementById('modal-nombre').textContent,
            precio: cleanPrice,
            img: document.getElementById('modal-img').src,
            stock: Number(document.getElementById('modal-stock').dataset.stock)
         };
         const cant = Number(document.getElementById('modal-qty').value);
         modal.classList.remove('active');
         agregarAlCarrito(pData, cant);
      });
   }

   // Función reutilizable de agregar al carrito
   function agregarAlCarrito(pData, cant) {
      let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
      const existe = carrito.find(p => p.productId === pData.productId);

      if (existe) {
         if (existe.cantidad + cant > pData.stock) {
            mostrarError("No puedes agregar más. Límite de stock alcanzado.");
            return;
         }
         existe.cantidad += cant;
         existe.stock = pData.stock;
      } else {
         if (cant > pData.stock) {
            mostrarError("No puedes agregar más. Límite de stock alcanzado.");
            return;
         }
         carrito.push({ ...pData, cantidad: cant });
      }

      localStorage.setItem("carrito", JSON.stringify(carrito));
      actualizarContadorCarrito();
      mostrarNotificacion(pData.nombre);
   }

    // ============================================================
    // 🔎 FILTRADO
    // ============================================================
    const poblarCategorias = () => {
        const container = document.getElementById('filter-categorias');
        if (!container) return;

        const categorias = [...new Set(todosLosProductos.map(p => p.cat).filter(Boolean))];
        const html = `<label><input type="radio" name="cat" value="TODOS" checked><span> Todos</span></label>`;
        
        const categoriasHtml = categorias.map(cat => 
            `<label><input type="radio" name="cat" value="${cat}"><span> ${cat}</span></label>`
        ).join('');

        container.innerHTML = html + categoriasHtml;

        // Re-bind eventos
        document.querySelectorAll('input[name="cat"], input[name="price"]').forEach(el => {
            el.addEventListener("change", filtrar);
        });
    };

    const normalizar = (t) => String(t || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

    const seleccionarCategoria = (categoria) => {
        const radio = [...document.querySelectorAll('input[name="cat"]')]
            .find(r => normalizar(r.value) === normalizar(categoria));
        if (radio) radio.checked = true;
    };
    window.agroSeleccionarCategoria = (categoria) => { seleccionarCategoria(categoria); filtrar(); };

    const filtrar = () => {
        const cat = document.querySelector('input[name="cat"]:checked')?.value || "TODOS";
        const price = document.querySelector('input[name="price"]:checked')?.value || "ALL";
        const termino = normalizar(document.querySelector('.contenedor-buscar input')?.value);
        
        let filtrados = todosLosProductos;
        
        if (cat !== "TODOS") {
            filtrados = filtrados.filter(p => normalizar(p.cat) === normalizar(cat));
        }

        if (termino) {
            filtrados = filtrados.filter(p => normalizar(`${p.nombre} ${p.cat} ${p.desc || ""}`).includes(termino));
        }
        
        if (price === "LOW") filtrados = filtrados.filter(p => p.precio < 50000);
        else if (price === "MID") filtrados = filtrados.filter(p => p.precio >= 50000 && p.precio <= 150000);
        else if (price === "HIGH") filtrados = filtrados.filter(p => p.precio > 150000);
        
        render(filtrados);
    };

    // ============================================================
    // 📌 EVENTOS Y SCROLL
    // ============================================================
    if (scrollTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                scrollTopBtn.classList.add('active');
            } else {
                scrollTopBtn.classList.remove('active');
            }
        });
        
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    document.getElementById('close-modal').onclick = () => modal.classList.remove('active');
    window.onclick = (e) => { if (e.target == modal) modal.classList.remove('active'); };

    document.getElementById('modal-plus').onclick = () => {
        const stock = Number(document.getElementById('modal-stock').dataset.stock);
        if (parseInt(inputQty.value) < stock) {
            inputQty.value = parseInt(inputQty.value) + 1;
        } else {
            mostrarError("Has alcanzado el límite de stock disponible.");
        }
    };
    
    document.getElementById('modal-minus').onclick = () => { 
        if (inputQty.value > 1) inputQty.value = parseInt(inputQty.value) - 1; 
    };

    document.getElementById('btn-limpiar').onclick = () => {
        document.querySelector('input[name="cat"][value="TODOS"]').checked = true;
        document.querySelector('input[name="price"][value="ALL"]').checked = true;
        filtrar();
    };

    // ============================================================
    // ⏱️ INICIALIZAR
    // ============================================================
    poblarCategorias();

    // Filtro pendiente (viene de los enlaces de categoría del footer)
    const pendiente = localStorage.getItem('filtro_pendiente_categoria');
    if (pendiente) {
        localStorage.removeItem('filtro_pendiente_categoria');
        seleccionarCategoria(pendiente);
    }

    // Buscador del header
    const buscador = document.querySelector('.contenedor-buscar input');
    if (buscador) {
        buscador.setAttribute('aria-label', 'Buscar productos');
        buscador.addEventListener('input', filtrar);
    }

    filtrar();
}