const express = require("express");
const path = require("path");
const cors = require("cors");
const { query } = require("./db");
require("dotenv").config();

const app = express();
app.use(express.json({ limit: '50mb' })); // Increased limit just in case
app.use(cors());

// --- 1. PORT AYARI ---
const PORT = process.env.PORT || 3000;

// --- 2. GÜVENLİK ---
app.get(/\.html$/, (req, res) => { res.status(403).send("Yasak."); });
app.use(express.static(__dirname, { index: false }));

// --- 3. SAYFA YÖNLENDİRMELERİ ---
app.get("/21012012", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/giris", (req, res) => res.sendFile(path.join(__dirname, "ogrenci.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "admin.html")));

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

// --- 4. YARDIMCI FONKSİYONLAR ---
// Not needed for DB connection but kept for compatibility logic if any
function dosyaIsmiTemizle(isim) { return isim ? isim.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_\- ]/g, "").trim() : ""; }

// --- 5. API İŞLEMLERİ (SQL UYARLAMASI) ---

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
      const content = sorular; // { aciklama, sorular }

      await query(`
            INSERT INTO studies (name, content)
            VALUES ($1, $2)
            ON CONFLICT (name) 
            DO UPDATE SET content = $2
        `, [calismaIsmi, content]);
    }

    res.json({ status: "ok" });
  } catch (err) { console.error(err); res.status(500).json({ status: "error" }); }
});

app.post("/calismaSil", async (req, res) => {
  try {
    const { calismaIsmi } = req.body;
    // Identify if study or assignment
    // Legacy: qwxName -> Study, qqqName -> Assignment

    if (calismaIsmi.startsWith("qwx")) {
      // Delete Study
      const name = calismaIsmi.replace("qwx", "");
      await query("DELETE FROM studies WHERE name = $1", [name]);
    } else if (calismaIsmi.startsWith("qqq")) {
      // Delete Assignment
      // Need to parse ID to find study/class? 
      // Or just delete from assignments table if we can match legacy ID?
      // Legacy ID: qqqClassStudy
      // We might need a smarter way or just delete by ID if we send ID.
      // The frontend sends ID as `calismaIsmi`.
      // Let's try to match it or clean up DB later.
      // Actually, frontend sends `id` for assignments.
      // We'll trust the frontend naming convention for now OR fix frontend to send ID.
      // For now, let's assume we can find the assignment.
      // But since we moved to SQL, we should prefer ID. 
      // However, maintaining compatibility means we parse the string.
      // "qqq9ASıvı Basıncı" -> Class: 9A, Study: Sıvı Basıncı
      // This parsing is brittle.
      // BETTER: Frontend logic sends the ID. In new system, we can just delete from assignments table.
      // But for compatibility with existing frontend logic:
      // We will loop through assignments and constructs IDs to match? No, too slow.
      // Let's assume we delete by Study Name if `qwx` and by Assignment attributes if `qqq`.

      // Actually, let's look at `index.html`: `s3Del(id)` sends `calismaIsmi: id`.
      // `id` is constructed as `qqq` + `sinif.replace(/\s/g,'')` + `calisma.replace("qwx","")`.

      // We can reconstruct this logic in SQL via a smart query or just list assignments and match in JS.
      // Listing is better for small data.
      const allAssignments = await query(`
            SELECT a.id, s.name as study_name, a.class_name 
            FROM study_assignments a 
            JOIN studies s ON a.study_id = s.id
        `);

      const target = allAssignments.rows.find(row => {
        const constructedId = "qqq" + row.class_name.replace(/\s/g, '') + row.study_name;
        return constructedId === calismaIsmi;
      });

      if (target) {
        await query("DELETE FROM study_assignments WHERE id = $1", [target.id]);
      }
    } else {
      // Assume normal study deletion if not prefixed
      await query("DELETE FROM studies WHERE name = $1", [calismaIsmi]);
    }

    res.json({ status: "ok" });
  } catch (e) { console.error(e); res.status(500).json({ status: "error" }); }
});

app.post("/arsivle", async (req, res) => {
  try {
    // req.body.dosyaIsmi (e.g., "Sıvı Basıncı")
    const name = req.body.dosyaIsmi;
    await query("UPDATE studies SET is_archived = TRUE WHERE name = $1", [name]);
    res.json({ status: "ok" });
  } catch (e) { console.error(e); res.status(500).json({ status: "error" }); }
});

app.post("/arsivdenGeriYukle", async (req, res) => {
  try {
    const name = req.body.dosyaIsmi;
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
    const isim = req.query.isim;
    // Decode what we are fetching

    if (isim.startsWith("qwx")) {
      // Fetch Study Content
      const name = isim.replace("qwx", "");
      const resDb = await query("SELECT content FROM studies WHERE name = $1", [name]);
      if (resDb.rows.length > 0) res.json(resDb.rows[0].content);
      else res.status(404).send();

    } else if (isim.startsWith("qqq")) {
      // Fetch Assignment Config
      // We need to reverse engineer the name -> class + study?
      // Or just match constructed IDs from DB

      const allAssignments = await query(`
            SELECT a.*, s.name as study_name 
            FROM study_assignments a 
            JOIN studies s ON a.study_id = s.id
          `);

      const found = allAssignments.rows.find(row => {
        const constructedId = "qqq" + row.class_name.replace(/\s/g, '') + row.study_name;
        return constructedId === isim;
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

      const evals = await query("SELECT * FROM student_evaluations WHERE study_id = $1", [studyId]);

      // Map back to legacy format
      const mapped = evals.rows.map(row => {
        if (row.student_school_no === 'AYARLAR') {
          return row.answers; // Already legacy object
        }
        return {
          ogrenciNo: row.student_school_no,
          sinif: row.class_name,
          cevaplar: row.answers.cevaplar || [], // Unwrap
          puanlar: row.scores,
          girisSayisi: row.entry_count,
          degerlendirme: row.evaluation
        };
      });
      res.json(mapped);
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

app.get("/grupListesiGetir", async (req, res) => {
  try {
    const sinif = req.query.sinif;
    const resDb = await query("SELECT groups_data FROM class_groups WHERE class_name = $1", [sinif]);
    if (resDb.rows.length > 0) res.json(resDb.rows[0].groups_data);
    else res.json([]);
  } catch (e) { res.json([]); }
});

// Admin File List Helper
app.get("/yonetimDosyaListesi", async (req, res) => {
  try {
    const result = [];
    const studies = await query("SELECT name, is_archived FROM studies");
    studies.rows.forEach(s => {
      result.push({
        dosya_adi: `qwx${s.name}.json`,
        arsivde: s.is_archived
      });
      // Also pushing www files? Legacy had them separate. 
      // Admin panel expects "veritabani.json" too? `veritabani.json` is not in files table?
      // Actually legacy listed everything in dir.
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
      // Map back to legacy format
      result[s.class_name].push({
        "Okul Numaranız": s.school_no,
        "Adınız Soyadınız": s.name,
        "Sınıfınız": s.class_name,
        "Telefon numaranız": s.phone,
        "Velinizin telefon numarası": s.parent_phone,
        "E-Posta Adresiniz": s.email,
        "Drive Klasörünüzün linki": s.drive_link,
        ...s.extra_info // Spread extra info if any
      });
    });
    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({}); }
});

// --- SUNUCUYU BAŞLAT ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sunucu ${PORT} portunda hazır! (SQL Modu)`);
});