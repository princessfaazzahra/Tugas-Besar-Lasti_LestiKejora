// GANTI dengan kredensial Supabase Anda
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentRole = 'pembeli';

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        currentRole = this.dataset.role;
        
        // Update UI
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Update hidden field
        document.getElementById('userRole').value = currentRole;
        
        // Update label text
        const usernameLabel = document.getElementById('usernameLabel');
        if (currentRole === 'penjual') {
            usernameLabel.textContent = 'Nama Restoran';
            document.getElementById('username').placeholder = 'Masukkan nama restoran';
        } else {
            usernameLabel.textContent = 'Username';
            document.getElementById('username').placeholder = 'Masukkan username Anda';
        }
    });
});

// Form submission
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Remove previous messages
    const oldMessages = document.querySelectorAll('.error-message, .success-message');
    oldMessages.forEach(msg => msg.remove());
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showMessage('Username dan password harus diisi!', 'error');
        return;
    }
    
    const submitBtn = this.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Login...';
    
    try {
        if (currentRole === 'pembeli') {
            await loginPembeli(username, password);
        } else {
            await loginPenjual(username, password);
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Terjadi kesalahan: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
});

async function loginPembeli(username, password) {
    const { data, error } = await supabase
        .from('pembeli')
        .select('*')
        .eq('username', username)
        .eq('password', password) // CATATAN: Di production, gunakan hashing!
        .single();
    
    if (error || !data) {
        showMessage('Username atau password salah!', 'error');
        return;
    }
    
    // Simpan data user ke localStorage
    localStorage.setItem('platoo_user', JSON.stringify({
        id: data.id,
        nama: data.nama,
        username: data.username,
        role: 'pembeli'
    }));
    
    showMessage('Login berhasil! Mengalihkan...', 'success');
    
    // Redirect ke dashboard pembeli
    setTimeout(() => {
        window.location.href = 'dashboard-pembeli.html';
    }, 1500);
}

async function loginPenjual(namaRestoran, password) {
    const { data, error } = await supabase
        .from('penjual')
        .select('*')
        .eq('nama_restoran', namaRestoran)
        .eq('password', password) // CATATAN: Di production, gunakan hashing!
        .single();
    
    if (error || !data) {
        showMessage('Nama restoran atau password salah!', 'error');
        return;
    }
    
    // Simpan data user ke localStorage
    localStorage.setItem('platoo_user', JSON.stringify({
        id: data.id,
        nama_restoran: data.nama_restoran,
        alamat: data.alamat,
        role: 'penjual'
    }));
    
    showMessage('Login berhasil! Mengalihkan...', 'success');
    
    // Redirect ke dashboard penjual
    setTimeout(() => {
        window.location.href = 'dashboard-penjual.html';
    }, 1500);
}

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;
    
    const form = document.getElementById('loginForm');
    form.insertBefore(messageDiv, form.firstChild);
}