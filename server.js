const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuración de Nodemailer (se usarán variables de entorno)
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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

    CREATE TABLE IF NOT EXISTS otps (
        email TEXT PRIMARY KEY,
        code TEXT,
        expires_at DATETIME
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
        const token = jwt.sign({ id: info.lastInsertRowid }, JWT_SECRET);
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

// --- OTP Routes ---
app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 min

    try {
        db.prepare('INSERT OR REPLACE INTO otps (email, code, expires_at) VALUES (?, ?, ?)').run(email, code, expiresAt);

        console.log('\n==========================================');
        console.log('🔑 CÓDIGO DE VERIFICACIÓN (DEBUG):', code);
        console.log('📧 PARA EL EMAIL:', email);
        console.log('==========================================\n');

        await transporter.sendMail({
            from: `"Liberty App" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Tu código de verificación - Liberty",
            text: `Tu código es: ${code}. Expira en 10 minutos.`,
            html: `<b>Tu código es: ${code}</b><p>Expira en 10 minutos.</p>`
        });

        res.json({ success: true, message: 'Código enviado' });
    } catch (err) {
        console.error('Error enviando email:', err);
        // Para desarrollo, si falla el envío, devolvemos el código en la respuesta si no hay configuración
        if (!process.env.EMAIL_USER) {
            return res.json({ success: true, message: 'ENTORNO_DESARROLLO: Email no configurado', debugCode: code });
        }
        res.status(500).json({ error: 'Error al enviar el código' });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, code, password } = req.body; // Added password for first-time creation
    const otp = db.prepare('SELECT * FROM otps WHERE email = ? AND code = ?').get(email, code);

    if (!otp || new Date(otp.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Código inválido o expirado' });
    }

    db.prepare('DELETE FROM otps WHERE email = ?').run(email);

    let user = db.prepare('SELECT * FROM users WHERE username = ?').get(email);
    if (!user) {
        if (!password) return res.status(400).json({ error: 'Se requiere una contraseña para el primer registro' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        const info = stmt.run(email, hashedPassword);
        user = { id: info.lastInsertRowid, username: email };
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
    console.log(`Liberty Server running on http://localhost:${PORT}`);
});
