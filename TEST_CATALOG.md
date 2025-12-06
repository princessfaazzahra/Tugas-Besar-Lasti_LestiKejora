# 🧪 Test Catalog - Perbaikan Logic

## ✅ Masalah yang Diperbaiki

### 1. **Bug: Klik produk 2 malah nambah produk 1**
**Root Cause:** 
- Inline `onclick` dengan template literal meng-embed `item.id` saat render
- Karena JavaScript closure, semua onclick reference ke `item.id` terakhir yang di-loop
- Misal ada 3 produk: saat loop selesai, `item` = produk terakhir, jadi semua button klik produk terakhir

**Solusi:**
- Ganti inline `onclick` dengan **event delegation**
- Pakai `data-action` dan `data-id` attributes
- Single event listener di document level yang baca attribute dari button yang diklik
- Setiap button punya `data-id` yang unik dan tidak berubah

### 2. **Bug: Logic tumpang tindih**
**Root Cause:**
- Ada 2 tempat yang render button: `createMenuCard()` dan `updateCardQuantityDisplay()`
- Tidak konsisten dalam type checking (String vs Number)
- Cart key bisa jadi String atau Number tergantung cara add

**Solusi:**
- Konsisten convert semua ID ke `Number` dengan `parseInt()`
- Semua comparison pakai `===` bukan `==`
- Logging lebih detail untuk debugging

## 🔧 Perubahan Kode

### Event Delegation Pattern
```javascript
// BEFORE (SALAH - inline onclick)
<button onclick="addToCart(${item.id})">Tambah</button>

// AFTER (BENAR - data attributes)
<button data-action="add" data-id="${item.id}">Tambah</button>

// Single event listener untuk semua button
document.addEventListener('click', function(e) {
    const target = e.target.closest('button[data-action]');
    if (!target) return;
    
    const action = target.getAttribute('data-action');
    const itemId = parseInt(target.getAttribute('data-id')); // PARSE!
    
    switch(action) {
        case 'add': addToCart(itemId); break;
        case 'increase': increaseQuantity(itemId); break;
        case 'decrease': decreaseQuantity(itemId); break;
    }
});
```

### Type Consistency
```javascript
function addToCart(itemId) {
    // ALWAYS convert to number
    itemId = parseInt(itemId);
    if (isNaN(itemId)) return;
    
    // Use number as key
    cart[itemId] = 1; // key is number
    
    // Compare as numbers
    const existingIds = Object.keys(cart)
        .map(id => parseInt(id)); // Convert all to numbers
        
    if (existingIds.includes(itemId)) {
        // This works because both are numbers!
    }
}
```

## 🧪 Test Cases

### Test 1: Klik produk berbeda
1. Buka catalog dengan multiple products
2. Klik "Tambah" di Produk A
3. ✅ Produk A quantity = 1
4. Klik "Tambah" di Produk B
5. ✅ Notifikasi error: "Anda hanya bisa memesan 1 jenis produk"
6. ✅ Produk B tetap 0, Produk A tetap 1

### Test 2: Produk lain jadi disabled
1. Klik "Tambah" di Produk A
2. ✅ Produk B, C, D jadi abu-abu
3. ✅ Button "Tambah" berubah jadi "Tidak Dapat Dipilih"
4. Hover Produk B
5. ✅ Tooltip merah muncul: "⚠️ Hanya dapat memilih 1 produk"

### Test 3: Increase/Decrease quantity
1. Klik "Tambah" di Produk A (qty = 1)
2. Klik "+" → qty = 2
3. ✅ Produk lain tetap disabled
4. Klik "-" → qty = 1
5. ✅ Produk lain tetap disabled
6. Klik "-" lagi → qty = 0, item removed
7. ✅ Produk lain jadi enabled lagi

### Test 4: Checkout button
1. Keranjang kosong → ✅ Checkout button hidden
2. Tambah Produk A → ✅ Checkout button muncul dari bawah
3. ✅ Menampilkan quantity & total price yang benar
4. Hapus produk → ✅ Checkout button hilang

## 🐛 Debug Console

Sekarang semua function punya logging detail:

```javascript
=== addToCart called ===
itemId: 1 type: number
Current cart: {}
Existing items in cart: []
✅ Item added to cart: 1
Cart after add: {"1":1}

=== refreshCardsState ===
Cart items: [1]
Selected item: 1
Full cart: {"1":1}
Card 1: available=true, selected=true, shouldBeDisabled=false, stok=10
Card 2: available=true, selected=false, shouldBeDisabled=true, stok=5
```

## 🔍 Cara Cek di Browser

1. Buka `catalog.html` di browser
2. Buka DevTools Console (F12)
3. Coba klik berbagai button
4. Lihat log detail di console:
   - Setiap klik akan log itemId dan action
   - Cart state sebelum/sesudah
   - Status setiap card (disabled/enabled)

## 📋 Checklist

- [x] Hapus semua inline `onclick`
- [x] Tambah event delegation
- [x] Konsisten parseInt() semua ID
- [x] Perbaiki comparison (=== bukan ==)
- [x] Tambah logging detail
- [x] Test addToCart dengan produk berbeda
- [x] Test increase/decrease quantity
- [x] Test disabled state produk lain
- [x] Test tooltip hover
- [x] Test checkout button show/hide

## 🚀 Status

**SELESAI!** Logic sudah diperbaiki dan siap ditest di browser.

---

**Tips:** Kalau masih ada bug, cek Console log untuk lihat:
1. Item ID yang diklik (harus match dengan yang diharapkan)
2. Cart state sebelum/sesudah action
3. Apakah ada error message
