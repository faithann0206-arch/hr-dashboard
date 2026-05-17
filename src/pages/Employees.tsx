import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { useLocation } from 'wouter';
import { Plus, Search, Download, Edit2, Eye } from 'lucide-react';
import { EmployeeCategoryBadge, EmployeeStatusBadge } from '../components/StatusBadge';
import Modal, { FormField, Input, Select, Textarea, FormActions } from '../components/Modal';
import type { Employee } from '../types';

const EMPTY: Omit<Employee, 'id'> = {
  employeeCode: '', employeeName: '', employeeCategory: 'Main Employee',
  department: '', designation: '', workTiming: '07:30–14:30',
  monthlyPermissionBalance: 2, status: 'Active', enableDisciplinary: false, notes: '',
};

export default function Employees() {
  const { store, addEmployee, updateEmployee } = useStore();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState<Omit<Employee, 'id'>>(EMPTY);

  const filtered = useMemo(() => {
    return store.employees.filter(e => {
      const matchSearch = !search || e.employeeName.toLowerCase().includes(search.toLowerCase()) || e.employeeCode.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === 'All' || e.employeeCategory === filterCat;
      const matchDept = filterDept === 'All' || e.department === filterDept;
      const matchStatus = filterStatus === 'All' || e.status === filterStatus;
      return matchSearch && matchCat && matchDept && matchStatus;
    });
  }, [store.employees, search, filterCat, filterDept, filterStatus]);

  const departments = useMemo(() => [...new Set(store.employees.map(e => e.department))].sort(), [store.employees]);

  function openAdd() { setEditTarget(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(emp: Employee) { setEditTarget(emp); setForm({ ...emp }); setModalOpen(true); }

  function handleSave() {
    if (!form.employeeCode || !form.employeeName) return;
    if (editTarget) updateEmployee(editTarget.id, form);
    else addEmployee(form);
    setModalOpen(false);
  }

  function exportCSV() {
    const headers = ['Code', 'Name', 'Category', 'Department', 'Designation', 'Work Timing', 'Permission Balance', 'Status'];
    const rows = filtered.map(e => [e.employeeCode, e.employeeName, e.employeeCategory, e.department, e.designation, e.workTiming, e.monthlyPermissionBalance, e.status]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'employees.csv'; a.click();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {store.employees.length} employees</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
            <Download size={15} /> Export
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={15} /> Add Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 p-4 bg-white rounded-xl border border-gray-200">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or code..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option>All</option><option>Main Employee</option><option>Support Staff</option>
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option>All</option>{departments.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option>All</option><option>Active</option><option>Inactive</option><option>Transferred</option><option>Resigned</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Designation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Work Timing</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Permission Bal.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{emp.employeeCode}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{emp.employeeName}</div>
                    {emp.notes && <div className="text-xs text-gray-400 truncate max-w-[150px]">{emp.notes}</div>}
                  </td>
                  <td className="px-4 py-3"><EmployeeCategoryBadge category={emp.employeeCategory} /></td>
                  <td className="px-4 py-3 text-gray-700">{emp.department}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.designation}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{emp.workTiming}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.monthlyPermissionBalance}h</td>
                  <td className="px-4 py-3"><EmployeeStatusBadge status={emp.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/employees/${emp.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View Profile"><Eye size={15} /></button>
                      <button onClick={() => openEdit(emp)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Edit"><Edit2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No employees found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Employee' : 'Add Employee'} size="lg">
        <div className="grid grid-cols-2 gap-x-4">
          <FormField label="Employee Code" required>
            <Input value={form.employeeCode} onChange={e => setForm(f => ({ ...f, employeeCode: e.target.value }))} placeholder="EMP001" />
          </FormField>
          <FormField label="Employee Name" required>
            <Input value={form.employeeName} onChange={e => setForm(f => ({ ...f, employeeName: e.target.value }))} placeholder="Full name" />
          </FormField>
          <FormField label="Category">
            <Select value={form.employeeCategory} onChange={e => setForm(f => ({ ...f, employeeCategory: e.target.value as 'Main Employee' | 'Support Staff' }))}>
              <option>Main Employee</option><option>Support Staff</option>
            </Select>
          </FormField>
          <FormField label="Department">
            <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Department" />
          </FormField>
          <FormField label="Designation">
            <Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="Job title" />
          </FormField>
          <FormField label="Work Timing">
            <Input value={form.workTiming} onChange={e => setForm(f => ({ ...f, workTiming: e.target.value }))} placeholder="07:30–14:30" />
          </FormField>
          <FormField label="Monthly Permission Balance (hours)">
            <Input type="number" value={form.monthlyPermissionBalance} onChange={e => setForm(f => ({ ...f, monthlyPermissionBalance: parseFloat(e.target.value) || 0 }))} min={0} step={0.5} />
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Employee['status'] }))}>
              <option>Active</option><option>Inactive</option><option>Transferred</option><option>Resigned</option>
            </Select>
          </FormField>
        </div>
        <FormField label="Notes">
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." />
        </FormField>
        {form.employeeCategory === 'Support Staff' && (
          <div className="flex items-center gap-2 mb-4">
            <input type="checkbox" id="enableDisc" checked={form.enableDisciplinary} onChange={e => setForm(f => ({ ...f, enableDisciplinary: e.target.checked }))} className="rounded" />
            <label htmlFor="enableDisc" className="text-sm text-gray-700">Enable disciplinary workflow for this support staff member</label>
          </div>
        )}
        <FormActions onCancel={() => setModalOpen(false)} onSubmit={handleSave} submitLabel={editTarget ? 'Update' : 'Add Employee'} />
      </Modal>
    </div>
  );
}
