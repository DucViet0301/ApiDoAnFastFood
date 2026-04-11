const express = require("express");
const route = express.Router();
const db = require("../db");

route.post("/", (req, res) => {
  const idProduct = parseInt(req.body.idProduct);
  const sql = `
    SELECT
      p.id AS product_or_combo_id,
      p.name AS name,
      p.image AS image,
      p.sale_price,
      p.list_price,
      pi.id AS product_item_id, -- Lấy thêm ID để định danh món trong combo
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
  `;

  db.query(sql, [idProduct], (err, rows) => {
    if (err) return res.status(500).json({ err: "Database error", detail: err });
    if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy" });

    const productdetailMap = new Map();

    rows.forEach((row) => {
      const id = row.product_or_combo_id;
<<<<<<< HEAD

      // 1. Khởi tạo object cha nếu chưa có
=======
>>>>>>> 192903404cfd06d506a52bda4445574497ef2afc
      if (!productdetailMap.has(id)) {
        productdetailMap.set(id, {
          id: id,
          name: row.name,
          image: row.image,
          sale_price: row.sale_price,
          list_price: row.list_price,
          item_product: [],
          item_sauces: []
        });
      }

      const currentProduct = productdetailMap.get(id);

<<<<<<< HEAD
      // 2. Thêm món ăn vào combo (Check trùng bằng ID sản phẩm con)
=======
>>>>>>> 192903404cfd06d506a52bda4445574497ef2afc
      if (row.product_item_id) {
        const isProductExist = currentProduct.item_product.some(
          (item) => item.id === row.product_item_id
        );
        if (!isProductExist) {
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
        const isSauceExist = currentProduct.item_sauces.some(
          (sauce) => sauce.name === row.sauce_name
        );
        if (!isSauceExist) {
          currentProduct.item_sauces.push({
            name: row.sauce_name,
            image: row.image_name_sauce,
            price: row.price_name_sauce,
          });
        }
      }
    });

    // Chuyển Map thành Array và dọn dẹp mảng rỗng
    const result = Array.from(productdetailMap.values()).map(item => {
      if (item.item_product.length === 0) delete item.item_product;
      if (item.item_sauces.length === 0) delete item.item_sauces;
      return item;
    });

    res.json(result);
  });
});

module.exports = route;