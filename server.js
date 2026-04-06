const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cleanerpro_secret_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ── Auth Middleware ─────────────────────────────────── */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function addNotification(userId, title, message, type = 'info') {
  db.prepare('INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)').run(userId, title, message, type);
}

/* ═══════════════ AUTH ROUTES ═══════════════ */
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role, phone, address, specialization, hourly_rate, bio, latitude, longitude } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Name, email, password and role are required' });
    if (!['customer','worker'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const exists = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const status = role === 'worker' ? 'pending' : 'active';
    const result = db.prepare(
      'INSERT INTO users (name,email,password,role,phone,address,status,specialization,hourly_rate,bio,latitude,longitude) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run(name, email, hash, role, phone||null, address||null, status, specialization||null, hourly_rate||null, bio||null, latitude||null, longitude||null);

    if (role === 'worker') {
      const admins = db.prepare("SELECT id FROM users WHERE role='admin'").all();
      admins.forEach(a => addNotification(a.id, 'New Worker Registration', `${name} has registered and is awaiting approval.`, 'info'));
    }

    const token = jwt.sign({ id: result.lastInsertRowid, role, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: result.lastInsertRowid, name, email, role, status } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended. Contact admin.' });
    if (user.status === 'inactive') return res.status(403).json({ error: 'Account deactivated. Contact admin.' });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safe } = user;
    res.json({ token, user: safe });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safe } = user;
  res.json(safe);
});

/* ═══════════════ SERVICES ═══════════════ */
app.get('/api/services', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM services WHERE active=1 ORDER BY id').all());
});

app.post('/api/services', auth, requireRole('admin'), (req, res) => {
  const { name, description, base_price, duration_hours, icon, category } = req.body;
  const r = db.prepare('INSERT INTO services (name,description,base_price,duration_hours,icon,category) VALUES (?,?,?,?,?,?)').run(name, description, base_price, duration_hours, icon||'🧹', category||'General');
  res.json({ id: r.lastInsertRowid, ...req.body });
});

/* ═══════════════ WORKERS ═══════════════ */
app.get('/api/workers/nearby', auth, (req, res) => {
  const { lat, lng, radius } = req.query;
  const workers = db.prepare("SELECT id,name,email,avatar,specialization,hourly_rate,bio,latitude,longitude,availability FROM users WHERE role='worker' AND status='active'").all();

  const toRad = d => d * Math.PI / 180;
  const haversine = (lat1,lon1,lat2,lon2) => {
    const R = 6371;
    const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  let results = workers.map(w => {
    const avgRating = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE worker_id=?').get(w.id);
    return { ...w, rating: avgRating.avg ? +avgRating.avg.toFixed(1) : 0, review_count: avgRating.count, distance: (lat && lng && w.latitude) ? haversine(+lat, +lng, w.latitude, w.longitude) : null };
  });

  if (lat && lng && radius) results = results.filter(w => w.distance !== null && w.distance <= +radius);
  results.sort((a,b) => (a.distance||999) - (b.distance||999));
  res.json(results);
});

app.put('/api/workers/availability', auth, requireRole('worker'), (req, res) => {
  db.prepare('UPDATE users SET availability=? WHERE id=?').run(req.body.availability, req.user.id);
  res.json({ success: true, availability: req.body.availability });
});

app.get('/api/workers/:id', auth, (req, res) => {
  const w = db.prepare("SELECT id,name,email,avatar,specialization,hourly_rate,bio,latitude,longitude,availability,status FROM users WHERE id=? AND role='worker'").get(req.params.id);
  if (!w) return res.status(404).json({ error: 'Worker not found' });
  const avg = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE worker_id=?').get(w.id);
  res.json({ ...w, rating: avg.avg ? +avg.avg.toFixed(1) : 0, review_count: avg.count });
});

/* ═══════════════ BOOKINGS ═══════════════ */
app.post('/api/bookings', auth, requireRole('customer'), (req, res) => {
  const { worker_id, service_id, scheduled_date, scheduled_time, address, notes, total_price } = req.body;
  const r = db.prepare('INSERT INTO bookings (customer_id,worker_id,service_id,scheduled_date,scheduled_time,address,notes,total_price) VALUES (?,?,?,?,?,?,?,?)').run(req.user.id, worker_id, service_id, scheduled_date, scheduled_time, address, notes, total_price);
  if (worker_id) {
    const svc = db.prepare('SELECT name FROM services WHERE id=?').get(service_id);
    const cust = db.prepare('SELECT name FROM users WHERE id=?').get(req.user.id);
    addNotification(worker_id, 'New Job Request', `${cust.name} has requested ${svc.name}.`, 'info');
  }
  addNotification(req.user.id, 'Booking Created', 'Your booking has been submitted successfully.', 'success');
  res.json({ id: r.lastInsertRowid });
});

app.get('/api/bookings', auth, (req, res) => {
  let sql, params;
  if (req.user.role === 'customer') {
    sql = `SELECT b.*, s.name as service_name, s.icon as service_icon, u.name as worker_name FROM bookings b JOIN services s ON b.service_id=s.id LEFT JOIN users u ON b.worker_id=u.id WHERE b.customer_id=? ORDER BY b.created_at DESC`;
    params = [req.user.id];
  } else if (req.user.role === 'worker') {
    const status = req.query.status;
    if (status) {
      sql = `SELECT b.*, s.name as service_name, s.icon as service_icon, u.name as customer_name FROM bookings b JOIN services s ON b.service_id=s.id JOIN users u ON b.customer_id=u.id WHERE b.worker_id=? AND b.status=? ORDER BY b.created_at DESC`;
      params = [req.user.id, status];
    } else {
      sql = `SELECT b.*, s.name as service_name, s.icon as service_icon, u.name as customer_name FROM bookings b JOIN services s ON b.service_id=s.id JOIN users u ON b.customer_id=u.id WHERE b.worker_id=? ORDER BY b.created_at DESC`;
      params = [req.user.id];
    }
  }
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/bookings/:id', auth, (req, res) => {
  const b = db.prepare(`SELECT b.*, s.name as service_name, s.icon as service_icon, s.base_price, w.name as worker_name, w.avatar as worker_avatar, c.name as customer_name, c.avatar as customer_avatar FROM bookings b JOIN services s ON b.service_id=s.id LEFT JOIN users w ON b.worker_id=w.id JOIN users c ON b.customer_id=c.id WHERE b.id=?`).get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  res.json(b);
});

app.put('/api/bookings/:id/status', auth, (req, res) => {
  const { status } = req.body;
  const booking = db.prepare('SELECT * FROM bookings WHERE id=?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const valid = {
    'ACCEPTED': ['PENDING'], 'REJECTED': ['PENDING'], 'IN_PROGRESS': ['ACCEPTED'],
    'COMPLETED': ['IN_PROGRESS'], 'CANCELLED': ['PENDING','ACCEPTED']
  };
  if (!valid[status] || !valid[status].includes(booking.status))
    return res.status(400).json({ error: `Cannot change from ${booking.status} to ${status}` });

  db.prepare('UPDATE bookings SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, req.params.id);

  const svc = db.prepare('SELECT name FROM services WHERE id=?').get(booking.service_id);
  const msgs = {
    'ACCEPTED': { to: booking.customer_id, title: 'Booking Accepted', msg: `Your ${svc.name} booking has been accepted!`, type: 'success' },
    'REJECTED': { to: booking.customer_id, title: 'Booking Rejected', msg: `Your ${svc.name} booking was rejected.`, type: 'error' },
    'IN_PROGRESS': { to: booking.customer_id, title: 'Job Started', msg: `Your ${svc.name} is now in progress.`, type: 'info' },
    'COMPLETED': { to: booking.customer_id, title: 'Job Completed', msg: `Your ${svc.name} has been completed!`, type: 'success' },
    'CANCELLED': { to: booking.worker_id, title: 'Booking Cancelled', msg: `A ${svc.name} booking has been cancelled.`, type: 'warning' }
  };
  if (msgs[status] && msgs[status].to) addNotification(msgs[status].to, msgs[status].title, msgs[status].msg, msgs[status].type);
  res.json({ success: true });
});

/* ═══════════════ PAYMENTS ═══════════════ */
app.post('/api/payments', auth, (req, res) => {
  const { booking_id, amount, method } = req.body;
  const txn = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  db.prepare('INSERT INTO payments (booking_id,amount,method,status,transaction_id) VALUES (?,?,?,?,?)').run(booking_id, amount, method, 'completed', txn);
  addNotification(req.user.id, 'Payment Successful', `Payment of $${amount} processed successfully.`, 'success');
  res.json({ success: true, transaction_id: txn });
});

app.get('/api/payments/booking/:bookingId', auth, (req, res) => {
  const p = db.prepare('SELECT * FROM payments WHERE booking_id=?').get(req.params.bookingId);
  res.json(p || null);
});

/* ═══════════════ REVIEWS ═══════════════ */
app.post('/api/reviews', auth, requireRole('customer'), (req, res) => {
  const { booking_id, worker_id, rating, comment } = req.body;
  const exists = db.prepare('SELECT id FROM reviews WHERE booking_id=?').get(booking_id);
  if (exists) return res.status(400).json({ error: 'Already reviewed' });
  db.prepare('INSERT INTO reviews (booking_id,customer_id,worker_id,rating,comment) VALUES (?,?,?,?,?)').run(booking_id, req.user.id, worker_id, rating, comment);
  const cust = db.prepare('SELECT name FROM users WHERE id=?').get(req.user.id);
  addNotification(worker_id, 'New Review', `${cust.name} left you a ${rating}-star review!`, rating >= 4 ? 'success' : 'info');
  res.json({ success: true });
});

app.get('/api/reviews/worker/:workerId', auth, (req, res) => {
  res.json(db.prepare('SELECT r.*, u.name as customer_name, u.avatar as customer_avatar FROM reviews r JOIN users u ON r.customer_id=u.id WHERE r.worker_id=? ORDER BY r.created_at DESC').all(req.params.workerId));
});

/* ═══════════════ NOTIFICATIONS ═══════════════ */
app.get('/api/notifications', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.id));
});

app.put('/api/notifications/:id/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

app.put('/api/notifications/read-all', auth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id);
  res.json({ success: true });
});

/* ═══════════════ ADMIN ═══════════════ */
app.get('/api/admin/stats', auth, requireRole('admin'), (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const workers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='worker' AND status='active'").get().c;
  const pendingWorkers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='worker' AND status='pending'").get().c;
  const customers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='customer'").get().c;
  const totalBookings = db.prepare('SELECT COUNT(*) as c FROM bookings').get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status='completed'").get().total;
  const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM bookings GROUP BY status").all();
  res.json({ totalUsers, workers, pendingWorkers, customers, totalBookings, revenue, bookingsByStatus: byStatus });
});

app.get('/api/admin/users', auth, requireRole('admin'), (req, res) => {
  const role = req.query.role;
  let users;
  if (role) users = db.prepare('SELECT id,name,email,role,phone,status,availability,specialization,created_at FROM users WHERE role=? ORDER BY created_at DESC').all(role);
  else users = db.prepare('SELECT id,name,email,role,phone,status,availability,specialization,created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

app.put('/api/admin/users/:id/status', auth, requireRole('admin'), (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE users SET status=? WHERE id=?').run(status, req.params.id);
  const user = db.prepare('SELECT name FROM users WHERE id=?').get(req.params.id);
  const msgs = { active: 'Your account has been approved/activated!', suspended: 'Your account has been suspended.', inactive: 'Your account has been deactivated.' };
  addNotification(+req.params.id, 'Account Update', msgs[status] || 'Your account status has been updated.', status === 'active' ? 'success' : 'warning');
  res.json({ success: true });
});

app.get('/api/admin/bookings', auth, requireRole('admin'), (req, res) => {
  let sql = `SELECT b.*, s.name as service_name, s.icon as service_icon, c.name as customer_name, w.name as worker_name FROM bookings b JOIN services s ON b.service_id=s.id JOIN users c ON b.customer_id=c.id LEFT JOIN users w ON b.worker_id=w.id`;
  const params = [];
  if (req.query.status) { sql += ' WHERE b.status=?'; params.push(req.query.status); }
  sql += ' ORDER BY b.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

/* ── SPA Fallback ────────────────────────────────────── */
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`\n  🧹 CleanerPro running at http://localhost:${PORT}\n`));
