const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { query } = require("./db");
require("dotenv").config();

const app = express();

app.use(express.json({ limit: '50mb' })); // Increased limit just in case
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// --- 1. PORT AYARI ---
const PORT = process.env.PORT || 3000;

// --- 2. GÜVENLİK ---
app.get(/\.html$/, (req, res) => { res.status(403).send("Yasak."); });
app.use(express.static(__dirname, { index: false }));

// --- 3. SAYFA YÖNLENDİRMELERİ ---
app.get("/21012012", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/giris", (req, res) => res.sendFile(path.join(__dirname, "ogrenci.html")));

app.get("/degerlendirme", (req, res) => {
  if (fs.existsSync(path.join(__dirname, "degerlendirme.html"))) {
    res.sendFile(path.join(__dirname, "degerlendirme.html"));
  } else {
    res.sendFile(path.join(__dirname, "index.html"));
  }
});

app.get("/", (req, res) => {
  res.status(403).send("<h1>Giriş Yetkisi Yok. Lütfen özel linki kullanın.</h1>");
});

// --- 4. YARDIMCI FONKSİYONLAR ---
function dosyaIsmiTemizle(isim) { return isim ? isim.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_\- ]/g, "").trim() : ""; }
// Strict Turkish character normalization
function sinifIsmiTemizle(isim) { return isim ? isim.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, "") : ""; }

function jsonOku(dosyaYolu) {
  if (!fs.existsSync(dosyaYolu)) return [];
  try { return JSON.parse(fs.readFileSync(dosyaYolu, "utf-8")); } catch (e) { return []; }
}

// --- 5. API İŞLEMLERİ (SQL + LAZY MIGRATION) ---

// 5.1 Grup Listesi (Lazy Migration: DB -> File -> DB)
app.get("/grupListesiGetir", async (req, res) => {
  try {
    const rawSinif = req.query.sinif; // e.g. "9-A"
    const normalizedSinif = sinifIsmiTemizle(rawSinif); // e.g. "9A"

    // 1. Try DB
    let resDb = await query("SELECT groups_data FROM class_groups WHERE class_name = $1", [rawSinif]);
    if (resDb.rows.length === 0) {
      // Try normalized if raw failed
      resDb = await query("SELECT groups_data FROM class_groups WHERE class_name = $1", [normalizedSinif]);
    }

    if (resDb.rows.length > 0 && resDb.rows[0].groups_data) {
      res.json(resDb.rows[0].groups_data);
    } else {
      // 2. Fallback: Check File System (Strict Name)
      const strictPath = path.join(__dirname, `${normalizedSinif}Grupları.json`);
      if (fs.existsSync(strictPath)) {
        const content = jsonOku(strictPath);
        if (content.length > 0) {
          // Import to DB for next time
          await query(`
                    INSERT INTO class_groups (class_name, groups_data) VALUES ($1, $2)
                    ON CONFLICT (class_name) DO UPDATE SET groups_data = $2
                `, [rawSinif, content]);
        }
        res.json(content);
      } else {
        res.json([]);
      }
    }
  } catch (e) { console.error(e); res.json([]); }
});

// 5.2 Çalışma Listesi (DB)
app.get("/listeCalismalar", async (req, res) => {
  try {
    const files = [];
    // Studies
    const studies = await query("SELECT name FROM studies WHERE is_archived = FALSE");
    studies.rows.forEach(s => files.push(`qwx${s.name}.json`));
    // Assignments
    const assigns = await query(`
        SELECT a.class_name, s.name as study_name 
        FROM study_assignments a 
        JOIN studies s ON a.study_id = s.id
        WHERE s.is_archived = FALSE
    `);
    assigns.rows.forEach(a => files.push(`qqq${a.class_name.replace(/\s/g, '')}${a.study_name}.json`));

    res.json(files);
  } catch (e) { console.error(e); res.json([]); }
});

// 5.3 Çalışma Getir (DB -> File Fallback removed, mostly DB now)
app.get("/calismaGetir", async (req, res) => {
  try {
    let isim = req.query.isim;
    if (!isim) return res.json([]);

    if (isim.startsWith("qwx")) {
      const name = isim.replace("qwx", "").replace(".json", "");
      const resDb = await query("SELECT content FROM studies WHERE name = $1", [name]);
      if (resDb.rows.length > 0) res.json(resDb.rows[0].content);
      else res.json([]); // Empty if (file-based) not in DB yet. Could add lazy migration here too if needed.

    } else if (isim.startsWith("qqq")) {
      // Assignment
      const cleanIsim = isim.replace(".json", "");
      const all = await query(`SELECT a.*, s.name as study_name FROM study_assignments a JOIN studies s ON a.study_id = s.id`);
      const found = all.rows.find(row => `qqq${row.class_name.replace(/\s/g, '')}${row.study_name}` === cleanIsim);

      if (found) {
        res.json({
          id: isim,
          sinif: found.class_name,
          calisma: found.study_name,
          yontem: found.method,
          ...found.settings
        });
      } else res.json([]);

    } else if (isim.startsWith("www_")) {
      // Evaluations
      const name = isim.replace("www_", "");
      const studyRes = await query("SELECT id FROM studies WHERE name = $1", [name]);
      if (studyRes.rows.length === 0) return res.json([]);

      const evals = await query("SELECT * FROM student_evaluations WHERE study_id = $1", [studyRes.rows[0].id]);
      // Map to legacy format
      const mapped = evals.rows.map(row => {
        if (row.student_school_no === 'AYARLAR') return row.answers;
        return {
          ogrenciNo: row.student_school_no,
          sinif: row.class_name,
          cevaplar: row.answers.cevaplar || [],
          puanlar: row.scores,
          girisSayisi: row.entry_count,
          degerlendirme: row.evaluation
        };
      });
      res.json(mapped);
    } else {
      res.json([]);
      await query(
        "INSERT INTO student_evaluations (study_id, student_school_no, class_name, scores) VALUES ($1, $2, $3, $4)",
        [studyId, String(ogrenciNo), sinif, '{}']
      );
    }

    if (!scores[soruIndex]) scores[soruIndex] = [];
    scores[soruIndex][cevapIndex] = parseInt(puan);

    await query(
      "UPDATE student_evaluations SET scores = $1 WHERE study_id = $2 AND student_school_no = $3",
      [scores, studyId, String(ogrenciNo)]
    );

    res.json({ status: "ok" });
  } catch (e) { console.error(e); res.status(500).send(); }
});

// Değerlendirme Bitir
app.post("/degerlendirmeBitir", async (req, res) => {
  const { dosyaAdi, ogrenciNo, sinif } = req.body;
  const studyName = dosyaAdi.replace("www_", "");

  try {
    const studyRes = await query("SELECT id FROM studies WHERE name = $1", [studyName]);
    if (studyRes.rows.length === 0) return res.status(404).send();
    const studyId = studyRes.rows[0].id;

    const evalRes = await query(
      "SELECT scores FROM student_evaluations WHERE study_id = $1 AND student_school_no = $2",
      [studyId, String(ogrenciNo)]
    );

    if (evalRes.rows.length === 0) return res.status(404).send();

    const scores = evalRes.rows[0].scores || {};
    let toplam = 0;
    Object.values(scores).forEach((soruDizisi) => {
      if (Array.isArray(soruDizisi)) {
        soruDizisi.forEach((p) => { if (p) toplam += parseInt(p); });
      }
    });

    const evaluation = { toplam: toplam, bitti: true };
    await query(
      "UPDATE student_evaluations SET evaluation = $1 WHERE study_id = $2 AND student_school_no = $3",
      [evaluation, studyId, String(ogrenciNo)]
    );

    res.json({ status: "ok", toplam });
  } catch (e) { console.error(e); res.status(500).send(); }
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

      const settings = {
        gorme: assignment.gorme,
        yapma: assignment.yapma,
        degerl: assignment.degerl,
        sure: assignment.sure,
        bitis: assignment.bitis
      };

      await query(`
            INSERT INTO study_assignments (study_id, class_name, method, settings)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (study_id, class_name) 
            DO UPDATE SET method = $3, settings = $4
        `, [studyId, assignment.sinif, assignment.yontem, settings]);

    } else {
      // It's a study definition (qwx prefixed in legacy, just name here)
      // FIX: Ensure we strip 'qwx' if sent by frontend
      const name = calismaIsmi.replace(/^qwx/, "").replace(".json", "");
      const content = sorular; // { aciklama, sorular }

      await query(`
            INSERT INTO studies (name, content)
            VALUES ($1, $2)
            ON CONFLICT (name) 
            DO UPDATE SET content = $2
        `, [name, content]);
    }

    res.json({ status: "ok" });
  } catch (err) { console.error(err); res.status(500).json({ status: "error" }); }
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
      await query(`
            INSERT INTO class_groups (class_name, groups_data)
            VALUES ($1, $2)
            ON CONFLICT (class_name) DO UPDATE SET groups_data = $2
        `, [sinif, gruplar]);
      return res.json({ status: "ok" });
    } catch (e) { console.error(e); return res.status(500).json({ status: "error" }); }
  }

  // 2. Student Answers / Settings
  if (dosyaAdi && veri) {
    try {
      if (dosyaAdi.startsWith("www_")) {
        const studyName = dosyaAdi.replace("www_", "");
        const studyRes = await query("SELECT id FROM studies WHERE name = $1", [studyName]);
        if (studyRes.rows.length === 0) return res.status(404).send();
        const studyId = studyRes.rows[0].id;

        // veri can be array or object
        const items = Array.isArray(veri) ? veri : [veri];

        for (const item of items) {
          if (item.ogrenciNo === "AYARLAR") {
            // Update specific assignment settings if needed or separate setting?
            // Legacy stores AYARLAR in www_ file.
            // We'll store it as a special student record for now to keep it simple, OR check if we can move it to `study_assignments`.
            // Legacy: AYARLAR has { degerlendirmeIzni, izin }
            // Let's store it in `student_evaluations` with 'AYARLAR' as id, or updated `study_assignments` if we can match class.
            // Problem: AYARLAR in legacy might be per study, but global for that study file?
            // Actually `index.html` sends `sinif: "SISTEM"` for AYARLAR.

            // Let's just update the assignment settings?
            // BUT `admin.html` or `index.html` logic for AYARLAR might be specific.
            // Let's stick to `student_evaluations` with 'AYARLAR' for now.

            await query(`
                    INSERT INTO student_evaluations (study_id, student_school_no, answers)
                    VALUES ($1, 'AYARLAR', $2)
                    ON CONFLICT (study_id, student_school_no) DO UPDATE SET answers = $2
                `, [studyId, item]);

          } else {
            // Regular student answer
            await query(`
                    INSERT INTO student_evaluations (study_id, student_school_no, class_name, answers, scores, entry_count, evaluation, last_updated)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                    ON CONFLICT (study_id, student_school_no) 
                    DO UPDATE SET answers = $4, scores = $5, entry_count = $6, evaluation = $7, last_updated = NOW()
                 `, [
              studyId,
              String(item.ogrenciNo),
              item.sinif,
              { cevaplar: item.cevaplar }, // Wrap to match expected DB structure 
              item.puanlar || {},
              item.girisSayisi || 0,
              item.degerlendirme || {}
            ]);
          }
        }
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
    } catch (e) { console.error(e); return res.status(500).json({ status: "error" }); }
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
      const name = isim.replace("www_", "");
      const studyRes = await query("SELECT id FROM studies WHERE name = $1", [name]);

      if (studyRes.rows.length === 0) return res.json([]);
      const studyId = studyRes.rows[0].id;

      // JOIN with students to get name
      const evals = await query(`
          SELECT se.*, s.name as student_name 
          FROM student_evaluations se
          LEFT JOIN students s ON se.student_school_no = s.school_no
          WHERE se.study_id = $1
      `, [studyId]);

      // Map back to legacy format
      const mapped = evals.rows.map(row => {
        if (row.student_school_no === 'AYARLAR') {
          return row.answers; // Already legacy object
        }
        return {
          ogrenciNo: row.student_school_no,
          adSoyad: row.student_name, // Added for compatibility
          sinif: row.class_name,
          cevaplar: row.answers.cevaplar || [], // Unwrap
          puanlar: row.scores,
          girisSayisi: row.entry_count,
          degerlendirme: row.evaluation
        };
      });
      res.json(mapped);

      res.json(mapped);

    } else if (isim.endsWith("Grupları.json")) {
      // Fetch Class Groups (e.g. 9AGrupları.json)
      const className = isim.replace("Grupları.json", "");
      const resDb = await query("SELECT groups_data FROM class_groups WHERE class_name = $1", [className]);
      if (resDb.rows.length > 0) res.json(resDb.rows[0].groups_data);
      else res.status(404).send();

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

// Legacy veritabani.json endpoint (Simulated from DB)
app.get("/veritabani.json", async (req, res) => {
  try {
    const students = await query("SELECT * FROM students");
    // Group by class_name
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
  } catch (e) { console.error(e); res.status(500).json({}); }
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

      await query(`
            INSERT INTO class_groups (class_name, groups_data)
            VALUES ($1, $2)
            ON CONFLICT (class_name) DO UPDATE SET groups_data = $2
        `, [className, content]);
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

      await query(`
            INSERT INTO class_groups (class_name, groups_data)
            VALUES ($1, $2)
            ON CONFLICT (class_name) DO UPDATE SET groups_data = $2
        `, [className, content]);
      console.log(`Migrated group: ${file} (Class: ${className})`);
    }
  } catch (e) {
    console.warn("Auto-migration failed (likely due to no DB connection locally):", e.message);
  }
}

// --- SUNUCUYU BAŞLAT ---
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Sunucu ${PORT} portunda hazır! (SQL Modu)`);
  await autoMigrate();
});