import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { Plus, Search, X, Edit2, Trash2, Download } from 'lucide-react';
import { EmailLogBadge } from '@/components/StatusBadge';
import type { EmailLog, EmailType, EmailLogStatus, RelatedModule } from '@/types';

const EMAIL_TYPES: EmailType[] = [
  'Attendance Issue Notification','Justification Form Request','Reminder for Justification Form',
  'Management Report','Management Decision Request','Deduction Notification',
  'Leave Documentation Request','Remote Work Documentation Request',
  'Official Mission Documentation Request','Monthly Attendance Report',
  'Disciplinary Follow-up','General HR Follow-up','Other',
];
const STATUSES: EmailLogStatus[] = [
  'Sent','Awaiting Employee Response','Awaiting Management Response',
  'Response Received','Follow-up Required','Closed',
];
const MODULES: (RelatedModule|'')[] = ['','Attendance','Leave','Remote Work','Official Mission','Disciplinary','Deduction','Monthly Report','Other'];

function nextEmailId(existing: EmailLog[]) {
  const nums = existing.map(e => parseInt(e.emailLogId.replace(/\D/g,''))||0);
  return `EL-${String(Math.max(0,...nums)+1).padStart(3,'0')}`;
}

const today = new Date().toISOString().split('T')[0];
const EMPTY: Omit<EmailLog,'id'> = {
  emailLogId:'', dateSent:today, emailType:'Attendance Issue Notification',
  relatedEmployeeId:'', relatedEmployeeCode:'', department:'',
  relatedModule:'', relatedRecordId:'', subject:'', recipient:'', cc:'',
  summary:'', actionRequested:'', responseRequired:false, responseReceived:false,
  responseDate:'', followUpRequired:false, followUpDueDate:'',
  status:'Sent', fileEmailLinkRef:'', notes:'',
};

export default function EmailLog() {
  const { store, addEmailLog, updateEmailLog, deleteEmailLog, getEmployee } = useStore();
  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDept, setFilterDept]   = useState('All');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState<EmailLog|null>(null);
  const [form, setForm]               = useState<Omit<EmailLog,'id'>>(EMPTY);

  const departments = useMemo(()=>['All',...new Set(store.employees.map(e=>e.department))],[store.employees]);

  const filtered = useMemo(()=> store.emailLogs.filter(e=>{
    const emp = getEmployee(e.relatedEmployeeId);
    const q = search.toLowerCase();
    const matchSearch = !search||e.emailLogId.toLowerCase().includes(q)||e.subject.toLowerCase().includes(q)||
      (emp?.employeeName||'').toLowerCase().includes(q)||e.relatedEmployeeCode.toLowerCase().includes(q);
    return matchSearch&&(filterType==='All'||e.emailType===filterType)&&(filterStatus==='All'||e.status===filterStatus)&&(filterDept==='All'||e.department===filterDept);
  }).sort((a,b)=>b.dateSent.localeCompare(a.dateSent)),[store.emailLogs,search,filterType,filterStatus,filterDept,getEmployee]);

  const handleEmpChange = (id: string) => {
    const emp = getEmployee(id);
    setForm(f=>({...f, relatedEmployeeId:id, relatedEmployeeCode:emp?.employeeCode??'', department:emp?.department??''}));
  };
  const openAdd = () => { setForm({...EMPTY, emailLogId:nextEmailId(store.emailLogs)}); setEditTarget(null); setModalOpen(true); };
  const openEdit = (e: EmailLog) => { setForm({...e}); setEditTarget(e); setModalOpen(true); };
  const handleSave = () => {
    if (!form.subject) return;
    if (editTarget) updateEmailLog(editTarget.id, form);
    else addEmailLog(form);
    setModalOpen(false);
  };
  const handleDelete = (id: string) => { if(confirm('Delete this email log entry?')) deleteEmailLog(id); };

  function exportCSV() {
    const headers = ['Email ID','Date Sent','Type','Employee','Department','Subject','Recipient','Status','Response Required','Response Received','Follow-up Due'];
    const rows = filtered.map(e=>{
      const emp = getEmployee(e.relatedEmployeeId);
      return [e.emailLogId,e.dateSent,e.emailType,emp?.employeeName??e.relatedEmployeeCode,e.department,e.subject,e.recipient,e.status,e.responseRequired?'Yes':'No',e.responseReceived?'Yes':'No',e.followUpDueDate||'—'];
    });
    const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='email-log.csv'; a.click();
  }

  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
  const LI = ({label,children}:{label:string;children:React.ReactNode})=>(
    <div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>{children}</div>
  );

  const awaitEmp  = store.emailLogs.filter(e=>e.status==='Awaiting Employee Response').length;
  const awaitMgmt = store.emailLogs.filter(e=>e.status==='Awaiting Management Response').length;
  const fuReq     = store.emailLogs.filter(e=>e.status==='Follow-up Required').length;
  const active    = store.emailLogs.filter(e=>e.status!=='Closed').length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Email Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">{store.emailLogs.length} total · <span className="text-amber-600 font-medium">{active} active</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 text-sm border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600"><Download size={14}/> Export</button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"><Plus size={16}/> Log Email</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label:'Awaiting Employee', value:awaitEmp,  border:'border-amber-500' },
          { label:'Awaiting Management', value:awaitMgmt, border:'border-orange-500' },
          { label:'Follow-up Required', value:fuReq,    border:'border-red-500' },
          { label:'Total Active', value:active,         border:'border-slate-400' },
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
          <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" placeholder="Search emails, employees, subject…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2" value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="All">All Types</option>{EMAIL_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
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
              <tr>
                {['Email ID','Date Sent','Email Type','Employee','Dept','Subject','Status','Response','Follow-up Due','Actions'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length===0&&<tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">No email logs found.</td></tr>}
              {filtered.map(e=>{
                const emp = getEmployee(e.relatedEmployeeId);
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{e.emailLogId}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.dateSent}</td>
                    <td className="px-4 py-3 max-w-[140px]"><div className="truncate text-xs text-gray-700">{e.emailType}</div></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{emp?.employeeName??e.relatedEmployeeCode}</div>
                      <div className="text-xs text-gray-400">{e.relatedEmployeeCode}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.department}</td>
                    <td className="px-4 py-3 max-w-xs"><div className="truncate text-gray-700">{e.subject}</div></td>
                    <td className="px-4 py-3 whitespace-nowrap"><EmailLogBadge status={e.status}/></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {e.responseReceived?<span className="text-green-600 font-medium">Received</span>:
                       e.responseRequired?<span className="text-amber-600">Pending</span>:
                       <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{e.followUpDueDate||'—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={()=>openEdit(e)} className="text-blue-600 hover:text-blue-800"><Edit2 size={14}/></button>
                        <button onClick={()=>handleDelete(e.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-900">{editTarget?'Edit':'Log New'} Email</h2>
              <button onClick={()=>setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <LI label="Email Log ID"><input className={inp} value={form.emailLogId} onChange={e=>setForm(f=>({...f,emailLogId:e.target.value}))}/></LI>
                <LI label="Date Sent"><input type="date" className={inp} value={form.dateSent} onChange={e=>setForm(f=>({...f,dateSent:e.target.value}))}/></LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Email Type">
                  <select className={inp} value={form.emailType} onChange={e=>setForm(f=>({...f,emailType:e.target.value as EmailType}))}>
                    {EMAIL_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </LI>
                <LI label="Status">
                  <select className={inp} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as EmailLogStatus}))}>
                    {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Related Employee">
                  <select className={inp} value={form.relatedEmployeeId} onChange={e=>handleEmpChange(e.target.value)}>
                    <option value="">No specific employee</option>
                    {store.employees.filter(e=>e.status==='Active').map(e=><option key={e.id} value={e.id}>{e.employeeName} ({e.employeeCode})</option>)}
                  </select>
                </LI>
                <LI label="Department"><input className={inp+' bg-gray-50'} readOnly value={form.department}/></LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Related Module">
                  <select className={inp} value={form.relatedModule} onChange={e=>setForm(f=>({...f,relatedModule:e.target.value as RelatedModule|''}))}>
                    {MODULES.map(m=><option key={m} value={m}>{m||'— None —'}</option>)}
                  </select>
                </LI>
                <LI label="Related Record ID"><input className={inp} placeholder="e.g. ATT-001, MD-002…" value={form.relatedRecordId} onChange={e=>setForm(f=>({...f,relatedRecordId:e.target.value}))}/></LI>
              </div>
              <LI label="Subject *"><input className={inp} placeholder="Email subject line…" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}/></LI>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Recipient"><input className={inp} placeholder="To: name / email" value={form.recipient} onChange={e=>setForm(f=>({...f,recipient:e.target.value}))}/></LI>
                <LI label="CC"><input className={inp} placeholder="CC: names / emails" value={form.cc} onChange={e=>setForm(f=>({...f,cc:e.target.value}))}/></LI>
              </div>
              <LI label="Summary"><textarea rows={2} className={inp+' resize-none'} placeholder="Brief summary of email content…" value={form.summary} onChange={e=>setForm(f=>({...f,summary:e.target.value}))}/></LI>
              <LI label="Action Requested"><input className={inp} placeholder="What action is requested from recipient…" value={form.actionRequested} onChange={e=>setForm(f=>({...f,actionRequested:e.target.value}))}/></LI>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={form.responseRequired} onChange={e=>setForm(f=>({...f,responseRequired:e.target.checked}))}/>
                  Response Required
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={form.responseReceived} onChange={e=>setForm(f=>({...f,responseReceived:e.target.checked}))}/>
                  Response Received
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={form.followUpRequired} onChange={e=>setForm(f=>({...f,followUpRequired:e.target.checked}))}/>
                  Follow-up Required
                </label>
              </div>
              {form.responseReceived&&(
                <LI label="Response Date"><input type="date" className={inp} value={form.responseDate} onChange={e=>setForm(f=>({...f,responseDate:e.target.value}))}/></LI>
              )}
              {form.followUpRequired&&(
                <LI label="Follow-up Due Date"><input type="date" className={inp} value={form.followUpDueDate} onChange={e=>setForm(f=>({...f,followUpDueDate:e.target.value}))}/></LI>
              )}
              <LI label="File / Email Reference"><input className={inp} placeholder="File name, email ref, or link…" value={form.fileEmailLinkRef} onChange={e=>setForm(f=>({...f,fileEmailLinkRef:e.target.value}))}/></LI>
              <LI label="Notes"><textarea rows={2} className={inp+' resize-none'} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></LI>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={()=>setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                {editTarget?'Save Changes':'Log Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
