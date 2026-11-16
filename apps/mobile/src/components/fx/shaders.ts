import { Skia } from '@shopify/react-native-skia';

/*
 * Gur'un görsel efektleri, React Bits (Light Rays, Strands, Ghost Fibers)
 * bileşenlerinden esinlenerek mobil için sıfırdan yazılmış hafif SkSL gölgelendiricileridir.
 * Tüm çıktılar önceden çarpılmış (premultiplied) alfa kullanır.
 */

const make = (src: string) => {
  const effect = Skia.RuntimeEffect.Make(src);
  if (!effect) throw new Error('Gölgelendirici derlenemedi');
  return effect;
};

/** Üstten süzülen altın ışık hüzmeleri. */
export const lightRays = make(`
uniform float2 res;
uniform float time;
uniform float3 color;
uniform float intensity;

float hash(float n) { return fract(sin(n) * 43758.5453); }
float vnoise(float x) {
  float i = floor(x); float f = fract(x);
  return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
}

half4 main(float2 fc) {
  float2 uv = fc / res;
  float2 d = uv - float2(0.5, -0.08);
  d.x *= res.x / res.y;
  float ang = atan(d.x, d.y);
  float dist = length(d);
  float rays = vnoise(ang * 9.0 + time * 0.25) * 0.55
             + vnoise(ang * 17.0 - time * 0.18) * 0.35
             + vnoise(ang * 31.0 + time * 0.12) * 0.20;
  rays = pow(rays, 2.2);
  float cone = smoothstep(0.95, 0.0, abs(ang));
  float fall = exp(-dist * 2.0);
  float glow = exp(-dist * 5.5) * 0.55;
  float v = (rays * cone * fall + glow) * intensity * (0.88 + 0.12 * sin(time * 0.5));
  v = clamp(v, 0.0, 1.0);
  return half4(half3(color * v), half(v));
}`);

/** Canlı logo: içinde altın ipliklerin aktığı cam küre. energy: 0 = bekliyor, 1 = düşünüyor. */
export const orb = make(`
uniform float2 res;
uniform float time;
uniform float energy;

half4 main(float2 fc) {
  float2 p = (fc * 2.0 - res) / min(res.x, res.y);
  float r = length(p);
  if (r > 1.0) return half4(0.0);
  float z = sqrt(max(0.0, 1.0 - r * r));
  float3 n = float3(p.x, -p.y, z);
  float t = time * (0.22 + energy * 0.9);
  float c = cos(t); float s = sin(t);
  float3 q = float3(c * n.x - s * n.z, n.y, s * n.x + c * n.z);

  float s1 = exp(-abs(sin(q.y * 5.0 + sin(q.x * 3.0 + t) * 1.2)) * 14.0);
  float s2 = exp(-abs(sin(q.y * 8.0 - sin(q.z * 4.0 - t * 1.3) * 1.5 + 1.0)) * 18.0) * 0.6;
  float s3 = exp(-abs(sin((q.x + q.y) * 7.0 + t * 0.7)) * 22.0) * 0.35;
  float strands = (s1 + s2 + s3) * (0.25 + 0.75 * z);

  float3 gold = mix(float3(0.66, 0.54, 0.36), float3(0.97, 0.92, 0.82), clamp(s1, 0.0, 1.0));
  float3 base = float3(0.045, 0.045, 0.055) * (0.4 + 0.6 * z);
  float fres = pow(1.0 - z, 2.6);
  float3 rim = float3(0.85, 0.77, 0.62) * fres * 0.55;
  float spec = pow(max(dot(n, normalize(float3(-0.45, 0.6, 0.7))), 0.0), 34.0) * 0.55;
  float3 col = base + gold * strands * (0.85 + energy * 0.6) + rim + spec;
  float a = smoothstep(1.0, 0.975, r);
  return half4(half3(col * a), half(a));
}`);

/** Menü arka planı: çapraz akan altın parçacık ipliği. */
export const fibers = make(`
uniform float2 res;
uniform float time;

float hash(float2 p) { return fract(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453); }

half4 main(float2 fc) {
  float2 uv = fc / res.y;
  float2 d = normalize(float2(1.0, -0.62));
  float along = dot(uv, d);
  float across = dot(uv, float2(-d.y, d.x));
  float center = 0.40 + 0.07 * sin(along * 2.2 + time * 0.25);
  float x = (across - center) / 0.13;
  float band = exp(-x * x);
  float halo = exp(-x * x * 0.18) * 0.35;

  // ince lifler
  float fiber = pow(0.5 + 0.5 * sin(across * 90.0 + sin(along * 4.0 + time * 0.4) * 2.0), 18.0) * 0.18;

  // akan, yumuşak parçacıklar
  float2 flow = fc - d * time * 22.0;
  float2 cell = floor(flow / 7.0);
  float h = hash(cell);
  float2 pos = (cell + float2(hash(cell + 3.1), hash(cell + 7.7))) * 7.0;
  float dist = length(flow - pos);
  float dotv = smoothstep(1.6, 0.0, dist) * step(0.86, h) * (0.55 + 0.45 * sin(time * 1.7 + h * 60.0));

  float v = clamp(halo * 0.25 + band * (0.12 + fiber) + band * dotv * 1.1, 0.0, 1.0);
  float3 col = mix(float3(0.66, 0.54, 0.36), float3(0.97, 0.92, 0.82), clamp(band + dotv * 0.5, 0.0, 1.0));
  return half4(half3(col * v), half(v));
}`);
