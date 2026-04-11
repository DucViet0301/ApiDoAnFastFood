const mysql = require("mysql2");

// dùng pool cho ổn định
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "doanappfood",
  // port:'4306'
});

module.exports = db;