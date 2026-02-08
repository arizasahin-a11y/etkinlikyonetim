const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// --- ÖZEL YÖNLENDİRMELER (ROUTING) ---

// 1. Öğretmen Paneli
app.get("/21012012", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 2. Öğrenci Paneli
app.get("/giris", (req, res) => {
  res.sendFile(path.join(__dirname, "ogrenci.html"));
});

app.use(
  express.static(__dirname, {
    index: false,
    extensions: ["html"], // Bu satır /degerlendirme isteğini arka planda /degerlendirme.html yapar
  })
);

// 4. Ana Dizin
app.get("/", (req, res) => {
  res.status(403).send(`
        <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
            <h1 style="color:red;">Yanlış Link Girdiniz</h1>
            <p>Lütfen size iletilen özel giriş bağlantısını kullanın.</p>
        </div>
    `);
});

app.use(express.static(__dirname, { index: false }));

// --- YARDIMCI FONKSİYONLAR ---
function dosyaIsmiTemizle(isim) {
  if (!isim) return "";
  return isim.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_\- ]/g, "").trim();
}

function sinifIsmiTemizle(isim) {
  if (!isim) return "";
  return isim.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, "");
}

function jsonOku(dosyaYolu) {
  if (!fs.existsSync(dosyaYolu)) return [];
  try {
    const veri = fs.readFileSync(dosyaYolu, "utf-8");
    return veri ? JSON.parse(veri) : [];
  } catch (e) {
    console.error("Dosya okuma hatası:", dosyaYolu, e);
    return [];
  }
}

// --- API ENDPOINT'LERİ ---
app.post("/kaydet", (req, res) => {
  const { dosyaAdi, veri, sinif, gruplar } = req.body;
  if (sinif && gruplar) {
    const dosyaYolu = path.join(
      __dirname,
      sinifIsmiTemizle(sinif) + "Grupları.json"
    );
    try {
      fs.writeFileSync(dosyaYolu, JSON.stringify(gruplar, null, 4), "utf-8");
      return res.json({ status: "ok" });
    } catch (err) {
      return res.status(500).json({ status: "error" });
    }
  }
  if (dosyaAdi && veri) {
    const dosyaYolu = path.join(
      __dirname,
      dosyaIsmiTemizle(dosyaAdi) + ".json"
    );
    try {
      let mevcut = jsonOku(dosyaYolu);
      const gelenler = Array.isArray(veri) ? veri : [veri];
      gelenler.forEach((yeni) => {
        const idx = mevcut.findIndex(
          (x) =>
            (x.ogrenciNo === "AYARLAR" && yeni.ogrenciNo === "AYARLAR") ||
            (String(x.ogrenciNo) === String(yeni.ogrenciNo) &&
              sinifIsmiTemizle(x.sinif) === sinifIsmiTemizle(yeni.sinif))
        );
        if (idx !== -1) mevcut[idx] = { ...mevcut[idx], ...yeni };
        else mevcut.push(yeni);
      });
      fs.writeFileSync(dosyaYolu, JSON.stringify(mevcut, null, 4), "utf-8");
      return res.json({ status: "ok" });
    } catch (err) {
      return res.status(500).json({ status: "error" });
    }
  }
  res.status(400).json({ status: "eksik" });
});

app.post("/puanKaydet", (req, res) => {
  const { dosyaAdi, ogrenciNo, sinif, soruIndex, cevapIndex, puan } = req.body;
  const dosyaYolu = path.join(__dirname, dosyaIsmiTemizle(dosyaAdi) + ".json");
  try {
    let veriler = jsonOku(dosyaYolu);
    let ogrenci = veriler.find(
      (x) => String(x.ogrenciNo) === String(ogrenciNo)
    );
    if (!ogrenci) {
      ogrenci = { ogrenciNo: ogrenciNo, sinif: sinif, puanlar: {} };
      veriler.push(ogrenci);
    }
    if (!ogrenci.puanlar) ogrenci.puanlar = {};
    if (!ogrenci.puanlar[soruIndex]) ogrenci.puanlar[soruIndex] = [];
    ogrenci.puanlar[soruIndex][cevapIndex] = parseInt(puan);
    fs.writeFileSync(dosyaYolu, JSON.stringify(veriler, null, 4), "utf-8");
    res.json({ status: "ok" });
  } catch (e) {
    res.status(500).send();
  }
});

app.post("/degerlendirmeBitir", (req, res) => {
  const { dosyaAdi, ogrenciNo, sinif } = req.body;
  const dosyaYolu = path.join(__dirname, dosyaIsmiTemizle(dosyaAdi) + ".json");
  try {
    let veriler = jsonOku(dosyaYolu);
    let ogrenci = veriler.find(
      (x) => String(x.ogrenciNo) === String(ogrenciNo)
    );
    if (!ogrenci) {
      ogrenci = { ogrenciNo: ogrenciNo, sinif: sinif, puanlar: {} };
      veriler.push(ogrenci);
    }
    let toplam = 0;
    if (ogrenci.puanlar) {
      Object.values(ogrenci.puanlar).forEach((soruDizisi) => {
        if (Array.isArray(soruDizisi)) {
          soruDizisi.forEach((p) => {
            if (p) toplam += parseInt(p);
          });
        }
      });
    }
    ogrenci.degerlendirme = { toplam: toplam, bitti: true };
    fs.writeFileSync(dosyaYolu, JSON.stringify(veriler, null, 4), "utf-8");
    res.json({ status: "ok", toplam });
  } catch (e) {
    res.status(500).send();
  }
});

app.get("/listeCalismalar", (req, res) => {
  try {
    const files = fs
      .readdirSync(__dirname)
      .filter(
        (f) =>
          f.endsWith(".json") &&
          (f.startsWith("qwx") || f.startsWith("qqq") || f.startsWith("www"))
      )
      .map((f) => f.replace(".json", ""));
    res.json(files);
  } catch (e) {
    res.json([]);
  }
});

app.get("/calismaGetir", (req, res) => {
  try {
    res.json(
      jsonOku(path.join(__dirname, dosyaIsmiTemizle(req.query.isim) + ".json"))
    );
  } catch (e) {
    res.status(404).send();
  }
});

app.get("/grupListesiGetir", (req, res) => {
  const p = path.join(
    __dirname,
    sinifIsmiTemizle(req.query.sinif) + "Grupları.json"
  );
  res.json(jsonOku(p));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sunucu ${PORT} portunda hazır!`);
});
