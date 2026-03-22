
import { UserInput, LifeDestinyResult, Gender } from "../types";
import { BAZI_SYSTEM_INSTRUCTION } from "../constants";

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

  const { apiKey, apiBaseUrl, modelName } = input;

  // FIX: Trim whitespace which causes header errors if copied with newlines
  const cleanApiKey = apiKey ? apiKey.trim() : "";
  const cleanBaseUrl = apiBaseUrl ? apiBaseUrl.trim().replace(/\/+$/, "") : "";
  const targetModel = modelName && modelName.trim() ? modelName.trim() : "gemini-3-pro-preview";

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

  if (!cleanApiKey) {
    throw new Error("請在表單中填寫有效的 API Key（輸入 'demo' 可使用本地演示模式）");
  }

  // Check for non-ASCII characters to prevent obscure 'Failed to construct Request' errors
  // If user accidentally pastes Chinese characters or emojis in the API key field
  if (/[^\x00-\x7F]/.test(cleanApiKey)) {
    throw new Error("API Key 包含非法字符（如中文或全角符號），請檢查輸入是否正確。");
  }

  if (!cleanBaseUrl) {
    throw new Error("請在表單中填寫有效的 API Base URL");
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
    2. 生成 **1-100 歲 (虛歲)** 的人生流年K線數據。
    3. 在 \`reason\` 字段中提供流年詳批。
    4. 生成帶評分的命理分析報告（包含性格分析、幣圈交易分析、發展風水分析）。
    
    請嚴格按照系統指令生成 JSON 數據。
  `;

  try {
    const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanApiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: "system", content: BAZI_SYSTEM_INSTRUCTION + "\n\n請務必只返回純JSON格式數據，不要包含任何markdown代碼塊標記。" },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 30000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API 請求失敗: ${response.status} - ${errText}`);
    }

    const jsonResult = await response.json();
    const content = jsonResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("模型未返回任何內容。");
    }

    // 解析 JSON
    const data = JSON.parse(extractJson(content));

    // 簡單校驗數據完整性
    if (!data.chartPoints || !Array.isArray(data.chartPoints)) {
      throw new Error("模型返回的數據格式不正確（缺失 chartPoints）。");
    }

    return {
      chartData: data.chartPoints,
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
        // Crypto Fields
        crypto: data.crypto || "暫無交易分析",
        cryptoScore: data.cryptoScore || 5,
        cryptoYear: data.cryptoYear || "待定",
        cryptoStyle: data.cryptoStyle || "現貨定投",
      },
    };
  } catch (error) {
    console.error("Gemini/OpenAI API Error:", error);
    throw error;
  }
};
