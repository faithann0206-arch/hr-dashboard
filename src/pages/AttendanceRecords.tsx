import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Plus, Download, Search } from 'lucide-react';
import { AttendanceBadge, FinalStatusBadge, JustificationBadge, EmployeeCategoryBadge } from '../components/StatusBadge';
import Modal, { FormField, Input, Select, Textarea, FormActions } from '../components/Modal';
import type { AttendanceRecord, AttendanceStatus, FinalStatus, JustificationStatus } from '../types';

const EMPTY: Omit<AttendanceRecord, 'id'> = {
  uploadId: '', employeeId: '', employeeCode: '', date: '', month: 0, year: 0,
  scheduledIn: '07:30', scheduledOut: '14:30', actualIn: '', actualOut: '',
  status: 'Present', leaveType: '', lateMinutes: 0, earlyLeaveMinutes: 0, totalShortTime: 0,
  permissionHoursUsed: 0, justificationRequired: false, justificationStatus: 'Not Required',
  linkedLeaveId: '', linkedCaseId: '', linkedEmailLogId: '', linkedPendingDocId: '', linkedManagementDecisionId: '', notes: '', finalStatus: 'Clear',
};

export default function AttendanceRecords() {
  const { store, addAttendanceRecord, updateAttendanceRecord } = useStore();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterJust, setFilterJust] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AttendanceRecord | null>(null);
  const [form, setForm] = useState<Omit<AttendanceRecord, 'id'>>(EMPTY);

  const departments = useMemo(() => [...new Set(store.employees.map(e => e.department))].sort(), [store.employees]);

  const filtered = useMemo(() => {
    return store.attendanceRecords.filter(a => {
      const emp = store.employees.find(e => e.employeeCode === a.employeeCode);
      const matchSearch = !search || a.employeeCode.toLowerCase().includes(search.toLowerCase()) || (emp?.employeeName ?? '').toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === 'All' || emp?.employeeCategory === filterCat;
      const matchDept = filterDept === 'All' || emp?.department === filterDept;
      const matchMonth = !filterMonth || a.month === parseInt(filterMonth);
      const matchYear = !filterYear || a.year === parseInt(filterYear);
      const matchStatus = filterStatus === 'All' || a.status === filterStatus;
      const matchJust = filterJust === 'All' || a.justificationStatus === filterJust;
      return matchSearch && matchCat && matchDept && matchMonth && matchYear && matchStatus && matchJust;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [store.attendanceRecords, store.employees, search, filterCat, filterDept, filterMonth, filterYear, filterStatus, filterJust]);

  function openAdd() { setEditTarget(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(r: AttendanceRecord) { setEditTarget(r); setForm({ ...r }); setModalOpen(true); }

  function handleSave() {
    if (!form.employeeCode || !form.date) return;
    const emp = store.employees.find(e => e.employeeCode === form.employeeCode);
    const d = new Date(form.date);
    const updated = { ...form, employeeId: emp?.id ?? '', month: d.getMonth() + 1, year: d.getFullYear() };
    if (editTarget) updateAttendanceRecord(editTarget.id, updated);
    else addAttendanceRecord(updated);
    setModalOpen(false);
  }

  function exportCSV() {
    const headers = ['Code', 'Name', 'Date', 'Actual In', 'Actual Out', 'Status', 'Late Min', 'Early Min', 'Total Short', 'Justification'];
    const rows = filtered.map(a => {
      const emp = store.employees.find(e => e.employeeCode === a.employeeCode);
      return [a.employeeCode, emp?.employeeName ?? '', a.date, a.actualIn, a.actualOut, a.status, a.lateMinutes, a.earlyLeaveMinutes, a.totalShortTime, a.justificationStatus];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'attendance.csv'; a.click();
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const statuses: AttendanceStatus[] = ['Present','Late','Early Leave','Late and Early Leave','Absent','Leave','Official Mission','Missing Punch','Permission','Holiday/Weekend'];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Attendance Records</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"><Download size={15} /> Export</button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={15} /> Add Record</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 p-4 bg-white rounded-xl border border-gray-200">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option>All</option><option>Main Employee</option><option>Support Staff</option>
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option>All</option>{departments.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="">All Months</option>{months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="">All Years</option><option value="2025">2025</option><option value="2024">2024</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option>All</option>{statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterJust} onChange={e => setFilterJust(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option>All</option><option>Pending</option><option>Overdue</option><option>Received</option><option>Not Required</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Employee','Date','Sched. In','Sched. Out','Actual In','Actual Out','Status','Late','Early','Short Time','Leave Type','Just. Status','Final Status','Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const emp = store.employees.find(e => e.employeeCode === a.employeeCode);
                return (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-gray-800 whitespace-nowrap">{emp?.employeeName ?? a.employeeCode}</div>
                      <div className="text-xs text-gray-400">{a.employeeCode}</div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{a.date}</td>
                    <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{a.scheduledIn}</td>
                    <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{a.scheduledOut}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700">{a.actualIn || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700">{a.actualOut || '—'}</td>
                    <td className="px-3 py-2.5"><AttendanceBadge status={a.status} /></td>
                    <td className="px-3 py-2.5 text-gray-600">{a.lateMinutes > 0 ? <span className="text-yellow-700 font-medium">{a.lateMinutes}</span> : '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{a.earlyLeaveMinutes > 0 ? <span className="text-orange-700 font-medium">{a.earlyLeaveMinutes}</span> : '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{a.totalShortTime > 0 ? a.totalShortTime : '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">{a.leaveType || '—'}</td>
                    <td className="px-3 py-2.5"><JustificationBadge status={a.justificationStatus} /></td>
                    <td className="px-3 py-2.5"><FinalStatusBadge status={a.finalStatus} /></td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => openEdit(a)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={14} className="px-4 py-8 text-center text-gray-400">No records found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Attendance Record' : 'Add Attendance Record'} size="xl">
        <div className="grid grid-cols-2 gap-x-4">
          <FormField label="Employee Code" required>
            <Select value={form.employeeCode} onChange={e => setForm(f => ({ ...f, employeeCode: e.target.value }))}>
              <option value="">Select employee...</option>
              {store.employees.map(e => <option key={e.id} value={e.employeeCode}>{e.employeeCode} – {e.employeeName}</option>)}
            </Select>
          </FormField>
          <FormField label="Date" required>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </FormField>
          <FormField label="Scheduled In"><Input type="time" value={form.scheduledIn} onChange={e => setForm(f => ({ ...f, scheduledIn: e.target.value }))} /></FormField>
          <FormField label="Scheduled Out"><Input type="time" value={form.scheduledOut} onChange={e => setForm(f => ({ ...f, scheduledOut: e.target.value }))} /></FormField>
          <FormField label="Actual In"><Input type="time" value={form.actualIn} onChange={e => setForm(f => ({ ...f, actualIn: e.target.value }))} /></FormField>
          <FormField label="Actual Out"><Input type="time" value={form.actualOut} onChange={e => setForm(f => ({ ...f, actualOut: e.target.value }))} /></FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AttendanceStatus }))}>
              {statuses.map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Leave Type">
            <Input value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))} placeholder="If applicable" />
          </FormField>
          <FormField label="Late Minutes">
            <Input type="number" min={0} value={form.lateMinutes} onChange={e => setForm(f => ({ ...f, lateMinutes: parseInt(e.target.value) || 0 }))} />
          </FormField>
          <FormField label="Early Leave Minutes">
            <Input type="number" min={0} value={form.earlyLeaveMinutes} onChange={e => setForm(f => ({ ...f, earlyLeaveMinutes: parseInt(e.target.value) || 0 }))} />
          </FormField>
          <FormField label="Justification Status">
            <Select value={form.justificationStatus} onChange={e => setForm(f => ({ ...f, justificationStatus: e.target.value as JustificationStatus }))}>
              <option>Not Required</option><option>Pending</option><option>Received</option><option>Overdue</option>
            </Select>
          </FormField>
          <FormField label="Final Status">
            <Select value={form.finalStatus} onChange={e => setForm(f => ({ ...f, finalStatus: e.target.value as FinalStatus }))}>
              <option>Clear</option><option>Pending Action</option><option>Deduction Applied</option><option>Case Opened</option><option>Closed</option>
            </Select>
          </FormField>
        </div>
        <FormField label="HR Notes">
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </FormField>
        <FormActions onCancel={() => setModalOpen(false)} onSubmit={handleSave} submitLabel={editTarget ? 'Update' : 'Add Record'} />
      </Modal>
    </div>
  );
}
