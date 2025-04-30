document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const guestBtn = document.getElementById('guestBtn');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const loginFormContainer = document.querySelector('.auth-form:first-of-type');
    const registerFormContainer = document.getElementById('registerFormContainer');

    // Toggle entre login/registro
    if (showRegister && showLogin) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginFormContainer.style.display = 'none';
            registerFormContainer.style.display = 'block';
        });

        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerFormContainer.style.display = 'block';
            loginFormContainer.style.display = 'none';
        });
    }

    // Modo invitado
    if (guestBtn) {
        guestBtn.addEventListener('click', () => {
            localStorage.setItem('token', 'guest');
            window.location.href = 'main.html';
        });
    }

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('loginUsername')?.value;
            const password = document.getElementById('loginPassword')?.value;

            if (!username || !password) {
                alert('Por favor completa todos los campos');
                return;
            }

            try {
                const response = await fetch('https://gatomadrid.onrender.com', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Error al iniciar sesión');
                }

                const data = await response.json();
                localStorage.setItem('token', data.token);
                window.location.href = 'main.html';

            } catch (err) {
                console.error('Error:', err);
                alert(err.message || 'Error al conectar con el servidor');
            }
        });
    }

    // Registro
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('regUsername')?.value;
            const email = document.getElementById('regEmail')?.value;
            const password = document.getElementById('regPassword')?.value;

            if (!username || !email || !password) {
                alert('Por favor completa todos los campos');
                return;
            }

            try {
                const response = await fetch('http://localhost:5000/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Error al registrarse');
                }

                const data = await response.json();
                localStorage.setItem('token', data.token);
                window.location.href = 'main.html';

            } catch (err) {
                console.error('Error:', err);
                alert(err.message || 'Error al conectar con el servidor');
            }
        });
    }
});
