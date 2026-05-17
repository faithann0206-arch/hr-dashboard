import { useState } from 'react';
import { useStore } from '@/store';
import { Save, RotateCcw, Plus, Trash2, Download, Upload, CheckCircle, Globe, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import type { AppSettings } from '@/types';

interface PolicySuggestion {
  setting_name: string;
  current_value: string;
  suggested_value: string;
  reason: string;
}

interface AISuggestions {
  summary: string;
  affected_settings: PolicySuggestion[];
}

export default function Settings() {
  const { store, updateSettings, resetToSeedData, exportData, importData } = useStore();
  const [form, setForm] = useState<AppSettings>({ ...store.settings });
  const [newDept, setNewDept] = useState('');
  const [saved, setSaved] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  // AI policy reader
  const [policyUrl, setPolicyUrl] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set());

  function handleSave() {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addDept() {
    const d = newDept.trim();
    if (!d || form.departments.includes(d)) return;
    setForm(f => ({ ...f, departments: [...f.departments, d] }));
    setNewDept('');
  }

  function removeDept(dept: string) {
    setForm(f => ({ ...f, departments: f.departments.filter(d => d !== dept) }));
  }

  function handleExport() {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hr-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const json = ev.target?.result as string;
        const ok = importData(json);
        if (ok) {
          setImportSuccess(true);
          setImportError('');
          setTimeout(() => setImportSuccess(false), 3000);
        } else {
          setImportError('Import failed: invalid data format.');
        }
      } catch {
        setImportError('Import failed: file could not be parsed.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleReset() {
    if (confirm('Reset ALL data to seed/demo data? This cannot be undone.')) {
      resetToSeedData();
      setForm({ ...store.settings });
    }
  }

  // ── AI Policy URL reader ─────────────────────────────────────────────────
  async function handleReadPolicy() {
    if (!policyUrl.trim()) { setAiError('Please enter a URL.'); return; }
    const apiKey = form.anthropicApiKey;
    if (!apiKey) { setAiError('Please enter your Anthropic API key in the field below first.'); return; }

    setAiLoading(true);
    setAiError('');
    setAiSuggestions(null);
    setAppliedSuggestions(new Set());
    setDismissedSuggestions(new Set());

    try {
      // Fetch the URL content via a proxy or directly
      let documentText = '';
      try {
        const res = await fetch(policyUrl);
        documentText = await res.text();
        // Strip HTML tags
        documentText = documentText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000);
      } catch {
        documentText = `[Could not fetch URL content directly due to CORS. URL: ${policyUrl}]`;
      }

      const prompt = `You are an HR policy analyst for a UAE government fund called Faraj Fund.
Read this document and identify any changes to: working hours, late calculation rules, leave entitlements, disciplinary thresholds, or attendance policies.

Current policy settings:
- Standard start time: ${form.workStartTime}
- Late threshold: ${form.lateThresholdTime}
- Weekday end time: ${form.weekdayEndTime}
- Friday end time: ${form.fridayEndTime}
- Late baseline before ${form.lateBaselineChangeDate}: ${form.lateBaselineBeforeChange}
- Late baseline from ${form.lateBaselineChangeDate}: ${form.lateBaselineAfterChange}
- PT monthly allowance: ${form.ptMonthlyAllowanceMinutes} minutes
- Annual leave: ${form.annualLeaveDays} days
- Maternity leave: ${form.maternityLeaveDays} days
- Consecutive absence warning threshold: ${form.consecutiveAbsenceWarning} days
- Consecutive absence termination threshold: ${form.consecutiveAbsenceTermination} days

Return ONLY valid JSON with this exact structure (no markdown):
{ "summary": "brief summary of what changed", "affected_settings": [{"setting_name": "field_name", "current_value": "current", "suggested_value": "new value", "reason": "why this change"}] }

If no relevant changes found, return: { "summary": "No relevant policy changes found in this document.", "affected_settings": [] }

Document content:
${documentText}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-calls': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message ?? `API error ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text ?? '';
      const parsed: AISuggestions = JSON.parse(text);
      setAiSuggestions(parsed);
    } catch (err) {
      setAiError(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setAiLoading(false);
  }

  function applySuggestion(idx: number, suggestion: PolicySuggestion) {
    const fieldMap: Record<string, keyof AppSettings> = {
      workStartTime: 'workStartTime', lateThresholdTime: 'lateThresholdTime',
      weekdayEndTime: 'weekdayEndTime', fridayEndTime: 'fridayEndTime',
      lateBaselineBeforeChange: 'lateBaselineBeforeChange', lateBaselineAfterChange: 'lateBaselineAfterChange',
      lateBaselineChangeDate: 'lateBaselineChangeDate', ptMonthlyAllowanceMinutes: 'ptMonthlyAllowanceMinutes',
      annualLeaveDays: 'annualLeaveDays', maternityLeaveDays: 'maternityLeaveDays',
      paternityLeaveDays: 'paternityLeaveDays', consecutiveAbsenceWarning: 'consecutiveAbsenceWarning',
      consecutiveAbsenceTermination: 'consecutiveAbsenceTermination',
    };
    const field = fieldMap[suggestion.setting_name];
    if (field) {
      const val = suggestion.suggested_value;
      const numericFields = ['ptMonthlyAllowanceMinutes','annualLeaveDays','maternityLeaveDays','paternityLeaveDays','consecutiveAbsenceWarning','consecutiveAbsenceTermination'];
      setForm(f => ({ ...f, [field]: numericFields.includes(field) ? parseInt(val) : val }));
    }
    setAppliedSuggestions(s => new Set([...s, idx]));
  }

  function dismissSuggestion(idx: number) {
    setDismissedSuggestions(s => new Set([...s, idx]));
  }

  const LI = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure work schedule, policy rules, and data management.</p>
        </div>
        <button onClick={handleSave} className={`flex items-center gap-2 px-5 py-2 text-sm rounded-lg font-medium transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {saved ? <><CheckCircle size={14}/> Saved!</> : <><Save size={14}/> Save Settings</>}
        </button>
      </div>

      {/* Organisation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Organisation</h2>
        <LI label="Organisation Name">
          <input className={inp} value={form.organizationName} onChange={e => setForm(f => ({ ...f, organizationName: e.target.value }))} placeholder="e.g. Faraj Fund" />
        </LI>
      </div>

      {/* Work Schedule */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Work Schedule</h2>
        <div className="grid grid-cols-2 gap-4">
          <LI label="Standard Start Time">
            <input type="time" className={inp} value={form.workStartTime} onChange={e => setForm(f => ({ ...f, workStartTime: e.target.value }))} />
          </LI>
          <LI label="Weekday End Time">
            <input type="time" className={inp} value={form.weekdayEndTime ?? '15:30'} onChange={e => setForm(f => ({ ...f, weekdayEndTime: e.target.value }))} />
          </LI>
          <LI label="Friday End Time">
            <input type="time" className={inp} value={form.fridayEndTime ?? '12:00'} onChange={e => setForm(f => ({ ...f, fridayEndTime: e.target.value }))} />
          </LI>
          <LI label="Grace Period (minutes)" hint="Arrivals within this window are not flagged as late.">
            <input type="number" min={0} max={60} className={inp} value={form.gracePeriodMinutes} onChange={e => setForm(f => ({ ...f, gracePeriodMinutes: parseInt(e.target.value) || 0 }))} />
          </LI>
        </div>
      </div>

      {/* Late Calculation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Late Calculation Rules</h2>
        <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800">
          The <strong>late threshold</strong> determines if someone is late. The <strong>baseline</strong> is what late minutes are calculated from. These can be different — e.g., threshold 08:00 but baseline 07:30 means someone arriving at 08:20 is 50 minutes late.
        </div>
        <div className="grid grid-cols-2 gap-4">
          <LI label="Late Threshold" hint="Login after this time = late">
            <input type="time" className={inp} value={form.lateThresholdTime ?? '08:00'} onChange={e => setForm(f => ({ ...f, lateThresholdTime: e.target.value }))} />
          </LI>
          <LI label="Policy Change Date" hint="Date when the late baseline changes">
            <input type="date" className={inp} value={form.lateBaselineChangeDate ?? '2026-05-12'} onChange={e => setForm(f => ({ ...f, lateBaselineChangeDate: e.target.value }))} />
          </LI>
          <LI label={`Baseline BEFORE ${form.lateBaselineChangeDate ?? '2026-05-12'}`} hint="Late minutes calculated from this time">
            <input type="time" className={inp} value={form.lateBaselineBeforeChange ?? '08:00'} onChange={e => setForm(f => ({ ...f, lateBaselineBeforeChange: e.target.value }))} />
          </LI>
          <LI label={`Baseline FROM ${form.lateBaselineChangeDate ?? '2026-05-12'}`} hint="Late minutes calculated from this time">
            <input type="time" className={inp} value={form.lateBaselineAfterChange ?? '07:30'} onChange={e => setForm(f => ({ ...f, lateBaselineAfterChange: e.target.value }))} />
          </LI>
        </div>
      </div>

      {/* Personal Time */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Personal Time (PT)</h2>
        <div className="grid grid-cols-2 gap-4">
          <LI label="Monthly PT Allowance (minutes)" hint="Default: 240 minutes (4 hours)">
            <input type="number" min={0} className={inp} value={form.ptMonthlyAllowanceMinutes ?? 240} onChange={e => setForm(f => ({ ...f, ptMonthlyAllowanceMinutes: parseInt(e.target.value) || 0 }))} />
          </LI>
          <LI label="Permission Required From" hint="Early departure requires prior permission from this date onwards">
            <input type="date" className={inp} value={form.ptPermissionRequiredFromDate ?? '2026-05-12'} onChange={e => setForm(f => ({ ...f, ptPermissionRequiredFromDate: e.target.value }))} />
          </LI>
          <LI label="Default Monthly Permission Balance (hours)">
            <input type="number" min={0} step={0.5} className={inp} value={form.defaultMonthlyPermissionBalance} onChange={e => setForm(f => ({ ...f, defaultMonthlyPermissionBalance: parseFloat(e.target.value) || 0 }))} />
          </LI>
        </div>
      </div>

      {/* Leave Entitlements */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Leave Entitlements (Days)</h2>
        <div className="grid grid-cols-2 gap-4">
          <LI label="Annual Leave"><input type="number" min={0} className={inp} value={form.annualLeaveDays ?? 30} onChange={e => setForm(f => ({ ...f, annualLeaveDays: parseInt(e.target.value) || 0 }))} /></LI>
          <LI label="Maternity Leave"><input type="number" min={0} className={inp} value={form.maternityLeaveDays ?? 60} onChange={e => setForm(f => ({ ...f, maternityLeaveDays: parseInt(e.target.value) || 0 }))} /></LI>
          <LI label="Paternity Leave"><input type="number" min={0} className={inp} value={form.paternityLeaveDays ?? 5} onChange={e => setForm(f => ({ ...f, paternityLeaveDays: parseInt(e.target.value) || 0 }))} /></LI>
          <LI label="Hajj Leave (once)"><input type="number" min={0} className={inp} value={form.hajjLeaveDays ?? 30} onChange={e => setForm(f => ({ ...f, hajjLeaveDays: parseInt(e.target.value) || 0 }))} /></LI>
          <LI label="Compassionate Leave"><input type="number" min={0} className={inp} value={form.compassionateLeaveDays ?? 3} onChange={e => setForm(f => ({ ...f, compassionateLeaveDays: parseInt(e.target.value) || 0 }))} /></LI>
        </div>
        <p className="text-xs text-gray-400">Sick leave is per UAE law. Study leave is per internal policy.</p>
      </div>

      {/* Disciplinary Thresholds */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Disciplinary Thresholds</h2>
        <div className="grid grid-cols-2 gap-4">
          <LI label="Consecutive Absence → Warning (days)"><input type="number" min={1} className={inp} value={form.consecutiveAbsenceWarning ?? 5} onChange={e => setForm(f => ({ ...f, consecutiveAbsenceWarning: parseInt(e.target.value) || 0 }))} /></LI>
          <LI label="Consecutive Absence → Termination (days)"><input type="number" min={1} className={inp} value={form.consecutiveAbsenceTermination ?? 14} onChange={e => setForm(f => ({ ...f, consecutiveAbsenceTermination: parseInt(e.target.value) || 0 }))} /></LI>
          <LI label="Non-Consecutive Absence → Termination (days/year)"><input type="number" min={1} className={inp} value={form.nonConsecutiveAbsenceTermination ?? 30} onChange={e => setForm(f => ({ ...f, nonConsecutiveAbsenceTermination: parseInt(e.target.value) || 0 }))} /></LI>
        </div>
        <label className="flex items-center gap-3 cursor-pointer mt-2">
          <div className="relative">
            <input type="checkbox" className="sr-only peer" checked={form.supportStaffDisciplinaryEnabled} onChange={e => setForm(f => ({ ...f, supportStaffDisciplinaryEnabled: e.target.checked }))} />
            <div className="w-10 h-5 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-colors"></div>
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow"></div>
          </div>
          <span className="text-sm text-gray-700">Enable disciplinary tracking for Support Staff by default</span>
        </label>
      </div>

      {/* AI Policy URL Reader */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-600" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">AI Policy Updates from URL</h2>
        </div>
        <p className="text-xs text-gray-500">Paste a URL to a government circular, UAE labour law update, or ministry directive. Claude will read it and suggest which policy settings to update.</p>

        <LI label="Anthropic API Key" hint="Required to use AI features. Stored locally, never sent to our servers.">
          <input
            type="password"
            className={inp}
            placeholder="sk-ant-..."
            value={form.anthropicApiKey ?? ''}
            onChange={e => setForm(f => ({ ...f, anthropicApiKey: e.target.value }))}
          />
        </LI>

        <div className="flex gap-2">
          <input
            className={inp + ' flex-1'}
            placeholder="https://mohre.gov.ae/... or any policy document URL"
            value={policyUrl}
            onChange={e => setPolicyUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleReadPolicy()}
          />
          <button
            onClick={handleReadPolicy}
            disabled={aiLoading || !policyUrl.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 shrink-0"
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
            {aiLoading ? 'Reading...' : 'Read & Analyse'}
          </button>
        </div>

        {aiError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {aiError}
          </div>
        )}

        {aiSuggestions && (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-purple-800 mb-1">AI Summary</div>
              <p className="text-sm text-purple-700">{aiSuggestions.summary}</p>
            </div>

            {aiSuggestions.affected_settings.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Suggested changes ({aiSuggestions.affected_settings.length}):</div>
                <div className="space-y-2">
                  {aiSuggestions.affected_settings.map((s, i) => {
                    const applied = appliedSuggestions.has(i);
                    const dismissed = dismissedSuggestions.has(i);
                    if (dismissed) return null;
                    return (
                      <div key={i} className={`border rounded-lg p-3 ${applied ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-xs font-mono text-gray-500 mb-0.5">{s.setting_name}</div>
                            <div className="text-sm text-gray-800">
                              <span className="line-through text-gray-400">{s.current_value}</span>
                              {' → '}
                              <span className="font-semibold text-blue-700">{s.suggested_value}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{s.reason}</div>
                          </div>
                          {applied ? (
                            <div className="flex items-center gap-1 text-green-700 text-xs shrink-0">
                              <CheckCircle size={14} /> Applied
                            </div>
                          ) : (
                            <div className="flex gap-1.5 shrink-0">
                              <button onClick={() => applySuggestion(i, s)} className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Apply</button>
                              <button onClick={() => dismissSuggestion(i)} className="px-3 py-1 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">Dismiss</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {appliedSuggestions.size > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    {appliedSuggestions.size} suggestion(s) applied to form. Click "Save Settings" at the top to persist.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Departments */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Departments</h2>
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {form.departments.map(d => (
            <div key={d} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium">
              {d}
              <button onClick={() => removeDept(d)} className="text-slate-400 hover:text-red-500 ml-1 transition-colors"><Trash2 size={12} /></button>
            </div>
          ))}
          {form.departments.length === 0 && <span className="text-sm text-gray-400">No departments configured.</span>}
        </div>
        <div className="flex gap-2">
          <input className={inp + ' flex-1'} placeholder="Add new department…" value={newDept} onChange={e => setNewDept(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDept()} />
          <button onClick={addDept} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shrink-0">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Data Management</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <div className="text-sm font-medium text-gray-800">Export All Data</div>
              <div className="text-xs text-gray-400 mt-0.5">Download a full JSON backup of all records.</div>
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
              <Download size={14} /> Export JSON
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <div className="text-sm font-medium text-gray-800">Import Data</div>
              <div className="text-xs text-gray-400 mt-0.5">Restore from a previously exported JSON backup.</div>
              {importError && <div className="text-xs text-red-600 mt-1">{importError}</div>}
              {importSuccess && <div className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle size={12} /> Data imported successfully.</div>}
            </div>
            <label className="flex items-center gap-2 text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700 cursor-pointer">
              <Upload size={14} /> Import JSON
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-red-700">Reset to Default Data</div>
              <div className="text-xs text-gray-400 mt-0.5">Wipes all records and restores the 20 Faraj Fund employees. Cannot be undone.</div>
            </div>
            <button onClick={handleReset} className="flex items-center gap-2 text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
              <RotateCcw size={14} /> Reset Data
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Dataset Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Employees', value: store.employees.length },
            { label: 'Attendance Records', value: store.attendanceRecords.length },
            { label: 'Leave Records', value: store.leaveRecords.length },
            { label: 'Management Decisions', value: store.managementDecisions.length },
            { label: 'Email Logs', value: store.emailLogs.length },
            { label: 'Pending Documents', value: store.pendingDocuments.length },
            { label: 'Follow-up Cases', value: store.followUpCases.length },
            { label: 'Disciplinary Records', value: store.disciplinaryRecords.length },
            { label: 'Daily Tasks', value: store.dailyTasks.length },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">{s.label}</span>
              <span className="text-sm font-bold text-gray-900">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
