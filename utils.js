// utils.js - Global State & Helper Functions

// --- 1. GLOBAL STATE (Accessible by app.js and render.js) ---
let categories = JSON.parse(localStorage.getItem('categories')) || [];
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let allTags = JSON.parse(localStorage.getItem('allTags')) || ['Food', 'Travel', 'Bills', 'Fun'];

// Transient State
let currentTxTags = []; 
let userName = localStorage.getItem('userName') || 'USER'; 

// NEW: Privacy State (Added correctly here)
let isBalanceHidden = localStorage.getItem('isBalanceHidden') === 'true'; 

// Chart Instances
let chartInstance = null;
let graphChartInstance = null;

// UI State (DEFAULT CHANGED TO DAY)
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

// Selections
const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#FF9F1C', '#292F36', '#F7FFF7', '#FF6B6B'];
const ICONS = ['🍔','🚗','🏠','🎬','💊','✈️','🛒','💡','🏋️','💸','🎓','🎮'];
let selectedColor = COLORS[0]; 
let selectedIcon = ICONS[0];   
let selectedType = 'account';

// --- 2. FORMATTERS ---
const formatINR = (number) => {
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
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
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
    transactions.forEach(t => {
        if (t.type === 'transfer') { if (t.toAccountId == accountId) total += parseFloat(t.amount); if (t.fromAccountId == accountId) total -= parseFloat(t.amount); }
        if (t.type === 'expense' && t.accountId == accountId) total -= parseFloat(t.amount);
        if (t.type === 'income' && t.accountId == accountId) total += parseFloat(t.amount);
    });
    return total;
}
