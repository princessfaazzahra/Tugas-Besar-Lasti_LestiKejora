# Setup Forgot Password dengan EmailJS

## Langkah-Langkah Setup EmailJS (GRATIS) 🚀

### 1. Daftar di EmailJS
- Buka https://www.emailjs.com/
- Klik **Sign Up** (gratis, tidak perlu kartu kredit)
- Daftar menggunakan email Anda

### 2. Buat Email Service
- Setelah login, klik **Add New Service**
- Pilih provider email Anda (Gmail, Outlook, Yahoo, dll)
- Untuk **Gmail**:
  - Klik "Connect Account"
  - Login dengan Gmail Anda
  - Berikan izin akses
- Klik **Create Service**
- **Copy Service ID** yang muncul (contoh: `service_abc123`)

### 3. Buat Email Template
- Klik menu **Email Templates**
- Klik **Create New Template**
- Gunakan template berikut:

#### Subject:
```
Reset Password Platoo - {{to_name}}
```

#### Body (Content):
```
Halo {{to_name}}!

Anda menerima email ini karena melakukan request lupa password di Platoo.

Berikut merupakan password akun Platoo-mu:

📧 Email: {{to_email}}
🔑 Password: {{user_password}}
👤 Tipe Akun: {{user_type}}

Silakan login menggunakan password tersebut!
Untuk keamanan, kami sarankan Anda mengganti password setelah login.

Salam hangat,
Tim Platoo 🍽️

---
Selamatkan Rasa, Selamatkan Bumi #StartFromYourPlate
```

#### Settings Template:
- **To Email**: `{{to_email}}`
- **From Name**: `Platoo`
- **From Email**: (email Anda yang terhubung)
- **Reply To**: (email Anda)

- Klik **Save**
- **Copy Template ID** yang muncul (contoh: `template_xyz789`)

### 4. Dapatkan Public Key
- Klik menu **Account** (kanan atas)
- Pilih **API Keys**
- **Copy Public Key** Anda (contoh: `abc123XYZ_xyz789ABC`)

### 5. Update Kode di forgot-password.js

Buka file `src/js/forgot-password.js` dan ganti:

```javascript
// Baris 22:
emailjs.init("YOUR_EMAILJS_PUBLIC_KEY"); 
// Ganti dengan:
emailjs.init("abc123XYZ_xyz789ABC"); // Public Key Anda

// Baris 77:
emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams)
// Ganti dengan:
emailjs.send('service_abc123', 'template_xyz789', templateParams)
// Service ID dan Template ID Anda
```

### 6. Test Forgot Password
- Buka halaman **forgot-password.html**
- Masukkan email yang terdaftar di database
- Klik **Kirim Password ke Email**
- Cek inbox email (atau folder spam)
- Password akan terkirim otomatis! ✉️

## Troubleshooting

### Email tidak terkirim?
1. **Cek Console Browser**: Tekan F12 > Console, lihat error
2. **Verifikasi API Keys**: Pastikan Public Key, Service ID, Template ID sudah benar
3. **Cek Spam Folder**: Email mungkin masuk ke spam
4. **Quota EmailJS**: Free tier = 200 email/bulan. Cek quota di dashboard EmailJS

### Error "Invalid Email"?
- Pastikan email di database menggunakan format valid (`user@email.com`)
- Tambahkan field `email` ke tabel `pembeli` dan `restoran` di Supabase

### Cara Testing tanpa EmailJS?
Anda bisa test dengan console.log dulu:
```javascript
// Di forgot-password.js baris 74-84, ganti dengan:
console.log('Email akan dikirim ke:', email);
console.log('Data:', templateParams);
showLoading(false);
showSuccessDialog(email);
```

## Keuntungan EmailJS

✅ **Gratis** - 200 email/bulan  
✅ **Mudah Setup** - Tanpa backend  
✅ **Otomatis** - Langsung kirim email  
✅ **Aman** - API Key di frontend aman untuk EmailJS  
✅ **Multi Provider** - Gmail, Outlook, Yahoo, dll  

## Alternatif Lain

Jika ingin alternatif:
- **SendGrid** - 100 email/hari gratis
- **Mailgun** - 5000 email/bulan (perlu kartu kredit)
- **Nodemailer** - Perlu backend Node.js

---

**Selamat mencoba! 🎉**

Jika ada pertanyaan, silakan hubungi developer.
