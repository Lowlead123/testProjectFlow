/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SyncMessage } from '../types';
import { Bell, X, Volume2 } from 'lucide-react';

interface NotificationToastProps {
  message: SyncMessage;
  onClose: () => void;
}

export default function NotificationToast({ message, onClose }: NotificationToastProps) {
  // Determine color theme based on event
  const isCompletion = message.type === 'STEP_COMPLETED';
  const accentClass = isCompletion ? 'bg-emerald-600' : 'bg-blue-600';

  return (
    <div
      id="notification-toast-popup"
      className="fixed bottom-6 right-6 max-w-sm w-full bg-white rounded-2xl border border-slate-100 shadow-2xl p-4 z-50 animate-slideUp overflow-hidden"
    >
      {/* Decorative Slide accent */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${accentClass}`} />

      <div className="flex items-start gap-3">
        {/* Ring Bell Icon */}
        <div className={`p-2 rounded-xl text-white mt-1 shrink-0 ${accentClass} animate-bounce`}>
          <Bell className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
              สัญญาณส่งต่องานในทีม
            </span>
            <button
              id="btn-close-toast"
              onClick={onClose}
              className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h4 className="font-sans font-semibold text-xs text-slate-800">
            {message.type === 'PATIENT_ADDED' ? (
              <span>🆕 เพิ่มคนไข้และเปิด OPD ใหม่!</span>
            ) : (
              <span>📢 คนไข้ผ่านกระบวนการถัดไป!</span>
            )}
          </h4>

          <div className="text-xs text-slate-600 font-sans leading-relaxed">
            {message.patient && (
              <div>
                คนไข้ <strong className="text-slate-800 font-semibold">{message.patient.name}</strong> 
                {message.type === 'PATIENT_ADDED' ? (
                  <span> ลงทะเบียนเปิดประวัติ OPD สำเร็จแล้ว พร้อมส่งต่อไปคัดกรอง</span>
                ) : (
                  <span> ผ่านขั้นตอน <strong className="text-emerald-600 font-semibold">{message.stepName}</strong> และเตรียมส่งต่อไปยัง <strong className="text-blue-600 font-semibold">{message.nextStepName}</strong></span>
                )}
              </div>
            )}
          </div>

          {/* Sound Notification Label */}
          <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400 font-sans">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span>ส่งเสียงแจ้งเตือนอัตโนมัติแล้ว</span>
          </div>
        </div>
      </div>
    </div>
  );
}
