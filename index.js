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
const LoginRouter = require("./APi/login");
const RegisterRouter = require("./APi/register");
const RefreshTokenRouter = require("./APi/refresh_token");
const PostOrderRouter = require("./APi/post_order");
const PostPaymentRouter = require("./APi/post_payment");
const chatbot = require("./APi/chatbox_ai");
const UserRouter = require("./APi/user_router");

// gắn route
app.use("/banners", BannerRouter);
app.use("/productdetails", ProductDetailRouter);
app.use("/combos", ComboRouter);
app.use("/orders", PostOrderRouter);
app.use("/payment", PostPaymentRouter);
app.use("/news", NewRouter);
app.use("/category", CategoryRouter);
app.use("/products", ProductRouter);
app.use("/stores", StoreRouter);
app.use("/promotionnews", PromotionNewsRouter);
app.use("/login", LoginRouter);
app.use("/register", RegisterRouter);
app.use("/refresh-token", RefreshTokenRouter);
app.use("/chatbot", chatbot);
app.use("/users", UserRouter);


// test server
app.get("/", (req, res) => {
  res.send("Server OK");
});
app.use(express.urlencoded({ extended: true }));
// chạy server
app.listen(3000, "0.0.0.0", () => {
  console.log("Server chạy tại http://192.168.28.1:3000");
});