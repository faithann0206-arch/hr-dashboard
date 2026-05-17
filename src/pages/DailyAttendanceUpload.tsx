import { useState, useRef } from 'react';
import { useStore } from '../store';
import Papa from 'papaparse';
import { Upload, AlertCircle, CheckCircle, ArrowRight, RotateCcw, FileText, Clock, AlertTriangle } from 'lucide-react';
import type { AttendanceRecord, AttendanceStatus, AppSettings } from '../types';

// ─── Fingerprint CSV format ───────────────────────────────────────────────────
// Employee ID, First Name, Department, Date, Time, Punch State, Work Code, Data Sources
// 1, Saleh, Dept, 2026-05-13, 07:23, Check In, 0, Device

type UploadStep = 'select' | 'preview' | 'duplicate' | 'complete';

interface FingerprintRow {
  employeeId: string;
  firstName: string;
  department: string;
  date: string;
  time: string;
  punchState: string; // 'Check In' | 'Check Out'
}

interface ProcessedRecord {
  employeeCode: string;
  employeeName: string;
  date: string;
  actualIn: string;
  actualOut: string;
  status: AttendanceStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  scheduledIn: string;
  scheduledOut: string;
  flags: string[];
  empId: string; // internal store id
}

interface DuplicateAction {
  index: number;
  action: 'skip' | 'update' | 'replace';
}

// ─── Calculation helpers ──────────────────────────────────────────────────────
function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function isFriday(dateStr: string): boolean {
  return new Date(dateStr).getDay() === 5;
}

function getScheduledOut(dateStr: string, settings: AppSettings): string {
  return isFriday(dateStr) ? (settings.fridayEndTime ?? '12:00') : (settings.weekdayEndTime ?? '15:30');
}

function calcLateMinutes(actualIn: string, dateStr: string, settings: AppSettings): number {
  if (!actualIn) return 0;
  const threshold = toMinutes(settings.lateThresholdTime ?? '08:00');
  const actual = toMinutes(actualIn);
  if (actual <= threshold) return 0;

  // Determine baseline depending on date
  const changeDate = new Date(settings.lateBaselineChangeDate ?? '2026-05-12');
  const recordDate = new Date(dateStr);
  const baseline = recordDate >= changeDate
    ? toMinutes(settings.lateBaselineAfterChange ?? '07:30')
    : toMinutes(settings.lateBaselineBeforeChange ?? '08:00');

  return Math.max(0, actual - baseline);
}

function calcEarlyLeaveMinutes(actualOut: string, scheduledOut: string): number {
  if (!actualOut || !scheduledOut) return 0;
  const diff = toMinutes(scheduledOut) - toMinutes(actualOut);
  return Math.max(0, diff);
}

function detectStatus(
  actualIn: string,
  actualOut: string,
  lateMinutes: number,
  earlyLeaveMinutes: number,
): AttendanceStatus {
  if (!actualIn && !actualOut) return 'Absent';
  if (actualIn && !actualOut) return 'Missing Punch';
  if (!actualIn && actualOut) return 'Missing Punch';
  if (lateMinutes > 0 && earlyLeaveMinutes > 0) return 'Late and Early Leave';
  if (lateMinutes > 0) return 'Late';
  if (earlyLeaveMinutes > 0) return 'Early Leave';
  return 'Present';
}

function fmtMinutes(mins: number): string {
  if (mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── CSV Parsing ─────────────────────────────────────────────────────────────
function parseFingerprintCSV(text: string): FingerprintRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  });

  return result.data.map(row => {
    // Handle flexible column names
    const employeeId = (row['Employee ID'] ?? row['EmployeeID'] ?? row['EmpID'] ?? '').toString().trim();
    const firstName = (row['First Name'] ?? row['FirstName'] ?? row['Name'] ?? '').toString().trim();
    const department = (row['Department'] ?? row['Dept'] ?? '').toString().trim();
    const date = (row['Date'] ?? '').toString().trim();
    const time = (row['Time'] ?? '').toString().trim();
    const punchState = (row['Punch State'] ?? row['PunchState'] ?? row['State'] ?? '').toString().trim();
    return { employeeId, firstName, department, date, time, punchState };
  }).filter(r => r.employeeId && r.date);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DailyAttendanceUpload() {
  const { store, addAttendanceRecords, updateAttendanceRecord, deleteAttendanceRecord, addUploadLog } = useStore();
  const [step, setStep] = useState<UploadStep>('select');
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [processed, setProcessed] = useState<ProcessedRecord[]>([]);
  const [duplicates, setDuplicates] = useState<{ rec: ProcessedRecord; existingId: string }[]>([]);
  const [dupActions, setDupActions] = useState<DuplicateAction[]>([]);
  const [uploadResult, setUploadResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const settings = store.settings;

  function reset() {
    setStep('select'); setFileNames([]); setProcessed([]); setDuplicates([]);
    setDupActions([]); setUploadResult(null); setError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError('');
    setIsLoading(true);
    setFileNames(files.map(f => f.name));

    try {
      const allRows: FingerprintRow[] = [];
      for (const file of files) {
        const text = await file.text();
        const rows = parseFingerprintCSV(text);
        allRows.push(...rows);
      }

      if (allRows.length === 0) {
        setError('No valid rows found. Make sure columns include: Employee ID, Date, Time, Punch State.');
        setIsLoading(false);
        return;
      }

      // Group by employeeId + date
      const groups = new Map<string, FingerprintRow[]>();
      for (const row of allRows) {
        const key = `${row.employeeId}__${row.date}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      }

      const records: ProcessedRecord[] = [];
      for (const [, rows] of groups) {
        const { employeeId, date } = rows[0];
        const emp = store.employees.find(e => e.employeeCode === employeeId);
        const empName = emp?.employeeName ?? rows[0].firstName ?? employeeId;
        const empStoreId = emp?.id ?? '';

        const checkIns = rows.filter(r => r.punchState === 'Check In').sort((a, b) => a.time.localeCompare(b.time));
        const checkOuts = rows.filter(r => r.punchState === 'Check Out').sort((a, b) => a.time.localeCompare(b.time));

        const actualIn = checkIns[0]?.time ?? '';
        const actualOut = checkOuts[checkOuts.length - 1]?.time ?? '';

        const scheduledIn = settings.workStartTime ?? '07:30';
        const scheduledOut = getScheduledOut(date, settings);

        const lateMinutes = calcLateMinutes(actualIn, date, settings);
        const earlyLeaveMinutes = calcEarlyLeaveMinutes(actualOut, scheduledOut);
        const status = detectStatus(actualIn, actualOut, lateMinutes, earlyLeaveMinutes);

        const flags: string[] = [];
        if (status === 'Missing Punch') flags.push('Missing punch — check device records');
        if (lateMinutes > 0) flags.push(`Late by ${fmtMinutes(lateMinutes)}`);
        if (earlyLeaveMinutes > 0) {
          const changeDate = new Date(settings.ptPermissionRequiredFromDate ?? '2026-05-12');
          const recordDate = new Date(date);
          if (recordDate >= changeDate) {
            flags.push(`Early departure — permission required (${fmtMinutes(earlyLeaveMinutes)})`);
          } else {
            flags.push(`Early departure (${fmtMinutes(earlyLeaveMinutes)})`);
          }
        }

        records.push({
          employeeCode: employeeId,
          employeeName: empName,
          date,
          actualIn,
          actualOut,
          status,
          lateMinutes,
          earlyLeaveMinutes,
          scheduledIn,
          scheduledOut,
          flags,
          empId: empStoreId,
        });
      }

      // Sort by date then employee
      records.sort((a, b) => a.date.localeCompare(b.date) || a.employeeCode.localeCompare(b.employeeCode));

      // Detect duplicates
      const dups: { rec: ProcessedRecord; existingId: string }[] = [];
      for (const rec of records) {
        const existing = store.attendanceRecords.find(
          a => a.employeeCode === rec.employeeCode && a.date === rec.date
        );
        if (existing) dups.push({ rec, existingId: existing.id });
      }

      setProcessed(records);
      setDuplicates(dups);
      setDupActions(dups.map((_, i) => ({ index: i, action: 'skip' })));
      setStep('preview');
    } catch (err) {
      setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setIsLoading(false);
  }

  function proceedToImport() {
    if (duplicates.length > 0) { setStep('duplicate'); return; }
    doImport();
  }

  function doImport() {
    const uploadId = `UPL${Date.now()}`;
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const newRecords: Omit<AttendanceRecord, 'id'>[] = [];

    for (const rec of processed) {
      const d = new Date(rec.date);
      const justificationRequired = ['Late', 'Early Leave', 'Late and Early Leave', 'Absent', 'Missing Punch'].includes(rec.status);

      const built: Omit<AttendanceRecord, 'id'> = {
        uploadId,
        employeeId: rec.empId,
        employeeCode: rec.employeeCode,
        date: rec.date,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        scheduledIn: rec.scheduledIn,
        scheduledOut: rec.scheduledOut,
        actualIn: rec.actualIn,
        actualOut: rec.actualOut,
        status: rec.status,
        leaveType: '',
        lateMinutes: rec.lateMinutes,
        earlyLeaveMinutes: rec.earlyLeaveMinutes,
        totalShortTime: rec.lateMinutes + rec.earlyLeaveMinutes,
        permissionHoursUsed: 0,
        justificationRequired,
        justificationStatus: justificationRequired ? 'Pending' : 'Not Required',
        linkedLeaveId: '',
        linkedCaseId: '',
        linkedEmailLogId: '',
        linkedPendingDocId: '',
        linkedManagementDecisionId: '',
        notes: rec.flags.join('; '),
        finalStatus: ['Late', 'Early Leave', 'Late and Early Leave', 'Absent', 'Missing Punch'].includes(rec.status)
          ? 'Pending Action'
          : 'Clear',
      };

      const dupIdx = duplicates.findIndex(d => d.rec === rec);
      if (dupIdx >= 0) {
        const action = dupActions[dupIdx]?.action ?? 'skip';
        if (action === 'skip') { skipped++; continue; }
        if (action === 'update') {
          updateAttendanceRecord(duplicates[dupIdx].existingId, {
            actualIn: built.actualIn, actualOut: built.actualOut,
            status: built.status, lateMinutes: built.lateMinutes,
            earlyLeaveMinutes: built.earlyLeaveMinutes, totalShortTime: built.totalShortTime,
            justificationRequired: built.justificationRequired,
            justificationStatus: built.justificationStatus, notes: built.notes,
            finalStatus: built.finalStatus,
          });
          imported++;
          continue;
        }
        if (action === 'replace') {
          deleteAttendanceRecord(duplicates[dupIdx].existingId);
        }
      }

      newRecords.push(built);
      imported++;
    }

    if (newRecords.length > 0) addAttendanceRecords(newRecords);
    addUploadLog({
      uploadDate: new Date().toISOString().split('T')[0],
      fileName: fileNames.join(', '),
      uploadedBy: 'Faith Jacob',
      rowsImported: imported,
      duplicatesSkipped: skipped,
      errors,
      notes: `${processed.length} employee-day records processed from fingerprint system.`,
    });

    setUploadResult({ imported, skipped, errors });
    setStep('complete');
  }

  // ─── Step helpers ──────────────────────────────────────────────────────────
  const stepList: UploadStep[] = ['select', 'preview', 'duplicate', 'complete'];
  const stepLabels: Record<UploadStep, string> = {
    select: '1. Select File', preview: '2. Preview', duplicate: '3. Duplicates', complete: '4. Done',
  };
  const currentIdx = stepList.indexOf(step);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Daily Attendance Upload</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload fingerprint system CSV files — one row per punch, auto-paired</p>
        </div>
        {step !== 'select' && (
          <button onClick={reset} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
            <RotateCcw size={14} /> Start Over
          </button>
        )}
      </div>

      {/* Step bar */}
      <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
        {stepList.map((s, i) => {
          const isActive = s === step;
          const isDone = i < currentIdx;
          return (
            <div key={s} className="flex items-center gap-3 shrink-0">
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {stepLabels[s]}
              </div>
              {i < stepList.length - 1 && <ArrowRight size={14} className="text-gray-300 shrink-0" />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── STEP 1: Select ── */}
      {step === 'select' && (
        <div className="space-y-4">
          <div
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={40} className="mx-auto mb-3 text-gray-400" />
            <div className="text-lg font-medium text-gray-700 mb-1">Click to select fingerprint CSV file(s)</div>
            <div className="text-sm text-gray-400">Multiple files supported — one per day or per month</div>
            {isLoading && <div className="mt-3 text-sm text-blue-600 font-medium">Parsing...</div>}
          </div>
          <input ref={fileRef} type="file" accept=".csv" multiple className="hidden" onChange={handleFiles} />

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-700 mb-3">Expected CSV format (from fingerprint device):</div>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-600 overflow-x-auto">
              Employee ID, First Name, Department, Date, Time, Punch State, Work Code, Data Sources<br/>
              1, Saleh AlKetbi, Department, 2026-05-13, 07:23, Check In, 0, Device<br/>
              1, Saleh AlKetbi, Department, 2026-05-13, 14:25, Check Out, 0, Device
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="font-semibold text-blue-800 mb-1">Late policy (from {settings.lateBaselineChangeDate})</div>
                <div>Before: calculated from {settings.lateBaselineBeforeChange}</div>
                <div>From {settings.lateBaselineChangeDate}: calculated from {settings.lateBaselineAfterChange}</div>
                <div className="mt-1 text-blue-700">Threshold: after {settings.lateThresholdTime}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="font-semibold text-purple-800 mb-1">Scheduled out times</div>
                <div>Weekdays: {settings.weekdayEndTime}</div>
                <div>Fridays: {settings.fridayEndTime}</div>
                <div className="mt-1 text-purple-700">PT allowance: {Math.floor((settings.ptMonthlyAllowanceMinutes ?? 240) / 60)}h/month</div>
              </div>
            </div>
          </div>

          {store.uploadLogs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">Upload History</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Date', 'File', 'Uploaded By', 'Imported', 'Skipped', 'Notes'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {store.uploadLogs.slice().reverse().map(l => (
                      <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{l.uploadDate}</td>
                        <td className="px-3 py-2.5 text-gray-700 font-medium max-w-[200px] truncate">{l.fileName}</td>
                        <td className="px-3 py-2.5 text-gray-600">{l.uploadedBy}</td>
                        <td className="px-3 py-2.5 text-green-700 font-medium">{l.rowsImported}</td>
                        <td className="px-3 py-2.5 text-yellow-700">{l.duplicatesSkipped}</td>
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{l.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{processed.length}</div>
              <div className="text-xs text-gray-500">Employee-Days</div>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{processed.filter(r => r.status === 'Present').length}</div>
              <div className="text-xs text-green-600">Present</div>
            </div>
            <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">{processed.filter(r => ['Late', 'Early Leave', 'Late and Early Leave'].includes(r.status)).length}</div>
              <div className="text-xs text-yellow-600">Late / Early</div>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{processed.filter(r => ['Absent', 'Missing Punch'].includes(r.status)).length}</div>
              <div className="text-xs text-red-500">Absent / Missing Punch</div>
            </div>
          </div>

          {duplicates.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
              <strong>{duplicates.length} duplicate records detected</strong> (same Employee + Date already in system). You'll choose what to do next.
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
              Preview — {processed.length} records from: {fileNames.join(', ')}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Employee', 'Date', 'Day', 'Check In', 'Sched. Out', 'Check Out', 'Status', 'Late', 'Early Leave', 'Flags'].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {processed.map((rec, i) => {
                    const dayName = new Date(rec.date).toLocaleDateString('en-US', { weekday: 'short' });
                    const isFri = isFriday(rec.date);
                    const statusColor = {
                      'Present': 'text-green-700',
                      'Late': 'text-yellow-700',
                      'Early Leave': 'text-orange-600',
                      'Late and Early Leave': 'text-orange-700',
                      'Absent': 'text-red-600',
                      'Missing Punch': 'text-red-500',
                      'Leave': 'text-blue-600',
                      'Official Mission': 'text-purple-600',
                      'Permission': 'text-indigo-600',
                      'Holiday/Weekend': 'text-gray-400',
                    }[rec.status] ?? 'text-gray-700';
                    return (
                      <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 ${rec.flags.length > 0 ? 'bg-yellow-50/30' : ''}`}>
                        <td className="px-2 py-2">
                          <div className="font-medium text-gray-800">{rec.employeeName}</div>
                          <div className="text-gray-400">#{rec.employeeCode}</div>
                        </td>
                        <td className="px-2 py-2 font-mono text-gray-600">{rec.date}</td>
                        <td className={`px-2 py-2 font-medium ${isFri ? 'text-blue-600' : 'text-gray-500'}`}>{dayName}</td>
                        <td className="px-2 py-2 font-mono">{rec.actualIn || <span className="text-red-400">—</span>}</td>
                        <td className="px-2 py-2 font-mono text-gray-400">{rec.scheduledOut}</td>
                        <td className="px-2 py-2 font-mono">{rec.actualOut || <span className="text-red-400">—</span>}</td>
                        <td className={`px-2 py-2 font-medium whitespace-nowrap ${statusColor}`}>{rec.status}</td>
                        <td className="px-2 py-2 text-yellow-700 font-mono">{rec.lateMinutes > 0 ? fmtMinutes(rec.lateMinutes) : '—'}</td>
                        <td className="px-2 py-2 text-orange-600 font-mono">{rec.earlyLeaveMinutes > 0 ? fmtMinutes(rec.earlyLeaveMinutes) : '—'}</td>
                        <td className="px-2 py-2 max-w-[180px]">
                          {rec.flags.map((f, fi) => (
                            <div key={fi} className="flex items-start gap-1 text-yellow-700">
                              <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                              <span className="text-[10px]">{f}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">Back</button>
            <button
              onClick={proceedToImport}
              disabled={processed.length === 0}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {duplicates.length > 0 ? `Handle ${duplicates.length} Duplicates` : `Import ${processed.length} Records`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Duplicates ── */}
      {step === 'duplicate' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            <strong>{duplicates.length} duplicate records found.</strong> A record already exists in the system for these employee + date combinations.
          </div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setDupActions(duplicates.map((_, i) => ({ index: i, action: 'skip' })))} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Skip All</button>
            <button onClick={() => setDupActions(duplicates.map((_, i) => ({ index: i, action: 'update' })))} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Update All</button>
          </div>
          <div className="space-y-2">
            {duplicates.map((dup, i) => {
              const action = dupActions[i]?.action ?? 'skip';
              return (
                <div key={i} className="bg-white rounded-xl border border-yellow-200 p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-gray-800">{dup.rec.employeeName} — {dup.rec.date}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      New: {dup.rec.actualIn || '—'} → {dup.rec.actualOut || '—'} ({dup.rec.status})
                    </div>
                  </div>
                  <select
                    value={action}
                    onChange={e => setDupActions(acts => acts.map((a, ai) => ai === i ? { ...a, action: e.target.value as 'skip' | 'update' | 'replace' } : a))}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                  >
                    <option value="skip">Skip (keep existing)</option>
                    <option value="update">Update (merge times)</option>
                    <option value="replace">Replace (overwrite)</option>
                  </select>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('preview')} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">Back</button>
            <button onClick={doImport} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Confirm & Import</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Complete ── */}
      {step === 'complete' && uploadResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Complete</h2>
          <p className="text-gray-500 mb-6 text-sm">{fileNames.join(', ')}</p>
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-700">{uploadResult.imported}</div>
              <div className="text-xs text-green-600">Imported</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-700">{uploadResult.skipped}</div>
              <div className="text-xs text-yellow-600">Skipped</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600">{uploadResult.errors}</div>
              <div className="text-xs text-red-500">Errors</div>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="flex items-center gap-2 px-5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
              <FileText size={14} /> Upload Another File
            </button>
            <a href="/attendance" className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Clock size={14} /> View Attendance Records
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
