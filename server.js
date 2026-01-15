const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-liberty';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// --- Database Adapter (Hybrid: SQLite for Local, Postgres for Prod) ---
class DBAdapter {
    constructor() {
        this.type = process.env.DATABASE_URL ? 'postgres' : 'sqlite';
        console.log(`Starting Database in mode: ${this.type.toUpperCase()}`);

        if (this.type === 'postgres') {
            const { Pool } = require('pg');
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
        } else {
            const Database = require('better-sqlite3');
            this.sqlite = new Database('liberty.db');
        }
        this.initTables();
    }

    async query(sql, params = []) {
        if (this.type === 'postgres') {
            // Convert SQLite '?' syntax to Postgres '$1, $2' syntax
            let i = 1;
            const pgSql = sql.replace(/\?/g, () => `$${i++}`);
            const res = await this.pool.query(pgSql, params);
            return res;
        } else {
            const stmt = this.sqlite.prepare(sql);
            if (sql.trim().toLowerCase().startsWith('select')) {
                return stmt.all(params);
            } else {
                return stmt.run(params);
            }
        }
    }

    async get(sql, params = []) {
        if (this.type === 'postgres') {
            const res = await this.query(sql, params);
            return res.rows[0];
        } else {
            return this.sqlite.prepare(sql).get(params);
        }
    }

    async all(sql, params = []) {
        if (this.type === 'postgres') {
            const res = await this.query(sql, params);
            return res.rows;
        } else {
            return this.sqlite.prepare(sql).all(params);
        }
    }

    async run(sql, params = []) {
        if (this.type === 'postgres') {
            // Handle INSERT RETURNING for Postgres
            if (sql.includes('INSERT')) {
                sql += ' RETURNING id';
            }
            const res = await this.query(sql, params);
            return { lastInsertRowid: res.rows[0]?.id || 0 };
        } else {
            const stmt = this.sqlite.prepare(sql);
            return stmt.run(params);
        }
    }

    async initTables() {
        const idType = this.type === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        const textType = 'TEXT';
        const realType = 'REAL';

        await this.query(`
            CREATE TABLE IF NOT EXISTS users (
                id ${idType},
                username ${textType} UNIQUE,
                password ${textType},
                monthly_budget ${realType} DEFAULT 3000
            );
        `);

        await this.query(`
            CREATE TABLE IF NOT EXISTS goals (
                id ${idType},
                user_id INTEGER,
                name ${textType},
                target ${realType},
                current ${realType} DEFAULT 0
            );
        `);

        await this.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id ${idType},
                user_id INTEGER,
                name ${textType},
                amount ${realType},
                category ${textType},
                date ${textType},
                type ${textType},
                goal_id INTEGER NULL,
                is_withdrawal INTEGER DEFAULT 0
            );
        `);
        console.log('Tables initialized');
    }
}

const db = new DBAdapter();

// --- Debug Root Route ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, username });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Master Code Verification ---
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, code, password } = req.body;

        if (code !== '26122024') {
            return res.status(400).json({ error: 'Código maestro incorrecto' });
        }

        let user = await db.get('SELECT * FROM users WHERE username = ?', [email]);
        if (!user) {
            if (!password) return res.status(400).json({ error: 'Se requiere contraseña' });
            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [email, hashedPassword]);
            user = { id: result.lastInsertRowid, username: email };
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, username: user.username });
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: 'Error al procesar registro' });
    }
});

// --- Data Routes ---
app.get('/api/data', authenticate, async (req, res) => {
    try {
        const user = await db.get('SELECT monthly_budget FROM users WHERE id = ?', [req.userId]);
        const goals = await db.all('SELECT * FROM goals WHERE user_id = ?', [req.userId]);
        const expenses = await db.all('SELECT * FROM expenses WHERE user_id = ?', [req.userId]);

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
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/config/budget', authenticate, async (req, res) => {
    await db.run('UPDATE users SET monthly_budget = ? WHERE id = ?', [req.body.budget, req.userId]);
    res.json({ success: true });
});

app.post('/api/goals', authenticate, async (req, res) => {
    const { name, target } = req.body;
    const result = await db.run('INSERT INTO goals (user_id, name, target) VALUES (?, ?, ?)', [req.userId, name, target]);
    res.json({ id: result.lastInsertRowid });
});

app.delete('/api/goals/:id', authenticate, async (req, res) => {
    await db.run('DELETE FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    await db.run('DELETE FROM expenses WHERE goal_id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true });
});

app.post('/api/expenses', authenticate, async (req, res) => {
    const { name, amount, category, date, type, goalId, isWithdrawal } = req.body;

    const result = await db.run(
        `INSERT INTO expenses (user_id, name, amount, category, date, type, goal_id, is_withdrawal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.userId, name, amount, category, date, type, goalId || null, isWithdrawal ? 1 : 0]
    );

    if (type === 'contribution' && goalId) {
        const val = isWithdrawal ? -Math.abs(amount) : Math.abs(amount);
        await db.run('UPDATE goals SET current = current + ? WHERE id = ?', [val, goalId]);
    }

    res.json({ id: result.lastInsertRowid });
});

app.delete('/api/expenses/:id', authenticate, async (req, res) => {
    const expense = await db.get('SELECT * FROM expenses WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!expense) return res.status(404).json({ error: 'No encontrado' });

    if (expense.type === 'contribution' && expense.goal_id) {
        const amountToSubtract = expense.is_withdrawal ? -Math.abs(expense.amount) : Math.abs(expense.amount);
        await db.run('UPDATE goals SET current = current - ? WHERE id = ?', [amountToSubtract, expense.goal_id]);
    }

    await db.run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Liberty Server running on port ${PORT}`);
});
