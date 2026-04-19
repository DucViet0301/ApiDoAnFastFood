const express = require("express");
const route = express.Router();
const db = require("../db");

route.post("/", async (req, res)=> {
  try{
    const idCate = parseInt(req.body.idCate);

  if(isNaN(idCate)){
    return res.status(400).json({error: "ID danh muc khong hop le"});
  }
  const [data] = await db.query(`
    SELECT 
     pro.id, 
     pro.image, 
     pro.name, 
     pro.list_price, 
     pro.sale_price  
    FROM products pro
    INNER JOIN categories cate ON cate.id = pro.category_id
    WHERE cate.id = ?
    `, [idCate]);
  const categoryMap = new Map();
    data.forEach((row) => {
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
    res.json(Array.from(categoryMap.values()));
  }
  catch (error){
    return res.status(500).json({error: error.message});
  }
})
module.exports = route;