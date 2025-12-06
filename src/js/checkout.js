// Supabase Configuration
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Constants
const SERVICE_FEE = 5000; // Rp 5,000
const TAX_RATE = 0.1; // 10% PPN
const PLATOO_DISCOUNT_RATE = 0.15; // 15% Platoo discount

// State Management
let orderData = {
    items: [],
    restaurantId: null,
    restaurantInfo: {},
    selectedVoucherId: null,
    selectedVoucher: null,
    voucherDiscount: 0,
    selectedPaymentMethod: 'cash',
    customerPhone: '',
    totalPrice: 0,
    subtotal: 0,
    restaurantDiscount: 0,
    taxAmount: 0
};

let currentUser = null;
let availableVouchers = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeCheckout();
    } catch (error) {
        console.error('Initialization error:', error);
        showErrorModal('Gagal memuat halaman checkout');
    }
});

async function initializeCheckout() {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // Development / testing fallbacks:
        // 1) If localStorage contains 'platoo_test_user' (JSON string), use it as currentUser.
        // 2) If running on localhost and localStorage 'platoo_enable_dev' === '1', create a safe dummy user.
        const testUserJson = localStorage.getItem('platoo_test_user');
        const devMode = localStorage.getItem('platoo_enable_dev') === '1';

        if (testUserJson) {
            try {
                currentUser = JSON.parse(testUserJson);
                console.info('Using test user from localStorage for checkout:', currentUser);
            } catch (err) {
                console.error('Invalid JSON in platoo_test_user:', err);
                window.location.href = 'login.html';
                return;
            }
        } else if (devMode && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
            currentUser = { id: 'dev-user-1', email: 'dev@local.test', full_name: 'Dev Tester' };
            console.info('Using dev fallback user for localhost testing:', currentUser);
        } else {
            // No authenticated user - redirect to login (production behavior)
            window.location.href = 'login.html';
            return;
        }
    } else {
        currentUser = user;
    }

    // Get cart from localStorage
    const cartData = localStorage.getItem('platoo_cart');
    if (!cartData) {
        showEmptyCart();
        return;
    }

    const cart = JSON.parse(cartData);
    orderData.items = cart.items || [];
    orderData.restaurantId = cart.restaurantId;

    if (orderData.items.length === 0) {
        showEmptyCart();
        return;
    }

    // Fetch restaurant info
    await fetchRestaurantInfo();

    // Load customer info
    await loadCustomerInfo(currentUser.id);

    // Load available vouchers
    await loadAvailableVouchers();

    // Populate UI
    renderOrderItems();
    calculateTotals();
    updatePriceBreakdown();
    renderPickupInfo();

    // Show checkout actions
    document.getElementById('checkoutActions').style.display = 'flex';
    document.getElementById('priceBreakdown').style.display = 'block';
    document.getElementById('orderSummaryCard').style.display = 'block';
    document.getElementById('emptyCart').style.display = 'none';

    // Setup event listeners
    setupEventListeners();
}

async function fetchRestaurantInfo() {
    try {
        const { data, error } = await supabase
            .from('restaurants')
            .select('id, name, address, phone, email')
            .eq('id', orderData.restaurantId)
            .single();

        if (error) throw error;
        orderData.restaurantInfo = data;
    } catch (error) {
        console.error('Error fetching restaurant info:', error);
    }
}

async function loadCustomerInfo(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', userId)
            .single();

        if (error) throw error;

        if (data) {
            const nameEl = document.getElementById('customerName');
            const emailEl = document.getElementById('customerEmail');
            if (nameEl) nameEl.value = data.full_name || '';
            if (emailEl) emailEl.value = data.email || '';
        }
    } catch (error) {
        console.error('Error loading customer info:', error);
    }
}

async function loadAvailableVouchers() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('vouchers')
            .select('*')
            .eq('is_active', true)
            .lte('start_date', today)
            .gte('end_date', today)
            .order('discount_percentage', { ascending: false });

        if (error) throw error;
        
        availableVouchers = data || [];
        // If running on localhost and no vouchers returned, inject a test voucher for local testing
        const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        if (isLocal && (!availableVouchers || availableVouchers.length === 0)) {
            const sample = {
                id: 'dev-voucher-1',
                code: 'DEV5K',
                description: 'Voucher uji: potongan Rp5.000',
                amount: 5000,
                start_date: today,
                end_date: today,
                is_active: true
            };
            availableVouchers = [sample];
        }
        renderVoucherList();
    } catch (error) {
        console.error('Error loading vouchers:', error);
        availableVouchers = [];
        // If in local dev, show a sample voucher so selection can be tested
        const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        if (isLocal) {
            const today = new Date().toISOString().split('T')[0];
            availableVouchers = [{ id: 'dev-voucher-1', code: 'DEV5K', description: 'Voucher uji: potongan Rp5.000', amount: 5000, start_date: today, end_date: today, is_active: true }];
        }
        renderVoucherList();
    }
}

function renderVoucherList() {
    const container = document.getElementById('voucherList');
    container.innerHTML = '';

    if (availableVouchers.length === 0) {
        container.innerHTML = `
            <div class="empty-vouchers">
                <span class="empty-vouchers-icon">🎫</span>
                <p>Tidak ada voucher yang tersedia saat ini</p>
            </div>
        `;
        return;
    }

    availableVouchers.forEach((voucher) => {
        const voucherElement = createVoucherElement(voucher);
        container.appendChild(voucherElement);
    });
}

function createVoucherElement(voucher) {
    const div = document.createElement('div');
    div.className = 'voucher-item';
    
    const endDate = new Date(voucher.end_date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const isSelected = orderData.selectedVoucherId == voucher.id;

    div.innerHTML = `
        <input 
            type="radio" 
            name="voucher" 
            class="voucher-radio"
            data-voucher-id="${voucher.id}"
            ${isSelected ? 'checked' : ''}
        >
        <div class="voucher-checkbox"></div>
        <div class="voucher-content">
            <div class="voucher-code">${voucher.code}</div>
            <div class="voucher-description">${voucher.description || 'Dapatkan diskon spesial'}</div>
            <div class="voucher-discount">${voucher.amount ? 'Potongan ' + formatCurrency(voucher.amount) : 'Hemat ' + (voucher.discount_percentage ? voucher.discount_percentage + '%' : '')}</div>
            <div class="voucher-validity">Berlaku hingga ${endDate}</div>
        </div>
    `;
    // Reflect selected state visually
    if (isSelected) div.classList.add('selected');
    // Toggle selection: clicking the voucher card selects it; clicking again deselects it.
    div.addEventListener('click', (e) => {
        const input = div.querySelector('input[name="voucher"]');
        const currentlySelected = orderData.selectedVoucherId == voucher.id;

        if (currentlySelected) {
            // Deselect
            if (input) input.checked = false;
            // Remove visual selection from all voucher cards
            document.querySelectorAll('.voucher-item').forEach(el => el.classList.remove('selected'));
            selectVoucher(null);
        } else {
            // Select this voucher and uncheck others
            document.querySelectorAll('input[name="voucher"]').forEach(r => r.checked = false);
            if (input) input.checked = true;
            // Visual: mark this card selected and remove from others
            document.querySelectorAll('.voucher-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            selectVoucher(voucher);
        }
    });

    // Also handle clicks directly on the radio input so it behaves like a toggle
    const inputEl = div.querySelector('input[name="voucher"]');
    if (inputEl) {
        inputEl.addEventListener('click', (e) => {
            // Prevent the browser's native radio behavior so we can toggle
            e.stopPropagation();

            const currentlySelected = orderData.selectedVoucherId == voucher.id;
            if (currentlySelected) {
                inputEl.checked = false;
                document.querySelectorAll('.voucher-item').forEach(el => el.classList.remove('selected'));
                selectVoucher(null);
            } else {
                // Uncheck others and select this one
                document.querySelectorAll('input[name="voucher"]').forEach(r => r.checked = false);
                inputEl.checked = true;
                document.querySelectorAll('.voucher-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                selectVoucher(voucher);
            }
        });
    }

    return div;
}

function renderOrderItems() {
    const container = document.getElementById('itemsContainer');
    container.innerHTML = '';

    orderData.items.forEach((item, index) => {
        const itemElement = createOrderItemElement(item, index);
        container.appendChild(itemElement);
    });
}

function createOrderItemElement(item, index) {
    const div = document.createElement('div');
    div.className = 'order-item';
    
    // Prefer explicit item.price (catalog displayed price). If not provided, apply Platoo discount
    // to original_price (if available) as fallback.
    const unitPrice = (typeof item.price !== 'undefined' && item.price !== null)
        ? Number(item.price)
        : (item.original_price ? Number(item.original_price) - Math.round(Number(item.original_price) * PLATOO_DISCOUNT_RATE) : 0);
    const itemPrice = unitPrice;
    const itemTotal = itemPrice * item.quantity;

    div.innerHTML = `
        <img 
            src="${item.image_url || 'https://via.placeholder.com/80'}" 
            alt="${item.name}"
            class="item-image"
        >
        <div class="item-details">
            <div class="item-header">
                <div>
                    <div class="item-restaurant">${orderData.restaurantInfo.name || 'Restoran'}</div>
                    <div class="item-name">${item.name}</div>
                </div>
                <div class="item-price">${formatCurrency(itemTotal)}</div>
            </div>
            <div class="item-footer">
                <div class="item-quantity">
                    ${item.quantity}x ${formatCurrency(itemPrice)}
                </div>
                <button class="remove-item" data-index="${index}" onclick="removeItem(${index})">
                    Hapus
                </button>
            </div>
        </div>
    `;

    return div;
}

function removeItem(index) {
    orderData.items.splice(index, 1);
    
    if (orderData.items.length === 0) {
        localStorage.removeItem('platoo_cart');
        showEmptyCart();
    } else {
        localStorage.setItem('platoo_cart', JSON.stringify({
            items: orderData.items,
            restaurantId: orderData.restaurantId
        }));
        renderOrderItems();
        calculateTotals();
        updatePriceBreakdown();
    }
}

function calculateTotals() {
    // Calculate subtotal using explicit item.price (catalog displayed price) if present,
    // otherwise fall back to item.original_price.
    orderData.subtotal = orderData.items.reduce((total, item) => {
        const unit = (typeof item.price !== 'undefined' && item.price !== null) ? item.price : item.original_price;
        return total + (unit * item.quantity);
    }, 0);

    // Note: Diskon Platoo is now driven by voucher selection and stored in orderData.restaurantDiscount.
    // If no voucher selected, restaurantDiscount should be 0 (or set elsewhere).
    orderData.restaurantDiscount = orderData.restaurantDiscount || 0;

    // Subtotal after discount
    const subtotalAfterDiscount = orderData.subtotal - orderData.restaurantDiscount - orderData.voucherDiscount;

    // Calculate tax
    orderData.taxAmount = Math.round(subtotalAfterDiscount * TAX_RATE);

    // Calculate total
    orderData.totalPrice = subtotalAfterDiscount + SERVICE_FEE + orderData.taxAmount;
}

function updatePriceBreakdown() {
    document.getElementById('subtotal').textContent = formatCurrency(orderData.subtotal);
    document.getElementById('restaurantDiscount').textContent = `-${formatCurrency(orderData.restaurantDiscount)}`;
    document.getElementById('serviceFee').textContent = formatCurrency(SERVICE_FEE);
    document.getElementById('taxAmount').textContent = formatCurrency(orderData.taxAmount);
    document.getElementById('totalPrice').textContent = formatCurrency(orderData.totalPrice);

    // Show/hide voucher discount row
    const voucherRow = document.getElementById('voucherDiscountRow');
    if (orderData.voucherDiscount > 0) {
        voucherRow.style.display = 'flex';
        document.getElementById('voucherDiscountAmount').textContent = `-${formatCurrency(orderData.voucherDiscount)}`;
    } else {
        voucherRow.style.display = 'none';
    }

    // Update sidebar
    const totalItems = orderData.items.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartItemCount').innerHTML = `
        <span>Total Item:</span>
        <strong>${totalItems}</strong>
    `;
    document.getElementById('sidebarSubtotal').textContent = formatCurrency(orderData.subtotal);
    document.getElementById('sidebarTotal').textContent = formatCurrency(orderData.totalPrice);
}

function renderPickupInfo() {
    const container = document.getElementById('pickupDetails');
    
    container.innerHTML = `
        <div class="pickup-detail-item">
            <div class="pickup-icon">🏪</div>
            <div class="pickup-content">
                <div class="pickup-label">Nama Restoran</div>
                <div class="pickup-value">${orderData.restaurantInfo.name || '-'}</div>
            </div>
        </div>
        <div class="pickup-detail-item">
            <div class="pickup-icon">📍</div>
            <div class="pickup-content">
                <div class="pickup-label">Alamat Pengambilan</div>
                <div class="pickup-value">${orderData.restaurantInfo.address || '-'}</div>
            </div>
        </div>
        <div class="pickup-detail-item">
            <div class="pickup-icon">📞</div>
            <div class="pickup-content">
                <div class="pickup-label">Nomor Telepon</div>
                <div class="pickup-value">${orderData.restaurantInfo.phone || '-'}</div>
            </div>
        </div>
        <div class="pickup-detail-item">
            <div class="pickup-icon">⏱️</div>
            <div class="pickup-content">
                <div class="pickup-label">Waktu Pengambilan</div>
                <div class="pickup-value">Sesuai jam operasional restoran</div>
            </div>
        </div>
    `;
}

function setupEventListeners() {
    // Voucher selection
    document.querySelectorAll('input[name="voucher"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                const voucherId = e.target.dataset.voucherId;
                const selectedVoucher = availableVouchers.find(v => v.id == voucherId);
                selectVoucher(selectedVoucher);
            }
        });
    });

    // Payment method
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            orderData.selectedPaymentMethod = e.target.value;
        });
    });

    // Customer phone (only if field exists)
    const phoneEl = document.getElementById('customerPhone');
    if (phoneEl) {
        phoneEl.addEventListener('change', (e) => {
            orderData.customerPhone = e.target.value;
        });
    }

    // Continue shopping
    document.getElementById('continueShopping').addEventListener('click', () => {
        // If we know the restaurantId, go back to its catalog. Otherwise, try history.back(),
        // and if that does nothing (no previous entry), redirect to catalog root.
        try {
            if (orderData && orderData.restaurantId) {
                // Use same param name as catalog.js: id
                window.location.href = `catalog.html?id=${orderData.restaurantId}`;
                return;
            }
        } catch (err) {
            console.warn('Error reading orderData.restaurantId:', err);
        }

        // Fallback: try history.back(), then redirect to catalog.html after short delay
        const before = window.location.href;
        window.history.back();
        setTimeout(() => {
            if (window.location.href === before) {
                window.location.href = 'catalog.html';
            }
        }, 300);
    });

    // Confirm checkout
    document.getElementById('confirmCheckoutBtn').addEventListener('click', confirmCheckout);
}

function selectVoucher(voucher) {
    if (!voucher) {
        // Deselect voucher
        orderData.selectedVoucherId = null;
        orderData.selectedVoucher = null;
        orderData.voucherDiscount = 0;
        // also clear any Platoo discount mapping
        orderData.restaurantDiscount = 0;
        document.getElementById('voucherStatus').innerHTML = '';
    } else {
        // Select voucher
        orderData.selectedVoucherId = voucher.id;
        orderData.selectedVoucher = voucher;
        
        // Calculate discount: prefer fixed amount (voucher.amount), otherwise percentage
        let discountAmount = 0;
        if (typeof voucher.amount !== 'undefined' && voucher.amount !== null) {
            discountAmount = Number(voucher.amount);
        } else if (typeof voucher.discount_percentage !== 'undefined' && voucher.discount_percentage !== null) {
            discountAmount = Math.round(orderData.subtotal * (voucher.discount_percentage / 100));
        }

        // Map voucher discount to 'restaurantDiscount' (Diskon Platoo) per request
        orderData.restaurantDiscount = discountAmount;
        // keep voucherDiscount zero to avoid double-subtraction
        orderData.voucherDiscount = 0;

        // Show success message
        const statusEl = document.getElementById('voucherStatus');
        statusEl.className = 'voucher-status success';
        statusEl.innerHTML = `✓ Voucher <strong>${voucher.code}</strong> berhasil dipilih! Potongan ${formatCurrency(discountAmount)}`;
    }

    // Recalculate totals
    calculateTotals();
    updatePriceBreakdown();
}

async function confirmCheckout() {
    // Validate form: if phone input exists, require it; otherwise skip (section removed)
    const phoneInput = document.getElementById('customerPhone');
    if (phoneInput) {
        if (!phoneInput.value || !phoneInput.value.trim()) {
            showErrorModal('Silakan masukkan nomor telepon');
            return;
        }
        orderData.customerPhone = phoneInput.value.trim();
    }

    if (!document.getElementById('agreeTerms').checked) {
        showErrorModal('Silakan setujui syarat dan ketentuan');
        return;
    }

    if (orderData.items.length === 0) {
        showErrorModal('Keranjang belanja kosong');
        return;
    }

    showLoadingOverlay(true);

    try {
        // Create order
        const orderId = await createOrder();

        // Update food stock
        await updateFoodStock();

        // Clear cart
        localStorage.removeItem('platoo_cart');

        // Show success modal
        showLoadingOverlay(false);
        showSuccessModal(orderId);
    } catch (error) {
        console.error('Error confirming checkout:', error);
        showLoadingOverlay(false);
        showErrorModal('Gagal membuat pesanan. Silakan coba lagi.');
    }
}

async function createOrder() {
    try {
        // Prepare order items
        const orderItems = orderData.items.map(item => ({
            food_id: item.id,
            food_name: item.name,
            quantity: item.quantity,
            price: item.original_price - (item.original_price * PLATOO_DISCOUNT_RATE),
            subtotal: (item.original_price - (item.original_price * PLATOO_DISCOUNT_RATE)) * item.quantity
        }));

        // Create order record
        const { data, error } = await supabase
            .from('orders')
            .insert({
                buyer_id: currentUser.id,
                restaurant_id: orderData.restaurantId,
                items: orderItems,
                subtotal: orderData.subtotal,
                discount_from_platoo: orderData.restaurantDiscount,
                discount_from_voucher: orderData.voucherDiscount,
                voucher_id: orderData.selectedVoucherId,
                service_fee: SERVICE_FEE,
                tax_amount: orderData.taxAmount,
                total_amount: orderData.totalPrice,
                payment_method: orderData.selectedPaymentMethod,
                payment_status: orderData.selectedPaymentMethod === 'cash' ? 'pending' : 'pending',
                customer_phone: orderData.customerPhone,
                status: 'pending',
                notes: '',
                created_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
}

async function updateFoodStock() {
    try {
        for (const item of orderData.items) {
            const { data: food } = await supabase
                .from('foods')
                .select('quota')
                .eq('id', item.id)
                .single();

            if (food) {
                const newQuota = Math.max(0, food.quota - item.quantity);
                await supabase
                    .from('foods')
                    .update({ quota: newQuota })
                    .eq('id', item.id);
            }
        }
    } catch (error) {
        console.error('Error updating food stock:', error);
    }
}

// UI Helper Functions

function showEmptyCart() {
    document.getElementById('emptyCart').style.display = 'block';
    document.getElementById('priceBreakdown').style.display = 'none';
    document.getElementById('checkoutActions').style.display = 'none';
    document.getElementById('orderSummaryCard').style.display = 'none';
    document.querySelectorAll('.checkout-section').forEach(section => {
        if (!section.classList.contains('order-summary-section')) {
            section.style.display = 'none';
        }
    });
}

function showLoadingOverlay(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

function showSuccessModal(orderId) {
    document.getElementById('orderNumber').textContent = orderId || '#ORD-' + Date.now();
    
    const paymentMethod = {
        'cash': 'Pembayaran akan dilakukan saat pengambilan',
        'virtual_account': 'Silakan lakukan transfer ke nomor virtual account yang akan dikirim',
        'ewallet': 'Silakan selesaikan pembayaran melalui e-wallet Anda'
    };

    document.getElementById('successMessage').textContent = paymentMethod[orderData.selectedPaymentMethod];
    document.getElementById('successModal').style.display = 'flex';
}

function showErrorModal(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function goToDashboard() {
    window.location.href = '../../dashboard-pembeli.html';
}

// Utility Functions

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateTotals,
        formatCurrency,
        orderData
    };
}
