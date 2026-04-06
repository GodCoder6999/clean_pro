const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'cleanerpro.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ───────────────────────── Schema ───────────────────────── */

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
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
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    base_price REAL NOT NULL,
    duration_hours REAL,
    icon TEXT,
    category TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
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
  );

  CREATE TABLE IF NOT EXISTS reviews (
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
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','completed','refunded')),
    transaction_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK(type IN ('info','success','warning','error')),
    is_read INTEGER DEFAULT 0,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

/* ───────────────────────── Seed ───────────────────────── */

function seed() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count > 0) return;

  const hash = bcrypt.hashSync('password123', 10);
  const insertUser = db.prepare(`
    INSERT INTO users (name,email,password,role,phone,address,avatar,status,latitude,longitude,availability,specialization,hourly_rate,bio)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  /* Admin */
  insertUser.run('Admin User','admin@cleanerpro.com',hash,'admin','555-0100','123 Admin St','👤','active',null,null,'offline',null,null,'Platform administrator');

  /* Workers (approved) */
  insertUser.run('Marcus Johnson','marcus@cleanerpro.com',hash,'worker','555-0201','456 Oak Ave','👨‍🔧','active',40.7128,-74.0060,'online','House Cleaning',35,'Professional house cleaner with 8 years of experience. Meticulous attention to detail.');
  insertUser.run('Sarah Williams','sarah@cleanerpro.com',hash,'worker','555-0202','789 Pine Rd','👩‍🔧','active',40.7200,-74.0000,'online','Deep Cleaning',45,'Certified deep cleaning specialist. Eco-friendly products only.');
  insertUser.run('David Chen','david@cleanerpro.com',hash,'worker','555-0203','321 Elm St','👨‍🔧','active',40.7300,-73.9950,'offline','Carpet & Windows',40,'Expert in carpet and window cleaning. Commercial grade equipment.');

  /* Worker (pending approval) */
  insertUser.run('Emily Brown','emily@cleanerpro.com',hash,'worker','555-0204','654 Maple Dr','👩‍🔧','pending',40.7180,-74.0020,'offline','General Cleaning',30,'Eager to start! 3 years of cleaning experience.');

  /* Customers */
  insertUser.run('Alice Martinez','alice@email.com',hash,'customer','555-0301','100 Broadway','👩','active',40.7150,-74.0080,null,null,null,null);
  insertUser.run('Robert Taylor','robert@email.com',hash,'customer','555-0302','200 5th Ave','👨','active',40.7180,-74.0020,null,null,null,null);
  insertUser.run('Jessica Wilson','jessica@email.com',hash,'customer','555-0303','300 Park Ave','👩','active',40.7250,-73.9980,null,null,null,null);

  /* Services */
  const insertService = db.prepare(`
    INSERT INTO services (name,description,base_price,duration_hours,icon,category)
    VALUES (?,?,?,?,?,?)
  `);
  insertService.run('Standard House Cleaning','Complete cleaning of all rooms including dusting, vacuuming, mopping, and bathroom sanitization.',80,2,'🏠','Residential');
  insertService.run('Deep Cleaning','Intensive top-to-bottom cleaning including behind appliances, inside cabinets, and detailed scrubbing.',150,4,'✨','Residential');
  insertService.run('Carpet Cleaning','Professional steam cleaning and stain removal for all carpet types.',100,2,'🧹','Specialty');
  insertService.run('Window Washing','Interior and exterior window cleaning with streak-free finish.',60,1.5,'🪟','Specialty');
  insertService.run('Move-in/Move-out Cleaning','Comprehensive cleaning for property transitions including all surfaces and fixtures.',200,5,'📦','Residential');
  insertService.run('Office Cleaning','Professional workspace cleaning including desks, floors, restrooms, and common areas.',120,3,'🏢','Commercial');
  insertService.run('Post-Construction Cleanup','Removal of dust, debris, and residues after renovation or construction work.',250,6,'🔨','Specialty');
  insertService.run('Laundry & Ironing','Wash, dry, fold, and iron service for household laundry.',50,2,'👕','Add-on');

  /* Bookings */
  const insertBooking = db.prepare(`
    INSERT INTO bookings (customer_id,worker_id,service_id,status,scheduled_date,scheduled_time,address,notes,total_price,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);
  insertBooking.run(6,2,1,'COMPLETED','2026-03-20','09:00','100 Broadway, New York','Please use eco-friendly products',80,'2026-03-18 10:00:00','2026-03-20 11:30:00');
  insertBooking.run(7,3,2,'IN_PROGRESS','2026-04-06','14:00','200 5th Ave, New York','Focus on kitchen and bathrooms',150,'2026-04-04 09:00:00','2026-04-06 14:00:00');
  insertBooking.run(6,4,4,'ACCEPTED','2026-04-10','10:00','100 Broadway, New York','12 windows total',60,'2026-04-05 16:00:00','2026-04-05 18:00:00');
  insertBooking.run(8,2,3,'PENDING','2026-04-12','11:00','300 Park Ave, New York','Living room carpet only',100,'2026-04-06 08:00:00','2026-04-06 08:00:00');
  insertBooking.run(7,4,5,'CANCELLED','2026-04-01','09:00','200 5th Ave, New York','Moving next month',200,'2026-03-25 12:00:00','2026-03-28 10:00:00');
  insertBooking.run(6,3,6,'COMPLETED','2026-03-15','08:00','100 Broadway, Suite 5','Weekly office cleaning',120,'2026-03-13 14:00:00','2026-03-15 11:00:00');

  /* Reviews */
  const insertReview = db.prepare(`
    INSERT INTO reviews (booking_id,customer_id,worker_id,rating,comment,created_at)
    VALUES (?,?,?,?,?,?)
  `);
  insertReview.run(1,6,2,5,'Marcus did an outstanding job! Every surface was spotless and he was very professional. Highly recommend!','2026-03-20 12:00:00');
  insertReview.run(6,6,3,4,'Sarah was thorough and efficient. The office looks great. Would book again.','2026-03-15 12:00:00');

  /* Payments */
  const insertPayment = db.prepare(`
    INSERT INTO payments (booking_id,amount,method,status,transaction_id,created_at)
    VALUES (?,?,?,?,?,?)
  `);
  insertPayment.run(1,80,'Credit Card','completed','TXN-20260320-001','2026-03-20 12:00:00');
  insertPayment.run(6,120,'Credit Card','completed','TXN-20260315-002','2026-03-15 12:00:00');
  insertPayment.run(2,150,'Credit Card','pending','TXN-20260406-003','2026-04-04 09:30:00');

  /* Notifications */
  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id,title,message,type,is_read,link,created_at)
    VALUES (?,?,?,?,?,?,?)
  `);
  // Customer notifications
  insertNotif.run(6,'Booking Completed','Your house cleaning with Marcus has been completed!','success',1,null,'2026-03-20 11:30:00');
  insertNotif.run(6,'Booking Accepted','David has accepted your window washing booking.','success',0,null,'2026-04-05 18:00:00');
  insertNotif.run(7,'Job In Progress','Sarah has started your deep cleaning.','info',0,null,'2026-04-06 14:00:00');
  insertNotif.run(8,'New Booking','Your carpet cleaning booking has been submitted.','info',0,null,'2026-04-06 08:00:00');
  // Worker notifications
  insertNotif.run(2,'New Job Request','You have a new carpet cleaning request from Jessica.','info',0,null,'2026-04-06 08:00:00');
  insertNotif.run(4,'Booking Cancelled','Robert has cancelled the move-in/move-out cleaning.','warning',1,null,'2026-03-28 10:00:00');
  // Admin notifications
  insertNotif.run(1,'New Worker Registration','Emily Brown has registered and is awaiting approval.','info',0,null,'2026-04-05 09:00:00');
}

seed();
module.exports = db;
