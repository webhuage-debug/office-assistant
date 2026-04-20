use crate::config::ResolvedAppConfig;

#[derive(Clone)]
pub struct AppState {
  pub config: ResolvedAppConfig,
}
