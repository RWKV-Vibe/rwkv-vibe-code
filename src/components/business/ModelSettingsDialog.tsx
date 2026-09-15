'use client';

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
} from '@/lib/model-settings';

interface ModelSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatValue = (value: number, meta: SettingMeta): string => {
  if (meta.integer) return String(Math.round(value));
  const decimals =
    meta.step >= 1 ? 0 : meta.step >= 0.1 ? 1 : meta.step >= 0.01 ? 2 : 3;
  return value.toFixed(decimals);
};

export const ModelSettingsDialog = memo(
  ({ isOpen, onClose }: ModelSettingsDialogProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<ModelSettings>(() =>
      loadModelSettings(),
    );

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

    const updateField = useCallback((meta: SettingMeta, rawValue: number) => {
      if (!Number.isFinite(rawValue)) return;
      const clamped = Math.min(Math.max(rawValue, meta.min), meta.max);
      const next = meta.integer ? Math.round(clamped) : clamped;
      setDraft((prev) => ({ ...prev, [meta.key]: next }));
    }, []);

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
        <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t('modelSettings.title')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('common.close')}
            >
              <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('modelSettings.description')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MODEL_SETTINGS_META.map((meta) => {
                const value = draft[meta.key];
                return (
                  <div
                    key={meta.key}
                    className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
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
                        className="w-20 h-8 px-2 text-xs font-mono text-right
                                   bg-white dark:bg-gray-900
                                   text-gray-900 dark:text-gray-100
                                   border border-gray-300 dark:border-gray-600
                                   rounded-md focus:outline-none
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
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                                 bg-gray-300 dark:bg-gray-600
                                 accent-blue-600 dark:accent-blue-400"
                    />
                    <div className="mt-1.5 flex justify-between text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                      <span>{meta.min}</span>
                      <span>{meta.max}</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {t(`modelSettings.fields.${meta.key}.hint`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={handleReset}
              className="flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium
                         bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                         text-gray-900 dark:text-gray-100
                         transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              {t('modelSettings.reset')}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="h-10 rounded-xl px-4 text-sm font-medium
                           bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                           text-gray-900 dark:text-gray-100
                           transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!isDirty}
                className="flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium
                           bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                           text-white transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
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
