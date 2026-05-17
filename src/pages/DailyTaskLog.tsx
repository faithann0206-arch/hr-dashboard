import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Plus, Search, CheckCircle } from 'lucide-react';
import { TaskStatusBadge, PriorityBadge } from '../components/StatusBadge';
import Modal, { FormField, Input, Select, Textarea, FormActions } from '../components/Modal';
import type { DailyTask, TaskCategory, TaskPriority, TaskStatus } from '../types';

const TASK_CATEGORIES: TaskCategory[] = ['Attendance Review','Late Entry Follow-up','Early Leave Follow-up','Absence Follow-up','Leave Processing','Justification Form Follow-up','Employee Email','Management Report','Monthly Attendance Report','Document Filing','Official Letter Follow-up','Management Decision Follow-up','Disciplinary Follow-up','Data Entry / Upload','Policy / Compliance Review','Meeting / Coordination','Report Preparation','Other'];
const PRIORITIES: TaskPriority[] = ['Low','Normal','High','Urgent'];
const STATUSES: TaskStatus[] = ['Not Started','In Progress','Completed','Pending','Awaiting Employee','Awaiting Management','Carried Forward'];

const today = new Date().toISOString().split('T')[0];
const todayDate = new Date();

const EMPTY: Omit<DailyTask, 'id'> = {
  taskId: '', date: today, month: todayDate.getMonth() + 1, year: todayDate.getFullYear(),
  taskCategory: 'Attendance Review', taskTitle: '', taskDetails: '',
  relatedEmployeeId: '', relatedModule: '', relatedRecordId: '',
  relatedAttendanceId: '', relatedLeaveId: '', relatedEmailLogId: '',
  relatedManagementDecisionId: '', relatedPendingDocId: '', relatedDisciplinaryId: '',
  priority: 'Normal', status: 'Not Started', timeSpent: '', notes: '',
  addedBy: 'HR Officer', createdDate: today, lastUpdatedDate: today,
};

type ViewTab = 'all' | 'today' | 'pending' | 'completed' | 'awaiting';

export default function DailyTaskLog() {
  const { store, addTask, updateTask, deleteTask } = useStore();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterEmp, setFilterEmp] = useState('All');
  const [filterMonth, setFilterMonth] = useState('');
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DailyTask | null>(null);
  const [form, setForm] = useState<Omit<DailyTask, 'id'>>(EMPTY);

  const nextTaskId = () => {
    const count = store.dailyTasks.length + 1;
    return `TASK-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
  };

  const filtered = useMemo(() => {
    return store.dailyTasks.filter(t => {
      const matchSearch = !search || t.taskTitle.toLowerCase().includes(search.toLowerCase()) || t.taskDetails.toLowerCase().includes(search.toLowerCase()) || t.taskId.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === 'All' || t.taskCategory === filterCat;
      const matchStatus = filterStatus === 'All' || t.status === filterStatus;
      const matchPriority = filterPriority === 'All' || t.priority === filterPriority;
      const matchEmp = filterEmp === 'All' || t.relatedEmployeeId === filterEmp;
      const matchMonth = !filterMonth || t.month === parseInt(filterMonth);
      const matchTab = activeTab === 'all' ? true
        : activeTab === 'today' ? t.date === today
        : activeTab === 'pending' ? ['Pending','Not Started','In Progress'].includes(t.status)
        : activeTab === 'completed' ? t.status === 'Completed'
        : ['Awaiting Employee','Awaiting Management','Carried Forward'].includes(t.status);
      return matchSearch && matchCat && matchStatus && matchPriority && matchEmp && matchMonth && matchTab;
    }).sort((a, b) => {
      const pOrder = ['Urgent','High','Normal','Low'];
      const pDiff = pOrder.indexOf(a.priority) - pOrder.indexOf(b.priority);
      if (pDiff !== 0) return pDiff;
      return b.date.localeCompare(a.date);
    });
  }, [store.dailyTasks, search, filterCat, filterStatus, filterPriority, filterEmp, filterMonth, activeTab]);

  function openAdd() {
    setEditTarget(null);
    setForm({ ...EMPTY, taskId: nextTaskId() });
    setModalOpen(true);
  }

  function openEdit(t: DailyTask) { setEditTarget(t); setForm({ ...t }); setModalOpen(true); }

  function handleSave() {
    if (!form.taskTitle) return;
    const d = new Date(form.date);
    const updated = { ...form, month: d.getMonth() + 1, year: d.getFullYear(), lastUpdatedDate: today };
    if (editTarget) updateTask(editTarget.id, updated);
    else addTask(updated);
    setModalOpen(false);
  }

  function markComplete(id: string) {
    updateTask(id, { status: 'Completed', lastUpdatedDate: today });
  }

  const tabs: { id: ViewTab; label: string }[] = [
    { id: 'all', label: 'All Tasks' },
    { id: 'today', label: "Today's" },
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' },
    { id: 'awaiting', label: 'Awaiting' },
  ];

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Daily Task Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} tasks shown</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={15} /> Add Task
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl border border-gray-200 p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 p-4 bg-white rounded-xl border border-gray-200">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="All">All Employees</option>
          {store.employees.map(e => <option key={e.id} value={e.id}>{e.employeeName}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option>All</option>{TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option>All</option>{STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option>All</option>{PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="">All Months</option>{months.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
        </select>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filtered.map(t => {
          const emp = t.relatedEmployeeId ? store.employees.find(e => e.id === t.relatedEmployeeId) : null;
          const isUrgent = t.priority === 'Urgent';
          const isDone = t.status === 'Completed';
          return (
            <div key={t.id} className={`bg-white rounded-xl border shadow-sm p-4 transition-all ${isUrgent && !isDone ? 'border-red-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => markComplete(t.id)}
                    className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}
                    title="Mark complete"
                  >
                    {isDone && <CheckCircle size={12} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-gray-900 ${isDone ? 'line-through text-gray-400' : ''}`}>{t.taskTitle}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.taskId} · {t.taskCategory} · {t.date}</div>
                    {t.taskDetails && <div className="text-sm text-gray-600 mt-1.5">{t.taskDetails}</div>}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {emp && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{emp.employeeName}</span>}
                      {t.timeSpent && <span className="text-xs text-gray-400">Time: {t.timeSpent}</span>}
                      {t.notes && <span className="text-xs text-gray-400 italic truncate max-w-[200px]">{t.notes}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={t.priority} />
                  <TaskStatusBadge status={t.status} />
                  <button onClick={() => openEdit(t)} className="text-xs text-blue-600 border border-blue-200 px-2.5 py-1 rounded hover:bg-blue-50">Edit</button>
                  <button onClick={() => deleteTask(t.id)} className="text-xs text-red-500 border border-red-200 px-2.5 py-1 rounded hover:bg-red-50">Del</button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">No tasks found</div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Task' : 'Add Task'} size="xl">
        <div className="grid grid-cols-2 gap-x-4">
          <FormField label="Task ID" required><Input value={form.taskId} onChange={e => setForm(f => ({ ...f, taskId: e.target.value }))} /></FormField>
          <FormField label="Date" required><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></FormField>
          <FormField label="Category">
            <Select value={form.taskCategory} onChange={e => setForm(f => ({ ...f, taskCategory: e.target.value as TaskCategory }))}>
              {TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </Select>
          </FormField>
          <FormField label="Priority">
            <Select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Time Spent (optional)"><Input value={form.timeSpent} onChange={e => setForm(f => ({ ...f, timeSpent: e.target.value }))} placeholder="e.g., 30 min, 1.5 hrs" /></FormField>
          <FormField label="Related Employee (optional)">
            <Select value={form.relatedEmployeeId} onChange={e => setForm(f => ({ ...f, relatedEmployeeId: e.target.value }))}>
              <option value="">None (standalone task)</option>
              {store.employees.map(e => <option key={e.id} value={e.id}>{e.employeeName}</option>)}
            </Select>
          </FormField>
          <FormField label="Related Email Log (optional)">
            <Select value={form.relatedEmailLogId} onChange={e => setForm(f => ({ ...f, relatedEmailLogId: e.target.value }))}>
              <option value="">None</option>
              {store.emailLogs.map(e => <option key={e.id} value={e.id}>{e.emailLogId} – {e.subject.slice(0,40)}</option>)}
            </Select>
          </FormField>
          <FormField label="Related Pending Doc (optional)">
            <Select value={form.relatedPendingDocId} onChange={e => setForm(f => ({ ...f, relatedPendingDocId: e.target.value }))}>
              <option value="">None</option>
              {store.pendingDocuments.map(d => <option key={d.id} value={d.id}>{d.documentRequirementId} – {d.documentType}</option>)}
            </Select>
          </FormField>
          <FormField label="Related Management Decision (optional)">
            <Select value={form.relatedManagementDecisionId} onChange={e => setForm(f => ({ ...f, relatedManagementDecisionId: e.target.value }))}>
              <option value="">None</option>
              {store.managementDecisions.map(d => <option key={d.id} value={d.id}>{d.decisionId}</option>)}
            </Select>
          </FormField>
          <FormField label="Added By"><Input value={form.addedBy} onChange={e => setForm(f => ({ ...f, addedBy: e.target.value }))} /></FormField>
        </div>
        <FormField label="Task Title" required>
          <Input value={form.taskTitle} onChange={e => setForm(f => ({ ...f, taskTitle: e.target.value }))} placeholder="Brief task title" />
        </FormField>
        <FormField label="Task Details">
          <Textarea value={form.taskDetails} onChange={e => setForm(f => ({ ...f, taskDetails: e.target.value }))} placeholder="Detailed description..." />
        </FormField>
        <FormField label="Notes">
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </FormField>
        <FormActions onCancel={() => setModalOpen(false)} onSubmit={handleSave} submitLabel={editTarget ? 'Update' : 'Add Task'} />
      </Modal>
    </div>
  );
}
