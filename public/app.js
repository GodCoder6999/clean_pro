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
    this._acTimeout = null;
    this._maps = {};
    this._searchAllIndia = false;
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
    const hash = window.location.hash || '#/';
    const path = hash.replace('#', '');
    const publicRoutes = ['/', '/login', '/register'];

    if (!this.user && !publicRoutes.includes(path)) return this.navigate('#/login');
    if (this.user && (path === '/login' || path === '/register' || path === '/')) return this.navigate('#/dashboard');

    const appEl = document.getElementById('app');

    switch (path) {
      case '/': appEl.innerHTML = this.renderLanding(); this.initLandingAnimations(); break;
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
      case '/profile': await this.renderProfile(); break;
      case '/worker/requests': await this.renderJobRequests(); break;
      case '/worker/active': await this.renderActiveJobs(); break;
      case '/worker/history': await this.renderJobHistory(); break;
      case '/admin/overview': await this.renderAdminOverview(); break;
      case '/admin/approvals': await this.renderWorkerApprovals(); break;
      case '/admin/workers': await this.renderManageWorkers(); break;
      case '/admin/customers': await this.renderManageCustomers(); break;
      case '/admin/bookings': await this.renderAllBookings(); break;
      case '/admin/services': await this.renderManageServices(); break;
      default: this.navigate('#/dashboard');
    }
  }

  /* ═══════════════ LANDING PAGE ═══════════════ */
  renderLanding() {
    return `
    <div class="landing-page">
      <nav class="landing-nav" id="landing-nav">
        <div class="landing-container nav-inner">
          <a class="nav-brand" onclick="app.navigate('#/')">
            <span class="nav-brand-icon">🧹</span>
            <span class="nav-brand-text">CleanerPro</span>
          </a>
          <div class="nav-links" id="nav-links">
            <a class="nav-link" href="#features-section">Features</a>
            <a class="nav-link" href="#how-section">How It Works</a>
            <a class="nav-link" href="#services-section">Services</a>
            <a class="nav-link" href="#pricing-section">Pricing</a>
            <a class="nav-link" href="#faq-section">FAQ</a>
          </div>
          <div class="nav-actions">
            <button class="btn btn-ghost btn-sm" onclick="app.navigate('#/login')">Sign In</button>
            <button class="btn btn-primary btn-sm" onclick="app.navigate('#/register')">Get Started</button>
            <button class="nav-mobile-btn" id="nav-mobile-btn" onclick="document.getElementById('nav-links').classList.toggle('show')">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </nav>
      <section class="hero-section">
        <div class="hero-particles">
          <div class="particle p1"></div><div class="particle p2"></div>
          <div class="particle p3"></div><div class="particle p4"></div><div class="particle p5"></div>
        </div>
        <div class="landing-container hero-inner">
          <div class="hero-content">
            <div class="hero-badge animate-on-scroll">✨ #1 Rated Cleaning Platform</div>
            <h1 class="hero-title animate-on-scroll">Professional Cleaning<span class="hero-gradient">Made Simple</span></h1>
            <p class="hero-subtitle animate-on-scroll">Connect with trusted, vetted cleaning professionals in your area. Book in seconds, track in real-time, and enjoy a sparkling clean space — every time.</p>
            <div class="hero-cta animate-on-scroll">
              <button class="btn btn-primary btn-lg hero-btn-primary" onclick="app.navigate('#/register')">🚀 Start Free Today</button>
              <button class="btn btn-ghost btn-lg hero-btn-secondary" onclick="document.getElementById('how-section').scrollIntoView({behavior:'smooth'})">▶ See How It Works</button>
            </div>
            <div class="hero-trust animate-on-scroll">
              <div class="hero-avatars">
                <div class="hero-avatar" style="background:linear-gradient(135deg,#3b82f6,#8b5cf6)">J</div>
                <div class="hero-avatar" style="background:linear-gradient(135deg,#10b981,#06b6d4)">M</div>
                <div class="hero-avatar" style="background:linear-gradient(135deg,#f59e0b,#ef4444)">S</div>
                <div class="hero-avatar" style="background:linear-gradient(135deg,#ec4899,#8b5cf6)">A</div>
              </div>
              <div class="hero-trust-text">
                <div class="hero-trust-stars">★★★★★</div>
                <span>Trusted by <strong>2,500+</strong> happy customers</span>
              </div>
            </div>
          </div>
          <div class="hero-visual animate-on-scroll">
            <div class="hero-card-stack">
              <div class="hero-float-card card-1"><div class="hfc-icon green">✅</div><div><strong>Booking Confirmed</strong><br><span class="text-sm text-muted">Deep Clean · 2:00 PM</span></div></div>
              <div class="hero-float-card card-2"><div class="hfc-icon blue">👷</div><div><strong>Sarah M.</strong><br><span class="text-sm text-muted">★★★★★ · 5.0 rating</span></div></div>
              <div class="hero-float-card card-3"><div class="hfc-icon violet">📍</div><div><strong>Worker Arriving</strong><br><span class="text-sm text-muted">ETA: 5 minutes</span></div></div>
              <div class="hero-phone-mockup">
                <div class="phone-header"><span class="phone-status-bar"></span><div class="phone-app-bar"><span class="phone-brand">🧹 CleanerPro</span><span class="phone-notif">🔔</span></div></div>
                <div class="phone-body">
                  <div class="phone-welcome">Welcome back! 👋</div>
                  <div class="phone-stat-row">
                    <div class="phone-stat"><span class="phone-stat-val">3</span><span class="phone-stat-lbl">Active</span></div>
                    <div class="phone-stat"><span class="phone-stat-val">12</span><span class="phone-stat-lbl">Completed</span></div>
                    <div class="phone-stat"><span class="phone-stat-val">4.9</span><span class="phone-stat-lbl">Rating</span></div>
                  </div>
                  <div class="phone-service-list">
                    <div class="phone-service-item"><span>🏠</span> House Cleaning</div>
                    <div class="phone-service-item"><span>🪟</span> Window Cleaning</div>
                    <div class="phone-service-item"><span>🧽</span> Deep Clean</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="hero-wave"><svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><path d="M0,60 C360,120 720,0 1080,60 C1260,90 1380,60 1440,60 L1440,120 L0,120 Z" fill="var(--bg-primary)"/></svg></div>
      </section>
      <section class="logos-section"><div class="landing-container"><p class="logos-label">Trusted by professionals and businesses worldwide</p><div class="logos-row"><div class="logo-item">🏢 PropertyMax</div><div class="logo-item">🏨 HotelGroup</div><div class="logo-item">🏠 HomeBliss</div><div class="logo-item">🏗️ UrbanNest</div><div class="logo-item">🏘️ ClearView</div></div></div></section>
      <section class="features-section" id="features-section"><div class="landing-container"><div class="section-label animate-on-scroll">Why CleanerPro</div><h2 class="section-title animate-on-scroll">Everything You Need in <span class="hero-gradient">One Platform</span></h2><p class="section-subtitle animate-on-scroll">A powerful marketplace connecting customers with professional cleaners.</p><div class="features-grid"><div class="feature-card animate-on-scroll"><div class="feature-icon-wrap blue"><span>🔍</span></div><h3>Smart Worker Discovery</h3><p>Find vetted professionals nearby using GPS-powered search.</p></div><div class="feature-card animate-on-scroll"><div class="feature-icon-wrap green"><span>📅</span></div><h3>Instant Booking</h3><p>Book services in seconds with our streamlined flow.</p></div><div class="feature-card animate-on-scroll"><div class="feature-icon-wrap violet"><span>📊</span></div><h3>Real-Time Tracking</h3><p>Track every booking from request to completion.</p></div><div class="feature-card animate-on-scroll"><div class="feature-icon-wrap yellow"><span>💳</span></div><h3>Secure Payments</h3><p>Multiple payment options, all encrypted and secure.</p></div><div class="feature-card animate-on-scroll"><div class="feature-icon-wrap cyan"><span>⭐</span></div><h3>Reviews & Ratings</h3><p>Make informed decisions with genuine customer reviews.</p></div><div class="feature-card animate-on-scroll"><div class="feature-icon-wrap red"><span>🔔</span></div><h3>Smart Notifications</h3><p>Never miss an update with real-time alerts.</p></div></div></div></section>
      <section class="how-section" id="how-section"><div class="landing-container"><div class="section-label animate-on-scroll">Simple Process</div><h2 class="section-title animate-on-scroll">How It Works in <span class="hero-gradient">3 Easy Steps</span></h2><p class="section-subtitle animate-on-scroll">Getting your space cleaned has never been this simple.</p><div class="steps-row"><div class="step-card animate-on-scroll"><div class="step-number">01</div><div class="step-icon">📝</div><h3>Create Your Account</h3><p>Sign up in seconds as a customer or cleaning professional.</p></div><div class="step-connector animate-on-scroll"><div class="step-line"></div><div class="step-arrow">→</div></div><div class="step-card animate-on-scroll"><div class="step-number">02</div><div class="step-icon">🔍</div><h3>Find & Book</h3><p>Browse services, find top-rated workers near you, and book instantly.</p></div><div class="step-connector animate-on-scroll"><div class="step-line"></div><div class="step-arrow">→</div></div><div class="step-card animate-on-scroll"><div class="step-number">03</div><div class="step-icon">✨</div><h3>Enjoy & Review</h3><p>Sit back while our professionals work their magic.</p></div></div></div></section>
      <section class="services-preview-section" id="services-section"><div class="landing-container"><div class="section-label animate-on-scroll">Our Services</div><h2 class="section-title animate-on-scroll">Professional Cleaning for <span class="hero-gradient">Every Need</span></h2><div class="services-preview-grid"><div class="service-preview-card animate-on-scroll"><div class="spc-icon">🏠</div><h3>House Cleaning</h3><p>Complete home cleaning including all rooms.</p><div class="spc-price">From <strong>₹1,500</strong></div></div><div class="service-preview-card animate-on-scroll"><div class="spc-icon">🧽</div><h3>Deep Cleaning</h3><p>Thorough top-to-bottom cleaning.</p><div class="spc-price">From <strong>₹3,500</strong></div></div><div class="service-preview-card animate-on-scroll"><div class="spc-icon">🪟</div><h3>Window Cleaning</h3><p>Crystal-clear windows inside and out.</p><div class="spc-price">From <strong>₹1,000</strong></div></div><div class="service-preview-card animate-on-scroll"><div class="spc-icon">🏢</div><h3>Office Cleaning</h3><p>Keep your workspace pristine.</p><div class="spc-price">From <strong>₹2,000</strong></div></div><div class="service-preview-card animate-on-scroll"><div class="spc-icon">🧹</div><h3>Move-In/Out Clean</h3><p>Bond-back guarantee.</p><div class="spc-price">From <strong>₹4,000</strong></div></div><div class="service-preview-card animate-on-scroll"><div class="spc-icon">🛋️</div><h3>Carpet & Upholstery</h3><p>Professional steam cleaning.</p><div class="spc-price">From <strong>₹1,200</strong></div></div></div><div style="text-align:center;margin-top:2.5rem" class="animate-on-scroll"><button class="btn btn-primary btn-lg" onclick="app.navigate('#/register')">Browse All Services →</button></div></div></section>
      <section class="landing-stats-section"><div class="landing-container"><div class="landing-stats-grid"><div class="landing-stat animate-on-scroll"><div class="landing-stat-value">2,500+</div><div class="landing-stat-label">Happy Customers</div></div><div class="landing-stat animate-on-scroll"><div class="landing-stat-value">500+</div><div class="landing-stat-label">Verified Workers</div></div><div class="landing-stat animate-on-scroll"><div class="landing-stat-value">10,000+</div><div class="landing-stat-label">Jobs Completed</div></div><div class="landing-stat animate-on-scroll"><div class="landing-stat-value">4.9★</div><div class="landing-stat-label">Average Rating</div></div></div></div></section>
      <section class="testimonials-section"><div class="landing-container"><div class="section-label animate-on-scroll">Testimonials</div><h2 class="section-title animate-on-scroll">What Our <span class="hero-gradient">Customers Say</span></h2><div class="testimonials-grid"><div class="testimonial-card animate-on-scroll"><div class="testimonial-stars">★★★★★</div><p class="testimonial-text">"CleanerPro completely transformed how I manage home cleaning. Booking is effortless!"</p><div class="testimonial-author"><div class="testimonial-avatar" style="background:linear-gradient(135deg,#3b82f6,#06b6d4)">J</div><div><strong>Jennifer Lee</strong><span>Homeowner · Mumbai</span></div></div></div><div class="testimonial-card animate-on-scroll"><div class="testimonial-stars">★★★★★</div><p class="testimonial-text">"As a cleaning professional, this platform has tripled my client base."</p><div class="testimonial-author"><div class="testimonial-avatar" style="background:linear-gradient(135deg,#10b981,#059669)">M</div><div><strong>Michael Torres</strong><span>Cleaning Professional · Bangalore</span></div></div></div><div class="testimonial-card animate-on-scroll"><div class="testimonial-stars">★★★★★</div><p class="testimonial-text">"We use CleanerPro for our entire hotel chain. Outstanding quality."</p><div class="testimonial-author"><div class="testimonial-avatar" style="background:linear-gradient(135deg,#8b5cf6,#ec4899)">S</div><div><strong>Sarah Chen</strong><span>Operations Manager · Delhi</span></div></div></div></div></div></section>
      <section class="workers-cta-section"><div class="landing-container"><div class="workers-cta-grid"><div class="workers-cta-content animate-on-scroll"><div class="section-label" style="text-align:left">For Professionals</div><h2 class="section-title" style="text-align:left">Grow Your Cleaning <span class="hero-gradient">Business</span></h2><p>Join thousands of cleaning professionals earning more with CleanerPro.</p><ul class="workers-cta-list"><li><span class="wcl-check">✓</span> Set your own schedule & hourly rate</li><li><span class="wcl-check">✓</span> Receive bookings directly</li><li><span class="wcl-check">✓</span> Secure, on-time payments</li><li><span class="wcl-check">✓</span> Build your reputation with reviews</li><li><span class="wcl-check">✓</span> Free to join</li></ul><button class="btn btn-primary btn-lg" onclick="app.navigate('#/register')" style="margin-top:1rem">Join as a Professional →</button></div><div class="workers-cta-visual animate-on-scroll"><div class="wcv-card"><div class="wcv-header"><div class="wcv-avatar">👷</div><div><strong>Your Dashboard</strong><span class="text-sm text-muted">Worker View</span></div><div class="wcv-online">● Online</div></div><div class="wcv-stats"><div class="wcv-stat"><span class="wcv-stat-val">₹32,000</span><span class="wcv-stat-lbl">This Month</span></div><div class="wcv-stat"><span class="wcv-stat-val">28</span><span class="wcv-stat-lbl">Jobs Done</span></div><div class="wcv-stat"><span class="wcv-stat-val">5.0★</span><span class="wcv-stat-lbl">Rating</span></div></div><div class="wcv-jobs"><div class="wcv-job"><span>🏠</span><div><strong>House Clean</strong><span>Today 2:00 PM · ₹1,500</span></div><span class="wcv-job-status accepted">Accepted</span></div><div class="wcv-job"><span>🧽</span><div><strong>Deep Clean</strong><span>Tomorrow 10 AM · ₹3,500</span></div><span class="wcv-job-status pending">Pending</span></div></div></div></div></div></div></section>
      <section class="pricing-section" id="pricing-section"><div class="landing-container"><div class="section-label animate-on-scroll">Pricing</div><h2 class="section-title animate-on-scroll">Simple, <span class="hero-gradient">Transparent</span> Pricing</h2><p class="section-subtitle animate-on-scroll">No hidden fees. No subscriptions.</p><div class="pricing-grid"><div class="pricing-card animate-on-scroll"><div class="pricing-card-header"><h3>Customer</h3><div class="pricing-price">Free</div><p>For homeowners & businesses</p></div><ul class="pricing-features"><li>✓ Browse all services & workers</li><li>✓ GPS-powered worker search</li><li>✓ Instant online booking</li><li>✓ Secure payment processing</li><li>✓ Review & rate workers</li></ul><button class="btn btn-primary btn-block btn-lg" onclick="app.navigate('#/register')">Sign Up Free</button></div><div class="pricing-card featured animate-on-scroll"><div class="pricing-popular">Most Popular</div><div class="pricing-card-header"><h3>Professional</h3><div class="pricing-price">Free</div><p>For cleaning professionals</p></div><ul class="pricing-features"><li>✓ Everything in Customer</li><li>✓ Create your professional profile</li><li>✓ Receive booking requests</li><li>✓ Set your own rates & schedule</li><li>✓ Earning insights & history</li></ul><button class="btn btn-primary btn-block btn-lg" onclick="app.navigate('#/register')">Join as Pro</button></div><div class="pricing-card animate-on-scroll"><div class="pricing-card-header"><h3>Enterprise</h3><div class="pricing-price">Custom</div><p>For large businesses</p></div><ul class="pricing-features"><li>✓ Everything in Professional</li><li>✓ Admin dashboard & analytics</li><li>✓ Worker approval workflow</li><li>✓ Revenue tracking & reports</li><li>✓ Priority support</li></ul><button class="btn btn-ghost btn-block btn-lg" onclick="app.navigate('#/register')">Contact Sales</button></div></div></div></section>
      <section class="faq-section" id="faq-section"><div class="landing-container"><div class="section-label animate-on-scroll">FAQ</div><h2 class="section-title animate-on-scroll">Frequently Asked <span class="hero-gradient">Questions</span></h2><div class="faq-grid"><div class="faq-item animate-on-scroll" onclick="this.classList.toggle('open')"><div class="faq-question">How does CleanerPro work? <span class="faq-toggle">+</span></div><div class="faq-answer">CleanerPro connects you with vetted cleaning professionals in your area. Simply create an account, browse available services, find a worker near you, book a convenient time, and pay securely.</div></div><div class="faq-item animate-on-scroll" onclick="this.classList.toggle('open')"><div class="faq-question">Is it really free to use? <span class="faq-toggle">+</span></div><div class="faq-answer">Yes! Creating an account and booking services is completely free for customers. You only pay for the cleaning services you book.</div></div><div class="faq-item animate-on-scroll" onclick="this.classList.toggle('open')"><div class="faq-question">How are cleaning professionals vetted? <span class="faq-toggle">+</span></div><div class="faq-answer">Every professional undergoes an admin approval process before they can start accepting jobs.</div></div><div class="faq-item animate-on-scroll" onclick="this.classList.toggle('open')"><div class="faq-question">What payment methods are supported? <span class="faq-toggle">+</span></div><div class="faq-answer">We support Credit Cards, Debit Cards, and PayPal. All transactions are encrypted and processed securely.</div></div><div class="faq-item animate-on-scroll" onclick="this.classList.toggle('open')"><div class="faq-question">Can I cancel or reschedule a booking? <span class="faq-toggle">+</span></div><div class="faq-answer">Yes, you can cancel any booking that is still in Pending or Accepted status directly from your dashboard.</div></div><div class="faq-item animate-on-scroll" onclick="this.classList.toggle('open')"><div class="faq-question">How do I become a cleaning professional? <span class="faq-toggle">+</span></div><div class="faq-answer">Simply register as a Worker, fill in your profile. Once an admin approves your account, you'll start receiving job requests.</div></div></div></div></section>
      <section class="final-cta-section"><div class="landing-container"><div class="final-cta animate-on-scroll"><h2>Ready to Experience <span class="hero-gradient">Effortless Cleaning?</span></h2><p>Join thousands of happy customers and professionals. Get started in under 30 seconds.</p><div class="final-cta-buttons"><button class="btn btn-primary btn-lg" onclick="app.navigate('#/register')">🚀 Create Free Account</button><button class="btn btn-ghost btn-lg" onclick="app.navigate('#/login')">Sign In →</button></div></div></div></section>
      <footer class="landing-footer"><div class="landing-container"><div class="footer-grid"><div class="footer-brand"><div class="nav-brand"><span class="nav-brand-icon">🧹</span><span class="nav-brand-text">CleanerPro</span></div><p>The modern platform for professional cleaning services.</p></div><div class="footer-col"><h4>Platform</h4><a href="#features-section">Features</a><a href="#how-section">How It Works</a><a href="#services-section">Services</a><a href="#pricing-section">Pricing</a></div><div class="footer-col"><h4>Company</h4><a href="#">About Us</a><a href="#">Careers</a><a href="#">Blog</a><a href="#">Contact</a></div><div class="footer-col"><h4>Legal</h4><a href="#">Privacy Policy</a><a href="#">Terms of Service</a><a href="#">Cookie Policy</a></div></div><div class="footer-bottom"><p>© 2024 CleanerPro. All rights reserved. Built with ❤️</p></div></div></footer>
    </div>`;
  }

  initLandingAnimations() {
    const nav = document.getElementById('landing-nav');
    const handleScroll = () => { if (window.scrollY > 60) nav.classList.add('scrolled'); else nav.classList.remove('scrolled'); };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    const observer = new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); }); }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    document.querySelectorAll('.landing-stat-value').forEach(el => {
      const target = el.textContent.trim();
      if (target.includes('.')) return;
      const match = target.match(/(\D*?)([\d,]+)(\D*)/);
      if (!match) return;
      const prefix = match[1], num = parseInt(match[2].replace(/,/g, '')), suffix = match[3];
      if (!num || num < 10) return;
      let current = 0; const step = Math.ceil(num / 60);
      const timer = setInterval(() => { current += step; if (current >= num) { current = num; clearInterval(timer); } el.textContent = prefix + current.toLocaleString() + suffix; }, 25);
    });
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
          ${!isLogin ? `<div class="form-group"><label class="form-label">Full Name</label><input class="form-input" type="text" name="name" placeholder="Rahul Sharma" required></div>` : ''}
          <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" name="email" placeholder="you@example.com" required></div>
          <div class="form-group"><label class="form-label">Password</label><input class="form-input" type="password" name="password" placeholder="••••••••" required minlength="6"></div>
          ${!isLogin ? `
          <div class="form-group">
            <label class="form-label">I am a...</label>
            <select class="form-select" name="role" id="reg-role" onchange="app.toggleWorkerFields()">
              <option value="customer">Customer</option>
              <option value="worker">Worker</option>
            </select>
          </div>
          <div id="worker-fields" style="display:none">
            <div class="form-group"><label class="form-label">Phone</label><input class="form-input" type="tel" name="phone" placeholder="+91 98765 43210"></div>
            <div class="form-group"><label class="form-label">Specialization</label><input class="form-input" type="text" name="specialization" placeholder="e.g. House Cleaning"></div>
            <div class="form-group"><label class="form-label">Hourly Rate (₹)</label><input class="form-input" type="number" name="hourly_rate" placeholder="500" min="50"></div>
            <div class="form-group"><label class="form-label">Short Bio</label><textarea class="form-textarea" name="bio" placeholder="Tell us about your experience..."></textarea></div>
          </div>
          <div class="form-group">
            <label class="form-label">📍 Your Location</label>
            <div class="location-search-box">
              <span class="location-search-icon">📍</span>
              <input class="form-input location-autocomplete" type="text" id="reg-address" name="address" placeholder="Type your address" autocomplete="off" oninput="app.handleLocationAutocomplete('reg', this.value)">
              <div class="autocomplete-dropdown" id="reg-suggestions"></div>
            </div>
            <input type="hidden" id="reg-lat" name="latitude">
            <input type="hidden" id="reg-lng" name="longitude">
            <div style="margin-top:.5rem">
              <button type="button" class="btn btn-ghost btn-sm" onclick="app.detectCurrentLocation('reg')">📡 Use Current Location</button>
              <span class="location-status" id="reg-status"></span>
            </div>
          </div>` : ''}
          <button type="submit" class="btn btn-primary btn-lg btn-block" id="auth-submit">${isLogin ? 'Sign In' : 'Create Account'}</button>
        </form>
        <div class="form-footer">
          ${isLogin ? `Don't have an account? <a onclick="app.navigate('#/register')">Sign Up</a>` : `Already have an account? <a onclick="app.navigate('#/login')">Sign In</a>`}
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
      if (body.role === 'worker') Components.toast('Account created! Awaiting admin approval.', 'warning');
      else Components.toast('Account created! Welcome!', 'success');
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
    this.navigate('#/');
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
        <div class="sidebar-user sidebar-user-clickable" onclick="app.navigate('#/profile')" title="Edit Profile">
          <div class="sidebar-avatar">${this.user.avatar && this.user.avatar.startsWith('data:') ? `<img src="${this.user.avatar}" alt="${this.user.name}">` : (this.user.avatar || '👤')}</div>
          <div class="sidebar-user-info">
            <h4>${this.user.name}</h4>
            <span class="role-badge ${this.user.role}">${this.user.role}</span>
          </div>
        </div>
        <nav class="sidebar-nav">${this.renderNavItems()}</nav>
        <div class="sidebar-footer">
          <a class="nav-item logout" onclick="app.logout()"><span class="nav-icon">🚪</span> Sign Out</a>
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
      <nav class="mobile-bottom-nav">${this.renderMobileNavItems()}</nav>
    </div>`;
  }

  renderMobileNavItems() {
    const r = this.user.role;
    const h = window.location.hash || '#/';
    const item = (hash, icon, label) => {
      const active = (h === hash || (h === '#/' && hash === '#/dashboard')) ? 'active' : '';
      return `<a class="mob-nav-item ${active}" onclick="app.navigate('${hash}')">
                <span class="mob-nav-icon">${icon}</span>
                <span class="mob-nav-label">${label}</span>
              </a>`;
    };

    if (r === 'customer') return `
      ${item('#/dashboard','📊','Home')}
      ${item('#/services','🧹','Services')}
      ${item('#/workers','👷','Workers')}
      ${item('#/bookings','📋','Bookings')}
      ${item('#/profile','👤','Account')}`;

    if (r === 'worker') {
      const pending = this.user.status === 'pending';
      return `
      ${item('#/dashboard','📊','Home')}
      ${!pending ? item('#/worker/requests','📥','Requests') : ''}
      ${!pending ? item('#/worker/active','🔧','Active') : ''}
      ${!pending ? item('#/worker/history','📜','History') : ''}
      ${item('#/profile','👤','Account')}`;
    }

    return `
      ${item('#/dashboard','📊','Overview')}
      ${item('#/admin/approvals','✅','Approvals')}
      ${item('#/admin/workers','👷','Workers')}
      ${item('#/admin/bookings','📋','Bookings')}
      ${item('#/profile','👤','Account')}`;
  }

  renderNavItems() {
    const r = this.user.role;
    const h = window.location.hash;
    const item = (hash, icon, label) => {
      const active = h === hash ? 'active' : '';
      return `<a class="nav-item ${active}" onclick="app.navigate('${hash}')"><span class="nav-icon">${icon}</span>${label}</a>`;
    };

    if (r === 'customer') return `
      <div class="nav-section-title">Main</div>
      ${item('#/dashboard','📊','Dashboard')}
      ${item('#/services','🧹','Services')}
      ${item('#/workers','👷','Find Workers')}
      ${item('#/bookings','📋','My Bookings')}
      <div class="nav-section-title">Account</div>
      ${item('#/profile','👤','My Profile')}`;

    if (r === 'worker') {
      const pending = this.user.status === 'pending';
      return `
      <div class="nav-section-title">Main</div>
      ${item('#/dashboard','📊','Dashboard')}
      ${!pending ? item('#/worker/requests','📥','Job Requests') : ''}
      ${!pending ? item('#/worker/active','🔧','Active Jobs') : ''}
      ${!pending ? item('#/worker/history','📜','Job History') : ''}
      <div class="nav-section-title">Account</div>
      ${item('#/profile','👤','My Profile')}`;
    }

    return `
      <div class="nav-section-title">Management</div>
      ${item('#/dashboard','📊','Overview')}
      ${item('#/admin/approvals','✅','Worker Approvals')}
      ${item('#/admin/workers','👷','Manage Workers')}
      ${item('#/admin/customers','👥','Manage Customers')}
      ${item('#/admin/bookings','📋','All Bookings')}
      ${item('#/admin/services','🧹','Manage Services')}`;
  }

  openSidebar() { document.getElementById('sidebar').classList.add('open'); document.querySelector('.sidebar-backdrop').classList.add('show'); }
  closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.querySelector('.sidebar-backdrop').classList.remove('show'); }

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

  /* ═══════════════ BOOKING DETAIL DRAWER ═══════════════ */
  async openBookingDetail(bookingId, role) {
    this._openDrawer('Loading...', `<div class="loading-overlay"><div class="spinner"></div><span>Loading details...</span></div>`);
    try {
      const booking = await API.getBooking(bookingId);
      let payment = null;
      try { payment = await API.getPayment(bookingId); } catch {}
      let review = null;
      if (booking.status === 'COMPLETED' && booking.worker_id) {
        try {
          const reviews = await API.getWorkerReviews(booking.worker_id);
          review = reviews.find(r => r.booking_id == bookingId) || null;
        } catch {}
      }
      const title = `${booking.service_icon || '🧹'} Booking #${booking.id}`;
      const content = this._renderBookingDetailContent(booking, payment, review, role);
      this._updateDrawer(title, content);
    } catch (e) {
      this._updateDrawer('Error', `<div class="empty-state"><div class="empty-icon">❌</div><h3>Failed to load</h3><p>${e.message}</p></div>`);
    }
  }

  _renderBookingDetailContent(booking, payment, review, role) {
    const statusColors = { PENDING: '#f59e0b', ACCEPTED: '#14b8a6', IN_PROGRESS: '#6366f1', COMPLETED: '#34d399', REJECTED: '#f87171', CANCELLED: '#94a3b8' };
    const statusColor = statusColors[booking.status] || '#6366f1';

    let actions = '';
    if (role === 'customer') {
      if (['PENDING','ACCEPTED'].includes(booking.status))
        actions += `<button class="btn btn-danger" onclick="app.updateBooking(${booking.id},'CANCELLED');app.closeDrawer()">❌ Cancel Booking</button>`;
      if (booking.status === 'COMPLETED' && !review)
        actions += `<button class="btn btn-primary" onclick="app.closeDrawer();app.openReviewModal(${booking.id}, ${booking.worker_id})">⭐ Leave Review</button>`;
      if (booking.status === 'COMPLETED' && !payment)
        actions += `<button class="btn btn-success" onclick="app.closeDrawer();app.openPaymentModal(${booking.id}, ${booking.total_price})">💳 Pay Now</button>`;
    } else if (role === 'worker') {
      if (booking.status === 'PENDING') {
        actions += `<button class="btn btn-success" onclick="app.updateBooking(${booking.id},'ACCEPTED');app.closeDrawer()">✅ Accept</button>`;
        actions += `<button class="btn btn-danger" onclick="app.updateBooking(${booking.id},'REJECTED');app.closeDrawer()">❌ Reject</button>`;
      }
      if (booking.status === 'ACCEPTED')
        actions += `<button class="btn btn-primary" onclick="app.updateBooking(${booking.id},'IN_PROGRESS');app.closeDrawer()">🔧 Start Job</button>`;
      if (booking.status === 'IN_PROGRESS')
        actions += `<button class="btn btn-success" onclick="app.updateBooking(${booking.id},'COMPLETED');app.closeDrawer()">✅ Mark Complete</button>`;
    } else if (role === 'admin') {
      actions += `<button class="btn btn-warning btn-sm" onclick="app.openAdminEditBookingModal(${booking.id})">✏️ Edit</button>`;
      if (!['COMPLETED','REJECTED','CANCELLED'].includes(booking.status))
        actions += `<button class="btn btn-danger btn-sm" onclick="app.adminCancelBooking(${booking.id})">❌ Cancel</button>`;
      actions += `<button class="btn btn-danger btn-sm" onclick="app.adminDeleteBooking(${booking.id})">🗑️ Delete</button>`;
    }

    const personLabel = role === 'customer' ? 'Worker' : role === 'worker' ? 'Customer' : 'Details';
    const personName = role === 'customer' ? (booking.worker_name || 'Unassigned') : (booking.customer_name || 'Unknown');
    const personAvatar = role === 'customer' ? booking.worker_avatar : booking.customer_avatar;

    return `
    <div class="booking-detail-drawer">
      <div class="bdd-status-banner" style="background:${statusColor}20;border-left:4px solid ${statusColor}">
        <div class="bdd-status-dot" style="background:${statusColor}"></div>
        <span style="color:${statusColor};font-weight:700;font-size:.95rem">${booking.status.replace('_',' ')}</span>
        <span class="bdd-booking-id" style="margin-left:auto;color:var(--text-muted);font-size:.8rem">Booking #${booking.id}</span>
      </div>
      <div class="bdd-section">
        <h3 class="bdd-section-title">🧹 Service Details</h3>
        <div class="bdd-card">
          <div class="bdd-row"><span class="bdd-label">Service</span><span class="bdd-value">${booking.service_icon || '🧹'} ${booking.service_name}</span></div>
          <div class="bdd-row"><span class="bdd-label">Date</span><span class="bdd-value">📅 ${booking.scheduled_date || 'Not set'}</span></div>
          <div class="bdd-row"><span class="bdd-label">Time</span><span class="bdd-value">🕐 ${booking.scheduled_time || 'Not set'}</span></div>
          <div class="bdd-row"><span class="bdd-label">Address</span><span class="bdd-value">📍 ${booking.address || 'N/A'}</span></div>
          ${booking.notes ? `<div class="bdd-row"><span class="bdd-label">Notes</span><span class="bdd-value">${booking.notes}</span></div>` : ''}
          <div class="bdd-row bdd-price-row"><span class="bdd-label">Total Amount</span><span class="bdd-price">₹${booking.total_price || 0}</span></div>
        </div>
      </div>
      ${role === 'admin' ? `
      <div class="bdd-section">
        <h3 class="bdd-section-title">👤 Customer</h3>
        <div class="bdd-card bdd-person-card">
          <div class="bdd-person-avatar">${booking.customer_avatar && booking.customer_avatar.startsWith('data:') ? `<img src="${booking.customer_avatar}" alt="">` : (booking.customer_avatar || '👤')}</div>
          <div class="bdd-person-info"><strong>${booking.customer_name || 'Unknown'}</strong></div>
        </div>
      </div>
      <div class="bdd-section">
        <h3 class="bdd-section-title">👷 Worker</h3>
        <div class="bdd-card bdd-person-card">
          <div class="bdd-person-avatar">${booking.worker_avatar && booking.worker_avatar.startsWith('data:') ? `<img src="${booking.worker_avatar}" alt="">` : (booking.worker_avatar || '👤')}</div>
          <div class="bdd-person-info"><strong>${booking.worker_name || 'Unassigned'}</strong></div>
        </div>
      </div>` : `
      <div class="bdd-section">
        <h3 class="bdd-section-title">👤 ${personLabel}</h3>
        <div class="bdd-card bdd-person-card">
          <div class="bdd-person-avatar">${personAvatar && personAvatar.startsWith('data:') ? `<img src="${personAvatar}" alt="">` : (personAvatar || '👤')}</div>
          <div class="bdd-person-info"><strong>${personName}</strong></div>
        </div>
      </div>`}
      <div class="bdd-section">
        <h3 class="bdd-section-title">💳 Payment</h3>
        <div class="bdd-card">
          ${payment ? `<div class="bdd-payment-success"><div class="bdd-payment-icon">✅</div><div class="bdd-payment-info"><strong>Payment Completed</strong><span>₹${payment.amount} via ${payment.method}</span><span class="bdd-txn">Transaction: ${payment.transaction_id}</span><span class="bdd-date">${new Date(payment.created_at).toLocaleString()}</span></div></div>` : booking.status === 'COMPLETED' ? `<div class="bdd-payment-pending"><div class="bdd-payment-icon">⏳</div><div class="bdd-payment-info"><strong>Payment Pending</strong><span>₹${booking.total_price || 0} due</span></div>${role === 'customer' ? `<button class="btn btn-success btn-sm" onclick="app.closeDrawer();app.openPaymentModal(${booking.id}, ${booking.total_price})">Pay Now</button>` : ''}</div>` : `<div class="bdd-payment-na"><span>💬 Payment will be processed upon completion</span></div>`}
        </div>
      </div>
      ${booking.status === 'COMPLETED' ? `
      <div class="bdd-section">
        <h3 class="bdd-section-title">⭐ Review</h3>
        <div class="bdd-card">
          ${review ? `<div class="bdd-review-content"><div class="bdd-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div><div class="bdd-review-meta"><strong>${role === 'worker' ? (review.customer_name || 'Customer') : 'Your Review'}</strong><span>${new Date(review.created_at).toLocaleDateString()}</span></div>${review.comment ? `<p class="bdd-review-text">"${review.comment}"</p>` : ''}</div>` : role === 'customer' ? `<div class="bdd-review-empty"><span>You haven't reviewed this job yet.</span><button class="btn btn-primary btn-sm" onclick="app.closeDrawer();app.openReviewModal(${booking.id}, ${booking.worker_id})">⭐ Leave Review</button></div>` : `<div class="bdd-review-empty"><span>No review submitted yet.</span></div>`}
        </div>
      </div>` : ''}
      <div class="bdd-section">
        <h3 class="bdd-section-title">📋 Timeline</h3>
        <div class="bdd-timeline">${this._renderTimeline(booking)}</div>
      </div>
      ${actions ? `<div class="bdd-actions">${actions}</div>` : ''}
    </div>`;
  }

  _renderTimeline(booking) {
    const statuses = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
    const terminalStatuses = ['REJECTED', 'CANCELLED'];
    const currentIdx = statuses.indexOf(booking.status);
    const isTerminal = terminalStatuses.includes(booking.status);
    const icons = { PENDING: '📝', ACCEPTED: '✅', IN_PROGRESS: '🔧', COMPLETED: '🎉', REJECTED: '❌', CANCELLED: '🚫' };
    const labels = { PENDING: 'Booking Requested', ACCEPTED: 'Accepted by Worker', IN_PROGRESS: 'Job In Progress', COMPLETED: 'Job Completed', REJECTED: 'Booking Rejected', CANCELLED: 'Booking Cancelled' };
    if (isTerminal) {
      return `<div class="timeline-item done"><div class="timeline-dot done">${icons.PENDING}</div><div class="timeline-content"><strong>${labels.PENDING}</strong><span>Booking was submitted</span></div></div>
        <div class="timeline-item error"><div class="timeline-dot error">${icons[booking.status]}</div><div class="timeline-content"><strong>${labels[booking.status]}</strong></div></div>`;
    }
    return statuses.map((s, i) => {
      const done = i <= currentIdx; const active = i === currentIdx;
      return `<div class="timeline-item ${done ? 'done' : ''} ${active ? 'active' : ''}">
        <div class="timeline-dot ${done ? 'done' : ''} ${active ? 'active' : ''}">${done ? icons[s] : (i + 1)}</div>
        <div class="timeline-content"><strong>${labels[s]}</strong>${active ? '<span class="timeline-current">Current Status</span>' : ''}</div>
      </div>`;
    }).join('');
  }

  /* ═══════════════ ADMIN BOOKING DETAIL ═══════════════ */
  async openAdminBookingDetail(bookingId) {
    this._openDrawer('Loading...', `<div class="loading-overlay"><div class="spinner"></div><span>Loading details...</span></div>`);
    try {
      const booking = await API.getBooking(bookingId);
      let payment = null;
      try { payment = await API.getPayment(bookingId); } catch {}
      let review = null;
      if (booking.status === 'COMPLETED' && booking.worker_id) {
        try {
          const reviews = await API.getWorkerReviews(booking.worker_id);
          review = reviews.find(r => r.booking_id == bookingId) || null;
        } catch {}
      }
      this._updateDrawer(`${booking.service_icon || '🧹'} Booking #${booking.id}`, this._renderBookingDetailContent(booking, payment, review, 'admin'));
    } catch (e) {
      this._updateDrawer('Error', `<div class="empty-state"><div class="empty-icon">❌</div><h3>Failed to load</h3><p>${e.message}</p></div>`);
    }
  }

  async adminCancelBooking(id) {
    if (!confirm('Cancel this booking?')) return;
    try {
      await API.updateBookingStatus(id, 'CANCELLED');
      Components.toast('Booking cancelled.', 'success');
      this.closeDrawer();
      this.route();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  async adminDeleteBooking(id) {
    if (!confirm('Permanently delete this booking and all related data? This cannot be undone.')) return;
    try {
      await API.deleteBooking(id);
      Components.toast('Booking deleted.', 'success');
      this.closeDrawer();
      this.route();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  async openAdminEditBookingModal(bookingId) {
    try {
      const booking = await API.getBooking(bookingId);
      const services = await API.getServices();
      const body = `
        <form id="admin-booking-form" onsubmit="app.submitAdminBookingEdit(event, ${bookingId})">
          <div class="form-group">
            <label class="form-label">Service</label>
            <select class="form-select" name="service_id">
              ${services.map(s => `<option value="${s.id}" ${s.id == booking.service_id ? 'selected' : ''}>${s.icon || '🧹'} ${s.name} — ₹${s.base_price}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" name="scheduled_date" value="${booking.scheduled_date || ''}"></div>
            <div class="form-group"><label class="form-label">Time</label><input class="form-input" type="time" name="scheduled_time" value="${booking.scheduled_time || ''}"></div>
          </div>
          <div class="form-group"><label class="form-label">Status</label>
            <select class="form-select" name="status">
              ${['PENDING','ACCEPTED','IN_PROGRESS','COMPLETED','REJECTED','CANCELLED'].map(s => `<option value="${s}" ${s === booking.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Address</label><input class="form-input" type="text" name="address" value="${booking.address || ''}"></div>
          <div class="form-group"><label class="form-label">Total Price (₹)</label><input class="form-input" type="number" name="total_price" value="${booking.total_price || 0}" min="0"></div>
          <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" name="notes">${booking.notes || ''}</textarea></div>
        </form>`;
      const footer = `<button class="btn btn-ghost" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="document.getElementById('admin-booking-form').requestSubmit()">💾 Save Changes</button>`;
      document.body.insertAdjacentHTML('beforeend', Components.modal('Edit Booking #' + bookingId, body, footer));
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  async submitAdminBookingEdit(e, bookingId) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form.entries());
    if (data.total_price) data.total_price = +data.total_price;
    try {
      await API.adminUpdateBooking(bookingId, data);
      this.closeModal();
      Components.toast('Booking updated!', 'success');
      this.closeDrawer();
      this.route();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  /* ═══════════════ WORKER DETAIL DRAWER ═══════════════ */
  async openWorkerDetail(workerId) {
    this._openDrawer('Loading...', `<div class="loading-overlay"><div class="spinner"></div><span>Loading worker profile...</span></div>`);
    try {
      const worker = await API.getWorkerProfile(workerId);
      const reviews = await API.getWorkerReviews(workerId);
      const title = `👷 ${worker.name}`;
      const content = `
      <div class="booking-detail-drawer">
        <div class="bdd-section">
          <div class="bdd-worker-profile-header">
            <div class="bdd-worker-big-avatar">
              ${worker.avatar && worker.avatar.startsWith('data:') ? `<img src="${worker.avatar}" alt="${worker.name}">` : (worker.avatar || '👤')}
              ${worker.availability === 'online' ? '<div class="online-dot-lg"></div>' : ''}
            </div>
            <div>
              <h2>${worker.name}</h2>
              <div class="worker-spec">${worker.specialization || 'General Cleaning'}</div>
              <div class="bdd-stars" style="font-size:1.1rem">${'★'.repeat(Math.round(worker.rating || 0))}${'☆'.repeat(5 - Math.round(worker.rating || 0))} <span style="font-size:.9rem;color:var(--text-muted)">(${worker.review_count || 0} reviews)</span></div>
            </div>
          </div>
        </div>
        <div class="bdd-section">
          <h3 class="bdd-section-title">📋 Details</h3>
          <div class="bdd-card">
            <div class="bdd-row"><span class="bdd-label">Hourly Rate</span><span class="bdd-price">₹${worker.hourly_rate || 0}/hr</span></div>
            <div class="bdd-row"><span class="bdd-label">Status</span><span class="bdd-value">${worker.availability === 'online' ? '🟢 Online' : '🔴 Offline'}</span></div>
            ${worker.bio ? `<div class="bdd-row" style="flex-direction:column;gap:.25rem"><span class="bdd-label">Bio</span><span class="bdd-value" style="font-size:.88rem">${worker.bio}</span></div>` : ''}
          </div>
        </div>
        ${reviews.length ? `<div class="bdd-section"><h3 class="bdd-section-title">⭐ Recent Reviews</h3>${reviews.slice(0, 5).map(r => `<div class="bdd-card" style="margin-bottom:.75rem"><div class="bdd-review-content"><div class="bdd-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div><div class="bdd-review-meta"><strong>${r.customer_name || 'Customer'}</strong><span>${new Date(r.created_at).toLocaleDateString()}</span></div>${r.comment ? `<p class="bdd-review-text">"${r.comment}"</p>` : ''}</div></div>`).join('')}</div>` : ''}
        ${this.user.role === 'customer' ? `<div class="bdd-actions"><button class="btn btn-primary" onclick="app.closeDrawer();app.openBookingModal(null, ${worker.id})">📅 Book This Worker</button></div>` : ''}
      </div>`;
      this._updateDrawer(title, content);
    } catch (e) {
      this._updateDrawer('Error', `<div class="empty-state"><div class="empty-icon">❌</div><h3>Failed to load</h3><p>${e.message}</p></div>`);
    }
  }

  /* ═══════════════ USER DETAIL DRAWER (ADMIN) ═══════════════ */
  async openUserDetail(userId, role) {
    this._openDrawer('Loading...', `<div class="loading-overlay"><div class="spinner"></div><span>Loading user...</span></div>`);
    try {
      const user = await API.getAdminUser(userId);
      if (!user) throw new Error('User not found');

      let bookingsHtml = '';
      if (role === 'worker') {
        try {
          const allBookings = await API.getAllBookings();
          const workerBookings = allBookings.filter(b => b.worker_id == userId);
          const completed = workerBookings.filter(b => b.status === 'COMPLETED').length;
          const revenue = workerBookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + (b.total_price || 0), 0);
          const reviews = await API.getWorkerReviews(userId);
          const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 'N/A';
          bookingsHtml = `
          <div class="bdd-section">
            <h3 class="bdd-section-title">📊 Performance</h3>
            <div class="bdd-stats-mini">
              <div class="bdd-stat-mini"><span class="bdd-stat-val">${workerBookings.length}</span><span class="bdd-stat-lbl">Total Jobs</span></div>
              <div class="bdd-stat-mini"><span class="bdd-stat-val">${completed}</span><span class="bdd-stat-lbl">Completed</span></div>
              <div class="bdd-stat-mini"><span class="bdd-stat-val">₹${revenue}</span><span class="bdd-stat-lbl">Revenue</span></div>
              <div class="bdd-stat-mini"><span class="bdd-stat-val">${avgRating}★</span><span class="bdd-stat-lbl">Avg Rating</span></div>
            </div>
          </div>
          ${reviews.length ? `<div class="bdd-section"><h3 class="bdd-section-title">⭐ Recent Reviews</h3>${reviews.slice(0,3).map(r => `<div class="bdd-card" style="margin-bottom:.75rem"><div class="bdd-review-content"><div class="bdd-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><div class="bdd-review-meta"><strong>${r.customer_name||'Customer'}</strong><span>${new Date(r.created_at).toLocaleDateString()}</span></div>${r.comment?`<p class="bdd-review-text">"${r.comment}"</p>`:''}</div></div>`).join('')}</div>` : ''}`;
        } catch {}
      } else if (role === 'customer') {
        try {
          const allBookings = await API.getAllBookings();
          const custBookings = allBookings.filter(b => b.customer_id == userId);
          const spent = custBookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + (b.total_price || 0), 0);
          bookingsHtml = `<div class="bdd-section"><h3 class="bdd-section-title">📊 Activity</h3><div class="bdd-stats-mini"><div class="bdd-stat-mini"><span class="bdd-stat-val">${custBookings.length}</span><span class="bdd-stat-lbl">Total Bookings</span></div><div class="bdd-stat-mini"><span class="bdd-stat-val">${custBookings.filter(b=>b.status==='COMPLETED').length}</span><span class="bdd-stat-lbl">Completed</span></div><div class="bdd-stat-mini"><span class="bdd-stat-val">₹${spent}</span><span class="bdd-stat-lbl">Total Spent</span></div></div></div>`;
        } catch {}
      }

      const title = `${role === 'worker' ? '👷' : '👤'} ${user.name}`;
      const content = `
      <div class="booking-detail-drawer">
        <div class="bdd-section">
          <div class="bdd-card">
            <div class="bdd-row"><span class="bdd-label">Name</span><span class="bdd-value">${user.name}</span></div>
            <div class="bdd-row"><span class="bdd-label">Email</span><span class="bdd-value">${user.email}</span></div>
            <div class="bdd-row"><span class="bdd-label">Phone</span><span class="bdd-value">${user.phone || 'N/A'}</span></div>
            <div class="bdd-row"><span class="bdd-label">Status</span><span class="bdd-value">${Components.statusBadge(user.status)}</span></div>
            ${role === 'worker' ? `<div class="bdd-row"><span class="bdd-label">Specialization</span><span class="bdd-value">${user.specialization || 'N/A'}</span></div><div class="bdd-row"><span class="bdd-label">Hourly Rate</span><span class="bdd-value">₹${user.hourly_rate || 'N/A'}</span></div><div class="bdd-row"><span class="bdd-label">Availability</span><span class="bdd-value">${user.availability === 'online' ? '🟢 Online' : '🔴 Offline'}</span></div>` : ''}
            <div class="bdd-row"><span class="bdd-label">Joined</span><span class="bdd-value">${new Date(user.created_at).toLocaleDateString()}</span></div>
          </div>
        </div>
        ${bookingsHtml}
        <div class="bdd-actions">
          <button class="btn btn-warning btn-sm" onclick="app.openAdminEditUserModal(${user.id}, '${role}')">✏️ Edit User</button>
          ${user.status === 'active' ? `<button class="btn btn-danger btn-sm" onclick="app.updateUserStatus(${user.id},'suspended')">🚫 Suspend</button>` : ''}
          ${user.status === 'suspended' ? `<button class="btn btn-success btn-sm" onclick="app.updateUserStatus(${user.id},'active')">✅ Activate</button>` : ''}
          ${user.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="app.updateUserStatus(${user.id},'active')">✅ Approve</button><button class="btn btn-danger btn-sm" onclick="app.updateUserStatus(${user.id},'suspended')">❌ Reject</button>` : ''}
          ${user.status === 'inactive' ? `<button class="btn btn-success btn-sm" onclick="app.updateUserStatus(${user.id},'active')">✅ Activate</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="app.deleteUser(${user.id}, '${user.name}')">🗑️ Delete Account</button>
        </div>
      </div>`;
      this._updateDrawer(title, content);
    } catch (e) {
      this._updateDrawer('Error', `<div class="empty-state"><div class="empty-icon">❌</div><h3>Failed to load</h3><p>${e.message}</p></div>`);
    }
  }

  async openAdminEditUserModal(userId, role) {
    try {
      const user = await API.getAdminUser(userId);
      const isWorker = role === 'worker';
      const body = `
        <form id="admin-user-form" onsubmit="app.submitAdminUserEdit(event, ${userId})">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" name="name" value="${user.name || ''}" required></div>
            <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" name="email" value="${user.email || ''}" required></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Phone</label><input class="form-input" name="phone" value="${user.phone || ''}"></div>
            <div class="form-group"><label class="form-label">Status</label>
              <select class="form-select" name="status">
                ${['active','inactive','pending','suspended'].map(s => `<option value="${s}" ${s === user.status ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group"><label class="form-label">Address</label><input class="form-input" name="address" value="${user.address || ''}"></div>
          ${isWorker ? `
          <div class="form-row">
            <div class="form-group"><label class="form-label">Specialization</label><input class="form-input" name="specialization" value="${user.specialization || ''}"></div>
            <div class="form-group"><label class="form-label">Hourly Rate (₹)</label><input class="form-input" type="number" name="hourly_rate" value="${user.hourly_rate || ''}" min="0"></div>
          </div>
          <div class="form-group"><label class="form-label">Availability</label>
            <select class="form-select" name="availability">
              <option value="online" ${user.availability === 'online' ? 'selected' : ''}>Online</option>
              <option value="offline" ${user.availability !== 'online' ? 'selected' : ''}>Offline</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Bio</label><textarea class="form-textarea" name="bio" rows="3">${user.bio || ''}</textarea></div>` : ''}
          <div class="form-group">
            <label class="form-label">New Password <span style="color:var(--text-muted);font-weight:400">(leave blank to keep current)</span></label>
            <input class="form-input" type="password" name="password" placeholder="Min 6 characters" minlength="6">
          </div>
        </form>`;
      const footer = `<button class="btn btn-ghost" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="document.getElementById('admin-user-form').requestSubmit()">💾 Save Changes</button>`;
      document.body.insertAdjacentHTML('beforeend', Components.modal('Edit User: ' + user.name, body, footer));
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  async submitAdminUserEdit(e, userId) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form.entries());
    // Remove empty password
    if (!data.password) delete data.password;
    if (data.hourly_rate) data.hourly_rate = +data.hourly_rate;
    try {
      await API.adminUpdateUser(userId, data);
      this.closeModal();
      Components.toast('User updated successfully!', 'success');
      this.closeDrawer();
      this.route();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  async deleteUser(userId, userName) {
    if (!confirm(`Permanently delete account for "${userName}"? This will remove all their data and cannot be undone.`)) return;
    try {
      await API.deleteUser(userId);
      Components.toast(`${userName}'s account has been deleted.`, 'success');
      this.closeDrawer();
      this.route();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  /* ═══════════════ DRAWER SYSTEM ═══════════════ */
  _openDrawer(title, content) {
    const existing = document.getElementById('detail-drawer');
    if (existing) existing.remove();
    const backdrop = document.getElementById('drawer-backdrop');
    if (backdrop) backdrop.remove();

    document.body.insertAdjacentHTML('beforeend', `
      <div id="drawer-backdrop" class="drawer-backdrop" onclick="app.closeDrawer()"></div>
      <div id="detail-drawer" class="detail-drawer">
        <div class="drawer-header">
          <h2 id="drawer-title">${title}</h2>
          <button class="drawer-close" onclick="app.closeDrawer()">✕</button>
        </div>
        <div class="drawer-body" id="drawer-body">${content}</div>
      </div>`);

    requestAnimationFrame(() => {
      document.getElementById('detail-drawer').classList.add('open');
      document.getElementById('drawer-backdrop').classList.add('show');
    });
  }

  _updateDrawer(title, content) {
    const titleEl = document.getElementById('drawer-title');
    const bodyEl = document.getElementById('drawer-body');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = content;
  }

  closeDrawer() {
    const drawer = document.getElementById('detail-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (drawer) { drawer.classList.remove('open'); setTimeout(() => drawer.remove(), 300); }
    if (backdrop) { backdrop.classList.remove('show'); setTimeout(() => backdrop.remove(), 300); }
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
          ${Components.statCard('💰', '₹' + spent, 'Total Spent', 'violet')}
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
    const lat = this.user.latitude || 20.5937;
    const lng = this.user.longitude || 78.9629;
    this._searchAllIndia = false;
    try {
      const workers = await API.getNearbyWorkers(lat, lng, 50);
      workers.forEach((w, i) => w._delay = i * 0.08);
      document.getElementById('page-content').innerHTML = `
        <div class="workers-search-bar">
          <div class="workers-search-row">
            <div class="search-field">
              <label class="form-label">📍 Your Location</label>
              <div class="location-search-box">
                <span class="location-search-icon">🔍</span>
                <input class="form-input location-autocomplete" type="text" id="worker-search-address"
                  placeholder="Search by city, area" autocomplete="off" value="${this.user.address || ''}"
                  oninput="app.handleLocationAutocomplete('worker-search', this.value)">
                <div class="autocomplete-dropdown" id="worker-search-suggestions"></div>
              </div>
              <input type="hidden" id="worker-search-lat" value="${lat}">
              <input type="hidden" id="worker-search-lng" value="${lng}">
            </div>
            <div class="workers-radius-field"><label class="form-label">Radius (km)</label><input class="form-input" type="number" id="search-radius" value="50" min="1" max="2000"></div>
            <div class="workers-search-actions">
              <button class="btn btn-ghost" onclick="app.detectCurrentLocation('worker-search')" title="Use current GPS location">📡 My Location</button>
              <button class="btn btn-primary" onclick="app.searchWorkers()">🔍 Search</button>
            </div>
          </div>
          <div class="search-toggle-wrap">
            <span class="search-toggle-flag">🇮🇳</span>
            <span class="search-toggle-label">Search All India</span>
            <label class="toggle"><input type="checkbox" id="search-all-india" onchange="app.toggleSearchAllIndia(this.checked)"><span class="toggle-slider"></span></label>
            <span class="text-muted text-sm">Find workers anywhere across India</span>
          </div>
        </div>
        <div id="workers-map-wrap" class="workers-map-container"><div id="workers-map" style="height:100%"></div></div>
        <div id="workers-grid" class="cards-grid">
          ${workers.length ? workers.map(w => Components.workerCard(w)).join('') : Components.emptyState('👷', 'No workers found', 'Try expanding your search radius.')}
        </div>`;
      this._initWorkersMap(lat, lng, workers);
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  _initWorkersMap(lat, lng, workers) {
    setTimeout(() => {
      const mapEl = document.getElementById('workers-map');
      if (!mapEl || typeof L === 'undefined') return;
      if (this._maps.workers) { this._maps.workers.remove(); }
      const map = L.map('workers-map').setView([lat, lng], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 18 }).addTo(map);
      L.marker([lat, lng], { title: 'Your Location' }).addTo(map).bindPopup('<b>📍 Your Location</b>');
      workers.forEach(w => {
        if (w.latitude && w.longitude) {
          L.marker([w.latitude, w.longitude]).addTo(map).bindPopup(`<div class="worker-map-popup"><h4>${w.name}</h4><div class="wmp-spec">${w.specialization || 'General'}</div><div class="wmp-rating">${'★'.repeat(Math.round(w.rating || 0))}${'☆'.repeat(5 - Math.round(w.rating || 0))}</div><div class="wmp-rate">₹${w.hourly_rate || 0}/hr</div></div>`);
        }
      });
      if (workers.length > 0) {
        const allPts = [[lat, lng], ...workers.filter(w => w.latitude).map(w => [w.latitude, w.longitude])];
        map.fitBounds(allPts, { padding: [30, 30], maxZoom: 12 });
      }
      this._maps.workers = map;
    }, 100);
  }

  toggleSearchAllIndia(checked) {
    this._searchAllIndia = checked;
    const radiusInput = document.getElementById('search-radius');
    if (radiusInput) { radiusInput.disabled = checked; radiusInput.value = checked ? '0' : '50'; }
  }

  async searchWorkers() {
    const lat = document.getElementById('worker-search-lat').value || 20.5937;
    const lng = document.getElementById('worker-search-lng').value || 78.9629;
    const radius = this._searchAllIndia ? 0 : (document.getElementById('search-radius').value || 50);
    const grid = document.getElementById('workers-grid');
    grid.innerHTML = Components.loading();
    try {
      const workers = this._searchAllIndia ? await API.searchAllWorkers() : await API.getNearbyWorkers(lat, lng, radius);
      workers.forEach((w, i) => w._delay = i * 0.08);
      grid.innerHTML = workers.length ? workers.map(w => Components.workerCard(w)).join('') : Components.emptyState('👷', 'No workers found', 'Try expanding your search radius or enable "Search All India".');
      this._initWorkersMap(+lat, +lng, workers);
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
            <option value="PENDING">Pending</option><option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option><option value="REJECTED">Rejected</option>
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
      document.getElementById('page-content').innerHTML = Components.emptyState('⏳', 'Pending Approval', 'Your account is awaiting admin approval.');
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
            <label class="toggle"><input type="checkbox" ${me.availability === 'online' ? 'checked' : ''} onchange="app.toggleAvailability(this.checked)"><span class="toggle-slider"></span></label>
          </div>
        </div>
        <div class="stats-grid">
          ${Components.statCard('📥', pending, 'Pending Requests', 'yellow')}
          ${Components.statCard('🔧', active, 'Active Jobs', 'blue')}
          ${Components.statCard('✅', completed, 'Completed', 'green')}
          ${Components.statCard('💰', '₹' + earned, 'Total Earned', 'violet')}
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
      document.getElementById('page-content').innerHTML = `<div class="cards-grid" style="grid-template-columns:1fr">${bookings.length ? bookings.map(b => Components.bookingCard(b, 'worker')).join('') : Components.emptyState('📥', 'No pending requests', 'You have no pending job requests right now.')}</div>`;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async renderActiveJobs() {
    this.renderLayout('Active Jobs', Components.loading());
    try {
      const accepted = await API.getBookings('status=ACCEPTED');
      const inProgress = await API.getBookings('status=IN_PROGRESS');
      const all = [...inProgress, ...accepted];
      document.getElementById('page-content').innerHTML = `<div class="cards-grid" style="grid-template-columns:1fr">${all.length ? all.map(b => Components.bookingCard(b, 'worker')).join('') : Components.emptyState('🔧', 'No active jobs', 'Accept a job request to see it here.')}</div>`;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async renderJobHistory() {
    this.renderLayout('Job History', Components.loading());
    try {
      const bookings = await API.getBookings();
      const history = bookings.filter(b => ['COMPLETED','REJECTED','CANCELLED'].includes(b.status));
      document.getElementById('page-content').innerHTML = `<p class="text-muted" style="margin-bottom:1rem">Click any job to view full details.</p><div class="cards-grid" style="grid-template-columns:1fr">${history.length ? history.map(b => Components.bookingCard(b, 'worker')).join('') : Components.emptyState('📜', 'No history', 'Completed jobs will appear here.')}</div>`;
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
          ${Components.statCard('💰', '₹' + stats.revenue.toFixed(0), 'Revenue', 'green')}
        </div>
        <div class="section-header"><h2>Bookings by Status</h2></div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:2rem;box-shadow:var(--clay-shadow)">
          <div class="chart-bars">
            ${stats.bookingsByStatus.map(b => `<div class="chart-bar"><div class="chart-bar-value">${b.count}</div><div class="chart-bar-fill" style="height:${(b.count / maxCount) * 100}%;background:${barColors[b.status] || 'var(--primary)'}"></div><div class="chart-bar-label">${b.status.replace('_', ' ')}</div></div>`).join('')}
          </div>
        </div>
        <div class="section-header"><h2>Quick Actions</h2></div>
        <div class="admin-quick-actions">
          <button class="btn btn-primary" onclick="app.navigate('#/admin/approvals')">✅ Worker Approvals ${stats.pendingWorkers > 0 ? `<span class="badge-pill">${stats.pendingWorkers}</span>` : ''}</button>
          <button class="btn btn-primary" onclick="app.navigate('#/admin/services')">🧹 Manage Services</button>
          <button class="btn btn-primary" onclick="app.navigate('#/admin/bookings')">📋 All Bookings</button>
          <button class="btn btn-ghost" onclick="app.navigate('#/admin/workers')">👷 Manage Workers</button>
          <button class="btn btn-ghost" onclick="app.navigate('#/admin/customers')">👥 Manage Customers</button>
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
            <tr class="clickable-row" onclick="app.openUserDetail(${u.id}, 'worker')">
              <td><div class="table-user"><div class="table-avatar">👤</div><div class="table-user-info"><h4>${u.name}</h4></div></div></td>
              <td>${u.email}</td>
              <td>${u.specialization || 'N/A'}</td>
              <td>${new Date(u.created_at).toLocaleDateString()}</td>
              <td onclick="event.stopPropagation()">
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
      document.getElementById('page-content').innerHTML = `
        <div class="section-header" style="margin-bottom:1.5rem">
          <div></div>
          <button class="btn btn-primary" onclick="app.openAdminCreateUserModal('worker')">➕ Add Worker</button>
        </div>
        ${users.length ? `
        <div class="data-table-wrap"><table class="data-table">
          <thead><tr><th>Worker</th><th>Email</th><th>Specialization</th><th>Rate</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${users.map(u => `
            <tr class="clickable-row" onclick="app.openUserDetail(${u.id}, 'worker')">
              <td><div class="table-user"><div class="table-avatar">👤</div><div class="table-user-info"><h4>${u.name}</h4><span>${u.phone || ''}</span></div></div></td>
              <td>${u.email}</td>
              <td>${u.specialization || 'N/A'}</td>
              <td>₹${u.hourly_rate || 'N/A'}/hr</td>
              <td>${Components.statusBadge(u.status)}</td>
              <td onclick="event.stopPropagation()">
                <button class="btn btn-warning btn-sm" onclick="app.openAdminEditUserModal(${u.id},'worker')">✏️</button>
                ${u.status === 'active' ? `<button class="btn btn-danger btn-sm" onclick="app.updateUserStatus(${u.id},'suspended')">Suspend</button>` : ''}
                ${u.status === 'suspended' || u.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="app.updateUserStatus(${u.id},'active')">Activate</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="app.deleteUser(${u.id},'${u.name.replace(/'/g,"\\'")}')">🗑️</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>` : Components.emptyState('👷', 'No workers', 'No workers registered yet.')}`;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  async renderManageCustomers() {
    this.renderLayout('Manage Customers', Components.loading());
    try {
      const users = await API.getUsers('customer');
      document.getElementById('page-content').innerHTML = `
        <div class="section-header" style="margin-bottom:1.5rem">
          <div></div>
          <button class="btn btn-primary" onclick="app.openAdminCreateUserModal('customer')">➕ Add Customer</button>
        </div>
        ${users.length ? `
        <div class="data-table-wrap"><table class="data-table">
          <thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${users.map(u => `
            <tr class="clickable-row" onclick="app.openUserDetail(${u.id}, 'customer')">
              <td><div class="table-user"><div class="table-avatar">👤</div><div class="table-user-info"><h4>${u.name}</h4></div></div></td>
              <td>${u.email}</td>
              <td>${u.phone || 'N/A'}</td>
              <td>${Components.statusBadge(u.status)}</td>
              <td onclick="event.stopPropagation()">
                <button class="btn btn-warning btn-sm" onclick="app.openAdminEditUserModal(${u.id},'customer')">✏️</button>
                ${u.status === 'active' ? `<button class="btn btn-danger btn-sm" onclick="app.updateUserStatus(${u.id},'inactive')">Deactivate</button>` : ''}
                ${u.status === 'inactive' ? `<button class="btn btn-success btn-sm" onclick="app.updateUserStatus(${u.id},'active')">Activate</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="app.deleteUser(${u.id},'${u.name.replace(/'/g,"\\'")}')">🗑️</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>` : Components.emptyState('👥', 'No customers', 'No customers registered yet.')}`;
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
          <span class="text-muted text-sm" style="margin-left:auto">${bookings.length} total bookings</span>
        </div>
        <div id="bookings-list" class="data-table-wrap"><table class="data-table">
          <thead><tr><th>#</th><th>Service</th><th>Customer</th><th>Worker</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${this._renderAdminBookingRows(bookings)}</tbody>
        </table></div>`;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  _renderAdminBookingRows(bookings) {
    return bookings.map(b => `
      <tr class="clickable-row" onclick="app.openAdminBookingDetail(${b.id})">
        <td>${b.id}</td>
        <td>${b.service_icon || '🧹'} ${b.service_name}</td>
        <td>${b.customer_name}</td>
        <td>${b.worker_name || 'Unassigned'}</td>
        <td>${b.scheduled_date || 'TBD'}</td>
        <td>₹${b.total_price || 0}</td>
        <td>${Components.statusBadge(b.status)}</td>
        <td onclick="event.stopPropagation()">
          <button class="btn btn-warning btn-sm" onclick="app.openAdminEditBookingModal(${b.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="app.adminDeleteBooking(${b.id})">🗑️</button>
        </td>
      </tr>`).join('');
  }

  filterAdminBookings() {
    const filter = document.getElementById('booking-filter').value;
    const filtered = filter ? this._bookings.filter(b => b.status === filter) : this._bookings;
    document.getElementById('bookings-list').innerHTML = `<table class="data-table">
      <thead><tr><th>#</th><th>Service</th><th>Customer</th><th>Worker</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${this._renderAdminBookingRows(filtered)}</tbody>
    </table>`;
  }

  /* ═══════════════ ADMIN MANAGE SERVICES ═══════════════ */
  async renderManageServices() {
    this.renderLayout('Manage Services', Components.loading());
    try {
      const services = await API.getServices();
      document.getElementById('page-content').innerHTML = `
        <div class="section-header" style="margin-bottom:1.5rem">
          <p class="text-muted">Manage all cleaning services available on the platform.</p>
          <button class="btn btn-primary" onclick="app.openServiceModal()">➕ Add Service</button>
        </div>
        <div class="data-table-wrap"><table class="data-table">
          <thead><tr><th>Icon</th><th>Name</th><th>Category</th><th>Price</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="services-tbody">${this._renderServiceRows(services)}</tbody>
        </table></div>`;
      this._services = services;
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  _renderServiceRows(services) {
    return services.map(s => `
      <tr>
        <td style="font-size:1.5rem">${s.icon || '🧹'}</td>
        <td><strong>${s.name}</strong><br><span style="font-size:.78rem;color:var(--text-muted)">${(s.description || '').substring(0, 60)}${s.description && s.description.length > 60 ? '…' : ''}</span></td>
        <td><span class="service-category-tag">${s.category || 'General'}</span></td>
        <td><strong class="gradient-text">₹${s.base_price}</strong></td>
        <td>${s.duration_hours}h</td>
        <td>${s.active ? '<span class="status-badge active">Active</span>' : '<span class="status-badge inactive">Inactive</span>'}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="app.openServiceModal(${s.id})">✏️ Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="app.toggleServiceStatus(${s.id}, ${s.active})">${s.active ? '🔴 Deactivate' : '🟢 Activate'}</button>
          <button class="btn btn-danger btn-sm" onclick="app.deleteService(${s.id}, '${s.name.replace(/'/g,"\\'")}')">🗑️ Delete</button>
        </td>
      </tr>`).join('');
  }

  async openServiceModal(serviceId = null) {
    let service = null;
    if (serviceId) {
      try {
        const services = await API.getServices();
        service = services.find(s => s.id === serviceId);
      } catch {}
    }

    const isEdit = !!service;
    const body = `
      <form id="service-form" onsubmit="app.submitService(event, ${serviceId || 'null'})">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Service Icon (emoji)</label>
            <input class="form-input" name="icon" value="${service?.icon || '🧹'}" placeholder="🧹" maxlength="4" required>
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-select" name="category">
              ${['Residential','Commercial','Specialty','General'].map(c => `<option value="${c}" ${(service?.category || 'Residential') === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Service Name *</label>
          <input class="form-input" name="name" value="${service?.name || ''}" placeholder="e.g. Standard House Cleaning" required>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-textarea" name="description" rows="3" placeholder="Describe what this service includes...">${service?.description || ''}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Base Price (₹) *</label>
            <input class="form-input" type="number" name="base_price" value="${service?.base_price || ''}" placeholder="1500" min="0" required>
          </div>
          <div class="form-group">
            <label class="form-label">Duration (hours) *</label>
            <input class="form-input" type="number" name="duration_hours" value="${service?.duration_hours || ''}" placeholder="2" min="0.5" step="0.5" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" name="active">
            <option value="1" ${!service || service.active ? 'selected' : ''}>Active (visible to customers)</option>
            <option value="0" ${service && !service.active ? 'selected' : ''}>Inactive (hidden from customers)</option>
          </select>
        </div>
      </form>`;
    const footer = `<button class="btn btn-ghost" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="document.getElementById('service-form').requestSubmit()">${isEdit ? '💾 Save Changes' : '➕ Create Service'}</button>`;
    document.body.insertAdjacentHTML('beforeend', Components.modal(isEdit ? `Edit Service: ${service.name}` : 'Add New Service', body, footer));
  }

  async submitService(e, serviceId) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form.entries());
    data.base_price = +data.base_price;
    data.duration_hours = +data.duration_hours;
    data.active = data.active === '1';
    try {
      if (serviceId) {
        await API.updateService(serviceId, data);
        Components.toast('Service updated!', 'success');
      } else {
        await API.createService(data);
        Components.toast('Service created!', 'success');
      }
      this.closeModal();
      await this.renderManageServices();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  async toggleServiceStatus(serviceId, currentActive) {
    try {
      await API.updateService(serviceId, { active: !currentActive });
      Components.toast(`Service ${!currentActive ? 'activated' : 'deactivated'}!`, 'success');
      await this.renderManageServices();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  async deleteService(serviceId, serviceName) {
    if (!confirm(`Delete service "${serviceName}"? If it has bookings, it will be deactivated instead.`)) return;
    try {
      const result = await API.deleteService(serviceId);
      Components.toast(result.note || 'Service deleted!', 'success');
      await this.renderManageServices();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  /* ═══════════════ ADMIN CREATE USER ═══════════════ */
  async openAdminCreateUserModal(role) {
    const isWorker = role === 'worker';
    const body = `
      <form id="admin-create-user-form" onsubmit="app.submitAdminCreateUser(event, '${role}')">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" name="name" required placeholder="Full name"></div>
          <div class="form-group"><label class="form-label">Email *</label><input class="form-input" type="email" name="email" required placeholder="email@example.com"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Password *</label><input class="form-input" type="password" name="password" required minlength="6" placeholder="Min 6 characters"></div>
          <div class="form-group"><label class="form-label">Phone</label><input class="form-input" name="phone" placeholder="+91 98765 43210"></div>
        </div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-select" name="status">
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Address</label><input class="form-input" name="address" placeholder="City, State"></div>
        ${isWorker ? `
        <div class="form-row">
          <div class="form-group"><label class="form-label">Specialization</label><input class="form-input" name="specialization" placeholder="e.g. House Cleaning"></div>
          <div class="form-group"><label class="form-label">Hourly Rate (₹)</label><input class="form-input" type="number" name="hourly_rate" min="0" placeholder="500"></div>
        </div>
        <div class="form-group"><label class="form-label">Bio</label><textarea class="form-textarea" name="bio" rows="2" placeholder="Worker bio..."></textarea></div>` : ''}
      </form>`;
    const footer = `<button class="btn btn-ghost" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="document.getElementById('admin-create-user-form').requestSubmit()">➕ Create ${role === 'worker' ? 'Worker' : 'Customer'}</button>`;
    document.body.insertAdjacentHTML('beforeend', Components.modal(`Create New ${role === 'worker' ? 'Worker' : 'Customer'}`, body, footer));
  }

  async submitAdminCreateUser(e, role) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form.entries());
    data.role = role;
    if (data.hourly_rate) data.hourly_rate = +data.hourly_rate;
    try {
      // Use register but then also set the status correctly via admin update
      const result = await API.register(data);
      if (data.status && data.status !== (role === 'worker' ? 'pending' : 'active')) {
        await API.adminUpdateUser(result.user.id, { status: data.status });
      }
      this.closeModal();
      Components.toast('User created successfully!', 'success');
      this.route();
    } catch (e) { Components.toast(e.message, 'error'); }
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
      this.closeDrawer();
      this.route();
    } catch (e) { Components.toast(e.message, 'error'); }
  }

  /* ═══════════════ MODALS ═══════════════ */
  async openBookingModal(serviceId = null, workerId = null) {
    try {
      const services = await API.getServices();
      const workers = await API.getNearbyWorkers(this.user.latitude || 20.5937, this.user.longitude || 78.9629, 100);
      const onlineWorkers = workers.filter(w => w.availability === 'online');
      const body = `
        <form id="booking-form" onsubmit="app.submitBooking(event)">
          <div class="form-group">
            <label class="form-label">Service</label>
            <select class="form-select" name="service_id" required onchange="app.updateBookingPrice()">
              <option value="">Select a service</option>
              ${services.map(s => `<option value="${s.id}" data-price="${s.base_price}" ${s.id == serviceId ? 'selected' : ''}>${s.icon} ${s.name} — ₹${s.base_price}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Worker</label>
            <select class="form-select" name="worker_id" required>
              <option value="">Select a worker</option>
              ${onlineWorkers.map(w => `<option value="${w.id}" ${w.id == workerId ? 'selected' : ''}>${w.name} — ${w.specialization} (₹${w.hourly_rate}/hr)</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" name="scheduled_date" required min="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label class="form-label">Time</label><input class="form-input" type="time" name="scheduled_time" required></div>
          </div>
          <div class="form-group"><label class="form-label">Address</label><input class="form-input" type="text" name="address" placeholder="Enter service address" required value="${this.user.address || ''}"></div>
          <div class="form-group"><label class="form-label">Notes (optional)</label><textarea class="form-textarea" name="notes" placeholder="Any special instructions..."></textarea></div>
          <div class="payment-summary">
            <div class="payment-summary-row"><span>Service Price</span><span id="booking-price">₹0</span></div>
            <div class="payment-summary-row total"><span>Total</span><span id="booking-total">₹0</span></div>
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
    if (el1) el1.textContent = '₹' + price;
    if (el2) el2.textContent = '₹' + price;
  }

  async submitBooking(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const sel = document.querySelector('[name="service_id"]');
    const price = sel.options[sel.selectedIndex]?.dataset?.price || 0;
    try {
      await API.createBooking({ service_id: +form.get('service_id'), worker_id: +form.get('worker_id'), scheduled_date: form.get('scheduled_date'), scheduled_time: form.get('scheduled_time'), address: form.get('address'), notes: form.get('notes'), total_price: +price });
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
            <input type="radio" name="method" value="Credit Card" checked><span class="payment-method-icon">💳</span><span>Credit Card</span>
          </label>
          <label class="payment-method" onclick="document.querySelectorAll('.payment-method').forEach(el=>el.classList.remove('selected'));this.classList.add('selected')">
            <input type="radio" name="method" value="Debit Card"><span class="payment-method-icon">🏦</span><span>Debit Card</span>
          </label>
          <label class="payment-method" onclick="document.querySelectorAll('.payment-method').forEach(el=>el.classList.remove('selected'));this.classList.add('selected')">
            <input type="radio" name="method" value="PayPal"><span class="payment-method-icon">🅿️</span><span>PayPal</span>
          </label>
        </div>
        <div class="payment-summary">
          <div class="payment-summary-row"><span>Service Charge</span><span>₹${amount}</span></div>
          <div class="payment-summary-row"><span>Platform Fee</span><span>₹0</span></div>
          <div class="payment-summary-row total"><span>Total</span><span>₹${amount}</span></div>
        </div>
      </form>`;
    const footer = `<button class="btn btn-ghost" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-success" onclick="document.getElementById('payment-form').requestSubmit()">💳 Pay ₹${amount}</button>`;
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
          <div class="star-rating-input">${[5,4,3,2,1].map(i => `<input type="radio" name="rating" id="star${i}" value="${i}" ${i===5?'checked':''}><label for="star${i}">★</label>`).join('')}</div>
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

  /* ═══════════════ PROFILE PAGE ═══════════════ */
  async renderProfile() {
    this.renderLayout('My Profile', Components.loading());
    try {
      const user = await API.getMe();
      this.user = user;
      const isWorker = user.role === 'worker';
      const avatarHtml = user.avatar && user.avatar.startsWith('data:') ? `<img src="${user.avatar}" alt="${user.name}">` : (user.avatar || '👤');

      document.getElementById('page-content').innerHTML = `
        <div class="profile-page">
          <div class="profile-header-card">
            <div class="profile-avatar-wrap">
              <div class="profile-avatar" id="profile-avatar-display">${avatarHtml}</div>
              <div class="profile-avatar-overlay" onclick="document.getElementById('avatar-input').click()"><span>📷<br>Change</span></div>
              <input type="file" id="avatar-input" class="hidden-file-input" accept="image/*" onchange="app.handleAvatarUpload(event)">
            </div>
            <div class="profile-name">${user.name}</div>
            <span class="role-badge ${user.role} profile-role">${user.role}</span>
            <div class="profile-email">${user.email}</div>
          </div>
          <div class="profile-section">
            <div class="profile-section-title"><div class="ps-icon">👤</div> Personal Information</div>
            <form id="profile-form" onsubmit="app.saveProfile(event)">
              <div class="form-row">
                <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" name="name" value="${user.name || ''}" required></div>
                <div class="form-group"><label class="form-label">Phone</label><input class="form-input" name="phone" value="${user.phone || ''}" placeholder="+91 98765 43210"></div>
              </div>
              ${isWorker ? `
              <div class="form-row">
                <div class="form-group"><label class="form-label">Specialization</label><input class="form-input" name="specialization" value="${user.specialization || ''}" placeholder="e.g. House Cleaning"></div>
                <div class="form-group"><label class="form-label">Hourly Rate (₹)</label><input class="form-input" type="number" name="hourly_rate" value="${user.hourly_rate || ''}" placeholder="500" min="50"></div>
              </div>
              <div class="form-group"><label class="form-label">Bio</label><textarea class="form-textarea" name="bio" rows="3" placeholder="Tell customers about your experience...">${user.bio || ''}</textarea></div>` : ''}
              <button type="submit" class="btn btn-primary btn-lg" id="save-profile-btn">💾 Save Changes</button>
            </form>
          </div>
          <div class="profile-section">
            <div class="profile-section-title"><div class="ps-icon">📍</div> Location</div>
            ${Components.locationPicker('profile-loc', user.address || '', user.latitude || '', user.longitude || '')}
            <button class="btn btn-primary" style="margin-top:1rem" onclick="app.saveProfileLocation()">📍 Update Location</button>
          </div>
          <div class="profile-section">
            <div class="profile-section-title"><div class="ps-icon">🔒</div> Change Password</div>
            <form id="password-form" onsubmit="app.changePassword(event)">
              <div class="form-group"><label class="form-label">Current Password</label><input class="form-input" type="password" name="current_password" required minlength="6"></div>
              <div class="form-group"><label class="form-label">New Password</label><input class="form-input" type="password" name="new_password" required minlength="6"></div>
              <button type="submit" class="btn btn-ghost">🔒 Change Password</button>
            </form>
          </div>
          <div class="profile-section" style="margin-top: 2rem;">
            <button class="btn btn-danger btn-block btn-lg" onclick="app.logout()">🚪 Sign Out</button>
          </div>
        </div>`;
      this._initProfileMap(user);
    } catch (e) { document.getElementById('page-content').innerHTML = Components.emptyState('❌', 'Error', e.message); }
  }

  _initProfileMap(user) {
    if (!user.latitude || !user.longitude) return;
    setTimeout(() => {
      const container = document.getElementById('profile-loc-map');
      if (!container || typeof L === 'undefined') return;
      container.style.display = 'block';
      if (this._maps.profile) this._maps.profile.remove();
      const map = L.map(container).setView([user.latitude, user.longitude], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map);
      L.marker([user.latitude, user.longitude]).addTo(map).bindPopup('<b>Your Location</b>').openPopup();
      this._maps.profile = map;
    }, 150);
  }

  async handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { Components.toast('Image must be under 5MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      try {
        const updated = await API.updateProfile({ avatar: base64 });
        this.user = updated;
        const display = document.getElementById('profile-avatar-display');
        if (display) display.innerHTML = `<img src="${base64}" alt="Avatar">`;
        Components.toast('Profile picture updated!', 'success');
      } catch (err) { Components.toast(err.message, 'error'); }
    };
    reader.readAsDataURL(file);
  }

  async saveProfile(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form.entries());
    if (data.hourly_rate) data.hourly_rate = +data.hourly_rate;
    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      this.user = await API.updateProfile(data);
      Components.toast('Profile updated successfully!', 'success');
      btn.disabled = false; btn.textContent = '💾 Save Changes';
    } catch (err) {
      Components.toast(err.message, 'error');
      btn.disabled = false; btn.textContent = '💾 Save Changes';
    }
  }

  async saveProfileLocation() {
    const lat = document.getElementById('profile-loc-lat').value;
    const lng = document.getElementById('profile-loc-lng').value;
    const address = document.getElementById('profile-loc-address').value;
    if (!lat || !lng) { Components.toast('Please set a location first', 'warning'); return; }
    try {
      this.user = await API.updateProfile({ latitude: +lat, longitude: +lng, address });
      Components.toast('Location updated!', 'success');
      this._initProfileMap(this.user);
    } catch (err) { Components.toast(err.message, 'error'); }
  }

  async changePassword(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await API.changePassword(form.get('current_password'), form.get('new_password'));
      Components.toast('Password changed successfully!', 'success');
      e.target.reset();
    } catch (err) { Components.toast(err.message, 'error'); }
  }

  /* ═══════════════ LOCATION HELPERS ═══════════════ */
  handleLocationAutocomplete(prefix, query) {
    clearTimeout(this._acTimeout);
    const dropdown = document.getElementById(prefix + '-suggestions');
    if (!dropdown) return;
    if (query.length < 3) { dropdown.classList.remove('show'); return; }
    dropdown.innerHTML = '<div class="autocomplete-loading">🔍 Searching...</div>';
    dropdown.classList.add('show');
    this._acTimeout = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=6&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const results = await res.json();
        if (results.length === 0) { dropdown.innerHTML = '<div class="autocomplete-loading">No results found</div>'; return; }
        dropdown.innerHTML = results.map((r, i) => `
          <div class="autocomplete-item" onclick="app.selectAutocompleteResult('${prefix}', ${i})">
            <span class="ac-icon">📍</span>
            <div class="ac-text"><span class="ac-main">${r.display_name.split(',').slice(0, 2).join(', ')}</span><span class="ac-sub">${r.display_name}</span></div>
          </div>`).join('');
        this._acResults = results;
      } catch { dropdown.innerHTML = '<div class="autocomplete-loading">Search error</div>'; }
    }, 400);
  }

  selectAutocompleteResult(prefix, index) {
    const result = this._acResults[index];
    if (!result) return;
    const addrInput = document.getElementById(prefix + '-address');
    const latInput = document.getElementById(prefix + '-lat');
    const lngInput = document.getElementById(prefix + '-lng');
    const dropdown = document.getElementById(prefix + '-suggestions');
    const status = document.getElementById(prefix + '-status');
    if (addrInput) addrInput.value = result.display_name;
    if (latInput) latInput.value = result.lat;
    if (lngInput) lngInput.value = result.lon;
    if (dropdown) dropdown.classList.remove('show');
    if (status) status.textContent = '✅ Location set';
    this._showMiniMap(prefix, +result.lat, +result.lon);
  }

  detectCurrentLocation(prefix) {
    if (!navigator.geolocation) { Components.toast('Geolocation not supported', 'error'); return; }
    const status = document.getElementById(prefix + '-status');
    if (status) status.textContent = '📡 Detecting...';
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        const latInput = document.getElementById(prefix + '-lat');
        const lngInput = document.getElementById(prefix + '-lng');
        if (latInput) latInput.value = lat;
        if (lngInput) lngInput.value = lng;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`, { headers: { 'Accept-Language': 'en' } });
          const data = await res.json();
          const addrInput = document.getElementById(prefix + '-address');
          if (addrInput) addrInput.value = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        } catch {}
        if (status) status.textContent = '✅ Location detected!';
        Components.toast('Location detected successfully!', 'success');
        this._showMiniMap(prefix, lat, lng);
      },
      (err) => { if (status) status.textContent = ''; Components.toast('Could not detect location: ' + err.message, 'error'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  _showMiniMap(prefix, lat, lng) {
    const container = document.getElementById(prefix + '-map');
    if (!container || typeof L === 'undefined') return;
    container.style.display = 'block';
    const mapKey = prefix + '-mini';
    if (this._maps[mapKey]) this._maps[mapKey].remove();
    const map = L.map(container).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map);
    L.marker([lat, lng]).addTo(map);
    this._maps[mapKey] = map;
  }
}

/* ── Initialize ─────────────────────────────────────────── */
const app = new App();
