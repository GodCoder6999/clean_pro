require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

// Connect to Turso Cloud Database or local SQLite fallback
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:cleanerpro.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

/* ───────────────────────── Schema & Seed ───────────────────────── */
async function initializeDatabase() {
  try {
    try {
      await db.execute('ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE');
    } catch (e) {
      // Column already exists or table doesn't exist yet
    }

    // 1. Create Tables using batch() — more reliable than executeMultiple with Turso
    await db.batch([
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('customer','worker','admin')),
        phone TEXT,
        address TEXT,
        avatar TEXT,
        google_id TEXT UNIQUE,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','pending','suspended')),
        latitude REAL,
        longitude REAL,
        availability TEXT DEFAULT 'offline' CHECK(availability IN ('online','offline')),
        specialization TEXT,
        hourly_rate REAL,
        bio TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        base_price REAL NOT NULL,
        duration_hours REAL,
        icon TEXT,
        category TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        worker_id INTEGER,
        service_id INTEGER NOT NULL,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','IN_PROGRESS','COMPLETED','REJECTED','CANCELLED')),
        scheduled_date TEXT,
        scheduled_time TEXT,
        address TEXT,
        notes TEXT,
        total_price REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (worker_id) REFERENCES users(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      )`,
      `CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL,
        worker_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id),
        FOREIGN KEY (customer_id) REFERENCES users(id),
        FOREIGN KEY (worker_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        method TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','completed','refunded')),
        transaction_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info' CHECK(type IN ('info','success','warning','error')),
        is_read INTEGER DEFAULT 0,
        link TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    ], "write");

    // 2. Check if seeding is needed
    const countRes = await db.execute('SELECT COUNT(*) as c FROM users');
    if (countRes.rows[0].c > 0) return; // Already seeded

    console.log("Seeding initial data...");
    const hash = bcrypt.hashSync('password123', 10);
    
    const statements = [
      /* Admin */
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Admin User','admin@cleanerpro.com',hash,'admin','9800010000','Connaught Place, New Delhi','👤','active',28.6315,77.2167,'offline',null,null,'Platform administrator'] },
      /* Workers — Indian cities */
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Rajesh Kumar','rajesh@cleanerpro.com',hash,'worker','9876543210','Andheri West, Mumbai, Maharashtra','👨‍🔧','active',19.1364,72.8296,'online','House Cleaning',500,'Professional house cleaner with 8 years of experience. Meticulous attention to detail. Serving Mumbai and surrounding areas.'] },
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Priya Sharma','priya@cleanerpro.com',hash,'worker','9876543211','Koramangala, Bangalore, Karnataka','👩‍🔧','active',12.9352,77.6245,'online','Deep Cleaning',600,'Certified deep cleaning specialist. Eco-friendly products only. Based in Bangalore.'] },
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Amit Patel','amit@cleanerpro.com',hash,'worker','9876543212','Vastrapur, Ahmedabad, Gujarat','👨‍🔧','active',23.0225,72.5714,'offline','Carpet & Windows',450,'Expert in carpet and window cleaning. Commercial grade equipment. Serving Ahmedabad.'] },
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Sneha Reddy','sneha@cleanerpro.com',hash,'worker','9876543213','Banjara Hills, Hyderabad, Telangana','👩‍🔧','pending',17.4156,78.4347,'offline','General Cleaning',400,'Eager to start! 3 years of cleaning experience. Based in Hyderabad.'] },
      /* Customers — Indian cities */
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Anita Desai','anita@email.com',hash,'customer','9988776655','Bandra West, Mumbai, Maharashtra','👩','active',19.0596,72.8295,null,null,null,null] },
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Vikram Singh','vikram@email.com',hash,'customer','9988776656','Saket, New Delhi','👨','active',28.5244,77.2066,null,null,null,null] },
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Meera Nair','meera@email.com',hash,'customer','9988776657','Indiranagar, Bangalore, Karnataka','👩','active',12.9784,77.6408,null,null,null,null] },
      /* Services — prices in INR */
      { sql: 'INSERT INTO services (name,description,base_price,duration_hours,icon,category) VALUES (?,?,?,?,?,?)', args: ['Standard House Cleaning','Complete cleaning of all rooms including dusting, vacuuming, mopping, and bathroom sanitization.',1500,2,'🏠','Residential'] },
      { sql: 'INSERT INTO services (name,description,base_price,duration_hours,icon,category) VALUES (?,?,?,?,?,?)', args: ['Deep Cleaning','Intensive top-to-bottom cleaning including behind appliances, inside cabinets, and detailed scrubbing.',3500,4,'✨','Residential'] },
      { sql: 'INSERT INTO services (name,description,base_price,duration_hours,icon,category) VALUES (?,?,?,?,?,?)', args: ['Carpet Cleaning','Professional steam cleaning and stain removal for all carpet types.',2000,2,'🧹','Specialty'] },
      { sql: 'INSERT INTO services (name,description,base_price,duration_hours,icon,category) VALUES (?,?,?,?,?,?)', args: ['Window Washing','Interior and exterior window cleaning with streak-free finish.',1000,1.5,'🪟','Specialty'] },
      /* Bookings */
      { sql: 'INSERT INTO bookings (customer_id,worker_id,service_id,status,scheduled_date,scheduled_time,address,notes,total_price) VALUES (?,?,?,?,?,?,?,?,?)', args: [6,2,1,'COMPLETED','2026-03-20','09:00','Bandra West, Mumbai, Maharashtra','Please use eco-friendly products',1500] },
      { sql: 'INSERT INTO bookings (customer_id,worker_id,service_id,status,scheduled_date,scheduled_time,address,notes,total_price) VALUES (?,?,?,?,?,?,?,?,?)', args: [7,3,2,'IN_PROGRESS','2026-04-06','14:00','Saket, New Delhi','Focus on kitchen and bathrooms',3500] }
    ];

    await db.batch(statements);
    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("Failed to initialize DB:", error);
  }
}

initializeDatabase();

module.exports = db;