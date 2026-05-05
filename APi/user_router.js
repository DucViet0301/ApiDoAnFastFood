const express = require('express');
const router = express.Router();
const db = require('../db'); 
const nodemailer = require('nodemailer');
require('dotenv').config();

// --- CẤU HÌNH GỬI EMAIL ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

const otpStorage = {}; 

// ---(ĐĂNG KÝ / ĐĂNG NHẬP) ---
router.post("/register", async (req, res) => {
    const { name, phone, email, password, birth_date } = req.body;
    let dbDate = null;
    if (birth_date) {
        const parts = birth_date.split(/[-/.]/); 
        if (parts.length === 3) {
            dbDate = `${parts[2]}-${parts[1]}-${parts[0]}`; 
        } else { dbDate = birth_date; }
    }
    try {
        const [results] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (results.length > 0) {
            return res.json({ success: false, message: "Email này đã được đăng ký!" });
        } else {
            const sqlInsert = "INSERT INTO users (name, phone, email, password, birth_date) VALUES (?, ?, ?, ?, ?)";
            await db.query(sqlInsert, [name, phone, email, password, dbDate]); 
            res.json({ success: true, message: "Đăng ký thành công!" });
        }
    } catch (err) { return res.status(500).json({ success: false, message: "Lỗi Server!" }); }
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
        const [results] = await db.query(sql, [email, password]);
        if (results.length > 0) {
            let user = results[0];
            if (user.birth_date) {
                const d = new Date(user.birth_date);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                user.birth_date = `${day}.${month}.${year}`; 
            }
            res.json({ success: true, message: "Đăng nhập thành công!", user: user });
        } else { res.json({ success: false, message: "Sai Email hoặc Mật khẩu!" }); }
    } catch (err) { return res.status(500).json({ success: false, message: "Lỗi Server!" }); }
});

// --- API MỚI: GỬI MÃ OTP ---
router.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: "Không tìm thấy Email!" });

    // Sinh ngẫu nhiên mã 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStorage[email] = otp; // Lưu tạm vào RAM

    const mailOptions = {
        from: 'Lotteria App CSKH',
        to: email,
        subject: 'Mã xác nhận Đổi mật khẩu Lotteria',
        text: `Xin chào,\nMã OTP để đổi mật khẩu của bạn là: ${otp}\nVui lòng không chia sẻ mã này cho bất kỳ ai.\n\nLotteria Vietnam.`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "Đã gửi mã OTP đến Email của bạn!" });
    } catch (error) {
        console.log("LỖI GỬI MAIL:", error);
        res.json({ success: false, message: "Lỗi khi gửi email, kiểm tra lại cấu hình!" });
    }
});

// --- API MỚI: XÁC NHẬN VÀ ĐỔI MẬT KHẨU ---
router.post("/change-password", async (req, res) => {
    console.log("NHẬN YÊU CẦU ĐỔI PASS CHO EMAIL:", req.body.email, "MÃ OTP:", req.body.otp);
    const { email, otp, newPassword } = req.body;

    // 1. Kiểm tra OTP
    if (otpStorage[email] !== otp) {
        console.log("=> SAI OTP! Mã trong máy:", otpStorage[email], "Mã user nhập:", otp);
        return res.json({ success: false, message: "Mã OTP không chính xác hoặc đã hết hạn!" });
    }

    // 2. OTP đúng -> Cập nhật Database
    try {
        const sqlUpdate = "UPDATE users SET password = ? WHERE email = ?";
        await db.query(sqlUpdate, [newPassword, email]);
        
        delete otpStorage[email]; // Xóa OTP sau khi dùng xong
        console.log("=> ĐỔI PASS THÀNH CÔNG CHO:", email);
        res.json({ success: true, message: "Đổi mật khẩu thành công!" });
    } catch (error) {
        console.log("=> LỖI UPDATE DATABASE:", error);
        res.status(500).json({ success: false, message: "Lỗi Server!" });
    }
});
// --- API MỚI: QUÊN MẬT KHẨU - GỬI OTP ---
router.post("/forgot-password-send-otp", async (req, res) => {
    const { email } = req.body;

    try {
        // 1. Soi Database xem email này có tồn tại không?
        const sqlCheck = "SELECT * FROM users WHERE email = ?";
        const [users] = await db.query(sqlCheck, [email]);
        
        if (users.length === 0) {
            console.log("=> TỪ CHỐI: Email chưa đăng ký!", email);
            return res.json({ success: false, message: "Email này chưa được đăng ký trong hệ thống!" });
        }

        // 2. Nếu email có thật -> Tạo và gửi mã OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStorage[email] = otp;

        const mailOptions = {
            from: 'Lotteria App CSKH',
            to: email, // Gửi về đúng email họ vừa nhập
            subject: 'Mã Khôi Phục Mật Khẩu Lotteria',
            text: `Bạn đang yêu cầu khôi phục mật khẩu. Mã OTP của bạn là: ${otp}`
        };

        await transporter.sendMail(mailOptions);
        console.log("=> ĐÃ GỬI MÃ KHÔI PHỤC CHO:", email);
        res.json({ success: true, message: "Mã OTP đã được gửi đến email của bạn!" });

    } catch (error) {
        console.log("=> LỖI QUÊN PASS:", error);
        res.status(500).json({ success: false, message: "Lỗi Server!" });
    }
});

module.exports = router;