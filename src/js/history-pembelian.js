const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// Check authentication
document.addEventListener('DOMContentLoaded', async function() {
    checkAuth();
    await loadOrderHistory();
});

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('platoo_user') || '{}');
    
    // Check if user exists and is pembeli
    if (!user || !user.username || user.role !== 'pembeli') {
        console.log('Auth check failed:', user);
        window.location.href = '../html/login.html';
        return;
    }
    
    console.log('Auth success:', user);
    currentUser = user;
}

async function loadOrderHistory() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const orderList = document.getElementById('orderList');
    
    try {
        console.log('Loading order history for user:', currentUser.id);
        loadingState.style.display = 'flex';
        emptyState.style.display = 'none';
        orderList.innerHTML = '';
        
        // Fetch orders from Supabase for current user
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id_pembeli', currentUser.id)
            .order('order_id', { ascending: false });
        
        console.log('Orders fetched:', { orders, error });
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        loadingState.style.display = 'none';
        
        if (!orders || orders.length === 0) {
            console.log('No orders found');
            emptyState.style.display = 'flex';
            return;
        }
        
        // Group orders by order_id
        const groupedOrders = groupOrdersByOrderId(orders);
        console.log('Grouped orders:', groupedOrders);
        
        // Display orders
        displayOrders(groupedOrders);
        
    } catch (error) {
        console.error('Error loading order history:', error);
        loadingState.style.display = 'none';
        emptyState.style.display = 'flex';
        showNotification('Gagal memuat riwayat pembelian: ' + error.message, 'error');
    }
}

function groupOrdersByOrderId(orders) {
    const grouped = {};
    
    orders.forEach(order => {
        const orderId = order.order_id;
        
        if (!grouped[orderId]) {
            grouped[orderId] = {
                order_id: orderId,
                id_pembeli: order.id_pembeli,
                id_penjual: order.id_penjual,
                status_pesanan: order.status_pesanan,
                metode_pembayaran: order.metode_pembayaran,
                items: [],
                total: 0
            };
        }
        
        grouped[orderId].items.push({
            catalog_id: order.catalog_id,
            nama_menu: order.nama_menu,
            quantity: order.quantity,
            harga: order.harga,
            subtotal: order.harga * order.quantity
        });
        
        grouped[orderId].total += order.harga * order.quantity;
    });
    
    // Apply voucher discount if exists
    Object.keys(grouped).forEach(orderId => {
        const order = grouped[orderId];
        const firstItem = orders.find(o => o.order_id === orderId);
        
        if (firstItem && firstItem.voucher_id) {
            order.voucher_potongan = firstItem.voucher_potongan || 0;
            order.total = order.total - order.voucher_potongan;
        }
    });
    
    return Object.values(grouped);
}

function displayOrders(orders) {
    const orderList = document.getElementById('orderList');
    orderList.innerHTML = '';
    
    orders.forEach(order => {
        const card = createOrderCard(order);
        orderList.appendChild(card);
    });
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.onclick = () => viewOrderDetail(order.order_id);
    
    const statusClass = getStatusClass(order.status_pesanan);
    const statusText = getStatusText(order.status_pesanan);
    
    // Create items HTML
    const itemsHTML = order.items.map(item => `
        <div class="order-item">
            <div class="item-info">
                <div class="item-name">${item.nama_menu}</div>
                <div class="item-details">${item.quantity}x @ Rp ${formatPrice(item.harga)}</div>
            </div>
            <div class="item-price">Rp ${formatPrice(item.subtotal)}</div>
        </div>
    `).join('');
    
    card.innerHTML = `
        <div class="order-header">
            <div class="order-info">
                <h3>Order #${order.order_id}</h3>
                <div class="order-date">
                    ${order.items.length} item${order.items.length > 1 ? 's' : ''}
                </div>
            </div>
            <div class="order-status ${statusClass}">
                ${statusText}
            </div>
        </div>
        <div class="order-items">
            ${itemsHTML}
        </div>
        <div class="order-footer">
            <div class="order-total">
                <span class="total-label">Total Pembayaran</span>
                <span class="total-amount">Rp ${formatPrice(order.total)}</span>
            </div>
            <button class="btn-detail" onclick="event.stopPropagation(); viewOrderDetail(${order.order_id})">
                Lihat Detail →
            </button>
        </div>
    `;
    
    return card;
}

function getStatusClass(status) {
    const statusMap = {
        'Pesanan Diterima': 'status-pending',
        'Sedang Diproses': 'status-processing',
        'Siap Diambil': 'status-ready',
        'Selesai': 'status-completed',
        'Dibatalkan': 'status-cancelled'
    };
    return statusMap[status] || 'status-pending';
}

function getStatusText(status) {
    return status || 'Pesanan Diterima';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('id-ID', options);
}

function formatPrice(price) {
    return new Intl.NumberFormat('id-ID').format(price);
}

function viewOrderDetail(orderId) {
    window.location.href = `../html/order-status.html?orderId=${orderId}`;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'error' ? '#fee' : '#efe'};
        color: ${type === 'error' ? '#c33' : '#3c3'};
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        z-index: 10000;
        font-weight: 600;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

console.log('History Pembelian loaded successfully!');
