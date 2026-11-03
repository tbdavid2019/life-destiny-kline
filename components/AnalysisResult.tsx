import React from 'react';
import { AnalysisData } from '../types';
import { BaziCalculationResult } from '../services/baziUtils';
import {
  ScrollText,
  Briefcase,
  Coins,
  Heart,
  Activity,
  Users,
  Info,
  Brain,
  TrendingUp,
  Compass,
  Sparkles,
  Flame,
} from 'lucide-react';

interface AnalysisResultProps {
  analysis: AnalysisData;
  baziMeta?: BaziCalculationResult;
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
    <div className="flex items-center gap-3.5 mt-3">
      <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-1000 ease-out`}
          style={{ width: `${normalizedScore * 10}%` }}
        />
      </div>
      <span className="text-base sm:text-lg font-extrabold text-slate-950 min-w-[3.5rem] text-right font-mono">
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
    <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-shadow flex flex-col h-full relative overflow-hidden break-inside-avoid">
      <div className={`flex items-center justify-between mb-4 ${colorClass}`}>
        <div className="flex items-center gap-2.5">
          <Icon className="w-6 h-6 flex-shrink-0" />
          <h3 className="font-serif-sc font-bold text-xl sm:text-2xl text-slate-950">{title}</h3>
        </div>
      </div>

      {/* Extra Badges for Crypto */}
      {extraBadges && (
        <div className="flex flex-wrap gap-2.5 mb-4">
          {extraBadges}
        </div>
      )}

      {/* 繁簡中文正文：加大到 16px/17px，行距放寬至 1.7-1.8 */}
      <div className="text-slate-900 text-base sm:text-[17px] leading-relaxed sm:leading-loose whitespace-pre-wrap flex-grow font-normal">
        {displayContent}
      </div>

      {typeof score === 'number' && (
        <div className="pt-4 mt-3 border-t border-slate-100">
          <div className="text-sm text-slate-700 font-bold mb-1.5 uppercase tracking-wider">Rating 評分</div>
          <ScoreBar score={score} />
        </div>
      )}
    </div>
  );
};

const AnalysisResult: React.FC<AnalysisResultProps> = ({ analysis, baziMeta }) => {
  return (
    <div className="w-full space-y-8 animate-fade-in-up">
      {/* 子平八字與紫微斗數 雙盤命理底蘊元盤 */}
      {baziMeta ? (
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-amber-50 p-6 md:p-8 rounded-3xl shadow-xl border border-amber-500/30 space-y-6">
          {/* 標題與核心格局徽章 */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-serif-sc font-bold text-amber-100 tracking-wide">
                  子平八字與紫微斗數 · 雙盤命理底蘊元盤
                </h3>
                <p className="text-xs sm:text-sm text-amber-300/80 font-medium mt-0.5">
                  天文真太陽時立盤 · 子平真詮十神旺衰 · 喜忌生剋 · 紫微十四主星四化
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3.5 py-1.5 bg-amber-400/20 text-amber-200 border border-amber-400/30 rounded-xl text-sm font-bold">
                日元：{baziMeta.dayMaster || '日主'} · {baziMeta.strength || '平'}
              </span>
              <span className="px-3.5 py-1.5 bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 rounded-xl text-sm font-bold">
                格局：{baziMeta.geJu || '正格'}
              </span>
              <span className="px-3.5 py-1.5 bg-purple-500/20 text-purple-200 border border-purple-500/30 rounded-xl text-sm font-bold">
                紫微：{baziMeta.ziweiBureau || '命盤'} · 命在【{baziMeta.ziweiMingGongBranch || '命宮'}】
              </span>
            </div>
          </div>

          {/* 四柱八字盤（十神、干支、納音） */}
          <div className="grid grid-cols-4 gap-3 md:gap-6 text-center">
            {[
              { label: '年柱 (根基)', val: baziMeta.yearPillar, god: baziMeta.tenGods?.year || '—', nayin: baziMeta.nayinPillars?.year || '—' },
              { label: '月柱 (提綱)', val: baziMeta.monthPillar, god: baziMeta.tenGods?.month || '—', nayin: baziMeta.nayinPillars?.month || '—' },
              { label: '日柱 (自身)', val: baziMeta.dayPillar, god: baziMeta.tenGods?.day || '日主', nayin: baziMeta.nayinPillars?.day || '—' },
              { label: '時柱 (歸宿)', val: baziMeta.hourPillar, god: baziMeta.tenGods?.hour || '—', nayin: baziMeta.nayinPillars?.hour || '—' },
            ].map((p) => (
              <div
                key={p.label}
                className="bg-white/5 backdrop-blur-md p-3 sm:p-5 rounded-2xl border border-amber-400/20 flex flex-col justify-between hover:border-amber-400/40 transition-colors shadow-inner"
              >
                <div className="text-xs sm:text-sm text-amber-300/80 font-bold mb-1">{p.label}</div>
                <div className="text-xs sm:text-sm text-indigo-300 font-extrabold tracking-wider">{p.god}</div>
                <div className="text-2xl sm:text-4xl font-serif-sc font-extrabold text-amber-100 my-2 tracking-widest">
                  {p.val}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-300 font-medium bg-white/10 py-1 px-1.5 rounded-lg">
                  {p.nayin}
                </div>
              </div>
            ))}
          </div>

          {/* 子平五行喜忌 & 紫微斗數主星印證 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm sm:text-base pt-2">
            {/* 子平喜忌分析卡片 */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-amber-500/20 space-y-3">
              <div className="font-bold text-amber-200 text-lg flex items-center gap-2 border-b border-white/10 pb-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <span>子平命理 · 旺衰喜忌與神煞</span>
              </div>
              <div className="space-y-2 text-slate-200 leading-relaxed">
                <div>
                  <span className="text-amber-400 font-bold">日主旺衰依據：</span>
                  <span>{baziMeta.strengthReason || '平穩'}</span>
                </div>
                <div>
                  <span className="text-amber-400 font-bold">格局註解：</span>
                  <span>{baziMeta.geJuDescription || '正格成形，氣象中和'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-emerald-400 font-bold">喜用神：</span>
                  <span className="px-2.5 py-0.5 bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold">
                    {baziMeta.usefulGod || '生身幫扶'} (五行喜：{(baziMeta.usefulElements || []).join('、') || '無'})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-rose-400 font-bold">忌仇神：</span>
                  <span className="px-2.5 py-0.5 bg-rose-950/70 text-rose-300 border border-rose-500/30 rounded-lg font-bold">
                    {baziMeta.tabooGod || '克泄交加'} (五行忌：{(baziMeta.tabooElements || []).join('、') || '無'})
                  </span>
                </div>
                {(baziMeta.shenshaList || []).length > 0 && (
                  <div className="pt-2">
                    <span className="text-amber-400 font-bold block mb-1.5">命中吉凶神煞：</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(baziMeta.shenshaList || []).map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-amber-400/10 text-amber-200 border border-amber-400/25 rounded-md text-xs font-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 紫微斗數三合命盤卡片 */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-indigo-500/20 space-y-3">
              <div className="font-bold text-indigo-200 text-lg flex items-center gap-2 border-b border-white/10 pb-2">
                <Compass className="w-5 h-5 text-indigo-400" />
                <span>紫微斗數 · 命宮星曜與生年四化</span>
              </div>
              <div className="space-y-2 text-slate-200 leading-relaxed">
                <div>
                  <span className="text-indigo-400 font-bold">命宮主星：</span>
                  <span className="text-amber-200 font-bold text-base">
                    {(baziMeta.ziweiMingGongStars || []).length > 0
                      ? baziMeta.ziweiMingGongStars.join('、')
                      : '命無正曜（借對宮星曜推算）'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div>
                    <span className="text-indigo-400 font-bold">五行局數：</span>
                    <span>{baziMeta.ziweiBureau || '—'}</span>
                  </div>
                  <div>
                    <span className="text-indigo-400 font-bold">身宮地支：</span>
                    <span>【{baziMeta.ziweiShenGongBranch || '—'}宮】</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div>
                    <span className="text-indigo-400 font-bold">命主星：</span>
                    <span>{baziMeta.ziweiMingZhu || '—'}</span>
                  </div>
                  <div>
                    <span className="text-indigo-400 font-bold">身主星：</span>
                    <span>{baziMeta.ziweiShenZhu || '—'}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <span className="text-indigo-400 font-bold block mb-1.5">生年四化流動：</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs sm:text-sm">
                    <div className="bg-emerald-950/60 border border-emerald-500/30 p-2 rounded-xl">
                      <div className="text-emerald-400 font-bold">化祿</div>
                      <div className="text-white font-black text-base mt-0.5">{baziMeta.ziweiSiHua?.lu || '—'}</div>
                    </div>
                    <div className="bg-blue-950/60 border border-blue-500/30 p-2 rounded-xl">
                      <div className="text-blue-400 font-bold">化權</div>
                      <div className="text-white font-black text-base mt-0.5">{baziMeta.ziweiSiHua?.quan || '—'}</div>
                    </div>
                    <div className="bg-purple-950/60 border border-purple-500/30 p-2 rounded-xl">
                      <div className="text-purple-400 font-bold">化科</div>
                      <div className="text-white font-black text-base mt-0.5">{baziMeta.ziweiSiHua?.ke || '—'}</div>
                    </div>
                    <div className="bg-rose-950/60 border border-rose-500/30 p-2 rounded-xl">
                      <div className="text-rose-400 font-bold">化忌</div>
                      <div className="text-white font-black text-base mt-0.5">{baziMeta.ziweiSiHua?.ji || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 兼顧舊版數據的八字四柱展示 */
        <div className="flex justify-center gap-4 md:gap-10 bg-slate-950 text-amber-50 p-6 md:p-8 rounded-2xl shadow-lg border border-slate-800 overflow-x-auto">
          {(analysis.bazi || []).map((pillar, index) => {
            const labels = ['年柱', '月柱', '日柱', '時柱'];
            return (
              <div key={index} className="text-center min-w-[80px] md:min-w-[100px]">
                <div className="text-sm md:text-base text-amber-200/90 mb-2 font-bold tracking-wider">{labels[index]}</div>
                <div className="text-2xl md:text-4xl font-serif-sc font-bold tracking-widest text-amber-100">
                  {pillar}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary with Score */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-50/40 p-6 sm:p-8 rounded-2xl border border-indigo-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <h3 className="flex items-center gap-2.5 font-serif-sc font-bold text-2xl sm:text-3xl text-indigo-950">
            <ScrollText className="w-6 h-6 text-indigo-600 flex-shrink-0" />
            <span>命理總評</span>
          </h3>
          <div className="w-full md:w-2/5">
            <ScoreBar score={analysis.summaryScore} />
          </div>
        </div>
        <p className="text-slate-900 leading-relaxed sm:leading-loose whitespace-pre-wrap font-normal text-base sm:text-lg">
          {analysis.summary}
        </p>
      </div>

      {/* Grid for categorical analysis with Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
        {/* Crypto Analysis */}
        <Card
          title="投資理財運勢"
          icon={TrendingUp}
          content={analysis.crypto}
          score={analysis.cryptoScore}
          colorClass="text-amber-700"
          extraBadges={
            <>
              <span className="px-3 py-1 bg-amber-100 text-amber-950 text-sm font-bold rounded-lg border border-amber-300">
                🔥 暴富流年: {analysis.cryptoYear}
              </span>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-950 text-sm font-bold rounded-lg border border-indigo-300">
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
              <ul className="space-y-2.5 font-mono text-sm sm:text-base">
                <li className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900">0 - 2 分</span>
                  <span className="text-sm px-3 py-1 bg-rose-100 text-rose-950 border border-rose-300 rounded-md font-bold">
                    極差
                  </span>
                </li>
                <li className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900">3 - 4 分</span>
                  <span className="text-sm px-3 py-1 bg-orange-100 text-orange-950 border border-orange-300 rounded-md font-bold">
                    差
                  </span>
                </li>
                <li className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900">5 - 6 分</span>
                  <span className="text-sm px-3 py-1 bg-amber-100 text-amber-950 border border-amber-300 rounded-md font-bold">
                    一般
                  </span>
                </li>
                <li className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900">7 - 8 分</span>
                  <span className="text-sm px-3 py-1 bg-indigo-100 text-indigo-950 border border-indigo-300 rounded-md font-bold">
                    好
                  </span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">9 - 10 分</span>
                  <span className="text-sm px-3 py-1 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-md font-bold">
                    極好
                  </span>
                </li>
              </ul>
              <p className="text-sm sm:text-base text-slate-800 leading-relaxed sm:leading-loose border-t border-slate-200 pt-3.5 text-justify">
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
