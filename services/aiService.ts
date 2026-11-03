import { UserInput, LifeDestinyResult, Gender } from "../types";
import { BAZI_SYSTEM_INSTRUCTION } from "../constants";
import { signAwsRequest } from "./awsSigV4";
import { getDefaultBaseUrl } from "./modelService";

// Helper to extract JSON from text that might contain markdown or other noise
export const extractJson = (text: string): string => {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  
  const jsonStartIndex = text.indexOf('{');
  const jsonEndIndex = text.lastIndexOf('}');
  if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
    return text.substring(jsonStartIndex, jsonEndIndex + 1);
  }
  
  return text.trim();
};

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 計算西元紀年的流年干支
 */
export function getYearGanZhi(year: number): string {
  const sIdx = ((year - 4) % 10 + 10) % 10;
  const bIdx = ((year - 4) % 12 + 12) % 12;
  return STEMS[sIdx] + BRANCHES[bIdx];
}

/**
 * 智能修復並解析可能因 Token 限制被截斷的 AI JSON 輸出
 */
export function repairAndParseJson(rawText: string): any {
  if (!rawText || !rawText.trim()) {
    throw new Error("模型未返回任何內容。");
  }

  // 1. 常規嘗試：直接解析提取的 JSON
  const extracted = extractJson(rawText);
  try {
    return JSON.parse(extracted);
  } catch (err1) {
    console.warn("Direct JSON.parse failed, initiating multi-stage robust JSON repair:", err1);
  }

  // 2. 清理頭尾 Markdown 與多餘文字
  let text = rawText.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) {
    throw new Error("模型未返回任何有效的 JSON 物件格式。");
  }
  text = text.slice(firstBrace);

  // 3. 處理字串內部截斷（檢查是否有未閉合的引號）
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"' && (i === 0 || text[i - 1] !== '\\')) {
      inString = !inString;
    }
  }
  if (inString) {
    text += '"';
  }

  // 4. 尋找 chartPoints 中最後一個完整項的結尾大括號 "}"，回溯嘗試閉合修復
  let currentPos = text.length;
  while (currentPos > 0) {
    const lastBrace = text.lastIndexOf('}', currentPos);
    if (lastBrace === -1) break;

    const candidate = text.slice(0, lastBrace + 1);
    let openBrackets = 0;
    let openBraces = 0;
    let inStr = false;
    for (let i = 0; i < candidate.length; i++) {
      if (candidate[i] === '"' && (i === 0 || candidate[i - 1] !== '\\')) {
        inStr = !inStr;
      }
      if (!inStr) {
        if (candidate[i] === '[') openBrackets++;
        if (candidate[i] === ']') openBrackets--;
        if (candidate[i] === '{') openBraces++;
        if (candidate[i] === '}') openBraces--;
      }
    }

    let suffix = '';
    while (openBrackets > 0) { suffix += ']'; openBrackets--; }
    while (openBraces > 0) { suffix += '}'; openBraces--; }

    try {
      const parsed = JSON.parse(candidate + suffix);
      if (parsed && typeof parsed === 'object') {
        console.info("Successfully repaired truncated JSON structure!");
        return parsed;
      }
    } catch {
      // 往前退一個字元，繼續尋找上一個完整的 "}"
      currentPos = lastBrace - 1;
    }
  }

  throw new Error("模型輸出的 JSON 格式受截斷且無法自動閉合，請嘗試更換模型或重新點擊生成。");
}

/**
 * 若模型因 Token 限制只輸出至某年齡（例如 70~80 歲），自動補齊至 100 歲，確保圖表與表格完整展示
 */
export function completeChartPoints(
  points: any[],
  birthYear: number,
  _startAge: number,
  _firstDaYun: string
): any[] {
  if (!points || !Array.isArray(points) || points.length === 0) return points;
  if (points.length >= 100) return points.slice(0, 100);

  const lastPoint = points[points.length - 1];
  const lastAge = Number(lastPoint.age) || points.length;
  const lastYear = Number(lastPoint.year) || (birthYear + lastAge - 1);
  const lastScore = Number(lastPoint.score) || 60;
  const lastDaYun = String(lastPoint.daYun || '晚運福壽');

  // 晚年運勢回歸平淡安詳（基準約 52-65 分，避免高位躺平）
  const baseScore = Math.min(65, Math.max(50, Math.round(lastScore * 0.7 + 15)));

  const completed = [...points];
  for (let age = lastAge + 1; age <= 100; age++) {
    const year = lastYear + (age - lastAge);
    const ganZhi = getYearGanZhi(year);
    // 自然平穩波動
    const delta = Math.sin(age * 0.7) * 5 + Math.cos(age * 0.3) * 3;
    const score = Math.max(38, Math.min(75, Math.round(baseScore + delta)));
    const open = Math.round(score - 1 + (age % 3) - 1);
    const close = score;
    const high = Math.max(open, close) + 3;
    const low = Math.min(open, close) - 3;

    completed.push({
      age,
      year,
      ganZhi,
      daYun: lastDaYun,
      open,
      close,
      high,
      low,
      score,
      reason: age >= 90 ? '期頤之年福壽安康，德澤子孫，享清福' : '晚年生活安逸祥和，福澤綿長，心境淡泊超然',
    });
  }

  return completed;
}

/**
 * 智能校準流年 K 線分數與形態
 * 解決 LLM 常見的「阿諛奉承偏見 / 向上飄移失真」（即成年與晚年全盤躺平在 90-100 分、滿分泛濫）
 * 保證符合八字大運週期、自然起伏與真實金融 K 線連續性。
 */
export function harmonizeDestinyScores(points: any[]): any[] {
  if (!points || !Array.isArray(points) || points.length === 0) return points;

  const rawScores = points.map((p) => Number(p.score) || Number(p.close) || 50);
  const avg = rawScores.reduce((sum, s) => sum + s, 0) / rawScores.length;
  const countAbove88 = rawScores.filter((s) => s >= 88).length;
  const count98Plus = rawScores.filter((s) => s >= 98).length;
  const minRaw = Math.min(...rawScores);
  const maxRaw = Math.max(...rawScores);

  // 判定是否為高位躺平或單調漂移失真 (例如超過 18 年 >= 88 分、或滿分超過 2 年、或平均分高達 76+、或分數跨度極窄全在 85 以上)
  const isHighPlateau = countAbove88 > 18 || count98Plus > 2 || avg > 76 || (minRaw >= 80 && maxRaw - minRaw < 20);

  // 找出全盤最高分所在的索引（若多個相同，取 28~58 歲壯年期優先，作為人生黃金巔峰）
  let bestPeakIdx = 0;
  let highestScore = -1;
  points.forEach((p, idx) => {
    const age = Number(p.age) || idx + 1;
    let weight = rawScores[idx];
    if (age >= 28 && age <= 58) weight += 1.5;
    if (weight > highestScore) {
      highestScore = weight;
      bestPeakIdx = idx;
    }
  });

  if (!isHighPlateau) {
    // 數據整體分佈尚可，但仍需進行 K 線連續性與唯一巔峰平滑
    let prevClose = Number(points[0].open) || 50;

    return points.map((p, idx) => {
      let score = Number(p.score) || 50;
      // 避免多個 98-100 分泛濫，只有唯一巔峰保留 96-98，其餘 95 以上壓制到 86-92
      if (score >= 95) {
        if (idx === bestPeakIdx) {
          score = Math.min(98, score);
        } else {
          score = 86 + (idx % 6);
        }
      }

      // 晚年（75歲以上）適度歸於平淡安詳（不超過 78 分）
      const age = Number(p.age) || idx + 1;
      if (age > 75 && score > 78 && idx !== bestPeakIdx) {
        score = Math.round(58 + (score - 78) * 0.4);
      }

      let open = idx === 0 ? Number(p.open) || score - 2 : Math.round((Number(p.open) + prevClose) / 2);
      let close = score;
      prevClose = close;

      const high = Math.max(Number(p.high) || close, Math.max(open, close) + 2);
      const low = Math.min(Number(p.low) || close, Math.min(open, close) - 2);

      return {
        ...p,
        score,
        open,
        close,
        high,
        low,
      };
    });
  }

  // 針對高位躺平失真的數據進行重塑映射（保留原始相對強弱位次與詳批內容，重塑命理自然起伏波動）
  const range = maxRaw - minRaw || 1;
  let prevClose = 52;

  return points.map((p, idx) => {
    const age = Number(p.age) || idx + 1;
    // 原始相對強度 (0 ~ 1)
    const relativeRank = (rawScores[idx] - minRaw) / range;

    // 大運 10 年一個波段週期 (大運交替帶來的牛市與熊市起伏)
    const daYunCycle = Math.sin((age / 10) * Math.PI) * 12 + Math.cos((age / 5) * Math.PI) * 5;

    // 年齡基礎水位
    let baseLevel = 55;
    if (age <= 18) baseLevel = 52; // 少年求學
    else if (age <= 30) baseLevel = 58; // 青年立業
    else if (age <= 55) baseLevel = 64; // 壯年中流砥柱
    else if (age <= 70) baseLevel = 60; // 花甲收成
    else baseLevel = 54; // 晚年安泰

    // 計算重塑後的分數
    let calibratedScore = Math.round(baseLevel + daYunCycle + (relativeRank - 0.5) * 22);

    // 晚年（70歲後）溫和收斂，避免破百
    if (age > 70) {
      calibratedScore = Math.min(75, Math.max(45, calibratedScore));
    }

    // 嚴格保障全盤唯一最高峰年份（96分）
    if (idx === bestPeakIdx) {
      calibratedScore = 96;
    } else {
      calibratedScore = Math.max(28, Math.min(92, calibratedScore));
    }

    let open = idx === 0 ? calibratedScore - 2 : prevClose + Math.round(Math.sin(idx * 1.5) * 2);
    let close = calibratedScore;
    prevClose = close;

    const wickHigh = Math.abs(Math.sin(idx * 2.1)) * 3 + 2;
    const wickLow = Math.abs(Math.cos(idx * 1.7)) * 3 + 2;
    const high = Math.round(Math.max(open, close) + wickHigh);
    const low = Math.round(Math.min(open, close) - wickLow);

    return {
      ...p,
      score: close,
      open,
      close,
      high,
      low,
    };
  });
}

// Helper to determine stem polarity
const getStemPolarity = (pillar: string): 'YANG' | 'YIN' => {
  if (!pillar) return 'YANG'; // default
  const firstChar = pillar.trim().charAt(0);
  const yangStems = ['甲', '丙', '戊', '庚', '壬'];
  const yinStems = ['乙', '丁', '己', '辛', '癸'];

  if (yangStems.includes(firstChar)) return 'YANG';
  if (yinStems.includes(firstChar)) return 'YIN';
  return 'YANG'; // fallback
};

export const generateLifeAnalysis = async (input: UserInput): Promise<LifeDestinyResult> => {
  const {
    apiKey,
    apiBaseUrl,
    modelName,
    provider = 'gemini',
    awsAccessKeyId,
    awsSecretAccessKey,
    awsRegion,
    awsSessionToken,
  } = input;

  const cleanApiKey = apiKey ? apiKey.trim() : "";
  const targetModel = modelName && modelName.trim() ? modelName.trim() : "gemini-2.5-flash";

  // 本地演示模式：當 API Key 爲 'demo' 時，使用預生成的本地數據
  if (cleanApiKey.toLowerCase() === 'demo') {
    console.log('🎯 使用本地演示模式');
    const mockData = await fetch('/mock-data.json').then(r => r.json());
    return {
      chartData: mockData.chartPoints,
      analysis: {
        bazi: mockData.bazi || [],
        summary: mockData.summary || "無摘要",
        summaryScore: mockData.summaryScore || 5,
        personality: mockData.personality || "無性格分析",
        personalityScore: mockData.personalityScore || 5,
        industry: mockData.industry || "無",
        industryScore: mockData.industryScore || 5,
        fengShui: mockData.fengShui || "建議多親近自然，保持心境平和。",
        fengShuiScore: mockData.fengShuiScore || 5,
        wealth: mockData.wealth || "無",
        wealthScore: mockData.wealthScore || 5,
        marriage: mockData.marriage || "無",
        marriageScore: mockData.marriageScore || 5,
        health: mockData.health || "無",
        healthScore: mockData.healthScore || 5,
        family: mockData.family || "無",
        familyScore: mockData.familyScore || 5,
        crypto: mockData.crypto || "暫無交易分析",
        cryptoScore: mockData.cryptoScore || 5,
        cryptoYear: mockData.cryptoYear || "待定",
        cryptoStyle: mockData.cryptoStyle || "現貨定投",
      },
    };
  }

  // Bedrock 使用 IAM Key，其他 Provider 驗證 API Key
  if (provider === 'bedrock' && (!apiBaseUrl || !apiBaseUrl.trim())) {
    if (!awsAccessKeyId?.trim() || !awsSecretAccessKey?.trim()) {
      throw new Error("請填寫有效的 AWS Access Key ID 與 Secret Access Key（或輸入 'demo' 體驗本地演示模式）");
    }
  } else {
    if (!cleanApiKey) {
      throw new Error("請在表單中填寫有效的 API Key（輸入 'demo' 可使用本地演示模式）");
    }
    if (/[^\x00-\x7F]/.test(cleanApiKey)) {
      throw new Error("API Key 包含非法字符（如中文或全角符號），請檢查輸入是否正確。");
    }
  }

  const cleanBaseUrl = apiBaseUrl && apiBaseUrl.trim() 
    ? apiBaseUrl.trim().replace(/\/+$/, "") 
    : getDefaultBaseUrl(provider);

  // 驗證傳輸協議安全：遠端端點必須使用 HTTPS（本地與區域網路測試允許 http://localhost / http://127.0.0.1 / 私有 IP）
  if (cleanBaseUrl) {
    const isLocalEndpoint = cleanBaseUrl.startsWith('http://localhost') || 
                            cleanBaseUrl.startsWith('http://127.0.0.1') ||
                            cleanBaseUrl.startsWith('http://[::1]');
    const isLanEndpoint = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(cleanBaseUrl);
    if (!cleanBaseUrl.startsWith('https://') && !isLocalEndpoint && !isLanEndpoint) {
      throw new Error("API Base URL 必須使用安全的 HTTPS 協議（本地與區網測試可使用 http://localhost 或私有 IP）");
    }
  }

  const genderStr = input.gender === Gender.MALE ? '男 (乾造)' : '女 (坤造)';
  const startAgeInt = parseInt(input.startAge) || 1;

  // Calculate Da Yun Direction accurately
  const yearStemPolarity = getStemPolarity(input.yearPillar);
  let isForward = false;

  if (input.gender === Gender.MALE) {
    isForward = yearStemPolarity === 'YANG';
  } else {
    isForward = yearStemPolarity === 'YIN';
  }

  const daYunDirectionStr = isForward ? '順行 (Forward)' : '逆行 (Backward)';
  const directionExample = isForward
    ? "例如：第一步是【戊申】，第二步則是【己酉】（順排）"
    : "例如：第一步是【戊申】，第二步則是【丁未】（逆排）";

  const userPrompt = `
    請根據以下**已經排好的**八字四柱和**指定的大運信息**進行分析。
    
    【基本信息】
    性別：${genderStr}
    姓名：${input.name || "未提供"}
    出生年份：${input.birthYear}年 (陽曆)
    
    【八字四柱】
    年柱：${input.yearPillar} (天干屬性：${yearStemPolarity === 'YANG' ? '陽' : '陰'})
    月柱：${input.monthPillar}
    日柱：${input.dayPillar}
    時柱：${input.hourPillar}
    
    【大運核心參數】
    1. 起運年齡：${input.startAge} 歲 (虛歲)。
    2. 第一步大運：${input.firstDaYun}。
    3. **排序方向**：${daYunDirectionStr}。
    
    【必須執行的算法 - 大運序列生成】
    請嚴格按照以下步驟生成數據：
    
    1. **鎖定第一步**：確認【${input.firstDaYun}】爲第一步大運。
    2. **計算序列**：根據六十甲子順序和方向（${daYunDirectionStr}），推算出接下來的 9 步大運。
       ${directionExample}
    3. **填充 JSON**：
       - Age 1 到 ${startAgeInt - 1}: daYun = "童限"
       - Age ${startAgeInt} 到 ${startAgeInt + 9}: daYun = [第1步大運: ${input.firstDaYun}]
       - Age ${startAgeInt + 10} 到 ${startAgeInt + 19}: daYun = [第2步大運]
       - Age ${startAgeInt + 20} 到 ${startAgeInt + 29}: daYun = [第3步大運]
       - ...以此類推直到 100 歲。
    
    【特別警告】
    - **daYun 字段**：必須填大運干支（10年一變），**絕對不要**填流年干支。
    - **ganZhi 字段**：填入該年份的**流年干支**（每年一變，例如 2024=甲辰，2025=乙巳）。
    
    任務：
    1. 確認格局與喜忌。
    2. 生成 **1-100 歲 (虛歲)** 的人生流年K線數據（每條 reason 字段嚴格控制在 12-20 字，確保 1-100 歲完整輸出無截斷）。
    3. 生成帶評分的命理分析報告（包含性格分析、投資理財分析、發展風水分析）。
    
    請嚴格按照系統指令只返回純 JSON 數據。
  `;

  const systemInstruction = BAZI_SYSTEM_INSTRUCTION + "\n\n請務必只返回純JSON格式數據，不要包含任何markdown代碼塊標記。";

  let content = "";

  try {
    // 依據不同 Provider 調用對應的 API
    if (provider === 'claude') {
      content = await callAnthropicApi({
        baseUrl: cleanBaseUrl,
        apiKey: cleanApiKey,
        model: targetModel,
        systemInstruction,
        userPrompt,
      });
    } else if (provider === 'bedrock' && awsAccessKeyId && awsSecretAccessKey && (!apiBaseUrl || !apiBaseUrl.trim())) {
      content = await callBedrockConverseApi({
        region: awsRegion || 'us-east-1',
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
        sessionToken: awsSessionToken,
        model: targetModel,
        systemInstruction,
        userPrompt,
      });
    } else {
      // OpenAI-compatible 端點 (Gemini, Groq, Grok, OpenRouter, OpenAI, Custom, Bedrock Proxy)
      content = await callOpenAICompatibleApi({
        provider,
        baseUrl: cleanBaseUrl,
        apiKey: cleanApiKey,
        model: targetModel,
        systemInstruction,
        userPrompt,
      });
    }

    if (!content) {
      throw new Error("模型未返回任何內容。");
    }

    // 解析 JSON (具備智能截斷自動修復與閉合能力)
    const rawParsed = repairAndParseJson(content);
    const analysisSource = rawParsed.analysis || rawParsed;
    const rawPoints = rawParsed.chartPoints || rawParsed.chartData;

    if (!rawPoints || !Array.isArray(rawPoints) || rawPoints.length < 5) {
      throw new Error("模型返回的數據格式不正確（未包含有效的 chartPoints 流年資料）。");
    }

    // 深度校驗與數值清洗，防止異常數據導致圖表繪製崩潰
    const birthYearNum = parseInt(input.birthYear) || 1990;
    const sanitizedPoints = rawPoints.map((item: any, idx: number) => {
      const open = Number(item.open) || 50;
      const close = Number(item.close) || 50;
      const high = Number(item.high) || Math.max(open, close);
      const low = Number(item.low) || Math.min(open, close);
      const score = Number(item.score) || close;

      return {
        age: Number(item.age) || idx + 1,
        year: Number(item.year) || (birthYearNum + idx),
        ganZhi: String(item.ganZhi || getYearGanZhi(birthYearNum + idx)),
        daYun: String(item.daYun || '大運交界'),
        open,
        close,
        high,
        low,
        score,
        reason: String(item.reason || '平穩發展，順應天時。'),
      };
    });

    // 自動補足 1-100 歲流年資料（避免模型提早中斷）
    const fullPoints = completeChartPoints(sanitizedPoints, birthYearNum, startAgeInt, input.firstDaYun);

    // 智能校準流年 K 線分數與形態，消除模型阿諛漂移與高位躺平失真
    const harmonizedPoints = harmonizeDestinyScores(fullPoints);

    return {
      chartData: harmonizedPoints,
      analysis: {
        bazi: analysisSource.bazi || [],
        summary: analysisSource.summary || "無摘要",
        summaryScore: analysisSource.summaryScore || 5,
        personality: analysisSource.personality || "無性格分析",
        personalityScore: analysisSource.personalityScore || 5,
        industry: analysisSource.industry || "無",
        industryScore: analysisSource.industryScore || 5,
        fengShui: analysisSource.fengShui || "建議多親近自然，保持心境平和。",
        fengShuiScore: analysisSource.fengShuiScore || 5,
        wealth: analysisSource.wealth || "無",
        wealthScore: analysisSource.wealthScore || 5,
        marriage: analysisSource.marriage || "無",
        marriageScore: analysisSource.marriageScore || 5,
        health: analysisSource.health || "無",
        healthScore: analysisSource.healthScore || 5,
        family: analysisSource.family || "無",
        familyScore: analysisSource.familyScore || 5,
        // Crypto Fields
        crypto: analysisSource.crypto || "暫無交易分析",
        cryptoScore: analysisSource.cryptoScore || 5,
        cryptoYear: analysisSource.cryptoYear || "待定",
        cryptoStyle: analysisSource.cryptoStyle || "現貨定投",
      },
    };
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};

/**
 * 調用 Anthropic Claude Messages API
 */
async function callAnthropicApi(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemInstruction: string;
  userPrompt: string;
}): Promise<string> {
  const { baseUrl, apiKey, model, systemInstruction, userPrompt } = params;

  const endpoint = baseUrl.endsWith('/messages') ? baseUrl : `${baseUrl}/messages`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: systemInstruction,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic Claude 請求失敗: ${response.status} - ${errText}`);
  }

  const jsonResult = await response.json();
  const textContent = jsonResult.content?.find((c: any) => c.type === 'text')?.text || jsonResult.content?.[0]?.text;
  return textContent || "";
}

/**
 * 調用 AWS Bedrock Converse API (經 SigV4 簽名)
 */
async function callBedrockConverseApi(params: {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  model: string;
  systemInstruction: string;
  userPrompt: string;
}): Promise<string> {
  const { region, accessKeyId, secretAccessKey, sessionToken, model, systemInstruction, userPrompt } = params;

  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/converse`;

  const requestBody = JSON.stringify({
    system: [{ text: systemInstruction }],
    messages: [
      {
        role: 'user',
        content: [{ text: userPrompt }],
      },
    ],
    inferenceConfig: {
      temperature: 0.7,
      maxTokens: 8192,
    },
  });

  const signedHeaders = await signAwsRequest({
    method: 'POST',
    url,
    service: 'bedrock',
    region,
    headers: {
      'Content-Type': 'application/json',
    },
    body: requestBody,
    accessKeyId,
    secretAccessKey,
    sessionToken,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: signedHeaders,
    body: requestBody,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AWS Bedrock 請求失敗: ${response.status} - ${errText}`);
  }

  const jsonResult = await response.json();
  const textContent = jsonResult.output?.message?.content?.[0]?.text;
  return textContent || "";
}

/**
 * 調用 OpenAI-Compatible Chat Completions 端點
 */
async function callOpenAICompatibleApi(params: {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  systemInstruction: string;
  userPrompt: string;
}): Promise<string> {
  const { provider, baseUrl, apiKey, model, systemInstruction, userPrompt } = params;

  const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  // OpenRouter 推薦標頭
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://lifekline.david888.com';
    headers['X-Title'] = '888 Life Destiny K-Line';
  }

  // 判斷是否為 OpenAI 推理模型 (o1, o3)，這類模型不支援 temperature 與 max_tokens (需改用 max_completion_tokens)
  const isReasoningModel = /^(o1|o3)/i.test(model);

  const requestBodyPayload: Record<string, any> = {
    model,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userPrompt },
    ],
  };

  if (isReasoningModel) {
    requestBodyPayload.max_completion_tokens = 16000;
  } else if (provider === 'groq') {
    requestBodyPayload.temperature = 0.7;
    requestBodyPayload.max_tokens = 8192; // Groq 推理上限為 8192
  } else {
    requestBodyPayload.temperature = 0.7;
    requestBodyPayload.max_tokens = 24000;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBodyPayload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API 請求失敗 (${provider}): ${response.status} - ${errText}`);
  }

  const jsonResult = await response.json();
  const choice = jsonResult.choices?.[0];
  if (choice?.finish_reason === 'length') {
    console.warn(`[${provider}] 模型輸出觸及長度上限 (finish_reason: length)，啟動自動修復與流年補齊機制。`);
  }
  const content = choice?.message?.content;
  return content || "";
}
