const express = require("express");
const app = express();

app.use(express.json());

// gọi route
const BannerRouter = require("./APi/get_banner");
const ProductDetailRouter = require("./APi/get_productdetail");

// gắn route
app.use("/banners", BannerRouter);
app.use("/productdetail", ProductDetailRouter); 

// test server
app.get("/", (req, res) => {
  res.send("Server OK");
});
app.use(express.urlencoded({ extended: true }));
// chạy server
app.listen(3000, "0.0.0.0", () => {
  console.log("Server chạy tại http://192.168.28.1:3000");
});