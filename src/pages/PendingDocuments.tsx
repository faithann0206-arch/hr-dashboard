import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { Plus, Search, X, Edit2, Trash2, Download, CheckCircle } from 'lucide-react';
import { PendingDocBadge } from '@/components/StatusBadge';
import type { PendingDocument, PendingDocumentType, PendingDocumentStatus, RelatedModule } from '@/types';

const DOC_TYPES: PendingDocumentType[] = [
  'Leave Approval','Sick Leave Certificate','Maternity Leave Document',
  'Remote Work Approval','Official Mission Approval','Permission Approval',
  'Justification Form','Deduction Approval','Management Instruction',
  'Warning Letter','Monthly Report Evidence','Other',
];
const STATUSES: PendingDocumentStatus[] = ['Pending','Requested','Received','Not Required','Overdue','Escalated','Closed'];
const MODULES: (RelatedModule|'')[] = ['','Attendance','Leave','Remote Work','Official Mission','Disciplinary','Deduction','Monthly Report','Other'];

function nextDocId(existing: PendingDocument[]) {
  const nums = existing.map(d=>parseInt(d.documentRequirementId.replace(/\D/g,''))||0);
  return `DOC-${String(Math.max(0,...nums)+1).padStart(3,'0')}`;
}

const today = new Date().toISOString().split('T')[0];
const EMPTY: Omit<PendingDocument,'id'> = {
  documentRequirementId:'', employeeId:'', employeeCode:'', department:'',
  relatedModule:'', relatedRecordId:'', documentType:'Justification Form',
  relatedDate:today, requiredDocument:'', requestedDate:today, dueDate:'',
  received:false, receivedDate:'', status:'Pending', followUpRequired:false,
  relatedEmailLogId:'', relatedManagementDecisionId:'', notes:'',
};

export default function PendingDocuments() {
  const { store, addPendingDocument, updatePendingDocument, deletePendingDocument, getEmployee } = useStore();
  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDept, setFilterDept]   = useState('All');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState<PendingDocument|null>(null);
  const [form, setForm]               = useState<Omit<PendingDocument,'id'>>(EMPTY);

  const departments = useMemo(()=>['All',...new Set(store.employees.map(e=>e.department))],[store.employees]);

  const filtered = useMemo(()=> store.pendingDocuments.filter(d=>{
    const emp = getEmployee(d.employeeId);
    const q = search.toLowerCase();
    const matchSearch = !search||d.documentRequirementId.toLowerCase().includes(q)||(emp?.employeeName||'').toLowerCase().includes(q)||d.employeeCode.toLowerCase().includes(q)||d.requiredDocument.toLowerCase().includes(q);
    return matchSearch&&(filterType==='All'||d.documentType===filterType)&&(filterStatus==='All'||d.status===filterStatus)&&(filterDept==='All'||d.department===filterDept);
  }).sort((a,b)=>{
    const urgency = (d: PendingDocument) => d.status==='Overdue'?0:d.status==='Requested'?1:d.status==='Pending'?2:3;
    return urgency(a)-urgency(b) || (a.dueDate||'').localeCompare(b.dueDate||'');
  }),[store.pendingDocuments,search,filterType,filterStatus,filterDept,getEmployee]);

  const handleEmpChange = (id: string) => {
    const emp = getEmployee(id);
    setForm(f=>({...f, employeeId:id, employeeCode:emp?.employeeCode??'', department:emp?.department??''}));
  };
  const openAdd = () => { setForm({...EMPTY,documentRequirementId:nextDocId(store.pendingDocuments)}); setEditTarget(null); setModalOpen(true); };
  const openEdit = (d: PendingDocument) => { setForm({...d}); setEditTarget(d); setModalOpen(true); };
  const handleSave = () => {
    if (!form.requiredDocument||!form.employeeId) return;
    if (editTarget) updatePendingDocument(editTarget.id, form);
    else addPendingDocument(form);
    setModalOpen(false);
  };
  const handleDelete = (id: string) => { if(confirm('Delete this document record?')) deletePendingDocument(id); };
  const markReceived = (d: PendingDocument) => {
    updatePendingDocument(d.id, { received:true, receivedDate:today, status:'Received' });
  };

  function exportCSV() {
    const headers = ['Doc ID','Employee','Department','Type','Required Document','Related Date','Requested Date','Due Date','Status','Received'];
    const rows = filtered.map(d=>{
      const emp = getEmployee(d.employeeId);
      return [d.documentRequirementId,emp?.employeeName??d.employeeCode,d.department,d.documentType,d.requiredDocument,d.relatedDate,d.requestedDate,d.dueDate,d.status,d.received?'Yes':'No'];
    });
    const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='pending-documents.csv'; a.click();
  }

  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
  const LI = ({label,children}:{label:string;children:React.ReactNode})=>(
    <div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>{children}</div>
  );

  const overdue   = store.pendingDocuments.filter(d=>d.status==='Overdue').length;
  const requested = store.pendingDocuments.filter(d=>d.status==='Requested').length;
  const pending   = store.pendingDocuments.filter(d=>d.status==='Pending').length;
  const received  = store.pendingDocuments.filter(d=>d.received).length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pending Documents & Official Letters</h1>
          <p className="text-sm text-gray-500 mt-0.5">{store.pendingDocuments.length} total · <span className="text-red-600 font-medium">{overdue} overdue</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 text-sm border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600"><Download size={14}/> Export</button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"><Plus size={16}/> Add Document</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label:'Overdue', value:overdue, border:'border-red-500' },
          { label:'Requested – Awaiting', value:requested, border:'border-amber-500' },
          { label:'Pending Request', value:pending, border:'border-yellow-500' },
          { label:'Received This Dataset', value:received, border:'border-green-500' },
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
          <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" placeholder="Search documents, employees…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2" value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="All">All Types</option>{DOC_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
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
                {['Doc ID','Employee','Department','Document Type','Required Document','Related Date','Due Date','Status','Received','Follow-up','Actions'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length===0&&<tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400">No pending documents found.</td></tr>}
              {filtered.map(d=>{
                const emp = getEmployee(d.employeeId);
                return (
                  <tr key={d.id} className={`hover:bg-gray-50 ${d.status==='Overdue'?'bg-red-50':''}`}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{d.documentRequirementId}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{emp?.employeeName??d.employeeCode}</div>
                      <div className="text-xs text-gray-400">{d.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{d.department}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{d.documentType}</span></td>
                    <td className="px-4 py-3 max-w-xs"><div className="truncate text-gray-700 text-xs">{d.requiredDocument||'—'}</div></td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{d.relatedDate||'—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      <span className={d.dueDate&&new Date(d.dueDate)<new Date()&&!d.received?'text-red-600 font-semibold':'text-gray-600'}>{d.dueDate||'—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><PendingDocBadge status={d.status}/></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {d.received?<span className="text-green-600 text-xs font-medium">✓ {d.receivedDate}</span>:<span className="text-red-500 text-xs font-medium">No</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{d.followUpRequired?<span className="text-amber-600 text-xs font-medium">Yes</span>:<span className="text-gray-400 text-xs">No</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {!d.received&&<button onClick={()=>markReceived(d)} className="text-green-600 hover:text-green-800" title="Mark as received"><CheckCircle size={14}/></button>}
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
              <h2 className="font-bold text-gray-900">{editTarget?'Edit':'New'} Pending Document</h2>
              <button onClick={()=>setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <LI label="Document ID"><input className={inp} value={form.documentRequirementId} onChange={e=>setForm(f=>({...f,documentRequirementId:e.target.value}))}/></LI>
                <LI label="Related Date"><input type="date" className={inp} value={form.relatedDate} onChange={e=>setForm(f=>({...f,relatedDate:e.target.value}))}/></LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Employee *">
                  <select className={inp} value={form.employeeId} onChange={e=>handleEmpChange(e.target.value)}>
                    <option value="">Select employee…</option>
                    {store.employees.filter(e=>e.status==='Active').map(e=><option key={e.id} value={e.id}>{e.employeeName} ({e.employeeCode})</option>)}
                  </select>
                </LI>
                <LI label="Department"><input className={inp+' bg-gray-50'} readOnly value={form.department}/></LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Document Type">
                  <select className={inp} value={form.documentType} onChange={e=>setForm(f=>({...f,documentType:e.target.value as PendingDocumentType}))}>
                    {DOC_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </LI>
                <LI label="Status">
                  <select className={inp} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as PendingDocumentStatus}))}>
                    {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Related Module">
                  <select className={inp} value={form.relatedModule} onChange={e=>setForm(f=>({...f,relatedModule:e.target.value as RelatedModule|''}))}>
                    {MODULES.map(m=><option key={m} value={m}>{m||'— None —'}</option>)}
                  </select>
                </LI>
                <LI label="Related Record ID"><input className={inp} placeholder="e.g. ATT-001, LR-002…" value={form.relatedRecordId} onChange={e=>setForm(f=>({...f,relatedRecordId:e.target.value}))}/></LI>
              </div>
              <LI label="Required Document *"><textarea rows={2} className={inp+' resize-none'} placeholder="Describe the document required…" value={form.requiredDocument} onChange={e=>setForm(f=>({...f,requiredDocument:e.target.value}))}/></LI>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Requested Date"><input type="date" className={inp} value={form.requestedDate} onChange={e=>setForm(f=>({...f,requestedDate:e.target.value}))}/></LI>
                <LI label="Due Date"><input type="date" className={inp} value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/></LI>
              </div>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={form.received} onChange={e=>setForm(f=>({...f,received:e.target.checked}))}/>
                  Document Received
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={form.followUpRequired} onChange={e=>setForm(f=>({...f,followUpRequired:e.target.checked}))}/>
                  Follow-up Required
                </label>
              </div>
              {form.received&&(
                <LI label="Received Date"><input type="date" className={inp} value={form.receivedDate} onChange={e=>setForm(f=>({...f,receivedDate:e.target.value}))}/></LI>
              )}
              <div className="grid grid-cols-2 gap-4">
                <LI label="Related Email Log ID"><input className={inp} placeholder="e.g. EL-001" value={form.relatedEmailLogId} onChange={e=>setForm(f=>({...f,relatedEmailLogId:e.target.value}))}/></LI>
                <LI label="Related Decision ID"><input className={inp} placeholder="e.g. MD-001" value={form.relatedManagementDecisionId} onChange={e=>setForm(f=>({...f,relatedManagementDecisionId:e.target.value}))}/></LI>
              </div>
              <LI label="Notes"><textarea rows={2} className={inp+' resize-none'} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></LI>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={()=>setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                {editTarget?'Save Changes':'Add Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
