const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkGroups() {
    try {
        await client.connect();
        console.log("Connected to DB.");

        const res = await client.query("SELECT class_name FROM class_groups");
        console.log("Groups found:", res.rows);

        if (res.rows.length === 0) {
            console.log("WARNING: No groups found in 'class_groups' table.");
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

checkGroups();
