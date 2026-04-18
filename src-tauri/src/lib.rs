mod hwp_parser;
mod hwpx_writer;
mod document;
mod bible;
mod menu;
mod db;

use bible::BibleSearchResult;
use document::DocumentState;
use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

struct AppState {
    bible_db_path: PathBuf,
}

#[tauri::command]
async fn open_hwp(file_path: String) -> Result<DocumentState, String> {
    let doc = hwp_parser::parse_hwp(&file_path)?;
    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "알 수 없는 파일".to_string());

    Ok(DocumentState {
        file_path: Some(file_path),
        file_name,
        is_modified: false,
        char_count: doc.char_count,
        paragraph_count: doc.paragraph_count,
        html_content: doc.raw_html,
    })
}

#[tauri::command]
fn new_document() -> DocumentState {
    DocumentState::default()
}

#[tauri::command]
async fn export_txt(file_path: String, content: String) -> Result<(), String> {
    let plain = content
        .replace("<p>", "").replace("</p>", "\n")
        .replace("<br>", "\n").replace("<br/>", "\n")
        .replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&nbsp;", " ");
    let re = regex::Regex::new(r"<[^>]+>").map_err(|e| format!("정규식 오류: {}", e))?;
    let cleaned = re.replace_all(&plain, "").to_string();
    fs::write(&file_path, cleaned.trim())
        .map_err(|e| format!("파일 저장 실패: {}", e))
}

#[tauri::command]
async fn export_html(file_path: String, content: String, title: String) -> Result<(), String> {
    let html_doc = format!(
        r#"<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>{}</title>
<style>body{{font-family:'Batang',serif;line-height:1.6;max-width:800px;margin:0 auto;padding:40px;}}p{{margin:0 0 0.5em 0;}}</style>
</head><body>{}</body></html>"#, title, content);
    fs::write(&file_path, html_doc)
        .map_err(|e| format!("HTML 저장 실패: {}", e))
}

#[tauri::command]
async fn save_hwpx(file_path: String, content: String, title: String) -> Result<(), String> {
    hwpx_writer::save_as_hwpx(&file_path, &content, &title)
}

#[tauri::command]
async fn search_bible(
    state: tauri::State<'_, Mutex<AppState>>,
    query: String,
) -> Result<BibleSearchResult, String> {
    let state = state.lock().map_err(|e| format!("State lock 실패: {}", e))?;
    let conn = Connection::open(&state.bible_db_path)
        .map_err(|e| format!("성경 DB 열기 실패: {}", e))?;
    bible::search_bible(&conn, &query)
        .map_err(|e| format!("성경 검색 실패: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            if let Err(e) = db::init_db(&app.handle()) {
                eprintln!("DB 초기화 실패: {}", e);
            }

            let resource_path = app.path().resource_dir()
                .map_err(|e| format!("리소스 경로 실패: {}", e))?;
            let bible_db_path = resource_path.join("bible.db");

            app.manage(Mutex::new(AppState { bible_db_path }));

            if let Err(e) = menu::setup_menu(app) {
                eprintln!("메뉴 설정 실패: {}", e);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_hwp,
            new_document,
            export_txt,
            export_html,
            save_hwpx,
            search_bible,
            db::get_all_documents,
            db::load_document,
            db::save_document,
            db::delete_document,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| eprintln!("error while running tauri application: {}", e));
}
