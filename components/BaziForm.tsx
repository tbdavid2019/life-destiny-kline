import React, { useState, useEffect } from 'react';
import { UserInput, Gender, AIProvider, ModelOption } from '../types';
import {
  Loader2,
  Sparkles,
  Settings,
  Calendar,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Cpu,
  Server,
  SlidersHorizontal,
} from 'lucide-react';
import { calculateBazi } from '../services/baziUtils';
import { PROVIDERS, fetchModelList, getDefaultBaseUrl } from '../services/modelService';

interface BaziFormProps {
  onSubmit: (data: UserInput) => void;
  isLoading: boolean;
  initialData?: Partial<UserInput>;
}

const COMMON_AWS_REGIONS = [
  { id: 'us-east-1', name: 'US East (N. Virginia) us-east-1' },
  { id: 'us-west-2', name: 'US West (Oregon) us-west-2' },
  { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo) ap-northeast-1' },
  { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore) ap-southeast-1' },
  { id: 'eu-central-1', name: 'Europe (Frankfurt) eu-central-1' },
  { id: 'eu-west-1', name: 'Europe (Ireland) eu-west-1' },
];

const BaziForm: React.FC<BaziFormProps> = ({ onSubmit, isLoading, initialData }) => {
  const initialProvider: AIProvider = (initialData?.provider as AIProvider) || 'gemini';

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
    provider: initialProvider,
    modelName: initialData?.modelName || (import.meta.env.VITE_MODEL_NAME as string) || '',
    apiBaseUrl: initialData?.apiBaseUrl || getDefaultBaseUrl(initialProvider),
    apiKey: initialData?.apiKey || '',
    awsAccessKeyId: initialData?.awsAccessKeyId || '',
    awsSecretAccessKey: initialData?.awsSecretAccessKey || '',
    awsRegion: initialData?.awsRegion || 'us-east-1',
    awsSessionToken: initialData?.awsSessionToken || '',
  });

  const [birthDate, setBirthDate] = useState<string>('');
  const [birthTime, setBirthTime] = useState<string>('12:00');

  // UI state
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAwsSecret, setShowAwsSecret] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [isManualModelInput, setIsManualModelInput] = useState(false);

  // Model fetching state
  const [fetchedModels, setFetchedModels] = useState<ModelOption[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [modelFetchSuccess, setModelFetchSuccess] = useState<string | null>(null);

  const [formErrors, setFormErrors] = useState<{
    modelName?: string;
    apiBaseUrl?: string;
    apiKey?: string;
    birthDate?: string;
    awsAccessKeyId?: string;
    awsSecretAccessKey?: string;
  }>({});

  const activeProviderMeta = PROVIDERS.find((p) => p.id === formData.provider) || PROVIDERS[0];

  // Auto-calculate Bazi when date/time/gender changes
  useEffect(() => {
    if (birthDate && birthTime) {
      try {
        const [year, month, day] = birthDate.split('-').map(Number);
        const [hour, minute] = birthTime.split(':').map(Number);
        const dateObj = new Date(year, month - 1, day, hour, minute);

        const result = calculateBazi(dateObj, formData.gender === Gender.MALE ? 1 : 0);

        setFormData((prev) => ({
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

  // Sync initialData changes if parent updates
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        provider: (initialData.provider as AIProvider) || prev.provider,
        apiBaseUrl:
          initialData.apiBaseUrl ||
          prev.apiBaseUrl ||
          getDefaultBaseUrl(initialData.provider || prev.provider || 'gemini'),
      }));
    }
  }, [initialData]);

  // Handle provider switch
  const handleProviderSelect = (providerId: AIProvider) => {
    const meta = PROVIDERS.find((p) => p.id === providerId);
    setFormData((prev) => ({
      ...prev,
      provider: providerId,
      apiBaseUrl: meta ? meta.defaultBaseUrl : '',
    }));
    setFetchedModels([]);
    setModelFetchError(null);
    setModelFetchSuccess(null);
    setFormErrors((prev) => ({
      ...prev,
      apiKey: undefined,
      modelName: undefined,
      apiBaseUrl: undefined,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name in formErrors) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Fetch model list from current provider dynamically
  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    setModelFetchError(null);
    setModelFetchSuccess(null);

    try {
      const models = await fetchModelList({
        provider: formData.provider || 'gemini',
        apiKey: formData.apiKey,
        apiBaseUrl: formData.apiBaseUrl,
        awsConfig: {
          accessKeyId: formData.awsAccessKeyId,
          secretAccessKey: formData.awsSecretAccessKey,
          region: formData.awsRegion,
          sessionToken: formData.awsSessionToken,
        },
      });

      if (!models || models.length === 0) {
        throw new Error('未獲取到任何可用的模型。');
      }

      setFetchedModels(models);
      setModelFetchSuccess(`成功取得 ${models.length} 個可用模型`);
      setIsManualModelInput(false);

      const exists = models.some((m) => m.id === formData.modelName);
      if (!exists && models.length > 0) {
        setFormData((prev) => ({ ...prev, modelName: models[0].id }));
      }
    } catch (err: any) {
      console.error('Fetch models error:', err);
      setModelFetchError(err.message || '獲取模型列表失敗，請檢查金鑰或網路連線');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: {
      modelName?: string;
      apiBaseUrl?: string;
      apiKey?: string;
      birthDate?: string;
      awsAccessKeyId?: string;
      awsSecretAccessKey?: string;
    } = {};

    const isAws = formData.provider === 'bedrock' && (!formData.apiBaseUrl || !formData.apiBaseUrl.trim());

    if (isAws) {
      if (!formData.awsAccessKeyId?.trim() && formData.apiKey?.trim().toLowerCase() !== 'demo') {
        errors.awsAccessKeyId = '請輸入 AWS Access Key ID';
      }
      if (!formData.awsSecretAccessKey?.trim() && formData.apiKey?.trim().toLowerCase() !== 'demo') {
        errors.awsSecretAccessKey = '請輸入 AWS Secret Access Key';
      }
    } else {
      if (!formData.apiKey.trim()) {
        errors.apiKey = '請輸入 API Key (輸入 demo 體驗本地模式)';
      }
    }

    if (!formData.modelName.trim()) {
      errors.modelName = '請選擇或輸入模型名稱 (可點擊「獲取模型列表」)';
    }

    if (!birthDate) {
      errors.birthDate = '請選擇出生日期';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    onSubmit(formData);
  };

  const isAwsProvider = formData.provider === 'bedrock';
  const isDemoMode = formData.apiKey?.trim().toLowerCase() === 'demo';

  return (
    <div className="w-full max-w-lg bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif-sc font-bold text-slate-900 mb-2">888 人生推演</h2>
        <p className="text-slate-600 text-sm font-medium">
          輸入出生時間與自備 AI 金鑰 (BYOK)，推演百年流年 K 線與命理報告
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="bazi-user-name" className="block text-sm font-bold text-slate-800 mb-1">
              姓名 (可選)
            </label>
            <input
              id="bazi-user-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent outline-none text-sm bg-white"
              placeholder="姓名"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">性別</label>
            <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: Gender.MALE })}
                aria-pressed={formData.gender === Gender.MALE}
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
                  formData.gender === Gender.MALE
                    ? 'bg-white text-indigo-950 shadow-sm border border-slate-200'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                乾造 (男)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: Gender.FEMALE })}
                aria-pressed={formData.gender === Gender.FEMALE}
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
                  formData.gender === Gender.FEMALE
                    ? 'bg-white text-pink-950 shadow-sm border border-slate-200'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                坤造 (女)
              </button>
            </div>
          </div>
        </div>

        {/* 出生時間 */}
        <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 space-y-3">
          <div className="flex items-center gap-2 text-indigo-950 text-sm font-bold">
            <Calendar className="w-4 h-4 text-indigo-700" />
            <span>出生時間 (陽曆)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="bazi-birth-date" className="block text-xs font-bold text-slate-800 mb-1">
                日期
              </label>
              <div className="relative">
                <input
                  id="bazi-birth-date"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent outline-none ${
                    formErrors.birthDate ? 'border-rose-500 bg-rose-50' : 'border-indigo-300'
                  }`}
                />
                <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-indigo-600 pointer-events-none" />
              </div>
            </div>
            <div>
              <label htmlFor="bazi-birth-time" className="block text-xs font-bold text-slate-800 mb-1">
                時間
              </label>
              <div className="relative">
                <input
                  id="bazi-birth-time"
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-indigo-300 rounded-lg text-sm bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent outline-none"
                />
                <Clock className="absolute left-2.5 top-2.5 w-4 h-4 text-indigo-600 pointer-events-none" />
              </div>
            </div>
          </div>
          {formErrors.birthDate && <p className="text-rose-700 font-bold text-xs mt-1">{formErrors.birthDate}</p>}
        </div>

        {/* 自動排盤結果預覽 */}
        {formData.yearPillar && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 animate-fade-in">
            <div className="flex items-center gap-2 mb-3 text-amber-950 text-sm font-bold">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>888 自動排盤結果</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: '年柱', val: formData.yearPillar },
                { label: '月柱', val: formData.monthPillar },
                { label: '日柱', val: formData.dayPillar },
                { label: '時柱', val: formData.hourPillar },
              ].map((p) => (
                <div key={p.label} className="bg-white p-2 rounded-lg border border-amber-200 shadow-sm">
                  <div className="text-[10px] text-slate-700 font-bold uppercase">{p.label}</div>
                  <div className="text-base sm:text-lg font-serif-sc font-bold text-amber-950">{p.val}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between items-center text-xs">
              <div className="text-amber-950 font-medium">
                起運年齡：<span className="font-bold text-slate-950">{formData.startAge} 歲</span>
              </div>
              <div className="text-amber-950 font-medium">
                首步大運：<span className="font-bold text-slate-950">{formData.firstDaYun}</span>
              </div>
            </div>
          </div>
        )}

        {/* BYOK 模型與 Provider 配置區塊 */}
        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 text-sm font-bold">
              <Cpu className="w-4 h-4 text-indigo-700" />
              <span>AI 引擎與 BYOK 自備金鑰</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-950 font-bold border border-indigo-200">
              動態獲取模型
            </span>
          </div>

          {/* Provider 選擇器 */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-2 uppercase tracking-wider">
              選擇 AI 服務商 (Provider)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {PROVIDERS.map((p) => {
                const isSelected = formData.provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderSelect(p.id)}
                    aria-pressed={isSelected}
                    className={`px-2.5 py-2 rounded-xl text-left transition-all border text-xs flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
                      isSelected
                        ? 'border-indigo-600 bg-white text-indigo-950 font-bold shadow-sm ring-2 ring-indigo-500/20'
                        : 'border-slate-300 bg-white/80 hover:bg-white text-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="truncate">{p.name}</span>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded inline-block self-start ${
                        isSelected
                          ? 'bg-indigo-100 text-indigo-950 font-bold'
                          : 'bg-slate-200 text-slate-800 font-semibold'
                      }`}
                    >
                      {p.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider 說明與 API Key 獲取引導 */}
          <div className="flex items-center justify-between text-xs bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-200">
            <span className="text-slate-800 text-[11px] leading-relaxed truncate pr-2 font-medium">
              {activeProviderMeta.description}
            </span>
            {activeProviderMeta.keyHelpUrl && (
              <a
                href={activeProviderMeta.keyHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-800 hover:text-indigo-950 text-[11px] font-bold flex items-center gap-1 flex-shrink-0 underline focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none rounded"
              >
                <span>獲取 Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* 憑證填寫區塊 */}
          {isAwsProvider ? (
            /* AWS Bedrock 憑證 */
            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-600" />
                <span>AWS IAM 憑證設定</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  AWS Access Key ID
                </label>
                <input
                  type="text"
                  name="awsAccessKeyId"
                  value={formData.awsAccessKeyId || ''}
                  onChange={handleChange}
                  placeholder="AKIA..."
                  className={`w-full px-3 py-2 border rounded-lg text-xs font-mono text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent ${
                    formErrors.awsAccessKeyId
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-slate-300'
                  }`}
                />
                {formErrors.awsAccessKeyId && (
                  <p className="text-rose-700 font-bold text-[11px] mt-1">{formErrors.awsAccessKeyId}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  AWS Secret Access Key
                </label>
                <div className="relative">
                  <input
                    type={showAwsSecret ? 'text' : 'password'}
                    name="awsSecretAccessKey"
                    value={formData.awsSecretAccessKey || ''}
                    onChange={handleChange}
                    placeholder="輸入 Secret Access Key"
                    className={`w-full pl-3 pr-9 py-2 border rounded-lg text-xs font-mono text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent ${
                      formErrors.awsSecretAccessKey
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAwsSecret(!showAwsSecret)}
                    className="absolute right-2.5 top-2.5 text-slate-600 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none rounded p-0.5"
                    aria-label={showAwsSecret ? '隱藏金鑰' : '顯示金鑰'}
                  >
                    {showAwsSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {formErrors.awsSecretAccessKey && (
                  <p className="text-rose-700 font-bold text-[11px] mt-1">{formErrors.awsSecretAccessKey}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    AWS Region
                  </label>
                  <select
                    name="awsRegion"
                    value={formData.awsRegion || 'us-east-1'}
                    onChange={handleChange}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 bg-white"
                  >
                    {COMMON_AWS_REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} ({r.name.split('(')[1]?.replace(')', '') || r.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Session Token (可選)
                  </label>
                  <input
                    type="text"
                    name="awsSessionToken"
                    value={formData.awsSessionToken || ''}
                    onChange={handleChange}
                    placeholder="STS 臨時權杖"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* 標準 Provider API Key */
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="bazi-api-key" className="block text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                  {activeProviderMeta.name} API 金鑰 (API Key)
                </label>
                <span className="text-[10px] text-slate-600 font-semibold">
                  填入 demo 可免金鑰體驗
                </span>
              </div>
              <div className="relative">
                <input
                  id="bazi-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  name="apiKey"
                  value={formData.apiKey}
                  onChange={handleChange}
                  placeholder={activeProviderMeta.keyPlaceholder || 'sk-...'}
                  className={`w-full pl-3 pr-9 py-2 border rounded-xl text-xs font-mono text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent ${
                    formErrors.apiKey
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-slate-300 bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-2.5 text-slate-600 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none rounded p-0.5"
                  title={showApiKey ? '隱藏金鑰' : '顯示金鑰'}
                  aria-label={showApiKey ? '隱藏金鑰' : '顯示金鑰'}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formErrors.apiKey && <p className="text-rose-700 font-bold text-xs mt-1">{formErrors.apiKey}</p>}
            </div>
          )}

          {/* 動態獲取模型清單與模型選擇區塊 */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor={fetchedModels.length > 0 && !isManualModelInput ? 'bazi-model-select' : 'bazi-model-input'} className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-slate-600" />
                <span>模型選擇 (Model Selection)</span>
              </label>

              {/* 獲取模型列表按鈕 */}
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={isFetchingModels || (!formData.apiKey && !formData.awsAccessKeyId)}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
              >
                <RefreshCw className={`w-3 h-3 text-indigo-700 ${isFetchingModels ? 'animate-spin' : ''}`} />
                <span>{isFetchingModels ? '正在獲取...' : '獲取模型列表 (Get Models)'}</span>
              </button>
            </div>

            {/* 獲取結果反饋提示 */}
            {modelFetchSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-950 bg-emerald-100 border border-emerald-300 px-2.5 py-1.5 rounded-lg animate-fade-in font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800 flex-shrink-0" />
                <span>{modelFetchSuccess}</span>
              </div>
            )}

            {modelFetchError && (
              <div className="text-xs text-amber-950 bg-amber-100 border border-amber-300 p-2.5 rounded-lg animate-fade-in space-y-1 font-semibold">
                <div className="flex items-start gap-1.5 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-800 flex-shrink-0 mt-0.5" />
                  <span>獲取失敗：{modelFetchError}</span>
                </div>
                <div className="text-[11px] text-amber-900 pl-5">
                  若瀏覽器受 CORS 限制或端點需代理，可直接點擊下方「手動輸入模型 ID」進行推演。
                </div>
              </div>
            )}

            {/* 模型選擇：下拉選單 或 手動輸入 */}
            <div>
              {fetchedModels.length > 0 && !isManualModelInput ? (
                <div className="space-y-1.5">
                  <select
                    id="bazi-model-select"
                    name="modelName"
                    value={formData.modelName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg text-xs font-mono outline-none bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                      formErrors.modelName ? 'border-rose-500' : 'border-slate-300'
                    }`}
                  >
                    <option value="" disabled>
                      -- 請從以下 {fetchedModels.length} 個獲取的模型中選擇 --
                    </option>
                    {fetchedModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.id} {m.contextLength ? `(${(m.contextLength / 1000).toFixed(0)}k)` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-between items-center text-[11px] text-slate-700 pt-0.5 font-medium">
                    <span>已載入 {fetchedModels.length} 款官方最新模型</span>
                    <button
                      type="button"
                      onClick={() => setIsManualModelInput(true)}
                      className="text-indigo-800 hover:text-indigo-950 underline font-bold focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
                    >
                      手動指定其他模型 ID
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      id="bazi-model-input"
                      type="text"
                      name="modelName"
                      value={formData.modelName}
                      onChange={handleChange}
                      placeholder={
                        isDemoMode
                          ? 'demo-model'
                          : fetchedModels.length === 0
                          ? '請輸入模型名稱，或填寫 Key 後點擊「獲取模型列表」'
                          : '例如：gpt-4o, claude-3-7-sonnet...'
                      }
                      className={`w-full px-3 py-2 border rounded-lg text-xs font-mono text-slate-900 outline-none bg-white focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                        formErrors.modelName
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-slate-300'
                      }`}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-700 pt-0.5 font-medium">
                    <span>
                      {fetchedModels.length === 0
                        ? '💡 提示：填入 Key 後點擊右上角「獲取模型列表」可自動載入完整模型'
                        : '當前處於手動輸入模式'}
                    </span>
                    {fetchedModels.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsManualModelInput(false)}
                        className="text-indigo-800 hover:text-indigo-950 underline font-bold focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
                      >
                        返回模型清單下拉選單
                      </button>
                    )}
                  </div>
                </div>
              )}
              {formErrors.modelName && (
                <p className="text-rose-700 font-bold text-xs mt-1">{formErrors.modelName}</p>
              )}
            </div>
          </div>

          {/* 進階設定折疊區 (自訂 Base URL / 代理端點) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
              className="text-xs text-slate-700 hover:text-slate-900 flex items-center gap-1 font-bold transition focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none rounded py-0.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>進階自訂端點 (Base URL / 反向代理)</span>
              {showAdvancedConfig ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvancedConfig && (
              <div className="mt-2.5 p-3 bg-white rounded-xl border border-slate-200 animate-fade-in space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    API Base URL (端點基礎位址)
                  </label>
                  <input
                    type="text"
                    name="apiBaseUrl"
                    value={formData.apiBaseUrl}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  />
                  <p className="text-[10px] text-slate-600 mt-1 font-medium">
                    如使用 Cloudflare AI Gateway、自建反向代理、OneAPI 或 LiteLLM，可在此修改端點位址。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 提交按鈕 */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-700 hover:bg-indigo-800 text-white font-bold py-3.5 rounded-xl shadow-lg transform transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5" />
              <span>888 大師推演中 (約需 1-3 分鐘)</span>
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
