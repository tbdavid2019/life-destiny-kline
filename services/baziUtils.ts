import pkg from 'lunar-javascript';
const { Solar } = pkg;

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export const STEM_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

export const BRANCH_ELEMENT: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

export const HIDDEN: Record<string, string[]> = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '庚', '戊'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲'],
};

export const NAYIN_TABLE: Record<string, string> = {
  '甲子': '海中金', '乙丑': '海中金', '丙寅': '爐中火', '丁卯': '爐中火', '戊辰': '大林木', '己巳': '大林木',
  '庚午': '路旁土', '辛未': '路旁土', '壬申': '劍鋒金', '癸酉': '劍鋒金', '甲戌': '山頭火', '乙亥': '山頭火',
  '丙子': '澗下水', '丁丑': '澗下水', '戊寅': '城牆土', '己卯': '城牆土', '庚辰': '白蠟金', '辛巳': '白蠟金',
  '壬午': '楊柳木', '癸未': '楊柳木', '甲申': '泉中水', '乙酉': '泉中水', '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹靂火', '己丑': '霹靂火', '庚寅': '松柏木', '辛卯': '松柏木', '壬辰': '長流水', '癸巳': '長流水',
  '甲午': '砂石金', '乙未': '砂石金', '丙申': '山下火', '丁酉': '山下火', '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土', '壬寅': '金箔金', '癸卯': '金箔金', '甲辰': '覆燈火', '乙巳': '覆燈火',
  '丙午': '天河水', '丁未': '天河水', '戊申': '大驛土', '己酉': '大驛土', '庚戌': '釵釧金', '辛亥': '釵釧金',
  '壬子': '桑柘木', '癸丑': '桑柘木', '甲寅': '大溪水', '乙卯': '大溪水', '丙辰': '沙中土', '丁巳': '沙中土',
  '戊午': '天上火', '己未': '天上火', '庚申': '石榴木', '辛酉': '石榴木', '壬戌': '大海水', '癸亥': '大海水',
};

const CONTROL: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const GENERATE: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬']);

export const CHANGSHENG_TABLE: Record<string, Record<string, string>> = {
  甲: { 亥: '長生', 子: '沐浴', 丑: '冠帶', 寅: '臨官', 卯: '帝旺', 辰: '衰', 巳: '病', 午: '死', 未: '墓', 申: '絕', 酉: '胎', 戌: '養' },
  乙: { 午: '長生', 巳: '沐浴', 辰: '冠帶', 卯: '臨官', 寅: '帝旺', 丑: '衰', 子: '病', 亥: '死', 戌: '墓', 酉: '絕', 申: '胎', 未: '養' },
  丙: { 寅: '長生', 卯: '沐浴', 辰: '冠帶', 巳: '臨官', 午: '帝旺', 未: '衰', 申: '病', 酉: '死', 戌: '墓', 亥: '絕', 子: '胎', 丑: '養' },
  丁: { 酉: '長生', 申: '沐浴', 未: '冠帶', 午: '臨官', 巳: '帝旺', 辰: '衰', 卯: '病', 寅: '死', 丑: '墓', 子: '絕', 亥: '胎', 戌: '養' },
  戊: { 寅: '長生', 卯: '沐浴', 辰: '冠帶', 巳: '臨官', 午: '帝旺', 未: '衰', 申: '病', 酉: '死', 戌: '墓', 亥: '絕', 子: '胎', 丑: '養' },
  己: { 酉: '長生', 申: '沐浴', 未: '冠帶', 午: '臨官', 巳: '帝旺', 辰: '衰', 卯: '病', 寅: '死', 丑: '墓', 子: '絕', 亥: '胎', 戌: '養' },
  庚: { 巳: '長生', 午: '沐浴', 未: '冠帶', 申: '臨官', 酉: '帝旺', 戌: '衰', 亥: '病', 子: '死', 丑: '墓', 寅: '絕', 卯: '胎', 辰: '養' },
  辛: { 子: '長生', 亥: '沐浴', 戌: '冠帶', 酉: '臨官', 申: '帝旺', 未: '衰', 午: '病', 巳: '死', 辰: '墓', 卯: '絕', 寅: '胎', 丑: '養' },
  壬: { 申: '長生', 酉: '沐浴', 戌: '冠帶', 亥: '臨官', 子: '帝旺', 丑: '衰', 寅: '病', 卯: '死', 辰: '墓', 巳: '絕', 午: '胎', 未: '養' },
  癸: { 卯: '長生', 寅: '沐浴', 丑: '冠帶', 子: '臨官', 亥: '帝旺', 戌: '衰', 酉: '病', 申: '死', 未: '墓', 午: '絕', 巳: '胎', 辰: '養' },
};

export function getTenGod(dayStem: string, otherStem: string): string {
  if (!dayStem || !otherStem) return '—';
  const self = STEM_ELEMENT[dayStem];
  const other = STEM_ELEMENT[otherStem];
  const samePolarity = YANG_STEMS.has(dayStem) === YANG_STEMS.has(otherStem);
  if (self === other) return samePolarity ? '比肩' : '劫財';
  if (GENERATE[self] === other) return samePolarity ? '食神' : '傷官';
  if (GENERATE[other] === self) return samePolarity ? '偏印' : '正印';
  if (CONTROL[self] === other) return samePolarity ? '偏財' : '正財';
  if (CONTROL[other] === self) return samePolarity ? '七殺' : '正官';
  return '比肩';
}

// ---------------------------------------------------------------------------
// 神煞表 (參考子平標準口徑)
// ---------------------------------------------------------------------------
const TIANYI_TABLE: Record<string, string[]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['寅', '午'],
};

const WENCHANG_TABLE: Record<string, string> = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
const XUETANG_TABLE: Record<string, string> = { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' };
const LU_TABLE: Record<string, string> = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
const JINYU_TABLE: Record<string, string> = { 甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅' };
const YANGBLADE_TABLE: Record<string, string> = { 甲: '卯', 乙: '寅', 丙: '午', 丁: '巳', 戊: '午', 己: '巳', 庚: '酉', 辛: '申', 壬: '子', 癸: '亥' };

const SANHE_MAP: Record<string, string> = {
  寅: '火', 午: '火', 戌: '火',
  申: '水', 子: '水', 辰: '水',
  巳: '金', 酉: '金', 丑: '金',
  亥: '木', 卯: '木', 未: '木',
};
const JIANGXING_MAP: Record<string, string> = { 火: '午', 水: '子', 金: '酉', 木: '卯' };
const HUAGAI_MAP: Record<string, string> = { 火: '戌', 水: '辰', 金: '丑', 木: '未' };
const YIMA_MAP: Record<string, string> = { 火: '申', 水: '寅', 金: '亥', 木: '巳' };
const TAOHUA_MAP: Record<string, string> = { 火: '卯', 水: '酉', 金: '午', 木: '子' };

function calculateShenShaList(
  yearStem: string,
  yearBranch: string,
  dayStem: string,
  dayBranch: string,
  branches: string[]
): string[] {
  const result: string[] = [];

  // 天乙貴人
  const tianyiNeed = new Set([...(TIANYI_TABLE[yearStem] || []), ...(TIANYI_TABLE[dayStem] || [])]);
  if (branches.some((b) => tianyiNeed.has(b))) result.push('天乙貴人');

  // 文昌
  const wenchangZhi = WENCHANG_TABLE[dayStem] || WENCHANG_TABLE[yearStem];
  if (branches.includes(wenchangZhi)) result.push('文昌貴人');

  // 學堂
  const xuetangZhi = XUETANG_TABLE[dayStem];
  if (branches.includes(xuetangZhi)) result.push('學堂');

  // 祿神
  const luZhi = LU_TABLE[dayStem];
  if (branches.includes(luZhi)) result.push('祿神');

  // 金輿
  const jinyuZhi = JINYU_TABLE[dayStem];
  if (branches.includes(jinyuZhi)) result.push('金輿');

  // 羊刃
  const yangbladeZhi = YANGBLADE_TABLE[dayStem];
  if (branches.includes(yangbladeZhi)) result.push('羊刃');

  // 將星、華蓋、驛馬、桃花
  const sanheYear = SANHE_MAP[yearBranch];
  const sanheDay = SANHE_MAP[dayBranch];
  const checkSanhe = (map: Record<string, string>) => {
    return (sanheYear && branches.includes(map[sanheYear])) || (sanheDay && branches.includes(map[sanheDay]));
  };

  if (checkSanhe(JIANGXING_MAP)) result.push('將星');
  if (checkSanhe(HUAGAI_MAP)) result.push('華蓋');
  if (checkSanhe(YIMA_MAP)) result.push('驛馬');
  if (checkSanhe(TAOHUA_MAP)) result.push('咸池桃花');

  return result;
}

// ---------------------------------------------------------------------------
// 紫微斗數演算法 (三合派經典排盤)
// ---------------------------------------------------------------------------
const BUREAU_NAMES: Record<string, { name: string; number: number }> = {
  水: { name: '水二局', number: 2 },
  木: { name: '木三局', number: 3 },
  金: { name: '金四局', number: 4 },
  土: { name: '土五局', number: 5 },
  火: { name: '火六局', number: 6 },
};

const STAR_BRIGHTNESS: Record<string, string[]> = {
  紫微: ['平', '廟', '廟', '旺', '得', '旺', '廟', '廟', '得', '旺', '得', '平'],
  天機: ['廟', '陷', '得', '旺', '廟', '平', '廟', '陷', '得', '旺', '廟', '平'],
  太陽: ['陷', '不', '旺', '廟', '旺', '旺', '廟', '得', '得', '陷', '不', '陷'],
  武曲: ['得', '利', '廟', '平', '旺', '廟', '得', '利', '廟', '平', '旺', '廟'],
  天同: ['旺', '不', '旺', '平', '平', '廟', '不', '不', '旺', '平', '平', '廟'],
  廉貞: ['平', '利', '廟', '平', '利', '陷', '平', '利', '廟', '平', '利', '陷'],
  天府: ['廟', '廟', '廟', '得', '旺', '得', '旺', '廟', '得', '旺', '旺', '得'],
  太陰: ['廟', '廟', '陷', '陷', '陷', '陷', '陷', '不', '利', '旺', '旺', '廟'],
  貪狼: ['平', '廟', '不', '平', '得', '平', '平', '廟', '不', '平', '得', '利'],
  巨門: ['旺', '不', '廟', '廟', '陷', '旺', '旺', '不', '廟', '廟', '陷', '旺'],
  天相: ['廟', '廟', '廟', '平', '得', '得', '廟', '得', '廟', '平', '得', '得'],
  天梁: ['廟', '旺', '廟', '得', '廟', '陷', '廟', '旺', '陷', '得', '得', '陷'],
  七殺: ['旺', '廟', '廟', '旺', '廟', '平', '旺', '廟', '廟', '旺', '廟', '平'],
  破軍: ['廟', '旺', '得', '陷', '旺', '平', '廟', '旺', '得', '陷', '旺', '平'],
};

const SIHUA_TABLE: Record<string, { lu: string; quan: string; ke: string; ji: string }> = {
  甲: { lu: '廉貞', quan: '破軍', ke: '武曲', ji: '太陽' },
  乙: { lu: '天機', quan: '天梁', ke: '紫微', ji: '太陰' },
  丙: { lu: '天同', quan: '天機', ke: '文昌', ji: '廉貞' },
  丁: { lu: '太陰', quan: '天同', ke: '天機', ji: '巨門' },
  戊: { lu: '貪狼', quan: '太陰', ke: '右弼', ji: '天機' },
  己: { lu: '武曲', quan: '貪狼', ke: '天梁', ji: '文曲' },
  庚: { lu: '太陽', quan: '武曲', ke: '太陰', ji: '天同' },
  辛: { lu: '巨門', quan: '太陽', ke: '文曲', ji: '文昌' },
  壬: { lu: '天梁', quan: '紫微', ke: '左輔', ji: '武曲' },
  癸: { lu: '破軍', quan: '巨門', ke: '太陰', ji: '貪狼' },
};

const MINGZHU_TABLE: Record<string, string> = {
  子: '貪狼', 丑: '巨門', 寅: '祿存', 卯: '文曲', 辰: '廉貞', 巳: '武曲',
  午: '破軍', 未: '武曲', 申: '廉貞', 酉: '文曲', 戌: '祿存', 亥: '巨門',
};

const SHENZHU_TABLE: Record<string, string> = {
  子: '火星', 丑: '天相', 寅: '天梁', 卯: '天同', 辰: '文昌', 巳: '天機',
  午: '火星', 未: '天相', 申: '天梁', 酉: '天同', 戌: '文昌', 亥: '天機',
};

function getYearYinStem(yearStem: string): string {
  const stemMap: Record<string, string> = { 甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲' };
  return stemMap[yearStem] || '丙';
}

function calcZiweiBranch(bureauNum: number, lunarDay: number): number {
  const q = Math.ceil(lunarDay / bureauNum);
  const r = q * bureauNum - lunarDay;
  const base = (2 + q - 1) % 12; // 寅宮起1 (寅 index=2)
  if (r === 0) return base;
  if (r % 2 === 1) return (base - r + 120) % 12;
  return (base + r) % 12;
}

export interface BaziCalculationResult {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  startAge: number;
  firstDaYun: string;

  // 八字子平深度命理推演
  dayMaster: string;          // 日主 (如 丙火)
  dayMasterElement: string;   // 木、火、土、金、水
  strength: '身旺' | '身弱';   // 旺衰
  strengthReason: string;     // 得令、得地、得勢依據
  geJu: string;               // 格局 (如 七殺格、正官格...)
  geJuDescription: string;
  usefulGod: string;          // 喜用神 (如 木、火)
  tabooGod: string;           // 忌仇神 (如 金、水)
  usefulElements: string[];   // ['木', '火']
  tabooElements: string[];     // ['金', '水']
  nayinPillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  tenGods: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  shenshaList: string[];      // 命帶神煞列表

  // 紫微斗數排盤
  ziweiBureau: string;             // 五行局 (如 水二局)
  ziweiMingGongBranch: string;     // 命宮地支 (如 午)
  ziweiShenGongBranch: string;     // 身宮地支 (如 戌)
  ziweiMingZhu: string;            // 命主星 (如 破軍)
  ziweiShenZhu: string;            // 身主星 (如 火星)
  ziweiMingGongStars: string[];    // 命宮主星帶廟旺 (如 ['七殺 (旺)'])
  ziweiSiHua: {
    lu: string;
    quan: string;
    ke: string;
    ji: string;
  };
}

/**
 * 結合子平八字與紫微斗數三合派的完整天文曆法排盤計算
 */
export const calculateBazi = (birthDate: Date, gender: number): BaziCalculationResult => {
  if (!birthDate || isNaN(birthDate.getTime())) {
    throw new Error('無效的出生日期時間');
  }

  const year = birthDate.getFullYear();
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();
  const hour = birthDate.getHours();
  const minute = birthDate.getMinutes();

  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const yearPillar = eightChar.getYear();
  const monthPillar = eightChar.getMonth();
  const dayPillar = eightChar.getDay();
  const hourPillar = eightChar.getTime();

  const dayStem = dayPillar[0];
  const dayBranch = dayPillar[1];
  const yearStem = yearPillar[0];
  const yearBranch = yearPillar[1];
  const monthStem = monthPillar[0];
  const monthBranch = monthPillar[1];
  const hourStem = hourPillar[0];
  const hourBranch = hourPillar[1];

  const dayElement = STEM_ELEMENT[dayStem] || '火';
  const monthElement = BRANCH_ELEMENT[monthBranch] || '土';

  // 1. 十神推導
  const tenGods = {
    year: getTenGod(dayStem, yearStem),
    month: getTenGod(dayStem, monthStem),
    day: '日主 (元神)',
    hour: getTenGod(dayStem, hourStem),
  };

  // 2. 納音五行
  const nayinPillars = {
    year: NAYIN_TABLE[yearPillar] || '—',
    month: NAYIN_TABLE[monthPillar] || '—',
    day: NAYIN_TABLE[dayPillar] || '—',
    hour: NAYIN_TABLE[hourPillar] || '—',
  };

  // 3. 日主旺衰計算 (得令、得地、得勢)
  const isDeLing = monthElement === dayElement || GENERATE[monthElement] === dayElement;

  const allBranches = [yearBranch, monthBranch, dayBranch, hourBranch];
  let deDiCount = 0;
  allBranches.forEach((b) => {
    const hidden = HIDDEN[b] || [];
    hidden.forEach((h) => {
      if (STEM_ELEMENT[h] === dayElement) deDiCount++;
    });
  });

  const otherStems = [yearStem, monthStem, hourStem];
  let deShiCount = 0;
  otherStems.forEach((s) => {
    const e = STEM_ELEMENT[s];
    if (e === dayElement || GENERATE[e] === dayElement) deShiCount++;
  });

  let strength: '身旺' | '身弱' = '身弱';
  if (isDeLing && (deDiCount >= 2 || deShiCount >= 1)) {
    strength = '身旺';
  } else if (!isDeLing && (deDiCount >= 3 || (deDiCount >= 2 && deShiCount >= 2))) {
    strength = '身旺';
  }

  const strengthReason = `${isDeLing ? '得月令' : '失月令'}、地支通根${deDiCount}處、天干印比得勢${deShiCount}處`;

  // 4. 格局判定
  const monthHidden = HIDDEN[monthBranch] || [];
  const mainHiddenStem = monthHidden[0] || monthStem;
  const rawGeJu = getTenGod(dayStem, mainHiddenStem);
  let geJu = rawGeJu.endsWith('格') ? rawGeJu : `${rawGeJu}格`;
  if (geJu === '比肩格') geJu = '建祿格';
  if (geJu === '劫財格') geJu = '陽刃格';

  const geJuDescriptions: Record<string, string> = {
    '正官格': '為人持重端正、知書守禮，具備卓越管理組織才能與信譽',
    '七殺格': '剛毅勇猛、魄力宏大，具開拓創新精神與威嚴決策力',
    '正財格': '勤勞務實、理財穩健，重視家庭與信用，步步為營',
    '偏財格': '慷慨仗義、機敏善動，對商機投資敏感，擅長資源整合',
    '正印格': '仁慈端莊、學養深厚，有長輩提攜庇護，福澤綿長',
    '偏印格': '思維超凡、洞察敏銳，適合專業學術、創新科技與奇特領域',
    '食神格': '溫和寬厚、才華橫溢，享福祿口福，擅長專業技術產出',
    '傷官格': '才思泉湧、敢於突破傳統，具極強創新力與雄辯口才',
    '建祿格': '自立自強、白手起家，骨氣堅毅，重視實踐突破',
    '陽刃格': '剛毅果斷、勇於拼搏，行事雷厲風行，需修平和包容',
  };
  const geJuDescription = geJuDescriptions[geJu] || '正五行成格，秀氣流行';

  // 5. 喜用神與忌神判定
  let usefulGod = '';
  let tabooGod = '';
  let usefulElements: string[] = [];
  let tabooElements: string[] = [];

  if (strength === '身旺') {
    const drain = GENERATE[dayElement]; // 食傷
    const control = CONTROL[dayElement]; // 財星
    usefulElements = [drain, control].filter(Boolean);
    const mother = Object.keys(GENERATE).find((k) => GENERATE[k] === dayElement) || '';
    tabooElements = [mother, dayElement].filter(Boolean);
    usefulGod = `食傷[${drain}]、財星[${control}]為喜用神（泄秀生財、損有餘）`;
    tabooGod = `印星[${mother}]、比劫[${dayElement}]為忌神（忌再強盛）`;
  } else {
    const mother = Object.keys(GENERATE).find((k) => GENERATE[k] === dayElement) || '';
    usefulElements = [mother, dayElement].filter(Boolean);
    const killer = Object.keys(CONTROL).find((k) => CONTROL[k] === dayElement) || '';
    const drain = GENERATE[dayElement];
    tabooElements = [killer, drain, CONTROL[dayElement]].filter(Boolean);
    usefulGod = `印星[${mother}]、比劫[${dayElement}]為喜用神（生身幫扶、補不足）`;
    tabooGod = `官殺[${killer}]、食傷[${drain}]、財星[${CONTROL[dayElement]}]為忌神（忌克泄交加）`;
  }

  // 6. 神煞列表
  const shenshaList = calculateShenShaList(yearStem, yearBranch, dayStem, dayBranch, allBranches);

  // 7. 紫微斗數排盤
  const lunarMonth = Math.abs(lunar.getMonth());
  const lunarDay = lunar.getDay();
  const hourBranchIndex = BRANCHES.indexOf(hourBranch);

  // 命宮與身宮地支
  const monthStartBranchIndex = (2 + lunarMonth - 1) % 12;
  const mingBranchIndex = (monthStartBranchIndex - hourBranchIndex + 120) % 12;
  const shenBranchIndex = (monthStartBranchIndex + hourBranchIndex) % 12;
  const mingBranch = BRANCHES[mingBranchIndex];
  const shenBranch = BRANCHES[shenBranchIndex];

  // 起寅首天干
  const yinStem = getYearYinStem(yearStem);
  const yinStemIndex = STEMS.indexOf(yinStem);
  const palaceStems: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    const bIndex = (2 + i) % 12;
    const sIndex = (yinStemIndex + i) % 10;
    palaceStems[BRANCHES[bIndex]] = STEMS[sIndex];
  }

  // 五行局
  const mingStem = palaceStems[mingBranch] || '甲';
  const mingNayin = NAYIN_TABLE[`${mingStem}${mingBranch}`] || '海中金';
  const mingNayinElement = mingNayin.slice(-1);
  const bureau = BUREAU_NAMES[mingNayinElement] || BUREAU_NAMES['金'];

  // 安紫微星與天府星
  const ziweiBranchIndex = calcZiweiBranch(bureau.number, lunarDay);
  const tianfuBranchIndex = (4 - ziweiBranchIndex + 120) % 12;

  // 安十四主星
  const palaceStars: string[][] = Array.from({ length: 12 }, () => []);

  // 紫微星系
  const ziweiStars = [
    { name: '紫微', offset: 0 },
    { name: '天機', offset: -1 },
    { name: '太陽', offset: -3 },
    { name: '武曲', offset: -4 },
    { name: '天同', offset: -5 },
    { name: '廉貞', offset: -8 },
  ];
  ziweiStars.forEach((s) => {
    const b = (ziweiBranchIndex + s.offset + 120) % 12;
    palaceStars[b].push(s.name);
  });

  // 天府星系
  const tianfuStars = [
    { name: '天府', offset: 0 },
    { name: '太陰', offset: 1 },
    { name: '貪狼', offset: 2 },
    { name: '巨門', offset: 3 },
    { name: '天相', offset: 4 },
    { name: '天梁', offset: 5 },
    { name: '七殺', offset: 6 },
    { name: '破軍', offset: 10 },
  ];
  tianfuStars.forEach((s) => {
    const b = (tianfuBranchIndex + s.offset + 120) % 12;
    palaceStars[b].push(s.name);
  });

  // 命宮主星帶廟旺
  const mingStars = palaceStars[mingBranchIndex] || [];
  const ziweiMingGongStars = mingStars.map((starName) => {
    const brightArr = STAR_BRIGHTNESS[starName];
    const bright = brightArr ? brightArr[mingBranchIndex] : '';
    return bright ? `${starName} (${bright})` : starName;
  });

  // 命主與身主
  const ziweiMingZhu = MINGZHU_TABLE[mingBranch] || '貪狼';
  const ziweiShenZhu = SHENZHU_TABLE[yearBranch] || '火星';

  // 生年四化
  const sihuaRaw = SIHUA_TABLE[yearStem] || SIHUA_TABLE['甲'];
  const ziweiSiHua = {
    lu: sihuaRaw.lu,
    quan: sihuaRaw.quan,
    ke: sihuaRaw.ke,
    ji: sihuaRaw.ji,
  };

  // 大運推算
  const yun = eightChar.getYun(gender);
  const startAge = yun.getStartYear() + 1; // 虛歲
  const daYunArr = yun.getDaYun();
  const firstDaYun = daYunArr[1]?.getGanZhi() || '';

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    startAge,
    firstDaYun,
    dayMaster: `${dayStem}${dayElement}`,
    dayMasterElement: dayElement,
    strength,
    strengthReason,
    geJu,
    geJuDescription,
    usefulGod,
    tabooGod,
    usefulElements,
    tabooElements,
    nayinPillars,
    tenGods,
    shenshaList,
    ziweiBureau: bureau.name,
    ziweiMingGongBranch: mingBranch,
    ziweiShenGongBranch: shenBranch,
    ziweiMingZhu,
    ziweiShenZhu,
    ziweiMingGongStars,
    ziweiSiHua,
  };
};
