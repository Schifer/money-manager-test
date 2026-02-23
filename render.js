// render.js - Handles Visuals & Card Swiper (v0.5.1)

const ICON_EYE_LINEAR = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`;
const ICON_EYE_BOLD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:20px;height:20px;"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clip-rule="evenodd" /></svg>`;
const ICON_EDIT_LINEAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;

if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);

function renderHome() {
    renderCards();
    renderHomeTagFilter(); 
    const selectedAccountId = document.getElementById('home-account-select').value;
    renderHomeBudgets(); 
    updateChart(selectedAccountId);
}

function renderCards() {
    const track = document.getElementById('home-card-track');
    const dots = document.getElementById('card-dots');
    const hiddenSelect = document.getElementById('home-account-select');
    const currentSelected = hiddenSelect.value;
    
    track.innerHTML = ''; dots.innerHTML = '';
    
    const allAccounts = [{ id: 'all', name: 'UNIVERSAL', color: '#444444' }, ...categories.filter(c => c.type === 'account')];
    
    allAccounts.forEach((acc, index) => {
        let bal = acc.id === 'all' 
            ? categories.filter(c => c.type === 'account').reduce((sum, a) => sum + getAccountBalance(a.id), 0) 
            : getAccountBalance(acc.id);
            
        let displayBal = isBalanceHidden ? '••••••' : formatINR(bal);
        let eyeIcon = isBalanceHidden ? ICON_EYE_BOLD : ICON_EYE_LINEAR;
        
        let bgGradient = acc.id === 'all' 
            ? `linear-gradient(135deg, var(--c-med) 0%, var(--c-deep) 100%)` 
            : `linear-gradient(135deg, ${acc.color} 0%, var(--c-deep) 120%)`;

        const card = document.createElement('div');
        card.className = 'premium-card';
        card.setAttribute('data-id', acc.id);
        card.style.background = bgGradient;
        
        card.innerHTML = `
            <div class="card-top-row">
                <div class="contactless-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 8a12 12 0 0116 0M6 12a8 8 0 0112 0M8 16a4 4 0 018 0M12 20h.01"/>
                    </svg>
                </div>
                <div class="card-brand-logo" style="color: rgba(255,255,255,0.9)">
                    ${acc.id === 'all' ? 'UNIVERSAL' : escapeHtml(acc.name).toUpperCase()}
                </div>
            </div>
            
            <div class="card-masked-numbers">**** **** **** ****</div>
            
            <div class="card-balance-wrapper">
                <div class="card-balance">
                    ${displayBal}
                    <button class="privacy-btn" style="color:rgba(255,255,255,0.7);" onclick="togglePrivacy()">${eyeIcon}</button>
                </div>
            </div>
            
            <div class="card-bottom-row">
                <div>
                    <div class="card-label">Card holder name</div>
                    <div class="card-value">${escapeHtml(userName)}</div>
                </div>
                <div class="card-exp-wrapper">
                    <div class="card-label">Expiry date</div>
                    <div class="card-value">12/30</div>
                </div>
                <div class="card-chip-icon">
                    <svg width="28" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5">
                        <rect x="2" y="4" width="20" height="16" rx="4"/>
                        <path d="M6 12h12M12 4v16"/>
                    </svg>
                </div>
            </div>
        `;
        track.appendChild(card);
        
        const dot = document.createElement('div');
        dot.className = `dot ${acc.id === currentSelected ? 'active' : ''}`;
        dots.appendChild(dot);
    });
    
    setTimeout(() => {
        const activeCard = track.querySelector(`[data-id="${currentSelected}"]`);
        if(activeCard) track.scrollTo({ left: activeCard.offsetLeft - track.offsetLeft, behavior: 'instant' });
    }, 10);
}

function renderHomeTagFilter() {
    const select = document.getElementById('home-tag-filter');
    if (!select || select.options.length === allTags.length + 1) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">All Tags</option>';
    const fragment = document.createDocumentFragment();
    allTags.sort().forEach(tag => {
        const opt = document.createElement('option'); opt.value = tag; opt.text = tag; fragment.appendChild(opt);
    });
    select.appendChild(fragment); select.value = currentVal;
}

function renderHomeBudgets() {
    const container = document.getElementById('budget-overview');
    container.innerHTML = '';
    const cappedCategories = categories.filter(c => c.type === 'section' && c.cap > 0);
    if (cappedCategories.length === 0) { container.classList.add('hidden'); return; }
    container.classList.remove('hidden');
    
    const headerRow = document.createElement('div'); headerRow.className = 'budget-header-row';
    headerRow.onclick = () => { isBudgetExpanded = !isBudgetExpanded; renderHomeBudgets(); };
    headerRow.innerHTML = `<h3 style="margin:0;">Monthly Budgets</h3><span class="budget-toggle-icon ${isBudgetExpanded ? '' : 'collapsed'}">▼</span>`;
    container.appendChild(headerRow);
    if (!isBudgetExpanded) return;

    const currentMonth = new Date().toISOString().slice(0, 7); 
    cappedCategories.sort((a, b) => (a.order || 0) - (b.order || 0));
    const fragment = document.createDocumentFragment();

    cappedCategories.forEach(cat => {
        let spent = 0;
        transactions.forEach(t => { if (t.categoryId == cat.id && t.type === 'expense' && t.date.startsWith(currentMonth)) spent += parseFloat(t.amount); });
        const pct = Math.min((spent / cat.cap) * 100, 100);
        let colorClass = pct >= 90 ? 'prog-red' : (pct >= 50 ? 'prog-orange' : 'prog-green');

        const el = document.createElement('div');
        el.className = `cat-item ${spent > cat.cap ? 'over-budget-pulse' : ''}`;
        el.style.marginBottom = '8px'; el.setAttribute('draggable', 'true'); el.setAttribute('data-id', cat.id);
        el.innerHTML = `
            <div class="cat-icon" style="background-color: #242424; color: ${cat.color}">${cat.icon}</div>
            <div class="cat-info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; color:#fff">${escapeHtml(cat.name)}</span>
                    <span style="font-size:12px; color:#888">${formatINR(spent)} / ${formatINR(cat.cap)}</span>
                </div>
                <div class="budget-bar-track" style="margin-top:5px;"><div class="budget-bar-fill ${colorClass}" style="width:${pct}%"></div></div>
            </div>
        `;
        fragment.appendChild(el);
    });
    container.appendChild(fragment); setupBudgetDrag(container);
}

function updateChart(accountId) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const dayVal = document.getElementById('home-date-input').value;
    const weekVal = document.getElementById('home-week-input').value;
    const monthVal = document.getElementById('home-month-input').value;
    const startVal = document.getElementById('home-start-input') ? document.getElementById('home-start-input').value : '';
    const endVal = document.getElementById('home-end-input') ? document.getElementById('home-end-input').value : '';
    const tagFilterVal = document.getElementById('home-tag-filter') ? document.getElementById('home-tag-filter').value : '';

    const filteredTrans = transactions.filter(t => {
        if (t.type !== viewMode) return false;
        if (accountId !== 'all' && t.accountId != accountId) return false;
        if (tagFilterVal && (!t.tags || !t.tags.includes(tagFilterVal))) return false;
        const tDate = t.date;
        if (currentFilter === 'day') return tDate === dayVal;
        if (currentFilter === 'week') { if(!weekVal) return false; const range = getWeekRange(weekVal); return tDate >= range.start && tDate <= range.end; }
        if (currentFilter === 'month') return tDate.startsWith(monthVal);
        if (currentFilter === 'year') return tDate.startsWith(new Date().getFullYear().toString());
        if (currentFilter === 'period') return tDate >= startVal && tDate <= endVal;
        return true;
    });

    let periodTotal = 0; const categoryTotals = {};
    filteredTrans.forEach(t => { 
        const catId = t.categoryId || 'uncat'; 
        if (!categoryTotals[catId]) categoryTotals[catId] = 0; 
        categoryTotals[catId] += parseFloat(t.amount); periodTotal += parseFloat(t.amount); 
    });
    
    if(document.getElementById('period-total')) document.getElementById('period-total').innerText = formatINR(periodTotal);
    const listContainer = document.getElementById('transaction-list'); listContainer.innerHTML = '';
    
    if (periodTotal === 0) { document.getElementById('no-data-msg').classList.remove('hidden'); if(chartInstance) chartInstance.destroy(); return; }
    document.getElementById('no-data-msg').classList.add('hidden');
    
    const fragment = document.createDocumentFragment();
    filteredTrans.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
        let cat = t.categoryId ? categories.find(c => c.id == t.categoryId) : null;
        let name = cat ? cat.name : (t.type === 'income' ? 'Income' : 'Uncategorized');
        let icon = cat ? cat.icon : (t.type === 'income' ? '💵' : '❓');
        let color = cat ? cat.color : (t.type === 'income' ? '#2ECC71' : '#888');
        let tagHtml = (t.tags && t.tags.length > 0) ? t.tags.map(tag => `<span class="tag-pill-card">${escapeHtml(tag)}</span>`).join(' ') : '';
        const amountColorClass = t.type === 'expense' ? 'text-red' : 'text-green';

        const row = document.createElement('div'); row.className = 'spending-item';
        row.innerHTML = `<div class="spending-left"><div class="spending-icon" style="background-color:#242424; color:${color}">${icon}</div><div class="spending-info"><span class="spending-name">${escapeHtml(name)}</span><div class="spending-details-row"><span class="spending-date">${t.date}</span>${tagHtml}</div></div></div><div class="spending-amount ${amountColorClass}">${t.type === 'expense' ? '-' : '+'}${formatINR(t.amount).replace('₹', '')}</div>`;
        row.onclick = () => editTransaction(t.id);
        fragment.appendChild(row);
    });
    listContainer.appendChild(fragment);

    const dataValues = Object.values(categoryTotals);
    const dataLabels = Object.keys(categoryTotals).map(id => { if(id === 'uncat') return viewMode === 'income' ? 'Income' : 'Uncategorized'; const cat = categories.find(c => c.id == id); return cat ? cat.name : 'Unknown'; });
    const dataColors = Object.keys(categoryTotals).map(id => { if(id === 'uncat') return viewMode === 'income' ? '#2ECC71' : '#888'; const cat = categories.find(c => c.id == id); return cat ? cat.color : '#888'; });
    
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    chartInstance = new Chart(ctx, { 
        type: 'doughnut', 
        data: { labels: dataLabels, datasets: [{ data: dataValues, backgroundColor: dataColors, borderWidth: 5, borderColor: '#111111', borderRadius: 20, hoverOffset: 4 }] }, 
        options: { cutout: '70%', responsive: true, maintainAspectRatio: false, animation: { duration: 800, animateScale: true, animateRotate: true, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, datalabels: { display: false } } },
        plugins: [ChartDataLabels]
    });
}

function renderGraph() {
    const ctx = document.getElementById('tagChart').getContext('2d');
    const dayVal = document.getElementById('graph-date-input').value; const monthVal = document.getElementById('graph-month-input').value; const startVal = document.getElementById('graph-start-input') ? document.getElementById('graph-start-input').value : ''; const endVal = document.getElementById('graph-end-input') ? document.getElementById('graph-end-input').value : '';
    const filteredTrans = transactions.filter(t => { if (t.type !== graphMode) return false; const tDate = t.date; if (currentGraphFilter === 'day') return tDate === dayVal; else if (currentGraphFilter === 'month') return tDate.startsWith(monthVal); else if (currentGraphFilter === 'period') return tDate >= startVal && tDate <= endVal; return true; });
    const tagTotals = {}; let hasData = false; let grandTotal = 0;
    filteredTrans.forEach(t => { if (t.tags && t.tags.length > 0) { t.tags.forEach(tag => { if (!tagTotals[tag]) tagTotals[tag] = 0; tagTotals[tag] += parseFloat(t.amount); hasData = true; }); } grandTotal += parseFloat(t.amount); });
    const amountEl = document.getElementById('graph-total-amount'); amountEl.innerText = formatINR(grandTotal); amountEl.style.color = graphMode === 'expense' ? '#E74C3C' : '#2ECC71';
    if (!hasData) { document.getElementById('no-tags-msg').classList.remove('hidden'); if(graphChartInstance) graphChartInstance.destroy(); return; }
    document.getElementById('no-tags-msg').classList.add('hidden');
    const sortedTags = Object.keys(tagTotals).sort((a, b) => tagTotals[b] - tagTotals[a]); const dataValues = sortedTags.map(tag => tagTotals[tag]); const barColors = sortedTags.map((_, index) => COLORS[index % COLORS.length]);
    if (graphChartInstance) graphChartInstance.destroy();
    graphChartInstance = new Chart(ctx, { type: 'bar', data: { labels: sortedTags, datasets: [{ data: dataValues, backgroundColor: barColors, borderRadius: 4, barThickness: 32 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 80, left: 10 } }, scales: { x: { display: false }, y: { grid: { display: false }, ticks: { color: '#fff', font: { size: 13, weight: 'bold', family: 'monospace' } }, border: { display: false } } }, plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: true, anchor: 'end', align: 'end', color: '#ffffff', font: { weight: 'bold', size: 12 }, formatter: function(value) { return formatINR(value); }, offset: 6 } } }, plugins: [ChartDataLabels] });
}

function renderAccounts() {
    const list = document.getElementById('accounts-list'); const gt = document.getElementById('grand-total'); list.innerHTML = ''; let sum = 0; const accs = categories.filter(c => c.type === 'account');
    if (accs.length === 0) { list.innerHTML = '<div style="text-align:center; color:#555; margin-top:20px;">No accounts.</div>'; return; }
    const fragment = document.createDocumentFragment();
    accs.forEach(acc => { 
        const bal = getAccountBalance(acc.id); sum += parseFloat(bal); 
        const card = document.createElement('div'); card.className = 'account-card'; card.style.borderLeftColor = acc.color; card.onclick = () => editCategory(acc.id);
        card.innerHTML = `<div class="acc-left"><div class="acc-icon" style="background-color: #242424; color: ${acc.color}">${acc.icon}</div><div class="acc-name">${escapeHtml(acc.name)}</div></div><div class="acc-right"><div style="text-align:right;"><div style="font-size:10px; color:#888; text-transform:uppercase;">Available</div><div class="acc-balance">${formatINR(bal)}</div></div><div style="color:#888; margin-left:10px; display:flex; align-items:center;">${ICON_EDIT_LINEAR}</div></div>`; fragment.appendChild(card); 
    });
    list.appendChild(fragment); if(gt) gt.innerText = formatINR(sum);
}

function renderCategories() {
    const list = document.getElementById('categories-list'); list.innerHTML = '';
    const sections = categories.filter(c => c.type === 'section');
    if (sections.length === 0) { list.innerHTML = '<div style="text-align:center; color:#555; margin-top:20px;">No categories created.</div>'; return; }
    sections.sort((a, b) => (a.order || 0) - (b.order || 0));
    const fragment = document.createDocumentFragment();
    sections.forEach(cat => {
        const item = document.createElement('div'); item.className = 'cat-item'; item.onclick = () => editCategory(cat.id);
        item.innerHTML = `<div class="cat-icon" style="background-color: #242424; color: ${cat.color}">${cat.icon}</div><div class="cat-info"><div style="font-weight:bold; color:#fff">${escapeHtml(cat.name)}</div></div><div style="color:#888; display:flex; align-items:center;">${ICON_EDIT_LINEAR}</div>`; fragment.appendChild(item);
    });
    list.appendChild(fragment);
}

function renderTagCloud() { 
    const cloud = document.getElementById('tag-cloud'); cloud.innerHTML = ''; const fragment = document.createDocumentFragment();
    allTags.forEach(tag => { 
        const chip = document.createElement('div'); 
        if (tagDeleteMode) { chip.className = 'tag-chip deletable'; chip.innerText = tag; chip.onclick = () => deleteTagPermanent(tag); } 
        else { const isSelected = currentTxTags.includes(tag); chip.className = `tag-chip ${isSelected ? 'selected' : ''}`; chip.innerText = tag; chip.onclick = () => toggleTag(tag); chip.addEventListener('mousedown', startPress); chip.addEventListener('touchstart', startPress); chip.addEventListener('mouseup', cancelPress); chip.addEventListener('mouseleave', cancelPress); chip.addEventListener('touchend', cancelPress); } 
        fragment.appendChild(chip); 
    }); cloud.appendChild(fragment);
}

function renderTransferHistory() {
    const container = document.getElementById('transfer-list'); container.innerHTML = '';
    const transfers = transactions.filter(t => t.type === 'transfer').sort((a, b) => new Date(b.date) - new Date(a.date));
    if (transfers.length === 0) { container.innerHTML = '<div style="text-align:center; color:#555; margin-top:20px;">No transfer history.</div>'; return; }
    const fragment = document.createDocumentFragment();
    transfers.forEach(t => {
        const fromAcc = categories.find(c => c.id == t.fromAccountId); const toAcc = categories.find(c => c.id == t.toAccountId);
        const el = document.createElement('div'); el.className = 'spending-item';
        el.innerHTML = `<div class="spending-left"><div class="spending-icon" style="background-color: #242424; color: #fff; font-size: 14px;">⇄</div><div class="spending-info"><span class="spending-name" style="font-size:13px; color:#ccc;"><span style="color:#fff; font-weight:bold;">${fromAcc ? escapeHtml(fromAcc.name) : '???'}</span> &nbsp;➔&nbsp; <span style="color:#fff; font-weight:bold;">${toAcc ? escapeHtml(toAcc.name) : '???'}</span></span><div class="spending-details-row"><span class="spending-date">${formatDateFriendly(t.date)}</span>${t.note ? `<span class="tag-pill-card">${escapeHtml(t.note)}</span>` : ''}</div></div></div><div class="spending-amount" style="color: #fff;">${formatINR(t.amount)}</div>`; fragment.appendChild(el);
    }); container.appendChild(fragment);
}
