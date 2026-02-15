const { query } = require("./db");

async function migrate() {
    console.log("Starting migration for class_groups...");
    try {
        // 1. Drop the existing primary key
        await query(`ALTER TABLE class_groups DROP CONSTRAINT IF EXISTS class_groups_pkey;`);

        // 2. Add study_name column if it doesn't exist
        await query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='class_groups' AND column_name='study_name') THEN 
                    ALTER TABLE class_groups ADD COLUMN study_name VARCHAR(255) DEFAULT 'GENEL'; 
                END IF; 
            END 
            $$;
        `);

        // 3. Re-create Primary Key to include study_name
        await query(`ALTER TABLE class_groups ADD PRIMARY KEY (class_name, study_name);`);

        console.log("Migration successful: class_groups table updated.");
    } catch (e) {
        console.error("Migration failed:", e);
    }
}

migrate();
