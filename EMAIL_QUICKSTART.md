# Email Order Recap - Quick Start

## Setup Cepat EmailJS

### 1. Daftar & Setup (5 menit)
1. Kunjungi https://www.emailjs.com/
2. Sign Up dengan email
3. Buat Email Service (pilih Gmail/Outlook)
4. Buat Template dengan ID: `order_confirmation`

### 2. Template Email
Copy template ini ke EmailJS:

**Subject:**
```
Konfirmasi Pesanan #{{order_id}} - Platoo
```

**Body:**
```html
<h2>Halo {{customer_name}}!</h2>
<p>Terima kasih telah memesan di Platoo</p>

<h3>📦 Detail Pesanan</h3>
<p><strong>Nomor:</strong> ORD-{{order_id}}<br>
<strong>Tanggal:</strong> {{order_date}}<br>
<strong>Pembayaran:</strong> {{payment_method}}</p>

<h3>🏪 Restoran</h3>
<p><strong>{{restaurant_name}}</strong><br>
📍 {{restaurant_address}}<br>
📞 {{restaurant_phone}}</p>

<h3>🍽️ Pesanan Anda</h3>
<pre>{{order_items}}</pre>

<h2>💰 Total: {{total_price}}</h2>

<p>Silakan ambil pesanan sesuai status di aplikasi.</p>
<p><em>#StartFromYourPlate</em></p>
```

### 3. Update Konfigurasi
Edit `src/js/email-service.js`:

```javascript
const EMAILJS_CONFIG = {
    PUBLIC_KEY: 'YOUR_PUBLIC_KEY',     // Dari Account > General
    SERVICE_ID: 'YOUR_SERVICE_ID',     // Dari Email Services
    TEMPLATE_ID: 'order_confirmation', // ID template
};
```

### 4. Tambahkan Field Email
Pastikan tabel `pembeli` punya kolom `email` dan form registrasi mengambil email user.

## Testing
1. Register/Login sebagai pembeli
2. Pesan makanan
3. Konfirmasi pembayaran
4. Cek email yang didaftarkan

## Troubleshooting
- ✅ Cek PUBLIC_KEY, SERVICE_ID, TEMPLATE_ID sudah benar
- ✅ Email service sudah connected & verified di EmailJS
- ✅ User punya field email di database
- ✅ Quota EmailJS mencukupi (free: 200/month)
- ✅ Console browser untuk error log

## File yang Dimodifikasi
- ✅ `src/js/email-service.js` - Service email
- ✅ `src/html/checkout.html` - EmailJS SDK
- ✅ `src/html/payment-confirmation.html` - EmailJS SDK
- ✅ `src/js/checkout.js` - Send email after cash payment
- ✅ `src/js/payment-confirmation.js` - Send email after digital payment
- ✅ `EMAILJS_SETUP.md` - Setup lengkap

## Dokumentasi Lengkap
Lihat `EMAILJS_SETUP.md` untuk instruksi detail.
