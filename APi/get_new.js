const express = require("express")
const router = express.Router();

const db = require('../db');


router.get("/", (require, response) => {
  const sql = "Select * from news"
  db.query(sql, (error, data) => {
    if(error){
      return response.status(500).json({error: errors})
    }
    response.json(data);
  });
})
module.exports = router;