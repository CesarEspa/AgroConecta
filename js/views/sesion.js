import { loginUser, registerUser, guardarSesion, obtenerRol, estaAutenticado, esModoDemo } from '../services/api.js';
import { DEMO_USERS } from '../services/mockApi.js';
import { refreshHeader } from '../main.js';

export function Sesion() {
    return `
        <section class="card card-sesion" id="authCard">

            <a href="#/" class="back-home" title="Volver al inicio">
                <i class="bi bi-arrow-left-circle-fill"></i>
            </a>

            <div class="card-bg">
                
                <div class="overlay-panel overlay-right">
                    <h3>Beneficios de tener tu cuenta</h3>
                    <ul class="benefits-list">
                        <li><i class="bi bi-gift"></i> Accede a tarifas especiales.</li>
                        <li><i class="bi bi-star-fill"></i> Guardar medios de pago y datos.</li>
                        <li><i class="bi bi-bookmark-heart"></i> Recomendaciones personalizadas.</li>
                    </ul>
                </div>

                
                <div class="overlay-panel overlay-left">
                    <h3>Crea tu cuenta, si aún no la tienes</h3>
                    <p>Vive una experiencia completa de compra:</p>
                    <ul class="benefits-list">
                        <li><i class="bi bi-receipt"></i> Revisa tus compras.</li>
                        <li><i class="bi bi-geo-alt"></i> Guardar tus direcciones de envío.</li>
                        <li><i class="bi bi-cart-check-fill"></i> Gestiona tu post venta.</li>
                    </ul>
                </div>
            </div>

            <div class="form signin active">
                <form id="loginForm">
                    <img src="assets/imgs/logo2.png" class="form-logo">
                    <h2>Iniciar sesión</h2>
                    <input type="email" id="loginEmail" placeholder="Correo electrónico" required>
                    <div class="password-wrapper" style="position: relative;">
                        <input type="password" id="loginPassword" placeholder="Contraseña" required style="padding-right: 40px;">
                        <i class="bi bi-eye-slash text-muted" id="togglePasswordLogin" style="position: absolute; right: 15px; top: 15px; cursor: pointer; font-size: 1.2rem; z-index: 10;"></i>
                        
                    </div>
                    <button type="submit" id="btn-login">INICIAR SESIÓN</button>
                    <p>¿No tienes cuenta? <em id="goToSignup">Registrarse</em></p>
                    ${esModoDemo() ? `
                    <div class="demo-access">
                        <span><i class="bi bi-lightning-charge-fill"></i> Modo demo · entra como</span>
                        <div class="demo-access-btns">
                            <button type="button" data-demo="cliente"><i class="bi bi-person"></i> Cliente</button>
                            <button type="button" data-demo="admin"><i class="bi bi-shield-lock"></i> Administrador</button>
                        </div>
                    </div>` : ''}
                </form>
            </div>

            <div class="form signup">
                <form id="signupForm" novalidate>
                    <h2>Registrarse</h2>
                    <div class="form-field">
                        <input type="text" id="nombre" placeholder="Nombre">
                        <span class="field-error" id="error-nombre"></span>
                    </div>
                    <input type="text" id="apellido" placeholder="Apellido (opcional)">
                    <div class="form-field">
                        <input type="tel" id="telefono" placeholder="Número de teléfono (ej: 3001234567)">
                        <span class="field-error" id="error-telefono"></span>
                    </div>
                    <div class="form-field">
                        <input type="text" id="email" placeholder="Correo electrónico">
                        <span class="field-error" id="error-email"></span>
                    </div>
                    <div class="form-field">
                        <div class="password-wrapper" style="position: relative;">
                            <input type="password" id="password" placeholder="Contraseña" style="padding-right: 40px;">
                            <i class="bi bi-eye-slash text-muted" id="togglePassword" style="position: absolute; right: 15px; top: 15px; cursor: pointer; font-size: 1.2rem; z-index: 10;"></i>
                            <div class="strength-meter">
                                <div id="strength-bar"></div>
                            </div>
                            <small id="strength-text">Seguridad de la contraseña</small>
                        </div>
                        <span class="field-error" id="error-password"></span>
                    </div>
                    <div class="form-field">
                        <div class="terms-wrapper">
                            <input type="checkbox" id="terms">
                            <label for="terms">
                                Acepto los <a href="Docs/terminos_y_condiciones_agroconecta.pdf" download>términos y condiciones</a> y el tratamiento de datos.
                            </label>
                        </div>
                        <span class="field-error" id="error-terms"></span>
                    </div>
                    <button type="submit" id="btn-registrar">REGISTRARSE</button>
                    <p>¿Ya tienes cuenta? <em id="goToSignin">Iniciar sesión</em></p>
                </form>
            </div>
        </section>
    `;
}

export function gestionSesion() {

    const card = document.getElementById("authCard");
    const btnSignup = document.getElementById("goToSignup");
    const btnSignin = document.getElementById("goToSignin");
    const formRegistro = document.getElementById("signupForm");
    const formLogin = document.getElementById("loginForm");
    const btnLogin = document.getElementById("btn-login");

    const termsCheckbox = document.getElementById("terms");

    const passwordInput = document.getElementById("password");
    const strengthBar = document.getElementById("strength-bar");
    const strengthText = document.getElementById("strength-text");
    const btnRegistrar = document.getElementById("btn-registrar");

    // Cambio de vista entre Login y Registro
    const toggleView = () => {
        card.classList.toggle("signup-mode");
    };

    const togglePassword = document.getElementById("togglePassword");
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('bi-eye');
            this.classList.toggle('bi-eye-slash');
        });
    }

    const togglePasswordLogin = document.getElementById("togglePasswordLogin");
    if (togglePasswordLogin && document.getElementById("loginPassword")) {
        togglePasswordLogin.addEventListener('click', function () {
            const type = document.getElementById("loginPassword").getAttribute('type') === 'password' ? 'text' : 'password';
            document.getElementById("loginPassword").setAttribute('type', type);
            this.classList.toggle('bi-eye');
            this.classList.toggle('bi-eye-slash');
        });
    }

    if (btnSignup) btnSignup.addEventListener("click", toggleView);
    if (btnSignin) btnSignin.addEventListener("click", toggleView);

    if (passwordInput) {
        passwordInput.addEventListener("input", () => {
            const val = passwordInput.value;
            let nivel = 0;

            if (val.length >= 8) nivel++;
            if (/[A-Z]/.test(val)) nivel++;
            if (/[0-9]/.test(val)) nivel++;

            strengthBar.className = "";

            if (val.length === 0) {
                strengthBar.style.width = "0%";
                strengthText.textContent = "Seguridad de la contraseña";
            } else if (nivel <= 1) {
                strengthBar.classList.add("weak");
                strengthText.textContent = "Débil: usa 8+ caracteres, mayúsculas y números";
            } else if (nivel === 2) {
                strengthBar.classList.add("medium");
                strengthText.textContent = "Media: casi segura";
            } else if (nivel === 3) {
                strengthBar.classList.add("strong");
                strengthText.textContent = "¡Contraseña Segura!";
            }
        });
    }

    // Reglas de validación
    const reglas = {
        nombre:   (v) => !v ? "El nombre es obligatorio" : v.length < 2 ? "Mínimo 2 caracteres" : !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(v) ? "Solo se permiten letras" : "",
        telefono: (v) => !v ? "El teléfono es obligatorio" : !/^[+]?[0-9]{7,15}$/.test(v) ? "Formato válido: solo dígitos (7-15) o +número" : "",
        email:    (v) => !v ? "El correo es obligatorio" : !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v) ? "Ingresa un correo válido (ejemplo@correo.com)" : "",
        password: (v) => !v ? "La contraseña es obligatoria" : v.length < 8 ? "Mínimo 8 caracteres" : !/[A-Z]/.test(v) ? "Debe tener al menos una mayúscula" : !/[a-z]/.test(v) ? "Debe tener letras minúsculas" : !/[0-9]/.test(v) ? "Debe tener al menos un número" : "",
    };

    const mostrarError = (id, mensaje) => {
        const span = document.getElementById(`error-${id}`);
        const input = document.getElementById(id);
        if (span) span.textContent = mensaje;
        if (input) {
            input.classList.toggle("input-invalid", !!mensaje);
            input.classList.toggle("input-valid", !mensaje && input.value.trim() !== "");
        }
    };

    // Validación en tiempo real
    ["nombre", "telefono", "email"].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener("blur", () => mostrarError(id, reglas[id](input.value.trim())));
            input.addEventListener("input", () => { if (input.classList.contains("input-invalid")) mostrarError(id, reglas[id](input.value.trim())); });
        }
    });

    if (passwordInput) {
        passwordInput.addEventListener("blur", () => mostrarError("password", reglas.password(passwordInput.value)));
    }

    // ==================== REGISTRO ====================
    formRegistro.addEventListener("submit", async (e) => {
        e.preventDefault();

        const campos = {
            nombre:   document.getElementById("nombre").value.trim(),
            telefono: document.getElementById("telefono").value.trim(),
            email:    document.getElementById("email").value.trim(),
            password: passwordInput.value,
        };

        // Validar campos requeridos
        let hayErrores = false;
        Object.entries(campos).forEach(([id, val]) => {
            const error = reglas[id](val);
            mostrarError(id, error);
            if (error) hayErrores = true;
        });

        // Validar términos
        if (!termsCheckbox.checked) {
            document.getElementById("error-terms").textContent = "Debes aceptar los términos para continuar";
            hayErrores = true;
        } else {
            document.getElementById("error-terms").textContent = "";
        }

        if (hayErrores) return;

        btnRegistrar.disabled = true;
        const originalText = btnRegistrar.innerHTML;
        btnRegistrar.innerHTML = "Registrando...";

        try {
            // Llamar a la API para registrar
            const response = await registerUser({
                nombre: campos.nombre,
                email: campos.email,
                password: campos.password,
                rol: "CLIENTE",
                telefono: campos.telefono
            });

            btnRegistrar.innerHTML = "REGISTRADO CON ÉXITO ✓";
            btnRegistrar.classList.add("btn-success-anim");

            setTimeout(() => {
                btnRegistrar.innerHTML = originalText;
                btnRegistrar.classList.remove("btn-success-anim");
                btnRegistrar.disabled = false;
                formRegistro.reset();
                ["nombre","apellido","telefono","email","password","terms"].forEach(id => {
                    const el = document.getElementById(`error-${id}`);
                    if (el) el.textContent = "";
                    const inp = document.getElementById(id);
                    if (inp) inp.classList.remove("input-invalid", "input-valid");
                });
                strengthBar.className = "";
                strengthBar.style.width = "0%";
                strengthText.textContent = "Seguridad de la contraseña";
                toggleView(); // Volver a login
            }, 2500);

        } catch (error) {
            btnRegistrar.disabled = false;
            btnRegistrar.innerHTML = originalText;
            
            // Manejo de errores desde el backend
            if (error.data?.fields?.email) {
                mostrarError("email", error.data.fields.email);
            } else if (error.data?.fields?.telefono) {
                mostrarError("telefono", error.data.fields.telefono);
            } else if (error.data?.message) {
                alert(`Error: ${error.data.message}`);
            } else {
                alert(`Error al registrarse: ${error.message}`);
            }
        }
    });

    // ==================== ACCESO DEMO ====================
    document.querySelectorAll("[data-demo]").forEach(btn => {
        btn.addEventListener("click", () => {
            const u = DEMO_USERS[btn.dataset.demo];
            document.getElementById("loginEmail").value = u.email;
            document.getElementById("loginPassword").value = u.password;
            formLogin.requestSubmit();
        });
    });

    // ==================== LOGIN ====================
    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("loginEmail").value.trim().toLowerCase();
            const password = document.getElementById("loginPassword").value;

            btnLogin.disabled = true;
            const originalText = btnLogin.innerHTML;
            btnLogin.innerHTML = "Iniciando sesión...";
            // Limpiar patrón viejo
            localStorage.removeItem("userLogged");

            try {
                // Llamar a la API para login
                const response = await loginUser(email, password);

                // Guardar sesión correctamente según la guía API
                guardarSesion(response);
                // ✅ ACTUALIZAR HEADER (y contador del carrito) INMEDIATAMENTE
                refreshHeader();

                // Redirigir según el rol
                if (response.rol === "ADMIN") {
                    window.location.hash = "#/panel";
                } else {
                    window.location.hash = "#/";
                }

            } catch (error) {
                btnLogin.disabled = false;
                btnLogin.innerHTML = originalText;

                if (error.status === 401) {
                    alert("Credenciales incorrectas. Verifica tu email y contraseña.");
                } else if (error.data?.message) {
                    alert(`Error: ${error.data.message}`);
                } else {
                    alert(`Error al iniciar sesión: ${error.message}`);
                }
            }
        });
    }
}