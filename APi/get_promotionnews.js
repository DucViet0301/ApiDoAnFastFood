const express = require("express")
const router = express.Router();

const db = require('../db');


router.get("/", async (request, response) => {
  try {
    const [data] = await db.query("Select * from promotion_news");
    response.json(data);
  }
  catch (error) {
    return response.status(500).json({ error: error.message });
  }
})

router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const [data] = await db.query("SELECT * FROM news WHERE id = ?", [id]);
    res.json(data[0]);
  }
  catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
module.exports = router;