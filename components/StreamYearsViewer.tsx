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
  ChevronDown,
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

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden my-8">
      {/* 標題與視圖切換頂欄 */}
      <div className="p-6 sm:p-8 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="w-2 h-7 bg-indigo-700 rounded-full" aria-hidden="true" />
            <h3 className="text-2xl sm:text-3xl font-bold font-serif-sc text-slate-950 tracking-tight">
              1-100 歲百年流年詳批全覽
            </h3>
          </div>
          <p className="text-base text-slate-700 font-medium ml-5">
            逐年解析大運干支、吉兇走向與行事關鍵指南（共 {data.length} 年）
          </p>
        </div>

        {/* 卡片模式 / 表格模式 切換按鈕 */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-100 p-1.5 rounded-xl border border-slate-200 no-print">
          <button
            type="button"
            onClick={() => setViewMode('card')}
            aria-pressed={viewMode === 'card'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm sm:text-base font-bold transition focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
              viewMode === 'card'
                ? 'bg-white text-indigo-950 shadow-sm border border-slate-200'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>卡片詳析視圖</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm sm:text-base font-bold transition focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
              viewMode === 'table'
                ? 'bg-white text-indigo-950 shadow-sm border border-slate-200'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>清爽表格視圖</span>
          </button>
        </div>
      </div>

      {/* 人生巔峰榮譽公告條 */}
      {peakYearItem && (
        <div className="bg-amber-100/90 border-b border-amber-300 px-6 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 text-amber-950">
          <div className="flex flex-wrap items-center gap-3 text-base">
            <span className="flex items-center gap-1.5 font-bold">
              <Trophy className="w-5 h-5 text-amber-800" />
              <span>人生巔峰年份鎖定：</span>
            </span>
            <span className="font-extrabold text-slate-950 font-serif-sc text-lg">
              {peakYearItem.year} 年 ({peakYearItem.ganZhi}) · {peakYearItem.age} 歲
            </span>
            <span className="text-slate-800 font-medium">
              所在大運：<strong className="text-indigo-950 font-bold">{peakYearItem.daYun || '大運承接'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-800 font-bold text-sm sm:text-base">全盤最高運勢分：</span>
            <span className="font-mono font-black text-lg text-amber-950 bg-amber-300 px-3 py-0.5 rounded-lg border border-amber-400">
              {peakYearItem.high} 分
            </span>
          </div>
        </div>
      )}

      {/* 篩選與搜尋操作區塊 (大字體、自然換行、無任何省略截斷) */}
      <div className="p-6 sm:p-8 border-b border-slate-200 space-y-5 bg-white no-print">
        {/* 年代分頁按鈕 */}
        <div>
          <label className="block text-base font-bold text-slate-900 mb-2.5">
            按人生年代階段切換
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: '全部流年 (1-100歲)' },
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
                  className={`px-4 py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all border focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none ${
                    isSelected
                      ? 'bg-indigo-700 text-white border-indigo-800 shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200'
                  }`}
                >
                  {phase.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 次級篩選器：關鍵字搜尋 + 大運篩選 + 吉兇篩選 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* 關鍵字即時搜尋 */}
          <div className="lg:col-span-2">
            <label
              htmlFor="stream-years-search"
              className="block text-sm sm:text-base font-bold text-slate-900 mb-1.5"
            >
              搜尋流年 (年份/干支/大運/關鍵詞)
            </label>
            <div className="relative">
              <input
                id="stream-years-search"
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="例如：2025、乙巳、貴人、創業、暴富、考學、防守..."
                className="w-full pl-11 pr-10 py-3 border border-slate-300 rounded-xl text-base text-slate-900 placeholder:text-slate-400 bg-white focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent outline-none transition"
              />
              <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" aria-hidden="true" />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  aria-label="清空搜尋關鍵字"
                  className="absolute right-3 top-3 p-1 text-slate-500 hover:text-slate-900 rounded focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 大運篩選 */}
          <div>
            <label
              htmlFor="stream-years-dayun-filter"
              className="block text-sm sm:text-base font-bold text-slate-900 mb-1.5"
            >
              指定大運階段
            </label>
            <div className="relative">
              <select
                id="stream-years-dayun-filter"
                value={selectedDaYun}
                onChange={(e) => setSelectedDaYun(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl text-base text-slate-900 bg-white focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent outline-none appearance-none cursor-pointer"
              >
                <option value="all">全部大運</option>
                {availableDaYunList.map((dy) => (
                  <option key={dy} value={dy}>
                    {dy}
                  </option>
                ))}
              </select>
              <Compass className="w-5 h-5 text-slate-500 absolute left-3 top-3.5 pointer-events-none" />
              <ChevronDown className="w-5 h-5 text-slate-500 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* 吉/兇篩選 */}
          <div>
            <label className="block text-sm sm:text-base font-bold text-slate-900 mb-1.5">
              運勢漲跌 (吉/兇)
            </label>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 h-[50px] items-center">
              <button
                type="button"
                onClick={() => setTrendFilter('all')}
                aria-pressed={trendFilter === 'all'}
                className={`flex-1 h-full rounded-lg text-sm sm:text-base font-bold transition flex items-center justify-center ${
                  trendFilter === 'all'
                    ? 'bg-white text-slate-950 shadow-sm border border-slate-200'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => setTrendFilter('up')}
                aria-pressed={trendFilter === 'up'}
                className={`flex-1 h-full rounded-lg text-sm sm:text-base font-bold transition flex items-center justify-center gap-1 ${
                  trendFilter === 'up'
                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-sm'
                    : 'text-emerald-800 hover:text-emerald-950'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-800" />
                <span>吉運</span>
              </button>
              <button
                type="button"
                onClick={() => setTrendFilter('down')}
                aria-pressed={trendFilter === 'down'}
                className={`flex-1 h-full rounded-lg text-sm sm:text-base font-bold transition flex items-center justify-center gap-1 ${
                  trendFilter === 'down'
                    ? 'bg-rose-100 text-rose-950 border border-rose-300 shadow-sm'
                    : 'text-rose-800 hover:text-rose-950'
                }`}
              >
                <TrendingDown className="w-4 h-4 text-rose-800" />
                <span>兇運</span>
              </button>
            </div>
          </div>
        </div>

        {/* 篩選狀態統計與重置提示 */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm sm:text-base text-slate-700 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 font-medium">
            <Filter className="w-4 h-4 text-slate-500" />
            <span>
              已顯示 <strong className="text-slate-950 font-bold text-base">{filteredData.length}</strong> 年流年資料
              （全盤共 {data.length} 年）
            </span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-indigo-800 hover:text-indigo-950 font-bold underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
            >
              <X className="w-4 h-4" />
              <span>清除所有過濾條件</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 內容呈現區：卡片模式 VS 表格模式 */}
      {/* ============================================================ */}
      <div className="p-6 sm:p-8">
        {filteredData.length === 0 ? (
          <div className="py-16 text-center text-slate-600 space-y-3">
            <p className="text-lg sm:text-xl font-bold text-slate-900">沒有符合當前過濾條件的流年資料</p>
            <p className="text-base text-slate-600">請嘗試更換關鍵字或切換年代區間</p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-base font-bold hover:bg-indigo-700 transition"
            >
              重置過濾條件
            </button>
          </div>
        ) : viewMode === 'card' ? (
          /* ============================================================ */
          /* 1. 卡片詳批視圖 (字體大、行距舒展、繁簡清晰) */
          /* ============================================================ */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredData.map((item) => {
              const isUp = item.close >= item.open;
              const isPeak = peakYearItem && item.age === peakYearItem.age;

              return (
                <div
                  key={item.age}
                  className={`p-6 rounded-2xl border transition-all flex flex-col justify-between relative ${
                    isPeak
                      ? 'bg-amber-50/70 border-amber-300 shadow-md ring-2 ring-amber-400/40'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {/* 人生巔峰醒目標記 */}
                  {isPeak && (
                    <div className="mb-4 bg-amber-400 text-slate-950 px-4 py-1.5 rounded-lg flex items-center justify-between text-sm sm:text-base font-black shadow-sm">
                      <span className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-950" />
                        <span>🏆 人生巔峰年份</span>
                      </span>
                      <span className="bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-md font-bold text-sm">
                        分數 {item.high}
                      </span>
                    </div>
                  )}

                  <div>
                    {/* 卡片標題行：年份、干支、年齡 */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex flex-wrap items-baseline gap-2.5">
                          <span className="font-serif-sc text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                            {item.year} 年
                          </span>
                          <span className="font-serif-sc text-xl sm:text-2xl font-bold text-indigo-950">
                            {item.ganZhi}
                          </span>
                          <span className="text-base sm:text-lg font-bold text-slate-700">
                            ({item.age} 歲)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-sm px-3 py-1 rounded-lg bg-indigo-50 text-indigo-950 font-bold border border-indigo-200">
                            {item.daYun ? `${item.daYun}` : '大運交界'}
                          </span>
                        </div>
                      </div>

                      {/* 吉 / 兇 標籤 */}
                      <span
                        className={`text-sm px-3.5 py-1.5 rounded-xl font-black border flex items-center gap-1.5 ${
                          isUp
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                            : 'bg-rose-100 text-rose-950 border-rose-300'
                        }`}
                      >
                        {isUp ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-emerald-800" />
                            <span>吉運 (漲)</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4 text-rose-800" />
                            <span>兇運 (跌)</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* K 線四數值矩陣 (開盤、收盤、最高、最低，大字清晰) */}
                    <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center mb-4">
                      <div>
                        <span className="block text-sm font-bold text-slate-700 mb-0.5">開盤</span>
                        <span className="font-mono text-base font-bold text-slate-950">{item.open}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-slate-700 mb-0.5">收盤</span>
                        <span className="font-mono text-base font-bold text-slate-950">{item.close}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-slate-700 mb-0.5">最高</span>
                        <span className="font-mono text-base font-bold text-slate-950">{item.high}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-slate-700 mb-0.5">最低</span>
                        <span className="font-mono text-base font-bold text-slate-950">{item.low}</span>
                      </div>
                    </div>

                    {/* 運勢批斷與詳析 (字體加大到 16-17px，行距放寬，中文閱讀極佳) */}
                    <div className="text-base sm:text-[17px] text-slate-900 leading-relaxed font-normal py-2 border-t border-b border-slate-100 my-3">
                      {item.reason}
                    </div>
                  </div>

                  {/* 底部評分進度條 */}
                  <div className="pt-3 border-t border-slate-100 mt-2">
                    <div className="flex items-center justify-between text-sm sm:text-base font-bold mb-2">
                      <span className="text-slate-800">流年綜合運勢評分</span>
                      <span className="font-mono text-slate-950 font-black text-lg">
                        {item.score} / 100
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
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
                </div>
              );
            })}
          </div>
        ) : (
          /* ============================================================ */
          /* 2. 清爽全覽表格視圖 (字體大、內邊距充足、繁簡清晰) */
          /* ============================================================ */
          <div className="overflow-x-auto rounded-2xl border border-slate-300">
            <table className="w-full text-left border-collapse text-base">
              <thead>
                <tr className="bg-slate-100 text-slate-950 font-bold border-b border-slate-300">
                  <th className="p-4 border-r border-slate-200 text-center w-24 text-base">年齡</th>
                  <th className="p-4 border-r border-slate-200 text-center w-36 text-base">流年</th>
                  <th className="p-4 border-r border-slate-200 text-center w-36 text-base">大運</th>
                  <th className="p-4 border-r border-slate-200 text-center w-28 text-base">走勢</th>
                  <th className="p-4 border-r border-slate-200 text-center w-28 text-base">綜合分</th>
                  <th className="p-4 text-base">流年運勢批斷與行事建議</th>
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
                          ? 'bg-amber-50/90 hover:bg-amber-100/70 font-semibold'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* 年齡 */}
                      <td className="p-4 border-r border-slate-200 text-center font-bold text-slate-950 text-base">
                        {item.age} 歲
                      </td>

                      {/* 流年年份與干支 */}
                      <td className="p-4 border-r border-slate-200 text-center">
                        <div className="font-extrabold text-slate-950 font-serif-sc text-lg">
                          {item.year} 年
                        </div>
                        <div className="text-base font-bold text-indigo-950">
                          {item.ganZhi}
                        </div>
                        {isPeak && (
                          <span className="inline-flex items-center gap-1 text-sm font-black text-amber-950 bg-amber-300 px-2.5 py-0.5 rounded-md mt-1">
                            <Trophy className="w-3.5 h-3.5" /> 巔峰
                          </span>
                        )}
                      </td>

                      {/* 大運 */}
                      <td className="p-4 border-r border-slate-200 text-center font-bold text-slate-900 text-base">
                        {item.daYun || '-'}
                      </td>

                      {/* 走勢標籤 */}
                      <td className="p-4 border-r border-slate-200 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-lg text-sm font-black border ${
                            isUp
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                              : 'bg-rose-100 text-rose-950 border-rose-300'
                          }`}
                        >
                          {isUp ? '吉 ▲' : '兇 ▼'}
                        </span>
                      </td>

                      {/* 評分 */}
                      <td className="p-4 border-r border-slate-200 text-center font-mono font-black text-slate-950 text-lg">
                        {item.score}
                      </td>

                      {/* 批斷內容 (字體放大到 16px，行距放寬，中文閱讀極佳) */}
                      <td className="p-4 text-slate-900 leading-relaxed text-base text-left">
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

      {/* 底部狀態說明列 */}
      <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-sm sm:text-base text-slate-700 no-print">
        <span>
          💡 提示：點擊右上角「列印 / 保存 PDF」即可將全盤 1-100 歲詳批輸出為精美紙本文件
        </span>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-indigo-800 hover:text-indigo-950 font-bold underline focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none"
        >
          回到頂部 ↑
        </button>
      </div>
    </section>
  );
};

export default StreamYearsViewer;

