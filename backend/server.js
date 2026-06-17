const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json()); // Agar bisa membaca data format JSON dari form HTML

// Koneksi ke Jaringan Database MariaDB (IP: 10.10.10.20)
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// ROUTE PENDAFTARAN USER (REGISTER)
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // 🔒 PROSES HASHING: Mengacak password dengan tingkat keamanan 10 salt rounds
        const hashedPassword = await bcrypt.hash(password, 10);

        // Memasukkan data ke database dengan password yang SUDAH DIACAK
        const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        db.query(query, [username, email, hashedPassword], (err, result) => {
            if (err) {
                return res.status(500).json({ error: "Gagal menyimpan ke database (Username/Email mungkin sudah ada)." });
            }
            res.status(201).json({ message: "User berhasil terdaftar dengan password terenkripsi!" });
        });
    } catch (error) {
        res.status(500).json({ error: "Terjadi kesalahan internal pada server backend." });
    }
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

// Menjalankan server backend di port internal 3000
app.listen(3000, () => {
    console.log('Backend Express.js berjalan di port 3000...');
});