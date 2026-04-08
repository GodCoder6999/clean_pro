/* ═══════════════════════════════════════════════════════════
   CleanerPro Local Rule-Based Agent (Wizard Mode) — No API Required
   ═══════════════════════════════════════════════════════════ */

/* ── Tool Executor ─────────────────────────────────────── */
async function executeTool(name, args, user, db, addNotification) {
  try {
    switch (name) {

      case 'get_services': {
        const r = await db.execute(
          'SELECT id,name,description,base_price,duration_hours,icon,category FROM services WHERE active=1 ORDER BY id'
        );
        return JSON.stringify(r.rows);
      }

      case 'get_my_bookings': {
        if (user.role === 'customer') {
          const r = await db.execute({
            sql: `SELECT b.id, b.status, b.scheduled_date, b.scheduled_time, b.address,
                    b.total_price, b.notes,
                    s.name as service_name, s.icon as service_icon,
                    u.name as worker_name
                  FROM bookings b
                  JOIN services s ON b.service_id=s.id
                  LEFT JOIN users u ON b.worker_id=u.id
                  WHERE b.customer_id=?
                  ORDER BY b.created_at DESC`,
            args: [user.id]
          });
          return JSON.stringify(r.rows);
        } else {
          const r = await db.execute({
            sql: `SELECT b.id, b.status, b.scheduled_date, b.scheduled_time, b.address,
                    b.total_price, b.notes,
                    s.name as service_name, s.icon as service_icon,
                    u.name as customer_name
                  FROM bookings b
                  JOIN services s ON b.service_id=s.id
                  JOIN users u ON b.customer_id=u.id
                  WHERE b.worker_id=?
                  ORDER BY b.created_at DESC`,
            args: [user.id]
          });
          return JSON.stringify(r.rows);
        }
      }

      case 'create_booking': {
        if (!args.worker_id || !args.service_id) {
          return JSON.stringify({
            error: 'Cannot create booking — both a service and a worker must be selected.'
          });
        }
        if (!args.scheduled_date || !args.scheduled_time || !args.address) {
          return JSON.stringify({
            error: 'Cannot create booking — date, time, and address are required.'
          });
        }

        const svcRes = await db.execute({
          sql: 'SELECT id, name, base_price FROM services WHERE id=? AND active=1',
          args: [args.service_id]
        });
        if (!svcRes.rows.length) {
          return JSON.stringify({ error: 'Selected service not found or inactive.' });
        }
        const service = svcRes.rows[0];

        const workerRes = await db.execute({
          sql: "SELECT id, name, hourly_rate FROM users WHERE id=? AND role='worker' AND status='active'",
          args: [args.worker_id]
        });
        if (!workerRes.rows.length) {
          return JSON.stringify({ error: 'Selected worker not found or unavailable.' });
        }

        const totalPrice = args.total_price || service.base_price;

        const r = await db.execute({
          sql: `INSERT INTO bookings
                  (customer_id, worker_id, service_id, scheduled_date, scheduled_time, address, notes, total_price)
                VALUES (?,?,?,?,?,?,?,?)`,
          args: [
            user.id,
            args.worker_id,
            args.service_id,
            args.scheduled_date,
            args.scheduled_time,
            args.address,
            args.notes || null,
            totalPrice
          ]
        });

        const newId = Number(r.lastInsertRowid);

        await addNotification(
          args.worker_id,
          'New Job Request',
          `${user.name} booked ${service.name}.`,
          'info'
        );
        await addNotification(
          user.id,
          'Booking Created',
          `Your ${service.name} booking has been created successfully. Total: ₹${totalPrice}.`,
          'success'
        );

        return JSON.stringify({
          success: true,
          booking_id: newId,
          service_name: service.name,
          total_price: totalPrice,
          message: `Booking #${newId} created successfully for ${service.name} at ₹${totalPrice}.`
        });
      }

      case 'cancel_booking': {
        const b = await db.execute({
          sql: 'SELECT * FROM bookings WHERE id=?',
          args: [args.booking_id]
        });
        if (!b.rows.length) return JSON.stringify({ error: 'Booking not found' });
        if (!['PENDING','ACCEPTED'].includes(b.rows[0].status))
          return JSON.stringify({ error: `Cannot cancel — booking is ${b.rows[0].status}` });
        if (b.rows[0].customer_id !== user.id)
          return JSON.stringify({ error: 'This is not your booking' });
        await db.execute({
          sql: "UPDATE bookings SET status='CANCELLED', updated_at=CURRENT_TIMESTAMP WHERE id=?",
          args: [args.booking_id]
        });
        return JSON.stringify({ success: true, message: 'Booking cancelled successfully.' });
      }

      case 'find_workers': {
        const r = await db.execute(
          "SELECT id, name, specialization, hourly_rate, bio, availability FROM users WHERE role='worker' AND status='active'"
        );
        let rows = r.rows;
        if (args.query) {
          const q = args.query.toLowerCase();
          rows = rows.filter(w =>
            w.name.toLowerCase().includes(q) ||
            (w.specialization || '').toLowerCase().includes(q) ||
            (w.bio || '').toLowerCase().includes(q)
          );
        }
        for (const w of rows) {
          const avg = await db.execute({
            sql: 'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE worker_id=?',
            args: [w.id]
          });
          w.rating = avg.rows[0].avg ? +Number(avg.rows[0].avg).toFixed(1) : 0;
          w.review_count = avg.rows[0].count;
        }
        return JSON.stringify(rows);
      }

      case 'get_worker_profile': {
        const w = await db.execute({
          sql: "SELECT id, name, specialization, hourly_rate, bio, availability, status FROM users WHERE id=? AND role='worker'",
          args: [args.worker_id]
        });
        if (!w.rows.length) return JSON.stringify({ error: 'Worker not found' });
        const avg = await db.execute({
          sql: 'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE worker_id=?',
          args: [args.worker_id]
        });
        const revs = await db.execute({
          sql: `SELECT r.rating, r.comment, u.name as customer_name
                FROM reviews r
                JOIN users u ON r.customer_id=u.id
                WHERE r.worker_id=?
                ORDER BY r.created_at DESC
                LIMIT 5`,
          args: [args.worker_id]
        });
        return JSON.stringify({
          ...w.rows[0],
          rating: avg.rows[0].avg ? +Number(avg.rows[0].avg).toFixed(1) : 0,
          review_count: avg.rows[0].count,
          recent_reviews: revs.rows
        });
      }

      case 'accept_job': {
        const b = await db.execute({
          sql: 'SELECT * FROM bookings WHERE id=? AND worker_id=?',
          args: [args.booking_id, user.id]
        });
        if (!b.rows.length) return JSON.stringify({ error: 'Job not found or not assigned to you' });
        if (b.rows[0].status !== 'PENDING')
          return JSON.stringify({ error: `Cannot accept — status is ${b.rows[0].status}` });
        await db.execute({
          sql: "UPDATE bookings SET status='ACCEPTED', updated_at=CURRENT_TIMESTAMP WHERE id=?",
          args: [args.booking_id]
        });
        await addNotification(b.rows[0].customer_id, 'Booking Accepted', `${user.name} accepted your booking!`, 'success');
        return JSON.stringify({ success: true, message: 'Job accepted.' });
      }

      case 'reject_job': {
        const b = await db.execute({
          sql: 'SELECT * FROM bookings WHERE id=? AND worker_id=?',
          args: [args.booking_id, user.id]
        });
        if (!b.rows.length) return JSON.stringify({ error: 'Job not found or not assigned to you' });
        if (b.rows[0].status !== 'PENDING')
          return JSON.stringify({ error: `Cannot reject — status is ${b.rows[0].status}` });
        await db.execute({
          sql: "UPDATE bookings SET status='REJECTED', updated_at=CURRENT_TIMESTAMP WHERE id=?",
          args: [args.booking_id]
        });
        await addNotification(b.rows[0].customer_id, 'Booking Rejected', 'Your booking was rejected.', 'error');
        return JSON.stringify({ success: true, message: 'Job rejected.' });
      }

      case 'start_job': {
        const b = await db.execute({
          sql: 'SELECT * FROM bookings WHERE id=? AND worker_id=?',
          args: [args.booking_id, user.id]
        });
        if (!b.rows.length) return JSON.stringify({ error: 'Job not found' });
        if (b.rows[0].status !== 'ACCEPTED')
          return JSON.stringify({ error: `Cannot start — status is ${b.rows[0].status}` });
        await db.execute({
          sql: "UPDATE bookings SET status='IN_PROGRESS', updated_at=CURRENT_TIMESTAMP WHERE id=?",
          args: [args.booking_id]
        });
        await addNotification(b.rows[0].customer_id, 'Job Started', `${user.name} has started your job!`, 'info');
        return JSON.stringify({ success: true, message: 'Job started.' });
      }

      case 'complete_job': {
        const b = await db.execute({
          sql: 'SELECT * FROM bookings WHERE id=? AND worker_id=?',
          args: [args.booking_id, user.id]
        });
        if (!b.rows.length) return JSON.stringify({ error: 'Job not found' });
        if (b.rows[0].status !== 'IN_PROGRESS')
          return JSON.stringify({ error: `Cannot complete — status is ${b.rows[0].status}` });
        await db.execute({
          sql: "UPDATE bookings SET status='COMPLETED', updated_at=CURRENT_TIMESTAMP WHERE id=?",
          args: [args.booking_id]
        });
        await addNotification(b.rows[0].customer_id, 'Job Completed', `${user.name} completed your job!`, 'success');
        return JSON.stringify({ success: true, message: 'Job marked as completed.' });
      }

      case 'toggle_availability': {
        await db.execute({
          sql: 'UPDATE users SET availability=? WHERE id=?',
          args: [args.status, user.id]
        });
        return JSON.stringify({ success: true, message: `You are now ${args.status}.` });
      }

      case 'get_platform_stats': {
        const [tu, w, pw, c, tb, rev] = await Promise.all([
          db.execute('SELECT COUNT(*) as c FROM users'),
          db.execute("SELECT COUNT(*) as c FROM users WHERE role='worker' AND status='active'"),
          db.execute("SELECT COUNT(*) as c FROM users WHERE role='worker' AND status='pending'"),
          db.execute("SELECT COUNT(*) as c FROM users WHERE role='customer'"),
          db.execute('SELECT COUNT(*) as c FROM bookings'),
          db.execute("SELECT COALESCE(SUM(total_price),0) as total FROM bookings WHERE status='COMPLETED'")
        ]);
        return JSON.stringify({
          totalUsers: tu.rows[0].c,
          activeWorkers: w.rows[0].c,
          pendingWorkers: pw.rows[0].c,
          customers: c.rows[0].c,
          totalBookings: tb.rows[0].c,
          revenue: rev.rows[0].total
        });
      }

      case 'get_pending_approvals': {
        const r = await db.execute(
          "SELECT id, name, email, specialization, hourly_rate, created_at FROM users WHERE role='worker' AND status='pending' ORDER BY created_at DESC"
        );
        return JSON.stringify(r.rows);
      }

      case 'approve_worker': {
        await db.execute({
          sql: "UPDATE users SET status='active' WHERE id=? AND role='worker'",
          args: [args.user_id]
        });
        await addNotification(
          args.user_id,
          'Account Approved',
          'Your worker account has been approved! You can now receive jobs.',
          'success'
        );
        return JSON.stringify({ success: true, message: 'Worker approved.' });
      }

      default:
        return JSON.stringify({ error: 'Unknown function' });
    }
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

/* ── Result Formatter ────────────────────────────────────── */
function formatToolResult(toolName, rawJson) {
  let data;
  try { data = JSON.parse(rawJson); } catch { return rawJson; }
  
  if (data.error) return `⚠️ Error: ${data.error}`;
  if (data.success && data.message) return `✅ ${data.message}`;

  switch (toolName) {
    case 'get_services':
      if (!data.length) return "No services available right now.";
      return "Here are the available services:\n\n" + data.map(s => `**ID: ${s.id}** — ${s.icon} **${s.name}**\n${s.description}\nPrice: ₹${s.base_price} | Duration: ${s.duration_hours}h`).join('\n\n');
    case 'get_my_bookings':
      if (!data.length) return "You don't have any bookings matching this criteria yet.";
      return "Here are your bookings:\n\n" + data.map(b => `**Booking ID: #${b.id}** [${b.status}]\n${b.service_icon} ${b.service_name} • ₹${b.total_price}\nDate: ${b.scheduled_date} at ${b.scheduled_time}`).join('\n\n');
    case 'find_workers':
      if (!data.length) return "No workers currently available.";
      return "Available Workers:\n\n" + data.map(w => `**ID: ${w.id}** — ${w.name} (${w.specialization || 'General cleaning'})\n⭐ ${w.rating} (${w.review_count} reviews) | Rate: ₹${w.hourly_rate}/hr\n`).join('\n') + "\n\n*To see a full profile, type \`PROFILE <WorkerID>\`*";
    case 'get_worker_profile':
      return `**${data.name}** (${data.specialization || 'General'}) - ₹${data.hourly_rate}/hr\n⭐ ${data.rating} (${data.review_count} reviews)\nBio: ${data.bio}\nStatus: ${data.status} | Availability: ${data.availability}\n\nRecent Reviews:\n${(data.recent_reviews||[]).map(r => `> "${r.comment}" - ${r.customer_name}`).join('\n') || 'None yet.'}`;
    case 'get_platform_stats':
      return `📊 **Platform Stats**\n\nUsers: ${data.totalUsers}\nActive Workers: ${data.activeWorkers}\nPending Workers: ${data.pendingWorkers}\nCustomers: ${data.customers}\nTotal Bookings: ${data.totalBookings}\nRevenue: ₹${data.revenue}`;
    case 'get_pending_approvals':
      if (!data.length) return "No workers waiting for approval.";
      return "Pending Approvals:\n" + data.map(u => `ID ${u.id}: ${u.name} (${u.email})`).join('\n') + "\n\n*To approve a worker, type \`APPROVE <WorkerID>\`*";
    default:
      if (Array.isArray(data)) return JSON.stringify(data, null, 2);
      return data.message || "Action completed.";
  }
}

/* ── Local Chat Rule Engine (Wizard) ───────────────────────── */
async function localChatLogic(message, history, user, db, addNotification) {
  if (!user) {
    return { response: "I'm the CleanerPro Assistant! 👋 Please sign in or sign up to interact with me and book services.", actionPerformed: false };
  }

  const m = message.trim().toLowerCase();
  
  // -- EXTRACT INVISIBLE STATE --
  let state = {};
  if (history && history.length > 0) {
    const lastMsg = [...history].reverse().find(x => x.role === 'assistant');
    if (lastMsg && lastMsg.content) {
      const stateMatch = lastMsg.content.match(/<!--state:(.*?)-->/);
      if (stateMatch) {
        try { state = JSON.parse(stateMatch[1]); } catch(e) {}
      }
    }
  }

  // Handle Cancellation during wizard
  if (state.step && (m === 'cancel' || m === 'stop' || m === 'restart')) {
    return { response: "Booking Wizard cancelled. How else can I help you?", actionPerformed: false };
  }

  // ===== WIZARD STATE MACHINE =====
  if (state.step) {
    if (state.step === 'select_service') {
      const match = m.match(/^(\d+)$/);
      if (!match) return { response: "Let's try that again. Please reply with the **Numeric ID** of the service you want to book (e.g. `1`). Or type `cancel` to stop. <!--state:" + JSON.stringify(state) + "-->", actionPerformed: false };
      
      const new_state = { step: 'select_worker', service_id: Number(match[1]) };
      const resMsg = `Great, you selected Service ID #${match[1]}! \n\nNow, please reply with the **Numeric ID** of the worker you want to hire. (Unsure? Type \`workers\` to see a list) <!--state:${JSON.stringify(new_state)}-->`;
      return { response: resMsg, actionPerformed: false };
    }

    if (state.step === 'select_worker') {
      if (m === 'workers' || m === 'find a worker') {
        const raw = await executeTool('find_workers', { query: '' }, user, db, addNotification);
        return { response: `${formatToolResult('find_workers', raw)}\n\nNow, please reply with the **Numeric ID** of the worker you want to hire. <!--state:${JSON.stringify(state)}-->`, actionPerformed: false };
      }
      
      const match = m.match(/^(\d+)$/);
      if (!match) return { response: "Please reply with the exact **Numeric ID** of the worker (e.g. `2`). Or type `cancel` to stop. <!--state:" + JSON.stringify(state) + "-->", actionPerformed: false };
      
      const new_state = { ...state, step: 'enter_date', worker_id: Number(match[1]) };
      const resMsg = `Awesome. Booking Worker ID #${match[1]}!\n\nWhat **Date** would you like to schedule? (Please use \`YYYY-MM-DD\` format, e.g. \`2026-04-10\`) <!--state:${JSON.stringify(new_state)}-->`;
      return { response: resMsg, actionPerformed: false };
    }

    if (state.step === 'enter_date') {
      const match = m.match(/^(\d{4}-\d{2}-\d{2})$/);
      if (!match) return { response: "Invalid date format. Please reply exactly like \`2026-04-10\`. <!--state:" + JSON.stringify(state) + "-->", actionPerformed: false };

      const new_state = { ...state, step: 'enter_time', date: match[1] };
      const resMsg = `Got it for ${match[1]}.\n\nWhat **Time**? (Please use 24h \`HH:MM\` format, e.g. \`14:00\`) <!--state:${JSON.stringify(new_state)}-->`;
      return { response: resMsg, actionPerformed: false };
    }

    if (state.step === 'enter_time') {
      const match = m.match(/^(\d{2}:\d{2})$/);
      if (!match) return { response: "Invalid time format. Please reply exactly like \`14:00\`. <!--state:" + JSON.stringify(state) + "-->", actionPerformed: false };

      const new_state = { ...state, step: 'enter_address', time: match[1] };
      let resMsg = `Scheduled for ${match[1]}.\n\nFinally, please type the **Address** for the cleaning:`;
      if (user.address) {
        resMsg += `\n*(Or just type \`use mine\` to use your saved address: **${user.address}**)*`;
      }
      resMsg += ` <!--state:${JSON.stringify(new_state)}-->`;
      return { response: resMsg, actionPerformed: false };
    }

    if (state.step === 'enter_address') {
      if (m.length < 3) return { response: "Please provide a valid address. <!--state:" + JSON.stringify(state) + "-->", actionPerformed: false };
      
      let finalAddress = message.trim();
      if (m.includes('use mine') || m.includes('my address')) {
        if (user.address) {
          finalAddress = user.address;
        } else {
          return { response: "You don't have a saved address! Please manually type out your address below: <!--state:" + JSON.stringify(state) + "-->", actionPerformed: false };
        }
      }

      // Execute the Booking!
      const raw = await executeTool('create_booking', {
        service_id: state.service_id,
        worker_id: state.worker_id,
        scheduled_date: state.date,
        scheduled_time: state.time,
        address: finalAddress
      }, user, db, addNotification);
      
      return { response: formatToolResult('create_booking', raw), actionPerformed: true };
    }
  }

  // ===== STANDARD COMMANDS & CHIPS =====
  const exactCancel = m.match(/cancel\s+booking\s+(\d+)|cancel\s+(\d+)/);
  if (exactCancel) {
    const id = exactCancel[1] || exactCancel[2];
    const raw = await executeTool('cancel_booking', { booking_id: Number(id) }, user, db, addNotification);
    return { response: formatToolResult('cancel_booking', raw), actionPerformed: true };
  }

  const exactAccept = m.match(/accept\s+(\d+)/);
  if (exactAccept) {
    const id = exactAccept[1];
    const raw = await executeTool('accept_job', { booking_id: Number(id) }, user, db, addNotification);
    return { response: formatToolResult('accept_job', raw), actionPerformed: true };
  }

  const exactStart = m.match(/start\s+(\d+)/);
  if (exactStart) {
    const id = exactStart[1];
    const raw = await executeTool('start_job', { booking_id: Number(id) }, user, db, addNotification);
    return { response: formatToolResult('start_job', raw), actionPerformed: true };
  }

  const exactComplete = m.match(/complete\s+(\d+)/);
  if (exactComplete) {
    const id = exactComplete[1];
    const raw = await executeTool('complete_job', { booking_id: Number(id) }, user, db, addNotification);
    return { response: formatToolResult('complete_job', raw), actionPerformed: true };
  }
  
  const exactReject = m.match(/reject\s+(\d+)/);
  if (exactReject) {
    const id = exactReject[1];
    const raw = await executeTool('reject_job', { booking_id: Number(id) }, user, db, addNotification);
    return { response: formatToolResult('reject_job', raw), actionPerformed: true };
  }

  const exactApprove = m.match(/approve\s+(\d+)/);
  if (exactApprove) {
    const id = exactApprove[1];
    if (user.role !== 'admin') return { response: "You don't have admin permissions.", actionPerformed: false };
    const raw = await executeTool('approve_worker', { user_id: Number(id) }, user, db, addNotification);
    return { response: formatToolResult('approve_worker', raw), actionPerformed: true };
  }

  const exactProfile = m.match(/profile\s+(\d+)/);
  if (exactProfile) {
    const id = exactProfile[1];
    const raw = await executeTool('get_worker_profile', { worker_id: Number(id) }, user, db, addNotification);
    return { response: formatToolResult('get_worker_profile', raw), actionPerformed: false };
  }

  if (m === 'available services' || m === 'services') {
    const raw = await executeTool('get_services', {}, user, db, addNotification);
    return { response: formatToolResult('get_services', raw), actionPerformed: false };
  }
  
  if (m === 'show my bookings' || m === 'my job requests' || m === 'active jobs' || m === 'job history') {
    const raw = await executeTool('get_my_bookings', {}, user, db, addNotification);
    let extra = user.role === 'customer' 
                  ? "\n\n*To cancel a pending booking, type \`CANCEL <BookingID>\`*"
                  : "\n\n*Manage jobs by typing \`ACCEPT <ID>\`, \`REJECT <ID>\`, \`START <ID>\`, or \`COMPLETE <ID>\`*";
    const res = formatToolResult('get_my_bookings', raw);
    return { response: res.includes('Here are') ? res + extra : res, actionPerformed: false };
  }

  if (m === 'find a worker' || m === 'workers') {
    const raw = await executeTool('find_workers', { query: '' }, user, db, addNotification);
    return { response: formatToolResult('find_workers', raw), actionPerformed: false };
  }

  if (m === 'platform stats') {
    if (user.role !== 'admin') return { response: "You don't have admin permissions.", actionPerformed: false };
    const raw = await executeTool('get_platform_stats', {}, user, db, addNotification);
    return { response: formatToolResult('get_platform_stats', raw), actionPerformed: false };
  }

  if (m === 'pending approvals') {
    if (user.role !== 'admin') return { response: "You don't have admin permissions.", actionPerformed: false };
    const raw = await executeTool('get_pending_approvals', {}, user, db, addNotification);
    return { response: formatToolResult('get_pending_approvals', raw), actionPerformed: false };
  }

  if (m === 'toggle availability') {
    if (user.role !== 'worker') return { response: "Only workers can toggle availability.", actionPerformed: false };
    const newStatus = user.availability === 'online' ? 'offline' : 'online';
    const raw = await executeTool('toggle_availability', { status: newStatus }, user, db, addNotification);
    return { response: formatToolResult('toggle_availability', raw) + `\n\nYour status is now ${newStatus.toUpperCase()}.`, actionPerformed: true };
  }

  // Initiate Booking Wizard
  if (m === 'help me book' || m.includes('book')) {
    const start_state = { step: 'select_service' };
    return {
      response: `Let's book a service! \n\nPlease reply with the **Numeric ID** of the service you'd like to book. \n\n*(Unsure? Type \`services\` to see a list!)* <!--state:${JSON.stringify(start_state)}-->`,
      actionPerformed: false
    }
  }

  const isGreeting = ['hello','hi','hey','greetings'].includes(m);
  if (isGreeting) {
    return { response: `Hello ${user.name}! 👋 I am your CleanerPro automated assistant. Click one of the quick-action chips above or type "Help me book" to start the booking wizard!`, actionPerformed: false };
  }

  return { response: `I don't understand that command. 🤖 Try clicking the quick-action chips above, or type \`Help me book\` to start the interactive booking wizard!`, actionPerformed: false };
}

/* ── Export setup function ─────────────────────────────── */
module.exports = function setupAIAgent(app, db, jwtLib, jwtSecret, addNotification) {
  // Optional auth — doesn't reject if no token
  function optionalAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) { req.user = null; return next(); }
    try {
      req.user = jwtLib.verify(header.split(' ')[1], jwtSecret);
      next();
    } catch {
      req.user = null;
      next();
    }
  }

  app.post('/api/ai/chat', optionalAuth, async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) return res.status(400).json({ error: 'Message is required' });

      let user = null;
      if (req.user) {
        const uRes = await db.execute({
          sql: 'SELECT * FROM users WHERE id=?',
          args: [req.user.id]
        });
        if (uRes.rows.length > 0) {
          const { password: _, ...safe } = uRes.rows[0];
          user = safe;
        }
      }

      const result = await localChatLogic(message, history || [], user, db, addNotification);
      res.json(result);
    } catch (e) {
      console.error('Local chat error:', e);
      res.status(500).json({ error: 'Sorry, the automated assistant encountered an error. Please try again.' });
    }
  });
};
