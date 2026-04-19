const express = require("express")
const router = express.Router();

const db = require('../db');


router.get("/", (request, response) => {
  const sql = "Select * from news"
  db.query(sql, (error, data) => {
    if(error){
      return response.status(500).json({error: errors})
    }
    response.json(data);
  });
})

router.get("/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM news WHERE id = ?";

  db.query(sql, [id], (err, data) => {
    if (err) return res.status(500).json({ error: err });
    res.json(data[0]);
  });
});
module.exports = router;