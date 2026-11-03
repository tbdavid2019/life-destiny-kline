/**
 * 天文經緯度與真太陽時計算核心 (True Solar Time & Equation of Time Calibration Engine)
 * 支援全球主要華人都市經緯度、經度時差、天文均時差 (Equation of Time)、早夜子時校正
 */

export interface CityCoordinate {
  lng: number;
  lat: number;
  province: string;
  stdMeridian: number; // 標準時區中央經線 (例如東八區為 120, 日本東九區為 135, 美西為 -120 等)
}

export interface CityGroupItem {
  label: string;
  value: string;
  lng: number;
  lat: number;
}

export interface CityGroup {
  groupName: string;
  cities: CityGroupItem[];
}

export interface SolarTimeLocation {
  city: string;
  province: string;
  lng: number;
  lat: number;
  stdMeridian: number;
}

export interface SolarTimeCorrectionResult {
  place: string;
  originalDate: string; // 'YYYY-MM-DD'
  originalTime: string; // 'HH:mm'
  solarDate: string;    // 'YYYY-MM-DD'
  solarTime: string;    // 'HH:mm'
  solarTimeFormatted: string;
  solarYear: number;
  solarMonth: number;
  solarDay: number;
  solarHour: number;
  solarMinute: number;
  shichenBranch: string; // '子', '丑', '寅'...
  ziHourType: 'early_zi' | 'late_zi' | 'normal';
  dayShift: number; // -1, 0, 1
  longitudeDiffMinutes: number;
  equationOfTimeMinutes: number;
  totalOffsetMinutes: number;
  location: SolarTimeLocation;
  offsets: {
    lngOffsetMinutes: number;
    eotMinutes: number;
    totalOffsetMinutes: number;
    description: string;
  };
}

export const CITY_COORDINATES: Record<string, CityCoordinate> = {
  // 臺灣各縣市 (涵蓋六都與全部縣市、離島)
  '臺北市': { lng: 121.5654, lat: 25.0330, province: '臺灣', stdMeridian: 120 },
  '台北市': { lng: 121.5654, lat: 25.0330, province: '臺灣', stdMeridian: 120 },
  '臺北': { lng: 121.5654, lat: 25.0330, province: '臺灣', stdMeridian: 120 },
  '台北': { lng: 121.5654, lat: 25.0330, province: '臺灣', stdMeridian: 120 },
  '新北市': { lng: 121.4670, lat: 25.0124, province: '臺灣', stdMeridian: 120 },
  '新北': { lng: 121.4670, lat: 25.0124, province: '臺灣', stdMeridian: 120 },
  '基隆市': { lng: 121.7462, lat: 25.1276, province: '臺灣', stdMeridian: 120 },
  '基隆': { lng: 121.7462, lat: 25.1276, province: '臺灣', stdMeridian: 120 },
  '桃園市': { lng: 121.3010, lat: 24.9936, province: '臺灣', stdMeridian: 120 },
  '桃園': { lng: 121.3010, lat: 24.9936, province: '臺灣', stdMeridian: 120 },
  '新竹市': { lng: 120.9675, lat: 24.8138, province: '臺灣', stdMeridian: 120 },
  '新竹': { lng: 120.9675, lat: 24.8138, province: '臺灣', stdMeridian: 120 },
  '新竹縣': { lng: 121.0043, lat: 24.8383, province: '臺灣', stdMeridian: 120 },
  '苗栗縣': { lng: 120.8208, lat: 24.5602, province: '臺灣', stdMeridian: 120 },
  '苗栗': { lng: 120.8208, lat: 24.5602, province: '臺灣', stdMeridian: 120 },
  '臺中市': { lng: 120.6736, lat: 24.1477, province: '臺灣', stdMeridian: 120 },
  '台中市': { lng: 120.6736, lat: 24.1477, province: '臺灣', stdMeridian: 120 },
  '臺中': { lng: 120.6736, lat: 24.1477, province: '臺灣', stdMeridian: 120 },
  '台中': { lng: 120.6736, lat: 24.1477, province: '臺灣', stdMeridian: 120 },
  '彰化縣': { lng: 120.5423, lat: 24.0817, province: '臺灣', stdMeridian: 120 },
  '彰化': { lng: 120.5423, lat: 24.0817, province: '臺灣', stdMeridian: 120 },
  '南投縣': { lng: 120.6865, lat: 23.9099, province: '臺灣', stdMeridian: 120 },
  '南投': { lng: 120.6865, lat: 23.9099, province: '臺灣', stdMeridian: 120 },
  '雲林縣': { lng: 120.5445, lat: 23.7092, province: '臺灣', stdMeridian: 120 },
  '雲林': { lng: 120.5445, lat: 23.7092, province: '臺灣', stdMeridian: 120 },
  '嘉義市': { lng: 120.4491, lat: 23.4800, province: '臺灣', stdMeridian: 120 },
  '嘉義': { lng: 120.4491, lat: 23.4800, province: '臺灣', stdMeridian: 120 },
  '嘉義縣': { lng: 120.2930, lat: 23.4593, province: '臺灣', stdMeridian: 120 },
  '臺南市': { lng: 120.2000, lat: 23.0000, province: '臺灣', stdMeridian: 120 },
  '台南市': { lng: 120.2000, lat: 23.0000, province: '臺灣', stdMeridian: 120 },
  '臺南': { lng: 120.2000, lat: 23.0000, province: '臺灣', stdMeridian: 120 },
  '台南': { lng: 120.2000, lat: 23.0000, province: '臺灣', stdMeridian: 120 },
  '高雄市': { lng: 120.3120, lat: 22.6273, province: '臺灣', stdMeridian: 120 },
  '高雄': { lng: 120.3120, lat: 22.6273, province: '臺灣', stdMeridian: 120 },
  '屏東縣': { lng: 120.4884, lat: 22.6762, province: '臺灣', stdMeridian: 120 },
  '屏東': { lng: 120.4884, lat: 22.6762, province: '臺灣', stdMeridian: 120 },
  '宜蘭縣': { lng: 121.7533, lat: 24.7570, province: '臺灣', stdMeridian: 120 },
  '宜蘭': { lng: 121.7533, lat: 24.7570, province: '臺灣', stdMeridian: 120 },
  '花蓮縣': { lng: 121.6068, lat: 23.9872, province: '臺灣', stdMeridian: 120 },
  '花蓮': { lng: 121.6068, lat: 23.9872, province: '臺灣', stdMeridian: 120 },
  '臺東縣': { lng: 121.1456, lat: 22.7583, province: '臺灣', stdMeridian: 120 },
  '台東縣': { lng: 121.1456, lat: 22.7583, province: '臺灣', stdMeridian: 120 },
  '臺東': { lng: 121.1456, lat: 22.7583, province: '臺灣', stdMeridian: 120 },
  '台東': { lng: 121.1456, lat: 22.7583, province: '臺灣', stdMeridian: 120 },
  '澎湖縣': { lng: 119.5793, lat: 23.5711, province: '臺灣', stdMeridian: 120 },
  '澎湖': { lng: 119.5793, lat: 23.5711, province: '臺灣', stdMeridian: 120 },
  '金門縣': { lng: 118.3226, lat: 24.4367, province: '臺灣', stdMeridian: 120 },
  '金門': { lng: 118.3226, lat: 24.4367, province: '臺灣', stdMeridian: 120 },
  '連江縣': { lng: 119.9397, lat: 26.1602, province: '臺灣', stdMeridian: 120 },
  '馬祖': { lng: 119.9397, lat: 26.1602, province: '臺灣', stdMeridian: 120 },

  // 港澳地區
  '香港': { lng: 114.1700, lat: 22.2800, province: '香港', stdMeridian: 120 },
  '香港特別行政區': { lng: 114.1700, lat: 22.2800, province: '香港', stdMeridian: 120 },
  '澳門': { lng: 113.5400, lat: 22.1900, province: '澳門', stdMeridian: 120 },
  '澳門特別行政區': { lng: 113.5400, lat: 22.1900, province: '澳門', stdMeridian: 120 },

  // 中國大陸主要城市
  '北京': { lng: 116.40, lat: 39.90, province: '北京', stdMeridian: 120 },
  '北京市': { lng: 116.40, lat: 39.90, province: '北京', stdMeridian: 120 },
  '上海': { lng: 121.47, lat: 31.23, province: '上海', stdMeridian: 120 },
  '上海市': { lng: 121.47, lat: 31.23, province: '上海', stdMeridian: 120 },
  '廣州': { lng: 113.26, lat: 23.13, province: '廣東', stdMeridian: 120 },
  '广州': { lng: 113.26, lat: 23.13, province: '廣東', stdMeridian: 120 },
  '深圳': { lng: 114.05, lat: 22.54, province: '廣東', stdMeridian: 120 },
  '天津': { lng: 117.20, lat: 39.13, province: '天津', stdMeridian: 120 },
  '重慶': { lng: 106.55, lat: 29.56, province: '重慶', stdMeridian: 120 },
  '重庆': { lng: 106.55, lat: 29.56, province: '重慶', stdMeridian: 120 },
  '成都': { lng: 104.06, lat: 30.67, province: '四川', stdMeridian: 120 },
  '杭州': { lng: 120.15, lat: 30.28, province: '浙江', stdMeridian: 120 },
  '南京': { lng: 118.78, lat: 32.04, province: '江蘇', stdMeridian: 120 },
  '武漢': { lng: 114.30, lat: 30.59, province: '湖北', stdMeridian: 120 },
  '武汉': { lng: 114.30, lat: 30.59, province: '湖北', stdMeridian: 120 },
  '西安': { lng: 108.95, lat: 34.27, province: '陝西', stdMeridian: 120 },
  '長沙': { lng: 112.98, lat: 28.19, province: '湖南', stdMeridian: 120 },
  '长沙': { lng: 112.98, lat: 28.19, province: '湖南', stdMeridian: 120 },
  '鄭州': { lng: 113.62, lat: 34.75, province: '河南', stdMeridian: 120 },
  '郑州': { lng: 113.62, lat: 34.75, province: '河南', stdMeridian: 120 },
  '瀋陽': { lng: 123.43, lat: 41.80, province: '遼寧', stdMeridian: 120 },
  '沈阳': { lng: 123.43, lat: 41.80, province: '遼寧', stdMeridian: 120 },
  '哈爾濱': { lng: 126.63, lat: 45.75, province: '黑龍江', stdMeridian: 120 },
  '哈尔滨': { lng: 126.63, lat: 45.75, province: '黑龍江', stdMeridian: 120 },
  '福州': { lng: 119.30, lat: 26.08, province: '福建', stdMeridian: 120 },
  '廈門': { lng: 118.08, lat: 24.48, province: '福建', stdMeridian: 120 },
  '厦门': { lng: 118.08, lat: 24.48, province: '福建', stdMeridian: 120 },
  '昆明': { lng: 102.71, lat: 25.04, province: '雲南', stdMeridian: 120 },
  '貴陽': { lng: 106.71, lat: 26.57, province: '貴州', stdMeridian: 120 },
  '贵阳': { lng: 106.71, lat: 26.57, province: '貴州', stdMeridian: 120 },
  '南寧': { lng: 108.33, lat: 22.84, province: '廣西', stdMeridian: 120 },
  '南宁': { lng: 108.33, lat: 22.84, province: '廣西', stdMeridian: 120 },
  '海口': { lng: 110.35, lat: 20.02, province: '海南', stdMeridian: 120 },
  '蘭州': { lng: 103.73, lat: 36.03, province: '甘肅', stdMeridian: 120 },
  '兰州': { lng: 103.73, lat: 36.03, province: '甘肅', stdMeridian: 120 },
  '西寧': { lng: 101.78, lat: 36.62, province: '青海', stdMeridian: 120 },
  '西宁': { lng: 101.78, lat: 36.62, province: '青海', stdMeridian: 120 },
  '拉薩': { lng: 91.11, lat: 29.65, province: '西藏', stdMeridian: 120 },
  '拉萨': { lng: 91.11, lat: 29.65, province: '西藏', stdMeridian: 120 },
  '烏魯木齊': { lng: 87.62, lat: 43.82, province: '新疆', stdMeridian: 120 },
  '乌鲁木齐': { lng: 87.62, lat: 43.82, province: '新疆', stdMeridian: 120 },

  // 國際主要華人及全球都市
  '新加坡': { lng: 103.82, lat: 1.35, province: '新加坡', stdMeridian: 120 },
  '吉隆坡': { lng: 101.68, lat: 3.14, province: '馬來西亞', stdMeridian: 120 },
  '曼谷': { lng: 100.50, lat: 13.75, province: '泰國', stdMeridian: 105 },
  '東京': { lng: 139.69, lat: 35.68, province: '日本', stdMeridian: 135 },
  '东京': { lng: 139.69, lat: 35.68, province: '日本', stdMeridian: 135 },
  '首爾': { lng: 126.98, lat: 37.56, province: '韓國', stdMeridian: 135 },
  '首尔': { lng: 126.98, lat: 37.56, province: '韓國', stdMeridian: 135 },
  '倫敦': { lng: -0.12, lat: 51.50, province: '英國', stdMeridian: 0 },
  '伦敦': { lng: -0.12, lat: 51.50, province: '英國', stdMeridian: 0 },
  '巴黎': { lng: 2.35, lat: 48.85, province: '法國', stdMeridian: 15 },
  '紐約': { lng: -74.00, lat: 40.71, province: '美國', stdMeridian: -75 },
  '纽约': { lng: -74.00, lat: 40.71, province: '美國', stdMeridian: -75 },
  '舊金山': { lng: -122.42, lat: 37.77, province: '美國', stdMeridian: -120 },
  '旧金山': { lng: -122.42, lat: 37.77, province: '美國', stdMeridian: -120 },
  '洛杉磯': { lng: -118.24, lat: 34.05, province: '美國', stdMeridian: -120 },
  '洛杉矶': { lng: -118.24, lat: 34.05, province: '美國', stdMeridian: -120 },
  '溫哥華': { lng: -123.12, lat: 49.28, province: '加拿大', stdMeridian: -120 },
  '温哥华': { lng: -123.12, lat: 49.28, province: '加拿大', stdMeridian: -120 },
  '多倫多': { lng: -79.38, lat: 43.65, province: '加拿大', stdMeridian: -75 },
  '多伦多': { lng: -79.38, lat: 43.65, province: '加拿大', stdMeridian: -75 },
  '雪梨': { lng: 151.21, lat: -33.87, province: '澳洲', stdMeridian: 150 },
  '悉尼': { lng: 151.21, lat: -33.87, province: '澳洲', stdMeridian: 150 },
  '墨爾本': { lng: 144.96, lat: -37.81, province: '澳洲', stdMeridian: 150 },
  '墨尔本': { lng: 144.96, lat: -37.81, province: '澳洲', stdMeridian: 150 },
  '奧克蘭': { lng: 174.76, lat: -36.85, province: '紐西蘭', stdMeridian: 180 },
  '奥克兰': { lng: 174.76, lat: -36.85, province: '紐西蘭', stdMeridian: 180 },
};

export const CITY_GROUPS: CityGroup[] = [
  {
    groupName: '臺灣縣市 (Taiwan)',
    cities: [
      { label: '臺北市 (121.57°E)', value: '臺北市', lng: 121.5654, lat: 25.0330 },
      { label: '新北市 (121.47°E)', value: '新北市', lng: 121.4670, lat: 25.0124 },
      { label: '基隆市 (121.75°E)', value: '基隆市', lng: 121.7462, lat: 25.1276 },
      { label: '桃園市 (121.30°E)', value: '桃園市', lng: 121.3010, lat: 24.9936 },
      { label: '新竹市 (120.97°E)', value: '新竹市', lng: 120.9675, lat: 24.8138 },
      { label: '新竹縣 (121.00°E)', value: '新竹縣', lng: 121.0043, lat: 24.8383 },
      { label: '苗栗縣 (120.82°E)', value: '苗栗縣', lng: 120.8208, lat: 24.5602 },
      { label: '臺中市 (120.67°E)', value: '臺中市', lng: 120.6736, lat: 24.1477 },
      { label: '彰化縣 (120.54°E)', value: '彰化縣', lng: 120.5423, lat: 24.0817 },
      { label: '南投縣 (120.69°E)', value: '南投縣', lng: 120.6865, lat: 23.9099 },
      { label: '雲林縣 (120.54°E)', value: '雲林縣', lng: 120.5445, lat: 23.7092 },
      { label: '嘉義市 (120.45°E)', value: '嘉義市', lng: 120.4491, lat: 23.4800 },
      { label: '嘉義縣 (120.29°E)', value: '嘉義縣', lng: 120.2930, lat: 23.4593 },
      { label: '臺南市 (120.20°E)', value: '臺南市', lng: 120.2000, lat: 23.0000 },
      { label: '高雄市 (120.31°E)', value: '高雄市', lng: 120.3120, lat: 22.6273 },
      { label: '屏東縣 (120.49°E)', value: '屏東縣', lng: 120.4884, lat: 22.6762 },
      { label: '宜蘭縣 (121.75°E)', value: '宜蘭縣', lng: 121.7533, lat: 24.7570 },
      { label: '花蓮縣 (121.61°E)', value: '花蓮縣', lng: 121.6068, lat: 23.9872 },
      { label: '臺東縣 (121.15°E)', value: '臺東縣', lng: 121.1456, lat: 22.7583 },
      { label: '澎湖縣 (119.58°E)', value: '澎湖縣', lng: 119.5793, lat: 23.5711 },
      { label: '金門縣 (118.32°E)', value: '金門縣', lng: 118.3226, lat: 24.4367 },
      { label: '連江縣/馬祖 (119.94°E)', value: '連江縣', lng: 119.9397, lat: 26.1602 },
    ],
  },
  {
    groupName: '港澳地區 (HK & Macau)',
    cities: [
      { label: '香港 (114.17°E)', value: '香港', lng: 114.17, lat: 22.28 },
      { label: '澳門 (113.54°E)', value: '澳門', lng: 113.54, lat: 22.19 },
    ],
  },
  {
    groupName: '大陸主要城市 (Mainland China)',
    cities: [
      { label: '北京 (116.40°E)', value: '北京', lng: 116.40, lat: 39.90 },
      { label: '上海 (121.47°E)', value: '上海', lng: 121.47, lat: 31.23 },
      { label: '廣州 (113.26°E)', value: '廣州', lng: 113.26, lat: 23.13 },
      { label: '深圳 (114.05°E)', value: '深圳', lng: 114.05, lat: 22.54 },
      { label: '天津 (117.20°E)', value: '天津', lng: 117.20, lat: 39.13 },
      { label: '重慶 (106.55°E)', value: '重慶', lng: 106.55, lat: 29.56 },
      { label: '成都 (104.06°E)', value: '成都', lng: 104.06, lat: 30.67 },
      { label: '杭州 (120.15°E)', value: '杭州', lng: 120.15, lat: 30.28 },
      { label: '南京 (118.78°E)', value: '南京', lng: 118.78, lat: 32.04 },
      { label: '武漢 (114.30°E)', value: '武漢', lng: 114.30, lat: 30.59 },
      { label: '西安 (108.95°E)', value: '西安', lng: 108.95, lat: 34.27 },
      { label: '長沙 (112.98°E)', value: '長沙', lng: 112.98, lat: 28.19 },
      { label: '鄭州 (113.62°E)', value: '鄭州', lng: 113.62, lat: 34.75 },
      { label: '瀋陽 (123.43°E)', value: '瀋陽', lng: 123.43, lat: 41.80 },
      { label: '哈爾濱 (126.63°E)', value: '哈爾濱', lng: 126.63, lat: 45.75 },
      { label: '福州 (119.30°E)', value: '福州', lng: 119.30, lat: 26.08 },
      { label: '廈門 (118.08°E)', value: '廈門', lng: 118.08, lat: 24.48 },
      { label: '昆明 (102.71°E)', value: '昆明', lng: 102.71, lat: 25.04 },
      { label: '貴陽 (106.71°E)', value: '貴陽', lng: 106.71, lat: 26.57 },
      { label: '南寧 (108.33°E)', value: '南寧', lng: 108.33, lat: 22.84 },
      { label: '海口 (110.35°E)', value: '海口', lng: 110.35, lat: 20.02 },
      { label: '蘭州 (103.73°E)', value: '蘭州', lng: 103.73, lat: 36.03 },
      { label: '西寧 (101.78°E)', value: '西寧', lng: 101.78, lat: 36.62 },
      { label: '拉薩 (91.11°E)', value: '拉薩', lng: 91.11, lat: 29.65 },
      { label: '烏魯木齊 (87.62°E)', value: '烏魯木齊', lng: 87.62, lat: 43.82 },
    ],
  },
  {
    groupName: '國際主要城市 (Global Cities)',
    cities: [
      { label: '新加坡 (103.82°E)', value: '新加坡', lng: 103.82, lat: 1.35 },
      { label: '吉隆坡 (101.68°E)', value: '吉隆坡', lng: 101.68, lat: 3.14 },
      { label: '曼谷 (100.50°E)', value: '曼谷', lng: 100.50, lat: 13.75 },
      { label: '東京 (139.69°E)', value: '東京', lng: 139.69, lat: 35.68 },
      { label: '首爾 (126.98°E)', value: '首爾', lng: 126.98, lat: 37.56 },
      { label: '倫敦 (0.12°W)', value: '倫敦', lng: -0.12, lat: 51.50 },
      { label: '巴黎 (2.35°E)', value: '巴黎', lng: 2.35, lat: 48.85 },
      { label: '紐約 (74.00°W)', value: '紐約', lng: -74.00, lat: 40.71 },
      { label: '舊金山 (122.42°W)', value: '舊金山', lng: -122.42, lat: 37.77 },
      { label: '洛杉磯 (118.24°W)', value: '洛杉磯', lng: -118.24, lat: 34.05 },
      { label: '溫哥華 (123.12°W)', value: '溫哥華', lng: -123.12, lat: 49.28 },
      { label: '多倫多 (79.38°W)', value: '多倫多', lng: -79.38, lat: 43.65 },
      { label: '雪梨 (151.21°E)', value: '雪梨', lng: 151.21, lat: -33.87 },
      { label: '墨爾本 (144.96°E)', value: '墨爾本', lng: 144.96, lat: -37.81 },
      { label: '奧克蘭 (174.76°E)', value: '奧克蘭', lng: 174.76, lat: -36.85 },
    ],
  },
];

/**
 * 計算指定公曆日期的天文均時差 (Equation of Time, EOT，單位：分鐘)
 * 公式依據地球公轉軌道離心率與黃赤交角推導之標準天文近迫式 (Spencer / Smart Formula)
 */
export function calculateEquationOfTime(year: number, month: number, day: number): number {
  const d = new Date(Date.UTC(year, month - 1, day));
  const start = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;

  // B 角度（弧度）：一年以 365.24 天為週期
  const bRad = (2 * Math.PI * (dayOfYear - 81)) / 365;

  // 均時差公式（分鐘）
  const eot = 9.87 * Math.sin(2 * bRad) - 7.53 * Math.cos(bRad) - 1.5 * Math.sin(bRad);
  return Math.round(eot * 100) / 100;
}

/**
 * 解析地理經緯度與標準經線
 */
export function resolveCoordinates(
  place?: string,
  customLng?: number | string | null,
  customLat?: number | string | null
): SolarTimeLocation {
  if (customLng !== undefined && customLng !== null && customLng !== '') {
    const numLng = Number(customLng);
    const numLat = customLat !== undefined && customLat !== null && customLat !== '' ? Number(customLat) : 25.0;
    if (
      Number.isFinite(numLng) &&
      Number.isFinite(numLat) &&
      numLng >= -180 &&
      numLng <= 180 &&
      numLat >= -90 &&
      numLat <= 90
    ) {
      // 經度位於東經 70° ~ 138° 範圍內，鐘錶時間通常採用東八區 (120°E) 中原/北京/臺灣標準時
      const stdMeridian = (numLng >= 70 && numLng <= 138) ? 120 : Math.round(numLng / 15) * 15;
      const displayLabel = `自訂經度 (${numLng >= 0 ? `${numLng}°E` : `${Math.abs(numLng)}°W`})`;
      return {
        lng: numLng,
        lat: numLat,
        city: place && place !== 'custom' && place !== '自訂經度' ? place : displayLabel,
        province: '自訂',
        stdMeridian,
      };
    }
  }

  if (place && place !== 'custom' && place !== '自訂經度') {
    const trimmed = String(place).trim();
    if (CITY_COORDINATES[trimmed]) {
      return { ...CITY_COORDINATES[trimmed], city: trimmed };
    }
    if (trimmed.length >= 2) {
      for (const [key, val] of Object.entries(CITY_COORDINATES)) {
        if (trimmed.includes(key) || key.includes(trimmed)) {
          return { ...val, city: key };
        }
      }
    }
  }

  // 預設臺灣臺北 (東八區中央經線 120°E)
  return {
    lng: 121.5654,
    lat: 25.0330,
    city: '臺北市',
    province: '臺灣',
    stdMeridian: 120,
  };
}

export interface CalculateSolarTimeParams {
  date: string | Date; // 'YYYY-MM-DD' 或 Date 物件
  hour?: number;
  minute?: number;
  place?: string;
  longitude?: number | string | null;
  latitude?: number | string | null;
  ziMode?: 'early_late' | 'next_day';
}

/**
 * 計算真太陽時 (True Solar Time)
 * 鐘錶時間 + 經度時差 (每度 4 分鐘) + 天文均時差 (EOT) = 真太陽時
 */
export function calculateTrueSolarTime(params: CalculateSolarTimeParams): SolarTimeCorrectionResult {
  let y = 1990;
  let m = 1;
  let d = 1;
  let h = params.hour ?? 12;
  let min = params.minute ?? 0;
  let dateStr = '1990-01-01';

  if (params.date instanceof Date && !isNaN(params.date.getTime())) {
    y = params.date.getFullYear();
    m = params.date.getMonth() + 1;
    d = params.date.getDate();
    if (params.hour === undefined) h = params.date.getHours();
    if (params.minute === undefined) min = params.date.getMinutes();
    dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  } else if (typeof params.date === 'string') {
    dateStr = params.date;
    const parts = params.date.split('-').map(Number);
    if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      y = parts[0];
      m = parts[1];
      d = parts[2];
    }
  }

  const coords = resolveCoordinates(params.place, params.longitude, params.latitude);

  // 1. 經度時差：每度經度差異 4 分鐘 (相對於標準時區經線，如東八區 120°E)
  const lngDiff = coords.lng - coords.stdMeridian;
  const lngOffsetMinutes = lngDiff * 4;

  // 2. 天文均時差 (EOT)
  const eotMinutes = calculateEquationOfTime(y, m, d);

  // 3. 總時差（分鐘）
  const totalOffsetMinutes = lngOffsetMinutes + eotMinutes;

  // 4. 計算校正後的真太陽時
  const safeHour = Number.isFinite(Number(h)) ? Math.max(0, Math.min(23, Number(h))) : 12;
  const safeMinute = Number.isFinite(Number(min)) ? Math.max(0, Math.min(59, Number(min))) : 0;
  const totalClockMinutes = safeHour * 60 + safeMinute;
  const validOffset = Number.isFinite(totalOffsetMinutes) ? totalOffsetMinutes : 0;
  let adjustedMinutes = totalClockMinutes + validOffset;

  const dayShift = Math.floor(adjustedMinutes / 1440);
  adjustedMinutes = ((adjustedMinutes % 1440) + 1440) % 1440;

  const solarHour = Math.floor(adjustedMinutes / 60);
  const solarMinute = Math.floor(adjustedMinutes % 60);

  // 計算調整後的公曆日期
  const adjustedDateObj = new Date(Date.UTC(y, m - 1, d + dayShift));
  const solarYear = adjustedDateObj.getUTCFullYear();
  const solarMonth = adjustedDateObj.getUTCMonth() + 1;
  const solarDay = adjustedDateObj.getUTCDate();
  const solarDateStr = `${solarYear}-${String(solarMonth).padStart(2, '0')}-${String(solarDay).padStart(2, '0')}`;

  // 時辰地支對照 (子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥)
  const SHICHEN_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const shichenIdx = Math.floor(((solarHour + 1) % 24) / 2);
  const shichenBranch = SHICHEN_BRANCHES[shichenIdx];

  // 早子時 / 夜子時判定 (23:00~23:59 晚子時/夜子時，00:00~00:59 早子時)
  let ziHourType: 'early_zi' | 'late_zi' | 'normal' = 'normal';
  if (solarHour === 0) {
    ziHourType = 'early_zi'; // 早子時
  } else if (solarHour === 23) {
    ziHourType = 'late_zi';  // 晚子時 / 夜子時
  }

  const roundedLng = Math.round(lngOffsetMinutes * 100) / 100;
  const roundedEot = Math.round(eotMinutes * 100) / 100;
  const roundedTotal = Math.round(totalOffsetMinutes * 100) / 100;

  const originalTimeStr = `${String(safeHour).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`;
  const solarTimeStr = `${String(solarHour).padStart(2, '0')}:${String(solarMinute).padStart(2, '0')}`;

  const description = `經度時差 ${roundedLng >= 0 ? '+' : ''}${roundedLng.toFixed(1)} 分鐘，均時差 ${roundedEot >= 0 ? '+' : ''}${roundedEot.toFixed(1)} 分鐘，合計校正 ${roundedTotal >= 0 ? '+' : ''}${roundedTotal.toFixed(1)} 分鐘`;

  return {
    place: coords.city,
    originalDate: dateStr,
    originalTime: originalTimeStr,
    solarDate: solarDateStr,
    solarTime: solarTimeStr,
    solarTimeFormatted: solarTimeStr,
    solarYear,
    solarMonth,
    solarDay,
    solarHour,
    solarMinute,
    shichenBranch,
    ziHourType,
    dayShift,
    longitudeDiffMinutes: roundedLng,
    equationOfTimeMinutes: roundedEot,
    totalOffsetMinutes: roundedTotal,
    location: coords,
    offsets: {
      lngOffsetMinutes: roundedLng,
      eotMinutes: roundedEot,
      totalOffsetMinutes: roundedTotal,
      description,
    },
  };
}
