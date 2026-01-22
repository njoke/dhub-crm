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
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    title TEXT
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    product_name TEXT,
    description TEXT
  );
`);

// --- Seeder ---
// Run this to reset DB: POST /api/seed
app.post('/api/seed', (req, res) => {
  db.exec("DELETE FROM customers; DELETE FROM deals; DELETE FROM users; DELETE FROM employees; DELETE FROM products;");
  
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

  // Create Employees
  const insertEmployee = db.prepare('INSERT INTO employees (name, email, phone, title) VALUES (?, ?, ?, ?)');
  const titles = ['Sales Manager', 'Sales Rep', 'Account Executive', 'VP of Sales', 'Customer Success Manager', 'Business Development Rep'];
  for (let i = 0; i < 20; i++) {
    insertEmployee.run(
      faker.person.fullName(),
      faker.internet.email(),
      faker.phone.number(),
      faker.helpers.arrayElement(titles)
    );
  }

  // Create Products
  const insertProduct = db.prepare('INSERT INTO products (product_name, description) VALUES (?, ?)');
  for (let i = 0; i < 15; i++) {
    insertProduct.run(
      faker.commerce.productName(),
      faker.commerce.productDescription()
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
  const { stage, company, customer_name, product, amount, created_date, closed_date, employee_name, notes } = req.body;
  
  console.log('📝 Updating deal:', req.params.id);
  console.log('📦 Received data:', req.body);
  
  // If only stage is provided, update stage only (for drag-and-drop)
  if (stage && !company && !customer_name && !product) {
    console.log('🔄 Stage-only update');
    db.prepare('UPDATE deals SET stage = ? WHERE id = ?').run(stage, req.params.id);
  } else {
    console.log('✏️ Full deal update');
    // Full update (for edit functionality)
    const updates = [];
    const params = [];
    
    if (company !== undefined) { updates.push('company = ?'); params.push(company); }
    if (customer_name !== undefined) { updates.push('customer_name = ?'); params.push(customer_name); }
    if (product !== undefined) { updates.push('product = ?'); params.push(product); }
    if (amount !== undefined) { updates.push('amount = ?'); params.push(amount); }
    if (created_date !== undefined) { updates.push('created_date = ?'); params.push(created_date); }
    if (closed_date !== undefined) { updates.push('closed_date = ?'); params.push(closed_date || null); }
    if (employee_name !== undefined) { updates.push('employee_name = ?'); params.push(employee_name); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (stage !== undefined) { updates.push('stage = ?'); params.push(stage); }
    
    console.log('📊 Updates to apply:', updates);
    console.log('📊 Parameters:', params);
    
    if (updates.length > 0) {
      params.push(req.params.id);
      const title = company && product ? `${company} - ${product}` : null;
      if (title) {
        updates.push('title = ?');
        params.push(title);
      }
      const query = `UPDATE deals SET ${updates.join(', ')} WHERE id = ?`;
      console.log('🔍 SQL Query:', query);
      db.prepare(query).run(...params);
      console.log('✅ Update executed');
    } else {
      console.log('⚠️ No updates to apply!');
    }
  }
  
  res.json({ success: true });
});

// --- Employee Routes ---
app.get('/api/employees', (req, res) => {
  const { search, sortBy, order } = req.query;
  const validColumns = ['id', 'name'];
  const sortColumn = validColumns.includes(sortBy) ? sortBy : 'id';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  const collation = sortColumn === 'name' ? 'COLLATE NOCASE' : '';
  
  let query = 'SELECT * FROM employees';
  const params = [];

  if (search) {
    query += ' WHERE name LIKE ? OR email LIKE ? OR title LIKE ?';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY ${sortColumn} ${collation} ${sortOrder}`;
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

app.post('/api/employees', (req, res) => {
  const { name, email, phone, title } = req.body;
  const info = db.prepare('INSERT INTO employees (name, email, phone, title) VALUES (?, ?, ?, ?)').run(name, email, phone, title);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/employees/:id', (req, res) => {
  const { name, email, phone, title } = req.body;
  const updates = [];
  const params = [];
  
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  
  if (updates.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }
  res.json({ success: true });
});

app.delete('/api/employees/:id', (req, res) => {
  db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- Product Routes ---
app.get('/api/products', (req, res) => {
  const { search, sortBy, order } = req.query;
  const validColumns = ['id', 'product_name'];
  const sortColumn = validColumns.includes(sortBy) ? sortBy : 'id';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  const collation = sortColumn === 'product_name' ? 'COLLATE NOCASE' : '';
  
  let query = 'SELECT * FROM products';
  const params = [];

  if (search) {
    query += ' WHERE product_name LIKE ? OR description LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY ${sortColumn} ${collation} ${sortOrder}`;
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

app.post('/api/products', (req, res) => {
  const { product_name, description } = req.body;
  const info = db.prepare('INSERT INTO products (product_name, description) VALUES (?, ?)').run(product_name, description);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/products/:id', (req, res) => {
  const { product_name, description } = req.body;
  const updates = [];
  const params = [];
  
  if (product_name !== undefined) { updates.push('product_name = ?'); params.push(product_name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  
  if (updates.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }
  res.json({ success: true });
});

app.delete('/api/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- Analytics Routes ---
app.get('/api/analytics/summary', (req, res) => {
  try {
    const allDeals = db.prepare('SELECT * FROM deals').all();
    
    // Total Sales (sum of won deals)
    const wonDeals = allDeals.filter(d => d.stage === 'won');
    const totalSales = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    
    // Win Rate (won / total closed * 100)
    const closedDeals = allDeals.filter(d => d.stage === 'won' || d.stage === 'lost');
    const winRate = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length * 100).toFixed(2) : 0;
    
    // Close Rate (closed / total * 100)
    const closeRate = allDeals.length > 0 ? (closedDeals.length / allDeals.length * 100).toFixed(2) : 0;
    
    // Pipeline Value (sum of open deals)
    const openDeals = allDeals.filter(d => d.stage === 'new' || d.stage === 'negotiation');
    const pipelineValue = openDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    
    // Open Deals count
    const openDealsCount = openDeals.length;
    
    res.json({
      totalSales,
      winRate: parseFloat(winRate),
      closeRate: parseFloat(closeRate),
      pipelineValue,
      openDeals: openDealsCount
    });
  } catch (err) {
    console.error('Error fetching analytics summary:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.get('/api/analytics/won-deals', (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const wonDeals = db.prepare('SELECT created_date, amount FROM deals WHERE stage = ?').all('won');
    
    // Group by month
    const monthlyData = {};
    const now = new Date();
    
    // Initialize last N months
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[monthKey] = { month: monthKey, count: 0, value: 0 };
    }
    
    // Aggregate deals
    wonDeals.forEach(deal => {
      if (deal.created_date) {
        const dealDate = new Date(deal.created_date);
        const monthKey = dealDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].count++;
          monthlyData[monthKey].value += deal.amount || 0;
        }
      }
    });
    
    res.json(Object.values(monthlyData));
  } catch (err) {
    console.error('Error fetching won deals:', err);
    res.status(500).json({ error: 'Failed to fetch won deals' });
  }
});

app.get('/api/analytics/pipeline-distribution', (req, res) => {
  try {
    const allDeals = db.prepare('SELECT stage FROM deals').all();
    const total = allDeals.length;
    
    const distribution = {
      new: 0,
      negotiation: 0,
      won: 0,
      lost: 0
    };
    
    allDeals.forEach(deal => {
      if (distribution[deal.stage] !== undefined) {
        distribution[deal.stage]++;
      }
    });
    
    // Calculate percentages
    const result = Object.keys(distribution).map(stage => ({
      name: stage.charAt(0).toUpperCase() + stage.slice(1),
      value: distribution[stage],
      percentage: total > 0 ? ((distribution[stage] / total) * 100).toFixed(1) : 0
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching pipeline distribution:', err);
    res.status(500).json({ error: 'Failed to fetch pipeline distribution' });
  }
});

app.listen(PORT, () => console.log(`D-Hub API running on http://localhost:${PORT}`));