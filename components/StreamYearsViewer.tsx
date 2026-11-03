import React, { useState, useMemo } from 'react';
import { KLinePoint } from '../types';
import {
  Search,
  LayoutGrid,
  Table as TableIcon,
  Trophy,
  TrendingUp,
  TrendingDown,
  Filter,
  X,
  Compass,
  Calendar,
} from 'lucide-react';

interface StreamYearsViewerProps {
  data: KLinePoint[];
}

type AgePhase = 'all' | '1-20' | '21-40' | '41-60' | '61-80' | '81-100';
type TrendFilter = 'all' | 'up' | 'down';
type ViewMode = 'card' | 'table';

export const StreamYearsViewer: React.FC<StreamYearsViewerProps> = ({ data = [] }) => {
  const [selectedPhase, setSelectedPhase] = useState<AgePhase>('all');
  const [selectedDaYun, setSelectedDaYun] = useState<string>('all');
  const [trendFilter, setTrendFilter] = useState<TrendFilter>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // Identify Global Peak Year (Highest high score)
  const peakYearItem = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data.reduce((max, cur) => (cur.high > max.high ? cur : max), data[0]);
  }, [data]);

  // Extract all unique Da Yun values
  const availableDaYunList = useMemo(() => {
    const set = new Set<string>();
    data.forEach((item) => {
      const dy = typeof item.daYun === 'string' ? item.daYun.trim() : String(item.daYun || '').trim();
      if (dy) {
        set.add(dy);
      }
    });
    return Array.from(set);
  }, [data]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();

    return data.filter((item) => {
      // 1. Age Phase Filter
      if (selectedPhase !== 'all') {
        const [min, max] = selectedPhase.split('-').map(Number);
        if (item.age < min || item.age > max) return false;
      }

      // 2. Da Yun Filter
      if (selectedDaYun !== 'all') {
        const itemDaYun = typeof item.daYun === 'string' ? item.daYun.trim() : String(item.daYun || '').trim();
        if (itemDaYun !== selectedDaYun) return false;
      }

      // 3. Trend (吉/兇) Filter
      if (trendFilter === 'up' && item.close < item.open) return false;
      if (trendFilter === 'down' && item.close >= item.open) return false;

      // 4. Keyword Search (Year, GanZhi, DaYun, Reason)
      if (kw) {
        const yearStr = String(item.year || '');
        const ageStr = `${item.age}歲`;
        const ganZhi = String(item.ganZhi || '').toLowerCase();
        const daYun = String(item.daYun || '').toLowerCase();
        const reason = String(item.reason || '').toLowerCase();

        const match =
          yearStr.includes(kw) ||
          ageStr.includes(kw) ||
          ganZhi.includes(kw) ||
          daYun.includes(kw) ||
          reason.includes(kw);

        if (!match) return false;
      }

      return true;
    });
  }, [data, selectedPhase, selectedDaYun, trendFilter, searchKeyword]);

  const clearAllFilters = () => {
    setSelectedPhase('all');
    setSelectedDaYun('all');
    setTrendFilter('all');
    setSearchKeyword('');
  };

  const hasActiveFilters =
    selectedPhase !== 'all' ||
    selectedDaYun !== 'all' ||
    trendFilter !== 'all' ||
    Boolean(searchKeyword.trim());

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* 標題與視圖切換頂欄 */}
      <div className="p-5 md:p-6 border-b border-slate-200 bg-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-6 bg-indigo-600 rounded-full" aria-hidden="true" />
            <h3 className="text-xl md:text-2xl font-bold font-serif-sc text-slate-900 tracking-wide">
              百年流年詳批全覽 (1-100歲)
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-950 font-bold border border-indigo-200">
              共 100 歲次
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-700">
            按年代、大運、吉兇與關鍵字快速檢索一生每一年歲的運勢批斷與行事建議
          </p>
        </div>

        {/* 視圖切換器 (卡片 vs 表格) */}
        <div className="flex items-center gap-1 bg-slate-200/90 p-1 rounded-xl self-start md:self-auto border border-slate-300">
          <button
            type="button"
            onClick={() => setViewMode('card')}
            aria-pressed={viewMode === 'card'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
              viewMode === 'card'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>卡片詳批視圖</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
              viewMode === 'table'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>清爽表格視圖</span>
          </button>
        </div>
      </div>

      {/* 巔峰榮譽公告條 */}
      {peakYearItem && (
        <div className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 border-b border-amber-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm text-amber-950">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-bold">人生巔峰大運年份：</span>
            <span className="font-serif-sc font-bold text-amber-900 bg-white/90 px-2 py-0.5 rounded border border-amber-300 shadow-2xs">
              {peakYearItem.year} 年 ({peakYearItem.ganZhi}) · {peakYearItem.age} 歲
            </span>
            <span className="text-slate-700">
              大運：<strong className="text-indigo-900">{peakYearItem.daYun || '大運承接'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-700 font-medium">全盤最高運勢分：</span>
            <span className="font-mono font-extrabold text-base text-amber-950 bg-amber-200 px-2.5 py-0.5 rounded border border-amber-400">
              {peakYearItem.high} 分
            </span>
          </div>
        </div>
      )}

      {/* 篩選與搜尋操作區塊 (no-print) */}
      <div className="p-5 md:p-6 border-b border-slate-200 space-y-4 bg-white no-print">
        {/* 年代分頁按鈕 */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            按人生年代階段切換
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: '全部 (1-100歲)' },
              { id: '1-20', label: '童限少年 (1-20歲)' },
              { id: '21-40', label: '青年立業 (21-40歲)' },
              { id: '41-60', label: '壯年鼎盛 (41-60歲)' },
              { id: '61-80', label: '花甲得道 (61-80歲)' },
              { id: '81-100', label: '晚年福壽 (81-100歲)' },
            ].map((phase) => {
              const isSelected = selectedPhase === phase.id;
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setSelectedPhase(phase.id as AgePhase)}
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                  }`}
                >
                  {phase.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 次級篩選器：關鍵字搜尋 + 大運篩選 + 吉兇篩選 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 關鍵字即時搜尋 */}
          <div className="lg:col-span-2">
            <label
              htmlFor="stream-years-search"
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              搜尋流年 (年份/干支/大運/關鍵詞)
            </label>
            <div className="relative">
              <input
                id="stream-years-search"
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="例如：2025、乙巳、貴人、創業、暴富、考學..."
                className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-500 bg-white focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent outline-none transition"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" aria-hidden="true" />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  aria-label="清空搜尋關鍵字"
                  className="absolute right-2 top-2 p-1 text-slate-500 hover:text-slate-900 rounded focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 大運篩選 */}
          <div>
            <label
              htmlFor="stream-years-dayun-filter"
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              指定大運
            </label>
            <div className="relative">
              <select
                id="stream-years-dayun-filter"
                value={selectedDaYun}
                onChange={(e) => setSelectedDaYun(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent outline-none appearance-none cursor-pointer"
              >
                <option value="all">全部大運</option>
                {availableDaYunList.map((dy) => (
                  <option key={dy} value={dy}>
                    {dy}
                  </option>
                ))}
              </select>
              <Compass className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* 吉/兇篩選 */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              運勢漲跌 (吉/兇)
            </label>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setTrendFilter('all')}
                aria-pressed={trendFilter === 'all'}
                className={`flex-1 py-1 rounded text-xs font-bold transition ${
                  trendFilter === 'all'
                    ? 'bg-white text-slate-950 shadow-2xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => setTrendFilter('up')}
                aria-pressed={trendFilter === 'up'}
                className={`flex-1 py-1 rounded text-xs font-bold transition flex items-center justify-center gap-1 ${
                  trendFilter === 'up'
                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs'
                    : 'text-emerald-800 hover:text-emerald-950'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>吉運</span>
              </button>
              <button
                type="button"
                onClick={() => setTrendFilter('down')}
                aria-pressed={trendFilter === 'down'}
                className={`flex-1 py-1 rounded text-xs font-bold transition flex items-center justify-center gap-1 ${
                  trendFilter === 'down'
                    ? 'bg-rose-100 text-rose-950 border border-rose-300 shadow-2xs'
                    : 'text-rose-800 hover:text-rose-950'
                }`}
              >
                <TrendingDown className="w-3 h-3" />
                <span>兇運</span>
              </button>
            </div>
          </div>
        </div>

        {/* 篩選狀態統計與重置提示 */}
        <div className="flex items-center justify-between text-xs text-slate-700 pt-1">
          <div className="flex items-center gap-2">
            <span>
              符合條件：<strong className="text-slate-950 font-bold">{filteredData.length}</strong> / 100 歲
            </span>
            {hasActiveFilters && (
              <span className="text-[11px] text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                已套用自訂篩選
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-indigo-700 hover:text-indigo-950 font-bold underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
            >
              <X className="w-3.5 h-3.5" />
              重置所有篩選
            </button>
          )}
        </div>
      </div>

      {/* 主展示區塊 */}
      <div className="p-5 md:p-6">
        {filteredData.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Filter className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">未找到相符的流年紀錄</h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              嘗試更換年齡階段、清除大運或變更搜尋關鍵字。
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
            >
              清除所有篩選條件
            </button>
          </div>
        ) : viewMode === 'card' ? (
          /* ============================================================ */
          /* 1. 卡片詳批視圖 */
          /* ============================================================ */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredData.map((item) => {
              const isUp = item.close >= item.open;
              const isPeak = peakYearItem && item.age === peakYearItem.age;

              return (
                <article
                  key={item.age}
                  className={`rounded-xl border transition-all p-5 flex flex-col justify-between relative overflow-hidden ${
                    isPeak
                      ? 'border-amber-400 bg-gradient-to-b from-amber-50/70 via-white to-white shadow-md ring-2 ring-amber-300'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {/* 人生巔峰醒目標記 */}
                  {isPeak && (
                    <div className="mb-3 -mt-1 -mx-1 bg-amber-500 text-slate-950 px-3 py-1 rounded-md flex items-center justify-between text-xs font-extrabold shadow-sm">
                      <span className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-950" />
                        <span>🏆 人生巔峰年份</span>
                      </span>
                      <span className="bg-amber-100 text-amber-950 px-1.5 py-0.5 rounded text-[11px]">
                        分數 {item.high}
                      </span>
                    </div>
                  )}

                  <div>
                    {/* 卡片標題行 */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif-sc text-xl font-bold text-slate-950 tracking-tight">
                            {item.year} 年
                          </span>
                          <span className="font-serif-sc text-lg font-bold text-indigo-950">
                            {item.ganZhi}
                          </span>
                          <span className="font-mono text-sm font-bold text-slate-700">
                            ({item.age} 歲)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-950 font-bold border border-indigo-200">
                            {item.daYun ? `${item.daYun}` : '大運交界'}
                          </span>
                        </div>
                      </div>

                      {/* 吉 / 兇 標籤 (高對比度 WCAG AAA) */}
                      <span
                        className={`text-xs px-2.5 py-1 rounded-md font-extrabold border flex items-center gap-1 ${
                          isUp
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                            : 'bg-rose-100 text-rose-950 border-rose-300'
                        }`}
                      >
                        {isUp ? (
                          <>
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-800" />
                            <span>吉運 (漲)</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-3.5 h-3.5 text-rose-800" />
                            <span>兇運 (跌)</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* K 線四數值矩陣 */}
                    <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center mb-3">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-600 uppercase">開盤</span>
                        <span className="font-mono text-xs font-bold text-slate-900">{item.open}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-600 uppercase">收盤</span>
                        <span className="font-mono text-xs font-bold text-slate-900">{item.close}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-600 uppercase">最高</span>
                        <span className="font-mono text-xs font-bold text-slate-900">{item.high}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-600 uppercase">最低</span>
                        <span className="font-mono text-xs font-bold text-slate-900">{item.low}</span>
                      </div>
                    </div>

                    {/* 運勢批斷與詳析 */}
                    <div className="text-xs md:text-sm text-slate-800 leading-relaxed text-justify mb-4">
                      {item.reason}
                    </div>
                  </div>

                  {/* 底部評分進度條 */}
                  <div className="pt-3 border-t border-slate-100 mt-auto">
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-700">流年綜合運勢評分</span>
                      <span className="font-mono text-slate-950 font-extrabold text-sm">
                        {item.score} / 100
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          item.score >= 80
                            ? 'bg-emerald-600'
                            : item.score >= 65
                            ? 'bg-indigo-600'
                            : item.score >= 50
                            ? 'bg-amber-600'
                            : 'bg-rose-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* ============================================================ */
          /* 2. 清爽全覽表格視圖 */
          /* ============================================================ */
          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 uppercase tracking-wider">
                  <th className="p-3 border-r border-slate-200 text-center w-16">年齡</th>
                  <th className="p-3 border-r border-slate-200 text-center w-28">流年</th>
                  <th className="p-3 border-r border-slate-200 text-center w-28">大運</th>
                  <th className="p-3 border-r border-slate-200 text-center w-20">走勢</th>
                  <th className="p-3 border-r border-slate-200 text-center w-20">綜合分</th>
                  <th className="p-3">流年運勢批斷與行事建議</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => {
                  const isUp = item.close >= item.open;
                  const isPeak = peakYearItem && item.age === peakYearItem.age;

                  return (
                    <tr
                      key={item.age}
                      className={`border-b border-slate-200 transition-colors ${
                        isPeak
                          ? 'bg-amber-50/80 hover:bg-amber-100/60 font-medium'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* 年齡 */}
                      <td className="p-3 border-r border-slate-200 text-center font-mono font-bold text-slate-900">
                        {item.age} 歲
                      </td>

                      {/* 流年年份與干支 */}
                      <td className="p-3 border-r border-slate-200 text-center">
                        <div className="font-bold text-slate-950 font-serif-sc">
                          {item.year} 年
                        </div>
                        <div className="text-xs font-bold text-indigo-950">
                          {item.ganZhi}
                        </div>
                        {isPeak && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-amber-950 bg-amber-200 px-1 py-0.2 rounded mt-0.5">
                            <Trophy className="w-2.5 h-2.5" /> 巔峰
                          </span>
                        )}
                      </td>

                      {/* 大運 */}
                      <td className="p-3 border-r border-slate-200 text-center font-medium text-slate-800">
                        {item.daYun || '-'}
                      </td>

                      {/* 走勢標籤 */}
                      <td className="p-3 border-r border-slate-200 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-extrabold border ${
                            isUp
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                              : 'bg-rose-100 text-rose-950 border-rose-300'
                          }`}
                        >
                          {isUp ? '吉 ▲' : '兇 ▼'}
                        </span>
                      </td>

                      {/* 評分 */}
                      <td className="p-3 border-r border-slate-200 text-center font-mono font-extrabold text-slate-950">
                        {item.score}
                      </td>

                      {/* 批斷內容 */}
                      <td className="p-3 text-slate-800 leading-relaxed text-justify">
                        {item.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 底部列印說明提示 (no-print) */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700 no-print">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>目前顯示 {filteredData.length} 筆流年詳批</span>
        </div>
        <p className="text-slate-600">
          💡 列印報告或保存 PDF 時，系統將自動為您輸出完整無省略的 1-100 歲全表。
        </p>
      </div>
    </section>
  );
};

export default StreamYearsViewer;
