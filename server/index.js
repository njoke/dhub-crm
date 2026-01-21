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
  CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY, name TEXT, email TEXT, status TEXT);
  CREATE TABLE IF NOT EXISTS deals (id INTEGER PRIMARY KEY, title TEXT, amount INTEGER, stage TEXT);
`);

// --- Seeder ---
// Run this to reset DB: POST /api/seed
app.post('/api/seed', (req, res) => {
  db.exec("DELETE FROM customers; DELETE FROM deals; DELETE FROM users;");
  
  // Create Test User
  const insertUser = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
  insertUser.run('admin', 'password123'); // Simple plain text for this demo

  // Create Customers
  const insertCust = db.prepare('INSERT INTO customers (name, email, status) VALUES (?, ?, ?)');
  for (let i = 0; i < 50; i++) {
    insertCust.run(faker.person.fullName(), faker.internet.email(), faker.helpers.arrayElement(['Active', 'Inactive', 'Lead']));
  }

  // Create Deals (for Drag & Drop)
  const insertDeal = db.prepare('INSERT INTO deals (title, amount, stage) VALUES (?, ?, ?)');
  const stages = ['new', 'negotiation', 'won', 'lost'];
  for (let i = 0; i < 10; i++) {
    insertDeal.run(faker.company.catchPhrase(), faker.number.int({ min: 1000, max: 50000 }), faker.helpers.arrayElement(stages));
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
  
  const rows = db.prepare('SELECT * FROM customers LIMIT ? OFFSET ?').all(limit, offset);
  const count = db.prepare('SELECT COUNT(*) as count FROM customers').get();
  
  res.json({ data: rows, total: count.count, page });
});

app.get('/api/deals', (req, res) => {
  const rows = db.prepare('SELECT * FROM deals').all();
  res.json(rows);
});

app.put('/api/deals/:id', (req, res) => {
  const { stage } = req.body;
  db.prepare('UPDATE deals SET stage = ? WHERE id = ?').run(stage, req.params.id);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`D-Hub API running on http://localhost:${PORT}`));