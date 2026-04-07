const express = require("express");
const router = express.Router();
const db = require('../db');

router.get("/", (req, res) => {
  const sql = "SELECT * FROM banner";

  db.query(sql, (error, data) => {
    if (error) {
      return res.status(500).json({ error: error.message }); 
    }

    return res.json(data); 
  });
});

module.exports = router;
