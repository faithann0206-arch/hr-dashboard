import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { Plus, Search, X, Edit2, Trash2 } from 'lucide-react';
import { ManagementDecisionBadge } from '@/components/StatusBadge';
import type { ManagementDecision, ManagementDecisionStatus, RelatedModule } from '@/types';

const STATUSES: ManagementDecisionStatus[] = [
  'Awaiting Management Instruction','No Further Instruction Received','Approved',
  'Rejected','Monitor Only','Deduction Approved','Warning Approved','Closed','Escalated',
];
const MODULES: RelatedModule[] = ['Attendance','Leave','Remote Work','Official Mission','Disciplinary','Deduction','Monthly Report','Other'];

const EMPTY: Omit<ManagementDecision,'id'> = {
  decisionId:'', dateReported:'', employeeId:'', employeeCode:'', department:'',
  relatedModule:'Attendance', relatedRecordId:'', issueSummary:'', decisionRequired:'',
  emailReportSentReference:'', managementInstruction:'', decisionDate:'',
  followUpRequired:false, followUpDueDate:'', finalAction:'',
  status:'Awaiting Management Instruction', relatedEmailLogId:'', relatedTaskId:'', notes:'',
};

function nextDecisionId(existing: ManagementDecision[]) {
  const nums = existing.map(d => parseInt(d.decisionId.replace(/\D/g,''))||0);
  const n = (Math.max(0,...nums)+1);
  return `MD-${String(n).padStart(3,'0')}`;
}

const days = (d: string) => !d ? 0 : Math.max(0, Math.floor((Date.now()-new Date(d).getTime())/86400000));

export default function ManagementDecisions() {
  const { store, addDecision, updateDecision, deleteDecision, getEmployee } = useStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterModule, setFilterModule] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagementDecision|null>(null);
  const [form, setForm] = useState<Omit<ManagementDecision,'id'>>(EMPTY);

  const departments = useMemo(() => ['All',...new Set(store.employees.map(e=>e.department))], [store.employees]);

  const filtered = useMemo(() => store.managementDecisions.filter(d => {
    const emp = getEmployee(d.employeeId);
    const q = search.toLowerCase();
    const matchSearch = !search || d.decisionId.toLowerCase().includes(q) || d.issueSummary.toLowerCase().includes(q)
      || (emp?.employeeName||'').toLowerCase().includes(q) || d.employeeCode.toLowerCase().includes(q);
    return matchSearch
      && (filterStatus==='All'||d.status===filterStatus)
      && (filterModule==='All'||d.relatedModule===filterModule)
      && (filterDept==='All'||d.department===filterDept);
  }), [store.managementDecisions, search, filterStatus, filterModule, filterDept, getEmployee]);

  const openAdd = () => {
    setForm({...EMPTY, decisionId: nextDecisionId(store.managementDecisions), dateReported: new Date().toISOString().split('T')[0]});
    setEditTarget(null);
    setModalOpen(true);
  };
  const openEdit = (d: ManagementDecision) => {
    setForm({decisionId:d.decisionId,dateReported:d.dateReported,employeeId:d.employeeId,employeeCode:d.employeeCode,
      department:d.department,relatedModule:d.relatedModule,relatedRecordId:d.relatedRecordId,
      issueSummary:d.issueSummary,decisionRequired:d.decisionRequired,emailReportSentReference:d.emailReportSentReference,
      managementInstruction:d.managementInstruction,decisionDate:d.decisionDate,followUpRequired:d.followUpRequired,
      followUpDueDate:d.followUpDueDate,finalAction:d.finalAction,status:d.status,
      relatedEmailLogId:d.relatedEmailLogId,relatedTaskId:d.relatedTaskId,notes:d.notes});
    setEditTarget(d);
    setModalOpen(true);
  };
  const handleEmployeeChange = (id: string) => {
    const emp = getEmployee(id);
    setForm(f => ({...f, employeeId:id, employeeCode:emp?.employeeCode??'', department:emp?.department??''}));
  };
  const handleSave = () => {
    if (!form.employeeId||!form.issueSummary) return;
    if (editTarget) { updateDecision(editTarget.id, form); }
    else { addDecision(form); }
    setModalOpen(false);
  };
  const handleDelete = (id: string) => {
    if (confirm('Delete this management decision?')) deleteDecision(id);
  };

  const pendingCount = store.managementDecisions.filter(d => !['Closed','Approved','Rejected'].includes(d.status)).length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Management Decisions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {store.managementDecisions.length} total · <span className="text-amber-600 font-medium">{pendingCount} pending</span>
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16}/> New Decision
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {(['Awaiting Management Instruction','No Further Instruction Received','Escalated','Closed'] as ManagementDecisionStatus[]).map(s => {
          const count = store.managementDecisions.filter(d=>d.status===s).length;
          const colors: Record<string,string> = {
            'Awaiting Management Instruction':'border-amber-500',
            'No Further Instruction Received':'border-orange-500',
            'Escalated':'border-red-500','Closed':'border-green-500',
          };
          return (
            <div key={s} className={`bg-white rounded-lg border-l-4 ${colors[s]||'border-gray-300'} px-4 py-3 cursor-pointer border border-gray-200`}
              onClick={()=>setFilterStatus(filterStatus===s?'All':s)}>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-white rounded-xl border border-gray-200">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search decisions, employees…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" value={filterModule} onChange={e=>setFilterModule(e.target.value)}>
          <option value="All">All Modules</option>
          {MODULES.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" value={filterDept} onChange={e=>setFilterDept(e.target.value)}>
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
                {['Decision ID','Date Reported','Employee','Department','Module','Issue Summary','Days Pending','Status','Actions'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length===0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No decisions found.</td></tr>
              )}
              {filtered.map(d => {
                const emp = getEmployee(d.employeeId);
                const dp = days(d.dateReported);
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{d.decisionId}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{d.dateReported||'—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{emp?.employeeName??d.employeeCode}</div>
                      <div className="text-xs text-gray-400">{d.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{d.department}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{d.relatedModule}</span></td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="truncate text-gray-700">{d.issueSummary||'—'}</div>
                      {d.decisionRequired && <div className="text-xs text-gray-400 truncate">{d.decisionRequired}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`font-semibold ${dp>7?'text-red-600':dp>3?'text-amber-600':'text-gray-700'}`}>{dp}d</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><ManagementDecisionBadge status={d.status}/></td>
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
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-900">{editTarget?'Edit':'New'} Management Decision</h2>
              <button onClick={()=>setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Decision ID</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={form.decisionId} onChange={e=>setForm(f=>({...f,decisionId:e.target.value}))}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date Reported</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={form.dateReported} onChange={e=>setForm(f=>({...f,dateReported:e.target.value}))}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Employee *</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={form.employeeId} onChange={e=>handleEmployeeChange(e.target.value)}>
                    <option value="">Select employee…</option>
                    {store.employees.filter(e=>e.status==='Active').map(e=><option key={e.id} value={e.id}>{e.employeeName} ({e.employeeCode})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50" readOnly value={form.department}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Related Module</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={form.relatedModule} onChange={e=>setForm(f=>({...f,relatedModule:e.target.value as RelatedModule}))}>
                    {MODULES.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Related Record ID</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. ATT-001, LR-002…" value={form.relatedRecordId} onChange={e=>setForm(f=>({...f,relatedRecordId:e.target.value}))}/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Issue Summary *</label>
                <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="Describe the issue reported to management…" value={form.issueSummary} onChange={e=>setForm(f=>({...f,issueSummary:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Decision Required</label>
                <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="What decision is required from management?" value={form.decisionRequired} onChange={e=>setForm(f=>({...f,decisionRequired:e.target.value}))}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email / Report Reference</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Email log ID or file ref…" value={form.emailReportSentReference} onChange={e=>setForm(f=>({...f,emailReportSentReference:e.target.value}))}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as ManagementDecisionStatus}))}>
                    {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Management Instruction</label>
                <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="Record management instruction if received…" value={form.managementInstruction} onChange={e=>setForm(f=>({...f,managementInstruction:e.target.value}))}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Decision Date</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={form.decisionDate} onChange={e=>setForm(f=>({...f,decisionDate:e.target.value}))}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Final Action</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Deduction applied, Warning issued…" value={form.finalAction} onChange={e=>setForm(f=>({...f,finalAction:e.target.value}))}/>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={form.followUpRequired} onChange={e=>setForm(f=>({...f,followUpRequired:e.target.checked}))}/>
                  Follow-up Required
                </label>
                {form.followUpRequired && (
                  <div className="flex-1">
                    <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={form.followUpDueDate} onChange={e=>setForm(f=>({...f,followUpDueDate:e.target.value}))}/>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={()=>setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                {editTarget?'Save Changes':'Add Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
