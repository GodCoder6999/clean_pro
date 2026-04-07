/* ═══════════════════════════════════════════════════════════
   CleanerPro — Reusable UI Components
   ═══════════════════════════════════════════════════════════ */

const Components = {

  /* ── Toast System ─────────────────────────────────────── */
  toast(message, type = 'info') {
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.classList.add('closing');setTimeout(()=>this.parentElement.remove(),300)">✕</button>
    `;
    container.appendChild(el);
    setTimeout(() => { el.classList.add('closing'); setTimeout(() => el.remove(), 300); }, 4000);
  },

  /* ── Status Badge ─────────────────────────────────────── */
  statusBadge(status) {
    const cls = status.toLowerCase().replace(' ', '_');
    return `<span class="status-badge ${cls}">${status.replace('_', ' ')}</span>`;
  },

  /* ── Stars Display ────────────────────────────────────── */
  stars(rating, count = null) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let s = '<span class="stars">';
    s += '★'.repeat(full);
    if (half) s += '½';
    s += '☆'.repeat(empty);
    s += '</span>';
    if (count !== null) s += ` <span class="rating-value">${rating}</span> <span class="text-muted text-xs">(${count})</span>`;
    return s;
  },

  /* ── Stat Card ────────────────────────────────────────── */
  statCard(icon, value, label, color = 'blue') {
    return `
      <div class="stat-card">
        <div class="stat-card-header">
          <div class="stat-icon ${color}">${icon}</div>
        </div>
        <div class="stat-value gradient-text">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    `;
  },

  /* ── Service Card ─────────────────────────────────────── */
  serviceCard(service, showBook = true) {
    return `
      <div class="service-card" style="animation-delay:${service._delay || 0}s">
        <div class="service-icon">${service.icon || '🧹'}</div>
        <h3>${service.name}</h3>
        <p class="service-desc">${service.description || ''}</p>
        <div class="service-meta">
          <span class="service-price">₹${service.base_price}</span>
          <span class="service-duration">${service.duration_hours}h</span>
        </div>
        ${showBook ? `<button class="btn btn-primary btn-block" onclick="app.openBookingModal(${service.id})">Book Now</button>` : ''}
      </div>
    `;
  },

  /* ── Worker Card ──────────────────────────────────────── */
  workerCard(worker, showBook = true) {
    const avatarContent = worker.avatar && worker.avatar.startsWith('data:')
      ? `<img src="${worker.avatar}" alt="${worker.name}" class="worker-avatar-img">`
      : (worker.avatar || '👤');
    return `
      <div class="worker-card clickable-card" style="animation-delay:${worker._delay || 0}s" onclick="app.openWorkerDetail(${worker.id})">
        <div class="worker-avatar">
          ${avatarContent}
          ${worker.availability === 'online' ? '<div class="online-dot"></div>' : ''}
        </div>
        <h3>${worker.name}</h3>
        <div class="worker-spec">${worker.specialization || 'General'}</div>
        <div class="worker-rating">${this.stars(worker.rating || 0, worker.review_count || 0)}</div>
        <div class="worker-meta">
          <span>💰 ₹${worker.hourly_rate || 0}/hr</span>
          ${worker.distance !== null && worker.distance !== undefined ? `<span>📍 ${worker.distance.toFixed(1)} km</span>` : ''}
        </div>
        <div class="worker-card-hint">👆 Click to view profile</div>
        ${showBook ? `<button class="btn btn-primary btn-block" onclick="event.stopPropagation();app.openBookingModal(null, ${worker.id})">Book Worker</button>` : ''}
      </div>
    `;
  },

  /* ── Booking Card ─────────────────────────────────────── */
  bookingCard(booking, role) {
    const person = role === 'customer'
      ? { label: 'Worker', name: booking.worker_name || 'Unassigned' }
      : { label: 'Customer', name: booking.customer_name || 'Unknown' };

    let actions = '';
    if (role === 'customer') {
      if (['PENDING','ACCEPTED'].includes(booking.status))
        actions += `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();app.updateBooking(${booking.id},'CANCELLED')">Cancel</button>`;
      if (booking.status === 'COMPLETED')
        actions += `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();app.openReviewModal(${booking.id}, ${booking.worker_id})">Review</button>`;
      if (booking.status === 'COMPLETED')
        actions += `<button class="btn btn-success btn-sm" onclick="event.stopPropagation();app.openPaymentModal(${booking.id}, ${booking.total_price})">Pay</button>`;
    } else if (role === 'worker') {
      if (booking.status === 'PENDING') {
        actions += `<button class="btn btn-success btn-sm" onclick="event.stopPropagation();app.updateBooking(${booking.id},'ACCEPTED')">Accept</button>`;
        actions += `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();app.updateBooking(${booking.id},'REJECTED')">Reject</button>`;
      }
      if (booking.status === 'ACCEPTED')
        actions += `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();app.updateBooking(${booking.id},'IN_PROGRESS')">Start</button>`;
      if (booking.status === 'IN_PROGRESS')
        actions += `<button class="btn btn-success btn-sm" onclick="event.stopPropagation();app.updateBooking(${booking.id},'COMPLETED')">Complete</button>`;
    }

    return `
      <div class="booking-card clickable-card" onclick="app.openBookingDetail(${booking.id}, '${role}')">
        <div class="booking-card-header">
          <div>
            <h3>${booking.service_icon || '🧹'} ${booking.service_name}</h3>
            <span class="booking-id">Booking #${booking.id} · <span class="booking-click-hint">Click for details</span></span>
          </div>
          ${this.statusBadge(booking.status)}
        </div>
        <div class="booking-details">
          <div class="booking-detail"><div class="label">${person.label}</div><div class="value">${person.name}</div></div>
          <div class="booking-detail"><div class="label">Date</div><div class="value">${booking.scheduled_date || 'TBD'}</div></div>
          <div class="booking-detail"><div class="label">Time</div><div class="value">${booking.scheduled_time || 'TBD'}</div></div>
          <div class="booking-detail"><div class="label">Address</div><div class="value">${booking.address || 'N/A'}</div></div>
        </div>
        <div class="booking-card-footer">
          <span class="booking-price">₹${booking.total_price || 0}</span>
          <div class="booking-actions" onclick="event.stopPropagation()">${actions}</div>
        </div>
      </div>
    `;
  },

  /* ── Review Card ──────────────────────────────────────── */
  reviewCard(review) {
    return `
      <div class="review-card">
        <div class="review-header">
          <div class="review-avatar">${review.customer_avatar || '👤'}</div>
          <div class="review-info">
            <h4>${review.customer_name}</h4>
            <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
          </div>
          <div style="margin-left:auto">${this.stars(review.rating)}</div>
        </div>
        <p class="review-body">${review.comment || ''}</p>
      </div>
    `;
  },

  /* ── Notification Item ────────────────────────────────── */
  notifItem(n) {
    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
    const timeAgo = this.timeAgo(n.created_at);
    return `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" onclick="app.markNotifRead(${n.id})">
        <div class="notif-icon ${n.type}">${icons[n.type] || 'ℹ️'}</div>
        <div class="notif-content">
          <h4>${n.title}</h4>
          <p>${n.message}</p>
          <span class="notif-time">${timeAgo}</span>
        </div>
      </div>
    `;
  },

  /* ── Empty State ──────────────────────────────────────── */
  emptyState(icon, title, text) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <h3>${title}</h3>
        <p>${text}</p>
      </div>
    `;
  },

  /* ── Modal ────────────────────────────────────────────── */
  modal(title, bodyHtml, footerHtml = '') {
    return `
      <div class="modal-overlay" onclick="if(event.target===this)app.closeModal()">
        <div class="modal">
          <div class="modal-header">
            <h2>${title}</h2>
            <button class="modal-close" onclick="app.closeModal()">✕</button>
          </div>
          <div class="modal-body">${bodyHtml}</div>
          ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
        </div>
      </div>
    `;
  },

  /* ── Loading ──────────────────────────────────────────── */
  loading() {
    return `<div class="loading-overlay"><div class="spinner"></div><span>Loading...</span></div>`;
  },

  /* ── Location Picker Component ────────────────────────── */
  locationPicker(id, currentAddress = '', currentLat = '', currentLng = '') {
    return `
      <div class="location-picker" id="${id}">
        <div class="location-input-wrap">
          <div class="location-search-box">
            <span class="location-search-icon">📍</span>
            <input class="form-input location-autocomplete"
                   type="text" id="${id}-address"
                   placeholder="Type your address (e.g. Andheri, Mumbai)"
                   value="${currentAddress || ''}" autocomplete="off"
                   oninput="app.handleLocationAutocomplete('${id}', this.value)">
            <div class="autocomplete-dropdown" id="${id}-suggestions"></div>
          </div>
          <button type="button" class="btn btn-ghost location-detect-btn" onclick="app.detectCurrentLocation('${id}')">
            <span class="detect-icon">📡</span> Use Current Location
          </button>
        </div>
        <div class="location-coords">
          <input type="hidden" id="${id}-lat" value="${currentLat || ''}">
          <input type="hidden" id="${id}-lng" value="${currentLng || ''}">
          <span class="location-status" id="${id}-status">${currentAddress ? '✅ Location set' : ''}</span>
        </div>
        <div class="location-map-container" id="${id}-map" style="display:${currentLat ? 'block' : 'none'}"></div>
      </div>
    `;
  },

  /* ── Time Ago Helper ──────────────────────────────────── */
  timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }
};
