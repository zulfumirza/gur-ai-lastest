# Gur — Faz 1

Gur, tek uygulamada sohbet, kod, tasarım, araştırma ve belge işlerini bir araya getiren, gizlilik odaklı bir yapay zekâ uygulaması.
Faz 1'de bulunanlar: **ana sayfa**, **tam ekran menü** ve **mesaj sayfası** (akan yanıtlar ile).

```
gur-app/
├── apps/mobile/     React Native (Expo SDK 58, expo-router, TypeScript)
├── server/          Rust gateway (axum): /v1/models, /v1/chat (SSE)
└── deploy/          Debian VDS kurulumu: Caddy + systemd
```

## Mimari

```
Telefon (Expo) ──HTTPS/SSE──► Caddy ──► gur-gateway (Rust) ──► OpenRouter  (Gur Meridian, Zenith, Horizon, Comet)
                                                          └──► Gur 0.1 API (ai.gurlabs.com)
```

- **Model adları** `server/models.toml` dosyasında tanımlı. Uygulama yalnızca Gur adlarını görür, gerçek model kimlikleri sunucuda kalır. Yeni model eklemek için uygulamayı güncellemeniz gerekmez.
- **Gizlilik**
  - OpenRouter isteklerinde `data_collection: deny` ve `zdr: true` gönderilir. Bu sayede veri saklayan ya da eğitimde kullanan sağlayıcılara yönlendirme yapılmaz.
  - Gateway mesaj içeriğini hiçbir yerde loglamaz; yalnızca yöntem, yol, durum ve süre loglanır. Caddy erişim logları da kapalıdır.
  - Sohbetler yalnızca telefonda tutulur. SQLite veritabanı SQLCipher ile şifrelenir; anahtar Keychain/Keystore'da durur.
  - Giriş yok. Hız sınırı için anonim bir cihaz kimliği kullanılır.
- **Şeffaflık:** Her modelin sistem promptunda, altyapısı sorulduğunda bunu dürüstçe söyleyebileceği yazıyor. Model seçicinin altında "Altyapı: …" notu görünür.

## 1) Sunucu (VDS)

```bash
# Debian 12, kök kullanıcı, depo kökünde:
sudo bash deploy/install.sh api.alanadiniz.com
sudo nano /opt/gur/.env           # OPENROUTER_API_KEY=… (ve varsa GUR_API_BASE / GUR_API_KEY)
sudo systemctl restart gur-gateway
curl https://api.alanadiniz.com/health   # → ok
```

Kurmadan önce alan adının DNS `A` kaydını VDS'in IP adresine yönlendirin. Caddy TLS sertifikasını kendisi alır.

**Yapmanız gerekenler**
- `models.toml` içindeki `upstream` kimliklerini https://openrouter.ai/models listesiyle karşılaştırın. Opus 5.5, GPT-5, Mistral Medium ve "DeepSeek Flash" kimliklerini tahminle yazdım, `# doğrulayın` notuyla işaretli.
- Gur 0.1 API'niz OpenAI uyumluysa (`POST /chat/completions`, `stream: true`), `GUR_API_BASE` yazmanız yeterli. Değilse `server/src/chat.rs` içinde küçük bir uyarlama gerekir.

Yerelde çalıştırma ve test:

```bash
cd server
cp .env.example .env    # anahtarı yazın, MODELS_PATH=models.toml yapın
cargo test
cargo run
```

## 2) Mobil uygulama

```bash
cd apps/mobile
npm install
echo "EXPO_PUBLIC_API_URL=https://api.alanadiniz.com" > .env
npx expo run:ios        # veya: npx expo run:android
```

Uygulama Skia, SQLCipher ve SecureStore kullandığı için **Expo Go'da çalışmaz**; bir geliştirme derlemesi gerekir. Bilgisayarınızda Xcode ya da Android Studio yoksa EAS ile bulutta derleyebilirsiniz:

```bash
npx eas-cli@latest build --profile development --platform android
```

### iPhone'a kurulum (Mac ve ücretli Apple üyeliği olmadan)

1. GitHub'da **Actions → iOS IPA (imzasız) → Run workflow**. Derleme 25–40 dk sürer;
   bitince `.ipa` **Releases → ipa-latest** altında olur.
   Özel depoda macOS dakikaları 10 kat sayılır (GitHub Free: ayda yaklaşık 200 macOS dakikası, ~5 derleme).
2. Windows'a [Sideloadly](https://sideloadly.io)'yi kur. iTunes ve iCloud'un Microsoft Store sürümü
   değil, Apple sitesindeki sürümü gerekir.
3. iPhone'u kabloyla bağla, bilgisayara güven. `gur.ipa`'yı Sideloadly'ye sürükle,
   Apple ID'ni **yalnızca Sideloadly'ye** gir ve Start'a bas.
4. iPhone'da: **Ayarlar → Gizlilik ve Güvenlik → Geliştirici Modu**'nu aç (yeniden başlatır), sonra
   **Ayarlar → Genel → VPN ve Aygıt Yönetimi**'nde Apple ID'ne güven.

Ücretsiz Apple ID'nin sınırları: kurulum **7 günde bir** yenilenmeli (Sideloadly'de otomatik
yenilemeyi açabilirsin), aynı anda en fazla 3 yan yüklenmiş uygulama olabilir.

Kontroller:

```bash
npm run typecheck   # tsc
npm test            # SSE ve Markdown ayrıştırıcı testleri
```

### Ekranlar ve bileşenler

| Dosya | İçerik |
|---|---|
| `src/app/index.tsx` | Ana sayfa: Light Rays arka planı, canlı küre logo, selamlama, mod çipleri, öneri kartları |
| `src/app/menu.tsx` | Tam ekran menü: altın lif efekti, arama, modlar, sohbet geçmişi (uzun basınca silinir) |
| `src/app/chat/[id].tsx` | Mesaj sayfası: akan yanıt, düşünme satırı, Markdown, kopyala, yeniden üret |
| `src/components/Composer.tsx` | Kenarında Border Beam dolaşan mesaj kutusu: model, düşünme seviyesi, gönder/durdur |
| `src/components/fx/` | Efektler, Skia gölgelendiricisi olarak yazıldı (aşağıya bakın) |
| `src/store/chat.ts` | Zustand ile durum yönetimi: akış, durdurma, yeniden deneme, yerel kayıt |

### Efektler hakkında

React Bits bileşenleri web için yazılmış (WebGL/DOM) ve React Native'de doğrudan çalışmıyor. Bu yüzden Light Rays, Strands ve Ghost Fibers'tan esinlenerek, mobil için sıfırdan hafif **SkSL** gölgelendiricileri yazdım (`fx/shaders.ts`). Bunlar GPU'da, pil dostu şekilde çalışır. Border Beam ve Thought Line'ın karşılıkları da Skia ve Reanimated ile yazıldı. React Bits'in kendi kodu pakete dahil değil; lisansı (MIT + Commons Clause) bileşenlerin ayrıca dağıtılmasını kısıtlıyor.

## Faz 2 için notlar
- Code, Design, Research ve Work modları (her mod: sistem promptu + araç seti + çıktı görünümü)
- Hesap ve isteğe bağlı şifreli senkronizasyon
- MCP istemcisi (gateway'de `rmcp` ile), araçlar ve skill'ler
- İnteraktif çıktılar (izole WebView içinde artifact)
- Ek ekleme (görsel ve dosya)
