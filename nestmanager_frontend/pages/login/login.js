/**
 * login.js — NestManager Login Page
 *
 * Responsibilities:
 *  - Client-side form validation (empty fields, min length)
 *  - Toggle password visibility
 *  - Submit credentials to Spring Boot REST API  POST /api/auth/login
 *  - Handle API response  (store JWT token, redirect to dashboard)
 *  - Show loading state on the button
 *  - Show error / success alert messages
 */

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */
// Production
const API_BASE_URL = 'https://nestmanager.onrender.com';

// Local testing
//const API_BASE_URL = 'http://localhost:8080';   // Change to production URL when deploying
const LOGIN_ENDPOINT = `${API_BASE_URL}/api/auth/login`;
const DASHBOARD_URL  = '../dashboard/dashboard.html';

/* ------------------------------------------------------------------ */
/*  DOM References                                                      */
/* ------------------------------------------------------------------ */

const loginForm     = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const roleSelect    = document.getElementById('role');
const rememberMe    = document.getElementById('remember-me');
const loginBtn      = document.getElementById('login-btn');
const togglePassBtn = document.getElementById('toggle-pass');
const errorAlert    = document.getElementById('error-alert');
const errorMsg      = document.getElementById('error-msg');
const successAlert  = document.getElementById('success-alert');
const successMsg    = document.getElementById('success-msg');
const usernameError = document.getElementById('username-error');
const passwordError = document.getElementById('password-error');
const eyeShow       = document.querySelector('.eye-show');
const eyeHide       = document.querySelector('.eye-hide');

/* ------------------------------------------------------------------ */
/*  Password Visibility Toggle                                          */
/* ------------------------------------------------------------------ */

togglePassBtn.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  eyeShow.style.display = isPassword ? 'none'  : 'inline';
  eyeHide.style.display = isPassword ? 'inline': 'none';
  togglePassBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
});

/* ------------------------------------------------------------------ */
/*  Inline Validation Helpers                                           */
/* ------------------------------------------------------------------ */

/**
 * Show a field-level error message and mark the input as invalid.
 * @param {HTMLInputElement} input
 * @param {HTMLElement}      errorEl
 * @param {string}           message
 */
function showFieldError(input, errorEl, message) {
  input.classList.add('is-error');
  errorEl.textContent = message;
}

/**
 * Clear a field-level error.
 * @param {HTMLInputElement} input
 * @param {HTMLElement}      errorEl
 */
function clearFieldError(input, errorEl) {
  input.classList.remove('is-error');
  errorEl.textContent = '';
}

/**
 * Validate all fields.
 * Returns true if the form is valid, false otherwise.
 * @returns {boolean}
 */
function validateForm() {
  let valid = true;

  // Username — required, min 3 chars
  const username = usernameInput.value.trim();
  if (!username) {
    showFieldError(usernameInput, usernameError, 'Username is required.');
    valid = false;
  } else if (username.length < 3) {
    showFieldError(usernameInput, usernameError, 'Username must be at least 3 characters.');
    valid = false;
  } else {
    clearFieldError(usernameInput, usernameError);
  }

  // Password — required, min 6 chars
  const password = passwordInput.value;
  if (!password) {
    showFieldError(passwordInput, passwordError, 'Password is required.');
    valid = false;
  } else if (password.length < 6) {
    showFieldError(passwordInput, passwordError, 'Password must be at least 6 characters.');
    valid = false;
  } else {
    clearFieldError(passwordInput, passwordError);
  }

  return valid;
}

/* Clear field errors on input */
usernameInput.addEventListener('input', () => clearFieldError(usernameInput, usernameError));
passwordInput.addEventListener('input', () => clearFieldError(passwordInput, passwordError));

/* ------------------------------------------------------------------ */
/*  Alert Helpers                                                       */
/* ------------------------------------------------------------------ */

function showError(message) {
  successAlert.classList.remove('show');
  errorMsg.textContent = message;
  errorAlert.classList.add('show');
}

function showSuccess(message) {
  errorAlert.classList.remove('show');
  successMsg.textContent = message;
  successAlert.classList.add('show');
}

function hideAlerts() {
  errorAlert.classList.remove('show');
  successAlert.classList.remove('show');
}

/* ------------------------------------------------------------------ */
/*  Button State Helpers                                                */
/* ------------------------------------------------------------------ */

function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  loginBtn.classList.toggle('loading', isLoading);
}

/* ------------------------------------------------------------------ */
/*  Token Storage                                                       */
/* ------------------------------------------------------------------ */

/**
 * Persist the JWT token.
 * Uses localStorage if "Remember Me" is checked, sessionStorage otherwise.
 * @param {string} token
 */
function storeToken(token) {
  const storage = rememberMe.checked ? localStorage : sessionStorage;
  storage.setItem('nestmanager_token', token);
}

/**
 * Persist the logged-in user's role so other pages can check permissions.
 * @param {string} role
 */
function storeUserRole(role) {
  const storage = rememberMe.checked ? localStorage : sessionStorage;
  storage.setItem('nestmanager_role', role);
}

// /**
//  * Persist the logged-in user's name
//  * @param {string} username 
//  */

// function storeUsername(username) {
//     const storage = rememberMe.checked ? localStorage : sessionStorage;
//     storage.setItem('nestmanager_username', username);
// }

/* ------------------------------------------------------------------ */
/*  API Call — POST /api/auth/login                                     */
/* ------------------------------------------------------------------ */

/**
 * Sends login credentials to the Spring Boot backend.
 *
 * Expected request body (JSON):
 *   { "username": "string", "password": "string", "role": "ADMIN|MANAGER|STAFF" }
 *
 * Expected success response (JSON):
 *   { "token": "eyJ...", "role": "ADMIN", "username": "string" }
 *
 * Expected error response (JSON):
 *   { "message": "Invalid credentials" }   (HTTP 401)
 *
 * @param {string} username
 * @param {string} password
 * @param {string} role
 * @returns {Promise<{token: string, role: string, username: string}>}
 */
async function loginRequest(username, password, role) {
  const response = await fetch(LOGIN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, role }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Server returned 4xx / 5xx — throw the error message from backend
    throw new Error(data.message || 'Login failed. Please try again.');
  }

  return data;   // { token, role, username }
}

/* ------------------------------------------------------------------ */
/*  Form Submit Handler                                                 */
/* ------------------------------------------------------------------ */

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideAlerts();

  // 1. Client-side validation
  if (!validateForm()) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const role     = roleSelect.value;

  // 2. Show loading state
  setLoading(true);

  try {
    // 3. Call the Spring Boot login endpoint
    const data = await loginRequest(username, password, role);

    // 4. Store JWT token and role
    storeToken(data.token);
    storeUserRole(data.role);
    // storeUsername(data.username); 

    // 5. Show success and redirect
    showSuccess('Login successful! Redirecting to dashboard...');

    setTimeout(() => {
      window.location.href = DASHBOARD_URL;
    }, 1200);

  } catch (error) {
    // 6. Show error from the backend or network error
    if (error.name === 'TypeError') {
      // Network error — server unreachable
      showError('Cannot connect to the server. Please check your connection.');
    } else {
      showError(error.message);
    }
    setLoading(false);
  }
});
