import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { Mail, FileText, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

type LetterStatus = 'Pending' | 'Yet to be discussed' | 'Official letter issued' | 'Not required';

interface LetterItem {
  id: string;
  source: 'disciplinary' | 'management' | 'leave' | 'attendance';
  employee: string;
  employeeCode: string;
  type: string;
  relatedTo: string;
  date: string;
  status: LetterStatus;
}

const STATUS_COLORS: Record<LetterStatus, string> = {
  'Pending': 'bg-red-100 text-red-700 border-red-200',
  'Yet to be discussed': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Official letter issued': 'bg-green-100 text-green-700 border-green-200',
  'Not required': 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_OPTIONS: LetterStatus[] = ['Pending', 'Yet to be discussed', 'Official letter issued', 'Not required'];

export default function OfficialLetters() {
  const { store, updateDisciplinary, updatePendingDocument } = useStore();
  const [filter, setFilter] = useState<'all' | LetterStatus>('all');
  const [localStatuses, setLocalStatuses] = useState<Record<string, LetterStatus>>({});

  // Build aggregated letter items from multiple sources
  const items: LetterItem[] = useMemo(() => {
    const result: LetterItem[] = [];

    // 1. Disciplinary records where letter hasn't been issued
    store.disciplinaryRecords.forEach(dr => {
      const emp = store.employees.find(e => e.id === dr.employeeId);
      const empName = emp?.employeeName ?? dr.employeeCode;
      const key = `disc_${dr.id}`;
      result.push({
        id: key,
        source: 'disciplinary',
        employee: empName,
        employeeCode: dr.employeeCode,
        type: 'Disciplinary Letter',
        relatedTo: `${dr.violationType} — ${dr.proposedAction}`,
        date: dr.managementApprovalDate || '',
        status: localStatuses[key] ?? (dr.letterIssued ? 'Official letter issued' : 'Pending'),
      });
    });

    // 2. Management decisions awaiting formal instruction
    store.managementDecisions
      .filter(md => ['Awaiting Management Instruction', 'No Further Instruction Received', 'Escalated'].includes(md.status))
      .forEach(md => {
        const emp = store.employees.find(e => e.id === md.employeeId);
        const empName = emp?.employeeName ?? md.employeeCode;
        const key = `md_${md.id}`;
        result.push({
          id: key,
          source: 'management',
          employee: empName,
          employeeCode: md.employeeCode,
          type: 'Management Decision Letter',
          relatedTo: md.issueSummary.slice(0, 80) + (md.issueSummary.length > 80 ? '…' : ''),
          date: md.dateReported,
          status: localStatuses[key] ?? 'Pending',
        });
      });

    // 3. Pending documents that are overdue or management instructions
    store.pendingDocuments
      .filter(pd => ['Warning Letter', 'Management Instruction'].includes(pd.documentType) && !['Received', 'Not Required', 'Closed'].includes(pd.status))
      .forEach(pd => {
        const emp = store.employees.find(e => e.id === pd.employeeId);
        const empName = emp?.employeeName ?? pd.employeeCode;
        const key = `pd_${pd.id}`;
        result.push({
          id: key,
          source: 'management',
          employee: empName,
          employeeCode: pd.employeeCode,
          type: pd.documentType,
          relatedTo: pd.requiredDocument.slice(0, 80),
          date: pd.dueDate,
          status: localStatuses[key] ?? (pd.status === 'Overdue' ? 'Pending' : 'Yet to be discussed'),
        });
      });

    // 4. Leave records with pending official letters
    store.leaveRecords
      .filter(lr => ['Awaiting Management Decision', 'Document Pending'].includes(lr.status))
      .forEach(lr => {
        const emp = store.employees.find(e => e.id === lr.employeeId);
        const empName = emp?.employeeName ?? lr.employeeCode;
        const key = `lr_${lr.id}`;
        result.push({
          id: key,
          source: 'leave',
          employee: empName,
          employeeCode: lr.employeeCode,
          type: `${lr.leaveType} — Official Letter`,
          relatedTo: `${lr.fromDate} to ${lr.toDate} (${lr.numberOfDays} day${lr.numberOfDays !== 1 ? 's' : ''})`,
          date: lr.fromDate,
          status: localStatuses[key] ?? 'Yet to be discussed',
        });
      });

    // Sort: Pending first, then by date
    return result.sort((a, b) => {
      const order: Record<LetterStatus, number> = { 'Pending': 0, 'Yet to be discussed': 1, 'Official letter issued': 3, 'Not required': 4 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return b.date.localeCompare(a.date);
    });
  }, [store, localStatuses]);

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  function updateStatus(item: LetterItem, newStatus: LetterStatus) {
    setLocalStatuses(s => ({ ...s, [item.id]: newStatus }));

    // Propagate to underlying record
    if (item.source === 'disciplinary') {
      const id = item.id.replace('disc_', '');
      if (newStatus === 'Official letter issued') {
        updateDisciplinary(id, { letterIssued: true, letterDate: new Date().toISOString().split('T')[0], caseStatus: 'Letter Issued' });
      }
    }
    if (item.source === 'management' && item.id.startsWith('pd_')) {
      const id = item.id.replace('pd_', '');
      if (newStatus === 'Official letter issued') {
        updatePendingDocument(id, { received: true, receivedDate: new Date().toISOString().split('T')[0], status: 'Received' });
      } else if (newStatus === 'Not required') {
        updatePendingDocument(id, { status: 'Not Required' });
      }
    }
  }

  const pendingCount = items.filter(i => i.status === 'Pending').length;
  const discussCount = items.filter(i => i.status === 'Yet to be discussed').length;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Official Letters</h1>
          <p className="text-sm text-gray-500 mt-0.5">All pending official letters across the entire system — one view</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{items.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Items</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="text-2xl font-bold text-red-600">{pendingCount}</div>
          <div className="text-xs text-red-500 mt-0.5">Pending</div>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">{discussCount}</div>
          <div className="text-xs text-yellow-500 mt-0.5">Yet to Discuss</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-2xl font-bold text-green-600">{items.filter(i => i.status === 'Official letter issued').length}</div>
          <div className="text-xs text-green-500 mt-0.5">Issued</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', ...STATUS_OPTIONS] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? `All (${items.length})` : `${s} (${items.filter(i => i.status === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
          <div className="text-gray-600 font-medium">No items in this category</div>
          <div className="text-sm text-gray-400 mt-1">
            {items.length === 0 ? 'No pending official letters found across any module.' : 'All items are in other status categories.'}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Employee', 'Type', 'Related to', 'Date', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 text-sm">{item.employee}</div>
                      <div className="text-xs text-gray-400">#{item.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {item.source === 'disciplinary' && <AlertTriangle size={13} className="text-red-500" />}
                        {item.source === 'management' && <FileText size={13} className="text-blue-500" />}
                        {item.source === 'leave' && <Clock size={13} className="text-purple-500" />}
                        <span className="text-sm text-gray-700">{item.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[220px]">
                      <span className="line-clamp-2">{item.relatedTo}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap font-mono">
                      {item.date || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={e => updateStatus(item, e.target.value as LetterStatus)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 hover:border-blue-400 transition-colors"
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 flex items-center gap-1">
        <RefreshCw size={11} />
        Sources: Disciplinary register, Management decisions, Pending documents, Leave records
      </div>
    </div>
  );
}
