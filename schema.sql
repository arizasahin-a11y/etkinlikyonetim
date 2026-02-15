-- Students Table
CREATE TABLE IF NOT EXISTS students (
    school_no VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    class_name VARCHAR(50),
    phone VARCHAR(50),
    parent_phone VARCHAR(50),
    email VARCHAR(255),
    drive_link TEXT,
    extra_info JSONB
);

-- Studies Table (previously qwx*.json files)
CREATE TABLE IF NOT EXISTS studies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL, -- The study name (e.g., "Sıvı Basıncı")
    content JSONB, -- Stores { aciklama: "...", sorular: [...] }
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Class Groups Table (previously *Grupları.json)
CREATE TABLE IF NOT EXISTS class_groups (
    class_name VARCHAR(50),
    study_name VARCHAR(255) DEFAULT 'GENEL', -- Default for migration
    groups_data JSONB, -- [[student1, student2], [student3, ...]]
    PRIMARY KEY (class_name, study_name)
);

-- Study Assignments Table (previously qqq*.json files)
-- Maps a study to a class with specific settings
CREATE TABLE IF NOT EXISTS study_assignments (
    id SERIAL PRIMARY KEY,
    study_id INTEGER REFERENCES studies(id) ON DELETE CASCADE,
    class_name VARCHAR(50),
    method VARCHAR(50), -- 'Grup' or 'Tek'
    settings JSONB, -- { gorme, yapma, degerl, sure, bitis }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(study_id, class_name)
);

-- Student Evaluations Table (previously www_*.json files)
-- Stores answers and scores for a specific study assignment
CREATE TABLE IF NOT EXISTS student_evaluations (
    id SERIAL PRIMARY KEY,
    study_id INTEGER REFERENCES studies(id) ON DELETE CASCADE,
    student_school_no VARCHAR(50) REFERENCES students(school_no) ON DELETE CASCADE,
    class_name VARCHAR(50),
    answers JSONB, -- Array of { soruIndex, cevaplar: [] }
    scores JSONB, -- Object or Array of scores
    evaluation JSONB, -- { bitti: boolean, toplam: number }
    entry_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(study_id, student_school_no)
);
