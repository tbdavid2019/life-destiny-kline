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
      <div className="bg-white/98 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-slate-300 z-50 w-[320px] md:w-[420px]">
        {/* Header */}
        <div className="flex justify-between items-start mb-3 border-b border-slate-200 pb-2.5">
          <div>
            <p className="text-xl font-bold text-slate-950 font-serif-sc">
              {data.year} {data.ganZhi} 年 <span className="text-sm text-slate-700 font-semibold font-sans">({data.age} 歲)</span>
            </p>
            <p className="text-sm text-indigo-950 font-bold mt-1">
              大運：{data.daYun || '大運交界'}
            </p>
          </div>
          <div
            className={`text-xs font-extrabold px-2.5 py-1 rounded-md border flex items-center gap-1 ${
              isUp
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                : 'bg-rose-100 text-rose-950 border-rose-300'
            }`}
          >
            {isUp ? '吉運 ▲' : '兇運 ▼'}
          </div>
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-4 gap-2 text-xs mb-3 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
          <div className="text-center">
            <span className="block text-slate-600 font-bold scale-90">開盤</span>
            <span className="font-mono text-slate-950 font-extrabold">{data.open}</span>
          </div>
          <div className="text-center">
            <span className="block text-slate-600 font-bold scale-90">收盤</span>
            <span className="font-mono text-slate-950 font-extrabold">{data.close}</span>
          </div>
          <div className="text-center">
            <span className="block text-slate-600 font-bold scale-90">最高</span>
            <span className="font-mono text-slate-950 font-extrabold">{data.high}</span>
          </div>
          <div className="text-center">
            <span className="block text-slate-600 font-bold scale-90">最低</span>
            <span className="font-mono text-slate-950 font-extrabold">{data.low}</span>
          </div>
        </div>

        {/* Detailed Reason */}
        <div className="text-xs md:text-sm text-slate-800 leading-relaxed text-justify max-h-[220px] overflow-y-auto custom-scrollbar">
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

// Custom Label Component for the Peak Star
const PeakLabel = (props: any) => {
  const { x, y, width, value, maxHigh } = props;

  // Only render if this value equals the global max high
  if (value !== maxHigh) return null;

  return (
    <g>
      {/* Red Star Icon */}
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        transform={`translate(${x + width / 2 - 7}, ${y - 26}) scale(0.6)`}
        fill="#b45309"
        stroke="#78350f"
        strokeWidth="1"
      />
      {/* Score Text */}
      <text
        x={x + width / 2}
        y={y - 30}
        fill="#78350f"
        fontSize={11}
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
    return <div className="h-[500px] flex items-center justify-center text-slate-600 font-bold">無數據</div>;
  }

  const transformedData = data.map((d) => ({
    ...d,
    bodyRange: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
    labelPoint: d.high,
  }));

  // Identify Da Yun change points to draw reference lines
  const daYunChanges = data.filter((d, i) => {
    if (i === 0) return true;
    return d.daYun !== data[i - 1].daYun;
  });

  // Calculate Global Max High for the peak label
  const maxHigh = Math.max(...data.map((d) => d.high));

  return (
    <div className="w-full h-[600px] bg-white p-3 md:p-6 rounded-2xl border border-slate-200 shadow-sm relative">
      <div className="mb-6 flex flex-wrap justify-between items-center gap-2 px-2">
        <h3 className="text-xl font-bold text-slate-900 font-serif-sc">人生流年大運K線圖</h3>
        <div className="flex gap-3 text-xs font-bold">
          <span className="flex items-center text-emerald-950 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md">
            <span className="w-2.5 h-2.5 bg-emerald-700 mr-1.5 rounded-full" aria-hidden="true" />
            吉運 (運勢上漲)
          </span>
          <span className="flex items-center text-rose-950 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-md">
            <span className="w-2.5 h-2.5 bg-rose-700 mr-1.5 rounded-full" aria-hidden="true" />
            兇運 (運勢回調)
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={transformedData} margin={{ top: 35, right: 10, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

          <XAxis
            dataKey="age"
            tick={{ fontSize: 11, fill: '#334155' }}
            interval={9}
            axisLine={{ stroke: '#94a3b8' }}
            tickLine={false}
            label={{
              value: '年齡 (歲)',
              position: 'insideBottomRight',
              offset: -5,
              fontSize: 11,
              fill: '#1e293b',
              fontWeight: 700,
            }}
          />

          <YAxis
            domain={[0, 'auto']}
            tick={{ fontSize: 11, fill: '#334155' }}
            axisLine={false}
            tickLine={false}
            label={{
              value: '運勢評分',
              angle: -90,
              position: 'insideLeft',
              fontSize: 11,
              fill: '#1e293b',
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
                fill="#312e81"
                fontSize={11}
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
              content={<PeakLabel maxHigh={maxHigh} />}
            />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LifeKLineChart;
