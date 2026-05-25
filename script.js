let labors = JSON.parse(localStorage.getItem('thekedar_labors')) || [];
let owners = JSON.parse(localStorage.getItem('thekedar_owners')) || [];
let expenses = JSON.parse(localStorage.getItem('thekedar_expenses')) || [];
let site = JSON.parse(localStorage.getItem('thekedar_site')) || [];

labors = labors.map(l => ({ attendance: l.attendance || [], expenses: l.expenses || [], site: l.site || '', ...l }));
expenses = expenses.map(e => ({ site: e.site || '', expenses: e.expenses || [], ...e }));

// Normalize owners data for new model: base contract, deal history, and received separate
owners = owners.map(o => {
    const hadContract = typeof o.contractTotal !== 'undefined';
    const contractTotal = hadContract ? (o.contractTotal || 0) : (o.received ? o.received : 0);
    const received = hadContract ? (o.received || 0) : 0;
    const history = o.history || [];
    const dealAmount = history.filter(h => h.type === 'deal').reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
    const originalContract = typeof o.originalContract !== 'undefined'
        ? (parseFloat(o.originalContract) || 0)
        : Math.max(0, parseFloat(contractTotal) - dealAmount);
    return Object.assign({
        history,
        contractTotal: originalContract,
        originalContract,
        received: parseFloat(received) || 0,
        desc: o.desc || o.note || ''
    }, o);
});

let currentOTP = null;

// Get unique sites from owners, labors, and expenses
function getUniqueSites() {
    const allSites = [
        ...owners.map(o => o.site || ''),
        ...labors.map(l => l.site || ''),
        ...expenses.map(e => e.site || '')
    ];
    return [...new Set(allSites.filter(s => s && s.trim() !== ''))];
}

// Update all site dropdowns
function updateSiteDropdowns() {
    const sites = getUniqueSites();
    const dropdowns = document.querySelectorAll('.site-select');
    
    dropdowns.forEach(dropdown => {
        const currentValue = dropdown.value;
        dropdown.innerHTML = '<option value="">-- سائٹ منتخب کریں --</option>';
        
        sites.forEach(site => {
            dropdown.innerHTML += `<option value="${site}">${site}</option>`;
        });
        
        // Restore selected value if it still exists
        if (sites.includes(currentValue)) {
            dropdown.value = currentValue;
        }
    });
}

function showToast(message, icon = 'info', title = '') {
    return Swal.fire({
        title: title,
        text: message,
        icon: icon,
        confirmButtonText: 'ٹھیک ہے',
        customClass: { popup: 'swal2-popup' }
    });
}

function showConfirm(message, title = 'کیا آپ یقین ہیں؟') {
    return Swal.fire({
        title: title,
        text: message,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ہاں',
        cancelButtonText: 'نہیں'
    }).then(result => result.isConfirmed);
}

async function showPrompt(message, inputType = 'text', inputValue = '', placeholder = '') {
    const result = await Swal.fire({
        title: message,
        input: inputType,
        inputValue: inputValue,
        inputPlaceholder: placeholder,
        showCancelButton: true,
        confirmButtonText: 'ٹھیک ہے',
        cancelButtonText: 'منسوخ',
        inputAutoFocus: true
    });
    return result.isConfirmed ? result.value : null;
}

// Show site selection prompt with dropdown
async function showSitePrompt(currentSite = '') {
    const sites = getUniqueSites();
    let optionsHtml = '<option value="">-- سائٹ منتخب کریں --</option>';
    sites.forEach(site => {
        const selected = site === currentSite ? 'selected' : '';
        optionsHtml += `<option value="${site}" ${selected}>${site}</option>`;
    });
    
    const result = await Swal.fire({
        title: 'سائٹ منتخب کریں',
        html: `<select id="swal-site-select" class="swal2-select" style="width:100%; padding:10px; font-size:16px;">${optionsHtml}</select>`,
        showCancelButton: true,
        confirmButtonText: 'ٹھیک ہے',
        cancelButtonText: 'منسوخ',
        preConfirm: () => {
            return document.getElementById('swal-site-select').value;
        }
    });
    return result.isConfirmed ? result.value : null;
}

function getOwnerDealInfo(owner) {
    const deals = (owner.history || []).filter(h => h.type === 'deal');
    const dealAmount = deals.reduce((sum, deal) => sum + (parseFloat(deal.amount) || 0), 0);
    return {
        deals,
        dealAmount,
        dealCount: deals.length
    };
}

function sendOTP() {
    currentOTP = Math.floor(1000 + Math.random() * 9999).toString();///Change OTP for 4 digit
    showToast("آپ کا نیا لاگ ان او ٹی پی ہے: " + currentOTP, 'success', 'او ٹی پی بھیج دیا گیا');
}

function checkLogin() {
    if (currentOTP === null) {
        showToast("پہلے 'او ٹی پی حاصل کریں' بٹن پر کلک کریں!", 'error');
        return;
    }

    if (document.getElementById('passCode').value === currentOTP) {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        updateSiteDropdowns();
        updateMazdoorTable();
        updateMalikTable();
        updateMalikSummary();
        updateKharchaTable();
        updateSiteTable();
        updateSummary();
        document.getElementById('passCode').value = '';
        currentOTP = null;
        showToast('لاگ ان ہو گیا', 'success');
    } else {
        showToast("غلط او ٹی پی! درست او ٹی پی درج کریں۔", 'error');
    }
}

function updateSummary() {
    let totalAya = 0;
    owners.forEach(o => totalAya += (parseFloat(o.received) || 0));
    
    let totalKharcha = 0;
    expenses.forEach(e => totalKharcha += e.amount);

    const sumAyaEl = document.getElementById('sumAya');
    const sumKharchaEl = document.getElementById('sumKharcha');
    const sumBaqayaEl = document.getElementById('sumBaqaya');
    if (sumAyaEl) sumAyaEl.innerText = totalAya.toLocaleString();
    if (sumKharchaEl) sumKharchaEl.innerText = totalKharcha.toLocaleString();
    if (sumBaqayaEl) sumBaqayaEl.innerText = (totalAya - totalKharcha).toLocaleString();
}

function updateMalikSummary() {
    const totalContract = owners.reduce((s, o) => s + (parseFloat(o.contractTotal) || 0), 0);
    const totalDealCount = owners.reduce((s, o) => s + getOwnerDealInfo(o).dealCount, 0);
    const totalDealAmount = owners.reduce((s, o) => s + getOwnerDealInfo(o).dealAmount, 0);
    const totalnewContract = totalContract + totalDealAmount;
    const totalReceived = owners.reduce((s, o) => s + (parseFloat(o.received) || 0), 0);
    const totalBalance = totalContract + totalDealAmount - totalReceived;

    const cEl = document.getElementById('malikTotalContract');
    const countEl = document.getElementById('malikDealCount');
    const dealAmountEl = document.getElementById('malikDealAmount');
    const totalnewContractEl = document.getElementById('malikTotalNewContract');
    const rEl = document.getElementById('malikTotalReceived');
    const bEl = document.getElementById('malikTotalBalance');

    if (cEl) cEl.innerText = totalContract.toLocaleString();
    if (countEl) countEl.innerText = totalDealCount.toLocaleString();
    if (dealAmountEl) dealAmountEl.innerText = totalDealAmount.toLocaleString();
    if (totalnewContractEl) totalnewContractEl.innerText = totalnewContract.toLocaleString();
    if (rEl) rEl.innerText = totalReceived.toLocaleString();
    if (bEl) bEl.innerText = totalBalance.toLocaleString();
}

function showSection(type) {
    const sections = {
        mazdoor: 'mazdoorSection',
        malik: 'malikSection',
        kharcha: 'kharchaSection',
        site: 'siteSection'
    };
    const buttons = {
        mazdoor: 'btnMazdoor',
        malik: 'btnMalik',
        kharcha: 'btnKharcha',
        site: 'btnSite'
    };

    Object.values(sections).forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) section.style.display = 'none';
    });

    Object.values(buttons).forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) button.classList.remove('active');
    });

    const selectedSection = document.getElementById(sections[type]);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    } else {
        console.warn('showSection: missing section', type, sections[type]);
    }

    const selectedButton = document.getElementById(buttons[type]);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
}

function saveData() {
    localStorage.setItem('thekedar_labors', JSON.stringify(labors));
    localStorage.setItem('thekedar_owners', JSON.stringify(owners));
    localStorage.setItem('thekedar_expenses', JSON.stringify(expenses));
    updateSiteDropdowns();
    updateMazdoorTable();
    updateMalikTable();
    updateKharchaTable();
    updateSiteTable();
    updateSummary();
    updateMalikSummary();
}

function addLabor() {
    const name = document.getElementById('mName').value;
    const rate = document.getElementById('mRate').value;
    const mobile = document.getElementById('mMobile').value;
    const site = document.getElementById('mSiteSelect').value;
    
    if (!name || !rate || !mobile) return showToast("تفصیل درج کریں", 'error');
    if (!site) return showToast("سائٹ منتخب کریں", 'error');
    
    labors.push({ 
        id: Date.now(), 
        name, 
        rate: parseFloat(rate), 
        mobile: mobile || '', 
        site: site,
        att: 0, 
        kharcha: 0, 
        attendance: [], 
        expenses: [] 
    });
    saveData();
    document.getElementById('mName').value = '';
    document.getElementById('mRate').value = '';
    document.getElementById('mMobile').value = '';
    document.getElementById('mSiteSelect').value = '';
}

function exportSectionToPDF(element, fileName) {
    const opt = {
        margin: 0.5,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    if (typeof html2pdf !== 'function' && typeof window.html2pdf === 'undefined') {
        showToast('PDF جنریٹ کرنے کے لیے ضروری لائبریری لوڈ نہیں ہوئی۔ برائے مہربانی صفحہ ریفریش کریں۔', 'error');
        console.error('exportSectionToPDF: html2pdf is not available');
        return;
    }
    // html2pdf may be exposed as a global function or via window
    const exporter = (typeof html2pdf === 'function') ? html2pdf : window.html2pdf;
    exporter().set(opt).from(element).save();
}

function exportCurrentSectionPDF() {
    let sectionId = 'mazdoorSection';
    if (document.getElementById('btnMalik').classList.contains('active')) sectionId = 'malikSection';
    if (document.getElementById('btnKharcha').classList.contains('active')) sectionId = 'kharchaSection';
    if (document.getElementById('btnSite').classList.contains('active')) sectionId = 'siteSection';
    const section = document.getElementById(sectionId);
    if (!section) return;
    exportSectionToPDF(section, `${sectionId}.pdf`);
}

function updateSiteTable() {
    const list = document.getElementById('siteList');
    const searchTerm = document.getElementById('siteSearch') ? document.getElementById('siteSearch').value.toLowerCase() : '';
    const sites = getUniqueSites().filter(site => site.toLowerCase().includes(searchTerm));
    list.innerHTML = '';

    let totalAya = 0;
    let totalKharcha = 0;
    let totalBalance = 0;

    sites.forEach(site => {
        const siteAya = owners.filter(o => o.site === site).reduce((sum, o) => sum + (parseFloat(o.received) || 0), 0);
        const siteLaborKharcha = labors.filter(l => l.site === site).reduce((sum, l) => sum + (parseFloat(l.kharcha) || 0), 0);
        const siteExpenses = expenses.filter(e => e.site === site).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const siteMazdoorKharcha = siteLaborKharcha;
        const siteOtherKharcha = siteExpenses;
        const siteBalance = siteAya - siteMazdoorKharcha - siteOtherKharcha;
        const sitetotalMazdoor = labors.filter(l => l.site === site).length;

        totalAya += siteAya;
        totalKharcha += siteMazdoorKharcha + siteOtherKharcha;
        totalBalance += siteBalance;

        list.innerHTML += `<tr>
            <td><b>${site}</b></td>
            <td>${siteAya.toLocaleString()}</td>
            <td>${sitetotalMazdoor}</td>
            <td>${siteMazdoorKharcha.toLocaleString()}</td>
            <td>${siteOtherKharcha.toLocaleString()}</td>
            <td style="color: ${siteBalance >= 0 ? 'green' : 'red'}; font-weight: bold">${siteBalance.toLocaleString()}</td>
        </tr>`;
    });

    if (document.getElementById('siteCount')) {
        document.getElementById('siteCount').innerText = sites.length;
    }
    if (document.getElementById('siteTotalAya')) {
        document.getElementById('siteTotalAya').innerText = totalAya.toLocaleString();
    }
    if (document.getElementById('siteTotalKharcha')) {
        document.getElementById('siteTotalKharcha').innerText = totalKharcha.toLocaleString();
    }
    if (document.getElementById('siteTotalBalance')) {
        document.getElementById('siteTotalBalance').innerText = totalBalance.toLocaleString();
    }
}

function updateMazdoorTable() {
    const list = document.getElementById('mazdoorList');
    const nameSearch = document.getElementById('mSearchName') ? document.getElementById('mSearchName').value.toLowerCase() : '';
    const siteSearch = document.getElementById('mSearchSite') ? document.getElementById('mSearchSite').value.toLowerCase() : '';
    
    list.innerHTML = '';

    let totalUjrat = 0;
    let totalPaid = 0;
    let totalBaqaya = 0;

    labors.filter(l => {
        const matchesName = !nameSearch || l.name.toLowerCase().includes(nameSearch);
        const matchesSite = !siteSearch || (l.site || '').toLowerCase().includes(siteSearch);
        return matchesName && matchesSite;
    }).forEach(l => {
        const baqaya = (l.rate * l.att) - l.kharcha;
        
        totalUjrat += (l.rate * l.att);
        totalPaid += l.kharcha;
        totalBaqaya += baqaya;

        list.innerHTML += `
        <tr>
            <td><b>${l.name}</b></td>
            <td>${l.site || 'N/A'}</td>
            <td>${l.rate}</td>
            <td>${l.att}</td>
            <td>${l.kharcha}</td>
            <td style="color: ${baqaya >= 0 ? 'green' : 'red'}; font-weight:bold">${baqaya}</td>
            <td>
                <button class="action-btn" style="background: #27ae60;" onclick="markAtt(${l.id})" title="حاضری لگائیں">✅</button>
                <button class="action-btn" style="background: #8e44ad;" onclick="showAttendanceHistory(${l.id})" title="حاضری کی تاریخ">📅</button>
                <button class="action-btn" style="background: #27ae60;" onclick="addLaborExpense(${l.id})" title="خرچہ شامل کریں">💰</button>
                <button class="action-btn" style="background: #16a085;" onclick="showLaborExpenseHistory(${l.id})" title="خرچہ کی تفصیل">🧾</button>
                <button class="btn-edit icon-btn" onclick="editLabor(${l.id})" title="ترمیم">✏️</button>
                <button class="action-btn" style="background: #c0392b;" onclick="showLaborProfile(${l.id})" title="مزدور پروفائل">👤</button>
                <button class="btn-danger icon-btn" onclick="deleteLabor(${l.id})" title="ڈیلیٹ">🗑️</button>
            </td>
        </tr>
    `;
    });

    if (document.getElementById('mTotalUjrat')) {
        document.getElementById('mTotalUjrat').innerText = totalUjrat.toLocaleString();
        document.getElementById('mTotalPaid').innerText = totalPaid.toLocaleString();
        document.getElementById('mTotalBaqaya').innerText = totalBaqaya.toLocaleString();
    }
    const weekly = getLaborWeeklyTotals();
    if (document.getElementById('mWeekWages')) {
        document.getElementById('mWeekWages').innerText = weekly.wages.toLocaleString();
    }
    if (document.getElementById('mWeekExpenses')) {
        document.getElementById('mWeekExpenses').innerText = weekly.expenses.toLocaleString();
    }
}

function getLaborWeeklyTotals() {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    let wages = 0;
    let expensesTotal = 0;
    labors.forEach(l => {
        l.attendance.forEach(att => {
            const d = new Date(att.date);
            if (d >= weekAgo && d <= today) wages += l.rate;
        });
        l.expenses.forEach(exp => {
            const d = new Date(exp.date);
            if (d >= weekAgo && d <= today) expensesTotal += exp.amount;
        });
    });
    return { wages, expenses: expensesTotal };
}

function getDayName(dateString) {
    const d = new Date(dateString);
    const days = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];
    return days[d.getDay()];
}

async function markAtt(id) {
    const today = new Date().toISOString().split('T')[0];
    const dateVal = await showPrompt("حاضری کی تاریخ منتخب کریں", 'date', today, 'تاریخ منتخب کریں');
    if (dateVal === null || dateVal === '') return;
    const l = labors.find(x => x.id === id);
    const dayName = getDayName(dateVal);
    l.attendance.push({ date: dateVal, day: dayName });
    l.att = l.attendance.length;
    saveData();
}

function showAttendanceHistory(id) {
    const l = labors.find(x => x.id === id);
    const historyHtml = l.attendance.length
        ? `<ol style="text-align:right; padding-right:30px;">${l.attendance.map(a => `<li style="padding: 20px;">${a.date}  -  ${a.day}</li style="padding: 20px;">`).join('')}</ol>`
        : '<p>کسی بھی تاریخ پر حاضری موجود نہیں ہے۔</p>';
    Swal.fire({
        title: `حاضری کی تفصیل: ${l.name}`,
        html: historyHtml,
        confirmButtonText: 'ٹھیک ہے',
        customClass: { popup: 'swal2-popup' }
    });
}

async function addLaborExpense(id) {
    const today = new Date().toISOString().split('T')[0];
    const dateVal = await showPrompt("تاریخ", 'date', today, 'تاریخ منتخب کریں');
    if (dateVal === null || dateVal === '') return;
    const amount = await showPrompt("کتنا خرچہ دیا؟", 'number', '', 'رقم درج کریں');
    if (amount === null || amount === '' || isNaN(amount)) return;
    const note = await showPrompt("خرچہ کس لئے دیا؟", 'text', '', 'تفصیل درج کریں');
    const l = labors.find(x => x.id === id);
    const dayName = getDayName(dateVal);
    l.expenses.push({ date: dateVal, day: dayName, amount: parseFloat(amount), note: note || 'N/A' });
    l.kharcha += parseFloat(amount);
    saveData();
}

function showLaborExpenseHistory(id) {
    const l = labors.find(x => x.id === id);
    const historyHtml = l.expenses.length
        ? `<ol style="text-align:right; padding-right:30px;">${l.expenses.map(e => `<li style="padding: 20px;">${e.date}  -  ${e.day} :   ${e.amount}   (${e.note})</li style="padding: 20px;">`).join('')}</ol>`
        : '<p>کسی بھی تاریخ پر خرچہ موجود نہیں ہے۔</p>';
    Swal.fire({
        title: `خرچہ کی تفصیل: ${l.name}`,
        html: historyHtml,
        confirmButtonText: 'ٹھیک ہے',
        customClass: { popup: 'swal2-popup' }
    });
}

function showLaborProfile(id) {
    const l = labors.find(x => x.id === id);
    if (!l) return;
    const baqaya = (l.rate * l.att) - l.kharcha;
    const profileHtml = `
        <div style="text-align:right; direction:rtl;">
            <h3 style="color: #2c3e50; margin-bottom: 15px;">${l.name}</h3>
                    <p style="padding: 20px;"><strong> مزدور کا نام  :  </strong> ${l.name}</p>
                    <p style="padding: 20px;"><strong>سائٹ کا نام  :  </strong> ${l.site || 'درج نہیں'}</p>
                    <p style="padding: 20px;"><strong>موبائل نمبر  :  </strong> ${l.mobile || 'درج نہیں'}</p>
                    <p style="padding: 20px;"><strong>روز کی دیہاڑی  :  </strong> ${l.rate} روپے</p>
                    <p style="padding: 20px;"><strong>کل حاضری  :  </strong> ${l.att} دن</p>
                    <p style="padding: 20px;"><strong>کل اجرت  :  </strong> ${(l.rate * l.att).toLocaleString()} روپے</p>
                    <p style="padding: 20px;"><strong>کل خرچہ  :  </strong> ${l.kharcha.toLocaleString()} روپے</p>
                    <p style="padding: 20px;"><strong>بقایا رقم  :  </strong> ${baqaya.toLocaleString()} روپے</p>
        </div>
    `;
    const whatsappBtn = l.mobile ? `<a href="https://wa.me/${l.mobile}?text=${encodeURIComponent(`سلام ${l.name} بھائی، یہ آپ کے کام کا ریکارڈ ہے۔ آپ کی کل مزدوری ${l.rate * l.att} روپے، اب تک آپ کو ${l.kharcha} روپے دیے گئے، اور بقایا ${baqaya} روپے ہے۔`)}" target="_blank" class="swal2-styled swal2-default-outline" style="background: #25d366; color: white; border: none; margin-left: 10px; padding: 4px 10px; border-radius: 8px;">💬</a>` : '';
    Swal.fire({
        title: `${l.name} مزدور کی تفصیل`,
        html: profileHtml,
        confirmButtonText: 'ٹھیک ہے',
        didOpen: function(modal) {
            const container = modal.querySelector('.swal2-actions');
            if (whatsappBtn) {
                container.insertAdjacentHTML('beforeend', whatsappBtn);
            }
            // const pdfBtn = `<button type="button" class="swal2-styled swal2-default-outline" style="background:#3498db;color:white;border:none;margin-left:10px;" onclick="downloadLaborDetailsPDF(${l.id})">📄 PDF ڈاؤن لوڈ کریں</button>`;
            // container.insertAdjacentHTML('beforeend', pdfBtn);
            // const imgBtn = `<button type="button" class="swal2-styled swal2-default-outline" style="background:#9b59b6;color:white;border:none;margin-left:10px;" onclick="downloadDetailAsImage('labor', ${l.id})">🖼️ تصویر ڈاؤن لوڈ</button>`;
            // container.insertAdjacentHTML('beforeend', imgBtn);
            const waShareBtn = `<button type="button" class="swal2-styled swal2-default-outline" style="background:#16a085;color:white;border:none;margin-left:10px; padding: 6px 12px; border-radius: 8px;" onclick="shareDetailToWhatsApp('labor', ${l.id})">🖼️</button>`;
            container.insertAdjacentHTML('beforeend', waShareBtn);
        },
        customClass: { popup: 'swal2-popup' }
    });
}

async function addKharcha(id) {
    const amount = await showPrompt("کتنا خرچہ (ایڈوانس) دیا ہے؟", 'number', '', 'رقم درج کریں');
    if (amount !== null && amount !== '' && !isNaN(amount)) {
        let l = labors.find(x => x.id === id);
        l.kharcha += parseFloat(amount);
        saveData();
    }
}

async function editLabor(id) {
    const l = labors.find(x => x.id === id);
    const nName = await showPrompt("نام", 'text', l.name, 'نام درج کریں');
    const nSite = await showSitePrompt(l.site);
    const nMobile = await showPrompt("موبائل نمبر", 'tel', l.mobile, 'موبائل نمبر درج کریں');
    const nR = await showPrompt("نئی دیہاڑی؟", 'number', l.rate, 'نئی دیہاڑی درج کریں');
    const nA = await showPrompt("کل حاضری؟", 'number', l.att, 'حاضری درج کریں');
    const nK = await showPrompt("کل خرچہ؟", 'number', l.kharcha, 'خرچہ درج کریں');
    if (nName !== null && nName !== '') l.name = nName;
    if (nSite !== null) l.site = nSite;
    if (nMobile !== null && nMobile !== '') l.mobile = nMobile;
    if (nR !== null && nR !== '') l.rate = parseFloat(nR);
    if (nA !== null && nA !== '') l.att = parseFloat(nA);
    if (nK !== null && nK !== '') l.kharcha = parseFloat(nK);
    saveData();
}

async function deleteLabor(id) {
    if (await showConfirm("کیا آپ ڈیلیٹ کرنا چاہتے ہیں؟")) {
        labors = labors.filter(x => x.id !== id);
        saveData();
    }
}

// Malik Functions
function addOwner() {
    let dateVal = document.getElementById('ownerDate').value;
    const site = document.getElementById('ownerSite').value;
    const name = document.getElementById('ownerName').value;
    const amount = document.getElementById('ownerAmount').value;
    const desc = document.getElementById('ownerDesc').value;

    if (!name) return showToast("نام لکھیں", 'error');
    if (!site) return showToast("سائٹ کا نام لکھیں", 'error');
    
    if (!dateVal) {
        const today = new Date();
        dateVal = today.toISOString().split('T')[0];
    }   

    const d = new Date(dateVal);
    const days = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];
    const dayName = days[d.getDay()];

    owners.push({ 
        id: Date.now(), 
        name, 
        site, 
        contractTotal: parseFloat(amount) || 0, // treat entered amount as base contract
        originalContract: parseFloat(amount) || 0,
        received: 0, // no receipts yet
        history: [], 
        date: dateVal, 
        day: dayName,
        note: desc || '',
        desc: desc || ''
    });
    saveData();
    document.getElementById('ownerName').value = '';
    document.getElementById('ownerSite').value = '';
    document.getElementById('ownerAmount').value = '';
    document.getElementById('ownerDate').value = '';
    document.getElementById('ownerDesc').value = '';
}

function updateMalikTable() {
    const list = document.getElementById('malikList');
    const siteSearch = document.getElementById('oSearchSite') ? document.getElementById('oSearchSite').value.toLowerCase() : '';
    const ownerSearch = document.getElementById('oSearchName') ? document.getElementById('oSearchName').value.toLowerCase() : '';

    list.innerHTML = '';
    owners.filter(o => {
        const matchesSite = !siteSearch || o.site.toLowerCase().includes(siteSearch);
        const matchesOwner = !ownerSearch || o.name.toLowerCase().includes(ownerSearch);
        return matchesSite && matchesOwner;
    }).forEach(o => {
        const contract = parseFloat(o.contractTotal || 0);
        const dealInfo = getOwnerDealInfo(o);
        const totalContract = contract + dealInfo.dealAmount;
        const received = parseFloat(o.received || 0);
        const balance = totalContract - received;

        list.innerHTML += `<tr>
        <td>${o.date}</td>
        <td><b>${o.site}</b></td>
        <td>${o.name}</td>
        <td>${contract.toLocaleString()}</td>
        <td>${received.toLocaleString()}</td>
        <td style="color: ${balance >= 0 ? 'green' : 'red'}; font-weight:bold">${balance.toLocaleString()}</td>
        <td>
            <button class="btn-deal" onclick="addDeal(${o.id})" title="نئی ڈیل">🤝</button>
            <button class="btn-deal-detail" onclick="showDealDetails(${o.id})" title="ڈیل کی تفصیل">📈</button>
            <button class="btn-receipt" onclick="receiveMoney(${o.id})" title="رقم وصول کریں">💸</button>
            <button class="btn-history" onclick="showReceiptHistory(${o.id})" title="وصولی کی تاریخ">🧾</button>
            <button class="btn-edit icon-btn" onclick="editOwner(${o.id})" title="ترمیم">✏️</button>
            <button class="btn-detail" onclick="showOwnerDetails(${o.id})" title="مالک کی تفصیل">👤</button>
            <button class="btn-danger icon-btn" onclick="deleteOwner(${o.id})" title="ڈیلیٹ">🗑️</button>
        </td>
    </tr>`;
    });
    
    // Update dropdowns after malik table updates
    updateSiteDropdowns();
}

async function receiveMoney(id) {
    const today = new Date().toISOString().split('T')[0];
    const dateVal = await showPrompt("تاریخ", 'date', today, 'تاریخ منتخب کریں');
    if (dateVal === null || dateVal === '') return;
    const amt = await showPrompt("کتنی رقم ملی؟", 'number', '', 'رقم درج کریں');
    if (amt === null || amt === '' || isNaN(amt)) return;
    const sender = await showPrompt("کس طرح بھیجی؟", 'text', '', 'کیش،بنک ٹرانسفر،جازکیش');
    let o = owners.find(x => x.id === id);
    const dayName = getDayName(dateVal);
    o.received = (parseFloat(o.received || 0) + parseFloat(amt));
    o.history.push({ date: dateVal, day: dayName, amount: parseFloat(amt), from: sender || "N/A", type: 'receipt' });
    saveData();
}

function showDealDetails(id) {
    const o = owners.find(x => x.id === id);
    if (!o) return;
    const contract = (parseFloat(o.contractTotal) || 0).toLocaleString();
    const deals = (o.history || []).filter(h => h.type === 'deal');
    const dealsHtml = deals.length ? `<ol style="text-align:right; padding-right:30px;">${deals.map(d => `<li style="padding: 20px;">  ${d.date}   -   ${d.day}  :   ${d.amount.toLocaleString()}  -  ${d.desc || ''}</li>`).join('')}</ol>` : '<p>ابھی کوئی ڈیل دستیاب نہیں ہے۔</p>';
    const dealHtml = `
        <div style="text-align:right; direction:rtl;">
            ${dealsHtml}
        </div>`;
    Swal.fire({
        title: `ڈیل کی تفصیل: ${o.name}`,
        html: dealHtml,
        confirmButtonText: 'ٹھیک ہے',
        customClass: { popup: 'swal2-popup' }
    });
}

function showReceiptHistory(id) {
    const o = owners.find(x => x.id === id);
    if (!o) return;
    const receipts = (o.history || []).filter(h => h.type === 'receipt');
    const historyHtml = receipts.length
        ? `<ol style="text-align:right; padding-right:30px;">${receipts.map(h => `<li style="padding: 20px;">  ${h.date}   -   ${h.day} :   ${h.amount.toLocaleString()}   (${h.from || ''})</li>`).join('')}</ol>`
        : '<p>ابھی کوئی وصولی دستیاب نہیں ہے۔</p>';
    Swal.fire({
        title: `وصولی کی تفصیل: ${o.name}`,
        html: historyHtml,
        confirmButtonText: 'ٹھیک ہے',
        customClass: { popup: 'swal2-popup' }
    });
}

async function editOwner(id) {
    const o = owners.find(x => x.id === id);
    if (!o) return;
    const nDate = await showPrompt('تاریخ', 'date', o.date, 'تاریخ درج کریں');
    const nSite = await showPrompt('سائٹ کا نام', 'text', o.site, 'سائٹ کا نام درج کریں');
    const nName = await showPrompt('مالک کا نام', 'text', o.name, 'مالک کا نام درج کریں');
    const nContract = await showPrompt('ٹوٹل ٹھیکہ', 'number', o.contractTotal || 0, 'کل ٹھیکہ درج کریں');
    const nReceived = await showPrompt('کل وصولی', 'number', o.received || 0, 'کل وصولی درج کریں');
    const nDesc = await showPrompt('ڈیل کی تفصیل', 'text', o.desc || '', 'تفصیل درج کریں');
    if (nDate !== null) o.date = nDate;
    if (nSite !== null) o.site = nSite;
    if (nName !== null) o.name = nName;
    if (nContract !== null && nContract !== '') o.contractTotal = parseFloat(nContract);
    if (nReceived !== null && nReceived !== '') o.received = parseFloat(nReceived);
    if (nDesc !== null) o.desc = nDesc;
    saveData();
}

function showOwnerDetails(id) {
    const o = owners.find(x => x.id === id);
    if (!o) return;
    const siteLabors = labors.filter(l => l.site === o.site);
    const siteLaborKharcha = siteLabors.reduce((sum, l) => sum + l.kharcha, 0);
    const siteExpenses = expenses.filter(e => e.site === o.site).reduce((sum, e) => sum + e.amount, 0);
    const totalSiteKharcha = siteLaborKharcha + siteExpenses;
    const baseContract = parseFloat(o.contractTotal || 0);
    const dealInfo = getOwnerDealInfo(o);
    const totalContract = baseContract + dealInfo.dealAmount;
    const received = parseFloat(o.received || 0);
    const balance = totalContract - received;
    const detailHtml = `
        <div style="text-align:right; direction:rtl;">
            <p style="padding: 20px;"><strong>سائٹ کا نام  :   </strong> ${o.site}</p>
            <p style="padding: 20px;"><strong>مالک  کا نام  :   </strong> ${o.name}</p>
            <p style="padding: 20px;"><strong>تاریخ  :   </strong> ${o.date}</p>
            <p style="padding: 20px;"><strong>دن     :   </strong> ${o.day}</p>
            <p style="padding: 20px;"><strong>پہلے کا ٹھیکہ  :   </strong> ${baseContract.toLocaleString()} روپے</p>
            <p style="padding: 20px;"><strong>کل نئی ڈیلز  :   </strong> ${dealInfo.dealCount}</p>
            <p style="padding: 20px;"><strong>کل نئی ڈیلز کی رقم  :   </strong> ${dealInfo.dealAmount.toLocaleString()} روپے</p>
            <p style="padding: 20px;"><strong>ٹوٹل ٹھیکہ  :   </strong> ${totalContract.toLocaleString()} روپے</p>
            <p style="padding: 20px;"><strong>کل وصولی  :   </strong> ${received.toLocaleString()} روپے</p>
            <p style="padding: 20px;"><strong>بقایا  :   </strong> ${balance.toLocaleString()} روپے</p>
            <p style="padding: 20px;"><strong>ڈیل کی تفصیل  :   </strong> ${o.desc || 'N/A'}</p>
        </div>`;
    Swal.fire({
        title: 'مالک کی تفصیل',
        html: detailHtml,
        confirmButtonText: 'ٹھیک ہے',
        didOpen: function(modal) {
            const container = modal.querySelector('.swal2-actions');
            // const pdfBtn = `<button type="button" class="swal2-styled swal2-default-outline" style="background:#3498db;color:white;border:none;margin-left:10px;" onclick="downloadOwnerDetailsPDF(${o.id})">📄 PDF ڈاؤن لوڈ کریں</button>`;
            // container.insertAdjacentHTML('beforeend', pdfBtn);
            // const imgBtn = `<button type="button" class="swal2-styled swal2-default-outline" style="background:#9b59b6;color:white;border:none;margin-left:10px;" onclick="downloadDetailAsImage('owner', ${o.id})">🖼️ تصویر ڈاؤن لوڈ</button>`;
            // container.insertAdjacentHTML('beforeend', imgBtn);
            const waBtn = `<button type="button" class="swal2-styled swal2-default-outline" style="background:#25d366;color:white;border:none;margin-left:10px;" onclick="sendOwnerWhatsApp(${o.id})">💬</button>`;
            container.insertAdjacentHTML('beforeend', waBtn);
            const waShareBtn = `<button type="button" class="swal2-styled swal2-default-outline" style="background:#16a085;color:white;border:none;margin-left:10px;" onclick="shareDetailToWhatsApp('owner', ${o.id})">🖼️</button>`;
            container.insertAdjacentHTML('beforeend', waShareBtn);
        },
        customClass: { popup: 'swal2-popup' }
    });
}

async function sendOwnerWhatsApp(ownerId) {
    const o = owners.find(x => x.id === ownerId);
    if (!o) return showToast('مالک نہیں ملا', 'error');
    const mobile = await showPrompt('مالک کا موبائل نمبر درج کریں (مثال: 92300...)', 'tel', o.mobile || '', 'موبائل نمبر درج کریں');
    if (!mobile) return;
    const baseContract = parseFloat(o.contractTotal || 0).toLocaleString();
    const dealInfo = getOwnerDealInfo(o);
    const totalContract = (baseContract && dealInfo.dealAmount) ? (parseFloat(o.contractTotal || 0) + dealInfo.dealAmount) : (parseFloat(o.contractTotal || 0) + dealInfo.dealAmount);
    const received = parseFloat(o.received || 0).toLocaleString();
    const balance = (parseFloat(o.contractTotal || 0) + dealInfo.dealAmount - parseFloat(o.received || 0)).toLocaleString();
    const message = `سلام ${o.name} صاحب، آپ کی سائٹ: ${o.site}. ٹوٹل ٹھیکہ: ${totalContract} روپے. کل وصولی: ${received} روپے. بقایا: ${balance} روپے. تفصیل: ${o.desc || 'N/A'}`;
    const url = `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

async function deleteOwner(id) {
    if (await showConfirm("کیا آپ ڈیلیٹ کرنا چاہتے ہیں؟")) {
        owners = owners.filter(x => x.id !== id);
        saveData();
    }
}

// Add a new deal (contract amount) for an existing owner
async function addDeal(id) {
    const today = new Date().toISOString().split('T')[0];
    const dateVal = await showPrompt("تاریخ", 'date', today, 'تاریخ منتخب کریں');
    if (dateVal === null || dateVal === '') return;
    const o = owners.find(x => x.id === id);
    if (!o) return;
    const dayName = getDayName(dateVal);
    const amount = await showPrompt('نئی ڈیل کی رقم', 'number', '', 'رقم درج کریں');
    if (amount === null || amount === '' || isNaN(amount)) return;
    const desc = await showPrompt('ڈیل کی تفصیل', 'text', '', 'تفصیل درج کریں');
    o.history = o.history || [];
    o.history.push({ date: dateVal, day: dayName, amount: parseFloat(amount), desc: desc || '', type: 'deal' });
    saveData();
    showToast('نئی ڈیل شامل کر دی گئی۔', 'success');
}

function addExpense() {
    let dateVal = document.getElementById('kDate').value;
    const name = document.getElementById('kName').value;
    const amount = document.getElementById('kAmount').value;
    const site = document.getElementById('kSiteSelect').value;


    if (!name || !amount || !site) return showToast("آئٹم، رقم اور سائٹ لکھیں!", 'error');

    if (!dateVal) {
        const today = new Date();
        dateVal = today.toISOString().split('T')[0];
    }

    const d = new Date(dateVal);
    const days = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];
    const dayName = days[d.getDay()];

    expenses.push({ 
        id: Date.now(), 
        name, 
        amount: parseFloat(amount), 
        date: dateVal, 
        day: dayName,
        site: site || ''
    });
    saveData();

    document.getElementById('kName').value = '';
    document.getElementById('kAmount').value = '';
    document.getElementById('kDate').value = '';
    document.getElementById('kSiteSelect').value = '';
}

function updateKharchaTable() {
    const list = document.getElementById('kharchaList');
    const siteSearch = document.getElementById('kSearchSite') ? document.getElementById('kSearchSite').value.toLowerCase() : '';
    
    if (!list) return;
    list.innerHTML = '';
    
    expenses.filter(e => {
        return !siteSearch || (e.site || '').toLowerCase().includes(siteSearch);
    }).forEach(e => {
        list.innerHTML += `<tr>
        <td>${e.date} (${e.day})</td>
        <td>${e.site || 'N/A'}</td>
        <td>${e.name}</td>
        <td>${e.amount.toLocaleString()}</td>
        <td>
            <button class="btn-danger" onclick="deleteExpense(${e.id})">ڈیلیٹ</button>
        </td>
    </tr>`;
    });
}

async function deleteExpense(id) {
    if (await showConfirm("کیا آپ ڈیلیٹ کرنا چاہتے ہیں؟")) {
        expenses = expenses.filter(x => x.id !== id);
        saveData();
    }
}

// Filter functions
function filterBySite(section) {
    if (section === 'mazdoor') {
        updateMazdoorTable();
    } else if (section === 'kharcha') {
        updateKharchaTable();
    }
}

function downloadLaborDetailsPDF(laborId) {
    const l = labors.find(x => x.id === laborId);
    if (!l) return showToast('مزدور نہیں ملا', 'error');
    const baqaya = (l.rate * l.att) - l.kharcha;
    const profileHtml = `
        <div style="text-align:right; direction:rtl;">
            <h3 style="color: #2c3e50; margin-bottom: 15px;">${l.name}</h3>
            <p style="padding: 20px;"><strong>مزدور کا نام  :  </strong> ${l.name}</p>
            <p style="padding: 20px;"><strong>سائٹ کا نام  :  </strong> ${l.site || 'درج نہیں'}</p>
            <p style="padding: 20px;"><strong>موبائل نمبر  :  </strong> ${l.mobile || 'درج نہیں'}</p>
            <p style="padding: 20px;"><strong>روز کی دیہاڑی  :  </strong> ${l.rate} روپے</p>
            <p style="padding: 20px;"><strong>کل حاضری  :  </strong> ${l.att} دن</p>
            <p style="padding: 20px;"><strong>کل اجرت  :  </strong> ${(l.rate * l.att).toLocaleString()} روپے</p>
            <p style="padding: 20px;"><strong>کل خرچہ  :  </strong> ${l.kharcha.toLocaleString()} روپے</p>
            <p style="padding: 20px;"><strong>بقایا رقم  :  </strong> ${baqaya.toLocaleString()} روپے</p>
        </div>
    `;
    const temp = document.createElement('div');
    temp.innerHTML = profileHtml;
    document.body.appendChild(temp);
    exportSectionToPDF(temp, `${l.name || 'mazdoor'}-تفصیل.pdf`);
    setTimeout(() => document.body.removeChild(temp), 500);
}

function downloadOwnerDetailsPDF(ownerId) {
    const o = owners.find(x => x.id === ownerId);
    if (!o) return showToast('مالک نہیں ملا', 'error');
    const baseContract = parseFloat(o.contractTotal || 0);
    const dealInfo = getOwnerDealInfo(o);
    const totalContract = baseContract + dealInfo.dealAmount;
    const received = parseFloat(o.received || 0);
    const balance = totalContract - received;
    const detailHtml = `
        <div style="text-align:right; direction:rtl;">
            <h3 style="color: #2c3e50; margin-bottom: 15px;">${o.name}</h3>
            <p style="padding: 20px;"><strong>سائٹ کا نام  :   </strong> ${o.site}</p>
            <p style="padding: 20px;"><strong>مالک  کا نام  :   </strong> ${o.name}</p>
            <p style="padding: 20px;"><strong>تاریخ  :   </strong> ${o.date}</p>
            <p style="padding: 20px;"><strong>دن     :   </strong> ${o.day}</p>
            <p style="padding: 20px;"><strong>پہلے کا ٹھیکہ  :   </strong> ${baseContract.toLocaleString()} روپے</p>
            <p style="padding: 20px;"><strong>کل نئی ڈیلز  :   </strong> ${dealInfo.dealCount}</p>
            <p style="padding: 20px;"><strong>کل نئی ڈیلز کی رقم  :   </strong> ${dealInfo.dealAmount.toLocaleString()} روپے</p>
            <p style="padding: 20px;"><strong>ٹوٹل ٹھیکہ  :   </strong> ${totalContract.toLocaleString()} روپے</p>
            <p style="padding: 20px;"><strong>کل وصولی  :   </strong> ${received.toLocaleString()} روپے</p>
            <p style="padding: 20px;"><strong>بقایا  :   </strong> ${balance.toLocaleString()} روپے</p>
            <p style="padding: 20px;"><strong>ڈیل کی تفصیل  :   </strong> ${o.desc || 'N/A'}</p>
        </div>
    `;
    const temp = document.createElement('div');
    temp.innerHTML = detailHtml;
    document.body.appendChild(temp);
    exportSectionToPDF(temp, `${o.name || 'malik'}-تفصیل.pdf`);
    setTimeout(() => document.body.removeChild(temp), 500);
}

function downloadDetailAsImage(type, id) {
    let content = '';
    let fileName = '';
    if (type === 'labor') {
        const l = labors.find(x => x.id === id);
        if (!l) return showToast('مزدور نہیں ملا', 'error');
        const baqaya = (l.rate * l.att) - l.kharcha;
        fileName = `${l.name}-تفصیل.png`;
        content = `مزدور کی تفصیل\n${l.name}\n\nمزدور کا نام: ${l.name}\nسائٹ کا نام: ${l.site || 'درج نہیں'}\nموبائل: ${l.mobile || 'درج نہیں'}\nروز کی دیہاڑی: ${l.rate} روپے\nکل حاضری: ${l.att} دن\nکل اجرت: ${(l.rate * l.att).toLocaleString()} روپے\nکل خرچہ: ${l.kharcha.toLocaleString()} روپے\nبقایا رقم: ${baqaya.toLocaleString()} روپے`;
    } else if (type === 'owner') {
        const o = owners.find(x => x.id === id);
        if (!o) return showToast('مالک نہیں ملا', 'error');
        const baseContract = parseFloat(o.contractTotal || 0);
        const dealInfo = getOwnerDealInfo(o);
        const totalContract = baseContract + dealInfo.dealAmount;
        const received = parseFloat(o.received || 0);
        const balance = totalContract - received;
        fileName = `${o.name}-تفصیل.png`;
        content = `مالک کی تفصیل\n${o.name}\n\nسائٹ کا نام: ${o.site}\nمالک کا نام: ${o.name}\nتاریخ: ${o.date}\nدن: ${o.day}\nپہلے کا ٹھیکہ: ${baseContract.toLocaleString()} روپے\nکل نئی ڈیلز: ${dealInfo.dealCount}\nکل نئی ڈیلز کی رقم: ${dealInfo.dealAmount.toLocaleString()} روپے\nٹوٹل ٹھیکہ: ${totalContract.toLocaleString()} روپے\nکل وصولی: ${received.toLocaleString()} روپے\nبقایا: ${balance.toLocaleString()} روپے\nڈیل کی تفصیل: ${o.desc || 'N/A'}`;
    }
    
    if (!content) return;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(content.split('\n')[0], 560, 40);
    ctx.font = '16px Arial';
    const lines = content.split('\n');
    let y = 100;
    for (let i = 1; i < lines.length; i++) {
        ctx.fillText(lines[i], 560, y);
        y += 40;
    }
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png');
}

async function shareDetailToWhatsApp(type, id) {
    showToast('براہ راست تصویر بھیج رہے ہیں...', 'info');
    
    let htmlContent = '';
    let fileName = '';
    
    if (type === 'labor') {
        const l = labors.find(x => x.id === id);
        if (!l) return showToast('مزدور نہیں ملا', 'error');
        const baqaya = (l.rate * l.att) - l.kharcha;
        fileName = `${l.name}-تفصیل`;
        htmlContent = `
            <div style="text-align:right; direction:rtl; padding: 30px; background: #fff; font-family: Arial, sans-serif; color: #2c3e50;">
                <h2 style="margin-top: 0; font-size: 24px; border-bottom: 3px solid #3498db; padding-bottom: 10px;">${l.name}</h2>
                <p style="padding: 8px; font-size: 14px;"><strong>مزدور کا نام:</strong> ${l.name}</p>
                <p style="padding: 8px; font-size: 14px;"><strong>سائٹ کا نام:</strong> ${l.site || 'درج نہیں'}</p>
                <p style="padding: 8px; font-size: 14px;"><strong>موبائل:</strong> ${l.mobile || 'درج نہیں'}</p>
                <p style="padding: 8px; font-size: 14px;"><strong>روز کی دیہاڑی:</strong> ${l.rate} روپے</p>
                <p style="padding: 8px; font-size: 14px;"><strong>کل حاضری:</strong> ${l.att} دن</p>
                <p style="padding: 8px; font-size: 14px;"><strong>کل اجرت:</strong> ${(l.rate * l.att).toLocaleString()} روپے</p>
                <p style="padding: 8px; font-size: 14px;"><strong>کل خرچہ:</strong> ${l.kharcha.toLocaleString()} روپے</p>
                <p style="padding: 8px; font-size: 14px; background: #ecf0f1; border-radius: 5px;"><strong>بقایا رقم:</strong> <span style="color: ${baqaya >= 0 ? 'green' : 'red'}; font-weight: bold;">${baqaya.toLocaleString()} روپے</span></p>
            </div>
        `;
    } else if (type === 'owner') {
        const o = owners.find(x => x.id === id);
        if (!o) return showToast('مالک نہیں ملا', 'error');
        const baseContract = parseFloat(o.contractTotal || 0);
        const dealInfo = getOwnerDealInfo(o);
        const totalContract = baseContract + dealInfo.dealAmount;
        const received = parseFloat(o.received || 0);
        const balance = totalContract - received;
        fileName = `${o.name}-تفصیل`;
        htmlContent = `
            <div style="text-align:right; direction:rtl; padding: 30px; background: #fff; font-family: Arial, sans-serif; color: #2c3e50;">
                <h2 style="margin-top: 0; font-size: 24px; border-bottom: 3px solid #3498db; padding-bottom: 10px;">${o.name}</h2>
                <p style="padding: 8px; font-size: 14px;"><strong>سائٹ کا نام:</strong> ${o.site}</p>
                <p style="padding: 8px; font-size: 14px;"><strong>مالک کا نام:</strong> ${o.name}</p>
                <p style="padding: 8px; font-size: 14px;"><strong>تاریخ:</strong> ${o.date}</p>
                <p style="padding: 8px; font-size: 14px;"><strong>دن:</strong> ${o.day}</p>
                <p style="padding: 8px; font-size: 14px;"><strong>پہلے کا ٹھیکہ:</strong> ${baseContract.toLocaleString()} روپے</p>
                <p style="padding: 8px; font-size: 14px;"><strong>کل نئی ڈیلز:</strong> ${dealInfo.dealCount}</p>
                <p style="padding: 8px; font-size: 14px;"><strong>کل نئی ڈیلز کی رقم:</strong> ${dealInfo.dealAmount.toLocaleString()} روپے</p>
                <p style="padding: 8px; font-size: 14px;"><strong>ٹوٹل ٹھیکہ:</strong> ${totalContract.toLocaleString()} روپے</p>
                <p style="padding: 8px; font-size: 14px;"><strong>کل وصولی:</strong> ${received.toLocaleString()} روپے</p>
                <p style="padding: 8px; font-size: 14px; background: #ecf0f1; border-radius: 5px;"><strong>بقایا:</strong> <span style="color: ${balance >= 0 ? 'green' : 'red'}; font-weight: bold;">${balance.toLocaleString()} روپے</span></p>
                <p style="padding: 8px; font-size: 14px;"><strong>ڈیل کی تفصیل:</strong> ${o.desc || 'N/A'}</p>
            </div>
        `;
    }
    
    if (!htmlContent) return;
    
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.width = '800px';
    container.style.backgroundColor = 'white';
    document.body.appendChild(container);
    
    try {
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        document.body.removeChild(container);
        
        canvas.toBlob(async function(blob) {
            const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
            
            if (navigator.share && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: fileName,
                        text: 'تفصیلات'
                    });
                    showToast('تصویر شیئر ہو گئی!', 'success');
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error('شیئر کریں میں خرابی:', err);
                        downloadShareFile(blob, `${fileName}.png`);
                    }
                }
            } else {
                downloadShareFile(blob, `${fileName}.png`);
            }
        }, 'image/png');
    } catch (error) {
        console.error('تصویر بنانے میں خرابی:', error);
        showToast('تصویر بنانے میں خرابی پیش آئی۔ براہ مہربانی دوبارہ کوشش کریں۔', 'error');
        document.body.removeChild(container);
    }
}

function downloadShareFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('تصویر ڈاؤن لوڈ ہو گئی۔ اسے WhatsApp میں کھول کر بھیجیں۔', 'success');
}