const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


function getCatalogIdFromUrl(){
    const urlParams = new URLSearchParams(window.location.search);
    const catalogId = urlParams.get('id');
    
    if (!catalogId) {
        alert('ID makanan tidak ditemukan!');
        window.location.href = 'catalog.html';
        return null;
    }
    
    return catalogId;
}


async function fetchFoodData(catalogId) {
    try {
        const { data, error } = await supabase
            .from('catalog')
            .select('*')
            .eq('catalog_id', catalogId)
            .single();
        
        if (error) throw error;
        return data;
        
    } catch (error) {
        console.error('Error fetching food data:', error);
        alert('Gagal memuat data makanan.');
        return null;
    }
}


function populateForm(foodData) {
    // Fill semua form fields
    document.getElementById('catalog_id').value = foodData.catalog_id;
    document.getElementById('resto_id').value = foodData.resto_id;
    document.getElementById('nama_makanan').value = foodData.nama_makanan;
    document.getElementById('deskripsi').value = foodData.deskripsi || '';
    document.getElementById('stok').value = foodData.stok;
    document.getElementById('harga').value = foodData.harga;
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
        // Get form values
        const catalogId = document.getElementById('catalog_id').value;
        const restoId = document.getElementById('resto_id').value;
        const namaMakanan = document.getElementById('nama_makanan').value;
        const stok = parseInt(document.getElementById('stok').value);
        const harga = parseInt(document.getElementById('harga').value);
        const fotoFile = document.getElementById('foto').files[0];
        
        // Validasi - allow stok 0
        if (!namaMakanan.trim() || isNaN(stok) || stok < 0 || isNaN(harga) || harga <= 0) {
            alert('Mohon lengkapi semua field yang wajib dengan benar!');
            return;
        }
        
        const submitBtn = document.querySelector('.btn-submit');
        submitBtn.textContent = 'Menyimpan...';
        submitBtn.disabled = true;
        
        const updateData = {
            nama_makanan: namaMakanan,
            stok: parseInt(stok),
            harga: parseInt(harga)
        };
        
        // Debug: cek data yang mau diupdate
        console.log('catalogId:', catalogId);
        console.log('updateData:', updateData);
        
        if (fotoFile) {
            console.log('Uploading new image...');
            const newFotoUrl = await uploadImage(fotoFile, restoId);
            updateData.foto = newFotoUrl;
        }
        
        console.log('Updating database...');
        const { data, error } = await supabase
            .from('catalog')
            .update(updateData)
            .eq('catalog_id', parseInt(catalogId));
        
        console.log('Update result - data:', data, 'error:', error);
        
        if (error) throw error;
        
        alert('Makanan berhasil diupdate!');

        window.location.href = 'catalog.html';
        
    } catch (error) {
        console.error('Error updating food:', error);
        alert('Gagal mengupdate makanan. Silakan coba lagi.');
        
        const submitBtn = document.querySelector('.btn-submit');
        submitBtn.textContent = 'Update';
        submitBtn.disabled = false;
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    console.log('Food edit page loaded');
    
    // Get catalog ID from URL
    const catalogId = getCatalogIdFromUrl();
    if (!catalogId) return;
    
    // Fetch existing data
    const foodData = await fetchFoodData(catalogId);
    if (!foodData) {
        alert('Data makanan tidak ditemukan!');
        window.location.href = 'catalog.html';
        return;
    }
    
    // Populate form with existing data
    populateForm(foodData);
    
    // Setup form submit handler
    const form = document.getElementById('foodEditForm');
    form.addEventListener('submit', handleSubmit);
});
