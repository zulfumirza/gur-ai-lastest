/** Modlar aynı motorun farklı ayarlarıdır; sunucu her mod için sistem promptunu değiştirir. */
export type Mode = 'sohbet' | 'code' | 'design' | 'research' | 'work';

export const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'sohbet', label: 'Sohbet', hint: 'Günlük sorular ve konuşma' },
  { id: 'code', label: 'Code', hint: 'Kod yazma, hata ayıklama, açıklama' },
  { id: 'design', label: 'Design', hint: 'Arayüz, renk, yazı ve tasarım fikirleri' },
  { id: 'research', label: 'Research', hint: 'Adım adım, gerekçeli araştırma' },
  { id: 'work', label: 'Work', hint: 'E-posta, plan, toplantı ve belgeler' },
];

export const modeLabel = (id: Mode) => MODES.find((m) => m.id === id)?.label ?? 'Sohbet';
