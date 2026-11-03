import React from 'react';
import { AnalysisData } from '../types';
import { ScrollText, Briefcase, Coins, Heart, Activity, Users, Star, Info, Brain, TrendingUp, Compass } from 'lucide-react';

interface AnalysisResultProps {
  analysis: AnalysisData;
}

const ScoreBar = ({ score }: { score: number }) => {
  // 自動檢測評分制度：如果 score > 10，認爲是百分制，需要轉換爲十分制
  const normalizedScore = score > 10 ? Math.round(score / 10) : score;

  // WCAG AAA-compliant high-contrast colors on white/light background
  let colorClass = 'bg-slate-400';
  if (normalizedScore >= 9) colorClass = 'bg-emerald-600';
  else if (normalizedScore >= 7) colorClass = 'bg-indigo-600';
  else if (normalizedScore >= 5) colorClass = 'bg-amber-600'; // 琥珀金，確保白底對比度
  else if (normalizedScore >= 3) colorClass = 'bg-orange-600';
  else colorClass = 'bg-rose-600';

  return (
    <div className="flex items-center gap-3 mt-3">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-1000 ease-out`}
          style={{ width: `${normalizedScore * 10}%` }}
        />
      </div>
      <span className="text-sm font-bold text-slate-900 min-w-[2.5rem] text-right font-mono">
        {normalizedScore} / 10
      </span>
    </div>
  );
};

const Card = ({ title, icon: Icon, content, score, colorClass, extraBadges }: any) => {
  let displayContent: React.ReactNode;

  if (React.isValidElement(content)) {
    displayContent = content;
  } else {
    let safeContent = '';
    if (typeof content === 'string') {
      safeContent = content;
    } else if (content === null || content === undefined) {
      safeContent = '';
    } else if (typeof content === 'object') {
      try {
        if (Array.isArray(content)) {
          safeContent = content.map((c: any) => String(c)).join('\n');
        } else {
          safeContent = JSON.stringify(content);
        }
      } catch {
        safeContent = String(content);
      }
    } else {
      safeContent = String(content);
    }

    displayContent = safeContent.replace(/\*\*/g, '');
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-shadow flex flex-col h-full relative overflow-hidden">
      <div className={`flex items-center justify-between mb-3 ${colorClass}`}>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 flex-shrink-0" />
          <h3 className="font-serif-sc font-bold text-lg text-slate-900">{title}</h3>
        </div>
        <Star className="w-4 h-4 text-slate-400" />
      </div>

      {/* Extra Badges for Crypto */}
      {extraBadges && (
        <div className="flex flex-wrap gap-2 mb-3">
          {extraBadges}
        </div>
      )}

      <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap flex-grow">
        {displayContent}
      </div>
      {typeof score === 'number' && (
        <div className="pt-4 mt-2 border-t border-slate-100">
          <div className="text-xs text-slate-600 font-bold mb-1 uppercase tracking-wider">Rating 評分</div>
          <ScoreBar score={score} />
        </div>
      )}
    </div>
  );
};

const AnalysisResult: React.FC<AnalysisResultProps> = ({ analysis }) => {
  return (
    <div className="w-full space-y-8 animate-fade-in-up">
      {/* Bazi Pillars */}
      <div className="flex justify-center gap-2 md:gap-8 bg-slate-950 text-amber-50 p-6 rounded-2xl shadow-lg border border-slate-800 overflow-x-auto">
        {(analysis.bazi || []).map((pillar, index) => {
          const labels = ['年柱', '月柱', '日柱', '時柱'];
          return (
            <div key={index} className="text-center min-w-[70px]">
              <div className="text-xs text-slate-300 mb-1 font-semibold">{labels[index]}</div>
              <div className="text-xl md:text-3xl font-serif-sc font-bold tracking-widest text-amber-100">
                {pillar}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary with Score */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-50/40 p-6 rounded-2xl border border-indigo-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h3 className="flex items-center gap-2 font-serif-sc font-bold text-xl text-indigo-950">
            <ScrollText className="w-5 h-5 text-indigo-600" />
            命理總評
          </h3>
          <div className="w-full md:w-1/3">
            <ScoreBar score={analysis.summaryScore} />
          </div>
        </div>
        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-normal text-sm md:text-base">
          {analysis.summary}
        </p>
      </div>

      {/* Grid for categorical analysis with Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Crypto Analysis */}
        <Card
          title="投資理財運勢"
          icon={TrendingUp}
          content={analysis.crypto}
          score={analysis.cryptoScore}
          colorClass="text-amber-700"
          extraBadges={
            <>
              <span className="px-2 py-1 bg-amber-100 text-amber-950 text-xs font-bold rounded-md border border-amber-300">
                🔥 暴富流年: {analysis.cryptoYear}
              </span>
              <span className="px-2 py-1 bg-indigo-100 text-indigo-950 text-xs font-bold rounded-md border border-indigo-300">
                🎯 推薦: {analysis.cryptoStyle}
              </span>
            </>
          }
        />

        <Card
          title="性格分析"
          icon={Brain}
          content={analysis.personality}
          score={analysis.personalityScore}
          colorClass="text-teal-700"
        />
        <Card
          title="事業行業"
          icon={Briefcase}
          content={analysis.industry}
          score={analysis.industryScore}
          colorClass="text-blue-700"
        />

        {/* Feng Shui Analysis */}
        <Card
          title="發展風水"
          icon={Compass}
          content={analysis.fengShui}
          score={analysis.fengShuiScore}
          colorClass="text-cyan-800"
        />

        <Card
          title="財富層級"
          icon={Coins}
          content={analysis.wealth}
          score={analysis.wealthScore}
          colorClass="text-amber-700"
        />
        <Card
          title="婚姻情感"
          icon={Heart}
          content={analysis.marriage}
          score={analysis.marriageScore}
          colorClass="text-pink-700"
        />
        <Card
          title="身體健康"
          icon={Activity}
          content={analysis.health}
          score={analysis.healthScore}
          colorClass="text-emerald-700"
        />
        <Card
          title="六親關係"
          icon={Users}
          content={analysis.family}
          score={analysis.familyScore}
          colorClass="text-purple-700"
        />

        {/* Static Score Explanation Card */}
        <Card
          title="評分講解"
          icon={Info}
          colorClass="text-slate-700"
          content={
            <div className="space-y-4">
              <ul className="space-y-2 font-mono text-xs md:text-sm">
                <li className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-800">0-2 分</span>
                  <span className="text-xs px-2.5 py-0.5 bg-rose-100 text-rose-950 border border-rose-300 rounded font-bold">
                    極差
                  </span>
                </li>
                <li className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-800">3-4 分</span>
                  <span className="text-xs px-2.5 py-0.5 bg-orange-100 text-orange-950 border border-orange-300 rounded font-bold">
                    差
                  </span>
                </li>
                <li className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-800">5-6 分</span>
                  <span className="text-xs px-2.5 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 rounded font-bold">
                    一般
                  </span>
                </li>
                <li className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-800">7-8 分</span>
                  <span className="text-xs px-2.5 py-0.5 bg-indigo-100 text-indigo-950 border border-indigo-300 rounded font-bold">
                    好
                  </span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">9-10 分</span>
                  <span className="text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded font-bold">
                    極好
                  </span>
                </li>
              </ul>
              <p className="text-xs text-slate-800 leading-relaxed border-t border-slate-200 pt-3 text-justify">
                注：命運還受環境和個人選擇影響，八字趨勢不能完全代表真實人生，命理學不是玄學，而是幫助我們在人生列車上做出更好選擇的哲學工具。一命二運三風水 四積陰德五讀書 六名七相八敬神 九遇貴人十養生。
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default AnalysisResult;
