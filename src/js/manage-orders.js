const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let restaurantId = null;

// Check authentication
document.addEventListener('DOMContentLoaded', async function() {
    // Get logged in restaurant from localStorage or session
    const loggedInRestaurant = localStorage.getItem('loggedInRestaurant');

    if (!loggedInRestaurant) {
        // Redirect to login if not logged in
        alert('Silakan login terlebih dahulu!');
        window.location.href = 'login.html';
        return;
    } else {
        const restaurant = JSON.parse(loggedInRestaurant);
        restaurantId = restaurant.id_restoran;
    }

    // Load ongoing orders
    await loadOrders();
});

// Load orders from database
async function loadOrders() {
    const container = document.getElementById('ordersContainer');
    const emptyState = document.getElementById('emptyState');

    container.innerHTML = '<div class="loading">Memuat pesanan...</div>';
    emptyState.style.display = 'none';

    try {
        // Load only ongoing orders for this restaurant (exclude "Selesai")
        // First, get all catalog items for this restaurant
        const { data: catalogs, error: catalogError } = await supabase
            .from('catalog')
            .select('catalog_id')
            .eq('resto_id', restaurantId);

        if (catalogError) throw catalogError;

        // If restaurant has no catalog items, show empty state
        if (!catalogs || catalogs.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        // Get catalog IDs for this restaurant
        const catalogIds = catalogs.map(c => c.catalog_id);

        // Load orders for this restaurant's catalog items
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                catalog:catalog_id (
                    nama_makanan,
                    harga,
                    resto_id,
                    foto
                )
            `)
            .in('catalog_id', catalogIds)
            .neq('status_pesanan', 'Selesai')
            .order('order_id', { ascending: false });

        if (error) throw error;

        // Display orders
        if (!orders || orders.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        DaftarPesananOnGoing(orders);

    } catch (error) {
        console.error('Error loading orders:', error);
        container.innerHTML = '<div class="message error">Gagal memuat pesanan: ' + error.message + '</div>';
    }
}

// Display orders in the UI
function DaftarPesananOnGoing(orders) {
    const container = document.getElementById('ordersContainer');

    if (orders.length === 0) {
        container.innerHTML = '';
        document.getElementById('emptyState').style.display = 'block';
        return;
    }

    container.innerHTML = orders.map(order => {
        const statusClass = order.status_pesanan.toLowerCase().replace(/\s+/g, '-');

        return `
            <div class="order-card">
                <div class="order-content-wrapper">
                    <div class="order-image">
                        <img src="${order.catalog?.foto || 'https://via.placeholder.com/150'}"
                             alt="${order.catalog?.nama_makanan || 'Food'}"
                             onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
                    </div>

                    <div class="order-details">
                        <div class="order-header">
                            <div class="order-info">
                                <h3>Order #${order.order_id}</h3>
                                <div class="order-meta">
                                    <span>👤 Customer #${order.id_pembeli || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="order-body">
                            <div class="item-name">${order.catalog?.nama_makanan || 'Item'}</div>
                            <div class="item-details">Jumlah: ${order.jumlah}x @ Rp ${(order.catalog?.harga || 0).toLocaleString('id-ID')}</div>
                            <div class="item-total">
                                <strong>Total: Rp ${(order.total_harga || 0).toLocaleString('id-ID')}</strong>
                            </div>
                        </div>

                        <div class="order-status-section">
                            <label>Status Pesanan:</label>
                            <select class="status-select ${statusClass}"
                                    onchange="MengupdateStatusPemesanan(${order.order_id}, this.value)">
                                <option value="Sedang Diproses" ${order.status_pesanan === 'Sedang Diproses' ? 'selected' : ''}>
                                    Sedang Diproses
                                </option>
                                <option value="Siap Diambil" ${order.status_pesanan === 'Siap Diambil' ? 'selected' : ''}>
                                    Siap Diambil
                                </option>
                                <option value="Selesai" ${order.status_pesanan === 'Selesai' ? 'selected' : ''}>
                                    Selesai
                                </option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Update order status
async function MengupdateStatusPemesanan(orderId, newStatus) {
    if (!confirm(`Ubah status pesanan menjadi "${newStatus}"?`)) {
        return;
    }

    try {
        const { error} = await supabase
            .from('orders')
            .update({ status_pesanan: newStatus })
            .eq('order_id', orderId);

        if (error) throw error;

        showMessage(`Status pesanan berhasil diubah menjadi "${newStatus}"`, 'success');

        // Reload orders
        await loadOrders();

    } catch (error) {
        console.error('Error updating status:', error);
        showMessage('Gagal mengubah status pesanan: ' + error.message, 'error');
    }
}

// Show message
function showMessage(message, type) {
    const container = document.getElementById('ordersContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;

    container.insertBefore(messageDiv, container.firstChild);

    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Make MengupdateStatusPemesanan available globally
window.MengupdateStatusPemesanan = MengupdateStatusPemesanan;
