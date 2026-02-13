const express = require("express");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg"); // PostgreSQL kütüphanesi

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. PORT VE VERİTABANI AYARLARI ---
const PORT = process.env.PORT || 3000;

// Render veritabanı bağlantısı
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Render için gerekli güvenlik ayarı
  }
});

// --- 2. TABLO OLUŞTURMA (Otomatik) ---
// Sunucu her başladığında tablo var mı diye kontrol eder
const tabloyuHazirla = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS json_files (
        dosya_adi TEXT PRIMARY KEY,
        icerik JSONB,
        arsivde BOOLEAN DEFAULT FALSE
      );
    `);
    console.log("Veritabanı tablosu hazır.");
  } catch (err) {
    console.error("Tablo oluşturma hatası:", err);
  }
};
tabloyuHazirla();

// --- 3. GÜVENLİK VE SAYFALAR ---

// EKLENEN KISIM: Yönetim paneline özel izin (Yasaklamadan önce çalışır)
app.get("/admin.html", (req, res) => res.sendFile(path.join(__dirname, "admin.html")));

// Diğer tüm .html dosyalarına doğrudan erişimi engelle
app.get(/\.html$/, (req, res) => { res.status(403).send("Yasak."); });
app.use(express.static(__dirname, { index: false }));

app.get("/21012012", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/giris", (req, res) => res.sendFile(path.join(__dirname, "ogrenci.html")));

// Değerlendirme Sayfası
app.get("/degerlendirme", (req, res) => {
    res.sendFile(path.join(__dirname, "degerlendirme.html"), (err) => {
        if (err) res.sendFile(path.join(__dirname, "index.html"));
    });
});

app.get("/", (req, res) => {
    res.status(403).send("<h1>Giriş Yetkisi Yok. Lütfen özel linki kullanın.</h1>");
});

// --- 4. YARDIMCI FONKSİYONLAR (VERİTABANI VERSİYONU) ---

function dosyaIsmiTemizle(isim) { return isim ? isim.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_\- ]/g, "").trim() : ""; }
function sinifIsmiTemizle(isim) { return isim ? isim.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, "") : ""; }

// Veritabanından Veri Okuma
async function dbOku(dosyaAdi) {
    try {
        const result = await pool.query('SELECT icerik FROM json_files WHERE dosya_adi = $1', [dosyaAdi]);
        if (result.rows.length > 0) {
            return result.rows[0].icerik;
        }
        return []; // Dosya yoksa boş dizi dön
    } catch (e) {
        console.error("DB Okuma Hatası:", e);
        return [];
    }
}

// Veritabanına Veri Yazma (Varsa günceller, yoksa oluşturur)
async function dbYaz(dosyaAdi, data, arsivDurumu = false) {
    try {
        await pool.query(`
            INSERT INTO json_files (dosya_adi, icerik, arsivde)
            VALUES ($1, $2, $3)
            ON CONFLICT (dosya_adi)
            DO UPDATE SET icerik = $2, arsivde = $3;
        `, [dosyaAdi, JSON.stringify(data), arsivDurumu]);
    } catch (e) {
        console.error("DB Yazma Hatası:", e);
        throw e;
    }
}

// --- 5. API İŞLEMLERİ (POSTGRESQL ENTEGRASYONU) ---

// Değerlendirmeyi Sıfırla
app.post("/degerlendirmeSifirla", async (req, res) => {
  try {
    const { dosyaAdi, sinif } = req.body;
    const dosyaKey = dosyaIsmiTemizle(dosyaAdi);
    
    let veriler = await dbOku(dosyaKey);
    if (veriler.length > 0) {
      let degisti = false;
      veriler.forEach(ogr => {
        if (ogr.sinif === sinif) {
          ogr.puanlar = {};
          ogr.degerlendirme = { toplam: 0, bitti: false };
          degisti = true;
        }
      });
      if(degisti) await dbYaz(dosyaKey, veriler);
      res.json({ status: "ok" });
    } else { res.status(404).json({ status: "dosya_yok" }); }
  } catch (e) { res.status(500).json({ status: "error" }); }
});

// Puan Kaydet
app.post("/puanKaydet", async (req, res) => {
  const { dosyaAdi, ogrenciNo, sinif, soruIndex, cevapIndex, puan } = req.body;
  const dosyaKey = dosyaIsmiTemizle(dosyaAdi);
  
  try {
    let veriler = await dbOku(dosyaKey); // DB'den oku
    
    // Veri boş gelirse (ilk kayıt) diziye çevir
    if (!Array.isArray(veriler)) veriler = [];

    let ogrenci = veriler.find(x => String(x.ogrenciNo) === String(ogrenciNo));
    if (!ogrenci) { 
        ogrenci = { ogrenciNo: ogrenciNo, sinif: sinif, puanlar: {} };
        veriler.push(ogrenci);
    }
    if (!ogrenci.puanlar) ogrenci.puanlar = {};
    if (!ogrenci.puanlar[soruIndex]) ogrenci.puanlar[soruIndex] = [];
    ogrenci.puanlar[soruIndex][cevapIndex] = parseInt(puan);
    
    await dbYaz(dosyaKey, veriler); // DB'ye yaz
    res.json({ status: "ok" });
  } catch(e) { res.status(500).send(e.message); }
});

// Değerlendirme Bitir
app.post("/degerlendirmeBitir", async (req, res) => {
  const { dosyaAdi, ogrenciNo, sinif } = req.body;
  const dosyaKey = dosyaIsmiTemizle(dosyaAdi);
  try {
    let veriler = await dbOku(dosyaKey);
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
        await dbYaz(dosyaKey, veriler);
        res.json({ status: "ok", toplam });
    } else { res.status(404).send(); }
  } catch(e) { res.status(500).send(); }
});

// Arşiv ve Silme İşlemleri
app.post("/calismaKaydet", async (req, res) => {
  try {
    const { calismaIsmi, sorular } = req.body;
    const dosyaKey = dosyaIsmiTemizle(calismaIsmi);
    await dbYaz(dosyaKey, sorular);
    res.json({ status: "ok" });
  } catch (err) { res.status(500).json({ status: "error" }); }
});

app.post("/calismaSil", async (req, res) => {
  try {
    const dosyaKey = dosyaIsmiTemizle(req.body.calismaIsmi);
    await pool.query('DELETE FROM json_files WHERE dosya_adi = $1', [dosyaKey]);
    res.json({ status: "ok" });
  } catch (e) { res.status(500).json({ status: "error" }); }
});

app.post("/arsivle", async (req, res) => {
  try {
    const dosyaKey = dosyaIsmiTemizle(req.body.dosyaIsmi);
    await pool.query('UPDATE json_files SET arsivde = TRUE WHERE dosya_adi = $1', [dosyaKey]);
    res.json({ status: "ok" });
  } catch (e) { res.status(500).json({ status: "error" }); }
});

app.post("/arsivdenGeriYukle", async (req, res) => {
  try {
    const dosyaKey = req.body.dosyaIsmi;
    await pool.query('UPDATE json_files SET arsivde = FALSE WHERE dosya_adi = $1', [dosyaKey]);
    res.json({ status: "ok" });
  } catch (e) { res.status(500).json({ status: "error" }); }
});

// Genel Kayıt
app.post("/kaydet", async (req, res) => {
  const { dosyaAdi, veri, sinif, gruplar } = req.body;
  
  try {
    if (sinif && gruplar) {
        const grupKey = sinifIsmiTemizle(sinif) + "Grupları";
        await dbYaz(grupKey, gruplar);
        return res.json({ status: "ok" });
    }
    
    if (dosyaAdi && veri) {
        const dosyaKey = dosyaIsmiTemizle(dosyaAdi);
        let mevcut = await dbOku(dosyaKey);
        
        if (!Array.isArray(mevcut)) mevcut = [];

        const gelenler = Array.isArray(veri) ? veri : [veri];
        gelenler.forEach((yeni) => {
            const idx = mevcut.findIndex(x => (x.ogrenciNo === "AYARLAR" && yeni.ogrenciNo === "AYARLAR") || (String(x.ogrenciNo) === String(yeni.ogrenciNo) && sinifIsmiTemizle(x.sinif) === sinifIsmiTemizle(yeni.sinif)));
            if (idx !== -1) mevcut[idx] = { ...mevcut[idx], ...yeni }; else mevcut.push(yeni);
        });
        
        await dbYaz(dosyaKey, mevcut);
        return res.json({ status: "ok" });
    }
    res.status(400).json({ status: "eksik" });
  } catch(e) { res.status(500).json({ status: "error" }); }
});

// Listeleme (DB'den sorgulama)
app.get("/listeCalismalar", async (req, res) => { 
    try { 
        const result = await pool.query("SELECT dosya_adi FROM json_files WHERE arsivde = FALSE");
        const dosyalar = result.rows
            .map(row => row.dosya_adi)
            .filter(f => f.startsWith("qwx")||f.startsWith("qqq")||f.startsWith("www"));
        res.json(dosyalar); 
    } catch(e){ res.json([]); } 
});

app.get("/calismaGetir", async (req, res) => { 
    try {
        const veri = await dbOku(dosyaIsmiTemizle(req.query.isim));
        res.json(veri);
    } catch(e){ res.status(404).send(); } 
});

app.get("/arsivListesi", async (req, res) => { 
    try { 
        const result = await pool.query("SELECT dosya_adi FROM json_files WHERE arsivde = TRUE");
        res.json(result.rows.map(r => r.dosya_adi)); 
    } catch (e) { res.json([]); } 
});

app.get("/grupListesiGetir", async (req, res) => { 
    try {
        const grupKey = sinifIsmiTemizle(req.query.sinif) + "Grupları";
        const veri = await dbOku(grupKey);
        res.json(veri);
    } catch(e) { res.json([]); }
});

// --- SUNUCUYU BAŞLAT ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sunucu ${PORT} portunda hazır!`);
// --- YÖNETİM PANELİ İÇİN ÖZEL API ---
app.get("/yonetimDosyaListesi", async (req, res) => {
    try {
        // Tüm dosyaların adını ve arşiv durumunu getir (Filtresiz)
        const result = await pool.query("SELECT dosya_adi, arsivde FROM json_files ORDER BY dosya_adi ASC");
        res.json(result.rows);
    } catch (e) { res.json([]); }
});
});