const express = require("express");
const route = express.Router();
const db = require("../db");

route.post("/", (req, res)=> {
  const idCate = parseInt(req.body.idCate);

  if(isNaN(idCate)){
    return res.status(400).json({error: "ID danh muc khong hop le"});
  }
  const sql = `
            SELECT 
                      pro.id, 
                      pro.image, 
                      pro.name, 
                      pro.list_price, 
                      pro.sale_price  
                  FROM products pro
                  INNER JOIN categories cate ON cate.id = pro.category_id
                  WHERE cate.id = ?
            `;
  db.query(sql , [idCate], (err, rows) => {
    if(err){
      return res.status(500).json({error: "Databse error", detail: err});
    }
    const categoryMap = new Map();
    rows.forEach((row) => {
      if(!categoryMap.has(row.id)){
        categoryMap.set(row.id, {
          id: row.id,
          name: row.name,
          image: row.image,
          list_price: row.list_price,
          sale_price: row.sale_price,
        });
      }
    });
    const result = Array.from(categoryMap.values());
    res.json(result);
  })
})
module.exports = route;