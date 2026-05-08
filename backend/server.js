const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./finance.db', (err) => {
  if (err) console.error('DB connection error:', err.message);
  else console.log('Connected to SQLite database.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT CHECK(type IN ('income','expense')) NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error('Categories table error:', err.message);
      return;
    }

    const allCategories = [
  // Income (sorted A-Z)
  { name: 'Bonus', type: 'income' },
  { name: 'Business Income', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Gifts Received', type: 'income' },
  { name: 'Interest', type: 'income' },
  { name: 'Investment', type: 'income' },
  { name: 'Other Income', type: 'income' },
  { name: 'Refunds', type: 'income' },
  { name: 'Rental Income', type: 'income' },
  { name: 'Salary', type: 'income' },

  // Expense (sorted A-Z)
  { name: 'Airfare', type: 'expense' },
  { name: 'Alcohol', type: 'expense' },
  { name: 'Auto Insurance', type: 'expense' },
  { name: 'Brokerage', type: 'expense' },
  { name: 'Cafes', type: 'expense' },               // new
  { name: 'Car Payment', type: 'expense' },
  { name: 'Cleaning Services', type: 'expense' },
  { name: 'Clothing', type: 'expense' },
  { name: 'Co-pays', type: 'expense' },
  { name: 'Coffee Shops', type: 'expense' },
  { name: 'Concerts', type: 'expense' },
  { name: 'Cosmetics', type: 'expense' },
  { name: 'Credit Card Payment', type: 'expense' },
  { name: 'Daycare', type: 'expense' },
  { name: 'Dining Out', type: 'expense' },
  { name: 'Donations', type: 'expense' },
  { name: 'Electricity', type: 'expense' },
  { name: 'Electronics', type: 'expense' },
  { name: 'Emergency Fund', type: 'expense' },
  { name: 'Fuel', type: 'expense' },
  { name: 'Gardening', type: 'expense' },
  { name: 'Gas', type: 'expense' },
  { name: 'General Savings', type: 'expense' },
  { name: 'Gifts', type: 'expense' },
  { name: 'Groceries', type: 'expense' },
  { name: 'Gym Membership', type: 'expense' },
  { name: 'Haircuts', type: 'expense' },
  { name: 'Hobbies', type: 'expense' },
  { name: 'Home Insurance', type: 'expense' },
  { name: 'Home Maintenance', type: 'expense' },
  { name: 'Hotels', type: 'expense' },
  { name: 'IRA', type: 'expense' },
  { name: 'Internet', type: 'expense' },
  { name: 'Movies', type: 'expense' },
  { name: 'Parking', type: 'expense' },
  { name: 'Personal Loan', type: 'expense' },
  { name: 'Phone', type: 'expense' },
  { name: 'Prescriptions', type: 'expense' },
  { name: 'Property Tax', type: 'expense' },
  { name: 'Public Transit', type: 'expense' },
  { name: 'Rent/Mortgage', type: 'expense' },
  { name: 'Retirement 401k', type: 'expense' },
  { name: 'Salon Services', type: 'expense' },
  { name: 'Streaming Subscriptions', type: 'expense' },
  { name: 'Student Loan', type: 'expense' },
  { name: 'Toiletries', type: 'expense' },
  { name: 'Travel', type: 'expense' },
  { name: 'Tuition', type: 'expense' },
  { name: 'Uber/Rideshare', type: 'expense' },
  { name: 'Water', type: 'expense' }
];

    const stmt = db.prepare(`INSERT OR IGNORE INTO categories (name, type) VALUES (?, ?)`);
    allCategories.forEach(c => stmt.run(c.name, c.type));
    stmt.finalize();
    console.log('Categories seeded.');
  });
});

app.get('/api/transactions', (req, res) => {
  const { month } = req.query;
  let sql = `SELECT * FROM transactions`;
  let params = [];
  if (month) {
    sql += ` WHERE strftime('%Y-%m', date) = ?`;
    params.push(month);
  }
  sql += ` ORDER BY date DESC, id DESC`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/transactions', (req, res) => {
  const { type, amount, category, description, date } = req.body;
  if (!type || !amount || !category) {
    return res.status(400).json({ error: 'type, amount and category are required' });
  }
  const today = new Date().toISOString().split('T')[0];
  db.run(
    `INSERT INTO transactions (type, amount, category, description, date) VALUES (?,?,?,?,?)`,
    [type, parseFloat(amount), category, description || '', date || today],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Transaction added' });
    }
  );
});

app.delete('/api/transactions/:id', (req, res) => {
  db.run(`DELETE FROM transactions WHERE id = ?`, req.params.id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Deleted successfully' });
  });
});

app.get('/api/categories', (req, res) => {
  db.all(`SELECT * FROM categories ORDER BY type, name`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/categories', (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  db.run(`INSERT INTO categories (name, type) VALUES (?,?)`, [name.trim(), type], function (err) {
    if (err) return res.status(409).json({ error: 'Category already exists' });
    res.status(201).json({ id: this.lastID, message: 'Category added' });
  });
});

app.delete('/api/categories/:id', (req, res) => {
  db.run(`DELETE FROM categories WHERE id = ?`, req.params.id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Category deleted' });
  });
});

app.get('/api/summary', (req, res) => {
  const { month } = req.query;
  const where = month ? `WHERE strftime('%Y-%m', date) = '${month}'` : '';
  db.all(
    `SELECT type, SUM(amount) as total FROM transactions ${where} GROUP BY type`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const income = rows.find(r => r.type === 'income')?.total || 0;
      const expense = rows.find(r => r.type === 'expense')?.total || 0;
      res.json({ income, expense, balance: income - expense });
    }
  );
});

app.listen(PORT, () => {
  console.log(`\n  WealthCheck API running at http://localhost:${PORT}\n`);
});