const express = require("express");
const app = express();
require('dotenv').config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// gọi route
const BannerRouter = require("./APi/get_banner");
const ProductDetailRouter = require("./APi/get_productdetail");
const ComboRouter = require("./APi/get_combo");
const NewRouter = require("./APi/get_new");
const CategoryRouter = require("./APi/get_category");
const ProductRouter = require("./APi/get_product");
const StoreRouter = require("./APi/store_router");
const PromotionNewsRouter = require("./APi/get_promotionnews");

// gắn route
app.use("/banners", BannerRouter);
app.use("/productdetails", ProductDetailRouter);
app.use("/combos", ComboRouter);
app.use("/news", NewRouter);
app.use("/category", CategoryRouter);
app.use("/products", ProductRouter);
app.use("/stores", StoreRouter);
app.use("/promotionnews", PromotionNewsRouter);

// test server
app.get("/", (req, res) => {
  res.send("Server OK");
});

// chạy server
app.listen(3000, "0.0.0.0", () => {
  console.log("Server chạy tại http://192.168.1.6:3000");
});