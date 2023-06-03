// const qrcode = require("qrcode-terminal");
const qrcode = require("qrcode");
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const fs = require("fs");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { phoneNumberFormatter } = require("./helpers/formatter");
// const db = require("./dbdata");
const mysql = require("mysql");
const { resolve } = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  allowEIO3: true,
  transports: ["websocket", "polling"],
  cors: {
    origin: ["http://localhost:8080"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SESSION_FILE_PATH = "./whatsapp-session.json";
let sessionData;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionData = require(SESSION_FILE_PATH);
}

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

app.get("/", (req, res) => {
  // res.sendFile("index.html", {
  //   root: __dirname,
  // });
  const date = new Date();
  const nomor = "081268840626";
  // var sql2 =
  //   "SELECT * FROM record_chat WHERE no_pengirim='" +
  //   nomor +
  //   "' AND created_at BETWEEN " +
  //   date.getFullYear() +
  //   " AND " +
  //   date.setHours(date.getHours());
  // +" ";
  var sql2 =
    "SELECT * FROM record_chat WHERE no_pengirim='" +
    nomor +
    "' AND SUBSTRING(date_time,1,10) = '" +
    date.toJSON().slice(0, 10) +
    "' AND SUBSTRING(date_time, 12, 2) >= " +
    (parseInt(date.getHours()) - 2) +
    " AND SUBSTRING(date_time, 12, 2) <=" +
    date.getHours();

  console.log(sql2);
  // var sql2 = "SELECT * FROM record_chat";

  db.query(sql2, function (err, results) {
    if (err) {
      console.error(
        "Error saat mengambil data dari tabel recordchat: " + err.stack
      );
      return res.status(500).json({
        status: false,
        message: "Terjadi kesalahan saat mengambil data",
        error: err.message,
      });
    }

    // cek jika nomor sebelumnya tidak ada pesan yang masuk maka kirim pesan\
    var pesan = "";
    console.log(results.length);
    if (results.length >= 1) {
      pesan = "Nomor ini sudah ngechat";
    } else {
      // berikan salam pembuka disini
      pesan =
        "Nomor ini belum ngechat dari antara jam " +
        parseInt(date.getHours() - 2) +
        " dan jam " +
        date.getHours();
    }

    res.status(200).send(pesan);

    // res.status(200).json({
    //   status: true,
    //   message: "Berhasil terhubung",
    //   data: results,
    // });
  });

  // res.status(200).json({
  //   status: true,
  //   message: "Berhasil terhubung",
  // });
});

// client.on("qr", (qr) => {
//   console.log("QR diterima", qr);
//   qrcode.generate(qr, { small: true });
// });

// 2. Buat client dengan cara kedua
client.on("authenticated", () => {
  console.log("AUTHENTICATED");
  console.log("Berhasil Connect");
  //   sessionCfg = session;
  //   fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
  //     if (err) {
  //       console.error(err);
  //     }
  //   });
});

//simpan respon pengirim
function responPengirim(idU, nomor, msg) {
  var sql =
    "INSERT INTO record_chat (id_user, no_pengirim, message, response) VALUES ('" +
    idU +
    " ','" +
    nomor +
    "','" +
    msg +
    " ','" +
    1 +
    "')";

  db.query(sql, function (err, result) {
    if (err) throw err;
    console.log("1 record disimpan");
  });

  io.emit("dataPesan", { nomor: nomor, message: msg });
}

// simpan respon penerima
function responPenerima(idU, nomor, msg) {
  var sql =
    "INSERT INTO record_chat (id_user, no_pengirim, message, response) VALUES ('" +
    idU +
    " ','" +
    nomor +
    "','" +
    msg +
    " ','" +
    0 +
    "')";

  db.query(sql, function (err, result) {
    if (err) throw err;
    console.log("1 record disimpan");
  });
  io.emit("dataPesan", { nomor: nomor, message: msg });
}

// menggunakan balasan aja
// client.on("message", (msg) => {
//   let pesan = cekPesan(msg.body);
//   console.log("Pesan dari client : ", msg.body);
//   console.log("Respon pesan adalah : ", pesan);
//   client.sendMessage(msg.from, pesan);
//   // if (msg.body == "tes" || msg.body == "Tes") {
//   //   client.sendMessage(msg.from, "tes balas");
//   // }

//   // insert chat ke dalam database
//   // var sql =
//   //   "INSERT INTO wachat (number, message) VALUES ('" +
//   //   msg.from +
//   //   "','" +
//   //   msg.body +
//   //   "')";
//   // db.query(sql, function (err, result) {
//   //   if (err) throw err;
//   //   console.log("1 record disimpan");
//   // });
// });

client.on("message", async (msg) => {
  var sql = "SELECT * FROM autoreply";
  let respon2 = msg.body;
  let nomor = msg.from;
  const date = new Date();
  let nomorBaru = nomor.replace("62", "0").replace("@c.us", ""); // 08xxxxxxx

  var sql2 =
    "SELECT * FROM record_chat WHERE no_pengirim='" +
    nomorBaru +
    "' AND SUBSTRING(date_time,1,10) = '" +
    date.toJSON().slice(0, 10) +
    "' AND SUBSTRING(date_time, 12, 2) >= " +
    (date.getHours() - 2) +
    // (parseInt(date.getHours()) - 2) +
    " AND SUBSTRING(date_time, 12, 2) <=" +
    date.getHours();

  var responUser = "";

  // let nomorBaru = nomor.replace("62", "0").replace("@c.us", ""); // 08xxxxxxx

  // responPengirim(1, nomorBaru, msg.body);

  // query data autoreply
  // db.query(sql, function (err, results) {
  //   if (err) {
  //     console.error(
  //       "Error saat mengambil data dari tabel autoreply: " + err.stack
  //     );
  //     return res.status(500).json({
  //       status: false,
  //       message: "Terjadi kesalahan saat mengambil data",
  //       error: err.message,
  //     });
  //   }

  //   var dataPesan = "";
  //   var dataPesan2 = [];
  //   var respon = [];
  //   var responUser = "";
  //   for (let i = 0; i < results.length; i++) {
  //     dataPesan = results[i]["pesan"];
  //     dataPesan2.push(results[i]["pesan"]);
  //     respon.push(results[i]["response"]);
  //   }
  //   for (let i = 0; i < dataPesan2.length; i++) {
  //     if (msg.body.toLowerCase() == dataPesan2[i].toLowerCase()) {
  //       responUser = respon[i];
  //       // client.sendMessage(nomor, responUser);
  //       break;
  //     } else {
  //       // console.log("salah");
  //       responUser =
  //         "Selamat Datang di Sinergi 360 \nSilahkan Jelaskan Permasalahan Anda Dengan Detail \nKami Siap Membantu Anda Dalam Menyelesaikan Masalah";
  //       // client.sendMessage(nomor, responUser);
  //     }
  //     console.log("Kalimat berubah kecil : " + dataPesan2[i]);
  //   }
  //   client.sendMessage(nomor, responUser);

  //   // tes index
  //   // console.log("Data pesan adalah " + dataPesan2[3]);
  //   console.log("Respon User adalah " + responUser.toLowerCase());

  //   console.log("Pesan dari client : ", msg.body.toLowerCase());

  //   // mengembalikan format nomor kenomor biasa
  //   let nomorBaru = nomor.replace("62", "0").replace("@c.us", ""); // 08xxxxxxx

  //   // let respon = cekPesan(msg.body);
  //   // client.sendMessage(nomor, responUser);
  //   console.log("Balasan " + responUser);

  //   // cek jika nomor nya pribadi, baru save kedalam db
  //   if (msg.from.includes("@c.us")) {
  //     // responPengirim(1, nomorBaru, msg.body);
  //     console.log("Data tersimpan berupa @c.us");
  //   } else {
  //     console.log("Nomor berasal tidak dari @c.us \n" + msg.from);
  //   }

  //   // debug fungsi
  //   console.log(dataRecord("Halo", nomorBaru));

  //   console.log(nomorBaru + " " + msg.body);
  // });

  // query data record chat
  db.query(sql2, function (err, results) {
    if (err) {
      console.error(
        "Error saat mengambil data dari tabel recordchat: " + err.stack
      );
      return res.status(500).json({
        status: false,
        message: "Terjadi kesalahan saat mengambil data",
        error: err.message,
      });
    }

    // console.log(
    //   "Data yang kurang dari waktu yang ditentukan " + results[0]["message"]
    // );
    // cek jika nomor sebelumnya tidak ada pesan yang masuk maka kirim pesan
    if (results.length >= 1) {
      console.log(
        "Data yang kurang dari waktu yang ditentukan " + results.length
      );
      db.query(sql, function (err, results) {
        if (err) {
          console.error(
            "Error saat mengambil data dari tabel autoreply: " + err.stack
          );
          return res.status(500).json({
            status: false,
            message: "Terjadi kesalahan saat mengambil data",
            error: err.message,
          });
        }

        var dataPesan = "";
        var dataPesan2 = [];
        var respon = [];
        // var responUser = "";
        for (let i = 0; i < results.length; i++) {
          dataPesan = results[i]["pesan"];
          dataPesan2.push(results[i]["pesan"]);
          respon.push(results[i]["response"]);
        }
        for (let i = 0; i < dataPesan2.length; i++) {
          if (msg.body.toLowerCase() == dataPesan2[i].toLowerCase()) {
            responUser = respon[i];
            client.sendMessage(nomor, responUser);
            break;
          } else {
            console.log("Else dijalankan");
            // responUser =
            //   "Selamat Datang di Sinergi 360 \nSilahkan Jelaskan Permasalahan Anda Dengan Detail \nKami Siap Membantu Anda Dalam Menyelesaikan Masalah";
            // client.sendMessage(nomor, responUser);
          }
          // console.log("Kalimat berubah kecil : " + dataPesan2[i]);
        }
        // client.sendMessage(nomor, responUser);

        // tes index
        // console.log("Data pesan adalah " + dataPesan2[3]);
        // console.log("Respon User adalah " + responUser.toLowerCase());

        // console.log("Pesan dari client : ", msg.body.toLowerCase());

        // mengembalikan format nomor kenomor biasa
        // let nomorBaru = nomor.replace("62", "0").replace("@c.us", ""); // 08xxxxxxx

        // let respon = cekPesan(msg.body);
        // client.sendMessage(nomor, responUser);
        // console.log("Balasan " + responUser);

        // cek jika nomor nya pribadi, baru save kedalam db
        if (msg.from.includes("@c.us")) {
          responPengirim(1, nomorBaru, msg.body);
          console.log("Data tersimpan berupa @c.us");
        } else {
          console.log("Nomor berasal tidak dari @c.us \n" + msg.from);
        }

        // debug fungsi
        // console.log(dataRecord("Halo", nomorBaru));
        console.log("Data baru : " + nomorBaru + " " + msg.body);
        // console.log(nomorBaru + " " + msg.body);
      });
    } else {
      db.query(
        "SELECT * FROM autoreply WHERE id_pesan = 0",
        function (err, results) {
          if (err) {
            console.error(
              "Error saat mengambil data dari tabel autoreply: " + err.stack
            );
            return res.status(500).json({
              status: false,
              message: "Terjadi kesalahan saat mengambil data",
              error: err.message,
            });
          }
          var responDua = results[0]["response"];
          console.log("Isi Dari Respon Dua adalah " + responDua);
          client.sendMessage(nomor, responDua);
          // client.sendMessage(nomor, results[0]["response"]);

          console.log("Pesan pembuka " + results[0]["response"]);
          // var responUser = "";
          // for (let i = 0; i < results.length; i++) {
          //   responUser = results[i];
          //   client.sendMessage(nomor, responUser);
          // }
        }
      );
      // console.log("Data yang dikirim " + msg.from + " respnse " + responUser);
    }

    responPengirim(1, nomorBaru, msg.body);
  });
});

client.initialize();

// Koneksi socket io
// jika ada client yang konek ke server dikasih trigger
io.on("connection", function (socket) {
  socket.emit("message", "Terhubung");

  client.on("qr", (qr) => {
    console.log("QR dikirim", qr);
    // qrcode.generate(qr, { small: true });
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit("qr", url);
      socket.emit("message", "QR diterima");
    });
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
  database: "symox_ci",
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
  // const number = phoneNumberFormatter(req.body.number);
  const number = req.body.number.replace("0", "62") + "@c.us";
  console.log(number);
  const message = req.body.message;
  const idUser = req.body.id_user;
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

  // ubah adri format nomor menjadi nomor biasa
  console.log(
    req.body.number + " dari send message " + message + " IdUser : " + idUser
  );
  const nomor = req.body.number;

  // simpan message dari user kedalam db
  responPenerima(idUser, nomor, message);
});

server.listen(8000, function () {
  console.log("App running on port *:" + 8000);
});
