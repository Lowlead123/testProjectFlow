/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Patient, WorkflowStep, PatientRight } from '../types';
import { Search, Database, Download, Trash2, Edit2, CheckCircle2, AlertCircle, FileSpreadsheet, Eye, X, Check } from 'lucide-react';

interface DatabaseViewerProps {
  patients: Patient[];
  workflowSteps: WorkflowStep[];
  availablePatientRights?: PatientRight[];
  onDeletePatient: (id: string) => void;
  onEditPatient: (patient: Patient) => void;
}

export default function DatabaseViewer({ patients, workflowSteps, availablePatientRights = [], onDeletePatient, onEditPatient }: DatabaseViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [rightsFilter, setRightsFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Tab control inside Database: 'search' | 'reports'
  const [dbTab, setDbTab] = useState<'search' | 'reports'>('search');
  
  // Date picker state for Daily Reports (default to local today YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const local = new Date();
    const yyyy = local.getFullYear();
    const mm = String(local.getMonth() + 1).padStart(2, '0');
    const dd = String(local.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Edit state
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editName, setEditName] = useState('');
  const [editCitizenId, setEditCitizenId] = useState('');
  const [editAge, setEditAge] = useState<number>(0);
  const [editRights, setEditRights] = useState('');

  // Filtering patients for raw database search
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = 
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.citizenId.includes(searchTerm) ||
      patient.hn.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && patient.status !== 'completed') ||
      (statusFilter === 'completed' && patient.status === 'completed');

    const matchesRights = 
      rightsFilter === 'all' || 
      patient.rights === rightsFilter;

    return matchesSearch && matchesStatus && matchesRights;
  });

  // Filtering patients specifically for the selected date (Daily Report)
  const dailyPatients = patients.filter((p) => {
    if (!p.createdAt) return false;
    const pDate = new Date(p.createdAt);
    const yyyy = pDate.getFullYear();
    const mm = String(pDate.getMonth() + 1).padStart(2, '0');
    const dd = String(pDate.getDate()).padStart(2, '0');
    const pDateStr = `${yyyy}-${mm}-${dd}`;
    return pDateStr === selectedDate;
  });

  const dailyCompleted = dailyPatients.filter((p) => p.status === 'completed');
  const dailyActive = dailyPatients.filter((p) => p.status !== 'completed');

  // Group rights breakdown for the selected day
  const dailyRightsCounts = dailyPatients.reduce((acc, p) => {
    acc[p.rights] = (acc[p.rights] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const getStepName = (stepId: string) => {
    if (stepId === 'completed') return 'เสร็จสิ้นทั้งหมด';
    const step = workflowSteps.find((s) => s.id === stepId);
    return step ? step.name : 'ไม่ระบุขั้นตอน';
  };

  // Export to CSV helper for complete database
  const handleExportCSV = () => {
    if (patients.length === 0) {
      alert('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    let csvContent = "\uFEFF";
    csvContent += "Hospital Number (HN),เลขประจำตัวประชาชน,ชื่อ-นามสกุล,อายุ,สิทธิ์การรักษา,ขั้นตอนล่าสุด,สถานะ,วันที่ลงทะเบียน,วันที่แก้ไขล่าสุด\n";

    patients.forEach((p) => {
      const stepName = getStepName(p.currentStepId);
      const statusText = p.status === 'completed' ? 'เสร็จสิ้นบริการ' : 'กำลังรับบริการ';
      const row = [
        `"${p.hn}"`,
        `"${p.citizenId}"`,
        `"${p.name}"`,
        p.age,
        `"${p.rights}"`,
        `"${stepName}"`,
        `"${statusText}"`,
        `"${new Date(p.createdAt).toLocaleString('th-TH')}"`,
        `"${new Date(p.updatedAt).toLocaleString('th-TH')}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `OPD_Database_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to CSV helper for single selected date
  const handleExportDailyCSV = () => {
    if (dailyPatients.length === 0) {
      alert('ไม่มีข้อมูลในวันที่เลือกเพื่อส่งออก');
      return;
    }

    let csvContent = "\uFEFF";
    csvContent += `รายงานผู้ป่วยมาใช้บริการประจำวันที่ ${selectedDate}\n`;
    csvContent += "Hospital Number (HN),เลขประจำตัวประชาชน,ชื่อ-นามสกุล,อายุ,สิทธิ์การรักษา,ขั้นตอนล่าสุด,สถานะ,เวลาลงทะเบียน\n";

    dailyPatients.forEach((p) => {
      const stepName = getStepName(p.currentStepId);
      const statusText = p.status === 'completed' ? 'เสร็จสิ้นบริการ' : 'กำลังรับบริการ';
      const registerTime = new Date(p.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const row = [
        `"${p.hn}"`,
        `"${p.citizenId}"`,
        `"${p.name}"`,
        p.age,
        `"${p.rights}"`,
        `"${stepName}"`,
        `"${statusText}"`,
        `"${registerTime} น."`
      ].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `OPD_Daily_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setEditName(patient.name);
    setEditCitizenId(patient.citizenId);
    setEditAge(patient.age);
    setEditRights(patient.rights);
  };

  const handleSaveEdit = () => {
    if (!editingPatient) return;
    if (!editName.trim() || !editCitizenId.trim() || editAge <= 0) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
      return;
    }

    const updated: Patient = {
      ...editingPatient,
      name: editName.trim(),
      citizenId: editCitizenId.replace(/\D/g, ''),
      age: editAge,
      rights: editRights,
      updatedAt: new Date().toISOString()
    };

    onEditPatient(updated);
    setEditingPatient(null);
  };

  return (
    <div id="database-viewer-container" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 relative overflow-hidden">
      {/* Visual Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded text-blue-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-sm text-gray-900 flex items-center gap-2">
              <span>ฐานข้อมูลระบบเวชระเบียนและประวัติ (OPD History)</span>
              <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 font-bold px-2 py-0.5 rounded">
                {patients.length} รายการทั้งหมด
              </span>
            </h2>
            <p className="text-xs text-gray-500 font-sans mt-0.5">
              ค้นหาประวัติคนไข้รายเก่าอัตโนมัติเมื่อคีย์ข้อมูล ดึงเลข HN, อายุ, สิทธิ์ และเช็คยอดการให้บริการแยกรายวัน
            </p>
          </div>
        </div>

        {dbTab === 'search' && (
          <button
            id="btn-export-database"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 bg-[#2C3E50] hover:bg-slate-800 text-white text-xs font-sans font-bold px-4 py-2.5 rounded shadow-sm transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>ส่งออกประวัติคนไข้ทั้งหมด (Excel/CSV)</span>
          </button>
        )}
      </div>

      {/* SUB-TAB NAVIGATOR */}
      <div className="flex border-b border-gray-200 mb-5 text-xs font-sans">
        <button
          onClick={() => setDbTab('search')}
          className={`px-4 py-2.5 font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            dbTab === 'search'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🔍 ค้นหาและแก้ไขประวัติคนไข้
        </button>
        <button
          onClick={() => setDbTab('reports')}
          className={`px-4 py-2.5 font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            dbTab === 'reports'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📊 รายงานสรุปประจำวัน (แยกวัน)
        </button>
      </div>

      {dbTab === 'search' ? (
        <>
          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            {/* Search */}
            <div className="relative md:col-span-2">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="ค้นหาด้วย ชื่อคนไข้, เลขบัตรประชาชน หรือ HN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full font-sans text-xs pl-9 pr-3 py-2 rounded border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="font-sans text-xs px-3 py-2 rounded border border-gray-200 outline-none transition-colors bg-white focus:border-blue-500"
            >
              <option value="all">กรองตามสถานะ: ทั้งหมด</option>
              <option value="active">กำลังรับบริการ (Active)</option>
              <option value="completed">เสร็จสิ้นบริการ (Completed)</option>
            </select>

            {/* Rights filter */}
            <select
              value={rightsFilter}
              onChange={(e) => setRightsFilter(e.target.value)}
              className="font-sans text-xs px-3 py-2 rounded border border-gray-200 outline-none transition-colors bg-white focus:border-blue-500"
            >
              <option value="all">กรองตามสิทธิ์: ทั้งหมด</option>
              {availablePatientRights && availablePatientRights.length > 0 ? (
                availablePatientRights.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))
              ) : (
                <>
                  <option value="บัตรทอง (UC)">บัตรทอง (UC)</option>
                  <option value="ประกันสังคม">ประกันสังคม</option>
                  <option value="ข้าราชการ / เบิกตรง">ข้าราชการ / เบิกตรง</option>
                  <option value="ชำระเงินเอง">ชำระเงินเอง</option>
                </>
              )}
            </select>
          </div>

          {/* Database Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-sans font-bold text-xs">
                    <th className="p-3">HN</th>
                    <th className="p-3">ชื่อ-นามสกุล</th>
                    <th className="p-3">เลขบัตรประชาชน</th>
                    <th className="p-3">อายุ</th>
                    <th className="p-3">สิทธิ์การรักษา</th>
                    <th className="p-3">ขั้นตอนล่าสุด</th>
                    <th className="p-3">สถานะบริการ</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-gray-700 font-sans text-xs">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-gray-400">
                        ไม่มีข้อมูลผู้ป่วยที่ค้นหาในระบบ
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-[#2C3E50]">
                          {patient.hn}
                        </td>
                        <td className="p-3 font-bold text-gray-900">
                          {patient.name}
                        </td>
                        <td className="p-3 font-mono text-gray-500">
                          {patient.citizenId}
                        </td>
                        <td className="p-3">
                          {patient.age} ปี
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200 font-semibold text-[10px]">
                            {patient.rights}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-gray-700">
                          {getStepName(patient.currentStepId)}
                        </td>
                        <td className="p-3">
                          {patient.status === 'completed' ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              เสร็จสิ้นบริการ
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600 font-bold text-[10px]">
                              <AlertCircle className="w-3.5 h-3.5" />
                              กำลังรับบริการ
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`btn-view-detail-${patient.id}`}
                              onClick={() => setSelectedPatient(patient)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="ดูประวัติการส่งตัว"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-edit-patient-${patient.id}`}
                              onClick={() => startEdit(patient)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                              title="แก้ไขข้อมูลเบื้องต้น"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-delete-patient-${patient.id}`}
                              onClick={() => {
                                if (confirm(`คุณต้องการลบข้อมูลประวัติของ ${patient.name} ใช่หรือไม่?`)) {
                                  onDeletePatient(patient.id);
                                }
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="ลบข้อมูล"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* DAILY REPORTS VIEW */
        <div className="space-y-5 animate-fadeIn">
          {/* Controls: Date Picker & Export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-blue-100 rounded text-blue-600 shrink-0">
                <Database className="w-4 h-4" />
              </span>
              <div>
                <label htmlFor="daily-report-date" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                  เลือกวันที่เพื่อดูข้อมูล (Daily Filter)
                </label>
                <input
                  id="daily-report-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="font-sans text-xs px-2.5 py-1.5 rounded border border-gray-200 outline-none bg-white focus:border-blue-500 font-semibold text-gray-800"
                />
              </div>
            </div>

            <button
              id="btn-export-daily-csv"
              onClick={handleExportDailyCSV}
              disabled={dailyPatients.length === 0}
              className="flex items-center justify-center gap-2 bg-[#2C3E50] hover:bg-slate-800 disabled:bg-slate-100 disabled:text-gray-400 text-white text-xs font-sans font-bold px-4 py-2.5 rounded shadow-sm transition-all cursor-pointer border border-transparent disabled:border-gray-200"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>ส่งออกรายงานวันที่เลือก ({dailyPatients.length} คน)</span>
            </button>
          </div>

          {/* Daily Summary Cards (Bento style) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 relative overflow-hidden">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">ยอดรวมผู้ป่วยวันนี้</div>
              <div className="text-2xl font-black text-slate-800 mt-1 font-mono">{dailyPatients.length} <span className="text-xs font-sans font-medium text-slate-400">คน</span></div>
              <p className="text-[10px] text-slate-400 font-sans mt-1">จำนวนคนไข้มาขึ้นทะเบียนในวันที่ {new Date(selectedDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 relative overflow-hidden">
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">เสร็จสิ้นบริการทั้งหมด</div>
              <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">{dailyCompleted.length} <span className="text-xs font-sans font-medium text-emerald-500">คน</span></div>
              <p className="text-[10px] text-emerald-600/70 font-sans mt-1">คนไข้รับการรักษาครบทุกสถานีปิดคิวเรียบร้อยแล้ว</p>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 relative overflow-hidden">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">กำลังรอรับบริการอยู่</div>
              <div className="text-2xl font-black text-blue-700 mt-1 font-mono">{dailyActive.length} <span className="text-xs font-sans font-medium text-blue-500">คน</span></div>
              <p className="text-[10px] text-blue-600/70 font-sans mt-1">คิวคนไข้ที่ค้างอยู่ที่สถานีต่างๆ ยังไม่ปิดบริการ</p>
            </div>
          </div>

          {/* Rights breakdown stats */}
          <div className="bg-slate-50/50 border border-gray-200 rounded-xl p-4 space-y-2.5">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">แยกประเภทสิทธิ์การรักษาของผู้ป่วยวันนี้ (Rights Allocation)</div>
            {dailyPatients.length === 0 ? (
              <div className="text-xs text-gray-400">ไม่มีสถิติสำหรับวันนี้</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(dailyRightsCounts).map(([right, count]) => (
                  <div key={right} className="bg-white border border-gray-150 rounded-lg p-2.5 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-500 truncate block">{right}</span>
                    <span className="text-lg font-black text-blue-600 font-mono block mt-1">{count} <span className="text-[10px] font-sans font-medium text-gray-400">คน</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Patients Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-sans font-bold text-xs">
                    <th className="p-3">เวลาขึ้นทะเบียน</th>
                    <th className="p-3">HN</th>
                    <th className="p-3">ชื่อ-นามสกุล</th>
                    <th className="p-3">อายุ</th>
                    <th className="p-3">สิทธิ์รักษา</th>
                    <th className="p-3">สถานะล่าสุด</th>
                    <th className="p-3 text-center">ประวัติส่งตัว</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-gray-700 font-sans text-xs">
                  {dailyPatients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-gray-400">
                        ไม่มีคนไข้มาใช้บริการในวันที่เลือก
                      </td>
                    </tr>
                  ) : (
                    dailyPatients.map((patient) => {
                      const registerTime = new Date(patient.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-gray-500">
                            {registerTime} น.
                          </td>
                          <td className="p-3 font-mono font-bold text-[#2C3E50]">
                            {patient.hn}
                          </td>
                          <td className="p-3 font-bold text-gray-900">
                            {patient.name}
                          </td>
                          <td className="p-3">
                            {patient.age} ปี
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200 font-semibold text-[10px]">
                              {patient.rights}
                            </span>
                          </td>
                          <td className="p-3 font-bold">
                            {patient.status === 'completed' ? (
                              <span className="text-emerald-600 flex items-center gap-1 text-[10px]">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                                เสร็จสิ้นบริการทั้งหมด
                              </span>
                            ) : (
                              <span className="text-amber-600 flex items-center gap-1 text-[10px]">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block animate-ping"></span>
                                อยู่ที่: {getStepName(patient.currentStepId)}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              id={`btn-view-daily-detail-${patient.id}`}
                              onClick={() => setSelectedPatient(patient)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors inline-block cursor-pointer"
                              title="ดูบันทึกการรักษา"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View History Logs */}
      {selectedPatient && (
        <div id="modal-view-history" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100 relative animate-scaleUp">
            <button
              id="btn-close-history-modal"
              onClick={() => setSelectedPatient(null)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-sans font-bold text-sm text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
              <span className="font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                {selectedPatient.hn}
              </span>
              <span>ประวัติการส่งต่อและการรักษา</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-lg font-sans">
                <div>
                  <span className="text-gray-400 block font-bold text-[9px] uppercase">ชื่อ-นามสกุล</span>
                  <span className="font-bold text-gray-800">{selectedPatient.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold text-[9px] uppercase">อายุ</span>
                  <span className="font-bold text-gray-800">{selectedPatient.age} ปี</span>
                </div>
                <div className="mt-1 font-sans">
                  <span className="text-gray-400 block font-bold text-[9px] uppercase">สิทธิ์การรักษา</span>
                  <span className="font-bold text-gray-800">{selectedPatient.rights}</span>
                </div>
                <div className="mt-1 font-sans">
                  <span className="text-gray-400 block font-bold text-[9px] uppercase">เลขบัตรประชาชน</span>
                  <span className="font-mono text-gray-800">{selectedPatient.citizenId}</span>
                </div>
              </div>

              {selectedPatient.requestedServices && selectedPatient.requestedServices.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg font-sans">
                  <span className="text-indigo-600 block font-bold text-[9px] uppercase mb-1">🚨 สัญญาณส่งซิก / บริการพิเศษ</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedPatient.requestedServices.map((srv, idx) => (
                      <span key={idx} className="text-[10px] font-sans font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit Checklist for Step Compliance */}
              <div className="bg-slate-100/90 border border-slate-200 rounded-lg p-3 space-y-2 font-sans">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-slate-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>ตรวจสอบประวัติย้อนหลังรายแผนก (Audit Checklist):</span>
                  </span>
                  {workflowSteps.every((s, i) => {
                    if (selectedPatient.history && selectedPatient.history.some(h => h.stepId === s.id || h.stepName.includes(s.name))) return true;
                    if (i === 0 && selectedPatient.opdStatus === 'opened') return true;
                    if (i === 1 && (selectedPatient.labStatus === 'opened' || selectedPatient.labStatus === 'done')) return true;
                    if (i === 2 && (selectedPatient.procedureStatus === 'sent' || selectedPatient.procedureStatus === 'done')) return true;
                    if (i === 3 && selectedPatient.rightsStatus === 'closed') return true;
                    return false;
                  }) ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">
                      ✅ ผ่านบริการครบทุกห้อง (100%)
                    </span>
                  ) : selectedPatient.status === 'completed' ? (
                    <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">
                      ⚠️ ปิดเคสโดยข้ามบางขั้นตอน
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded text-[10px] font-bold">
                      ⏳ อยู่ระหว่างดำเนินบริการ
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {workflowSteps.map((step, idx) => {
                    const visited = (
                      (selectedPatient.history && selectedPatient.history.some(h => h.stepId === step.id || h.stepName.includes(step.name))) ||
                      (idx === 0 && selectedPatient.opdStatus === 'opened') ||
                      (idx === 1 && (selectedPatient.labStatus === 'opened' || selectedPatient.labStatus === 'done')) ||
                      (idx === 2 && (selectedPatient.procedureStatus === 'sent' || selectedPatient.procedureStatus === 'done')) ||
                      (idx === 3 && selectedPatient.rightsStatus === 'closed')
                    );
                    return (
                      <div
                        key={step.id}
                        className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center justify-between ${
                          visited
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        <span className="truncate">{step.name}</span>
                        <span className="shrink-0">{visited ? '✅ ครบ' : '❌ ขาด/ข้าม'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 font-sans">
                  ประวัติการเข้ารับบริการตามขั้นตอน (Timeline):
                </span>
                {selectedPatient.history.length === 0 ? (
                  <p className="text-gray-400 italic py-2 text-center font-sans">ยังไม่มีประวัติบันทึกการส่งต่อ (กำลังรอดำเนินการซักประวัติ)</p>
                ) : (
                  <div className="space-y-3 pl-2 border-l-2 border-blue-100 ml-1.5 font-sans">
                    {selectedPatient.history.map((log, idx) => (
                      <div key={idx} className="relative font-sans">
                        {/* Dot */}
                        <div className="absolute -left-[13px] top-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                        <div>
                          <div className="font-bold text-gray-800 flex items-center justify-between">
                            <span>{log.stepName}</span>
                            <span className="text-[9px] text-gray-400 font-mono">
                              {new Date(log.completedAt).toLocaleTimeString('th-TH')} น.
                            </span>
                          </div>
                          <p className="text-gray-600 mt-0.5 bg-gray-50 p-1.5 rounded text-[11px] italic">
                            "{log.notes || 'ผ่านขั้นตอนเรียบร้อย'}"
                          </p>
                          <span className="text-[9px] text-gray-400 mt-0.5 block font-mono">
                            ดำเนินการโดย: {log.completedByStation}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              id="btn-confirm-close-history"
              onClick={() => setSelectedPatient(null)}
              className="w-full mt-5 bg-[#2C3E50] hover:bg-slate-800 text-white font-sans font-bold text-xs py-2 rounded transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Edit Patient Basic Info */}
      {editingPatient && (
        <div id="modal-edit-patient" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 relative animate-scaleUp">
            <button
              id="btn-close-edit-modal"
              onClick={() => setEditingPatient(null)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-sans font-bold text-sm text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
              <span className="font-mono bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">
                {editingPatient.hn}
              </span>
              <span>แก้ไขข้อมูลคนไข้เบื้องต้น</span>
            </h3>

            <div className="space-y-3 font-sans text-xs">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1 font-sans">ชื่อ - นามสกุล</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-250 rounded focus:border-blue-500 outline-none"
                />
              </div>

              {/* Citizen ID */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1 font-sans">เลขบัตรประชาชน (13 หลัก)</label>
                <input
                  type="text"
                  value={editCitizenId}
                  onChange={(e) => setEditCitizenId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-250 rounded focus:border-blue-500 outline-none font-mono"
                />
              </div>

              {/* Age & Rights */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1 font-sans">อายุ (ปี)</label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-250 rounded focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1 font-sans">สิทธิ์รักษา</label>
                  <select
                    value={editRights}
                    onChange={(e) => setEditRights(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-250 rounded focus:border-blue-500 outline-none font-sans"
                  >
                    <option value="บัตรทอง (UC)">บัตรทอง (UC)</option>
                    <option value="ประกันสังคม (SSS)">ประกันสังคม (SSS)</option>
                    <option value="จ่ายตรง/ข้าราชการ (CSD)">จ่ายตรง/ข้าราชการ (CSD)</option>
                    <option value="ชำระเงินเอง (Cash)">ชำระเงินเอง (Cash)</option>
                    <option value="สิทธิ์ประกันสุขภาพถ้วนหน้าอื่น">สิทธิ์รัฐสวัสดิการอื่น</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                id="btn-cancel-edit"
                onClick={() => setEditingPatient(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded font-bold text-xs transition-colors cursor-pointer font-sans"
              >
                ยกเลิก
              </button>
              <button
                id="btn-save-edit"
                onClick={handleSaveEdit}
                className="bg-[#2C3E50] hover:bg-slate-800 text-white py-2 rounded font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-sans"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>บันทึกการแก้ไข</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
