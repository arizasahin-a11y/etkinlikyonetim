const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

// Helper to clean names
const cleanName = (name) => name.replace(".json", "");

async function migrate() {
    console.log("Starting migration...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 0. Create Schema
        console.log("Creating schema...");
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
        await client.query(schema);

        // 1. Migrate Students (veritabani.json)
        console.log("Migrating students...");
        if (fs.existsSync('veritabani.json')) {
            const data = JSON.parse(fs.readFileSync('veritabani.json', 'utf-8'));
            // data is { "9": [...], "10": [...] }
            const allStudents = [];
            Object.values(data).forEach(group => {
                if (Array.isArray(group)) allStudents.push(...group);
            });

            for (const s of allStudents) {
                // Map fields
                // "Okul Numaranız": 2500, "Adınız Soyadınız": "...", "Sınıfınız": "9A"
                const schoolNo = String(s["Okul Numaranız"]);
                const name = s["Adınız Soyadınız"];
                const className = s["Sınıfınız"];
                // Phone cleaning might be needed
                const phone = s["Telefon numaranız"];
                const parentPhone = s["Velinizin telefon numarası"];
                const email = s["E-Posta Adresiniz"];
                const drive = s["Drive Klasörünüzün linki"];

                // Store extra info?
                const extra = { ...s };
                delete extra["Okul Numaranız"];
                delete extra["Adınız Soyadınız"];
                delete extra["Sınıfınız"];

                await client.query(`
                    INSERT INTO students (school_no, name, class_name, phone, parent_phone, email, drive_link, extra_info)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (school_no) DO NOTHING
                `, [schoolNo, name, className, phone, parentPhone, email, drive, extra]);
            }
        }

        // 2. Migrate Studies (qwx*.json)
        console.log("Migrating studies...");
        const files = fs.readdirSync(__dirname);
        const studies = files.filter(f => f.startsWith('qwx') && f.endsWith('.json'));

        for (const file of studies) {
            const name = cleanName(file).replace("qwx", "");
            const content = JSON.parse(fs.readFileSync(file, 'utf-8'));

            // Insert study
            const res = await client.query(`
                INSERT INTO studies (name, content)
                VALUES ($1, $2)
                ON CONFLICT (name) DO UPDATE SET content = $2
                RETURNING id
            `, [name, content]);
            const studyId = res.rows[0].id;

            // 3. Migrate Evaluations for this study (www_*.json)
            // The corresponding www file is www_Name.json
            const wwwFile = `www_${name}.json`;
            if (fs.existsSync(wwwFile)) {
                console.log(`  Migrating evaluations for ${name}...`);
                const evals = JSON.parse(fs.readFileSync(wwwFile, 'utf-8'));
                // evals is array of student objects
                for (const item of evals) {
                    if (item.ogrenciNo === "AYARLAR") {
                        await client.query(`
                            INSERT INTO student_evaluations (study_id, student_school_no, answers, last_updated)
                            VALUES ($1, $2, $3, NOW())
                            ON CONFLICT (study_id, student_school_no) DO UPDATE SET answers = $3
                        `, [studyId, 'AYARLAR', item]);
                    } else {
                        const answers = item.cevaplar || []; // Array usually, but my server code wrapped it? Legacy is array.
                        // My server.js expects { cevaplar: [...] } in column `answers`.
                        // So I should wrap it here to match my server.js logic?
                        // Server.js: `answers = { cevaplar: answers }`
                        // Let's wrap it to be consistent.
                        const dbAnswers = { cevaplar: answers };

                        await client.query(`
                            INSERT INTO student_evaluations (study_id, student_school_no, class_name, answers, scores, entry_count, evaluation, last_updated)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                            ON CONFLICT (study_id, student_school_no) DO UPDATE SET scores = $5, evaluation = $7
                        `, [
                            studyId,
                            String(item.ogrenciNo),
                            item.sinif,
                            dbAnswers,
                            item.puanlar || {},
                            item.girisSayisi || 0,
                            item.degerlendirme || {}
                        ]);
                    }
                }
            }
        }

        // 4. Migrate Class Groups (*Grupları.json)
        console.log("Migrating class groups...");
        const groupFiles = files.filter(f => f.match(/^[0-9A-Za-z]+Grupları\.json$/));
        for (const file of groupFiles) {
            const className = file.replace("Grupları.json", "");
            const content = JSON.parse(fs.readFileSync(file, 'utf-8'));

            await client.query(`
                INSERT INTO class_groups (class_name, groups_data)
                VALUES ($1, $2)
                ON CONFLICT (class_name) DO UPDATE SET groups_data = $2
            `, [className, content]);
        }

        // 5. Migrate Assignments (qqq*.json)
        console.log("Migrating assignments...");
        const assignFiles = files.filter(f => f.startsWith('qqq') && f.endsWith('.json'));
        for (const file of assignFiles) {
            const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
            // content should be legacy assignment object
            // { id, sinif, calisma, yontem, ... }
            // We need study_id
            const studyName = content.calisma;
            const studyRes = await client.query("SELECT id FROM studies WHERE name = $1", [studyName]);

            if (studyRes.rows.length > 0) {
                const studyId = studyRes.rows[0].id;
                const settings = {
                    gorme: content.gorme,
                    yapma: content.yapma,
                    degerl: content.degerl,
                    sure: content.sure,
                    bitis: content.bitis
                };

                await client.query(`
                    INSERT INTO study_assignments (study_id, class_name, method, settings)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (study_id, class_name) DO UPDATE SET settings = $4
                 `, [studyId, content.sinif, content.yontem, settings]);
            }
        }

        await client.query('COMMIT');
        console.log("Migration finished successfully!");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
