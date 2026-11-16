use crate::{
    config::{ModelEntry, Provider},
    sse::{parse_data, Chunk, LineBuffer},
    AppState,
};
use axum::{
    extract::{ConnectInfo, State},
    http::{HeaderMap, StatusCode},
    response::{
        sse::{Event, KeepAlive, Sse},
        IntoResponse, Response,
    },
    Json,
};
use futures::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{convert::Infallible, net::SocketAddr, sync::Arc, time::Duration};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Msg {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct ChatReq {
    pub model: Option<String>,
    pub messages: Vec<Msg>,
    /// "low" | "medium" | "high"
    pub effort: Option<String>,
    /// "sohbet" | "code" | "design" | "research" | "work"
    pub mode: Option<String>,
}

pub fn err(status: StatusCode, msg: &str) -> Response {
    (status, Json(json!({ "error": msg }))).into_response()
}

/// Modelin kimliği: Gur adıyla sunulur ama altyapısı sorulursa dürüst davranır.
fn system_prompt(m: &ModelEntry) -> String {
    let base = format!(
        "Sen Gur uygulamasındaki \"{name}\" asistanısın. Kullanıcının dilinde yanıt ver; \
         varsayılan dil Türkçe. Açık, sıcak ve öz ol. Kod ve listeler için Markdown kullan.",
        name = m.name
    );
    if m.provider == Provider::Gur || m.powered_by.is_empty() {
        base
    } else {
        format!(
            "{base} Bu uygulamada {name} adıyla sunuluyorsun. Altyapın sorulursa \
             {pb} tabanlı olduğunu dürüstçe söyleyebilirsin.",
            name = m.name,
            pb = m.powered_by
        )
    }
}

/// Her mod aynı motoru kullanır; yalnızca sistem promptuna kendi talimatını ekler.
fn mode_prompt(mode: Option<&str>) -> &'static str {
    match mode {
        Some("code") => {
            " Kod modundasın: kıdemli bir yazılımcı gibi çalış. Önce kısa bir plan ver, sonra eksiksiz ve çalışır kod yaz; kod bloklarında dili belirt. Hataları kök nedeniyle açıkla, gereksiz laf etme."
        }
        Some("design") => {
            " Tasarım modundasın: arayüz, tipografi, renk ve düzen konusunda deneyimli bir tasarımcı gibi düşün. Somut değerler (hex renkler, punto, boşluk) öner ve seçeneklerini kısa gerekçelerle sun."
        }
        Some("research") => {
            " Araştırma modundasın: soruyu alt sorulara böl, adım adım ilerle, varsayımlarını ve emin olmadığın noktaları açıkça belirt. Sonunda kısa bir özet ve önerilen sonraki adımları ver. Kaynak uydurma."
        }
        Some("work") => {
            " İş modundasın: e-posta, plan, toplantı notu ve belge hazırlamada yardımcı ol. Profesyonel, net ve uygulanabilir yaz; uygun yerlerde maddeler ve tablolar kullan."
        }
        _ => "",
    }
}

fn client_key(headers: &HeaderMap, addr: &SocketAddr) -> String {
    let device = headers
        .get("x-gur-device")
        .and_then(|v| v.to_str().ok())
        .filter(|v| (8..=64).contains(&v.len()));
    let fwd = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split(',').next())
        .map(str::trim);
    match (device, fwd) {
        (Some(d), _) => format!("d:{d}"),
        (None, Some(ip)) => format!("ip:{ip}"),
        (None, None) => format!("ip:{}", addr.ip()),
    }
}

pub fn validate(req: &ChatReq, max_chars: usize) -> Result<(), &'static str> {
    if req.messages.is_empty() {
        return Err("Mesaj listesi boş");
    }
    if req.messages.len() > 200 {
        return Err("Sohbet çok uzun");
    }
    let total: usize = req.messages.iter().map(|m| m.content.chars().count()).sum();
    if total > max_chars {
        return Err("Sohbet çok uzun; yeni bir sohbet başlatın");
    }
    if req
        .messages
        .iter()
        .any(|m| !matches!(m.role.as_str(), "user" | "assistant"))
    {
        return Err("Geçersiz mesaj rolü");
    }
    if req.messages.last().map(|m| m.role.as_str()) != Some("user") {
        return Err("Son mesaj kullanıcıdan olmalı");
    }
    Ok(())
}

pub fn upstream_body(m: &ModelEntry, req: &ChatReq) -> Value {
    let system = format!("{}{}", system_prompt(m), mode_prompt(req.mode.as_deref()));
    let mut messages = vec![json!({ "role": "system", "content": system })];
    messages.extend(req.messages.iter().map(|x| json!({ "role": x.role, "content": x.content })));
    let mut body = json!({
        "model": m.upstream,
        "messages": messages,
        "stream": true,
    });
    if m.provider == Provider::OpenRouter {
        // Gizlilik: verisini saklayan veya eğitimde kullanan sağlayıcılara yönlendirme yapma.
        body["provider"] = json!({ "data_collection": "deny", "zdr": true });
        body["usage"] = json!({ "include": true });
        if m.reasoning {
            let effort = match req.effort.as_deref() {
                Some("low") => "low",
                Some("high") => "high",
                _ => "medium",
            };
            body["reasoning"] = json!({ "effort": effort });
        }
    }
    body
}

pub async fn chat(
    State(st): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(req): Json<ChatReq>,
) -> Response {
    if let Err(wait) = st.limiter.check(&client_key(&headers, &addr)) {
        return err(
            StatusCode::TOO_MANY_REQUESTS,
            &format!("Biraz yavaşlayalım. {wait} saniye sonra tekrar deneyin."),
        );
    }
    if let Err(e) = validate(&req, st.settings.max_input_chars) {
        return err(StatusCode::BAD_REQUEST, e);
    }
    let id = req.model.clone().unwrap_or_else(|| st.catalog.default.clone());
    let Some(model) = st.catalog.get(&id).cloned() else {
        return err(StatusCode::BAD_REQUEST, "Bilinmeyen model");
    };

    let (url, key) = match model.provider {
        Provider::OpenRouter => (
            format!("{}/chat/completions", st.settings.openrouter_base),
            st.settings.openrouter_key.clone(),
        ),
        Provider::Gur => match &st.settings.gur_base {
            Some(b) => (format!("{}/chat/completions", b.trim_end_matches('/')), st.settings.gur_key.clone()),
            None => return err(StatusCode::SERVICE_UNAVAILABLE, "Gur 0.1 henüz bağlı değil"),
        },
    };
    let Some(key) = key else {
        return err(StatusCode::SERVICE_UNAVAILABLE, "Model sağlayıcısı yapılandırılmamış");
    };

    let mut rb = st
        .http
        .post(&url)
        .bearer_auth(key)
        .json(&upstream_body(&model, &req));
    if model.provider == Provider::OpenRouter {
        rb = rb
            .header("HTTP-Referer", &st.settings.app_url)
            .header("X-Title", "Gur");
    }

    let resp = match rb.send().await {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!(model = %model.id, error = %e.without_url(), "upstream bağlantı hatası");
            return err(StatusCode::BAD_GATEWAY, "Modele ulaşılamadı");
        }
    };
    if !resp.status().is_success() {
        let code = resp.status();
        // Gövdeyi loglamıyoruz; yalnızca durum kodu.
        tracing::warn!(model = %model.id, status = %code, "upstream hata durumu");
        let msg = match code.as_u16() {
            402 => "Servis kredisi tükendi",
            429 => "Model şu an yoğun, biraz sonra deneyin",
            _ => "Model yanıt vermedi",
        };
        return err(StatusCode::BAD_GATEWAY, msg);
    }

    let stream = relay(model, resp.bytes_stream());
    Sse::new(stream)
        .keep_alive(KeepAlive::new().interval(Duration::from_secs(15)))
        .into_response()
}

fn ev(name: &str, data: Value) -> Result<Event, Infallible> {
    Ok(Event::default().event(name).data(data.to_string()))
}

fn relay<S>(model: ModelEntry, upstream: S) -> impl Stream<Item = Result<Event, Infallible>>
where
    S: Stream<Item = reqwest::Result<bytes::Bytes>> + Send + 'static,
{
    async_stream::stream! {
        yield ev("meta", json!({ "model": model.id, "name": model.name }));
        let mut lines = LineBuffer::default();
        let mut upstream = Box::pin(upstream);
        let mut usage = Value::Null;
        let mut finished = false;
        while let Some(chunk) = upstream.next().await {
            let bytes = match chunk {
                Ok(b) => b,
                Err(_) => { yield ev("error", json!({ "message": "Bağlantı koptu" })); break; }
            };
            for data in lines.push(&bytes) {
                for c in parse_data(&data) {
                    match c {
                        Chunk::Text(t) => yield ev("delta", json!({ "t": t })),
                        Chunk::Reasoning(t) => yield ev("reasoning", json!({ "t": t })),
                        Chunk::Usage(u) => usage = u,
                        Chunk::Error(m) => { yield ev("error", json!({ "message": m })); finished = true; }
                        Chunk::Done => finished = true,
                    }
                }
            }
            if finished { break; }
        }
        yield ev("done", json!({ "usage": usage }));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Catalog;

    fn req(msgs: &[(&str, &str)]) -> ChatReq {
        ChatReq {
            model: None,
            messages: msgs.iter().map(|(r, c)| Msg { role: r.to_string(), content: c.to_string() }).collect(),
            effort: Some("high".into()),
            mode: None,
        }
    }

    #[test]
    fn validation_rules() {
        assert!(validate(&req(&[("user", "selam")]), 100).is_ok());
        assert!(validate(&req(&[]), 100).is_err());
        assert!(validate(&req(&[("system", "x"), ("user", "y")]), 100).is_err());
        assert!(validate(&req(&[("user", "a"), ("assistant", "b")]), 100).is_err());
        assert!(validate(&req(&[("user", "uzun mesaj")]), 3).is_err());
    }

    #[test]
    fn openrouter_body_has_privacy_and_effort() {
        let c = Catalog::parse(include_str!("../models.toml")).unwrap();
        let m = c.get("gur-meridian").unwrap();
        let b = upstream_body(m, &req(&[("user", "selam")]));
        assert_eq!(b["provider"]["data_collection"], "deny");
        assert_eq!(b["provider"]["zdr"], true);
        assert_eq!(b["reasoning"]["effort"], "high");
        assert_eq!(b["messages"][0]["role"], "system");
        assert!(b["messages"][0]["content"].as_str().unwrap().contains("Gur Meridian"));
    }

    #[test]
    fn mode_adds_its_instruction() {
        let c = Catalog::parse(include_str!("../models.toml")).unwrap();
        let m = c.get("gur-meridian").unwrap();
        let mut r = req(&[("user", "selam")]);
        r.mode = Some("code".into());
        let sys = upstream_body(m, &r)["messages"][0]["content"].as_str().unwrap().to_string();
        assert!(sys.contains("Kod modundasın"));
        r.mode = Some("sohbet".into());
        let sys = upstream_body(m, &r)["messages"][0]["content"].as_str().unwrap().to_string();
        assert!(!sys.contains("modundasın"));
    }

    #[test]
    fn gur_body_has_no_openrouter_fields() {
        let c = Catalog::parse(include_str!("../models.toml")).unwrap();
        let b = upstream_body(c.get("gur-0.1").unwrap(), &req(&[("user", "selam")]));
        assert!(b.get("provider").is_none());
        assert!(b.get("reasoning").is_none());
    }

    #[tokio::test]
    async fn relay_emits_meta_deltas_done() {
        let c = Catalog::parse(include_str!("../models.toml")).unwrap();
        let parts: Vec<reqwest::Result<bytes::Bytes>> = vec![
            Ok(bytes::Bytes::from("data: {\"choices\":[{\"delta\":{\"content\":\"Mer\"}}]}\n\n")),
            Ok(bytes::Bytes::from("data: {\"choices\":[{\"delta\":{\"content\":\"haba\"}}]}\n\ndata: [DONE]\n\n")),
        ];
        let out: Vec<_> = relay(c.get("gur-comet").unwrap().clone(), futures::stream::iter(parts))
            .collect()
            .await;
        assert_eq!(out.len(), 4); // meta, delta, delta, done
    }
}
