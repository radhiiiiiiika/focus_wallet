import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import {
  LineChart, Line,
  PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_URL = 'http://localhost:5001/api';

const PIE_COLORS = [
  '#73FFFF', '#39A8AD', '#00666B', '#b0f5f0',
  '#0e9aab', '#1ddde8', '#004f54', '#a0e8e8',
];

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// Custom dark tooltip for all charts
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#072a2c', color: '#fff', border: '1px solid rgba(115,255,255,0.2)',
      borderRadius: 10, padding: '10px 16px', fontSize: 13,
      boxShadow: '0 4px 20px rgba(0,0,0,.5)',
    }}>
      {label && <p style={{ fontWeight: 600, marginBottom: 4, color: '#73FFFF' }}>{label}</p>}
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name.charAt(0).toUpperCase() + p.name.slice(1)}: ₹{Number(p.value).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
}

// Custom Confirm Modal for delete
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="confirm-modal scale-in" onClick={e => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn-primary" onClick={onConfirm}>Yes, Delete</button>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// Month Picker with future restriction
function MonthPickerModal({ value, onChange, onClose }) {
  const [year, setYear] = useState(parseInt(value.split('-')[0]));
  const month = parseInt(value.split('-')[1]) - 1;
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const isMonthDisabled = (y, m) => {
    if (y > currentYear) return true;
    if (y === currentYear && m > currentMonth) return true;
    return false;
  };

  const select = (m) => {
    if (isMonthDisabled(year, m)) return;
    const mm = String(m + 1).padStart(2, '0');
    onChange(`${year}-${mm}`);
    onClose();
  };

  const changeYear = (newYear) => {
    if (newYear > currentYear) return;
    setYear(newYear);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="month-picker-box scale-in" onClick={e => e.stopPropagation()}>
        <div className="month-picker-header">
          <button className="mp-arrow" onClick={() => changeYear(year - 1)} disabled={year - 1 < 2000}>‹</button>
          <input
            type="number"
            className="mp-year-input"
            value={year}
            onChange={e => changeYear(parseInt(e.target.value) || currentYear)}
            min="2000"
            max={currentYear}
            step="1"
          />
          <button className="mp-arrow" onClick={() => changeYear(year + 1)} disabled={year + 1 > currentYear}>›</button>
        </div>
        <div className="month-picker-grid">
          {MONTH_NAMES.map((name, i) => {
            const disabled = isMonthDisabled(year, i);
            return (
              <button
                key={i}
                className={`mp-month-btn ${!disabled && i === month && year === parseInt(value.split('-')[0]) ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => select(i)}
                disabled={disabled}
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Searchable Category Dropdown with inline add
function SearchableSelect({ value, onChange, options, placeholder }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="searchable-select-wrap" ref={ref}>
      <div className="searchable-select-trigger" onClick={() => setOpen(!open)}>
        <span className={selected ? '' : 'placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="cs-arrow">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="searchable-select-dropdown">
          <input
            type="text"
            className="search-input"
            placeholder="Type to search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  className={`option-item ${opt.value === value ? 'selected' : ''}`}
                  onClick={() => { onChange(opt.value); setOpen(false); setSearch(''); }}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="no-options">No matching category. Add new below.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionTable({ transactions, onConfirmDelete }) {
  if (!transactions.length) return (
    <div className="tx-empty">
      <span className="tx-empty-icon">📭</span>
      No transactions found for this period.
    </div>
  );

  return (
    <div className="table-wrap">
      <table className="tx-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th className="right">Amount</th>
            <th className="center">Action</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t.id}>
              <td data-label="Date">{t.date}</td>
              <td data-label="Description">{t.description || '—'}</td>
              <td data-label="Category">
                <span className={`chip chip-${t.type}`}>{t.category}</span>
              </td>
              <td data-label="Amount" className={`right tx-amount-${t.type}`}>
                {t.type === 'income' ? '+' : '−'} ₹{Number(t.amount).toLocaleString('en-IN')}
              </td>
              <td data-label="Action" className="center">
                <button className="btn-delete" onClick={() => onConfirmDelete(t.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, color, accent, delay }) {
  let displayValue = value;
  if (typeof value === 'number') {
    displayValue = `₹${value.toLocaleString('en-IN')}`;
  }
  return (
    <div className={`stat-card fade-up fade-up-${delay}`}>
      <div className="stat-card-accent" style={{ background: accent }} />
      <div className="stat-deco" style={{ background: accent }} />
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{displayValue}</div>
    </div>
  );
}

function HeroBalanceCard({ balance, totalIncome, totalExpense, savingsRate }) {
  return (
    <div className="hero-balance-card fade-up">
      <div className="hero-balance-left">
        <span className="hero-label">Current Balance</span>
        <span className="hero-amount">₹{balance.toLocaleString('en-IN')}</span>
        <div className="savings-progress-wrap">
          <div className="savings-progress">
            <div className="progress-bar" style={{ width: `${Math.min(savingsRate, 100)}%` }} />
          </div>
          <span className="progress-label">Savings rate {savingsRate}%</span>
        </div>
      </div>
      <div className="hero-balance-right">
        <div className="hero-stat">
          <span className="hero-stat-label">Income</span>
          <span className="hero-income">+ ₹{totalIncome.toLocaleString('en-IN')}</span>
        </div>
        <div className="hero-divider" />
        <div className="hero-stat">
          <span className="hero-stat-label">Expenses</span>
          <span className="hero-expense">− ₹{totalExpense.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}

// Add Transaction Modal with inline category creation
function AddModal({ categories, onSave, onClose, onAddCategory }) {
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [newCategoryName, setNewCategoryName] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.amount) { alert('Please enter an amount'); return; }
    if (!form.category) { alert('Please select a category'); return; }
    onSave(form);
  };

  const handleAddInlineCategory = async () => {
    if (!newCategoryName.trim()) return;
    await onAddCategory(newCategoryName.trim(), form.type);
    setNewCategoryName('');
    alert(`Category "${newCategoryName}" added. Please select it from the dropdown.`);
  };

  const filteredCats = categories.filter(c => c.type === form.type);
  const catOptions = filteredCats.map(c => ({ value: c.name, label: c.name }));

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box scale-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New Transaction</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="type-toggle">
          {['expense', 'income'].map(t => (
            <button
              key={t}
              onClick={() => { set('type', t); set('category', ''); }}
              className={`type-toggle-btn ${form.type === t ? `active-${t}` : ''}`}
            >
              {t === 'income' ? '↑ Income' : '↓ Expense'}
            </button>
          ))}
        </div>

        <input
          className="form-control"
          type="number"
          placeholder="Amount (₹)"
          value={form.amount}
          onChange={e => set('amount', e.target.value)}
        />

        <SearchableSelect
          value={form.category}
          onChange={val => set('category', val)}
          options={catOptions}
          placeholder="Select category"
        />

        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
          <input
            className="form-control-inline"
            type="text"
            placeholder="New category name"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
          />
          <button className="btn-secondary" onClick={handleAddInlineCategory} style={{ padding: '0 12px' }}>+ Add</button>
        </div>

        <input
          className="form-control"
          type="text"
          placeholder="Description (optional)"
          value={form.description}
          onChange={e => set('description', e.target.value)}
        />

        <input
          className="form-control"
          type="date"
          value={form.date}
          onChange={e => set('date', e.target.value)}
          max={today}
        />

        <div className="modal-actions">
          <button className="btn-primary" onClick={handleSave}>Save Transaction</button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'transactions', label: 'Transactions' },
];

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [tab, setTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const loadTransactions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/transactions?month=${month}`);
      setTransactions(await res.json());
    } catch (e) { console.error(e); }
  }, [month]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      setCategories(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);
  useEffect(() => { loadCategories(); }, [loadCategories]);

  const addTransaction = async (form) => {
    try {
      const res = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          date: form.date || new Date().toISOString().split('T')[0],
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setShowModal(false);
      loadTransactions();
    } catch (err) {
      alert('Failed to save transaction. Check console.');
      console.error(err);
    }
  };

  const deleteTransaction = async (id) => {
    await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
    loadTransactions();
    setConfirmDeleteId(null);
  };

  const addCategory = async (name, type) => {
    try {
      await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type }),
      });
      loadCategories(); // refresh list
    } catch (err) {
      alert('Failed to add category');
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

  const pieData = Object.entries(
    transactions.filter(t => t.type === 'expense').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const lineData = Object.values(
    transactions.reduce((acc, t) => {
      if (!acc[t.date]) acc[t.date] = { date: t.date, income: 0, expense: 0 };
      t.type === 'income' ? (acc[t.date].income += t.amount) : (acc[t.date].expense += t.amount);
      return acc;
    }, {})
  ).sort((a, b) => new Date(a.date) - new Date(b.date));

  const barData = categories
    .filter(c => c.type === 'expense')
    .map(c => ({
      name: c.name,
      amount: transactions.filter(t => t.type === 'expense' && t.category === c.name).reduce((s, t) => s + t.amount, 0),
    }))
    .filter(d => d.amount > 0);

  const displayMonth = (() => {
    const [y, m] = month.split('-');
    return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
  })();

  return (
    <div className="app-layout">
      <header className="topnav">
        <div className="topnav-brand">
          <div className="topnav-logo-mark">W</div>
          <div className="topnav-brand-text">
            <span className="topnav-name">Focus Wallet</span>
            <span className="topnav-sub">Iconic Dream Focus</span>
          </div>
        </div>
        <nav className="topnav-nav">
          {NAV.map(n => (
            <button key={n.id} className={`topnav-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="topnav-right">
          <button className="month-picker-btn" onClick={() => setShowMonthPicker(true)}>
            <span className="mp-icon">📅</span>
            <span>{displayMonth}</span>
            <span className="mp-chevron">▾</span>
          </button>
          <button className="btn-add" onClick={() => setShowModal(true)}>+ Add Transaction</button>
        </div>
      </header>

      <div className="mobile-topbar">
        <div className="topnav-brand">
          <div className="topnav-logo-mark">W</div>
          <span className="topnav-name">Focus Wallet</span>
        </div>
        <button className="month-picker-btn" onClick={() => setShowMonthPicker(true)}>
          <span className="mp-icon">📅</span>
          <span>{displayMonth}</span>
        </button>
      </div>

      <main className="main-content">
        <div className="page-header fade-up">
          <div>
            <h1 className="page-title">
              {tab === 'dashboard' ? 'Financial Overview' : 'Transactions'}
            </h1>
            <p className="page-subtitle">
              {tab === 'dashboard' ? 'Summary & insights' : `All records for ${displayMonth}`}
            </p>
          </div>
          <button className="btn-add mobile-add" onClick={() => setShowModal(true)}>+ Add</button>
        </div>

        {tab === 'dashboard' && (
          <>
            <HeroBalanceCard balance={balance} totalIncome={totalIncome} totalExpense={totalExpense} savingsRate={savingsRate} />
            <div className="stat-grid">
              <StatCard label="Total Income" value={totalIncome} color="#73FFFF" accent="#39A8AD" delay={1} />
              <StatCard label="Total Expense" value={totalExpense} color="#f87171" accent="#f87171" delay={2} />
              <StatCard label="Net Balance" value={balance} color={balance >= 0 ? '#73FFFF' : '#f87171'} accent="#73FFFF" delay={3} />
              <StatCard label="Savings Rate" value={transactions.length > 0 ? `${savingsRate}%` : '—'} color="#39A8AD" accent="#39A8AD" delay={4} />
            </div>

            <div className="charts-row fade-up fade-up-2">
              <div className="card">
                <div className="card-title">Daily Cash Flow</div>
                {lineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={lineData}>
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#73FFFF', fontSize: 11 }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis 
                        tick={{ fill: '#73FFFF', fontSize: 11 }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ color: '#94a3b8' }} />
                      <Line type="monotone" dataKey="income" name="Income" stroke="#73FFFF" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="expense" name="Expense" stroke="#f87171" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data"><span className="no-data-icon">📈</span>No data available for this month</div>
                )}
              </div>

              <div className="card">
                <div className="card-title">Expense Breakdown</div>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        label={{ fill: '#73FFFF', fontSize: 12, fontWeight: 500 }}
                      >
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend 
                        iconType="circle" 
                        iconSize={8} 
                        wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
                        formatter={(value) => <span style={{ color: '#73FFFF' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data"><span className="no-data-icon">🥧</span>No expense data yet</div>
                )}
              </div>
            </div>

            {barData.length > 0 && (
              <div className="card fade-up fade-up-2" style={{ marginBottom: 28 }}>
                <div className="card-title">Monthly Summary by Category</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} barSize={32}>
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#73FFFF', fontSize: 11 }} 
                      axisLine={false} 
                      tickLine={false}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fill: '#73FFFF', fontSize: 11 }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(115, 255, 255, 0.1)' }} />
                    <Bar dataKey="amount" name="Expense" radius={[6, 6, 0, 0]}>
                      {barData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="card fade-up fade-up-3">
              <div className="card-title">
                Recent Transactions
                <span className="card-title-link" onClick={() => setTab('transactions')}>View all →</span>
              </div>
              <TransactionTable transactions={transactions.slice(0, 6)} onConfirmDelete={setConfirmDeleteId} />
            </div>
          </>
        )}

        {tab === 'transactions' && (
          <div className="card fade-up fade-up-1">
            <div className="card-title">
              All Transactions
              <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 400 }}>{transactions.length} record{transactions.length !== 1 ? 's' : ''}</span>
            </div>
            <TransactionTable transactions={transactions} onConfirmDelete={setConfirmDeleteId} />
          </div>
        )}
      </main>

      <div className="mobile-bottom-nav">
        {NAV.map(n => (
          <button key={n.id} className={`mobile-nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
            {n.label}
          </button>
        ))}
      </div>

      {showModal && <AddModal categories={categories} onSave={addTransaction} onClose={() => setShowModal(false)} onAddCategory={addCategory} />}
      {showMonthPicker && <MonthPickerModal value={month} onChange={setMonth} onClose={() => setShowMonthPicker(false)} />}
      {confirmDeleteId && (
        <ConfirmModal
          message="Delete this transaction? This action cannot be undone."
          onConfirm={() => deleteTransaction(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}