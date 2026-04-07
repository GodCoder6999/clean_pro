require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const setupAIAgent = require('./ai-agent');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cleanerpro_secret_key_2026';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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

async function addNotification(userId, title, message, type = 'info') {
  try {
    await db.execute({
      sql: 'INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)',
      args: [userId, title, message, type]
    });
  } catch (e) { /* non-critical */ }
}

/* ═══════════════ AUTH ═══════════════ */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, address, specialization, hourly_rate, bio, latitude, longitude } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Name, email, password and role are required' });
    if (!['customer','worker'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    
    const exists = await db.execute({ sql: 'SELECT id FROM users WHERE email=?', args: [email] });
    if (exists.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });
    
    const hash = bcrypt.hashSync(password, 10);
    const status = role === 'worker' ? 'pending' : 'active';
    
    const result = await db.execute({
      sql: 'INSERT INTO users (name,email,password,role,phone,address,status,specialization,hourly_rate,bio,latitude,longitude) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      args: [name, email, hash, role, phone||null, address||null, status, specialization||null, hourly_rate||null, bio||null, latitude||null, longitude||null]
    });
    
    const newUserId = Number(result.lastInsertRowid);
    
    if (role === 'worker') {
      const admins = await db.execute("SELECT id FROM users WHERE role='admin'");
      for (const a of admins.rows) {
        await addNotification(a.id, 'New Worker Registration', `${name} has registered and is awaiting approval.`, 'info');
      }
    }
    
    const token = jwt.sign({ id: newUserId, role, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: newUserId, name, email, role, status } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userRes = await db.execute({ sql: 'SELECT * FROM users WHERE email=?', args: [email] });
    const user = userRes.rows[0];
    
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended. Contact admin.' });
    if (user.status === 'inactive') return res.status(403).json({ error: 'Account deactivated. Contact admin.' });
    
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safe } = user;
    res.json({ token, user: safe });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const userRes = await db.execute({ sql: 'SELECT * FROM users WHERE id=?', args: [req.user.id] });
  if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safe } = userRes.rows[0];
  res.json(safe);
});

/* ═══════════════ PROFILE ═══════════════ */
app.put('/api/profile', auth, async (req, res) => {
  try {
    const { name, phone, address, bio, specialization, hourly_rate, latitude, longitude, avatar } = req.body;
    await db.execute({
      sql: `UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), address=COALESCE(?,address), bio=COALESCE(?,bio), specialization=COALESCE(?,specialization), hourly_rate=COALESCE(?,hourly_rate), latitude=COALESCE(?,latitude), longitude=COALESCE(?,longitude), avatar=COALESCE(?,avatar) WHERE id=?`,
      args: [name||null, phone||null, address||null, bio||null, specialization||null, hourly_rate||null, latitude !== undefined ? latitude : null, longitude !== undefined ? longitude : null, avatar||null, req.user.id]
    });
    const updated = await db.execute({ sql: 'SELECT * FROM users WHERE id=?', args: [req.user.id] });
    const { password: _, ...safe } = updated.rows[0];
    res.json(safe);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/profile/password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userRes = await db.execute({ sql: 'SELECT * FROM users WHERE id=?', args: [req.user.id] });
    const user = userRes.rows[0];
    if (!bcrypt.compareSync(current_password, user.password)) return res.status(400).json({ error: 'Current password is incorrect' });
    await db.execute({ sql: 'UPDATE users SET password=? WHERE id=?', args: [bcrypt.hashSync(new_password, 10), req.user.id] });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ═══════════════ SERVICES ═══════════════ */
app.get('/api/services', auth, async (req, res) => {
  // Admin sees all services including inactive
  let sql = req.user.role === 'admin' 
    ? 'SELECT * FROM services ORDER BY id'
    : 'SELECT * FROM services WHERE active=1 ORDER BY id';
  const result = await db.execute(sql);
  res.json(result.rows);
});

app.post('/api/services', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, description, base_price, duration_hours, icon, category, active } = req.body;
    if (!name || !base_price) return res.status(400).json({ error: 'Name and price are required' });
    const result = await db.execute({
      sql: 'INSERT INTO services (name,description,base_price,duration_hours,icon,category,active) VALUES (?,?,?,?,?,?,?)',
      args: [name, description||null, +base_price, +duration_hours||1, icon||'🧹', category||'General', active !== undefined ? (active ? 1 : 0) : 1]
    });
    const newId = Number(result.lastInsertRowid);
    const svc = await db.execute({ sql: 'SELECT * FROM services WHERE id=?', args: [newId] });
    res.json(svc.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/services/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, description, base_price, duration_hours, icon, category, active } = req.body;
    const svcRes = await db.execute({ sql: 'SELECT * FROM services WHERE id=?', args: [req.params.id] });
    if (svcRes.rows.length === 0) return res.status(404).json({ error: 'Service not found' });
    
    await db.execute({
      sql: `UPDATE services SET name=COALESCE(?,name), description=COALESCE(?,description), base_price=COALESCE(?,base_price), duration_hours=COALESCE(?,duration_hours), icon=COALESCE(?,icon), category=COALESCE(?,category), active=COALESCE(?,active) WHERE id=?`,
      args: [name||null, description||null, base_price ? +base_price : null, duration_hours ? +duration_hours : null, icon||null, category||null, active !== undefined ? (active ? 1 : 0) : null, req.params.id]
    });
    const updated = await db.execute({ sql: 'SELECT * FROM services WHERE id=?', args: [req.params.id] });
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/services/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    // Check if service has bookings
    const bRes = await db.execute({ sql: 'SELECT COUNT(*) as c FROM bookings WHERE service_id=?', args: [req.params.id] });
    if (bRes.rows[0].c > 0) {
      // Soft delete — just deactivate
      await db.execute({ sql: 'UPDATE services SET active=0 WHERE id=?', args: [req.params.id] });
      return res.json({ success: true, note: 'Service deactivated (has bookings)' });
    }
    await db.execute({ sql: 'DELETE FROM services WHERE id=?', args: [req.params.id] });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ═══════════════ WORKERS ═══════════════ */
app.get('/api/workers/nearby', auth, async (req, res) => {
  const { lat, lng, radius, query } = req.query;
  const workersRes = await db.execute("SELECT id,name,email,avatar,specialization,hourly_rate,bio,latitude,longitude,availability FROM users WHERE role='worker' AND status='active'");
  
  const toRad = d => d * Math.PI / 180;
  const haversine = (lat1,lon1,lat2,lon2) => {
    const R = 6371, dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  let results = await Promise.all(workersRes.rows.map(async w => {
    const avgRes = await db.execute({ sql: 'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE worker_id=?', args: [w.id] });
    const avg = avgRes.rows[0];
    return { ...w, rating: avg.avg ? +Number(avg.avg).toFixed(1) : 0, review_count: avg.count, distance: (lat && lng && w.latitude) ? haversine(+lat, +lng, w.latitude, w.longitude) : null };
  }));

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(w => w.name.toLowerCase().includes(q) || (w.specialization && w.specialization.toLowerCase().includes(q)) || (w.bio && w.bio.toLowerCase().includes(q)));
  }
  if (lat && lng && radius && +radius > 0) results = results.filter(w => w.distance !== null && w.distance <= +radius);
  results.sort((a,b) => (a.distance||999) - (b.distance||999));
  res.json(results);
});

app.put('/api/workers/availability', auth, requireRole('worker'), async (req, res) => {
  await db.execute({ sql: 'UPDATE users SET availability=? WHERE id=?', args: [req.body.availability, req.user.id] });
  res.json({ success: true, availability: req.body.availability });
});

app.get('/api/workers/:id', auth, async (req, res) => {
  const wRes = await db.execute({ sql: "SELECT id,name,email,avatar,specialization,hourly_rate,bio,latitude,longitude,availability,status FROM users WHERE id=? AND role='worker'", args: [req.params.id] });
  if (wRes.rows.length === 0) return res.status(404).json({ error: 'Worker not found' });
  const avgRes = await db.execute({ sql: 'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE worker_id=?', args: [req.params.id] });
  res.json({ ...wRes.rows[0], rating: avgRes.rows[0].avg ? +Number(avgRes.rows[0].avg).toFixed(1) : 0, review_count: avgRes.rows[0].count });
});

/* ═══════════════ BOOKINGS ═══════════════ */
app.post('/api/bookings', auth, requireRole('customer'), async (req, res) => {
  const { worker_id, service_id, scheduled_date, scheduled_time, address, notes, total_price } = req.body;
  const result = await db.execute({
    sql: 'INSERT INTO bookings (customer_id,worker_id,service_id,scheduled_date,scheduled_time,address,notes,total_price) VALUES (?,?,?,?,?,?,?,?)',
    args: [req.user.id, worker_id, service_id, scheduled_date, scheduled_time, address, notes, total_price]
  });
  
  if (worker_id) {
    const svcRes = await db.execute({ sql: 'SELECT name FROM services WHERE id=?', args: [service_id] });
    const custRes = await db.execute({ sql: 'SELECT name FROM users WHERE id=?', args: [req.user.id] });
    await addNotification(worker_id, 'New Job Request', `${custRes.rows[0].name} has requested ${svcRes.rows[0].name}.`, 'info');
  }
  await addNotification(req.user.id, 'Booking Created', 'Your booking has been submitted successfully.', 'success');
  res.json({ id: Number(result.lastInsertRowid) });
});

app.get('/api/bookings', auth, async (req, res) => {
  let sql, params;
  if (req.user.role === 'customer') {
    sql = `SELECT b.*, s.name as service_name, s.icon as service_icon, u.name as worker_name FROM bookings b JOIN services s ON b.service_id=s.id LEFT JOIN users u ON b.worker_id=u.id WHERE b.customer_id=? ORDER BY b.created_at DESC`;
    params = [req.user.id];
  } else if (req.user.role === 'worker') {
    const status = req.query.status;
    if (status) {
      sql = `SELECT b.*, b.customer_id, s.name as service_name, s.icon as service_icon, u.name as customer_name FROM bookings b JOIN services s ON b.service_id=s.id JOIN users u ON b.customer_id=u.id WHERE b.worker_id=? AND b.status=? ORDER BY b.created_at DESC`;
      params = [req.user.id, status];
    } else {
      sql = `SELECT b.*, b.customer_id, s.name as service_name, s.icon as service_icon, u.name as customer_name FROM bookings b JOIN services s ON b.service_id=s.id JOIN users u ON b.customer_id=u.id WHERE b.worker_id=? ORDER BY b.created_at DESC`;
      params = [req.user.id];
    }
  }
  const result = await db.execute({ sql, args: params });
  res.json(result.rows);
});

app.get('/api/bookings/:id', auth, async (req, res) => {
  const bRes = await db.execute({ sql: `SELECT b.*, s.name as service_name, s.icon as service_icon, s.base_price, w.name as worker_name, w.avatar as worker_avatar, w.specialization as worker_specialization, c.name as customer_name, c.avatar as customer_avatar FROM bookings b JOIN services s ON b.service_id=s.id LEFT JOIN users w ON b.worker_id=w.id JOIN users c ON b.customer_id=c.id WHERE b.id=?`, args: [req.params.id] });
  if (bRes.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
  res.json(bRes.rows[0]);
});

app.put('/api/bookings/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  const bRes = await db.execute({ sql: 'SELECT * FROM bookings WHERE id=?', args: [req.params.id] });
  const booking = bRes.rows[0];
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  
  const valid = { 'ACCEPTED': ['PENDING'], 'REJECTED': ['PENDING'], 'IN_PROGRESS': ['ACCEPTED'], 'COMPLETED': ['IN_PROGRESS'], 'CANCELLED': ['PENDING','ACCEPTED'] };
  // Admin can cancel from any status
  if (req.user.role === 'admin' && status === 'CANCELLED') {
    // allow
  } else if (!valid[status] || !valid[status].includes(booking.status)) {
    return res.status(400).json({ error: `Cannot change from ${booking.status} to ${status}` });
  }
  
  await db.execute({ sql: 'UPDATE bookings SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', args: [status, req.params.id] });
  
  const svcRes = await db.execute({ sql: 'SELECT name FROM services WHERE id=?', args: [booking.service_id] });
  const msgs = {
    'ACCEPTED': { to: booking.customer_id, title: 'Booking Accepted', msg: `Your ${svcRes.rows[0].name} booking has been accepted!`, type: 'success' },
    'REJECTED': { to: booking.customer_id, title: 'Booking Rejected', msg: `Your ${svcRes.rows[0].name} booking was rejected.`, type: 'error' },
    'IN_PROGRESS': { to: booking.customer_id, title: 'Job Started', msg: `Your ${svcRes.rows[0].name} is now in progress.`, type: 'info' },
    'COMPLETED': { to: booking.customer_id, title: 'Job Completed', msg: `Your ${svcRes.rows[0].name} has been completed!`, type: 'success' },
    'CANCELLED': { to: booking.worker_id, title: 'Booking Cancelled', msg: `A ${svcRes.rows[0].name} booking has been cancelled.`, type: 'warning' }
  };
  if (msgs[status] && msgs[status].to) await addNotification(msgs[status].to, msgs[status].title, msgs[status].msg, msgs[status].type);
  res.json({ success: true });
});

// Admin: delete a booking
app.delete('/api/bookings/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    // Delete related payments and reviews first
    await db.execute({ sql: 'DELETE FROM payments WHERE booking_id=?', args: [req.params.id] });
    await db.execute({ sql: 'DELETE FROM reviews WHERE booking_id=?', args: [req.params.id] });
    await db.execute({ sql: 'DELETE FROM bookings WHERE id=?', args: [req.params.id] });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ═══════════════ PAYMENTS ═══════════════ */
app.post('/api/payments', auth, async (req, res) => {
  const { booking_id, amount, method } = req.body;
  const txn = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  await db.execute({ sql: 'INSERT INTO payments (booking_id,amount,method,status,transaction_id) VALUES (?,?,?,?,?)', args: [booking_id, amount, method, 'completed', txn] });
  await addNotification(req.user.id, 'Payment Successful', `Payment of ₹${amount} processed successfully.`, 'success');
  res.json({ success: true, transaction_id: txn });
});

app.get('/api/payments/booking/:bookingId', auth, async (req, res) => {
  const pRes = await db.execute({ sql: 'SELECT * FROM payments WHERE booking_id=?', args: [req.params.bookingId] });
  res.json(pRes.rows[0] || null);
});

/* ═══════════════ REVIEWS ═══════════════ */
app.post('/api/reviews', auth, requireRole('customer'), async (req, res) => {
  const { booking_id, worker_id, rating, comment } = req.body;
  const existsRes = await db.execute({ sql: 'SELECT id FROM reviews WHERE booking_id=?', args: [booking_id] });
  if (existsRes.rows.length > 0) return res.status(400).json({ error: 'Already reviewed' });
  await db.execute({ sql: 'INSERT INTO reviews (booking_id,customer_id,worker_id,rating,comment) VALUES (?,?,?,?,?)', args: [booking_id, req.user.id, worker_id, rating, comment] });
  const custRes = await db.execute({ sql: 'SELECT name FROM users WHERE id=?', args: [req.user.id] });
  await addNotification(worker_id, 'New Review', `${custRes.rows[0].name} left you a ${rating}-star review!`, rating >= 4 ? 'success' : 'info');
  res.json({ success: true });
});

app.get('/api/reviews/worker/:workerId', auth, async (req, res) => {
  const rRes = await db.execute({ sql: 'SELECT r.*, u.name as customer_name, u.avatar as customer_avatar FROM reviews r JOIN users u ON r.customer_id=u.id WHERE r.worker_id=? ORDER BY r.created_at DESC', args: [req.params.workerId] });
  res.json(rRes.rows);
});

// Admin: delete a review
app.delete('/api/reviews/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM reviews WHERE id=?', args: [req.params.id] });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ═══════════════ NOTIFICATIONS ═══════════════ */
app.get('/api/notifications', auth, async (req, res) => {
  const nRes = await db.execute({ sql: 'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50', args: [req.user.id] });
  res.json(nRes.rows);
});

app.put('/api/notifications/:id/read', auth, async (req, res) => {
  await db.execute({ sql: 'UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', args: [req.params.id, req.user.id] });
  res.json({ success: true });
});

app.put('/api/notifications/read-all', auth, async (req, res) => {
  await db.execute({ sql: 'UPDATE notifications SET is_read=1 WHERE user_id=?', args: [req.user.id] });
  res.json({ success: true });
});

/* ═══════════════ ADMIN ═══════════════ */
app.get('/api/admin/stats', auth, requireRole('admin'), async (req, res) => {
  const [totalUsers, workers, pendingWorkers, customers, totalBookings, revenue, byStatus] = await Promise.all([
    db.execute('SELECT COUNT(*) as c FROM users'),
    db.execute("SELECT COUNT(*) as c FROM users WHERE role='worker' AND status='active'"),
    db.execute("SELECT COUNT(*) as c FROM users WHERE role='worker' AND status='pending'"),
    db.execute("SELECT COUNT(*) as c FROM users WHERE role='customer'"),
    db.execute('SELECT COUNT(*) as c FROM bookings'),
    db.execute("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status='completed'"),
    db.execute("SELECT status, COUNT(*) as count FROM bookings GROUP BY status")
  ]);
  res.json({ totalUsers: totalUsers.rows[0].c, workers: workers.rows[0].c, pendingWorkers: pendingWorkers.rows[0].c, customers: customers.rows[0].c, totalBookings: totalBookings.rows[0].c, revenue: revenue.rows[0].total, bookingsByStatus: byStatus.rows });
});

app.get('/api/admin/users', auth, requireRole('admin'), async (req, res) => {
  const role = req.query.role;
  let usersRes;
  if (role) {
    usersRes = await db.execute({ sql: 'SELECT id,name,email,role,phone,address,status,availability,specialization,hourly_rate,bio,latitude,longitude,created_at FROM users WHERE role=? ORDER BY created_at DESC', args: [role] });
  } else {
    usersRes = await db.execute('SELECT id,name,email,role,phone,address,status,availability,specialization,hourly_rate,bio,latitude,longitude,created_at FROM users ORDER BY created_at DESC');
  }
  res.json(usersRes.rows);
});

// Admin: get single user
app.get('/api/admin/users/:id', auth, requireRole('admin'), async (req, res) => {
  const uRes = await db.execute({ sql: 'SELECT id,name,email,role,phone,address,status,availability,specialization,hourly_rate,bio,latitude,longitude,avatar,created_at FROM users WHERE id=?', args: [req.params.id] });
  if (uRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(uRes.rows[0]);
});

// Admin: update any user's details
app.put('/api/admin/users/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, phone, address, role, status, availability, specialization, hourly_rate, bio, latitude, longitude, password } = req.body;
    
    // Check email uniqueness if changed
    if (email) {
      const existsRes = await db.execute({ sql: 'SELECT id FROM users WHERE email=? AND id!=?', args: [email, req.params.id] });
      if (existsRes.rows.length > 0) return res.status(400).json({ error: 'Email already in use' });
    }
    
    let sql = `UPDATE users SET 
      name=COALESCE(?,name), email=COALESCE(?,email), phone=COALESCE(?,phone),
      address=COALESCE(?,address), role=COALESCE(?,role), status=COALESCE(?,status),
      availability=COALESCE(?,availability), specialization=COALESCE(?,specialization),
      hourly_rate=COALESCE(?,hourly_rate), bio=COALESCE(?,bio),
      latitude=COALESCE(?,latitude), longitude=COALESCE(?,longitude)`;
    let args = [name||null, email||null, phone||null, address||null, role||null, status||null, availability||null, specialization||null, hourly_rate ? +hourly_rate : null, bio||null, latitude ? +latitude : null, longitude ? +longitude : null];

    if (password && password.length >= 6) {
      sql += ', password=?';
      args.push(bcrypt.hashSync(password, 10));
    }
    sql += ' WHERE id=?';
    args.push(req.params.id);

    await db.execute({ sql, args });
    const updated = await db.execute({ sql: 'SELECT id,name,email,role,phone,address,status,availability,specialization,hourly_rate,bio,latitude,longitude,created_at FROM users WHERE id=?', args: [req.params.id] });
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/users/:id/status', auth, requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  await db.execute({ sql: 'UPDATE users SET status=? WHERE id=?', args: [status, req.params.id] });
  const msgs = { active: 'Your account has been approved/activated!', suspended: 'Your account has been suspended.', inactive: 'Your account has been deactivated.' };
  await addNotification(+req.params.id, 'Account Update', msgs[status] || 'Your account status has been updated.', status === 'active' ? 'success' : 'warning');
  res.json({ success: true });
});

// Admin: delete user account
app.delete('/api/admin/users/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const userId = +req.params.id;
    // Prevent self-deletion
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot delete your own admin account' });
    
    // Delete related data
    await db.execute({ sql: 'DELETE FROM notifications WHERE user_id=?', args: [userId] });
    
    // For workers: nullify their worker_id in bookings, delete their reviews
    await db.execute({ sql: 'UPDATE bookings SET worker_id=NULL WHERE worker_id=?', args: [userId] });
    await db.execute({ sql: 'DELETE FROM reviews WHERE worker_id=? OR customer_id=?', args: [userId, userId] });
    
    // For customers: cancel their bookings
    await db.execute({ sql: "UPDATE bookings SET status='CANCELLED' WHERE customer_id=? AND status IN ('PENDING','ACCEPTED','IN_PROGRESS')", args: [userId] });
    
    // Delete payments tied to their bookings
    await db.execute({ sql: 'DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE customer_id=?)', args: [userId] });
    
    // Finally delete the user
    await db.execute({ sql: 'DELETE FROM users WHERE id=?', args: [userId] });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: full edit a booking
app.put('/api/admin/bookings/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { service_id, scheduled_date, scheduled_time, address, notes, total_price, status } = req.body;
    await db.execute({
      sql: `UPDATE bookings SET 
        service_id=COALESCE(?,service_id), scheduled_date=COALESCE(?,scheduled_date),
        scheduled_time=COALESCE(?,scheduled_time), address=COALESCE(?,address),
        notes=COALESCE(?,notes), total_price=COALESCE(?,total_price),
        status=COALESCE(?,status), updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      args: [service_id||null, scheduled_date||null, scheduled_time||null, address||null, notes||null, total_price ? +total_price : null, status||null, req.params.id]
    });
    const updated = await db.execute({ sql: 'SELECT * FROM bookings WHERE id=?', args: [req.params.id] });
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/bookings', auth, requireRole('admin'), async (req, res) => {
  let sql = `SELECT b.*, s.name as service_name, s.icon as service_icon, c.name as customer_name, w.name as worker_name FROM bookings b JOIN services s ON b.service_id=s.id JOIN users c ON b.customer_id=c.id LEFT JOIN users w ON b.worker_id=w.id`;
  const params = [];
  if (req.query.status) { sql += ' WHERE b.status=?'; params.push(req.query.status); }
  sql += ' ORDER BY b.created_at DESC';
  const result = await db.execute({ sql, args: params });
  res.json(result.rows);
});

/* AI Agent */
setupAIAgent(app, db, jwt, JWT_SECRET, addNotification);

/* SPA Fallback */
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`\n  🧹 CleanerPro running at http://localhost:${PORT}\n`));
