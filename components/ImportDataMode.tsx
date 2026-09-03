import React, { useState } from 'react';
import { LifeDestinyResult } from '../types';
import { CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { extractJson } from '../services/geminiService';

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
            const data = JSON.parse(extractJson(jsonInput));

            // 校驗數據結構與完整性
            if (!data.chartPoints || !Array.isArray(data.chartPoints)) {
                throw new Error('數據格式不正確：缺少 chartPoints 數組');
            }

            if (data.chartPoints.length < 10) {
                throw new Error('數據不完整：chartPoints 數量太少（至少需要 10 個年份點）');
            }

            if (data.chartPoints.length > 200) {
                throw new Error('數據量過大：chartPoints 數量不能超過 200 個年份點');
            }

            // 深度校驗數值合法性，防止異常數據導致圖表繪製崩潰
            const sanitizedChartPoints = data.chartPoints.map((item: any, idx: number) => {
                if (!item || typeof item !== 'object') {
                    throw new Error(`第 ${idx + 1} 個數據點格式無效`);
                }
                const open = Number(item.open);
                const close = Number(item.close);
                const high = Number(item.high);
                const low = Number(item.low);
                const score = Number(item.score);

                if (!Number.isFinite(open) || !Number.isFinite(close) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(score)) {
                    throw new Error(`第 ${idx + 1} 個數據點包含無效數值（open/close/high/low/score 必須為有效數字）`);
                }

                return {
                    age: Number(item.age) || (idx + 1),
                    year: Number(item.year) || (2024 + idx),
                    ganZhi: String(item.ganZhi || ''),
                    daYun: String(item.daYun || ''),
                    open,
                    close,
                    high,
                    low,
                    score,
                    reason: String(item.reason || '')
                };
            });

            // 轉換爲應用所需格式
            const result: LifeDestinyResult = {
                chartData: sanitizedChartPoints,
                analysis: {
                    bazi: data.bazi || [],
                    summary: data.summary || "無摘要",
                    summaryScore: data.summaryScore || 5,
                    personality: data.personality || "無性格分析",
                    personalityScore: data.personalityScore || 5,
                    industry: data.industry || "無",
                    industryScore: data.industryScore || 5,
                    fengShui: data.fengShui || "建議多親近自然，保持心境平和。",
                    fengShuiScore: data.fengShuiScore || 5,
                    wealth: data.wealth || "無",
                    wealthScore: data.wealthScore || 5,
                    marriage: data.marriage || "無",
                    marriageScore: data.marriageScore || 5,
                    health: data.health || "無",
                    healthScore: data.healthScore || 5,
                    family: data.family || "無",
                    familyScore: data.familyScore || 5,
                    crypto: data.crypto || "暫無交易分析",
                    cryptoScore: data.cryptoScore || 5,
                    cryptoYear: data.cryptoYear || "待定",
                    cryptoStyle: data.cryptoStyle || "現貨定投",
                },
            };

            onDataImport(result);
        } catch (err: any) {
            setError(`解析失敗：${err.message}`);
        }
    };

    return (
        <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold font-serif-sc text-gray-800 mb-2">手動導入 JSON</h2>
                <p className="text-gray-500 text-sm">粘貼 AI 生成的分析數據以繪製圖表</p>
            </div>

            <div className="space-y-4">
                <div className="relative">
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder='粘貼 JSON 數據...'
                        className={`w-full h-64 p-4 border rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                    />
                    <div className="absolute top-3 right-3">
                         <Sparkles className="w-5 h-5 text-indigo-300" />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm animate-shake">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="font-bold">{error}</span>
                    </div>
                )}

                <button
                    onClick={handleImport}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group"
                >
                    <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    立即導入並生成圖表
                </button>
            </div>
        </div>
    );
};

export default ImportDataMode;
