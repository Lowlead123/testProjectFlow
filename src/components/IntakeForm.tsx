/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Patient, WorkflowStep, ServiceTag, PreRegisteredPatient } from '../types';
import { calculateBMI, BMIResult } from '../utils/bmi';
import { 
  ClipboardCheck, 
  Search, 
  User, 
  CreditCard, 
  HeartPulse, 
  Calendar, 
  Scale, 
  Ruler, 
  Sparkles, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  UserCheck,
  Activity,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface IntakeFormProps {
  onAddPatient: (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'history'>) => void;
  workflowSteps: WorkflowStep[];
  patients: Patient[];
  prePatients?: PreRegisteredPatient[];
  availableServices: ServiceTag[];
}

export default function IntakeForm({
  onAddPatient,
  workflowSteps,
  patients,
  prePatients = [],
  availableServices,
}: IntakeFormProps) {
  // Search & Auto-fill State
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<(Patient | PreRegisteredPatient)[]>([]);
  const [selectedHn, setSelectedHn] = useState<string | undefined>(undefined);
  const [autofillMsg, setAutofillMsg] = useState<string | null>(null);

  // Screening Form Fields
  const [citizenId, setCitizenId] = useState('');
  const [name, setName] = useState('');
  const [rights, setRights] = useState('บัตรทอง (UC)');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'ชาย' | 'หญิง' | 'อื่นๆ'>('ชาย');
  
  // Vitals & Physical Exam
  const [weight, setWeight] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [pulseRate, setPulseRate] = useState<number | ''>('');
  
  // Pre-registered list UI
  const [isPreListExpanded, setIsPreListExpanded] = useState(false);
  
  // Clinical Services
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [quickNotes, setQuickNotes] = useState('');

  // BMI Result
  const [bmiResult, setBmiResult] = useState<BMIResult | null>(null);

  // Validation Errors & Focus Refs
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [firstErrorKey, setFirstErrorKey] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form Field Refs for auto-scroll
  const citizenIdRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLDivElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const heightRef = useRef<HTMLInputElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);

  // Calculate BMI whenever weight or height changes
  useEffect(() => {
    const w = typeof weight === 'number' ? weight : 0;
    const h = typeof height === 'number' ? height : 0;
    if (w > 0 && h > 0) {
      setBmiResult(calculateBMI(w, h));
    } else {
      setBmiResult(null);
    }
  }, [weight, height]);

  // Format Citizen ID
  const formatCitizenId = (val: string) => {
    const numbers = val.replace(/\D/g, '').slice(0, 13);
    let formatted = '';
    if (numbers.length > 0) formatted += numbers.substring(0, 1);
    if (numbers.length > 1) formatted += '-' + numbers.substring(1, 5);
    if (numbers.length > 5) formatted += '-' + numbers.substring(5, 10);
    if (numbers.length > 10) formatted += '-' + numbers.substring(10, 12);
    if (numbers.length > 12) formatted += '-' + numbers.substring(12, 13);
    return formatted;
  };

  // Search logic for Pre-registered or Past Patients
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    const cleanTerm = term.trim().toLowerCase();
    const cleanDigits = term.replace(/\D/g, '');

    if (cleanTerm.length < 2 && cleanDigits.length < 3) {
      setSuggestions([]);
      return;
    }

    const matches: (Patient | PreRegisteredPatient)[] = [];
    const seenHns = new Set<string>();

    // 1. Search Pre-registered patients first
    for (const p of prePatients) {
      const pId = p.citizenId.replace(/\D/g, '');
      const pName = p.name.toLowerCase();
      const pHn = p.hn.toLowerCase();

      if ((cleanDigits && pId.includes(cleanDigits)) || pName.includes(cleanTerm) || pHn.includes(cleanTerm)) {
        if (!seenHns.has(p.hn)) {
          seenHns.add(p.hn);
          matches.push(p);
        }
      }
    }

    // 2. Search Existing Active/Historical Patients
    for (const p of patients) {
      const pId = p.citizenId.replace(/\D/g, '');
      const pName = p.name.toLowerCase();
      const pHn = p.hn.toLowerCase();

      if ((cleanDigits && pId.includes(cleanDigits)) || pName.includes(cleanTerm) || pHn.includes(cleanTerm)) {
        if (!seenHns.has(p.hn)) {
          seenHns.add(p.hn);
          matches.push(p);
        }
      }
    }

    setSuggestions(matches.slice(0, 5));
  };

  // Filter pre-registered patients waiting to be screened
  const pendingPrePatients = prePatients.filter((pre) => {
    const isAlreadyInQueue = patients.some(
      (p) => (p.hn && p.hn === pre.hn) || (p.citizenId && p.citizenId.replace(/\D/g, '') === pre.citizenId.replace(/\D/g, ''))
    );
    return !isAlreadyInQueue;
  });

  // Select patient suggestion or pre-registered card
  const handleSelectPatient = (p: Patient | PreRegisteredPatient) => {
    setCitizenId(formatCitizenId(p.citizenId));
    setName(p.name);
    setRights(p.rights || 'บัตรทอง (UC)');
    setAge(p.age || '');
    if (p.gender) setGender(p.gender as any);
    if (p.weight) setWeight(p.weight);
    if (p.height) setHeight(p.height);
    if (p.bloodPressure) setBloodPressure(p.bloodPressure);
    if (p.pulseRate) setPulseRate(p.pulseRate);
    
    // Services
    const svcs = (p as PreRegisteredPatient).plannedServices || (p as Patient).requestedServices || [];
    if (svcs.length > 0) {
      setSelectedServices(svcs);
    }

    // Notes
    const notesVal = (p as PreRegisteredPatient).notes || (p as Patient).quickNotes || '';
    if (notesVal) {
      setQuickNotes(notesVal);
    }

    setSelectedHn(p.hn);
    setSuggestions([]);
    setSearchTerm('');

    setAutofillMsg(`ดึงข้อมูลคนไข้ล่วงหน้า: ${p.name} (HN: ${p.hn}, สิทธิ์: ${p.rights}) เรียบร้อยแล้ว! กรุณาระบุน้ำหนัก, ส่วนสูง, ความดัน และชีพจร แล้วกดส่งเปิด OPD`);
    setTimeout(() => setAutofillMsg(null), 5000);
  };

  // Strict Validation Logic
  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    const rawId = citizenId.replace(/\D/g, '');
    if (!rawId && !selectedHn) {
      newErrors.citizenId = 'กรุณากรอกเลขบัตรประชาชน (13 หลัก) หรือเลือกค้นหาด้วย HN';
    } else if (rawId && rawId.length !== 13) {
      newErrors.citizenId = 'เลขบัตรประชาชนต้องมีครบ 13 หลัก';
    }

    if (!name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อ-นามสกุล คนไข้';
    }

    if (age === '' || Number(age) < 0 || Number(age) > 130) {
      newErrors.age = 'กรุณากรอกอายุ (0-130 ปี)';
    }

    if (!gender) {
      newErrors.gender = 'กรุณาเลือกเพศของคนไข้';
    }

    if (weight === '' || Number(weight) <= 0 || Number(weight) > 300) {
      newErrors.weight = 'กรุณากรอกน้ำหนัก (กก.) ให้ถูกต้อง';
    }

    if (height === '' || Number(height) <= 0 || Number(height) > 250) {
      newErrors.height = 'กรุณากรอกส่วนสูง (ซม.) ให้ถูกต้อง';
    }

    if (selectedServices.length === 0) {
      newErrors.services = 'กรุณาติ๊กเลือกอย่างน้อย 1 รายการบริการที่คนไข้ต้องรับบริการ';
    }

    setErrors(newErrors);

    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      setFirstErrorKey(firstKey);

      // Auto scroll and focus to the first missing field!
      if (firstKey === 'citizenId' && citizenIdRef.current) {
        citizenIdRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        citizenIdRef.current.focus();
      } else if (firstKey === 'name' && nameRef.current) {
        nameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameRef.current.focus();
      } else if (firstKey === 'age' && ageRef.current) {
        ageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ageRef.current.focus();
      } else if (firstKey === 'gender' && genderRef.current) {
        genderRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (firstKey === 'weight' && weightRef.current) {
        weightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        weightRef.current.focus();
      } else if (firstKey === 'height' && heightRef.current) {
        heightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        heightRef.current.focus();
      } else if (firstKey === 'services' && servicesRef.current) {
        servicesRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      return false;
    }

    setFirstErrorKey(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const firstStep = workflowSteps[0]?.id || 'step_1';
    const secondStep = workflowSteps[1]?.id || 'step_2';

    const rawWeight = weight !== '' ? Number(weight) : undefined;
    const rawHeight = height !== '' ? Number(height) : undefined;
    const bmiCalc = (rawWeight && rawHeight) ? calculateBMI(rawWeight, rawHeight) : null;

    // Auto-generate HN if not from existing
    const year = new Date().getFullYear() + 543;
    const generatedHn = selectedHn || `HN-${year.toString().slice(2)}-${Math.floor(1000 + Math.random() * 9000)}`;

    onAddPatient({
      hn: generatedHn,
      citizenId: citizenId.replace(/\D/g, ''),
      name: name.trim(),
      rights,
      age: Number(age) || 0,
      gender,
      weight: rawWeight,
      height: rawHeight,
      bmi: bmiCalc?.bmi,
      bmiCategory: bmiCalc?.category,
      bloodPressure: bloodPressure.trim() || undefined,
      pulseRate: pulseRate !== '' ? Number(pulseRate) : undefined,
      currentStepId: secondStep, // Move directly to 2nd station (e.g. OPD room / triage)
      status: 'waiting',
      opdStatus: 'pending',
      requestedServices: selectedServices,
      quickNotes: quickNotes.trim(),
    });

    // Reset Form
    setSearchTerm('');
    setCitizenId('');
    setName('');
    setRights('บัตรทอง (UC)');
    setAge('');
    setGender('ชาย');
    setWeight('');
    setHeight('');
    setBloodPressure('');
    setPulseRate('');
    setSelectedServices([]);
    setQuickNotes('');
    setSelectedHn(undefined);
    setErrors({});
    setBmiResult(null);

    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 5000);

    const containerEl = document.getElementById('screening-point-container');
    if (containerEl) {
      containerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div id="screening-point-container" className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 sm:p-6 relative overflow-hidden space-y-5">
      {/* Visual Accent Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-500 via-indigo-600 to-emerald-500" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100 shadow-xs">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-base text-slate-900 flex items-center gap-2">
              <span>จุดคัดกรองคนไข้ (Screening Point)</span>
              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] rounded-full font-bold">
                iPad / Tablet Ready 📱
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              ค้นหาข้อมูลล่วงหน้า บันทึกสัญญาณชีพ ชั่งน้ำหนัก วัดส่วนสูง คำนวณ BMI และติ๊กรายการบริการเพื่อเปิด OPD
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {submitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-sans flex items-center gap-3 animate-fadeIn shadow-xs">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-emerald-950">ส่งเปิด OPD สำเร็จ!</div>
            <div className="text-emerald-700 mt-0.5">ข้อมูลคัดกรองและสัญญาณชีพถูกส่งเข้าคิว OPD และแผนกที่เกี่ยวข้องเรียบร้อยแล้ว</div>
          </div>
        </div>
      )}

      {/* Pending Pre-Registered Patients Quick Selection Bar (Collapsible to save Tablet space) */}
      {pendingPrePatients.length > 0 && (
        <div className="bg-gradient-to-r from-sky-50 via-indigo-50/40 to-emerald-50/40 border border-sky-200/80 rounded-2xl overflow-hidden shadow-2xs transition-all">
          <button
            type="button"
            onClick={() => setIsPreListExpanded(!isPreListExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-sky-100/50 transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-600 text-white rounded-xl shadow-2xs shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-sky-950 font-sans flex items-center gap-2">
                  <span>คนไข้ลงทะเบียนล่วงหน้ารอคัดกรองวันนี้</span>
                  <span className="px-2 py-0.5 bg-sky-600 text-white text-[10px] rounded-full font-mono font-bold">
                    {pendingPrePatients.length} ราย
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                  {isPreListExpanded 
                    ? 'แตะเพื่อย่อซ่อนรายชื่อ (เพื่อประหยัดพื้นที่แท็ปเลต)' 
                    : 'แตะที่นี่เพื่อขยายดูรายชื่อ และเลือกดึงข้อมูลมาคัดกรอง'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 bg-white border border-sky-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-sky-50 shrink-0">
              <span>{isPreListExpanded ? 'ซ่อนรายชื่อ' : 'ดูรายชื่อ'}</span>
              {isPreListExpanded ? <ChevronUp className="w-4 h-4 text-sky-600" /> : <ChevronDown className="w-4 h-4 text-sky-600" />}
            </div>
          </button>

          {isPreListExpanded && (
            <div className="p-3 border-t border-sky-200/60 bg-white/80 space-y-2 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {pendingPrePatients.map((p) => {
                  const isSelected = selectedHn === p.hn;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                        isSelected
                          ? 'bg-sky-600 text-white border-sky-600 shadow-sm ring-2 ring-sky-300'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-sky-300 hover:bg-sky-50/80 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div>
                          <div className={`font-bold text-xs flex items-center gap-1.5 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            <span>{p.name}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                              isSelected ? 'bg-sky-700 text-sky-100' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {p.hn}
                            </span>
                          </div>
                          <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                            {p.citizenId} | {p.gender || 'ชาย'}, {p.age} ปี
                          </div>
                        </div>

                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isSelected ? 'bg-white text-sky-800' : 'bg-sky-100 text-sky-800'
                        }`}>
                          {p.rights || 'บัตรทอง'}
                        </span>
                      </div>

                      {p.plannedServices && p.plannedServices.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {p.plannedServices.map((svc, i) => (
                            <span
                              key={i}
                              className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                                isSelected ? 'bg-sky-700/80 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              }`}
                            >
                              {svc}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Search for Pre-registered Patients */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
        <label className="block text-xs font-bold text-slate-700 font-sans flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Search className="w-4 h-4 text-sky-600" />
            <span>ค้นหาข้อมูลคนไข้ที่ลงทะเบียนไว้ล่วงหน้า (เลขบัตร / HN / ชื่อ):</span>
          </span>
          <span className="text-[10px] text-sky-600 font-normal">แตะเลือกเพื่อดึงข้อมูลด่วน</span>
        </label>
        
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="พิมพ์ เลขบัตรประชาชน 13 หลัก, HN หรือ ชื่อคนไข้..."
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 font-sans transition-all"
          />

          {/* Search Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100 p-1.5">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPatient(p)}
                  className="w-full text-left p-2.5 hover:bg-sky-50 rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-slate-900 group-hover:text-sky-700 flex items-center gap-2">
                      <span>{p.name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                        {p.hn}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      เลขบัตร: {p.citizenId} | อายุ: {p.age} ปี
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 bg-sky-100 text-sky-800 rounded-lg shrink-0">
                    {p.rights || 'ดึงข้อมูล'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {autofillMsg && (
          <div className="p-2.5 bg-sky-100 border border-sky-200 text-sky-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-fadeIn">
            <UserCheck className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{autofillMsg}</span>
          </div>
        )}
      </div>

      {/* Validation Error Summary Alert */}
      {Object.keys(errors).length > 0 && (
        <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 text-xs font-sans space-y-1 animate-shake">
          <div className="font-bold flex items-center gap-1.5 text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>กรุณากรอกข้อมูลในจุดคัดกรองให้ครบถ้วนก่อนส่งเปิด OPD (บังคับทุกช่อง):</span>
          </div>
          <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-0.5 pl-1">
            {Object.values(errors).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient General Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {/* Citizen ID */}
          <div id="citizenId">
            <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>เลขบัตรประชาชน (13 หลัก) <span className="text-rose-500">*</span></span>
              {selectedHn && (
                <span className="text-[9px] font-mono font-bold bg-sky-600 text-white px-1.5 py-0.2 rounded">
                  HN: {selectedHn}
                </span>
              )}
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={citizenIdRef}
                type="text"
                placeholder="1-2345-67890-12-3"
                value={citizenId}
                onChange={(e) => {
                  setCitizenId(formatCitizenId(e.target.value));
                  if (errors.citizenId) setErrors(prev => ({ ...prev, citizenId: '' }));
                }}
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-mono transition-all outline-none ${
                  errors.citizenId
                    ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                    : 'border-slate-300 focus:border-sky-500 bg-slate-50/50 focus:bg-white'
                }`}
              />
            </div>
            {errors.citizenId && <p className="text-[10px] text-rose-500 mt-1">{errors.citizenId}</p>}
          </div>

          {/* Name */}
          <div id="name">
            <label className="block font-bold text-slate-700 mb-1">
              ชื่อ - นามสกุล คนไข้ <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={nameRef}
                type="text"
                placeholder="เช่น นายสมชาย ใจดี"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-bold transition-all outline-none ${
                  errors.name
                    ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                    : 'border-slate-300 focus:border-sky-500 bg-slate-50/50 focus:bg-white'
                }`}
              />
            </div>
            {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* Age & Gender */}
          <div className="grid grid-cols-2 gap-2">
            <div id="age">
              <label className="block font-bold text-slate-700 mb-1">
                อายุ (ปี) <span className="text-rose-500">*</span>
              </label>
              <input
                ref={ageRef}
                type="number"
                placeholder="45"
                value={age}
                min="0"
                max="130"
                onChange={(e) => {
                  setAge(e.target.value === '' ? '' : Number(e.target.value));
                  if (errors.age) setErrors(prev => ({ ...prev, age: '' }));
                }}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-bold transition-all outline-none ${
                  errors.age
                    ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                    : 'border-slate-300 focus:border-sky-500 bg-slate-50/50 focus:bg-white'
                }`}
              />
              {errors.age && <p className="text-[10px] text-rose-500 mt-1">{errors.age}</p>}
            </div>

            <div id="gender" ref={genderRef}>
              <label className="block font-bold text-slate-700 mb-1">
                เพศ <span className="text-rose-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-2 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold outline-none focus:border-sky-500"
              >
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>
          </div>

          {/* Rights */}
          <div className="md:col-span-3">
            <label className="block font-bold text-slate-700 mb-1">
              สิทธิ์การรักษา <span className="text-rose-500">*</span>
            </label>
            <select
              value={rights}
              onChange={(e) => setRights(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold outline-none focus:border-sky-500"
            >
              <option value="บัตรทอง (UC)">บัตรทอง (UC)</option>
              <option value="ประกันสังคม (SSO)">ประกันสังคม (SSO)</option>
              <option value="ข้าราชการ/เบิกตรง (OFC)">ข้าราชการ/เบิกตรง (OFC)</option>
              <option value="ชำระเงินเอง (Cash)">ชำระเงินเอง (Cash)</option>
              <option value="ประกันสุขภาพเอกชน">ประกันสุขภาพเอกชน</option>
              <option value="รัฐวิสาหกิจ">รัฐวิสาหกิจ</option>
            </select>
          </div>
        </div>

        {/* Vital Signs & BMI Section (ชั่งน้ำหนัก วัดส่วนสูง ความดัน ชีพจร คำนวณ BMI) */}
        <div className="bg-sky-50/60 border border-sky-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-sky-100 pb-2">
            <span className="font-bold text-xs text-sky-900 flex items-center gap-1.5 font-sans">
              <Scale className="w-4 h-4 text-sky-600" />
              <span>วัดสัญญาณชีพ & ประเมินดัชนีมวลกาย (Weight, Height, Blood Pressure, Pulse & BMI)</span>
            </span>
            <span className="text-[10px] text-sky-600 font-semibold">* บังคับระบุน้ำหนัก/ส่วนสูง</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Weight */}
            <div id="weight">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                น้ำหนัก (กก. / kg) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Scale className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={weightRef}
                  type="number"
                  step="0.1"
                  placeholder="เช่น 65.5"
                  value={weight}
                  onChange={(e) => {
                    setWeight(e.target.value === '' ? '' : Number(e.target.value));
                    if (errors.weight) setErrors(prev => ({ ...prev, weight: '' }));
                  }}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-bold transition-all outline-none ${
                    errors.weight
                      ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                      : 'border-slate-300 focus:border-sky-500 bg-white'
                  }`}
                />
              </div>
              {errors.weight && <p className="text-[10px] text-rose-500 mt-1">{errors.weight}</p>}
            </div>

            {/* Height */}
            <div id="height">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ส่วนสูง (ซม. / cm) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Ruler className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={heightRef}
                  type="number"
                  step="0.5"
                  placeholder="เช่น 170"
                  value={height}
                  onChange={(e) => {
                    setHeight(e.target.value === '' ? '' : Number(e.target.value));
                    if (errors.height) setErrors(prev => ({ ...prev, height: '' }));
                  }}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-bold transition-all outline-none ${
                    errors.height
                      ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200'
                      : 'border-slate-300 focus:border-sky-500 bg-white'
                  }`}
                />
              </div>
              {errors.height && <p className="text-[10px] text-rose-500 mt-1">{errors.height}</p>}
            </div>

            {/* Blood Pressure */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ความดันโลหิต (mmHg)
              </label>
              <div className="relative">
                <Activity className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="เช่น 127/78"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:border-sky-500 bg-white text-xs font-mono font-bold transition-all outline-none"
                />
              </div>
              <span className="text-[9px] text-slate-400 font-mono">SYS / DIA (เช่น 120/80)</span>
            </div>

            {/* Pulse Rate */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชีพจร (bpm)
              </label>
              <div className="relative">
                <HeartPulse className="w-4 h-4 text-rose-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  placeholder="เช่น 72"
                  value={pulseRate}
                  onChange={(e) => setPulseRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:border-sky-500 bg-white text-xs font-mono font-bold transition-all outline-none"
                />
              </div>
              <span className="text-[9px] text-slate-400 font-mono">ครั้ง / นาที</span>
            </div>

            {/* Live Calculated BMI Display */}
            <div className="sm:col-span-2 lg:col-span-1 bg-white p-3 rounded-xl border border-sky-200 shadow-2xs flex flex-col justify-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                ผลคำนวณ BMI อัตโนมัติ:
              </div>

              {bmiResult ? (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black font-mono text-slate-900">
                      {bmiResult.bmi}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">kg/m²</span>
                  </div>
                  <div className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold inline-block ${bmiResult.colorClass}`}>
                    {bmiResult.category}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  ระบุน้ำหนัก & ส่วนสูง
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Requested Services Checkboxes (ติ๊กว่า รับบริการอะไรบ้าง) */}
        <div id="services" ref={servicesRef} className={`p-4 rounded-2xl border transition-all space-y-2 ${
          errors.services ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-200' : 'bg-indigo-50/40 border-indigo-200'
        }`}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-sans">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>รายการบริการที่รับบริการที่จุดคัดกรอง (Requested Services) <span className="text-rose-500">*</span></span>
            </label>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
              เลือกได้มากกว่า 1 ข้อ
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            ติ๊กเลือกแผนกหรือหัตถการที่คนไข้ต้องรับบริการในวันนี้ เพื่อส่งสัญญาณเปิด OPD และเรียงคิวเข้าแผนกอัตโนมัติ
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {availableServices.map((svc) => {
              const isChecked = selectedServices.includes(svc.name);
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => {
                    if (isChecked) {
                      setSelectedServices(selectedServices.filter(s => s !== svc.name));
                    } else {
                      setSelectedServices([...selectedServices, svc.name]);
                    }
                    if (errors.services) setErrors(prev => ({ ...prev, services: '' }));
                  }}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none active:scale-98 ${
                    isChecked
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                    isChecked ? 'bg-white text-indigo-600 border-white' : 'bg-slate-50 border-slate-300'
                  }`}>
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="truncate">{svc.name}</span>
                </button>
              );
            })}
          </div>

          {errors.services && (
            <p className="text-rose-600 font-bold text-xs pt-1">{errors.services}</p>
          )}
        </div>

        {/* Quick Notes / Chief Complaint */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            อาการสำคัญ / หมายเหตุส่งสัญญาณเพิ่มเติม (Optional)
          </label>
          <input
            type="text"
            placeholder="เช่น ปวดศีรษะมีไข้สูง 2 วัน, นัดเจาะเลือดงดน้ำอาหาร, แพ้ยาพาราเซตามอล..."
            value={quickNotes}
            onChange={(e) => setQuickNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-sky-500 bg-slate-50/50 focus:bg-white"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 active:scale-[0.99] text-white font-sans font-bold text-sm py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          <span>ส่งเปิด OPD และเข้าคิวตรวจ</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </form>
    </div>
  );
}
