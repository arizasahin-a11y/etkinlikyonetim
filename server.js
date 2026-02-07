const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

/* =========================
   MIDDLEWARE
   ========================= */

app.use(express.json());
app.use(cors());

// statik dosyalar (html/css/js)
app.use(express.static(__dirname));


/* =========================
   ANA SAYFA (GİZLİ DOSYA)
   index.html YOK
   ========================= */

app.get("/", (req, res) => {
  const gizliDosya = path.join(__dirname, "21012012"); // uzantısız

  if (fs.existsSync(gizliDosya)) {
    res.setHeader("Content-Type", "text/html");
    return res.sendFile(gizliDosya);
  }

  res.send("Sunucu çalışıyor ✅");
});


/* =========================
   ÖRNEK SAYFALAR (varsa)
   ========================= */

app.get("/giris", (req, res) => {
  const dosya = path.join(__dirname, "ogrenci.html");

  if (fs.existsSync(dosya)) {
    return res.sendFile(dosya);
  }

  res.status(404).send("Bulunamadı");
});


/* =========================
   API ROUTES
   ========================= */

function temiz(str) {
  return str ? str.replace(/[^a-zA-Z0-9_-]/g, "") : "";
}


// kayıt
app.post("/calismaKaydet", (req, res) => {
  try {
    const { calismaIsmi, sorular } = req.body;

    const dosya = path.join(__dirname, temiz(calismaIsmi) + ".json");

    fs.writeFileSync(dosya, JSON.stringify(sorular, null, 2));

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});


// sil
app.post("/calismaSil", (req, res) => {
  try {
    const dosya = path.join(__dirname, temiz(req.body.calismaIsmi) + ".json");

    if (fs.existsSync(dosya)) fs.unlinkSync(dosya);

    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});


/* =========================
   PORT (Render uyumlu)
   ========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Sunucu", PORT, "portunda.");
});
