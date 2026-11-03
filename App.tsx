import React, { useState, useMemo, useEffect, useRef } from 'react';
import LifeKLineChart from './components/LifeKLineChart';
import AnalysisResult from './components/AnalysisResult';
import ImportDataMode from './components/ImportDataMode';
import BaziForm from './components/BaziForm';
import StreamYearsViewer from './components/StreamYearsViewer';
import BirthProfileCard from './components/BirthProfileCard';
import { generateLifeAnalysis } from './services/geminiService';
import { compressData, decompressData } from './services/shareUtils';
import { LifeDestinyResult, UserInput, Gender } from './types';
import {
  Sparkles,
  AlertCircle,
  Download,
  Printer,
  Trophy,
  FileDown,
  Cpu,
  MessageSquare,
  Share2,
  Trash2,
  ArrowLeft,
  Eye,
  Check,
  LineChart,
  Table as TableIcon,
  Compass,
  ScrollText,
  User,
} from 'lucide-react';

export type AppRoute =
  | 'new'
  | 'import'
  | 'result'
  | 'profile'
  | 'kline'
  | 'years'
  | 'bazi'
  | 'analysis';

export const parseHashRoute = (hash: string): { route: AppRoute; sharePayload?: string } => {
  const cleanHash = (hash || '').replace(/^#\/?/, '').trim();

  // 1. Share or Data payload
  if (cleanHash.startsWith('share=') || cleanHash.startsWith('data=')) {
    return { route: 'result', sharePayload: cleanHash.slice(cleanHash.indexOf('=') + 1) };
  }

  if (cleanHash.includes('share=')) {
    const payload = cleanHash.split('share=')[1]?.split('&')[0];
    return { route: 'result', sharePayload: payload };
  }

  const mainPath = cleanHash.split('?')[0].toLowerCase();
  if (mainPath === 'import' || mainPath === 'manual') return { route: 'import' };
  if (mainPath === 'demo' || mainPath === 'example') return { route: 'new' };
  if (mainPath === 'profile' || mainPath === 'card' || mainPath === 'birth') return { route: 'profile' };
  if (mainPath === 'kline' || mainPath === 'chart') return { route: 'kline' };
  if (mainPath === 'years' || mainPath === 'stream' || mainPath === 'table') return { route: 'years' };
  if (mainPath === 'bazi' || mainPath === 'meta' || mainPath === 'pillars') return { route: 'bazi' };
  if (mainPath === 'analysis' || mainPath === 'report') return { route: 'analysis' };
  if (mainPath === 'result' || mainPath === 'overview') return { route: 'result' };
  if (mainPath === 'new' || mainPath === 'form' || mainPath === '') return { route: 'new' };

  return { route: 'new' };
};

// Safe storage wrapper to prevent crashes in private browsing or constrained environments
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`safeStorage.setItem failed for key "${key}":`, e);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`safeStorage.removeItem failed for key "${key}":`, e);
    }
  },
};

// 徹底清理與過濾「範例演示用戶」及 demo 歷史殘留字串
export const sanitizeCleanName = (raw?: string | null): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (
    trimmed === '範例演示用戶' ||
    trimmed.includes('範例演示用戶') ||
    trimmed.includes('演示用戶') ||
    trimmed.toLowerCase().includes('demo')
  ) {
    return '';
  }
  return trimmed;
};

const App: React.FC = () => {
  const [result, setResult] = useState<LifeDestinyResult | null>(null);
  const resultRef = useRef<LifeDestinyResult | null>(null);
  resultRef.current = result;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [inputMode, setInputMode] = useState<'ai' | 'manual'>('ai');
  const [isEditing, setIsEditing] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('new');

  // Load API config and saved user inputs on mount
  const [initialConfig, setInitialConfig] = useState<Partial<UserInput>>({});
  const [lastUserInput, setLastUserInput] = useState<Partial<UserInput>>({});

  // 路由直達跳轉器（更新 URL Hash 並觸發相應視圖/錨點）
  const navigateTo = (route: AppRoute, replace = false) => {
    const targetHash = `#/${route}`;
    if (window.location.hash !== targetHash) {
      if (replace) {
        window.history.replaceState(null, '', targetHash);
        handleRouteChange(route);
      } else {
        window.location.hash = targetHash;
      }
    } else {
      handleRouteChange(route);
    }
  };

  // 處理特定路由狀態與視圖切換
  const handleRouteChange = async (route: AppRoute) => {
    setCurrentRoute(route);

    if (route === 'import') {
      setInputMode('manual');
      setIsEditing(true);
      return;
    }

    if (route === 'new') {
      setInputMode('ai');
      setIsEditing(true);
      return;
    }

    // 命盤各區塊直達 (profile, kline, years, bazi, analysis, result)
    if (['result', 'profile', 'kline', 'years', 'bazi', 'analysis'].includes(route)) {
      const activeResult = resultRef.current || safeStorage.getItem('lifekline_saved_result');
      if (!activeResult) {
        // 若當前無命盤數據且直接拜訪子路由，引導至新排盤輸入
        navigateTo('new', true);
        return;
      }

      setIsEditing(false);

      const sectionIdMap: Record<string, string> = {
        profile: 'birth-profile-card',
        kline: 'kline-section',
        years: 'stream-years-section',
        bazi: 'bazi-meta-section',
        analysis: 'analysis-cards-section',
      };
      const targetId = sectionIdMap[route];
      if (targetId) {
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 120);
      }
    }
  };

  useEffect(() => {
    // 0. 主動防禦與徹底清理歷史「範例演示用戶」殘留
    const rawSavedUser = safeStorage.getItem('lifekline_user_name');
    if (rawSavedUser && !sanitizeCleanName(rawSavedUser)) {
      safeStorage.removeItem('lifekline_user_name');
    }

    const rawLastInputStr = safeStorage.getItem('lifekline_last_user_input');
    if (rawLastInputStr && (rawLastInputStr.includes('範例演示用戶') || rawLastInputStr.includes('演示用戶'))) {
      try {
        const parsed = JSON.parse(rawLastInputStr);
        if (parsed && typeof parsed === 'object') {
          parsed.name = sanitizeCleanName(parsed.name);
          safeStorage.setItem('lifekline_last_user_input', JSON.stringify(parsed));
        }
      } catch {
        safeStorage.removeItem('lifekline_last_user_input');
      }
    }

    const rawSavedResultStr = safeStorage.getItem('lifekline_saved_result');
    if (rawSavedResultStr && (rawSavedResultStr.includes('範例演示用戶') || rawSavedResultStr.includes('演示用戶'))) {
      try {
        const parsed = JSON.parse(rawSavedResultStr);
        if (parsed && typeof parsed === 'object') {
          if (parsed.name && !sanitizeCleanName(parsed.name)) parsed.name = '';
          if (parsed.userName && !sanitizeCleanName(parsed.userName)) parsed.userName = '';
          safeStorage.setItem('lifekline_saved_result', JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }
    }

    // 1. 恢復 API 配置
    const savedKey = safeStorage.getItem('lifekline_api_key');
    const savedUrl = safeStorage.getItem('lifekline_api_url');
    const savedModel = safeStorage.getItem('lifekline_model');
    const savedProvider = safeStorage.getItem('lifekline_provider');
    const savedAwsAk = safeStorage.getItem('lifekline_aws_ak');
    const savedAwsSk = safeStorage.getItem('lifekline_aws_sk');
    const savedAwsRegion = safeStorage.getItem('lifekline_aws_region');
    const savedAwsSt = safeStorage.getItem('lifekline_aws_st');

    if (savedKey || savedUrl || savedModel || savedProvider || savedAwsAk) {
      setInitialConfig({
        provider: (savedProvider as any) || undefined,
        apiKey: savedKey || '',
        apiBaseUrl: savedUrl || undefined,
        modelName: savedModel || undefined,
        awsAccessKeyId: savedAwsAk || undefined,
        awsSecretAccessKey: savedAwsSk || undefined,
        awsRegion: savedAwsRegion || undefined,
        awsSessionToken: savedAwsSt || undefined,
      });
    }

    // 2. 恢復上次輸入的表單資料 (生日、時間、地點、性別、姓名等)
    const savedLastInputStr = safeStorage.getItem('lifekline_last_user_input');
    if (savedLastInputStr) {
      try {
        const parsed = JSON.parse(savedLastInputStr);
        if (parsed && typeof parsed === 'object') {
          parsed.name = sanitizeCleanName(parsed.name);
          setLastUserInput(parsed);
          if (parsed.name && !userName) {
            setUserName(parsed.name);
          }
        }
      } catch (e) {
        console.warn('Failed to parse lifekline_last_user_input', e);
      }
    }

    // 3. 路由監聽與初始化
    const syncFromHash = async () => {
      const hash = window.location.hash;

      // 優先檢查分享數據
      if (hash.startsWith('#data=') || hash.startsWith('#share=') || hash.includes('share=')) {
        const payload = hash.includes('share=')
          ? hash.split('share=')[1]?.split('&')[0]
          : hash.slice(hash.indexOf('=') + 1);
        if (payload) {
          try {
            const shared = await decompressData(payload);
            if (shared && shared.result && shared.result.chartData) {
              setResult(shared.result);
              const cleanSharedUser = sanitizeCleanName(shared.userName);
              if (cleanSharedUser) {
                setUserName(cleanSharedUser);
              }
              setIsEditing(false);
              safeStorage.setItem('lifekline_saved_result', JSON.stringify(shared.result));
              if (cleanSharedUser) {
                safeStorage.setItem('lifekline_user_name', cleanSharedUser);
              }
              setCurrentRoute('result');
              return;
            }
          } catch (e) {
            console.error('Failed to parse shared data from hash', e);
          }
        }
      }

      // 檢查 localStorage 既有已保存命盤
      const savedResultStr = safeStorage.getItem('lifekline_saved_result');
      const savedUserName = sanitizeCleanName(safeStorage.getItem('lifekline_user_name'));
      let loadedSaved = false;
      if (savedResultStr) {
        try {
          const parsed = JSON.parse(savedResultStr);
          if (parsed && parsed.chartData && parsed.analysis) {
            setResult(parsed);
            if (savedUserName) setUserName(savedUserName);
            loadedSaved = true;
          }
        } catch (e) {
          console.warn('Failed to parse saved result from localStorage:', e);
        }
      }

      const { route } = parseHashRoute(hash);

      if (hash === '' || hash === '#' || hash === '#/') {
        if (loadedSaved) {
          setIsEditing(false);
          setCurrentRoute('result');
          window.history.replaceState(null, '', '#/result');
        } else {
          setIsEditing(true);
          setCurrentRoute('new');
        }
      } else {
        await handleRouteChange(route);
      }
    };

    window.addEventListener('hashchange', syncFromHash);
    syncFromHash();

    return () => {
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, []);

  const handleBaziSubmit = async (data: UserInput) => {
    setIsLoading(true);
    setError(null);
    const cleanSubmitName = sanitizeCleanName(data.name);
    setUserName(cleanSubmitName);

    const cleanInputData: UserInput = {
      ...data,
      name: cleanSubmitName,
    };

    // 儲存上次輸入的完整表單狀態 (生日、時間、性別、姓名、出生地等)
    setLastUserInput(cleanInputData);
    safeStorage.setItem('lifekline_last_user_input', JSON.stringify(cleanInputData));

    // Save config for convenience
    if (data.provider) safeStorage.setItem('lifekline_provider', data.provider);
    safeStorage.setItem('lifekline_api_key', data.apiKey || '');
    safeStorage.setItem('lifekline_api_url', data.apiBaseUrl || '');
    safeStorage.setItem('lifekline_model', data.modelName || '');
    if (data.awsAccessKeyId) safeStorage.setItem('lifekline_aws_ak', data.awsAccessKeyId);
    if (data.awsSecretAccessKey) safeStorage.setItem('lifekline_aws_sk', data.awsSecretAccessKey);
    if (data.awsRegion) safeStorage.setItem('lifekline_aws_region', data.awsRegion);
    if (data.awsSessionToken) safeStorage.setItem('lifekline_aws_st', data.awsSessionToken);

    try {
      const analysisResult = await generateLifeAnalysis(cleanInputData);
      setResult(analysisResult);
      setIsEditing(false);

      // Persist to localStorage
      safeStorage.setItem('lifekline_saved_result', JSON.stringify(analysisResult));
      if (cleanSubmitName) {
        safeStorage.setItem('lifekline_user_name', cleanSubmitName);
      } else {
        safeStorage.removeItem('lifekline_user_name');
      }

      navigateTo('result');
    } catch (err: any) {
      setError(err.message || '分析失敗，請檢查 API 金鑰或網路連線');
    } finally {
      setIsLoading(false);
    }
  };

  // 整合上次輸入的生辰數據與 API 配置，確保「返回修改」時完整還原
  const mergedFormData = useMemo(() => {
    const rawMergedName = lastUserInput.name ?? userName ?? initialConfig.name ?? '';
    const safeMergedName = sanitizeCleanName(rawMergedName);

    return {
      ...initialConfig,
      ...lastUserInput,
      name: safeMergedName,
      gender: lastUserInput.gender ?? Gender.MALE,
      birthDate: lastUserInput.birthDate ?? '',
      birthTime: lastUserInput.birthTime ?? '12:00',
      birthPlace: lastUserInput.birthPlace ?? '臺北市',
      customLongitude: lastUserInput.customLongitude,
      customLatitude: lastUserInput.customLatitude,
      apiKey: initialConfig.apiKey || lastUserInput.apiKey || '',
      provider: initialConfig.provider || lastUserInput.provider,
      modelName: initialConfig.modelName || lastUserInput.modelName,
      apiBaseUrl: initialConfig.apiBaseUrl || lastUserInput.apiBaseUrl,
      awsAccessKeyId: initialConfig.awsAccessKeyId || lastUserInput.awsAccessKeyId,
      awsSecretAccessKey: initialConfig.awsSecretAccessKey || lastUserInput.awsSecretAccessKey,
      awsRegion: initialConfig.awsRegion || lastUserInput.awsRegion,
      awsSessionToken: initialConfig.awsSessionToken || lastUserInput.awsSessionToken,
    };
  }, [initialConfig, lastUserInput, userName]);

  // 處理手動導入數據
  const handleDataImport = (data: LifeDestinyResult) => {
    setResult(data);
    setIsEditing(false);
    safeStorage.setItem('lifekline_saved_result', JSON.stringify(data));
    navigateTo('result');
  };

  // 生成並複製包含命盤數據的分享網址 (持久存儲至 URL Hash)
  const handleCopyShareLink = async () => {
    if (!result) return;
    try {
      const compressedHash = await compressData({
        v: 1,
        userName,
        result,
      });

      const url = new URL(window.location.href);
      url.hash = `#/share=${compressedHash}`;
      const shareUrl = url.toString();

      await navigator.clipboard.writeText(shareUrl);
      window.history.replaceState(null, '', url.toString());

      setShareToast('分享連結已複製到剪貼簿！包含完整命盤數據，打開即可還原。');
      setTimeout(() => setShareToast(null), 4000);
    } catch (err) {
      console.error('Failed to create share link:', err);
      // Fallback: 至少複製當前 URL
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareToast('已複製當前網址！');
        setTimeout(() => setShareToast(null), 3000);
      } catch {
        alert('複製連結失敗，請手動複製網址');
      }
    }
  };

  // 清空命盤數據並新起
  const handleClearData = () => {
    if (window.confirm('確定要清空已保存的命盤數據嗎？')) {
      setResult(null);
      setUserName('');
      setLastUserInput({});
      setIsEditing(true);
      safeStorage.removeItem('lifekline_saved_result');
      safeStorage.removeItem('lifekline_user_name');
      safeStorage.removeItem('lifekline_last_user_input');
      navigateTo('new');
    }
  };

  // 導出爲 JSON 文件
  const handleExportJson = () => {
    if (!result) return;

    const exportData = {
      bazi: result.analysis.bazi,
      baziMeta: result.baziMeta,
      summary: result.analysis.summary,
      summaryScore: result.analysis.summaryScore,
      personality: result.analysis.personality,
      personalityScore: result.analysis.personalityScore,
      industry: result.analysis.industry,
      industryScore: result.analysis.industryScore,
      fengShui: result.analysis.fengShui,
      fengShuiScore: result.analysis.fengShuiScore,
      wealth: result.analysis.wealth,
      wealthScore: result.analysis.wealthScore,
      marriage: result.analysis.marriage,
      marriageScore: result.analysis.marriageScore,
      health: result.analysis.health,
      healthScore: result.analysis.healthScore,
      family: result.analysis.family,
      familyScore: result.analysis.familyScore,
      crypto: result.analysis.crypto,
      cryptoScore: result.analysis.cryptoScore,
      cryptoYear: result.analysis.cryptoYear,
      cryptoStyle: result.analysis.cryptoStyle,
      chartPoints: result.chartData,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `888命理分析_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const escapeHtml = (str: unknown): string => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const handleSaveHtml = () => {
    if (!result) return;
    const now = new Date();
    const timeString = now.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const chartContainer = document.querySelector('.recharts-surface');
    const chartSvg = chartContainer
      ? chartContainer.outerHTML
      : '<div style="padding:20px;text-align:center;">圖表導出失敗，請截圖保存</div>';

    const analysisContainer = document.getElementById('analysis-result-container');
    const analysisHtml = analysisContainer ? analysisContainer.innerHTML : '';

    const safeUserName = escapeHtml(userName);

    // 構建命造檔案與原始八字四柱 HTML (供離線網頁使用)
    const baziMeta = result.baziMeta;
    const solarInfo = baziMeta?.solarTimeInfo;
    const yearPillar = escapeHtml(baziMeta?.yearPillar || result.analysis.bazi?.[0] || '—');
    const monthPillar = escapeHtml(baziMeta?.monthPillar || result.analysis.bazi?.[1] || '—');
    const dayPillar = escapeHtml(baziMeta?.dayPillar || result.analysis.bazi?.[2] || '—');
    const hourPillar = escapeHtml(baziMeta?.hourPillar || result.analysis.bazi?.[3] || '—');

    const yearGod = escapeHtml(baziMeta?.tenGods?.year || '—');
    const monthGod = escapeHtml(baziMeta?.tenGods?.month || '—');
    const dayGod = escapeHtml(baziMeta?.tenGods?.day || '日元');
    const hourGod = escapeHtml(baziMeta?.tenGods?.hour || '—');

    const yearNayin = escapeHtml(baziMeta?.nayinPillars?.year || '—');
    const monthNayin = escapeHtml(baziMeta?.nayinPillars?.month || '—');
    const dayNayin = escapeHtml(baziMeta?.nayinPillars?.day || '—');
    const hourNayin = escapeHtml(baziMeta?.nayinPillars?.hour || '—');

    const genderLabel = lastUserInput.gender === Gender.FEMALE ? '坤造 (女)' : '乾造 (男)';
    const birthDateStr = escapeHtml(solarInfo?.originalDate || lastUserInput.birthDate || '');
    const birthTimeStr = escapeHtml(solarInfo?.originalTime || lastUserInput.birthTime || '');
    const placeStr = escapeHtml(solarInfo?.place || result.birthPlace || lastUserInput.birthPlace || '臺北市');
    const lngStr = solarInfo?.location?.lng !== undefined
      ? (solarInfo.location.lng >= 0 ? `${solarInfo.location.lng}°E` : `${Math.abs(solarInfo.location.lng)}°W`)
      : '121.57°E';
    const startAgeStr = escapeHtml(baziMeta?.startAge || lastUserInput.startAge || '1');
    const firstDaYunStr = escapeHtml(baziMeta?.firstDaYun || lastUserInput.firstDaYun || '—');

    const dayMaster = escapeHtml(baziMeta?.dayMaster || (dayPillar !== '—' ? dayPillar.charAt(0) : '日元'));
    const strength = escapeHtml(baziMeta?.strength || '');
    const strengthReason = escapeHtml(baziMeta?.strengthReason || '');
    const geJu = escapeHtml(baziMeta?.geJu || '八字格局');
    const geJuDesc = escapeHtml(baziMeta?.geJuDescription || '');
    const usefulStr = escapeHtml(baziMeta?.usefulGod || (baziMeta?.usefulElements?.length ? baziMeta.usefulElements.join('、') : '生身幫扶'));
    const tabooStr = escapeHtml(baziMeta?.tabooGod || (baziMeta?.tabooElements?.length ? baziMeta.tabooElements.join('、') : '克泄消耗'));

    const solarSectionHtml = solarInfo ? `
      <div class="mt-4 p-4 rounded-xl bg-indigo-950/70 border border-indigo-400/30 text-xs sm:text-sm text-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-amber-400 font-bold">天文立盤：</span>
          <span>鐘錶標準時 <strong class="font-mono text-white">${escapeHtml(solarInfo.originalTime)}</strong></span>
          <span class="text-amber-300 font-bold">➔</span>
          <span>真太陽時 <strong class="font-mono text-emerald-300 font-bold">${escapeHtml(solarInfo.solarTime)}</strong></span>
          <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30 font-bold text-xs">【${escapeHtml(solarInfo.shichenBranch)}時立盤】</span>
        </div>
        <div class="text-slate-300 text-xs flex flex-wrap gap-2">
          <span>經度差：<strong class="font-mono text-amber-200">${solarInfo.offsets.lngOffsetMinutes >= 0 ? '+' : ''}${solarInfo.offsets.lngOffsetMinutes.toFixed(1)}m</strong></span>
          <span>·</span>
          <span>均時差：<strong class="font-mono text-amber-200">${solarInfo.offsets.eotMinutes >= 0 ? '+' : ''}${solarInfo.offsets.eotMinutes.toFixed(1)}m</strong></span>
          <span>·</span>
          <span class="text-emerald-300 font-bold">合計校正：<strong class="font-mono">${solarInfo.offsets.totalOffsetMinutes >= 0 ? '+' : ''}${solarInfo.offsets.totalOffsetMinutes.toFixed(1)}m</strong></span>
        </div>
      </div>
    ` : '';

    const birthProfileHtml = `
      <div class="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 p-6 md:p-8 rounded-3xl shadow-sm border border-amber-500/30">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div class="flex flex-wrap items-center gap-2 mb-1.5">
              <span class="text-xs uppercase tracking-widest text-amber-400 font-extrabold">命造檔案與原始生辰</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-amber-200 border border-white/15">${genderLabel}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30">${startAgeStr} 歲起運 · 第一步【${firstDaYunStr}】</span>
            </div>
            <h2 class="text-3xl font-serif-sc font-bold text-amber-100">${safeUserName || '未具名命造'}</h2>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            ${birthDateStr ? `<span class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">公曆 ${birthDateStr} ${birthTimeStr}</span>` : ''}
            <span class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">出生地：${placeStr} (${escapeHtml(lngStr)})</span>
          </div>
        </div>

        ${solarSectionHtml}

        <div class="mt-6">
          <div class="text-sm font-bold text-amber-300 mb-3">原始命造四柱八字排盤 (年月日時 · 十神 · 納音)</div>
          <div class="grid grid-cols-4 gap-3 text-center">
            <div class="bg-white/5 p-4 rounded-2xl border border-amber-400/20">
              <div class="text-xs text-amber-300 font-bold mb-1">年柱 (根基)</div>
              <div class="text-xs text-indigo-300 font-extrabold mb-1">${yearGod}</div>
              <div class="text-3xl font-serif-sc font-black text-amber-100 my-2">${yearPillar}</div>
              <div class="text-xs text-slate-300 bg-white/10 py-1 px-1.5 rounded-lg">${yearNayin}</div>
            </div>
            <div class="bg-white/5 p-4 rounded-2xl border border-amber-400/20">
              <div class="text-xs text-amber-300 font-bold mb-1">月柱 (提綱)</div>
              <div class="text-xs text-indigo-300 font-extrabold mb-1">${monthGod}</div>
              <div class="text-3xl font-serif-sc font-black text-amber-100 my-2">${monthPillar}</div>
              <div class="text-xs text-slate-300 bg-white/10 py-1 px-1.5 rounded-lg">${monthNayin}</div>
            </div>
            <div class="bg-white/5 p-4 rounded-2xl border border-amber-400/20">
              <div class="text-xs text-amber-300 font-bold mb-1">日柱 (自身)</div>
              <div class="text-xs text-indigo-300 font-extrabold mb-1">${dayGod}</div>
              <div class="text-3xl font-serif-sc font-black text-amber-100 my-2">${dayPillar}</div>
              <div class="text-xs text-slate-300 bg-white/10 py-1 px-1.5 rounded-lg">${dayNayin}</div>
            </div>
            <div class="bg-white/5 p-4 rounded-2xl border border-amber-400/20">
              <div class="text-xs text-amber-300 font-bold mb-1">時柱 (歸宿)</div>
              <div class="text-xs text-indigo-300 font-extrabold mb-1">${hourGod}</div>
              <div class="text-3xl font-serif-sc font-black text-amber-100 my-2">${hourPillar}</div>
              <div class="text-xs text-slate-300 bg-white/10 py-1 px-1.5 rounded-lg">${hourNayin}</div>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs sm:text-sm">
          <div class="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span class="text-amber-400 font-bold block mb-1">日主與旺衰：</span>
            <span class="text-amber-100 font-bold text-base">${dayMaster}</span>
            ${strength ? `<span class="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30">${strength}</span>` : ''}
            ${strengthReason ? `<p class="text-slate-300 text-xs mt-1">${strengthReason}</p>` : ''}
          </div>
          <div class="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span class="text-indigo-400 font-bold block mb-1">命理格局：</span>
            <span class="text-indigo-100 font-bold text-base">${geJu}</span>
            ${geJuDesc ? `<p class="text-slate-300 text-xs mt-1">${geJuDesc}</p>` : ''}
          </div>
          <div class="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span class="text-emerald-400 font-bold block mb-1">五行喜忌：</span>
            <div class="text-xs space-y-1">
              <div><strong class="text-emerald-300">喜用：</strong>${usefulStr}</div>
              <div><strong class="text-rose-300">忌仇：</strong>${tabooStr}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const tableRows = result.chartData
      .map((item) => {
        const scoreColor = item.close >= item.open ? 'text-green-700' : 'text-red-700';
        const trendIcon = item.close >= item.open ? '▲' : '▼';
        return `
        <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors">
          <td class="p-3.5 border-r border-gray-200 text-center font-mono font-bold text-base text-slate-900">${escapeHtml(item.age)}歲</td>
          <td class="p-3.5 border-r border-gray-200 text-center font-bold text-base text-slate-950">${escapeHtml(item.year)} ${escapeHtml(item.ganZhi)}</td>
          <td class="p-3.5 border-r border-gray-200 text-center text-base text-slate-800 font-medium">${escapeHtml(item.daYun || '-')}</td>
          <td class="p-3.5 border-r border-gray-200 text-center font-extrabold text-base ${scoreColor}">
            ${escapeHtml(item.score)} <span class="text-sm">${trendIcon}</span>
          </td>
          <td class="p-3.5 text-base text-slate-900 text-justify leading-relaxed font-normal">${escapeHtml(item.reason)}</td>
        </tr>
      `;
      })
      .join('');

    const detailedTableHtml = `
      <div class="mt-12 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
           <div class="flex items-center gap-2.5">
             <div class="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
             <h3 class="text-2xl font-bold text-gray-900 font-serif-sc">流年詳批全表 (1-100歲)</h3>
           </div>
           <span class="text-sm text-gray-600 font-medium">(百年每歲流年詳批全覽)</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-100 text-gray-800 text-base font-bold uppercase tracking-wider">
                <th class="p-3.5 border-r border-gray-200 text-center w-20">年齡</th>
                <th class="p-3.5 border-r border-gray-200 text-center w-28">流年</th>
                <th class="p-3.5 border-r border-gray-200 text-center w-28">大運</th>
                <th class="p-3.5 border-r border-gray-200 text-center w-24">評分</th>
                <th class="p-3.5">運勢批斷與建議</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const fullHtml = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeUserName || '用戶'} - 888人生K線命理報告</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@500;700;900&family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
      background-color: #f8fafc;
      font-size: 16px;
      line-height: 1.6;
    }
    .font-serif-sc {
      font-family: "Noto Serif TC", "Songti TC", "STSong", "PMingLiU", Georgia, serif;
    }
    /* 圖表 SVG 自適應寬度 */
    .chart-container svg,
    svg.recharts-surface {
      width: 100% !important;
      height: auto !important;
      max-height: 500px;
    }
    /* 修正 Lucide SVG 圖標在離線導出 HTML 中被放大變形的問題，嚴格限制常規圖標尺寸 */
    svg.lucide,
    svg[class*="lucide"],
    svg:not(.recharts-surface) {
      display: inline-block !important;
      vertical-align: middle !important;
      flex-shrink: 0 !important;
      max-width: 1.5rem !important;
      max-height: 1.5rem !important;
    }
    svg.w-3, .w-3 svg { width: 0.75rem !important; height: 0.75rem !important; }
    svg.w-3\\.5, .w-3\\.5 svg { width: 0.875rem !important; height: 0.875rem !important; }
    svg.w-4, .w-4 svg { width: 1rem !important; height: 1rem !important; }
    svg.w-5, .w-5 svg { width: 1.25rem !important; height: 1.25rem !important; }
    svg.w-6, .w-6 svg { width: 1.5rem !important; height: 1.5rem !important; }
    svg.w-7, .w-7 svg { width: 1.75rem !important; height: 1.75rem !important; }
    svg.w-8, .w-8 svg { width: 2rem !important; height: 2rem !important; }
    svg.h-3, .h-3 svg { height: 0.75rem !important; }
    svg.h-3\\.5, .h-3\\.5 svg { height: 0.875rem !important; }
    svg.h-4, .h-4 svg { height: 1rem !important; }
    svg.h-5, .h-5 svg { height: 1.25rem !important; }
    svg.h-6, .h-6 svg { height: 1.5rem !important; }
    svg.h-7, .h-7 svg { height: 1.75rem !important; }
    svg.h-8, .h-8 svg { height: 2rem !important; }
  </style>
</head>
<body class="bg-slate-50 min-h-screen p-4 md:p-12 text-slate-900">
  <div class="max-w-6xl mx-auto space-y-10">
    <div class="text-center border-b border-gray-200 pb-8">
      <h1 class="text-4xl md:text-5xl font-bold font-serif-sc text-slate-950 mb-3">${safeUserName ? safeUserName + '的' : ''}888人生K線命理報告</h1>
      <p class="text-slate-600 text-base font-medium">生成時間：${escapeHtml(timeString)}</p>
    </div>
    ${birthProfileHtml}
    <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
      <div class="flex items-center gap-2.5 mb-6">
        <div class="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
        <h3 class="text-2xl font-bold text-slate-950 font-serif-sc">流年大運走勢圖</h3>
      </div>
      <div class="chart-container w-full overflow-hidden flex justify-center py-4">
        ${chartSvg}
      </div>
      <p class="text-center text-sm text-slate-600 mt-3 font-medium">注：圖表K線顏色根據運勢漲跌繪製，數值越高代表運勢越強。</p>
    </div>
    <div class="space-y-8">
       ${analysisHtml}
    </div>
    ${detailedTableHtml}
    <div class="text-center text-slate-500 text-base py-12 border-t border-gray-200 mt-12 font-medium space-y-2">
      <p>&copy; ${now.getFullYear()} 888 人生 K 線項目 | 僅供娛樂與文化研究，請勿迷信</p>
      <p class="text-sm text-slate-600">技術提供：<a href="https://david888.com" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline font-bold">david888.com</a></p>
    </div>
  </div>
</body>
</html>
    `;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const sanitizedFileNamePrefix = (userName || 'User').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizedFileNamePrefix}_Life_Kline_Report_${now.getTime()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 計算人生巔峯
  const peakYearItem = useMemo(() => {
    if (!result || !result.chartData.length) return null;
    return result.chartData.reduce((prev, current) => (prev.high > current.high ? prev : current));
  }, [result]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      {/* 頂部導航欄（具備完整 SPA 路由直達功能） */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200 py-3 sm:py-3.5 sticky top-0 z-50 no-print shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center justify-between w-full md:w-auto">
            <a
              href="#/new"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('new');
              }}
              className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer focus:outline-none"
            >
              <div className="bg-slate-950 text-white p-2 sm:p-2.5 rounded-xl shadow-sm group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-serif-sc font-bold text-slate-950 tracking-wide">888人生K線</h1>
                <p className="text-[11px] sm:text-xs text-slate-600 font-semibold uppercase tracking-wider">
                  888 Life Destiny K-Line
                </p>
              </div>
            </a>
          </div>

          {/* 路由直達功能選單 */}
          <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 text-sm font-bold no-scrollbar w-full md:w-auto">
            <button
              type="button"
              onClick={() => navigateTo('new')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition flex-shrink-0 ${
                currentRoute === 'new' && (!result || isEditing)
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>AI 排盤</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('import')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition flex-shrink-0 ${
                currentRoute === 'import' && (!result || isEditing)
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              <span>手動導入</span>
            </button>

            {/* 結果頁面時的直達錨點導航 */}
            {result && !isEditing && (
              <>
                <span className="w-px h-5 bg-slate-200 mx-1 hidden sm:block flex-shrink-0" />

                <button
                  type="button"
                  onClick={() => navigateTo('profile')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition flex-shrink-0 ${
                    currentRoute === 'profile'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-4 h-4 text-amber-500" />
                  <span>生辰檔案</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('kline')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition flex-shrink-0 ${
                    currentRoute === 'kline'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  <LineChart className="w-4 h-4 text-emerald-600" />
                  <span>K線圖</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('years')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition flex-shrink-0 ${
                    currentRoute === 'years'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  <TableIcon className="w-4 h-4 text-indigo-600" />
                  <span>流年詳批</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('bazi')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition flex-shrink-0 ${
                    currentRoute === 'bazi'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  <Compass className="w-4 h-4 text-amber-600" />
                  <span>雙盤底蘊</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('analysis')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition flex-shrink-0 ${
                    currentRoute === 'analysis'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  <ScrollText className="w-4 h-4 text-teal-600" />
                  <span>命理分析</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* 分享成功 Toast 提示 */}
      {shareToast && (
        <div className="fixed top-20 right-4 z-50 max-w-md bg-emerald-950 text-white px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in border border-emerald-700">
          <Check className="w-5 h-5 text-emerald-300 flex-shrink-0" />
          <p className="text-sm sm:text-base font-bold">{shareToast}</p>
        </div>
      )}

      <main className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-10">
        {/* 表單推演視圖（未生成結果 或 點擊了「返回修改」） */}
        {(!result || isEditing) && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-fade-in w-full">
            {/* 若已保存結果但處於返回修改模式，提供顯式的返回查看按鈕 */}
            {result && isEditing && (
              <div className="w-full max-w-2xl bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-indigo-950">
                <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold">
                  <Sparkles className="w-5 h-5 text-indigo-700 flex-shrink-0" />
                  <span>已保存命盤數據{userName ? `（${userName}）` : ''}</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('result')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm sm:text-base font-bold transition flex items-center gap-2 shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
                >
                  <Eye className="w-4 h-4" />
                  <span>查看命盤結果</span>
                </button>
              </div>
            )}

            <div className="text-center max-w-3xl flex flex-col items-center">
              <h2 className="text-4xl md:text-5xl font-serif-sc font-bold text-slate-950 mb-6 leading-tight">
                洞悉命運起伏 <br />
                <span className="text-indigo-700">888 預見人生軌跡</span>
              </h2>
              <p className="text-slate-800 text-base md:text-lg leading-relaxed mb-8">
                結合<strong className="text-slate-950 font-bold">傳統八字命理</strong>與<strong className="text-slate-950 font-bold">金融可視化技術</strong>，
                將您的一生運勢繪製成類似股票行情的高清 K 線圖與百年流年詳批。
              </p>

              {/* 路由直達功能切換頁籤 */}
              <div className="flex p-1.5 bg-slate-200 rounded-xl mb-6 w-full max-w-md border border-slate-300">
                <button
                  type="button"
                  onClick={() => navigateTo('new')}
                  aria-pressed={inputMode === 'ai' && (!result || isEditing)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm sm:text-base font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
                    inputMode === 'ai' && (!result || isEditing)
                      ? 'bg-white text-indigo-950 shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                  <span>AI 自動排盤</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('import')}
                  aria-pressed={inputMode === 'manual' && (!result || isEditing)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm sm:text-base font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
                    inputMode === 'manual' && (!result || isEditing)
                      ? 'bg-white text-indigo-950 shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                  <span>手動導入</span>
                </button>
              </div>
            </div>

            {inputMode === 'ai' ? (
              <BaziForm onSubmit={handleBaziSubmit} isLoading={isLoading} initialData={mergedFormData} />
            ) : (
              <div className="flex flex-col items-center gap-6 w-full">
                <ImportDataMode onDataImport={handleDataImport} />
                <p className="text-sm text-slate-700 font-medium">
                  粘貼 AI 生成的 JSON 數據以生成完整 K 線與百年詳批
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 text-rose-950 bg-rose-50 px-5 py-4 rounded-xl border border-rose-200 max-w-lg w-full animate-bounce-short">
                <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-700" />
                <p className="text-base font-bold">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* 命盤結果呈現區塊 */}
        {result && !isEditing && (
          <div className="animate-fade-in space-y-12">
            {/* 結果頁頂部操作工具欄 */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-200 pb-6 gap-5">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold font-serif-sc text-slate-950 tracking-tight">
                  {userName ? `${userName}的` : ''} 888 命盤分析報告
                </h2>
                <p className="text-sm sm:text-base text-slate-700 mt-2 font-medium">
                  數據已自動持久化儲存於瀏覽器，重新整理不會遺失
                </p>
              </div>

              <div className="flex flex-wrap gap-3 no-print">
                {/* 複製分享連結 */}
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-950 border border-indigo-300 rounded-xl hover:bg-indigo-100 transition font-bold text-sm sm:text-base focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
                >
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-700" />
                  <span>分享命盤</span>
                </button>

                {/* 導出 JSON */}
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 transition font-bold text-sm sm:text-base shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
                >
                  <FileDown className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>導出 JSON</span>
                </button>

                {/* 列印報表 */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 transition font-bold text-sm sm:text-base shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
                >
                  <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>列印報表</span>
                </button>

                {/* 保存離線 HTML */}
                <button
                  type="button"
                  onClick={handleSaveHtml}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 transition font-bold text-sm sm:text-base shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>保存離線網頁</span>
                </button>

                {/* 返回修改 (保留現有結果) */}
                <button
                  type="button"
                  onClick={() => navigateTo('new')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 transition font-bold text-sm sm:text-base shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>返回修改</span>
                </button>

                {/* 清空並新起命盤 */}
                <button
                  type="button"
                  onClick={handleClearData}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-950 border border-rose-300 rounded-xl hover:bg-rose-100 transition font-bold text-sm sm:text-base focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-rose-700" />
                  <span>清空命盤</span>
                </button>
              </div>
            </div>

            {/* 結果頁頂部原始生辰八字與推演檔案卡 */}
            <BirthProfileCard
              userName={userName}
              gender={lastUserInput.gender}
              birthDate={lastUserInput.birthDate}
              birthTime={lastUserInput.birthTime}
              birthPlace={result.birthPlace || lastUserInput.birthPlace}
              baziMeta={result.baziMeta}
              startAge={lastUserInput.startAge}
              firstDaYun={lastUserInput.firstDaYun}
              analysisBazi={result.analysis?.bazi}
            />

            {/* 走勢圖區塊 */}
            <section id="kline-section" className="space-y-4 break-inside-avoid scroll-mt-24">
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold text-slate-950 flex items-center gap-2.5 font-serif-sc">
                  <span className="w-1.5 h-6 bg-indigo-600 rounded-full" aria-hidden="true" />
                  888 流年大運走勢圖 (100年)
                </h3>
                {peakYearItem && (
                  <p className="text-sm sm:text-base font-bold text-indigo-950 bg-indigo-50 border border-indigo-200 rounded-lg px-3.5 py-1.5 inline-flex items-center gap-2 self-start mt-1">
                    <Trophy className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      人生巔峯年份：{peakYearItem.year}年 ({peakYearItem.ganZhi}) - {peakYearItem.age}歲，評分{' '}
                      <span className="text-amber-800 text-lg font-black">{peakYearItem.high}</span>
                    </span>
                  </p>
                )}
              </div>
              <p className="text-sm sm:text-base text-slate-800 mb-2 no-print font-medium">
                <span className="text-emerald-900 font-bold">綠色K線</span> 代表運勢上漲（吉），
                <span className="text-rose-900 font-bold">紅色K線</span> 代表運勢下跌（兇）。
                <span className="text-amber-900 font-bold">★ 巔峰</span> 標記爲全盤最高運勢點。
              </p>
              <LifeKLineChart data={result.chartData} />
            </section>

            {/* 需求 1：幾歲幾歲的流年詳批內容直接在前端完整展示 */}
            <section id="stream-years-section" className="scroll-mt-24">
              <StreamYearsViewer data={result.chartData} />
            </section>

            {/* 命盤總評與各項分析卡片（包含正統子平與紫微雙盤底蘊元盤） */}
            <section id="analysis-result-container" className="scroll-mt-24">
              <AnalysisResult analysis={result.analysis} baziMeta={result.baziMeta} />
            </section>

            {/* 專用列印全表 (僅在瀏覽器列印模式輸出完整 1-100 歲) */}
            <div className="hidden print:block mt-8 break-before-page">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2 mb-4">
                <div className="w-1.5 h-5 bg-indigo-600 rounded-full" />
                <h3 className="text-2xl font-bold text-slate-950 font-serif-sc">888 流年詳批全表 (1-100歲)</h3>
              </div>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold uppercase tracking-wider">
                    <th className="p-2.5 border border-slate-300 text-center w-16">年齡</th>
                    <th className="p-2.5 border border-slate-300 text-center w-28">流年</th>
                    <th className="p-2.5 border border-slate-300 text-center w-28">大運</th>
                    <th className="p-2.5 border border-slate-300 text-center w-20">評分</th>
                    <th className="p-2.5 border border-slate-300">運勢批斷與建議</th>
                  </tr>
                </thead>
                <tbody>
                  {result.chartData.map((item) => (
                    <tr key={item.age} className="border-b border-slate-200 break-inside-avoid">
                      <td className="p-2.5 border border-slate-200 text-center font-mono font-bold text-base text-slate-950">{item.age}歲</td>
                      <td className="p-2.5 border border-slate-200 text-center font-bold text-base text-slate-950">
                        {item.year} {item.ganZhi}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-center text-slate-900 font-medium">{item.daYun || '-'}</td>
                      <td
                        className={`p-2.5 border border-slate-200 text-center font-black font-mono text-base ${
                          item.close >= item.open ? 'text-emerald-800' : 'text-rose-800'
                        }`}
                      >
                        {item.score}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-slate-950 text-justify text-sm leading-relaxed">
                        {item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap justify-between items-center text-sm text-slate-700 font-medium gap-2">
                <span>用戶：{userName || '未具名命造'}</span>
                <span>技術提供：david888.com</span>
                <span>生成時間：{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 底部 Footer */}
      <footer className="w-full bg-slate-950 text-slate-300 py-8 mt-auto no-print border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center text-base space-y-2">
          <p className="font-medium text-slate-300">
            &copy; {new Date().getFullYear()} 888人生K線 | 僅供娛樂與文化研究，請勿迷信
          </p>
          <p className="text-sm sm:text-base text-slate-400 font-medium">
            技術提供：<a href="https://david888.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline font-bold transition">david888.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
