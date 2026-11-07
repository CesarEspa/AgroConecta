/**
 * 🌿 AgroConecta — Backend simulado (modo demo)
 *
 * Imita los endpoints de /api/v1 descritos en FRONTEND_API_GUIDE.md y guarda
 * los datos en localStorage, para que la tienda funcione sin servidor
 * (por ejemplo en GitHub Pages). Cuando el backend real esté desplegado,
 * basta con cambiar API_MODE en api.js a 'api' (o 'auto').
 */
import { products as seedProducts } from '../../data/products.js';

const DB_KEY = 'agro_demo_db';
const DB_VERSION = 2;

// Usuarios de prueba (solo existen en el modo demo)
export const DEMO_USERS = {
    admin:   { email: 'admin@agroconecta.demo',   password: 'Admin2026*'   },
    cliente: { email: 'cliente@agroconecta.demo', password: 'Cliente2026*' },
};

// Fechas en hora local con el formato del backend (yyyy-MM-ddTHH:mm:ss, sin zona)
const localIso = (ms) => new Date(ms - new Date(ms).getTimezoneOffset() * 6e4).toISOString().slice(0, 19);
const now = () => localIso(Date.now());
const daysAgo = (d) => localIso(Date.now() - d * 864e5);
const clone = (o) => JSON.parse(JSON.stringify(o));

function seed() {
    const catNames = [...new Set(seedProducts.map(p => p.categoriaId))];
    const categorias = catNames.map((c, i) => ({
        id: i + 1,
        nombre: c.charAt(0) + c.slice(1).toLowerCase(),
    }));
    const catId = (c) => catNames.indexOf(c) + 1;

    const productos = seedProducts.map((p, i) => ({
        id: i + 1,
        nombre: p.nombre,
        precio: p.precio,
        descripcion: p.descripcion,
        imagen: p.imagenes.map(f => `assets/imgs/${f}`).join('|'),
        detalles: { ...p.detalles },
        cantidad: p.cantidad,
        fechaDeIngreso: daysAgo(40 - i * 2),
        activo: p.activo !== false,
        stockMinimo: p.stockMinimo,
        descripcionLong: p.descripcionLong,
        categoriaId: catId(p.categoriaId),
        categoriaNombre: categorias[catId(p.categoriaId) - 1].nombre,
    }));

    const usuarios = [
        { id: 1, nombre: 'Administrador Demo', email: DEMO_USERS.admin.email, password: DEMO_USERS.admin.password,
          rol: 'ADMIN', estado: 'ACTIVO', fechaCreacion: daysAgo(60), telefono: null },
        { id: 2, nombre: 'Cliente Demo', email: DEMO_USERS.cliente.email, password: DEMO_USERS.cliente.password,
          rol: 'CLIENTE', estado: 'ACTIVO', fechaCreacion: daysAgo(30), telefono: '3001234567' },
        { id: 3, nombre: 'Finca La Esperanza', email: 'laesperanza@agroconecta.demo', password: 'Finca2026*',
          rol: 'CLIENTE', estado: 'ACTIVO', fechaCreacion: daysAgo(21), telefono: '3109876543' },
    ];

    const mkPedido = (id, clienteId, items, estado, dias) => {
        const detalles = items.map(([pid, cant]) => {
            const p = productos[pid - 1];
            return { productoId: pid, productoNombre: p.nombre, cantidad: cant, precioUni: p.precio, subtotal: p.precio * cant };
        });
        const historial = [{ estado: 'PENDIENTE', fecha: daysAgo(dias), nota: 'Creación inicial del pedido' }];
        if (estado === 'COMPRADO') historial.push({ estado: 'COMPRADO', fecha: daysAgo(dias - 1), nota: 'Pago confirmado' });
        return {
            id, clienteId, clienteNombre: usuarios.find(u => u.id === clienteId).nombre,
            estadoActual: estado, total: detalles.reduce((a, d) => a + d.subtotal, 0),
            creadoAt: daysAgo(dias), detalles, historial,
        };
    };

    const pedidos = [
        mkPedido(1, 3, [[6, 2], [10, 1]], 'COMPRADO', 12),
        mkPedido(2, 2, [[1, 3], [3, 2]], 'COMPRADO', 7),
        mkPedido(3, 3, [[9, 1]], 'PENDIENTE', 2),
    ];

    return { version: DB_VERSION, categorias, productos, usuarios, pedidos };
}

function load() {
    try {
        const db = JSON.parse(localStorage.getItem(DB_KEY));
        if (db && db.version === DB_VERSION) return db;
    } catch { /* datos corruptos: se regeneran */ }
    const db = seed();
    save(db);
    return db;
}

function save(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch { /* cuota llena (imágenes base64 grandes): se mantiene en memoria */ }
}

export function resetDemoData() {
    localStorage.removeItem(DB_KEY);
    return load();
}

// ------------------------------------------------------------
// Utilidades de respuesta
// ------------------------------------------------------------
function fail(status, message, fields) {
    const err = new Error(message);
    err.status = status;
    err.data = { status, message, ...(fields && { fields }) };
    throw err;
}

const nextId = (arr) => arr.reduce((m, x) => Math.max(m, x.id), 0) + 1;
const publicUser = ({ password, ...u }) => u;

function session(db) {
    const token = localStorage.getItem('token') || '';
    const m = token.match(/^demo\.(\d+)$/);
    if (!m) return null;
    return db.usuarios.find(u => u.id === Number(m[1]) && u.estado === 'ACTIVO') || null;
}

function requireRole(db, ...roles) {
    const user = session(db);
    if (!user) fail(401, 'Sesión expirada. Inicia sesión nuevamente.');
    if (roles.length && !roles.includes(user.rol)) fail(403, 'No tienes permiso para esta acción.');
    return user;
}

const telefonoValido = (t) => /^\+?\d{7,15}$/.test(String(t || ''));

// ------------------------------------------------------------
// Router de endpoints
// ------------------------------------------------------------
export async function mockApiCall(endpoint, options = {}) {
    // Pequeña latencia para que la UI se comporte como con un servidor real
    await new Promise(r => setTimeout(r, 180));

    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    const [path, query = ''] = endpoint.split('?');
    const params = new URLSearchParams(query);
    const seg = path.split('/').filter(Boolean); // ej: ['productos','3']
    const db = load();
    const id = Number(seg[1]);

    // ---------- AUTH ----------
    if (path === '/auth/login' && method === 'POST') {
        const u = db.usuarios.find(x => x.email.toLowerCase() === String(body.email || '').toLowerCase());
        if (!u || u.password !== body.password) fail(401, 'Credenciales incorrectas');
        if (u.estado !== 'ACTIVO') fail(401, 'Usuario inactivo');
        return { token: `demo.${u.id}`, email: u.email, rol: u.rol, nombre: u.nombre, id: u.id };
    }

    if (path === '/auth/register' && method === 'POST') {
        const rol = body.rol || 'CLIENTE';
        const fields = {};
        if (!body.nombre) fields.nombre = 'El nombre es obligatorio';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email || '')) fields.email = 'Email inválido';
        if (!body.password || body.password.length < 8) fields.password = 'La contraseña debe tener mínimo 8 caracteres';
        if (rol === 'CLIENTE' && !telefonoValido(body.telefono)) fields.telefono = 'El teléfono es obligatorio para los clientes';
        if (Object.keys(fields).length) fail(400, 'Error de validación', fields);
        if (db.usuarios.some(u => u.email.toLowerCase() === body.email.toLowerCase())) fail(409, 'El email ya está registrado');
        db.usuarios.push({
            id: nextId(db.usuarios), nombre: body.nombre, email: body.email, password: body.password,
            rol, estado: 'ACTIVO', fechaCreacion: now(), telefono: body.telefono || null,
        });
        save(db);
        return { mensaje: 'Usuario registrado exitosamente', email: body.email, rol };
    }

    // ---------- CATEGORÍAS ----------
    if (seg[0] === 'categorias') {
        if (method === 'GET' && !seg[1]) return clone(db.categorias);
        if (method === 'GET') return clone(db.categorias.find(c => c.id === id) || fail(404, 'Categoría no encontrada'));
        requireRole(db, 'ADMIN');
        if (method === 'POST') {
            const c = { id: nextId(db.categorias), nombre: body.nombre };
            db.categorias.push(c); save(db); return c;
        }
        const cat = db.categorias.find(c => c.id === id) || fail(404, 'Categoría no encontrada');
        if (method === 'PUT') { cat.nombre = body.nombre; save(db); return cat; }
        if (method === 'DELETE') {
            if (db.productos.some(p => p.categoriaId === id)) fail(409, 'La categoría tiene productos asociados');
            db.categorias = db.categorias.filter(c => c.id !== id); save(db); return {};
        }
    }

    // ---------- PRODUCTOS ----------
    if (seg[0] === 'productos') {
        if (method === 'GET' && !seg[1]) return clone(db.productos.filter(p => p.activo));
        if (method === 'GET' && seg[1] === 'promociones') return clone(db.productos.filter(p => p.activo && p.detalles?.enDescuento));
        if (method === 'GET' && seg[1] === 'admin') { requireRole(db, 'ADMIN'); return clone(db.productos); }
        if (method === 'GET') return clone(db.productos.find(p => p.id === id) || fail(404, 'Producto no encontrado'));

        requireRole(db, 'ADMIN');
        if (method === 'POST') {
            const imgs = body.imagenes || body.imagen || [];
            const fields = {};
            if (!body.nombre) fields.nombre = 'El nombre del producto es obligatorio';
            if (!(body.precio > 0)) fields.precio = 'El precio debe ser mayor a 0';
            if (!imgs.length) fields.imagenes = 'Debes adjuntar al menos 1 imagen';
            if (imgs.length > 7) fields.imagenes = 'Máximo 7 imágenes';
            const cat = db.categorias.find(c => c.id === Number(body.categoriaId));
            if (!cat) fields.categoriaId = 'Categoría inválida';
            if (Object.keys(fields).length) fail(400, 'Error de validación', fields);
            const p = {
                id: nextId(db.productos), nombre: body.nombre, precio: Number(body.precio),
                descripcion: body.descripcion || '', imagen: imgs.join('|'),
                detalles: body.detalles || { enDescuento: false, porcentajeDescuento: null },
                cantidad: Number(body.cantidad) || 0, fechaDeIngreso: now(), activo: true,
                stockMinimo: Number(body.stockMinimo) || 0, descripcionLong: body.descripcionLong || '',
                categoriaId: cat.id, categoriaNombre: cat.nombre,
            };
            db.productos.push(p); save(db); return clone(p);
        }
        const p = db.productos.find(x => x.id === id) || fail(404, 'Producto no encontrado');
        if (method === 'PUT') {
            ['precio', 'cantidad', 'stockMinimo'].forEach(k => { if (body[k] != null) p[k] = Number(body[k]); });
            if (body.activo != null) p.activo = !!body.activo;
            if (body.detalles) p.detalles = { ...p.detalles, ...body.detalles };
            save(db); return clone(p);
        }
        if (method === 'DELETE') {
            db.productos = db.productos.filter(x => x.id !== id); save(db); return {};
        }
    }

    // ---------- PEDIDOS ----------
    if (seg[0] === 'pedidos') {
        if (method === 'POST' && !seg[1]) {
            const user = requireRole(db, 'CLIENTE');
            if (!body.detalles?.length) fail(400, 'El pedido no tiene productos');
            const detalles = body.detalles.map(d => {
                const p = db.productos.find(x => x.id === Number(d.productoId) && x.activo);
                if (!p) fail(404, `Producto ${d.productoId} no disponible`);
                if (p.cantidad < d.cantidad) fail(409, `El producto '${p.nombre}' no cuenta con suficiente stock. Stock actual disponible: ${p.cantidad}`);
                const precioUni = p.detalles?.enDescuento ? p.precio * (1 - (p.detalles.porcentajeDescuento || 0) / 100) : p.precio;
                return { p, productoId: p.id, productoNombre: p.nombre, cantidad: d.cantidad, precioUni, subtotal: precioUni * d.cantidad };
            });
            detalles.forEach(d => { d.p.cantidad -= d.cantidad; delete d.p; });
            const pedido = {
                id: nextId(db.pedidos), clienteId: user.id, clienteNombre: user.nombre, estadoActual: 'PENDIENTE',
                total: detalles.reduce((a, d) => a + d.subtotal, 0), creadoAt: now(), detalles,
                historial: [{ estado: 'PENDIENTE', fecha: now(), nota: 'Creación inicial del pedido' }],
            };
            db.pedidos.push(pedido); save(db); return clone(pedido);
        }
        if (method === 'GET' && seg[1] === 'mis-pedidos') {
            const user = requireRole(db, 'CLIENTE');
            return clone(db.pedidos.filter(p => p.clienteId === user.id));
        }
        requireRole(db, 'ADMIN');
        if (method === 'GET' && !seg[1]) return clone(db.pedidos);
        if (method === 'GET' && seg[1] === 'cliente') return clone(db.pedidos.filter(p => p.clienteId === Number(seg[2])));
        const ped = db.pedidos.find(p => p.id === id) || fail(404, 'Pedido no encontrado');
        if (method === 'GET') return clone(ped);
        if (method === 'PATCH' && seg[2] === 'estado') {
            ped.estadoActual = body.estado;
            ped.historial.push({ estado: body.estado, fecha: now(), nota: body.nota || `Cambio de estado a ${body.estado}` });
            save(db); return clone(ped);
        }
        if (method === 'PUT') {
            ped.detalles = (body.detalles || []).map(d => {
                const p = db.productos.find(x => x.id === Number(d.productoId)) || fail(404, 'Producto no encontrado');
                return { productoId: p.id, productoNombre: p.nombre, cantidad: d.cantidad, precioUni: p.precio, subtotal: p.precio * d.cantidad };
            });
            ped.total = ped.detalles.reduce((a, d) => a + d.subtotal, 0);
            save(db); return clone(ped);
        }
    }

    // ---------- USUARIOS ----------
    if (seg[0] === 'usuarios') {
        requireRole(db, 'ADMIN');
        if (method === 'GET' && !seg[1]) return db.usuarios.map(publicUser);
        const u = db.usuarios.find(x => x.id === id) || fail(404, 'Usuario no encontrado');
        if (method === 'GET') return publicUser(u);
        if (method === 'PUT') {
            if (u.rol === 'CLIENTE' && !telefonoValido(body.telefono)) fail(400, 'Error de validación', { telefono: 'El teléfono es obligatorio para los clientes' });
            if (body.nombre) u.nombre = body.nombre;
            if (body.password) u.password = body.password;
            if (body.telefono !== undefined) u.telefono = body.telefono;
            save(db); return publicUser(u);
        }
        if (method === 'PATCH' && seg[2] === 'estado') {
            u.estado = params.get('estado') === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';
            save(db); return publicUser(u);
        }
    }

    fail(404, `Endpoint no disponible en modo demo: ${method} ${path}`);
}
