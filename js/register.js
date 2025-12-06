const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

console.log('Register.js loaded!');
console.log('Supabase client:', window.supabase);

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('Supabase initialized:', supabase);

let selectedRole = null;

// Role selection
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing event listeners...');
    
    // Only for register.html with role selection
    const roleButtons = document.querySelectorAll('.role-btn');
    if (roleButtons.length > 0) {
        roleButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                selectedRole = this.dataset.role;
                console.log('Role selected:', selectedRole);
                
                // Update UI
                document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Show form
                setTimeout(() => {
                    document.getElementById('roleSelection').style.display = 'none';
                    document.getElementById('registerForm').style.display = 'block';
                    document.getElementById('userRole').value = selectedRole;
                    
                    // Show appropriate form section
                    if (selectedRole === 'pembeli') {
                        document.getElementById('pembeliForm').style.display = 'block';
                        document.getElementById('penjualForm').style.display = 'none';
                    } else {
                        document.getElementById('pembeliForm').style.display = 'none';
                        document.getElementById('penjualForm').style.display = 'block';
                    }
                }, 300);
            });
        });
    }

    // Back button (only in register.html)
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            console.log('Back button clicked');
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('roleSelection').style.display = 'block';
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            selectedRole = null;
        });
    }

    // Form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get role from hidden field or selected role
            const role = document.getElementById('userRole')?.value || selectedRole;
            console.log('Form submitted! Role:', role);
            
            // Remove previous messages
            const oldMessages = document.querySelectorAll('.error-message, .success-message');
            oldMessages.forEach(msg => msg.remove());
            
            const submitBtn = this.querySelector('.btn-submit');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Mendaftar...';
            
            try {
                if (role === 'pembeli') {
                    console.log('Calling registerPembeli...');
                    await registerPembeli();
                } else {
                    console.log('Calling registerPenjual...');
                    await registerPenjual();
                }
            } catch (error) {
                console.error('Error:', error);
                showMessage('Terjadi kesalahan: ' + error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Daftar';
            }
        });
    }
    
    console.log('All event listeners initialized!');
});

async function registerPembeli() {
    const nama = document.getElementById('nama').value.trim();
    const telepon = document.getElementById('telepon').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    console.log('RegisterPembeli called with:', { nama, telepon, username });
    
    // Validasi
    if (!nama || !telepon || !username || !password) {
        showMessage('Semua field harus diisi!', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Password dan konfirmasi password tidak cocok!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password minimal 6 karakter!', 'error');
        return;
    }
    
    if (!validatePhone(telepon)) {
        showMessage('Format nomor telepon tidak valid!', 'error');
        return;
    }
    
    // Cek apakah username sudah ada
    const { data: existingUser } = await supabase
        .from('pembeli')
        .select('username')
        .eq('username', username)
        .single();
    
    if (existingUser) {
        showMessage('Username sudah digunakan!', 'error');
        return;
    }
    
    // Insert data pembeli
    const { data, error } = await supabase
        .from('pembeli')
        .insert([
            {
                nama: nama,
                nomor_telepon: telepon,
                username: username,
                password: password // CATATAN: Di production, gunakan hashing!
            }
        ])
        .select();
    
    if (error) {
        throw error;
    }
    
    showMessage('Registrasi berhasil! Silakan login.', 'success');
    
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}

async function registerPenjual() {
    const namaRestoran = document.getElementById('namaRestoran').value.trim();
    const telepon = document.getElementById('telepon').value.trim();
    const alamat = document.getElementById('alamat').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validasi
    if (!namaRestoran || !telepon || !alamat || !password) {
        showMessage('Semua field harus diisi!', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Password dan konfirmasi password tidak cocok!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password minimal 6 karakter!', 'error');
        return;
    }
    
    if (!validatePhone(telepon)) {
        showMessage('Format nomor telepon tidak valid!', 'error');
        return;
    }
    
    // Cek apakah nama restoran (username) sudah ada
    const { data: existingRestoran } = await supabase
        .from('restoran')
        .select('nama_restoran')
        .eq('nama_restoran', namaRestoran)
        .single();
    
    if (existingRestoran) {
        showMessage('Nama restoran sudah digunakan!', 'error');
        return;
    }
    
    // Insert data penjual
    const { data, error } = await supabase
        .from('restoran')
        .insert([
            {
                nama_restoran: namaRestoran,
                nomor_telepon: telepon,
                alamat: alamat,
                password: password // CATATAN: Di production, gunakan hashing!
            }
        ])
        .select();
    
    if (error) {
        throw error;
    }
    
    showMessage('Registrasi berhasil! Silakan login.', 'success');
    
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}

function validatePhone(phone) {
    // Format Indonesia: 08xxxxxxxxxx (minimal 10 digit)
    const phoneRegex = /^08\d{8,12}$/;
    return phoneRegex.test(phone);
}

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;
    
    const form = document.getElementById('registerForm');
    form.insertBefore(messageDiv, form.firstChild);
}