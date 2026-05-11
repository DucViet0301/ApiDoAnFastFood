const express = require("express");
const router = express.Router();
const db = require('../db');

router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const [data] = await db.query(`
      SELECT 
        o.id,
        o.total_price,
        o.address,
        o.time,
        o.status,
        o.created_at,
        o.updated_at,
        SUM(od.quantity) AS total_items
      FROM orders o
      JOIN order_details od ON o.id = od.order_id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [userId]);

    res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
router.put('/cancel/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const [[order]] = await db.query(
      'SELECT created_at, status FROM orders WHERE id = ?', [orderId]
    );
    if (!order) return res.status(404).json({ success: false, message: 'Đơn không tồn tại' });

    const diffMinutes = (new Date() - new Date(order.created_at)) / (1000 * 60);
    if (diffMinutes >= 15) {
      return res.status(400).json({ success: false, message: 'Đã quá 15 phút' });
    }

   await db.query(
      `UPDATE orders  SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,[orderId]
    );
    res.status(200).json({ success: true, message: 'Hủy đơn thành công' });

  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/detail/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const [detailRows] = await db.query(`
            SELECT
                o.id AS order_id, o.total_price AS order_total, o.address,
                 o.status, o.note, o.created_at,o.is_dungcu, o.is_tuongca, o.is_tuongot,o.updated_at,
                u.name AS customer_name, u.phone AS phone_number,
                od.id AS order_detail_id, od.quantity, od.price AS unit_price,
                p.id AS product_id, p.name AS product_name, p.image AS product_image, p.is_combo
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            LEFT JOIN order_details od ON od.order_id = o.id
            LEFT JOIN products p ON p.id = od.product_id
            WHERE o.id = ?
        `, [orderId]);

    if (detailRows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const orderDetailIds = [...new Set(detailRows.map(r => r.order_detail_id).filter(Boolean))];
    let comboItemMap = {};
    let sauceMap = {};

    if (orderDetailIds.length > 0) {
      const placeholders = orderDetailIds.map(() => "?").join(",");
      const [comboRows] = await db.query(`
            SELECT 
                od.id AS order_detail_id,
                p2.name AS sub_item_name,
                p2.image AS sub_item_image,
                cbi.quantity AS sub_item_quantity
            FROM order_details od
            INNER JOIN products p 
                ON p.id = od.product_id 
                AND p.is_combo = 1
            INNER JOIN combos cb 
                ON cb.product_id = p.id
            INNER JOIN combo_items cbi 
                ON cbi.combo_id = cb.id
            INNER JOIN products p2 
                ON p2.id = cbi.product_id
            WHERE od.id IN (${placeholders})
        `, orderDetailIds);

      comboRows.forEach(row => {
        if (!comboItemMap[row.order_detail_id]) {
          comboItemMap[row.order_detail_id] = [];
        }

        comboItemMap[row.order_detail_id].push({
          name: row.sub_item_name,
          image: row.sub_item_image,
          quantity: row.sub_item_quantity
        });
      });
      const [sauceRows] = await db.query(`
      SELECT
          os.order_detail_id,
          os.sauce_name,
          (SELECT image FROM product_sauces WHERE name = os.sauce_name LIMIT 1) AS sauce_image,
          SUM(os.quantity) AS total_qty
      FROM order_sauces os
      WHERE os.order_detail_id IN (${placeholders})
      AND os.quantity > 0
      GROUP BY os.order_detail_id, os.sauce_name
  `, orderDetailIds);

      sauceRows.forEach(row => {
        if (!sauceMap[row.order_detail_id]) sauceMap[row.order_detail_id] = [];
        sauceMap[row.order_detail_id].push({
          name: row.sauce_name,
          image: row.sauce_image,
          quantity: row.total_qty
        });
      });
    }
    const first = detailRows[0];
    const result = {
      id: first.order_id,
      total_price: first.order_total,
      address: first.address,
      status: first.status,
      note: first.note,
      is_dungcu: first.is_dungcu?.[0] === 1,
      is_tuongca: first.is_tuongca?.[0] === 1,
      is_tuongot: first.is_tuongot?.[0] === 1,
      created_at: first.created_at,
      updated_at: first.updated_at,
      customer_name: first.customer_name,
      phone_number: first.phone_number,
      products: []
    };

    const seenDetailIds = new Set();
    detailRows.forEach(row => {
      if (!row.order_detail_id || seenDetailIds.has(row.order_detail_id)) return;
      seenDetailIds.add(row.order_detail_id);

      result.products.push({
        product_id: row.product_id,
        name: row.product_name,
        image: row.product_image,
        price: row.unit_price,
        quantity: row.quantity,
        is_combo: row.is_combo === 1,
        item_product: comboItemMap[row.order_detail_id] || [],
        item_sauces: sauceMap[row.order_detail_id] || []
      });
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});
module.exports = router;