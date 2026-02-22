const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { query } = require("./db");
require("dotenv").config();

const app = express();

app.use(express.json({ limit: '50mb' })); // Increased limit just in case
app.use(cors());

// DEBUG MIDDLEWARE
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

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
  const calisma = req.query.calisma; // Optional
  const normalizedSinif = sinifIsmiTemizle(rawSinif);

  try {
    if (calisma) {
      // FETCH STUDY-SPECIFIC GROUPS
      let resDb = { rows: [] };
      try {
        const normalized = sinifIsmiTemizle(rawSinif);
        resDb = await query("SELECT groups_data FROM study_groups WHERE study_name = $1 AND (class_name = $2 OR class_name = $3)", [calisma, rawSinif, normalized]);
      } catch (dbErr) {
        console.error("Study Groups DB Error (Ignored for fallback):", dbErr.message);
      }

      if (resDb.rows.length > 0) {
        return res.json(resDb.rows[0].groups_data || []);
      } else {
        // Fallback to File System (ggg[Study][Class].json)
        // ROBUST FUZZY MATCH (Handles Unicode/Encoding mismatches)
        const fs = require('fs');
        const files = fs.readdirSync(__dirname);

        const cleanStr = (s) => (s || "").replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, "").toLowerCase();
        const searchCalisma = cleanStr(calisma);
        const searchSinif = cleanStr(rawSinif);

        const matchingFile = files.find(f => {
          const low = cleanStr(f);
          const match = f.startsWith("ggg") && f.endsWith(".json") &&
            low.includes(searchCalisma) && low.includes(searchSinif);

          return match;
        });

        if (matchingFile) {
          const filePath = path.join(__dirname, matchingFile);
          try {
            const fContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            return res.json(fContent);
          } catch (e) {
            console.error("FS Read Error:", e);
            return res.json([]);
          }
        }
        return res.json([]);
      }
    }

    // LEGACY: Class Groups
    // 1. Try DB
    let rows = [];
    try {
      let resDb = await query("SELECT groups_data FROM class_groups WHERE class_name = $1", [rawSinif]);
      if (resDb.rows.length === 0) resDb = await query("SELECT groups_data FROM class_groups WHERE class_name = $1", [normalizedSinif]);
      if (resDb.rows.length > 0) rows = resDb.rows[0].groups_data || [];
    } catch (dbErr) {
      console.error("DB Error (Ignored for fallback):", dbErr.message);
    }

    if (rows.length > 0) {
      // console.log(`[grupListesiGetir] Found in DB.`);
      res.json(rows);
    } else {
      // 2. Fallback to FS
      const strictPath = path.join(__dirname, `${normalizedSinif}Grupları.json`);
      if (require("fs").existsSync(strictPath)) {
        try {
          const content = JSON.parse(require("fs").readFileSync(strictPath, 'utf-8'));
          res.json(content);
        } catch (e) { res.json([]); }
      } else {
        res.json([]);
      }
    }
  } catch (e) {
    console.error("General Error:", e);
    res.json([]);
  }
});

// Değerlendirmeyi Sıfırla
// Değerlendirmeyi Sıfırla (GET or POST for flexibility)
app.all("/degerlendirmeSifirla", async (req, res) => {
  try {
    const { calisma, dosyaAdi, sinif } = { ...req.query, ...req.body };
    const name = calisma || (dosyaAdi ? dosyaAdi.replace("www_", "") : null);
    if (!name || !sinif) return res.status(400).json({ status: "eksik_parametre" });

    const studyRes = await query("SELECT id FROM studies WHERE name = $1", [name]);
    if (studyRes.rows.length === 0) return res.status(404).json({ status: "dosya_yok" });
    const studyId = studyRes.rows[0].id;

    // Reset evaluation for all students in this class for this study
    await query(`
        UPDATE student_evaluations 
        SET scores = '{}', evaluation = '{}'
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
  const { dosyaAdi, ogrenciNo, sinif, toplam: bodyToplam, degerlendirildi: bodyDegerlendirildi, puanlar } = req.body;
  const studyName = dosyaAdi.replace("www_", "");

  try {
    const studyRes = await query("SELECT id FROM studies WHERE name = $1", [studyName]);
    if (studyRes.rows.length === 0) return res.status(404).send();
    const studyId = studyRes.rows[0].id;

    let toplam = bodyToplam;

    // If toplam is not provided in body, calculate it from existing scores
    if (typeof toplam === 'undefined' || toplam === null) {
      const evalRes = await query(
        "SELECT scores FROM student_evaluations WHERE study_id = $1 AND student_school_no = $2",
        [studyId, String(ogrenciNo)]
      );
      if (evalRes.rows.length > 0) {
        const scores = evalRes.rows[0].scores || {};
        toplam = 0;
        Object.values(scores).forEach((soruDizisi) => {
          if (Array.isArray(soruDizisi)) {
            soruDizisi.forEach((p) => { if (p) toplam += parseInt(p); });
          }
        });
      } else {
        toplam = 0;
      }
    }

    const evaluation = { toplam: toplam, degerlendirildi: (typeof bodyDegerlendirildi !== 'undefined' ? bodyDegerlendirildi : true) };
    const evaluationJson = JSON.stringify(evaluation);

    // If puanlar (batch scores) provided, update scores too to prevent UI lag
    if (puanlar) {
      const scoresJson = JSON.stringify(puanlar);
      await query(
        "UPDATE student_evaluations SET evaluation = COALESCE(evaluation, '{}'::jsonb) || $1::jsonb, scores = $2::jsonb WHERE study_id = $3 AND student_school_no = $4",
        [evaluationJson, scoresJson, studyId, String(ogrenciNo)]
      );
    } else {
      await query(
        "UPDATE student_evaluations SET evaluation = COALESCE(evaluation, '{}'::jsonb) || $1::jsonb WHERE study_id = $2 AND student_school_no = $3",
        [evaluationJson, studyId, String(ogrenciNo)]
      );
    }

    res.json({ status: "ok" });
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
        bitis: assignment.bitis || null,
        karisikSoru: assignment.karisikSoru || false,
        odakModu: assignment.odakModu || false
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


// Grupları Kaydet (Study-Specific)
app.post("/kaydet", async (req, res, next) => {
  try {
    // Case 1: Groups (from index.html - now with optional 'calisma' param)
    if (req.body.sinif && req.body.gruplar) {
      const { sinif, gruplar, calisma } = req.body;
      const groupsJson = JSON.stringify(gruplar);

      if (calisma) {
        // NEW: Save to study_groups table
        await query(`
            INSERT INTO study_groups (study_name, class_name, groups_data)
            VALUES ($1, $2, $3::jsonb)
            ON CONFLICT (study_name, class_name) 
            DO UPDATE SET groups_data = $3::jsonb
         `, [calisma, sinif, groupsJson]);
        console.log(`✅ [Gruplar Kaydet] Çalışma: ${calisma}, Sınıf: ${sinif}, Grup Sayısı: ${gruplar.length}`);

        // Fallback to legacy behavior if needed? No, user wants strict separation.
        // But maybe save to class_groups too for backward compatibility? 
        // User said "From now on...". Let's stick to study_groups mostly, but...
        // Actually, let's KEEP saving to class_groups if no study is provided (legacy mode),
        // BUT if study is provided, ONLY save to study_groups.

      } else {
        // OLD: Save to class_groups (Legacy)
        await query(`
                INSERT INTO class_groups (class_name, groups_data)
                VALUES ($1, $2::jsonb)
                ON CONFLICT (class_name) 
                DO UPDATE SET groups_data = $2::jsonb
            `, [sinif, groupsJson]);
        console.log(`✅ [Gruplar Kaydet] Legacy - Sınıf: ${sinif}, Grup Sayısı: ${gruplar.length}`);
      }

      return res.json({ status: "ok" });
    }

    // Case 2: Admin File Upload (e.g., studies, assignments, groups)
    if (req.body.dosyaAdi && req.body.veri) {
      const { dosyaAdi, veri } = req.body;

      // www_ files and veritabani.json are handled by the SECOND /kaydet handler below
      if (dosyaAdi.startsWith('www_') || dosyaAdi === 'veritabani.json') {
        return next();
      }

      console.log(`[Admin Upload Route] ${dosyaAdi}`);

      if (dosyaAdi.startsWith('qwx')) {
        const name = dosyaAdi.replace(/^qwx/, "").replace(".json", "");
        const contentJson = JSON.stringify(veri);
        await query(`
            INSERT INTO studies (name, content)
            VALUES ($1, $2::jsonb)
            ON CONFLICT (name) DO UPDATE SET content = $2::jsonb
        `, [name, contentJson]);
        console.log(`✅ [Admin Upload] Study saved/updated: ${name}`);
        return res.json({ status: "ok" });
      }

      if (dosyaAdi.startsWith('qqq')) {
        // qqq[Class][Study].json -> To parse this, we need to know the Class.
        // Usually, the JSON content for an assignment contains 'sinif' and 'calisma'
        const assignmentContent = veri;
        if (assignmentContent.sinif && assignmentContent.calisma) {
          const studyName = assignmentContent.calisma;
          const className = assignmentContent.sinif;

          // Ensure study exists to satisfy FK constraint
          let studyRes = await query("SELECT id FROM studies WHERE name = $1", [studyName]);
          if (studyRes.rows.length === 0) {
            const insertRes = await query("INSERT INTO studies (name) VALUES ($1) RETURNING id", [studyName]);
            studyRes = { rows: [{ id: insertRes.rows[0].id }] };
          }
          const studyId = studyRes.rows[0].id;

          await query(`
                 INSERT INTO study_assignments (study_id, class_name, method, settings)
                 VALUES ($1, $2, $3, $4::jsonb)
                 ON CONFLICT (study_id, class_name) 
                 DO UPDATE SET method = $3, settings = $4::jsonb
             `, [studyId, className, assignmentContent.yontem || 'tum', JSON.stringify({
            baslangicSecenek: assignmentContent.baslangicSecenek,
            bitisSecenek: assignmentContent.bitisSecenek,
            baslangicZamani: assignmentContent.baslangicZamani,
            bitisZamani: assignmentContent.bitisZamani,
            harfSirasi: assignmentContent.harfSirasi
          })]);
          console.log(`✅ [Admin Upload] Assignment saved/updated: ${className} -> ${studyName}`);
          return res.json({ status: "ok" });
        }
      }

      if (dosyaAdi.startsWith('ggg')) {
        // Contains study groups. Format implies we might need to parse name or rely on content.
        // The downloaded ggg file is just an array. We cannot easily parse sinif/calisma from array content.
        // We must parse 'ggg[Study][Class].json'. This is tricky without delimiters.
        // Fortunately, if they upload a study-specific group, it usually has the name format perfectly.
        // Instead of complex parsing, let's look at the database to see if we can match it.
        // OR better: if they upload it and we can't parse it reliably without user context, 
        // fallback to file system write with the exact same name, as 'calismaGetir' can read from FS fallback.
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(path.join(__dirname, dosyaAdi), JSON.stringify(veri, null, 2));
        console.log(`✅ [Admin Upload] Study Group Fallback Saved directly to FS: ${dosyaAdi}`);
        return res.json({ status: "ok" });
      }

      if (dosyaAdi.endsWith('Grupları.json')) {
        const className = dosyaAdi.replace("Grupları.json", "");
        await query(`
            INSERT INTO class_groups (class_name, groups_data)
            VALUES ($1, $2::jsonb)
            ON CONFLICT (class_name) DO UPDATE SET groups_data = $2::jsonb
        `, [className, JSON.stringify(veri)]);
        console.log(`✅ [Admin Upload] Class Group saved/updated: ${className}`);
        return res.json({ status: "ok" });
      }

      // If it doesn't match specific prefixes but still JSON, maybe it's an old study?
      // Assuming it's a study if no other prefix matched.
      if (dosyaAdi.endsWith('.json') && !dosyaAdi.startsWith('www_')) {
        const name = dosyaAdi.replace(".json", "");
        await query(`
              INSERT INTO studies (name, content)
              VALUES ($1, $2::jsonb)
              ON CONFLICT (name) DO UPDATE SET content = $2::jsonb
          `, [name, JSON.stringify(veri)]);
        console.log(`✅ [Admin Upload] Generic JSON saved as Study: ${name}`);
        return res.json({ status: "ok" });
      }
    }

    // If it reaches here without matching, let the next handler try (e.g. for non-standard files or specific generic logic)
    return next();

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
      // 4. DELETE CLASS GROUPS (Legacy)
      const className = cleanIsim.replace("Grupları", "");
      await query("DELETE FROM class_groups WHERE class_name = $1", [className]);

      // FIX: Also delete the file so fallback logic doesn't resurrect it
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, cleanIsim + ".json");
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error("FS Delete Error:", e); }
      }

    } else if (cleanIsim.startsWith("ggg")) {
      // 5. DELETE STUDY groups
      // Name format: ggg[Study][Class]
      // We need to parse or use LIKE?
      // Actually we receive the full name e.g. "gggMatematik9-A" (without .json)

      // Try to delete from study_groups table using loose matching or constructed check?
      // Since we don't have separator, we can't easily split study/class.
      // BUT for deletion, maybe we just search by the constructed ID similarity?
      // Or we accept that we can't delete easily from DB without proper ID.

      // Actually, in index.html we construct the name: `ggg${study}${class}.json`
      // So cleanIsim = `ggg${study}${class}`.

      // We can search in DB: WHERE 'ggg' || study_name || class_name = $1
      await query("DELETE FROM study_groups WHERE 'ggg' || study_name || class_name = $1", [cleanIsim]);

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
  const { dosyaAdi, veri, sinif, gruplar, calisma } = req.body;

  // 1. Group Saving
  if (sinif && gruplar) {
    try {
      console.log(`[Grup Kaydet] Sınıf: ${sinif}, Çalışma: ${calisma || 'Genel'}, Grup sayısı: ${gruplar.length}`);

      // Ensure gruplar is valid array
      if (!Array.isArray(gruplar)) {
        throw new Error("gruplar bir array değil!");
      }

      // PostgreSQL JSONB için JSON string'e çevir
      const jsonData = JSON.stringify(gruplar);

      if (calisma) {
        // Study-Specific Groups
        await query(`
              INSERT INTO study_groups (study_name, class_name, groups_data)
              VALUES ($1, $2, $3::jsonb)
              ON CONFLICT (study_name, class_name) DO UPDATE SET groups_data = $3::jsonb
          `, [calisma, sinif, jsonData]);

        // Also save to FS (fallback)
        const fs = require('fs');
        const path = require('path');
        const filename = `ggg${calisma}${sinif}.json`;
        fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(gruplar, null, 2));
        console.log(`✅ [Grup Kaydet] Study-Specific Başarılı: ${filename}`);

      } else {
        // Legacy/Generic Class Groups
        await query(`
              INSERT INTO class_groups (class_name, groups_data)
              VALUES ($1, $2::jsonb)
              ON CONFLICT (class_name) DO UPDATE SET groups_data = $2::jsonb
          `, [sinif, jsonData]);

        // Also save to FS (fallback)
        const fs = require('fs');
        const path = require('path');
        const filename = `${sinifIsmiTemizle(sinif)}Grupları.json`;
        fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(gruplar, null, 2));
        console.log(`✅ [Grup Kaydet] Generic Başarılı: ${sinif}`);
      }

      return res.json({ status: "ok", saved: true });
    } catch (e) {
      console.error(`❌ [Grup Kaydet] Hata:`, e.message);
      return res.status(500).json({ status: "error", message: e.message });
    }
  }

  // 2. Student Answers / Settings
  if (dosyaAdi && veri) {
    try {
      if (dosyaAdi.startsWith("www_")) {
        console.log(`[www_ Kaydet] Başlangıç: ${dosyaAdi}, Veri tipi: ${Array.isArray(veri) ? 'Array' : 'Object'}, ${Array.isArray(veri) ? `Kayıt sayısı: ${veri.length}` : `OgrenciNo: ${veri.ogrenciNo}`}`);

        // Robust Study Name Resolution
        let studyName = dosyaAdi;
        if (studyName.startsWith("www_")) studyName = studyName.replace("www_", "");
        studyName = studyName.trim(); // Ensure no leading/trailing spaces mismatch

        console.log(`[www_ Kaydet] Dosya: ${dosyaAdi} -> StudyName: ${studyName}`);

        let studyRes = await query("SELECT id FROM studies WHERE name = $1", [studyName]);
        if (studyRes.rows.length === 0) {
          // AUTO-CREATE study if it doesn't exist (backwards compatibility)
          console.log(`[www_ Kaydet] Study bulunamadı, otomatik oluşturuluyor: ${studyName}`);
          logToFile(`[SAVE] Auto-creating study: ${studyName}`);
          const insertRes = await query("INSERT INTO studies (name) VALUES ($1) RETURNING id", [studyName]);
          studyRes = { rows: [{ id: insertRes.rows[0].id }] };
        }
        const studyId = studyRes.rows[0].id;
        console.log(`[www_ Kaydet] Resolved Study ID: ${studyId}`);

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
              // logToFile(`[SAVE] Received ANSWERS for ${studentNo}`);
              answersJson = JSON.stringify({ cevaplar: item.cevaplar });
            }

            // Önce mevcut kaydı kontrol et
            const existingRes = await query(
              "SELECT answers, evaluation FROM student_evaluations WHERE study_id = $1 AND student_school_no = $2",
              [studyId, studentNo]
            );

            if (existingRes.rows.length > 0) {
              // UPDATE - Mevcut kayıt var
              let updateFields = [];
              let updateParams = [];
              let pIdx = 1;

              if (answersJson !== null) {
                updateFields.push(`answers = $${pIdx++}::jsonb`);
                updateParams.push(answersJson);
              }

              if (item.puanlar !== undefined) {
                updateFields.push(`scores = $${pIdx++}::jsonb`);
                updateParams.push(JSON.stringify(item.puanlar));
              }

              if (item.degerlendirme !== undefined) {
                const existingEval = existingRes.rows[0].evaluation || {};

                // KORUMA MANTIĞI: Bazı bayrakları (bitti gibi) koru ancak toplam/degerlendirildi gibi alanların silinmesine (reset) izin ver.
                let newEval = { ...item.degerlendirme };
                if (existingEval.bitti === true) newEval.bitti = true;

                // Eğer gelen nesnede bir alan eksikse ve silinmesi istenmişse (reset durumu), merge değil direkt atama yapmalıyız.
                // Ancak jsonb || operatörü sadece ekleme yapar.
                // Bu yüzden direkt yeni nesneyi atıyoruz (bazı kritik alanları koruyarak).
                updateFields.push(`evaluation = $${pIdx++}::jsonb`);
                updateParams.push(JSON.stringify(newEval));
              }

              if (item.girisSayisi !== undefined) {
                updateFields.push(`entry_count = $${pIdx++}`);
                updateParams.push(item.girisSayisi);
              }

              if (item.sinif) {
                updateFields.push(`class_name = $${pIdx++}`);
                updateParams.push(item.sinif);
              }

              if (updateFields.length > 0) {
                updateFields.push(`last_updated = NOW()`);
                const queryText = `UPDATE student_evaluations SET ${updateFields.join(", ")} WHERE study_id = $${pIdx++} AND student_school_no = $${pIdx++}`;
                updateParams.push(studyId, studentNo);
                await query(queryText, updateParams);
                logToFile(`[SAVE] Updated student_evaluations for ${studentNo}.`);
              }
            } else {
              logToFile(`[SAVE] INSERTING NEW RECORD for ${studentNo}`);
              // INSERT - Yeni kayıt
              const finalAnswersJson = answersJson || JSON.stringify({ cevaplar: [] });
              const finalScoresJson = JSON.stringify(item.puanlar || {});
              const finalEvalJson = JSON.stringify(item.degerlendirme || { bitti: false });

              await query(`
                INSERT INTO student_evaluations (study_id, student_school_no, class_name, answers, scores, entry_count, evaluation, last_updated)
                VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb, NOW())
              `, [studyId, studentNo, item.sinif || '', finalAnswersJson, finalScoresJson, item.girisSayisi || 0, finalEvalJson]);
            }

            console.log(`✅ [www_ Kaydet] Öğrenci kaydedildi: ${studentNo}${answersJson === null ? ' (sadece puanlar/değerlendirme)' : ''}`);
          }
        }

        // 3. File System Sync (Fall-back and legacy compatibility)
        try {
          const allEvalsRes = await query(`
              SELECT se.*, s.name as student_name 
              FROM student_evaluations se
              LEFT JOIN students s ON se.student_school_no = s.school_no
              WHERE se.study_id = $1
          `, [studyId]);

          const mapped = allEvalsRes.rows.map(row => {
            if (row.student_school_no === 'AYARLAR') return row.answers;
            return {
              ogrenciNo: row.student_school_no,
              adSoyad: row.student_name,
              sinif: row.class_name,
              cevaplar: (row.answers ? (row.answers.cevaplar || []) : []),
              puanlar: row.scores || {},
              girisSayisi: row.entry_count || 0,
              degerlendirme: row.evaluation || {}
            };
          });

          const fs = require('fs');
          const path = require('path');
          fs.writeFileSync(path.join(__dirname, `www_${studyName}.json`), JSON.stringify(mapped, null, 2));
          console.log(`✅ [www_ Kaydet] FS Sync Tamamlandı: www_${studyName}.json`);
        } catch (fsErr) {
          console.error(`[www_ Kaydet] FS Sync Error:`, fsErr.message);
        }

        console.log(`✅ [www_ Kaydet] Tamamlandı: ${dosyaAdi}, ${items.length} kayıt`);
        return res.json({ status: "ok" });
      } else {
        // Generic file save (mostly admin uploads or creating legacy files via upload)
        if (dosyaAdi === "veritabani.json") {
          const data = veri;
          const allStudents = [];
          Object.values(data).forEach(g => { if (Array.isArray(g)) allStudents.push(...g); });

          for (const s of allStudents) {
            await query(`
                    INSERT INTO students (school_no, name, class_name, phone, parent_phone, email, drive_link, extra_info)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (school_no) DO UPDATE SET name=$2, class_name=$3
                 `, [String(s["Okul Numaranız"]), s["Adınız Soyadınız"], s["Sınıfınız"], s["Telefon numaranız"], s["Velinizin telefon numarası"], s["E-Posta Adresiniz"], s["Drive Klasörünüzün linki"], s]);
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
  return res.status(400).json({ status: "eksik" });
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

    // 3. Evaluations
    const evals = await query(`
        SELECT DISTINCT s.name as study_name, s.is_archived
        FROM student_evaluations se
        JOIN studies s ON se.study_id = s.id
      `);
    evals.rows.forEach(e => {
      files.push({
        dosya_adi: `www_${e.study_name}.json`,
        arsivde: e.is_archived
      });
    });

    // 4. Study Groups
    const sGroups = await query(`SELECT study_name, class_name FROM study_groups`);
    sGroups.rows.forEach(g => {
      files.push(`ggg${g.study_name}${g.class_name}.json`);
    });

    // 5. Generic Class Groups
    const cGroups = await query(`SELECT class_name FROM class_groups`);
    cGroups.rows.forEach(g => {
      files.push(`${g.class_name}Grupları.json`);
    });

    // Map strings to objects for mixed array consistency (admin.html expects objects)
    const formattedFiles = files.map(f => {
      if (typeof f === 'string') {
        const isArchived = studies.rows.find(s => `qwx${s.name}.json` === f)?.is_archived || false;
        return { dosya_adi: f, arsivde: isArchived };
      }
      return f; // Already an object (from Evaluations mapping)
    });

    res.json(formattedFiles);
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
        const settings = found.settings || {};
        // Merge with ID and class info for frontend
        res.json({
          id: isim,
          sinif: found.class_name,
          calisma: found.study_name, // prefixed? Legacy: qwxName
          yontem: found.method,
          ...settings
        });
      } else {
        res.status(404).send();
      }

    } else if (isim.startsWith("www_")) {
      // Fetch Evaluations (All students for a study)
      const name = isim.replace("www_", "").replace(".json", "");
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

    } else if (isim.endsWith("Grupları.json") || isim.startsWith("ggg")) {
      // Fetch Groups (ggg[Study][Class].json OR [Class]Grupları.json)
      // Request format: ggg[Study][Class].json  OR  [Class]Grupları.json

      let className, studyName;

      if (isim.startsWith("ggg")) {
        // New Format: ggg[Study][Class].json
        let searchKey = isim;
        if (!searchKey.endsWith(".json")) searchKey += ".json";

        const normalized = sinifIsmiTemizle(isim.replace("ggg", "").replace(".json", ""));
        const resDb = await query(`
            SELECT groups_data, study_name, class_name FROM study_groups 
        `);

        // Find the matching group by reconstructing the requested filename format
        const foundGroup = resDb.rows.find(row => {
          const constructed = `ggg${row.study_name}${row.class_name}.json`;
          return constructed === searchKey || constructed.toLowerCase() === searchKey.toLowerCase() || `ggg${row.study_name}${sinifIsmiTemizle(row.class_name)}.json` === searchKey;
        });

        if (foundGroup) {
          res.json(foundGroup.groups_data);
        } else {
          // Fallback to file system (Fuzzy)
          const fs = require("fs");
          const files = fs.readdirSync(__dirname);
          const lowSearch = searchKey.toLowerCase();

          const matchingFile = files.find(f => {
            const low = f.toLowerCase();
            return low.startsWith("ggg") && low.includes(".json") &&
              (low === lowSearch || (low.includes(searchKey.toLowerCase().replace(".json", ""))));
          });

          if (matchingFile) {
            const filePath = path.join(__dirname, matchingFile);
            try { res.json(JSON.parse(fs.readFileSync(filePath, 'utf-8'))); } catch (e) { res.status(404).send(); }
          } else {
            console.log(`[DEBUG] / calismaGetir - File not found: ${searchKey} `);
            res.status(404).send();
          }
        }

      } else {
        // Legacy: [Class]Grupları.json
        className = isim.replace("Grupları.json", "");
        const resDb = await query("SELECT groups_data FROM class_groups WHERE class_name = $1", [className]);
        if (resDb.rows.length > 0) {
          res.json(resDb.rows[0].groups_data);
        } else {
          const filePath = path.join(__dirname, isim);
          if (fs.existsSync(filePath)) {
            try { res.json(JSON.parse(fs.readFileSync(filePath, 'utf-8'))); } catch (e) { res.status(404).send(); }
          } else { res.status(404).send(); }
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

app.get("/api/ogrenciPaneli", async (req, res) => {
  const { sinif, schoolNo } = req.query;
  if (!sinif || !schoolNo) return res.status(400).json({ error: "Missing params" });

  try {
    // 1. Get Assignments for this class
    const assignmentsRes = await query(`
      SELECT a.*, s.name as study_name 
      FROM study_assignments a 
      JOIN studies s ON a.study_id = s.id 
      WHERE a.class_name = $1 AND s.is_archived = FALSE
            `, [sinif]);

    const assignments = assignmentsRes.rows;
    if (assignments.length === 0) return res.json({ assignments: [] });

    const studyIds = assignments.map(a => a.study_id);

    // 2. Get Permissions (AYARLAR) for these studies
    const permsRes = await query(`
      SELECT study_id, answers 
      FROM student_evaluations 
      WHERE student_school_no = 'AYARLAR' AND study_id = ANY($1)
            `, [studyIds]);

    const permsMap = {};
    permsRes.rows.forEach(r => {
      permsMap[r.study_id] = r.answers;
    });

    // 3. Get Student's own records
    const myRecordsRes = await query(`
      SELECT study_id, answers, scores, evaluation, entry_count
      FROM student_evaluations
      WHERE student_school_no = $1 AND study_id = ANY($2)
            `, [schoolNo, studyIds]);

    const recordsMap = {};
    myRecordsRes.rows.forEach(r => {
      recordsMap[r.study_id] = r;
    });

    // 4. Get Groups for this class
    const groupsRes = await query(`
        SELECT study_name, groups_data
        FROM study_groups
        WHERE class_name = $1
            `, [sinif]);

    const groupsByStudy = {};
    groupsRes.rows.forEach(r => {
      groupsByStudy[r.study_name] = r.groups_data;
    });

    // 5. Assemble final data
    const results = assignments.map(a => {
      const settings = a.settings || {};
      const ayar = permsMap[a.study_id] || {};
      const myRec = recordsMap[a.study_id] || {};

      // Find my group if it's a group study
      let myGroup = null;
      if (a.method === "Grup") {
        const studyGroups = groupsByStudy[a.study_name];
        if (Array.isArray(studyGroups)) {
          const groupIdx = studyGroups.findIndex(members =>
            members.some(m => String(m['Okul Numaranız']) === String(schoolNo))
          );
          if (groupIdx !== -1) {
            myGroup = {
              groupNo: groupIdx + 1,
              members: studyGroups[groupIdx]
            };
          }
        }
      }

      return {
        id: "qqq" + a.class_name.replace(/\s/g, '') + a.study_name,
        calisma: a.study_name,
        sinif: a.class_name,
        yontem: a.method,
        ...settings, // Current settings (yapma, bitis, etc.)
        degerl: !!settings.degerl, // Strictly from assignment settings (Tab 3)
        masterDegerl: !!ayar.degerlendirmeIzni, // Tab 4 Security Switch (Emergency Check)
        izin: !!ayar.izin, // Granular permission from AYARLAR
        myRecord: {
          cevaplar: (myRec.answers ? (Array.isArray(myRec.answers) ? myRec.answers : (myRec.answers.cevaplar || [])) : []),
          puanlar: myRec.scores || {},
          degerlendirme: myRec.evaluation || {},
          entry_count: myRec.entry_count || 0
        },
        myGroup: myGroup
      };
    });

    res.json({ assignments: results });

  } catch (e) {
    console.error("error in /api/ogrenciPaneli:", e);
    res.status(500).json({ error: e.message });
  }
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
    const dbGroupNames = groups.rows.map(g => `${g.class_name} Grupları.json`);

    // Also check file system for immediate visibility
    let fsGroupFiles = [];
    try {
      const fs = require('fs');
      const files = fs.readdirSync(__dirname);
      fsGroupFiles = files.filter(f => f.endsWith("Grupları.json"));
    } catch (e) { console.error("FS Read Error:", e); }



    // Serve static files
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

// Migration: Class Groups -> Study Groups (Hybrid DB/FS)
app.get("/migrateGroupsToStudies", async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const files = fs.readdirSync(__dirname);

    // 1. Find all Assignments (qqq[Class][Study].json)
    // Structure: qqq[Class][Study].json
    // But 'Class' can be '9-A', '10-C', etc.
    // 'Study' is the rest.
    // This is tricky parsing. 
    // ALTERNATIVE: Read content of qqq files to get 'sinif' and 'calisma'.

    const qqqFiles = files.filter(f => f.startsWith("qqq") && f.endsWith(".json"));

    let migratedCount = 0;
    let skippedCount = 0;
    let fsCreated = 0;

    for (const qFile of qqqFiles) {
      let content;
      try {
        content = JSON.parse(fs.readFileSync(path.join(__dirname, qFile), 'utf-8'));
      } catch (e) { continue; }

      if (!content.sinif || !content.calisma) continue;

      const studyName = content.calisma;
      const className = content.sinif;

      // 2. Check if Generic Group File exists
      const normClass = sinifIsmiTemizle(className);
      const legacyGroupFile = `${normClass} Grupları.json`;

      if (!fs.existsSync(path.join(__dirname, legacyGroupFile))) continue;

      // Read generic groups
      let groupsData;
      try {
        groupsData = JSON.parse(fs.readFileSync(path.join(__dirname, legacyGroupFile), 'utf-8'));
      } catch (e) { continue; }

      // 3. Create Study-Specific Group File (FS)
      const newFileName = `ggg${studyName}${className}.json`; // .json added below usually? No, full name
      // Wait, index.html says: `ggg${ study }${ class} ` (no json?) -> server adds .json
      // Let's create `ggg[Study][Class].json`.
      const newFilePath = path.join(__dirname, `ggg${studyName}${className}.json`);

      if (!fs.existsSync(newFilePath)) {
        fs.writeFileSync(newFilePath, JSON.stringify(groupsData, null, 2));
        fsCreated++;
      }

      // 4. Try DB Insert (Best Effort)
      try {
        await query(`
                INSERT INTO study_groups(study_name, class_name, groups_data)
          VALUES($1, $2, $3:: jsonb)
                ON CONFLICT(study_name, class_name) DO NOTHING
             `, [studyName, className, JSON.stringify(groupsData)]);
        migratedCount++;
      } catch (e) {
        // DB Error (Ignored)
      }
    }

    res.json({
      status: "ok",
      message: `Migration verified.FS Created: ${fsCreated}, DB Migrated: ${migratedCount} `
    });

  } catch (e) {
    console.error("Migration To Studies Error:", e);
    res.status(500).json({ error: e.message });
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
            INSERT INTO class_groups(class_name, groups_data)
          VALUES($1, $2:: jsonb)
            ON CONFLICT(class_name) DO UPDATE SET groups_data = $2:: jsonb
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

    // 0. Ensure Tables Exists (Robustness)
    await query(`
        CREATE TABLE IF NOT EXISTS class_groups(
              class_name VARCHAR(255) PRIMARY KEY,
              groups_data JSONB
            );
          `);

    await query(`
        CREATE TABLE IF NOT EXISTS study_groups(
            study_name VARCHAR(255),
            class_name VARCHAR(255),
            groups_data JSONB,
            PRIMARY KEY(study_name, class_name)
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
        console.error(`Error reading ${file}: `, err);
        continue;
      }

      // JSON.stringify for PostgreSQL JSONB
      const jsonData = JSON.stringify(content);
      await query(`
            INSERT INTO class_groups(class_name, groups_data)
          VALUES($1, $2:: jsonb)
            ON CONFLICT(class_name) DO UPDATE SET groups_data = $2:: jsonb
        `, [className, jsonData]);
      console.log(`Migrated generic group: ${file} (Class: ${className})`);
    }

    // 2. Study-Specific Groups (ggg*)
    const studyGroupFiles = files.filter(f => f.startsWith("ggg") && f.endsWith(".json"));
    if (studyGroupFiles.length > 0) {
      // To parse study/class from ggg[Study][Class].json, we need list of studies and classes
      const studies = await query("SELECT name FROM studies");
      const studentClasses = await query("SELECT DISTINCT class_name FROM students");

      for (const file of studyGroupFiles) {
        let content;
        try {
          content = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf-8'));
        } catch (err) { continue; }

        const rawName = file.replace("ggg", "").replace(".json", "");

        // Try matching against known study/class pairs
        let foundStudy = null;
        let foundClass = null;

        for (const s of studies.rows) {
          if (rawName.startsWith(s.name)) {
            const classPart = rawName.substring(s.name.length);
            if (classPart.length > 0) {
              foundStudy = s.name;
              foundClass = classPart;
              break;
            }
          }
        }

        if (foundStudy && foundClass) {
          await query(`
                    INSERT INTO study_groups(study_name, class_name, groups_data)
          VALUES($1, $2, $3:: jsonb)
                    ON CONFLICT(study_name, class_name) DO UPDATE SET groups_data = $3:: jsonb
                `, [foundStudy, foundClass, JSON.stringify(content)]);
          console.log(`Migrated study group: ${file} (Study: ${foundStudy}, Class: ${foundClass})`);
        } else {
          console.warn(`Could not parse Study / Class from filename: ${file} `);
        }
      }
    }
  } catch (e) {
    console.warn("Auto-migration failed (likely due to no DB connection locally):", e.message);
  }

  // 3. SPECIAL ONE-TIME MIGRATION: Sıvı Basıncı
  // User requested to replace DB groups with local file content for this study.
  try {
    const siviClasses = ["9A", "9B", "9C"];
    const siviStudy = "Sıvı Basıncı";
    const fs = require('fs');

    for (const cls of siviClasses) {
      const fName = `${cls} Grupları.json`;
      const fPath = path.join(__dirname, fName);

      if (fs.existsSync(fPath)) {
        console.log(`[SPECIAL IMPORT] Found ${fName} for ${siviStudy}.Importing...`);
        try {
          const content = JSON.parse(fs.readFileSync(fPath, 'utf-8'));
          const jsonStr = JSON.stringify(content);

          // Insert into study_groups
          await query(`
                      INSERT INTO study_groups(study_name, class_name, groups_data)
                      VALUES($1, $2, $3:: jsonb)
                      ON CONFLICT(study_name, class_name) 
                      DO UPDATE SET groups_data = $3:: jsonb
          `, [siviStudy, cls, jsonStr]);

          console.log(`✅[SPECIAL IMPORT] Imported ${cls} into ${siviStudy}.`);

          // Rename to prevent overwrite on next restart
          // We append ".imported"
          const newPath = fPath + ".imported";
          if (fs.existsSync(newPath)) fs.unlinkSync(newPath); // Remove old imported if exists
          fs.renameSync(fPath, newPath);
          console.log(`   -> Renamed file to ${fName}.imported`);

        } catch (err) {
          console.error(`❌[SPECIAL IMPORT] Error importing ${cls}: `, err.message);
        }
      }
    }
  } catch (e) { console.error("Special Migration Error:", e); }

}


// FORCE IMPORT ENDPOINT (Added for manual triggering)
// FORCE IMPORT ENDPOINT (Added for manual triggering)
app.get("/force-import-sivi-basinci", async (req, res) => {
  let logs = [];
  try {
    // 1. Test DB Connection
    let dbConnected = false;
    try {
      await query("SELECT 1");
      logs.push("✅ DB Connection OK");
      dbConnected = true;
    } catch (dbErr) {
      logs.push(`⚠️ DB Connection FAILED: ${dbErr.message || dbErr}.Will use File System fallback.`);
    }

    const siviClasses = ["9A", "9B", "9C"];
    const siviStudy = "Sıvı Basıncı";
    const fs = require('fs');
    const path = require('path');

    for (const cls of siviClasses) {
      let fName = `${cls}Grupları.json`;
      let fPath = path.join(__dirname, fName);

      if (!fs.existsSync(fPath)) {
        if (fs.existsSync(fPath + ".imported")) {
          logs.push(`Original ${fName} not found, but found.imported.Using it.`);
          fPath = fPath + ".imported";
        } else {
          logs.push(`Skipping ${cls}: File not found.`);
          continue;
        }
      }

      logs.push(`Importing ${cls} from ${fPath}...`);
      try {
        const content = JSON.parse(fs.readFileSync(fPath, 'utf-8'));
        const jsonStr = JSON.stringify(content);

        let imported = false;

        // A. Try DB Insert
        if (dbConnected) {
          try {
            await query(`
                          INSERT INTO study_groups(study_name, class_name, groups_data)
                          VALUES($1, $2, $3:: jsonb)
                          ON CONFLICT(study_name, class_name) 
                          DO UPDATE SET groups_data = $3:: jsonb
          `, [siviStudy, cls, jsonStr]);
            logs.push(`✅ DB Insert Success for ${cls}.`);
            imported = true;
          } catch (sqlErr) {
            logs.push(`❌ DB Insert Failed for ${cls}: ${sqlErr.message} `);
          }
        }

        // B. File System Fallback (gggSıvı Basıncı9A.json)
        try {
          const targetFileName = `ggg${siviStudy}${cls}.json`;
          const targetPath = path.join(__dirname, targetFileName);
          fs.writeFileSync(targetPath, jsonStr);
          logs.push(`✅ FS Write Success: ${targetFileName} `);
          imported = true;
        } catch (fsErr) {
          logs.push(`❌ FS Write Failed for ${cls}: ${fsErr.message} `);
        }

        // Renaming Logic
        if (imported) {
          if (!fPath.endsWith(".imported")) {
            const newPath = fPath + ".imported";
            if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
            fs.renameSync(fPath, newPath);
            logs.push(`Renamed source file to.imported`);
          }
        }

      } catch (err) {
        const util = require('util');
        logs.push(`❌ Critical Error ${cls}: ${err.message} `);
        logs.push(`   -> Details: ${util.format(err)} `);
      }
    }
    res.json({ status: "ok", logs });
  } catch (e) {
    const util = require('util');
    res.status(500).json({ status: "error", error: e.message, logs, internal: util.format(e) });
  }
});

// --- YEDEKLEME ENDPOINT (Global) ---
const AdmZip = require('adm-zip');
app.get('/yedekAl', async (req, res) => {
  try {
    console.log("[BACKUP] Starting DB backup...");
    const zip = new AdmZip();

    // 1. STUDENTS -> veritabani.json
    try {
      const students = await query("SELECT * FROM students");
      const veritabani = {};
      students.rows.forEach(s => {
        if (!veritabani[s.class_name]) veritabani[s.class_name] = [];
        veritabani[s.class_name].push({
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
      zip.addFile("veritabani.json", Buffer.from(JSON.stringify(veritabani, null, 2)));
      console.log("[BACKUP] Added veritabani.json");
    } catch (e) { console.error("[BACKUP] veritabani.json error:", e); }

    // 2. CLASS GROUPS -> [Class]Grupları.json
    try {
      const groups = await query("SELECT class_name, groups_data FROM class_groups");
      groups.rows.forEach(g => {
        zip.addFile(`${g.class_name} Grupları.json`, Buffer.from(JSON.stringify(g.groups_data, null, 2)));
      });
      console.log(`[BACKUP] Added ${groups.rows.length} group files`);
    } catch (e) { console.error("[BACKUP] Groups error:", e); }

    // 3. STUDIES -> qwx[Name].json
    try {
      const studies = await query("SELECT name, content FROM studies");
      studies.rows.forEach(s => {
        zip.addFile(`qwx${s.name}.json`, Buffer.from(JSON.stringify(s.content, null, 2)));
      });
      console.log(`[BACKUP] Added ${studies.rows.length} study files`);
    } catch (e) { console.error("[BACKUP] Studies error:", e); }

    // 4. ASSIGNMENTS -> qqq[Class][Study].json
    try {
      const assigns = await query(`
                SELECT a.*, s.name as study_name 
                FROM study_assignments a 
                JOIN studies s ON a.study_id = s.id
          `);
      assigns.rows.forEach(a => {
        const filename = `qqq${a.class_name.replace(/\s/g, '')}${a.study_name}.json`;
        // Construct legacy assignment object
        const data = {
          id: filename.replace(".json", ""),
          sinif: a.class_name,
          calisma: a.study_name,
          yontem: a.method,
          ...a.settings
        };
        zip.addFile(filename, Buffer.from(JSON.stringify(data, null, 2)));
      });
      console.log(`[BACKUP] Added ${assigns.rows.length} assignment files`);
    } catch (e) { console.error("[BACKUP] Assignments error:", e); }

    // 5. STUDENT EVALUATIONS (Answers) -> www_[Study].json
    try {
      // Fetch all evaluations joined with student and study info
      const evals = await query(`
                SELECT se.*, s.name as study_name, st.name as student_name 
                FROM student_evaluations se
                JOIN studies s ON se.study_id = s.id
                LEFT JOIN students st ON se.student_school_no = st.school_no
          `);

      // Group by study_name
      const studyGroups = {};
      evals.rows.forEach(row => {
        if (!studyGroups[row.study_name]) studyGroups[row.study_name] = [];

        // Reconstruct legacy student answer object
        let cevaplarListesi = [];
        if (row.answers) {
          if (Array.isArray(row.answers)) cevaplarListesi = row.answers;
          else if (row.answers.cevaplar) cevaplarListesi = row.answers.cevaplar;
          else if (row.answers.answers) cevaplarListesi = row.answers.answers;
        }

        const studentObj = {
          ogrenciNo: row.student_school_no,
          adSoyad: row.student_name || 'Bilinmiyor',
          sinif: row.class_name,
          cevaplar: cevaplarListesi,
          puanlar: row.scores,
          girisSayisi: row.entry_count,
          degerlendirme: row.evaluation
        };
        studyGroups[row.study_name].push(studentObj);
      });

      Object.keys(studyGroups).forEach(studyName => {
        zip.addFile(`www_${studyName}.json`, Buffer.from(JSON.stringify(studyGroups[studyName], null, 2)));
      });
      console.log(`[BACKUP] Added ${Object.keys(studyGroups).length} answer files(www_)`);

    } catch (e) { console.error("[BACKUP] Answers error:", e); }


    const zipBuffer = zip.toBuffer();
    const fileName = `Yedek_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;

    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename = ${fileName} `);
    res.set('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
    console.log("[BACKUP] Complete.");

  } catch (e) {
    console.error("Backup error:", e);
    res.status(500).send("Yedek oluşturulurken hata oluştu: " + e.message);
  }
});

// --- YEDEK YÜKLEME (RESTORE) ---
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

app.post('/yedekYukle', upload.single('yedekDosyasi'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ status: "error", message: "Dosya yüklenmedi." });

    console.log(`[RESTORE] Yedek yükleniyor: ${req.file.originalname} (${req.file.size} bytes)`);
    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();

    let stats = { students: 0, groups: 0, studies: 0, assignments: 0, answers: 0, errors: [] };

    for (const entry of zipEntries) {
      if (entry.isDirectory || !entry.entryName.endsWith('.json')) continue;

      try {
        const content = JSON.parse(entry.getData().toString('utf8'));
        const name = entry.entryName;

        // 1. VERITABANI.JSON (Students)
        if (name === "veritabani.json") {
          // content is grouped by class: { "9-A": [student1, student2], "9-B": [...] }
          const allStudents = [];
          Object.values(content).forEach(arr => { if (Array.isArray(arr)) allStudents.push(...arr); });

          for (const s of allStudents) {
            await query(`
                            INSERT INTO students(school_no, name, class_name, phone, parent_phone, email, drive_link, extra_info)
VALUES($1, $2, $3, $4, $5, $6, $7, $8)
                            ON CONFLICT(school_no) DO UPDATE SET
name = EXCLUDED.name,
  class_name = EXCLUDED.class_name,
  phone = EXCLUDED.phone,
  parent_phone = EXCLUDED.parent_phone,
  email = EXCLUDED.email,
  drive_link = EXCLUDED.drive_link,
  extra_info = EXCLUDED.extra_info
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
            stats.students++;
          }
        }
        // 2. CLASS GROUPS
        else if (name.endsWith("Grupları.json")) {
          const className = name.replace("Grupları.json", "");
          await query(`
                        INSERT INTO class_groups(class_name, groups_data) VALUES($1, $2:: jsonb)
                        ON CONFLICT(class_name) DO UPDATE SET groups_data = $2:: jsonb
  `, [className, JSON.stringify(content)]);
          stats.groups++;
        }
        // 3. STUDIES (qwx)
        else if (name.startsWith("qwx")) {
          const studyName = name.replace("qwx", "").replace(".json", "");
          await query(`
                        INSERT INTO studies(name, content) VALUES($1, $2:: jsonb)
                        ON CONFLICT(name) DO UPDATE SET content = $2:: jsonb
                    `, [studyName, JSON.stringify(content)]);
          stats.studies++;
        }
        // 4. ASSIGNMENTS (qqq)
        else if (name.startsWith("qqq")) {
          // Content is the assignment config object
          // { sinif, calisma, yontem, ...settings }
          // We need study_id first
          const studyRes = await query("SELECT id FROM studies WHERE name = $1", [content.calisma]);
          if (studyRes.rows.length === 0) {
            // Create dummy study if missing? No, safer to log error. 
            // Or create placeholder study.
            stats.errors.push(`${name}: Study '${content.calisma}' not found.`);
            continue;
          }
          const studyId = studyRes.rows[0].id;

          const settings = {
            gorme: content.gorme,
            aciklamaIzni: content.aciklamaIzni,
            soruIzni: content.soruIzni,
            yapma: content.yapma,
            degerl: content.degerl,
            sure: content.sure,
            bitis: content.bitis
          };

          await query(`
                        INSERT INTO study_assignments(study_id, class_name, method, settings)
VALUES($1, $2, $3, $4:: jsonb)
                        ON CONFLICT(study_id, class_name) DO UPDATE SET method = $3, settings = $4:: jsonb
                     `, [studyId, content.sinif, content.yontem, JSON.stringify(settings)]);
          stats.assignments++;
        }
        // 5. ANSWERS (www_)
        else if (name.startsWith("www_")) {
          const studyName = name.replace("www_", "").replace(".json", "");
          const studyRes = await query("SELECT id FROM studies WHERE name = $1", [studyName]);
          if (studyRes.rows.length === 0) {
            // Attempting to restore answers for a non-existent study.
            // Maybe creating it?
            await query("INSERT INTO studies (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [studyName]);
            // Re-fetch
            const sRes = await query("SELECT id FROM studies WHERE name = $1", [studyName]);
            if (sRes.rows.length === 0) {
              stats.errors.push(`${name}: Could not create / find study '${studyName}'.`);
              continue;
            }
            // Use found ID
            // (Wait, we can't re-assign to const studyRes, declaring new var)
          }

          // We need correct studyId
          const sResFinal = await query("SELECT id FROM studies WHERE name = $1", [studyName]);
          const studyId = sResFinal.rows[0].id;

          const answersArray = Array.isArray(content) ? content : [content];
          for (const ans of answersArray) {
            if (ans.ogrenciNo === "AYARLAR") continue; // Skip settings, handled by assignments? Or keep?
            // Actually AYARLAR in www_ file is legacy assignment config. 
            // If we already restored qqq, we might not need this. But let's ignore for now to avoid duplication or corrupting assignment table.

            // Upsert Student Evaluation
            // Ensure student exists
            await query(`INSERT INTO students(school_no, name, class_name) VALUES($1, $2, $3) ON CONFLICT(school_no) DO NOTHING`,
              [String(ans.ogrenciNo), ans.adSoyad || 'Yedek', ans.sinif || '']);

            await query(`
                            INSERT INTO student_evaluations(study_id, student_school_no, class_name, answers, scores, entry_count, evaluation, last_updated)
VALUES($1, $2, $3, $4:: jsonb, $5:: jsonb, $6, $7:: jsonb, NOW())
                            ON CONFLICT(study_id, student_school_no) DO UPDATE SET
answers = EXCLUDED.answers,
  scores = EXCLUDED.scores,
  evaluation = EXCLUDED.evaluation,
  entry_count = EXCLUDED.entry_count
    `, [
              studyId,
              String(ans.ogrenciNo),
              ans.sinif || '',
              JSON.stringify({ cevaplar: ans.cevaplar || [] }),
              JSON.stringify(ans.puanlar || {}),
              ans.girisSayisi || 0,
              JSON.stringify(ans.degerlendirme || {})
            ]);
            stats.answers++;
          }
        }

      } catch (entryErr) {
        console.error(`[RESTORE] Error processing ${entry.entryName}: `, entryErr);
        stats.errors.push(`${entry.entryName}: ${entryErr.message} `);
      }
    }

    const msg = `
Öğrenciler: ${stats.students}
            Sınıf Grupları: ${stats.groups}
Çalışmalar: ${stats.studies}
Atamalar: ${stats.assignments}
            Öğrenci Cevap Kayıtları: ${stats.answers}
Hatalar: ${stats.errors.length}
`;

    console.log("[RESTORE] Completed.", stats);
    res.json({ status: "ok", message: msg });

  } catch (e) {
    console.error("Restore error:", e);
    res.status(500).json({ status: "error", message: e.message });
  }
});

// --- SUNUCUYU BAŞLAT ---
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Sunucu ${PORT} portunda hazır!(SQL Modu)`);
  logToFile("SERVER RESTARTED - LOGGING INITIALIZED");
  await autoMigrate();
});