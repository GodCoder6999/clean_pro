/* ═══════════════════════════════════════════════════════════
   CleanerPro AI — Intelligent Chat Assistant Widget
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  class CleanerProChat {
    constructor() {
      this.isOpen = false;
      this.messages = [];
      this.history = [];
      this.isTyping = false;
      this.unread = 0;
      this.createDOM();
      this.bindEvents();
      setTimeout(() => this.addWelcome(), 800);
    }

    /* ── DOM Creation ─────────────────────────────── */
    createDOM() {
      const c = document.createElement('div');
      c.id = 'cp-chat';
      c.innerHTML = `
        <button class="cp-fab" id="cp-fab" title="Chat with CleanerPro AI">
          <span class="cp-fab-icon" id="cp-fab-icon">🤖</span>
          <span class="cp-fab-close" id="cp-fab-close">✕</span>
          <span class="cp-fab-badge" id="cp-fab-badge"></span>
          <span class="cp-fab-pulse"></span>
        </button>
        <div class="cp-window" id="cp-window">
          <div class="cp-header">
            <div class="cp-header-left">
              <div class="cp-ai-avatar">🤖</div>
              <div><div class="cp-header-title">CleanerPro AI</div>
              <div class="cp-header-status"><span class="cp-dot-online"></span> Online • Llama 3.3</div></div>
            </div>
            <div class="cp-header-actions">
              <button class="cp-hdr-btn" onclick="cleanerProChat.reset()" title="New chat">🔄</button>
              <button class="cp-hdr-btn" onclick="cleanerProChat.toggle()" title="Minimize">—</button>
            </div>
          </div>
          <div class="cp-msgs" id="cp-msgs"></div>
          <div class="cp-chips" id="cp-chips"></div>
          <div class="cp-input-bar">
            <input type="text" class="cp-input" id="cp-input" placeholder="Ask me anything..." autocomplete="off" />
            <button class="cp-send" id="cp-send" title="Send">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
          <div class="cp-footer">Powered by CleanerPro AI • Llama 3.3 70B</div>
        </div>`;
      document.body.appendChild(c);
      this.el = c;
      this.fab = c.querySelector('#cp-fab');
      this.win = c.querySelector('#cp-window');
      this.msgsEl = c.querySelector('#cp-msgs');
      this.chipsEl = c.querySelector('#cp-chips');
      this.input = c.querySelector('#cp-input');
      this.sendBtn = c.querySelector('#cp-send');
      this.badge = c.querySelector('#cp-fab-badge');
    }

    bindEvents() {
      this.fab.addEventListener('click', () => this.toggle());
      this.sendBtn.addEventListener('click', () => this.handleSend());
      this.input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); }
      });
      window.addEventListener('hashchange', () => setTimeout(() => this.renderChips(), 400));
    }

    /* ── Toggle ───────────────────────────────────── */
    toggle() {
      this.isOpen = !this.isOpen;
      this.el.classList.toggle('open', this.isOpen);
      if (this.isOpen) {
        this.unread = 0;
        this.badge.style.display = 'none';
        setTimeout(() => this.input.focus(), 300);
        this.scrollDown();
      }
    }

    /* ── User ─────────────────────────────────────── */
    getUser() { return (typeof app !== 'undefined' && app.user) ? app.user : null; }

    /* ── Welcome ──────────────────────────────────── */
    addWelcome() {
      const u = this.getUser();
      let g;
      if (!u) {
        g = "Hello! 👋 I'm **CleanerPro AI**, your cleaning services assistant. I can tell you about our services, pricing, and how the platform works.\n\nAsk me anything or tap a suggestion below!";
      } else {
        const name = u.name.split(' ')[0];
        if (u.role === 'customer') g = `Hey ${name}! 👋 I'm your CleanerPro assistant. I can help you:\n- 🔍 Find workers nearby\n- 📅 Book cleaning services\n- 📋 Check your bookings\n- ❌ Cancel bookings\n\nWhat would you like to do?`;
        else if (u.role === 'worker') g = `Hi ${name}! 👋 I'm here to help you manage your work.\n- 📥 Check job requests\n- ✅ Accept or reject jobs\n- 🔄 Toggle your availability\n- 📊 View your job history\n\nHow can I help?`;
        else g = `Welcome back, ${name}! 👋 As an admin, I can help you with:\n- 📊 Platform statistics\n- ✅ Worker approvals\n- 📋 Booking management\n- 👥 User management\n\nWhat do you need?`;
      }
      this.pushMsg(g, 'assistant');
      this.renderChips();
    }

    /* ── Messages ─────────────────────────────────── */
    pushMsg(content, role) {
      this.messages.push({ role, content });
      this.history.push({ role, content });
      this.renderMsg(content, role);
      this.scrollDown();
      if (role === 'assistant' && !this.isOpen) {
        this.unread++;
        this.badge.textContent = this.unread;
        this.badge.style.display = 'flex';
      }
    }

    renderMsg(text, role) {
      const d = document.createElement('div');
      d.className = `cp-msg cp-msg-${role}`;
      const html = this.fmt(text);
      d.innerHTML = role === 'assistant'
        ? `<div class="cp-msg-ava">🤖</div><div class="cp-bubble">${html}</div>`
        : `<div class="cp-bubble">${html}</div>`;
      this.msgsEl.appendChild(d);
      requestAnimationFrame(() => d.classList.add('show'));
    }

    fmt(t) {
      return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>')
        .replace(/^- (.*?)(<br>|$)/gm, '<span class="cp-li">• $1</span>$2');
    }

    /* ── Typing Indicator ─────────────────────────── */
    showTyping() {
      this.isTyping = true;
      const d = document.createElement('div');
      d.className = 'cp-msg cp-msg-assistant cp-typing-wrap';
      d.id = 'cp-typing';
      d.innerHTML = `<div class="cp-msg-ava">🤖</div><div class="cp-bubble"><div class="cp-dots"><span></span><span></span><span></span></div></div>`;
      this.msgsEl.appendChild(d);
      requestAnimationFrame(() => d.classList.add('show'));
      this.scrollDown();
    }

    hideTyping() {
      this.isTyping = false;
      const e = document.getElementById('cp-typing');
      if (e) e.remove();
    }

    scrollDown() { setTimeout(() => { this.msgsEl.scrollTop = this.msgsEl.scrollHeight; }, 60); }

    /* ── Send ─────────────────────────────────────── */
    async handleSend() {
      const text = this.input.value.trim();
      if (!text || this.isTyping) return;
      this.input.value = '';
      this.pushMsg(text, 'user');
      this.showTyping();
      this.chipsEl.innerHTML = '';
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch('/api/ai/chat', {
          method: 'POST', headers,
          body: JSON.stringify({ message: text, history: this.history.slice(0, -1) })
        });
        const data = await res.json();
        this.hideTyping();
        if (data.error) this.pushMsg('Sorry, something went wrong: ' + data.error, 'assistant');
        else {
          this.pushMsg(data.response, 'assistant');
          if (data.actionPerformed && typeof app !== 'undefined') setTimeout(() => app.route(), 800);
        }
      } catch (err) {
        this.hideTyping();
        this.pushMsg("Sorry, I'm having trouble connecting. Please try again. 🔄", 'assistant');
      }
      this.renderChips();
    }

    /* ── Suggestion Chips ─────────────────────────── */
    renderChips() {
      const chips = this.getChips();
      this.chipsEl.innerHTML = chips.map(c =>
        `<button class="cp-chip" onclick="cleanerProChat.useChip('${c.replace(/'/g, "\\'")}')">${c}</button>`
      ).join('');
    }

    useChip(t) { this.input.value = t; this.handleSend(); }

    getChips() {
      const u = this.getUser();
      if (!u) return ['What services do you offer?', 'How does it work?', 'Pricing info', 'How to sign up?'];
      if (u.role === 'customer') return ['Show my bookings', 'Find a worker', 'Available services', 'Help me book'];
      if (u.role === 'worker') return ['My job requests', 'Toggle availability', 'Active jobs', 'Job history'];
      if (u.role === 'admin') return ['Platform stats', 'Pending approvals', 'All bookings', 'All users'];
      return [];
    }

    /* ── Reset ─────────────────────────────────────── */
    reset() {
      this.messages = [];
      this.history = [];
      this.msgsEl.innerHTML = '';
      this.addWelcome();
    }
  }

  /* ── Init ───────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.cleanerProChat = new CleanerProChat(); });
  } else {
    window.cleanerProChat = new CleanerProChat();
  }
})();
