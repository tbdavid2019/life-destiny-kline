
import React, { useState, useEffect } from 'react';
import { UserInput, Gender } from '../types';
import { Loader2, Sparkles, Settings, Calendar, Clock } from 'lucide-react';
import { calculateBazi } from '../services/baziUtils';

interface BaziFormProps {
  onSubmit: (data: UserInput) => void;
  isLoading: boolean;
  initialData?: Partial<UserInput>;
}

const BaziForm: React.FC<BaziFormProps> = ({ onSubmit, isLoading, initialData }) => {
  const [formData, setFormData] = useState<UserInput>({
    name: initialData?.name || '',
    gender: initialData?.gender || Gender.MALE,
    birthYear: initialData?.birthYear || '',
    yearPillar: initialData?.yearPillar || '',
    monthPillar: initialData?.monthPillar || '',
    dayPillar: initialData?.dayPillar || '',
    hourPillar: initialData?.hourPillar || '',
    startAge: initialData?.startAge || '',
    firstDaYun: initialData?.firstDaYun || '',
    modelName: initialData?.modelName || (import.meta.env.VITE_MODEL_NAME as string) || 'gemini-3-flash-preview',
    apiBaseUrl: initialData?.apiBaseUrl || (import.meta.env.VITE_API_BASE_URL as string) || 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: initialData?.apiKey || (import.meta.env.VITE_API_KEY as string) || '',
  });

  const isConfigHidden = !!(import.meta.env.VITE_API_KEY);

  const [birthDate, setBirthDate] = useState<string>('');
  const [birthTime, setBirthTime] = useState<string>('12:00');

  const [formErrors, setFormErrors] = useState<{ modelName?: string, apiBaseUrl?: string, apiKey?: string, birthDate?: string }>({});

  // Auto-calculate Bazi when date/time/gender changes
  useEffect(() => {
    if (birthDate && birthTime) {
      try {
        const [year, month, day] = birthDate.split('-').map(Number);
        const [hour, minute] = birthTime.split(':').map(Number);
        const dateObj = new Date(year, month - 1, day, hour, minute);

        const result = calculateBazi(dateObj, formData.gender === Gender.MALE ? 1 : 0);

        setFormData(prev => ({
          ...prev,
          birthYear: year.toString(),
          yearPillar: result.yearPillar,
          monthPillar: result.monthPillar,
          dayPillar: result.dayPillar,
          hourPillar: result.hourPillar,
          startAge: result.startAge.toString(),
          firstDaYun: result.firstDaYun,
        }));
      } catch (err) {
        console.error('Bazi calculation failed', err);
      }
    }
  }, [birthDate, birthTime, formData.gender]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'apiBaseUrl' || name === 'apiKey' || name === 'modelName') {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { modelName?: string, apiBaseUrl?: string, apiKey?: string, birthDate?: string } = {};
    if (!formData.modelName.trim()) errors.modelName = '請輸入模型名稱';
    if (!formData.apiBaseUrl.trim()) errors.apiBaseUrl = '請輸入 API Base URL';
    if (!formData.apiKey.trim()) errors.apiKey = '請輸入 API Key';
    if (!birthDate) errors.birthDate = '請選擇出生日期';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif-sc font-bold text-gray-800 mb-2">888 人生推演</h2>
        <p className="text-gray-500 text-sm">輸入出生日期，AI 將自動排盤並生成人生報告抽像</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名 (可選)</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="姓名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: Gender.MALE })}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${formData.gender === Gender.MALE
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                乾造 (男)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: Gender.FEMALE })}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${formData.gender === Gender.FEMALE
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                坤造 (女)
              </button>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-4">
          <div className="flex items-center gap-2 text-indigo-800 text-sm font-bold">
            <Calendar className="w-4 h-4" />
            <span>出生時間 (陽曆)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">日期</label>
              <div className="relative">
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none ${formErrors.birthDate ? 'border-red-500' : 'border-indigo-200'}`}
                />
                <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">時間</label>
              <div className="relative">
                <input
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <Clock className="absolute left-2.5 top-2.5 w-4 h-4 text-indigo-400" />
              </div>
            </div>
          </div>
          {formErrors.birthDate && <p className="text-red-500 text-xs mt-1">{formErrors.birthDate}</p>}
        </div>

        {formData.yearPillar && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-fade-in">
            <div className="flex items-center gap-2 mb-3 text-amber-800 text-sm font-bold">
              <Sparkles className="w-4 h-4" />
              <span>888 自動排盤結果</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: '年', val: formData.yearPillar },
                { label: '月', val: formData.monthPillar },
                { label: '日', val: formData.dayPillar },
                { label: '時', val: formData.hourPillar }
              ].map(p => (
                <div key={p.label} className="bg-white p-2 rounded border border-amber-200 shadow-sm">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">{p.label}</div>
                  <div className="text-lg font-serif-sc font-bold text-amber-900">{p.val}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between items-center text-xs">
              <div className="text-amber-700">
                起運年齡：<span className="font-bold">{formData.startAge} 歲</span>
              </div>
              <div className="text-amber-700">
                首步大運：<span className="font-bold">{formData.firstDaYun}</span>
              </div>
            </div>
          </div>
        )}

        {!isConfigHidden && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-3 text-gray-700 text-sm font-bold">
              <Settings className="w-4 h-4" />
              <span>模型配置</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">API 金鑰</label>
                <input
                  type="password"
                  name="apiKey"
                  value={formData.apiKey}
                  onChange={handleChange}
                  placeholder="sk-..."
                  className={`w-full px-3 py-2 border rounded-lg text-xs font-mono outline-none ${formErrors.apiKey ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-2 focus:ring-indigo-500'}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">模型</label>
                  <input
                    type="text"
                    name="modelName"
                    value={formData.modelName}
                    onChange={handleChange}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-[10px] font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">基礎 URL</label>
                  <input
                    type="text"
                    name="apiBaseUrl"
                    value={formData.apiBaseUrl}
                    onChange={handleChange}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-[10px] font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-indigo-900 to-gray-900 hover:from-black hover:to-black text-white font-bold py-3.5 rounded-xl shadow-lg transform transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5" />
              <span>888 大師推演中 (3-5 分鐘)</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 text-amber-300" />
              <span>生成 888 人生 K 線</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default BaziForm;
