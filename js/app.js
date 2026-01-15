// app.js - Main Application Logic

const screens = {
    dashboard: () => {
        const recentExpenses = [...state.data.expenses]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        return `
            <div class="fade-in">
                <p class="subtitle">Evolución de Libertad</p>
                <h1>Liberty</h1>
                
                <div class="card">
                    <p class="subtitle">Gasto Total Acumulado</p>
                    <div class="big-number">$${state.getMonthlyTotal().toFixed(2)}</div>
                    <div style="margin-top: 12px; display: flex; align-items: center;">
                        <span class="status-dot ${state.getKPIs().budgetUsage > 90 ? 'status-red' : 'status-green'}"></span>
                        <span style="font-size: 14px; color: ${state.getKPIs().budgetUsage > 90 ? 'var(--status-red)' : 'var(--status-green)'}">
                            ${state.getKPIs().budgetUsage > 90 ? 'Cuidado con el gasto' : 'Control mensual óptimo'}
                        </span>
                    </div>
                </div>

                <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                    <div class="card" style="flex: 1; margin-bottom: 0; background: rgba(99, 102, 241, 0.1);">
                        <p class="subtitle" style="margin-bottom: 8px; font-size: 11px;">Presupuesto</p>
                        <div style="font-size: 18px; font-weight: 600;">$${state.data.config.monthlyBudget.toFixed(0)}</div>
                    </div>
                    <div class="card" style="flex: 1; margin-bottom: 0; background: rgba(20, 184, 166, 0.1);">
                        <p class="subtitle" style="margin-bottom: 8px; font-size: 11px;">Disponible</p>
                        <div style="font-size: 18px; font-weight: 600;">$${state.getKPIs().savingsCapacity.toFixed(0)}</div>
                    </div>
                </div>

                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 style="font-size: 16px; font-weight: 600;">Actividad Reciente</h3>
                </div>

                <div class="expense-list">
                    ${recentExpenses.length > 0 ? recentExpenses.map(e => `
                        <div class="expense-item">
                            <div class="expense-info">
                                <span class="expense-name">${e.name}</span>
                                <span class="expense-meta">${e.category} • ${new Date(e.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span class="expense-value" style="color: ${e.isWithdrawal ? 'var(--status-yellow)' : (e.type === 'contribution' ? 'var(--accent-teal)' : 'var(--status-red)')}">
                                    ${e.isWithdrawal ? '-' : (e.type === 'contribution' ? '+' : '-')}$${parseFloat(e.amount).toFixed(2)}
                                </span>
                                <button class="delete-expense-btn" data-id="${e.id}" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; opacity: 0.5;">✕</button>
                            </div>
                        </div>
                    `).join('') : '<p class="subtitle" style="text-align: center; margin-top: 20px;">No hay registros recientes</p>'}
                </div>

                <div style="text-align: center; margin-top: 32px;">
                    <p style="font-style: italic; color: var(--text-secondary); font-size: 13px;">"El control no es restricción, es libertad de decidir."</p>
                </div>
            </div>
        `;
    },

    goals: () => `
        <div class="fade-in">
            <h1>Tus Metas</h1>
            <p class="subtitle">Construyendo tu libertad</p>
            
            <div style="margin-bottom: 24px;">
                ${state.data.goals.length > 0 ? state.data.goals.map(goal => {
        const progress = Math.min(100, (goal.current / goal.target * 100));
        const isCompleted = progress >= 100;
        return `
                    <div class="card" style="position: relative; overflow: hidden; border: ${isCompleted ? '1px solid var(--accent-teal)' : '1px solid var(--card-border)'};">
                        <button class="delete-goal-btn" data-id="${goal.id}" 
                            style="position: absolute; top: 0; right: 0; background: rgba(239, 68, 68, 0.1); border: none; color: var(--status-red); cursor: pointer; padding: 12px; border-radius: 0 0 0 16px; font-weight: 700; font-size: 16px; z-index: 5;">✕</button>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-right: 40px;">
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-weight: 600;">${goal.name} ${isCompleted ? '✅' : ''}</span>
                                ${isCompleted ? '<span style="font-size: 10px; color: var(--accent-teal); font-weight: 700; margin-top: 4px;">META COMPLETADA</span>' : ''}
                            </div>
                            <span style="font-size: 12px; opacity: 0.6;">Meta: $${goal.target}</span>
                        </div>
                        <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                            <div style="width: ${progress}%; height: 100%; background: ${isCompleted ? 'var(--accent-teal)' : 'linear-gradient(90deg, var(--accent-indigo), var(--accent-teal))'};"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 14px;">
                            <span>$${goal.current.toFixed(2)}</span>
                            <span style="color: ${isCompleted ? 'var(--accent-teal)' : 'var(--text-secondary)'}">${progress.toFixed(0)}%</span>
                        </div>
                    </div>
                    `}).join('') : '<p class="subtitle" style="text-align: center; padding: 20px;">Aún no tienes metas creadas</p>'}
            </div>

            <div class="card">
                <p class="subtitle" style="margin-bottom: 16px;">Crear Nueva Meta</p>
                <div class="form-group">
                    <label class="form-label">Nombre de la Meta</label>
                    <input type="text" id="new-goal-name" class="form-input" placeholder="Ej. Viaje a Japón">
                </div>
                <div class="form-group">
                    <label class="form-label">Monto Objetivo</label>
                    <input type="number" id="new-goal-target" class="form-input" placeholder="0.00">
                </div>
                <button id="btn-create-goal" class="btn-primary">Añadir Meta</button>
            </div>
        </div>
    `,

    register: () => `
        <div class="fade-in">
            <h1>Registro</h1>
            <p class="subtitle">Añadir a tu plan de libertad</p>
            
            <div class="segmented-control">
                <button class="segment-btn active" data-type="expense">Gasto</button>
                <button class="segment-btn" data-type="goal">Ahorro Meta</button>
            </div>

            <div class="card">
                <div id="expense-fields">
                    <input type="text" id="transaction-name" placeholder="¿En qué gastaste?" class="form-input" style="margin-bottom: 16px;">
                    <div id="goal-selector" style="display: none; margin-bottom: 16px;">
                        <p class="form-label">Seleccionar Meta</p>
                        <select id="target-goal" class="form-input" style="margin-bottom: 16px;">
                            ${state.data.goals.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                        </select>
                        <div class="segmented-control" style="margin-bottom: 16px; background: rgba(0,0,0,0.2);">
                            <button class="segment-btn active" data-goal-mode="save">Ahorrar</button>
                            <button class="segment-btn" data-goal-mode="withdraw">Retirar</button>
                        </div>
                    </div>
                </div>

                <input type="number" id="transaction-amount" placeholder="0.00" 
                    style="width: 100%; background: none; border: none; color: white; font-size: 48px; font-weight: 700; text-align: center; outline: none; margin-bottom: 24px;">
                
                <div id="category-section">
                    <p class="subtitle" style="text-align: center;">Categoría</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
                        <button class="cat-btn active" data-cat="Vivir">🏠 Vivir</button>
                        <button class="cat-btn" data-cat="Estabilidad">🛡️ Estabilidad</button>
                        <button class="cat-btn" data-cat="Crecimiento">📈 Crecimiento</button>
                        <button class="cat-btn" data-cat="Disfrute">✨ Disfrute</button>
                    </div>

                    <div class="help-container">
                        <button class="help-trigger" id="toggle-help">
                            <span>¿No sabes qué categoría elegir?</span>
                            <span id="help-icon">▼</span>
                        </button>
                        <div class="help-content" id="help-content">
                            <div class="help-item">
                                <span class="help-title">🏠 Vivir (50%)</span>
                                Gastos esenciales: Renta, comida, servicios, transporte y salud. Lo necesario para operar tu día a día.
                            </div>
                            <div class="help-item">
                                <span class="help-title">🛡️ Estabilidad (20%)</span>
                                Ahorro para emergencias, seguros, pago de deudas y protección de tu futuro financiero.
                            </div>
                            <div class="help-item">
                                <span class="help-title">📈 Crecimiento (20%)</span>
                                Inversiones, educación, cursos y aportaciones a metas de largo plazo que aumentan tu patrimonio.
                            </div>
                            <div class="help-item">
                                <span class="help-title">✨ Disfrute (10%)</span>
                                Ocio, salidas, hobbies y gustos personales. Es la recompensa por tu disciplina financiera.
                            </div>
                        </div>
                    </div>
                </div>

                <button id="btn-save-transaction" class="btn-primary" style="margin-top: 24px;">Guardar Registro</button>
            </div>
        </div>
    `,

    analysis: () => {
        const data = state.getMonthlyCategoryBreakdown();
        const expenses = state.data.expenses;
        const now = new Date();
        const budget = state.data.config.monthlyBudget;
        const spent = state.getMonthlyTotal();
        const remaining = Math.max(0, budget - spent);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const expenseDays = new Set(expenses.map(e => new Date(e.date).getDate()));

        return `
            <div class="fade-in">
                <h1>Análisis</h1>
                <p class="subtitle">Desglose mensual de gastos</p>
                
                <div class="card" style="background: linear-gradient(135deg, var(--accent-indigo), #4f46e5);">
                    <p class="subtitle" style="color: rgba(255,255,255,0.7);">Presupuesto Restante</p>
                    <div style="font-size: 32px; font-weight: 700;">$${remaining.toFixed(2)}</div>
                    <p style="font-size: 12px; opacity: 0.8; margin-top: 8px;">De un total de $${budget.toFixed(2)}</p>
                </div>

                <div class="card">
                    <p class="subtitle">Distribución por Categoría</p>
                    <div class="chart-container">
                        <div class="chart-bar-row">
                            <span class="chart-label">Vivir</span>
                            <div class="chart-bar-bg"><div class="chart-bar-fill" style="width: ${data.operative}%; background: #6366f1;"></div></div>
                            <span class="chart-percent">${data.operative}%</span>
                        </div>
                        <div class="chart-bar-row">
                            <span class="chart-label">Estabilidad</span>
                            <div class="chart-bar-bg"><div class="chart-bar-fill" style="width: ${data.stability}%; background: #14b8a6;"></div></div>
                            <span class="chart-percent">${data.stability}%</span>
                        </div>
                        <div class="chart-bar-row">
                            <span class="chart-label">Crecimiento</span>
                            <div class="chart-bar-bg"><div class="chart-bar-fill" style="width: ${data.growth}%; background: #f59e0b;"></div></div>
                            <span class="chart-percent">${data.growth}%</span>
                        </div>
                        <div class="chart-bar-row">
                            <span class="chart-label">Disfrute</span>
                            <div class="chart-bar-bg"><div class="chart-bar-fill" style="width: ${data.enjoy}%; background: #ef4444;"></div></div>
                            <span class="chart-percent">${data.enjoy}%</span>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <p class="subtitle">Días con actividad este mes</p>
                    <div class="calendar-header">
                        <span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span>
                    </div>
                    <div class="calendar-grid">
                        ${Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => `
                            <div class="calendar-day ${expenseDays.has(day) ? 'has-expense' : ''}">${day}</div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    kpis: () => {
        const kpis = state.getKPIs();
        return `
            <div class="fade-in">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h1>KPIs & Config</h1>
                    <button id="btn-logout" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--status-red); color: var(--status-red); padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;">Cerrar Sesión</button>
                </div>
                
                <div class="card">
                    <p class="subtitle">Ajustar Presupuesto Mensual</p>
                    <div style="display: flex; gap: 12px; margin-top: 12px;">
                        <input type="number" id="budget-input" class="form-input" value="${state.data.config.monthlyBudget}">
                        <button id="btn-update-budget" class="btn-primary" style="width: auto; padding: 0 20px;">✓</button>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div class="card">
                        <p class="subtitle" style="font-size: 10px;">% Presupuesto Usado</p>
                        <div style="font-size: 24px; font-weight: 700; color: var(--accent-indigo);">${kpis.budgetUsage}%</div>
                    </div>
                    <div class="card">
                        <p class="subtitle" style="font-size: 10px;">Saldo Disponible</p>
                        <div style="font-size: 24px; font-weight: 700; color: var(--accent-teal);">$${kpis.savingsCapacity}</div>
                    </div>
                </div>
            </div>
        `;
    },

    login: () => `
        <div class="fade-in" style="display: flex; flex-direction: column; justify-content: center; min-height: 80vh;">
            <p class="subtitle" style="text-align: center;">Bienvenido a Liberty</p>
            <h1 style="text-align: center; margin-bottom: 40px; font-size: 40px;">Iniciar Sesión</h1>
            <div class="card">
                <div class="form-group" id="login-fields">
                    <label class="form-label">Email</label>
                    <input type="email" id="login-email" class="form-input" placeholder="tu@email.com">
                    <label class="form-label" style="margin-top: 12px;">Contraseña</label>
                    <input type="password" id="login-password" class="form-input" placeholder="••••••••">
                    <button id="btn-do-login-pass" class="btn-primary" style="margin-top: 12px;">Entrar</button>
                    <div style="margin: 16px 0; text-align: center; font-size: 12px; color: var(--text-secondary);">o usa un código</div>
                    <button id="btn-send-login-otp" class="btn-primary" style="background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1);">Enviar Código al Email</button>
                </div>
                <div class="form-group" id="otp-login-fields" style="display: none;">
                    <p class="subtitle" style="text-align: center; margin-bottom: 12px;">Ingresa el código enviado</p>
                    <input type="text" id="login-otp-code" class="form-input" placeholder="000000" style="text-align: center; font-size: 24px; letter-spacing: 8px;">
                    <button id="btn-verify-login-otp" class="btn-primary" style="margin-top: 12px;">Verificar y Entrar</button>
                    <button id="btn-back-to-email-login" style="background: none; border: none; color: var(--text-secondary); width: 100%; margin-top: 12px; font-size: 13px; cursor: pointer;">Volver al inicio</button>
                </div>
            </div>
            <p style="text-align: center; margin-top: 24px; font-size: 14px; color: var(--text-secondary);">
                ¿No tienes cuenta? <a href="#" id="link-go-register" style="color: var(--accent-indigo); font-weight: 600; text-decoration: none;">Regístrate</a>
            </p>
            <div style="margin-top: 40px; padding: 20px; background: rgba(255,165,0,0.1); border-radius: 12px; border: 1px solid rgba(255,165,0,0.2);">
                <p style="font-size: 12px; color: var(--status-yellow); text-align: center;"><b>Modo Desarrollo:</b> Si no recibes el correo, revisa la consola del servidor para ver el código generado.</p>
            </div>
        </div>
    `,

    register_user: () => `
        <div class="fade-in" style="display: flex; flex-direction: column; justify-content: center; min-height: 80vh;">
            <p class="subtitle" style="text-align: center;">Únete a Liberty</p>
            <h1 style="text-align: center; margin-bottom: 40px; font-size: 40px;">Crear Cuenta</h1>
            <div class="card">
                <div class="form-group" id="reg-fields">
                    <label class="form-label">Email</label>
                    <input type="email" id="reg-email" class="form-input" placeholder="tu@email.com">
                    <label class="form-label" style="margin-top: 12px;">Crea una Contraseña</label>
                    <input type="password" id="reg-password" class="form-input" placeholder="Mínimo 6 caracteres">
                    <button id="btn-send-reg-otp" class="btn-primary" style="margin-top: 12px;">Validar Email y Crear Cuenta</button>
                </div>
                <div class="form-group" id="otp-reg-fields" style="display: none;">
                    <p class="subtitle" style="text-align: center; margin-bottom: 12px;">Ingresa el código enviado</p>
                    <input type="text" id="reg-otp-code" class="form-input" placeholder="000000" style="text-align: center; font-size: 24px; letter-spacing: 8px;">
                    <button id="btn-verify-reg-otp" class="btn-primary" style="margin-top: 12px;">Verificar y Finalizar</button>
                    <button id="btn-back-to-email-reg" style="background: none; border: none; color: var(--text-secondary); width: 100%; margin-top: 12px; font-size: 13px; cursor: pointer;">Volver</button>
                </div>
            </div>
            <p style="text-align: center; margin-top: 24px; font-size: 14px; color: var(--text-secondary);">
                ¿Ya tienes cuenta? <a href="#" id="link-go-login" style="color: var(--accent-indigo); font-weight: 600; text-decoration: none;">Inicia sesión</a>
            </p>
        </div>
    `
};



class App {
    constructor() {
        this.container = document.getElementById('screen-container');
        this.navItems = document.querySelectorAll('.nav-item, .nav-btn-add');
        this.currentScreen = 'dashboard';
        this.dateDisplay = document.getElementById('current-date');

        this.init();
    }

    async init() {
        this.updateDate();
        setInterval(() => this.updateDate(), 60000);

        state.onStateChange = () => {
            this.navigate(this.currentScreen);
        };

        this.initTheme();
        await state.init();

        // PWA Service Worker Registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
        }

        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const screen = item.dataset.screen;
                this.navigate(screen);

                // Update active state
                this.navItems.forEach(i => i.classList.remove('active'));
                if (item.classList.contains('nav-item')) item.classList.add('active');
            });
        });

        if (state.token) {
            this.navigate('dashboard');
        } else {
            this.navigate('login');
        }
    }

    updateDate() {
        if (this.dateDisplay) {
            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            this.dateDisplay.innerText = new Date().toLocaleDateString('es-ES', options);
        }
    }

    navigate(screen) {
        if (!state.token && screen !== 'login' && screen !== 'register_user') {
            screen = 'login';
        }

        this.currentScreen = screen;
        this.container.innerHTML = screens[screen]();

        // Toggle nav visibility
        const nav = document.querySelector('.bottom-nav');
        if (screen === 'login' || screen === 'register_user') {
            nav.style.display = 'none';
        } else {
            nav.style.display = 'flex';
        }

        if (screen === 'login' || screen === 'register_user') this.setupAuthEvents();
        if (screen === 'dashboard') this.setupDashboardEvents();
        if (screen === 'register') this.setupRegisterEvents();
        if (screen === 'goals') this.setupGoalEvents();
        if (screen === 'kpis') this.setupKPIEvents();
    }

    initTheme() {
        const savedTheme = localStorage.getItem('liberty_theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
        }

        const btnToggle = document.getElementById('btn-toggle-theme');
        if (btnToggle) {
            btnToggle.onclick = () => {
                document.body.classList.toggle('light-mode');
                const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
                localStorage.setItem('liberty_theme', currentTheme);
            };
        }
    }

    setupAuthEvents() {
        const btnSendLoginOtp = document.getElementById('btn-send-login-otp');
        const btnVerifyLoginOtp = document.getElementById('btn-verify-login-otp');
        const btnSendRegOtp = document.getElementById('btn-send-reg-otp');
        const btnVerifyRegOtp = document.getElementById('btn-verify-reg-otp');

        const linkRegister = document.getElementById('link-go-register');
        const linkLogin = document.getElementById('link-go-login');

        const btnDoLoginPass = document.getElementById('btn-do-login-pass');
        const setupOtpFlow = (type) => {
            const sendBtn = type === 'login' ? btnSendLoginOtp : btnSendRegOtp;
            const verifyBtn = type === 'login' ? btnVerifyLoginOtp : btnVerifyRegOtp;
            const emailInput = document.getElementById(type === 'login' ? 'login-email' : 'reg-email');
            const passInput = document.getElementById(type === 'login' ? 'login-password' : 'reg-password');
            const otpInput = document.getElementById(type === 'login' ? 'login-otp-code' : 'reg-otp-code');
            const emailFields = document.getElementById(type === 'login' ? 'login-fields' : 'reg-fields');
            const otpFields = document.getElementById(type === 'login' ? 'otp-login-fields' : 'otp-reg-fields');
            const backBtn = document.getElementById(type === 'login' ? 'btn-back-to-email-login' : 'btn-back-to-email-reg');

            if (btnDoLoginPass && type === 'login') {
                btnDoLoginPass.onclick = async () => {
                    const u = emailInput.value;
                    const p = passInput.value;
                    if (!u || !p) return alert('Ingresa email y contraseña');
                    try {
                        await state.login(u, p);
                        this.navigate('dashboard');
                    } catch (e) { alert(e.message); }
                };
            }

            if (sendBtn) {
                sendBtn.onclick = async () => {
                    const email = emailInput.value;
                    const pass = passInput ? passInput.value : null;
                    if (!email) return alert('Ingresa tu email');
                    if (type === 'register' && (!pass || pass.length < 6)) return alert('La contraseña debe tener al menos 6 caracteres');
                    try {
                        const res = await fetch('/api/auth/send-otp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email })
                        });
                        const data = await res.json();
                        if (data.success) {
                            emailFields.style.display = 'none';
                            otpFields.style.display = 'block';
                            if (data.debugCode) console.log('DEBUG CODE:', data.debugCode);
                        } else {
                            alert(data.error);
                        }
                    } catch (e) { alert('Error al enviar código'); }
                };
            }

            if (verifyBtn) {
                verifyBtn.onclick = async () => {
                    const email = emailInput.value;
                    const code = otpInput.value;
                    const password = passInput ? passInput.value : null;
                    if (!code) return alert('Ingresa el código');
                    try {
                        const res = await fetch('/api/auth/verify-otp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, code, password })
                        });
                        const data = await res.json();
                        if (data.token) {
                            state.token = data.token;
                            state.user = data.username;
                            localStorage.setItem('liberty_token', data.token);
                            localStorage.setItem('liberty_user', data.username);
                            await state.init();
                            this.navigate('dashboard');
                        } else {
                            alert(data.error);
                        }
                    } catch (e) { alert('Error al verificar código'); }
                };
            }

            if (backBtn) {
                backBtn.onclick = () => {
                    otpFields.style.display = 'none';
                    emailFields.style.display = 'block';
                };
            }
        };

        setupOtpFlow('login');
        setupOtpFlow('register');

        if (linkRegister) linkRegister.onclick = (e) => { e.preventDefault(); this.navigate('register_user'); };
        if (linkLogin) linkLogin.onclick = (e) => { e.preventDefault(); this.navigate('login'); };
    }

    setupDashboardEvents() {
        const deleteBtns = document.querySelectorAll('.delete-expense-btn');
        deleteBtns.forEach(btn => {
            btn.onclick = (e) => {
                if (confirm('¿Eliminar este registro?')) {
                    state.deleteExpense(btn.dataset.id);
                    this.navigate('dashboard');
                }
            };
        });
    }

    setupKPIEvents() {
        const updateBtn = document.getElementById('btn-update-budget');
        const budgetInput = document.getElementById('budget-input');
        const logoutBtn = document.getElementById('btn-logout');

        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                state.updateBudget(budgetInput.value);
            });
        }

        if (logoutBtn) {
            logoutBtn.onclick = () => {
                state.logout();
                this.navigate('login');
            };
        }
    }

    setupGoalEvents() {
        // Use timeout to ensure DOM is fully painted
        setTimeout(() => {
            const createBtn = document.getElementById('btn-create-goal');
            if (createBtn) {
                createBtn.onclick = () => {
                    const name = document.getElementById('new-goal-name').value;
                    const target = document.getElementById('new-goal-target').value;
                    if (!name || !target) return alert('Completa los campos');
                    state.addGoal({ name, target: parseFloat(target) });
                    this.navigate('goals');
                };
            }

            const deleteBtns = document.querySelectorAll('.delete-goal-btn');
            deleteBtns.forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`¿Eliminar la meta "${btn.parentElement.querySelector('span').innerText}" ? `)) {
                        state.deleteGoal(btn.dataset.id);
                        this.navigate('goals');
                    }
                };
            });
        }, 50);
    }

    setupRegisterEvents() {
        const goalSelector = document.getElementById('target-goal');
        if (goalSelector) {
            // Re-render options to ensure they are fresh
            goalSelector.innerHTML = state.data.goals.map(g =>
                `<option value="${g.id}">${g.name}</option>`
            ).join('');
        }

        const catBtns = document.querySelectorAll('.cat-btn');
        const segmentBtns = document.querySelectorAll('.segment-btn');
        const saveBtn = document.getElementById('btn-save-transaction');
        const goalFields = document.getElementById('goal-selector');
        const categorySection = document.getElementById('category-section');
        const transactionName = document.getElementById('transaction-name');

        let selectedCat = 'Vivir';
        let currentType = 'expense';
        let goalMode = 'save'; // NEW: help track if we are saving or withdrawing

        const goalModeBtns = document.querySelectorAll('[data-goal-mode]');
        goalModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                goalModeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                goalMode = btn.dataset.goalMode;
            });
        });

        segmentBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                segmentBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentType = btn.dataset.type;

                if (currentType === 'expense') {
                    goalFields.style.display = 'none';
                    categorySection.style.display = 'block';
                    transactionName.style.display = 'block';
                } else {
                    goalFields.style.display = 'block';
                    categorySection.style.display = 'none';
                    transactionName.style.display = 'none';
                }
            });
        });

        catBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                catBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedCat = btn.dataset.cat;
            });
        });

        const helpTrigger = document.getElementById('toggle-help');
        const helpContent = document.getElementById('help-content');
        const helpIcon = document.getElementById('help-icon');

        if (helpTrigger) {
            helpTrigger.addEventListener('click', () => {
                const isShowing = helpContent.classList.toggle('show');
                helpIcon.innerText = isShowing ? '▲' : '▼';
            });
        }

        saveBtn.addEventListener('click', () => {
            const amount = document.getElementById('transaction-amount').value;
            if (!amount) return alert('Ingresa un monto');

            if (currentType === 'expense') {
                const name = transactionName.value || 'Gasto General';
                state.addExpense({ name, amount, category: selectedCat });
            } else {
                const goalId = document.getElementById('target-goal').value;
                const finalAmount = goalMode === 'withdraw' ? -Math.abs(amount) : Math.abs(amount);
                state.addGoalContribution(goalId, finalAmount);
            }

            this.navigate('dashboard');
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.querySelector('[data-screen="dashboard"]').classList.add('active');
        });
    }
}

new App();
