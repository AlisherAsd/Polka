// Точка входа нативного приложения «Полка» (macOS, Tauri + WKWebView).
// Фронтенд — статика Nuxt (`frontend/.output/public`), данные приходят
// с API по HTTPS (адрес задаётся в `tauri.conf.json` → `frontendDist`).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("не удалось запустить приложение Полка");
}
