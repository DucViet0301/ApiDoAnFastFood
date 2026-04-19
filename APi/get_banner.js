const express = require("express");
const router = express.Router();

const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const [data] = await db.query("SELECT * FROM banner");
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
