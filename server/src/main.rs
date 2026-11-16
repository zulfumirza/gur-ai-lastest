mod chat;
mod config;
mod ratelimit;
mod sse;

use axum::{
    extract::{DefaultBodyLimit, State},
    routing::{get, post},
    Json, Router,
};
use config::{Catalog, Settings};
use serde_json::json;
use std::{net::SocketAddr, path::PathBuf, sync::Arc, time::Duration};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

pub struct AppState {
    pub catalog: Catalog,
    pub settings: Settings,
    pub http: reqwest::Client,
    pub limiter: ratelimit::RateLimiter,
}

async fn models(State(st): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let list: Vec<_> = st
        .catalog
        .ordered
        .iter()
        .map(|m| {
            let available = match m.provider {
                config::Provider::OpenRouter => st.settings.openrouter_key.is_some(),
                config::Provider::Gur => st.settings.gur_base.is_some(),
            };
            json!({
                "id": m.id,
                "name": m.name,
                "tagline": m.tagline,
                "reasoning": m.reasoning,
                "poweredBy": m.powered_by,
                "available": available,
            })
        })
        .collect();
    Json(json!({ "default": st.catalog.default, "models": list }))
}

async fn health() -> &'static str {
    "ok"
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let _ = dotenvy::dotenv();
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=info".into()),
        )
        .init();

    let settings = Settings::from_env();
    let models_path: PathBuf = std::env::var("MODELS_PATH")
        .unwrap_or_else(|_| "models.toml".into())
        .into();
    let catalog = Catalog::load(&models_path)?;
    if settings.openrouter_key.is_none() {
        tracing::warn!("OPENROUTER_API_KEY tanımlı değil; üçüncü taraf modeller kapalı");
    }

    let http = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .read_timeout(Duration::from_secs(120))
        .user_agent("gur-gateway/0.1")
        .build()?;

    let state = Arc::new(AppState {
        limiter: ratelimit::RateLimiter::new(settings.rate_per_min),
        catalog,
        http,
        settings: settings.clone(),
    });

    // TraceLayer yalnızca yöntem, yol, durum ve süreyi loglar; istek gövdeleri asla loglanmaz.
    let app = Router::new()
        .route("/health", get(health))
        .route("/v1/models", get(models))
        .route("/v1/chat", post(chat::chat))
        .layer(DefaultBodyLimit::max(1024 * 1024))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&settings.bind).await?;
    tracing::info!("Gur gateway {} adresinde", settings.bind);
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    Ok(())
}
