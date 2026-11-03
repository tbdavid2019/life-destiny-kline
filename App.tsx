import React, { useState, useMemo, useEffect } from 'react';
import LifeKLineChart from './components/LifeKLineChart';
import AnalysisResult from './components/AnalysisResult';
import ImportDataMode from './components/ImportDataMode';
import BaziForm from './components/BaziForm';
import StreamYearsViewer from './components/StreamYearsViewer';
import { generateLifeAnalysis } from './services/geminiService';
import { compressData, decompressData } from './services/shareUtils';
import { LifeDestinyResult, UserInput } from './types';
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
} from 'lucide-react';

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

const App: React.FC = () => {
  const [result, setResult] = useState<LifeDestinyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [inputMode, setInputMode] = useState<'ai' | 'manual'>('ai');
  const [isEditing, setIsEditing] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Load API config and saved results on mount
  const [initialConfig, setInitialConfig] = useState<Partial<UserInput>>({});

  useEffect(() => {
    // 1. Restore API config
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

    // 2. Check URL Hash for shared data first
    const initFromUrlOrStorage = async () => {
      const hash = window.location.hash;
      let loadedFromHash = false;

      if (hash && (hash.startsWith('#data=') || hash.startsWith('#share='))) {
        const payload = hash.slice(hash.indexOf('=') + 1);
        if (payload) {
          const shared = await decompressData(payload);
          if (shared && shared.result && shared.result.chartData) {
            setResult(shared.result);
            if (shared.userName) setUserName(shared.userName);
            loadedFromHash = true;
            // Also persist to localStorage
            safeStorage.setItem('lifekline_saved_result', JSON.stringify(shared.result));
            if (shared.userName) {
              safeStorage.setItem('lifekline_user_name', shared.userName);
            }
          }
        }
      }

      // 3. Fallback to localStorage if no URL hash
      if (!loadedFromHash) {
        try {
          const savedResultStr = safeStorage.getItem('lifekline_saved_result');
          const savedUserName = safeStorage.getItem('lifekline_user_name');
          if (savedResultStr) {
            const parsed = JSON.parse(savedResultStr);
            if (parsed && parsed.chartData && parsed.analysis) {
              setResult(parsed);
              if (savedUserName) setUserName(savedUserName);
            }
          }
        } catch (e) {
          console.warn('Failed to parse saved result from localStorage:', e);
        }
      }
    };

    initFromUrlOrStorage();
  }, []);

  const handleBaziSubmit = async (data: UserInput) => {
    setIsLoading(true);
    setError(null);
    setUserName(data.name || '');

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
      const analysisResult = await generateLifeAnalysis(data);
      setResult(analysisResult);
      setIsEditing(false);

      // Persist to localStorage
      safeStorage.setItem('lifekline_saved_result', JSON.stringify(analysisResult));
      safeStorage.setItem('lifekline_user_name', data.name || '');
    } catch (err: any) {
      setError(err.message || '分析失敗，請檢查 API 金鑰或網路連線');
    } finally {
      setIsLoading(false);
    }
  };

  // 處理手動導入數據
  const handleDataImport = (data: LifeDestinyResult) => {
    setResult(data);
    setIsEditing(false);
    safeStorage.setItem('lifekline_saved_result', JSON.stringify(data));
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
      url.hash = `share=${compressedHash}`;
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
      setIsEditing(false);
      safeStorage.removeItem('lifekline_saved_result');
      safeStorage.removeItem('lifekline_user_name');
      // Remove hash from URL
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
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
      {/* 頂部導航欄 */}
      <header className="w-full bg-white border-b border-slate-200 py-4 sm:py-5 sticky top-0 z-50 no-print shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-950 text-white p-2.5 rounded-xl shadow-sm">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif-sc font-bold text-slate-950 tracking-wide">888人生K線</h1>
              <p className="text-sm text-slate-700 font-semibold uppercase tracking-wider">
                888 Life Destiny K-Line
              </p>
            </div>
          </div>
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
                  <span>已保存命盤數據（{userName || '現有結果'}）</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
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

              <div className="flex p-1.5 bg-slate-200 rounded-xl mb-6 w-72 sm:w-80 border border-slate-300">
                <button
                  onClick={() => setInputMode('ai')}
                  aria-pressed={inputMode === 'ai'}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm sm:text-base font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
                    inputMode === 'ai'
                      ? 'bg-white text-indigo-950 shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>AI 自動推演</span>
                </button>
                <button
                  onClick={() => setInputMode('manual')}
                  aria-pressed={inputMode === 'manual'}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm sm:text-base font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
                    inputMode === 'manual'
                      ? 'bg-white text-indigo-950 shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>手動導入</span>
                </button>
              </div>
            </div>

            {inputMode === 'ai' ? (
              <BaziForm onSubmit={handleBaziSubmit} isLoading={isLoading} initialData={initialConfig} />
            ) : (
              <div className="flex flex-col items-center gap-6 w-full">
                <ImportDataMode onDataImport={handleDataImport} />
                <p className="text-sm text-slate-700 font-medium">
                  粘貼 AI 返回的 JSON 數據以生成完整 K 線與百年詳批
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
                  title="生成並複製包含命盤數據的分享網址"
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold text-sm sm:text-base shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
                >
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>複製分享連結</span>
                </button>

                {/* 導出 JSON */}
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition font-bold text-sm sm:text-base shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                >
                  <FileDown className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>導出 JSON</span>
                </button>

                {/* 保存 PDF */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition font-bold text-sm sm:text-base shadow-sm focus-visible:ring-2 focus-visible:ring-slate-600 focus-visible:outline-none"
                >
                  <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>列印 / 保存 PDF</span>
                </button>

                {/* 保存 HTML 網頁 */}
                <button
                  type="button"
                  onClick={handleSaveHtml}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-700 text-white rounded-xl hover:bg-indigo-800 transition font-bold text-sm sm:text-base shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>保存離線網頁</span>
                </button>

                {/* 返回修改 (保留現有結果) */}
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
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

            {/* 走勢圖區塊 */}
            <section className="space-y-4 break-inside-avoid">
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
            <StreamYearsViewer data={result.chartData} />

            {/* 命盤總評與各項分析卡片（包含正統子平與紫微雙盤底蘊元盤） */}
            <section id="analysis-result-container">
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
                <span>用戶：{userName || '未命名'}</span>
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
