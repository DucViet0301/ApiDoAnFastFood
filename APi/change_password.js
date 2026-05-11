const express = require('express'); const db = require('../db');
const bcrypt = require('bcryptjs'); // Đảm bảo dùng chung bcryptjs với login.js
const jwt = require('jsonwebtoken');
const router = express.Router();

// Middleware xác thực (Dùng chung secret với login.js)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Bạn chưa đăng nhập" });

    jwt.verify(token, process.env.JWT_SECRET || 'secret_key_mac_dinh_123', (err, user) => {
        if (err) return res.status(403).json({ error: "Phiên đăng nhập hết hạn" });
        req.user = user;
        next();
    });
};

router.post('/', authenticateToken, async (req, res) => {
    // Android gửi: oldPassword và newPassword
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' });
    }

    try {
        // 1. Lấy mật khẩu hiện tại trong DB
        const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return res.status(404).json({ error: 'User không tồn tại' });

        const user = rows[0];

        // 2. Kiểm tra mật khẩu cũ (BẮT BUỘC dùng bcrypt.compare)
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Mật khẩu cũ không chính xác' });
        }

        // 3. MÃ HÓA MẬT KHẨU MỚI (Dùng await để đảm bảo xong mới lưu)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // DEBUG: Xem mã băm mới có khác mã cũ không
        console.log("Mật khẩu mới đã băm:", hashedPassword);

        // 4. Cập nhật vào DB
        // QUAN TRỌNG: Phải truyền hashedPassword vào đây, không được truyền newPassword
        const [result] = await db.query(
            'UPDATE users SET password = ?, refresh_token = NULL WHERE id = ?',
            [hashedPassword, userId]
        );

        if (result.affectedRows > 0) {
            res.json({
                success: true,
                message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại!'
            });
        } else {
            res.status(500).json({ error: 'Không thể cập nhật mật khẩu' });
        }

    } catch (err) {
        console.error('LỖI ĐỔI MẬT KHẨU:', err);
        res.status(500).json({ error: 'Lỗi hệ thống: ' + err.message });
    }
});

module.exports = router;