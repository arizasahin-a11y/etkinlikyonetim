const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. PORT AYARI (SSL HATASI İÇİN KESİN ÇÖZÜM) ---
// CodeSandbox'ın atadığı portu kullanır, yoksa 3000'i dener.
const PORT = process.env.PORT || 3000;

// --- 2. GÜVENLİK ---
app.get(/\.html$/, (req, res) => { res.status(403).send("Yasak."); });
app.use(express.static(__dirname, { index: false }));

// --- 3. SAYFA YÖNLENDİRMELERİ ---
app.get("/21012012", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/giris", (req, res) => res.sendFile(path.join(__dirname, "ogrenci.html")));

// Değerlendirme Sayfası
app.get("/degerlendirme", (req, res) => {
  if (fs.existsSync(path.join(__dirname, "degerlendirme.html"))) {
    res.sendFile(path.join(__dirname, "degerlendirme.html"));
  } else {
    res.sendFile(path.join(__dirname, "index.html"));
  }
});

// Ana Sayfa
app.get("/", (req, res) => {
    res.status(403).send("<h1>Giriş Yetkisi Yok. Lütfen özel linki kullanın.</h1>");
});

// --- 4. YARDIMCI FONKSİYONLAR ---
function dosyaIsmiTemizle(isim) { return isim ? isim.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_\- ]/g, "").trim() : ""; }
function sinifIsmiTemizle(isim) { return isim ? isim.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, "") : ""; }
function jsonOku(dosyaYolu) {
  if (!fs.existsSync(dosyaYolu)) return [];
  try { return JSON.parse(fs.readFileSync(dosyaYolu, "utf-8")); } catch (e) { return []; }
}

// --- 5. API İŞLEMLERİ (TÜM ÖZELLİKLER EKLİ) ---

// Değerlendirmeyi Sıfırla
app.post("/degerlendirmeSifirla", (req, res) => {
  try {
    const { dosyaAdi, sinif } = req.body;
    const dosyaYolu = path.join(__dirname, dosyaIsmiTemizle(dosyaAdi) + ".json");
    if (fs.existsSync(dosyaYolu)) {
      let veriler = jsonOku(dosyaYolu);
      let degisti = false;
      veriler.forEach(ogr => {
        if (ogr.sinif === sinif) {
          ogr.puanlar = {};
          ogr.degerlendirme = { toplam: 0, bitti: false };
          degisti = true;
        }
      });
      if(degisti) fs.writeFileSync(dosyaYolu, JSON.stringify(veriler, null, 4), "utf-8");
      res.json({ status: "ok" });
    } else { res.status(404).json({ status: "dosya_yok" }); }
  } catch (e) { res.status(500).json({ status: "error" }); }
});

// Puan Kaydet
app.post("/puanKaydet", (req, res) => {
  const { dosyaAdi, ogrenciNo, sinif, soruIndex, cevapIndex, puan } = req.body;
  const dosyaYolu = path.join(__dirname, dosyaIsmiTemizle(dosyaAdi) + ".json");
  try {
    let veriler = jsonOku(dosyaYolu);
    let ogrenci = veriler.find(x => String(x.ogrenciNo) === String(ogrenciNo));
    if (!ogrenci) { 
        // Öğrenci kaydı yoksa oluştur (Öğrenci panelinden gelmiş olabilir)
        ogrenci = { ogrenciNo: ogrenciNo, sinif: sinif, puanlar: {} };
        veriler.push(ogrenci);
    }
    if (!ogrenci.puanlar) ogrenci.puanlar = {};
    if (!ogrenci.puanlar[soruIndex]) ogrenci.puanlar[soruIndex] = [];
    ogrenci.puanlar[soruIndex][cevapIndex] = parseInt(puan);
    fs.writeFileSync(dosyaYolu, JSON.stringify(veriler, null, 4), "utf-8");
    res.json({ status: "ok" });
  } catch(e) { res.status(500).send(); }
});

// Değerlendirme Bitir
app.post("/degerlendirmeBitir", (req, res) => {
  const { dosyaAdi, ogrenciNo, sinif } = req.body;
  const dosyaYolu = path.join(__dirname, dosyaIsmiTemizle(dosyaAdi) + ".json");
  try {
    let veriler = jsonOku(dosyaYolu);
    let ogrenci = veriler.find(x => String(x.ogrenciNo) === String(ogrenciNo));
    if (ogrenci) {
        let toplam = 0;
        if (ogrenci.puanlar) {
          Object.values(ogrenci.puanlar).forEach((soruDizisi) => {
            if (Array.isArray(soruDizisi)) { 
                soruDizisi.forEach((p) => { if (p) toplam += parseInt(p); }); 
            }
          });
        }
        ogrenci.degerlendirme = { toplam: toplam, bitti: true };
        fs.writeFileSync(dosyaYolu, JSON.stringify(veriler, null, 4), "utf-8");
        res.json({ status: "ok", toplam });
    } else { res.status(404).send(); }
  } catch(e) { res.status(500).send(); }
});

// Arşiv ve Silme İşlemleri
app.post("/calismaKaydet", (req, res) => {
  try {
    const { calismaIsmi, sorular } = req.body;
    const dosyaYolu = path.join(__dirname, dosyaIsmiTemizle(calismaIsmi) + ".json");
    fs.writeFileSync(dosyaYolu, JSON.stringify(sorular, null, 4), "utf-8");
    res.json({ status: "ok" });
  } catch (err) { res.status(500).json({ status: "error" }); }
});

app.post("/calismaSil", (req, res) => {
  try {
    const dosya = dosyaIsmiTemizle(req.body.calismaIsmi) + ".json";
    if (fs.existsSync(path.join(__dirname, dosya))) {
      fs.unlinkSync(path.join(__dirname, dosya));
      res.json({ status: "ok" });
    } else { res.status(404).json({ status: "bulunamadi" }); }
  } catch (e) { res.status(500).json({ status: "error" }); }
});

app.post("/arsivle", (req, res) => {
  try {
    const dosya = dosyaIsmiTemizle(req.body.dosyaIsmi) + ".json";
    if (!fs.existsSync("archive")) fs.mkdirSync("archive");
    if(fs.existsSync(path.join(__dirname, dosya))) {
        fs.renameSync(path.join(__dirname, dosya), path.join(__dirname, "archive", dosya));
        res.json({ status: "ok" });
    } else { res.status(404).json({ status: "dosya_yok" }); }
  } catch (e) { res.status(500).json({ status: "error" }); }
});

app.post("/arsivdenGeriYukle", (req, res) => {
  try {
    const dosya = req.body.dosyaIsmi;
    if(fs.existsSync(path.join(__dirname, "archive", dosya))) {
        fs.renameSync(path.join(__dirname, "archive", dosya), path.join(__dirname, dosya));
        res.json({ status: "ok" });
    } else { res.status(404).json({ status: "dosya_yok" }); }
  } catch (e) { res.status(500).json({ status: "error" }); }
});

// Genel Kayıt
app.post("/kaydet", (req, res) => {
  const { dosyaAdi, veri, sinif, gruplar } = req.body;
  if (sinif && gruplar) {
    const p = path.join(__dirname, sinifIsmiTemizle(sinif) + "Grupları.json");
    try { fs.writeFileSync(p, JSON.stringify(gruplar, null, 4), "utf-8"); return res.json({ status: "ok" }); } 
    catch(e) { return res.status(500).json({ status: "error" }); }
  }
  if (dosyaAdi && veri) {
    const p = path.join(__dirname, dosyaIsmiTemizle(dosyaAdi) + ".json");
    try {
      let mevcut = jsonOku(p);
      const gelenler = Array.isArray(veri) ? veri : [veri];
      gelenler.forEach((yeni) => {
        const idx = mevcut.findIndex(x => (x.ogrenciNo === "AYARLAR" && yeni.ogrenciNo === "AYARLAR") || (String(x.ogrenciNo) === String(yeni.ogrenciNo) && sinifIsmiTemizle(x.sinif) === sinifIsmiTemizle(yeni.sinif)));
        if (idx !== -1) mevcut[idx] = { ...mevcut[idx], ...yeni }; else mevcut.push(yeni);
      });
      fs.writeFileSync(p, JSON.stringify(mevcut, null, 4), "utf-8");
      return res.json({ status: "ok" });
    } catch(e) { return res.status(500).json({ status: "error" }); }
  }
  res.status(400).json({ status: "eksik" });
});

// Listeleme
app.get("/listeCalismalar", (req, res) => { try { res.json(fs.readdirSync(__dirname).filter(f => f.endsWith(".json") && (f.startsWith("qwx")||f.startsWith("qqq")||f.startsWith("www"))).map(f => f.replace(".json", ""))); } catch(e){res.json([]);} });
app.get("/calismaGetir", (req, res) => { try{res.json(jsonOku(path.join(__dirname, dosyaIsmiTemizle(req.query.isim)+".json")));}catch(e){res.status(404).send();} });
app.get("/arsivListesi", (req, res) => { try { if (!fs.existsSync("archive")) fs.mkdirSync("archive"); res.json(fs.readdirSync("archive").filter(f => f.endsWith(".json"))); } catch (e) { res.json([]); } });
app.get("/grupListesiGetir", (req, res) => { res.json(jsonOku(path.join(__dirname, sinifIsmiTemizle(req.query.sinif)+"Grupları.json"))); });

// --- SUNUCUYU BAŞLAT ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sunucu ${PORT} portunda hazır!`);
});