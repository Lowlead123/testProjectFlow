/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PatientHistoryLog {
  stepId: string;
  stepName: string;
  completedAt: string;
  completedByStation: string;
  notes?: string;
}

export interface Patient {
  id: string;
  hn: string; // Hospital Number
  citizenId: string; // เลขบัตรประชาชน 13 หลัก
  name: string;
  rights: string; // สิทธิ์รักษา (เช่น บัตรทอง, ประกันสังคม, ข้าราชการ, ชำระเงินเอง)
  age: number;
  gender?: 'ชาย' | 'หญิง' | 'อื่นๆ';
  weight?: number; // น้ำหนัก (กก.)
  height?: number; // ส่วนสูง (ซม.)
  bmi?: number; // ค่า BMI (คำนวณอัตโนมัติ)
  bmiCategory?: string; // แปลผล BMI (ผอม, ปกติ, น้ำหนักเกิน, อ้วนระดับ 1, อ้วนระดับ 2)
  bloodPressure?: string; // ความดันโลหิต (เช่น 120/80 mmHg)
  pulseRate?: number; // ชีพจร / อัตราการเต้นของหัวใจ (ครั้ง/นาที)
  currentStepId: string; // ID ของขั้นตอนปัจจุบัน หรือ 'completed'
  status: 'waiting' | 'processing' | 'completed';
  createdAt: string;
  updatedAt: string;
  history: PatientHistoryLog[];
  requestedServices?: string[]; // รายการบริการ/ซิกงานส่งเพิ่ม (เช่น เจาะเลือด, ตรวจ EKG)
  opdStatus?: 'opened' | 'pending'; // สถานะ "เปิด OPD แล้ว"
  labStatus?: 'opened' | 'pending' | 'done'; // สถานะ "เปิดแล็บ/ห้องปฏิบัติการ"
  procedureStatus?: 'sent' | 'pending' | 'done'; // สถานะ "ส่งห้องหัตถการ"
  rightsStatus?: 'closed' | 'pending'; // สถานะ "ปิดสิทธิ์การรักษา"
  quickNotes?: string; // ข้อความส่งซิกด่วน
}

export interface ServiceTag {
  id: string;
  name: string;
}

export interface ActionLabels {
  opdStatus?: string; // default: "เปิด OPD แล้วนะ"
  labStatus?: string; // default: "เปิดแล็บ/ส่งแล็บ"
  procedureStatus?: string; // default: "ส่งห้องหัตถการ"
  rightsStatus?: string; // default: "ปิดสิทธิ์เรียบร้อย"
  requestedServices?: string; // default: "ส่งซิกบริการพิเศษ"
  quickNotes?: string; // default: "พิมพ์ข้อความส่งซิกด่วน"
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  color: string; // Tailwind color class (e.g. 'emerald', 'sky', 'amber', 'purple', 'rose', 'indigo')
  order: number;
  allowedActions?: string[]; // Allowed actions on floating overlay for this step
  actionType?: 'step_complete' | 'close_rights_discharge'; // Role of completion for this department
  actionLabel?: string; // Custom button text when completing work at this station
  prerequisiteStepIds?: string[]; // Step IDs that must be completed before this station can work
}

export interface OverlayConfig {
  opdFirstAllowedActions: string[];
  authorizedRightsCloserRole: string; // e.g. 'all' | 'intake' | 'finance' | 'admin' | stepId
  allowOtherStationsViewOnly: boolean;
  allowDeselectServices?: boolean;
  autoLinkSignalsToSteps?: boolean;
  actionLabels?: ActionLabels;
  stationPermissions?: Record<string, string[]>; // Mapping of stepId -> allowed action IDs
  stationPrerequisites?: Record<string, string[]>; // Mapping of stepId -> array of required prerequisite step IDs
  actionTypes?: Record<string, 'step_complete' | 'close_rights_discharge'>; // Mapping of stepId -> role type
  enabledSignalButtons?: string[];
  allowedStationButtons?: string[];
}

export interface PreRegisteredPatient {
  id: string;
  hn: string;
  citizenId: string;
  name: string;
  rights: string;
  age: number;
  gender?: 'ชาย' | 'หญิง' | 'อื่นๆ';
  weight?: number;
  height?: number;
  bmi?: number;
  bmiCategory?: string;
  bloodPressure?: string;
  pulseRate?: number;
  plannedServices: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncMessage {
  type: 'PATIENT_ADDED' | 'STEP_COMPLETED' | 'STEP_UPDATED' | 'SETTINGS_CHANGED' | 'PATIENT_DELETED';
  patient?: Patient;
  stepName?: string;
  nextStepName?: string;
  senderStation: string;
  timestamp: string;
}
