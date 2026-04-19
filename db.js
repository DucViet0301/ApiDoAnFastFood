const mysql = require("mysql2/promise");


// dùng pool cho ổn định
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "doanappfood",
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