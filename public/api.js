/* ═══════════════════════════════════════════════════════════
   API Client — wraps all fetch calls to the backend
   ═══════════════════════════════════════════════════════════ */

const API = {
  base: '/api',

  _token() {
    return localStorage.getItem('token');
  },

  async _request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this._token();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(this.base + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  /* ── Auth ─────────────────────────────── */
  login(email, password) {
    return this._request('POST', '/auth/login', { email, password });
  },
  register(data) {
    return this._request('POST', '/auth/register', data);
  },
  getMe() {
    return this._request('GET', '/auth/me');
  },

  /* ── Profile ─────────────────────────── */
  updateProfile(data) {
    return this._request('PUT', '/profile', data);
  },
  changePassword(currentPassword, newPassword) {
    return this._request('PUT', '/profile/password', { current_password: currentPassword, new_password: newPassword });
  },

  /* ── Services ─────────────────────────── */
  getServices() {
    return this._request('GET', '/services');
  },
  createService(data) {
    return this._request('POST', '/services', data);
  },

  /* ── Workers ──────────────────────────── */
  getNearbyWorkers(lat, lng, radius, query = '') {
    let url = `/workers/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    return this._request('GET', url);
  },
  searchAllWorkers(query = '') {
    let url = `/workers/nearby?lat=0&lng=0&radius=0`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    return this._request('GET', url);
  },
  toggleAvailability(availability) {
    return this._request('PUT', '/workers/availability', { availability });
  },
  getWorkerProfile(id) {
    return this._request('GET', `/workers/${id}`);
  },

  /* ── Bookings ─────────────────────────── */
  createBooking(data) {
    return this._request('POST', '/bookings', data);
  },
  getBookings(params = '') {
    return this._request('GET', '/bookings' + (params ? '?' + params : ''));
  },
  getBooking(id) {
    return this._request('GET', `/bookings/${id}`);
  },
  updateBookingStatus(id, status) {
    return this._request('PUT', `/bookings/${id}/status`, { status });
  },

  /* ── Payments ─────────────────────────── */
  processPayment(data) {
    return this._request('POST', '/payments', data);
  },
  getPayment(bookingId) {
    return this._request('GET', `/payments/booking/${bookingId}`);
  },

  /* ── Reviews ──────────────────────────── */
  createReview(data) {
    return this._request('POST', '/reviews', data);
  },
  getWorkerReviews(workerId) {
    return this._request('GET', `/reviews/worker/${workerId}`);
  },

  /* ── Notifications ────────────────────── */
  getNotifications() {
    return this._request('GET', '/notifications');
  },
  markRead(id) {
    return this._request('PUT', `/notifications/${id}/read`);
  },
  markAllRead() {
    return this._request('PUT', '/notifications/read-all');
  },

  /* ── Admin ────────────────────────────── */
  getStats() {
    return this._request('GET', '/admin/stats');
  },
  getUsers(role = '') {
    return this._request('GET', '/admin/users' + (role ? '?role=' + role : ''));
  },
  updateUserStatus(id, status) {
    return this._request('PUT', `/admin/users/${id}/status`, { status });
  },
  getAllBookings(params = '') {
    return this._request('GET', '/admin/bookings' + (params ? '?' + params : ''));
  }
};
