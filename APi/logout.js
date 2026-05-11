const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Middleware xác thực để biết ai đang yêu cầu đăng xuất
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Chưa có token" });

    jwt.verify(token, process.env.JWT_SECRET || 'secret_key_mac_dinh_123', (err, user) => {
        if (err) return res.status(403).json({ error: "Token không hợp lệ" });
        req.user = user;
        next();
    });
};

router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Xóa refresh_token trong Database
        await db.query(
            'UPDATE users SET refresh_token = NULL WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: 'Đã đăng xuất khỏi hệ thống và hủy token.'
        });

    } catch (err) {
        console.error('LỖI LOGOUT:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;