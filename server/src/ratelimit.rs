//! Basit, bellek içi, cihaz başına dakikalık istek sınırı.
//! Faz 1'de giriş olmadığı için cihaz kimliği (x-gur-device) ya da IP kullanılır.

use std::{
    collections::HashMap,
    sync::Mutex,
    time::{Duration, Instant},
};

pub struct RateLimiter {
    per_min: u32,
    inner: Mutex<HashMap<String, (Instant, u32)>>,
}

impl RateLimiter {
    pub fn new(per_min: u32) -> Self {
        Self { per_min, inner: Mutex::new(HashMap::new()) }
    }

    /// İzin verilirse `Ok(())`, aşılırsa kaç saniye sonra tekrar denenebileceği.
    pub fn check(&self, key: &str) -> Result<(), u64> {
        self.check_at(key, Instant::now())
    }

    fn check_at(&self, key: &str, now: Instant) -> Result<(), u64> {
        let window = Duration::from_secs(60);
        let mut map = self.inner.lock().unwrap();
        if map.len() > 50_000 {
            map.retain(|_, (start, _)| now.duration_since(*start) < window);
        }
        let entry = map.entry(key.to_string()).or_insert((now, 0));
        if now.duration_since(entry.0) >= window {
            *entry = (now, 0);
        }
        if entry.1 >= self.per_min {
            let wait = window.saturating_sub(now.duration_since(entry.0));
            return Err(wait.as_secs().max(1));
        }
        entry.1 += 1;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_after_limit_and_resets() {
        let rl = RateLimiter::new(2);
        let t0 = Instant::now();
        assert!(rl.check_at("d", t0).is_ok());
        assert!(rl.check_at("d", t0).is_ok());
        assert!(rl.check_at("d", t0).is_err());
        assert!(rl.check_at("other", t0).is_ok());
        assert!(rl.check_at("d", t0 + Duration::from_secs(61)).is_ok());
    }
}
