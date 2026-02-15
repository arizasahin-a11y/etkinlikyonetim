const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { query } = require("./db");
require("dotenv").config();

const app = express();

app.use(express.json({ limit: '50mb' })); // Increased limit just in case
app.use(cors());

// --- 1. PORT AYARI ---
const PORT = process.env.PORT || 3000;

// --- 2. GÜVENLİK ---
// Exception for degerlendirme.html to prevent "Yasak" if accessed directly
// Exception for degerlendirme.html: Serve directly instead of redirecting
app.get("/degerlendirme.html", (req, res) => res.sendFile(path.join(__dirname, "degerlendirme.html")));

app.get(/\.html$/, (req, res) => { res.status(403).send("Yasak."); });
app.use(express.static(__dirname, { index: false }));

// --- 3. SAYFA YÖNLENDİRMELERİ ---
app.get("/21012012", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/giris", (req, res) => res.sendFile(path.join(__dirname, "ogrenci.html")));
// GÜVENLİK: Admin paneli gizli url
app.get("/727812", (req, res) => res.sendFile(path.join(__dirname, "admin.html")));

// Değerlendirme Sayfası
app.get("/degerlendirme", (req, res) => {
  if (require("fs").existsSync(path.join(__dirname, "degerlendirme.html"))) {
    res.sendFile(path.join(__dirname, "degerlendirme.html"));
  } else {
    res.sendFile(path.join(__dirname, "index.html"));
  }
});

// Ana Sayfa
app.get("/", (req, res) => {
  res.status(403).send("<h1>Giriş Yetkisi Yok. Lütfen özel linki kullanın.</h1>");
});

// Dynamic `veritabani.json` - Will be handled by the endpoint at line 670

// --- 4. YARDIMCI FONKSİYONLAR ---
function dosyaIsmiTemizle(isim) { return isim ? isim.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_\- ]/g, "").trim() : ""; }
function sinifIsmiTemizle(isim) { return isim ? isim.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, "") : ""; }

function logToFile(msg) {
  const logLine = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    require('fs').appendFileSync(require('path').join(__dirname, 'debug_server.log'), logLine);
  } catch (e) { console.error("Log Error:", e); }
}

// --- 5. API İŞLEMLERİ (SQL UYARLAMASI) ---

// ... (Other endpoints) ...

app.get("/grupListesiGetir", async (req, res) => {
  const rawSinif = req.query.sinif;
  const rawCalisma = req.query.calisma || ""; // New parameter
  const normalizedSinif = sinifIsmiTemizle(rawSinif);
  const normalizedCalisma = dosyaIsmiTemizle(rawCalisma);

  // Helper to check File System
  const checkFileSystem = () => {
    // New Format: ggg[Study][Class].json
    // Legacy Format: [Class]Grupları.json

    let pathsToCheck = [];
    if (normalizedCalisma) {
      pathsToCheck.push({
        path: path.join(__dirname, `ggg${normalizedCalisma}${normalizedSinif}.json`),
        type: "study-specific"
      });
    }
    // Always check legacy as fallback if specific not found? 
    // Or only if calisma is empty?
    // User wants SPECIFIC groups for study. If not found, maybe empty?
    // But let's keep legacy for backward compat if calisma not provided.
    pathsToCheck.push({
      path: path.join(__dirname, `${normalizedSinif}Grupları.json`),
      type: "legacy"
    });

    for (const p of pathsToCheck) {
      console.log(`[grupListesiGetir] Checking FS: ${p.path} (${p.type})`);
      if (require("fs").existsSync(p.path)) {
        console.log(`[grupListesiGetir] Found FILE: ${p.path}`);
        try {
          const content = JSON.parse(require("fs").readFileSync(p.path, 'utf-8'));

          // Fire-and-forget lazy migration
          const studyVal = (p.type === "study-specific" && rawCalisma) ? rawCalisma : "GENEL";
          query(`
            INSERT INTO class_groups (class_name, study_name, groups_data) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (class_name, study_name) 
            DO UPDATE SET groups_data = $3
          `, [rawSinif, studyVal, content]).catch(err => console.error("Lazy Migration Fail:", err.message));

          return content;
        } catch (e) { console.error("FS Parse Error:", e); }
      }
    }
    return [];
  };

  try {
    // 1. Try DB
    let rows = [];
    try {
      // If calisma provided, try to find specific group
      if (rawCalisma) {
        const resSpecific = await query("SELECT groups_data FROM class_groups WHERE class_name = $1 AND study_name = $2", [rawSinif, rawCalisma]);
        if (resSpecific.rows.length > 0) {
          rows = resSpecific.rows[0].groups_data || [];
        }
      }

      // If not found specific (or no calisma), try GENEL (Legacy in DB)
      if (rows.length === 0) {
        const resGenel = await query("SELECT groups_data FROM class_groups WHERE class_name = $1 AND study_name = 'GENEL'", [rawSinif]);
        if (resGenel.rows.length > 0 && !rawCalisma) {
          // Only return GENEL if no specific study was requested, OR if we decide to fallback.
          // Requirement says: "artık hangi çalışma için olduğunu da belirlemek gerekiyor"
          // So if study is requested but not found, we should probably return empty or handle explicitly.
          // But for now, let's strictly return empty if study was requested but not found in DB.
          // Wait, checkFileSystem might find it.
          rows = resGenel.rows[0].groups_data || [];
        }
      }

    } catch (dbErr) {
      console.error("DB Error (Ignored for fallback):", dbErr.message);
    }

    if (rows.length > 0) {
      console.log(`[grupListesiGetir] Found in DB.`);
      res.json(rows);
    } else {
      // 2. Fallback to FS
      const fileData = checkFileSystem();
      res.json(fileData);
    }
  } catch (e) {
    console.error("General Error:", e);
    res.json([]);
  }
});

// Değerlendirmeyi Sıfırla
app.post("/degerlendirmeSifirla", async (req, res) => {
  try {
    const { dosyaAdi, sinif } = req.body;
    // dosyaAdi = "www_StudyName", we need StudyName
    const studyName = dosyaAdi.replace("www_", "");

    // Find study ID
    const studyRes = await query("SELECT id FROM studies WHERE name = $1", [studyName]);
    if (studyRes.rows.length === 0) return res.status(404).json({ status: "dosya_yok" });
    const studyId = studyRes.rows[0].id;

    // Reset evaluation for all students in this class for this study
    await query(`
        UPDATE student_evaluations 
        SET scores = '{}', evaluation = '{"toplam": 0, "bitti": false}'::jsonb 
        WHERE study_id = $1 AND class_name = $2
    `, [studyId, sinif]);

    res.json({ status: "ok" });
  } catch (e) { console.error(e); res.status(500).json({ status: "error" }); }
});

// Puan Kaydet
app.post("/puanKaydet", async (req, res) => {
  const { dosyaAdi, ogrenciNo, sinif, soruIndex, cevapIndex, puan } = req.body;
  const studyName = dosyaAdi.replace("www_", "");

  try {
    // Get study ID
    const studyRes = await query("SELECT id FROM studies WHERE name = $1", [studyName]);
    if (studyRes.rows.length === 0) return res.status(404).send();
    const studyId = studyRes.rows[0].id;

    // Fetch existing scores
    const evalRes = await query(
      "SELECT scores FROM student_evaluations WHERE study_id = $1 AND student_school_no = $2",
      [studyId, String(ogrenciNo)]
    );

    let scores = {};
    if (evalRes.rows.length > 0) {
      scores = evalRes.rows[0].scores || {};
    } else {
      // Should exist if logged in, but just in case
      await query(
        "INSERT INTO student_evaluations (study_id, student_school_no, class_name, scores) VALUES ($1, $2, $3, $4::jsonb)",
        [studyId, String(ogrenciNo), sinif, '{}']
      );
    }

    if (!scores[soruIndex]) scores[soruIndex] = [];
    scores[soruIndex][cevapIndex] = parseInt(puan);

    // JSON.stringify for PostgreSQL JSONB
    const scoresJson = JSON.stringify(scores);

    await query(
      "UPDATE student_evaluations SET scores = $1::jsonb WHERE study_id = $2 AND student_school_no = $3",
      [scoresJson, studyId, String(ogrenciNo)]
    );

    res.json({ status: "ok" });
  } catch (e) { console.error(e); res.status(500).send(); }
});

// Değerlendirme Bitir
app.post("/degerlendirmeBitir", async (req, res) => {
  const { dosyaAdi, ogrenciNo, sinif, toplam } = req.body;
  const studyName = dosyaAdi.replace("www_", "");

  try {
    const studyRes = await query("SELECT id FROM studies WHERE name = $1", [studyName]);
    if (studyRes.rows.length === 0) return res.status(404).send();
    const studyId = studyRes.rows[0].id;

    const evaluation = { toplam: toplam || 0, bitti: true };
    const evaluationJson = JSON.stringify(evaluation);

    // AUTO-CREATE student entry if it doesn't exist (UPSERT)
    // First ensure the student exists in the students table
    await query(`INSERT INTO students (school_no, name, class_name) VALUES ($1, $2, $3) ON CONFLICT (school_no) DO NOTHING`, [String(ogrenciNo), 'Bilinmiyor', sinif || '']);

    await query(`
      INSERT INTO student_evaluations (study_id, student_school_no, class_name, evaluation, last_updated)
      VALUES ($1, $2, $3, $4::jsonb, NOW())
      ON CONFLICT (study_id, student_school_no) 
      DO UPDATE SET evaluation = $4::jsonb, last_updated = NOW()
    `, [studyId, String(ogrenciNo), sinif, evaluationJson]);

    res.json({ status: "ok", toplam: toplam || 0 });
  } catch (e) { console.error(e); res.status(500).send(); }
});

app.post("/tumCevaplariTemizle", async (req, res) => {
  try {
    const { calismaIsmi } = req.body; // e.g., "www_OrnekCalisma"

    // Extract real study name
    // "www_" prefix handling
    const cleanName = calismaIsmi.replace(/^www_/, "").replace(/\.json$/, "");

    const studyRes = await query("SELECT id FROM studies WHERE name = $1", [cleanName]);

    if (studyRes.rows.length === 0) {
      // Study not found? 
      // It might be a legacy file-based cleaning request, but we are fully DB now?
      // If DB doesn't have it, nothing to delete from DB.
      return res.json({ status: "ok", message: "Study not found in DB, nothing deleted." });
    }

    const studyId = studyRes.rows[0].id;

    // Delete all evaluations for this study
    await query("DELETE FROM student_evaluations WHERE study_id = $1", [studyId]);

    res.json({ status: "ok" });
  } catch (e) {
    console.error("Tum cevaplari temizle hatasi:", e);
    res.status(500).json({ status: "error", message: e.message });
  }
});

// Arşiv ve Silme İşlemleri
app.post("/calismaKaydet", async (req, res) => { // Covers "calismaKaydet" (Creating/Updating Study and Assignment)
  try {
    const { calismaIsmi, sorular } = req.body;

    // Check if it's an assignment (qqq prefixed or logic id)
    // Legacy: qqq + className + studyName
    if (calismaIsmi.startsWith("qqq")) {
      // It's an assignment!
      // { id, sinif, calisma, yontem, gorme, yapma, degerl, sure, bitis }
      const assignment = sorular;
      const studyName = assignment.calisma;

      const studyRes = await query("SELECT id FROM studies WHERE name = $1", [studyName]);
      if (studyRes.rows.length === 0) return res.status(404).json({ status: "calisma_yok" });
      const studyId = studyRes.rows[0].id;

      console.log(`[calismaKaydet] Request for assignment: ${calismaIsmi}`);
      console.log(`[calismaKaydet] Setup: aciklama=${assignment.aciklamaIzni}, soru=${assignment.soruIzni}`);

      const settings = {
        gorme: assignment.gorme || false,
        aciklamaIzni: assignment.aciklamaIzni || false, // Explicit false
        soruIzni: assignment.soruIzni || false,         // Explicit false
        yapma: assignment.yapma || false,
        degerl: assignment.degerl || false,
        sure: assignment.sure || 0,
        bitis: assignment.bitis || null
      };

      // JSON.stringify for PostgreSQL JSONB
      const settingsJson = JSON.stringify(settings);

      const qRes = await query(`
            INSERT INTO study_assignments (study_id, class_name, method, settings)
            VALUES ($1, $2, $3, $4::jsonb)
            ON CONFLICT (study_id, class_name) 
            DO UPDATE SET method = $3, settings = $4::jsonb
            RETURNING *
        `, [studyId, assignment.sinif, assignment.yontem, settingsJson]);

      console.log(`✅ [qqq Kaydet] DB Update Result ID: ${qRes.rows[0].id}`);

    } else {
      // It's a study definition (qwx prefixed in legacy, just name here)
      // FIX: Ensure we strip 'qwx' if sent by frontend
      const name = calismaIsmi.replace(/^qwx/, "").replace(".json", "");
      const content = sorular; // { aciklama, sorular }

      // JSON.stringify for PostgreSQL JSONB
      const contentJson = JSON.stringify(content);

      await query(`
            INSERT INTO studies (name, content)
            VALUES ($1, $2::jsonb)
            ON CONFLICT (name) 
            DO UPDATE SET content = $2::jsonb
        `, [name, contentJson]);

      console.log(`✅ [qwx Kaydet] Study kaydedildi: ${name}`);
    }

    res.json({ status: "ok" });
  } catch (err) { console.error(err); res.status(500).json({ status: "error" }); }
});

// Grupları Kaydet
app.post("/kaydet", async (req, res, next) => {
  try {
    // Case 1: Groups (from index.html)
    // Case 1: Groups (from index.html)
    if (req.body.sinif && req.body.gruplar) {
      const { sinif, gruplar, calisma } = req.body;
      const groupsJson = JSON.stringify(gruplar);
      const studyName = calisma || "GENEL";

      await query(`
                INSERT INTO class_groups (class_name, study_name, groups_data)
                VALUES ($1, $2, $3::jsonb)
                ON CONFLICT (class_name, study_name) 
                DO UPDATE SET groups_data = $3::jsonb
            `, [sinif, studyName, groupsJson]);

      // File System Backup
      // Format: ggg[Study][Class].json
      if (calisma) {
        const fn = `ggg${dosyaIsmiTemizle(calisma)}${sinifIsmiTemizle(sinif)}.json`;
        fs.writeFileSync(path.join(__dirname, fn), JSON.stringify(gruplar, null, 2));
      } else {
        // Legacy
        const fn = `${sinifIsmiTemizle(sinif)}Grupları.json`;
        fs.writeFileSync(path.join(__dirname, fn), JSON.stringify(gruplar, null, 2));
      }

      console.log(`✅ [Gruplar Kaydet] Sınıf: ${sinif}, Çalışma: ${studyName}, Grup Sayısı: ${gruplar.length}`);
      return res.json({ status: "ok" });
    }

    // Case 2: Admin File Upload (e.g., studies)
    if (req.body.dosyaAdi && req.body.veri) {
      const { dosyaAdi, veri } = req.body;

      // www_ files are handled by the SECOND /kaydet handler below
      if (dosyaAdi.startsWith('www_')) {
        return next(); // Pass to second /kaydet handler
      }

      console.log(`[Admin Upload] ${dosyaAdi}`);

      // If it's a study file (starts with qwx or just handled as study)
      // Check if it matches study naming convention? 
      // Admin usually uploads study files (qwx....json)

      if (dosyaAdi.startsWith('qwx') || dosyaAdi.endsWith('.json')) {
        const name = dosyaAdi.replace(/^qwx/, "").replace(".json", "");
        const contentJson = JSON.stringify(veri);

        await query(`
                INSERT INTO studies (name, content)
                VALUES ($1, $2::jsonb)
                ON CONFLICT (name) 
                DO UPDATE SET content = $2::jsonb
            `, [name, contentJson]);

        console.log(`✅ [Admin Upload] Study saved/updated: ${name}`);
        return res.json({ status: "ok" });
      }
    }

    return res.status(400).json({ status: "hata", message: "Geçersiz veri veya format." });

  } catch (e) {
    console.error("Grup kaydet hatası:", e);
    res.status(500).json({ status: "hata", message: e.message });
  }
});


// SUNUCUYU YENİDEN BAŞLAT
app.post("/restart", (req, res) => {
  res.json({ status: "ok", message: "Sunucu yeniden başlatılıyor..." });

  // Spawn a new instance of the server
  const { spawn } = require("child_process");
  const subprocess = spawn(process.argv[0], process.argv.slice(1), {
    detached: true,
    stdio: "ignore"
  });
  subprocess.unref();

  // Kill the current instance
  setTimeout(() => {
    process.exit();
  }, 1000);
});

app.post("/calismaSil", async (req, res) => {
  try {
    let { calismaIsmi } = req.body;
    // Normalize: remove .json extension if present
    const cleanIsim = calismaIsmi.replace(".json", "");

    if (cleanIsim.startsWith("qwx")) {
      // 1. DELETE STUDY (and all related data)
      const name = cleanIsim.replace("qwx", "");

      const studyRes = await query("SELECT id FROM studies WHERE name = $1", [name]);
      if (studyRes.rows.length > 0) {
        const studyId = studyRes.rows[0].id;
        // Manual Cascade
        await query("DELETE FROM student_evaluations WHERE study_id = $1", [studyId]);
        await query("DELETE FROM study_assignments WHERE study_id = $1", [studyId]);
        await query("DELETE FROM studies WHERE id = $1", [studyId]);
      }

    } else if (cleanIsim.startsWith("qqq")) {
      // 2. DELETE ASSIGNMENT (for specific class)
      const allAssignments = await query(`
            SELECT a.id, s.name as study_name, a.class_name, a.study_id 
            FROM study_assignments a 
            JOIN studies s ON a.study_id = s.id
        `);

      const target = allAssignments.rows.find(row => {
        const constructedId = "qqq" + row.class_name.replace(/\s/g, '') + row.study_name;
        return constructedId === cleanIsim;
      });

      if (target) {
        // Delete evaluations for this specific class and study
        await query("DELETE FROM student_evaluations WHERE study_id = $1 AND class_name = $2", [target.study_id, target.class_name]);
        // Delete the assignment itself
        await query("DELETE FROM study_assignments WHERE id = $1", [target.id]);
      }

    } else if (cleanIsim.startsWith("www_")) {
      // 3. DELETE/RESET EVALUATIONS (only data)
      const name = cleanIsim.replace("www_", "");
      const studyRes = await query("SELECT id FROM studies WHERE name = $1", [name]);
      if (studyRes.rows.length > 0) {
        const studyId = studyRes.rows[0].id;
        await query("DELETE FROM student_evaluations WHERE study_id = $1", [studyId]);
      }

    } else if (cleanIsim.endsWith("Grupları")) {
      // 4. DELETE CLASS GROUPS
      const className = cleanIsim.replace("Grupları", "");
      await query("DELETE FROM class_groups WHERE class_name = $1", [className]);

      // FIX: Also delete the file so fallback logic doesn't resurrect it
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, cleanIsim + ".json");
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error("FS Delete Error:", e); }
      }

    } else {
      await query("DELETE FROM studies WHERE name = $1", [cleanIsim]);
    }

    res.json({ status: "ok" });
  } catch (e) { console.error(e); res.status(500).json({ status: "error" }); }
});

app.post("/arsivle", async (req, res) => {
  try {
    // req.body.dosyaIsmi (e.g., "Sıvı Basıncı" or "qwxSıvı Basıncı.json")
    const name = req.body.dosyaIsmi.replace(/^qwx/, "").replace(".json", "");
    await query("UPDATE studies SET is_archived = TRUE WHERE name = $1", [name]);
    res.json({ status: "ok" });
  } catch (e) { console.error(e); res.status(500).json({ status: "error" }); }
});

app.post("/arsivdenGeriYukle", async (req, res) => {
  try {
    const name = req.body.dosyaIsmi.replace(/^qwx/, "").replace(".json", "");
    await query("UPDATE studies SET is_archived = FALSE WHERE name = $1", [name]);
    res.json({ status: "ok" });
  } catch (e) { console.error(e); res.status(500).json({ status: "error" }); }
});

app.post("/arsivGuncelle", async (req, res) => {
  try {
    const { dosyaIsmi, durum } = req.body;
    // durum: true (archive), false (unarchive)
    // dosyaIsmi might have extension "qwxName.json" or just "Name"?
    // Admin panel sends "qwxName.json" usually?
    // Let's check admin.html logic. 
    // `arsivle('${safeName}', boolean)` -> sends `dosyaIsmi: safeName`.
    // `safeName` comes from `d.dosya_adi`. `yonetimDosyaListesi` returns `qwxName.json`.
    // So we need to strip "qwx" and ".json".

    const name = dosyaIsmi.replace("qwx", "").replace(".json", "");
    await query("UPDATE studies SET is_archived = $1 WHERE name = $2", [durum, name]);
    res.json({ status: "ok" });
  } catch (e) { console.error(e); res.status(500).json({ status: "error" }); }
});

// Genel Kayıt (Öğrenci Girişleri, Cevaplar vb.)
app.post("/kaydet", async (req, res) => {
  const { dosyaAdi, veri, sinif, gruplar } = req.body;

  // 1. Group Saving
  if (sinif && gruplar) {
    try {
      console.log(`[Grup Kaydet] Sınıf: ${sinif}, Grup sayısı: ${gruplar.length}`);

      // Ensure gruplar is valid array
      if (!Array.isArray(gruplar)) {
        throw new Error("gruplar bir array değil!");
      }

      // PostgreSQL JSONB için JSON string'e çevir
      const jsonData = JSON.stringify(gruplar);

      await query(`
            INSERT INTO class_groups (class_name, groups_data)
            VALUES ($1, $2::jsonb)
            ON CONFLICT (class_name) DO UPDATE SET groups_data = $2::jsonb
        `, [sinif, jsonData]);

      console.log(`✅ [Grup Kaydet] Başarılı: ${sinif}`);
      return res.json({ status: "ok", saved: true });
    } catch (e) {
      console.error(`❌ [Grup Kaydet] Hata:`, e.message);
      console.error(`Stack:`, e.stack);
      return res.status(500).json({ status: "error", message: e.message });
    }
  }

  // 2. Student Answers / Settings
  if (dosyaAdi && veri) {
    try {
      if (dosyaAdi.startsWith("www_")) {
        console.log(`[www_ Kaydet] Başlangıç: ${dosyaAdi}, Veri tipi: ${Array.isArray(veri) ? 'Array' : 'Object'}, ${Array.isArray(veri) ? `Kayıt sayısı: ${veri.length}` : `OgrenciNo: ${veri.ogrenciNo}`}`);

        const studyName = dosyaAdi.replace("www_", "");
        let studyRes = await query("SELECT id FROM studies WHERE name = $1", [studyName]);
        if (studyRes.rows.length === 0) {
          // AUTO-CREATE study if it doesn't exist (backwards compatibility)
          console.log(`[www_ Kaydet] Study bulunamadı, otomatik oluşturuluyor: ${studyName}`);
          logToFile(`[SAVE] Auto-creating study: ${studyName}`);
          const insertRes = await query("INSERT INTO studies (name) VALUES ($1) RETURNING id", [studyName]);
          studyRes = { rows: [{ id: insertRes.rows[0].id }] };
        }
        const studyId = studyRes.rows[0].id;

        // veri can be array or object
        const items = Array.isArray(veri) ? veri : [veri];

        for (const item of items) {
          if (item.ogrenciNo === "AYARLAR") {
            // AYARLAR kaydı - JSON.stringify ile kaydet
            const answersJson = JSON.stringify(item);

            // Ensure AYARLAR exists in students table (FK constraint)
            await query(`INSERT INTO students (school_no, name, class_name) VALUES ('AYARLAR', 'AYARLAR', 'SYSTEM') ON CONFLICT (school_no) DO NOTHING`);

            await query(`
                    INSERT INTO student_evaluations (study_id, student_school_no, answers)
                    VALUES ($1, 'AYARLAR', $2::jsonb)
                    ON CONFLICT (study_id, student_school_no) DO UPDATE SET answers = $2::jsonb
                `, [studyId, answersJson]);

            console.log(`✅ [www_ Kaydet] AYARLAR kaydedildi`);

          } else {
            // Regular student answer - JSONB alanları için JSON.stringify
            const studentNo = String(item.ogrenciNo).trim();

            // AUTO-CREATE student if not exists (FK constraint requires it)
            try {
              await query(
                `INSERT INTO students (school_no, name, class_name) VALUES ($1, $2, $3) ON CONFLICT (school_no) DO NOTHING`,
                [studentNo, item.adSoyad || 'Bilinmiyor', item.sinif || '']
              );
            } catch (studentErr) {
              logToFile(`[SAVE] Warning: Could not auto-create student ${studentNo}: ${studentErr.message}`);
            }

            // Eğer cevaplar gönderilmişse kullan, yoksa mevcut cevapları koru
            let answersJson = null;
            if (item.cevaplar !== undefined) {
              logToFile(`[SAVE] Received ANSWERS for ${studentNo}: Length=${item.cevaplar ? item.cevaplar.length : 'null'}`);
              answersJson = JSON.stringify({ cevaplar: item.cevaplar });
            } else {
              logToFile(`[SAVE] No ANSWERS payload for ${studentNo}. Preserving existing.`);
            }

            // Eğer puanlar/değerlendirme gönderilmemişse mevcut olanları koru (NULL göndererek COALESCE kullanacağız)
            const scoresJson = item.puanlar !== undefined ? JSON.stringify(item.puanlar) : null;
            const evaluationJson = item.degerlendirme !== undefined ? JSON.stringify(item.degerlendirme) : null;

            if (scoresJson === null) logToFile(`[SAVE] No SCORES payload for ${studentNo}. Preserving existing.`);
            if (evaluationJson === null) logToFile(`[SAVE] No EVALUATION payload for ${studentNo}. Preserving existing.`);

            // Önce mevcut kaydı kontrol et
            const existingRes = await query(
              "SELECT id FROM student_evaluations WHERE study_id = $1 AND student_school_no = $2",
              [studyId, studentNo]
            );

            if (existingRes.rows.length > 0) {
              // UPDATE - Mevcut kayıt var
              if (answersJson !== null) {
                logToFile(`[SAVE] Updating DB with NEW ANSWERS for ${studentNo}`);
                // Cevaplar da güncellenecek, puanlar/değerlendirme sadece gelmişse ezilecek (COALESCE)
                await query(`
                  UPDATE student_evaluations 
                  SET answers = $1::jsonb, 
                      scores = COALESCE($2::jsonb, scores), 
                      entry_count = $3, 
                      evaluation = COALESCE($4::jsonb, evaluation), 
                      class_name = $5, 
                      last_updated = NOW()
                  WHERE study_id = $6 AND student_school_no = $7
                `, [answersJson, scoresJson, item.girisSayisi || 0, evaluationJson, item.sinif, studyId, studentNo]);
              } else {
                logToFile(`[SAVE] Updating DB (METADATA ONLY) for ${studentNo}`);
                // Sadece puanlar ve değerlendirme güncellenecek (gelmişse), cevaplar korunacak
                await query(`
                  UPDATE student_evaluations 
                  SET scores = COALESCE($1::jsonb, scores), 
                      evaluation = COALESCE($2::jsonb, evaluation), 
                      class_name = $3, 
                      last_updated = NOW()
                  WHERE study_id = $4 AND student_school_no = $5
                `, [scoresJson, evaluationJson, item.sinif, studyId, studentNo]);
              }
            } else {
              logToFile(`[SAVE] INSERTING NEW RECORD for ${studentNo}`);
              // INSERT - Yeni kayıt
              const finalAnswersJson = answersJson || JSON.stringify({ cevaplar: [] });
              const finalScoresJson = scoresJson || JSON.stringify({});
              const finalEvalJson = evaluationJson || JSON.stringify({ bitti: false });
              await query(`
                INSERT INTO student_evaluations (study_id, student_school_no, class_name, answers, scores, entry_count, evaluation, last_updated)
                VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb, NOW())
              `, [studyId, studentNo, item.sinif, finalAnswersJson, finalScoresJson, item.girisSayisi || 0, finalEvalJson]);
            }

            console.log(`✅ [www_ Kaydet] Öğrenci kaydedildi: ${studentNo}${answersJson === null ? ' (sadece puanlar/değerlendirme)' : ''}`);
          }
        }

        console.log(`✅ [www_ Kaydet] Tamamlandı: ${dosyaAdi}, ${items.length} kayıt`);
        return res.json({ status: "ok" });
      } else {
        // Generic file save (mostly admin uploads or creating legacy files via upload)
        // Handle importing legacy files dynamically?
        // If uploading "veritabani.json" -> imports students
        if (dosyaAdi === "veritabani.json") {
          // ... Logic to import students ...
          // Simplified for now: just save? No, DB doesn't have a "veritabani.json" file.
          // We need to parse and insert into `students` table.
          const data = veri; // object or array
          const allStudents = [];
          Object.values(data).forEach(g => { if (Array.isArray(g)) allStudents.push(...g); });

          for (const s of allStudents) {
            await query(`
                    INSERT INTO students (school_no, name, class_name, phone, parent_phone, email, drive_link, extra_info)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (school_no) DO UPDATE SET name=$2, class_name=$3
                 `, [
              String(s["Okul Numaranız"]),
              s["Adınız Soyadınız"],
              s["Sınıfınız"],
              s["Telefon numaranız"],
              s["Velinizin telefon numarası"],
              s["E-Posta Adresiniz"],
              s["Drive Klasörünüzün linki"],
              s
            ]);
          }
          return res.json({ status: "ok" });
        }
      }
    } catch (e) {
      console.error('❌ [KAYDET] SQL HATASI:', e.message);
      logToFile(`[SAVE ERROR] ${e.message}`);
      return res.status(500).json({ status: "error", message: e.message });
    }
  }
  res.status(400).json({ status: "eksik" });
});

// Listeleme
app.get("/listeCalismalar", async (req, res) => {
  try {
    // Need to return array of filenames simulating legacy format:
    // qwxStudyName.json
    // qqqClassStudy.json
    // www_StudyName.json (optional, implies answers exist)

    const files = [];

    // 1. Studies
    const studies = await query("SELECT id, name FROM studies WHERE is_archived = FALSE");
    studies.rows.forEach(s => files.push(`qwx${s.name}.json`));

    // 2. Assignments
    const assigns = await query(`
        SELECT a.class_name, s.name as study_name 
        FROM study_assignments a 
        JOIN studies s ON a.study_id = s.id
        WHERE s.is_archived = FALSE
      `);
    assigns.rows.forEach(a => {
      files.push(`qqq${a.class_name.replace(/\s/g, '')}${a.study_name}.json`);
    });

    res.json(files);
  } catch (e) { console.error(e); res.json([]); }
});

app.get("/calismaGetir", async (req, res) => {
  try {
    let isim = req.query.isim;
    // Fix: Strip .json if present, as DB stores names without extension (usually)
    // But wait, files.push adds .json in list.
    // And logic below for qqq constructs ID without .json.
    // So let's handle it.

    if (isim.startsWith("qwx")) {
      // Fetch Study Content
      const name = isim.replace("qwx", "").replace(".json", "");
      const resDb = await query("SELECT content FROM studies WHERE name = $1", [name]);
      if (resDb.rows.length > 0) res.json(resDb.rows[0].content);
      else res.status(404).send();

    } else if (isim.startsWith("qqq")) {
      // Fetch Assignment Config
      const cleanIsim = isim.replace(".json", "");

      const allAssignments = await query(`
            SELECT a.*, s.name as study_name 
            FROM study_assignments a 
            JOIN studies s ON a.study_id = s.id
          `);

      const found = allAssignments.rows.find(row => {
        const constructedId = "qqq" + row.class_name.replace(/\s/g, '') + row.study_name;
        // Check both with and without .json to be safe? 
        // We cleaned isim above, so match against clean ID.
        return constructedId === cleanIsim;
      });

      if (found) {
        let toplamKatilimci = 0;
        try {
          // Calculate total students expected in this class
          const sRes = await query("SELECT COUNT(*) FROM students WHERE TRIM(sinif) = TRIM($1)", [found.class_name]);
          toplamKatilimci = parseInt(sRes.rows[0].count);
          logToFile(`[GET qqq_] Class: ${found.class_name}, toplamKatilimci: ${toplamKatilimci}`);
        } catch (err) {
          console.error(`[GET qqq_] Error counting students for ${found.class_name}:`, err);
        }

        const settings = found.settings || {};
        // Merge with ID and class info for frontend
        res.json({
          id: isim,
          sinif: found.class_name,
          calisma: found.study_name, // prefixed? Legacy: qwxName
          yontem: found.method,
          toplamKatilimci,
          ...settings
        });
      } else {
        res.status(404).send();
      }

    } else if (isim.startsWith("www_")) {
      // Fetch Evaluations (All students for a study)
      const name = isim.replace("www_", "");
      console.log(`[www_ Getir] İstek: ${isim}, Study adı: ${name}`);

      const studyRes = await query("SELECT id FROM studies WHERE name = $1", [name]);

      if (studyRes.rows.length === 0) {
        console.warn(`⚠️ [www_ Getir] Study bulunamadı: ${name}. Henüz kayıt yok.`);
        logToFile(`[GET] Study not found in DB: ${name}. Returning empty.`);
        return res.json([]);
      }
      const studyId = studyRes.rows[0].id;
      console.log(`[www_ Getir] Study ID: ${studyId}`);

      // JOIN with students to get name
      const evals = await query(`
          SELECT se.*, s.name as student_name 
          FROM student_evaluations se
          LEFT JOIN students s ON se.student_school_no = s.school_no
          WHERE se.study_id = $1
      `, [studyId]);

      console.log(`[www_ Getir] ${evals.rows.length} kayıt bulundu`);
      logToFile(`[GET] Fetching ${isim} (Study: ${name}). Found ${evals.rows.length} records in DB.`);

      // Map back to legacy format
      const mapped = evals.rows.map(row => {
        if (row.student_school_no === 'AYARLAR') {
          return row.answers; // Already legacy object
        }

        // ULTRA-ROBUST ANSWER EXTRACTION
        let cevaplarListesi = [];
        let answersData = row.answers;
        let extractionMethod = "none";

        // 1. Handle String (Double Serialization)
        if (typeof answersData === 'string') {
          try {
            answersData = JSON.parse(answersData);
            extractionMethod = "string-parse";
          } catch (e) { console.error("JSON Parse Error for answers:", e); }
        }

        // 2. Extract Array
        if (answersData) {
          if (Array.isArray(answersData)) {
            cevaplarListesi = answersData;
            extractionMethod += "->direct-array";
          } else if (answersData.cevaplar && Array.isArray(answersData.cevaplar)) {
            cevaplarListesi = answersData.cevaplar;
            extractionMethod += "->prop-cevaplar";
          } else if (answersData.answers && Array.isArray(answersData.answers)) {
            cevaplarListesi = answersData.answers;
            extractionMethod += "->prop-answers";
          } else {
            console.warn(`[www_ Getir] Unknown format for ${row.student_school_no}:`, JSON.stringify(answersData));
          }
        }

        // Debug Log only if we have answers but extraction failed or if we found answers
        if (cevaplarListesi.length > 0) {
          // console.log(`[DEBUG] Extracted ${cevaplarListesi.length} answers for ${row.student_school_no} via ${extractionMethod}`);
        }

        return {
          ogrenciNo: row.student_school_no,
          adSoyad: row.student_name,
          sinif: row.class_name,
          cevaplar: cevaplarListesi,
          puanlar: row.scores,
          girisSayisi: row.entry_count,
          degerlendirme: row.evaluation
        };
      });

      console.log(`✅ [www_ Getir] ${mapped.length} kayıt döndürülüyor`);
      res.json(mapped);

    } else if (isim.endsWith("Grupları.json")) {
      // Fetch Class Groups (e.g. 9AGrupları.json)
      const className = isim.replace("Grupları.json", "");

      // Try DB first
      const resDb = await query("SELECT groups_data FROM class_groups WHERE class_name = $1", [className]);
      if (resDb.rows.length > 0) {
        res.json(resDb.rows[0].groups_data);
      } else {
        // Fallback to file system
        const filePath = path.join(__dirname, isim);
        if (fs.existsSync(filePath)) {
          try {
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            res.json(fileData);
          } catch (e) {
            console.error("File parse error:", e);
            res.status(404).send();
          }
        } else {
          res.status(404).send();
        }
      }

    } else if (isim === "veritabani.json") {
      // Fetch student database
      try {
        const students = await query("SELECT * FROM students");

        // If no data in DB, try file
        if (!students || !students.rows || students.rows.length === 0) {
          const filePath = path.join(__dirname, "veritabani.json");
          if (fs.existsSync(filePath)) {
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            return res.json(fileData);
          }
          return res.json({});
        }

        // Group by class_name (Legacy format)
        const result = {};
        students.rows.forEach(s => {
          if (!result[s.class_name]) result[s.class_name] = [];
          result[s.class_name].push({
            "Okul Numaranız": s.school_no,
            "Adınız Soyadınız": s.name,
            "Sınıfınız": s.class_name,
            "Telefon numaranız": s.phone,
            "Velinizin telefon numarası": s.parent_phone,
            "E-Posta Adresiniz": s.email,
            "Drive Klasörünüzün linki": s.drive_link,
            ...s.extra_info
          });
        });
        res.json(result);
      } catch (e) {
        console.error("DB error in veritabani.json download:", e);
        // Fallback to file
        const filePath = path.join(__dirname, "veritabani.json");
        if (fs.existsSync(filePath)) {
          const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          res.json(fileData);
        } else {
          res.status(404).send();
        }
      }

    } else {
      res.status(404).send();
    }
  } catch (e) { console.error(e); res.status(404).send(); }
});

app.get("/arsivListesi", async (req, res) => {
  try {
    const resDb = await query("SELECT name FROM studies WHERE is_archived = TRUE");
    res.json(resDb.rows.map(r => `qwx${r.name}.json`));
  } catch (e) { res.json([]); }
});



// Admin File List Helper
app.get("/yonetimDosyaListesi", async (req, res) => {
  try {
    const result = [];
    // 1. Studies (qwx)
    const studies = await query("SELECT name, is_archived FROM studies");
    studies.rows.forEach(s => {
      result.push({
        dosya_adi: `qwx${s.name}.json`,
        arsivde: s.is_archived
      });
      // Legacy also had www_ files for each study if answers existed
      // We can assume if study exists, www might exist in virtual list for admin to "manage" (delete/archive)?
      // Actually admin usually manages Studies (qwx).
      // But if user wants to see "all files", we should add them.
      result.push({ dosya_adi: `www_${s.name}.json`, arsivde: false });
    });

    // 2. Assignments (qqq)
    const assigns = await query(`
        SELECT a.class_name, s.name as study_name 
        FROM study_assignments a 
        JOIN studies s ON a.study_id = s.id
    `);
    assigns.rows.forEach(a => {
      // qqqClassNameStudyName.json
      result.push({
        dosya_adi: `qqq${a.class_name.replace(/\s/g, '')}${a.study_name}.json`,
        arsivde: false
      });
    });

    // 3. Class Groups (Combine DB and File System for robustness)
    const groups = await query("SELECT class_name FROM class_groups");
    const dbGroupNames = groups.rows.map(g => `${g.class_name}Grupları.json`);

    // Also check file system for immediate visibility
    let fsGroupFiles = [];
    try {
      const fs = require('fs');
      const files = fs.readdirSync(__dirname);
      fsGroupFiles = files.filter(f => f.endsWith("Grupları.json"));
    } catch (e) { console.error("FS Read Error:", e); }

    // Merge unique files
    const allGroups = [...new Set([...dbGroupNames, ...fsGroupFiles])];

    allGroups.forEach(f => {
      result.push({ dosya_adi: f, arsivde: false });
    });

    // Add veritabani dummy
    result.push({ dosya_adi: "veritabani.json", arsivde: false });

    res.json(result);
  } catch (e) { console.error(e); res.json([]); }
});

// Legacy veritabani.json endpoint (Simulated from DB with File Fallback)
app.get("/veritabani.json", async (req, res) => {
  const tryFile = () => {
    const p = path.join(__dirname, "veritabani.json");
    if (fs.existsSync(p)) {
      try {
        const fileData = JSON.parse(fs.readFileSync(p, 'utf-8'));
        res.json(fileData);
      } catch (e) {
        console.error("File parse error:", e);
        res.json({});
      }
    } else {
      res.json({});
    }
  };

  try {
    const students = await query("SELECT * FROM students");

    // Fallback to file if no data
    if (!students || !students.rows || students.rows.length === 0) {
      console.warn("No students in DB, falling back to file");
      return tryFile();
    }

    // Group by class_name (Legacy format)
    const result = {};
    students.rows.forEach(s => {
      if (!result[s.class_name]) result[s.class_name] = [];
      result[s.class_name].push({
        "Okul Numaranız": s.school_no,
        "Adınız Soyadınız": s.name,
        "Sınıfınız": s.class_name,
        "Telefon numaranız": s.phone,
        "Velinizin telefon numarası": s.parent_phone,
        "E-Posta Adresiniz": s.email,
        "Drive Klasörünüzün linki": s.drive_link,
        ...s.extra_info
      });
    });
    res.json(result);
  } catch (e) {
    console.error("DB error in /veritabani.json, falling back to file:", e.message);
    tryFile();
  }
});

// Temporary Migration Endpoint
app.get("/adminMigration", async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const files = fs.readdirSync(__dirname);
    const groupFiles = files.filter(f => f.match(/^[0-9A-Za-z]+Grupları\.json$/));

    let counting = 0;
    for (const file of groupFiles) {
      const className = file.replace("Grupları.json", "");
      const content = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf-8'));

      // JSON.stringify for PostgreSQL JSONB
      const jsonData = JSON.stringify(content);
      await query(`
            INSERT INTO class_groups (class_name, groups_data)
            VALUES ($1, $2::jsonb)
            ON CONFLICT (class_name) DO UPDATE SET groups_data = $2::jsonb
        `, [className, jsonData]);
    }
    res.json({ status: "ok", migrated: counting });
  } catch (e) {
    console.error("Migration Error:", e);
    res.status(500).json({ status: "error", msg: e.toString() || JSON.stringify(e) });
  }
});

// Auto-Migration Function
async function autoMigrate() {
  try {
    console.log("Checking for necessary data migration...");
    const fs = require('fs'); // Ensure fs is available if not global
    const files = fs.readdirSync(__dirname);

    // 0. Ensure Table Exists (Robustness)
    await query(`
        CREATE TABLE IF NOT EXISTS class_groups (
            class_name VARCHAR(255) PRIMARY KEY,
            groups_data JSONB
        );
    `);

    // 1. Class Groups (More robust check)
    console.log("Files in directory:", files); // Debugging
    const groupFiles = files.filter(f => f.endsWith("Grupları.json"));

    for (const file of groupFiles) {
      const className = file.replace("Grupları.json", "");
      let content;
      try {
        content = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf-8'));
      } catch (err) {
        console.error(`Error reading ${file}:`, err);
        continue;
      }

      // JSON.stringify for PostgreSQL JSONB
      const jsonData = JSON.stringify(content);
      await query(`
            INSERT INTO class_groups (class_name, groups_data)
            VALUES ($1, $2::jsonb)
            ON CONFLICT (class_name) DO UPDATE SET groups_data = $2::jsonb
        `, [className, jsonData]);
      console.log(`Migrated group: ${file} (Class: ${className})`);
    }
  } catch (e) {
    console.warn("Auto-migration failed (likely due to no DB connection locally):", e.message);
  }
}

// --- SUNUCUYU BAŞLAT ---
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Sunucu ${PORT} portunda hazır! (SQL Modu)`);
  logToFile("SERVER RESTARTED - LOGGING INITIALIZED");
  await autoMigrate();
});