const express = require('express');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const router  = express.Router();

router.post('/', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Thiếu refresh token' });
  }

  try {
    // Kiểm tra refresh token có hợp lệ không
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Kiểm tra refresh token có khớp trong DB không
    const [rows] = await db.query(
      'SELECT * FROM users WHERE id = ? AND refresh_token = ?',
      [decoded.id, refreshToken]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token không hợp lệ' });
    }

    const user = rows[0];

    // Cấp access token mới
    const newAccessToken = jwt.sign(
      { id: user.id, name: user.name, phone: user.phone, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      accessToken: newAccessToken
    });

  } catch (err) {
    return res.status(401).json({ error: 'Refresh token hết hạn hoặc không hợp lệ' });
  }
});

module.exports = router;