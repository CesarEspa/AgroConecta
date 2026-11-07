/**
 * 🌿 AgroConecta — Servicio API Centralizado
 * Centraliza todas las llamadas HTTP a la API backend
 * Maneja autenticación (JWT Bearer), errores globales y respuestas
 */

import { mockApiCall } from './mockApi.js';

const API_BASE = 'https://api-agroconecta-lwm4.onrender.com/api/v1';

/**
 * Modo de datos:
 *  - 'demo' → backend simulado en el navegador (mockApi.js). Funciona sin servidor.
 *  - 'api'  → backend real en API_BASE.
 *  - 'auto' → intenta el backend real y, si no responde, pasa a demo durante la sesión.
 * Se puede forzar desde la URL con ?modo=api | ?modo=demo (se recuerda en la sesión).
 */
const API_MODE = 'demo';
const API_TIMEOUT_MS = 6000;

const SESSION_KEYS = ['token', 'rol', 'email', 'nombre', 'clienteId'];

export function limpiarSesion() {
    SESSION_KEYS.forEach(k => localStorage.removeItem(k));
}

function modoActual() {
    try {
        const forzado = new URLSearchParams(location.search).get('modo');
        if (forzado === 'api' || forzado === 'demo') sessionStorage.setItem('agro_modo', forzado);
        return sessionStorage.getItem('agro_modo') || API_MODE;
    } catch {
        return API_MODE;
    }
}

export function esModoDemo() {
    return modoActual() === 'demo';
}

/**
 * Función central para hacer llamadas a la API
 * Inyecta automáticamente el token Bearer si existe
 * @param {string} endpoint - Ruta relativa (ej: /productos, /auth/login)
 * @param {object} options - Opciones fetch (method, body, headers, etc.)
 * @returns {Promise<object>} Respuesta parseada como JSON
 */
async function apiCall(endpoint, options = {}) {
    if (esModoDemo()) {
        try {
            return await mockApiCall(endpoint, options);
        } catch (error) {
            if (error.status === 401 && !endpoint.startsWith('/auth/')) {
                limpiarSesion();
                window.location.hash = '#/sesion';
            }
            throw error;
        }
    }

    try {
        return await realApiCall(endpoint, options);
    } catch (error) {
        // En modo 'auto', si el servidor no responde se continúa en demo
        if (modoActual() === 'auto' && !error.status) {
            console.warn('[API] Backend sin respuesta, se activa el modo demo.');
            sessionStorage.setItem('agro_modo', 'demo');
            return apiCall(endpoint, options);
        }
        throw error;
    }
}

async function realApiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    // Los endpoints públicos de auth NO deben enviar el token Bearer.
    // Si hubiera un token expirado en localStorage, el backend lo rechazaría con 401
    // antes de siquiera intentar el login/registro.
    const esEndpointPublico = endpoint.startsWith('/auth/');

    // Headers por defecto
    const headers = {
        'Content-Type': 'application/json',
        ...(!esEndpointPublico && token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
            signal: AbortSignal.timeout(API_TIMEOUT_MS)
        });

        // Manejar respuesta 401 (Token expirado o inválido)
        // Solo redirigir si NO estamos en un endpoint de autenticación,
        // ya que ahí un 401 significa credenciales incorrectas, no sesión expirada.
        if (response.status === 401 && !esEndpointPublico) {
            limpiarSesion();
            window.location.hash = '#/sesion';
            throw new Error('Sesión expirada. Inicia sesión nuevamente.');
        }

        // Intentar parsear como JSON
        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            // Si no es JSON válido, usar response vacío
            data = {};
        }

        // Si no es OK, lanzar error con el mensaje del backend
        if (!response.ok) {
            const error = new Error(data.message || `Error ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    } catch (error) {
        console.error(`[API ERROR] ${endpoint}:`, error);
        throw error;
    }
}

/**
 * 🔐 AUTENTICACIÓN
 */

export async function loginUser(email, password) {
    return apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

export async function registerUser(userData) {
    return apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
    });
}

export function logoutUser() {
    limpiarSesion();
    window.location.hash = '#/sesion';
}

export function guardarSesion(response) {
    localStorage.setItem('token', response.token);
    localStorage.setItem('rol', response.rol);
    localStorage.setItem('email', response.email);
    localStorage.setItem('nombre', response.nombre);
    // Leer clienteId del response (puede venir como 'id' o 'clienteId')
    const clienteId = response.clienteId || response.id;
    if (clienteId) {
        localStorage.setItem('clienteId', clienteId);
    }
}

export function obtenerRol() {
    return localStorage.getItem('rol') || null;
}

export function estaAutenticado() {
    return !!localStorage.getItem('token');
}
export async function getCategorias() {
    return apiCall('/categorias', { method: 'GET' });
}

/**
 * 📦 PRODUCTOS
 */

export async function getProductos(isAdmin = false) {
    const endpoint = isAdmin ? '/productos/admin' : '/productos';
    return apiCall(endpoint);
}

export async function getProductosPorPromocion() {
    return apiCall('/productos/promociones');
}

export async function getProductoPorId(id) {
    return apiCall(`/productos/${id}`);
}

export async function createProducto(productoData) {
    return apiCall('/productos', {
        method: 'POST',
        body: JSON.stringify(productoData)
    });
}

export async function updateProducto(id, productoData) {
    return apiCall(`/productos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productoData)
    });
}

export async function deleteProducto(id) {
    return apiCall(`/productos/${id}`, {
        method: 'DELETE'
    });
}

/**
 * 🗂️ CATEGORÍAS
 */



export async function getCategoriaPorId(id) {
    return apiCall(`/categorias/${id}`);
}

export async function createCategoria(categoriaNombre) {
    return apiCall('/categorias', {
        method: 'POST',
        body: JSON.stringify({ nombre: categoriaNombre })
    });
}

export async function updateCategoria(id, categoriaNombre) {
    return apiCall(`/categorias/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre: categoriaNombre })
    });
}

export async function deleteCategoria(id) {
    return apiCall(`/categorias/${id}`, {
        method: 'DELETE'
    });
}

/**
 * 🛒 PEDIDOS
 */

export async function createPedido(clienteId, detalles) {
    return apiCall('/pedidos', {
        method: 'POST',
        body: JSON.stringify({
            clienteId,
            estado: "PENDIENTE",
            detalles: detalles.map(d => ({
                productoId: d.productId,
                cantidad: d.cantidad
            }))
        })
    });
}

export async function getMisPedidos() {
    return apiCall('/pedidos/mis-pedidos');
}

export async function getPedidos() {
    return apiCall('/pedidos');
}

export async function getPedidoPorId(id) {
    return apiCall(`/pedidos/${id}`);
}

export async function getPedidosPorCliente(clienteId) {
    return apiCall(`/pedidos/cliente/${clienteId}`);
}

export async function updatePedido(id, detalles) {
    return apiCall(`/pedidos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ detalles })
    });
}

export async function cambiarEstadoPedido(id, estado, nota = '') {
    return apiCall(`/pedidos/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado, nota })
    });
}

/**
 * 👤 USUARIOS (ADMIN)
 */

export async function getUsuarios() {
    return apiCall('/usuarios');
}

export async function getUsuarioPorId(id) {
    return apiCall(`/usuarios/${id}`);
}

export async function updateUsuario(id, userData) {
    return apiCall(`/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
    });
}

export async function cambiarEstadoUsuario(id, estado) {
    return apiCall(`/usuarios/${id}/estado?estado=${estado}`, {
        method: 'PATCH'
    });
}

/**
 * 🛠️ UTILIDADES
 */

/**
 * Convierte un archivo a Base64
 * @param {File} file - Archivo del input type="file"
 * @returns {Promise<string>} Data URL en Base64
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Maneja errores de API de forma consistente
 * @param {Error} error - Error lanzado por apiCall
 * @returns {object} Objeto con status, message y fields
 */
export function manejarErrorAPI(error) {
    const result = {
        status: error.status || 500,
        message: error.message || 'Error desconocido',
        fields: null
    };

    if (error.data) {
        result.fields = error.data.fields || null;
    }

    return result;
}

export default {
    apiCall,
    // Auth
    loginUser,
    registerUser,
    logoutUser,
    guardarSesion,
    obtenerRol,
    estaAutenticado,
    // Productos
    getProductos,
    getProductosPorPromocion,
    getProductoPorId,
    createProducto,
    updateProducto,
    deleteProducto,
    // Categorías
    getCategorias,
    getCategoriaPorId,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    // Pedidos
    createPedido,
    getMisPedidos,
    getPedidos,
    getPedidoPorId,
    getPedidosPorCliente,
    updatePedido,
    cambiarEstadoPedido,
    // Usuarios
    getUsuarios,
    getUsuarioPorId,
    updateUsuario,
    cambiarEstadoUsuario,
    // Utilidades
    fileToBase64,
    manejarErrorAPI
};