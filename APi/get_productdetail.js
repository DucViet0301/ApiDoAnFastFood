const express = require("express");
const route = express.Router();
const db = require("../db");

route.post("/", async (req, res) => {
  try {
    const idProduct = Number(req.body.idProduct);

    if (!idProduct) {
      return res.status(400).json({ message: "idProduct không hợp lệ" });
    }

    const [data] = await db.query(`
      SELECT
        p.id AS product_or_combo_id,
        p.name AS name,
        p.image AS image,
        p.sale_price,
        p.is_combo,
        p.list_price,
        pi.id AS product_item_id,
        pi.name AS product_name,
        pi.image AS product_image,
        ci.quantity AS quantity,
        ps.name AS sauce_name,
        ps.price AS price_name_sauce,
        ps.image AS image_name_sauce
      FROM products p
      LEFT JOIN combos c ON p.is_combo = 1 AND c.product_id = p.id
      LEFT JOIN combo_items ci ON ci.combo_id = c.id
      LEFT JOIN products pi ON ci.product_id = pi.id
      LEFT JOIN product_sauces ps ON ps.product_id = COALESCE(pi.id, p.id)
      WHERE p.id = ?;
    `, [idProduct]);

    if (data.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy" });
    }

    const productdetailMap = new Map();

    data.forEach((row) => {
      const id = row.product_or_combo_id;

      if (!productdetailMap.has(id)) {
        productdetailMap.set(id, {
          id,
          name: row.name,
          image: row.image,
          sale_price: row.sale_price,
          list_price: row.list_price,
          is_combo: row.is_combo === 1,
          item_product: [],
          item_sauces: []
        });
      }

      const currentProduct = productdetailMap.get(id);
      if (row.product_item_id) {
        const exists = currentProduct.item_product.some(
          (item) => item.id === row.product_item_id
        );

        if (!exists) {
          currentProduct.item_product.push({
            id: row.product_item_id,
            name: row.product_name,
            image: row.product_image,
            quantity: row.quantity
          });
        }
      }

      // 3. Thêm nước sốt (Check trùng bằng tên nước sốt)
      if (row.sauce_name) {
        const exists = currentProduct.item_sauces.some(
          (s) => s.name === row.sauce_name
        );

        if (!exists) {
          currentProduct.item_sauces.push({
            name: row.sauce_name,
            image: row.image_name_sauce,
            price: row.price_name_sauce
          });
        }
      }
    });

    const result = Array.from(productdetailMap.values()).map(item => {
      if (item.item_product?.length === 0) delete item.item_product;
      if (item.item_sauces?.length === 0) delete item.item_sauces;
      return item;
    });

    res.json(result);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = route;