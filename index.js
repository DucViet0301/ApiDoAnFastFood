const express = require("express");
const app = express();

app.use(express.json());

// gọi route
const BannerRouter = require("./APi/get_banner");

// gắn route
app.use("/banners", BannerRouter);

// test server
app.get("/", (req, res) => {
  res.send("Server OK");
});

// chạy server
app.listen(3000, "0.0.0.0", () => {
  console.log("Server chạy tại http://192.168.1.6:3000");
});