let labors = JSON.parse(localStorage.getItem('thekedar_labors')) || [];
let owners = JSON.parse(localStorage.getItem('thekedar_owners')) || [];
let expenses = JSON.parse(localStorage.getItem('thekedar_expenses')) || [];

let currentOTP = null;

function sendOTP() {
    currentOTP = Math.floor(1000 + Math.random() * 9000).toString();
    
    Swal.fire({
        html: '<div class="urdu-font">آپ کا پاس ورڈ ہے: <br><b style="font-size:24px">' + currentOTP + '</b></div>',
        confirmButtonText: 'ٹھیک ہے',
        customClass: {
            confirmButton: 'urdu-font'
        }
    });
}

function checkLogin() {
    if (currentOTP === null) {
        Swal.fire({
            html: '<div class="urdu-font">پہلے "پاس ورڈ حاصل کریں"اوپر کے بٹن پر کلک کریں!</div>',
            icon: 'warning',
            confirmButtonText: 'ٹھیک ہے',
            customClass: {
                confirmButton: 'urdu-font'
            }
        });
        return;
    }

    if (document.getElementById('passCode').value === currentOTP) {
        Swal.fire({
            html: '<div class="urdu-font">لاگ اِن کامیاب ہو گیا!</div>',
            icon: 'success',
            confirmButtonText: 'ٹھیک ہے',
            customClass: {
                confirmButton: 'urdu-font'
            }
        }).then(() => {
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            updateMazdoorTable();
            updateMalikTable();
            updateKharchaTable();
            updateSummary();
            document.getElementById('passCode').value = '';
            currentOTP = null;
        });
    } else {
        Swal.fire({
            html: '<div class="urdu-font">غلط نمبر ہے! دوبارہ کوشش کریں</div>',
            icon: 'error',
            confirmButtonText: 'ٹھیک ہے',
            customClass: {
                confirmButton: 'urdu-font'
            }
        });
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
    if (!name || !rate) return alert("Detail bharein");
    labors.push({ id: Date.now(), name, rate: parseFloat(rate), att: 0, kharcha: 0 });
    saveData();
    document.getElementById('mName').value = '';
    document.getElementById('mRate').value = '';
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
        
        totalUjrat += (l.rate * l.att);
        totalPaid += l.kharcha;
        totalBaqaya += baqaya;

        list.innerHTML += `
        <tr>
            <td><b>${l.name}</b></td>
            <td>${l.rate}</td>
            <td>${l.att}</td>
            <td>${l.kharcha}</td>
            <td style="color: ${baqaya >= 0 ? 'green' : 'red'}; font-weight:bold">${baqaya}</td>
            <td>
                <button class="btn-action" onclick="markAtt(${l.id})"style="background: #2ecc71;" title="Hazri Lagayein">حاضری</button>
                <button class="btn-edit" onclick="addKharcha(${l.id})" style="background: #3498db;">کتنا خرچہ دیا</button>
                <button class="btn-edit" onclick="editLabor(${l.id})">کوئی تبدیلی</button>
                <button class="btn-danger" onclick="deleteLabor(${l.id})">ختم کیا</button>
            </td>
        </tr>
    `;
    });

    if (document.getElementById('mTotalUjrat')) {
        document.getElementById('mTotalUjrat').innerText = totalUjrat.toLocaleString();
        document.getElementById('mTotalPaid').innerText = totalPaid.toLocaleString();
        document.getElementById('mTotalBaqaya').innerText = totalBaqaya.toLocaleString();
    }
}

function markAtt(id) {
    labors.find(x => x.id === id).att += 1;
    saveData();
}

function addKharcha(id) {
    const amount = prompt("Kitna kharcha (advance) dena hai?");
    if (amount && !isNaN(amount)) {
        let l = labors.find(x => x.id === id);
        l.kharcha += parseFloat(amount);
        saveData();
    }
}

function editLabor(id) {
    const l = labors.find(x => x.id === id);
    const nR = prompt("Nayi Dihadi?", l.rate);
    const nA = prompt("Kul Hazri?", l.att);
    const nK = prompt("Kul Kharcha?", l.kharcha);
    if (nR !== null) l.rate = parseFloat(nR);
    if (nA !== null) l.att = parseFloat(nA);
    if (nK !== null) l.kharcha = parseFloat(nK);
    saveData();
}

function deleteLabor(id) {
    if (confirm("Delete karein?")) {
        labors = labors.filter(x => x.id !== id);
        saveData();
    }
}

// Malik Functions
function addOwner() {
    const name = document.getElementById('ownerName').value;
    if (!name) return alert("Naam likhein");
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
            <button class="btn-action" onclick="receiveMoney(${o.id})">Paisa Mila</button>
            <button class="btn-danger" onclick="deleteOwner(${o.id})">Del</button>
        </td>
    </tr>`;
    });
}

function receiveMoney(id) {
    const amt = prompt("Kitni raqam mili?");
    if (!amt) return;
    const sender = prompt("Kis ne bheji?");
    let o = owners.find(x => x.id === id);
    o.received += parseFloat(amt);
    o.history.push({ date: new Date().toLocaleDateString('en-GB'), amount: amt, from: sender || "N/A" });
    saveData();
}

function deleteOwner(id) {
    if (confirm("Delete karein?")) {
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

    if (!name || !amount) return alert("Item aur Amount likhein!");

    if (!dateVal) {
        const today = new Date();
        dateVal = today.toISOString().split('T')[0];
    }

    const d = new Date(dateVal);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
            <button class="btn-danger" onclick="deleteExpense(${e.id})">Del</button>
        </td>
    </tr>`;
    });
}

function deleteExpense(id) {
    if (confirm("Delete karein?")) {
        expenses = expenses.filter(x => x.id !== id);
        saveData();
    }
}
