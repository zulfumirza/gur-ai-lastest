use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, path::Path};

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    OpenRouter,
    Gur,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ModelEntry {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub tagline: String,
    pub provider: Provider,
    pub upstream: String,
    #[serde(default)]
    pub reasoning: bool,
    #[serde(default)]
    pub powered_by: String,
}

#[derive(Debug, Deserialize)]
struct CatalogFile {
    default: String,
    #[serde(rename = "model")]
    models: Vec<ModelEntry>,
}

#[derive(Debug, Clone)]
pub struct Catalog {
    pub default: String,
    pub ordered: Vec<ModelEntry>,
    by_id: HashMap<String, usize>,
}

impl Catalog {
    pub fn parse(src: &str) -> Result<Self> {
        let file: CatalogFile = toml::from_str(src).context("models.toml okunamadı")?;
        let mut by_id = HashMap::new();
        for (i, m) in file.models.iter().enumerate() {
            if by_id.insert(m.id.clone(), i).is_some() {
                bail!("models.toml: '{}' kimliği iki kez tanımlanmış", m.id);
            }
        }
        if !by_id.contains_key(&file.default) {
            bail!("models.toml: varsayılan model '{}' listede yok", file.default);
        }
        Ok(Self { default: file.default, ordered: file.models, by_id })
    }

    pub fn load(path: &Path) -> Result<Self> {
        let src = std::fs::read_to_string(path)
            .with_context(|| format!("{} bulunamadı", path.display()))?;
        Self::parse(&src)
    }

    pub fn get(&self, id: &str) -> Option<&ModelEntry> {
        self.by_id.get(id).map(|&i| &self.ordered[i])
    }
}

#[derive(Debug, Clone)]
pub struct Settings {
    pub bind: String,
    pub openrouter_key: Option<String>,
    pub openrouter_base: String,
    pub gur_base: Option<String>,
    pub gur_key: Option<String>,
    pub app_url: String,
    pub rate_per_min: u32,
    pub max_input_chars: usize,
}

impl Settings {
    pub fn from_env() -> Self {
        let get = |k: &str| std::env::var(k).ok().filter(|v| !v.trim().is_empty());
        Self {
            bind: get("BIND").unwrap_or_else(|| "127.0.0.1:8787".into()),
            openrouter_key: get("OPENROUTER_API_KEY"),
            openrouter_base: get("OPENROUTER_BASE")
                .unwrap_or_else(|| "https://openrouter.ai/api/v1".into()),
            gur_base: get("GUR_API_BASE"),
            gur_key: get("GUR_API_KEY"),
            app_url: get("APP_URL").unwrap_or_else(|| "https://gur.app".into()),
            rate_per_min: get("RATE_PER_MIN").and_then(|v| v.parse().ok()).unwrap_or(20),
            max_input_chars: get("MAX_INPUT_CHARS")
                .and_then(|v| v.parse().ok())
                .unwrap_or(120_000),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_bundled_catalog() {
        let c = Catalog::parse(include_str!("../models.toml")).unwrap();
        assert_eq!(c.default, "gur-meridian");
        assert!(c.get("gur-0.1").is_some());
        assert_eq!(c.get("gur-meridian").unwrap().provider, Provider::OpenRouter);
    }

    #[test]
    fn rejects_unknown_default() {
        let src = r#"default = "x"
[[model]]
id = "a"
name = "A"
provider = "gur"
upstream = "a""#;
        assert!(Catalog::parse(src).is_err());
    }
}
