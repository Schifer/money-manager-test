// app.js - Application Logic (Controls User Interaction)
// Dependencies: utils.js, render.js

// --- INITIALIZATION ---
function init() {
    initSplash();       
    loadUserName();     
    
    resetHomeDates();
    resetGraphDates();
    renderCategories();
    setupPickers();
    renderAccounts();
    
    document.querySelector('.app-wrapper').classList.add('theme-expense');
    
    checkForSharedData();
    setFilter('day'); 
}

// --- SHARED DATA CHECK ---
function checkForSharedData() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text') || urlParams.get('title') || '';

    if (sharedText) {
        const matches = sharedText.match(/(\d+(\.\d{1,2})?)/);
        if (matches && matches[0]) {
            const amount = parseFloat(matches[0]);
            openTransactionForm();
            setTimeout(() => {
                document.getElementById('tx-amount').value = amount;
                const cleanNote = sharedText.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, "");
                if(cleanNote) {
                   const tagInput = document.getElementById('tx-tag-input');
                   tagInput.value = cleanNote;
                   addNewTag(); 
                }
            }, 100);
        }
    }
}

// --- NAVIGATION LOGIC ---
function switchTab(tabName) {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => btn.classList.remove('active'));
    
    let activeIndex = 0;
    if (tabName === 'graph') activeIndex = 1;
    else if (tabName === 'accounts') activeIndex = 2;
    else if (tabName === 'categories') activeIndex = 3;
    else if (tabName === 'settings') activeIndex = 4;
    
    if(navBtns[activeIndex]) navBtns[activeIndex].classList.add('active');
    
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    const appWrapper = document.querySelector('.app-wrapper');
    appWrapper.classList.remove('theme-expense', 'theme-income');

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
        loadUserName(); 
        document.getElementById('settings-view').classList.remove('hidden'); 
    }
    else if (tabName === 'graph') { 
        renderGraph(); 
        document.getElementById('graph-view').classList.remove('hidden'); 
    }
}

// --- PERSONALIZATION ---
function togglePrivacy() {
    isBalanceHidden = !isBalanceHidden;
    localStorage.setItem('isBalanceHidden', isBalanceHidden);
    renderHome(); // Re-paint to apply the mask
}

function initSplash() {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.style.opacity = '0'; 
            setTimeout(() => { splash.style.display = 'none'; }, 500); 
        }
    }, 2000);
}

function loadUserName() {
    const cardNameEl = document.getElementById('card-holder-name');
    if(cardNameEl) cardNameEl.innerText = userName;
    
    const settingInput = document.getElementById('setting-username');
    if(settingInput) settingInput.value = userName === 'USER' ? '' : userName;
}

function saveUserName() {
    const input = document.getElementById('setting-username');
    if(input) {
        const val = input.value.trim().toUpperCase();
        userName = val || 'USER';
        localStorage.setItem('userName', userName);
        const cardNameEl = document.getElementById('card-holder-name');
        if(cardNameEl) cardNameEl.innerText = userName;
    }
}

// --- DATE LOGIC ---
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
    updateSmartDateDisplay();
    renderHome();
}

function resetHomeDates() {
    const today = new Date();
    document.getElementById('home-date-input').valueAsDate = today;
    document.getElementById('home-month-input').value = today.toISOString().slice(0, 7);
    let startDate = today;
    if (transactions.length > 0) {
        const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        startDate = new Date(sorted[0].date);
    }
    const startInput = document.getElementById('home-start-input');
    if(startInput) startInput.valueAsDate = startDate;
    const endInput = document.getElementById('home-end-input');
    if(endInput) endInput.valueAsDate = today;
    
    const weekNum = getWeekNumber(today); 
    document.getElementById('home-week-input').value = `${today.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
    
    updateSmartDateDisplay(); 
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

function updateSmartDateDisplay() {
    const dayInput = document.getElementById('home-date-input');
    const dayDisplay = document.getElementById('display-day');
    if (dayInput && dayDisplay) {
        dayDisplay.innerText = formatDateFriendly(dayInput.value); 
    }

    const monthInput = document.getElementById('home-month-input');
    const monthDisplay = document.getElementById('display-month');
    if (monthInput && monthDisplay && monthInput.value) {
        const [y, m] = monthInput.value.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1, 1);
        const monthName = date.toLocaleString('default', { month: 'long' });
        monthDisplay.innerText = `${monthName} ${y}`;
    }

    const weekInput = document.getElementById('home-week-input');
    const weekDisplay = document.getElementById('display-week');
    if (weekInput && weekDisplay) {
        weekDisplay.innerText = weekInput.value ? weekInput.value : "Select Week";
    }
}

// --- FILTERS & MODES ---
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
    renderHome();
}

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText.toLowerCase() === filter) btn.classList.add('active');
    });
    
    document.getElementById('home-ctrl-day').classList.toggle('hidden', filter !== 'day');
    document.getElementById('home-ctrl-week').classList.toggle('hidden', filter !== 'week');
    document.getElementById('home-ctrl-month').classList.toggle('hidden', filter !== 'month');
    const periodCtrl = document.getElementById('home-ctrl-period');
    if(periodCtrl) periodCtrl.classList.toggle('hidden', filter !== 'period' && filter !== 'year');
    
    updateSmartDateDisplay(); 
    renderHome();
}

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

// --- DRAG & DROP LOGIC ---
function setupBudgetDrag(container) {
    let draggables = container.querySelectorAll('.cat-item');
    if (draggables.length === 0) return;

    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', () => { draggable.classList.add('dragging'); });
        draggable.addEventListener('dragend', () => { draggable.classList.remove('dragging'); saveNewOrder(); });
    });

    container.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY); 
        const draggable = document.querySelector('.dragging');
        if (afterElement == null) {
            container.appendChild(draggable);
        } else {
            container.insertBefore(draggable, afterElement);
        }
    });
}

function saveNewOrder() {
    const container = document.getElementById('budget-overview');
    if(!container) return;
    const items = [...container.querySelectorAll('.cat-item')];
    items.forEach((item, index) => {
        const id = item.getAttribute('data-id');
        const cat = categories.find(c => c.id == id);
        if(cat) cat.order = index;
    });
    localStorage.setItem('categories', JSON.stringify(categories));
}

// --- TRANSACTION CRUD ---
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
        if(homeDate) document.getElementById('tx-date').value = homeDate;
    } else {
        document.getElementById('tx-date').valueAsDate = new Date(); 
    }

    document.getElementById('tx-amount').value = ''; 
    document.getElementById('transaction-form-overlay').classList.remove('hidden'); 
}

function closeTransactionForm() { document.getElementById('transaction-form-overlay').classList.add('hidden'); }

function editTransaction(id) { 
    const tx = transactions.find(t => t.id === id); 
    if(!tx) return; 
    editingTxId = id; 
    document.getElementById('tx-modal-title').innerText = "Edit Transaction"; 
    document.getElementById('btn-delete-tx').classList.remove('hidden'); 
    tagDeleteMode = false; 
    updateTagActionBtn(); 
    populateSelects(); 
    setFormType(tx.type); 
    document.getElementById('tx-amount').value = tx.amount; 
    document.getElementById('tx-account').value = tx.accountId; 
    if(tx.categoryId) document.getElementById('tx-category').value = tx.categoryId; 
    document.getElementById('tx-date').value = tx.date; 
    currentTxTags = tx.tags || []; 
    renderTagCloud(); 
    document.getElementById('transaction-form-overlay').classList.remove('hidden'); 
}

function deleteTransaction() { 
    if (!editingTxId) return; 
    if (confirm("Delete this transaction?")) { 
        transactions = transactions.filter(t => t.id !== editingTxId); 
        localStorage.setItem('transactions', JSON.stringify(transactions)); 
        closeTransactionForm(); 
        toggleHomeView(viewMode); 
    } 
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
                alert(`⚠️ Spending Alert!\n\nOver monthly limit for ${cat.name}.\n\nCap: ${formatINR(cat.cap)}\nNew Total: ${formatINR(newTotal)}`);
            } else if (newTotal >= (cat.cap * 0.9)) {
                alert(`⚠️ Warning: 90% of limit reached for ${cat.name}.`);
            }
        }
    }

    const txData = { id: editingTxId ? editingTxId : Date.now(), type: formMode, accountId, categoryId: catId || null, amount, date: dateStr, tags: [...currentTxTags] };
    if (editingTxId) { const index = transactions.findIndex(t => t.id === editingTxId); if (index !== -1) transactions[index] = txData; } else { transactions.push(txData); }
    localStorage.setItem('transactions', JSON.stringify(transactions)); closeTransactionForm(); toggleHomeView(formMode);
}

// --- CATEGORY & ACCOUNT MANAGEMENT (RESTORED & SMART LOGIC) ---
function openCategoryForm(type) {
    editingId = null;
    document.getElementById('modal-title').innerText = type === 'account' ? "New Account" : "New Category";
    
    const typeBtn = document.querySelector(`.type-btn[onclick*="'${type}'"]`);
    if(typeBtn) selectType(typeBtn, type);
    
    const label = document.getElementById('lbl-balance-val');
    if (type === 'account') label.innerText = "Current Balance";
    else label.innerText = "Monthly Cap";

    document.getElementById('cat-name').value = '';
    document.getElementById('cat-initial-balance').value = '';
    document.getElementById('cat-cap').value = '';
    document.getElementById('cat-is-default').checked = false;
    
    setColor(COLORS[0]);
    setIcon(ICONS[0]);
    
    document.getElementById('category-form-overlay').classList.remove('hidden');
}

function editCategory(id) {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    
    editingId = id;
    document.getElementById('modal-title').innerText = "Edit " + (cat.type === 'account' ? "Account" : "Category");
    
    const typeBtn = document.querySelector(`.type-btn[onclick*="'${cat.type}'"]`);
    if(typeBtn) selectType(typeBtn, cat.type);
    
    document.getElementById('cat-name').value = cat.name;
    
    if (cat.type === 'account') {
        document.getElementById('lbl-balance-val').innerText = "Current Balance";
        document.getElementById('cat-initial-balance').value = getAccountBalance(cat.id);
    } else {
        document.getElementById('lbl-balance-val').innerText = "Monthly Cap";
        document.getElementById('cat-initial-balance').value = ''; 
    }

    document.getElementById('cat-cap').value = cat.cap || '';
    
    const defaultAccId = localStorage.getItem('defaultAccountId');
    document.getElementById('cat-is-default').checked = (defaultAccId == id);
    
    setColor(cat.color);
    setIcon(cat.icon);
    
    document.getElementById('category-form-overlay').classList.remove('hidden');
}

function saveCategory() {
    const name = document.getElementById('cat-name').value.trim();
    let userInputBalance = parseFloat(document.getElementById('cat-initial-balance').value) || 0;
    const cap = parseFloat(document.getElementById('cat-cap').value) || 0;
    const isDefault = document.getElementById('cat-is-default').checked;
    
    if (!name) return alert("Name is required");
    
    // SMART RECONCILIATION
    let finalInitialBalance = userInputBalance;

    if (editingId && selectedType === 'account') {
        const currentCalculatedBalance = getAccountBalance(editingId);
        const oldCat = categories.find(c => c.id === editingId);
        const oldInitial = parseFloat(oldCat.initialBalance || 0);
        const netTransactions = currentCalculatedBalance - oldInitial;
        finalInitialBalance = userInputBalance - netTransactions;
    }

    const catData = {
        id: editingId ? editingId : Date.now(),
        type: selectedType,
        name: name,
        color: selectedColor,
        icon: selectedIcon,
        initialBalance: finalInitialBalance,
        cap: cap,
        order: editingId ? (categories.find(c => c.id === editingId).order || 0) : categories.length
    };
    
    if (editingId) {
        const index = categories.findIndex(c => c.id === editingId);
        if (index !== -1) categories[index] = catData;
    } else {
        categories.push(catData);
    }
    
    if (isDefault && selectedType === 'account') {
        localStorage.setItem('defaultAccountId', catData.id);
    }
    
    localStorage.setItem('categories', JSON.stringify(categories));
    closeCategoryForm();
    
    if (selectedType === 'account') renderAccounts();
    else renderCategories();
    
    renderHome(); 
}

// --- TRANSFER LOGIC (RESTORED) ---
function openTransferForm() {
    document.getElementById('transfer-form-overlay').classList.remove('hidden');
    document.getElementById('trans-date').valueAsDate = new Date();
    
    const fromSel = document.getElementById('trans-from');
    const toSel = document.getElementById('trans-to');
    fromSel.innerHTML = ''; toSel.innerHTML = '';
    
    const accs = categories.filter(c => c.type === 'account');
    accs.forEach(a => {
        fromSel.innerHTML += `<option value="${a.id}">${a.name}</option>`;
        toSel.innerHTML += `<option value="${a.id}">${a.name}</option>`;
    });
}

function closeTransferForm() {
    document.getElementById('transfer-form-overlay').classList.add('hidden');
}

function saveTransfer() {
    const fromId = document.getElementById('trans-from').value;
    const toId = document.getElementById('trans-to').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const date = document.getElementById('trans-date').value;
    const note = document.getElementById('trans-note').value;
    
    if(!amount || amount <= 0) return alert("Enter valid amount");
    if(fromId === toId) return alert("Cannot transfer to same account");
    
    const tx = {
        id: Date.now(),
        type: 'transfer',
        fromAccountId: fromId,
        toAccountId: toId,
        amount: amount,
        date: date,
        note: note || 'Transfer',
        tags: []
    };
    
    transactions.push(tx);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    closeTransferForm();
    renderAccounts();
    renderHome();
}

// --- HELPERS FOR FORMS ---
function setFormType(type) { 
    formMode = type; 
    const btnExp = document.getElementById('btn-form-expense'), btnInc = document.getElementById('btn-form-income'); 
    const amountInput = document.getElementById('tx-amount'), labelAccount = document.getElementById('lbl-account'), categoryWrapper = document.getElementById('tx-category-wrapper'); 
    if (type === 'expense') { 
        btnExp.classList.add('active'); btnExp.style.backgroundColor = '#f13130'; btnExp.style.color = 'white'; 
        btnInc.classList.remove('active'); btnInc.style.backgroundColor = '#242424'; btnInc.style.color = '#888'; 
        amountInput.style.color = '#f13130'; labelAccount.innerText = "Pay From"; categoryWrapper.classList.remove('hidden'); 
    } else { 
        btnInc.classList.add('active'); btnInc.style.backgroundColor = '#4bb14e'; btnInc.style.color = 'white'; 
        btnExp.classList.remove('active'); btnExp.style.backgroundColor = '#242424'; btnExp.style.color = '#888'; 
        amountInput.style.color = '#4bb14e'; labelAccount.innerText = "Deposit To"; categoryWrapper.classList.add('hidden'); 
    } 
}

function populateSelects() { 
    const accSelect = document.getElementById('tx-account'); accSelect.innerHTML = ''; 
    categories.filter(c => c.type === 'account').forEach(acc => accSelect.innerHTML += `<option value="${acc.id}">${acc.name}</option>`); 
    const catSelect = document.getElementById('tx-category'); catSelect.innerHTML = '<option value="">Uncategorized</option>'; 
    categories.filter(c => c.type === 'section').forEach(cat => catSelect.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`); 
}

function checkTagInput() {
    const val = document.getElementById('tx-tag-input').value.trim().toLowerCase();
    const btn = document.getElementById('tag-action-btn');
    if (val.length > 0) { btn.classList.remove('hidden'); } else { btn.classList.add('hidden'); }
    const chips = document.querySelectorAll('#tag-cloud .tag-chip');
    chips.forEach(chip => {
        const tagText = chip.innerText.toLowerCase();
        if (tagText.includes(val)) { chip.style.display = "flex"; } else { chip.style.display = "none"; }
    });
}

function handleTagAction() { if (tagDeleteMode) { tagDeleteMode = false; } else { addNewTag(); } updateTagActionBtn(); renderTagCloud(); }
function updateTagActionBtn() { const btn = document.getElementById('tag-action-btn'); if (tagDeleteMode) { btn.innerText = "✓"; btn.classList.add('done-mode'); } else { btn.innerText = "+"; btn.classList.remove('done-mode'); } }
function addNewTag() { 
    const input = document.getElementById('tx-tag-input'); const val = input.value.trim(); 
    if(val) { 
        const exists = allTags.some(t => t.toLowerCase() === val.toLowerCase());
        if (!exists) { allTags.push(val); localStorage.setItem('allTags', JSON.stringify(allTags)); } 
        const alreadySelected = currentTxTags.some(t => t.toLowerCase() === val.toLowerCase());
        if (!alreadySelected) { 
            const originalTag = allTags.find(t => t.toLowerCase() === val.toLowerCase()) || val;
            currentTxTags.push(originalTag); 
        } 
        input.value = ''; document.getElementById('tag-action-btn').classList.add('hidden'); renderTagCloud(); 
    } 
}
function toggleTag(tag) { if(currentTxTags.includes(tag)) { currentTxTags = currentTxTags.filter(t => t !== tag); } else { currentTxTags.push(tag); } renderTagCloud(); }
function startPress(e) { pressTimer = setTimeout(() => { tagDeleteMode = true; updateTagActionBtn(); renderTagCloud(); }, 800); }
function cancelPress() { clearTimeout(pressTimer); }
function deleteTagPermanent(tag) { if (confirm(`Delete tag "${tag}" permanently?`)) { allTags = allTags.filter(t => t !== tag); localStorage.setItem('allTags', JSON.stringify(allTags)); currentTxTags = currentTxTags.filter(t => t !== tag); transactions.forEach(t => { if (t.tags) { t.tags = t.tags.filter(tTag => tTag !== tag); } }); localStorage.setItem('transactions', JSON.stringify(transactions)); renderTagCloud(); renderHome(); renderGraph(); } }

// --- CATEGORY/ACCOUNT ACTIONS UI ---
function selectType(btn, type) { 
    selectedType = type; 
    updateFormUI(); 
}

function updateFormUI() {
    const isAccount = selectedType === 'account';
    
    // Toggle Buttons UI
    const btns = document.querySelectorAll('.type-btn');
    btns.forEach(b => {
        if(b.innerText.toLowerCase().includes(selectedType)) b.classList.add('active');
        else b.classList.remove('active');
    });

    // Toggle Fields
    const balContainer = document.getElementById('balance-input-container');
    const capContainer = document.getElementById('cap-input-container');
    
    if (isAccount) {
        balContainer.classList.remove('hidden');
        capContainer.classList.add('hidden');
        document.getElementById('lbl-balance-val').innerText = "Current Balance";
    } else {
        balContainer.classList.add('hidden');
        capContainer.classList.remove('hidden');
        document.getElementById('lbl-balance-val').innerText = "Monthly Cap";
    }
}

function setColor(color) { selectedColor = color; setupPickers(); }
function setIcon(icon) { selectedIcon = icon; setupPickers(); }
function setupPickers() { document.getElementById('color-picker').innerHTML = COLORS.map(c => `<div class="color-swatch" style="background:${c}; ${c === selectedColor ? 'border-color:white' : ''}" onclick="setColor('${c}')"></div>`).join(''); document.getElementById('icon-picker').innerHTML = ICONS.map(i => `<div class="icon-option ${i === selectedIcon ? 'selected' : ''}" onclick="setIcon('${i}')">${i}</div>`).join(''); }
function closeCategoryForm() { document.getElementById('category-form-overlay').classList.add('hidden'); }

// --- RESET LOGIC ---
function openResetConfirmation() { document.getElementById('reset-confirm-overlay').classList.remove('hidden'); }
function closeResetConfirmation() { document.getElementById('reset-confirm-overlay').classList.add('hidden'); }
function startResetProcess() { closeResetConfirmation(); document.getElementById('reset-progress-overlay').classList.remove('hidden'); const fill = document.getElementById('reset-fill'); const timerText = document.getElementById('reset-timer-text'); let progress = 0; const totalTime = 10000; const intervalTime = 100; const steps = totalTime / intervalTime; let currentStep = 0; fill.style.width = '0%'; resetTimer = setInterval(() => { currentStep++; progress = (currentStep / steps) * 100; fill.style.width = `${progress}%`; const secondsLeft = Math.ceil((totalTime - (currentStep * intervalTime)) / 1000); timerText.innerText = `${secondsLeft}s remaining`; if (currentStep >= steps) { clearInterval(resetTimer); performFullReset(); } }, intervalTime); }
function cancelReset() { clearInterval(resetTimer); resetTimer = null; document.getElementById('reset-progress-overlay').classList.add('hidden'); }
function performFullReset() { localStorage.clear(); location.reload(); }

init();
