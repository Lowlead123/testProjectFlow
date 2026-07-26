/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Patient, ServiceTag, OverlayConfig, WorkflowStep, PreRegisteredPatient } from '../types';
import {
  Radio,
  Minimize2,
  Maximize2,
  Pin,
  CheckCircle2,
  FlaskConical,
  Activity,
  ShieldCheck,
  Sparkles,
  Send,
  Zap,
  X,
  ExternalLink,
  Search,
  UserCheck,
  Edit3,
  Save,
  Plus,
  BarChart3,
  Clock,
  FileText,
  Users,
  Check,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface SignalOverlayProps {
  patients: Patient[];
  preRegisteredPatients?: PreRegisteredPatient[];
  availableServices: ServiceTag[];
  overlayConfig?: OverlayConfig;
  currentStationId?: string;
  workflowSteps?: WorkflowStep[];
  onToggleSignal: (
    patientId: string,
    field: 'opdStatus' | 'labStatus' | 'procedureStatus' | 'rightsStatus' | 'requestedServices',
    value: any
  ) => void;
  onUpdateQuickNotes?: (patientId: string, notes: string) => void;
  onAdvancePatient?: (patientId: string, notes: string) => void;
  onOpenOpdFromPreRegistered?: (prePatient: PreRegisteredPatient, customServices?: string[]) => void;
  onUpdatePatientInfo?: (patientId: string, updatedFields: Partial<Patient>) => void;
}

export const getStationKeyForStep = (step: WorkflowStep, idx: number): string => {
  const idLower = step.id.toLowerCase();
  const nameLower = step.name.toLowerCase();
  if (idLower.includes('opd') || nameLower.includes('opd') || nameLower.includes('เปิด') || nameLower.includes('บัตร')) {
    return 'opdStatus';
  } else if (idLower.includes('lab') || nameLower.includes('lab') || nameLower.includes('แล็บ') || nameLower.includes('เจาะเลือด')) {
    return 'labStatus';
  } else if (idLower.includes('proc') || nameLower.includes('หัตถการ') || nameLower.includes('ทำแผล') || nameLower.includes('ฉีดยา')) {
    return 'procedureStatus';
  } else if (idLower.includes('right') || nameLower.includes('สิทธิ์') || nameLower.includes('การเงิน') || nameLower.includes('icd')) {
    return 'rightsStatus';
  } else {
    if (idx === 0) return 'opdStatus';
    if (idx === 1) return 'labStatus';
    if (idx === 2) return 'procedureStatus';
    if (idx === 3) return 'rightsStatus';
    return step.id;
  }
};

export default function SignalOverlay({
  patients,
  preRegisteredPatients = [],
  availableServices,
  overlayConfig,
  currentStationId = 'all',
  workflowSteps = [],
  onToggleSignal,
  onUpdateQuickNotes,
  onAdvancePatient,
  onOpenOpdFromPreRegistered,
  onUpdatePatientInfo,
}: SignalOverlayProps) {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [overlayTab, setOverlayTab] = useState<'signals' | 'totals'>('signals');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [showFullDetails, setShowFullDetails] = useState<boolean>(true);

  // Search & Pre-registration lookup state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPrePatient, setSelectedPrePatient] = useState<PreRegisteredPatient | null>(null);
  const [preSelectedServices, setPreSelectedServices] = useState<string[]>([]);

  // Inline editing state for active patient
  const [isEditingActivePatient, setIsEditingActivePatient] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editHn, setEditHn] = useState<string>('');
  const [editCitizenId, setEditCitizenId] = useState<string>('');
  const [editRights, setEditRights] = useState<string>('');
  const [editAge, setEditAge] = useState<number>(0);
  const [editServices, setEditServices] = useState<string[]>([]);

  // Picture-in-Picture (Always-On-Top Window) state
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isTopStickyBar, setIsTopStickyBar] = useState<boolean>(false);

  // Station Filter / Standby Mode state
  const [stationFilter, setStationFilter] = useState<'all' | 'opdStatus' | 'labStatus' | 'procedureStatus' | 'rightsStatus'>('all');

  // Today's date string (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter patients created/serviced today
  const todayPatients = patients.filter((p) => {
    if (!p.createdAt) return false;
    return p.createdAt.slice(0, 10) === todayStr;
  });

  // Check prerequisite signals before performing an action
  const checkActionPrerequisite = (patient: Patient, actionId: string): boolean => {
    const prereqs = overlayConfig?.stationPrerequisites?.[actionId] || [];
    if (prereqs.length === 0) return true;

    const missingLabels: string[] = [];
    for (const p of prereqs) {
      if (p === 'opdStatus' && patient.opdStatus !== 'opened') {
        missingLabels.push('เปิด OPD แล้ว');
      }
      if (p === 'labStatus' && patient.labStatus !== 'opened' && patient.labStatus !== 'done') {
        missingLabels.push('ส่ง/เปิดแล็บแล้ว');
      }
      if (p === 'procedureStatus' && patient.procedureStatus !== 'sent' && patient.procedureStatus !== 'done') {
        missingLabels.push('ส่งห้องหัตถการแล้ว');
      }
    }

    if (missingLabels.length > 0) {
      alert(`⏳ ไม่สามารถคีย์/ส่งซิกได้เนื่องจากต้องรอสัญญาณ:\n• ${missingLabels.join('\n• ')}\nจากแผนกก่อนหน้าเรียบร้อยก่อนครับ`);
      return false;
    }
    return true;
  };

  // Helper to check if a patient is done at a station
  const isStationDoneForPatient = (patient: Patient, stationKey: string): boolean => {
    // Resolve station key if stationKey is a step ID
    const stepIdx = workflowSteps.findIndex(s => s.id === stationKey);
    const step = stepIdx >= 0 ? workflowSteps[stepIdx] : null;

    let key = stationKey;
    if (step) {
      const idLower = step.id.toLowerCase();
      const nameLower = step.name.toLowerCase();
      if (idLower.includes('opd') || nameLower.includes('opd') || nameLower.includes('เปิด') || nameLower.includes('บัตร') || stepIdx === 0) {
        key = 'opdStatus';
      } else if (idLower.includes('lab') || nameLower.includes('lab') || nameLower.includes('เจาะ') || stepIdx === 1) {
        key = 'labStatus';
      } else if (idLower.includes('proc') || nameLower.includes('หัตถการ') || nameLower.includes('ฉีด') || stepIdx === 2) {
        key = 'procedureStatus';
      } else if (idLower.includes('right') || nameLower.includes('สิทธิ์') || nameLower.includes('icd') || nameLower.includes('ปิด') || stepIdx === workflowSteps.length - 1) {
        key = 'rightsStatus';
      }
    }

    if (key === 'opdStatus') {
      if (patient.opdStatus === 'pending' || (patient as any)[stationKey] === 'pending') return false;
      return patient.opdStatus === 'opened' || (patient as any)[stationKey] === 'opened' || (patient.history || []).some(h => h.stepId === stationKey || h.stepId === 'opdStatus' || h.stepId === 'step_1');
    }
    if (key === 'labStatus') {
      if (patient.labStatus === 'pending' || (patient as any)[stationKey] === 'pending') return false;
      return patient.labStatus === 'opened' || patient.labStatus === 'done' || (patient as any)[stationKey] === 'opened' || (patient as any)[stationKey] === 'done' || (patient.history || []).some(h => h.stepId === stationKey || h.stepId === 'labStatus' || h.stepId === 'step_2');
    }
    if (key === 'procedureStatus') {
      if (patient.procedureStatus === 'pending' || (patient as any)[stationKey] === 'pending') return false;
      return patient.procedureStatus === 'sent' || patient.procedureStatus === 'done' || (patient as any)[stationKey] === 'sent' || (patient as any)[stationKey] === 'done' || (patient.history || []).some(h => h.stepId === stationKey || h.stepId === 'procedureStatus' || h.stepId === 'step_3');
    }
    if (key === 'rightsStatus') {
      if (patient.rightsStatus === 'pending' || (patient as any)[stationKey] === 'pending') return false;
      return patient.rightsStatus === 'closed' || (patient as any)[stationKey] === 'closed' || (patient.history || []).some(h => h.stepId === stationKey || h.stepId === 'rightsStatus' || h.stepId === 'step_4');
    }

    const rawVal = (patient as any)[stationKey];
    if (rawVal === 'pending') return false;
    const history = patient.history || [];
    const isLogged = history.some((h) => h.stepId === stationKey);
    const isRawDone = rawVal === 'opened' || rawVal === 'done' || rawVal === 'closed' || rawVal === 'sent';

    return isLogged || isRawDone;
  };

  // Helper to check if a patient is ready for a station filter
  const isPatientReadyForStation = (patient: Patient, stationKey: string): boolean => {
    if (stationKey === 'all') return true;

    // Prerequisite check from overlayConfig
    const prereqs = overlayConfig?.stationPrerequisites?.[stationKey] || [];
    for (const p of prereqs) {
      if (p === 'opdStatus' && patient.opdStatus !== 'opened') return false;
      if (p === 'labStatus' && patient.labStatus !== 'opened' && patient.labStatus !== 'done') return false;
      if (p === 'procedureStatus' && patient.procedureStatus !== 'sent' && patient.procedureStatus !== 'done') return false;
    }

    // Step prerequisites check from workflow step definition if present
    const step = workflowSteps.find(s => s.id === stationKey || getStationKeyForStep(s, workflowSteps.indexOf(s)) === stationKey);
    if (step && step.prerequisiteStepIds && step.prerequisiteStepIds.length > 0) {
      for (const reqId of step.prerequisiteStepIds) {
        const reqStep = workflowSteps.find(s => s.id === reqId);
        const reqKey = reqStep ? getStationKeyForStep(reqStep, workflowSteps.indexOf(reqStep)) : reqId;
        if (!isStationDoneForPatient(patient, reqKey) && !isStationDoneForPatient(patient, reqId)) {
          return false;
        }
      }
    }

    return true;
  };

  // Active patients (not completed) sorted strictly by createdAt ascending (Screening arrival order)
  const activePatients = patients
    .filter((p) => p.status !== 'completed')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Filter active patients: Must be ready AND NOT YET DONE at selected station!
  const readyPatients = activePatients.filter(
    (p) => isPatientReadyForStation(p, stationFilter) && !isStationDoneForPatient(p, stationFilter)
  );

  // Visible patients in queue for current station view
  const visibleQueuePatients = stationFilter === 'all' ? activePatients : readyPatients;

  // First patient in queue for current view
  const opdFirstPatient = visibleQueuePatients[0] || activePatients[0] || null;

  // Searched patient (if user searched or clicked a patient by HN from search results)
  const searchedPatient = selectedPatientId ? patients.find((p) => p.id === selectedPatientId) : null;

  // Currently selected patient object or default to first visible queue patient
  const currentPatient =
    searchedPatient || visibleQueuePatients.find((p) => p.id === selectedPatientId) || opdFirstPatient;

  // Queue index in current filtered view
  const currentQueueIndex = currentPatient
    ? visibleQueuePatients.findIndex((p) => p.id === currentPatient.id) + 1
    : 0;

  const isCurrentFirstQueue = currentPatient && visibleQueuePatients[0] && currentPatient.id === visibleQueuePatients[0].id;

  // Dynamic Station Order mapped from workflowSteps (Settings)
  const orderedStations = useMemo(() => {
    if (!workflowSteps || workflowSteps.length === 0) {
      return [
        { key: 'opdStatus', label: '1. OPD', fullName: '1. จุดเปิด OPD / ห้องบัตร', color: 'emerald', defaultIcon: '🏥' },
        { key: 'labStatus', label: '2. แล็บ', fullName: '2. ห้องเจาะเลือด / แล็บ', color: 'purple', defaultIcon: '🧪' },
        { key: 'procedureStatus', label: '3. หัตถการ', fullName: '3. ห้องหัตถการ / ทำแผล', color: 'amber', defaultIcon: '🩹' },
        { key: 'rightsStatus', label: '4. ICD10/ปิดสิทธิ์', fullName: '4. ICD10 / ปิดสิทธิ์การรักษา', color: 'blue', defaultIcon: '💳' },
      ];
    }

    const sorted = [...workflowSteps].sort((a, b) => (a.order || 0) - (b.order || 0));

    return sorted.map((step, idx) => {
      const idLower = step.id.toLowerCase();
      const nameLower = step.name.toLowerCase();

      let key: 'opdStatus' | 'labStatus' | 'procedureStatus' | 'rightsStatus' | string = step.id;
      let icon = '📍';

      if (idLower.includes('opd') || nameLower.includes('opd') || nameLower.includes('เปิด') || nameLower.includes('บัตร')) {
        key = 'opdStatus';
        icon = '🏥';
      } else if (idLower.includes('lab') || nameLower.includes('lab') || nameLower.includes('แล็บ') || nameLower.includes('เจาะเลือด')) {
        key = 'labStatus';
        icon = '🧪';
      } else if (idLower.includes('proc') || nameLower.includes('หัตถการ') || nameLower.includes('ทำแผล') || nameLower.includes('ฉีดยา')) {
        key = 'procedureStatus';
        icon = '🩹';
      } else if (idLower.includes('right') || nameLower.includes('สิทธิ์') || nameLower.includes('การเงิน') || nameLower.includes('icd')) {
        key = 'rightsStatus';
        icon = '💳';
      } else {
        if (idx === 0) { key = 'opdStatus'; icon = '🏥'; }
        else if (idx === 1) { key = 'labStatus'; icon = '🧪'; }
        else if (idx === 2) { key = 'procedureStatus'; icon = '🩹'; }
        else if (idx === 3) { key = 'rightsStatus'; icon = '💳'; }
      }

      return {
        id: step.id,
        key,
        label: `${idx + 1}. ${step.name}`,
        fullName: `${idx + 1}. ${step.name}`,
        color: step.color || 'slate',
        defaultIcon: icon,
        originalStep: step
      };
    });
  }, [workflowSteps]);

  // Dynamic button labels
  const opdLabel = overlayConfig?.actionLabels?.opdStatus || 'เปิด OPD แล้วนะ';
  const labLabel = overlayConfig?.actionLabels?.labStatus || 'เปิดแล็บ/ส่งแล็บ';
  const procedureLabel = overlayConfig?.actionLabels?.procedureStatus || 'ส่งห้องหัตถการ';
  const rightsLabel = overlayConfig?.actionLabels?.rightsStatus || 'ปิดสิทธิ์เรียบร้อย';

  // Search matches across Pre-registered, Active, AND Completed Patients
  const cleanSearch = searchQuery.trim().toLowerCase();

  const preMatches = cleanSearch
    ? preRegisteredPatients.filter(
        (p) =>
          p.hn.toLowerCase().includes(cleanSearch) ||
          p.citizenId.toLowerCase().includes(cleanSearch) ||
          p.name.toLowerCase().includes(cleanSearch)
      )
    : [];

  const activeMatches = cleanSearch
    ? patients.filter(
        (p) =>
          p.status !== 'completed' &&
          (p.hn.toLowerCase().includes(cleanSearch) ||
            p.citizenId.toLowerCase().includes(cleanSearch) ||
            p.name.toLowerCase().includes(cleanSearch))
      )
    : [];

  const completedMatches = cleanSearch
    ? patients.filter(
        (p) =>
          p.status === 'completed' &&
          (p.hn.toLowerCase().includes(cleanSearch) ||
            p.citizenId.toLowerCase().includes(cleanSearch) ||
            p.name.toLowerCase().includes(cleanSearch))
      )
    : [];

  // Today Totals & Service Breakdown Calculations
  const todayOpdOpenedCount = todayPatients.filter((p) => p.opdStatus === 'opened').length;
  const todayLabDoneCount = todayPatients.filter((p) => p.labStatus === 'opened').length;
  const todayProcedureDoneCount = todayPatients.filter((p) => p.procedureStatus === 'sent').length;
  const todayRightsClosedCount = todayPatients.filter((p) => p.rightsStatus === 'closed').length;

  // Clinical services count breakdown
  const serviceStatsCounts = availableServices.reduce((acc, srv) => {
    const count = todayPatients.filter((p) => (p.requestedServices || []).includes(srv.name)).length;
    acc[srv.name] = count;
    return acc;
  }, {} as Record<string, number>);

  // Keep customNote in sync when selected patient or quickNotes changes
  useEffect(() => {
    if (currentPatient) {
      setCustomNote(currentPatient.quickNotes || '');
    } else {
      setCustomNote('');
    }
  }, [currentPatient?.id, currentPatient?.quickNotes]);

  // Check authorization for Closing Rights (Special Button: Finish Service)
  const isAuthorizedToCloseRights = () => {
    if (!overlayConfig) return true;
    const role = overlayConfig.authorizedRightsCloserRole || 'all';
    if (role === 'all') return true;
    if (role === 'intake') return stationFilter === 'opdStatus' || currentStationId === 'intake' || currentStationId === 'step_1' || currentStationId === 'all';
    if (role === 'finance') return stationFilter === 'rightsStatus' || currentStationId === 'step_4' || currentStationId === 'all';
    if (role === 'admin') return true;
    if (role === currentStationId || currentStationId === 'all') return true;

    return false;
  };

  // Check if button is enabled globally in overlayConfig
  const isButtonEnabled = (buttonId: string): boolean => {
    if (!overlayConfig?.enabledSignalButtons) return true;
    return overlayConfig.enabledSignalButtons.includes(buttonId);
  };

  // Check if specific action signal is permitted for the active station filter
  const isActionAllowedForStation = (actionId: string): boolean => {
    if (!isButtonEnabled(actionId)) return false;
    if (!overlayConfig) return true;

    const firstStepId = workflowSteps[0]?.id;

    // Resolve station key from step if stationFilter is a step ID
    const stepIdx = workflowSteps.findIndex((s) => s.id === stationFilter);
    const step = stepIdx >= 0 ? workflowSteps[stepIdx] : null;

    let stationKey = stationFilter;
    if (step) {
      const idLower = step.id.toLowerCase();
      const nameLower = step.name.toLowerCase();
      if (idLower.includes('opd') || nameLower.includes('opd') || nameLower.includes('เปิด') || nameLower.includes('บัตร')) {
        stationKey = 'opdStatus';
      } else if (idLower.includes('lab') || nameLower.includes('lab') || nameLower.includes('แล็บ') || nameLower.includes('เจาะเลือด')) {
        stationKey = 'labStatus';
      } else if (idLower.includes('proc') || nameLower.includes('หัตถการ') || nameLower.includes('ทำแผล') || nameLower.includes('ฉีดยา')) {
        stationKey = 'procedureStatus';
      } else if (idLower.includes('right') || nameLower.includes('สิทธิ์') || nameLower.includes('การเงิน') || nameLower.includes('icd')) {
        stationKey = 'rightsStatus';
      } else {
        if (stepIdx === 0) stationKey = 'opdStatus';
        else if (stepIdx === 1) stationKey = 'labStatus';
        else if (stepIdx === 2) stationKey = 'procedureStatus';
        else if (stepIdx === 3) stationKey = 'rightsStatus';
      }
    }

    const isOpdFilter = stationFilter === 'opdStatus' || (firstStepId && stationFilter === firstStepId) || stationKey === 'opdStatus';

    // Default permissions per station key: EACH STATION CAN ONLY MODIFY/CANCEL ITS OWN STATION SIGNAL!
    const defaultPerms =
      stationKey === 'opdStatus' || isOpdFilter
        ? ['opdStatus', 'requestedServices', 'quickNotes']
        : stationKey === 'labStatus'
        ? ['labStatus', 'requestedServices', 'quickNotes']
        : stationKey === 'procedureStatus'
        ? ['procedureStatus', 'requestedServices', 'quickNotes']
        : stationKey === 'rightsStatus'
        ? ['rightsStatus', 'requestedServices', 'quickNotes']
        : [stationKey, 'requestedServices', 'quickNotes'];

    // Check custom permissions in overlayConfig
    const configuredPerms =
      overlayConfig.stationPermissions?.[stationFilter] ||
      overlayConfig.stationPermissions?.[stationKey] ||
      (step ? overlayConfig.stationPermissions?.[step.id] : null);

    const allowedList = configuredPerms && configuredPerms.length > 0 ? configuredPerms : defaultPerms;

    // Resolve action key as well
    const actionStepIdx = workflowSteps.findIndex((s) => s.id === actionId);
    const actionStep = actionStepIdx >= 0 ? workflowSteps[actionStepIdx] : null;

    let actionKey = actionId;
    if (actionStep) {
      const idLower = actionStep.id.toLowerCase();
      const nameLower = actionStep.name.toLowerCase();
      if (idLower.includes('opd') || nameLower.includes('opd') || nameLower.includes('เปิด') || nameLower.includes('บัตร')) {
        actionKey = 'opdStatus';
      } else if (idLower.includes('lab') || nameLower.includes('lab') || nameLower.includes('แล็บ') || nameLower.includes('เจาะเลือด')) {
        actionKey = 'labStatus';
      } else if (idLower.includes('proc') || nameLower.includes('หัตถการ') || nameLower.includes('ทำแผล') || nameLower.includes('ฉีดยา')) {
        actionKey = 'procedureStatus';
      } else if (idLower.includes('right') || nameLower.includes('สิทธิ์') || nameLower.includes('การเงิน') || nameLower.includes('icd')) {
        actionKey = 'rightsStatus';
      } else {
        if (actionStepIdx === 0) actionKey = 'opdStatus';
        else if (actionStepIdx === 1) actionKey = 'labStatus';
        else if (actionStepIdx === 2) actionKey = 'procedureStatus';
        else if (actionStepIdx === 3) actionKey = 'rightsStatus';
      }
    }

    if (actionId === 'requestedServices' || actionId === 'quickNotes') {
      return allowedList.includes(actionId);
    }

    // When filtering by a specific station tab (not 'all'), check strictly if target action matches THIS station
    if (stationFilter !== 'all') {
      const isSelfStation =
        stationFilter === actionId ||
        stationFilter === actionKey ||
        stationKey === actionId ||
        stationKey === actionKey ||
        (isOpdFilter && (actionId === 'opdStatus' || actionKey === 'opdStatus' || actionId === firstStepId)) ||
        (step && (actionId === step.id || actionKey === step.id));

      if (isSelfStation) return true;

      // If custom permissions were configured in Settings, check allowedList
      if (configuredPerms && configuredPerms.length > 0) {
        return allowedList.includes(actionId) || allowedList.includes(actionKey) || (actionStep && allowedList.includes(actionStep.id));
      }

      return false; // Strictly disallow modifying or cancelling other station signals!
    }

    // If stationFilter === 'all':
    if (overlayConfig?.allowedStationButtons && overlayConfig.allowedStationButtons.length > 0) {
      return overlayConfig.allowedStationButtons.includes(actionId) || overlayConfig.allowedStationButtons.includes(actionKey);
    }

    const isExplicitlyInList =
      allowedList.includes(actionId) ||
      allowedList.includes(actionKey) ||
      (actionStep && allowedList.includes(actionStep.id));

    if (isExplicitlyInList) return true;

    if (actionId === 'rightsStatus' || actionKey === 'rightsStatus') {
      return isAuthorizedToCloseRights();
    }

    return false;
  };

  const handleToggleService = (patient: Patient, serviceName: string) => {
    if (!isActionAllowedForStation('requestedServices')) {
      alert('🔒 สิทธิ์ถูกจำกัด\nแผนกที่คุณเลือกอยู่ไม่ได้ถูกตั้งค่าให้ติ๊กส่งซิกบริการพิเศษ\n(คุณสามารถปรับสิทธิ์ได้ในเมนู Settings)');
      return;
    }

    const existing = patient.requestedServices || [];
    const isPresent = existing.includes(serviceName);

    // OPD station & All station views can always deselect/tick-off services freely
    const firstStepId = workflowSteps[0]?.id;
    const isOpdStation =
      stationFilter === 'opdStatus' ||
      stationFilter === 'all' ||
      (firstStepId && stationFilter === firstStepId);

    if (isPresent && overlayConfig?.allowDeselectServices === false && !isOpdStation) {
      alert('ระบบถูกตั้งค่าห้ามติ๊กปลด/ยกเลิกรายการบริการ (สามารถปรับเปิดสิทธิ์ได้ในเมนู Settings -> อนุญาตให้ติ๊กปลด/ยกเลิกรายการบริการ)');
      return;
    }

    const updated = isPresent
      ? existing.filter((s) => s !== serviceName)
      : [...existing, serviceName];

    onToggleSignal(patient.id, 'requestedServices', updated);
  };

  const handleStartEditActivePatient = (patient: Patient) => {
    setEditName(patient.name);
    setEditHn(patient.hn);
    setEditCitizenId(patient.citizenId || '');
    setEditRights(patient.rights || '');
    setEditAge(patient.age || 0);
    setEditServices(patient.requestedServices || []);
    setIsEditingActivePatient(true);
  };

  const handleSaveEditActivePatient = (patientId: string) => {
    if (!onUpdatePatientInfo) return;
    onUpdatePatientInfo(patientId, {
      name: editName,
      hn: editHn,
      citizenId: editCitizenId,
      rights: editRights,
      age: editAge,
      requestedServices: editServices,
    });
    setIsEditingActivePatient(false);
  };

  const handleSelectPrePatient = (pre: PreRegisteredPatient) => {
    setSelectedPrePatient(pre);
    setPreSelectedServices(pre.plannedServices || []);
    setSearchQuery('');
  };

  const handleConfirmOpenOpdFromPre = () => {
    if (!selectedPrePatient || !onOpenOpdFromPreRegistered) return;
    onOpenOpdFromPreRegistered(selectedPrePatient, preSelectedServices);
    setSelectedPrePatient(null);
    setPreSelectedServices([]);
  };

  const handleCloseRightsAndAdvance = (patient: Patient, stepId?: string) => {
    const targetAction = stepId || 'rightsStatus';
    if (!isActionAllowedForStation(targetAction) && !isActionAllowedForStation('rightsStatus')) {
      alert(`🔒 สิทธิ์ถูกจำกัด\nคุณสามารถดำเนินการหรือยกเลิกได้เฉพาะในส่วนของแผนกตัวเองเท่านั้น`);
      return;
    }

    if (patient.rightsStatus === 'closed' || patient.status === 'completed') {
      if (confirm(`ต้องการยกเลิกการปิดสิทธิ์ / ดึงคิวของคุณ "${patient.name}" กลับมารับบริการต่อใช่หรือไม่?`)) {
        onToggleSignal(patient.id, (stepId || 'rightsStatus') as any, 'pending');
      }
    } else {
      onToggleSignal(patient.id, (stepId || 'rightsStatus') as any, 'closed');
      setSelectedPatientId(null);
    }
  };

  // Helper to sync all styles and stylesheets to popout window
  const syncStylesToPopout = (targetDoc: Document) => {
    if (!targetDoc) return;
    try {
      // 1. Clone all existing style and link stylesheet nodes from parent
      const styleNodes = document.querySelectorAll('link[rel="stylesheet"], style');
      styleNodes.forEach((node) => {
        try {
          targetDoc.head.appendChild(node.cloneNode(true));
        } catch (err) {}
      });

      // 2. Fallback to reading cssRules for dynamically injected stylesheets
      Array.from(document.styleSheets).forEach((styleSheet: CSSStyleSheet) => {
        try {
          if (!styleSheet.href && styleSheet.cssRules) {
            const cssRules = Array.from(styleSheet.cssRules)
              .map((rule) => rule.cssText)
              .join('\n');
            const style = targetDoc.createElement('style');
            style.textContent = cssRules;
            targetDoc.head.appendChild(style);
          }
        } catch (e) {}
      });
    } catch (err) {
      console.warn('Error syncing styles to popout:', err);
    }
  };

  // Document Picture-in-Picture window launcher
  const handleOpenPipWindow = async () => {
    const isTopLevelWindow = typeof window !== 'undefined' && window.self === window.top;

    if (isTopLevelWindow && 'documentPictureInPicture' in window) {
      try {
        // @ts-ignore
        const pip = await window.documentPictureInPicture.requestWindow({
          width: 500,
          height: 600,
        });

        if (pip && pip.document) {
          syncStylesToPopout(pip.document);
          pip.document.title = '🚨 ปลั๊กอินส่งซิกด่วน (Always On Top)';
          if (pip.document.body) {
            pip.document.body.className = 'bg-slate-900 text-white font-sans p-2.5 overflow-y-auto select-none';
          }

          pip.addEventListener('pagehide', () => {
            setPipWindow(null);
          });

          setPipWindow(pip);
          return;
        }
      } catch (err) {
        fallbackOpenPopupWindow();
        return;
      }
    } else {
      fallbackOpenPopupWindow();
    }
  };

  const fallbackOpenPopupWindow = () => {
    try {
      const pop = window.open(
        '',
        'SignalOverlayPopout',
        'width=500,height=600,resizable=yes,scrollbars=yes'
      );
      if (pop && pop.document) {
        syncStylesToPopout(pop.document);
        pop.document.title = '🚨 ปลั๊กอินส่งซิกด่วน (Always On Top)';
        if (pop.document.body) {
          pop.document.body.className = 'bg-slate-900 text-white font-sans p-2.5 overflow-y-auto select-none';
        }
        setPipWindow(pop);
      }
    } catch (e) {
      console.warn('Popup window blocked or error:', e);
    }
  };

  const closePipWindow = () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
    }
  };

  // Render content in Picture-in-Picture window (Sleek, modern & ultra-responsive)
  const renderPipContent = () => {
    return (
      <div className="space-y-2.5 font-sans text-xs p-1 text-slate-100">
        {/* PiP Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-2.5 rounded-xl border border-slate-700/80 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
                <span>🚨 ปลั๊กอินส่งซิกด่วน (Always On Top)</span>
              </h3>
              <p className="text-[9px] text-slate-400">ส่งสัญญาณแผนกแบบ Real-time ข้ามหน้าต่าง</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closePipWindow}
            className="text-slate-400 hover:text-white text-[10px] font-bold bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            ✕ ปิด
          </button>
        </div>

        {/* Station Standby Mode Tabs in PiP */}
        <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-bold text-amber-300">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>โหมดสแตนบายแผนก:</span>
            </span>
            {stationFilter !== 'all' && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold font-mono">
                ⚡ คิวพร้อม: {readyPatients.length} ราย
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {[
              ...orderedStations.map((st) => ({ id: st.key, label: st.label, fullName: st.fullName })),
              { id: 'all', label: '🌐 ทั้งหมด', fullName: 'ทุกแผนก' },
            ].map((st) => {
              const isActive = stationFilter === st.id;
              const count = st.id === 'all'
                ? activePatients.length
                : activePatients.filter((p) => isPatientReadyForStation(p, st.id)).length;

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStationFilter(st.id as any)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md ring-1 ring-amber-300/50'
                      : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-750 hover:text-white'
                  }`}
                >
                  <span>{st.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-amber-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar in PiP */}
        <div className="space-y-1">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 เสิร์ช HN / เลขบัตร / ชื่อคนไข้..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500 font-sans shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown in PiP Mode */}
          {cleanSearch !== '' && (
            <div className="max-h-44 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg p-1.5 space-y-1 shadow-2xl">
              {preMatches.length === 0 && activeMatches.length === 0 && completedMatches.length === 0 ? (
                <p className="text-[10px] text-slate-500 p-2 text-center">ไม่พบข้อมูลคนไข้ที่ตรงกัน</p>
              ) : (
                <>
                  {activeMatches.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setSearchQuery('');
                      }}
                      className="p-2 bg-slate-800 hover:bg-amber-950/80 border border-slate-700 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{p.name} ({p.hn})</span>
                        <span className="text-[10px] text-emerald-400 font-mono">คิวในระบบ</span>
                      </div>
                      <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">เลือกดู</span>
                    </div>
                  ))}
                  {completedMatches.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setSearchQuery('');
                      }}
                      className="p-2 bg-blue-950/80 hover:bg-blue-900 border border-blue-700 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-blue-200 block">{p.name} ({p.hn})</span>
                        <span className="text-[10px] text-sky-300 font-mono">💳 ปิดสิทธิ์แล้ว</span>
                      </div>
                      <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">แก้ไข</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Patient Queue Dropdown Selector in PiP */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>
              {stationFilter === 'all'
                ? `1. คิวคนไข้ทั้งหมด (${activePatients.length} ราย):`
                : `1. คิวพร้อมคีย์แผนกนี้ (${visibleQueuePatients.length} ราย):`}
            </span>
          </div>
          <select
            value={currentPatient?.id || ''}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full text-xs bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 outline-none focus:border-sky-500 cursor-pointer shadow-sm"
          >
            {currentPatient && !visibleQueuePatients.some((p) => p.id === currentPatient.id) && (
              <option key={currentPatient.id} value={currentPatient.id}>
                {currentPatient.status === 'completed'
                  ? `💳 [เคสปิดสิทธิ์แล้ว] HN: ${currentPatient.hn} - ${currentPatient.name}`
                  : `🔍 [ค้นพบ] HN: ${currentPatient.hn} - ${currentPatient.name}`}
              </option>
            )}
            {visibleQueuePatients.map((p, idx) => (
              <option key={p.id} value={p.id}>
                ⚡ คิว #{idx + 1} - HN: {p.hn} - {p.name} ({p.rights})
              </option>
            ))}
          </select>
        </div>

        {/* Current Active Patient View in PiP */}
        {currentPatient ? (
          <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700 space-y-2.5 shadow-md">
            {currentPatient.status === 'completed' && (
              <div className="bg-blue-950/90 border border-blue-700/80 rounded-lg p-2 space-y-1 text-xs text-blue-200">
                <div className="flex items-center justify-between font-bold">
                  <span>💳 เคสนี้ปิดสิทธิ์สิ้นสุดบริการแล้ว</span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleSignal(currentPatient.id, 'rightsStatus', 'pending')}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-1 rounded-lg font-bold text-[11px] shadow cursor-pointer transition-colors flex items-center justify-center gap-1 border border-amber-300"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>↺ ยกเลิกปิดสิทธิ์ / ดึงกลับมาแก้ไข</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
              <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950 border border-sky-800 px-2 py-0.5 rounded-md">
                HN: {currentPatient.hn}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-md">
                {currentPatient.status === 'completed' ? '💳 สิ้นสุดบริการ' : `คิวที่ #${currentQueueIndex}`}
              </span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <h4 className="font-bold text-xs text-white truncate max-w-[200px]">{currentPatient.name}</h4>
                <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-700 shrink-0">
                  สิทธิ์: {currentPatient.rights}
                </span>
              </div>

              <div className="text-[10px] text-slate-300 font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <span>🆔 เลขบัตร: <strong className="text-white">{currentPatient.citizenId || '-'}</strong></span>
                  <span>อายุ: <strong className="text-white">{currentPatient.age || '-'} ปี</strong></span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-800 text-[10px]">
                  <span className="text-emerald-300 font-bold">⚖️ น้ำหนัก: <strong className="text-white">{currentPatient.weight ? `${currentPatient.weight} kg` : '-'}</strong></span>
                  <span className="text-emerald-300 font-bold">📏 ส่วนสูง: <strong className="text-white">{currentPatient.height ? `${currentPatient.height} cm` : '-'}</strong></span>
                  <span className="text-amber-300 font-bold">🩺 BP: <strong className="text-white">{currentPatient.bloodPressure || '-'}</strong></span>
                  <span className="text-rose-300 font-bold">❤️ ชีพจร: <strong className="text-white">{currentPatient.pulseRate ? `${currentPatient.pulseRate} bpm` : '-'}</strong></span>
                </div>
              </div>
            </div>

            {/* Primary Action Button for Selected Station in PiP */}
            {stationFilter !== 'all' && (
              (() => {
                const activeStationObj = orderedStations.find(
                  (st) => st.key === stationFilter || st.originalStep?.id === stationFilter
                ) || (stationFilter === 'opdStatus' || stationFilter === 'step_1' ? orderedStations[0] : null);

                if (!activeStationObj) return null;

                const step = activeStationObj.originalStep;
                const stepId = step?.id || activeStationObj.key;
                const isDone = isStationDoneForPatient(currentPatient, activeStationObj.key) || isStationDoneForPatient(currentPatient, stepId);

                const handlePrimaryClick = () => {
                  if (activeStationObj.key === 'rightsStatus' || step?.actionType === 'close_rights_discharge') {
                    handleCloseRightsAndAdvance(currentPatient, stepId);
                  } else {
                    const nextVal = isDone ? 'pending' : (activeStationObj.key === 'procedureStatus' ? 'sent' : 'opened');
                    if (nextVal !== 'pending' && !checkActionPrerequisite(currentPatient, activeStationObj.key as any)) return;
                    onToggleSignal(currentPatient.id, (stepId || activeStationObj.key) as any, nextVal);
                    if (nextVal !== 'pending') {
                      setSelectedPatientId(null);
                    }
                  }
                };

                return (
                  <button
                    type="button"
                    onClick={handlePrimaryClick}
                    className={`w-full py-2.5 px-3 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                      isDone
                        ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 animate-pulse'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {isDone
                        ? `↺ ปลด/ยกเลิกสถานะ ${activeStationObj.label}`
                        : `🟢 เสร็จสิ้น ${activeStationObj.label} (ส่งคิวถัดไป)`}
                    </span>
                  </button>
                );
              })()
            )}

            {/* Department Quick Buttons in PiP */}
            <div className="space-y-1 pt-1 border-t border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">2. ปุ่มส่งสัญญาณสเตชั่นแผนก:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {orderedStations.filter((st) => isButtonEnabled(st.key) || isButtonEnabled(st.originalStep?.id || '')).map((st) => {
                  const step = st.originalStep;
                  const stepId = step?.id || st.key;
                  const isAllowed = isActionAllowedForStation(st.key) || isActionAllowedForStation(stepId);
                  const actionType = step?.actionType || overlayConfig?.actionTypes?.[stepId] || (st.key === 'rightsStatus' || step?.name.includes('ปิดสิทธิ์') ? 'close_rights_discharge' : 'step_complete');

                  let isDone = false;
                  if (st.key === 'opdStatus') isDone = currentPatient.opdStatus === 'opened';
                  else if (st.key === 'labStatus') isDone = currentPatient.labStatus === 'opened' || currentPatient.labStatus === 'done';
                  else if (st.key === 'procedureStatus') isDone = currentPatient.procedureStatus === 'sent' || currentPatient.procedureStatus === 'done';
                  else if (st.key === 'rightsStatus') isDone = currentPatient.rightsStatus === 'closed';
                  else if (step) {
                    isDone = (currentPatient.history || []).some(h => h.stepId === step.id || h.stepName === step.name) ||
                      (currentPatient as any)[step.id] === 'opened' ||
                      (currentPatient as any)[step.id] === 'done' ||
                      (currentPatient as any)[step.id] === 'closed';
                  }

                  const handleClick = () => {
                    if (!isAllowed) {
                      alert(`🔒 สิทธิ์ถูกจำกัด\nคุณสามารถดำเนินการหรือยกเลิกได้เฉพาะในส่วนของแผนกตัวเองเท่านั้น`);
                      return;
                    }

                    if (actionType === 'close_rights_discharge' || st.key === 'rightsStatus') {
                      handleCloseRightsAndAdvance(currentPatient, stepId);
                    } else {
                      const nextVal = isDone ? 'pending' : (st.key === 'procedureStatus' ? 'sent' : 'opened');
                      if (nextVal !== 'pending' && !checkActionPrerequisite(currentPatient, st.key as any)) return;
                      onToggleSignal(currentPatient.id, (stepId || st.key) as any, nextVal);
                      if (nextVal !== 'pending') {
                        setSelectedPatientId(null);
                      }
                    }
                  };

                  const isFullWidth = actionType === 'close_rights_discharge' || st.key === 'rightsStatus';

                  return (
                    <button
                      key={st.key}
                      onClick={handleClick}
                      className={`p-2 rounded-xl text-center text-[11px] font-bold border transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer ${
                        isFullWidth ? 'col-span-2' : ''
                      } ${
                        !isAllowed
                          ? 'opacity-40 bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed'
                          : isDone
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-extrabold shadow'
                          : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-750 hover:text-white'
                      }`}
                    >
                      <span>{st.defaultIcon}</span>
                      <span>{st.label}:</span>
                      <span>{!isAllowed ? '🔒' : isDone ? (st.key === 'rightsStatus' ? '💳 เสร็จ' : '🟢 เสร็จ') : (st.key === 'rightsStatus' ? '⚪ ปิดสิทธิ์' : '⚪ ส่ง')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Service Tags with Check/Uncheck in PiP */}
            {isButtonEnabled('requestedServices') && availableServices.length > 0 && (
              <div className="pt-2 border-t border-slate-700 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">บริการพิเศษ (คลิกเพื่อติ๊ก/ปลดออก):</span>
                <div className="flex flex-wrap gap-1.5">
                  {availableServices.map((srv) => {
                    const isSelected = (currentPatient.requestedServices || []).includes(srv.name);
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => handleToggleService(currentPatient, srv.name)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-750'
                        }`}
                      >
                        {isSelected ? `✓ ${srv.name}` : `+ ${srv.name}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Notes Text Box in PiP */}
            {isButtonEnabled('quickNotes') && (
              <div className="pt-2 border-t border-slate-700 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">ข้อความส่งซิกด่วน:</span>
                <input
                  type="text"
                  placeholder="พิมพ์ข้อความส่งซิกด่วน..."
                  defaultValue={currentPatient.quickNotes || ''}
                  key={currentPatient.id + '_notes_' + (currentPatient.quickNotes || '')}
                  onBlur={(e) => onUpdateQuickNotes(currentPatient.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onUpdateQuickNotes(currentPatient.id, e.currentTarget.value);
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 placeholder:text-slate-500 outline-none focus:border-amber-400 font-sans"
                />
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-slate-500 py-4 italic text-xs">ไม่มีคนไข้ในคิวส่งซิกขณะนี้</p>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Portal to Document Picture-in-Picture window if active */}
      {pipWindow && ReactDOM.createPortal(renderPipContent(), pipWindow.document.body)}

      {/* Top Banner Sticky Mini-Bar */}
      {isTopStickyBar && opdFirstPatient && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 text-white border-b border-indigo-500/50 px-4 py-2 shadow-xl backdrop-blur-md flex items-center justify-between text-xs font-sans animate-fadeIn">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded font-mono text-[10px] shrink-0">
              🔥 คิวที่ 1 (OPD คนแรก)
            </span>
            <span className="font-bold text-white shrink-0">
              HN: {opdFirstPatient.hn} - {opdFirstPatient.name} ({opdFirstPatient.rights})
            </span>

            {/* Status indicators */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isButtonEnabled('opdStatus') && (
                <button
                  onClick={() => {
                    if (!isActionAllowedForStation('opdStatus')) {
                      alert('🔒 สิทธิ์ถูกจำกัด\nคุณสามารถดำเนินการหรือยกเลิกได้เฉพาะในส่วนของแผนกตัวเองเท่านั้น');
                      return;
                    }
                    const next = opdFirstPatient.opdStatus === 'opened' ? 'pending' : 'opened';
                    onToggleSignal(opdFirstPatient.id, 'opdStatus', next);
                    if (next !== 'pending') setSelectedPatientId(null);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    opdFirstPatient.opdStatus === 'opened' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opdFirstPatient.opdStatus === 'opened' ? '🟢 เปิด OPD แล้ว' : '⚪ เปิด OPD'}
                </button>
              )}

              {isButtonEnabled('labStatus') && (
                <button
                  onClick={() => {
                    if (!isActionAllowedForStation('labStatus')) {
                      alert('🔒 สิทธิ์ถูกจำกัด\nคุณสามารถดำเนินการหรือยกเลิกได้เฉพาะในส่วนของแผนกตัวเองเท่านั้น');
                      return;
                    }
                    const next = opdFirstPatient.labStatus === 'opened' ? 'pending' : 'opened';
                    onToggleSignal(opdFirstPatient.id, 'labStatus', next);
                    if (next !== 'pending') setSelectedPatientId(null);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    opdFirstPatient.labStatus === 'opened' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opdFirstPatient.labStatus === 'opened' ? '🧪 เปิดแล็บแล้ว' : '⚪ เปิดแล็บ'}
                </button>
              )}

              {isButtonEnabled('procedureStatus') && (
                <button
                  onClick={() => {
                    if (!isActionAllowedForStation('procedureStatus')) {
                      alert('🔒 สิทธิ์ถูกจำกัด\nคุณสามารถดำเนินการหรือยกเลิกได้เฉพาะในส่วนของแผนกตัวเองเท่านั้น');
                      return;
                    }
                    const next = opdFirstPatient.procedureStatus === 'sent' ? 'pending' : 'sent';
                    onToggleSignal(opdFirstPatient.id, 'procedureStatus', next);
                    if (next !== 'pending') setSelectedPatientId(null);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    opdFirstPatient.procedureStatus === 'sent' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opdFirstPatient.procedureStatus === 'sent' ? '🩹 ส่งหัตถการแล้ว' : '⚪ ส่งหัตถการ'}
                </button>
              )}

              {isButtonEnabled('rightsStatus') && (
                <button
                  onClick={() => handleCloseRightsAndAdvance(opdFirstPatient)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    opdFirstPatient.rightsStatus === 'closed' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opdFirstPatient.rightsStatus === 'closed' ? '💳 ปิดสิทธิ์แล้ว' : '⚪ ปิดสิทธิ์'}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenPipWindow}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>ป๊อปอัพ Always-On-Top</span>
            </button>
            <button
              onClick={() => setIsTopStickyBar(false)}
              className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Widget Positioned Bottom-Right */}
      <div
        id="signal-overlay-widget"
        className={`fixed z-50 font-sans transition-all duration-300 max-w-sm w-full sm:w-[420px] ${
          isTopStickyBar ? 'top-12 right-4' : 'bottom-4 right-4'
        }`}
      >
        {/* Minimized Floating Bar */}
        {isMinimized ? (
          <div className="bg-[#1A252F] text-white p-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3 animate-scaleUp">
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="w-3 h-3 bg-emerald-500 rounded-full block animate-ping absolute top-0 left-0" />
                <span className="w-3 h-3 bg-emerald-500 rounded-full block relative" />
              </div>
              <div>
                <span className="font-bold text-xs block text-white flex items-center gap-1">
                  <span>ปลั๊กอินส่งซิกด่วน (Signals Overlay)</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {activePatients.length} คิวรออยู่ | ยอดวันนี้ {todayPatients.length} คน
                </span>
              </div>
            </div>

            <button
              id="btn-expand-signal-overlay"
              onClick={() => setIsMinimized(false)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sky-400 transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">เปิดแผงซิก</span>
            </button>
          </div>
        ) : (
          /* Full Expanded Overlay Floating Panel */
          <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden flex flex-col max-h-[88vh] animate-scaleUp">
            {/* Widget Title Header Bar */}
            <div className="bg-[#151E27] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-400/30">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>ปลั๊กอินส่งซิกด่วนล็อกหน้าจอ</span>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                      ALWAYS ON TOP
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-sans">
                    ค้นหา HN / ส่งซิกต่อแผนก / นับยอดสรุปประจำวัน
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  id="btn-pip-always-on-top"
                  onClick={handleOpenPipWindow}
                  className="p-1.5 text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="เปิดป๊อปอัพ Always-On-Top ลอยทับโปรแกรม HCIS"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Popout</span>
                </button>

                <button
                  onClick={() => setIsTopStickyBar(!isTopStickyBar)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isTopStickyBar ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="ตรึงแถบส่งซิกไว้ที่ขอบบนสุดของจอ"
                >
                  <Pin className="w-4 h-4" />
                </button>

                <button
                  id="btn-minimize-signal-overlay"
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="ย่อแถบให้เล็กลง"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TAB SELECTOR INSIDE PLUGIN OVERLAY */}
            <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs font-sans">
              <button
                onClick={() => setOverlayTab('signals')}
                className={`flex-1 py-2 px-3 font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                  overlayTab === 'signals'
                    ? 'border-sky-500 text-sky-400 bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>⚡ ส่งซิกด่วนแผนก</span>
              </button>
              <button
                onClick={() => setOverlayTab('totals')}
                className={`flex-1 py-2 px-3 font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                  overlayTab === 'totals'
                    ? 'border-sky-500 text-sky-400 bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>📊 ยอดสรุปวันนี้ ({todayPatients.length})</span>
              </button>
            </div>

            {/* Body Content */}
            <div className="p-4 space-y-3 overflow-y-auto">

              {overlayTab === 'signals' ? (
                <>
                  {/* 🔎 SEARCH BAR IN OVERLAY */}
                  <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700 space-y-2">
                    <label className="block text-[10px] font-bold text-sky-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Search className="w-3.5 h-3.5 text-sky-400" />
                        <span>ค้นหาเลข HN / เลขบัตร ดึงข้อมูลส่งซิก:</span>
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="พิมพ์เลข HN, เลขบัตร หรือชื่อ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-sky-500 font-sans"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-1.5 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Unified Search Dropdown */}
                    {cleanSearch !== '' && (
                      <div className="max-h-52 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg p-1.5 space-y-1.5 shadow-2xl">
                        {preMatches.length === 0 && activeMatches.length === 0 && completedMatches.length === 0 ? (
                          <p className="text-[11px] text-slate-500 p-2 text-center">ไม่พบข้อมูลคนไข้ที่ตรงกัน</p>
                        ) : (
                          <>
                            {preMatches.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wider px-1 block">
                                  ลงทะเบียนล่วงหน้า (Pre-registered):
                                </span>
                                {preMatches.map((pre) => (
                                  <div
                                    key={pre.id}
                                    onClick={() => handleSelectPrePatient(pre)}
                                    className="p-2 bg-slate-800/90 hover:bg-sky-950/80 border border-slate-700 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <span className="font-bold text-white block">{pre.name}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        HN: <strong className="text-sky-300">{pre.hn}</strong> | เลขบัตร: {pre.citizenId || '-'}
                                      </span>
                                    </div>
                                    <span className="text-[10px] bg-sky-600 text-white px-2 py-0.5 rounded font-bold">
                                      เปิด OPD
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {activeMatches.length > 0 && (
                              <div className="space-y-1 pt-1 border-t border-slate-800">
                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider px-1 block">
                                  คนไข้ในระบบคิวปัจจุบัน (Active Patients):
                                </span>
                                {activeMatches.map((p) => (
                                  <div
                                    key={p.id}
                                    onClick={() => {
                                      setSelectedPatientId(p.id);
                                      setSearchQuery('');
                                    }}
                                    className="p-2 bg-slate-800/90 hover:bg-emerald-950/80 border border-slate-700 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <span className="font-bold text-white block">{p.name} ({p.hn})</span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        สิทธิ์: {p.rights} | OPD: {p.opdStatus === 'opened' ? '🟢' : '⚪'} | แล็บ: {p.labStatus === 'opened' ? '🧪' : '⚪'}
                                      </span>
                                    </div>
                                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">
                                      เลือกดูคนนี้
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {completedMatches.length > 0 && (
                              <div className="space-y-1 pt-1 border-t border-slate-800">
                                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider px-1 block">
                                  💳 ปิดสิทธิ์สิ้นสุดบริการแล้ว (Completed Cases):
                                </span>
                                {completedMatches.map((p) => (
                                  <div
                                    key={p.id}
                                    onClick={() => {
                                      setSelectedPatientId(p.id);
                                      setSearchQuery('');
                                    }}
                                    className="p-2 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/60 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <span className="font-bold text-blue-100 block">{p.name} ({p.hn})</span>
                                      <span className="text-[10px] text-slate-300 font-mono">
                                        สิทธิ์: {p.rights} | สิ้นสุดบริการเมื่อ: {p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                      </span>
                                    </div>
                                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-bold">
                                      ดูประวัติ
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pre-Registered Patient Card if selected */}
                  {selectedPrePatient && (
                    <div className="bg-sky-950/80 border-2 border-sky-500 p-3 rounded-xl space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="bg-sky-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          <span>ดึงข้อมูลลงทะเบียนล่วงหน้า</span>
                        </span>
                        <button
                          onClick={() => setSelectedPrePatient(null)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-white">{selectedPrePatient.name}</h4>
                        <p className="text-[11px] text-slate-300">
                          HN: <strong className="text-sky-300 font-mono">{selectedPrePatient.hn}</strong> | เลขบัตร: {selectedPrePatient.citizenId || '-'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          อายุ {selectedPrePatient.age} ปี | สิทธิ์: <strong className="text-emerald-300">{selectedPrePatient.rights}</strong>
                        </p>
                      </div>

                      {/* Planned Services */}
                      <div className="space-y-1.5 pt-2 border-t border-sky-800">
                        <label className="block text-[10px] font-bold text-sky-200 uppercase">
                          ติ๊กบริการที่ต้องทำในการเปิด OPD ครั้งนี้:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {availableServices.map((srv) => {
                            const isChecked = preSelectedServices.includes(srv.name);
                            return (
                              <button
                                key={srv.id}
                                type="button"
                                onClick={() => {
                                  if (isChecked) {
                                    setPreSelectedServices(preSelectedServices.filter((s) => s !== srv.name));
                                  } else {
                                    setPreSelectedServices([...preSelectedServices, srv.name]);
                                  }
                                }}
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                                }`}
                              >
                                {isChecked ? `✓ ${srv.name}` : `+ ${srv.name}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={handleConfirmOpenOpdFromPre}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs shadow-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>🟢 เปิด OPD + ส่งซิกเข้าคิวทันที</span>
                      </button>
                    </div>
                  )}

                  {/* Station Standby Mode Tabs (Sleek, uncluttered) */}
                  <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-300">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-amber-400" />
                        <span>โหมดสแตนบายแผนก:</span>
                      </span>
                      {stationFilter !== 'all' && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold font-mono">
                          ⚡ คิวพร้อมคีย์: {readyPatients.length} ราย
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                      {[
                        ...orderedStations.map((st) => ({
                          uniqueKey: st.id || st.key,
                          filterId: st.key,
                          label: st.label,
                          fullName: st.fullName,
                        })),
                        { uniqueKey: 'all', filterId: 'all', label: '🌐 ทั้งหมด', fullName: 'ทุกแผนก' },
                      ].map((st) => {
                        const isActive = stationFilter === st.filterId || stationFilter === st.uniqueKey;
                        const count = st.filterId === 'all'
                          ? activePatients.length
                          : activePatients.filter((p) => isPatientReadyForStation(p, st.filterId)).length;

                        return (
                          <button
                            key={st.uniqueKey}
                            type="button"
                            onClick={() => setStationFilter(st.filterId as any)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                              isActive
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold ring-1 ring-amber-300/50'
                                : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-750 hover:text-white'
                            }`}
                          >
                            <span>{st.label}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                              isActive ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-amber-300'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Patient Selector for Queue */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>
                        {stationFilter === 'all'
                          ? `1. เลือกคนไข้ในคิวส่งซิก (${activePatients.length} ราย):`
                          : `1. คิวคนไข้ที่พร้อมคีย์ในแผนกนี้ (${visibleQueuePatients.length} ราย):`}
                      </span>
                      {currentPatient && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEditActivePatient(currentPatient)}
                            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>แก้ไข</span>
                          </button>
                          <button
                            onClick={() => setShowFullDetails(!showFullDetails)}
                            className="text-sky-400 hover:text-sky-300 underline lowercase font-normal cursor-pointer text-[10px]"
                          >
                            {showFullDetails ? 'ย่อ' : 'ขยาย'}
                          </button>
                        </div>
                      )}
                    </div>

                    {visibleQueuePatients.length === 0 && !currentPatient ? (
                      <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center space-y-1 my-1">
                        <p className="text-xs text-amber-300 font-bold">
                          {stationFilter === 'opdStatus'
                            ? '🟢 ไม่มีคนไข้ค้างรอเปิด OPD ในขณะนี้'
                            : '⏳ ยังไม่มีคิวคนไข้ที่พร้อมคีย์ในแผนกนี้ (กำลังรอสัญญาณจากแผนกก่อนหน้าก่อน)'}
                        </p>
                        {stationFilter !== 'all' && stationFilter !== 'opdStatus' && (
                          <p className="text-[10px] text-slate-400">
                            คิวจะปรากฏที่นี่โดยอัตโนมัติเมื่อแผนกก่อนหน้าส่งสัญญาณเรียบร้อย
                          </p>
                        )}
                      </div>
                    ) : (
                      <select
                        id="select-overlay-patient"
                        value={currentPatient?.id || ''}
                        onChange={(e) => {
                          setSelectedPatientId(e.target.value);
                          setIsEditingActivePatient(false);
                        }}
                        className="w-full font-sans text-xs bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:border-sky-500 transition-colors cursor-pointer"
                      >
                        {currentPatient && !visibleQueuePatients.some((p) => p.id === currentPatient.id) && (
                          <option key={currentPatient.id} value={currentPatient.id}>
                            🔍 [ค้นพบ / เสร็จแผนกนี้แล้ว] HN: {currentPatient.hn} - {currentPatient.name} ({currentPatient.rights})
                          </option>
                        )}
                        {visibleQueuePatients.map((p, idx) => (
                          <option key={p.id} value={p.id}>
                            ⚡ คิว #{idx + 1} - HN: {p.hn} - {p.name} ({p.rights})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Inline Editor */}
                  {isEditingActivePatient && currentPatient && (
                    <div className="bg-amber-950/80 border-2 border-amber-500 p-3 rounded-xl space-y-2 text-xs font-sans animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-amber-800 pb-1.5">
                        <span className="font-bold text-amber-300 flex items-center gap-1">
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>แก้ไขข้อมูลคนไข้ด่วน</span>
                        </span>
                        <button
                          onClick={() => setIsEditingActivePatient(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-300 font-bold">ชื่อ-นามสกุล:</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-300 font-bold">เลข HN:</label>
                          <input
                            type="text"
                            value={editHn}
                            onChange={(e) => setEditHn(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-300 font-bold">เลขบัตรประชาชน:</label>
                          <input
                            type="text"
                            value={editCitizenId}
                            onChange={(e) => setEditCitizenId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-300 font-bold">สิทธิ์การรักษา:</label>
                          <input
                            type="text"
                            value={editRights}
                            onChange={(e) => setEditRights(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleSaveEditActivePatient(currentPatient.id)}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 rounded text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>บันทึกการปรับเปลี่ยน</span>
                      </button>
                    </div>
                  )}

                  {currentPatient && !isEditingActivePatient && (
                    <div className="space-y-3 pt-1 border-t border-slate-800">
                      {/* Completed Case Banner with Reopen / Cancel Discharge Action */}
                      {(currentPatient.status === 'completed' || currentPatient.rightsStatus === 'closed') && (
                        <div className="bg-blue-950/90 border border-blue-500/60 p-2.5 rounded-xl flex items-center justify-between text-xs font-sans animate-fadeIn">
                          <div className="flex items-center gap-2">
                            <span className="text-base">💳</span>
                            <div>
                              <span className="font-bold text-blue-200 block">เคสนี้สิ้นสุดบริการแล้ว (บันทึกเข้าประวัติ)</span>
                              <span className="text-[10px] text-blue-300">
                                เวลา: {currentPatient.updatedAt ? new Date(currentPatient.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`ต้องการยกเลิกการปิดสิทธิ์ / ดึงคิวของคุณ "${currentPatient.name}" กลับมารับบริการต่อใช่หรือไม่?`)) {
                                onToggleSignal(currentPatient.id, 'rightsStatus', 'pending');
                              }
                            }}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg font-bold text-[11px] shadow cursor-pointer transition-colors shrink-0 flex items-center gap-1"
                          >
                            <span>↺ ยกเลิกปิดสิทธิ์/แก้ไข</span>
                          </button>
                        </div>
                      )}

                      {/* Patient Summary Header & Vital Signs Bar (Always Visible) */}
                      <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-700/70 pb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-sky-400 font-bold bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                              HN: {currentPatient.hn}
                            </span>
                            <span className="text-white font-bold text-sm">{currentPatient.name}</span>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                            สิทธิ์: {currentPatient.rights}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono bg-slate-900/90 p-2 rounded-lg border border-slate-700">
                          <div><span className="text-slate-400 text-[10px] block">เลขบัตร:</span> <strong className="text-white">{currentPatient.citizenId || '-'}</strong></div>
                          <div><span className="text-slate-400 text-[10px] block">น้ำหนัก/ส่วนสูง:</span> <strong className="text-emerald-300">{currentPatient.weight ? `${currentPatient.weight} kg` : '-'} / {currentPatient.height ? `${currentPatient.height} cm` : '-'}</strong></div>
                          <div><span className="text-slate-400 text-[10px] block">ความดัน (BP):</span> <strong className="text-amber-300">{currentPatient.bloodPressure ? `${currentPatient.bloodPressure} mmHg` : '-'}</strong></div>
                          <div><span className="text-slate-400 text-[10px] block">ชีพจร (PR):</span> <strong className="text-rose-300">{currentPatient.pulseRate ? `${currentPatient.pulseRate} bpm` : '-'}</strong></div>
                        </div>
                      </div>

                      {/* Primary Standby Action Button for Active Station */}
                      {stationFilter !== 'all' && (
                        (() => {
                          const activeStationObj = orderedStations.find(
                            (st) => st.key === stationFilter || st.originalStep?.id === stationFilter
                          ) || (stationFilter === 'opdStatus' || stationFilter === 'step_1' ? orderedStations[0] : null);

                          if (!activeStationObj) return null;

                          const step = activeStationObj.originalStep;
                          const stepId = step?.id || activeStationObj.key;
                          const isDone = isStationDoneForPatient(currentPatient, activeStationObj.key) || isStationDoneForPatient(currentPatient, stepId);

                          const handlePrimaryClick = () => {
                            if (!isActionAllowedForStation(activeStationObj.key) && (!step || !isActionAllowedForStation(step.id))) {
                              alert(`🔒 สิทธิ์ถูกจำกัด\nคุณสามารถดำเนินการหรือยกเลิกได้เฉพาะในส่วนของแผนกตัวเองเท่านั้น`);
                              return;
                            }

                            if (activeStationObj.key === 'rightsStatus' || step?.actionType === 'close_rights_discharge') {
                              handleCloseRightsAndAdvance(currentPatient, stepId);
                            } else {
                              const nextVal = isDone ? 'pending' : (activeStationObj.key === 'procedureStatus' ? 'sent' : 'opened');
                              if (nextVal !== 'pending' && !checkActionPrerequisite(currentPatient, activeStationObj.key as any)) return;
                              onToggleSignal(currentPatient.id, (stepId || activeStationObj.key) as any, nextVal);
                              if (nextVal !== 'pending') {
                                setSelectedPatientId(null);
                              }
                            }
                          };

                          return (
                            <button
                              type="button"
                              onClick={handlePrimaryClick}
                              className={`w-full py-2.5 px-4 rounded-xl font-black text-xs md:text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                                isDone
                                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 animate-pulse'
                              }`}
                            >
                              <CheckCircle2 className="w-5 h-5 shrink-0" />
                              <span>
                                {isDone
                                  ? `↺ ยกเลิก / ปลดสถานะ ${activeStationObj.fullName}`
                                  : `🟢 กดเสร็จสิ้นขั้นตอน ${activeStationObj.fullName} (ส่งคิวถัดไป)`}
                              </span>
                            </button>
                          );
                        })()
                      )}

                      {/* Patient Detailed Accordion */}
                      {showFullDetails && (
                        <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700 space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-slate-700/70 pb-1.5">
                            <span className="font-mono text-[11px] text-sky-400 font-bold bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                              HN: {currentPatient.hn}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              เลขบัตร: <strong className="text-slate-200">{currentPatient.citizenId || '-'}</strong>
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-400 block text-[10px]">ชื่อ-นามสกุล / เพศ:</span>
                              <strong className="text-white">{currentPatient.name} ({currentPatient.gender || 'ชาย'})</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">สิทธิ์การรักษา / อายุ:</span>
                              <strong className="text-emerald-400">{currentPatient.rights} ({currentPatient.age || '-'} ปี)</strong>
                            </div>
                          </div>

                          {/* Vital Signs & BMI & Blood Pressure from Screening */}
                          {(currentPatient.weight || currentPatient.height || currentPatient.bmi || currentPatient.bloodPressure || currentPatient.pulseRate) && (
                            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/80 space-y-1 text-[10px]">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">สัญญาณชีพ:</span>
                                  <span className="text-white font-mono font-bold">
                                    {currentPatient.weight ? `${currentPatient.weight} kg` : '-'} / {currentPatient.height ? `${currentPatient.height} cm` : '-'}
                                  </span>
                                </div>
                                {currentPatient.bmi && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400">BMI:</span>
                                    <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-400/30 rounded font-mono font-bold">
                                      {currentPatient.bmi} {currentPatient.bmiCategory ? `(${currentPatient.bmiCategory})` : ''}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {(currentPatient.bloodPressure || currentPatient.pulseRate) && (
                                <div className="flex items-center gap-3 pt-1 border-t border-slate-800 text-[10px]">
                                  {currentPatient.bloodPressure && (
                                    <span className="text-emerald-300 font-mono font-bold">
                                      🩺 ความดัน (BP): <span className="text-white">{currentPatient.bloodPressure}</span> mmHg
                                    </span>
                                  )}
                                  {currentPatient.pulseRate && (
                                    <span className="text-rose-300 font-mono font-bold">
                                      ❤️ ชีพจร (Pulse): <span className="text-white">{currentPatient.pulseRate}</span> bpm
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Requested services */}
                          {(currentPatient.requestedServices || []).length > 0 && (
                            <div className="pt-2 border-t border-slate-700/60">
                              <span className="text-[10px] text-slate-400 block mb-1 font-bold">รายการบริการส่งซิกวันนี้:</span>
                              <div className="flex flex-wrap gap-1">
                                {currentPatient.requestedServices!.map((srv, idx) => (
                                  <span key={idx} className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] px-2 py-0.5 rounded font-bold">
                                    ✓ {srv}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                        {/* Quick Signal Action Buttons Grid */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              2. กดส่งซิกต่อแผนก (ตรงตาม Workflow & คำอธิบาย):
                            </label>
                            {/* Step completion pill */}
                            <span className="text-[10px] font-mono font-bold bg-slate-800 text-sky-400 border border-slate-700 px-2 py-0.5 rounded-full">
                              ผ่าน {
                                [
                                  currentPatient.opdStatus === 'opened',
                                  currentPatient.labStatus === 'opened' || currentPatient.labStatus === 'done',
                                  currentPatient.procedureStatus === 'sent' || currentPatient.procedureStatus === 'done',
                                  currentPatient.rightsStatus === 'closed'
                                ].filter(Boolean).length
                              }/{workflowSteps.length || 4} ห้อง
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {orderedStations.filter((st) => isButtonEnabled(st.key)).map((st) => {
                              const step = st.originalStep;
                              const isAllowed = isActionAllowedForStation(st.key) || (step && isActionAllowedForStation(step.id));
                              const stepDesc = step?.description || '';

                              // Calculate isDone status
                              let isDone = false;
                              if (st.key === 'opdStatus') isDone = currentPatient.opdStatus === 'opened';
                              else if (st.key === 'labStatus') isDone = currentPatient.labStatus === 'opened' || currentPatient.labStatus === 'done';
                              else if (st.key === 'procedureStatus') isDone = currentPatient.procedureStatus === 'sent' || currentPatient.procedureStatus === 'done';
                              else if (st.key === 'rightsStatus') isDone = currentPatient.rightsStatus === 'closed';
                              else if (step) {
                                isDone = currentPatient.history?.some(h => h.stepId === step.id || h.stepName === step.name) ||
                                  (currentPatient as any)[step.id] === 'opened' ||
                                  (currentPatient as any)[step.id] === 'done';
                              }

                              // Check prerequisites
                              const prereqIds = step?.prerequisiteStepIds || overlayConfig?.stationPrerequisites?.[step?.id || ''] || overlayConfig?.stationPrerequisites?.[st.key] || [];
                              const missingPrereqs = prereqIds.filter((reqId) => {
                                const reqStep = workflowSteps.find((s) => s.id === reqId);
                                const reqKey = reqStep ? getStationKeyForStep(reqStep, workflowSteps.indexOf(reqStep)) : reqId;
                                if (reqKey === 'opdStatus' || reqId.includes('opd')) return currentPatient.opdStatus !== 'opened';
                                if (reqKey === 'labStatus' || reqId.includes('lab')) return currentPatient.labStatus !== 'opened' && currentPatient.labStatus !== 'done';
                                if (reqKey === 'procedureStatus' || reqId.includes('proc')) return currentPatient.procedureStatus !== 'sent' && currentPatient.procedureStatus !== 'done';
                                if (reqKey === 'rightsStatus' || reqId.includes('right')) return currentPatient.rightsStatus !== 'closed';
                                return !currentPatient.history?.some((h) => h.stepId === reqId || h.stepName === reqStep?.name);
                              });

                              const hasPrereqError = missingPrereqs.length > 0;
                              const missingNames = missingPrereqs.map((reqId) => {
                                const found = workflowSteps.find((s) => s.id === reqId);
                                return found ? found.name : reqId;
                              });

                              // Action Role & Label
                              const actionType = step?.actionType || overlayConfig?.actionTypes?.[step?.id || ''] || (st.key === 'rightsStatus' || step?.name.includes('ปิดสิทธิ์') ? 'close_rights_discharge' : 'step_complete');
                              const customLabel = step?.actionLabel || overlayConfig?.actionLabels?.[st.key] || overlayConfig?.actionLabels?.[step?.id || ''] || st.fullName;

                              const isFullWidth = actionType === 'close_rights_discharge';

                              // Theme Color Classes
                              const themeColor = step?.color || st.color || 'sky';
                              let activeThemeClass = 'bg-sky-600/40 border-sky-400 text-sky-100 ring-2 ring-sky-400/60 shadow-lg shadow-sky-950/80';
                              let inactiveThemeClass = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-sky-400';
                              let iconColor = isDone ? 'text-sky-300' : 'text-slate-400';

                              if (themeColor === 'emerald') {
                                activeThemeClass = 'bg-emerald-600/40 border-emerald-400 text-emerald-100 ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-950/80';
                                inactiveThemeClass = 'bg-slate-800/80 border-emerald-500/40 text-emerald-200 hover:bg-slate-800 hover:border-emerald-400';
                                iconColor = isDone ? 'text-emerald-300' : 'text-emerald-400/70';
                              } else if (themeColor === 'amber') {
                                activeThemeClass = 'bg-amber-600/40 border-amber-400 text-amber-100 ring-2 ring-amber-400/60 shadow-lg shadow-amber-950/80';
                                inactiveThemeClass = 'bg-slate-800/80 border-amber-500/40 text-amber-200 hover:bg-slate-800 hover:border-amber-400';
                                iconColor = isDone ? 'text-amber-300' : 'text-amber-400/70';
                              } else if (themeColor === 'purple') {
                                activeThemeClass = 'bg-purple-600/40 border-purple-400 text-purple-100 ring-2 ring-purple-400/60 shadow-lg shadow-purple-950/80';
                                inactiveThemeClass = 'bg-slate-800/80 border-purple-500/40 text-purple-200 hover:bg-slate-800 hover:border-purple-400';
                                iconColor = isDone ? 'text-purple-300' : 'text-purple-400/70';
                              } else if (themeColor === 'rose') {
                                activeThemeClass = 'bg-rose-600/40 border-rose-400 text-rose-100 ring-2 ring-rose-400/60 shadow-lg shadow-rose-950/80';
                                inactiveThemeClass = 'bg-slate-800/80 border-rose-500/40 text-rose-200 hover:bg-slate-800 hover:border-rose-400';
                                iconColor = isDone ? 'text-rose-300' : 'text-rose-400/70';
                              } else if (themeColor === 'indigo') {
                                activeThemeClass = 'bg-indigo-600/40 border-indigo-400 text-indigo-100 ring-2 ring-indigo-400/60 shadow-lg shadow-indigo-950/80';
                                inactiveThemeClass = 'bg-slate-800/80 border-indigo-500/40 text-indigo-200 hover:bg-slate-800 hover:border-indigo-400';
                                iconColor = isDone ? 'text-indigo-300' : 'text-indigo-400/70';
                              }

                              const handleClick = () => {
                                if (!isAllowed) {
                                  alert(`🔒 สิทธิ์ถูกจำกัด\nคุณสามารถดำเนินการหรือยกเลิกได้เฉพาะในส่วนของแผนกตัวเองเท่านั้น`);
                                  return;
                                }

                                if (hasPrereqError) {
                                  alert(`⏳ ยังไม่สามารถดำเนินการที่ "${st.fullName}" ได้\nเนื่องจากต้องรอให้แผนกต่อไปนี้คีย์ข้อมูลเสร็จเรียบร้อยก่อน:\n• ${missingNames.join('\n• ')}`);
                                  return;
                                }

                                if (actionType === 'close_rights_discharge') {
                                  if (isDone) {
                                    if (confirm(`ต้องการยกเลิกการปิดสิทธิ์ / ดึงคิวของคุณ "${currentPatient.name}" กลับมารับบริการต่อใช่หรือไม่?`)) {
                                      onToggleSignal(currentPatient.id, (step?.id || 'rightsStatus') as any, 'pending');
                                    }
                                  } else {
                                    handleCloseRightsAndAdvance(currentPatient, step?.id);
                                  }
                                } else {
                                  const nextVal = isDone ? 'pending' : (st.key === 'procedureStatus' ? 'sent' : 'opened');
                                  onToggleSignal(currentPatient.id, (step?.id || st.key) as any, nextVal);
                                  if (nextVal !== 'pending') {
                                    setSelectedPatientId(null);
                                  }
                                }
                              };

                              return (
                                <button
                                  key={st.id || `${st.key}-${step?.id || st.fullName}`}
                                  id={`btn-signal-${st.id || st.key}`}
                                  onClick={handleClick}
                                  className={`p-2.5 rounded-xl border font-sans text-xs font-bold transition-all flex flex-col items-center justify-between gap-1 cursor-pointer text-center relative ${
                                    isFullWidth ? 'col-span-2' : ''
                                  } ${
                                    !isAllowed
                                      ? 'opacity-40 bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed'
                                      : isDone
                                      ? activeThemeClass
                                      : inactiveThemeClass
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 justify-center w-full">
                                    <CheckCircle2 className={`w-4 h-4 ${!isAllowed ? 'text-slate-600' : iconColor}`} />
                                    <span className="truncate max-w-[180px]">{st.fullName}</span>
                                    {isFullWidth && (
                                      <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded font-sans uppercase shadow-xs">
                                        ✨ ปุ่มพิเศษ: จบเคสทันที
                                      </span>
                                    )}
                                  </div>

                                  {stepDesc && (
                                    <span className="text-[9px] font-normal text-slate-300/80 line-clamp-1 max-w-full">
                                      {stepDesc}
                                    </span>
                                  )}

                                  <div className="text-[10px] font-extrabold truncate max-w-full mt-0.5">
                                    {!isAllowed ? (
                                      <span className="text-slate-500 font-sans">🔒 ไม่มีสิทธิ์ (Settings)</span>
                                    ) : hasPrereqError ? (
                                      <span className="text-amber-400 font-sans flex items-center justify-center gap-1">
                                        <Clock className="w-3 h-3 animate-spin" /> รอผลจาก {missingNames[0]}
                                      </span>
                                    ) : isDone ? (
                                      <span className="text-emerald-300 font-bold">✓ {customLabel} (เสร็จแล้ว)</span>
                                    ) : (
                                      <span className="text-slate-200 hover:text-white">⚪ กดเพื่อ {customLabel}</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                      {/* Service Tags */}
                      {isButtonEnabled('requestedServices') && availableServices.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-800">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>3. ติ๊กซิกบริการพิเศษ:</span>
                            {!isActionAllowedForStation('requestedServices') && (
                              <span className="text-[9px] text-rose-400 font-normal">🔒 แผนกนี้ถูกปิดสิทธิ์บริการ</span>
                            )}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {availableServices.map((srv) => {
                              const isSelected = (currentPatient.requestedServices || []).includes(srv.name);
                              const isSrvAllowed = isActionAllowedForStation('requestedServices');
                              return (
                                <button
                                  key={srv.id}
                                  onClick={() => handleToggleService(currentPatient, srv.name)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    !isSrvAllowed
                                      ? 'bg-slate-900 border border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                                      : isSelected
                                      ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                                  }`}
                                >
                                  {isSelected ? `✓ ${srv.name}` : `+ ${srv.name}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Custom Signal Note Bar */}
                      {isButtonEnabled('quickNotes') && onUpdateQuickNotes && (
                        <div className="pt-2 border-t border-slate-800 space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>4. พิมพ์ข้อความส่งซิกด่วน:</span>
                            {!isActionAllowedForStation('quickNotes') && (
                              <span className="text-[9px] text-rose-400 font-normal">🔒 แผนกนี้ถูกปิดสิทธิ์พิมพ์โน้ต</span>
                            )}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              disabled={!isActionAllowedForStation('quickNotes')}
                              placeholder={
                                !isActionAllowedForStation('quickNotes')
                                  ? '🔒 แผนกนี้ไม่มีสิทธิ์พิมพ์โน้ตด่วน (ตั้งค่าใน Settings)'
                                  : 'พิมพ์ข้อความ เช่น ยาพร้อมรับแล้ว...'
                              }
                              value={customNote || currentPatient.quickNotes || ''}
                              onChange={(e) => setCustomNote(e.target.value)}
                              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-sky-500 font-sans disabled:opacity-50 disabled:bg-slate-900"
                            />
                            <button
                              disabled={!isActionAllowedForStation('quickNotes')}
                              onClick={() => {
                                if (!isActionAllowedForStation('quickNotes')) {
                                  alert('🔒 แผนกนี้ไม่มีสิทธิ์พิมพ์โน้ตด่วน');
                                  return;
                                }
                                onUpdateQuickNotes(currentPatient.id, customNote);
                              }}
                              className="bg-sky-600 hover:bg-sky-500 text-white p-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* OVERLAY TAB: DAILY TOTALS & STATS HISTORY */
                <div className="space-y-3 font-sans text-xs animate-fadeIn">
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-emerald-400" />
                        <span>นับยอดรวมผู้ป่วยประจำวันนี้ ({todayStr})</span>
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                        {todayPatients.length} คน
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-700 text-center">
                        <span className="text-[9px] text-slate-400 block font-sans">🟢 เปิด OPD แล้ว</span>
                        <span className="text-lg font-black text-emerald-400">{todayOpdOpenedCount}</span>
                        <span className="text-[9px] text-slate-500 block font-sans">คน</span>
                      </div>

                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-700 text-center">
                        <span className="text-[9px] text-slate-400 block font-sans">🧪 ตรวจแล็บเสร็จ</span>
                        <span className="text-lg font-black text-purple-400">{todayLabDoneCount}</span>
                        <span className="text-[9px] text-slate-500 block font-sans">คน</span>
                      </div>

                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-700 text-center">
                        <span className="text-[9px] text-slate-400 block font-sans">🩹 ทำหัตถการเสร็จ</span>
                        <span className="text-lg font-black text-amber-400">{todayProcedureDoneCount}</span>
                        <span className="text-[9px] text-slate-500 block font-sans">คน</span>
                      </div>

                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-700 text-center">
                        <span className="text-[9px] text-slate-400 block font-sans">💳 ปิดสิทธิ์เรียบร้อย</span>
                        <span className="text-lg font-black text-blue-400">{todayRightsClosedCount}</span>
                        <span className="text-[9px] text-slate-500 block font-sans">คน</span>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Services Totals Breakdown */}
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2">
                    <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider block">
                      ยอดรวมการใช้บริการพิเศษวันนี้ (แยกตามประเภทบริการ):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(serviceStatsCounts).map(([serviceName, count]) => (
                        <div key={serviceName} className="bg-slate-900 px-2 py-1.5 rounded border border-slate-750 flex items-center justify-between">
                          <span className="text-[11px] text-slate-300 truncate">{serviceName}</span>
                          <span className="text-xs font-bold text-sky-400 font-mono bg-sky-950 px-1.5 py-0.2 rounded border border-sky-800">
                            {count} คน
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Today Patient List */}
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      รายชื่อคนไข้มารับบริการวันนี้ ({todayPatients.length} ราย):
                    </span>

                    {todayPatients.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2 text-center">ยังไม่มีประวัติคนไข้วันนี้</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {todayPatients.map((p, idx) => (
                          <div key={p.id} className="bg-slate-900 p-2 rounded-lg border border-slate-750 space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">#{idx + 1} {p.name}</span>
                              <span className="text-[10px] font-mono text-sky-300 font-bold bg-sky-950 px-1.5 rounded border border-sky-800">
                                {p.hn}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>สิทธิ์: {p.rights}</span>
                              <div className="flex items-center gap-1 font-mono">
                                <span>OPD: {p.opdStatus === 'opened' ? '🟢' : '⚪'}</span>
                                <span>LAB: {p.labStatus === 'opened' ? '🧪' : '⚪'}</span>
                                <span>RIGHTS: {p.rightsStatus === 'closed' ? '💳' : '⚪'}</span>
                              </div>
                            </div>

                            {(p.requestedServices || []).length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-800">
                                {p.requestedServices!.map((s, sIdx) => (
                                  <span key={sIdx} className="text-[9px] bg-slate-800 text-sky-300 px-1.5 py-0.2 rounded border border-slate-700">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
