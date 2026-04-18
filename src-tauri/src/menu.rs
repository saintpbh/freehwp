use tauri::{App, Manager, Emitter};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};

pub fn setup_menu(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();

    let file_submenu = Submenu::with_items(
        handle,
        "파일",
        true,
        &[
            &MenuItem::with_id(handle, "new", "새 문서", true, Some("CmdOrControl+N"))?,
            &MenuItem::with_id(handle, "open", "열기...", true, Some("CmdOrControl+O"))?,
            &MenuItem::with_id(handle, "save", "저장하기", true, Some("CmdOrControl+S"))?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(handle, "close_document", "창 닫기", true, Some("CmdOrControl+W"))?,
        ],
    )?;

    let edit_submenu = Submenu::with_items(
        handle,
        "편집",
        true,
        &[
            &PredefinedMenuItem::undo(handle, Some("실행 취소"))?,
            &PredefinedMenuItem::redo(handle, Some("다시 실행"))?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::cut(handle, Some("오려두기"))?,
            &PredefinedMenuItem::copy(handle, Some("복사하기"))?,
            &PredefinedMenuItem::paste(handle, Some("붙이기"))?,
            &PredefinedMenuItem::select_all(handle, Some("모두 선택"))?,
        ],
    )?;

    let insert_submenu = Submenu::with_items(
        handle,
        "입력",
        true,
        &[
            &MenuItem::with_id(handle, "bible", "말씀(성경) 삽입", true, Some("CmdOrControl+J"))?,
        ],
    )?;

    let window_submenu = Submenu::with_items(
        handle,
        "창",
        true,
        &[
            &PredefinedMenuItem::minimize(handle, Some("최소화"))?,
            &PredefinedMenuItem::maximize(handle, Some("확대"))?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::fullscreen(handle, Some("전체 화면"))?,
        ],
    )?;

    #[cfg(target_os = "macos")]
    let app_submenu = Submenu::with_items(
        handle,
        "맘편한설교노트",
        true,
        &[
            &PredefinedMenuItem::about(handle, None, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::services(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::hide(handle, None)?,
            &PredefinedMenuItem::hide_others(handle, None)?,
            &PredefinedMenuItem::show_all(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::quit(handle, None)?,
        ],
    )?;

    #[cfg(target_os = "macos")]
    let menu = Menu::with_items(handle, &[&app_submenu, &file_submenu, &edit_submenu, &insert_submenu, &window_submenu])?;

    #[cfg(not(target_os = "macos"))]
    let menu = Menu::with_items(handle, &[&file_submenu, &edit_submenu, &insert_submenu, &window_submenu])?;

    app.set_menu(menu)?;

    app.on_menu_event(move |app_handle, event| {
        let id_str = event.id().0.as_str();
        if ["new", "open", "save", "bible", "close_document"].contains(&id_str) {
            let _ = app_handle.emit(&format!("menu-{}", id_str), ());
        }
    });

    Ok(())
}
