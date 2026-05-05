const express  = require('express');
const db       = require('../db');
const bcrypt   = require('bcryptjs');
const router   = express.Router();

router.post('/', async (req, res) => {
  const { name, phone, email, password, address, birth_date } = req.body;

  // Kiểm tra trường bắt buộc
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin bắt buộc' });
  }

  try {
    // Kiểm tra phone hoặc email đã tồn tại chưa
    const [existing] = await db.query(
      'SELECT id FROM users WHERE phone = ? OR email = ?',
      [phone, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Số điện thoại hoặc email đã được đăng ký' });
    }

    // Hash password bằng BCrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Thêm user mới — created_at DB tự điền
    const [result] = await db.query(
      `INSERT INTO users (name, phone, email, password, address, birth_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, phone, email, hashedPassword, address || null, birth_date || null]
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      user: {
        id: result.insertId,
        name,
        phone,
        email,
        address,
        birth_date
      }
    });

  } catch (err) {
    console.error('LỖI ĐĂNG KÝ:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;