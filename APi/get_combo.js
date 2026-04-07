const express = require("express");
const route = express.Router();
const db = require("../db");

route.get("/", (req, res) => {
  const sql = `
      SELECT
      p_combo.id AS combo_id,
      p_combo.name AS combo_name,
      p_combo.image AS combo_image,
      p_combo.sale_price,
      p_combo.list_price,
      ci.quantity,
      p_item.name AS item_name,
      p_item.image AS item_image
      FROM products p_combo
      JOIN combos c On c.product_id = p_combo.id
      JOIN combo_items ci On ci.combo_id = c.id
      JOiN products p_item On p_item.id = ci.product_id
      WHERE p_combo.category_id=2
  `;
  db.query(sql , (err, rows) => {
    if(err){
      return res.status(500).json({error:"Database error", details: err})
    }
    const comboMap = new Map();
    for(let i=0; i < rows.length;i++){
      const row = rows[i];
      const id = row.combo_id;
      if (!comboMap.has(id)){
        comboMap.set(id, {
          id: id,
          name: row.combo_name,
          image: row.combo_image,
          sale_price: row.sale_price,
          list_price:row.list_price,
          items: []
        });
      }
      comboMap.get(id).items.push({
        name: row.item_name,
        image:row.item_image,
        quantity: row.quantity
      });
    }
    res.json(Array.from(comboMap.values()));
  });
});
module.exports = route;