import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { Plus, Search, X, Edit2, Trash2, Download } from 'lucide-react';
import { LeaveRecordBadge } from '@/components/StatusBadge';
import type { LeaveRecord, LeaveType, LeaveRecordStatus, EmployeeCategory } from '@/types';

const LEAVE_TYPES: LeaveType[] = [
  'Annual Leave','Sick Leave','Maternity Leave','Emergency Leave','Unpaid Leave',
  'Permission Hours','Official Mission','Remote Work','Partial Remote','Military Leave','Other',
];
const STATUSES: LeaveRecordStatus[] = [
  'Approved','Pending Approval','Document Pending','Document Received','Awaiting Management Decision','Closed','Cancelled',
];

const today = new Date().toISOString().split('T')[0];
const EMPTY: Omit<LeaveRecord,'id'> = {
  employeeId:'', employeeCode:'', department:'', employeeCategory:'Main Employee',
  leaveType:'Annual Leave', fromDate:today, toDate:today,
  numberOfDays:1, numberOfHours:0, status:'Pending Approval',
  supportingDocumentRequired:false, supportingDocumentReceived:false,
  relatedPendingDocId:'', relatedEmailLogId:'', relatedManagementDecisionId:'', relatedTaskId:'',
  payrollImpact:false, attendanceImpact:true, notes:'',
};

export default function LeaveRecords() {
  const { store, addLeaveRecord, updateLeaveRecord, deleteLeaveRecord, getEmployee } = useStore();
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterCat, setFilterCat]   = useState('All');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<LeaveRecord|null>(null);
  const [form, setForm]             = useState<Omit<LeaveRecord,'id'>>(EMPTY);

  const departments = useMemo(() => ['All',...new Set(store.employees.map(e=>e.department))], [store.employees]);

  const filtered = useMemo(() => store.leaveRecords.filter(l => {
    const emp = getEmployee(l.employeeId);
    const q = search.toLowerCase();
    const matchSearch = !search || (emp?.employeeName||'').toLowerCase().includes(q) || l.employeeCode.toLowerCase().includes(q);
    return matchSearch
      && (filterType==='All'||l.leaveType===filterType)
      && (filterStatus==='All'||l.status===filterStatus)
      && (filterDept==='All'||l.department===filterDept)
      && (filterCat==='All'||l.employeeCategory===filterCat);
  }).sort((a,b) => b.fromDate.localeCompare(a.fromDate)), [store.leaveRecords, search, filterType, filterStatus, filterDept, filterCat, getEmployee]);

  const handleEmployeeChange = (id: string) => {
    const emp = getEmployee(id);
    setForm(f => ({...f, employeeId:id, employeeCode:emp?.employeeCode??'', department:emp?.department??'', employeeCategory:emp?.employeeCategory??'Main Employee'}));
  };
  const openAdd = () => { setForm(EMPTY); setEditTarget(null); setModalOpen(true); };
  const openEdit = (l: LeaveRecord) => { setForm({...l}); setEditTarget(l); setModalOpen(true); };
  const handleSave = () => {
    if (!form.employeeId) return;
    if (editTarget) updateLeaveRecord(editTarget.id, form);
    else addLeaveRecord(form);
    setModalOpen(false);
  };
  const handleDelete = (id: string) => { if (confirm('Delete this leave record?')) deleteLeaveRecord(id); };

  function exportCSV() {
    const headers = ['Employee','Code','Dept','Category','Type','From','To','Days','Hours','Status','Doc Required','Doc Received'];
    const rows = filtered.map(l => {
      const emp = getEmployee(l.employeeId);
      return [emp?.employeeName??l.employeeCode, l.employeeCode, l.department, l.employeeCategory, l.leaveType, l.fromDate, l.toDate, l.numberOfDays, l.numberOfHours, l.status, l.supportingDocumentRequired?'Yes':'No', l.supportingDocumentReceived?'Yes':'No'];
    });
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='leave-records.csv'; a.click();
  }

  const LI = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leave & Work Arrangements</h1>
          <p className="text-sm text-gray-500 mt-0.5">{store.leaveRecords.length} total records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 text-sm border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600">
            <Download size={14}/> Export
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={16}/> Add Record
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {(['Approved','Pending Approval','Document Pending','Awaiting Management Decision'] as LeaveRecordStatus[]).map(s => {
          const count = store.leaveRecords.filter(l=>l.status===s).length;
          const borders: Record<string,string> = {
            'Approved':'border-green-500','Pending Approval':'border-yellow-500',
            'Document Pending':'border-orange-500','Awaiting Management Decision':'border-red-500',
          };
          return (
            <div key={s} className={`bg-white rounded-lg border-l-4 ${borders[s]||'border-gray-300'} px-4 py-3 border border-gray-200 cursor-pointer`}
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
          <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" placeholder="Search employee…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2" value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="All">All Types</option>{LEAVE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2" value={filterDept} onChange={e=>setFilterDept(e.target.value)}>
          {departments.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
          <option value="All">All Categories</option><option value="Main Employee">Main Employee</option><option value="Support Staff">Support Staff</option>
        </select>
        <span className="text-sm text-gray-500">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Employee','Department','Category','Leave Type','From','To','Days/Hours','Status','Doc Required','Doc Received','Payroll Impact','Actions'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length===0 && <tr><td colSpan={12} className="px-4 py-10 text-center text-gray-400">No leave records found.</td></tr>}
              {filtered.map(l => {
                const emp = getEmployee(l.employeeId);
                return (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{emp?.employeeName??l.employeeCode}</div>
                      <div className="text-xs text-gray-400">{l.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{l.department}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className={`text-xs px-2 py-0.5 rounded-full ${l.employeeCategory==='Main Employee'?'bg-sky-100 text-sky-700':'bg-purple-100 text-purple-700'}`}>{l.employeeCategory}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{l.leaveType}</span></td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{l.fromDate}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{l.toDate}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{l.numberOfDays>0?`${l.numberOfDays}d`:l.numberOfHours>0?`${l.numberOfHours}h`:'—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><LeaveRecordBadge status={l.status}/></td>
                    <td className="px-4 py-3 whitespace-nowrap">{l.supportingDocumentRequired?<span className="text-amber-600 text-xs font-medium">Yes</span>:<span className="text-gray-400 text-xs">No</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{l.supportingDocumentReceived?<span className="text-green-600 text-xs font-medium">Yes</span>:<span className="text-red-500 text-xs">No</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{l.payrollImpact?<span className="text-red-600 text-xs font-medium">Yes</span>:<span className="text-gray-400 text-xs">No</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={()=>openEdit(l)} className="text-blue-600 hover:text-blue-800"><Edit2 size={14}/></button>
                        <button onClick={()=>handleDelete(l.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
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
              <h2 className="font-bold text-gray-900">{editTarget?'Edit':'New'} Leave / Work Arrangement Record</h2>
              <button onClick={()=>setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <LI label="Employee *">
                  <select className={inp} value={form.employeeId} onChange={e=>handleEmployeeChange(e.target.value)}>
                    <option value="">Select employee…</option>
                    {store.employees.filter(e=>e.status==='Active').map(e=><option key={e.id} value={e.id}>{e.employeeName} ({e.employeeCode})</option>)}
                  </select>
                </LI>
                <LI label="Department"><input className={inp+' bg-gray-50'} readOnly value={form.department}/></LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Leave / Work Type">
                  <select className={inp} value={form.leaveType} onChange={e=>setForm(f=>({...f,leaveType:e.target.value as LeaveType}))}>
                    {LEAVE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </LI>
                <LI label="Status">
                  <select className={inp} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as LeaveRecordStatus}))}>
                    {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="From Date"><input type="date" className={inp} value={form.fromDate} onChange={e=>setForm(f=>({...f,fromDate:e.target.value}))}/></LI>
                <LI label="To Date"><input type="date" className={inp} value={form.toDate} onChange={e=>setForm(f=>({...f,toDate:e.target.value}))}/></LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Number of Days"><input type="number" min={0} step={0.5} className={inp} value={form.numberOfDays} onChange={e=>setForm(f=>({...f,numberOfDays:parseFloat(e.target.value)||0}))}/></LI>
                <LI label="Number of Hours (if hours-based)"><input type="number" min={0} step={0.5} className={inp} value={form.numberOfHours} onChange={e=>setForm(f=>({...f,numberOfHours:parseFloat(e.target.value)||0}))}/></LI>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LI label="Related Pending Doc ID"><input className={inp} placeholder="e.g. DOC-001" value={form.relatedPendingDocId} onChange={e=>setForm(f=>({...f,relatedPendingDocId:e.target.value}))}/></LI>
                <LI label="Related Email Log ID"><input className={inp} placeholder="e.g. EL-001" value={form.relatedEmailLogId} onChange={e=>setForm(f=>({...f,relatedEmailLogId:e.target.value}))}/></LI>
              </div>
              <div className="flex flex-wrap gap-5">
                {([
                  { key:'supportingDocumentRequired', label:'Supporting Document Required' },
                  { key:'supportingDocumentReceived', label:'Supporting Document Received' },
                  { key:'payrollImpact', label:'Payroll Impact' },
                  { key:'attendanceImpact', label:'Attendance Impact' },
                ] as {key: keyof typeof form; label: string}[]).map(cb => (
                  <label key={cb.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="rounded" checked={!!form[cb.key]}
                      onChange={e=>setForm(f=>({...f,[cb.key]:e.target.checked}))}/>
                    {cb.label}
                  </label>
                ))}
              </div>
              <LI label="Notes">
                <textarea rows={2} className={inp+' resize-none'} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
              </LI>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={()=>setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                {editTarget?'Save Changes':'Add Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
