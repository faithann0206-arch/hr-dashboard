import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { Plus, Search, X, Edit2, Trash2, Download } from 'lucide-react';
import { DisciplinaryBadge } from '@/components/StatusBadge';
import type { DisciplinaryRecord, ViolationType, ProposedAction, DisciplinaryCaseStatus } from '@/types';

const VIOLATION_TYPES: ViolationType[] = [
  'Repeated Late Entry','Repeated Early Leave','Repeated Absence',
  'Unapproved Absence','Missing Justification','Other',
];
const PROPOSED_ACTIONS: ProposedAction[] = [
  'Verbal Reminder','Written Reminder','Written Warning',
  'Deduction','Suspension','Final Warning','Termination Recommendation','No Action',
];
const CASE_STATUSES: DisciplinaryCaseStatus[] = [
  'Draft','Awaiting Explanation','Awaiting Management','Approved','Letter Issued','Closed','Cancelled',
];

function nextDiscId(existing: DisciplinaryRecord[]) {
  const nums = existing.map(d=>parseInt(d.disciplinaryCaseId.replace(/\D/g,''))||0);
  return `DISC-${String(Math.max(0,...nums)+1).padStart(3,'0')}`;
}

const today = new Date().toISOString().split('T')[0];
const EMPTY: Omit<DisciplinaryRecord,'id'> = {
  disciplinaryCaseId:'', employeeId:'', employeeCode:'', relatedCaseIds:[], relatedTaskId:'',
  violationType:'Repeated Late Entry', previousIncidentsCount:0, explanationReceived:false,
  proposedAction:'Written Warning', approvedAction:'', managementApprovalDate:'',
  letterIssued:false, letterDate:'', caseStatus:'Draft', finalOutcome:'', linkedDocumentIds:[], notes:'',
};

export default function DisciplinaryRegister() {
  const { store, addDisciplinary, updateDisciplinary, deleteDisciplinary, getEmployee } = useStore();
  const [search, setSearch]             = useState('');
  const [filterViolation, setFilterVio] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDept, setFilterDept]     = useState('All');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editTarget, setEditTarget]     = useState<DisciplinaryRecord|null>(null);
  const [form, setForm]                 = useState<Omit<DisciplinaryRecord,'id'>>(EMPTY);

  const departments = useMemo(()=>['All',...new Set(store.employees.map(e=>e.department))],[store.employees]);

  const filtered = useMemo(()=> store.disciplinaryRecords.filter(d=>{
    const emp = getEmployee(d.employeeId);
    const q = search.toLowerCase();
    const matchSearch = !search||d.disciplinaryCaseId.toLowerCase().includes(q)||(emp?.employeeName||'').toLowerCase().includes(q)||d.employeeCode.toLowerCase().includes(q);
    const matchDept = filterDept==='All'||emp?.department===filterDept;
    return matchSearch&&(filterViolation==='All'||d.violationType===filterViolation)&&(filterStatus==='All'||d.caseStatus===filterStatus)&&matchDept;
  }).sort((a,b)=>{
    const urgency=(d:DisciplinaryRecord)=>d.caseStatus==='Awaiting Management'?0:d.caseStatus==='Draft'?1:d.caseStatus==='Awaiting Explanation'?2:3;
    return urgency(a)-urgency(b);
  }),[store.disciplinaryRecords,search,filterViolation,filterStatus,filterDept,getEmployee]);

  const handleEmpChange=(id:string)=>{const emp=getEmployee(id);setForm(f=>({...f,employeeId:id,employeeCode:emp?.employeeCode??''}));};
  const openAdd=()=>{setForm({...EMPTY,disciplinaryCaseId:nextDiscId(store.disciplinaryRecords)});setEditTarget(null);setModalOpen(true);};
  const openEdit=(d:DisciplinaryRecord)=>{setForm({...d});setEditTarget(d);setModalOpen(true);};
  const handleSave=()=>{
    if(!form.employeeId)return;
    if(editTarget)updateDisciplinary(editTarget.id,form);
    else addDisciplinary(form);
    setModalOpen(false);
  };
  const handleDelete=(id:string)=>{if(confirm('Delete this disciplinary record?'))deleteDisciplinary(id);};

  function exportCSV(){
    const h=['Disc ID','Employee','Department','Violation','Proposed Action','Approved Action','Status','Letter Issued'];
    const rows=filtered.map(d=>{const emp=getEmployee(d.employeeId);return[d.disciplinaryCaseId,emp?.employeeName??d.employeeCode,emp?.department??'',d.violationType,d.proposedAction,d.approvedAction||'—',d.caseStatus,d.letterIssued?'Yes':'No'];});
    const csv=[h,...rows].map(r=>r.join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='disciplinary.csv';a.click();
  }

  const draft      = store.disciplinaryRecords.filter(d=>d.caseStatus==='Draft').length;
  const awaitMgmt  = store.disciplinaryRecords.filter(d=>d.caseStatus==='Awaiting Management').length;
  const letterIss  = store.disciplinaryRecords.filter(d=>d.letterIssued).length;
  const closedN    = store.disciplinaryRecords.filter(d=>d.caseStatus==='Closed'||d.caseStatus==='Cancelled').length;

  const inp="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
  const LI=({label,children}:{label:string;children:React.ReactNode})=>(<div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>{children}</div>);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Disciplinary Register</h1>
          <p className="text-sm text-gray-500 mt-0.5">{store.disciplinaryRecords.length} total records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 text-sm border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600"><Download size={14}/> Export</button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"><Plus size={16}/> New Disciplinary Record</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          {label:'Draft / Pending',value:draft,border:'border-gray-400'},
          {label:'Awaiting Management',value:awaitMgmt,border:'border-amber-500'},
          {label:'Letter Issued',value:letterIss,border:'border-teal-500'},
          {label:'Closed / Cancelled',value:closedN,border:'border-green-500'},
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
          <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" placeholder="Search records, employees…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2" value={filterViolation} onChange={e=>setFilterVio(e.target.value)}>
          <option value="All">All Violations</option>{VIOLATION_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>{CASE_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
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
              <tr>{['Disc ID','Employee','Department','Violation Type','Prior Incidents','Proposed Action','Approved Action','Status','Explanation','Letter Issued','Actions'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length===0&&<tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400">No disciplinary records found.</td></tr>}
              {filtered.map(d=>{
                const emp=getEmployee(d.employeeId);
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{d.disciplinaryCaseId}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><div className="font-medium text-gray-900">{emp?.employeeName??d.employeeCode}</div><div className="text-xs text-gray-400">{d.employeeCode}</div></td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{emp?.department??'—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{d.violationType}</span></td>
                    <td className="px-4 py-3 text-center text-gray-700">{d.previousIncidentsCount}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{d.proposedAction}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{d.approvedAction||<span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><DisciplinaryBadge status={d.caseStatus}/></td>
                    <td className="px-4 py-3 whitespace-nowrap">{d.explanationReceived?<span className="text-green-600 text-xs font-medium">Received</span>:<span className="text-amber-600 text-xs">Pending</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{d.letterIssued?<span className="text-teal-600 text-xs font-medium">Yes – {d.letterDate}</span>:<span className="text-gray-400 text-xs">No</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={()=>openEdit(d)} className="text-blue-600 hover:text-blue-800"><Edit2 size={14}/></button>
                        <button onClick={()=>handleDelete(d.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
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
              <h2 className="font-bold text-gray-900">{editTarget?'Edit':'New'} Disciplinary Record</h2>
              <button onClick={()=>setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <LI label="Disciplinary Case ID"><input className={inp} value={form.disciplinaryCaseId} onChange={e=>setForm(f=>({...f,disciplinaryCaseId:e.target.value}))}/></LI>
                <LI label="Employee *">
                  <select className={inp} value={form.employeeId} onChange={e=>handleEmpChange(e.target.value)}>
                    <option value="">Select employee…</option>
                    {store.employees.filter(e=>e.employeeCategory==='Main Employee'||e.enableDisciplinary).map(e=><option key={e.id} value={e.id}>{e.employeeName} ({e.employeeCode})</option>)}
                  </select>
                </LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Violation Type">
                  <select className={inp} value={form.violationType} onChange={e=>setForm(f=>({...f,violationType:e.target.value as ViolationType}))}>
                    {VIOLATION_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </LI>
                <LI label="Previous Incidents Count">
                  <input type="number" min={0} className={inp} value={form.previousIncidentsCount} onChange={e=>setForm(f=>({...f,previousIncidentsCount:parseInt(e.target.value)||0}))}/>
                </LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Proposed Action">
                  <select className={inp} value={form.proposedAction} onChange={e=>setForm(f=>({...f,proposedAction:e.target.value as ProposedAction}))}>
                    {PROPOSED_ACTIONS.map(a=><option key={a} value={a}>{a}</option>)}
                  </select>
                </LI>
                <LI label="Approved Action">
                  <select className={inp} value={form.approvedAction} onChange={e=>setForm(f=>({...f,approvedAction:e.target.value as ProposedAction|''}))}>
                    <option value="">— Pending —</option>
                    {PROPOSED_ACTIONS.map(a=><option key={a} value={a}>{a}</option>)}
                  </select>
                </LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Case Status">
                  <select className={inp} value={form.caseStatus} onChange={e=>setForm(f=>({...f,caseStatus:e.target.value as DisciplinaryCaseStatus}))}>
                    {CASE_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </LI>
                <LI label="Management Approval Date"><input type="date" className={inp} value={form.managementApprovalDate} onChange={e=>setForm(f=>({...f,managementApprovalDate:e.target.value}))}/></LI>
              </div>
              <div className="flex flex-wrap gap-5 py-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={form.explanationReceived} onChange={e=>setForm(f=>({...f,explanationReceived:e.target.checked}))}/>Explanation Received</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={form.letterIssued} onChange={e=>setForm(f=>({...f,letterIssued:e.target.checked}))}/>Letter Issued</label>
              </div>
              {form.letterIssued&&(
                <LI label="Letter Date"><input type="date" className={inp} value={form.letterDate} onChange={e=>setForm(f=>({...f,letterDate:e.target.value}))}/></LI>
              )}
              <LI label="Final Outcome"><input className={inp} placeholder="e.g. Written warning issued, case closed" value={form.finalOutcome} onChange={e=>setForm(f=>({...f,finalOutcome:e.target.value}))}/></LI>
              <LI label="Notes"><textarea rows={3} className={inp+' resize-none'} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></LI>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={()=>setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{editTarget?'Save Changes':'Add Record'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
