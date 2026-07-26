/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { WorkflowStep } from '../types';
import { Monitor, Check, Sparkles, ShieldAlert, Activity, ClipboardList, Database, Laptop } from 'lucide-react';

interface StandbyWizardProps {
  workflowSteps: WorkflowStep[];
  onSaveStandby: (stations: string[]) => void;
  onClose?: () => void;
  initialSelected?: string[];
}

export default function StandbyWizard({
  workflowSteps,
  onSaveStandby,
  onClose,
  initialSelected = []
}: StandbyWizardProps) {
  // If we have initial selections, use them, otherwise default to all for easy start
  const [selected, setSelected] = useState<string[]>(() => {
    if (initialSelected.length > 0) return initialSelected;
    // Default to everything if it's first configuration
    return ['intake', ...workflowSteps.map(s => s.id), 'database'];
  });

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(item => item !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const applyPreset = (presetType: 'intake_nurse' | 'doctor' | 'pharmacist' | 'admin') => {
    if (presetType === 'intake_nurse') {
      // Registrar + Triage Nurse: Intake + Step 1 (ซักประวัติ)
      const firstStepId = workflowSteps[0]?.id || 'step_1';
      setSelected(['intake', firstStepId]);
    } else if (presetType === 'doctor') {
      // Doctor: Step 2 or 3 (typically the second or third step depending on order)
      // Find step that contains 'แพทย์' or 'ตรวจ' or index 1 or 2
      const doctorStep = workflowSteps.find(s => s.name.includes('แพทย์') || s.name.includes('ตรวจ')) || workflowSteps[1];
      setSelected(doctorStep ? [doctorStep.id] : []);
    } else if (presetType === 'pharmacist') {
      // Cashier/Pharmacy: Last step
      const lastStep = workflowSteps[workflowSteps.length - 1];
      setSelected(lastStep ? [lastStep.id] : []);
    } else if (presetType === 'admin') {
      // Admin: Everything
      setSelected(['intake', ...workflowSteps.map(s => s.id), 'database']);
    }
  };

  const handleSave = () => {
    if (selected.length === 0) {
      alert('กรุณาเลือกสถานีงานอย่างน้อย 1 สถานี เพื่อเตรียมสแตนบายรอรับคิวคนไข้');
      return;
    }
    onSaveStandby(selected);
  };

  return (
    <div id="standby-wizard-backdrop" className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-scaleUp max-h-[90vh] overflow-y-auto">
        
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-50 transition-colors text-xs font-sans cursor-pointer"
          >
            ✕ ปิดหน้าต่าง
          </button>
        )}

        {/* Header Title */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Laptop className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-lg sm:text-xl font-sans font-bold text-slate-900 flex items-center justify-center gap-2">
            <span>ตั้งค่าสถานีงานเครื่องปัจจุบัน (Device Standby Selection)</span>
            <Sparkles className="w-5 h-5 text-indigo-500" />
          </h2>
          <p className="text-xs text-slate-500 font-sans max-w-lg mx-auto">
            กรุณาเลือกหน้าที่การทำงานของคอมพิวเตอร์เครื่องนี้ เพื่อจัดสรรมุมมอง และสแตนบายรอรับคิวคนไข้ตามหน้าที่ได้อย่างถูกต้อง มีความเหมาะสม ไม่ปะปนกับแผนกอื่น
          </p>
        </div>

        {/* Quick Presets */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 space-y-2">
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
            ⚡ เลือกบทบาทการทำงานด่วน (Quick Presets):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => applyPreset('intake_nurse')}
              className="px-3 py-2 text-xs font-bold font-sans bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-slate-200 hover:border-blue-300 rounded-lg shadow-2xs cursor-pointer transition-all"
            >
              ห้องบัตร & ซักประวัติ
            </button>
            <button
              onClick={() => applyPreset('doctor')}
              className="px-3 py-2 text-xs font-bold font-sans bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 rounded-lg shadow-2xs cursor-pointer transition-all"
            >
              ห้องตรวจแพทย์
            </button>
            <button
              onClick={() => applyPreset('pharmacist')}
              className="px-3 py-2 text-xs font-bold font-sans bg-white hover:bg-purple-50 text-purple-700 hover:text-purple-800 border border-slate-200 hover:border-purple-300 rounded-lg shadow-2xs cursor-pointer transition-all"
            >
              ห้องยา & การเงิน
            </button>
            <button
              onClick={() => applyPreset('admin')}
              className="px-3 py-2 text-xs font-bold font-sans bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-2xs cursor-pointer transition-all"
            >
              ทุกแผนก (ภาพรวม)
            </button>
          </div>
        </div>

        {/* Custom Station Checkbox List */}
        <div className="space-y-3 mb-8">
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
            🛠️ กำหนดหน้าต่างทำงานรวมกันตามต้องการ (Custom Combination):
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Intake */}
            <button
              onClick={() => toggleSelect('intake')}
              className={`p-3 border rounded-xl text-left font-sans transition-all flex items-start gap-3 cursor-pointer ${
                selected.includes('intake')
                  ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-400'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                selected.includes('intake') ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-350 bg-white'
              }`}>
                {selected.includes('intake') && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <div className="space-y-0.5">
                <span className="block font-bold text-xs text-slate-900 flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5 text-blue-500" />
                  <span>ระบบลงทะเบียนเปิด OPD</span>
                </span>
                <span className="block text-[10px] text-slate-400 leading-normal">
                  สำหรับเจ้าหน้าที่เวชระเบียน ห้องบัตร ขึ้นทะเบียนคนไข้ใหม่ ตรวจสิทธิ์ บันทึก HN
                </span>
              </div>
            </button>

            {/* 2. Workflow Steps */}
            {workflowSteps.map((step, idx) => {
              const isSel = selected.includes(step.id);
              return (
                <button
                  key={step.id}
                  onClick={() => toggleSelect(step.id)}
                  className={`p-3 border rounded-xl text-left font-sans transition-all flex items-start gap-3 cursor-pointer ${
                    isSel
                      ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-400'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                    isSel ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-350 bg-white'
                  }`}>
                    {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="space-y-0.5">
                    <span className="block font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] text-slate-500 font-bold">
                        {idx + 1}
                      </span>
                      <span>คิวสถานี: {step.name}</span>
                    </span>
                    <span className="block text-[10px] text-slate-400 leading-normal">
                      {step.description} (สแตนบายคอยรับช่วงผู้ป่วยส่งต่อ แยกรักษาตามคิวสิทธิ์)
                    </span>
                  </div>
                </button>
              );
            })}

            {/* 3. Database Viewer */}
            <button
              onClick={() => toggleSelect('database')}
              className={`p-3 border rounded-xl text-left font-sans transition-all flex items-start gap-3 cursor-pointer ${
                selected.includes('database')
                  ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-400'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                selected.includes('database') ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-350 bg-white'
              }`}>
                {selected.includes('database') && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <div className="space-y-0.5">
                <span className="block font-bold text-xs text-slate-900 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-amber-500" />
                  <span>ฐานข้อมูลประวัติและรายงานผู้ป่วย</span>
                </span>
                <span className="block text-[10px] text-slate-400 leading-normal">
                  สำหรับเข้าถึงยอดสรุปจำนวนผู้ป่วยรายวัน กรองตามสิทธิ์ และส่งออกข้อมูลประวัติการรักษาทั้งหมด
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Warning Indicator */}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg text-[10px] leading-relaxed flex items-start gap-2 mb-6 font-sans">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">ข้อมูลสแตนบายนี้จะทำงานเฉพาะบนเครื่องนี้เท่านั้น!</strong> คุณสามารถเปิดโปรแกรมนี้จากเครื่องอื่น หรือคอมพิวเตอร์เครื่องอื่น แล้วตั้งค่าหน้าที่ที่ต่างกัน (เช่น เครื่องนึงลงทะเบียน อีกเครื่องนึงซักประวัติ อีกเครื่องตรวจแพทย์) ระบบฐานข้อมูลออนไลน์คลาวด์จะซิงค์หากันแบบเรียลไทม์ 100% ทันที
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-sans font-bold text-sm py-3 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
        >
          <Activity className="w-4.5 h-4.5" />
          <span>บันทึกและเริ่มต้นสแตนบายทำงานร่วมกัน</span>
        </button>

      </div>
    </div>
  );
}
