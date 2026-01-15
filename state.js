const INITIAL_STATE = {
    expenses: [],
    goals: [],
    config: {
        currency: 'USD',
        monthlyBudget: 3000
    }
};

class StateManager {
    constructor() {
        this.data = INITIAL_STATE;
        this.token = localStorage.getItem('liberty_token');
        this.user = localStorage.getItem('liberty_user');
        this.onStateChange = null;
    }

    async init() {
        if (this.token) {
            await this.load();
        }
    }

    async login(username, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        this.token = data.token;
        this.user = data.username;
        localStorage.setItem('liberty_token', this.token);
        localStorage.setItem('liberty_user', this.user);
        await this.load();
    }

    async register(username, password) {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        this.token = data.token;
        this.user = data.username;
        localStorage.setItem('liberty_token', this.token);
        localStorage.setItem('liberty_user', this.user);
        await this.load();
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('liberty_token');
        localStorage.removeItem('liberty_user');
        this.data = INITIAL_STATE;
        if (this.onStateChange) this.onStateChange();
    }

    async load() {
        if (!this.token) return;
        try {
            const res = await fetch('/api/data', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.status === 403) return this.logout();
            this.data = await res.json();
            if (this.onStateChange) this.onStateChange();
        } catch (e) {
            console.error('Error loading state:', e);
        }
    }

    async addExpense(expense) {
        const newExpense = {
            date: new Date().toISOString(),
            type: 'expense',
            ...expense
        };

        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify(newExpense)
        });
        await this.load();
    }

    async addGoalContribution(goalId, amount, isWithdrawal = false) {
        const contribution = {
            name: isWithdrawal ? 'Retiro' : 'Ahorro',
            amount: Math.abs(amount),
            category: 'Crecimiento',
            date: new Date().toISOString(),
            type: 'contribution',
            goalId: parseInt(goalId),
            isWithdrawal
        };

        await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify(contribution)
        });
        await this.load();
    }

    async addGoal(goal) {
        await fetch('/api/goals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify(goal)
        });
        await this.load();
    }

    async deleteGoal(id) {
        await fetch(`/api/goals/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        await this.load();
    }

    async deleteExpense(id) {
        await fetch(`/api/expenses/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        await this.load();
    }

    async updateBudget(amount) {
        await fetch('/api/config/budget', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({ budget: parseFloat(amount) })
        });
        await this.load();
    }

    getMonthlyTotal() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        return this.data.expenses
            .filter(e => {
                const d = new Date(e.date);
                return d.getFullYear() === year && d.getMonth() === month && !e.isWithdrawal;
            })
            .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    }

    getMonthlyCategoryBreakdown() {
        const totals = { Vivir: 0, Estabilidad: 0, Crecimiento: 0, Disfrute: 0 };
        const now = new Date();
        const monthlyExpenses = this.data.expenses.filter(e => {
            const date = new Date(e.date);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });

        monthlyExpenses.forEach(e => {
            if (totals[e.category] !== undefined) {
                const val = e.isWithdrawal ? -parseFloat(e.amount) : parseFloat(e.amount);
                totals[e.category] += val;
            }
        });

        const total = Object.values(totals).reduce((a, b) => a + Math.abs(b), 0) || 1;
        return {
            operative: Math.max(0, (totals.Vivir / total) * 100).toFixed(0),
            stability: Math.max(0, (totals.Estabilidad / total) * 100).toFixed(0),
            growth: Math.max(0, (totals.Crecimiento / total) * 100).toFixed(0),
            enjoy: Math.max(0, (totals.Disfrute / total) * 100).toFixed(0),
            totalAmount: total
        };
    }

    getKPIs() {
        const total = this.getMonthlyTotal();
        const budget = this.data.config.monthlyBudget;
        return {
            controlledPercent: 85,
            savingsCapacity: Math.max(0, budget - total),
            budgetUsage: ((total / budget) * 100).toFixed(0),
            activeDependency: 90
        };
    }
}

// State Management (Global)
window.state = new StateManager();
