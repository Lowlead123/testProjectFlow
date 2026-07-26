/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Monitor, Cpu, Code, Download, Terminal, Settings2, Check } from 'lucide-react';

export default function DesktopGuide() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const mainJsCode = `const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "OPD Workflow & Queue Sync System",
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // โหลดหน้าเว็บแอปพลิเคชันจาก URL ที่ใช้งานจริง หรือไฟล์ dist
  win.loadURL('https://ais-pre-aqjpqyqkkqzlvgr26aw3dr-543622821982.asia-southeast1.run.app');
  
  // ปิดเมนูด้านบนเพื่อความสวยงามเสมือนโปรแกรม Desktop แท้
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});`;

  const packageJsonCode = `{
  "name": "opd-workflow-sync",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build-exe": "electron-builder --win portable"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0"
  },
  "build": {
    "appId": "com.opd.workflow.sync",
    "win": {
      "target": "nsis",
      "icon": "icon.ico"
    }
  }
}`;

  return (
    <div id="desktop-guide-container" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden">
      {/* Visual Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-600" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
          <Monitor className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-sans font-semibold text-lg text-slate-800">
            เทคนิคการเปิดให้ป๊อปอัพเด้งลอยทับหน้าจอ HCIS หรือแปลงเป็นโปรแกรม Desktop (.exe)
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            วิธีตั้งค่าให้ข้อความส่งซิกด่วนเด้งลอยทับทุกโปรแกรมใน Windows รวมถึงขั้นตอนแปลงเว็บเป็นแอปติดตั้ง Desktop
          </p>
        </div>
      </div>

      {/* Feature Card: Native Windows Popups & Split Screen */}
      <div className="mb-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-4 border border-slate-800 space-y-3">
        <h3 className="font-bold text-xs text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
          <span>💡 3 วิธีการส่งซิกด่วนที่เด้งทับโปรแกรม HCIS ได้ 100%:</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80 space-y-1">
            <strong className="text-sky-300 block font-bold">1. เปิด Windows Popup Notification</strong>
            <p className="text-slate-300 text-[11px]">
              กดปุ่ม <span className="text-emerald-400 font-bold">"🔔 เปิดแจ้งเตือน Windows Popup"</span> ในแถบด้านบนของเว็บ ป๊อปอัพแจ้งเตือนของระบบปฏิบัติการ Windows จะเด้งลอยทับมุมขวาล่างของหน้าจอ <strong className="text-white">ทับโปรแกรม HCIS โดยตรง</strong>
            </p>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80 space-y-1">
            <strong className="text-purple-300 block font-bold">2. เสียงแจ้งเตือนความถี่สูง (Chime)</strong>
            <p className="text-slate-300 text-[11px]">
              เมื่อเปิดเสียงแจ้งเตือน ระบบจะส่งเสียงปิ๊งเตือนผ่านลำโพงคอมพิวเตอร์ทันทีที่มีการส่งซิก แม้หน้าจอเว็บจะถูกซ่อนอยู่ด้านหลัง HCIS
            </p>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80 space-y-1">
            <strong className="text-amber-300 block font-bold">3. การแบ่งหน้าจอ (Windows Split Screen)</strong>
            <p className="text-slate-300 text-[11px]">
              กดปุ่ม <kbd className="bg-slate-900 px-1 py-0.5 rounded font-mono text-[10px] text-amber-300">Windows Key + ลูกศรซ้าย/ขวา</kbd> เพื่อวางหน้าเว็บส่งซิกไว้ครึ่งหน้าจอซ้าย และเปิด HCIS ไว้ครึ่งหน้าจอขวา
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Steps */}
        <div className="lg:col-span-6 space-y-6">
          <h3 className="font-sans font-bold text-sm text-slate-700 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-500" />
            <span>ขั้นตอนการแพลตฟอร์มไฟล์ติดตั้ง .exe</span>
          </h3>

          <div className="space-y-4 font-sans text-xs text-slate-600 leading-relaxed">
            {/* Step 1 */}
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-5 h-5 bg-indigo-100 text-indigo-700 font-bold rounded-full shrink-0">
                1
              </span>
              <div>
                <strong className="text-slate-800 text-sm block mb-1">ติดตั้ง Node.js</strong>
                ดาวน์โหลดและติดตั้ง <a href="https://nodejs.org/" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold underline">Node.js (LTS Version)</a> ลงบนคอมพิวเตอร์ Windows 10 หรือ 11 ของคุณก่อน
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-5 h-5 bg-indigo-100 text-indigo-700 font-bold rounded-full shrink-0">
                2
              </span>
              <div>
                <strong className="text-slate-800 text-sm block mb-1">สร้างโฟลเดอร์สำหรับทำโปรแกรม .exe</strong>
                สร้างโฟลเดอร์ใหม่บนหน้าจอคอมพิวเตอร์ เช่น ตั้งชื่อโฟลเดอร์ว่า <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono font-semibold">opd-desktop</code> จากนั้นเปิด Command Prompt (cmd) แล้วชี้เข้าไปยังโฟลเดอร์นั้น
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-5 h-5 bg-indigo-100 text-indigo-700 font-bold rounded-full shrink-0">
                3
              </span>
              <div>
                <strong className="text-slate-800 text-sm block mb-1">สร้างไฟล์ตั้งค่าในโฟลเดอร์</strong>
                สร้างไฟล์ชื่อ <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono font-semibold">main.js</code> และ <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono font-semibold">package.json</code> คัดลอกโค้ดทางขวาไปวางในไฟล์เหล่านั้นให้ครบถ้วน
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-5 h-5 bg-indigo-100 text-indigo-700 font-bold rounded-full shrink-0">
                4
              </span>
              <div>
                <strong className="text-slate-800 text-sm block mb-1">รันคำสั่งดาวน์โหลด Dependencies & บิลด์ .exe</strong>
                เปิด Terminal / Command Prompt ในโฟลเดอร์นั้น แล้วใช้ 2 คำสั่งนี้ทีละคำสั่ง:
                <div className="bg-slate-900 text-slate-100 font-mono text-[10px] p-3 rounded-lg mt-2 relative">
                  <div>npm install</div>
                  <div className="mt-1">npm run build-exe</div>
                </div>
                เมื่อคำสั่งทำงานเสร็จสิ้น คุณจะได้รับไฟล์ติดตั้ง <strong className="text-indigo-600">.exe (Installer)</strong> อยู่ในโฟลเดอร์ชื่อ <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono font-semibold">dist/</code> ทันที! พร้อมนำไปเปิดและติดตั้งลงคอมพิวเตอร์ในคลินิก
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Config Templates */}
        <div className="lg:col-span-6 space-y-5">
          {/* Config main.js */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 font-sans">
                <Code className="w-3.5 h-3.5 text-indigo-500" />
                ไฟล์ตั้งค่า 1: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">main.js</code>
              </span>
              <button
                id="btn-copy-mainjs"
                onClick={() => copyToClipboard(mainJsCode, 'mainJs')}
                className="text-[10px] flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                {copiedSection === 'mainJs' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500 stroke-[3]" />
                    <span>คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <span>คลิกเพื่อคัดลอกโค้ด</span>
                )}
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[10px] overflow-x-auto max-h-[180px]">
              {mainJsCode}
            </pre>
          </div>

          {/* Config package.json */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 font-sans">
                <Settings2 className="w-3.5 h-3.5 text-indigo-500" />
                ไฟล์ตั้งค่า 2: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">package.json</code>
              </span>
              <button
                id="btn-copy-packagejson"
                onClick={() => copyToClipboard(packageJsonCode, 'packageJson')}
                className="text-[10px] flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                {copiedSection === 'packageJson' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500 stroke-[3]" />
                    <span>คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <span>คลิกเพื่อคัดลอกโค้ด</span>
                )}
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[10px] overflow-x-auto max-h-[180px]">
              {packageJsonCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
