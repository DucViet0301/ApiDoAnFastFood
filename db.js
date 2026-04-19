const mysql = require("mysql2/promise");


// dùng pool cho ổn định
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "doanappfood",
});

module.exports = db;