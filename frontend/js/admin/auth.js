/* admin/auth.js – Login form logic and session checking */

window.auth = {
  async login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    const err = document.getElementById('login-error');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;margin:0;border-width:2px;border-top-color:#fff;"></span>';
    err.classList.remove('show');

    try {
      const res = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('adminToken', res.token);
      localStorage.setItem('adminUser', JSON.stringify(res.user));
      window.location.href = '/admin/dashboard.html';
    } catch (e) {
      err.textContent = e.message || 'Login failed';
      err.classList.add('show');
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  },

  logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/admin/login.html';
  },

  async verify() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin/login.html';
      return;
    }
    try {
      const res = await api.post('/api/auth/verify');
      if (!res.valid) throw new Error('Invalid token');
      
      // Update UI with user info if element exists
      const emailEl = document.getElementById('user-email');
      if (emailEl && res.user) {
        emailEl.textContent = res.user.email;
      }
    } catch (e) {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login.html';
    }
  }
};

// Auto-verify if we're on a protected page
if (window.location.pathname.includes('/admin/dashboard.html')) {
  auth.verify();
} else if (window.location.pathname.includes('/admin/login.html')) {
  // If already logged in, redirect to dashboard
  if (localStorage.getItem('adminToken')) {
    window.location.href = '/admin/dashboard.html';
  }
}
