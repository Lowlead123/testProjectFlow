/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Patient, WorkflowStep, SyncMessage, ServiceTag, OverlayConfig, PreRegisteredPatient, PatientHistoryLog, PatientRight } from './types';
import IntakeForm from './components/IntakeForm';
import WorkflowSettings from './components/WorkflowSettings';
import ActiveQueues from './components/ActiveQueues';
import DatabaseViewer from './components/DatabaseViewer';
import NotificationToast from './components/NotificationToast';
import StandbyWizard from './components/StandbyWizard';
import SignalOverlay from './components/SignalOverlay';
import PreRegisterDirectory from './components/PreRegisterDirectory';
import { playNotificationChime } from './utils/audio';
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { 
  Activity, 
  PlusCircle, 
  Settings, 
  Database, 
  Monitor, 
  Clock, 
  BellRing,
  VolumeX,
  Volume2,
  AlertCircle,
  Laptop,
  Check,
  ShieldCheck,
  Lock,
  Key,
  Users
} from 'lucide-react';

// Default Workflow Steps
const DEFAULT_STEPS: WorkflowStep[] = [
  { id: 'step_1', name: 'ลงทะเบียนเปิด OPD', description: 'เปิดประวัติ ตรวจสอบสิทธิ์รักษาเบื้องต้น', color: 'emerald', order: 1 },
  { id: 'step_2', name: 'ซักประวัติและสัญญาณชีพ', description: 'ชั่งน้ำหนัก วัดความดัน วัดไข้ ประเมินอาการเบื้องต้น', color: 'sky', order: 2 },
  { id: 'step_3', name: 'ตรวจรักษาโดยแพทย์', description: 'พบแพทย์เพื่อวินิจฉัยและสั่งการรักษา/สั่งยา', color: 'amber', order: 3 },
  { id: 'step_4', name: 'ห้องยาและการเงิน', description: 'ชำระเงินและรับคำอธิบายวิธีรับประทานยา', color: 'purple', order: 4 }
];

// Default Clinical Signal Services
const DEFAULT_SERVICES: ServiceTag[] = [
  { id: 'service_1', name: 'เจาะเลือด (Blood Draw)' },
  { id: 'service_2', name: 'ตรวจคลื่นไฟฟ้าหัวใจ (EKG)' },
  { id: 'service_3', name: 'พ่นยาขยายหลอดลม (Nebulizer)' },
  { id: 'service_4', name: 'ทำแผล/ตัดไหม (Wound Dressing)' },
  { id: 'service_5', name: 'ฉีดยา (Injection)' },
  { id: 'service_6', name: 'ตรวจโควิด ATK (COVID-19 Test)' }
];

// Default Patient Rights Options
export const DEFAULT_PATIENT_RIGHTS: PatientRight[] = [
  { id: 'right_1', name: 'บัตรทอง (UC)' },
  { id: 'right_2', name: 'ประกันสังคม' },
  { id: 'right_3', name: 'ข้าราชการ / เบิกตรง' },
  { id: 'right_4', name: 'ชำระเงินเอง' },
  { id: 'right_5', name: 'ต่างชาติ / แรงงานต่างด้าว' },
  { id: 'right_6', name: 'พรบ. ผู้ประสบภัยจากรถ' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'queues' | 'preregister' | 'intake' | 'settings' | 'database'>('queues');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prePatients, setPrePatients] = useState<PreRegisteredPatient[]>([]);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [currentStationId, setCurrentStationId] = useState<string>('all');
  const [latestToast, setLatestToast] = useState<SyncMessage | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // New States for Clinical Signals, Admin passcode, and Workspace Standby
  const [availableServices, setAvailableServices] = useState<ServiceTag[]>([]);
  const [availablePatientRights, setAvailablePatientRights] = useState<PatientRight[]>([]);
  const [adminPasscode, setAdminPasscode] = useState<string>('1234');
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>({
    opdFirstAllowedActions: ['opdStatus', 'labStatus', 'procedureStatus', 'requestedServices', 'quickNotes'],
    authorizedRightsCloserRole: 'all',
    allowOtherStationsViewOnly: false
  });
  const [standbyStations, setStandbyStations] = useState<string[]>(() => {
    const saved = localStorage.getItem('opd_standby_stations');
    return saved ? JSON.parse(saved) : [];
  });
  const [showStandbyWizard, setShowStandbyWizard] = useState<boolean>(() => {
    const saved = localStorage.getItem('opd_standby_stations');
    return !saved; // Show wizard if not configured yet!
  });

  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState<boolean>(false);
  const [passcodeAttempt, setPasscodeAttempt] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string>('');

  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState<string>('');
  const [recoveryError, setRecoveryError] = useState<string>('');
  const [recoverySuccess, setRecoverySuccess] = useState<string>('');

  const [nativeNotifyGranted, setNativeNotifyGranted] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const handleRequestNativeNotify = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        setNativeNotifyGranted(true);
        try {
          new Notification('🔔 เปิดการแจ้งเตือนป๊อปอัพวินโดว์สำเร็จ!', {
            body: 'ข้อความส่งซิกด่วนจะเด้งลอยทับหน้าจอโปรแกรม HCIS เมื่อมีการส่งสัญญาณในระบบ',
          });
        } catch (e) {}
      } else {
        alert('กรุณากดอนุญาต (Allow) การแจ้งเตือนในเบราว์เซอร์เพื่อให้ป๊อปอัพเด้งลอยทับหน้าจอ HCIS ได้ครับ');
      }
    }
  };

  // References to detect updates and avoid dependency cycles
  const prevPatientsRef = useRef<Patient[]>([]);
  const isFirstLoadRef = useRef<boolean>(true);
  const workflowStepsRef = useRef<WorkflowStep[]>([]);

  // Sync ref with state
  useEffect(() => {
    workflowStepsRef.current = workflowSteps;
  }, [workflowSteps]);

  // 1. Subscribe to Workflow Steps in Firebase Firestore
  useEffect(() => {
    const unsubscribeSteps = onSnapshot(
      collection(db, 'workflowSteps'),
      async (snapshot) => {
        const steps: WorkflowStep[] = [];
        snapshot.forEach((docSnap) => {
          steps.push({ id: docSnap.id, ...docSnap.data() } as WorkflowStep);
        });

        if (steps.length === 0) {
          // Bootstrap cloud database with default steps if empty
          try {
            for (const step of DEFAULT_STEPS) {
              await setDoc(doc(db, 'workflowSteps', step.id), step);
            }
          } catch (e) {
            console.error('Error bootstrapping default steps:', e);
          }
        } else {
          steps.sort((a, b) => a.order - b.order);
          setWorkflowSteps(steps);
        }
      },
      (error) => {
        console.error('Error listening to workflowSteps:', error);
        setWorkflowSteps(DEFAULT_STEPS);
      }
    );

    return () => {
      unsubscribeSteps();
    };
  }, []);

  // 2. Subscribe to Patients in Firebase Firestore (Real-time Cloud Sync)
  useEffect(() => {
    const unsubscribePatients = onSnapshot(
      collection(db, 'patients'),
      (snapshot) => {
        const updatedList: Patient[] = [];
        snapshot.forEach((docSnap) => {
          updatedList.push({ id: docSnap.id, ...docSnap.data() } as Patient);
        });

        // Sort by register date descending
        updatedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const prevPatients = prevPatientsRef.current;

        // Only trigger visual toasts or audio notifications on cloud state transitions
        if (!isFirstLoadRef.current && prevPatients.length > 0) {
          const added = updatedList.filter(p => !prevPatients.some(prev => prev.id === p.id));
          const stepChanged = updatedList.filter(p => {
            const prev = prevPatients.find(item => item.id === p.id);
            return prev && prev.currentStepId !== p.currentStepId;
          });

          // Detect Quick Signal updates
          const signalChanged = updatedList.filter(p => {
            const prev = prevPatients.find(item => item.id === p.id);
            if (!prev) return false;
            return (
              prev.opdStatus !== p.opdStatus ||
              prev.labStatus !== p.labStatus ||
              prev.procedureStatus !== p.procedureStatus ||
              prev.rightsStatus !== p.rightsStatus ||
              prev.quickNotes !== p.quickNotes ||
              JSON.stringify(prev.requestedServices || []) !== JSON.stringify(p.requestedServices || [])
            );
          });

          if (added.length > 0) {
            const p = added[0];
            const isTargetStation = currentStationId === 'all' || p.currentStepId === currentStationId;
            if (isTargetStation) {
              const notifyMsg: SyncMessage = {
                type: 'PATIENT_ADDED',
                patient: p,
                senderStation: 'แผนกรับทะเบียนเปิด OPD (Cloud Database)',
                timestamp: new Date().toISOString()
              };
              setLatestToast(notifyMsg);
              if (soundEnabled) {
                playNotificationChime();
              }
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification('📋 มีคนไข้ลงทะเบียนเปิด OPD ใหม่!', {
                    body: `HN: ${p.hn} - ${p.name} (สิทธิ์ ${p.rights})`,
                  });
                } catch (e) {}
              }
            }
          } else if (stepChanged.length > 0) {
            const p = stepChanged[0];
            const prevP = prevPatients.find(item => item.id === p.id)!;
            
            const latestSteps = workflowStepsRef.current;
            const currentStep = latestSteps.find(s => s.id === prevP.currentStepId);
            const nextStep = latestSteps.find(s => s.id === p.currentStepId);

            const isTargetStation = currentStationId === 'all' || p.currentStepId === currentStationId;
            if (isTargetStation) {
              const notifyMsg: SyncMessage = {
                type: 'STEP_COMPLETED',
                patient: p,
                stepName: currentStep ? currentStep.name : 'ขั้นตอนหลัก',
                nextStepName: nextStep ? nextStep.name : 'เสร็จสิ้นทั้งหมด',
                senderStation: currentStep ? currentStep.name : 'แผนกส่งต่อ',
                timestamp: new Date().toISOString()
              };
              setLatestToast(notifyMsg);
              if (soundEnabled) {
                playNotificationChime();
              }
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(`⏩ ย้ายสเตชั่นคิว: ${p.name}`, {
                    body: `ย้ายจาก "${currentStep?.name || 'ต้นทาง'}" ไปยัง "${nextStep?.name || 'เสร็จสิ้น'}"`,
                  });
                } catch (e) {}
              }
            }
          } else if (signalChanged.length > 0) {
            const p = signalChanged[0];
            let signalText = 'มีการอัปเดตส่งซิกด่วน';
            if (p.opdStatus === 'opened') signalText = '🟢 เปิด OPD เรียบร้อยแล้ว';
            else if (p.labStatus === 'opened') signalText = '🧪 เปิดแล็บ/ส่งแล็บแล้ว';
            else if (p.procedureStatus === 'sent') signalText = '🩹 ส่งห้องหัตถการแล้ว';
            else if (p.rightsStatus === 'closed') signalText = '💳 ปิดสิทธิ์การรักษาเรียบร้อย';
            else if (p.quickNotes) signalText = `📌 ข้อความส่งซิก: ${p.quickNotes}`;

            if (soundEnabled) {
              playNotificationChime();
            }
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`🚨 สัญญาณส่งซิกด่วน: ${p.name} (HN: ${p.hn})`, {
                  body: signalText,
                });
              } catch (e) {}
            }
          }
        }

        setPatients(updatedList);
        prevPatientsRef.current = updatedList;
        isFirstLoadRef.current = false;
      },
      (error) => {
        console.error('Error listening to patients:', error);
      }
    );

    // 3. Load Station Setting
    const savedStation = localStorage.getItem('opd_current_station_id');
    if (savedStation) {
      setCurrentStationId(savedStation);
    } else {
      setCurrentStationId('all');
    }

    return () => {
      unsubscribePatients();
    };
  }, [currentStationId, soundEnabled]);

  // Subscribe to Pre-Registered Patients
  useEffect(() => {
    const unsubscribePre = onSnapshot(
      collection(db, 'preRegisteredPatients'),
      (snapshot) => {
        const list: PreRegisteredPatient[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as PreRegisteredPatient);
        });
        setPrePatients(list);
      },
      (error) => {
        console.error('Error listening to preRegisteredPatients in App:', error);
      }
    );

    return () => unsubscribePre();
  }, []);

  // Subscribe to Available Services
  useEffect(() => {
    const unsubscribeServices = onSnapshot(
      collection(db, 'availableServices'),
      async (snapshot) => {
        const services: ServiceTag[] = [];
        snapshot.forEach((docSnap) => {
          services.push({ id: docSnap.id, ...docSnap.data() } as ServiceTag);
        });

        if (services.length === 0) {
          try {
            for (const s of DEFAULT_SERVICES) {
              await setDoc(doc(db, 'availableServices', s.id), s);
            }
          } catch (e) {
            console.error('Error bootstrapping default services:', e);
          }
        } else {
          setAvailableServices(services);
        }
      },
      (error) => {
        console.error('Error listening to availableServices:', error);
        setAvailableServices(DEFAULT_SERVICES);
      }
    );

    return () => unsubscribeServices();
  }, []);

  // Subscribe to Available Patient Rights Options
  useEffect(() => {
    const unsubscribeRights = onSnapshot(
      collection(db, 'availablePatientRights'),
      async (snapshot) => {
        const rightsList: PatientRight[] = [];
        snapshot.forEach((docSnap) => {
          rightsList.push({ id: docSnap.id, ...docSnap.data() } as PatientRight);
        });

        if (rightsList.length === 0) {
          try {
            for (const r of DEFAULT_PATIENT_RIGHTS) {
              await setDoc(doc(db, 'availablePatientRights', r.id), r);
            }
          } catch (e) {
            console.error('Error bootstrapping default patient rights:', e);
          }
        } else {
          setAvailablePatientRights(rightsList);
        }
      },
      (error) => {
        console.error('Error listening to availablePatientRights:', error);
        setAvailablePatientRights(DEFAULT_PATIENT_RIGHTS);
      }
    );

    return () => unsubscribeRights();
  }, []);

  // Subscribe to Admin Passcode
  useEffect(() => {
    const unsubscribePasscode = onSnapshot(
      doc(db, 'appSettings', 'passcode'),
      async (docSnap) => {
        if (!docSnap.exists()) {
          try {
            await setDoc(doc(db, 'appSettings', 'passcode'), { code: '1234' });
            setAdminPasscode('1234');
          } catch (e) {
            console.error('Error bootstrapping default passcode:', e);
          }
        } else {
          setAdminPasscode(docSnap.data().code || '1234');
        }
      },
      (error) => {
        console.error('Error listening to passcode:', error);
      }
    );

    return () => unsubscribePasscode();
  }, []);

  // Subscribe to Overlay Config in Firestore
  useEffect(() => {
    const unsubscribeOverlayConfig = onSnapshot(
      doc(db, 'appSettings', 'overlayConfig'),
      async (docSnap) => {
        if (!docSnap.exists()) {
          const defaultConfig: OverlayConfig = {
            opdFirstAllowedActions: ['opdStatus', 'labStatus', 'procedureStatus', 'requestedServices', 'quickNotes'],
            authorizedRightsCloserRole: 'all',
            allowOtherStationsViewOnly: false,
            actionLabels: {
              opdStatus: 'เปิด OPD แล้วนะ',
              labStatus: 'เปิดแล็บ/ส่งแล็บ',
              procedureStatus: 'ส่งห้องหัตถการ',
              rightsStatus: 'ปิดสิทธิ์เรียบร้อย',
              requestedServices: 'ส่งซิกบริการพิเศษ',
              quickNotes: 'พิมพ์ข้อความส่งซิกด่วน',
            },
            stationPermissions: {},
          };
          try {
            await setDoc(doc(db, 'appSettings', 'overlayConfig'), defaultConfig);
            setOverlayConfig(defaultConfig);
          } catch (e) {
            console.error('Error bootstrapping default overlayConfig:', e);
          }
        } else {
          const data = docSnap.data() as OverlayConfig;
          setOverlayConfig({
            opdFirstAllowedActions: data.opdFirstAllowedActions || ['opdStatus', 'labStatus', 'procedureStatus', 'requestedServices', 'quickNotes'],
            authorizedRightsCloserRole: data.authorizedRightsCloserRole || 'all',
            allowOtherStationsViewOnly: !!data.allowOtherStationsViewOnly,
            actionLabels: {
              opdStatus: data.actionLabels?.opdStatus || 'เปิด OPD แล้วนะ',
              labStatus: data.actionLabels?.labStatus || 'เปิดแล็บ/ส่งแล็บ',
              procedureStatus: data.actionLabels?.procedureStatus || 'ส่งห้องหัตถการ',
              rightsStatus: data.actionLabels?.rightsStatus || 'ปิดสิทธิ์เรียบร้อย',
              requestedServices: data.actionLabels?.requestedServices || 'ส่งซิกบริการพิเศษ',
              quickNotes: data.actionLabels?.quickNotes || 'พิมพ์ข้อความส่งซิกด่วน',
            },
            stationPermissions: data.stationPermissions || {},
            enabledSignalButtons: data.enabledSignalButtons || ['opdStatus', 'labStatus', 'procedureStatus', 'rightsStatus', 'requestedServices', 'quickNotes'],
            allowDeselectServices: data.allowDeselectServices ?? true,
            autoLinkSignalsToSteps: data.autoLinkSignalsToSteps ?? true,
            stationPrerequisites: data.stationPrerequisites || {
              procedureStatus: ['opdStatus'],
              labStatus: ['opdStatus'],
              rightsStatus: ['procedureStatus', 'opdStatus'],
            },
          });
        }
      },
      (error) => {
        console.error('Error listening to overlayConfig:', error);
      }
    );

    return () => unsubscribeOverlayConfig();
  }, []);

  const handleUpdateOverlayConfig = async (newConfig: OverlayConfig) => {
    try {
      await setDoc(doc(db, 'appSettings', 'overlayConfig'), newConfig);
    } catch (err) {
      console.error('Error updating overlayConfig in Firestore:', err);
    }
  };

  const handleAddService = async (name: string) => {
    const id = `service_${Date.now()}`;
    try {
      await setDoc(doc(db, 'availableServices', id), { id, name });
    } catch (err) {
      console.error('Error adding service to Firestore:', err);
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'availableServices', id));
    } catch (err) {
      console.error('Error deleting service from Firestore:', err);
    }
  };

  const handleAddPatientRight = async (name: string) => {
    const id = `right_${Date.now()}`;
    try {
      await setDoc(doc(db, 'availablePatientRights', id), { id, name });
    } catch (err) {
      console.error('Error adding patient right to Firestore:', err);
    }
  };

  const handleDeletePatientRight = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'availablePatientRights', id));
    } catch (err) {
      console.error('Error deleting patient right from Firestore:', err);
    }
  };

  const handleResetPatientRights = async () => {
    try {
      const snap = await getDocs(collection(db, 'availablePatientRights'));
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, 'availablePatientRights', docSnap.id));
      }
      for (const r of DEFAULT_PATIENT_RIGHTS) {
        await setDoc(doc(db, 'availablePatientRights', r.id), r);
      }
    } catch (err) {
      console.error('Error resetting patient rights:', err);
    }
  };

  const handleUpdatePasscode = async (newPasscode: string) => {
    try {
      await setDoc(doc(db, 'appSettings', 'passcode'), { code: newPasscode });
    } catch (err) {
      console.error('Error updating passcode in Firestore:', err);
    }
  };

  const handleUpdatePatientInfo = async (patientId: string, updatedFields: Partial<Patient>) => {
    try {
      const patientRef = doc(db, 'patients', patientId);
      await setDoc(patientRef, { ...updatedFields, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.error('Error updating patient info:', err);
    }
  };

  const handleSendPreRegisteredToOpdQueue = async (prePatient: PreRegisteredPatient, customServices?: string[]) => {
    const secondStep = workflowSteps[1];
    const targetStepId = secondStep ? secondStep.id : 'step_2';
    const id = `p_${Date.now()}`;
    const newPatient: Patient = {
      id,
      hn: prePatient.hn,
      citizenId: prePatient.citizenId,
      name: prePatient.name,
      rights: prePatient.rights,
      age: prePatient.age,
      currentStepId: targetStepId,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          stepId: workflowSteps[0]?.id || 'step_1',
          stepName: workflowSteps[0]?.name || 'เปิด OPD / ลงทะเบียน',
          completedAt: new Date().toISOString(),
          completedByStation: 'จุดลงทะเบียน/เปิด OPD',
          notes: 'เปิด OPD เข้าคิวเรียบร้อย',
        }
      ],
      opdStatus: 'pending',
      requestedServices: customServices || prePatient.plannedServices || [],
      quickNotes: prePatient.notes || '',
      isDirectWalkIn: false,
      hasPreRegistrationData: true,
    };

    try {
      await setDoc(doc(db, 'patients', id), newPatient);
    } catch (err) {
      console.error('Error sending pre-registered patient to OPD queue:', err);
    }
  };

  const handleToggleSignal = async (
    patientId: string,
    field: 'opdStatus' | 'labStatus' | 'procedureStatus' | 'rightsStatus' | 'requestedServices' | string,
    value: any
  ) => {
    const isActivating = value === 'opened' || value === 'sent' || value === 'closed' || value === 'done';

    const currentPatient = prevPatientsRef.current.find((p) => p.id === patientId) || patients.find((p) => p.id === patientId);

    // Helper function to calculate patient updates consistently
    const calculatePatientUpdates = (patient: Patient) => {
      const updated: Patient = { ...patient, [field]: value, updatedAt: new Date().toISOString() };

      // Find step in workflowSteps matching field
      const stepIndex = workflowSteps.findIndex((s) =>
        s.id === field ||
        (s.id.includes('opd') && field === 'opdStatus') ||
        (s.id.includes('lab') && field === 'labStatus') ||
        (s.id.includes('proc') && field === 'procedureStatus') ||
        (s.id.includes('right') && field === 'rightsStatus')
      );
      const matchedStep = stepIndex !== -1 ? workflowSteps[stepIndex] : null;

      // Sync step ID with standard status fields
      if (value === 'pending') {
        if (field === 'opdStatus' || field === 'step_1' || (matchedStep && (matchedStep.id.includes('opd') || matchedStep.name.includes('OPD') || matchedStep.name.includes('เปิด') || matchedStep.name.includes('บัตร') || stepIndex === 0))) {
          updated.opdStatus = 'pending';
          if (matchedStep) updated[matchedStep.id] = 'pending';
        }
        if (field === 'labStatus' || field === 'step_2' || (matchedStep && (matchedStep.id.includes('lab') || matchedStep.name.includes('แล็บ') || matchedStep.name.includes('เจาะ') || stepIndex === 1))) {
          updated.labStatus = 'pending';
          if (matchedStep) updated[matchedStep.id] = 'pending';
        }
        if (field === 'procedureStatus' || field === 'step_3' || (matchedStep && (matchedStep.id.includes('proc') || matchedStep.name.includes('หัตถการ') || matchedStep.name.includes('ฉีด') || stepIndex === 2))) {
          updated.procedureStatus = 'pending';
          if (matchedStep) updated[matchedStep.id] = 'pending';
        }
        if (field === 'rightsStatus' || field === 'step_4' || (matchedStep && (matchedStep.id.includes('right') || matchedStep.name.includes('สิทธิ์') || matchedStep.name.includes('ICD') || matchedStep.name.includes('ปิด') || stepIndex === workflowSteps.length - 1))) {
          updated.rightsStatus = 'pending';
          if (matchedStep) updated[matchedStep.id] = 'pending';
        }
        if (matchedStep) {
          updated[matchedStep.id] = 'pending';
        }

        const targetStepId = matchedStep?.id || field;
        updated.history = (patient.history || []).filter((h) => {
          if (field === 'opdStatus' || field === 'step_1' || stepIndex === 0) {
            return h.stepId !== 'opdStatus' && h.stepId !== 'step_1' && h.stepId !== targetStepId;
          }
          if (field === 'labStatus' || field === 'step_2' || stepIndex === 1) {
            return h.stepId !== 'labStatus' && h.stepId !== 'step_2' && h.stepId !== targetStepId;
          }
          if (field === 'procedureStatus' || field === 'step_3' || stepIndex === 2) {
            return h.stepId !== 'procedureStatus' && h.stepId !== 'step_3' && h.stepId !== targetStepId;
          }
          if (field === 'rightsStatus' || field === 'step_4' || stepIndex === workflowSteps.length - 1) {
            return h.stepId !== 'rightsStatus' && h.stepId !== 'step_4' && h.stepId !== targetStepId;
          }
          return h.stepId !== field && h.stepId !== targetStepId;
        });

        if (patient.status === 'completed' || updated.status === 'completed') {
          updated.status = 'processing';
          updated.currentStepId = matchedStep?.id || workflowSteps[0]?.id || 'step_1';
        }
      } else {
        if (field === 'opdStatus' || field === 'step_1' || (matchedStep && (matchedStep.id.includes('opd') || matchedStep.name.includes('OPD') || matchedStep.name.includes('เปิด') || matchedStep.name.includes('บัตร') || stepIndex === 0))) {
          updated.opdStatus = (value === 'opened' || value === 'done' || value === 'processing' || value === 'sent') ? 'opened' : (value as any);
          if (matchedStep) updated[matchedStep.id] = updated.opdStatus;
        }
        if (field === 'labStatus' || field === 'step_2' || (matchedStep && (matchedStep.id.includes('lab') || matchedStep.name.includes('แล็บ') || matchedStep.name.includes('เจาะ') || stepIndex === 1))) {
          updated.labStatus = (value === 'opened' || value === 'done') ? 'opened' : (value as any);
          if (matchedStep) updated[matchedStep.id] = updated.labStatus;
        }
        if (field === 'procedureStatus' || field === 'step_3' || (matchedStep && (matchedStep.id.includes('proc') || matchedStep.name.includes('หัตถการ') || matchedStep.name.includes('ฉีด') || stepIndex === 2))) {
          updated.procedureStatus = (value === 'sent' || value === 'done' || value === 'opened') ? 'sent' : (value as any);
          if (matchedStep) updated[matchedStep.id] = updated.procedureStatus;
        }
        if (field === 'rightsStatus' || field === 'step_4' || (matchedStep && (matchedStep.id.includes('right') || matchedStep.name.includes('สิทธิ์') || matchedStep.name.includes('ICD') || matchedStep.name.includes('ปิด') || stepIndex === workflowSteps.length - 1))) {
          updated.rightsStatus = value === 'closed' ? 'closed' : (value as any);
          if (matchedStep) updated[matchedStep.id] = updated.rightsStatus;
        }
      }

      const isCloseRightsDischarge =
        field === 'rightsStatus' ||
        value === 'closed' ||
        matchedStep?.actionType === 'close_rights_discharge' ||
        (matchedStep && stepIndex === workflowSteps.length - 1 && isActivating) ||
        matchedStep?.name.includes('ปิดสิทธิ์') ||
        matchedStep?.name.includes('สิ้นสุด');

      if (isActivating && field !== 'requestedServices') {
        const stepName =
          matchedStep?.name ||
          (field === 'opdStatus'
            ? (workflowSteps[0]?.name || 'เปิด OPD / ซักประวัติ')
            : field === 'labStatus'
            ? (workflowSteps[1]?.name || 'ห้องแล็บ / เจาะเลือด')
            : field === 'procedureStatus'
            ? (workflowSteps[2]?.name || 'ห้องหัตถการ')
            : (workflowSteps[workflowSteps.length - 1]?.name || 'ปิดสิทธิ์การรักษา'));

        const logNote = isCloseRightsDischarge
          ? '💳 ปิดสิทธิ์การรักษา สิ้นสุดบริการทั้งหมด (Case Completed)'
          : `บันทึกเสร็จสิ้นที่แผนก: ${stepName}`;

        const newLog: PatientHistoryLog = {
          stepId: matchedStep?.id || field,
          stepName,
          completedAt: new Date().toISOString(),
          completedByStation: stepName,
          notes: logNote,
        };

        const existingHistory = patient.history || [];
        const hasRecentSameLog = existingHistory.some(
          (h) => (h.stepId === field || h.stepId === matchedStep?.id) &&
          (new Date().getTime() - new Date(h.completedAt).getTime() < 3000)
        );
        if (!hasRecentSameLog) {
          updated.history = [...existingHistory, newLog];
        }
      }

      if (isCloseRightsDischarge) {
        if (value === 'pending') {
          updated.status = 'processing';
          updated.currentStepId = matchedStep?.id || workflowSteps[workflowSteps.length - 1]?.id || 'step_4';
          updated.rightsStatus = 'pending';
        } else {
          updated.status = 'completed';
          updated.currentStepId = 'completed';
          updated.rightsStatus = 'closed';
        }
      } else if (value === 'pending' && (patient.status === 'completed' || updated.status === 'completed')) {
        updated.status = 'processing';
        if (matchedStep) {
          updated.currentStepId = matchedStep.id;
        }
      } else if (overlayConfig.autoLinkSignalsToSteps ?? true) {
        if (isActivating && field !== 'requestedServices') {
          if (stepIndex !== -1 && stepIndex + 1 < workflowSteps.length) {
            updated.currentStepId = workflowSteps[stepIndex + 1].id;
            updated.status = 'waiting';
          } else if (field === 'opdStatus' && value === 'opened') {
            if (workflowSteps.length > 1 && (patient.currentStepId === workflowSteps[0]?.id || patient.currentStepId === 'step_1')) {
              updated.currentStepId = workflowSteps[1].id;
              updated.status = 'waiting';
            }
          } else if ((field === 'labStatus' && (value === 'opened' || value === 'done')) || (field === 'procedureStatus' && (value === 'sent' || value === 'done'))) {
            if (workflowSteps.length > 2 && (patient.currentStepId === workflowSteps[1]?.id || patient.currentStepId === 'step_2')) {
              updated.currentStepId = workflowSteps[2].id;
              updated.status = 'waiting';
            }
          }
        }
      }

      return updated;
    };

    // Optimistic UI update
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== patientId) return p;
        return calculatePatientUpdates(p);
      })
    );

    try {
      if (!currentPatient) return;
      const updatedPatient = calculatePatientUpdates(currentPatient);
      const patientRef = doc(db, 'patients', patientId);
      await setDoc(patientRef, updatedPatient, { merge: true });
    } catch (err) {
      console.error('Error toggling quick signal:', err);
    }
  };

  const handleUpdateQuickNotes = async (patientId: string, notes: string) => {
    // Optimistic local update
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, quickNotes: notes, updatedAt: new Date().toISOString() } : p));
    try {
      const patientRef = doc(db, 'patients', patientId);
      await setDoc(
        patientRef,
        {
          quickNotes: notes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Error updating quick notes:', err);
    }
  };

  // 1. Add New Patient to Firebase
  const handleAddPatient = async (patientData: Omit<Patient, 'id' | 'hn' | 'createdAt' | 'updatedAt' | 'currentStepId' | 'status' | 'history'> & { hn?: string, requestedServices?: string[], currentStepId?: string }) => {
    const firstStep = workflowSteps[0];
    const firstStepId = firstStep ? firstStep.id : 'step_1';

    // Generate unique Hospital Number (HN) based on year + count
    const year = new Date().getFullYear() + 543;
    const count = patients.length + 1;
    const generatedHn = `HN-${year.toString().slice(2)}-${String(count).padStart(4, '0')}`;
    const hn = patientData.hn || generatedHn;

    const id = `p_${Date.now()}`;
    const targetStepId = patientData.currentStepId || firstStepId;

    const newPatient: Patient = {
      ...patientData,
      id,
      hn,
      currentStepId: targetStepId,
      status: 'waiting',
      opdStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [],
      requestedServices: patientData.requestedServices || []
    };

    // Optimistically insert locally so user sees it right away
    setPatients(prev => [newPatient, ...prev]);

    try {
      await setDoc(doc(db, 'patients', id), newPatient);

      // Clean up pre-registered patient record if matching
      const preMatch = prePatients.find(p => (p.hn && p.hn === hn) || (p.citizenId && p.citizenId.replace(/\D/g, '') === patientData.citizenId.replace(/\D/g, '')));
      if (preMatch) {
        await deleteDoc(doc(db, 'preRegisteredPatients', preMatch.id));
      }
    } catch (err) {
      console.error('Error writing patient to cloud:', err);
      alert('ไม่สามารถเชื่อมต่อฐานข้อมูลระบบออนไลน์ได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // 2. Advance Patient in Firebase
  const handleAdvancePatient = async (patientId: string, notes: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const currentStepIdx = workflowSteps.findIndex(s => s.id === patient.currentStepId);
    const currentStep = workflowSteps[currentStepIdx];
    const nextStep = workflowSteps[currentStepIdx + 1];

    const log = {
      stepId: patient.currentStepId,
      stepName: currentStep ? currentStep.name : 'ขั้นตอนหลัก',
      completedAt: new Date().toISOString(),
      completedByStation: currentStep ? currentStep.name : 'แผนกงาน',
      notes: notes.trim()
    };

    const updatedHistory = [...patient.history, log];

    let nextStepId = 'completed';
    let status: 'waiting' | 'processing' | 'completed' = 'completed';
    let rightsStatus = patient.rightsStatus;

    if (nextStep) {
      nextStepId = nextStep.id;
      status = 'waiting';
    } else {
      rightsStatus = 'closed';
    }

    const updatedPatient: Patient = {
      ...patient,
      currentStepId: nextStepId,
      status,
      rightsStatus,
      updatedAt: new Date().toISOString(),
      history: updatedHistory
    };

    // Optimistic update
    setPatients(prev => prev.map(p => p.id === patientId ? updatedPatient : p));

    try {
      await setDoc(doc(db, 'patients', patientId), updatedPatient);
    } catch (err) {
      console.error('Error advancing patient in cloud:', err);
    }
  };

  // 3. Edit Patient Details in Firebase
  const handleEditPatient = async (updatedPatient: Patient) => {
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    try {
      await setDoc(doc(db, 'patients', updatedPatient.id), updatedPatient);
    } catch (err) {
      console.error('Error updating patient in cloud:', err);
    }
  };

  // 4. Delete Patient from Firebase
  const handleDeletePatient = async (patientId: string) => {
    setPatients(prev => prev.filter(p => p.id !== patientId));
    try {
      await deleteDoc(doc(db, 'patients', patientId));
    } catch (err) {
      console.error('Error deleting patient from cloud:', err);
    }
  };

  // 5. Update Workflow Step Config in Firebase
  const handleUpdateSteps = async (newSteps: WorkflowStep[]) => {
    // Optimistically update local state immediately
    setWorkflowSteps(newSteps);

    // If standbyStations is enabled on this device, auto-add newly created steps so they appear in ActiveQueues
    if (standbyStations.length > 0) {
      const addedSteps = newSteps.filter(ns => !workflowSteps.some(ws => ws.id === ns.id));
      if (addedSteps.length > 0) {
        const updatedStandby = Array.from(new Set([...standbyStations, ...addedSteps.map(s => s.id)]));
        setStandbyStations(updatedStandby);
        localStorage.setItem('opd_standby_stations', JSON.stringify(updatedStandby));
      }
    }

    try {
      for (const step of newSteps) {
        await setDoc(doc(db, 'workflowSteps', step.id), step);
      }
      const deletedSteps = workflowSteps.filter(oldStep => !newSteps.some(newStep => newStep.id === oldStep.id));
      for (const step of deletedSteps) {
        await deleteDoc(doc(db, 'workflowSteps', step.id));
      }
    } catch (err) {
      console.error('Error updating steps in cloud:', err);
      throw err;
    }
  };

  // 6. Reset Workflow Steps in Firebase
  const handleResetToDefault = async () => {
    if (confirm('คุณต้องการคืนค่าขั้นตอนเริ่มต้น (4 ขั้นตอนพื้นฐาน) ใช่หรือไม่?')) {
      try {
        for (const step of workflowSteps) {
          await deleteDoc(doc(db, 'workflowSteps', step.id));
        }
        for (const step of DEFAULT_STEPS) {
          await setDoc(doc(db, 'workflowSteps', step.id), step);
        }
      } catch (err) {
        console.error('Error resetting steps in cloud:', err);
      }
    }
  };

  const handleSetStationId = (id: string) => {
    setCurrentStationId(id);
    localStorage.setItem('opd_current_station_id', id);
  };

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeAttempt === adminPasscode) {
      setIsSettingsUnlocked(true);
      setPasscodeAttempt('');
      setPasscodeError('');
    } else {
      setPasscodeError('รหัสลับไม่ถูกต้อง กรุณาลองอีกครั้ง (เริ่มต้นคือ 1234)');
    }
  };

  const handleResetPasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryCodeInput.trim().toUpperCase() === 'HC03') {
      await handleUpdatePasscode('1234');
      setRecoverySuccess('รีเซ็ทรหัสผ่านสำเร็จ! รหัสผ่านถูกคืนค่าเป็น 1234 เรียบร้อยแล้ว');
      setRecoveryError('');
      setRecoveryCodeInput('');
      setTimeout(() => {
        setIsResetModalOpen(false);
        setRecoverySuccess('');
        setIsSettingsUnlocked(true);
      }, 1200);
    } else {
      setRecoveryError('รหัสยืนยันฉุกเฉินไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      setRecoverySuccess('');
    }
  };

  const showQueuesTab = standbyStations.length === 0 || standbyStations.some(s => s !== 'intake' && s !== 'database');
  const showIntakeTab = standbyStations.length === 0 || standbyStations.includes('intake');
  const showDatabaseTab = standbyStations.length === 0 || standbyStations.includes('database');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Standby Station Select Wizard */}
      {showStandbyWizard && (
        <StandbyWizard
          workflowSteps={workflowSteps}
          initialSelected={standbyStations}
          onClose={standbyStations.length > 0 ? () => setShowStandbyWizard(false) : undefined}
          onSaveStandby={(selected) => {
            setStandbyStations(selected);
            localStorage.setItem('opd_standby_stations', JSON.stringify(selected));
            setShowStandbyWizard(false);
            
            // Auto-navigate to appropriate active tab
            if (selected.includes('intake') && !selected.some(s => s !== 'intake' && s !== 'database')) {
              setActiveTab('intake');
            } else {
              setActiveTab('queues');
            }

            // Set currentStationId to 'all' or the first step in selected steps
            const workflowIds = selected.filter(s => s !== 'intake' && s !== 'database');
            if (workflowIds.length > 0) {
              handleSetStationId('all');
            }
          }}
        />
      )}

      {/* Real-time Toast Alerts layer */}
      {latestToast && (
        <NotificationToast 
          message={latestToast} 
          onClose={() => setLatestToast(null)} 
        />
      )}

      {/* Top Banner Warning: Sound Permission & Native Windows Popups */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-2 px-4 text-center text-xs font-sans font-medium flex flex-wrap items-center justify-center gap-3 border-b border-indigo-900/50">
        <div className="flex items-center gap-1.5">
          <BellRing className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
          <span>ต้องการให้ป๊อปอัพเด้งลอยทับหน้าจอโปรแกรม HCIS ใช่ไหม?</span>
        </div>

        {!nativeNotifyGranted ? (
          <button
            id="btn-enable-native-notifications"
            onClick={handleRequestNativeNotify}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1 rounded-full shadow-md text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>🔔 คลิกเปิดแจ้งเตือน Windows Popup (ลอยทับ HCIS)</span>
          </button>
        ) : (
          <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono flex items-center gap-1">
            <span>✓ เปิดป๊อปอัพ Windows ลอยทับหน้าจอแล้ว</span>
          </span>
        )}
      </div>

      {/* Navigation Header */}
      <header className="bg-[#2C3E50] text-white border-b border-slate-700 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
              <Activity className="w-5.5 h-5.5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-base text-white tracking-tight flex items-center gap-1.5">
                <span>ระบบบริหารจัดการเวชระเบียน (OPD Manager)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-1.5 py-0.5 rounded uppercase tracking-wide animate-pulse">
                  Cloud DB Online & Sync
                </span>
              </h1>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                ระบบจัดการคิวและซิกส่งต่องานเรียลไทม์ พร้อมป๊อปอัพแจ้งเตือนสมาชิกในทีม
              </p>
            </div>
          </div>

          {/* Sound & Navigation controls */}
          <div className="flex items-center gap-4">
            {/* Configure Device Workspace Button */}
            <button
              id="btn-trigger-standby-wizard"
              onClick={() => setShowStandbyWizard(true)}
              className="flex items-center gap-1.5 text-xs text-white font-sans font-bold bg-[#1A252F] hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-600 transition-colors cursor-pointer"
              title="ตั้งค่า/ปรับปรุงสถานีงานที่สแตนบายของเครื่องคอมพิวเตอร์เครื่องนี้"
            >
              <Laptop className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="hidden sm:inline">สแตนบายเครื่องนี้:</span>
              <span className="bg-sky-600/35 text-sky-300 text-[10px] px-1.5 py-0.5 rounded border border-sky-400/20 font-bold">
                {standbyStations.length === 0 
                  ? 'ทุกสถานี' 
                  : `${standbyStations.includes('intake') ? 'ห้องบัตร+' : ''}${standbyStations.filter(s => s !== 'intake' && s !== 'database').length} แผนก`}
              </span>
            </button>

            {/* Toggle Audio Button */}
            <button
              id="btn-toggle-sound"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                soundEnabled 
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30' 
                  : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
              }`}
              title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Time / Server Status */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>คลาวด์ DB:</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 pb-px">
            {/* Tab: Queues */}
            {showQueuesTab && (
              <button
                id="tab-queues"
                onClick={() => setActiveTab('queues')}
                className={`px-4 py-2.5 border-b-2 font-sans font-medium text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'queues'
                    ? 'border-blue-500 text-blue-400 font-bold bg-white/5'
                    : 'border-transparent text-slate-300 hover:text-white hover:border-slate-500'
                }`}
              >
                <Activity className="w-4 h-4 text-blue-400" />
                <span>กระดานคิว & บันทึกส่งต่อ</span>
              </button>
            )}

            {/* Tab: Pre-Register Directory */}
            <button
              id="tab-preregister"
              onClick={() => setActiveTab('preregister')}
              className={`px-4 py-2.5 border-b-2 font-sans font-medium text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'preregister'
                  ? 'border-blue-500 text-blue-400 font-bold bg-white/5'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-slate-500'
              }`}
            >
              <Users className="w-4 h-4 text-sky-400" />
              <span>ลงทะเบียนคนไข้ล่วงหน้า</span>
            </button>

            {/* Tab: Intake / Screening */}
            {showIntakeTab && (
              <button
                id="tab-intake"
                onClick={() => setActiveTab('intake')}
                className={`px-4 py-2.5 border-b-2 font-sans font-medium text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'intake'
                    ? 'border-blue-500 text-blue-400 font-bold bg-white/5'
                    : 'border-transparent text-slate-300 hover:text-white hover:border-slate-500'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>จุดคัดกรอง (Screening Point)</span>
              </button>
            )}

            {/* Tab: Settings */}
            <button
              id="tab-settings"
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2.5 border-b-2 font-sans font-medium text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-400 font-bold bg-white/5'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-slate-500'
              }`}
            >
              <Settings className="w-4 h-4 text-purple-400" />
              <span>ตั้งค่าเวิร์กโฟลว์แผนก</span>
            </button>

            {/* Tab: Database */}
            {showDatabaseTab && (
              <button
                id="tab-database"
                onClick={() => setActiveTab('database')}
                className={`px-4 py-2.5 border-b-2 font-sans font-medium text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'database'
                    ? 'border-blue-500 text-blue-400 font-bold bg-white/5'
                    : 'border-transparent text-slate-300 hover:text-white hover:border-slate-500'
                }`}
              >
                <Database className="w-4 h-4 text-amber-400" />
                <span>ฐานข้อมูลผู้ป่วย OPD</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'queues' && showQueuesTab && (
          <ActiveQueues
            patients={patients}
            workflowSteps={workflowSteps}
            currentStationId={currentStationId}
            onSetStationId={handleSetStationId}
            onAdvancePatient={handleAdvancePatient}
            allowedStepIds={standbyStations.filter(s => s !== 'intake' && s !== 'database')}
          />
        )}

        {activeTab === 'preregister' && (
          <PreRegisterDirectory
            availableServices={availableServices}
            availablePatientRights={availablePatientRights}
            activePatients={patients}
            onSendToOpdQueue={handleSendPreRegisteredToOpdQueue}
          />
        )}

        {activeTab === 'intake' && showIntakeTab && (
          <div className="max-w-xl mx-auto">
            <IntakeForm 
              onAddPatient={handleAddPatient} 
              workflowSteps={workflowSteps} 
              patients={patients}
              prePatients={prePatients}
              availableServices={availableServices}
              availablePatientRights={availablePatientRights}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-fadeIn">
            {!isSettingsUnlocked ? (
              <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-gray-200 shadow-xl p-6 relative overflow-hidden text-center animate-scaleUp">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-purple-600" />
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl inline-block mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-gray-800 font-sans">พื้นที่ป้องกัน: การตั้งค่าระบบเวิร์กโฟลว์</h3>
                <p className="text-xs text-slate-500 font-sans mt-2 mb-6">
                  หน้าส่วนนี้ถูกจำกัดสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น กรุณากรอกรหัสลับความปลอดภัยสูงเพื่อดำเนินการต่อ
                </p>

                {!isResetModalOpen ? (
                  <form onSubmit={handleVerifyPasscode} className="space-y-4">
                    <div>
                      <input
                        id="input-admin-passcode"
                        type="password"
                        placeholder="กรอกรหัสลับแอดมิน (เริ่มต้นคือ 1234)"
                        value={passcodeAttempt}
                        onChange={(e) => setPasscodeAttempt(e.target.value)}
                        className="w-full text-center tracking-widest font-mono text-sm px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-100 transition-all"
                      />
                    </div>
                    {passcodeError && (
                      <p className="text-rose-500 text-xs font-sans">{passcodeError}</p>
                    )}
                    <button
                      id="btn-verify-passcode"
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-sans font-bold text-xs py-2.5 rounded-lg shadow-md transition-all cursor-pointer"
                    >
                      ยืนยันรหัสผ่านเข้าหน้าตั้งค่า
                    </button>

                    <div className="text-right pt-1">
                      <button
                        type="button"
                        id="btn-forgot-passcode"
                        onClick={() => {
                          setIsResetModalOpen(true);
                          setRecoveryError('');
                          setRecoverySuccess('');
                          setRecoveryCodeInput('');
                        }}
                        className="text-xs text-purple-600 hover:text-purple-800 font-sans font-medium underline cursor-pointer"
                      >
                        ลืมรหัสผ่าน?
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 text-left">
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-sans">
                      <p className="font-bold flex items-center gap-1.5 text-amber-800">
                        <Key className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>รีเซ็ทรหัสผ่านผู้ดูแลระบบ (Passcode Reset)</span>
                      </p>
                      <p className="text-[11px] text-amber-700 mt-1">
                        กรอกรหัสยืนยันฉุกเฉินเฉพาะเพื่อรีเซ็ทรหัสผ่านผู้ดูแลระบบกลับเป็นค่าเริ่มต้น (1234)
                      </p>
                    </div>

                    <form onSubmit={handleResetPasscodeSubmit} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 font-sans mb-1">
                          รหัสยืนยันฉุกเฉิน
                        </label>
                        <input
                          id="input-recovery-code"
                          type="password"
                          placeholder="กรอกรหัสยืนยันฉุกเฉิน"
                          value={recoveryCodeInput}
                          onChange={(e) => setRecoveryCodeInput(e.target.value)}
                          className="w-full text-center tracking-widest font-mono text-sm px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-100 transition-all"
                          autoFocus
                        />
                      </div>

                      {recoveryError && (
                        <p className="text-rose-500 text-xs font-sans font-medium">{recoveryError}</p>
                      )}

                      {recoverySuccess && (
                        <p className="text-emerald-600 text-xs font-sans font-bold">{recoverySuccess}</p>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsResetModalOpen(false);
                            setRecoveryError('');
                            setRecoverySuccess('');
                          }}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-sans font-semibold text-xs py-2.5 rounded-lg transition-all cursor-pointer"
                        >
                          ยกเลิก
                        </button>

                        <button
                          type="submit"
                          id="btn-submit-reset-passcode"
                          className="flex-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-sans font-bold text-xs py-2.5 rounded-lg shadow-md transition-all cursor-pointer"
                        >
                          ยืนยันรีเซ็ทรหัสผ่าน
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-950 px-4 py-2 rounded-lg text-xs font-sans">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>ปลดล็อกโหมดตั้งค่าแอดมินสำเร็จแล้ว (Admin Session Active)</span>
                  </span>
                  <button
                    onClick={() => setIsSettingsUnlocked(false)}
                    className="text-emerald-700 hover:text-emerald-950 underline font-semibold cursor-pointer"
                  >
                    ล็อคหน้าต่างอีกครั้ง
                  </button>
                </div>
                <WorkflowSettings
                  workflowSteps={workflowSteps}
                  onUpdateSteps={handleUpdateSteps}
                  onResetToDefault={handleResetToDefault}
                  availableServices={availableServices}
                  onAddService={handleAddService}
                  onDeleteService={handleDeleteService}
                  availablePatientRights={availablePatientRights}
                  onAddPatientRight={handleAddPatientRight}
                  onDeletePatientRight={handleDeletePatientRight}
                  onResetPatientRights={handleResetPatientRights}
                  adminPasscode={adminPasscode}
                  onUpdatePasscode={handleUpdatePasscode}
                  overlayConfig={overlayConfig}
                  onUpdateOverlayConfig={handleUpdateOverlayConfig}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'database' && showDatabaseTab && (
          <DatabaseViewer
            patients={patients}
            workflowSteps={workflowSteps}
            availablePatientRights={availablePatientRights}
            onDeletePatient={handleDeletePatient}
            onEditPatient={handleEditPatient}
          />
        )}
      </main>

      {/* Floating Signal Overlay Widget (Pin-to-screen Signal Plugin) */}
      <SignalOverlay
        patients={patients}
        preRegisteredPatients={prePatients}
        availableServices={availableServices}
        availablePatientRights={availablePatientRights}
        overlayConfig={overlayConfig}
        currentStationId={currentStationId}
        workflowSteps={workflowSteps}
        standbyStations={standbyStations}
        onToggleSignal={handleToggleSignal}
        onUpdateQuickNotes={handleUpdateQuickNotes}
        onAdvancePatient={handleAdvancePatient}
        onOpenOpdFromPreRegistered={handleSendPreRegisteredToOpdQueue}
        onUpdatePatientInfo={handleUpdatePatientInfo}
      />

      {/* Windows Taskbar-like Status Bar Footer */}
      <footer className="h-9 bg-[#E5E7EB] border-t border-gray-300 px-6 flex items-center justify-between text-[11px] text-gray-600 font-sans mt-auto">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Cloud Secure Database (Connected)
          </span>
          <span className="text-slate-400">|</span>
          <span>เครื่องใช้งาน: PC-OPD-STATION-01</span>
          <span className="text-slate-400">|</span>
          <span>ระบบปฏิบัติการ: Windows 10/11 Compatible</span>
        </div>
        <div className="flex items-center gap-4 font-medium">
          <span>TH/EN</span>
          <span className="text-slate-400">|</span>
          <span className="text-gray-900 font-semibold">{new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
          <span className="text-slate-400">|</span>
          <span>{new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        </div>
      </footer>
    </div>
  );
}
