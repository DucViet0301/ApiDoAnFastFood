// APi/store_router.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const axios = require("axios");

router.get("/", (req, res) => {
  db.query("SELECT id, name, lat, lng FROM stores", (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(data);
  });
});

router.get("/nearest", (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "Thiếu lat và lng" });

  const sql = `
    SELECT id, name, lat, lng,
    (6371 * ACOS(
      COS(RADIANS(?)) * COS(RADIANS(lat)) *
      COS(RADIANS(lng) - RADIANS(?)) +
      SIN(RADIANS(?)) * SIN(RADIANS(lat))
    )) AS distance_km
    FROM stores ORDER BY distance_km ASC LIMIT 1
  `;
  db.query(sql, [parseFloat(lat), parseFloat(lng), parseFloat(lat)], (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!data.length) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(data[0]);
  });
});

router.get("/direction", async (req, res) => {
  const { fromLat, fromLng, toLat, toLng } = req.query;
  if (!fromLat || !fromLng || !toLat || !toLng)
    return res.status(400).json({ error: "Thiếu tham số" });

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}`;
    const response = await axios.get(url, {
      params: { overview: "full", geometries: "polyline", steps: false }
    });

    if (response.data.code !== "Ok" || !response.data.routes.length)
      return res.status(404).json({ error: "Không tìm thấy đường đi" });

    const route = response.data.routes[0];
    res.json({
      distance_text: `${(route.distance / 1000).toFixed(1)} km`,
      distance_value: route.distance,
      duration_text: `${Math.ceil(route.duration / 60)} phút`,
      duration_value: route.duration,
      polyline: route.geometry,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;