# Testing Forgot Password - Mode Demo

## ✅ Mode Demo Aktif!

Saat ini system dalam **MODE DEMO** untuk testing tanpa perlu setup EmailJS.

### Cara Testing:

1. **Buka file**: `src/html/forgot-password.html` di browser

2. **Test dengan akun yang sudah ada:**
   - **Pembeli**: Masukkan username pembeli yang ada di database
   - **Penjual**: Masukkan nama restoran (sebagai username)

3. **Klik "Kirim Password ke Email"**

4. **Hasil yang akan muncul:**
   - ✅ Loading overlay muncul
   - ✅ System cari username di database
   - ✅ Dialog success muncul dengan info:
     - Nama user
     - Email terdaftar
     - **Password ditampilkan langsung** (karena mode demo)
   - ✅ Button "Kembali ke Login" berfungsi

### Console Log (F12 untuk lihat):

Anda akan melihat log seperti:
```
✅ Forgot password page loaded successfully!
✅ Data ditemukan: {nama: "...", email: "...", password: "..."}
🎯 DEMO MODE - Data yang akan dikirim: {...}
```

### Jika Ada Error:

**"Username tidak ditemukan"**
- Pastikan username yang diinput ada di database
- Cek tabel `pembeli` (field: `username`) atau `restoran` (field: `nama_restoran`)

**"Akun ini belum memiliki email terdaftar"**
- User tersebut belum punya email di database
- Solusi: Tambah email via register atau update manual di Supabase

**Button tidak berfungsi:**
- Cek browser console (F12) untuk error
- Pastikan file JS ter-load dengan benar

### Cara Ganti ke Production Mode (Kirim Email Otomatis):

Edit file `src/js/forgot-password.js` baris 14:
```javascript
const MODE = 'production'; // Ganti dari 'demo' ke 'production'
```

Kemudian setup EmailJS sesuai panduan di `SETUP_EMAILJS.md`.

---

## Quick Test Commands:

```javascript
// Test di browser console:

// 1. Cek apakah Supabase loaded
console.log(supabase);

// 2. Cek apakah form listener aktif
console.log('Form:', document.getElementById('forgotPasswordForm'));

// 3. Test query manual (ganti 'username_test' dengan username asli)
supabase.from('pembeli').select('*').eq('username', 'username_test').then(console.log);
```

---

**Happy Testing! 🚀**
