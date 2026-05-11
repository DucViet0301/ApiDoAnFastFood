const express = require("express");
const route = express.Router();
const db = require("../db");

route.post("/", async (req, res) => {
  let connection;
    try {
        connection = await db.getConnection();
        await handleOrder(connection, req, res, true);
    } catch (err) {
        return res.status(500).json({ 
            success: false,
            error: "Không kết nối được database: " + err.message 
        });
    }
});

async function handleOrder(conn, req, res, useRelease = false) {
  try {
    const {
      user_id,
      address,
      payment_method,
      time_delivery,
      sale_total,
      note,
      distance,
      utensils,
      ketchup,
      chili,
      cart_items,
      momo_success
    } = req.body;

    if (!address || !payment_method || !cart_items || cart_items.length === 0) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    await conn.query("START TRANSACTION");

    const [orderResult] = await conn.query(
      `INSERT INTO orders 
        (user_id, total_price, status, address, time, note, distance, is_dungcu, is_tuongca, is_tuongot, created_at, updated_at)
       VALUES (?, ?, 'Đang xử lý', ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        user_id || null,
        sale_total,
        address,
        time_delivery?.toString() || null,
        note || "",
        distance || null,
        utensils ? 1 : 0,
        ketchup ? 1 : 0,
        chili ? 1 : 0
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of cart_items) {
      const { product_id, quantity, sale_price, list_price, sauces } = item;

      const [detailResult] = await conn.query(
        `INSERT INTO order_details (order_id, product_id, quantity, price)
         VALUES (?, ?, ?, ?)`,
        [orderId, product_id, quantity, sale_price ?? list_price]
      );

      const orderDetailId = detailResult.insertId;

      if (sauces && sauces.length > 0) {
        for (const sauce of sauces) {
          await conn.query(
            `INSERT INTO order_sauces (order_detail_id, sauce_name, quantity)
             VALUES (?, ?, ?)`,
            [orderDetailId, sauce.name, sauce.quantity ?? 1]
          );
        }
      }
    }

    const isMomo = payment_method === "Ví MoMo";
    const paymentStatus = !isMomo
      ? "Chưa thanh toán"
      : momo_success
        ? "Đã thanh toán"
        : "Thanh toán thất bại";
    await conn.query(
      `INSERT INTO payments (order_id, method, status, amount, created_at)
   VALUES (?, ?, ?, ?, NOW())`,
      [orderId, payment_method, paymentStatus, sale_total]
    );

    await conn.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công",
      order_id: orderId
    });

  } catch (error) {
    await conn.query("ROLLBACK").catch(() => {});
    return res.status(500).json({ error: error.message });
  } finally {
    if (useRelease && conn.release) conn.release();
  }
}

module.exports = route;