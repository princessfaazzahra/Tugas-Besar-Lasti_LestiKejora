const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentFilter = 'all';
let restaurantId = null;

// Check authentication
document.addEventListener('DOMContentLoaded', async function() {
    // Get logged in restaurant from localStorage or session
    const loggedInRestaurant = localStorage.getItem('loggedInRestaurant');

    if (!loggedInRestaurant) {
        // TEMPORARY: For testing without login
        console.warn('No restaurant logged in. Using demo mode.');
        restaurantId = 1; // Default restaurant ID for testing
        document.getElementById('restaurantName').textContent = 'Demo Restaurant';

        // Uncomment below for production (require login):
        // alert('Silakan login terlebih dahulu!');
        // window.location.href = 'login.html';
        // return;
    } else {
        const restaurant = JSON.parse(loggedInRestaurant);
        restaurantId = restaurant.id_restoran;

        // Display restaurant name
        document.getElementById('restaurantName').textContent = restaurant.nama_restoran;
    }

    // Load orders
    await loadOrders();

    // Setup filter buttons
    setupFilters();

    // Setup logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
});

// Setup filter buttons
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Update current filter
            currentFilter = this.dataset.status;

            // Reload orders with filter
            loadOrders();
        });
    });
}

// Load orders from database
async function loadOrders() {
    const container = document.getElementById('ordersContainer');
    const emptyState = document.getElementById('emptyState');

    container.innerHTML = '<div class="loading">Memuat pesanan...</div>';
    emptyState.style.display = 'none';

    try {
        // Build query
        let query = supabase
            .from('orders')
            .select(`
                *,
                catalog:catalog_id (
                    nama_makanan,
                    harga,
                    restoran_id
                ),
                pembeli:pembeli_id (
                    nama,
                    nomor_telepon
                )
            `)
            .eq('catalog.restoran_id', restaurantId)
            .order('created_at', { ascending: false });

        // Apply filter
        if (currentFilter !== 'all') {
            query = query.eq('status', currentFilter);
        }

        const { data: orders, error } = await query;

        if (error) throw error;

        // Display orders
        if (!orders || orders.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        displayOrders(orders);

    } catch (error) {
        console.error('Error loading orders:', error);
        container.innerHTML = '<div class="message error">Gagal memuat pesanan: ' + error.message + '</div>';
    }
}

// Display orders in the UI
function displayOrders(orders) {
    const container = document.getElementById('ordersContainer');

    if (orders.length === 0) {
        container.innerHTML = '';
        document.getElementById('emptyState').style.display = 'block';
        return;
    }

    container.innerHTML = orders.map(order => {
        const statusClass = order.status.toLowerCase().replace(/\s+/g, '-');
        const orderDate = new Date(order.created_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <h3>Order #${order.order_id}</h3>
                        <div class="order-meta">
                            <span>📅 ${orderDate}</span>
                            <span>👤 ${order.pembeli?.nama || 'Customer'}</span>
                            <span>📞 ${order.pembeli?.nomor_telepon || '-'}</span>
                        </div>
                    </div>
                    <div class="status-badge ${statusClass}">
                        ${order.status}
                    </div>
                </div>

                <div class="order-body">
                    <div class="order-item">
                        <div class="item-info">
                            <div class="item-name">${order.catalog?.nama_makanan || 'Item'}</div>
                            <div class="item-details">Jumlah: ${order.jumlah}x</div>
                        </div>
                        <div class="item-price">
                            Rp ${(order.total_harga || 0).toLocaleString('id-ID')}
                        </div>
                    </div>
                </div>

                <div class="order-total">
                    <span>Total:</span>
                    <span>Rp ${(order.total_harga || 0).toLocaleString('id-ID')}</span>
                </div>

                <div class="order-actions">
                    ${getStatusButtons(order)}
                </div>
            </div>
        `;
    }).join('');
}

// Get status update buttons based on current status
function getStatusButtons(order) {
    const currentStatus = order.status;

    if (currentStatus === 'Selesai') {
        return '<button class="btn-update-status btn-complete" disabled>✓ Pesanan Selesai</button>';
    }

    let buttons = '';

    if (currentStatus !== 'Sedang Diproses') {
        buttons += `<button class="btn-update-status btn-process" onclick="updateOrderStatus(${order.order_id}, 'Sedang Diproses')">
            🔄 Sedang Diproses
        </button>`;
    }

    if (currentStatus !== 'Siap Diambil') {
        buttons += `<button class="btn-update-status btn-ready" onclick="updateOrderStatus(${order.order_id}, 'Siap Diambil')">
            ✓ Siap Diambil
        </button>`;
    }

    if (currentStatus !== 'Selesai') {
        buttons += `<button class="btn-update-status btn-complete" onclick="updateOrderStatus(${order.order_id}, 'Selesai')">
            ✓✓ Selesai
        </button>`;
    }

    return buttons;
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    if (!confirm(`Ubah status pesanan menjadi "${newStatus}"?`)) {
        return;
    }

    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
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

// Logout
function logout() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        localStorage.removeItem('loggedInRestaurant');
        window.location.href = 'login.html';
    }
}

// Make updateOrderStatus available globally
window.updateOrderStatus = updateOrderStatus;
