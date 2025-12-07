// Get payment info from localStorage or URL
let paymentData = {
    method: 'virtual_account',
    amount: 0,
    orderId: null,
    orderIds: []
};

let countdownTimer = null;
let timeRemaining = 900; // 15 minutes in seconds

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get payment data from localStorage
    const storedData = localStorage.getItem('platoo_payment_pending');
    if (storedData) {
        paymentData = JSON.parse(storedData);
    }

    if (!paymentData.orderId || paymentData.amount === 0) {
        alert('Data pembayaran tidak ditemukan');
        window.location.href = 'catalog.html';
        return;
    }

    // Setup payment UI based on method
    setupPaymentUI();
    
    // Start countdown timer
    startCountdown();
});

function setupPaymentUI() {
    const method = paymentData.method;
    const amount = paymentData.amount;

    // Update total amount
    document.getElementById('totalAmount').textContent = formatCurrency(amount);

    if (method === 'virtual_account') {
        setupVirtualAccount();
    } else if (method === 'ewallet') {
        setupEWallet();
    }
}

function setupVirtualAccount() {
    document.getElementById('paymentTitle').textContent = 'Pembayaran Virtual Account';
    document.getElementById('vaNumberCard').style.display = 'block';
    document.getElementById('qrCard').style.display = 'none';

    // Generate random VA number (in production, this would come from payment gateway)
    const vaNumber = '8808' + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    document.getElementById('vaNumber').textContent = vaNumber.match(/.{1,4}/g).join(' ');

    // Update payment steps for VA
    const stepsList = document.getElementById('paymentStepsList');
    stepsList.innerHTML = `
        <li>Buka aplikasi mobile banking Anda</li>
        <li>Pilih menu Transfer atau Bayar</li>
        <li>Masukkan nomor virtual account di atas</li>
        <li>Pastikan nominal transfer sesuai</li>
        <li>Konfirmasi dan selesaikan pembayaran</li>
        <li>Klik tombol "Saya Sudah Bayar" setelah selesai</li>
    `;
}

function setupEWallet() {
    document.getElementById('paymentTitle').textContent = 'Pembayaran E-Wallet';
    document.getElementById('vaNumberCard').style.display = 'none';
    document.getElementById('qrCard').style.display = 'block';

    // Update payment steps for E-Wallet
    const stepsList = document.getElementById('paymentStepsList');
    stepsList.innerHTML = `
        <li>Buka aplikasi e-wallet Anda (GoPay, OVO, atau DANA)</li>
        <li>Pilih menu Scan atau Bayar</li>
        <li>Scan QR Code yang ditampilkan</li>
        <li>Periksa detail pembayaran</li>
        <li>Konfirmasi dan selesaikan pembayaran</li>
        <li>Klik tombol "Saya Sudah Bayar" setelah selesai</li>
    `;
}

function copyVANumber() {
    const vaNumber = document.getElementById('vaNumber').textContent.replace(/\s/g, '');
    navigator.clipboard.writeText(vaNumber).then(() => {
        const btn = document.querySelector('.btn-copy');
        const originalText = btn.innerHTML;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            Tersalin!
        `;
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    });
}

function startCountdown() {
    updateCountdownDisplay();
    
    countdownTimer = setInterval(() => {
        timeRemaining--;
        updateCountdownDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(countdownTimer);
            alert('Waktu pembayaran habis. Silakan buat pesanan baru.');
            localStorage.removeItem('platoo_payment_pending');
            window.location.href = 'catalog.html';
        }
    }, 1000);
}

function updateCountdownDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    document.getElementById('countdown').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function confirmPayment() {
    const btn = document.getElementById('confirmPaymentBtn');
    
    // Simulate payment verification (in production, verify with payment gateway)
    btn.disabled = true;
    btn.textContent = 'Memverifikasi Pembayaran...';
    btn.classList.add('loading');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Stop countdown
    clearInterval(countdownTimer);

    // Show success state
    showSuccessState();

    // Redirect to order status after 3 seconds
    setTimeout(() => {
        localStorage.removeItem('platoo_payment_pending');
        // Pass payment method via URL
        window.location.href = `order-status.html?order=${paymentData.orderId}&payment=${paymentData.method}`;
    }, 3000);
}

function showSuccessState() {
    // Hide payment instructions
    document.getElementById('paymentInstructions').style.display = 'none';
    
    // Show success card
    const successCard = document.getElementById('successCard');
    successCard.style.display = 'block';

    // Fill in success details
    document.getElementById('successOrderNumber').textContent = paymentData.orderId;
    document.getElementById('successPaymentMethod').textContent = 
        paymentData.method === 'virtual_account' ? 'Virtual Account' : 'E-Wallet';
    document.getElementById('successAmount').textContent = formatCurrency(paymentData.amount);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Make functions globally available
window.copyVANumber = copyVANumber;
window.confirmPayment = confirmPayment;
