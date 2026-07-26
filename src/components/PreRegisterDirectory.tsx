/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PreRegisteredPatient, ServiceTag, Patient } from '../types';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import {
  UserPlus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  Send,
  Sparkles,
  Users,
  FileText,
  X,
  Save,
  Check,
  Zap,
  Activity,
  FlaskConical,
  ShieldCheck,
  Plus
} from 'lucide-react';

interface PreRegisterDirectoryProps {
  availableServices: ServiceTag[];
  activePatients: Patient[];
  onSendToOpdQueue: (prePatient: PreRegisteredPatient) => void;
}

export default function PreRegisterDirectory({
  availableServices,
  activePatients,
  onSendToOpdQueue,
}: PreRegisterDirectoryProps) {
  const [prePatients, setPrePatients] = useState<PreRegisteredPatient[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Form State
  const [hn, setHn] = useState<string>('');
  const [citizenId, setCitizenId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [rights, setRights] = useState<string>('บัตรทอง (UC)');
  const [age, setAge] = useState<string>('45');
  const [gender, setGender] = useState<'ชาย' | 'หญิง' | 'อื่นๆ'>('ชาย');
  const [selectedServices, setSelectedServices] = useState<string[]>(['เจาะเลือด (Blood Draw)']);
  const [notes, setNotes] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');

  // Subscribe to preRegisteredPatients collection in Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'preRegisteredPatients'),
      (snapshot) => {
        const list: PreRegisteredPatient[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as PreRegisteredPatient);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPrePatients(list);
      },
      (error) => {
        console.error('Error listening to preRegisteredPatients:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleToggleService = (serviceName: string) => {
    if (selectedServices.includes(serviceName)) {
      setSelectedServices(selectedServices.filter((s) => s !== serviceName));
    } else {
      setSelectedServices([...selectedServices, serviceName]);
    }
  };

  const resetForm = () => {
    setHn('');
    setCitizenId('');
    setName('');
    setRights('บัตรทอง (UC)');
    setAge('45');
    setGender('ชาย');
    setSelectedServices(['เจาะเลือด (Blood Draw)']);
    setNotes('');
    setEditingId(null);
    setFormError('');
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('กรุณากรอกชื่อ-นามสกุล คนไข้');
      return;
    }
    if (!hn.trim() && !citizenId.trim()) {
      setFormError('กรุณากรอกอย่างน้อย เลข HN หรือ เลขบัตรประชาชน');
      return;
    }

    try {
      const recordId = editingId || `pre_${Date.now()}`;
      const existingRecord = prePatients.find((p) => p.id === recordId);

      const patientData: PreRegisteredPatient = {
        id: recordId,
        hn: hn.trim() || `HN-${Math.floor(100000 + Math.random() * 900000)}`,
        citizenId: citizenId.trim() || '1100200300401',
        name: name.trim(),
        rights: rights.trim() || 'ชำระเงินเอง',
        age: parseInt(age) || 30,
        gender,
        plannedServices: selectedServices,
        notes: notes.trim(),
        createdAt: existingRecord ? existingRecord.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'preRegisteredPatients', recordId), patientData);
      setFormSuccess(editingId ? 'บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว!' : 'เพิ่มข้อมูลคนไข้ลงทะเบียนล่วงหน้าสำเร็จ!');
      setTimeout(() => setFormSuccess(''), 3000);
      resetForm();
    } catch (err: any) {
      console.error('Error saving pre-registered patient:', err);
      setFormError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleStartEdit = (patient: PreRegisteredPatient) => {
    setEditingId(patient.id);
    setHn(patient.hn);
    setCitizenId(patient.citizenId);
    setName(patient.name);
    setRights(patient.rights);
    setAge(patient.age.toString());
    setGender(patient.gender || 'ชาย');
    setSelectedServices(patient.plannedServices || []);
    setNotes(patient.notes || '');
    setFormError('');
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, patientName: string) => {
    if (confirm(`คุณต้องการลบข้อมูลคนไข้ "${patientName}" ออกจากรายชื่อล่วงหน้าหรือไม่?`)) {
      try {
        await deleteDoc(doc(db, 'preRegisteredPatients', id));
      } catch (e) {
        console.error('Error deleting pre-registered patient:', e);
      }
    }
  };

  const handleSeedExamples = async () => {
    const examples: Omit<PreRegisteredPatient, 'id'>[] = [
      {
        hn: 'HN-670101',
        citizenId: '1100200345671',
        name: 'นายสมชาย ใจดี',
        rights: 'บัตรทอง (UC)',
        age: 52,
        plannedServices: ['เจาะเลือด (Blood Draw)', 'ตรวจคลื่นไฟฟ้าหัวใจ (EKG)'],
        notes: 'นัดตรวจเบาหวานประจำปี เจาะเลือดงดน้ำงดอาหาร',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        hn: 'HN-670102',
        citizenId: '3400500123456',
        name: 'นางวิไล พรหมแก้ว',
        rights: 'ประกันสังคม (SSO)',
        age: 44,
        plannedServices: ['ตรวจโควิด ATK (COVID-19 Test)', 'ฉีดยา (Injection)'],
        notes: 'มีไข้สูง 38.5C มีอาการไอและเจ็บคอ',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        hn: 'HN-670103',
        citizenId: '1509900012891',
        name: 'นายประเสริฐ สุขสวัสดิ์',
        rights: 'ข้าราชการ/เบิกตรง (OFC)',
        age: 68,
        plannedServices: ['เจาะเลือด (Blood Draw)', 'ตรวจคลื่นไฟฟ้าหัวใจ (EKG)', 'ทำแผล/ตัดไหม (Wound Dressing)'],
        notes: 'นัดติดตามอาการความดันโลหิตสูง + ล้างแผลที่ขา',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    for (const ex of examples) {
      const id = `pre_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'preRegisteredPatients', id), { id, ...ex });
    }
  };

  // Filter patients by search term
  const filteredPatients = prePatients.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.hn.toLowerCase().includes(term) ||
      p.citizenId.toLowerCase().includes(term) ||
      p.rights.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md border border-sky-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-sky-500/20 text-sky-300 rounded-xl border border-sky-400/30">
              <Users className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold font-sans tracking-tight">
                ทะเบียนคนไข้ลงทะเบียนล่วงหน้า (Pre-Registration Directory)
              </h2>
              <p className="text-xs text-sky-200 mt-0.5">
                ลงข้อมูลคนไข้, HN, เลขบัตรประชาชน และเลือกบริการส่งซิกไว้ล่วงหน้า (ข้อมูลจะถูกดึงไปที่จุดคัดกรองเพื่อวัดส่วนสูง/น้ำหนักและเปิด OPD เข้าคิวส่งสัญญาณ Popout)
              </p>
            </div>
          </div>
        </div>

        {prePatients.length === 0 && (
          <button
            onClick={handleSeedExamples}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>สร้างตัวอย่างข้อมูลคนไข้ล่วงหน้า</span>
          </button>
        )}
      </div>

      {/* Form & Add Section */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-2">
            {editingId ? <Edit3 className="w-4 h-4 text-sky-600" /> : <UserPlus className="w-4 h-4 text-sky-600" />}
            <span>{editingId ? 'แก้ไขข้อมูลคนไข้ลงทะเบียนล่วงหน้า' : 'เพิ่มคนไข้ลงทะเบียนล่วงหน้า (Pre-Register Patient)'}</span>
          </h3>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
            >
              <X className="w-3.5 h-3.5" /> ยกเลิกการแก้ไข
            </button>
          )}
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
            ⚠️ {formError}
          </div>
        )}

        {formSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {formSuccess}
          </div>
        )}

        <form onSubmit={handleSavePatient} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {/* HN */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                เลข HN <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={hn}
                onChange={(e) => setHn(e.target.value)}
                placeholder="เช่น HN-670109"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-sky-500 font-mono text-xs"
              />
            </div>

            {/* Citizen ID */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                เลขบัตรประชาชน (13 หลัก)
              </label>
              <input
                type="text"
                value={citizenId}
                onChange={(e) => setCitizenId(e.target.value)}
                placeholder="เช่น 1100200300401"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-sky-500 font-mono text-xs"
              />
            </div>

            {/* Name */}
            <div className="md:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ชื่อ-นามสกุล <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น นายกิตติศักดิ์ มีสุข"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-sky-500 text-xs font-bold"
              />
            </div>

            {/* Rights */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                สิทธิ์การรักษา
              </label>
              <select
                value={rights}
                onChange={(e) => setRights(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-sky-500 text-xs font-semibold bg-white"
              >
                <option value="บัตรทอง (UC)">บัตรทอง (UC)</option>
                <option value="ประกันสังคม (SSO)">ประกันสังคม (SSO)</option>
                <option value="ข้าราชการ/เบิกตรง (OFC)">ข้าราชการ/เบิกตรง (OFC)</option>
                <option value="ชำระเงินเอง (Cash)">ชำระเงินเอง (Cash)</option>
                <option value="ประกันสุขภาพเอกชน">ประกันสุขภาพเอกชน</option>
                <option value="รัฐวิสาหกิจ">รัฐวิสาหกิจ</option>
              </select>
            </div>

            {/* Age & Gender */}
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  อายุ (ปี)
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="0"
                  max="120"
                  className="w-full border border-slate-300 rounded-xl px-2 py-2 outline-none focus:border-sky-500 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  เพศ
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-xl px-2 py-2 outline-none focus:border-sky-500 text-xs font-semibold bg-white"
                >
                  <option value="ชาย">ชาย</option>
                  <option value="หญิง">หญิง</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Planned Services Checkboxes */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>รายการบริการส่งซิกพิเศษที่คาดว่าจะต้องทำ (Planned Clinical Signals):</span>
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              {availableServices.map((service) => {
                const isSelected = selectedServices.includes(service.name);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleToggleService(service.name)}
                    className={`px-3 py-1.5 rounded-xl border font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-sky-300'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                    <span>{service.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes & Submit */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม (เช่น ประวัติแพ้ยา, อาการสำคัญ, นัดตรวจเฉพาะทาง)"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-300 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{editingId ? 'บันทึกแก้ไขข้อมูล' : 'ลงทะเบียนบันทึกข้อมูลล่วงหน้า'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* List & Search Section */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-800 font-sans">
              รายชื่อคนไข้ลงทะเบียนล่วงหน้าทั้งหมด ({prePatients.length} ราย)
            </h3>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาด้วย ชื่อ, HN, เลขบัตร..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
            {searchTerm ? 'ไม่พบข้อมูลคนไข้ที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลคนไข้ลงทะเบียนล่วงหน้า กดสร้างเพื่อเพิ่มข้อมูล'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase bg-slate-50">
                  <th className="py-2.5 px-3">HN / เลขบัตร</th>
                  <th className="py-2.5 px-3">ชื่อ-นามสกุล / อายุ</th>
                  <th className="py-2.5 px-3">สิทธิ์การรักษา</th>
                  <th className="py-2.5 px-3">รายการส่งซิกบริการที่เลือกไว้</th>
                  <th className="py-2.5 px-3">สถานะคิวปัจจุบัน</th>
                  <th className="py-2.5 px-3 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPatients.map((patient) => {
                  const isInActiveQueue = activePatients.some((p) => p.hn === patient.hn || p.citizenId === patient.citizenId);

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        <div>{patient.hn}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{patient.citizenId}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{patient.name}</div>
                        <div className="text-[10px] text-slate-500">อายุ {patient.age} ปี</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700">
                          {patient.rights}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {patient.plannedServices && patient.plannedServices.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {patient.plannedServices.map((svc, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-sky-50 border border-sky-200 text-sky-700 font-medium text-[10px] rounded"
                              >
                                {svc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">- ไม่ได้ติ๊กบริการ -</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {isInActiveQueue ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] rounded flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            เปิด OPD เข้าคิวแล้ว
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] rounded flex items-center gap-1 w-fit">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            รอจุดคัดกรองดึงข้อมูล
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartEdit(patient)}
                            className="px-2.5 py-1 text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>แก้ไข</span>
                          </button>

                          <button
                            onClick={() => handleDelete(patient.id, patient.name)}
                            className="p-1 text-rose-500 border border-slate-200 rounded-lg hover:bg-rose-50 transition-colors"
                            title="ลบข้อมูล"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
