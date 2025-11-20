// packages/desktop/src-tauri/src/main.rs

use tauri::Manager; // 引入 Manager trait

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)] // 开发模式
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            // 如果你想在打出来的包里也能按 F12 看报错，把下面的注释解开：
            let window = app.get_webview_window("main").unwrap();
            window.open_devtools();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}