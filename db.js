const mysql = require("mysql2");

// dùng pool cho ổn định
const db = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "doanappfood",
  port: "3306",
});
db.getConnection((err, connection) => {
  if (err) {
    console.log("Lỗi kết nối DB:", err);
  } else {
    console.log("Kết nối DB thành công");
    connection.release();
  }
});

module.exports = db;