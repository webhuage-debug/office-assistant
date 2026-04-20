#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod config;
mod db;
mod models;
mod repositories;
mod state;

use tauri::Manager;

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      let config = config::load_or_init_config(app.handle()).expect("failed to load app config");
      db::bootstrap_database(&config.database_path).expect("failed to initialize database");
      app.manage(state::AppState { config });
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::get_app_config,
      commands::list_projects,
      commands::get_project,
      commands::create_project,
      commands::update_project,
      commands::delete_project,
      commands::get_dashboard_stats,
      commands::list_cad_documents,
      commands::create_cad_document,
      commands::parse_cad_document,
      commands::delete_cad_document,
      commands::get_cad_pipeline_stats,
      commands::list_node_entries,
      commands::import_node_entries,
      commands::delete_node_entry,
      commands::get_node_overview_stats,
      commands::list_node_quality_rankings,
      commands::get_node_quality_stats,
      commands::run_node_tests,
      commands::list_node_test_runs,
      commands::list_node_test_results,
      commands::export_json_backup,
      commands::export_csv_backup,
      commands::export_database_backup,
      commands::import_json_backup
    ])
    .run(tauri::generate_context!())
    .expect("error while running smart-home-office-assistant");
}
