use rusqlite::{params, Connection, Result};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use std::fs;

pub struct DbState {
    pub db: Mutex<Connection>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct DocumentRow {
    pub id: String,
    pub title: String,
    pub char_count: i64,
    pub paragraph_count: i64,
    pub outline_json: String,
    pub created_at: i64,
    pub updated_at: i64,
}

pub fn init_db(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_dir = app.path().app_data_dir().unwrap();
    std::fs::create_dir_all(&app_dir)?;
    let db_path = app_dir.join("hangeulflow.sqlite");

    let conn = Connection::open(&db_path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content BLOB NOT NULL,
            char_count INTEGER DEFAULT 0,
            paragraph_count INTEGER DEFAULT 0,
            outline_json TEXT DEFAULT '[]',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Seed samples if empty
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM documents", [], |row| row.get(0))?;
    
    if count == 0 {
        let sample1 = include_bytes!("../samples/샘플1_사업계획서.hwp");
        let sample2 = include_bytes!("../samples/샘플2_KTX.hwp");
        let sample3 = include_bytes!("../samples/샘플3_사례연구.hwp");
        let sample4 = include_bytes!("../samples/샘플4_서평.hwp");
        let sample5 = include_bytes!("../samples/샘플5_인공지능.hwp");

        let sample_files = [
            ("sample1", "샘플1_사업계획서", sample1.as_slice()),
            ("sample2", "샘플2_KTX", sample2.as_slice()),
            ("sample3", "샘플3_사례연구", sample3.as_slice()),
            ("sample4", "샘플4_서평", sample4.as_slice()),
            ("sample5", "샘플5_인공지능", sample5.as_slice()),
        ];

        let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as i64;
        
        for (id, title, data) in sample_files {
            let _ = conn.execute(
                "INSERT INTO documents (id, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id.to_string(), title, data, now, now],
            );
        }
    }

    app.manage(DbState {
        db: Mutex::new(conn),
    });

    Ok(())
}

#[tauri::command]
pub fn get_all_documents(state: tauri::State<DbState>) -> Result<Vec<DocumentRow>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, title, char_count, paragraph_count, outline_json, created_at, updated_at FROM documents ORDER BY updated_at DESC").map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(DocumentRow {
            id: row.get(0)?,
            title: row.get(1)?,
            char_count: row.get(2)?,
            paragraph_count: row.get(3)?,
            outline_json: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut docs = Vec::new();
    for r in rows {
        if let Ok(doc) = r {
            docs.push(doc);
        }
    }
    Ok(docs)
}

#[tauri::command]
pub fn load_document(state: tauri::State<DbState>, id: String) -> Result<Vec<u8>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT content FROM documents WHERE id = ?1").map_err(|e| e.to_string())?;
    
    let blob: Vec<u8> = stmt.query_row(params![id], |row| row.get(0)).map_err(|e| e.to_string())?;
    Ok(blob)
}

#[tauri::command]
pub fn save_document(
    state: tauri::State<DbState>, 
    id: String, 
    title: String, 
    data: Vec<u8>, 
    char_count: i64, 
    paragraph_count: i64, 
    outline_json: String
) -> Result<(), String> {
    println!("DEBUG: save_document called for id: {}, title: {}, data size: {}", id, title, data.len());
    let conn = state.db.lock().unwrap();
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as i64;
    
    conn.execute(
        "INSERT INTO documents (id, title, content, char_count, paragraph_count, outline_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            content = excluded.content,
            char_count = excluded.char_count,
            paragraph_count = excluded.paragraph_count,
            outline_json = excluded.outline_json,
            updated_at = excluded.updated_at",
        params![id, title, data, char_count, paragraph_count, outline_json, now, now],
    ).map_err(|e| {
        println!("DEBUG: save_document error: {}", e);
        e.to_string()
    })?;
    
    println!("DEBUG: save_document success");
    Ok(())
}

#[tauri::command]
pub fn delete_document(state: tauri::State<DbState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM documents WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}
