import { useState, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { Download, Copy, FileText, ClipboardList, FileDown } from 'lucide-react';

type ReportType =
  | 'monthly-attendance'
  | 'yearly-attendance'
  | 'employee-history'
  | 'pending-justifications'
  | 'leave-summary'
  | 'management-pending'
  | 'disciplinary-followup'
  | 'support-staff-attendance'
  | 'deductions-pending'
  | 'open-cases'
  | 'monthly-work-summary'
  | 'daily-task-log'
  | 'monthly-profiles';

const REPORTS = [
  { id: 'monthly-profiles' as ReportType, label: 'Monthly Attendance Profiles (Word)', icon: '📄' },
  { id: 'monthly-attendance' as ReportType, label: 'Monthly Attendance Summary', icon: '📅' },
  { id: 'yearly-attendance' as ReportType, label: 'Yearly Attendance Summary', icon: '📆' },
  { id: 'employee-history' as ReportType, label: 'Employee History Report', icon: '👤' },
  { id: 'pending-justifications' as ReportType, label: 'Pending Justifications Report', icon: '⏳' },
  { id: 'leave-summary' as ReportType, label: 'Leave Summary Report', icon: '🌴' },
  { id: 'management-pending' as ReportType, label: 'Management Pending Report', icon: '📋' },
  { id: 'disciplinary-followup' as ReportType, label: 'Disciplinary Follow-up Report', icon: '⚠️' },
  { id: 'support-staff-attendance' as ReportType, label: 'Support Staff Attendance Summary', icon: '👥' },
  { id: 'deductions-pending' as ReportType, label: 'Deductions Pending Report', icon: '💰' },
  { id: 'open-cases' as ReportType, label: 'Open Cases Report', icon: '📂' },
  { id: 'monthly-work-summary' as ReportType, label: 'Monthly Work Summary', icon: '📝' },
  { id: 'daily-task-log' as ReportType, label: 'Daily Task Log Report', icon: '✅' },
];

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthsFull = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function fmtMin(m: number) {
  if (!m) return '0m';
  return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`;
}

function downloadAsDoc(html: string, filename: string) {
  const full = `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${filename}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:10.5pt;margin:1.8cm}
  h1{text-align:center;color:#1e3a5f;font-size:15pt;margin-bottom:2pt}
  h2{text-align:center;font-size:12pt;margin-top:0;color:#1e3a5f}
  h3{font-size:11pt;color:#1e3a5f;margin-top:14pt;margin-bottom:4pt;border-bottom:1px solid #1e3a5f;padding-bottom:2pt}
  table{border-collapse:collapse;width:100%;margin-bottom:10pt}
  td,th{border:1px solid #888;padding:4pt 7pt;vertical-align:top}
  th{background:#1e3a5f;color:white;font-weight:bold}
  .label{background:#e8edf5;font-weight:bold;width:35%}
  .warn{color:#c0392b;font-weight:bold}
  .kpi th{background:#2c5282}
  .support th{background:#276749}
  .note{font-size:8.5pt;color:#555;border-top:1px solid #ccc;padding-top:6pt;margin-top:16pt}
  p{margin:2pt 0}
</style></head><body>${html}</body></html>`;
  const blob = new Blob(['﻿' + full], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function Reports() {
  const { store } = useStore();
  const [activeReport, setActiveReport] = useState<ReportType>('monthly-attendance');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterCat, setFilterCat] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterEmp, setFilterEmp] = useState('All');
  const [editableSummary, setEditableSummary] = useState('');
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedData, setCopiedData] = useState(false);
  const summaryRef = useRef<HTMLTextAreaElement>(null);

  const departments = [...new Set(store.employees.map(e => e.department))].sort();

  const reportData = useMemo(() => {
    const empFilter = store.employees.filter(e => {
      const matchCat = filterCat === 'All' || e.employeeCategory === filterCat;
      const matchDept = filterDept === 'All' || e.department === filterDept;
      const matchEmp = filterEmp === 'All' || e.id === filterEmp;
      return matchCat && matchDept && matchEmp;
    });
    const empCodes = empFilter.map(e => e.employeeCode);

    const attRecords = store.attendanceRecords.filter(a =>
      a.month === filterMonth && a.year === filterYear && empCodes.includes(a.employeeCode)
    );

    switch (activeReport) {
      case 'monthly-attendance': return attRecords.map(a => {
        const emp = store.employees.find(e => e.employeeCode === a.employeeCode);
        return { Employee: emp?.employeeName ?? a.employeeCode, Code: a.employeeCode, Date: a.date, Status: a.status, 'Late Min': a.lateMinutes, 'Early Min': a.earlyLeaveMinutes, 'Short Time': a.totalShortTime, Justification: a.justificationStatus, 'Final Status': a.finalStatus };
      });

      case 'yearly-attendance': return store.attendanceRecords.filter(a => a.year === filterYear && empCodes.includes(a.employeeCode)).map(a => {
        const emp = store.employees.find(e => e.employeeCode === a.employeeCode);
        return { Employee: emp?.employeeName ?? a.employeeCode, Code: a.employeeCode, Month: months[a.month - 1], Status: a.status, 'Late Min': a.lateMinutes, 'Early Min': a.earlyLeaveMinutes };
      });

      case 'employee-history': {
        const emp = filterEmp !== 'All' ? store.employees.find(e => e.id === filterEmp) : null;
        if (!emp) return store.employees.filter(e => empCodes.includes(e.employeeCode)).map(e => ({
          Code: e.employeeCode, Name: e.employeeName, Category: e.employeeCategory, Department: e.department, Status: e.status,
          'Late (YTD)': store.attendanceRecords.filter(a => a.employeeCode === e.employeeCode && a.year === filterYear && (a.status === 'Late' || a.status === 'Late and Early Leave')).length,
          'Absent (YTD)': store.attendanceRecords.filter(a => a.employeeCode === e.employeeCode && a.year === filterYear && a.status === 'Absent').length,
          'Open Cases': store.followUpCases.filter(c => c.employeeCode === e.employeeCode && !['Closed','No Action Required'].includes(c.actionStatus)).length,
        }));
        return [emp].map(e => ({
          Code: e.employeeCode, Name: e.employeeName, Department: e.department, Status: e.status,
          'Late (YTD)': store.attendanceRecords.filter(a => a.employeeCode === e.employeeCode && a.year === filterYear && (a.status === 'Late' || a.status === 'Late and Early Leave')).length,
          'Absent (YTD)': store.attendanceRecords.filter(a => a.employeeCode === e.employeeCode && a.year === filterYear && a.status === 'Absent').length,
          'Open Cases': store.followUpCases.filter(c => c.employeeCode === e.employeeCode && !['Closed','No Action Required'].includes(c.actionStatus)).length,
        }));
      }

      case 'pending-justifications': return store.attendanceRecords.filter(a => (a.justificationStatus === 'Pending' || a.justificationStatus === 'Overdue') && empCodes.includes(a.employeeCode)).map(a => {
        const emp = store.employees.find(e => e.employeeCode === a.employeeCode);
        return { Employee: emp?.employeeName ?? a.employeeCode, Code: a.employeeCode, Date: a.date, Status: a.status, 'Just. Status': a.justificationStatus };
      });

      case 'leave-summary': return store.leaveRecords.filter(l => empCodes.includes(l.employeeCode)).map(l => {
        const emp = store.employees.find(e => e.employeeCode === l.employeeCode);
        return { Employee: emp?.employeeName ?? l.employeeCode, 'Leave Type': l.leaveType, From: l.fromDate, To: l.toDate, Days: l.numberOfDays, Hours: l.numberOfHours, Status: l.status };
      });

      case 'management-pending': return store.managementDecisions.filter(d => d.status === 'Awaiting Management Instruction' || d.status === 'No Further Instruction Received').map(d => {
        const emp = store.employees.find(e => e.employeeCode === d.employeeCode);
        return { 'Decision ID': d.decisionId, Employee: emp?.employeeName ?? d.employeeCode, 'Date Reported': d.dateReported, Module: d.relatedModule, 'Issue Summary': d.issueSummary.slice(0,60), Status: d.status, 'Follow-up Due': d.followUpDueDate };
      });

      case 'disciplinary-followup': return store.disciplinaryRecords.filter(d => {
        const emp = store.employees.find(e => e.employeeCode === d.employeeCode);
        return emp?.employeeCategory === 'Main Employee' || emp?.enableDisciplinary;
      }).map(d => {
        const emp = store.employees.find(e => e.employeeCode === d.employeeCode);
        return { 'Case ID': d.disciplinaryCaseId, Employee: emp?.employeeName ?? d.employeeCode, Violation: d.violationType, 'Proposed Action': d.proposedAction, Status: d.caseStatus, 'Letter Issued': d.letterIssued ? 'Yes' : 'No' };
      });

      case 'support-staff-attendance': return store.attendanceRecords.filter(a => {
        const emp = store.employees.find(e => e.employeeCode === a.employeeCode);
        return emp?.employeeCategory === 'Support Staff' && a.month === filterMonth && a.year === filterYear;
      }).map(a => {
        const emp = store.employees.find(e => e.employeeCode === a.employeeCode);
        return { Employee: emp?.employeeName ?? a.employeeCode, Date: a.date, Status: a.status, 'Late Min': a.lateMinutes, 'Early Min': a.earlyLeaveMinutes };
      });

      case 'deductions-pending': return store.followUpCases.filter(c => ['Deduction Pending','Deduction Applied'].includes(c.actionStatus) && empCodes.includes(c.employeeCode)).map(c => {
        const emp = store.employees.find(e => e.employeeCode === c.employeeCode);
        return { 'Case ID': c.caseId, Employee: emp?.employeeName ?? c.employeeCode, 'Case Type': c.caseType, Status: c.actionStatus, 'Opened Date': c.caseOpenedDate };
      });

      case 'open-cases': return store.followUpCases.filter(c => !['Closed','No Action Required'].includes(c.actionStatus) && empCodes.includes(c.employeeCode)).map(c => {
        const emp = store.employees.find(e => e.employeeCode === c.employeeCode);
        return { 'Case ID': c.caseId, Employee: emp?.employeeName ?? c.employeeCode, Type: c.caseType, Status: c.actionStatus, 'Opened': c.caseOpenedDate };
      });

      case 'daily-task-log': return store.dailyTasks.filter(t => t.month === filterMonth && t.year === filterYear).map(t => {
        const emp = t.relatedEmployeeId ? store.employees.find(e => e.id === t.relatedEmployeeId) : null;
        return { 'Task ID': t.taskId, Date: t.date, Category: t.taskCategory, Title: t.taskTitle, Employee: emp?.employeeName ?? '—', Priority: t.priority, Status: t.status, 'Time Spent': t.timeSpent };
      });

      default: return [];
    }
  }, [store, activeReport, filterMonth, filterYear, filterCat, filterDept, filterEmp]);

  function generateMonthlySummary() {
    const m = months[filterMonth - 1];
    const tasks = store.dailyTasks.filter(t => t.month === filterMonth && t.year === filterYear);
    const completed = tasks.filter(t => t.status === 'Completed');
    const pending = tasks.filter(t => ['Pending','Not Started','In Progress'].includes(t.status));
    const awaitingEmp = tasks.filter(t => t.status === 'Awaiting Employee');
    const awaitingMgmt = tasks.filter(t => t.status === 'Awaiting Management');

    const attRecords = store.attendanceRecords.filter(a => a.month === filterMonth && a.year === filterYear);
    const lateCount = attRecords.filter(a => a.status === 'Late' || a.status === 'Late and Early Leave').length;
    const absentCount = attRecords.filter(a => a.status === 'Absent').length;
    const pendingJust = store.attendanceRecords.filter(a => a.month === filterMonth && a.year === filterYear && (a.justificationStatus === 'Pending' || a.justificationStatus === 'Overdue')).length;
    const openCases = store.followUpCases.filter(c => !['Closed','No Action Required'].includes(c.actionStatus)).length;

    const summary = `Monthly Work Summary – ${m} ${filterYear}

═══════════════════════════════════════════

Attendance Review:
• Reviewed daily attendance records for ${m} ${filterYear}.
• Total attendance records processed: ${attRecords.length}
• Late entries recorded: ${lateCount}
• Absences recorded: ${absentCount}
• Pending justification forms: ${pendingJust}
• Updated employee attendance histories and pending action statuses.

Leave and Absence Tracking:
• Recorded and reviewed leave/absence entries for the month.
• Linked leave records with supporting documents where applicable.
• Updated pending leave-related follow-ups.

Justification Forms and Employee Follow-up:
• Sent follow-up emails for pending justification forms.
• Recorded received forms and updated case statuses.
• Currently pending justifications: ${pendingJust}
• Marked unresolved items for monthly reporting.

Follow-up Cases:
• Open cases requiring action: ${openCases}
• Cases reported to management this month: ${store.managementDecisions.filter(d => d.dateReported.startsWith(`${filterYear}-${String(filterMonth).padStart(2,'0')}`)).length}

Daily Administrative Tasks:
• Total tasks logged this month: ${tasks.length}
• Completed: ${completed.length}
• In Progress / Pending: ${pending.length}
• Awaiting employee response: ${awaitingEmp.length}
• Awaiting management decision: ${awaitingMgmt.length}

${completed.length > 0 ? `Key Completed Tasks:
${completed.slice(0, 5).map(t => `• [${t.date}] ${t.taskTitle}`).join('\n')}${completed.length > 5 ? `\n• ...and ${completed.length - 5} more completed tasks` : ''}` : ''}

${pending.length > 0 ? `Pending / Carried Forward:
${pending.slice(0, 5).map(t => `• ${t.taskTitle} (${t.status})`).join('\n')}${pending.length > 5 ? `\n• ...and ${pending.length - 5} more pending items` : ''}` : 'Pending / Carried Forward:\n• None'}

${awaitingMgmt.length > 0 ? `Items Awaiting Management Decision:
${awaitingMgmt.map(t => `• ${t.taskTitle}`).join('\n')}` : ''}

═══════════════════════════════════════════
Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`;

    setEditableSummary(summary);
    setSummaryGenerated(true);
  }

  function copySummary() {
    navigator.clipboard.writeText(editableSummary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function exportCSV() {
    if (reportData.length === 0) return;
    const headers = Object.keys(reportData[0]);
    const rows = reportData.map(row => headers.map(h => `"${(row as Record<string, unknown>)[h] ?? ''}"`));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${activeReport}-${filterMonth}-${filterYear}.csv`; a.click();
  }

  function exportJSON() {
    const json = JSON.stringify(reportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${activeReport}-${filterMonth}-${filterYear}.json`; a.click();
  }

  function copyReportData() {
    if (reportData.length === 0) return;
    const headers = Object.keys(reportData[0]);
    const rows = reportData.map(row => headers.map(h => String((row as Record<string, unknown>)[h] ?? '')).join('\t'));
    const text = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedData(true);
      setTimeout(() => setCopiedData(false), 2000);
    });
  }

  const columns = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  // ── Monthly Attendance Profiles ───────────────────────────────────────────
  function generateMonthlyProfilesDoc() {
    const monthName = monthsFull[filterMonth - 1];
    const settings = store.settings;
    const ptAllowance = settings.ptMonthlyAllowanceMinutes ?? 240;

    const attThisMonth = store.attendanceRecords.filter(a => a.month === filterMonth && a.year === filterYear);
    const mainEmps = store.employees.filter(e => e.employeeCategory === 'Main Employee' && e.status === 'Active');
    const supportEmps = store.employees.filter(e => e.employeeCategory === 'Support Staff' && e.status === 'Active');

    const leaveRecords = store.leaveRecords;
    const decisions = store.managementDecisions;

    // ── Per employee block ──────────────────────────────────────────────────
    function buildEmpBlock(emp: typeof mainEmps[0]): string {
      const recs = attThisMonth.filter(a => a.employeeCode === emp.employeeCode);
      const lateRecs = recs.filter(a => a.lateMinutes > 0);
      const earlyRecs = recs.filter(a => a.earlyLeaveMinutes > 0);
      const totalLateMin = lateRecs.reduce((s, a) => s + a.lateMinutes, 0);
      const totalEarlyMin = earlyRecs.reduce((s, a) => s + a.earlyLeaveMinutes, 0);
      const ptUsed = totalEarlyMin + totalLateMin;
      const ptBalance = ptAllowance - ptUsed;
      const ptExceeded = ptUsed > ptAllowance;

      const empLeaves = leaveRecords.filter(l => l.employeeCode === emp.employeeCode && l.fromDate.startsWith(`${filterYear}-${String(filterMonth).padStart(2,'0')}`));
      const missions = empLeaves.filter(l => l.leaveType === 'Official Mission');
      const leaves = empLeaves.filter(l => ['Annual Leave','Sick Leave','Maternity Leave','Emergency Leave'].includes(l.leaveType));
      const remote = empLeaves.filter(l => l.leaveType === 'Remote Work');
      const empDecisions = decisions.filter(d => d.employeeCode === emp.employeeCode &&
        d.dateReported.startsWith(`${filterYear}-${String(filterMonth).padStart(2,'0')}`));

      const ptExclLate = totalEarlyMin;
      const ptExclStatus = ptExclLate > ptAllowance
        ? `<span class="warn">Exceeded by ${fmtMin(ptExclLate - ptAllowance)} ⚠️</span>`
        : `Within Limit (${fmtMin(ptExclLate)} used)`;
      const ptInclStatus = ptExceeded
        ? `<span class="warn">Exceeded by ${fmtMin(ptUsed - ptAllowance)} ⚠️</span>`
        : `Not Exceeded — Balance: ${fmtMin(Math.abs(ptBalance))}`;

      const exceptionsArr: string[] = [];
      if (missions.length) exceptionsArr.push(`${missions.length} Official Mission(s)`);
      if (leaves.length) exceptionsArr.push(leaves.map(l => `${l.leaveType} (${l.fromDate}–${l.toDate})`).join(', '));
      if (remote.length) exceptionsArr.push(`Remote Work: ${remote.map(r => r.fromDate).join(', ')}`);
      if (empDecisions.length) exceptionsArr.push(`Management decision: ${empDecisions[0].status}`);

      const flagged = ptExceeded || lateRecs.length >= 3;

      // Narrative paragraph
      const narrative = (() => {
        if (recs.length === 0) return `No attendance records found for ${emp.employeeName} in ${monthName} ${filterYear}.`;
        let n = `${emp.employeeName} attended work during ${monthName} ${filterYear}.`;
        if (lateRecs.length === 0) n += ' No late arrivals were recorded.';
        else n += ` A total of ${lateRecs.length} late arrival${lateRecs.length > 1 ? 's' : ''} were recorded, amounting to ${fmtMin(totalLateMin)} of late time.`;
        if (earlyRecs.length === 0) n += ' No early departures were recorded.';
        else n += ` Early departures occurred on ${earlyRecs.length} occasion${earlyRecs.length > 1 ? 's' : ''}, totalling ${fmtMin(totalEarlyMin)}.`;
        if (ptExceeded) n += ` The personal time allowance of 4 hours was exceeded by ${fmtMin(ptUsed - ptAllowance)}, pending management review.`;
        if (missions.length) n += ` ${missions.length} official mission day${missions.length > 1 ? 's' : ''} were recorded.`;
        if (leaves.length) n += ` Leave taken: ${leaves.map(l => l.leaveType).join(', ')}.`;
        return n;
      })();

      return `
        <h3>${emp.employeeName} &nbsp;<small style="font-weight:normal;color:#555;font-size:9pt">ID: ${emp.employeeCode} | Group: ${emp.group}</small></h3>
        <table>
          <tr><td class="label">Late Instances</td><td>${lateRecs.length || 0}</td></tr>
          <tr><td class="label">Late Dates</td><td>${lateRecs.length ? lateRecs.map(r => r.date).join(', ') : 'N/A'}</td></tr>
          <tr><td class="label">Total Late Time</td><td>${lateRecs.length ? fmtMin(totalLateMin) : 'N/A'}</td></tr>
          <tr><td class="label">Personal Time (Excl. Late)</td><td>${ptExclStatus}</td></tr>
          <tr><td class="label">Personal Time (Incl. Late)</td><td>${ptInclStatus}</td></tr>
          <tr><td class="label">Early Leaves</td><td>${earlyRecs.length ? `${earlyRecs.length} time${earlyRecs.length > 1 ? 's' : ''} (${fmtMin(totalEarlyMin)})` : 'None'}</td></tr>
          <tr><td class="label">Work Exceptions</td><td>${exceptionsArr.length ? exceptionsArr.join(' | ') : 'None'}</td></tr>
          ${flagged ? `<tr><td class="label">Status</td><td><span class="warn">⚠️ Pending Management Review</span></td></tr>` : ''}
        </table>
        <p style="font-size:9.5pt;color:#333;font-style:italic;margin-bottom:12pt">${narrative}</p>
      `;
    }

    // ── Support staff table ─────────────────────────────────────────────────
    function buildSupportTable(): string {
      const rows = supportEmps.map(emp => {
        const recs = attThisMonth.filter(a => a.employeeCode === emp.employeeCode);
        const lateRecs = recs.filter(a => a.lateMinutes > 0);
        const totalLateMin = lateRecs.reduce((s, a) => s + a.lateMinutes, 0);
        return `<tr>
          <td>${emp.employeeName}</td>
          <td style="text-align:center">${lateRecs.length}</td>
          <td>${lateRecs.length ? fmtMin(totalLateMin) : 'N/A'}</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
        </tr>`;
      }).join('');

      return `
        <h2 style="text-align:left;margin-top:20pt">Support Staff — ${monthName} ${filterYear}</h2>
        <table class="support">
          <tr><th>Employee</th><th>Late Days</th><th>Total Late Time</th><th>Other Notes</th><th>Summary</th><th>Remarks</th></tr>
          ${rows || '<tr><td colspan="6" style="text-align:center">No support staff records</td></tr>'}
        </table>
      `;
    }

    // ── KPI Summary ─────────────────────────────────────────────────────────
    function buildKPI(): string {
      const totalEmps = mainEmps.length;
      const empsWithLate = [...new Set(attThisMonth.filter(a => a.lateMinutes > 0).map(a => a.employeeCode))].length;
      const missions = leaveRecords.filter(l => l.leaveType === 'Official Mission' &&
        l.fromDate.startsWith(`${filterYear}-${String(filterMonth).padStart(2,'0')}`)).length;
      const leaveDays = leaveRecords.filter(l =>
        l.fromDate.startsWith(`${filterYear}-${String(filterMonth).padStart(2,'0')}`) &&
        ['Annual Leave','Sick Leave','Maternity Leave'].includes(l.leaveType)
      ).reduce((s, l) => s + l.numberOfDays, 0);
      const ptExceededCount = mainEmps.filter(emp => {
        const recs = attThisMonth.filter(a => a.employeeCode === emp.employeeCode);
        const total = recs.reduce((s, a) => s + a.lateMinutes + a.earlyLeaveMinutes, 0);
        return total > ptAllowance;
      }).length;

      return `
        <h3 style="margin-top:20pt">KPI Summary — ${monthName} ${filterYear}</h3>
        <table class="kpi">
          <tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Total Main Employees</td><td>${totalEmps}</td></tr>
          <tr><td>Employees with Late Records</td><td>${empsWithLate} (${totalEmps ? Math.round(empsWithLate/totalEmps*100) : 0}%)</td></tr>
          <tr><td>Total Official Missions</td><td>${missions}</td></tr>
          <tr><td>Total Leave Days</td><td>${leaveDays}</td></tr>
          <tr><td>Employees with PT Exceeded</td><td>${ptExceededCount}</td></tr>
        </table>
      `;
    }

    const mainBlocks = mainEmps.map(buildEmpBlock).join('');
    const supportSection = buildSupportTable();
    const kpiSection = buildKPI();

    const noteText = 'Unregistered log out or unregistered log in — No records of log in or log out appear in the attendance system. The deduction of late logins from personal time remains subject to management discretion and decision.';

    const html = `
      <h1>FARAJ FUND</h1>
      <h2>Employee Attendance Profiles – ${monthName} ${filterYear}</h2>
      <p style="text-align:center;font-size:9pt;color:#555;margin-bottom:16pt">
        Note: Personal time calculations are presented both including and excluding late logins. Final deductions are subject to management decision.
      </p>
      <hr/>
      ${mainBlocks}
      <hr style="margin-top:20pt"/>
      ${supportSection}
      ${kpiSection}
      <div class="note">${noteText}</div>
    `;

    downloadAsDoc(html, `Faraj_Fund_Attendance_Profiles_${monthName}_${filterYear}.doc`);
  }

  return (
    <div className="p-6 flex gap-5 h-full">
      {/* Sidebar */}
      <div className="w-64 shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">Report Types</div>
          {REPORTS.map(r => (
            <button
              key={r.id}
              onClick={() => { setActiveReport(r.id); setSummaryGenerated(false); }}
              className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 transition-colors flex items-center gap-2.5 ${activeReport === r.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <span>{r.icon}</span>
              <span className="leading-snug">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Active Report Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">{REPORTS.find(r => r.id === activeReport)?.label}</h2>
            <div className="flex gap-2">
              {activeReport !== 'monthly-work-summary' && (
                <>
                  <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"><Download size={13} /> CSV</button>
                  <button onClick={exportJSON} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"><Download size={13} /> JSON</button>
                  <button onClick={copyReportData} disabled={reportData.length === 0} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-40 ${copiedData ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}><Copy size={13} /> {copiedData ? 'Copied!' : 'Copy'}</button>
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"><FileText size={13} /> Print</button>
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              {[2026,2025,2024].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {activeReport !== 'monthly-profiles' && <>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
                <option>All</option><option>Main Employee</option><option>Support Staff</option>
              </select>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
                <option>All</option>{departments.map(d => <option key={d}>{d}</option>)}
              </select>
              <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
                <option value="All">All Employees</option>
                {store.employees.map(e => <option key={e.id} value={e.id}>{e.employeeName}</option>)}
              </select>
            </>}
            {activeReport === 'monthly-work-summary' && (
              <button onClick={generateMonthlySummary} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <ClipboardList size={14} /> Generate Summary
              </button>
            )}
            {activeReport === 'monthly-profiles' && (
              <button onClick={generateMonthlyProfilesDoc} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <FileDown size={14} /> Generate &amp; Download Word
              </button>
            )}
          </div>
        </div>

        {/* Monthly Attendance Profiles */}
        {activeReport === 'monthly-profiles' ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <FileDown size={48} className="mx-auto mb-4 text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Monthly Attendance Profiles Report</h3>
              <p className="text-sm text-gray-500 mb-6">
                Generates the official Faraj Fund attendance profiles document for all employees —
                including late instances, personal time, work exceptions, narrative summaries,
                KPI table, and support staff section — ready for management review.
              </p>
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 mb-6 text-left space-y-1">
                <div>✓ Per-employee late analysis with dates</div>
                <div>✓ Personal time (excl. and incl. late)</div>
                <div>✓ Work exceptions (missions, leave, remote)</div>
                <div>✓ Auto-generated narrative paragraphs</div>
                <div>✓ Support staff separate section</div>
                <div>✓ KPI summary table</div>
                <div>✓ Official footer note</div>
              </div>
              <button onClick={generateMonthlyProfilesDoc} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto text-sm font-medium">
                <FileDown size={16} /> Generate &amp; Download Word for {monthsFull[filterMonth - 1]} {filterYear}
              </button>
              <p className="text-xs text-gray-400 mt-3">Opens in Microsoft Word or LibreOffice</p>
            </div>
          </div>
        ) : activeReport === 'monthly-work-summary' ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex-1 flex flex-col">
            {!summaryGenerated ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Select month/year and click "Generate Summary"</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-500">Edit the summary below before copying</div>
                  <button
                    onClick={copySummary}
                    className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    <Copy size={14} />
                    {copied ? 'Copied!' : 'Copy Monthly Summary'}
                  </button>
                </div>
                <textarea
                  ref={summaryRef}
                  value={editableSummary}
                  onChange={e => setEditableSummary(e.target.value)}
                  className="flex-1 w-full font-mono text-sm border border-gray-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50"
                  rows={25}
                />
              </>
            )}
          </div>
        ) : (
          /* Data Table */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">{reportData.length} records</div>
            <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {columns.map(col => (
                      <th key={col} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      {columns.map(col => (
                        <td key={col} className="px-3 py-2.5 text-gray-700">{String((row as Record<string, unknown>)[col] ?? '—')}</td>
                      ))}
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr><td colSpan={columns.length || 1} className="px-4 py-8 text-center text-gray-400">No data for selected filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
