/* ═══════════════════════════════════════════════════════════
   CleanerPro — Main Application
   SPA Router + Page Renderers + Event Handlers
   ═══════════════════════════════════════════════════════════ */

class App {
  constructor() {
    this.user = null;
    this.notifications = [];
    this.notifOpen = false;
    this.modalEl = null;
    window.addEventListener('hashchange', () => this.route());
    this.init();
  }

  async init() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        this.user = await API.getMe();
        await this.loadNotifications();
      } catch {
        localStorage.removeItem('token');
        this.user = null;
      }
    }
    this.route();
  }

  navigate(hash) { window.location.hash = hash; }

  async route() {
    const hash = window.location.hash || '#/login';
    const path = hash.replace('#', '');

    if (!this.user && path !== '/login' && path !== '/register') {
      return this.navigate('#/login');
    }
    if (this.user && (path === '/login' || path === '/register')) {
      return this.navigate('#/dashboard');
    }

    const appEl = document.getElementById('app');

    switch (path) {
      case '/login': appEl.innerHTML = this.renderAuth('login'); break;
      case '/register': appEl.innerHTML = this.renderAuth('register'); break;
      case '/dashboard':
        if (this.user.role === 'customer') await this.renderCustomerDashboard();
        else if (this.user.role === 'worker') await this.renderWorkerDashboard();
        else await this.renderAdminOverview();
        break;
      case '/services': await this.renderServices(); break;
      case '/workers': await this.renderFindWorkers(); break;
      case '/bookings': await this.renderMyBookings(); break;
      case '/worker/requests': await this.renderJobRequests(); break;
      case '/worker/active': await this.renderActiveJobs(); break;
      case '/worker/history': await this.renderJobHistory(); break;
      case '/admin/overview': await this.renderAdminOverview(); break;
      case '/admin/approvals': await this.renderWorkerApprovals(); break;
      case '/admin/workers': await this.renderManageWorkers(); break;
      case '/admin/customers': await this.renderManageCustomers(); break;
      case '/admin/bookings': await this.renderAllBookings(); break;
      default: this.navigate('#/dashboard');
    }
  }

  /* ═══════════════ AUTH PAGES ═══════════════ */
  renderAuth(type) {
    const isLogin = type === 'login';
    return `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <span class="logo-icon">🧹</span>
          <h1>CleanerPro</h1>
          <p>${isLogin ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}</p>
        </div>
        <form id="auth-form" onsubmit="app.${isLogin ? 'handleLogin' : 'handleRegister'}(event)">
          ${!isLogin ? `
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input class="form-input" type="text" name="name" placeholder="John Doe" required>
          </div>` : ''}
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" name="email" placeholder="you@example.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" type="password" name="password" placeholder="••••••••" required minlength="6">
          </div>
          ${!isLogin ? `
          <div class="form-group">
            <label class="form-label">I am a...</label>
            <select class="form-select" name="role" id="reg-role" onchange="app.toggleWorkerFields()">
              <option value="customer">Customer</option>
              <option value="worker">Worker</option>
            </select>
          </div>
          <div id="worker-fields" style="display:none">
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input class="form-input" type="tel" name="phone" placeholder="555-0100">
            </div>
            <div class="form-group">
              <label class="form-label">Specialization</label>
              <input class="form-input" type="text" name="specialization" placeholder="e.g. House Cleaning">
            </div>
            <div class="form-group">
              <label class="form-label">Hourly Rate ($)</label>
              <input class="form-input" type="number" name="hourly_rate" placeholder="35" min="10">
            </div>
            <div class="form-group">
              <label class="form-label">Short Bio</label>
              <textarea class="form-textarea" name="bio" placeholder="Tell us about your experience..."></textarea>
            </div>
          </div>
          ` : ''}
          <button type="submit" class="btn btn-primary btn-lg btn-block" id="auth-submit">
            ${isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <div class="form-footer">
          ${isLogin
            ? `Don't have an account? <a onclick="app.navigate('#/register')">Sign Up</a>`
            : `Already have an account? <a onclick="app.navigate('#/login')">Sign In</a>`}
        </div>
      </div>
    </div>`;
  }

  toggleWorkerFields() {
    const role = document.getElementById('reg-role').value;
    document.getElementById('worker-fields').style.display = role === 'worker' ? 'block' : 'none';
  }

  async handleLogin(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const btn = document.getElementById('auth-submit');
      btn.disabled = true; btn.textContent = 'Signing in...';
      const data = await API.login(form.get('email'), form.get('password'));
      localStorage.setItem('token', data.token);
      this.user = data.user;
      await this.loadNotifications();
      Components.toast('Welcome back, ' + this.user.name + '!', 'success');
      this.navigate('#/dashboard');
    } catch (err) {
      Components.toast(err.message, 'error');
      const btn = document.getElementById('auth-submit');
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const body = Object.fromEntries(form.entries());
    if (body.hourly_rate) body.hourly_rate = +body.hourly_rate;
    try {
      const btn = document.getElementById('auth-submit');
      btn.disabled = true; btn.textContent = 'Creating account...';
      const data = await API.register(body);
      localStorage.setItem('token', data.token);
      this.user = data.user;
      await this.loadNotifications();
      if (body.role === 'worker') {
        Components.toast('Account created! Awaiting admin approval.', 'warning');
      } else {
        Components.toast('Account created! Welcome!', 'success');
      }
      this.navigate('#/dashboard');
    } catch (err) {
      Components.toast(err.message, 'error');
      const btn = document.getElementById('auth-submit');
      btn.disabled = false; btn.textContent = 'Create Account';
    }
  }

  logout() {
    localStorage.removeItem('token');
    this.user = null;
    this.notifications = [];
    this.navigate('#/login');
    Components.toast('Signed out successfully.', 'info');
  }

  /* ═══════════════ LAYOUT ═══════════════ */
  renderLayout(pageTitle, content) {
    const appEl = document.getElementById('app');
    const unread = this.notifications.filter(n => !n.is_read).length;
    appEl.innerHTML = `
    <div class="sidebar-backdrop" onclick="app.closeSidebar()"></div>
    <div class="layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand"><span class="brand-icon">🧹</span><h2>CleanerPro</h2></div>
        </div>
        <div class="sidebar-user">
          <div class="sidebar-avatar">${this.user.avatar || '👤'}</div>
          <div class="sidebar-user-info">
            <h4>${this.user.name}</h4>
            <span class="role-badge ${this.user.role}">${this.user.role}</span>
          </div>
        </div>
        <nav class="sidebar-nav">${this.renderNavItems()}</nav>
        <div class="sidebar-footer">
          <a class="nav-item logout" onclick="app.logout()">
            <span class="nav-icon">🚪</span> Sign Out
          </a>
        </div>
      </aside>
      <main class="main-content">
        <header class="main-header">
          <div style="display:flex;align-items:center;gap:1rem">
            <button class="mobile-toggle" onclick="app.openSidebar()">☰</button>
            <h1>${pageTitle}</h1>
          </div>
          <div class="header-actions">
            <div class="notif-wrapper" id="notif-wrapper">
              <button class="notif-btn" onclick="app.toggleNotifications()">
                🔔 ${unread > 0 ? `<span class="notif-badge">${unread > 9 ? '9+' : unread}</span>` : ''}
              </button>
            </div>
          </div>
        </header>
        <div class="page-content" id="page-content">${content}</div>
      </main>
    </div>`;
  }

  renderNavItems() {
    const r = this.user.role;
    const h = window.location.hash;
    const item = (hash, icon, label, badge = '') => {
      const active = h === hash ? 'active' : '';
      return `<a class="nav-item ${active}" onclick="app.navigate('${hash}')">
        <span class="nav-icon">${icon}</span>${label}${badge ? `<span class="badge-count">${badge}</span>` : ''}
      </a>`;
    };

    if (r === 'customer') return `
      <div class="nav-section-title">Main</div>
      ${item('#/dashboard','📊','Dashboard')}
      ${item('#/services','🧹','Services')}
      ${item('#/workers','👷','Find Workers')}
      ${item('#/bookings','📋','My Bookings')}`;

    if (r === 'worker') {
      const pending = this.user.status === 'pending';
      return `
      <div class="nav-section-title">Main</div>
      ${item('#/dashboard','📊','Dashboard')}
      ${!pending ? item('#/worker/requests','📥','Job Requests') : ''}
      ${!pending ? item('#/worker/active','🔧','Active Jobs') : ''}
      ${!pending ? item('#/worker/history','📜','Job History') : ''}`;
    }

    return `
      <div class="nav-section-title">Management</div>
      ${item('#/dashboard','📊','Overview')}
      ${item('#/admin/approvals','✅','Worker Approvals')}
      ${item('#/admin/workers','👷','Manage Workers')}
      ${item('#/admin/customers','👥','Manage Customers')}
      ${item('#/admin/bookings','📋','All Bookings')}`;
  }

  openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.querySelector('.sidebar-backdrop').classList.add('show');
  }
  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.querySelector('.sidebar-backdrop').classList.remove('show');
  }

  /* ═══════════════ NOTIFICATIONS ═══════════════ */
  async loadNotifications() {
    try { this.notifications = await API.getNotifications(); } catch { this.notifications = []; }
  }

  toggleNotifications() {
    this.notifOpen = !this.notifOpen;
    const wrapper = document.getElementById('notif-wrapper');
    const existing = wrapper.querySelector('.notif-dropdown');
    if (existing) { existing.remove(); this.notifOpen = false; return; }

    const unread = this.notifications.filter(n => !n.is_read);
    const items = this.notifications.slice(0, 20);
    const html = `
      <div class="notif-dropdown">
        <div class="notif-dropdown-header">
          <h3>Notifications ${unread.length > 0 ? `(${unread.length})` : ''}</h3>
          ${unread.length > 0 ? `<button onclick="app.markAllRead()">Mark all read</button>` : ''}
        </div>
        <div class="notif-dropdown-body">
          ${items.length ? items.map(n => Components.notifItem(n)).join('') : '<div class="notif-empty">No notifications yet</div>'}
        </div>
      </div>`;
    wrapper.insertAdjacentHTML('beforeend', html);

    const close = (e) => {
      if (!wrapper.contains(e.target)) {
        const dd = wrapper.querySelector('.notif-dropdown');
        if (dd) dd.remove();
        this.notifOpen = false;
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 10);
  }

  async markNotifRead(id) {
    try {
      await API.markRead(id);
      const n = this.notifications.find(x => x.id === id);
      if (n) n.is_read = 1;
      const item = document.querySelector(`.notif-item[data-id="${id}"]`);
      if (item) item.classList.remove('unread');
      this.updateNotifBadge();
    } catch {}
  }

  async markAllRead() {
    try {
      await API.markAllRead();
      this.notifications.forEach(n => n.is_read = 1);
      document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
      this.updateNotifBadge();
      const header = document.querySelector('.notif-dropdown-header');
      if (header) header.querySelector('button')?.remove();
    } catch {}
  }

  updateNotifBadge() {
    const unread = this.notifications.filter(n => !n.is_read).length;
    const btn = document.querySelector('.notif-btn');
    if (!btn) return;
    const badge = btn.querySelector('.notif-badge');
    if (unread > 0) {
      if (badge) badge.textContent = unread > 9 ? '9+' : unread;
      else btn.insertAdjacentHTML('beforeend', `<span class="notif-badge">${unread > 9 ? '9+' : unread}</span>`);
    } else if (badge) badge.remove();
  }

  /* ═══════════════ CUSTOMER PAGES ═══════════════ */
  async renderCustomerDashboard() {
    this.renderLayout('Dashboard', Components.loading());
    try {
      const bookings = await API.getBookings();
      const total = bookings.length;
      const active = bookings.filter(b => ['PENDING','ACCEPTED','IN_PROGRESS'].includes(b.status)).length;
      const completed = bookings.filter(b => b.status === 'COMPLETED').length;
      const spent = bookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + (b.total_price || 0), 0);

      const recent = bookings.slice(0, 5);
      document.getElementById('page-content').innerHTML = `
        <div class="stats-grid">
          ${Components.statCard('📋', total, 'Total Bookings', 'blue')}
          ${Components.statCard('⚡', active, 'Active Bookings', 'yellow')}
          ${Components.statCard('✅', completed, 'Completed', 'green')}
          ${Components.statCard('💰', '$' + spent, 'Total Spent', 'violet')}
        </div>
        <div class="section-header">
          <h2>Recent Bookings</h2>
          <button class="btn btn-ghost btn-sm" onclick="app.navigate('#/bookings')">View All →</button>
        </div>
        <div class="cards-grid" style="grid-template-columns:1fr">
          ${recent.length ? recent.map(b => Components.bookingCard(b, 'customer')).join('') : Components.emptyState('📋', 'No bookings yet', 'Browse services to make your first booking!')}
        </div>`;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async renderServices() {
    this.renderLayout('Services', Components.loading());
    try {
      const services = await API.getServices();
      services.forEach((s, i) => s._delay = i * 0.08);
      document.getElementById('page-content').innerHTML = `
        <p class="text-muted" style="margin-bottom:1.5rem">Browse our professional cleaning services and book the one that suits your needs.</p>
        <div class="cards-grid">${services.map(s => Components.serviceCard(s)).join('')}</div>`;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async renderFindWorkers() {
    this.renderLayout('Find Workers', Components.loading());
    const lat = this.user.latitude || 40.7150;
    const lng = this.user.longitude || -74.0080;
    try {
      const workers = await API.getNearbyWorkers(lat, lng, 50);
      workers.forEach((w, i) => w._delay = i * 0.08);
      document.getElementById('page-content').innerHTML = `
        <div class="filter-bar">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Latitude</label>
            <input class="form-input" type="number" step="0.0001" id="search-lat" value="${lat}">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Longitude</label>
            <input class="form-input" type="number" step="0.0001" id="search-lng" value="${lng}">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Radius (km)</label>
            <input class="form-input" type="number" id="search-radius" value="50" min="1" max="500">
          </div>
          <div class="form-group" style="margin-bottom:0;align-self:flex-end">
            <button class="btn btn-primary" onclick="app.searchWorkers()">🔍 Search</button>
          </div>
        </div>
        <div id="workers-grid" class="cards-grid">
          ${workers.length ? workers.map(w => Components.workerCard(w)).join('') : Components.emptyState('👷', 'No workers found', 'Try expanding your search radius.')}
        </div>`;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async searchWorkers() {
    const lat = document.getElementById('search-lat').value;
    const lng = document.getElementById('search-lng').value;
    const radius = document.getElementById('search-radius').value;
    const grid = document.getElementById('workers-grid');
    grid.innerHTML = Components.loading();
    try {
      const workers = await API.getNearbyWorkers(lat, lng, radius);
      workers.forEach((w, i) => w._delay = i * 0.08);
      grid.innerHTML = workers.length ? workers.map(w => Components.workerCard(w)).join('') : Components.emptyState('👷', 'No workers found', 'Try expanding your search radius.');
    } catch (e) { grid.innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async renderMyBookings() {
    this.renderLayout('My Bookings', Components.loading());
    try {
      const bookings = await API.getBookings();
      document.getElementById('page-content').innerHTML = `
        <div class="filter-bar">
          <select class="form-select" id="booking-filter" onchange="app.filterBookings()">
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div id="bookings-list" class="cards-grid" style="grid-template-columns:1fr">
          ${bookings.length ? bookings.map(b => Components.bookingCard(b, 'customer')).join('') : Components.emptyState('📋', 'No bookings', 'Browse services to create your first booking!')}
        </div>`;
      this._bookings = bookings;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  filterBookings() {
    const filter = document.getElementById('booking-filter').value;
    const list = document.getElementById('bookings-list');
    const filtered = filter ? this._bookings.filter(b => b.status === filter) : this._bookings;
    const role = this.user.role === 'admin' ? 'customer' : this.user.role;
    list.innerHTML = filtered.length ? filtered.map(b => Components.bookingCard(b, role)).join('') : Components.emptyState('📋', 'No bookings', 'No bookings match this filter.');
  }

  /* ═══════════════ WORKER PAGES ═══════════════ */
  async renderWorkerDashboard() {
    this.renderLayout('Dashboard', Components.loading());
    if (this.user.status === 'pending') {
      document.getElementById('page-content').innerHTML = Components.emptyState('⏳', 'Pending Approval', 'Your account is awaiting admin approval. You will be notified once approved.');
      return;
    }
    try {
      const bookings = await API.getBookings();
      const pending = bookings.filter(b => b.status === 'PENDING').length;
      const active = bookings.filter(b => ['ACCEPTED','IN_PROGRESS'].includes(b.status)).length;
      const completed = bookings.filter(b => b.status === 'COMPLETED').length;
      const earned = bookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + (b.total_price || 0), 0);
      const me = await API.getMe();

      document.getElementById('page-content').innerHTML = `
        <div class="availability-banner">
          <div class="availability-status">
            <div class="availability-dot ${me.availability === 'online' ? 'online' : ''}"></div>
            <span class="toggle-label">You are <strong>${me.availability === 'online' ? 'Online' : 'Offline'}</strong></span>
          </div>
          <div class="toggle-wrap">
            <label class="toggle">
              <input type="checkbox" ${me.availability === 'online' ? 'checked' : ''} onchange="app.toggleAvailability(this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="stats-grid">
          ${Components.statCard('📥', pending, 'Pending Requests', 'yellow')}
          ${Components.statCard('🔧', active, 'Active Jobs', 'blue')}
          ${Components.statCard('✅', completed, 'Completed', 'green')}
          ${Components.statCard('💰', '$' + earned, 'Total Earned', 'violet')}
        </div>
        <div class="section-header"><h2>Recent Activity</h2></div>
        <div class="cards-grid" style="grid-template-columns:1fr">
          ${bookings.slice(0, 5).map(b => Components.bookingCard(b, 'worker')).join('') || Components.emptyState('📋', 'No jobs yet', 'New job requests will appear here.')}
        </div>`;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async toggleAvailability(online) {
    try {
      await API.toggleAvailability(online ? 'online' : 'offline');
      this.user.availability = online ? 'online' : 'offline';
      const dot = document.querySelector('.availability-dot');
      const label = document.querySelector('.toggle-label');
      if (dot) dot.className = `availability-dot ${online ? 'online' : ''}`;
      if (label) label.innerHTML = `You are <strong>${online ? 'Online' : 'Offline'}</strong>`;
      Components.toast(`You are now ${online ? 'online' : 'offline'}`, 'success');
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  async renderJobRequests() {
    this.renderLayout('Job Requests', Components.loading());
    try {
      const bookings = await API.getBookings('status=PENDING');
      document.getElementById('page-content').innerHTML = `
        <div class="cards-grid" style="grid-template-columns:1fr">
          ${bookings.length ? bookings.map(b => Components.bookingCard(b, 'worker')).join('') : Components.emptyState('📥', 'No pending requests', 'You have no pending job requests right now.')}
        </div>`;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async renderActiveJobs() {
    this.renderLayout('Active Jobs', Components.loading());
    try {
      const accepted = await API.getBookings('status=ACCEPTED');
      const inProgress = await API.getBookings('status=IN_PROGRESS');
      const all = [...inProgress, ...accepted];
      document.getElementById('page-content').innerHTML = `
        <div class="cards-grid" style="grid-template-columns:1fr">
          ${all.length ? all.map(b => Components.bookingCard(b, 'worker')).join('') : Components.emptyState('🔧', 'No active jobs', 'Accept a job request to see it here.')}
        </div>`;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async renderJobHistory() {
    this.renderLayout('Job History', Components.loading());
    try {
      const bookings = await API.getBookings();
      const history = bookings.filter(b => ['COMPLETED','REJECTED','CANCELLED'].includes(b.status));
      document.getElementById('page-content').innerHTML = `
        <div class="cards-grid" style="grid-template-columns:1fr">
          ${history.length ? history.map(b => Components.bookingCard(b, 'worker')).join('') : Components.emptyState('📜', 'No history', 'Completed jobs will appear here.')}
        </div>`;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  /* ═══════════════ ADMIN PAGES ═══════════════ */
  async renderAdminOverview() {
    this.renderLayout('Platform Overview', Components.loading());
    try {
      const stats = await API.getStats();
      const maxCount = Math.max(...stats.bookingsByStatus.map(b => b.count), 1);
      const barColors = { PENDING: 'var(--warning)', ACCEPTED: 'var(--info)', IN_PROGRESS: 'var(--primary)', COMPLETED: 'var(--success)', REJECTED: 'var(--danger)', CANCELLED: 'var(--text-muted)' };

      document.getElementById('page-content').innerHTML = `
        <div class="stats-grid">
          ${Components.statCard('👥', stats.totalUsers, 'Total Users', 'blue')}
          ${Components.statCard('👷', stats.workers, 'Active Workers', 'green')}
          ${Components.statCard('⏳', stats.pendingWorkers, 'Pending Approvals', 'yellow')}
          ${Components.statCard('🛒', stats.customers, 'Customers', 'cyan')}
          ${Components.statCard('📋', stats.totalBookings, 'Total Bookings', 'violet')}
          ${Components.statCard('💰', '$' + stats.revenue.toFixed(0), 'Revenue', 'green')}
        </div>
        <div class="section-header"><h2>Bookings by Status</h2></div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:2rem">
          <div class="chart-bars">
            ${stats.bookingsByStatus.map(b => `
              <div class="chart-bar">
                <div class="chart-bar-value">${b.count}</div>
                <div class="chart-bar-fill" style="height:${(b.count / maxCount) * 100}%;background:${barColors[b.status] || 'var(--primary)'}"></div>
                <div class="chart-bar-label">${b.status.replace('_', ' ')}</div>
              </div>`).join('')}
          </div>
        </div>`;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async renderWorkerApprovals() {
    this.renderLayout('Worker Approvals', Components.loading());
    try {
      const users = await API.getUsers('worker');
      const pending = users.filter(u => u.status === 'pending');
      document.getElementById('page-content').innerHTML = pending.length ? `
        <div class="data-table-wrap"><table class="data-table">
          <thead><tr><th>Worker</th><th>Email</th><th>Specialization</th><th>Registered</th><th>Actions</th></tr></thead>
          <tbody>${pending.map(u => `
            <tr>
              <td><div class="table-user"><div class="table-avatar">👤</div><div class="table-user-info"><h4>${u.name}</h4></div></div></td>
              <td>${u.email}</td>
              <td>${u.specialization || 'N/A'}</td>
              <td>${new Date(u.created_at).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-success btn-sm" onclick="app.updateUserStatus(${u.id},'active')">Approve</button>
                <button class="btn btn-danger btn-sm" onclick="app.updateUserStatus(${u.id},'suspended')">Reject</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>` : Components.emptyState('✅', 'All clear', 'No pending worker approvals.');
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async renderManageWorkers() {
    this.renderLayout('Manage Workers', Components.loading());
    try {
      const users = await API.getUsers('worker');
      const active = users.filter(u => u.status !== 'pending');
      document.getElementById('page-content').innerHTML = active.length ? `
        <div class="data-table-wrap"><table class="data-table">
          <thead><tr><th>Worker</th><th>Email</th><th>Specialization</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${active.map(u => `
            <tr>
              <td><div class="table-user"><div class="table-avatar">👤</div><div class="table-user-info"><h4>${u.name}</h4><span>${u.phone || ''}</span></div></div></td>
              <td>${u.email}</td>
              <td>${u.specialization || 'N/A'}</td>
              <td>${Components.statusBadge(u.status)}</td>
              <td>
                ${u.status === 'active' ? `<button class="btn btn-danger btn-sm" onclick="app.updateUserStatus(${u.id},'suspended')">Suspend</button>` : ''}
                ${u.status === 'suspended' ? `<button class="btn btn-success btn-sm" onclick="app.updateUserStatus(${u.id},'active')">Activate</button>` : ''}
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>` : Components.emptyState('👷', 'No workers', 'No workers registered yet.');
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async renderManageCustomers() {
    this.renderLayout('Manage Customers', Components.loading());
    try {
      const users = await API.getUsers('customer');
      document.getElementById('page-content').innerHTML = users.length ? `
        <div class="data-table-wrap"><table class="data-table">
          <thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${users.map(u => `
            <tr>
              <td><div class="table-user"><div class="table-avatar">👤</div><div class="table-user-info"><h4>${u.name}</h4></div></div></td>
              <td>${u.email}</td>
              <td>${u.phone || 'N/A'}</td>
              <td>${Components.statusBadge(u.status)}</td>
              <td>
                ${u.status === 'active' ? `<button class="btn btn-danger btn-sm" onclick="app.updateUserStatus(${u.id},'inactive')">Deactivate</button>` : ''}
                ${u.status === 'inactive' ? `<button class="btn btn-success btn-sm" onclick="app.updateUserStatus(${u.id},'active')">Activate</button>` : ''}
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>` : Components.emptyState('👥', 'No customers', 'No customers registered yet.');
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async renderAllBookings() {
    this.renderLayout('All Bookings', Components.loading());
    try {
      const bookings = await API.getAllBookings();
      this._bookings = bookings;
      document.getElementById('page-content').innerHTML = `
        <div class="filter-bar">
          <select class="form-select" id="booking-filter" onchange="app.filterAdminBookings()">
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option><option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option><option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div id="bookings-list" class="data-table-wrap"><table class="data-table">
          <thead><tr><th>#</th><th>Service</th><th>Customer</th><th>Worker</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>${bookings.map(b => `
            <tr>
              <td>${b.id}</td>
              <td>${b.service_icon || '🧹'} ${b.service_name}</td>
              <td>${b.customer_name}</td>
              <td>${b.worker_name || 'Unassigned'}</td>
              <td>${b.scheduled_date || 'TBD'}</td>
              <td>$${b.total_price || 0}</td>
              <td>${Components.statusBadge(b.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>`;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  filterAdminBookings() {
    const filter = document.getElementById('booking-filter').value;
    const filtered = filter ? this._bookings.filter(b => b.status === filter) : this._bookings;
    document.getElementById('bookings-list').innerHTML = `<table class="data-table">
      <thead><tr><th>#</th><th>Service</th><th>Customer</th><th>Worker</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>${filtered.map(b => `
        <tr>
          <td>${b.id}</td>
          <td>${b.service_icon || '🧹'} ${b.service_name}</td>
          <td>${b.customer_name}</td>
          <td>${b.worker_name || 'Unassigned'}</td>
          <td>${b.scheduled_date || 'TBD'}</td>
          <td>$${b.total_price || 0}</td>
          <td>${Components.statusBadge(b.status)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  /* ═══════════════ ACTIONS ═══════════════ */
  async updateBooking(id, status) {
    try {
      await API.updateBookingStatus(id, status);
      Components.toast(`Booking ${status.toLowerCase().replace('_',' ')} successfully!`, 'success');
      await this.loadNotifications();
      this.route();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  async updateUserStatus(id, status) {
    try {
      await API.updateUserStatus(id, status);
      Components.toast(`User ${status} successfully!`, 'success');
      this.route();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  /* ═══════════════ MODALS ═══════════════ */
  async openBookingModal(serviceId = null, workerId = null) {
    try {
      const services = await API.getServices();
      const workers = await API.getNearbyWorkers(this.user.latitude || 40.715, this.user.longitude || -74.008, 100);
      const onlineWorkers = workers.filter(w => w.availability === 'online');

      const body = `
        <form id="booking-form" onsubmit="app.submitBooking(event)">
          <div class="form-group">
            <label class="form-label">Service</label>
            <select class="form-select" name="service_id" required onchange="app.updateBookingPrice()">
              <option value="">Select a service</option>
              ${services.map(s => `<option value="${s.id}" data-price="${s.base_price}" ${s.id == serviceId ? 'selected' : ''}>${s.icon} ${s.name} — $${s.base_price}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Worker</label>
            <select class="form-select" name="worker_id" required>
              <option value="">Select a worker</option>
              ${onlineWorkers.map(w => `<option value="${w.id}" ${w.id == workerId ? 'selected' : ''}>${w.name} — ${w.specialization} ($${w.hourly_rate}/hr)</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input class="form-input" type="date" name="scheduled_date" required min="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
              <label class="form-label">Time</label>
              <input class="form-input" type="time" name="scheduled_time" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Address</label>
            <input class="form-input" type="text" name="address" placeholder="Enter service address" required value="${this.user.address || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Notes (optional)</label>
            <textarea class="form-textarea" name="notes" placeholder="Any special instructions..."></textarea>
          </div>
          <div class="payment-summary">
            <div class="payment-summary-row"><span>Service Price</span><span id="booking-price">$0</span></div>
            <div class="payment-summary-row total"><span>Total</span><span id="booking-total">$0</span></div>
          </div>
        </form>`;

      const footer = `<button class="btn btn-ghost" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="document.getElementById('booking-form').requestSubmit()">Book Now</button>`;

      document.body.insertAdjacentHTML('beforeend', Components.modal('Book a Service', body, footer));
      this.updateBookingPrice();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  updateBookingPrice() {
    const sel = document.querySelector('[name="service_id"]');
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    const price = opt?.dataset?.price || 0;
    const el1 = document.getElementById('booking-price');
    const el2 = document.getElementById('booking-total');
    if (el1) el1.textContent = '$' + price;
    if (el2) el2.textContent = '$' + price;
  }

  async submitBooking(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const sel = document.querySelector('[name="service_id"]');
    const price = sel.options[sel.selectedIndex]?.dataset?.price || 0;
    try {
      await API.createBooking({
        service_id: +form.get('service_id'),
        worker_id: +form.get('worker_id'),
        scheduled_date: form.get('scheduled_date'),
        scheduled_time: form.get('scheduled_time'),
        address: form.get('address'),
        notes: form.get('notes'),
        total_price: +price
      });
      this.closeModal();
      Components.toast('Booking created successfully!', 'success');
      await this.loadNotifications();
      this.navigate('#/bookings');
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  openPaymentModal(bookingId, amount) {
    const body = `
      <form id="payment-form" onsubmit="app.submitPayment(event, ${bookingId}, ${amount})">
        <p class="text-muted" style="margin-bottom:1rem">Select a payment method to complete your payment.</p>
        <div class="payment-methods">
          <label class="payment-method selected" onclick="document.querySelectorAll('.payment-method').forEach(el=>el.classList.remove('selected'));this.classList.add('selected')">
            <input type="radio" name="method" value="Credit Card" checked>
            <span class="payment-method-icon">💳</span>
            <span>Credit Card</span>
          </label>
          <label class="payment-method" onclick="document.querySelectorAll('.payment-method').forEach(el=>el.classList.remove('selected'));this.classList.add('selected')">
            <input type="radio" name="method" value="Debit Card">
            <span class="payment-method-icon">🏦</span>
            <span>Debit Card</span>
          </label>
          <label class="payment-method" onclick="document.querySelectorAll('.payment-method').forEach(el=>el.classList.remove('selected'));this.classList.add('selected')">
            <input type="radio" name="method" value="PayPal">
            <span class="payment-method-icon">🅿️</span>
            <span>PayPal</span>
          </label>
        </div>
        <div class="payment-summary">
          <div class="payment-summary-row"><span>Service Charge</span><span>$${amount}</span></div>
          <div class="payment-summary-row"><span>Platform Fee</span><span>$0</span></div>
          <div class="payment-summary-row total"><span>Total</span><span>$${amount}</span></div>
        </div>
      </form>`;
    const footer = `<button class="btn btn-ghost" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-success" onclick="document.getElementById('payment-form').requestSubmit()">💳 Pay $${amount}</button>`;
    document.body.insertAdjacentHTML('beforeend', Components.modal('Process Payment', body, footer));
  }

  async submitPayment(e, bookingId, amount) {
    e.preventDefault();
    const method = new FormData(e.target).get('method');
    try {
      const result = await API.processPayment({ booking_id: bookingId, amount, method });
      this.closeModal();
      Components.toast(`Payment successful! Transaction: ${result.transaction_id}`, 'success');
      await this.loadNotifications();
      this.route();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  openReviewModal(bookingId, workerId) {
    const body = `
      <form id="review-form" onsubmit="app.submitReview(event, ${bookingId}, ${workerId})">
        <div class="form-group">
          <label class="form-label">Rating</label>
          <div class="star-rating-input">
            ${[5,4,3,2,1].map(i => `<input type="radio" name="rating" id="star${i}" value="${i}" ${i===5?'checked':''}><label for="star${i}">★</label>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Comment</label>
          <textarea class="form-textarea" name="comment" placeholder="Share your experience..." rows="4" required></textarea>
        </div>
      </form>`;
    const footer = `<button class="btn btn-ghost" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="document.getElementById('review-form').requestSubmit()">Submit Review</button>`;
    document.body.insertAdjacentHTML('beforeend', Components.modal('Leave a Review', body, footer));
  }

  async submitReview(e, bookingId, workerId) {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await API.createReview({ booking_id: bookingId, worker_id: workerId, rating: +form.get('rating'), comment: form.get('comment') });
      this.closeModal();
      Components.toast('Review submitted! Thank you!', 'success');
      await this.loadNotifications();
      this.route();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  closeModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
  }
}

/* ── Initialize ─────────────────────────────────────────── */
const app = new App();
