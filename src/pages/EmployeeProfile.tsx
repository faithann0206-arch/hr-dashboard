import { useRoute, useLocation } from 'wouter';
import { useStore } from '@/store';
import {
  ArrowLeft, User, Calendar, FileText, Briefcase,
  Scale, AlertTriangle, CheckSquare, Mail,
} from 'lucide-react';
import {
  AttendanceBadge, CaseBadge, TaskStatusBadge,
  LeaveRecordBadge, ManagementDecisionBadge, EmailLogBadge, PendingDocBadge,
  EmployeeCategoryBadge, EmployeeStatusBadge, DisciplinaryBadge,
  JustificationBadge, FinalStatusBadge,
} from '@/components/StatusBadge';
import { useState } from 'react';

type Tab = 'attendance' | 'leave' | 'decisions' | 'emails' | 'pendingdocs' | 'cases' | 'disciplinary' | 'tasks';

export default function EmployeeProfile() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/employees/:id');
  const { store } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('attendance');

  if (!match || !params) return null;
  const emp = store.employees.find(e => e.id === params.id);
  if (!emp) return <div className="p-6 text-gray-500">Employee not found.</div>;

  const attendance   = store.attendanceRecords.filter(a => a.employeeCode === emp.employeeCode).sort((a,b) => b.date.localeCompare(a.date));
  const leaves       = store.leaveRecords.filter(l => l.employeeCode === emp.employeeCode).sort((a,b) => b.fromDate.localeCompare(a.fromDate));
  const decisions    = store.managementDecisions.filter(d => d.employeeCode === emp.employeeCode).sort((a,b) => b.dateReported.localeCompare(a.dateReported));
  const emailLogs    = store.emailLogs.filter(e => e.relatedEmployeeId === emp.id).sort((a,b) => b.dateSent.localeCompare(a.dateSent));
  const pendingDocs  = store.pendingDocuments.filter(d => d.employeeId === emp.id).sort((a,b) => (a.dueDate||'').localeCompare(b.dueDate||''));
  const cases        = store.followUpCases.filter(c => c.employeeCode === emp.employeeCode).sort((a,b) => b.caseOpenedDate.localeCompare(a.caseOpenedDate));
  const disciplinary = store.disciplinaryRecords.filter(d => d.employeeCode === emp.employeeCode);
  const tasks        = store.dailyTasks.filter(t => t.relatedEmployeeId === emp.id).sort((a,b) => b.date.localeCompare(a.date));

  const thisYear   = new Date().getFullYear();
  const yearAtt    = attendance.filter(a => a.year === thisYear);
  const lateCount  = yearAtt.filter(a => a.status === 'Late' || a.status === 'Late and Early Leave').length;
  const earlyCount = yearAtt.filter(a => a.status === 'Early Leave' || a.status === 'Late and Early Leave').length;
  const absCount   = yearAtt.filter(a => a.status === 'Absent').length;
  const leaveCount = leaves.filter(l => new Date(l.fromDate).getFullYear() === thisYear).length;
  const pJustCount = attendance.filter(a => a.justificationStatus === 'Pending' || a.justificationStatus === 'Overdue').length;
  const openCases  = cases.filter(c => !['Closed','No Action Required'].includes(c.actionStatus)).length;

  const showDisc = emp.employeeCategory === 'Main Employee' || emp.enableDisciplinary;

  const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'attendance',  label: 'Attendance',       icon: Calendar,       count: attendance.length },
    { id: 'leave',       label: 'Leave & Work',     icon: Calendar,       count: leaves.length },
    { id: 'decisions',   label: 'Decisions',        icon: Scale,          count: decisions.length },
    { id: 'emails',      label: 'Email Log',        icon: Mail,           count: emailLogs.length },
    { id: 'pendingdocs', label: 'Pending Docs',     icon: FileText,       count: pendingDocs.length },
    { id: 'cases',       label: 'Follow-up Cases',  icon: Briefcase,      count: cases.length },
    ...(showDisc ? [{ id: 'disciplinary' as Tab, label: 'Disciplinary', icon: AlertTriangle, count: disciplinary.length }] : []),
    { id: 'tasks',       label: 'Tasks',            icon: CheckSquare,    count: tasks.length },
  ];

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{children}</th>
  );
  const TD = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={`px-4 py-2.5 ${className ?? ''}`}>{children}</td>
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <button onClick={() => navigate('/employees')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
        <ArrowLeft size={16}/> Back to Employees
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <User size={28} className="text-blue-600"/>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800">{emp.employeeName}</h1>
              <EmployeeCategoryBadge category={emp.employeeCategory}/>
              <EmployeeStatusBadge status={emp.status}/>
            </div>
            <div className="text-sm text-gray-500 mb-3">{emp.employeeCode} · {emp.designation} · {emp.department}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><div className="text-gray-400 text-xs">Work Timing</div><div className="font-medium text-gray-700 mt-0.5">{emp.workTiming}</div></div>
              <div><div className="text-gray-400 text-xs">Permission Balance</div><div className="font-medium text-gray-700 mt-0.5">{emp.monthlyPermissionBalance}h/month</div></div>
              <div><div className="text-gray-400 text-xs">Disciplinary Enabled</div><div className="font-medium text-gray-700 mt-0.5">{emp.enableDisciplinary ? 'Yes' : 'No'}</div></div>
              {emp.notes && <div><div className="text-gray-400 text-xs">Notes</div><div className="font-medium text-gray-700 mt-0.5 text-sm">{emp.notes}</div></div>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-5 pt-5 border-t border-gray-100">
          {[
            { label: 'Late Entries',   value: lateCount,  color: 'text-yellow-600' },
            { label: 'Early Leaves',   value: earlyCount, color: 'text-orange-600' },
            { label: 'Absences',       value: absCount,   color: 'text-red-600' },
            { label: 'Leaves Taken',   value: leaveCount, color: 'text-blue-600' },
            { label: 'Pending Just.',  value: pJustCount, color: 'text-yellow-600' },
            { label: 'Open Cases',     value: openCases,  color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              <div className="text-xs text-gray-400">This Year</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl border border-gray-200 p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab===tab.id?'bg-blue-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>
            <tab.icon size={14}/>
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab===tab.id?'bg-blue-500 text-white':'bg-gray-100 text-gray-600'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        {activeTab === 'attendance' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><TH>Date</TH><TH>Status</TH><TH>Actual In</TH><TH>Actual Out</TH><TH>Late Min</TH><TH>Early Min</TH><TH>Justification</TH><TH>Final Status</TH></tr>
            </thead>
            <tbody>
              {attendance.length===0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No attendance records</td></tr>}
              {attendance.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <TD className="text-gray-700 font-medium">{a.date}</TD>
                  <TD><AttendanceBadge status={a.status}/></TD>
                  <TD className="font-mono text-xs text-gray-600">{a.actualIn||'—'}</TD>
                  <TD className="font-mono text-xs text-gray-600">{a.actualOut||'—'}</TD>
                  <TD className="text-gray-600">{a.lateMinutes>0?<span className="text-yellow-700 font-medium">{a.lateMinutes}</span>:'—'}</TD>
                  <TD className="text-gray-600">{a.earlyLeaveMinutes>0?<span className="text-orange-700 font-medium">{a.earlyLeaveMinutes}</span>:'—'}</TD>
                  <TD><JustificationBadge status={a.justificationStatus}/></TD>
                  <TD><FinalStatusBadge status={a.finalStatus}/></TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'leave' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><TH>Leave Type</TH><TH>From</TH><TH>To</TH><TH>Days/Hours</TH><TH>Status</TH><TH>Doc Required</TH><TH>Doc Received</TH><TH>Notes</TH></tr>
            </thead>
            <tbody>
              {leaves.length===0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No leave records</td></tr>}
              {leaves.map(l => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <TD className="text-gray-700 font-medium">{l.leaveType}</TD>
                  <TD className="text-gray-600">{l.fromDate}</TD>
                  <TD className="text-gray-600">{l.toDate}</TD>
                  <TD className="text-gray-600">{l.numberOfDays>0?`${l.numberOfDays}d`:`${l.numberOfHours}h`}</TD>
                  <TD><LeaveRecordBadge status={l.status}/></TD>
                  <TD>{l.supportingDocumentRequired?<span className="text-amber-600 text-xs font-medium">Yes</span>:<span className="text-gray-400 text-xs">No</span>}</TD>
                  <TD>{l.supportingDocumentReceived?<span className="text-green-600 text-xs font-medium">Yes</span>:<span className="text-red-500 text-xs">No</span>}</TD>
                  <TD className="text-gray-500 text-xs max-w-[200px] truncate">{l.notes||'—'}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'decisions' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><TH>Decision ID</TH><TH>Date Reported</TH><TH>Module</TH><TH>Issue Summary</TH><TH>Status</TH><TH>Management Instruction</TH><TH>Final Action</TH></tr>
            </thead>
            <tbody>
              {decisions.length===0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No management decisions</td></tr>}
              {decisions.map(d => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <TD className="font-mono text-xs text-blue-700 font-semibold">{d.decisionId}</TD>
                  <TD className="text-gray-600">{d.dateReported||'—'}</TD>
                  <TD><span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{d.relatedModule}</span></TD>
                  <TD className="max-w-[200px]"><div className="truncate text-gray-700">{d.issueSummary||'—'}</div></TD>
                  <TD><ManagementDecisionBadge status={d.status}/></TD>
                  <TD className="text-gray-600 text-xs max-w-[160px] truncate">{d.managementInstruction||'—'}</TD>
                  <TD className="text-gray-600 text-xs">{d.finalAction||'—'}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'emails' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><TH>Email ID</TH><TH>Date Sent</TH><TH>Type</TH><TH>Subject</TH><TH>Status</TH><TH>Response</TH><TH>Follow-up Due</TH></tr>
            </thead>
            <tbody>
              {emailLogs.length===0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No email log records</td></tr>}
              {emailLogs.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <TD className="font-mono text-xs text-blue-700 font-semibold">{e.emailLogId}</TD>
                  <TD className="text-gray-600">{e.dateSent}</TD>
                  <TD className="text-gray-700 text-xs max-w-[140px] truncate">{e.emailType}</TD>
                  <TD className="max-w-[200px]"><div className="truncate text-gray-700">{e.subject}</div></TD>
                  <TD><EmailLogBadge status={e.status}/></TD>
                  <TD>{e.responseReceived?<span className="text-green-600 text-xs font-medium">Received {e.responseDate}</span>:e.responseRequired?<span className="text-amber-600 text-xs">Pending</span>:<span className="text-gray-400 text-xs">N/A</span>}</TD>
                  <TD className="text-gray-600 text-xs">{e.followUpDueDate||'—'}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'pendingdocs' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><TH>Doc ID</TH><TH>Document Type</TH><TH>Required Document</TH><TH>Related Date</TH><TH>Due Date</TH><TH>Status</TH><TH>Received</TH></tr>
            </thead>
            <tbody>
              {pendingDocs.length===0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No pending documents</td></tr>}
              {pendingDocs.map(d => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <TD className="font-mono text-xs text-blue-700 font-semibold">{d.documentRequirementId}</TD>
                  <TD className="text-gray-700">{d.documentType}</TD>
                  <TD className="max-w-[200px]"><div className="truncate text-gray-600 text-xs">{d.requiredDocument}</div></TD>
                  <TD className="text-gray-600">{d.relatedDate||'—'}</TD>
                  <TD className="text-gray-600">{d.dueDate||'—'}</TD>
                  <TD><PendingDocBadge status={d.status}/></TD>
                  <TD>{d.received?<span className="text-green-600 text-xs font-medium">Yes – {d.receivedDate}</span>:<span className="text-red-500 text-xs">No</span>}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'cases' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><TH>Case ID</TH><TH>Type</TH><TH>Opened</TH><TH>Status</TH><TH>Reported to Mgmt</TH><TH>Summary</TH></tr>
            </thead>
            <tbody>
              {cases.length===0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No cases</td></tr>}
              {cases.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <TD className="font-mono text-xs text-gray-600">{c.caseId}</TD>
                  <TD className="text-gray-700">{c.caseType}</TD>
                  <TD className="text-gray-600">{c.caseOpenedDate}</TD>
                  <TD><CaseBadge status={c.actionStatus}/></TD>
                  <TD>{c.reportedToManagement?<span className="text-green-600 text-xs font-medium">Yes – {c.reportSentDate}</span>:<span className="text-gray-400 text-xs">No</span>}</TD>
                  <TD className="text-gray-500 text-xs max-w-[200px] truncate">{c.issueSummary}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'disciplinary' && showDisc && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><TH>Case ID</TH><TH>Violation</TH><TH>Proposed Action</TH><TH>Approved Action</TH><TH>Status</TH><TH>Letter Issued</TH></tr>
            </thead>
            <tbody>
              {disciplinary.length===0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No disciplinary records</td></tr>}
              {disciplinary.map(d => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <TD className="font-mono text-xs text-gray-600">{d.disciplinaryCaseId}</TD>
                  <TD className="text-gray-700">{d.violationType}</TD>
                  <TD className="text-gray-600">{d.proposedAction}</TD>
                  <TD className="text-gray-600">{d.approvedAction||'—'}</TD>
                  <TD><DisciplinaryBadge status={d.caseStatus}/></TD>
                  <TD>{d.letterIssued?<span className="text-green-600 text-xs font-medium">Yes – {d.letterDate}</span>:<span className="text-gray-400 text-xs">No</span>}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'tasks' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><TH>Task ID</TH><TH>Date</TH><TH>Category</TH><TH>Title</TH><TH>Priority</TH><TH>Status</TH></tr>
            </thead>
            <tbody>
              {tasks.length===0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No related tasks</td></tr>}
              {tasks.map(t => {
                const pc: Record<string,string> = {Urgent:'text-red-600 font-bold',High:'text-orange-600 font-semibold',Normal:'text-gray-700',Low:'text-gray-400'};
                return (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <TD className="font-mono text-xs text-gray-500">{t.taskId}</TD>
                    <TD className="text-gray-600">{t.date}</TD>
                    <TD className="text-gray-600 text-xs">{t.taskCategory}</TD>
                    <TD className="font-medium text-gray-800 max-w-[200px]"><div className="truncate">{t.taskTitle}</div></TD>
                    <TD><span className={`text-xs ${pc[t.priority]??''}`}>{t.priority}</span></TD>
                    <TD><TaskStatusBadge status={t.status}/></TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
