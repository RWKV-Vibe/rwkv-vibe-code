export interface ModelSettings {
  temperature: number;
  top_k: number;
  top_p: number;
  max_tokens: number;
  alpha_presence: number;
  alpha_frequency: number;
  alpha_decay: number;
  chunk_size: number;
}

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  temperature: 1.0,
  top_k: 60,
  top_p: 0.5,
  max_tokens: 8192,
  alpha_presence: 1.0,
  alpha_frequency: 0.1,
  alpha_decay: 0.99,
  chunk_size: 128,
};

export const MODEL_SETTINGS_STORAGE_KEY = 'rwkv_model_settings';
export const MODEL_SETTINGS_EVENT = 'rwkv-model-settings-changed';

export interface SettingMeta {
  key: keyof ModelSettings;
  min: number;
  max: number;
  step: number;
  /** 整数字段（如 top_k / max_tokens / chunk_size） */
  integer?: boolean;
}

export const MODEL_SETTINGS_META: SettingMeta[] = [
  { key: 'temperature', min: 0, max: 2, step: 0.05 },
  { key: 'top_k', min: 0, max: 200, step: 1, integer: true },
  { key: 'top_p', min: 0, max: 1, step: 0.01 },
  { key: 'max_tokens', min: 128, max: 32768, step: 128, integer: true },
  { key: 'alpha_presence', min: 0, max: 2, step: 0.05 },
  { key: 'alpha_frequency', min: 0, max: 2, step: 0.05 },
  { key: 'alpha_decay', min: 0.9, max: 1, step: 0.001 },
  { key: 'chunk_size', min: 16, max: 2048, step: 16, integer: true },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const sanitize = (raw: Partial<Record<string, unknown>>): ModelSettings => {
  const out = { ...DEFAULT_MODEL_SETTINGS };
  for (const meta of MODEL_SETTINGS_META) {
    const value = raw?.[meta.key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      const v = meta.integer ? Math.round(value) : value;
      out[meta.key] = clamp(v, meta.min, meta.max);
    }
  }
  return out;
};

export const loadModelSettings = (): ModelSettings => {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_MODEL_SETTINGS };
  try {
    const raw = localStorage.getItem(MODEL_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MODEL_SETTINGS };
    return sanitize(JSON.parse(raw) ?? {});
  } catch {
    return { ...DEFAULT_MODEL_SETTINGS };
  }
};

export const saveModelSettings = (settings: ModelSettings): void => {
  if (typeof localStorage === 'undefined') return;
  const normalized = sanitize(settings);
  localStorage.setItem(
    MODEL_SETTINGS_STORAGE_KEY,
    JSON.stringify(normalized),
  );
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<ModelSettings>(MODEL_SETTINGS_EVENT, {
        detail: normalized,
      }),
    );
  }
};

export const resetModelSettings = (): ModelSettings => {
  saveModelSettings(DEFAULT_MODEL_SETTINGS);
  return { ...DEFAULT_MODEL_SETTINGS };
};
