const express  = require('express');
const db       = require('../db');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const router   = express.Router();

router.post('/', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Thiếu thông tin đăng nhập' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, name, phone, email, address, birth_date, password
       FROM users
       WHERE phone = ? OR email = ?`,
      [login, login]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Sai thông tin đăng nhập' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Sai thông tin đăng nhập' });
    }

    // Access token — hết hạn nhanh
    const token = jwt.sign(
      { id: user.id, name: user.name, phone: user.phone, email: user.email },
      process.env.JWT_SECRET || 'secret_key_mac_dinh_123', 
      { expiresIn: '1h' }
    );

    // 2. Tạo Refresh Token - Thêm giá trị dự phòng
    const refresh_token = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'refresh_key_mac_dinh_456',
      { expiresIn: '7d' }
    );

    // 3. Lưu refresh token vào DB
    await db.query(
      'UPDATE users SET refresh_token = ? WHERE id = ?',
      [refresh_token, user.id]
    );

    const { password: _, ...userWithoutPassword } = user;

    // 4. QUAN TRỌNG: Trả về đúng tên trường mà App Android đang đợi
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token: token,             // Đổi từ accessToken thành token
      refresh_token: refresh_token, // Đổi từ refreshToken thành refresh_token
      user: userWithoutPassword
    });

  } catch (err) {
    console.error('LỖI LOGIN:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;