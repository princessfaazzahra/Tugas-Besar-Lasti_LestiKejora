# Setup EmailJS untuk Order Confirmation Email

## Langkah 1: Daftar EmailJS
1. Kunjungi https://www.emailjs.com/
2. Klik "Sign Up" dan daftar dengan email Anda
3. Verifikasi email Anda

## Langkah 2: Tambahkan Email Service
1. Login ke dashboard EmailJS
2. Klik "Email Services" di sidebar
3. Klik "Add New Service"
4. Pilih provider email Anda (Gmail/Outlook/Yahoo)
5. Ikuti instruksi untuk connect email Anda
6. **Copy SERVICE ID** (contoh: service_abc123) - Anda akan membutuhkan ini

## Langkah 3: Buat Email Template
1. Klik "Email Templates" di sidebar
2. Klik "Create New Template"
3. Isi template dengan format berikut:

### Template Name: 
```
order_confirmation
```

### Subject:
```
Konfirmasi Pesanan #{{order_id}} - Platoo
```

### Content (HTML/Text):
```html
<h2>Terima Kasih, {{customer_name}}!</h2>

<p>Pesanan Anda telah berhasil dikonfirmasi.</p>

<h3>Detail Pesanan</h3>
<ul>
  <li><strong>Nomor Pesanan:</strong> ORD-{{order_id}}</li>
  <li><strong>Tanggal:</strong> {{order_date}}</li>
  <li><strong>Metode Pembayaran:</strong> {{payment_method}}</li>
</ul>

<h3>Restoran</h3>
<ul>
  <li><strong>Nama:</strong> {{restaurant_name}}</li>
  <li><strong>Alamat:</strong> {{restaurant_address}}</li>
  <li><strong>Telepon:</strong> {{restaurant_phone}}</li>
</ul>

<h3>Item Pesanan</h3>
<pre>{{order_items}}</pre>

<h3>Total Pembayaran: {{total_price}}</h3>

<p>Silakan ambil pesanan Anda di restoran sesuai dengan status yang ditampilkan di aplikasi.</p>

<p>Terima kasih telah menggunakan Platoo!</p>
<p><em>#StartFromYourPlate</em></p>
```

4. **Copy TEMPLATE ID** dari template yang baru dibuat

## Langkah 4: Get Public Key
1. Klik "Account" di sidebar (atau icon profil)
2. Klik tab "General"
3. **Copy PUBLIC KEY** (terlihat seperti string panjang)

## Langkah 5: Update Konfigurasi
Buka file `src/js/email-service.js` dan update:

```javascript
const EMAILJS_CONFIG = {
    PUBLIC_KEY: 'PASTE_YOUR_PUBLIC_KEY_HERE',
    SERVICE_ID: 'PASTE_YOUR_SERVICE_ID_HERE',
    TEMPLATE_ID: 'order_confirmation', // atau ID template Anda
};
```

## Langkah 6: Tambahkan Field Email di Form Pembeli
Pastikan form registrasi pembeli memiliki field email dan tersimpan di database.

## Testing
Setelah setup, email akan otomatis dikirim saat:
- Pembayaran cash selesai dikonfirmasi
- Pembayaran digital (VA/QRIS) selesai dikonfirmasi dengan tombol "Saya Sudah Bayar"

## Troubleshooting
- Jika email tidak terkirim, cek console browser untuk error
- Pastikan PUBLIC_KEY, SERVICE_ID, dan TEMPLATE_ID sudah benar
- Pastikan email service sudah terverifikasi di EmailJS
- Cek quota EmailJS (free tier: 200 email/month)

## Catatan Penting
- EmailJS free tier memberikan 200 email gratis per bulan
- Untuk production, pertimbangkan upgrade ke paid plan
- Jangan expose PUBLIC_KEY di repository public (gunakan environment variable)
