import { useState } from 'react';
import { Download, Plus, Trash2, CheckSquare, Square } from 'lucide-react';

interface Task {
  id: string;
  number: number;
  title: string;
  description: string;
  beneficiary: string;
  completion: number;
}

interface SelfEval {
  compliance: boolean;
  confidentiality: boolean;
  ethics: boolean;
  teamwork: boolean;
}

const DEFAULT_TASKS: Task[] = [
  { id: '1', number: 1, title: 'Attendance Monitoring and Time Management', description: 'Daily monitoring of attendance records, late arrivals, and early departures across all employees.', beneficiary: 'All Staff', completion: 100 },
  { id: '2', number: 2, title: 'Personal Time and Early Leave Management', description: 'Tracking personal time usage against monthly allowance (4 hours), flagging exceeded balances.', beneficiary: 'All Staff', completion: 100 },
  { id: '3', number: 3, title: 'Employee Communication and Compliance Follow-up', description: 'Sending email notifications and justification form requests to employees with attendance issues.', beneficiary: 'Non-compliant staff', completion: 100 },
  { id: '4', number: 4, title: 'Absenteeism Tracking and HR Coordination', description: 'Recording unannounced absences, coordinating with department heads, logging in HR system.', beneficiary: 'Management / HR', completion: 100 },
  { id: '5', number: 5, title: 'Leave Records Update and Balance Calculation', description: 'Processing approved leave requests, updating leave balances, and verifying supporting documents.', beneficiary: 'All Staff / Payroll', completion: 100 },
  { id: '6', number: 6, title: 'HR System Administration and Archiving (Zoho)', description: 'Maintaining and updating the HR system (Zoho), archiving attendance reports and employee files.', beneficiary: 'HR Department', completion: 100 },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function downloadAsDoc(html: string, filename: string) {
  const fullHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Monthly Tasks Report</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; margin: 2cm; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 14pt; }
  td, th { border: 1px solid #333; padding: 5pt 8pt; vertical-align: top; }
  th { background-color: #1e3a5f; color: white; font-weight: bold; }
  .header-table td { border: 1px solid #333; }
  h2 { color: #1e3a5f; font-size: 13pt; margin-top: 16pt; margin-bottom: 6pt; }
  .section-label { font-weight: bold; background-color: #e8edf5; }
  .checkbox { font-size: 13pt; }
  .note { font-size: 9pt; color: #666; margin-top: 20pt; border-top: 1px solid #ccc; padding-top: 8pt; }
</style>
</head>
<body>${html}</body></html>`;
  const blob = new Blob(['﻿' + fullHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function MonthlyTasksReport() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS.map(t => ({ ...t })));
  const [achievements, setAchievements] = useState('');
  const [challenges, setChallenges] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [selfEval, setSelfEval] = useState<SelfEval>({ compliance: true, confidentiality: true, ethics: true, teamwork: true });

  function addTask() {
    const next = tasks.length + 1;
    setTasks(ts => [...ts, { id: Date.now().toString(), number: next, title: '', description: '', beneficiary: '', completion: 0 }]);
  }

  function removeTask(id: string) {
    setTasks(ts => ts.filter(t => t.id !== id).map((t, i) => ({ ...t, number: i + 1 })));
  }

  function updateTask(id: string, field: keyof Task, value: string | number) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, [field]: value } : t));
  }

  function toggleEval(key: keyof SelfEval) {
    setSelfEval(e => ({ ...e, [key]: !e[key] }));
  }

  function handleDownload() {
    const monthName = MONTHS[month];
    const periodLabel = `${monthName} ${year}`;

    const headerHtml = `
      <h1 style="text-align:center;color:#1e3a5f;font-size:16pt;margin-bottom:4pt;">FARAJ FUND</h1>
      <h2 style="text-align:center;font-size:13pt;margin-top:0;">Monthly Tasks Report — ${periodLabel}</h2>
      <br/>
      <table class="header-table">
        <tr><td style="width:40%"><b>Full Name:</b> Faith Ann Jacob</td><td style="width:40%"><b>Employee ID:</b> 14</td></tr>
        <tr><td><b>Job Title:</b> Administrator / HR Officer</td><td><b>Department:</b> HR</td></tr>
        <tr><td><b>Direct Supervisor:</b> Dr. Faiza</td><td><b>Report Period:</b> ${periodLabel}</td></tr>
      </table>
    `;

    const tasksHtml = `
      <h2>Tasks &amp; Activities</h2>
      <table>
        <tr>
          <th style="width:5%">#</th>
          <th style="width:28%">Task / Activity</th>
          <th style="width:37%">Brief Description</th>
          <th style="width:20%">Beneficiary</th>
          <th style="width:10%">Completion %</th>
        </tr>
        ${tasks.map(t => `
          <tr>
            <td style="text-align:center">${t.number}</td>
            <td>${t.title}</td>
            <td>${t.description}</td>
            <td>${t.beneficiary}</td>
            <td style="text-align:center">${t.completion}%</td>
          </tr>
        `).join('')}
      </table>
    `;

    const additionalHtml = `
      <h2>Achievements and Impact</h2>
      <table><tr><td style="min-height:80pt;">${achievements.replace(/\n/g, '<br/>') || '&nbsp;'}</td></tr></table>
      <h2>Challenges and Difficulties</h2>
      <table><tr><td style="min-height:60pt;">${challenges.replace(/\n/g, '<br/>') || '&nbsp;'}</td></tr></table>
      <h2>Suggestions for Improvement</h2>
      <table><tr><td style="min-height:60pt;">${suggestions.replace(/\n/g, '<br/>') || '&nbsp;'}</td></tr></table>
    `;

    const evalHtml = `
      <h2>Self-Evaluation</h2>
      <table>
        <tr><th>Area</th><th style="width:20%">Compliance</th></tr>
        <tr><td>Adherence to attendance and policy compliance</td><td style="text-align:center">${selfEval.compliance ? '✓' : '✗'}</td></tr>
        <tr><td>Maintaining confidentiality of employee records</td><td style="text-align:center">${selfEval.confidentiality ? '✓' : '✗'}</td></tr>
        <tr><td>Professional ethics and conduct</td><td style="text-align:center">${selfEval.ethics ? '✓' : '✗'}</td></tr>
        <tr><td>Teamwork and interdepartmental coordination</td><td style="text-align:center">${selfEval.teamwork ? '✓' : '✗'}</td></tr>
      </table>
    `;

    const signaturesHtml = `
      <br/><br/>
      <table>
        <tr>
          <td style="width:50%;text-align:center;border:none;padding:0 20pt;">
            <div style="border-top:1px solid #333;padding-top:4pt;margin-top:40pt;">Faith Ann Jacob — HR Officer</div>
          </td>
          <td style="width:50%;text-align:center;border:none;padding:0 20pt;">
            <div style="border-top:1px solid #333;padding-top:4pt;margin-top:40pt;">Dr. Faiza Haddad — Direct Supervisor</div>
          </td>
        </tr>
      </table>
    `;

    const html = headerHtml + tasksHtml + additionalHtml + evalHtml + signaturesHtml;
    downloadAsDoc(html, `Faraj_Fund_Monthly_Tasks_${monthName}_${year}_Faith_Jacob.doc`);
  }

  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Monthly Tasks Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Faith Jacob · HR Officer · Faraj Fund</p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <Download size={14} /> Download as Word
        </button>
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Report Period</div>
        <div className="flex gap-3">
          <select className={inp + ' max-w-[180px]'} value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <input type="number" className={inp + ' max-w-[100px]'} value={year} onChange={e => setYear(Number(e.target.value))} min={2020} max={2030} />
        </div>
      </div>

      {/* Header info (read-only display) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Employee Information</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Full Name</span>
            <span className="font-medium text-gray-800">Faith Ann Jacob</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Employee ID</span>
            <span className="font-medium text-gray-800">14</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Job Title</span>
            <span className="font-medium text-gray-800">Administrator / HR Officer</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Department</span>
            <span className="font-medium text-gray-800">HR</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Direct Supervisor</span>
            <span className="font-medium text-gray-800">Dr. Faiza</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Report Period</span>
            <span className="font-medium text-gray-800">{MONTHS[month]} {year}</span>
          </div>
        </div>
      </div>

      {/* Tasks table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Tasks &amp; Activities</div>
          <button onClick={addTask} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={12} /> Add Task
          </button>
        </div>
        <div className="space-y-3">
          {tasks.map(task => (
            <div key={task.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-blue-700 shrink-0">#{task.number}</span>
                <input
                  className={inp + ' flex-1'}
                  placeholder="Task / Activity title"
                  value={task.title}
                  onChange={e => updateTask(task.id, 'title', e.target.value)}
                />
                <button onClick={() => removeTask(task.id)} className="text-red-400 hover:text-red-600 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <textarea
                    className={inp + ' resize-none'}
                    rows={2}
                    placeholder="Brief description of what was done"
                    value={task.description}
                    onChange={e => updateTask(task.id, 'description', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <input
                    className={inp}
                    placeholder="Beneficiary"
                    value={task.beneficiary}
                    onChange={e => updateTask(task.id, 'beneficiary', e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className={inp}
                      value={task.completion}
                      onChange={e => updateTask(task.id, 'completion', Number(e.target.value))}
                    />
                    <span className="text-sm text-gray-500 shrink-0">%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional sections */}
      <div className="space-y-4 mb-5">
        {[
          { label: 'Achievements and Impact', value: achievements, setter: setAchievements, placeholder: 'Describe key achievements and their impact on the team or organisation...' },
          { label: 'Challenges and Difficulties', value: challenges, setter: setChallenges, placeholder: 'Describe any challenges encountered and how they were handled...' },
          { label: 'Suggestions for Improvement', value: suggestions, setter: setSuggestions, placeholder: 'Suggestions to improve HR processes, communication, or systems...' },
        ].map(({ label, value, setter, placeholder }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">{label}</div>
            <textarea
              className={inp + ' resize-y'}
              rows={4}
              placeholder={placeholder}
              value={value}
              onChange={e => setter(e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Self-evaluation */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Self-Evaluation</div>
        <div className="space-y-3">
          {[
            { key: 'compliance' as keyof SelfEval, label: 'Adherence to attendance and policy compliance' },
            { key: 'confidentiality' as keyof SelfEval, label: 'Maintaining confidentiality of employee records' },
            { key: 'ethics' as keyof SelfEval, label: 'Professional ethics and conduct' },
            { key: 'teamwork' as keyof SelfEval, label: 'Teamwork and interdepartmental coordination' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer py-2 border-b border-gray-50 last:border-0">
              <button onClick={() => toggleEval(key)} className="shrink-0 text-blue-600">
                {selfEval[key] ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-300" />}
              </button>
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Download note */}
      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
        The downloaded Word document will include all sections above in the official Faraj Fund template format, ready for printing and signing.
      </div>
    </div>
  );
}
