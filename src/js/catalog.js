const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


async function getCurrentUser() {
    const userData = JSON.parse(localStorage.getItem('platoo_user'));
    console.log('userData parsed:', userData);
    const restoId = userData.id;
     
    if (!restoId) {
        alert('Sesi habis atau belum login. Silakan login kembali.');
        window.location.href = 'login.html';
        return null;
    }
    
    return restoId;
}


async function fetchCatalogData(restoId) {
    try {
        const { data, error } = await supabase
            .from('catalog')
            .select('*')
            .eq('resto_id', restoId);
        
        if (error) throw error;
        
        return data || [];
        
    } catch (error) {
        console.error('Error fetching catalog:', error);
        alert('Gagal memuat data katalog. Silakan refresh halaman.');
        return [];
    }
}


function renderCatalogTable(catalogItems) {
    const tbody = document.querySelector('.table tbody');

    tbody.innerHTML = '';
    
    if (catalogItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:40px; color:#999;">
                    Belum ada makanan di katalog. Klik "Tambah Makanan Baru" untuk mulai.
                </td>
            </tr>
        `;
        return;
    }

    catalogItems.forEach(item => {
        const row = createTableRow(item);
        tbody.appendChild(row);
    });
}


function createTableRow(item) {
    const tr = document.createElement('tr');
    
    const formattedPrice = item.harga.toLocaleString('id-ID');
    
    tr.innerHTML = `
        <td style="width:120px;">
            <img src="${item.foto}" alt="${item.nama_makanan}" 
                 style="width:100px;height:70px;object-fit:cover;border-radius:8px;"
                 onerror="this.src='../img/placeholder-food.png'">
        </td>
        <td>${item.nama_makanan}</td>
        <td>${item.stok}</td>
        <td>${formattedPrice}</td>
        <td class="actions">
            <div class="action-buttons">
                <a href="food-edit.html?id=${item.catalog_id}" class="btn-edit" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </a>
                <button class="btn-delete" title="Hapus" onclick="handleDelete(${item.catalog_id}, '${item.nama_makanan}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            </div>
        </td>
    `;
    
    return tr;
}


async function handleDelete(catalogId, namaItem) {
    const confirmed = confirm(`Yakin ingin menghapus "${namaItem}" dari katalog?`);
    if (!confirmed) return;
    try {
        const { error } = await supabase
            .from('catalog')
            .delete()
            .eq('catalog_id', catalogId);
        if (error) throw error;
        alert('Makanan berhasil dihapus!');
        await loadCatalog();
        
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Gagal menghapus makanan. Silakan coba lagi.');
    }
}

async function loadCatalog() {
    try {
        const restoId = await getCurrentUser();
        
        if (!restoId) {
            console.log('User not logged in');
            window.location.href = 'login.html';
            return;
        }
        
        const catalogItems = await fetchCatalogData(restoId);
        
        renderCatalogTable(catalogItems);
        
    } catch (error) {
        console.error('Error loading catalog:', error);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    console.log('Catalog page loaded');
    loadCatalog();
});
