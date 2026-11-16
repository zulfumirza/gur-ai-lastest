import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DEVICE_KEY = 'gur.device-id';
const DB_KEY = 'gur.db-key';

async function getOrCreate(key: string, make: () => string): Promise<string> {
  const existing = await SecureStore.getItemAsync(key);
  if (existing) return existing;
  const value = make();
  await SecureStore.setItemAsync(key, value);
  return value;
}

/** Hesapsız (Faz 1) kullanım için anonim cihaz kimliği. Yalnızca hız sınırı için kullanılır. */
export const getDeviceId = () => getOrCreate(DEVICE_KEY, () => Crypto.randomUUID());

/** Yerel veritabanını şifreleyen 256 bit anahtar; cihazın güvenli deposunda (Keychain/Keystore) durur. */
export const getDbKey = () =>
  getOrCreate(DB_KEY, () =>
    Array.from(Crypto.getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join(''),
  );
