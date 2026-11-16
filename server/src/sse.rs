//! OpenAI uyumlu (OpenRouter / Gur 0.1) SSE akışını satır satır çözer.

use serde_json::Value;

#[derive(Debug, PartialEq)]
pub enum Chunk {
    Text(String),
    Reasoning(String),
    Usage(Value),
    Error(String),
    Done,
}

/// Gelen baytları biriktirip tamamlanmış `data:` satırlarını döndürür.
#[derive(Default)]
pub struct LineBuffer {
    buf: String,
}

impl LineBuffer {
    pub fn push(&mut self, bytes: &[u8]) -> Vec<String> {
        self.buf.push_str(&String::from_utf8_lossy(bytes));
        let mut out = Vec::new();
        while let Some(pos) = self.buf.find('\n') {
            let line: String = self.buf.drain(..=pos).collect();
            let line = line.trim_end_matches(['\r', '\n']);
            // ':' ile başlayan satırlar yorumdur (ör. ": OPENROUTER PROCESSING")
            if let Some(data) = line.strip_prefix("data:") {
                out.push(data.trim_start().to_string());
            }
        }
        out
    }
}

pub fn parse_data(data: &str) -> Vec<Chunk> {
    if data == "[DONE]" {
        return vec![Chunk::Done];
    }
    let Ok(v) = serde_json::from_str::<Value>(data) else {
        return vec![];
    };
    let mut out = Vec::new();
    if let Some(err) = v.get("error") {
        let msg = err
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("Model sağlayıcısı bir hata döndürdü")
            .to_string();
        out.push(Chunk::Error(msg));
        return out;
    }
    if let Some(delta) = v.pointer("/choices/0/delta") {
        if let Some(r) = delta.get("reasoning").and_then(Value::as_str) {
            if !r.is_empty() {
                out.push(Chunk::Reasoning(r.to_string()));
            }
        }
        if let Some(t) = delta.get("content").and_then(Value::as_str) {
            if !t.is_empty() {
                out.push(Chunk::Text(t.to_string()));
            }
        }
    }
    if let Some(u) = v.get("usage").filter(|u| !u.is_null()) {
        out.push(Chunk::Usage(u.clone()));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_lines_across_chunks() {
        let mut b = LineBuffer::default();
        assert!(b.push(b"data: {\"a\"").is_empty());
        let lines = b.push(b":1}\n\n: OPENROUTER PROCESSING\n\ndata: [DONE]\n");
        assert_eq!(lines, vec!["{\"a\":1}", "[DONE]"]);
    }

    #[test]
    fn parses_text_reasoning_and_done() {
        let c = parse_data(r#"{"choices":[{"delta":{"content":"Merhaba","reasoning":"düşün"}}]}"#);
        assert_eq!(c, vec![Chunk::Reasoning("düşün".into()), Chunk::Text("Merhaba".into())]);
        assert_eq!(parse_data("[DONE]"), vec![Chunk::Done]);
    }

    #[test]
    fn parses_midstream_error() {
        let c = parse_data(r#"{"error":{"message":"rate limited"}}"#);
        assert_eq!(c, vec![Chunk::Error("rate limited".into())]);
    }
}
