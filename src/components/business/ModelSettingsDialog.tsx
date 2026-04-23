import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Settings, X, RotateCcw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_MODEL_SETTINGS,
  MODEL_SETTINGS_META,
  loadModelSettings,
  saveModelSettings,
  type ModelSettings,
  type SettingMeta,
} from '@/utils/modelSettings';

interface ModelSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatValue = (value: number, meta: SettingMeta): string => {
  if (meta.integer) return String(Math.round(value));
  const decimals = meta.step >= 1 ? 0 : meta.step >= 0.1 ? 1 : meta.step >= 0.01 ? 2 : 3;
  return value.toFixed(decimals);
};

export const ModelSettingsDialog = memo(
  ({ isOpen, onClose }: ModelSettingsDialogProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<ModelSettings>(() => loadModelSettings());

    useEffect(() => {
      if (isOpen) {
        setDraft(loadModelSettings());
      }
    }, [isOpen]);

    const isDirty = useMemo(() => {
      const stored = loadModelSettings();
      return (Object.keys(draft) as (keyof ModelSettings)[]).some(
        (k) => draft[k] !== stored[k],
      );
    }, [draft]);

    const updateField = useCallback(
      (meta: SettingMeta, rawValue: number) => {
        if (!Number.isFinite(rawValue)) return;
        const clamped = Math.min(Math.max(rawValue, meta.min), meta.max);
        const next = meta.integer ? Math.round(clamped) : clamped;
        setDraft((prev) => ({ ...prev, [meta.key]: next }));
      },
      [],
    );

    const handleReset = useCallback(() => {
      setDraft({ ...DEFAULT_MODEL_SETTINGS });
    }, []);

    const handleSave = useCallback(() => {
      saveModelSettings(draft);
      onClose();
    }, [draft, onClose]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-2xl w-[60vw] max-w-[1400px] max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-4 border-b-4 border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-6">
              <Settings className="h-16 w-16 text-blue-600 dark:text-blue-400" />
              <h2 className="text-7xl font-bold text-gray-900 dark:text-gray-100">
                {t('modelSettings.title')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('common.close')}
            >
              <X className="h-10 w-10 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <p className="text-2xl text-gray-500 dark:text-gray-400 mb-6">
              {t('modelSettings.description')}
            </p>
            <div className="grid grid-cols-2 gap-8">
              {MODEL_SETTINGS_META.map((meta) => {
                const value = draft[meta.key];
                return (
                  <div
                    key={meta.key}
                    className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {t(`modelSettings.fields.${meta.key}.label`)}
                      </label>
                      <input
                        type="number"
                        value={formatValue(value, meta)}
                        min={meta.min}
                        max={meta.max}
                        step={meta.step}
                        onChange={(e) =>
                          updateField(meta, parseFloat(e.target.value))
                        }
                        className="w-40 px-4 py-2 text-3xl font-mono text-right
                                   bg-white dark:bg-gray-900
                                   text-gray-900 dark:text-gray-100
                                   border-2 border-gray-300 dark:border-gray-600
                                   rounded-lg focus:outline-none
                                   focus:border-blue-500 dark:focus:border-blue-400"
                      />
                    </div>
                    <input
                      type="range"
                      min={meta.min}
                      max={meta.max}
                      step={meta.step}
                      value={value}
                      onChange={(e) =>
                        updateField(meta, parseFloat(e.target.value))
                      }
                      className="w-full h-3 rounded-lg appearance-none cursor-pointer
                                 bg-gray-300 dark:bg-gray-600
                                 accent-blue-600 dark:accent-blue-400"
                    />
                    <div className="flex justify-between mt-2 text-lg text-gray-500 dark:text-gray-400 font-mono">
                      <span>{meta.min}</span>
                      <span>{meta.max}</span>
                    </div>
                    <p className="mt-3 text-xl text-gray-500 dark:text-gray-400 leading-relaxed">
                      {t(`modelSettings.fields.${meta.key}.hint`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 px-8 py-4 border-t-4 border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={handleReset}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl text-3xl font-bold
                         bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                         text-gray-900 dark:text-gray-100
                         transition-colors shadow-lg"
            >
              <RotateCcw className="h-8 w-8" />
              {t('modelSettings.reset')}
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="px-10 py-4 rounded-2xl text-3xl font-bold
                           bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                           text-gray-900 dark:text-gray-100
                           transition-colors shadow-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!isDirty}
                className="flex items-center gap-3 px-10 py-4 rounded-2xl text-3xl font-bold
                           bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                           text-white transition-colors shadow-lg
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-8 w-8" />
                {t('modelSettings.save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ModelSettingsDialog.displayName = 'ModelSettingsDialog';
