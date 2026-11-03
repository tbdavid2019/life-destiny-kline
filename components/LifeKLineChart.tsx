import React from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
  LabelList,
} from 'recharts';
import { KLinePoint } from '../types';

interface LifeKLineChartProps {
  data: KLinePoint[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as KLinePoint;
    const isUp = data.close >= data.open;
    return (
      <div className="bg-white/98 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-slate-300 z-50 w-[340px] md:w-[480px] max-w-[calc(100vw-32px)]">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 border-b border-slate-200 pb-3">
          <div>
            <p className="text-2xl font-bold text-slate-950 font-serif-sc">
              {data.year} {data.ganZhi} 年 <span className="text-base text-slate-700 font-semibold font-sans">({data.age} 歲)</span>
            </p>
            <p className="text-base text-indigo-950 font-bold mt-1.5">
              大運：{data.daYun || '大運交界'}
            </p>
          </div>
          <div
            className={`text-sm font-extrabold px-3 py-1 rounded-md border flex items-center gap-1 ${
              isUp
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                : 'bg-rose-100 text-rose-950 border-rose-300'
            }`}
          >
            {isUp ? '吉運 ▲' : '兇運 ▼'}
          </div>
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-4 gap-2 text-center mb-4 bg-slate-100 p-3 rounded-xl border border-slate-200">
          <div>
            <span className="block text-sm text-slate-700 font-bold mb-0.5">開盤</span>
            <span className="font-mono text-base sm:text-lg text-slate-950 font-extrabold">{data.open}</span>
          </div>
          <div>
            <span className="block text-sm text-slate-700 font-bold mb-0.5">收盤</span>
            <span className="font-mono text-base sm:text-lg text-slate-950 font-extrabold">{data.close}</span>
          </div>
          <div>
            <span className="block text-sm text-slate-700 font-bold mb-0.5">最高</span>
            <span className="font-mono text-base sm:text-lg text-slate-950 font-extrabold">{data.high}</span>
          </div>
          <div>
            <span className="block text-sm text-slate-700 font-bold mb-0.5">最低</span>
            <span className="font-mono text-base sm:text-lg text-slate-950 font-extrabold">{data.low}</span>
          </div>
        </div>

        {/* Detailed Reason */}
        <div className="text-sm sm:text-base text-slate-900 leading-relaxed sm:leading-loose text-justify max-h-[260px] overflow-y-auto custom-scrollbar">
          {data.reason}
        </div>
      </div>
    );
  }
  return null;
};

// CandleShape with clean wicks
const CandleShape = (props: any) => {
  const { x, y, width, height, payload, yAxis } = props;

  const isUp = payload.close >= payload.open;
  const color = isUp ? '#16a34a' : '#dc2626'; // High contrast green & red
  const strokeColor = isUp ? '#14532d' : '#7f1d1d'; // Darker stroke for WCAG contrast

  let highY = y;
  let lowY = y + height;

  if (yAxis && typeof yAxis.scale === 'function') {
    try {
      highY = yAxis.scale(payload.high);
      lowY = yAxis.scale(payload.low);
    } catch {
      highY = y;
      lowY = y + height;
    }
  }

  const center = x + width / 2;
  const renderHeight = height < 2 ? 2 : height;

  return (
    <g>
      {/* Wick */}
      <line x1={center} y1={highY} x2={center} y2={lowY} stroke={strokeColor} strokeWidth={2} />
      {/* Body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={renderHeight}
        fill={color}
        stroke={strokeColor}
        strokeWidth={1}
        rx={1}
      />
    </g>
  );
};

// Custom Label Component for the Peak Star (全盤嚴格只標註單一最高巔峰點，防止標籤重疊炸版)
const PeakLabel = (props: any) => {
  const { x, y, width, value, payload, index, peakAge, data } = props;

  const currentAge = payload?.age ?? (data && typeof index === 'number' ? data[index]?.age : null);
  if (currentAge !== peakAge) return null;

  return (
    <g>
      {/* Red/Amber Star Icon */}
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        transform={`translate(${x + width / 2 - 8}, ${y - 28}) scale(0.7)`}
        fill="#b45309"
        stroke="#78350f"
        strokeWidth="1"
      />
      {/* Score Text */}
      <text
        x={x + width / 2}
        y={y - 32}
        fill="#78350f"
        fontSize={13}
        fontWeight="bold"
        textAnchor="middle"
      >
        ★ 巔峰 {value}
      </text>
    </g>
  );
};

const LifeKLineChart: React.FC<LifeKLineChartProps> = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return <div className="h-[500px] flex items-center justify-center text-slate-700 font-bold text-lg">無數據</div>;
  }

  // 鎖定全盤唯一的人生最高巔峰年份（多個相同分數時，優先取綜合分最高或最早的一年）
  const peakPoint = data.reduce((prev, cur) => {
    if (cur.high > prev.high) return cur;
    if (cur.high === prev.high && cur.score > prev.score) return cur;
    return prev;
  }, data[0]);
  const peakAge = peakPoint ? peakPoint.age : -1;

  const transformedData = data.map((d) => ({
    ...d,
    bodyRange: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
    labelPoint: d.high,
    isPeak: d.age === peakAge,
  }));

  // Identify Da Yun change points to draw reference lines
  const daYunChanges = data.filter((d, i) => {
    if (i === 0) return true;
    return d.daYun !== data[i - 1].daYun;
  });

  return (
    <div className="w-full h-[620px] bg-white p-4 md:p-7 rounded-2xl border border-slate-200 shadow-sm relative">
      <div className="mb-6 flex flex-wrap justify-between items-center gap-3 px-2">
        <h3 className="text-2xl font-bold text-slate-950 font-serif-sc">人生流年大運K線圖</h3>
        <div className="flex flex-wrap gap-3 text-sm font-bold">
          <span className="flex items-center text-emerald-950 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg">
            <span className="w-3 h-3 bg-emerald-700 mr-2 rounded-full" aria-hidden="true" />
            吉運 (運勢上漲)
          </span>
          <span className="flex items-center text-rose-950 bg-rose-100 border border-rose-300 px-3 py-1.5 rounded-lg">
            <span className="w-3 h-3 bg-rose-700 mr-2 rounded-full" aria-hidden="true" />
            兇運 (運勢回調)
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="88%">
        <ComposedChart data={transformedData} margin={{ top: 38, right: 15, left: 5, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

          <XAxis
            dataKey="age"
            tick={{ fontSize: 13, fill: '#0f172a', fontWeight: 600 }}
            interval={9}
            axisLine={{ stroke: '#94a3b8' }}
            tickLine={false}
            label={{
              value: '年齡 (歲)',
              position: 'insideBottomRight',
              offset: -8,
              fontSize: 13,
              fill: '#0f172a',
              fontWeight: 700,
            }}
          />

          <YAxis
            domain={[0, 'auto']}
            tick={{ fontSize: 13, fill: '#0f172a', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            label={{
              value: '運勢評分',
              angle: -90,
              position: 'insideLeft',
              fontSize: 13,
              fill: '#0f172a',
              fontWeight: 700,
            }}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#64748b', strokeWidth: 1.5, strokeDasharray: '4 4' }}
          />

          {/* Da Yun Reference Lines */}
          {daYunChanges.map((point, index) => (
            <ReferenceLine
              key={`dayun-${index}`}
              x={point.age}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth={1.5}
            >
              <Label
                value={point.daYun}
                position="top"
                fill="#1e1b4b"
                fontSize={13}
                fontWeight="bold"
                className="hidden md:block"
              />
            </ReferenceLine>
          ))}

          <Bar
            dataKey="bodyRange"
            shape={<CandleShape />}
            isAnimationActive={true}
            animationDuration={1200}
          >
            <LabelList
              dataKey="high"
              position="top"
              content={<PeakLabel peakAge={peakAge} data={transformedData} />}
            />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LifeKLineChart;
