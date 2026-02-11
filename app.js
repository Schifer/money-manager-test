// Register the DataLabels plugin globally
Chart.register(ChartDataLabels);

// --- STATE MANAGEMENT ---
let categories = JSON.parse(localStorage.getItem('categories')) || [];
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let allTags = JSON.parse(localStorage.getItem('allTags')) || ['Food', 'Travel', 'Bills', 'Fun'];
let currentTxTags = []; 

let chartInstance = null;
let graphChartInstance = null;
let currentFilter = 'month';      
let currentGraphFilter = 'month'; 

let viewMode = 'expense';
let graphMode = 'expense'; 
let formMode = 'expense';
let tagDeleteMode = false; 
let longPressTimer = null; 

let resetInterval = null;
let editingId = null; 
let editingTxId = null;
let selectedColor = '#FF5252';
let selectedIcon = '💰';
let selectedType = 'account';

// New State for Collapsible Budget
let isBudgetExpanded = true; 

const colors = ['#FF5252', '#448AFF', '#69F0AE', '#FFD740', '#E040FB', '#607D8B', '#FF9800', '#9E9E9E'];

// SECTION 4: EXPANDED ICON LIBRARY
const icons = [
    '💰', '💳', '🏦', '💵', '🪙', // Finance
    '🏠', '🛋️', '🧹', '💡', '🚿', // Home & Utilities
    '🍔', '🍕', '☕', '🍻', '🍎', // Food & Drink
    '🚗', '⛽', '🚌', '✈️', '🗺️', // Transport
    '🎮', '🎬', '🎵', '📚', '🎨', // Entertainment
    '📱', '💻', '📷', '⌚', '🔋', // Tech
    '💊', '🩺', '🏋️', '🧘', '💇', // Health & Self Care
    '👕', '👗', '👟', '👜', '💍', // Fashion
    '🎓', '✏️', '💼', '🎁', '🐾', // Education, Work, Pets
    '🛡️', '📄', '👶', '🏖️', '🔧', // Misc
    '🛒', '🚬', '🏥', '⛪', '🧡'   // More Misc
];

function init() {
    resetHomeDates();
    resetGraphDates();
    renderCategories();
    setupPickers();
    renderAccounts();
    // Default to Expense theme
    document.querySelector('.app-wrapper').classList.add('theme-expense');
    renderHome();
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.textContent.toLowerCase().includes(tabName));
    if(activeBtn) activeBtn.classList.add('active');
    
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    // Theme Control
    const appWrapper = document.querySelector('.app-wrapper');
    appWrapper.classList.remove('theme-expense', 'theme-income');

    // FAB Visibility Control (Only show on Home)
    const fab = document.querySelector('.fab-btn');
    if (tabName === 'home') fab.classList.remove('hidden');
    else fab.classList.add('hidden');

    if (tabName === 'categories') { 
        renderCategories(); 
        document.getElementById('categories-view').classList.remove('hidden'); 
    }
    else if (tabName === 'home') { 
        if (viewMode === 'expense') appWrapper.classList.add('theme-expense');
        else appWrapper.classList.add('theme-income');
        
        document.getElementById('home-view').classList.remove('hidden'); 
        setTimeout(() => { renderHome(); }, 10);
    }
    else if (tabName === 'accounts') { 
        renderAccounts(); 
        document.getElementById('accounts-view').classList.remove('hidden'); 
    }
    else if (tabName === 'settings') { 
        document.getElementById('settings-view').classList.remove('hidden'); 
    }
    else if (tabName === 'graph') { 
        renderGraph(); 
        document.getElementById('graph-view').classList.remove('hidden'); 
    }
}

// --- DATE NAVIGATION LOGIC ---
function changeDate(offset) {
    if (currentFilter === 'period') return;

    if (currentFilter === 'day') {
        const input = document.getElementById('home-date-input');
        const d = new Date(input.value);
        d.setDate(d.getDate() + offset);
        input.valueAsDate = d;
    } 
    else if (currentFilter === 'month') {
        const input = document.getElementById('home-month-input');
        const parts = input.value.split('-');
        let year = parseInt(parts[0]);
        let month = parseInt(parts[1]) - 1; 
        const d = new Date(year, month, 1);
        d.setMonth(d.getMonth() + offset);
        
        // Fix: Ensure month formatting adds leading zero
        const newYear = d.getFullYear();
        const newMonth = (d.getMonth() + 1).toString().padStart(2, '0');
        input.value = `${newYear}-${newMonth}`;
    }
    else if (currentFilter === 'week') {
        const input = document.getElementById('home-week-input');
        const currentRange = getWeekRange(input.value);
        const d = new Date(currentRange.start);
        d.setDate(d.getDate() + (offset * 7));
        const weekNum = getWeekNumber(d);
        input.value = `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
    }
    
    // Update the Smart Display and Render
    updateSmartDateDisplay();
    renderHome();
}

// --- RESET LOGIC ---
function resetHomeDates() {
    const today = new Date();
    document.getElementById('home-date-input').valueAsDate = today;
    document.getElementById('home-month-input').value = today.toISOString().slice(0, 7);
    let startDate = today;
    if (transactions.length > 0) {
        const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        startDate = new Date(sorted[0].date);
    }
    document.getElementById('home-start-input').valueAsDate = startDate;
    document.getElementById('home-end-input').valueAsDate = today;
    const weekNum = getWeekNumber(today);
    document.getElementById('home-week-input').value = `${today.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
    
    updateSmartDateDisplay(); // Update display on reset
    if (!document.getElementById('home-view').classList.contains('hidden')) renderHome();
}

function resetGraphDates() {
    const today = new Date();
    document.getElementById('graph-date-input').valueAsDate = today;
    document.getElementById('graph-month-input').value = today.toISOString().slice(0, 7); 
    let startDate = today;
    if (transactions.length > 0) {
        const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        startDate = new Date(sorted[0].date);
    }
    document.getElementById('graph-start-input').valueAsDate = startDate;
    document.getElementById('graph-end-input').valueAsDate = today;
    if (!document.getElementById('graph-view').classList.contains('hidden')) renderGraph();
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

function getWeekRange(weekString) {
    const [year, week] = weekString.split('-W');
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    const start = new Date(ISOweekStart);
    const end = new Date(ISOweekStart);
    end.setDate(end.getDate() + 6);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

// --- SECTION 4: SMART DATE FORMATTING ---
function formatDateFriendly(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    
    // Create comparison dates (Midnight)
    const dTime = new Date(dateStr).setHours(0,0,0,0);
    const tTime = new Date().setHours(0,0,0,0);
    
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yTime = yesterday.setHours(0,0,0,0);
    
    const dayBefore = new Date();
    dayBefore.setDate(today.getDate() - 2);
    const dbTime = dayBefore.setHours(0,0,0,0);

    let relative = '';
    if (dTime === tTime) relative = ' (Today)';
    else if (dTime === yTime) relative = ' (Yesterday)';
    else if (dTime === dbTime) relative = ' (Day before)';

    const day = date.getDate().toString().padStart(2, '0');
    // Use short month name: Feb, Mar
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();

    // Return format: 11/Feb/2026 (Today)
    return `${day}/${month}/${year}${relative}`;
}

function updateSmartDateDisplay() {
    // 1. Update Day Display
    const dayInput = document.getElementById('home-date-input');
    const dayDisplay = document.getElementById('display-day');
    if (dayInput && dayDisplay) {
        dayDisplay.innerText = formatDateFriendly(dayInput.value);
    }

    // 2. Update Month Display
    const monthInput = document.getElementById('home-month-input');
    const monthDisplay = document.getElementById('display-month');
    if (monthInput && monthDisplay && monthInput.value) {
        const [y, m] = monthInput.value.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1, 1);
        const monthName = date.toLocaleString('default', { month: 'long' });
        monthDisplay.innerText = `${monthName} ${y}`;
    }

    // 3. Update Week Display
    const weekInput = document.getElementById('home-week-input');
    const weekDisplay = document.getElementById('display-week');
    if (weekInput && weekDisplay) {
        weekDisplay.innerText = weekInput.value ? weekInput.value : "Select Week";
    }
}

// --- HOME LOGIC ---
function toggleHomeView(mode) {
    viewMode = mode;
    const homeView = document.getElementById('home-view');
    if (!homeView.classList.contains('hidden')) {
        const appWrapper = document.querySelector('.app-wrapper');
        appWrapper.classList.remove('theme-expense', 'theme-income');
        if (mode === 'expense') {
            appWrapper.classList.add('theme-expense');
        } else {
            appWrapper.classList.add('theme-income');
        }
    }
    document.getElementById('btn-view-expense').classList.toggle('active', mode === 'expense');
    document.getElementById('btn-view-income').classList.toggle('active', mode === 'income');
    document.getElementById('chart-label').innerText = mode === 'expense' ? 'Spent' : 'Earned';
    renderHome();
}

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText.toLowerCase() === filter) btn.classList.add('active');
    });
    
    // Toggle Visibility of Date Controls (Inputs are hidden, Wrappers are shown)
    document.getElementById('home-ctrl-day').classList.toggle('hidden', filter !== 'day');
    document.getElementById('home-ctrl-week').classList.toggle('hidden', filter !== 'week');
    document.getElementById('home-ctrl-month').classList.toggle('hidden', filter !== 'month');
    document.getElementById('home-ctrl-period').classList.toggle('hidden', filter !== 'period' && filter !== 'year');
    
    updateSmartDateDisplay(); // Ensure text is correct for new view
    renderHome();
}

function renderHomeTagFilter() {
    const select = document.getElementById('home-tag-filter');
    if (!select) return; 
    
    const currentVal = select.value;
    select.innerHTML = '<option value="">All Tags</option>';
    
    if (allTags.length > 0) {
        allTags.sort().forEach(tag => {
            select.innerHTML += `<option value="${tag}">${tag}</option>`;
        });
    }
    select.value = currentVal;
}

function renderHome() {
    const accountSelect = document.getElementById('home-account-select');
    if (accountSelect.options.length === 0) { 
        accountSelect.innerHTML = '<option value="all">All Accounts</option>'; 
        categories.filter(c => c.type === 'account').forEach(acc => { 
            accountSelect.innerHTML += `<option value="${acc.id}">${acc.name}</option>`; 
        }); 
    }
    
    renderHomeTagFilter(); 

    const selectedAccountId = accountSelect.value;
    
    if (selectedAccountId === 'all') { 
        let total = 0; 
        categories.filter(c => c.type === 'account').forEach(acc => total += parseFloat(getAccountBalance(acc.id))); 
        document.getElementById('home-balance').innerText = `$${total.toFixed(2)}`; 
    } else { 
        document.getElementById('home-balance').innerText = `$${getAccountBalance(selectedAccountId)}`; 
    }
    
    renderHomeBudgets(); 
    updateChart(selectedAccountId);
}

// --- DRAG AND DROP BUDGETS ---
function renderHomeBudgets() {
    const container = document.getElementById('budget-overview');
    container.innerHTML = '';
    
    const cappedCategories = categories.filter(c => c.type === 'section' && c.cap > 0);
    
    if (cappedCategories.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    
    const headerRow = document.createElement('div');
    headerRow.className = 'budget-header-row';
    headerRow.onclick = () => {
        isBudgetExpanded = !isBudgetExpanded;
        renderHomeBudgets();
    };
    
    headerRow.innerHTML = `
        <h3 style="margin:0;">Monthly Budgets</h3>
        <span class="budget-toggle-icon ${isBudgetExpanded ? '' : 'collapsed'}">▼</span>
    `;
    container.appendChild(headerRow);

    if (!isBudgetExpanded) return;

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); 

    // Sort using 'order' property
    cappedCategories.sort((a, b) => (a.order || 0) - (b.order || 0));

    cappedCategories.forEach(cat => {
        let spent = 0;
        transactions.forEach(t => {
            if (t.categoryId == cat.id && t.type === 'expense' && t.date.startsWith(currentMonth)) {
                spent += parseFloat(t.amount);
            }
        });

        const pct = Math.min((spent / cat.cap) * 100, 100);
        let colorClass = 'prog-green';
        if (pct >= 90) colorClass = 'prog-red';
        else if (pct >= 50) colorClass = 'prog-orange';

        let itemClass = 'cat-item';
        if (spent > cat.cap) itemClass += ' over-budget-pulse';

        const el = document.createElement('div');
        el.className = itemClass;
        el.style.marginBottom = '8px';
        
        // ENABLE DRAG
        el.setAttribute('draggable', 'true');
        el.setAttribute('data-id', cat.id);
        
        el.innerHTML = `
            <div class="cat-icon" style="background-color: ${cat.color}20; color: ${cat.color}">${cat.icon}</div>
            <div class="cat-info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; color:#fff">${cat.name}</span>
                    <span style="font-size:12px; color:#888">$${spent.toFixed(0)} / ${cat.cap}</span>
                </div>
                <div class="budget-bar-track" style="margin-top:5px;">
                    <div class="budget-bar-fill ${colorClass}" style="width:${pct}%"></div>
                </div>
            </div>
        `;
        container.appendChild(el);
    });

    // Attach Drag Events
    setupBudgetDrag(container);
}

function setupBudgetDrag(container) {
    let draggables = container.querySelectorAll('.cat-item');
    
    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', () => {
            draggable.classList.add('dragging');
        });

        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
            saveNewOrder(); // Save when dropped
        });
    });

    container.addEventListener('dragover', e => {
        e.preventDefault(); // Enable dropping
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (afterElement == null) {
            container.appendChild(draggable);
        } else {
            container.insertBefore(draggable, afterElement);
        }
    });
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

function saveNewOrder() {
    const container = document.getElementById('budget-overview');
    const items = [...container.querySelectorAll('.cat-item')];
    
    items.forEach((item, index) => {
        const id = item.getAttribute('data-id');
        const cat = categories.find(c => c.id == id);
        if (cat) {
            cat.order = index;
        }
    });
    
    localStorage.setItem('categories', JSON.stringify(categories));
}

// --- CHART & LIST ---
function updateChart(accountId) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    const dayVal = document.getElementById('home-date-input').value;
    const weekVal = document.getElementById('home-week-input').value;
    const monthVal = document.getElementById('home-month-input').value;
    const startVal = document.getElementById('home-start-input').value;
    const endVal = document.getElementById('home-end-input').value;
    
    const tagFilterElement = document.getElementById('home-tag-filter');
    const tagFilterVal = tagFilterElement ? tagFilterElement.value : '';

    const filteredTrans = transactions.filter(t => {
        if (t.type !== viewMode) return false;
        if (accountId !== 'all' && t.accountId != accountId) return false;
        
        if (tagFilterVal && (!t.tags || !t.tags.includes(tagFilterVal))) return false;

        const tDate = t.date;
        if (currentFilter === 'day') return tDate === dayVal;
        else if (currentFilter === 'week') {
            if(!weekVal) return false;
            const range = getWeekRange(weekVal);
            return tDate >= range.start && tDate <= range.end;
        } else if (currentFilter === 'month') return tDate.startsWith(monthVal);
        else if (currentFilter === 'year') return tDate.startsWith(new Date().getFullYear().toString());
        else if (currentFilter === 'period') return tDate >= startVal && tDate <= endVal;
        return true;
    });

    let periodTotal = 0; 
    const categoryTotals = {};
    filteredTrans.forEach(t => { 
        const catId = t.categoryId || 'uncat'; 
        if (!categoryTotals[catId]) categoryTotals[catId] = 0; 
        categoryTotals[catId] += parseFloat(t.amount); 
        periodTotal += parseFloat(t.amount); 
    });
    
    document.getElementById('period-total').innerText = `$${periodTotal.toFixed(2)}`;
    const listContainer = document.getElementById('transaction-list'); listContainer.innerHTML = '';
    
    if (periodTotal === 0) { 
        document.getElementById('no-data-msg').classList.remove('hidden'); 
        if(chartInstance) chartInstance.destroy(); 
        return; 
    }
    document.getElementById('no-data-msg').classList.add('hidden');
    
    const sortedTrans = filteredTrans.sort((a, b) => new Date(b.date) - new Date(a.date));
    sortedTrans.forEach(t => {
        let name, icon, color;
        if (!t.categoryId) { 
            name = t.type === 'income' ? 'Income' : 'Uncategorized'; 
            icon = t.type === 'income' ? '💵' : '❓'; 
            color = t.type === 'income' ? '#03dac6' : '#888'; 
        } else { 
            const cat = categories.find(c => c.id == t.categoryId); 
            name = cat ? cat.name : 'Unknown'; 
            icon = cat ? cat.icon : '❓'; 
            color = cat ? cat.color : '#888'; 
        }

        let tagHtml = '';
        if (t.tags && t.tags.length > 0) {
            tagHtml = t.tags.map(tag => `<span class="tag-pill-card">${tag}</span>`).join(' ');
        }

        const amountColorClass = t.type === 'expense' ? 'text-red' : 'text-green';
        const displaySign = t.type === 'expense' ? '-' : '+';

        // NOTE: We do NOT use formatDateFriendly here per user request.
        // Keeping YYYY-MM-DD or simple format for the list.
        const row = document.createElement('div'); row.className = 'spending-item';
        row.innerHTML = `
            <div class="spending-left">
                <div class="spending-icon" style="background-color:${color}20; color:${color}">${icon}</div>
                <div class="spending-info">
                    <span class="spending-name">${name}</span>
                    <div class="spending-details-row">
                        <span class="spending-date">${t.date}</span>
                        ${tagHtml}
                    </div>
                </div>
            </div>
            <div class="spending-amount ${amountColorClass}">${displaySign}$${parseFloat(t.amount).toFixed(2)}</div>
        `;
        row.onclick = () => editTransaction(t.id);
        listContainer.appendChild(row);
    });

    const dataValues = Object.values(categoryTotals);
    const dataLabels = Object.keys(categoryTotals).map(id => { if(id === 'uncat') return viewMode === 'income' ? 'Income' : 'Uncategorized'; const cat = categories.find(c => c.id == id); return cat ? cat.name : 'Unknown'; });
    const dataColors = Object.keys(categoryTotals).map(id => { if(id === 'uncat') return viewMode === 'income' ? '#03dac6' : '#888'; const cat = categories.find(c => c.id == id); return cat ? cat.color : '#888'; });
    
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    
    chartInstance = new Chart(ctx, { 
        type: 'doughnut', 
        data: { labels: dataLabels, datasets: [{ data: dataValues, backgroundColor: dataColors, borderWidth: 0, hoverOffset: 4 }] }, 
        options: { 
            cutout: '70%', 
            responsive: true, 
            maintainAspectRatio: false, 
            resizeDelay: 0,
            animation: {
                duration: 800,       
                animateScale: true,  
                animateRotate: true,
                easing: 'easeOutQuart'
            },
            plugins: { legend: { display: false }, datalabels: { display: false } } 
        } 
    });
}

// --- GRAPH VIEW (INCOME/EXPENSE) ---
function toggleGraphMode(mode) {
    graphMode = mode;
    document.getElementById('btn-graph-expense').classList.toggle('active', mode === 'expense');
    document.getElementById('btn-graph-income').classList.toggle('active', mode === 'income');
    renderGraph();
}

function setGraphFilter(filter) {
    currentGraphFilter = filter;
    document.querySelectorAll('.graph-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText.toLowerCase() === filter) btn.classList.add('active');
    });
    document.getElementById('ctrl-day').classList.toggle('hidden', filter !== 'day');
    document.getElementById('ctrl-month').classList.toggle('hidden', filter !== 'month');
    document.getElementById('ctrl-period').classList.toggle('hidden', filter !== 'period');
    renderGraph();
}

function renderGraph() {
    const ctx = document.getElementById('tagChart').getContext('2d');
    
    const dayVal = document.getElementById('graph-date-input').value;
    const monthVal = document.getElementById('graph-month-input').value;
    const startVal = document.getElementById('graph-start-input').value;
    const endVal = document.getElementById('graph-end-input').value;

    const filteredTrans = transactions.filter(t => {
        if (t.type !== graphMode) return false; 
        
        const tDate = t.date;
        if (currentGraphFilter === 'day') return tDate === dayVal;
        else if (currentGraphFilter === 'month') return tDate.startsWith(monthVal);
        else if (currentGraphFilter === 'period') return tDate >= startVal && tDate <= endVal;
        return true;
    });

    const tagTotals = {};
    let hasData = false;
    let grandTotal = 0;

    filteredTrans.forEach(t => {
        if (t.tags && t.tags.length > 0) {
            t.tags.forEach(tag => {
                if (!tagTotals[tag]) tagTotals[tag] = 0;
                tagTotals[tag] += parseFloat(t.amount);
                hasData = true;
            });
        }
        grandTotal += parseFloat(t.amount);
    });

    const amountEl = document.getElementById('graph-total-amount');
    amountEl.innerText = `$${grandTotal.toFixed(2)}`;
    amountEl.style.color = graphMode === 'expense' ? '#cf6679' : '#03dac6';

    if (!hasData) {
        document.getElementById('no-tags-msg').classList.remove('hidden');
        if(graphChartInstance) graphChartInstance.destroy();
        return;
    }
    document.getElementById('no-tags-msg').classList.add('hidden');

    const sortedTags = Object.keys(tagTotals).sort((a, b) => tagTotals[b] - tagTotals[a]);
    const dataValues = sortedTags.map(tag => tagTotals[tag]);
    const barColors = sortedTags.map((_, index) => colors[index % colors.length]);

    if (graphChartInstance) graphChartInstance.destroy();

    graphChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedTags,
            datasets: [{ label: 'Amount', data: dataValues, backgroundColor: barColors, borderRadius: 5, barThickness: 25 }]
        },
        options: {
            indexAxis: 'y', 
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { right: 50 } },
            scales: { x: { display: false }, y: { grid: { display: false }, ticks: { color: '#fff', font: { size: 14 } } } },
            plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'end', color: '#fff', font: { weight: 'bold' }, formatter: function(value) { return '$' + value; } } }
        }
    });
}

function getAccountBalance(accountId) {
    const account = categories.find(c => c.id == accountId);
    let total = account ? parseFloat(account.initialBalance || 0) : 0;
    transactions.forEach(t => {
        if (t.type === 'transfer') { if (t.toAccountId == accountId) total += parseFloat(t.amount); if (t.fromAccountId == accountId) total -= parseFloat(t.amount); }
        if (t.type === 'expense' && t.accountId == accountId) total -= parseFloat(t.amount);
        if (t.type === 'income' && t.accountId == accountId) total += parseFloat(t.amount);
    });
    return total.toFixed(2);
}

// --- RENDER CATEGORIES (CLEAN LIST - NO ARROWS) ---
function renderCategories() {
    const list = document.getElementById('categories-list'); 
    list.innerHTML = '';
    
    const sections = categories.filter(c => c.type === 'section');

    if (sections.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#555; margin-top:20px;">No categories created.</div>';
        return;
    }

    sections.forEach(cat => {
        const item = document.createElement('div'); 
        item.className = 'cat-item';
        
        item.innerHTML = `
            <div class="cat-icon" style="background-color: ${cat.color}20; color: ${cat.color}">${cat.icon}</div>
            <div class="cat-info">
                <div style="font-weight:bold; color:#fff">${cat.name}</div>
            </div>
            <button class="edit-btn-icon" onclick="editCategory(${cat.id})">✏️</button>
        `;
        list.appendChild(item);
    });
}

function renderAccounts() {
    const list = document.getElementById('accounts-list'); const gt = document.getElementById('grand-total'); list.innerHTML = ''; let sum = 0; const accs = categories.filter(c => c.type === 'account');
    if (accs.length === 0) { list.innerHTML = '<div style="text-align:center; color:#555; margin-top:20px;">No accounts.</div>'; return; }
    accs.forEach(acc => { 
        const bal = getAccountBalance(acc.id); sum += parseFloat(bal); 
        const card = document.createElement('div'); 
        card.className = 'account-card'; 
        card.style.borderLeftColor = acc.color; 
        
        card.innerHTML = `
            <div class="acc-left">
                <div class="acc-icon">${acc.icon}</div>
                <div class="acc-name">${acc.name}</div>
            </div>
            <div class="acc-right">
                <div class="acc-balance">$${bal}</div>
                <button class="edit-btn-icon" onclick="editCategory(${acc.id})">✏️</button>
            </div>
        `; 
        list.appendChild(card); 
    });
    gt.innerText = `$${sum.toFixed(2)}`;
}

// --- FORMS & MODALS ---
function openCategoryForm(preSelectedType = null) { 
    editingId = null; 
    selectedType = preSelectedType; 
    document.getElementById('modal-title').innerText = selectedType === 'account' ? "New Account" : "New Category"; 
    
    document.getElementById('cat-name').value = ''; 
    document.getElementById('cat-initial-balance').value = ''; 
    document.getElementById('cat-cap').value = ''; 
    
    if (selectedType === 'account') {
        document.getElementById('cat-is-default').checked = false;
    }

    selectedColor = colors[0]; 
    selectedIcon = icons[0]; 
    updateFormUI(); 
    document.getElementById('category-form-overlay').classList.remove('hidden'); 
}

function editCategory(id) { 
    const c = categories.find(x => x.id === id); 
    if(!c) return; 
    
    editingId = id; 
    selectedType = c.type; 
    document.getElementById('modal-title').innerText = selectedType === 'account' ? "Edit Account" : "Edit Category"; 
    
    document.getElementById('cat-name').value = c.name; 
    document.getElementById('cat-initial-balance').value = c.initialBalance || ''; 
    document.getElementById('cat-cap').value = c.cap || ''; 
    
    if (selectedType === 'account') {
        const currentDefault = localStorage.getItem('defaultAccountId');
        document.getElementById('cat-is-default').checked = (currentDefault == c.id);
    }

    selectedColor = c.color; 
    selectedIcon = c.icon; 
    
    updateFormUI(); 
    document.getElementById('category-form-overlay').classList.remove('hidden'); 
}

function updateFormUI() { 
    const balInput = document.getElementById('balance-input-container'); 
    const capInput = document.getElementById('cap-input-container'); 
    
    if (selectedType === 'account') { 
        balInput.classList.remove('hidden'); 
        capInput.classList.add('hidden'); 
    } else { 
        balInput.classList.add('hidden'); 
        capInput.classList.remove('hidden'); 
    } 
    setupPickers(); 
}

function saveCategory() { 
    const name = document.getElementById('cat-name').value.trim(); 
    if (!name) return alert('Name required'); 
    
    const data = { 
        id: editingId ? editingId : Date.now(), 
        name, 
        type: selectedType, 
        color: selectedColor, 
        icon: selectedIcon, 
        order: editingId ? (categories.find(c => c.id === editingId).order || 0) : categories.length,
        initialBalance: selectedType === 'account' ? (parseFloat(document.getElementById('cat-initial-balance').value) || 0) : 0, 
        cap: selectedType === 'section' ? (parseFloat(document.getElementById('cat-cap').value) || 0) : 0 
    }; 

    if (editingId) { 
        const idx = categories.findIndex(c => c.id === editingId); 
        if (idx !== -1) categories[idx] = data; 
    } else { 
        categories.push(data); 
    } 
    
    if (selectedType === 'account') {
        const isDefault = document.getElementById('cat-is-default').checked;
        if (isDefault) {
            localStorage.setItem('defaultAccountId', data.id);
        } else {
            const currentDefault = localStorage.getItem('defaultAccountId');
            if (currentDefault == data.id) {
                localStorage.removeItem('defaultAccountId');
            }
        }
    }

    localStorage.setItem('categories', JSON.stringify(categories)); 
    renderCategories(); 
    renderAccounts(); 
    renderHome(); 
    closeCategoryForm(); 
}

function openTransactionForm() { 
    editingTxId = null; 
    document.getElementById('tx-modal-title').innerText = "Add Transaction"; 
    document.getElementById('btn-delete-tx').classList.add('hidden'); 
    
    tagDeleteMode = false; 
    updateTagActionBtn(); 
    document.getElementById('tag-action-btn').classList.add('hidden');
    
    setFormType(viewMode); 
    populateSelects(); 
    
    const defaultAcc = localStorage.getItem('defaultAccountId');
    if (defaultAcc && document.querySelector(`#tx-account option[value="${defaultAcc}"]`)) {
        document.getElementById('tx-account').value = defaultAcc;
    }

    currentTxTags = []; 
    document.getElementById('tx-tag-input').value = ''; 
    renderTagCloud(); 
    
    if (currentFilter === 'day') {
        const homeDate = document.getElementById('home-date-input').value;
        document.getElementById('tx-date').value = homeDate;
    } else {
        document.getElementById('tx-date').valueAsDate = new Date(); 
    }

    document.getElementById('tx-amount').value = ''; 
    document.getElementById('transaction-form-overlay').classList.remove('hidden'); 
}

function checkTagInput() {
    const val = document.getElementById('tx-tag-input').value.trim().toLowerCase();
    const btn = document.getElementById('tag-action-btn');
    
    if (val.length > 0) {
        btn.classList.remove('hidden');
    } else {
        btn.classList.add('hidden');
    }

    const chips = document.querySelectorAll('#tag-cloud .tag-chip');
    chips.forEach(chip => {
        const tagText = chip.innerText.toLowerCase();
        if (tagText.includes(val)) {
            chip.style.display = "flex"; 
        } else {
            chip.style.display = "none"; 
        }
    });
}

function saveTransaction() {
    const accountId = document.getElementById('tx-account').value; 
    const catId = formMode === 'expense' ? document.getElementById('tx-category').value : null; 
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const dateStr = document.getElementById('tx-date').value;

    if (!amount || amount <= 0) return alert("Valid amount required");
    
    if (formMode === 'expense' && catId) {
        const cat = categories.find(c => c.id == catId);
        if (cat && cat.cap > 0) {
            const monthStr = dateStr.slice(0, 7); 
            let currentMonthSpent = 0;
            transactions.forEach(t => {
                if (t.categoryId == catId && t.type === 'expense' && t.date.startsWith(monthStr) && t.id !== editingTxId) {
                    currentMonthSpent += parseFloat(t.amount);
                }
            });
            const newTotal = currentMonthSpent + amount;
            if (newTotal > cat.cap) {
                alert(`⚠️ Spending Alert!\n\nOver monthly limit for ${cat.name}.\n\nCap: $${cat.cap}\nNew Total: $${newTotal}`);
            } else if (newTotal >= (cat.cap * 0.9)) {
                alert(`⚠️ Warning: 90% of limit reached for ${cat.name}.`);
            }
        }
    }

    const txData = { id: editingTxId ? editingTxId : Date.now(), type: formMode, accountId, categoryId: catId || null, amount, date: dateStr, tags: [...currentTxTags] };
    if (editingTxId) { const index = transactions.findIndex(t => t.id === editingTxId); if (index !== -1) transactions[index] = txData; } else { transactions.push(txData); }
    localStorage.setItem('transactions', JSON.stringify(transactions)); closeTransactionForm(); toggleHomeView(formMode);
}

function setupPickers() { document.getElementById('color-picker').innerHTML = colors.map(c => `<div class="color-swatch" style="background:${c}; ${c === selectedColor ? 'border-color:white' : ''}" onclick="setColor('${c}')"></div>`).join(''); document.getElementById('icon-picker').innerHTML = icons.map(i => `<div class="icon-option ${i === selectedIcon ? 'selected' : ''}" onclick="setIcon('${i}')">${i}</div>`).join(''); }
function closeCategoryForm() { document.getElementById('category-form-overlay').classList.add('hidden'); }
function selectType(btn, type) { selectedType = type; updateFormUI(); }
function setColor(color) { selectedColor = color; setupPickers(); }
function setIcon(icon) { selectedIcon = icon; setupPickers(); }
function openTransferForm() { const f = document.getElementById('trans-from'), t = document.getElementById('trans-to'); f.innerHTML = ''; t.innerHTML = ''; const accs = categories.filter(c => c.type === 'account'); if (accs.length < 2) return alert("Need 2 accounts"); accs.forEach(acc => { const op = `<option value="${acc.id}">${acc.name}</option>`; f.innerHTML += op; t.innerHTML += op; }); document.getElementById('trans-date').valueAsDate = new Date(); document.getElementById('trans-amount').value = ''; document.getElementById('transfer-form-overlay').classList.remove('hidden'); }
function closeTransferForm() { document.getElementById('transfer-form-overlay').classList.add('hidden'); }
function saveTransfer() { const f = document.getElementById('trans-from').value, t = document.getElementById('trans-to').value, a = document.getElementById('trans-amount').value; if (f === t || !a || a <= 0) return alert("Invalid transfer"); transactions.push({ id: Date.now(), type: 'transfer', fromAccountId: f, toAccountId: t, amount: parseFloat(a), date: document.getElementById('trans-date').value, note: document.getElementById('trans-note').value }); localStorage.setItem('transactions', JSON.stringify(transactions)); closeTransferForm(); renderAccounts(); renderHome(); }

function handleTagAction() { if (tagDeleteMode) { tagDeleteMode = false; } else { addNewTag(); } updateTagActionBtn(); renderTagCloud(); }
function updateTagActionBtn() { const btn = document.getElementById('tag-action-btn'); if (tagDeleteMode) { btn.innerText = "✓"; btn.classList.add('done-mode'); } else { btn.innerText = "+"; btn.classList.remove('done-mode'); } }
function renderTagCloud() { const cloud = document.getElementById('tag-cloud'); cloud.innerHTML = ''; allTags.forEach(tag => { const chip = document.createElement('div'); if (tagDeleteMode) { chip.className = 'tag-chip deletable'; chip.innerText = tag; chip.onclick = () => deleteTagPermanent(tag); } else { const isSelected = currentTxTags.includes(tag); chip.className = `tag-chip ${isSelected ? 'selected' : ''}`; chip.innerText = tag; chip.onclick = () => toggleTag(tag); chip.addEventListener('mousedown', startPress); chip.addEventListener('touchstart', startPress); chip.addEventListener('mouseup', cancelPress); chip.addEventListener('mouseleave', cancelPress); chip.addEventListener('touchend', cancelPress); } cloud.appendChild(chip); }); }
function startPress(e) { resetInterval = setTimeout(() => { tagDeleteMode = true; updateTagActionBtn(); renderTagCloud(); }, 800); }
function cancelPress() { clearTimeout(resetInterval); }
function deleteTagPermanent(tag) { if (confirm(`Delete tag "${tag}" permanently? This will remove it from all past expenses.`)) { allTags = allTags.filter(t => t !== tag); localStorage.setItem('allTags', JSON.stringify(allTags)); currentTxTags = currentTxTags.filter(t => t !== tag); transactions.forEach(t => { if (t.tags) { t.tags = t.tags.filter(tTag => tTag !== tag); } }); localStorage.setItem('transactions', JSON.stringify(transactions)); renderTagCloud(); renderHome(); renderGraph(); } }

function addNewTag() { 
    const input = document.getElementById('tx-tag-input'); 
    const val = input.value.trim(); 
    
    if(val) { 
        const exists = allTags.some(t => t.toLowerCase() === val.toLowerCase());
        
        if (!exists) { 
            allTags.push(val); 
            localStorage.setItem('allTags', JSON.stringify(allTags)); 
        } 
        
        const alreadySelected = currentTxTags.some(t => t.toLowerCase() === val.toLowerCase());
        if (!alreadySelected) { 
            const originalTag = allTags.find(t => t.toLowerCase() === val.toLowerCase()) || val;
            currentTxTags.push(originalTag); 
        } 
        
        input.value = ''; 
        document.getElementById('tag-action-btn').classList.add('hidden');
        renderTagCloud(); 
    } 
}

function toggleTag(tag) { if(currentTxTags.includes(tag)) { currentTxTags = currentTxTags.filter(t => t !== tag); } else { currentTxTags.push(tag); } renderTagCloud(); }
function editTransaction(id) { const tx = transactions.find(t => t.id === id); if(!tx) return; editingTxId = id; document.getElementById('tx-modal-title').innerText = "Edit Transaction"; document.getElementById('btn-delete-tx').classList.remove('hidden'); tagDeleteMode = false; updateTagActionBtn(); populateSelects(); setFormType(tx.type); document.getElementById('tx-amount').value = tx.amount; document.getElementById('tx-account').value = tx.accountId; if(tx.categoryId) document.getElementById('tx-category').value = tx.categoryId; document.getElementById('tx-date').value = tx.date; currentTxTags = tx.tags || []; renderTagCloud(); document.getElementById('transaction-form-overlay').classList.remove('hidden'); }
function populateSelects() { const accSelect = document.getElementById('tx-account'); accSelect.innerHTML = ''; categories.filter(c => c.type === 'account').forEach(acc => accSelect.innerHTML += `<option value="${acc.id}">${acc.name}</option>`); const catSelect = document.getElementById('tx-category'); catSelect.innerHTML = '<option value="">Uncategorized</option>'; categories.filter(c => c.type === 'section').forEach(cat => catSelect.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`); }
function setFormType(type) { formMode = type; const btnExp = document.getElementById('btn-form-expense'), btnInc = document.getElementById('btn-form-income'); const amountInput = document.getElementById('tx-amount'), labelAccount = document.getElementById('lbl-account'), categoryWrapper = document.getElementById('tx-category-wrapper'); if (type === 'expense') { btnExp.classList.add('active'); btnExp.style.backgroundColor = '#cf6679'; btnExp.style.color = 'black'; btnInc.classList.remove('active'); btnInc.style.backgroundColor = '#2c2c2c'; btnInc.style.color = '#888'; amountInput.style.color = '#cf6679'; labelAccount.innerText = "Pay From"; categoryWrapper.classList.remove('hidden'); } else { btnInc.classList.add('active'); btnInc.style.backgroundColor = '#03dac6'; btnInc.style.color = 'black'; btnExp.classList.remove('active'); btnExp.style.backgroundColor = '#2c2c2c'; btnExp.style.color = '#888'; amountInput.style.color = '#03dac6'; labelAccount.innerText = "Deposit To"; categoryWrapper.classList.add('hidden'); } }
function closeTransactionForm() { document.getElementById('transaction-form-overlay').classList.add('hidden'); }
function deleteTransaction() { if (!editingTxId) return; if (confirm("Delete this transaction?")) { transactions = transactions.filter(t => t.id !== editingTxId); localStorage.setItem('transactions', JSON.stringify(transactions)); closeTransactionForm(); toggleHomeView(viewMode); } }
function openResetConfirmation() { document.getElementById('reset-confirm-overlay').classList.remove('hidden'); }
function closeResetConfirmation() { document.getElementById('reset-confirm-overlay').classList.add('hidden'); }
function startResetProcess() { closeResetConfirmation(); document.getElementById('reset-progress-overlay').classList.remove('hidden'); const fill = document.getElementById('reset-fill'); const timerText = document.getElementById('reset-timer-text'); let progress = 0; const totalTime = 10000; const intervalTime = 100; const steps = totalTime / intervalTime; let currentStep = 0; fill.style.width = '0%'; resetInterval = setInterval(() => { currentStep++; progress = (currentStep / steps) * 100; fill.style.width = `${progress}%`; const secondsLeft = Math.ceil((totalTime - (currentStep * intervalTime)) / 1000); timerText.innerText = `${secondsLeft}s remaining`; if (currentStep >= steps) { clearInterval(resetInterval); performFullReset(); } }, intervalTime); }
function cancelReset() { clearInterval(resetInterval); resetInterval = null; document.getElementById('reset-progress-overlay').classList.add('hidden'); }
function performFullReset() { localStorage.clear(); location.reload(); }

init();
