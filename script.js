let labors = JSON.parse(localStorage.getItem('thekedar_labors')) || [];
let owners = JSON.parse(localStorage.getItem('thekedar_owners')) || [];
let expenses = JSON.parse(localStorage.getItem('thekedar_expenses')) || [];

labors = labors.map(l => ({ attendance: l.attendance || [], expenses: l.expenses || [], ...l }));

let currentOTP = null;

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

function sendOTP() {
    currentOTP = Math.floor(1000 + Math.random() * 9000).toString();
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
        updateMazdoorTable();
        updateMalikTable();
        updateKharchaTable();
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
    owners.forEach(o => totalAya += o.received);
    
    let totalKharcha = 0;
    expenses.forEach(e => totalKharcha += e.amount);
    labors.forEach(l => totalKharcha += l.kharcha);

    document.getElementById('sumAya').innerText = totalAya.toLocaleString();
    document.getElementById('sumKharcha').innerText = totalKharcha.toLocaleString();
    document.getElementById('sumBaqaya').innerText = (totalAya - totalKharcha).toLocaleString();
}

function showSection(type) {
    document.getElementById('mazdoorSection').style.display = type === 'mazdoor' ? 'block' : 'none';
    document.getElementById('malikSection').style.display = type === 'malik' ? 'block' : 'none';
    document.getElementById('kharchaSection').style.display = type === 'kharcha' ? 'block' : 'none';
    document.getElementById('btnMazdoor').classList.toggle('active', type === 'mazdoor');
    document.getElementById('btnMalik').classList.toggle('active', type === 'malik');
    document.getElementById('btnKharcha').classList.toggle('active', type === 'kharcha');
}

function saveData() {
    localStorage.setItem('thekedar_labors', JSON.stringify(labors));
    localStorage.setItem('thekedar_owners', JSON.stringify(owners));
    localStorage.setItem('thekedar_expenses', JSON.stringify(expenses));
    updateMazdoorTable();
    updateMalikTable();
    updateKharchaTable();
    updateSummary();
}

function addLabor() {
    const name = document.getElementById('mName').value;
    const rate = document.getElementById('mRate').value;
    const mobile = document.getElementById('mMobile').value;
    if (!name || !rate) return showToast("تفصیل درج کریں", 'error');
    labors.push({ id: Date.now(), name, rate: parseFloat(rate), mobile: mobile || '', att: 0, kharcha: 0, attendance: [], expenses: [] });
    saveData();
    document.getElementById('mName').value = '';
    document.getElementById('mRate').value = '';
    document.getElementById('mMobile').value = '';
}

function exportSectionToPDF(element, fileName) {
    const opt = {
        margin: 0.5,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

function exportCurrentSectionPDF() {
    let sectionId = 'mazdoorSection';
    if (document.getElementById('btnMalik').classList.contains('active')) sectionId = 'malikSection';
    if (document.getElementById('btnKharcha').classList.contains('active')) sectionId = 'kharchaSection';
    const section = document.getElementById(sectionId);
    if (!section) return;
    exportSectionToPDF(section, `${sectionId}.pdf`);
}

function updateMazdoorTable() {
    const list = document.getElementById('mazdoorList');
    const searchTerm = document.getElementById('mSearch').value.toLowerCase();
    list.innerHTML = '';

    let totalUjrat = 0;
    let totalPaid = 0;
    let totalBaqaya = 0;

    labors.filter(l => l.name.toLowerCase().includes(searchTerm)).forEach(l => {
        const baqaya = (l.rate * l.att) - l.kharcha;
        const last = l.attendance.length ? l.attendance[l.attendance.length - 1] : null;
        const lastExpense = l.expenses.length ? l.expenses[l.expenses.length - 1] : null;
        const lastAttendanceText = last ? `${last.date} (${last.day})` : 'N/A';
        const lastExpenseText = lastExpense ? `${lastExpense.date} (${lastExpense.day})` : 'N/A';
        
        totalUjrat += (l.rate * l.att);
        totalPaid += l.kharcha;
        totalBaqaya += baqaya;

        list.innerHTML += `
        <tr>
            <td><b>${l.name}</b></td>
            <td>${l.rate}</td>
            <td>${l.att}</td>
            <td>${lastAttendanceText}</td>
            <td>${lastExpenseText}</td>
            <td>${l.kharcha}</td>
            <td style="color: ${baqaya >= 0 ? 'green' : 'red'}; font-weight:bold">${baqaya}</td>
            <td>
                <button class="btn-action" onclick="markAtt(${l.id})" title="حاضری لگائیں">حاضری</button>
                <button class="btn-action" onclick="showAttendanceHistory(${l.id})" style="background: #8e44ad;">حاضری دیکھیں</button>
                <button class="btn-action" onclick="addLaborExpense(${l.id})" style="background: #27ae60;">صارف خرچہ</button>
                <button class="btn-action" onclick="showLaborExpenseHistory(${l.id})" style="background: #16a085;">خرچہ دیکھیں</button>
                <button class="btn-action" onclick="showLaborProfile(${l.id})" style="background: #c0392b;">سارا ڈیٹا</button>
                <button class="btn-edit" onclick="editLabor(${l.id})">ترمیم</button>
                <button class="btn-danger" onclick="deleteLabor(${l.id})">ڈیلیٹ</button>
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
        ? `<ul style="text-align:right; padding-right:0;">${l.attendance.map(a => `<li>${a.date} - ${a.day}</li>`).join('')}</ul>`
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
    const dateVal = await showPrompt("خرچہ کی تاریخ منتخب کریں", 'date', today, 'تاریخ منتخب کریں');
    if (dateVal === null || dateVal === '') return;
    const amount = await showPrompt("کتنا خرچہ ہوا؟", 'number', '', 'رقم درج کریں');
    if (amount === null || amount === '' || isNaN(amount)) return;
    const note = await showPrompt("خرچہ کس لئے ہے؟", 'text', '', 'تفصیل درج کریں');
    const l = labors.find(x => x.id === id);
    const dayName = getDayName(dateVal);
    l.expenses.push({ date: dateVal, day: dayName, amount: parseFloat(amount), note: note || 'N/A' });
    l.kharcha += parseFloat(amount);
    saveData();
}

function showLaborExpenseHistory(id) {
    const l = labors.find(x => x.id === id);
    const historyHtml = l.expenses.length
        ? `<ul style="text-align:right; padding-right:0;">${l.expenses.map(e => `<li>${e.date} - ${e.day}: ${e.amount} (${e.note})</li>`).join('')}</ul>`
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
    const total7days = getLaborWeeklyTotals();
    const profileHtml = `
        <div style="text-align:right; direction:rtl;">
            <h3 style="color: #2c3e50; margin-bottom: 15px;">${l.name}</h3>
            <table style="width:100%; margin-bottom: 15px; border-collapse: collapse;">
                <tr style="background: #ecf0f1;">
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align:right;"><b>موبائل نمبر</b></td>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align:right;">${l.mobile || 'درج نہیں'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align:right;"><b>روز کی دیہاڑی</b></td>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align:right;">${l.rate}</td>
                </tr>
                <tr style="background: #ecf0f1;">
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align:right;"><b>کل حاضری</b></td>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align:right;">${l.att}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align:right;"><b>کل اجرت</b></td>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align:right;">${(l.rate * l.att).toLocaleString()}</td>
                </tr>
                <tr style="background: #ecf0f1;">
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align:right;"><b>کل خرچہ</b></td>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align:right;">${l.kharcha.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align:right;"><b>بقایا رقم</b></td>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align:right; color: ${baqaya >= 0 ? 'green' : 'red'}; font-weight: bold;">${baqaya.toLocaleString()}</td>
                </tr>
            </table>
        </div>
    `;
    const whatsappBtn = l.mobile ? `<a href="https://wa.me/${l.mobile}?text=${encodeURIComponent(`سلام ${l.name}، یہ آپ کا کام کا ریکارڈ ہے۔ اجرت: ${l.rate * l.att}، خرچہ: ${l.kharcha}، بقایا: ${baqaya}`)}" target="_blank" class="swal2-styled swal2-default-outline" style="background: #25d366; color: white; border: none; margin-left: 10px;">💬 WhatsApp بھیجیں</a>` : '';
    Swal.fire({
        title: `${l.name} کا مکمل ریکارڈ`,
        html: profileHtml,
        confirmButtonText: 'بند کریں',
        didOpen: function(modal) {
            if (whatsappBtn) {
                const container = modal.querySelector('.swal2-actions');
                container.insertAdjacentHTML('beforeend', whatsappBtn);
            }
        },
        customClass: { popup: 'swal2-popup' }
    });
}

async function addKharcha(id) {
    const amount = await showPrompt("کتنا خرچہ (ایڈوانس) دینا ہے؟", 'number', '', 'رقم درج کریں');
    if (amount !== null && amount !== '' && !isNaN(amount)) {
        let l = labors.find(x => x.id === id);
        l.kharcha += parseFloat(amount);
        saveData();
    }
}

async function editLabor(id) {
    const l = labors.find(x => x.id === id);
    const nName = await showPrompt("نام", 'text', l.name, 'نام درج کریں');
    const nMobile = await showPrompt("موبائل نمبر", 'tel', l.mobile, 'موبائل نمبر درج کریں');
    const nR = await showPrompt("نئی دیہاڑی؟", 'number', l.rate, 'نئی دیہاڑی درج کریں');
    const nA = await showPrompt("کل حاضری؟", 'number', l.att, 'حاضری درج کریں');
    const nK = await showPrompt("کل خرچہ؟", 'number', l.kharcha, 'خرچہ درج کریں');
    if (nName !== null && nName !== '') l.name = nName;
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
    const name = document.getElementById('ownerName').value;
    if (!name) return showToast("نام لکھیں", 'error');
    owners.push({ id: Date.now(), name, received: 0, history: [] });
    saveData();
    document.getElementById('ownerName').value = '';
}

function updateMalikTable() {
    const list = document.getElementById('malikList');
    list.innerHTML = '';
    owners.forEach(o => {
        let histHtml = o.history.map(h => `<div class="history-text">${h.date}: ${h.amount} (${h.from})</div>`).join('');
        list.innerHTML += `<tr>
        <td>${o.name}</td>
        <td>${o.received}</td>
        <td>${histHtml}</td>
        <td>
            <button class="btn-action" onclick="receiveMoney(${o.id})">پیسہ ملا</button>
            <button class="btn-danger" onclick="deleteOwner(${o.id})">ڈیلیٹ</button>
        </td>
    </tr>`;
    });
}

async function receiveMoney(id) {
    const amt = await showPrompt("کتنی رقم ملی؟", 'number', '', 'رقم درج کریں');
    if (amt === null || amt === '') return;
    const sender = await showPrompt("کس نے بھیجی؟", 'text', '', 'نام درج کریں');
    let o = owners.find(x => x.id === id);
    o.received += parseFloat(amt);
    o.history.push({ date: new Date().toLocaleDateString('en-GB'), amount: amt, from: sender || "N/A" });
    saveData();
}

async function deleteOwner(id) {
    if (await showConfirm("کیا آپ ڈیلیٹ کرنا چاہتے ہیں؟")) {
        owners = owners.filter(x => x.id !== id);
        saveData();
    }
}

// Kharcha Book Functions
function addExpense() {
    const name = document.getElementById('kName').value;
    const location = document.getElementById('kLocation').value || "N/A";
    const amount = document.getElementById('kAmount').value;
    let dateVal = document.getElementById('kDate').value;

    if (!name || !amount) return showToast("آئٹم اور رقم لکھیں!", 'error');

    if (!dateVal) {
        const today = new Date();
        dateVal = today.toISOString().split('T')[0];
    }

    const d = new Date(dateVal);
    const days = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];
    const dayName = days[d.getDay()];

    expenses.push({ id: Date.now(), name, location, amount: parseFloat(amount), date: dateVal, day: dayName });
    saveData();

    document.getElementById('kName').value = '';
    document.getElementById('kLocation').value = '';
    document.getElementById('kAmount').value = '';
    document.getElementById('kDate').value = '';
}

function updateKharchaTable() {
    const list = document.getElementById('kharchaList');
    if (!list) return; // defensive check
    list.innerHTML = '';
    expenses.forEach(e => {
        list.innerHTML += `<tr>
        <td>${e.name}</td>
        <td>${e.location || "N/A"}</td>
        <td>${e.amount}</td>
        <td>${e.date} (${e.day})</td>
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
