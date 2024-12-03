const express = require("express");
const cors = require("cors");
const cron = require("node-cron");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const expenses = [];
const predefinedCategories = ["Food", "Travel", "Entertainment", "Shopping", "Utilities"];

// Helper functions
const validateExpense = (expense) => {
    if (!expense.category || !predefinedCategories.includes(expense.category)) {
        return { valid: false, error: "Invalid category" };
    }
    if (!expense.amount || isNaN(expense.amount) || expense.amount <= 0) {
        return { valid: false, error: "Amount must be a positive number" };
    }
    if (!expense.date || isNaN(Date.parse(expense.date))) {
        return { valid: false, error: "Invalid date format" };
    }
    return { valid: true };
};

const getSummary = (filterBy = {}) => {
    const { category, startDate, endDate } = filterBy;
    let filteredExpenses = expenses;

    if (category) {
        filteredExpenses = filteredExpenses.filter((e) => e.category === category);
    }

    if (startDate || endDate) {
        filteredExpenses = filteredExpenses.filter((e) => {
            const date = new Date(e.date);
            if (startDate && date < new Date(startDate)) return false;
            if (endDate && date > new Date(endDate)) return false;
            return true;
        });
    }

    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    return { total, expenses: filteredExpenses };
};

// Routes

// Root Route
app.get("/", (req, res) => {
    res.send("Welcome to the Expense Tracker API. Use /add-expense or /expenses in the browser.");
});

// Add Expense via Query Parameters
app.get("/add-expense", (req, res) => {
    const { category, amount, date } = req.query;

    const expense = {
        category,
        amount: parseFloat(amount),
        date,
    };

    const validation = validateExpense(expense);
    if (!validation.valid) {
        return res.status(400).json({ status: "error", error: validation.error });
    }

    const newExpense = { id: expenses.length + 1, category, amount: parseFloat(amount), date };
    expenses.push(newExpense);

    res.status(201).json({ status: "success", data: newExpense });
});

// Get Expenses
app.get("/expenses", (req, res) => {
    const { category, startDate, endDate } = req.query;
    const summary = getSummary({ category, startDate, endDate });
    res.json({ status: "success", data: summary });
});

// Analyze Spending
app.get("/expenses/analysis", (req, res) => {
    const totalByCategory = predefinedCategories.map((category) => {
        const total = expenses
            .filter((e) => e.category === category)
            .reduce((sum, e) => sum + e.amount, 0);
        return { category, total };
    });

    const monthlyTotals = expenses.reduce((acc, e) => {
        const month = new Date(e.date).toISOString().slice(0, 7);
        acc[month] = (acc[month] || 0) + e.amount;
        return acc;
    }, {});

    res.json({
        status: "success",
        data: { totalByCategory, monthlyTotals },
    });
});

// CRON job for generating summary reports
cron.schedule("0 0 * * *", () => {
    const dailySummary = getSummary({
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
    });
    console.log("Daily Expense Summary:", dailySummary);
});

cron.schedule("0 0 * * 0", () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const weeklySummary = getSummary({
        startDate: startDate.toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
    });
    console.log("Weekly Expense Summary:", weeklySummary);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
