import pkg from 'lunar-javascript';
const { Solar } = pkg;

export interface BaziCalculationResult {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  startAge: number;
  firstDaYun: string;
}

/**
 * Calculate Bazi pillars and major cycles from birth date and time.
 * @param birthDate Date object representing birth time
 * @param gender 1 for Male (乾造), 0 for Female (坤造)
 */
export const calculateBazi = (birthDate: Date, gender: number): BaziCalculationResult => {
  const year = birthDate.getFullYear();
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();
  const hour = birthDate.getHours();
  const minute = birthDate.getMinutes();

  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const yun = eightChar.getYun(gender);
  const startAge = yun.getStartYear() + 1; // Virtual age (虛歲)
  const daYunArr = yun.getDaYun();
  
  // daYunArr[0] is often empty or represents pre-start period. 
  // daYunArr[1] is the first 10-year major cycle.
  const firstDaYun = daYunArr[1]?.getGanZhi() || '';

  return {
    yearPillar: eightChar.getYear(),
    monthPillar: eightChar.getMonth(),
    dayPillar: eightChar.getDay(),
    hourPillar: eightChar.getTime(),
    startAge,
    firstDaYun,
  };
};
