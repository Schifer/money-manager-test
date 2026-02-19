// render.js - Handles all Visual Updates (Optimized v0.4)

// --- ICONS (SVG STRINGS) ---
const ICON_EYE_LINEAR = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`;
const ICON_EYE_BOLD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:20px;height:20px;"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clip-rule="evenodd" /></svg>`;

// --- REGISTER PLUGINS ---
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
}

// NOTE: escapeHtml() is inherited from utils.js to prevent conflicts.

// --- 1. HOME SCREEN ---
function renderHome() {
    const accountSelect = document.getElementById('home-account-select');
    
    // Lazy Load Options (Performance)
    if (accountSelect.options.length === 0) { 
        const fragment = document.createDocumentFragment();
        const allOpt = document.createElement('option');
        allOpt.value = 'all';
        allOpt.text = 'All Accounts';
        fragment.appendChild(allOpt);

        categories.filter(c => c.type === 'account').forEach(acc => { 
            const opt = document.createElement('option');
            opt.value = acc.id;
            opt.text = acc.name; 
            fragment.appendChild(opt);
        }); 
        accountSelect.appendChild(fragment);
    }
    
    renderHomeTagFilter(); 

    const selectedAccountId = accountSelect.value;
    const balanceEl = document.getElementById('home-balance');
    const privacyBtn = document.getElementById('btn-privacy');

    // PRIVACY CHECK
    if (isBalanceHidden) {
        balanceEl.innerText = '••••••';
        if(privacyBtn) privacyBtn.innerHTML = ICON_EYE_BOLD; 
    } else {
        if (selectedAccountId === 'all') { 
            let total = 0; 
            categories.filter(c => c.type === 'account').forEach(acc => total += parseFloat(getAccountBalance(acc.id))); 
            balanceEl.innerText = formatINR(total); 
        } else { 
            balanceEl.innerText = formatINR(getAccountBalance(selectedAccountId)); 
        }
        if(privacyBtn) privacyBtn.innerHTML = ICON_EYE_LINEAR; 
    }
    
    renderHomeBudgets(); 
    updateChart(selectedAccountId);
}

function renderHomeTagFilter() {
    const select = document.getElementById('home-tag-filter');
    if (!select) return; 
    
    // Only re-render if count changes (Micro-optimization)
    if (select.options.length === allTags.length + 1) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">All Tags</option>';
    
    if (allTags.length > 0) {
        const fragment = document.createDocumentFragment();
        allTags.sort().forEach(tag => {
            const opt = document.createElement('option');
            opt.value = tag;
            opt.text = tag;
            fragment.appendChild(opt);
        });
        select.appendChild(fragment);
    }
    select.value = currentVal;
}

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

    cappedCategories.sort((a, b) => (a.order || 0) - (b.order || 0));

    // PERFORMANCE: Use Fragment
    const fragment = document.createDocumentFragment();

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
        
        el.setAttribute('draggable', 'true');
        el.setAttribute('data-id', cat.id);
        
        // Dark Grey Background (#242424) + Colored Icon
        el.innerHTML = `
            <div class="cat-icon" style="background-color: #242424; color: ${cat.color}">${cat.icon}</div>
            <div class="cat-info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; color:#fff">${escapeHtml(cat.name)}</span>
                    <span style="font-size:12px; color:#888">${formatINR(spent)} / ${formatINR(cat.cap)}</span>
                </div>
                <div class="budget-bar-track" style="margin-top:5px;">
                    <div class="budget-bar-fill ${colorClass}" style="width:${pct}%"></div>
                </div>
            </div>
        `;
        fragment.appendChild(el);
    });

    container.appendChild(fragment);
    setupBudgetDrag(container);
}

function updateChart(accountId) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    // Retrieve DOM Elements once
    const dayVal = document.getElementById('home-date-input').value;
    const weekVal = document.getElementById('home-week-input').value;
    const monthVal = document.getElementById('home-month-input').value;
    const startVal = document.getElementById('home-start-input') ? document.getElementById('home-start-input').value : '';
    const endVal = document.getElementById('home-end-input') ? document.getElementById('home-end-input').value : '';
    const tagFilterVal = document.getElementById('home-tag-filter') ? document.getElementById('home-tag-filter').value : '';

    // Filter Logic
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

    // Calculate Totals
    let periodTotal = 0; 
    const categoryTotals = {};
    filteredTrans.forEach(t => { 
        const catId = t.categoryId || 'uncat'; 
        if (!categoryTotals[catId]) categoryTotals[catId] = 0; 
        categoryTotals[catId] += parseFloat(t.amount); 
        periodTotal += parseFloat(t.amount); 
    });
    
    const periodTotalEl = document.getElementById('period-total');
    if(periodTotalEl) periodTotalEl.innerText = formatINR(periodTotal);
    
    const listContainer = document.getElementById('transaction-list'); 
    listContainer.innerHTML = '';
    
    if (periodTotal === 0) { 
        document.getElementById('no-data-msg').classList.remove('hidden'); 
        if(chartInstance) chartInstance.destroy(); 
        return; 
    }
    document.getElementById('no-data-msg').classList.add('hidden');
    
    const sortedTrans = filteredTrans.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // PERFORMANCE: Use Fragment for Transaction List
    const fragment = document.createDocumentFragment();

    sortedTrans.forEach(t => {
        let name, icon, color;
        if (!t.categoryId) { 
            name = t.type === 'income' ? 'Income' : 'Uncategorized'; 
            icon = t.type === 'income' ? '💵' : '❓'; 
            color = t.type === 'income' ? '#2ECC71' : '#888'; 
        } else { 
            const cat = categories.find(c => c.id == t.categoryId); 
            name = cat ? cat.name : 'Unknown'; 
            icon = cat ? cat.icon : '❓'; 
            color = cat ? cat.color : '#888'; 
        }

        let tagHtml = '';
        if (t.tags && t.tags.length > 0) {
            tagHtml = t.tags.map(tag => `<span class="tag-pill-card">${escapeHtml(tag)}</span>`).join(' ');
        }

        const amountColorClass = t.type === 'expense' ? 'text-red' : 'text-green';
        const displaySign = t.type === 'expense' ? '-' : '+';

        const row = document.createElement('div'); row.className = 'spending-item';
        
        row.innerHTML = `
            <div class="spending-left">
                <div class="spending-icon" style="background-color:#242424; color:${color}">${icon}</div>
                <div class="spending-info">
                    <span class="spending-name">${escapeHtml(name)}</span>
                    <div class="spending-details-row">
                        <span class="spending-date">${t.date}</span>
                        ${tagHtml}
                    </div>
                </div>
            </div>
            <div class="spending-amount ${amountColorClass}">${displaySign}${formatINR(t.amount).replace('₹', '')}</div>
        `;
        row.onclick = () => editTransaction(t.id);
        fragment.appendChild(row);
    });
    
    listContainer.appendChild(fragment);

    // Chart Rendering
    const dataValues = Object.values(categoryTotals);
    const dataLabels = Object.keys(categoryTotals).map(id => { 
        if(id === 'uncat') return viewMode === 'income' ? 'Income' : 'Uncategorized'; 
        const cat = categories.find(c => c.id == id); 
        return cat ? cat.name : 'Unknown'; 
    });
    const dataColors = Object.keys(categoryTotals).map(id => { 
        if(id === 'uncat') return viewMode === 'income' ? '#2ECC71' : '#888'; 
        const cat = categories.find(c => c.id == id); 
        return cat ? cat.color : '#888'; 
    });
    
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    
    chartInstance = new Chart(ctx, { 
        type: 'doughnut', 
        data: { 
            labels: dataLabels, 
            datasets: [{ 
                data: dataValues, 
                backgroundColor: dataColors, 
                borderWidth: 5, 
                borderColor: '#111111', 
                borderRadius: 07, 
                hoverOffset: 4 
            }] 
        }, 
        options: { 
            cutout: '70%', 
            responsive: true, maintainAspectRatio: false, resizeDelay: 0,
            animation: { duration: 800, animateScale: true, animateRotate: true, easing: 'easeOutQuart' },
            plugins: { legend: { display: false }, datalabels: { display: false } } 
        },
        plugins: [ChartDataLabels]
    });
}

// --- 2. GRAPH SCREEN ---
function renderGraph() {
    const ctx = document.getElementById('tagChart').getContext('2d');
    
    const dayVal = document.getElementById('graph-date-input').value;
    const monthVal = document.getElementById('graph-month-input').value;
    const startVal = document.getElementById('graph-start-input') ? document.getElementById('graph-start-input').value : '';
    const endVal = document.getElementById('graph-end-input') ? document.getElementById('graph-end-input').value : '';

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
    amountEl.innerText = formatINR(grandTotal);
    amountEl.style.color = graphMode === 'expense' ? '#E74C3C' : '#2ECC71';

    if (!hasData) {
        document.getElementById('no-tags-msg').classList.remove('hidden');
        if(graphChartInstance) graphChartInstance.destroy();
        return;
    }
    document.getElementById('no-tags-msg').classList.add('hidden');

    const sortedTags = Object.keys(tagTotals).sort((a, b) => tagTotals[b] - tagTotals[a]);
    const dataValues = sortedTags.map(tag => tagTotals[tag]);
    const barColors = sortedTags.map((_, index) => COLORS[index % COLORS.length]);

    if (graphChartInstance) graphChartInstance.destroy();

    graphChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedTags,
            datasets: [{ 
                label: 'Amount', 
                data: dataValues, 
                backgroundColor: barColors, 
                borderRadius: 4, 
                barThickness: 32, 
                borderSkipped: false 
            }]
        },
        options: {
            indexAxis: 'y', 
            responsive: true, 
            maintainAspectRatio: false,
            layout: { padding: { right: 80, left: 10 } },
            animations: { x: { type: 'number', easing: 'easeOutQuart', duration: 1000, from: 0, delay: 0 }, y: { type: 'number', duration: 0 } },
            animation: { duration: 0 },
            scales: { 
                x: { display: false, beginAtZero: true, min: 0 }, 
                y: { grid: { display: false, drawBorder: false }, ticks: { color: '#fff', font: { size: 13, weight: 'bold', family: 'monospace' }, padding: 8 }, border: { display: false } } 
            },
            plugins: { 
                legend: { display: false }, 
                tooltip: { enabled: false }, 
                datalabels: { 
                    display: true,
                    anchor: 'end',    
                    align: 'end',     
                    color: '#ffffff', 
                    font: { weight: 'bold', size: 12 }, 
                    formatter: function(value) { return formatINR(value); },
                    offset: 6, clamp: false, clip: false       
                } 
            }
        },
        plugins: [ChartDataLabels]
    });
}

// --- 3. ACCOUNTS SCREEN ---
function renderAccounts() {
    const list = document.getElementById('accounts-list'); 
    const gt = document.getElementById('grand-total'); 
    list.innerHTML = ''; 
    let sum = 0; 
    const accs = categories.filter(c => c.type === 'account');
    
    if (accs.length === 0) { 
        list.innerHTML = '<div style="text-align:center; color:#555; margin-top:20px;">No accounts.</div>'; 
        return; 
    }

    const fragment = document.createDocumentFragment();

    accs.forEach(acc => { 
        const bal = getAccountBalance(acc.id); 
        sum += parseFloat(bal); 
        
        const card = document.createElement('div'); 
        card.className = 'account-card'; 
        card.style.borderLeftColor = acc.color; 
        card.onclick = () => editCategory(acc.id);
        
        card.innerHTML = `
            <div class="acc-left">
                <div class="acc-icon" style="background-color: #242424; color: ${acc.color}">${acc.icon}</div>
                <div class="acc-name">${escapeHtml(acc.name)}</div>
            </div>
            <div class="acc-right">
                <div style="text-align:right;">
                    <div style="font-size:10px; color:#888; text-transform:uppercase;">Available</div>
                    <div class="acc-balance">${formatINR(bal)}</div>
                </div>
                <div style="color:#666; margin-left:10px; font-size:18px;">✏️</div>
            </div>
        `; 
        fragment.appendChild(card); 
    });
    
    list.appendChild(fragment);
    if(gt) gt.innerText = formatINR(sum);
}

// --- 4. CATEGORIES SCREEN ---
function renderCategories() {
    const list = document.getElementById('categories-list'); 
    list.innerHTML = '';
    
    const sections = categories.filter(c => c.type === 'section');

    if (sections.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#555; margin-top:20px;">No categories created.</div>';
        return;
    }

    sections.sort((a, b) => (a.order || 0) - (b.order || 0));

    const fragment = document.createDocumentFragment();

    sections.forEach(cat => {
        const item = document.createElement('div'); 
        item.className = 'cat-item';
        item.onclick = () => editCategory(cat.id);
        
        item.innerHTML = `
            <div class="cat-icon" style="background-color: #242424; color: ${cat.color}">${cat.icon}</div>
            <div class="cat-info">
                <div style="font-weight:bold; color:#fff">${escapeHtml(cat.name)}</div>
            </div>
            <div style="color:#666; font-size:18px;">✏️</div>
        `;
        fragment.appendChild(item);
    });
    
    list.appendChild(fragment);
}

// --- 5. TAG CLOUD ---
function renderTagCloud() { 
    const cloud = document.getElementById('tag-cloud'); 
    cloud.innerHTML = ''; 
    
    const fragment = document.createDocumentFragment();

    allTags.forEach(tag => { 
        const chip = document.createElement('div'); 
        if (tagDeleteMode) { 
            chip.className = 'tag-chip deletable'; 
            chip.innerText = tag; 
            chip.onclick = () => deleteTagPermanent(tag); 
        } else { 
            const isSelected = currentTxTags.includes(tag); 
            chip.className = `tag-chip ${isSelected ? 'selected' : ''}`; 
            chip.innerText = tag; 
            chip.onclick = () => toggleTag(tag); 
            chip.addEventListener('mousedown', startPress); 
            chip.addEventListener('touchstart', startPress); 
            chip.addEventListener('mouseup', cancelPress); 
            chip.addEventListener('mouseleave', cancelPress); 
            chip.addEventListener('touchend', cancelPress); 
        } 
        fragment.appendChild(chip); 
    }); 
    
    cloud.appendChild(fragment);
}

// --- 6. TRANSFER HISTORY ---
function renderTransferHistory() {
    const container = document.getElementById('transfer-list');
    container.innerHTML = '';
    
    const transfers = transactions
        .filter(t => t.type === 'transfer')
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (transfers.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#555; margin-top:20px;">No transfer history.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();

    transfers.forEach(t => {
        const fromAcc = categories.find(c => c.id == t.fromAccountId);
        const toAcc = categories.find(c => c.id == t.toAccountId);
        
        const el = document.createElement('div');
        el.className = 'spending-item';
        
        el.innerHTML = `
            <div class="spending-left">
                <div class="spending-icon" style="background-color: #242424; color: #fff; font-size: 14px;">⇄</div>
                <div class="spending-info">
                    <span class="spending-name" style="font-size:13px; color:#ccc;">
                        <span style="color:#fff; font-weight:bold;">${fromAcc ? escapeHtml(fromAcc.name) : '???'}</span> 
                        &nbsp;➔&nbsp; 
                        <span style="color:#fff; font-weight:bold;">${toAcc ? escapeHtml(toAcc.name) : '???'}</span>
                    </span>
                    <div class="spending-details-row">
                        <span class="spending-date">${formatDateFriendly(t.date)}</span>
                        ${t.note ? `<span class="tag-pill-card">${escapeHtml(t.note)}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="spending-amount" style="color: #fff;">${formatINR(t.amount)}</div>
        `;
        fragment.appendChild(el);
    });
    
    container.appendChild(fragment);
}
