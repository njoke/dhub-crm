const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const { faker } = require('@faker-js/faker');

const app = express();
const db = new Database('database.sqlite');
const PORT = 3001;
const SECRET = 'playwright-test-secret';

app.use(cors());
app.use(express.json());

// --- Database Setup ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT);
  CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY, name TEXT, email TEXT, status TEXT, phone TEXT, company TEXT);
  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY, 
    title TEXT, 
    amount INTEGER, 
    stage TEXT, 
    currency TEXT DEFAULT 'USD', 
    customer_id INTEGER,
    company TEXT,
    customer_name TEXT,
    product TEXT,
    created_date TEXT,
    closed_date TEXT,
    employee_name TEXT,
    notes TEXT
  );
`);

// --- Seeder ---
// Run this to reset DB: POST /api/seed
app.post('/api/seed', (req, res) => {
  db.exec("DELETE FROM customers; DELETE FROM deals; DELETE FROM users;");
  
  // Create Test User
  const insertUser = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
  insertUser.run('admin', 'password123'); // Simple plain text for this demo

  // Create Customers
  const insertCust = db.prepare('INSERT INTO customers (name, email, status, phone, company) VALUES (?, ?, ?, ?, ?)');
  for (let i = 0; i < 50; i++) {
    insertCust.run(
      faker.person.fullName(), 
      faker.internet.email(), 
      faker.helpers.arrayElement(['Active', 'Inactive', 'Lead']),
      faker.phone.number(),
      faker.company.name()
    );
  }

  // Create Deals (for Drag & Drop)
  const insertDeal = db.prepare('INSERT INTO deals (title, amount, stage, company, customer_name, product, created_date, closed_date, employee_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const stages = ['new', 'negotiation', 'won', 'lost'];
  for (let i = 0; i < 10; i++) {
    insertDeal.run(
      faker.company.catchPhrase(), 
      faker.number.int({ min: 1000, max: 50000 }), 
      faker.helpers.arrayElement(stages),
      faker.company.name(),
      faker.person.fullName(),
      faker.commerce.productName(),
      faker.date.past().toISOString().split('T')[0],
      faker.date.future().toISOString().split('T')[0],
      faker.person.fullName(),
      faker.lorem.sentence()
    );
  }
  
  res.json({ message: 'Database seeded!' });
});

// --- Auth Routes ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
  
  if (user) {
    const token = jwt.sign({ id: user.id }, SECRET);
    // Intentional delay to test Playwright 'waitFor' mechanisms
    setTimeout(() => res.json({ token }), 500); 
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// --- Data Routes ---
app.get('/api/customers', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  // Sorting logic
  const { sortBy, order, search } = req.query;
  const validColumns = ['id', 'name', 'company', 'status'];
  const sortColumn = validColumns.includes(sortBy) ? sortBy : 'id';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  // Use COLLATE NOCASE for text columns to ensure "Antone" and "zeus" sort correctly
  const collation = ['name', 'company', 'status'].includes(sortColumn) ? 'COLLATE NOCASE' : '';
  
  let query = 'SELECT * FROM customers';
  let countQuery = 'SELECT COUNT(*) as count FROM customers';
  const params = [];
  const searchParams = [];

  if (search) {
    const whereClause = ' WHERE name LIKE ? OR company LIKE ?';
    query += whereClause;
    countQuery += whereClause;
    searchParams.push(`%${search}%`, `%${search}%`);
  }

  // Combine params: search params first (WHERE), then limit/offset
  query += ` ORDER BY ${sortColumn} ${collation} ${sortOrder} LIMIT ? OFFSET ?`;
  
  const rows = db.prepare(query).all(...searchParams, limit, offset);
  const count = db.prepare(countQuery).get(...searchParams);
  
  res.json({ data: rows, total: count.count, page });
});

app.post('/api/customers', (req, res) => {
  const { name, email, status, phone, company } = req.body;
  const info = db.prepare('INSERT INTO customers (name, email, status, phone, company) VALUES (?, ?, ?, ?, ?)').run(name, email, status, phone, company);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/customers/:id', (req, res) => {
  const { name, email, status, phone, company } = req.body;
  // Dynamic update query
  const updates = [];
  const params = [];
  if (name) { updates.push('name = ?'); params.push(name); }
  if (email) { updates.push('email = ?'); params.push(email); }
  if (status) { updates.push('status = ?'); params.push(status); }
  if (phone) { updates.push('phone = ?'); params.push(phone); }
  if (company) { updates.push('company = ?'); params.push(company); }
  
  if (updates.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }
  res.json({ success: true });
});

app.delete('/api/customers/:id', (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/deals', (req, res) => {
  const rows = db.prepare('SELECT * FROM deals').all();
  res.json(rows);
});

app.post('/api/deals', (req, res) => {
  const { company, customer_name, product, amount, created_date, closed_date, employee_name, notes } = req.body;
  const stage = 'new'; // Default stage
  const info = db.prepare('INSERT INTO deals (title, amount, stage, company, customer_name, product, created_date, closed_date, employee_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(`${company} - ${product}`, amount, stage, company, customer_name, product, created_date, closed_date, employee_name, notes);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/deals/:id', (req, res) => {
  const { stage } = req.body;
  db.prepare('UPDATE deals SET stage = ? WHERE id = ?').run(stage, req.params.id);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`D-Hub API running on http://localhost:${PORT}`));