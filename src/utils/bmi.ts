/**
 * BMI Calculation & Classification Helper for Thai Medical Standards
 */

export interface BMIResult {
  bmi: number;
  category: string;
  colorClass: string;
  badgeBg: string;
  description: string;
}

export function calculateBMI(weightKg: number, heightCm: number): BMIResult | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
    return null;
  }

  const heightM = heightCm / 100;
  const rawBmi = weightKg / (heightM * heightM);
  const bmi = Math.round(rawBmi * 10) / 10; // 1 decimal place

  let category = '';
  let colorClass = '';
  let badgeBg = '';
  let description = '';

  if (bmi < 18.5) {
    category = 'น้ำหนักน้อย / ผอม';
    colorClass = 'text-amber-600 border-amber-300 bg-amber-50';
    badgeBg = 'bg-amber-500 text-white';
    description = 'น้ำหนักต่ำกว่าเกณฑ์มาตรฐาน';
  } else if (bmi >= 18.5 && bmi <= 22.9) {
    category = 'ปกติ (สุขภาพดี)';
    colorClass = 'text-emerald-700 border-emerald-300 bg-emerald-50';
    badgeBg = 'bg-emerald-600 text-white';
    description = 'อยู่ในเกณฑ์สมส่วน สุขภาพดี';
  } else if (bmi >= 23.0 && bmi <= 24.9) {
    category = 'ท้วม / น้ำหนักเกิน';
    colorClass = 'text-yellow-700 border-yellow-300 bg-yellow-50';
    badgeBg = 'bg-yellow-500 text-white';
    description = 'น้ำหนักเกินเกณฑ์มาตรฐานเบื้องต้น';
  } else if (bmi >= 25.0 && bmi <= 29.9) {
    category = 'อ้วนระดับ 1';
    colorClass = 'text-orange-700 border-orange-300 bg-orange-50';
    badgeBg = 'bg-orange-500 text-white';
    description = 'อยู่ในภาวะอ้วนระดับที่ 1';
  } else {
    category = 'อ้วนระดับ 2 (อ้วนมาก)';
    colorClass = 'text-rose-700 border-rose-300 bg-rose-50';
    badgeBg = 'bg-rose-600 text-white';
    description = 'อยู่ในภาวะอ้วนระดับอันตราย';
  }

  return {
    bmi,
    category,
    colorClass,
    badgeBg,
    description,
  };
}
