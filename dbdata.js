const mysql = require("mysql");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "teswa",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Berhasil terhubung ke database");
});
