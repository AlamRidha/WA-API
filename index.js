const qrcode = require("qrcode-terminal");
// const qrcode = require("qrcode");
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const fs = require("fs");
const { Client, LocalAuth, LegacySessionAuth } = require("whatsapp-web.js");
const { phoneNumberFormatter } = require("./helpers/formatter");
// const db = require("./dbdata");
const mysql = require("mysql");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SESSION_FILE_PATH = "./whatsapp-session.json";
let sessionData;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionData = require(SESSION_FILE_PATH);
}

// 1. Buat Client cara pertama
// const client = new Client();

// 2. Buat Client cara kedua
// const client = new Client({
//   puppeteer: { headless: true },
//   authStrategy: new LocalAuth(),
// });
const client = new Client({
  restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process", // <- this one doesn't works in Windows
      "--disable-gpu",
    ],
  },
  authStrategy: new LocalAuth(),
});

// 3. Buat Client cara ketiga
// const client = new Client({
//   authStrategy: new LegacySessionAuth({
//     session: sessionData,
//   }),
// });

app.get("/", (req, res) => {
  res.sendFile("index.html", {
    root: __dirname,
  });
  //   res.status(200).json({
  //     status: true,
  //     message: "Berhasil terhubung",
  //   });
});

// client.on("qr", (qr) => {
//   console.log("QR diterima", qr);
//   qrcode.generate(qr, { small: true });
// });

// 2. Buat client dengan cara kedua
client.on("authenticated", () => {
  console.log("AUTHENTICATED");
  //   sessionCfg = session;
  //   fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
  //     if (err) {
  //       console.error(err);
  //     }
  //   });
});

// 3. Buat client dengan cara ketiga
// client.on("authenticated", (session) => {
//   sessionData = session;
//   fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
//     if (err) {
//       console.error(err);
//     }
//   });
// });

// client.on("ready", () => {
//   console.log("Client siap!");
// });

// menggunakan reply dari pesan seseorang
// client.on("message", (msg) => {
//   console.log(msg.body);
//   if (msg.body == "tes") {
//     msg.reply("tes balas");
//   }
// });

// menggunakan balasan aja
client.on("message", (msg) => {
  console.log("Pesan dari client : ", msg.body);
  if (msg.body == "tes" || msg.body == "Tes") {
    client.sendMessage(msg.from, "tes balas");
  }

  // insert chat ke dalam database
  var sql =
    "INSERT INTO wachat (number, message) VALUES ('" +
    msg.from +
    "','" +
    msg.body +
    "')";
  db.query(sql, function (err, result) {
    if (err) throw err;
    console.log("1 record disimpan");
  });
});

client.initialize();

// Koneksi socket io
// jika ada client yang konek ke server dikasih trigger
io.on("connection", function (socket) {
  socket.emit("message", "Terhubung");

  client.on("qr", (qr) => {
    console.log("QR dikirim", qr);
    qrcode.generate(qr, { small: true });
    // qrcode.toDataURL(qr, (err, url) => {
    //   socket.emit("qr", url);
    //   socket.emit("message", "QR diterima");
    // });
  });

  client.on("ready", () => {
    console.log("Client siap!");
  });
});

// koneksi database
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

// end koneksi database

// send message
app.post("/send-message", async (req, res) => {
  //   const number = req.body.number;
  //   const message = req.body.message;
  const number = phoneNumberFormatter(req.body.number);
  const message = req.body.message;
  client
    .sendMessage(number, message)
    .then((response) => {
      res.status(200).json({
        status: true,
        response: response,
      });
    })
    .catch((err) => {
      res.status(500).json({
        status: false,
        response: err,
      });
    });

  // insert chat ke dalam database
  var sql =
    "INSERT INTO wachat (number, message) VALUES ('" +
    number +
    "','" +
    message +
    "')";
  db.query(sql, function (err, result) {
    if (err) throw err;
    console.log("1 record disimpan");
  });
});

server.listen(8000, function () {
  console.log("App running on port *:" + 8000);
});
