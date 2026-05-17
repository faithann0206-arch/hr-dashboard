import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { Plus, Search, X, Edit2, Trash2, Download, CheckCircle } from 'lucide-react';
import { CaseBadge, JustificationBadge } from '@/components/StatusBadge';
import type { FollowUpCase, CaseType, CaseStatus, JustificationStatus } from '@/types';

const CASE_TYPES: CaseType[] = [
  'Late Entry','Early Leave','Absence','Missing Punch','Permission Hours Exceeded',
  'Justification Pending','Deduction Pending','Repeated Attendance Issue','Disciplinary Follow-up','Other',
];
const STATUSES: CaseStatus[] = [
  'Open','Awaiting Employee','Awaiting Management','Justification Pending',
  'Deduction Pending','Deduction Applied','Escalated','Closed','No Action Required',
];
const JUST_STATUSES: JustificationStatus[] = ['Not Required','Pending','Received','Overdue'];

function nextCaseId(existing: FollowUpCase[]) {
  const nums = existing.map(c => parseInt(c.caseId.replace(/\D/g,''))||0);
  return `CASE-${String(Math.max(0,...nums)+1).padStart(3,'0')}`;
}

const today = new Date().toISOString().split('T')[0];
const EMPTY: Omit<FollowUpCase,'id'> = {
  caseId:'', employeeId:'', employeeCode:'', caseType:'Late Entry',
  caseOpenedDate:today, issueDate:today, issueSummary:'',
  relatedAttendanceId:'', relatedLeaveId:'', relatedTaskId:'',
  relatedEmailLogId:'', relatedManagementDecisionId:'',
  justificationRequired:false, justificationStatus:'Not Required',
  emailSentDate:'', reminder1Date:'', reminder2Date:'',
  reportedToManagement:false, reportSentDate:'', managementDecisionStatus:'',
  actionStatus:'Open', finalOutcome:'', closureDate:'', notes:'', linkedDocumentIds:[],
};

export default function FollowUpCases() {
  const { store, addCase, updateCase, deleteCase, getEmployee } = useStore();
  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDept, setFilterDept]   = useState('All');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState<FollowUpCase|null>(null);
  const [form, setForm]               = useState<Omit<FollowUpCase,'id'>>(EMPTY);

  const departments = useMemo(()=>['All',...new Set(store.employees.map(e=>e.department))],[store.employees]);

  const filtered = useMemo(()=> store.followUpCases.filter(c=>{
    const emp = getEmployee(c.employeeId);
    const q = search.toLowerCase();
    const matchSearch = !search||c.caseId.toLowerCase().includes(q)||(emp?.employeeName||'').toLowerCase().includes(q)||c.employeeCode.toLowerCase().includes(q)||c.issueSummary.toLowerCase().includes(q);
    const matchDept = filterDept==='All'||emp?.department===filterDept;
    return matchSearch&&(filterType==='All'||c.caseType===filterType)&&(filterStatus==='All'||c.actionStatus===filterStatus)&&matchDept;
  }).sort((a,b)=>{
    const urgency=(c:FollowUpCase)=>['Awaiting Management','Escalated'].includes(c.actionStatus)?0:['Open','Awaiting Employee'].includes(c.actionStatus)?1:2;
    return urgency(a)-urgency(b)||b.caseOpenedDate.localeCompare(a.caseOpenedDate);
  }),[store.followUpCases,search,filterType,filterStatus,filterDept,getEmployee]);

  const handleEmpChange=(id:string)=>{const emp=getEmployee(id);setForm(f=>({...f,employeeId:id,employeeCode:emp?.employeeCode??''}));};
  const openAdd=()=>{setForm({...EMPTY,caseId:nextCaseId(store.followUpCases)});setEditTarget(null);setModalOpen(true);};
  const openEdit=(c:FollowUpCase)=>{setForm({...c});setEditTarget(c);setModalOpen(true);};
  const handleSave=()=>{
    if(!form.employeeId||!form.issueSummary)return;
    if(editTarget)updateCase(editTarget.id,form);
    else addCase(form);
    setModalOpen(false);
  };
  const handleDelete=(id:string)=>{if(confirm('Delete this case?'))deleteCase(id);};
  const closeCase=(c:FollowUpCase)=>updateCase(c.id,{actionStatus:'Closed',closureDate:today});

  function exportCSV(){
    const h=['Case ID','Employee','Type','Opened','Status','Just. Status','Reported to Mgmt'];
    const rows=filtered.map(c=>{const emp=getEmployee(c.employeeId);return[c.caseId,emp?.employeeName??c.employeeCode,c.caseType,c.caseOpenedDate,c.actionStatus,c.justificationStatus,c.reportedToManagement?'Yes':'No'];});
    const csv=[h,...rows].map(r=>r.join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='follow-up-cases.csv';a.click();
  }

  const open      = store.followUpCases.filter(c=>!['Closed','No Action Required'].includes(c.actionStatus)).length;
  const awaitMgmt = store.followUpCases.filter(c=>c.actionStatus==='Awaiting Management').length;
  const escalated = store.followUpCases.filter(c=>c.actionStatus==='Escalated').length;
  const closed    = store.followUpCases.filter(c=>c.actionStatus==='Closed').length;

  const inp="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
  const LI=({label,children}:{label:string;children:React.ReactNode})=>(<div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>{children}</div>);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Follow-up Cases</h1>
          <p className="text-sm text-gray-500 mt-0.5">{store.followUpCases.length} total · <span className="text-amber-600 font-medium">{open} open</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 text-sm border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600"><Download size={14}/> Export</button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"><Plus size={16}/> Open Case</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          {label:'Open Cases',value:open,border:'border-amber-500'},
          {label:'Awaiting Management',value:awaitMgmt,border:'border-orange-500'},
          {label:'Escalated',value:escalated,border:'border-red-500'},
          {label:'Closed',value:closed,border:'border-green-500'},
        ].map(s=>(
          <div key={s.label} className={`bg-white rounded-lg border-l-4 ${s.border} px-4 py-3 border border-gray-200`}>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-white rounded-xl border border-gray-200">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" placeholder="Search cases, employees…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2" value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="All">All Types</option>{CASE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2" value={filterDept} onChange={e=>setFilterDept(e.target.value)}>
          {departments.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <span className="text-sm text-gray-500">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Case ID','Employee','Department','Case Type','Opened','Status','Just. Status','Reported','Actions'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length===0&&<tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No cases found.</td></tr>}
              {filtered.map(c=>{
                const emp=getEmployee(c.employeeId);
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{c.caseId}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><div className="font-medium text-gray-900">{emp?.employeeName??c.employeeCode}</div><div className="text-xs text-gray-400">{c.employeeCode}</div></td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{emp?.department??'—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{c.caseType}</span></td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.caseOpenedDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><CaseBadge status={c.actionStatus}/></td>
                    <td className="px-4 py-3 whitespace-nowrap"><JustificationBadge status={c.justificationStatus}/></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{c.reportedToManagement?<span className="text-green-600 font-medium">Yes – {c.reportSentDate}</span>:<span className="text-gray-400">No</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {!['Closed','No Action Required'].includes(c.actionStatus)&&<button onClick={()=>closeCase(c)} className="text-green-600 hover:text-green-800" title="Close case"><CheckCircle size={14}/></button>}
                        <button onClick={()=>openEdit(c)} className="text-blue-600 hover:text-blue-800"><Edit2 size={14}/></button>
                        <button onClick={()=>handleDelete(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail expanded row on hover or click could be added here */}
      {modalOpen&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-900">{editTarget?'Edit':'New'} Follow-up Case</h2>
              <button onClick={()=>setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <LI label="Case ID"><input className={inp} value={form.caseId} onChange={e=>setForm(f=>({...f,caseId:e.target.value}))}/></LI>
                <LI label="Case Opened Date"><input type="date" className={inp} value={form.caseOpenedDate} onChange={e=>setForm(f=>({...f,caseOpenedDate:e.target.value}))}/></LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Employee *">
                  <select className={inp} value={form.employeeId} onChange={e=>handleEmpChange(e.target.value)}>
                    <option value="">Select employee…</option>
                    {store.employees.map(e=><option key={e.id} value={e.id}>{e.employeeName} ({e.employeeCode})</option>)}
                  </select>
                </LI>
                <LI label="Issue Date"><input type="date" className={inp} value={form.issueDate} onChange={e=>setForm(f=>({...f,issueDate:e.target.value}))}/></LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Case Type">
                  <select className={inp} value={form.caseType} onChange={e=>setForm(f=>({...f,caseType:e.target.value as CaseType}))}>
                    {CASE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </LI>
                <LI label="Action Status">
                  <select className={inp} value={form.actionStatus} onChange={e=>setForm(f=>({...f,actionStatus:e.target.value as CaseStatus}))}>
                    {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </LI>
              </div>
              <LI label="Issue Summary *"><textarea rows={3} className={inp+' resize-none'} placeholder="Describe the issue in detail…" value={form.issueSummary} onChange={e=>setForm(f=>({...f,issueSummary:e.target.value}))}/></LI>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Justification Status">
                  <select className={inp} value={form.justificationStatus} onChange={e=>setForm(f=>({...f,justificationStatus:e.target.value as JustificationStatus}))}>
                    {JUST_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </LI>
                <LI label="Email Sent Date"><input type="date" className={inp} value={form.emailSentDate} onChange={e=>setForm(f=>({...f,emailSentDate:e.target.value}))}/></LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Reminder 1 Date"><input type="date" className={inp} value={form.reminder1Date} onChange={e=>setForm(f=>({...f,reminder1Date:e.target.value}))}/></LI>
                <LI label="Reminder 2 Date"><input type="date" className={inp} value={form.reminder2Date} onChange={e=>setForm(f=>({...f,reminder2Date:e.target.value}))}/></LI>
              </div>
              <div className="flex flex-wrap gap-5 py-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={form.justificationRequired} onChange={e=>setForm(f=>({...f,justificationRequired:e.target.checked}))}/>Justification Required</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={form.reportedToManagement} onChange={e=>setForm(f=>({...f,reportedToManagement:e.target.checked}))}/>Reported to Management</label>
              </div>
              {form.reportedToManagement&&(
                <div className="grid grid-cols-2 gap-4">
                  <LI label="Report Sent Date"><input type="date" className={inp} value={form.reportSentDate} onChange={e=>setForm(f=>({...f,reportSentDate:e.target.value}))}/></LI>
                  <LI label="Management Decision Status"><input className={inp} placeholder="e.g. Awaiting Instruction…" value={form.managementDecisionStatus} onChange={e=>setForm(f=>({...f,managementDecisionStatus:e.target.value}))}/></LI>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <LI label="Related Email Log ID"><input className={inp} placeholder="e.g. EL-001" value={form.relatedEmailLogId} onChange={e=>setForm(f=>({...f,relatedEmailLogId:e.target.value}))}/></LI>
                <LI label="Related Decision ID"><input className={inp} placeholder="e.g. MD-001" value={form.relatedManagementDecisionId} onChange={e=>setForm(f=>({...f,relatedManagementDecisionId:e.target.value}))}/></LI>
              </div>
              {['Closed','No Action Required'].includes(form.actionStatus)&&(
                <div className="grid grid-cols-2 gap-4">
                  <LI label="Final Outcome"><input className={inp} value={form.finalOutcome} onChange={e=>setForm(f=>({...f,finalOutcome:e.target.value}))}/></LI>
                  <LI label="Closure Date"><input type="date" className={inp} value={form.closureDate} onChange={e=>setForm(f=>({...f,closureDate:e.target.value}))}/></LI>
                </div>
              )}
              <LI label="Notes"><textarea rows={2} className={inp+' resize-none'} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></LI>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={()=>setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{editTarget?'Save Changes':'Open Case'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
