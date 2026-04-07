require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

// Connect to Turso Cloud Database
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/* ───────────────────────── Schema & Seed ───────────────────────── */
async function initializeDatabase() {
  try {
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
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Admin User','admin@cleanerpro.com',hash,'admin','555-0100','123 Admin St','👤','active',null,null,'offline',null,null,'Platform administrator'] },
      /* Workers */
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Marcus Johnson','marcus@cleanerpro.com',hash,'worker','555-0201','456 Oak Ave','👨‍🔧','active',40.7128,-74.0060,'online','House Cleaning',35,'Professional house cleaner with 8 years of experience. Meticulous attention to detail.'] },
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Sarah Williams','sarah@cleanerpro.com',hash,'worker','555-0202','789 Pine Rd','👩‍🔧','active',40.7200,-74.0000,'online','Deep Cleaning',45,'Certified deep cleaning specialist. Eco-friendly products only.'] },
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['David Chen','david@cleanerpro.com',hash,'worker','555-0203','321 Elm St','👨‍🔧','active',40.7300,-73.9950,'offline','Carpet & Windows',40,'Expert in carpet and window cleaning. Commercial grade equipment.'] },
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Emily Brown','emily@cleanerpro.com',hash,'worker','555-0204','654 Maple Dr','👩‍🔧','pending',40.7180,-74.0020,'offline','General Cleaning',30,'Eager to start! 3 years of cleaning experience.'] },
      /* Customers */
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Alice Martinez','alice@email.com',hash,'customer','555-0301','100 Broadway','👩','active',40.7150,-74.0080,null,null,null,null] },
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Robert Taylor','robert@email.com',hash,'customer','555-0302','200 5th Ave','👨','active',40.7180,-74.0020,null,null,null,null] },
      { sql: 'INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', args: ['Jessica Wilson','jessica@email.com',hash,'customer','555-0303','300 Park Ave','👩','active',40.7250,-73.9980,null,null,null,null] },
      /* Services */
      { sql: 'INSERT INTO services (name,description,base_price,duration_hours,icon,category) VALUES (?,?,?,?,?,?)', args: ['Standard House Cleaning','Complete cleaning of all rooms including dusting, vacuuming, mopping, and bathroom sanitization.',80,2,'🏠','Residential'] },
      { sql: 'INSERT INTO services (name,description,base_price,duration_hours,icon,category) VALUES (?,?,?,?,?,?)', args: ['Deep Cleaning','Intensive top-to-bottom cleaning including behind appliances, inside cabinets, and detailed scrubbing.',150,4,'✨','Residential'] },
      { sql: 'INSERT INTO services (name,description,base_price,duration_hours,icon,category) VALUES (?,?,?,?,?,?)', args: ['Carpet Cleaning','Professional steam cleaning and stain removal for all carpet types.',100,2,'🧹','Specialty'] },
      { sql: 'INSERT INTO services (name,description,base_price,duration_hours,icon,category) VALUES (?,?,?,?,?,?)', args: ['Window Washing','Interior and exterior window cleaning with streak-free finish.',60,1.5,'🪟','Specialty'] },
      /* Bookings */
      { sql: 'INSERT INTO bookings (customer_id,worker_id,service_id,status,scheduled_date,scheduled_time,address,notes,total_price) VALUES (?,?,?,?,?,?,?,?,?)', args: [6,2,1,'COMPLETED','2026-03-20','09:00','100 Broadway, New York','Please use eco-friendly products',80] },
      { sql: 'INSERT INTO bookings (customer_id,worker_id,service_id,status,scheduled_date,scheduled_time,address,notes,total_price) VALUES (?,?,?,?,?,?,?,?,?)', args: [7,3,2,'IN_PROGRESS','2026-04-06','14:00','200 5th Ave, New York','Focus on kitchen and bathrooms',150] }
    ];

    await db.batch(statements);
    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("Failed to initialize DB:", error);
  }
}

initializeDatabase();

module.exports = db;