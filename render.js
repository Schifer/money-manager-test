// render.js - Handles all Visual Updates

// --- REGISTER PLUGINS ---
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
}

// --- 1. HOME SCREEN ---
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
    const balanceEl = document.getElementById('home-balance');
    const privacyBtn = document.getElementById('btn-privacy');

    // PRIVACY CHECK
    if (isBalanceHidden) {
        balanceEl.innerText = '••••••';
        if(privacyBtn) privacyBtn.innerText = '🙈'; // Closed Eye
    } else {
        if (selectedAccountId === 'all') { 
            let total = 0; 
            categories.filter(c => c.type === 'account').forEach(acc => total += parseFloat(getAccountBalance(acc.id))); 
            balanceEl.innerText = formatINR(total); 
        } else { 
            balanceEl.innerText = formatINR(getAccountBalance(selectedAccountId)); 
        }
        if(privacyBtn) privacyBtn.innerText = '👁️'; // Open Eye
    }
    
    renderHomeBudgets(); 
    updateChart(selectedAccountId);
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
        
        el.innerHTML = `
            <div class="cat-icon" style="background-color: ${cat.color}20; color: ${cat.color}">${cat.icon}</div>
            <div class="cat-info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; color:#fff">${cat.name}</span>
                    <span style="font-size:12px; color:#888">${formatINR(spent)} / ${formatINR(cat.cap)}</span>
                </div>
                <div class="budget-bar-track" style="margin-top:5px;">
                    <div class="budget-bar-fill ${colorClass}" style="width:${pct}%"></div>
                </div>
            </div>
        `;
        container.appendChild(el);
    });

    setupBudgetDrag(container);
}

function updateChart(accountId) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    const dayVal = document.getElementById('home-date-input').value;
    const weekVal = document.getElementById('home-week-input').value;
    const monthVal = document.getElementById('home-month-input').value;
    const startInput = document.getElementById('home-start-input');
    const endInput = document.getElementById('home-end-input');
    const startVal = startInput ? startInput.value : '';
    const endVal = endInput ? endInput.value : '';
    const tagFilterVal = document.getElementById('home-tag-filter') ? document.getElementById('home-tag-filter').value : '';

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
    
    const periodTotalEl = document.getElementById('period-total');
    if(periodTotalEl) periodTotalEl.innerText = formatINR(periodTotal);
    
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
            color = t.type === 'income' ? '#4bb14e' : '#888'; 
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
            <div class="spending-amount ${amountColorClass}">${displaySign}${formatINR(t.amount).replace('₹', '')}</div>
        `;
        row.onclick = () => editTransaction(t.id);
        listContainer.appendChild(row);
    });

    const dataValues = Object.values(categoryTotals);
    const dataLabels = Object.keys(categoryTotals).map(id => { if(id === 'uncat') return viewMode === 'income' ? 'Income' : 'Uncategorized'; const cat = categories.find(c => c.id == id); return cat ? cat.name : 'Unknown'; });
    const dataColors = Object.keys(categoryTotals).map(id => { if(id === 'uncat') return viewMode === 'income' ? '#4bb14e' : '#888'; const cat = categories.find(c => c.id == id); return cat ? cat.color : '#888'; });
    
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    
    chartInstance = new Chart(ctx, { 
        type: 'doughnut', 
        data: { labels: dataLabels, datasets: [{ data: dataValues, backgroundColor: dataColors, borderWidth: 0, hoverOffset: 4 }] }, 
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
    amountEl.innerText = formatINR(grandTotal);
    amountEl.style.color = graphMode === 'expense' ? '#f13130' : '#4bb14e';

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
            
            animations: {
                x: {
                    type: 'number',
                    easing: 'easeOutQuart',
                    duration: 1000,
                    from: 0, 
                    delay: 0
                },
                y: {
                    type: 'number',
                    duration: 0 
                }
            },
            animation: { duration: 0 },
            
            scales: { 
                x: { display: false, beginAtZero: true, min: 0 }, 
                y: { 
                    grid: { display: false, drawBorder: false }, 
                    ticks: { color: '#fff', font: { size: 13, weight: 'bold', family: 'monospace' }, padding: 8 },
                    border: { display: false }
                } 
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
                    offset: 6,
                    clamp: false,     
                    clip: false       
                } 
            }
        },
        plugins: [ChartDataLabels]
    });
}

// --- 3. ACCOUNTS SCREEN (REAL-TIME UPDATE) ---
function renderAccounts() {
    const list = document.getElementById('accounts-list'); const gt = document.getElementById('grand-total'); list.innerHTML = ''; let sum = 0; const accs = categories.filter(c => c.type === 'account');
    if (accs.length === 0) { list.innerHTML = '<div style="text-align:center; color:#555; margin-top:20px;">No accounts.</div>'; return; }
    accs.forEach(acc => { 
        // THIS IS THE KEY: We calculate the LIVE balance using getAccountBalance()
        const bal = getAccountBalance(acc.id); 
        sum += parseFloat(bal); 
        
        const card = document.createElement('div'); 
        card.className = 'account-card'; 
        card.style.borderLeftColor = acc.color; 
        
        card.innerHTML = `
            <div class="acc-left">
                <div class="acc-icon">${acc.icon}</div>
                <div class="acc-name">${acc.name}</div>
            </div>
            <div class="acc-right">
                <div style="text-align:right;">
                    <div style="font-size:10px; color:#888; text-transform:uppercase;">Available</div>
                    <div class="acc-balance">${formatINR(bal)}</div>
                </div>
                <button class="edit-btn-icon" style="background:none; border:none; color:#666; margin-left:10px;" onclick="editCategory(${acc.id})">✏️</button>
            </div>
        `; 
        list.appendChild(card); 
    });
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

    sections.forEach(cat => {
        const item = document.createElement('div'); 
        item.className = 'cat-item';
        
        item.innerHTML = `
            <div class="cat-icon" style="background-color: ${cat.color}20; color: ${cat.color}">${cat.icon}</div>
            <div class="cat-info">
                <div style="font-weight:bold; color:#fff">${cat.name}</div>
            </div>
            <button class="edit-btn-icon" style="background:none; border:none; color:#666;" onclick="editCategory(${cat.id})">✏️</button>
        `;
        list.appendChild(item);
    });
}

// --- 5. TAG CLOUD ---
function renderTagCloud() { 
    const cloud = document.getElementById('tag-cloud'); 
    cloud.innerHTML = ''; 
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
        cloud.appendChild(chip); 
    }); 
}
