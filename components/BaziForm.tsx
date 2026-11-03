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
          baziMeta: result,
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
    setFormErrors((prev) => ({ ...prev, apiKey: undefined, modelName: undefined, apiBaseUrl: undefined }));
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
      setModelFetchSuccess(`成功取得 ${models.length} 款可用模型`);
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
        errors.apiKey = '請輸入 API Key (輸入 demo 可免金鑰體驗)';
      }
    }

    if (!formData.modelName.trim()) {
      errors.modelName = '請選擇或輸入模型名稱 (可點擊「獲取模型列表」自動載入)';
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
    <div className="w-full max-w-3xl bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-200">
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-serif-sc font-bold text-slate-900 mb-3 tracking-wide">
          888 人生推演
        </h2>
        <p className="text-slate-700 text-base sm:text-lg font-medium leading-relaxed">
          輸入出生時間與自備 AI 引擎金鑰 (BYOK)，自動排盤推演百年流年 K 線與命理詳批
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本姓名與性別 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="bazi-user-name" className="block text-base font-bold text-slate-900 mb-2">
              姓名 (可選)
            </label>
            <input
              id="bazi-user-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent outline-none bg-white placeholder:text-slate-400"
              placeholder="請輸入姓名"
            />
          </div>

          <div>
            <label className="block text-base font-bold text-slate-900 mb-2">性別</label>
            <div className="flex bg-slate-100 rounded-xl p-1.5 border border-slate-200 h-[50px] items-center">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: Gender.MALE })}
                aria-pressed={formData.gender === Gender.MALE}
                className={`flex-1 h-full rounded-lg text-sm sm:text-base font-bold transition flex items-center justify-center focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
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
                className={`flex-1 h-full rounded-lg text-sm sm:text-base font-bold transition flex items-center justify-center focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
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

        {/* 出生時間 (陽曆) */}
        <div className="bg-indigo-50/80 p-5 rounded-2xl border border-indigo-200 space-y-4">
          <div className="flex items-center gap-2.5 text-indigo-950 text-base sm:text-lg font-bold">
            <Calendar className="w-5 h-5 text-indigo-700 flex-shrink-0" />
            <span>出生時間 (陽曆西曆)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bazi-birth-date" className="block text-sm font-bold text-slate-900 mb-1.5">
                出生日期
              </label>
              <div className="relative">
                <input
                  id="bazi-birth-date"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl text-base bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent outline-none ${
                    formErrors.birthDate ? 'border-rose-500 bg-rose-50' : 'border-indigo-300'
                  }`}
                />
                <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-indigo-600 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="bazi-birth-time" className="block text-sm font-bold text-slate-900 mb-1.5">
                出生時間
              </label>
              <div className="relative">
                <input
                  id="bazi-birth-time"
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-indigo-300 rounded-xl text-base bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent outline-none"
                />
                <Clock className="absolute left-3 top-3.5 w-5 h-5 text-indigo-600 pointer-events-none" />
              </div>
            </div>
          </div>
          {formErrors.birthDate && (
            <p className="text-rose-700 font-bold text-sm mt-1">{formErrors.birthDate}</p>
          )}
        </div>

        {/* 自動排盤結果預覽 (子平八字 + 紫微斗數雙盤底蘊) */}
        {formData.yearPillar && (
          <div className="bg-amber-50/80 p-5 sm:p-6 rounded-2xl border border-amber-300 animate-fade-in space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-amber-950 text-base font-bold border-b border-amber-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-700 flex-shrink-0" />
                <span className="text-lg">八字與紫微命理底層元盤預覽</span>
              </div>
              {formData.baziMeta && (
                <div className="flex flex-wrap gap-2 text-xs sm:text-sm font-bold">
                  <span className="px-2.5 py-1 bg-amber-200/80 text-amber-950 rounded-lg">
                    {formData.baziMeta.dayMaster} · {formData.baziMeta.strength}
                  </span>
                  <span className="px-2.5 py-1 bg-indigo-100 text-indigo-950 rounded-lg">
                    {formData.baziMeta.geJu}
                  </span>
                </div>
              )}
            </div>

            {/* 四柱八字 + 納音 + 十神 */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
              {[
                { label: '年柱', val: formData.yearPillar, god: formData.baziMeta?.tenGods?.year, nayin: formData.baziMeta?.nayinPillars?.year },
                { label: '月柱', val: formData.monthPillar, god: formData.baziMeta?.tenGods?.month, nayin: formData.baziMeta?.nayinPillars?.month },
                { label: '日柱', val: formData.dayPillar, god: formData.baziMeta?.tenGods?.day, nayin: formData.baziMeta?.nayinPillars?.day },
                { label: '時柱', val: formData.hourPillar, god: formData.baziMeta?.tenGods?.hour, nayin: formData.baziMeta?.nayinPillars?.hour },
              ].map((p) => (
                <div key={p.label} className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between">
                  <div className="text-xs sm:text-sm text-slate-600 font-bold mb-0.5">{p.label}</div>
                  {p.god && <div className="text-xs text-indigo-800 font-bold mb-1">{p.god}</div>}
                  <div className="text-xl sm:text-2xl font-serif-sc font-extrabold text-amber-950 my-1">
                    {p.val}
                  </div>
                  {p.nayin && <div className="text-[11px] sm:text-xs text-slate-600 font-medium">{p.nayin}</div>}
                </div>
              ))}
            </div>

            {/* 喜用神與紫微雙盤印證資訊 */}
            {formData.baziMeta && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-white/90 p-4 rounded-xl border border-amber-200/80">
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>喜用神（牛市動能）：</span>
                    <strong className="text-emerald-800">{formData.baziMeta.usefulGod}</strong>
                  </div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    <span>忌仇神（熊市壓力）：</span>
                    <strong className="text-rose-800">{formData.baziMeta.tabooGod}</strong>
                  </div>
                </div>

                <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-amber-200 pt-2 md:pt-0 md:pl-4">
                  <div className="font-bold text-slate-900">
                    紫微命宮：<strong className="text-indigo-950">{formData.baziMeta.ziweiBureau || '命盤'}</strong> · 命坐【{formData.baziMeta.ziweiMingGongBranch || '—'}宮】
                    （{(formData.baziMeta.ziweiMingGongStars || []).join('、') || '無主星'}）
                  </div>
                  <div className="text-xs sm:text-sm text-slate-700 font-medium">
                    生年四化：祿【{formData.baziMeta.ziweiSiHua?.lu || '—'}】· 權【{formData.baziMeta.ziweiSiHua?.quan || '—'}】· 科【{formData.baziMeta.ziweiSiHua?.ke || '—'}】· 忌【{formData.baziMeta.ziweiSiHua?.ji || '—'}】
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-between items-center text-sm sm:text-base gap-2 pt-1 border-t border-amber-200/80">
              <div className="text-amber-950 font-medium">
                起運年齡：<strong className="text-slate-950 font-bold">{formData.startAge} 歲</strong>
              </div>
              <div className="text-amber-950 font-medium">
                首步大運：<strong className="text-slate-950 font-bold">{formData.firstDaYun}</strong>
              </div>
              {formData.baziMeta?.shenshaList && formData.baziMeta.shenshaList.length > 0 && (
                <div className="text-xs text-slate-600 font-medium w-full sm:w-auto">
                  命帶神煞：{formData.baziMeta.shenshaList.slice(0, 5).join(' · ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* BYOK 模型與 Provider 配置區塊 */}
        {/* ============================================================ */}
        <div className="bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-300 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2 text-slate-950 text-base sm:text-lg font-bold">
              <Cpu className="w-5 h-5 text-indigo-700 flex-shrink-0" />
              <span>AI 引擎與自備金鑰 (BYOK)</span>
            </div>
            <span className="text-sm px-3 py-1 rounded-full bg-indigo-100 text-indigo-950 font-bold border border-indigo-200">
              連線取得即時模型
            </span>
          </div>

          {/* Provider 選擇按鈕矩陣 (絕無省略號，自然換行，大字體) */}
          <div>
            <label className="block text-sm sm:text-base font-bold text-slate-900 mb-2.5">
              選擇 AI 服務商 (Provider)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PROVIDERS.map((p) => {
                const isSelected = formData.provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderSelect(p.id)}
                    aria-pressed={isSelected}
                    className={`p-3.5 rounded-2xl text-left transition-all border flex flex-col justify-between min-h-[82px] sm:min-h-[86px] focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
                      isSelected
                        ? 'border-indigo-600 bg-white text-indigo-950 font-bold shadow-md ring-2 ring-indigo-500/20'
                        : 'border-slate-300 bg-white/90 hover:bg-white text-slate-900 hover:border-slate-400'
                    }`}
                  >
                    <span className="text-sm sm:text-base font-bold leading-snug break-words">
                      {p.name}
                    </span>
                    <span
                      className={`text-sm px-2.5 py-0.5 rounded-md font-bold self-start mt-1.5 ${
                        isSelected
                          ? 'bg-indigo-100 text-indigo-950'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {p.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider 詳細說明與 API Key 獲取引導 (無省略號，完整顯示) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm bg-indigo-50/90 p-3.5 rounded-xl border border-indigo-200 gap-2">
            <span className="text-slate-800 leading-relaxed font-medium">
              {activeProviderMeta.description}
            </span>
            {activeProviderMeta.keyHelpUrl && (
              <a
                href={activeProviderMeta.keyHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-800 hover:text-indigo-950 font-bold flex items-center gap-1.5 flex-shrink-0 underline focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none rounded text-sm"
              >
                <span>前往獲取 Key</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* 憑證填寫區塊 */}
          {isAwsProvider ? (
            /* AWS Bedrock 憑證 */
            <div className="space-y-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200">
              <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-600" />
                <span>AWS IAM 憑證設定</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  AWS Access Key ID
                </label>
                <input
                  type="text"
                  name="awsAccessKeyId"
                  value={formData.awsAccessKeyId || ''}
                  onChange={handleChange}
                  placeholder="AKIA..."
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm sm:text-base font-mono text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent ${
                    formErrors.awsAccessKeyId
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
                {formErrors.awsAccessKeyId && (
                  <p className="text-rose-700 font-bold text-sm mt-1">{formErrors.awsAccessKeyId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  AWS Secret Access Key
                </label>
                <div className="relative">
                  <input
                    type={showAwsSecret ? 'text' : 'password'}
                    name="awsSecretAccessKey"
                    value={formData.awsSecretAccessKey || ''}
                    onChange={handleChange}
                    placeholder="輸入 Secret Access Key"
                    className={`w-full pl-4 pr-10 py-2.5 border rounded-xl text-sm sm:text-base font-mono text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent ${
                      formErrors.awsSecretAccessKey
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAwsSecret(!showAwsSecret)}
                    className="absolute right-3 top-3 text-slate-600 hover:text-slate-900"
                    aria-label={showAwsSecret ? '隱藏密鑰' : '顯示密鑰'}
                  >
                    {showAwsSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.awsSecretAccessKey && (
                  <p className="text-rose-700 font-bold text-sm mt-1">{formErrors.awsSecretAccessKey}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    AWS Region (區域)
                  </label>
                  <select
                    name="awsRegion"
                    value={formData.awsRegion || 'us-east-1'}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 bg-white"
                  >
                    {COMMON_AWS_REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} ({r.name.split('(')[1]?.replace(')', '') || r.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    Session Token (可選)
                  </label>
                  <input
                    type="text"
                    name="awsSessionToken"
                    value={formData.awsSessionToken || ''}
                    onChange={handleChange}
                    placeholder="STS 臨時權杖"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm sm:text-base font-mono text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* 標準 Provider API Key */
            <div>
              <div className="flex flex-wrap items-center justify-between mb-1.5 gap-1">
                <label htmlFor="bazi-api-key" className="block text-sm sm:text-base font-bold text-slate-900">
                  {activeProviderMeta.name} API 金鑰 (API Key)
                </label>
                <span className="text-sm text-slate-700 font-semibold bg-slate-100 px-2.5 py-1 rounded-md">
                  填入 demo 可免金鑰體驗本地數據
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
                  className={`w-full pl-4 pr-11 py-3 border rounded-xl text-sm sm:text-base font-mono text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent ${
                    formErrors.apiKey
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-slate-300 bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-3.5 text-slate-600 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none rounded p-1"
                  title={showApiKey ? '隱藏金鑰' : '顯示金鑰'}
                  aria-label={showApiKey ? '隱藏金鑰' : '顯示金鑰'}
                >
                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formErrors.apiKey && <p className="text-rose-700 font-bold text-sm mt-1.5">{formErrors.apiKey}</p>}
            </div>
          )}

          {/* ============================================================ */}
          {/* 動態獲取模型清單與模型選擇區塊 (字體放大，操作清晰) */}
          {/* ============================================================ */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={fetchedModels.length > 0 && !isManualModelInput ? 'bazi-model-select' : 'bazi-model-input'}
                className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2"
              >
                <Settings className="w-4 h-4 text-slate-700" />
                <span>模型選擇 (Model Selection)</span>
              </label>

              {/* 獲取模型列表按鈕 */}
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={isFetchingModels || (!formData.apiKey && !formData.awsAccessKeyId)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm sm:text-base font-bold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${isFetchingModels ? 'animate-spin' : ''}`} />
                <span>{isFetchingModels ? '正在連線獲取...' : '獲取最新模型列表'}</span>
              </button>
            </div>

            {/* 獲取成功反饋 */}
            {modelFetchSuccess && (
              <div className="flex items-center gap-2 text-sm text-emerald-950 bg-emerald-50 border border-emerald-300 px-3 py-2 rounded-xl animate-fade-in font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>{modelFetchSuccess}</span>
              </div>
            )}

            {/* 獲取失敗提示 */}
            {modelFetchError && (
              <div className="text-sm text-amber-950 bg-amber-50 border border-amber-300 p-3.5 rounded-xl animate-fade-in space-y-1.5">
                <div className="flex items-start gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <span>獲取失敗：{modelFetchError}</span>
                </div>
                <div className="text-sm text-slate-800 pl-6 leading-relaxed font-medium">
                  若瀏覽器受 CORS 跨域限制或端點需代理，可直接在下方手動填入 Model ID。
                </div>
              </div>
            )}

            {/* 模型選擇：下拉選單 或 手動輸入 */}
            <div>
              {fetchedModels.length > 0 && !isManualModelInput ? (
                <div className="space-y-2">
                  <select
                    id="bazi-model-select"
                    name="modelName"
                    value={formData.modelName}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-3 border rounded-xl text-sm sm:text-base font-mono outline-none bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                      formErrors.modelName ? 'border-rose-500' : 'border-slate-300'
                    }`}
                  >
                    <option value="" disabled>
                      -- 請從以下 {fetchedModels.length} 款模型中選擇 --
                    </option>
                    {fetchedModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.id} {m.contextLength ? `(${(m.contextLength / 1000).toFixed(0)}k 上下文)` : ''}
                      </option>
                    ))}
                  </select>

                  <div className="flex flex-wrap justify-between items-center text-sm text-slate-800 pt-1 font-medium gap-2">
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
                <div className="space-y-2">
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
                        ? '請輸入模型名稱，或填寫 Key 後點擊「獲取最新模型列表」'
                        : '例如：gpt-4o, claude-3-7-sonnet, grok-2-latest...'
                    }
                    className={`w-full px-4 py-3 border rounded-xl text-sm sm:text-base font-mono text-slate-900 outline-none bg-white focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                      formErrors.modelName
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-slate-300'
                    }`}
                  />
                  <div className="flex flex-wrap justify-between items-center text-sm text-slate-800 pt-1 font-medium gap-2">
                    <span>
                      {fetchedModels.length === 0
                        ? '💡 填入 Key 後點擊上方按鈕可即時獲取該帳號支援的完整模型清單'
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
                <p className="text-rose-700 font-bold text-sm mt-1.5">{formErrors.modelName}</p>
              )}
            </div>
          </div>

          {/* 進階設定折疊區 (自訂 Base URL / 代理端點) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
              className="text-sm sm:text-base font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1.5 transition py-1 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none rounded"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-600" />
              <span>進階自訂端點 (Base URL / 反向代理位址)</span>
              {showAdvancedConfig ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showAdvancedConfig && (
              <div className="mt-3 p-4 bg-white rounded-2xl border border-slate-200 animate-fade-in space-y-2">
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  API Base URL (端點基礎位址)
                </label>
                <input
                  type="text"
                  name="apiBaseUrl"
                  value={formData.apiBaseUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm sm:text-base font-mono text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                />
                <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
                  如使用 Cloudflare AI Gateway、自建反向代理、OneAPI、LiteLLM 或區域網路伺服器，可在此修改端點位址。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 提交按鈕 */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 hover:from-black hover:to-black text-white font-bold text-base sm:text-lg py-4 px-6 rounded-2xl shadow-lg transform transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 focus-visible:ring-4 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-6 w-6 text-amber-300" />
              <span>888 大師排盤推演中 (約需 1-3 分鐘)</span>
            </>
          ) : (
            <>
              <Sparkles className="h-6 w-6 text-amber-300" />
              <span>生成 888 人生 K 線與百年詳批</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default BaziForm;
