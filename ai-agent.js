/* ═══════════════════════════════════════════════════════════
   CleanerPro AI Agent — Groq + Llama 3.3 70B with Tool Calling
   ═══════════════════════════════════════════════════════════ */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/* ── System Prompt ─────────────────────────────────────── */
function buildSystemPrompt(user) {
  let p = `You are CleanerPro AI 🤖, the intelligent assistant for CleanerPro — India's premier home cleaning services platform. You are warm, helpful, professional, and concise.

## Platform Knowledge
- CleanerPro connects customers with vetted, professional cleaning workers across India.
- All prices are in Indian Rupees (₹).
- The booking lifecycle: PENDING → ACCEPTED → IN_PROGRESS → COMPLETED (also REJECTED, CANCELLED).
- It's FREE to sign up for both customers and workers.
- Workers go through admin approval before receiving jobs.
- Customers can cancel bookings in PENDING or ACCEPTED status.
- Workers set their own hourly rates and availability (online/offline).
- Payment methods: Credit Card, Debit Card, UPI, PayPal.

## Behavior Rules
- Use tools to fetch REAL data — NEVER make up booking IDs, prices, or worker names.
- Keep responses concise (2-4 sentences for simple queries, more for complex ones).
- Use emojis sparingly for warmth.
- Format prices as ₹X,XXX.
- If a user asks something outside the platform scope, politely redirect.
- IMPORTANT: When you use a tool and get results, present them in a user-friendly manner, do NOT dump raw JSON.

## ⚠️ CRITICAL BOOKING RULES — FOLLOW STRICTLY ⚠️

Creating a booking MUST follow this exact multi-step flow. NEVER skip steps or combine them.

### Step 1 — Confirm the service
- Call get_services to fetch available services.
- Present them clearly with name, price, and duration.
- Ask the user: "Which service would you like to book?"
- WAIT for the user to explicitly choose a service by name or number before proceeding.

### Step 2 — Find available workers
- Only after the user has chosen a service, call find_workers to fetch nearby available workers.
- Present each worker with: name, specialization, rating, and hourly rate.
- Ask the user: "Which worker would you like? You can also ask me to show details about any worker."
- If the user asks for details about a worker, call get_worker_profile and show their full profile including bio and reviews.
- WAIT for the user to explicitly choose a worker before proceeding.

### Step 3 — Collect booking details
- Only after service AND worker are chosen, ask for:
  1. Preferred date (YYYY-MM-DD)
  2. Preferred time (HH:MM, 24h)
  3. Service address (pre-fill with user's address if available but confirm it)
  4. Any special notes or instructions (optional)
- WAIT for the user to provide all required details.

### Step 4 — Confirm and create
- Summarize the full booking details:
  • Service: [name] — ₹[price]
  • Worker: [name] — ₹[hourly_rate]/hr
  • Date & Time: [date] at [time]
  • Address: [address]
  • Notes: [notes or "None"]
  • Total Amount: ₹[base_price from service]
- Ask: "Shall I confirm this booking?" and WAIT for explicit confirmation ("yes", "confirm", "book it", etc.).
- Only call create_booking AFTER the user says yes.
- Pass total_price as the service's base_price.

### ABSOLUTE RULES:
- NEVER call create_booking unless ALL of these are confirmed by the user: service_id, worker_id, scheduled_date, scheduled_time, address, AND the user has said "yes" or "confirm".
- NEVER assume or guess a service or worker — the user must explicitly choose.
- NEVER create a booking in one shot from a vague request like "book a cleaning" — always go through the steps.
- If the user says "book a cleaning" or similar, start from Step 1.`;

  if (user) {
    p += `\n\n## Current User\n- Name: ${user.name}\n- Role: ${user.role}\n- Status: ${user.status}`;
    if (user.role === 'worker') {
      p += `\n- Availability: ${user.availability}\n- Specialization: ${user.specialization || 'Not set'}\n- Rate: ₹${user.hourly_rate || 'Not set'}/hr`;
      if (user.status === 'pending') p += `\n⚠️ Account is PENDING admin approval. Cannot accept jobs yet.`;
    }
    if (user.address) p += `\n- Saved Address: ${user.address}`;
    p += `\n\nPersonalize responses for ${user.name} (${user.role}).`;
  } else {
    p += `\n\n## Context\nUser is NOT logged in (guest). Only answer questions. Guide them to sign up. Do NOT call any tools.`;
  }
  return p;
}

/* ── Tool Definitions ──────────────────────────────────── */
const TOOLS = [
  {
    name: 'get_services',
    desc: 'Get all available cleaning services with prices and duration. Call this FIRST when a user wants to book.',
    params: {},
    roles: ['customer','worker','admin']
  },
  {
    name: 'get_my_bookings',
    desc: 'Get current user bookings with status, service, and assigned person info',
    params: {},
    roles: ['customer','worker']
  },
  {
    name: 'get_booking_details',
    desc: 'Get full details of a specific booking',
    params: {
      booking_id: { type: 'integer', description: 'Booking ID number' }
    },
    req: ['booking_id'],
    roles: ['customer','worker','admin']
  },
  {
    name: 'create_booking',
    desc: `Create a new cleaning service booking. 
IMPORTANT: Only call this tool after ALL of the following have been explicitly confirmed by the user:
1. service_id (user chose a specific service)
2. worker_id (user chose a specific worker)
3. scheduled_date in YYYY-MM-DD format
4. scheduled_time in HH:MM 24h format
5. address (confirmed by user)
6. User has said "yes" or "confirm" to the booking summary.
The total_price should be set to the service's base_price.`,
    params: {
      service_id: { type: 'integer', description: 'Service ID — must be chosen by user' },
      worker_id: { type: 'integer', description: 'Worker ID — must be chosen by user' },
      scheduled_date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
      scheduled_time: { type: 'string', description: 'Time in HH:MM 24h format' },
      address: { type: 'string', description: 'Service address confirmed by user' },
      notes: { type: 'string', description: 'Optional special instructions' },
      total_price: { type: 'number', description: 'Total price — use the service base_price' }
    },
    req: ['service_id', 'worker_id', 'scheduled_date', 'scheduled_time', 'address'],
    roles: ['customer']
  },
  {
    name: 'cancel_booking',
    desc: 'Cancel a PENDING or ACCEPTED booking',
    params: {
      booking_id: { type: 'integer', description: 'Booking ID to cancel' }
    },
    req: ['booking_id'],
    roles: ['customer']
  },
  {
    name: 'find_workers',
    desc: 'Search available workers by name or specialization. Call this AFTER the user has chosen a service, to show who can do the job.',
    params: {
      query: { type: 'string', description: 'Optional search term (e.g. specialization or name)' }
    },
    roles: ['customer']
  },
  {
    name: 'get_worker_profile',
    desc: 'Get a worker\'s full profile including rating, bio, and recent reviews. Call this when a user asks for more details about a specific worker.',
    params: {
      worker_id: { type: 'integer', description: 'Worker user ID' }
    },
    req: ['worker_id'],
    roles: ['customer','admin']
  },
  {
    name: 'accept_job',
    desc: 'Accept a pending job request',
    params: { booking_id: { type: 'integer', description: 'Booking ID' } },
    req: ['booking_id'],
    roles: ['worker']
  },
  {
    name: 'reject_job',
    desc: 'Reject a pending job request',
    params: { booking_id: { type: 'integer', description: 'Booking ID' } },
    req: ['booking_id'],
    roles: ['worker']
  },
  {
    name: 'start_job',
    desc: 'Start an accepted job (set to IN_PROGRESS)',
    params: { booking_id: { type: 'integer', description: 'Booking ID' } },
    req: ['booking_id'],
    roles: ['worker']
  },
  {
    name: 'complete_job',
    desc: 'Mark a job as completed',
    params: { booking_id: { type: 'integer', description: 'Booking ID' } },
    req: ['booking_id'],
    roles: ['worker']
  },
  {
    name: 'toggle_availability',
    desc: 'Set worker online/offline status',
    params: {
      status: { type: 'string', enum: ['online','offline'], description: 'Availability status' }
    },
    req: ['status'],
    roles: ['worker']
  },
  {
    name: 'get_platform_stats',
    desc: 'Get platform-wide statistics (users, bookings, revenue)',
    params: {},
    roles: ['admin']
  },
  {
    name: 'get_pending_approvals',
    desc: 'List workers awaiting admin approval',
    params: {},
    roles: ['admin']
  },
  {
    name: 'approve_worker',
    desc: 'Approve a pending worker registration',
    params: { user_id: { type: 'integer', description: 'Worker user ID to approve' } },
    req: ['user_id'],
    roles: ['admin']
  },
  {
    name: 'get_notifications',
    desc: 'Get recent notifications for current user',
    params: {},
    roles: ['customer','worker','admin']
  },
  {
    name: 'get_all_bookings',
    desc: 'Get all platform bookings (admin)',
    params: { status: { type: 'string', description: 'Optional status filter' } },
    roles: ['admin']
  },
  {
    name: 'get_all_users',
    desc: 'Get all registered users (admin)',
    params: { role: { type: 'string', description: 'Optional role filter' } },
    roles: ['admin']
  },
];

function getToolsForRole(role) {
  if (!role) return [];
  return TOOLS.filter(t => t.roles.includes(role)).map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.desc,
      parameters: {
        type: 'object',
        properties: t.params || {},
        required: t.req || []
      }
    }
  }));
}

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

      case 'get_booking_details': {
        const r = await db.execute({
          sql: `SELECT b.*, s.name as service_name, s.icon as service_icon, s.base_price,
                  w.name as worker_name, c.name as customer_name
                FROM bookings b
                JOIN services s ON b.service_id=s.id
                LEFT JOIN users w ON b.worker_id=w.id
                JOIN users c ON b.customer_id=c.id
                WHERE b.id=?`,
          args: [args.booking_id]
        });
        if (!r.rows.length) return JSON.stringify({ error: 'Booking not found' });
        return JSON.stringify(r.rows[0]);
      }

      case 'create_booking': {
        // Final safety guard: ensure worker_id and service_id are present
        if (!args.worker_id || !args.service_id) {
          return JSON.stringify({
            error: 'Cannot create booking — both a service and a worker must be selected by the user first.'
          });
        }
        if (!args.scheduled_date || !args.scheduled_time || !args.address) {
          return JSON.stringify({
            error: 'Cannot create booking — date, time, and address are required.'
          });
        }

        // Fetch service to get correct price
        const svcRes = await db.execute({
          sql: 'SELECT id, name, base_price FROM services WHERE id=? AND active=1',
          args: [args.service_id]
        });
        if (!svcRes.rows.length) {
          return JSON.stringify({ error: 'Selected service not found or inactive.' });
        }
        const service = svcRes.rows[0];

        // Validate worker exists and is active/online
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

        // Notify the worker
        await addNotification(
          args.worker_id,
          'New Job Request',
          `${user.name} booked ${service.name} via AI assistant.`,
          'info'
        );
        // Notify the customer
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
        // Attach ratings
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
          db.execute("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status='completed'")
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

      case 'get_notifications': {
        const r = await db.execute({
          sql: 'SELECT title, message, type, is_read, created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 10',
          args: [user.id]
        });
        return JSON.stringify(r.rows);
      }

      case 'get_all_bookings': {
        let sql = `SELECT b.id, b.status, b.scheduled_date, b.total_price,
                    s.name as service_name,
                    c.name as customer_name,
                    w.name as worker_name
                  FROM bookings b
                  JOIN services s ON b.service_id=s.id
                  JOIN users c ON b.customer_id=c.id
                  LEFT JOIN users w ON b.worker_id=w.id`;
        const p = [];
        if (args.status) { sql += ' WHERE b.status=?'; p.push(args.status); }
        sql += ' ORDER BY b.created_at DESC LIMIT 20';
        const r = await db.execute({ sql, args: p });
        return JSON.stringify(r.rows);
      }

      case 'get_all_users': {
        let sql = 'SELECT id, name, email, role, status, created_at FROM users';
        const p = [];
        if (args.role) { sql += ' WHERE role=?'; p.push(args.role); }
        sql += ' ORDER BY created_at DESC LIMIT 20';
        const r = await db.execute({ sql, args: p });
        return JSON.stringify(r.rows);
      }

      default:
        return JSON.stringify({ error: 'Unknown function' });
    }
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

/* ── Chat with Groq ────────────────────────────────────── */
async function chatWithGroq(message, history, user, db, addNotification) {
  const systemPrompt = buildSystemPrompt(user);
  const tools = getToolsForRole(user?.role);
  const msgs = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-14),
    { role: 'user', content: message }
  ];

  let actionPerformed = false;
  let iterations = 0;

  while (iterations < 5) {
    iterations++;
    const body = {
      model: GROQ_MODEL,
      messages: msgs,
      temperature: 0.4,   // Lower temp for more predictable step-following
      max_tokens: 1024
    };
    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Groq API error:', err);
      throw new Error('AI service unavailable');
    }

    const data = await res.json();
    const choice = data.choices[0];

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      msgs.push(choice.message);
      for (const tc of choice.message.tool_calls) {
        let fnArgs = {};
        try { fnArgs = JSON.parse(tc.function.arguments || '{}'); } catch {}

        const result = await executeTool(tc.function.name, fnArgs, user, db, addNotification);
        msgs.push({ role: 'tool', tool_call_id: tc.id, content: result });

        const actionTools = [
          'create_booking', 'cancel_booking',
          'accept_job', 'reject_job', 'start_job', 'complete_job',
          'toggle_availability', 'approve_worker'
        ];
        if (actionTools.includes(tc.function.name)) actionPerformed = true;
      }
    } else {
      return {
        response: choice.message.content || "I'm sorry, I couldn't generate a response.",
        actionPerformed
      };
    }
  }

  return {
    response: "I completed the request, but please check your dashboard for the latest updates.",
    actionPerformed
  };
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
      if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'AI agent not configured (missing API key)' });
      }
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

      const result = await chatWithGroq(message, history || [], user, db, addNotification);
      res.json(result);
    } catch (e) {
      console.error('AI chat error:', e);
      res.status(500).json({ error: 'Sorry, the AI is temporarily unavailable. Please try again.' });
    }
  });
};
