// Supabase Configuration
const SUPABASE_URL = 'https://nxamzwahwgakiatujxug.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW16d2Fod2dha2lhdHVqeHVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDkwMjcsImV4cCI6MjA4MDU4NTAyN30.9nBRbYXKJmLcWbKcx0iICDNisdQNCg0dFjI_JGVt5pk';
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
            currentUser = { id: 1, email: 'dev@local.test', full_name: 'Dev Tester' };
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
    
    console.log('Cart data loaded:', cart);
    console.log('Restaurant ID:', orderData.restaurantId);
    console.log('Items from cart:', orderData.items);

    if (orderData.items.length === 0) {
        showEmptyCart();
        return;
    }

    // PRIORITAS PERTAMA: Fetch item photos dari database
    try {
        console.log('🔥 STEP 1: About to fetch item photos...');
        await fetchItemPhotos();
        console.log('✅ STEP 1 DONE: Finished fetching item photos');
        console.log('Items after fetch:', orderData.items);
    } catch (error) {
        console.error('❌ Error in main fetchItemPhotos call:', error);
    }

    // Fetch restaurant info
    try {
        console.log('🔥 STEP 2: Fetching restaurant info...');
        await fetchRestaurantInfo();
        console.log('✅ STEP 2 DONE');
    } catch (error) {
        console.error('❌ Error fetching restaurant info:', error);
    }

    // Load customer info
    try {
        await loadCustomerInfo(currentUser.id);
    } catch (error) {
        console.error('❌ Error loading customer info:', error);
    }

    // Load available vouchers
    try {
        await loadAvailableVouchers();
    } catch (error) {
        console.error('❌ Error loading vouchers:', error);
    }

    // Populate UI
    renderOrderItems();
    calculateTotals();
    updatePriceBreakdown();

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
            .from('restoran')
            .select('id_penjual, nama_restoran, alamat, nomor_telepon, foto_url, rate')
            .eq('id_penjual', orderData.restaurantId)
            .single();

        if (error) throw error;
        
        // Map field names dari database ke format yang dipakai di orderData
        orderData.restaurantInfo = {
            id: data.id_penjual,
            name: data.nama_restoran,
            address: data.alamat,
            phone: data.nomor_telepon,
            photo: data.foto_url,
            rating: data.rate
        };
        
        console.log('Restaurant info loaded:', orderData.restaurantInfo);
    } catch (error) {
        console.error('Error fetching restaurant info:', error);
        // Set default values jika gagal
        orderData.restaurantInfo = {
            id: orderData.restaurantId,
            name: 'Restoran',
            address: '-',
            phone: '-',
            photo: null
        };
    }
}

async function fetchItemPhotos() {
    console.log('=== FETCH ITEM PHOTOS STARTED ===');
    try {
        // Get all item IDs
        const itemIds = orderData.items.map(item => item.id);
        console.log('Item IDs to fetch:', itemIds);
        
        if (!supabase) {
            console.error('❌ Supabase is not initialized!');
            return;
        }
        
        console.log('Fetching from Supabase catalog table...');
        
        // Fetch from catalog table - gunakan catalog_id sebagai PK
        const { data, error } = await supabase
            .from('catalog')
            .select('*')
            .in('catalog_id', itemIds);
        
        console.log('Supabase response:', { data, error });
        
        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }
        
        if (!data || data.length === 0) {
            console.warn('⚠️ No data returned from catalog table for IDs:', itemIds);
            return;
        }
        
        console.log(`✅ Fetched ${data.length} items from catalog:`, data);
        
        // Update items dengan data lengkap dari catalog
        orderData.items = orderData.items.map(item => {
            const catalogItem = data.find(d => d.catalog_id === item.id);
            if (catalogItem) {
                // Gunakan kolom 'foto' dari CSV
                const photoUrl = catalogItem.foto || '';
                console.log(`✅ Processing ${catalogItem.nama_makanan}:`, {
                    catalog_id: catalogItem.catalog_id,
                    foto: catalogItem.foto,
                    finalPhotoUrl: photoUrl
                });
                return {
                    ...item,
                    image_url: photoUrl,
                    foto: catalogItem.foto,
                    nama_makanan: catalogItem.nama_makanan
                };
            } else {
                console.warn(`⚠️ No catalog match found for item ID ${item.id}`);
                return item;
            }
        });
        
        console.log('✅ Final items after update:', orderData.items);
        
        // Update localStorage
        localStorage.setItem('platoo_cart', JSON.stringify({
            items: orderData.items,
            restaurantId: orderData.restaurantId
        }));
        
        console.log('=== FETCH ITEM PHOTOS COMPLETED ===');
    } catch (error) {
        console.error('❌ Error in fetchItemPhotos:', error);
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

        // Filter vouchers by restaurant ID
        const { data, error } = await supabase
            .from('voucher')
            .select('*')
            .eq('resto_id', orderData.restaurantId)
            .gt('stok', 0)
            .gte('expired_date', today)
            .order('potongan', { ascending: false });

        if (error) throw error;

        availableVouchers = data || [];
        console.log('Vouchers loaded for restaurant', orderData.restaurantId, ':', availableVouchers);
        renderVoucherList();
    } catch (error) {
        console.error('Error loading vouchers:', error);
        availableVouchers = [];
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

    const expiredDate = new Date(voucher.expired_date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const isSelected = orderData.selectedVoucherId == voucher.voucher_id;
    const isOutOfStock = voucher.stok <= 0;

    if (isOutOfStock) {
        div.classList.add('disabled');
    }

    div.innerHTML = `
        <input
            type="radio"
            name="voucher"
            class="voucher-radio"
            data-voucher-id="${voucher.voucher_id}"
            ${isSelected ? 'checked' : ''}
            ${isOutOfStock ? 'disabled' : ''}
        >
        <div class="voucher-checkbox"></div>
        <div class="voucher-content">
            <div class="voucher-code">${voucher.nama_voucher}</div>
            <div class="voucher-discount">Potongan ${formatCurrency(voucher.potongan)}</div>
            <div class="voucher-validity">
                <span>Berlaku hingga ${expiredDate}</span>
                <span style="margin-left: 0.5rem; color: ${voucher.stok > 5 ? 'var(--success)' : 'var(--warning)'};">• Stok: ${voucher.stok}</span>
            </div>
        </div>
    `;
    // Reflect selected state visually
    if (isSelected) div.classList.add('selected');

    // Prevent interaction if out of stock
    if (isOutOfStock) {
        return div;
    }

    // Toggle selection: clicking the voucher card selects it; clicking again deselects it.
    div.addEventListener('click', (e) => {
        const input = div.querySelector('input[name="voucher"]');
        const currentlySelected = orderData.selectedVoucherId == voucher.voucher_id;

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

            const currentlySelected = orderData.selectedVoucherId == voucher.voucher_id;
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

    console.log('=== RENDERING ORDER ITEMS ===');
    console.log('Total items:', orderData.items.length);
    
    orderData.items.forEach((item, index) => {
        console.log(`\n--- Item ${index}: ${item.name} ---`);
        console.log('Full item data:', item);
        console.log('foto_menu:', item.foto_menu);
        console.log('image_url:', item.image_url);
        
        const itemElement = createOrderItemElement(item, index);
        container.appendChild(itemElement);
    });
    
    console.log('=== RENDERING COMPLETE ===\n');
}

function createOrderItemElement(item, index) {
    const div = document.createElement('div');
    div.className = 'order-item';
    
    console.log(`Creating element for ${item.name}:`, {
        id: item.id,
        image_url: item.image_url,
        hasImage: !!(item.image_url && item.image_url.trim())
    });
    
    // Prefer explicit item.price (catalog displayed price). If not provided, apply Platoo discount
    // to original_price (if available) as fallback.
    const unitPrice = (typeof item.price !== 'undefined' && item.price !== null)
        ? Number(item.price)
        : (item.original_price ? Number(item.original_price) - Math.round(Number(item.original_price) * PLATOO_DISCOUNT_RATE) : 0);
    const itemPrice = unitPrice;
    const itemTotal = itemPrice * item.quantity;

    // Food emojis sebagai fallback (SAMA dengan catalog.js)
    const foodEmojis = ['🍕', '🍔', '🍜', '🍱', '🍝', '🥘', '🍛', '🍲', '🥗', '🍖', '🍗', '🥙', '🌮', '🌯', '🥪'];
    const randomEmoji = foodEmojis[Math.floor(Math.random() * foodEmojis.length)];
    
    // Check for photo - PERSIS seperti di catalog.js
    const photoUrl = item.foto_menu || item.image_url || item.photo_url || item.foto || '';
    const hasImage = photoUrl && photoUrl.trim() !== '';
    
    console.log(`🖼️ Rendering ${item.name}:`, {
        foto_menu: item.foto_menu,
        image_url: item.image_url,
        photoUrl: photoUrl,
        hasImage: hasImage
    });

    div.innerHTML = `
        <div class="item-image-container ${hasImage ? 'has-image' : 'no-image'}">
            ${hasImage 
                ? `<img 
                    src="${photoUrl}" 
                    alt="${item.name}"
                    class="item-image"
                    crossorigin="anonymous"
                    onerror="console.error('❌ Image failed:', '${photoUrl}'); this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    onload="console.log('✅ Image loaded:', '${item.name}');"
                >
                <div class="item-image-fallback" style="display:none;">
                    <span>${randomEmoji}</span>
                </div>`
                : `<div class="item-image-fallback">
                    <span>${randomEmoji}</span>
                </div>`
            }
        </div>
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
    
    // Restaurant card dengan style dashboard pembeli
    const emojis = ['🍕', '🍔', '🍜', '🍱', '🍝', '🥘', '🍛', '🍲', '🥗', '🍖'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const hasPhoto = orderData.restaurantInfo.photo && orderData.restaurantInfo.photo.trim() !== '';
    const rating = orderData.restaurantInfo.rating ? orderData.restaurantInfo.rating.toFixed(1) : '0.0';
    
    container.innerHTML = `
        <div class="restaurant-pickup-card">
            <div class="pickup-card-image ${hasPhoto ? 'has-photo' : ''}">
                ${hasPhoto 
                    ? `<img src="${orderData.restaurantInfo.photo}" alt="${orderData.restaurantInfo.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                       <span style="display:none;">${randomEmoji}</span>`
                    : `<span>${randomEmoji}</span>`
                }
                <div class="pickup-card-badge">
                    ⭐ ${rating}
                </div>
            </div>
            <div class="pickup-card-content">
                <div class="pickup-card-header">
                    <h3 class="pickup-card-title">${orderData.restaurantInfo.name || '-'}</h3>
                    <div class="pickup-card-location">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0C5.2 0 3 2.2 3 5c0 3.9 5 11 5 11s5-7.1 5-11c0-2.8-2.2-5-5-5zm0 7.5c-1.4 0-2.5-1.1-2.5-2.5S6.6 2.5 8 2.5s2.5 1.1 2.5 2.5S9.4 7.5 8 7.5z"/>
                        </svg>
                        <span>${orderData.restaurantInfo.address || '-'}</span>
                    </div>
                </div>
                <div class="pickup-card-info">
                    <div class="pickup-card-phone">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z"/>
                        </svg>
                        <span>${orderData.restaurantInfo.phone || '-'}</span>
                    </div>
                    <div class="pickup-card-time">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm0 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.5 3v4.5l3 1.5-.5 1-3.5-1.75V4h1z"/>
                        </svg>
                        <span>Sesuai jam operasional restoran</span>
                    </div>
                </div>
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
        // Check stock availability
        if (voucher.stok <= 0) {
            const statusEl = document.getElementById('voucherStatus');
            statusEl.className = 'voucher-status error';
            statusEl.innerHTML = `✗ Voucher <strong>${voucher.nama_voucher}</strong> sudah habis!`;
            return;
        }

        // Select voucher
        orderData.selectedVoucherId = voucher.voucher_id;
        orderData.selectedVoucher = voucher;

        // Use potongan (fixed discount amount) from voucher
        const discountAmount = Number(voucher.potongan);

        // Map voucher discount to 'restaurantDiscount' (Diskon Platoo) per request
        orderData.restaurantDiscount = discountAmount;
        // keep voucherDiscount zero to avoid double-subtraction
        orderData.voucherDiscount = 0;

        // Clear status message (no success notification needed)
        document.getElementById('voucherStatus').innerHTML = '';
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
        const result = await createOrder();

        // Update food stock
        await updateFoodStock();

        // Update voucher stock if voucher was used
        if (orderData.selectedVoucher) {
            await updateVoucherStock();
        }

        // Save order info to localStorage
        localStorage.setItem('platoo_last_order', JSON.stringify(result.orderIds));

        // Clear cart
        localStorage.removeItem('platoo_cart');

        showLoadingOverlay(false);

        // Check payment method and redirect accordingly
        if (orderData.selectedPaymentMethod === 'cash') {
            // Cash payment - go directly to order status
            window.location.href = `order-status.html?order=${result.displayId}&payment=cash`;
        } else {
            // Virtual Account or E-Wallet - go to payment confirmation page
            const paymentData = {
                method: orderData.selectedPaymentMethod,
                amount: orderData.totalPrice,
                orderId: result.displayId,
                orderIds: result.orderIds
            };
            localStorage.setItem('platoo_payment_pending', JSON.stringify(paymentData));
            window.location.href = 'payment-confirmation.html';
        }
    } catch (error) {
        console.error('Error confirming checkout:', error);
        showLoadingOverlay(false);
        showErrorModal('Gagal membuat pesanan. Silakan coba lagi.');
    }
}

async function createOrder() {
    try {
        console.log('=== Creating order ===');
        console.log('Current user:', currentUser);
        console.log('Restaurant ID:', orderData.restaurantId);
        console.log('Items:', orderData.items);
        
        // Pastikan currentUser.id adalah integer, bukan string
        const userId = parseInt(currentUser?.id) || 1;
        console.log('User ID (converted to int):', userId, typeof userId);
        
        // Get max order_id dari database untuk auto-increment manual
        const { data: maxOrderData } = await supabase
            .from('orders')
            .select('order_id')
            .order('order_id', { ascending: false })
            .limit(1);
        
        let nextOrderId = 1;
        if (maxOrderData && maxOrderData.length > 0) {
            nextOrderId = maxOrderData[0].order_id + 1;
        }
        
        console.log('Next order ID will start from:', nextOrderId);
        
        // Insert order untuk setiap item (karena struktur table orders per item)
        const orderInserts = [];
        
        for (const item of orderData.items) {
            const orderData_single = {
                order_id: nextOrderId++,
                catalog_id: parseInt(item.id),
                id_pembeli: userId,
                jumlah: parseInt(item.quantity),
                status_pesanan: 'Sedang Diproses',
                total_harga: parseInt(Math.round((item.price || item.original_price) * item.quantity))
            };
            
            console.log('Inserting order:', orderData_single);
            orderInserts.push(orderData_single);
        }
        
        // Insert semua orders sekaligus
        const { data, error } = await supabase
            .from('orders')
            .insert(orderInserts);

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        console.log('✅ Orders created:', data);
        // Return order info
        const orderIds = orderInserts.map(o => o.order_id);
        const displayId = 'ORD-' + orderInserts[0].order_id;
        return { orderIds, displayId };
    } catch (error) {
        console.error('❌ Error creating order:', error);
        throw error;
    }
}

async function updateFoodStock() {
    try {
        for (const item of orderData.items) {
            const { data: food } = await supabase
                .from('catalog')
                .select('stok')
                .eq('catalog_id', item.id)
                .single();

            if (food) {
                const newStok = Math.max(0, food.stok - item.quantity);
                await supabase
                    .from('catalog')
                    .update({ stok: newStok })
                    .eq('catalog_id', item.id);
            }
        }
    } catch (error) {
        console.error('Error updating food stock:', error);
    }
}

async function updateVoucherStock() {
    try {
        const voucherId = orderData.selectedVoucher.voucher_id;

        // Get current stock
        const { data: voucher } = await supabase
            .from('voucher')
            .select('stok')
            .eq('voucher_id', voucherId)
            .single();

        if (voucher) {
            const newStok = Math.max(0, voucher.stok - 1);
            await supabase
                .from('voucher')
                .update({ stok: newStok })
                .eq('voucher_id', voucherId);

            console.log(`Voucher stock updated: ${voucher.stok} -> ${newStok}`);
        }
    } catch (error) {
        console.error('Error updating voucher stock:', error);
    }
}

// UI Helper Functions

function showEmptyCart() {
    // Clear items container
    document.getElementById('itemsContainer').innerHTML = '';

    // Show empty cart message
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
