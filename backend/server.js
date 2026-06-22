const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Mengizinkan akses dari luar (CORS)
app.use(cors());
app.use(express.json());

// Konfigurasi koneksi database mengambil dari Environment Variable di docker-compose
const dbConfig = {
    host: process.env.DB_HOST || '10.10.10.20',
    user: process.env.DB_USER || 'admin_web',
    password: process.env.DB_PASS || 'PasswordAdminWeb456',
    database: process.env.DB_NAME || 'db_dashboard',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Membuat koneksi pool ke MariaDB
const pool = mysql.createPool(dbConfig);

// Menguji koneksi database & Membuat tabel otomatis saat startup
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Gagal terhubung ke MariaDB:', err.message);
    } else {
        console.log('✅ Berhasil terhubung ke MariaDB di IP ' + dbConfig.host);
        
        // Membuat tabel contoh jika belum ada
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pesan VARCHAR(255) NOT NULL,
                waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        connection.query(createTableQuery, (error) => {
            if (error) console.error('Gagal membuat tabel:', error.message);
            else console.log('📁 Tabel "logs" siap digunakan.');
        });
        
        connection.release();
    }
});

// --- ENDPOINT API ---

// 1. Endpoint Utama (Test Root)
app.get('/', (req, res) => {
    res.json({
        status: "Success",
        message: "Halo! Backend Express.js Anda berjalan dengan sempurna di dalam Docker Network.",
        vlan_ip: "10.10.10.30"
    });
});

// 2. Endpoint untuk Cek Status Database (Sangat berguna untuk ditest dari Bastion)
app.get('/api/db-status', (req, res) => {
    pool.query('SELECT NOW() AS waktu_database', (err, results) => {
        if (err) {
            return res.status(500).json({ 
                status: "Error", 
                message: "Gagal berkomunikasi dengan database", 
                error: err.message 
            });
        }
        res.json({
            status: "Healthy",
            message: "Koneksi dari Backend ke MariaDB Aman!",
            waktu_server_db: results[0].waktu_database
        });
    });
});

// ROUTE MASUK USER (LOGIN)
app.post('/api/login', (req, res) => {
    const { identifier, password } = req.body; // identifier bisa berupa email atau username

    // Mencari user berdasarkan Email ATAU Username di database
    const query = 'SELECT * FROM users WHERE email = ? OR username = ?';
    db.query(query, [identifier, identifier], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Terjadi gangguan koneksi database." });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: "Akun tidak ditemukan. Silakan daftar dahulu." });
        }

        const user = results[0];

        // 🔒 MEMBANDINGKAN PASSWORD: Mencocokkan password input dengan hash di database
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            res.status(200).json({ message: "Login Berhasil!", user: { username: user.username, email: user.email } });
        } else {
            res.status(401).json({ error: "Password yang Anda masukkan salah!" });
        }
    });
});
// Mendengarkan request pada port 3000
app.listen(PORT, () => {
    console.log(`🚀 Server Backend menyala di port ${PORT}`);
});