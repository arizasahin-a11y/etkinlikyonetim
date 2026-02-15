const fs = require('fs');
const path = require('path');
const { query } = require('./db');
require('dotenv').config();

async function migrateGroups() {
    try {
        const files = fs.readdirSync(__dirname);
        const groupFiles = files.filter(f => f.endsWith('Grupları.json'));

        console.log(`Bulunan Grup Dosyaları: ${groupFiles.length}`);

        for (const file of groupFiles) {
            const className = file.replace('Grupları.json', '');
            const filePath = path.join(__dirname, file);

            console.log(`Processing: ${file} -> Class: ${className}`);

            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const groupsData = JSON.parse(content);

                if (!Array.isArray(groupsData)) {
                    console.error(`Skipping ${file}: Invalid JSON format (not an array)`);
                    continue;
                }

                await query(`
                    INSERT INTO class_groups (class_name, groups_data)
                    VALUES ($1, $2::jsonb)
                    ON CONFLICT (class_name) 
                    DO UPDATE SET groups_data = $2::jsonb
                `, [className, JSON.stringify(groupsData)]);

                console.log(`✅ ${className} grupları veritabanına aktarıldı.`);

            } catch (err) {
                console.error(`❌ Error processing ${file}:`);
                console.error(err);
                if (err.stack) console.error(err.stack);
            }
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrateGroups();
