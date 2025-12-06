const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getCurrentRestoId() {
    const userData = JSON.parse(localStorage.getItem('platoo_user'));
    const restoId = userData.id;
    
    if (!restoId) {
        alert('Sesi habis atau belum login. Silakan login kembali.');
        window.location.href = 'login-penjual.html';
        return null;
    }
    
    return restoId;
}

async function uploadImage(file, restoId) {
    try {
        const fileName = `${restoId}_${Date.now()}_${file.name}`;
        
        const { data, error } = await supabase.storage
            .from('resto-photos/katalog')
            .upload(fileName, file);
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
            .from('resto-photos/katalog')
            .getPublicUrl(fileName);
        
        return urlData.publicUrl;
        
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    
    try {
        var fotoUrl = null;
        const namaMakanan = document.getElementById('nama_makanan').value;
        const stok = parseInt(document.getElementById('stok').value);
        const harga = parseInt(document.getElementById('harga').value);
        const fotoFile = document.getElementById('foto').files[0];
        
        // Validasi
        if (!namaMakanan.trim() || isNaN(stok) || stok < 0 || isNaN(harga) || harga <= 0) {
            alert('Mohon lengkapi semua field yang wajib!');
            return;
        }
        
        // Get resto_id
        const restoId = await getCurrentRestoId();
        
        // Show loading state
        const submitBtn = document.querySelector('.btn-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Menyimpan...';
        submitBtn.disabled = true;
        
        // Upload foto
        if(fotoFile) {
            console.log('Uploading image...');
            fotoUrl = await uploadImage(fotoFile, restoId);
        }
        
        // Insert data ke tabel catalog
        console.log('Inserting to database...');
        const { data, error } = await supabase
            .from('catalog')
            .insert([
                {
                    resto_id: restoId,
                    nama_makanan: namaMakanan,
                    stok: stok,
                    harga: harga,
                    foto: fotoUrl || 'https://res.cloudinary.com/dk0z4ums3/image/upload/v1733967095/attached_image/7-makanan-korea-yang-menyehatkan-cocok-di-lidah-lokal.jpg'
                }
            ]);
        
        if (error) throw error;
        
        // Success!
        alert('Makanan berhasil ditambahkan!');
        
        // Redirect ke catalog
        window.location.href = 'catalog.html';
        
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Gagal menambahkan makanan. Silakan coba lagi.');
        
        // Reset button
        const submitBtn = document.querySelector('.btn-submit');
        submitBtn.textContent = 'Tambah';
        submitBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Food form page loaded');
    
    // Setup form submit handler
    const form = document.getElementById('foodForm');
    form.addEventListener('submit', handleSubmit);
});
