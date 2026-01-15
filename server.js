const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const db = new Database('liberty.db');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-liberty';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Debug root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Database Initialization ---
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        monthly_budget REAL DEFAULT 3000
    );

    CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        target REAL,
        current REAL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        amount REAL,
        category TEXT,
        date TEXT,
        type TEXT,
        goal_id INTEGER NULL,
        is_withdrawal INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

// --- Middleware ---
const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid token' });
    }
};

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        const info = stmt.run(username, hashedPassword);
        const token = jwt.sign({ id: info.lastInsertRowid }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, username });
    } catch (err) {
        res.status(400).json({ error: 'El usuario ya existe' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, username });
});

// --- Master Code Verification ---
app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, code, password } = req.body;

    // Master code strictly required: 26122024
    if (code !== '26122024') {
        return res.status(400).json({ error: 'Código maestro incorrecto' });
    }

    let user = db.prepare('SELECT * FROM users WHERE username = ?').get(email);
    if (!user) {
        if (!password) return res.status(400).json({ error: 'Se requiere una contraseña para el primer registro' });
        const hashedPassword = await bcrypt.hash(password, 10);
        try {
            const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
            const info = stmt.run(email, hashedPassword);
            user = { id: info.lastInsertRowid, username: email };
        } catch (e) {
            return res.status(400).json({ error: 'Error al crear usuario' });
        }
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, username: user.username });
});

// --- Data Routes ---
app.get('/api/data', authenticate, (req, res) => {
    const user = db.prepare('SELECT monthly_budget FROM users WHERE id = ?').get(req.userId);
    const goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').all(req.userId);
    const expenses = db.prepare('SELECT * FROM expenses WHERE user_id = ?').all(req.userId);

    res.json({
        config: { monthlyBudget: user.monthly_budget, currency: 'USD' },
        goals: goals.map(g => ({ ...g, id: Number(g.id) })),
        expenses: expenses.map(e => ({
            ...e,
            id: Number(e.id),
            amount: Number(e.amount),
            goalId: e.goal_id ? Number(e.goal_id) : null,
            isWithdrawal: Boolean(e.is_withdrawal)
        }))
    });
});

app.post('/api/config/budget', authenticate, (req, res) => {
    const { budget } = req.body;
    db.prepare('UPDATE users SET monthly_budget = ? WHERE id = ?').run(budget, req.userId);
    res.json({ success: true });
});

app.post('/api/goals', authenticate, (req, res) => {
    const { name, target } = req.body;
    const stmt = db.prepare('INSERT INTO goals (user_id, name, target) VALUES (?, ?, ?)');
    const info = stmt.run(req.userId, name, target);
    res.json({ id: info.lastInsertRowid });
});

app.delete('/api/goals/:id', authenticate, (req, res) => {
    db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    db.prepare('DELETE FROM expenses WHERE goal_id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true });
});

app.post('/api/expenses', authenticate, (req, res) => {
    const { name, amount, category, date, type, goalId, isWithdrawal } = req.body;

    const stmt = db.prepare(`
        INSERT INTO expenses (user_id, name, amount, category, date, type, goal_id, is_withdrawal) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(req.userId, name, amount, category, date, type, goalId || null, isWithdrawal ? 1 : 0);

    if (type === 'contribution' && goalId) {
        const val = isWithdrawal ? -Math.abs(amount) : Math.abs(amount);
        db.prepare('UPDATE goals SET current = current + ? WHERE id = ?').run(val, goalId);
    }

    res.json({ id: info.lastInsertRowid });
});

app.delete('/api/expenses/:id', authenticate, (req, res) => {
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!expense) return res.status(404).json({ error: 'No encontrado' });

    if (expense.type === 'contribution' && expense.goal_id) {
        const amountToSubtract = expense.is_withdrawal ? -Math.abs(expense.amount) : Math.abs(expense.amount);
        db.prepare('UPDATE goals SET current = current - ? WHERE id = ?').run(amountToSubtract, expense.goal_id);
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Liberty Server running on port ${PORT}`);
});
