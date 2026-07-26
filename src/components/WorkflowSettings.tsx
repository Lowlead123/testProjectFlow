/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { WorkflowStep, ServiceTag, OverlayConfig, ActionLabels } from '../types';
import { Settings, Plus, Trash2, ArrowUp, ArrowDown, RefreshCw, Sparkles, KeyRound, ShieldCheck, Check, Info, Radio, Lock, Shield, Edit3, X, Save, Activity, Zap } from 'lucide-react';

interface WorkflowSettingsProps {
  workflowSteps: WorkflowStep[];
  onUpdateSteps: (steps: WorkflowStep[]) => void;
  onResetToDefault: () => void;
  availableServices: ServiceTag[];
  onAddService: (name: string) => void;
  onDeleteService: (id: string) => void;
  adminPasscode: string;
  onUpdatePasscode: (newPasscode: string) => void;
  overlayConfig?: OverlayConfig;
  onUpdateOverlayConfig?: (config: OverlayConfig) => void;
}

const AVAILABLE_COLORS = [
  { name: 'เขียวเข้ม', class: 'emerald' },
  { name: 'ฟ้าใส', class: 'sky' },
  { name: 'เหลืองส้ม', class: 'amber' },
  { name: 'ม่วงอ่อน', class: 'purple' },
  { name: 'แดงกุหลาบ', class: 'rose' },
  { name: 'ครามสงบ', class: 'indigo' },
];

export default function WorkflowSettings({
  workflowSteps,
  onUpdateSteps,
  onResetToDefault,
  availableServices,
  onAddService,
  onDeleteService,
  adminPasscode,
  onUpdatePasscode,
  overlayConfig,
  onUpdateOverlayConfig,
}: WorkflowSettingsProps) {
  const [newStepName, setNewStepName] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');
  const [newStepColor, setNewStepColor] = useState('sky');
  const [error, setError] = useState('');

  // Step Editing State
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editStepName, setEditStepName] = useState('');
  const [editStepDesc, setEditStepDesc] = useState('');
  const [editStepColor, setEditStepColor] = useState('sky');
  const [editStepActionLabel, setEditStepActionLabel] = useState('');
  const [editStepActionType, setEditStepActionType] = useState<'step_complete' | 'close_rights_discharge'>('step_complete');
  const [editStepPrereqs, setEditStepPrereqs] = useState<string[]>([]);

  // New Step State
  const [newStepActionLabel, setNewStepActionLabel] = useState('');
  const [newStepActionType, setNewStepActionType] = useState<'step_complete' | 'close_rights_discharge'>('step_complete');
  const [newStepPrereqs, setNewStepPrereqs] = useState<string[]>([]);

  // Passcode States
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [passcodeSuccess, setPasscodeSuccess] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // New Service Tag State
  const [newServiceName, setNewServiceName] = useState('');
  const [serviceError, setServiceError] = useState('');

  const handleAddServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServiceError('');
    if (!newServiceName.trim()) {
      setServiceError('กรุณาระบุชื่อรายการบริการ');
      return;
    }
    if (availableServices.some((s) => s.name.trim().toLowerCase() === newServiceName.trim().toLowerCase())) {
      setServiceError('มีรายการบริการชื่อนี้ในระบบแล้ว');
      return;
    }
    onAddService(newServiceName.trim());
    setNewServiceName('');
  };

  const handleChangePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError('');
    setPasscodeSuccess('');

    if (currentPasscode !== adminPasscode) {
      setPasscodeError('รหัสผ่านแอดมินเดิมไม่ถูกต้อง');
      return;
    }

    if (!newPasscode.trim()) {
      setPasscodeError('รหัสผ่านใหม่ต้องไม่ว่างเปล่า');
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setPasscodeError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }

    onUpdatePasscode(newPasscode.trim());
    setPasscodeSuccess('เปลี่ยนรหัสลับผ่านสำเร็จแล้ว!');
    setCurrentPasscode('');
    setNewPasscode('');
    setConfirmPasscode('');
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepName.trim()) {
      setError('กรุณาระบุชื่อขั้นตอน');
      return;
    }

    const nextOrder = workflowSteps.length > 0 ? Math.max(...workflowSteps.map(s => s.order || 0)) + 1 : 1;
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      name: newStepName.trim(),
      description: newStepDesc.trim() || 'ไม่มีคำอธิบายเพิ่มเติม',
      color: newStepColor,
      order: nextOrder,
      actionLabel: newStepActionLabel.trim() || `คีย์บันทึก ${newStepName.trim()} เรียบร้อย`,
      actionType: newStepActionType,
      prerequisiteStepIds: newStepPrereqs,
    };

    try {
      await onUpdateSteps([...workflowSteps, newStep]);

      // Sync prerequisite map in overlayConfig
      if (overlayConfig && onUpdateOverlayConfig) {
        onUpdateOverlayConfig({
          ...overlayConfig,
          stationPrerequisites: {
            ...(overlayConfig.stationPrerequisites || {}),
            [newStep.id]: newStepPrereqs,
          },
          actionTypes: {
            ...(overlayConfig.actionTypes || {}),
            [newStep.id]: newStepActionType,
          }
        });
      }

      setNewStepName('');
      setNewStepDesc('');
      setNewStepColor('sky');
      setNewStepActionLabel('');
      setNewStepActionType('step_complete');
      setNewStepPrereqs([]);
      setError('');
    } catch (err: any) {
      console.error('Add step error:', err);
      setError('ไม่สามารถเพิ่มขั้นตอนได้: ' + (err?.message || 'โปรดลองอีกครั้ง'));
    }
  };

  const handleStartEditStep = (step: WorkflowStep) => {
    setEditingStepId(step.id);
    setEditStepName(step.name);
    setEditStepDesc(step.description);
    setEditStepColor(step.color);
    setEditStepActionLabel(step.actionLabel || `คีย์บันทึก ${step.name} เรียบร้อย`);
    setEditStepActionType(step.actionType || (step.id.includes('right') || step.name.includes('ปิดสิทธิ์') ? 'close_rights_discharge' : 'step_complete'));
    setEditStepPrereqs(step.prerequisiteStepIds || overlayConfig?.stationPrerequisites?.[step.id] || []);
  };

  const handleSaveStepEdit = async (id: string) => {
    if (!editStepName.trim()) return;
    const updated = workflowSteps.map((s) => {
      if (s.id === id) {
        return {
          ...s,
          name: editStepName.trim(),
          description: editStepDesc.trim() || 'ไม่มีคำอธิบายเพิ่มเติม',
          color: editStepColor,
          actionLabel: editStepActionLabel.trim(),
          actionType: editStepActionType,
          prerequisiteStepIds: editStepPrereqs,
        };
      }
      return s;
    });

    try {
      await onUpdateSteps(updated);

      if (overlayConfig && onUpdateOverlayConfig) {
        onUpdateOverlayConfig({
          ...overlayConfig,
          stationPrerequisites: {
            ...(overlayConfig.stationPrerequisites || {}),
            [id]: editStepPrereqs,
          },
          actionTypes: {
            ...(overlayConfig.actionTypes || {}),
            [id]: editStepActionType,
          }
        });
      }

      setEditingStepId(null);
    } catch (err: any) {
      console.error('Save step edit error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err?.message || 'โปรดลองอีกครั้ง'));
    }
  };

  const handleDeleteStep = async (id: string) => {
    if (workflowSteps.length <= 1) {
      alert('คุณต้องมีขั้นตอนในระบบการทำงานอย่างน้อย 1 ขั้นตอน');
      return;
    }
    const updated = workflowSteps.filter(s => s.id !== id).map((s, idx) => ({
      ...s,
      order: idx + 1
    }));
    try {
      await onUpdateSteps(updated);
    } catch (err: any) {
      console.error('Delete step error:', err);
      alert('เกิดข้อผิดพลาดในการลบขั้นตอน: ' + (err?.message || 'โปรดลองอีกครั้ง'));
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= workflowSteps.length) return;

    const copy = [...workflowSteps];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    // Recalculate order values
    const updated = copy.map((s, idx) => ({
      ...s,
      order: idx + 1
    }));
    try {
      await onUpdateSteps(updated);
    } catch (err: any) {
      console.error('Move step error:', err);
      alert('เกิดข้อผิดพลาดในการเปลี่ยนลำดับ: ' + (err?.message || 'โปรดลองอีกครั้ง'));
    }
  };

  return (
    <div id="workflow-settings-container" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 relative overflow-hidden">
      {/* Visual Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />

      <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded text-blue-600">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-sm text-gray-900">
              ตั้งค่าขั้นตอนเวิร์กโฟลว์ (Workflow Steps)
            </h2>
            <p className="text-xs text-gray-500 font-sans mt-0.5">
              กำหนดขั้นตอนการทำงานเพื่อจัดหมวดหมู่และส่งต่อเวชระเบียนภายในหน่วยงานหลัก
            </p>
          </div>
        </div>

        <button
          id="btn-reset-workflow"
          onClick={onResetToDefault}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 font-bold px-3 py-1.5 rounded hover:bg-gray-50 transition-colors border border-gray-200 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          คืนค่าเริ่มต้น
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Step List */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-sans mb-1">
            ลำดับขั้นตอนปฏิบัติการปัจจุบัน ({workflowSteps.length} ขั้นตอน)
          </h3>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {workflowSteps.map((step, index) => {
              // Color mapping helper
              let colorClass = 'bg-slate-100 border-slate-200 text-slate-700';
              if (step.color === 'emerald') colorClass = 'bg-emerald-50 border-emerald-200 text-emerald-800';
              if (step.color === 'sky') colorClass = 'bg-sky-50 border-sky-200 text-sky-800';
              if (step.color === 'amber') colorClass = 'bg-amber-50 border-amber-200 text-amber-800';
              if (step.color === 'purple') colorClass = 'bg-purple-50 border-purple-200 text-purple-800';
              if (step.color === 'rose') colorClass = 'bg-rose-50 border-rose-200 text-rose-800';
              if (step.color === 'indigo') colorClass = 'bg-indigo-50 border-indigo-200 text-indigo-800';

              const isEditing = editingStepId === step.id;

              return (
                <div
                  key={step.id}
                  id={`step-row-${step.id}`}
                  className="p-3 rounded border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-all group"
                >
                  {isEditing ? (
                    <div className="space-y-3 bg-white p-3 rounded-lg border border-sky-300 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-700 font-sans flex items-center gap-1">
                          <Edit3 className="w-3.5 h-3.5" /> แก้ไขชื่อขั้นตอน #{index + 1}
                        </span>
                        <button
                          onClick={() => setEditingStepId(null)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">ชื่อขั้นตอน/ห้องทำงาน:</label>
                          <input
                            type="text"
                            value={editStepName}
                            onChange={(e) => setEditStepName(e.target.value)}
                            className="w-full border border-gray-300 rounded px-2.5 py-1.5 font-sans outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">คำอธิบายเพิ่มเติม:</label>
                          <input
                            type="text"
                            value={editStepDesc}
                            onChange={(e) => setEditStepDesc(e.target.value)}
                            className="w-full border border-gray-300 rounded px-2.5 py-1.5 font-sans outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">ข้อความบนปุ่มหน้าต่างลอย (Pop-up Action Label):</label>
                          <input
                            type="text"
                            placeholder="เช่น คีย์เปิด OPD เรียบร้อย"
                            value={editStepActionLabel}
                            onChange={(e) => setEditStepActionLabel(e.target.value)}
                            className="w-full border border-gray-300 rounded px-2.5 py-1.5 font-sans outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">บทบาทหน้าที่เมื่อกดปุ่ม (Signal Action Role):</label>
                          <select
                            value={editStepActionType}
                            onChange={(e) => setEditStepActionType(e.target.value as any)}
                            className="w-full border border-gray-300 rounded px-2.5 py-1.5 font-sans outline-none focus:border-sky-500 bg-white"
                          >
                            <option value="step_complete">🟢 บันทึกเสร็จสิ้นประจำแผนก (Normal Step Complete)</option>
                            <option value="close_rights_discharge">💳 ปุ่มพิเศษ: ปิดสิทธิ์ / สิ้นสุดบริการทั้งหมด (Case Completed)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">เงื่อนไขการรอคิว (ต้องผ่านแผนกเหล่านี้ก่อน):</label>
                          <div className="flex flex-wrap gap-2 bg-gray-50 p-2 rounded border border-gray-200">
                            {workflowSteps.filter(s => s.id !== step.id).map(otherStep => (
                              <label key={otherStep.id} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editStepPrereqs.includes(otherStep.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditStepPrereqs([...editStepPrereqs, otherStep.id]);
                                    } else {
                                      setEditStepPrereqs(editStepPrereqs.filter(id => id !== otherStep.id));
                                    }
                                  }}
                                  className="w-3.5 h-3.5 rounded text-sky-600"
                                />
                                <span>{otherStep.name}</span>
                              </label>
                            ))}
                            {workflowSteps.filter(s => s.id !== step.id).length === 0 && (
                              <span className="text-[10px] text-gray-400">ไม่มีขั้นตอนอื่นในระบบ</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">ธีมสีสเตชั่น:</label>
                          <div className="flex flex-wrap gap-1.5">
                            {AVAILABLE_COLORS.map((c) => (
                              <button
                                key={c.class}
                                type="button"
                                onClick={() => setEditStepColor(c.class)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  editStepColor === c.class
                                    ? 'bg-sky-600 text-white border-sky-600'
                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                                }`}
                              >
                                {c.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingStepId(null)}
                            className="px-3 py-1 bg-gray-200 text-gray-700 font-bold text-[11px] rounded"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveStepEdit(step.id)}
                            className="px-3 py-1 bg-sky-600 text-white font-bold text-[11px] rounded flex items-center gap-1 shadow-xs"
                          >
                            <Save className="w-3.5 h-3.5" />
                            บันทึกแก้ไข
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-slate-200 text-slate-700 text-xs font-bold rounded-full">
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-bold text-xs text-gray-900">
                              {step.name}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-sans font-semibold uppercase ${colorClass}`}>
                              {step.color}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 font-sans mt-0.5 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleStartEditStep(step)}
                          className="p-1 rounded border border-gray-200 bg-white text-sky-600 hover:bg-sky-50 hover:border-sky-300 transition-colors cursor-pointer"
                          title="แก้ไขชื่อขั้นตอนและสี"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Up */}
                        <button
                          id={`btn-move-up-${step.id}`}
                          disabled={index === 0}
                          onClick={() => handleMove(index, 'up')}
                          className={`p-1 rounded transition-all ${
                            index === 0
                              ? 'text-slate-300 border-transparent bg-transparent cursor-not-allowed'
                              : 'text-slate-500 border border-gray-200 bg-white hover:text-slate-850 hover:border-gray-300 cursor-pointer'
                          }`}
                          title="เลื่อนขึ้น"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Down */}
                        <button
                          id={`btn-move-down-${step.id}`}
                          disabled={index === workflowSteps.length - 1}
                          onClick={() => handleMove(index, 'down')}
                          className={`p-1 rounded transition-all ${
                            index === workflowSteps.length - 1
                              ? 'text-slate-300 border-transparent bg-transparent cursor-not-allowed'
                              : 'text-slate-500 border border-gray-200 bg-white hover:text-slate-850 hover:border-gray-300 cursor-pointer'
                          }`}
                          title="เลื่อนลง"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          id={`btn-delete-step-${step.id}`}
                          onClick={() => handleDeleteStep(step.id)}
                          className="p-1 rounded border border-gray-200 bg-white text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                          title="ลบขั้นตอน"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Add New Step */}
        <div className="lg:col-span-5 bg-gray-50/50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <h3 className="font-sans font-bold text-xs text-gray-700 uppercase tracking-wide">
              เพิ่มขั้นตอนการทำงานใหม่ (Add Step)
            </h3>
          </div>

          <form onSubmit={handleAddStep} className="space-y-3">
            {/* Step Name */}
            <div>
              <label htmlFor="newStepName" className="block text-[11px] font-bold text-gray-600 mb-1 font-sans">
                ชื่อขั้นตอน <span className="text-rose-500">*</span>
              </label>
              <input
                id="newStepName"
                type="text"
                placeholder="เช่น วัดสัญญาณชีพ/ซักประวัติ"
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                className="w-full font-sans text-xs px-3 py-2 rounded border border-gray-200 bg-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Step Description */}
            <div>
              <label htmlFor="newStepDesc" className="block text-[11px] font-bold text-gray-600 mb-1 font-sans">
                รายละเอียดหน้าที่ / คำอธิบาย
              </label>
              <textarea
                id="newStepDesc"
                rows={2}
                placeholder="เช่น วัดไข้ วัดความดัน สรุปอาการเบื้องต้นให้แพทย์"
                value={newStepDesc}
                onChange={(e) => setNewStepDesc(e.target.value)}
                className="w-full font-sans text-xs px-3 py-1.5 rounded border border-gray-200 bg-white outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            {/* Action Button Label */}
            <div>
              <label htmlFor="newStepActionLabel" className="block text-[11px] font-bold text-gray-600 mb-1 font-sans">
                ข้อความบนปุ่มกดส่งซิก (Action Button Label)
              </label>
              <input
                id="newStepActionLabel"
                type="text"
                placeholder="เช่น บันทึกคีย์ข้อมูลเสร็จแล้ว"
                value={newStepActionLabel}
                onChange={(e) => setNewStepActionLabel(e.target.value)}
                className="w-full font-sans text-xs px-3 py-1.5 rounded border border-gray-200 bg-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Action Role */}
            <div>
              <label htmlFor="newStepActionType" className="block text-[11px] font-bold text-gray-600 mb-1 font-sans">
                บทบาทเมื่อกดปุ่ม (Action Role)
              </label>
              <select
                id="newStepActionType"
                value={newStepActionType}
                onChange={(e) => setNewStepActionType(e.target.value as any)}
                className="w-full font-sans text-xs px-3 py-1.5 rounded border border-gray-200 bg-white outline-none focus:border-blue-500 transition-colors"
              >
                <option value="step_complete">🟢 บันทึกเสร็จสิ้นประจำแผนก</option>
                <option value="close_rights_discharge">💳 ปุ่มพิเศษ: ปิดสิทธิ์ / สิ้นสุดบริการทั้งหมด (Case Completed)</option>
              </select>
            </div>

            {/* Prerequisites */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1 font-sans">
                เงื่อนไขการรอคิว (ต้องผ่านแผนกเหล่านี้ก่อน)
              </label>
              <div className="space-y-1 bg-white p-2 rounded border border-gray-200 max-h-24 overflow-y-auto">
                {workflowSteps.map((step) => (
                  <label key={step.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStepPrereqs.includes(step.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewStepPrereqs([...newStepPrereqs, step.id]);
                        } else {
                          setNewStepPrereqs(newStepPrereqs.filter((id) => id !== step.id));
                        }
                      }}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-[11px] font-semibold">{step.name}</span>
                  </label>
                ))}
                {workflowSteps.length === 0 && (
                  <p className="text-[10px] text-gray-400">ยังไม่มีขั้นตอนก่อนหน้า</p>
                )}
              </div>
            </div>

            {/* Color Select */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1.5 font-sans">
                ธีมสีของสถานี (Badge Color)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {AVAILABLE_COLORS.map((col) => {
                  let badgeColor = 'bg-slate-100';
                  if (col.class === 'emerald') badgeColor = 'bg-emerald-500';
                  if (col.class === 'sky') badgeColor = 'bg-sky-500';
                  if (col.class === 'amber') badgeColor = 'bg-amber-500';
                  if (col.class === 'purple') badgeColor = 'bg-purple-500';
                  if (col.class === 'rose') badgeColor = 'bg-rose-500';
                  if (col.class === 'indigo') badgeColor = 'bg-indigo-500';

                  const isSelected = newStepColor === col.class;

                  return (
                    <button
                      key={col.class}
                      id={`btn-color-select-${col.class}`}
                      type="button"
                      onClick={() => setNewStepColor(col.class)}
                      className={`flex items-center gap-1 p-1.5 rounded border text-[10px] font-sans font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 text-blue-800 ring-1 ring-blue-100'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${badgeColor}`} />
                      <span>{col.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="text-rose-500 text-[10px] font-sans">{error}</p>
            )}

            <button
              id="btn-add-step"
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-sans font-bold text-xs py-2 rounded transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มเข้าในเวิร์กโฟลว์</span>
            </button>
          </form>
        </div>
      </div>

      {/* SERVICE TAGS MANAGEMENT SECTION */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <div className="bg-gradient-to-r from-indigo-50/60 to-purple-50/60 border border-indigo-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-800">
                  ตั้งค่ารายการบริการที่จุดคัดกรอง / รายการบริการส่งซิกพิเศษ <span className="text-rose-500">*</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-sans">
                  (Requested Services & Planned Clinical Signals คือชุดข้อมูลเดียวกัน สามารถเพิ่ม ลบ หรือแก้ไขรายการได้)
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full self-start sm:self-auto">
              ทั้งหมด {availableServices.length} รายการ
            </span>
          </div>

          {/* Service Tag Badges Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 font-sans">
              รายการบริการที่มีในระบบปัจจุบัน (คลิกปุ่มถังขยะเพื่อลบออก):
            </label>

            {availableServices.length === 0 ? (
              <div className="p-4 bg-white/80 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400 font-sans">
                ยังไม่มีรายการบริการในระบบ กรุณาพิมพ์ชื่อเพื่อเพิ่มรายการบริการใหม่ด้านล่าง
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto p-1">
                {availableServices.map((srv) => (
                  <div
                    key={srv.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:border-indigo-300 transition-all group"
                  >
                    <span>{srv.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`คุณต้องการลบรายการบริการ "${srv.name}" ใช่หรือไม่?`)) {
                          onDeleteService(srv.id);
                        }
                      }}
                      className="p-0.5 rounded-md hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title={`ลบ ${srv.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to Add New Service Tag */}
          <form onSubmit={handleAddServiceSubmit} className="pt-2 border-t border-indigo-100">
            <label htmlFor="newServiceName" className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
              เพิ่มรายการบริการใหม่:
            </label>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                id="newServiceName"
                type="text"
                placeholder="พิมพ์ชื่อบริการ เช่น เจาะเลือด LAB, X-Ray, ทำแผล, ECG 12-Leads, ฉีดยา, พ่นยา..."
                value={newServiceName}
                onChange={(e) => {
                  setNewServiceName(e.target.value);
                  if (serviceError) setServiceError('');
                }}
                className="flex-1 font-sans text-xs px-3.5 py-2 rounded-xl border border-indigo-200 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-sans font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มรายการบริการ</span>
              </button>
            </div>
            {serviceError && (
              <p className="text-rose-600 font-bold text-xs mt-1.5 font-sans">{serviceError}</p>
            )}
          </form>
        </div>
      </div>

      {/* ADMIN LEVEL 2 CONFIG: Passcode update */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-5 space-y-4 max-w-xl mx-auto md:mx-0">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2.5">
            <KeyRound className="w-4.5 h-4.5 text-slate-700" />
            <h3 className="font-sans font-bold text-xs text-gray-800 uppercase tracking-wide">
              ตั้งค่ารหัสแอดมิน (Admin Secret Passcode)
            </h3>
          </div>

          <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
            กำหนดรหัสผ่านเพื่อจำกัดสิทธิ์เข้าถึงหน้าตั้งค่าระบบ
          </p>

          <form onSubmit={handleChangePasscode} className="space-y-3">
            <div>
              <label htmlFor="currentPasscode" className="block text-[11px] font-bold text-gray-700 mb-1 font-sans">
                รหัสผ่านปัจจุบัน <span className="text-rose-500">*</span>
              </label>
              <input
                id="currentPasscode"
                type="password"
                placeholder="ระบุรหัสเดิม (เช่น 1234)"
                value={currentPasscode}
                onChange={(e) => setCurrentPasscode(e.target.value)}
                className="w-full font-sans text-xs px-3 py-2 rounded border border-gray-300 bg-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="newPasscode" className="block text-[11px] font-bold text-gray-700 mb-1 font-sans">
                  รหัสผ่านใหม่ <span className="text-rose-500">*</span>
                </label>
                <input
                  id="newPasscode"
                  type="password"
                  placeholder="รหัสผ่านใหม่"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  className="w-full font-sans text-xs px-3 py-2 rounded border border-gray-300 bg-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="confirmPasscode" className="block text-[11px] font-bold text-gray-700 mb-1 font-sans">
                  ยืนยันรหัสผ่านใหม่ <span className="text-rose-500">*</span>
                </label>
                <input
                  id="confirmPasscode"
                  type="password"
                  placeholder="พิมพ์ยืนยันอีกครั้ง"
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  className="w-full font-sans text-xs px-3 py-2 rounded border border-gray-300 bg-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {passcodeError && (
              <p className="text-rose-500 text-[11px] font-sans font-semibold">{passcodeError}</p>
            )}

            {passcodeSuccess && (
              <p className="text-emerald-600 text-[11px] font-sans font-semibold">{passcodeSuccess}</p>
            )}

            <button
              id="btn-update-passcode"
              type="submit"
              className="w-full bg-[#2C3E50] hover:bg-slate-800 text-white font-sans font-bold text-xs py-2 rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>อัปเดตรหัสผ่านแอดมิน</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
