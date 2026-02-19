// utils.js - Global State & Helper Functions (Optimized v0.4)

// --- 1. GLOBAL STATE ---
// Safe Parser to prevent startup crashes
function safeParse(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.error(`Error parsing ${key}`, e);
        return fallback;
    }
}

let categories = safeParse('categories', []);
let transactions = safeParse('transactions', []);
let allTags = safeParse('allTags', ['Food', 'Travel', 'Bills', 'Fun']);

// Transient State
let currentTxTags = []; 
let userName = localStorage.getItem('userName') || 'USER'; 

// Privacy & Security State
let isBalanceHidden = localStorage.getItem('isBalanceHidden') === 'true'; 
let userPin = localStorage.getItem('userPin') || null; 

// Chart Instances (Global References)
let chartInstance = null;
let graphChartInstance = null;

// UI State
let currentFilter = 'day';      
let currentGraphFilter = 'month'; 
let viewMode = 'expense';
let graphMode = 'expense'; 
let formMode = 'expense';
let tagDeleteMode = false; 
let isBudgetExpanded = true; 
let editingId = null; 
let editingTxId = null;

// Timers
let pressTimer = null;   
let resetTimer = null;   

// --- CONFIGURATION ---
// 1. FLAT UI COLORS
const COLORS = [
    '#1ABC9C', '#2ECC71', '#3498DB', '#9B59B6', '#34495E', 
    '#16A085', '#27AE60', '#2980B9', '#8E44AD', '#2C3E50', 
    '#F1C40F', '#E67E22', '#E74C3C', '#ECF0F1', '#95A5A6', 
    '#F39C12', '#D35400', '#C0392B', '#BDC3C7', '#7F8C8D'
];

// 2. LINEAR ICONS
const ICONS = [
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18h18v-2a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3z"></path><path d="M12 5a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"></path><line x1="12" y1="5" x2="12" y2="2"></line></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"></path><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11"></path><path d="M21 21l-1-1"></path><path d="M3 3l1 1"></path><path d="M18 22l4-4"></path><path d="M2 6l4-4"></path><path d="M3 10l7-7"></path><path d="M14 21l7-7"></path></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><path d="M6 12h4"></path><path d="M8 10v4"></path><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line></svg>`
];

let selectedColor = COLORS[0]; 
let selectedIcon = ICONS[0];   
let selectedType = 'account';

// --- 2. FORMATTERS (Optimized) ---

// SECURITY HELPER: Prevents XSS Attacks
// Only define once here. Render.js will use this.
const escapeHtml = (unsafe) => {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const formatINR = (number) => {
    // Handle bad data gracefully (NaN or null)
    if (isNaN(number) || number === null) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(number);
};

const formatDateFriendly = (dateStr) => {
    if (!dateStr) return 'Select Date';
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const checkDate = new Date(date);
    checkDate.setHours(0,0,0,0);
    
    if (checkDate.getTime() === today.getTime()) return `${date.getDate()}/${date.toLocaleString('default', {month:'short'})}/${date.getFullYear()} (Today)`;
    return `${date.getDate()}/${date.toLocaleString('default', {month:'short'})}/${date.getFullYear()}`;
};

// --- 3. HELPERS ---
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
}

function getWeekRange(weekValue) {
    const [year, week] = weekValue.split('-W');
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    
    const start = new Date(ISOweekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.cat-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function getAccountBalance(accountId) {
    const account = categories.find(c => c.id == accountId);
    let total = account ? parseFloat(account.initialBalance || 0) : 0;
    
    // Performance: Simple Loop
    for (let i = 0; i < transactions.length; i++) {
        const t = transactions[i];
        const amt = parseFloat(t.amount);
        if (isNaN(amt)) continue; // Skip bad data

        if (t.type === 'transfer') {
            if (t.toAccountId == accountId) total += amt;
            if (t.fromAccountId == accountId) total -= amt;
        } else if (t.accountId == accountId) {
            if (t.type === 'expense') total -= amt;
            if (t.type === 'income') total += amt;
        }
    }
    return total;
}
