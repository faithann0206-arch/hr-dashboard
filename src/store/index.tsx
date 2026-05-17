import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  AppStore, Employee, AttendanceRecord, LeaveRecord,
  ManagementDecision, EmailLog, PendingDocument,
  FollowUpCase, DisciplinaryRecord, UploadLog, DailyTask, AppSettings,
} from '../types';
import { seedData } from './seedData';

const STORAGE_KEY = 'hr_dashboard_v2';

function loadFromStorage(): AppStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppStore;
      if (parsed.emailLogs && parsed.pendingDocuments) return parsed;
    }
  } catch {}
  return seedData;
}

function saveToStorage(data: AppStore) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function genId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface StoreContextValue {
  store: AppStore;
  getEmployee: (id: string) => Employee | undefined;
  getEmployeeByCode: (code: string) => Employee | undefined;
  // Employees
  addEmployee: (e: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, e: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  // Attendance
  addAttendanceRecord: (r: Omit<AttendanceRecord, 'id'>) => void;
  updateAttendanceRecord: (id: string, r: Partial<AttendanceRecord>) => void;
  deleteAttendanceRecord: (id: string) => void;
  addAttendanceRecords: (records: Omit<AttendanceRecord, 'id'>[]) => AttendanceRecord[];
  // Upload Logs
  addUploadLog: (l: Omit<UploadLog, 'id'>) => UploadLog;
  // Leave Records
  addLeaveRecord: (r: Omit<LeaveRecord, 'id'>) => void;
  updateLeaveRecord: (id: string, r: Partial<LeaveRecord>) => void;
  deleteLeaveRecord: (id: string) => void;
  // Management Decisions
  addDecision: (d: Omit<ManagementDecision, 'id'>) => void;
  updateDecision: (id: string, d: Partial<ManagementDecision>) => void;
  deleteDecision: (id: string) => void;
  // Email Logs
  addEmailLog: (e: Omit<EmailLog, 'id'>) => void;
  updateEmailLog: (id: string, e: Partial<EmailLog>) => void;
  deleteEmailLog: (id: string) => void;
  // Pending Documents
  addPendingDocument: (d: Omit<PendingDocument, 'id'>) => void;
  updatePendingDocument: (id: string, d: Partial<PendingDocument>) => void;
  deletePendingDocument: (id: string) => void;
  // Follow-up Cases
  addCase: (c: Omit<FollowUpCase, 'id'>) => void;
  updateCase: (id: string, c: Partial<FollowUpCase>) => void;
  deleteCase: (id: string) => void;
  // Disciplinary
  addDisciplinary: (d: Omit<DisciplinaryRecord, 'id'>) => void;
  updateDisciplinary: (id: string, d: Partial<DisciplinaryRecord>) => void;
  deleteDisciplinary: (id: string) => void;
  // Daily Tasks
  addTask: (t: Omit<DailyTask, 'id'>) => void;
  updateTask: (id: string, t: Partial<DailyTask>) => void;
  deleteTask: (id: string) => void;
  // Settings
  updateSettings: (s: Partial<AppSettings>) => void;
  // Utility
  resetToSeedData: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<AppStore>(loadFromStorage);

  useEffect(() => { saveToStorage(store); }, [store]);

  const update = useCallback((updater: (prev: AppStore) => AppStore) => {
    setStore(prev => updater(prev));
  }, []);

  const getEmployee = useCallback((id: string) => store.employees.find(e => e.id === id), [store.employees]);
  const getEmployeeByCode = useCallback((code: string) => store.employees.find(e => e.employeeCode === code), [store.employees]);

  // Employees
  const addEmployee = useCallback((e: Omit<Employee, 'id'>) => update(s => ({ ...s, employees: [...s.employees, { ...e, id: genId('e') }] })), [update]);
  const updateEmployee = useCallback((id: string, e: Partial<Employee>) => update(s => ({ ...s, employees: s.employees.map(x => x.id === id ? { ...x, ...e } : x) })), [update]);
  const deleteEmployee = useCallback((id: string) => update(s => ({ ...s, employees: s.employees.filter(x => x.id !== id) })), [update]);

  // Attendance
  const addAttendanceRecord = useCallback((r: Omit<AttendanceRecord, 'id'>) => update(s => ({ ...s, attendanceRecords: [...s.attendanceRecords, { ...r, id: genId('a') }] })), [update]);
  const updateAttendanceRecord = useCallback((id: string, r: Partial<AttendanceRecord>) => update(s => ({ ...s, attendanceRecords: s.attendanceRecords.map(x => x.id === id ? { ...x, ...r } : x) })), [update]);
  const deleteAttendanceRecord = useCallback((id: string) => update(s => ({ ...s, attendanceRecords: s.attendanceRecords.filter(x => x.id !== id) })), [update]);
  const addAttendanceRecords = useCallback((records: Omit<AttendanceRecord, 'id'>[]): AttendanceRecord[] => {
    const newRecords: AttendanceRecord[] = records.map(r => ({ ...r, id: genId('a') }));
    update(s => ({ ...s, attendanceRecords: [...s.attendanceRecords, ...newRecords] }));
    return newRecords;
  }, [update]);

  // Upload Logs
  const addUploadLog = useCallback((l: Omit<UploadLog, 'id'>): UploadLog => {
    const log: UploadLog = { ...l, id: genId('upl') };
    update(s => ({ ...s, uploadLogs: [...s.uploadLogs, log] }));
    return log;
  }, [update]);

  // Leave Records
  const addLeaveRecord = useCallback((r: Omit<LeaveRecord, 'id'>) => update(s => ({ ...s, leaveRecords: [...s.leaveRecords, { ...r, id: genId('l') }] })), [update]);
  const updateLeaveRecord = useCallback((id: string, r: Partial<LeaveRecord>) => update(s => ({ ...s, leaveRecords: s.leaveRecords.map(x => x.id === id ? { ...x, ...r } : x) })), [update]);
  const deleteLeaveRecord = useCallback((id: string) => update(s => ({ ...s, leaveRecords: s.leaveRecords.filter(x => x.id !== id) })), [update]);

  // Management Decisions
  const addDecision = useCallback((d: Omit<ManagementDecision, 'id'>) => update(s => ({ ...s, managementDecisions: [...s.managementDecisions, { ...d, id: genId('md') }] })), [update]);
  const updateDecision = useCallback((id: string, d: Partial<ManagementDecision>) => update(s => ({ ...s, managementDecisions: s.managementDecisions.map(x => x.id === id ? { ...x, ...d } : x) })), [update]);
  const deleteDecision = useCallback((id: string) => update(s => ({ ...s, managementDecisions: s.managementDecisions.filter(x => x.id !== id) })), [update]);

  // Email Logs
  const addEmailLog = useCallback((e: Omit<EmailLog, 'id'>) => update(s => ({ ...s, emailLogs: [...s.emailLogs, { ...e, id: genId('el') }] })), [update]);
  const updateEmailLog = useCallback((id: string, e: Partial<EmailLog>) => update(s => ({ ...s, emailLogs: s.emailLogs.map(x => x.id === id ? { ...x, ...e } : x) })), [update]);
  const deleteEmailLog = useCallback((id: string) => update(s => ({ ...s, emailLogs: s.emailLogs.filter(x => x.id !== id) })), [update]);

  // Pending Documents
  const addPendingDocument = useCallback((d: Omit<PendingDocument, 'id'>) => update(s => ({ ...s, pendingDocuments: [...s.pendingDocuments, { ...d, id: genId('pd') }] })), [update]);
  const updatePendingDocument = useCallback((id: string, d: Partial<PendingDocument>) => update(s => ({ ...s, pendingDocuments: s.pendingDocuments.map(x => x.id === id ? { ...x, ...d } : x) })), [update]);
  const deletePendingDocument = useCallback((id: string) => update(s => ({ ...s, pendingDocuments: s.pendingDocuments.filter(x => x.id !== id) })), [update]);

  // Follow-up Cases
  const addCase = useCallback((c: Omit<FollowUpCase, 'id'>) => update(s => ({ ...s, followUpCases: [...s.followUpCases, { ...c, id: genId('c') }] })), [update]);
  const updateCase = useCallback((id: string, c: Partial<FollowUpCase>) => update(s => ({ ...s, followUpCases: s.followUpCases.map(x => x.id === id ? { ...x, ...c } : x) })), [update]);
  const deleteCase = useCallback((id: string) => update(s => ({ ...s, followUpCases: s.followUpCases.filter(x => x.id !== id) })), [update]);

  // Disciplinary
  const addDisciplinary = useCallback((d: Omit<DisciplinaryRecord, 'id'>) => update(s => ({ ...s, disciplinaryRecords: [...s.disciplinaryRecords, { ...d, id: genId('dr') }] })), [update]);
  const updateDisciplinary = useCallback((id: string, d: Partial<DisciplinaryRecord>) => update(s => ({ ...s, disciplinaryRecords: s.disciplinaryRecords.map(x => x.id === id ? { ...x, ...d } : x) })), [update]);
  const deleteDisciplinary = useCallback((id: string) => update(s => ({ ...s, disciplinaryRecords: s.disciplinaryRecords.filter(x => x.id !== id) })), [update]);

  // Daily Tasks
  const addTask = useCallback((t: Omit<DailyTask, 'id'>) => update(s => ({ ...s, dailyTasks: [...s.dailyTasks, { ...t, id: genId('t') }] })), [update]);
  const updateTask = useCallback((id: string, t: Partial<DailyTask>) => update(s => ({ ...s, dailyTasks: s.dailyTasks.map(x => x.id === id ? { ...x, ...t } : x) })), [update]);
  const deleteTask = useCallback((id: string) => update(s => ({ ...s, dailyTasks: s.dailyTasks.filter(x => x.id !== id) })), [update]);

  // Settings
  const updateSettings = useCallback((settings: Partial<AppSettings>) => update(s => ({ ...s, settings: { ...s.settings, ...settings } })), [update]);

  const resetToSeedData = useCallback(() => setStore(seedData), []);
  const exportData = useCallback(() => JSON.stringify(store, null, 2), [store]);
  const importData = useCallback((json: string): boolean => {
    try { setStore(JSON.parse(json) as AppStore); return true; } catch { return false; }
  }, []);

  const value: StoreContextValue = {
    store, getEmployee, getEmployeeByCode,
    addEmployee, updateEmployee, deleteEmployee,
    addAttendanceRecord, updateAttendanceRecord, deleteAttendanceRecord, addAttendanceRecords,
    addUploadLog,
    addLeaveRecord, updateLeaveRecord, deleteLeaveRecord,
    addDecision, updateDecision, deleteDecision,
    addEmailLog, updateEmailLog, deleteEmailLog,
    addPendingDocument, updatePendingDocument, deletePendingDocument,
    addCase, updateCase, deleteCase,
    addDisciplinary, updateDisciplinary, deleteDisciplinary,
    addTask, updateTask, deleteTask,
    updateSettings,
    resetToSeedData, exportData, importData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
