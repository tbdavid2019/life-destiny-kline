import React, { useState } from 'react';
import { LifeDestinyResult } from '../types';
import { CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { repairAndParseJson } from '../services/geminiService';

interface ImportDataModeProps {
  onDataImport: (data: LifeDestinyResult) => void;
}

const ImportDataMode: React.FC<ImportDataModeProps> = ({ onDataImport }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 處理粘貼內容導入
  const handleImport = () => {
    setError(null);

    if (!jsonInput.trim()) {
      setError('請粘貼 AI 返回的 JSON 數據');
      return;
    }

    try {
      const data = repairAndParseJson(jsonInput);

      // 校驗數據結構與完整性
      const points = data.chartPoints || data.chartData;
      if (!points || !Array.isArray(points)) {
        throw new Error('數據格式不正確：缺少 chartPoints 或 chartData 數組');
      }

      if (points.length < 10) {
        throw new Error('數據不完整：年份點數量太少（至少需要 10 個年份點）');
      }

      if (points.length > 200) {
        throw new Error('數據量過大：年份點數量不能超過 200 個');
      }

      // 深度校驗數值合法性，防止異常數據導致圖表繪製崩潰
      const sanitizedChartPoints = points.map((item: any, idx: number) => {
        if (!item || typeof item !== 'object') {
          throw new Error(`第 ${idx + 1} 個數據點格式無效`);
        }
        const open = Number(item.open);
        const close = Number(item.close);
        const high = Number(item.high);
        const low = Number(item.low);
        const score = Number(item.score);

        if (
          !Number.isFinite(open) ||
          !Number.isFinite(close) ||
          !Number.isFinite(high) ||
          !Number.isFinite(low) ||
          !Number.isFinite(score)
        ) {
          throw new Error(
            `第 ${idx + 1} 個數據點包含無效數值（open/close/high/low/score 必須為有效數字）`
          );
        }

        return {
          age: Number(item.age) || idx + 1,
          year: Number(item.year) || 2024 + idx,
          ganZhi: String(item.ganZhi || ''),
          daYun: String(item.daYun || ''),
          open,
          close,
          high,
          low,
          score,
          reason: String(item.reason || ''),
        };
      });

      // 轉換爲應用所需格式
      const analysisSource = data.analysis || data;
      const result: LifeDestinyResult = {
        chartData: sanitizedChartPoints,
        analysis: {
          bazi: analysisSource.bazi || [],
          summary: analysisSource.summary || '無摘要',
          summaryScore: analysisSource.summaryScore || 5,
          personality: analysisSource.personality || '無性格分析',
          personalityScore: analysisSource.personalityScore || 5,
          industry: analysisSource.industry || '無',
          industryScore: analysisSource.industryScore || 5,
          fengShui: analysisSource.fengShui || '建議多親近自然，保持心境平和。',
          fengShuiScore: analysisSource.fengShuiScore || 5,
          wealth: analysisSource.wealth || '無',
          wealthScore: analysisSource.wealthScore || 5,
          marriage: analysisSource.marriage || '無',
          marriageScore: analysisSource.marriageScore || 5,
          health: analysisSource.health || '無',
          healthScore: analysisSource.healthScore || 5,
          family: analysisSource.family || '無',
          familyScore: analysisSource.familyScore || 5,
          crypto: analysisSource.crypto || '暫無交易分析',
          cryptoScore: analysisSource.cryptoScore || 5,
          cryptoYear: analysisSource.cryptoYear || '待定',
          cryptoStyle: analysisSource.cryptoStyle || '現貨定投',
        },
      };

      onDataImport(result);
    } catch (err: any) {
      setError(`解析失敗：${err.message}`);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200">
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold font-serif-sc text-slate-900 mb-2">手動導入 JSON</h2>
        <p className="text-slate-700 text-sm sm:text-base font-medium">粘貼 AI 生成的分析數據以繪製圖表與全量流年詳批</p>
      </div>

      <div className="space-y-5">
        <div className="relative">
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="粘貼 JSON 數據..."
            className={`w-full h-64 p-4 border rounded-xl font-mono text-sm sm:text-base text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none transition-all leading-relaxed ${
              error ? 'border-rose-300 bg-rose-50/50' : 'border-slate-300 bg-slate-50'
            }`}
          />
          <div className="absolute top-3.5 right-3.5 pointer-events-none">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 text-rose-950 rounded-xl border border-rose-200 text-sm sm:text-base animate-shake font-bold">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-700" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleImport}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-base sm:text-lg transition-all shadow-md flex items-center justify-center gap-2.5 group focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
        >
          <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>立即導入並生成圖表</span>
        </button>
      </div>
    </div>
  );
};

export default ImportDataMode;
