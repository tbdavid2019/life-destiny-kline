import React from 'react';
import { Gender } from '../types';
import { BaziCalculationResult, STEM_ELEMENT, BRANCH_ELEMENT } from '../services/baziUtils';
import {
  User,
  Calendar,
  MapPin,
  SunMedium,
  Compass,
} from 'lucide-react';

export interface BirthProfileCardProps {
  userName?: string;
  gender?: Gender;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  baziMeta?: BaziCalculationResult;
  startAge?: string | number;
  firstDaYun?: string;
  analysisBazi?: string[];
}

// 五行對應的語意標籤配色 (在深色卡片與淺色列印皆高清晰)
const ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string; printText: string }> = {
  金: { bg: 'bg-amber-100/15', text: 'text-amber-200', border: 'border-amber-400/30', printText: 'print:text-amber-900' },
  木: { bg: 'bg-emerald-100/15', text: 'text-emerald-300', border: 'border-emerald-400/30', printText: 'print:text-emerald-900' },
  水: { bg: 'bg-sky-100/15', text: 'text-sky-300', border: 'border-sky-400/30', printText: 'print:text-sky-900' },
  火: { bg: 'bg-rose-100/15', text: 'text-rose-300', border: 'border-rose-400/30', printText: 'print:text-rose-900' },
  土: { bg: 'bg-yellow-100/15', text: 'text-yellow-200', border: 'border-yellow-400/30', printText: 'print:text-yellow-900' },
};

export const BirthProfileCard: React.FC<BirthProfileCardProps> = ({
  userName,
  gender,
  birthDate,
  birthTime,
  birthPlace,
  baziMeta,
  startAge,
  firstDaYun,
  analysisBazi,
}) => {
  // 1. 姓名清洗（確保徹底消滅 demo 殘留）
  const cleanName =
    userName && !userName.includes('範例演示用戶') && !userName.includes('演示用戶')
      ? userName.trim()
      : '';
  const displayName = cleanName || '未具名命造';

  // 2. 性別推導
  const isFemale = gender === Gender.FEMALE;
  const genderLabel = isFemale ? '坤造 (女)' : '乾造 (男)';

  // 3. 原始八字四柱干支與十神納音
  const yearPillar = baziMeta?.yearPillar || (analysisBazi && analysisBazi[0]) || '—';
  const monthPillar = baziMeta?.monthPillar || (analysisBazi && analysisBazi[1]) || '—';
  const dayPillar = baziMeta?.dayPillar || (analysisBazi && analysisBazi[2]) || '—';
  const hourPillar = baziMeta?.hourPillar || (analysisBazi && analysisBazi[3]) || '—';

  const pillars = [
    {
      title: '年柱',
      scope: '根基 · 祖業',
      val: yearPillar,
      god: baziMeta?.tenGods?.year || '—',
      nayin: baziMeta?.nayinPillars?.year || '—',
    },
    {
      title: '月柱',
      scope: '提綱 · 事業',
      val: monthPillar,
      god: baziMeta?.tenGods?.month || '—',
      nayin: baziMeta?.nayinPillars?.month || '—',
    },
    {
      title: '日柱',
      scope: '日主 · 自身',
      val: dayPillar,
      god: baziMeta?.tenGods?.day || '日元自身',
      nayin: baziMeta?.nayinPillars?.day || '—',
    },
    {
      title: '時柱',
      scope: '歸宿 · 晚景',
      val: hourPillar,
      god: baziMeta?.tenGods?.hour || '—',
      nayin: baziMeta?.nayinPillars?.hour || '—',
    },
  ];

  // 4. 出生時間與地點資訊
  const solarInfo = baziMeta?.solarTimeInfo;
  const displayBirthDate = solarInfo?.originalDate || birthDate || '';
  const displayBirthTime = solarInfo?.originalTime || birthTime || '';
  const placeName = solarInfo?.place || birthPlace || '臺北市';
  const lngText =
    solarInfo?.location?.lng !== undefined
      ? solarInfo.location.lng >= 0
        ? `${solarInfo.location.lng}°E`
        : `${Math.abs(solarInfo.location.lng)}°W`
      : '121.57°E';

  // 起運年齡與第一步大運
  const effectiveStartAge = baziMeta?.startAge || startAge || '—';
  const effectiveFirstDaYun = baziMeta?.firstDaYun || firstDaYun || '—';

  // 5. 日元五行與旺衰
  const dayMaster = baziMeta?.dayMaster || (dayPillar !== '—' ? dayPillar.charAt(0) : '日元');
  const strength = baziMeta?.strength;
  const strengthReason = baziMeta?.strengthReason;
  const geJu = baziMeta?.geJu || '八字格局';
  const usefulGod = baziMeta?.usefulGod;
  const tabooGod = baziMeta?.tabooGod;
  const usefulElements = baziMeta?.usefulElements || [];
  const tabooElements = baziMeta?.tabooElements || [];

  return (
    <section
      id="birth-profile-card"
      className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-500/30 relative overflow-hidden break-inside-avoid scroll-mt-24 print:bg-white print:text-slate-950 print:border-slate-300 print:shadow-none print:p-6"
    >
      {/* 頂部裝飾背景光暈 (列印隱藏) */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none no-print" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none no-print" />

      {/* 第一層：命造檔案 Header 與基本資訊 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-white/10 pb-6 print:border-slate-200">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 flex-shrink-0 shadow-inner print:border-slate-400 print:text-slate-900 print:bg-slate-100">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-extrabold print:text-amber-800">
                命造檔案與原始生辰
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isFemale
                    ? 'bg-pink-950/80 text-pink-200 border-pink-500/40 print:bg-pink-50 print:text-pink-900 print:border-pink-300'
                    : 'bg-sky-950/80 text-sky-200 border-sky-500/40 print:bg-sky-50 print:text-sky-900 print:border-sky-300'
                }`}
              >
                {genderLabel}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 print:bg-amber-50 print:text-amber-900 print:border-amber-300">
                {effectiveStartAge} 歲起運 · 第一步【{effectiveFirstDaYun}】
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif-sc font-bold text-amber-100 mt-1 tracking-tight print:text-slate-950">
              {displayName}
            </h2>
          </div>
        </div>

        {/* 檔案生辰指標小卡片（公曆、地點、真太陽時校正） */}
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          {displayBirthDate && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 print:bg-slate-100 print:text-slate-900 print:border-slate-200">
              <Calendar className="w-4 h-4 text-amber-400 print:text-slate-700 flex-shrink-0" />
              <span className="font-mono font-medium">
                公曆 {displayBirthDate} {displayBirthTime}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 print:bg-slate-100 print:text-slate-900 print:border-slate-200">
            <MapPin className="w-4 h-4 text-indigo-400 print:text-slate-700 flex-shrink-0" />
            <span>
              {placeName} <strong className="font-mono text-amber-200 print:text-slate-900">({lngText})</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 第二層：天文真太陽時立盤校正結果條 */}
      {solarInfo && (
        <div className="mt-5 p-3.5 sm:p-4 rounded-2xl bg-indigo-950/60 border border-indigo-400/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs sm:text-sm print:bg-slate-50 print:border-slate-200 print:text-slate-900">
          <div className="flex items-center gap-2.5">
            <SunMedium className="w-4 h-4 text-amber-400 flex-shrink-0 print:text-amber-700" />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-300 print:text-slate-700">天文立盤：</span>
              <span>
                標準時 <strong className="font-mono text-slate-100 print:text-slate-950">{solarInfo.originalTime}</strong>
              </span>
              <span className="text-amber-400 font-bold">➔</span>
              <span>
                校正至真太陽時{' '}
                <strong className="font-mono text-emerald-300 print:text-emerald-800 font-bold">
                  {solarInfo.solarTime}
                </strong>
              </span>
              <span className="text-amber-300 font-bold px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/30 print:bg-amber-100 print:text-amber-900 print:border-amber-300 text-xs">
                【{solarInfo.shichenBranch}時立盤】
              </span>
              {solarInfo.ziHourType === 'early_zi' && (
                <span className="text-sky-300 print:text-sky-900 font-bold text-xs">(早子時)</span>
              )}
              {solarInfo.ziHourType === 'late_zi' && (
                <span className="text-purple-300 print:text-purple-900 font-bold text-xs">(夜子時 · 子正換日)</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 print:text-slate-700">
            <span>
              經度差：
              <strong className="font-mono text-amber-200 print:text-slate-900">
                {solarInfo.offsets.lngOffsetMinutes >= 0 ? '+' : ''}
                {solarInfo.offsets.lngOffsetMinutes.toFixed(1)}m
              </strong>
            </span>
            <span>·</span>
            <span>
              均時差：
              <strong className="font-mono text-amber-200 print:text-slate-900">
                {solarInfo.offsets.eotMinutes >= 0 ? '+' : ''}
                {solarInfo.offsets.eotMinutes.toFixed(1)}m
              </strong>
            </span>
            <span>·</span>
            <span className="text-emerald-300 print:text-emerald-800 font-bold">
              合計校正：
              <strong className="font-mono">
                {solarInfo.offsets.totalOffsetMinutes >= 0 ? '+' : ''}
                {solarInfo.offsets.totalOffsetMinutes.toFixed(1)}m
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* 第三層：原始八字四柱排盤（十神、干支巨字、納音五行） */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-300 print:text-amber-900">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>原始命造四柱八字排盤</span>
          </div>
          <span className="text-xs text-slate-400 print:text-slate-600 font-medium">
            (子平真詮提綱主神 · 天文真太陽時立盤)
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 text-center">
          {pillars.map((p) => {
            const stem = p.val !== '—' ? p.val.charAt(0) : '';
            const branch = p.val !== '—' ? p.val.charAt(1) : '';
            const stemElem = STEM_ELEMENT[stem] || '';
            const branchElem = BRANCH_ELEMENT[branch] || '';

            return (
              <div
                key={p.title}
                className="bg-white/[0.04] backdrop-blur-md p-3 sm:p-5 rounded-2xl border border-amber-400/20 flex flex-col justify-between hover:border-amber-400/40 transition-colors shadow-inner print:bg-white print:border-slate-300 print:shadow-none"
              >
                <div>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="text-xs sm:text-sm font-bold text-amber-300/90 print:text-slate-950">
                      {p.title}
                    </span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-400 print:text-slate-600 font-medium mb-1.5 hidden sm:block">
                    {p.scope}
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-indigo-300 bg-indigo-950/60 py-0.5 px-2 rounded-md border border-indigo-500/30 inline-block print:bg-slate-100 print:text-indigo-950 print:border-slate-300">
                    {p.god}
                  </div>
                </div>

                {/* 巨型干支書法字 */}
                <div className="my-2 sm:my-3">
                  <div className="text-2xl sm:text-4xl md:text-5xl font-serif-sc font-black text-amber-100 tracking-widest print:text-slate-950 flex items-center justify-center gap-1">
                    <span>{stem || p.val}</span>
                    {branch && <span>{branch}</span>}
                  </div>
                  {(stemElem || branchElem) && (
                    <div className="flex items-center justify-center gap-1.5 mt-1 text-[10px] sm:text-xs font-bold">
                      {stemElem && (
                        <span
                          className={`px-1.5 py-0.5 rounded border ${
                            ELEMENT_COLORS[stemElem]?.bg || 'bg-white/10'
                          } ${ELEMENT_COLORS[stemElem]?.text || 'text-slate-300'} ${
                            ELEMENT_COLORS[stemElem]?.border || 'border-white/10'
                          } ${ELEMENT_COLORS[stemElem]?.printText || 'print:text-slate-900'}`}
                        >
                          {stemElem}
                        </span>
                      )}
                      {branchElem && (
                        <span
                          className={`px-1.5 py-0.5 rounded border ${
                            ELEMENT_COLORS[branchElem]?.bg || 'bg-white/10'
                          } ${ELEMENT_COLORS[branchElem]?.text || 'text-slate-300'} ${
                            ELEMENT_COLORS[branchElem]?.border || 'border-white/10'
                          } ${ELEMENT_COLORS[branchElem]?.printText || 'print:text-slate-900'}`}
                        >
                          {branchElem}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 納音五行標籤 */}
                <div className="text-[11px] sm:text-xs text-slate-200 font-medium bg-white/10 py-1 px-1.5 rounded-lg border border-white/5 print:bg-slate-100 print:text-slate-800 print:border-slate-300 truncate">
                  {p.nayin}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 第四層：核心命理綱領（日元五行旺衰、格局、喜用忌神） */}
      <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3.5 print:border-slate-200">
        {/* 日元與旺衰 */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 print:bg-slate-50 print:border-slate-200">
          <div className="text-xs text-amber-400 font-bold mb-1 print:text-amber-900">
            日主元神與旺衰
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-bold font-serif-sc text-amber-100 print:text-slate-950">
              {dayMaster}
            </span>
            {strength && (
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-extrabold border ${
                  strength === '身旺'
                    ? 'bg-emerald-950 text-emerald-200 border-emerald-500/40 print:bg-emerald-100 print:text-emerald-900'
                    : 'bg-rose-950 text-rose-200 border-rose-500/40 print:bg-rose-100 print:text-rose-900'
                }`}
              >
                {strength}
              </span>
            )}
          </div>
          {strengthReason && (
            <p className="text-xs text-slate-300 mt-1.5 line-clamp-2 print:text-slate-700">
              {strengthReason}
            </p>
          )}
        </div>

        {/* 格局 */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 print:bg-slate-50 print:border-slate-200">
          <div className="text-xs text-indigo-400 font-bold mb-1 print:text-indigo-900">
            命理格局宗派
          </div>
          <div className="text-lg sm:text-xl font-bold font-serif-sc text-indigo-100 print:text-slate-950">
            {geJu}
          </div>
          {baziMeta?.geJuDescription && (
            <p className="text-xs text-slate-300 mt-1.5 line-clamp-2 print:text-slate-700">
              {baziMeta.geJuDescription}
            </p>
          )}
        </div>

        {/* 五行喜忌 */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 print:bg-slate-50 print:border-slate-200">
          <div className="text-xs text-emerald-400 font-bold mb-1 print:text-emerald-900">
            五行喜忌平衡
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-300 font-bold print:text-emerald-800">喜用神：</span>
              <span className="font-medium text-slate-100 print:text-slate-950">
                {usefulGod || (usefulElements.length ? usefulElements.join('、') : '生身幫扶')}
                {usefulElements.length > 0 && ` (喜${usefulElements.join('、')})`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-rose-300 font-bold print:text-rose-800">忌仇神：</span>
              <span className="font-medium text-slate-100 print:text-slate-950">
                {tabooGod || (tabooElements.length ? tabooElements.join('、') : '克泄消耗')}
                {tabooElements.length > 0 && ` (忌${tabooElements.join('、')})`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BirthProfileCard;
