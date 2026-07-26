/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Patient, WorkflowStep } from '../types';
import { Play, Check, ChevronRight, Activity, Clock, FileText, ArrowRight, CornerDownRight, User } from 'lucide-react';

interface ActiveQueuesProps {
  patients: Patient[];
  workflowSteps: WorkflowStep[];
  currentStationId: string; // The active station filter
  onSetStationId: (id: string) => void;
  onAdvancePatient: (patientId: string, notes: string) => void;
  allowedStepIds?: string[]; // The steps allowed in this workstation
}

export default function ActiveQueues({
  patients,
  workflowSteps,
  currentStationId,
  onSetStationId,
  onAdvancePatient,
  allowedStepIds,
}: ActiveQueuesProps) {
  const [patientNotes, setPatientNotes] = useState<{ [patientId: string]: string }>({});

  const activePatients = patients.filter((p) => p.status !== 'completed');

  // Filter patients based on selected station
  // If "all", show only patients in the allowed steps for this PC. Otherwise show patients in selected step.
  const filteredPatients = currentStationId === 'all' 
    ? (allowedStepIds && allowedStepIds.length > 0
        ? activePatients.filter((p) => allowedStepIds.includes(p.currentStepId))
        : activePatients)
    : activePatients.filter((p) => p.currentStepId === currentStationId);

  // Filter the available station buttons to only show what this PC handles
  const filteredStepsForTabs = allowedStepIds && allowedStepIds.length > 0
    ? workflowSteps.filter((s) => allowedStepIds.includes(s.id))
    : workflowSteps;

  const getStepName = (stepId: string) => {
    if (stepId === 'completed') return 'เสร็จสิ้นทั้งหมด';
    const step = workflowSteps.find((s) => s.id === stepId);
    return step ? step.name : 'ไม่ระบุขั้นตอน';
  };

  const getStepColorClass = (stepId: string) => {
    const step = workflowSteps.find((s) => s.id === stepId);
    if (!step) return 'bg-slate-100 text-slate-700';
    if (step.color === 'emerald') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (step.color === 'sky') return 'bg-sky-100 text-sky-800 border-sky-200';
    if (step.color === 'amber') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (step.color === 'purple') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (step.color === 'rose') return 'bg-rose-100 text-rose-800 border-rose-200';
    if (step.color === 'indigo') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    return 'bg-slate-100 text-slate-700';
  };

  const formatCitizenId = (val: string) => {
    // Hide middle digits for clinical confidentiality
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length !== 13) return val;
    return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 5)}-XXXXX-${cleaned.slice(10, 12)}-${cleaned.slice(12, 13)}`;
  };

  return (
    <div className="space-y-6">
      {/* Station Selector Bar */}
      <div id="station-selector-panel" className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-sans">
              เลือกสถานีงานเครื่องปัจจุบัน (Select Station)
            </span>
            <div className="text-sm font-bold text-gray-800 font-sans mt-0.5">
              คุณกำลังใช้งานในฐานะ: <span className="text-blue-600">
                {currentStationId === 'all' ? 'ผู้ดูแลภาพรวม (All Stations)' : getStepName(currentStationId)}
              </span>
            </div>
          </div>
        </div>

        {/* Station Selectors Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            id="btn-station-all"
            onClick={() => onSetStationId('all')}
            className={`px-3 py-1.5 rounded text-xs font-sans font-bold transition-all cursor-pointer ${
              currentStationId === 'all'
                ? 'bg-[#2C3E50] text-white shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800 border border-gray-200'
            }`}
          >
            ภาพรวมทุกแผนก
          </button>

          {filteredStepsForTabs.map((step) => (
            <button
              key={step.id}
              id={`btn-station-tab-${step.id}`}
              onClick={() => onSetStationId(step.id)}
              className={`px-3 py-1.5 rounded text-xs font-sans font-bold transition-all cursor-pointer ${
                currentStationId === step.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800 border border-gray-200'
              }`}
            >
              {step.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left column / Patient list: Spans 2 columns */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <h3 className="font-sans font-bold text-gray-800 text-sm flex items-center gap-2">
              <span>รายชื่อคิวคนไข้ที่กำลังดำเนินการ (Active Patient Queue)</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded">
                {filteredPatients.length} คน
              </span>
            </h3>

            <div className="text-[11px] text-gray-400 font-sans flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>ข้อมูลอัปเดตแบบเรียลไทม์</span>
            </div>
          </div>

          {filteredPatients.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                <User className="w-5 h-5" />
              </div>
              <h4 className="font-sans font-bold text-gray-700 text-sm">
                ไม่มีคนไข้ในแผนกนี้
              </h4>
              <p className="text-xs text-gray-400 font-sans mt-1">
                {currentStationId === 'all' 
                  ? 'ยังไม่มีคนไข้เข้ามาในระบบ กรุณาใช้ฟอร์มเพื่อบันทึกคนไข้และเปิด OPD' 
                  : 'ขณะนี้ไม่มีคนไข้ที่อยู่ในขั้นตอนการรับบริการของแผนกนี้'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPatients.map((patient) => {
                const currentStepIndex = workflowSteps.findIndex(s => s.id === patient.currentStepId);
                const nextStep = workflowSteps[currentStepIndex + 1];

                return (
                  <div
                    key={patient.id}
                    id={`patient-card-${patient.id}`}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 relative overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Progress Indicator Accent */}
                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-500" />
                    
                    <div className="sm:flex items-start justify-between gap-4">
                      {/* Left: Patient Details */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-[#2C3E50] text-white px-2 py-0.5 rounded">
                            {patient.hn}
                          </span>
                          <h4 className="font-sans font-bold text-sm text-gray-900">
                            {patient.name}
                          </h4>
                          <span className="text-xs text-gray-600 font-sans font-semibold">
                            (เพศ {patient.gender || 'ชาย'} | อายุ {patient.age} ปี)
                          </span>
                          <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 font-sans font-semibold px-2 py-0.5 rounded">
                            {patient.rights}
                          </span>

                          {/* Vital Signs & BMI & BP Badge */}
                          {(patient.weight || patient.height || patient.bmi || patient.bloodPressure || patient.pulseRate) && (
                            <span className="text-xs bg-sky-50 border border-sky-200 text-sky-900 font-sans font-bold px-2.5 py-0.5 rounded-full flex flex-wrap items-center gap-1.5">
                              <span>⚖️ {patient.weight ? `${patient.weight}kg` : ''} {patient.height ? `/ ${patient.height}cm` : ''}</span>
                              {patient.bmi && (
                                <span className="bg-sky-600 text-white px-1.5 py-0.2 rounded text-[10px] font-mono">
                                  BMI {patient.bmi} {patient.bmiCategory ? `(${patient.bmiCategory})` : ''}
                                </span>
                              )}
                              {patient.bloodPressure && (
                                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold">
                                  🩺 BP: {patient.bloodPressure}
                                </span>
                              )}
                              {patient.pulseRate && (
                                <span className="bg-rose-100 text-rose-900 border border-rose-300 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold">
                                  ❤️ Pulse: {patient.pulseRate}
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Requested Services & Quick Signal Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 py-1">
                          {/* Signal: OPD Status */}
                          {patient.opdStatus === 'opened' && (
                            <span className="text-[10px] font-sans font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                              <span>🟢 เปิด OPD แล้ว</span>
                            </span>
                          )}

                          {/* Signal: Lab Status */}
                          {patient.labStatus === 'opened' && (
                            <span className="text-[10px] font-sans font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
                              <span>🧪 เปิดแล็บ/ส่งแล็บ</span>
                            </span>
                          )}

                          {/* Signal: Procedure Status */}
                          {patient.procedureStatus === 'sent' && (
                            <span className="text-[10px] font-sans font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span>🩹 ส่งห้องหัตถการ</span>
                            </span>
                          )}

                          {/* Signal: Rights Status */}
                          {patient.rightsStatus === 'closed' && (
                            <span className="text-[10px] font-sans font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span>💳 ปิดสิทธิ์แล้ว</span>
                            </span>
                          )}

                          {/* Custom Clinical Services */}
                          {patient.requestedServices && patient.requestedServices.length > 0 && (
                            patient.requestedServices.map((srv, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[10px] font-sans font-bold bg-indigo-600 text-white px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1"
                              >
                                <span className="w-1 h-1 bg-white rounded-full"></span>
                                {srv}
                              </span>
                            ))
                          )}
                        </div>

                        {/* Quick Signal Notes if available */}
                        {patient.quickNotes && (
                          <div className="bg-sky-50 border border-sky-100 text-sky-900 px-2.5 py-1 rounded-md text-[11px] font-sans flex items-center gap-1.5">
                            <span className="font-bold text-sky-700 shrink-0">📌 โน้ตส่งซิก:</span>
                            <span className="italic">{patient.quickNotes}</span>
                          </div>
                        )}

                        <div className="text-xs text-gray-500 font-mono flex items-center gap-1.5">
                          <span className="font-semibold text-gray-600">เลขประจำตัวบัตรประชาชน:</span> 
                          <span>{formatCitizenId(patient.citizenId)}</span>
                        </div>

                        {/* Interactive Workflow Progress Timeline */}
                        <div className="py-2 border-t border-b border-gray-100 my-2">
                          <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
                            {workflowSteps.map((step, idx) => {
                              const signalChecked =
                                (idx === 0 && patient.opdStatus === 'opened') ||
                                (idx === 1 && (patient.labStatus === 'opened' || patient.labStatus === 'done')) ||
                                (idx === 2 && (patient.procedureStatus === 'sent' || patient.procedureStatus === 'done')) ||
                                (idx === 3 && patient.rightsStatus === 'closed');

                              const isCompleted = idx < currentStepIndex || signalChecked;
                              const isActive = idx === currentStepIndex && !signalChecked;

                              return (
                                <React.Fragment key={step.id}>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <div
                                      id={`patient-step-badge-${patient.id}-${idx + 1}`}
                                      className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-all ${
                                        isCompleted
                                          ? 'bg-emerald-500 text-white shadow-xs'
                                          : isActive
                                          ? 'bg-blue-600 text-white ring-2 ring-blue-100 animate-pulse'
                                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                                      }`}
                                    >
                                      {isCompleted ? '✓' : idx + 1}
                                    </div>
                                    <span
                                      className={`text-[11px] font-sans font-bold max-w-[95px] truncate ${
                                        isCompleted
                                          ? 'text-emerald-700 font-extrabold'
                                          : isActive
                                          ? 'text-blue-600'
                                          : 'text-gray-400'
                                      }`}
                                      title={step.name}
                                    >
                                      {step.name}
                                    </span>
                                  </div>
                                  {idx < workflowSteps.length - 1 && (
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>

                        {/* Logs of previous steps */}
                        {patient.history.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                              บันทึกการรักษาและการส่งต่อเวชระเบียน:
                            </span>
                            {patient.history.map((log, lIdx) => (
                              <div key={lIdx} className="text-xs text-gray-600 font-sans flex items-start gap-1">
                                <CornerDownRight className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                                <div className="text-[11px]">
                                  <span className="font-bold text-gray-700">[{log.stepName}]:</span>{' '}
                                  <span className="text-gray-800">"{log.notes || 'เสร็จสิ้นขั้นตอน'}"</span>{' '}
                                  <span className="text-[9px] text-gray-400 font-mono">
                                    ({new Date(log.completedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions (Advance queue) */}
                      <div className="mt-3 sm:mt-0 shrink-0 flex flex-col gap-2 sm:w-56 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="text-[11px] font-bold text-gray-500 font-sans flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          <span>หมายเหตุ / บันทึกส่งต่อ</span>
                        </div>

                        <input
                          type="text"
                          placeholder={
                            currentStepIndex === 0
                              ? "เช่น สิทธิ์ถูกต้อง, BP 120/80"
                              : currentStepIndex === 1
                              ? "เช่น ไข้ 38.5C, เจ็บคอมา 3 วัน"
                              : currentStepIndex === 2
                              ? "เช่น จ่ายยาพารา และ Amoxicillin"
                              : "เช่น จ่ายยาเรียบร้อย ชำระเงินแล้ว"
                          }
                          value={patientNotes[patient.id] || ''}
                          onChange={(e) =>
                              setPatientNotes({ ...patientNotes, [patient.id]: e.target.value })
                          }
                          className="w-full text-xs font-sans px-2 py-1.5 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                        />

                        <button
                          id={`btn-advance-patient-${patient.id}`}
                          onClick={() => {
                            onAdvancePatient(patient.id, patientNotes[patient.id] || '');
                            setPatientNotes({ ...patientNotes, [patient.id]: '' });
                          }}
                          className={`w-full text-xs font-sans font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1.5 text-white transition-all shadow-sm cursor-pointer ${
                            nextStep 
                              ? 'bg-blue-600 hover:bg-blue-700' 
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {nextStep ? (
                            <>
                              <span>ส่งข้อมูลต่อ → {nextStep.name}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>ปิดคิว (เสร็จสิ้นบริการ)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Info Center & Simulated Multi-tab Helper */}
        <div className="space-y-4">
          <div className="bg-[#2C3E50] text-white rounded-xl p-5 shadow-sm relative overflow-hidden border border-slate-700">
            {/* Ambient Background Graphic */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl" />

            <h3 className="font-sans font-bold text-sm text-blue-300 flex items-center gap-2 mb-3">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span>สถานะเชื่อมโยงกลุ่มในทีม</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed font-sans mb-4">
              คุณสามารถเปิดหน้าโปรแกรมนี้ในเบราว์เซอร์เดียวกัน <strong className="text-blue-400">หลายหน้าต่าง (หรือหลายเครื่องบนเครือข่ายเดียวกัน)</strong> เพื่อจำลองเป็นหน้าจอของเจ้าหน้าที่หลายคน เมื่อเจ้าหน้าที่คนหนึ่งกดส่งต่อ ข้อมูลจะคัดกรองและส่งเสียง Chime พร้อมป๊อปอัพแจ้งเตือนเด้งให้สถานีถัดไปทันที!
            </p>

            <div className="border-t border-slate-700 pt-4 space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span>ระบบเครือข่ายหลัก:</span>
                <span className="text-emerald-400 font-semibold">ONLINE (LOCAL)</span>
              </div>
              <div className="flex justify-between">
                <span>ฐานข้อมูลคิว:</span>
                <span className="text-blue-400 font-semibold">Local Storage DB</span>
              </div>
              <div className="flex justify-between">
                <span>ช่องทางเรียลไทม์:</span>
                <span className="text-blue-400 font-semibold">BroadcastChannel API</span>
              </div>
            </div>
          </div>

          {/* Quick tips about workflow config */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
            <h4 className="font-sans font-bold text-gray-800 text-xs uppercase tracking-wide">
              💡 วิธีการคีย์ข้อมูลและทำงานร่วมกัน
            </h4>
            
            <ol className="text-xs text-gray-500 font-sans space-y-2 list-decimal pl-4">
              <li>
                <strong className="text-gray-700">ลงทะเบียน:</strong> เจ้าหน้าที่ห้องบัตรคีย์ข้อมูลเปิดสิทธิ์ OPD ผ่านแท็บด้านบน
              </li>
              <li>
                <strong className="text-gray-700">พยาบาลซักประวัติ:</strong> พิมพ์ข้อมูลสัญญาณชีพ ไข้ ความดัน แล้วกดส่งซิกเสร็จสิ้น
              </li>
              <li>
                <strong className="text-gray-700">พบแพทย์/สั่งยา:</strong> แพทย์คีย์การวินิจฉัย สั่งยา แล้วกดส่งต่อไปห้องยา/การเงิน
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
