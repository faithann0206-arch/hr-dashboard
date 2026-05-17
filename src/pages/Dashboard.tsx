import { Link } from 'wouter';
import { useStore } from '@/store';
import {
  Scale, FileText, Mail, Clock, BarChart2, CheckSquare,
  AlertCircle, ArrowRight, TrendingUp, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, Cell,
} from 'recharts';

type BV = 'red'|'amber'|'orange'|'blue'|'green'|'gray'|'purple'|'teal';
const BC: Record<BV,string> = {
  red:'bg-red-100 text-red-700', amber:'bg-amber-100 text-amber-700',
  orange:'bg-orange-100 text-orange-700', blue:'bg-blue-100 text-blue-700',
  green:'bg-green-100 text-green-700', gray:'bg-gray-100 text-gray-500',
  purple:'bg-purple-100 text-purple-700', teal:'bg-teal-100 text-teal-700',
};
const SBC: Record<string, BV> = {
  'Awaiting Management Instruction':'amber','No Further Instruction Received':'orange',
  'Escalated':'red','Monitor Only':'blue','Approved':'green','Closed':'gray','Rejected':'red',
  'Awaiting Employee Response':'amber','Awaiting Management Response':'orange',
  'Follow-up Required':'red','Response Received':'green','Sent':'blue',
  'Overdue':'red','Requested':'blue','Pending':'amber','Received':'green',
  'Not Started':'gray','In Progress':'blue','Pending Action':'amber','Case Opened':'orange',
  'Carried Forward':'purple','Warning Approved':'teal','Deduction Approved':'purple',
};
function Chip({ label }: { label: string }) {
  const v: BV = SBC[label] ?? 'gray';
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BC[v]}`}>{label}</span>;
}
function Stat({ value, label, border, sub }: { value: number; label: string; border: string; sub?: string }) {
  return (
    <div className={`rounded-lg border-l-4 ${border} bg-white px-4 py-3`}>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs font-medium text-gray-700 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
function Sec({ title, icon: Icon, bg, link, children }: {
  title: string; icon: React.ElementType; bg: string; link: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className={`flex items-center justify-between px-5 py-3 ${bg}`}>
        <div className="flex items-center gap-2 text-white font-semibold text-sm"><Icon size={16}/>{title}</div>
        <Link href={link}>
          <div className="flex items-center gap-1 text-white/80 hover:text-white text-xs cursor-pointer">
            View All <ArrowRight size={12}/>
          </div>
        </Link>
      </div>
      {children}
    </div>
  );
}
function MiniTbl({ cols, rows, empty }: { cols: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <div className="px-5 py-6 text-center text-sm text-gray-400 border-t">{empty}</div>;
  return (
    <div className="border-t overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>{cols.map(c => <th key={c} className="px-4 py-2 text-left text-gray-500 font-medium whitespace-nowrap">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r,i) => (
            <tr key={i} className="hover:bg-gray-50">
              {r.map((c,j) => <td key={j} className="px-4 py-2 text-gray-700 whitespace-nowrap">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Dashboard() {
  const { store, getEmployee } = useStore();
  const now = new Date();
  const tm = now.getMonth() + 1;
  const ty = now.getFullYear();
  const days = (d: string) => !d ? 0 : Math.max(0, Math.floor((now.getTime()-new Date(d).getTime())/86400000));

  // ── Section 1: Management Decisions ──────────────────────────────────────
  const openDec = store.managementDecisions.filter(d => d.status !== 'Closed');
  const awaitInstr = openDec.filter(d => d.status === 'Awaiting Management Instruction');
  const noFurther  = openDec.filter(d => d.status === 'No Further Instruction Received');
  const escalated  = openDec.filter(d => d.status === 'Escalated');
  const over7days  = openDec.filter(d => days(d.dateReported) > 7);
  const topDec = [...openDec].sort((a,b) => days(b.dateReported)-days(a.dateReported)).slice(0,6);

  // ── Section 2: Pending Documents ─────────────────────────────────────────
  const activeDocs = store.pendingDocuments.filter(d => !d.received && !['Closed','Not Required'].includes(d.status));
  const overDocs   = activeDocs.filter(d => d.status === 'Overdue' || (d.dueDate && new Date(d.dueDate)<now));
  const reqDocs    = activeDocs.filter(d => d.status === 'Requested');
  const pendDocs   = activeDocs.filter(d => d.status === 'Pending');
  const topDocs    = [...activeDocs].sort((a,b) => (a.dueDate||'').localeCompare(b.dueDate||'')).slice(0,6);

  // ── Section 3: Email Follow-ups ───────────────────────────────────────────
  const activeEmails = store.emailLogs.filter(e => e.status !== 'Closed');
  const awaitEmp  = activeEmails.filter(e => e.status === 'Awaiting Employee Response');
  const awaitMgmt = activeEmails.filter(e => e.status === 'Awaiting Management Response');
  const fuDue     = activeEmails.filter(e => e.followUpRequired && e.followUpDueDate && new Date(e.followUpDueDate)<=now);
  const fuReq     = activeEmails.filter(e => e.status === 'Follow-up Required');
  const topEmail  = [...activeEmails].sort((a,b) => b.dateSent.localeCompare(a.dateSent)).slice(0,6);

  // ── Section 4: Attendance Issues This Month ───────────────────────────────
  const tmAtt  = store.attendanceRecords.filter(a => a.month===tm && a.year===ty);
  const lates  = tmAtt.filter(a => a.status==='Late'||a.status==='Late and Early Leave');
  const earlyL = tmAtt.filter(a => a.status==='Early Leave'||a.status==='Late and Early Leave');
  const abs    = tmAtt.filter(a => a.status==='Absent');
  const pJust  = store.attendanceRecords.filter(a => a.justificationStatus==='Pending'||a.justificationStatus==='Overdue');
  const topAtt = pJust.slice(0,6);

  // ── Section 5: Monthly Report Prep ───────────────────────────────────────
  const decThisMonth = openDec.filter(d => { const dt=new Date(d.dateReported); return dt.getMonth()+1===tm&&dt.getFullYear()===ty; });
  const missDocs     = store.pendingDocuments.filter(d => !d.received && ['Overdue','Pending','Requested'].includes(d.status));
  const awaitClose   = openDec.filter(d => d.status==='Awaiting Management Instruction');

  // ── Section 6: Daily Tasks ────────────────────────────────────────────────
  const todayStr  = now.toISOString().split('T')[0];
  const pending   = store.dailyTasks.filter(t => t.status!=='Completed');
  const todayT    = store.dailyTasks.filter(t => t.date===todayStr);
  const urgent    = pending.filter(t => t.priority==='Urgent'||t.priority==='High');
  const carried   = pending.filter(t => t.status==='Carried Forward');
  const prOrd: Record<string,number> = {Urgent:0,High:1,Normal:2,Low:3};
  const topTasks  = [...pending].sort((a,b) => (prOrd[a.priority]??3)-(prOrd[b.priority]??3)).slice(0,6);

  const totalAction = awaitInstr.length + overDocs.length + awaitEmp.length + awaitMgmt.length + fuDue.length + fuReq.length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">HR Action Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{MONTH_NAMES[tm-1]} {ty} — Action-focused follow-up view</p>
        </div>
        {totalAction > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="text-amber-500 shrink-0"/>
            <span><strong>{totalAction}</strong> items requiring your action</span>
          </div>
        )}
      </div>

      {/* Section 1: Management Decisions */}
      <Sec title="Pending Management Decisions" icon={Scale} bg="bg-slate-800" link="/decisions">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
          <Stat value={awaitInstr.length}  label="Awaiting Instruction"        border="border-amber-500"/>
          <Stat value={noFurther.length}   label="No Further Instruction"      border="border-orange-500"/>
          <Stat value={escalated.length}   label="Escalated"                   border="border-red-500"/>
          <Stat value={over7days.length}   label="Pending > 7 Days"            border="border-slate-400" sub="requiring follow-up"/>
        </div>
        <MiniTbl
          cols={['Decision ID','Employee','Department','Module','Date Reported','Days Pending','Status']}
          rows={topDec.map(d => {
            const emp = getEmployee(d.employeeId);
            const dp = days(d.dateReported);
            return [
              d.decisionId, emp?.employeeName??d.employeeCode, d.department, d.relatedModule,
              d.dateReported,
              <span className={dp>7?'text-red-600 font-semibold':''}>{dp}d</span>,
              <Chip label={d.status}/>,
            ];
          })}
          empty="No pending management decisions"
        />
      </Sec>

      {/* Section 2: Pending Documents */}
      <Sec title="Pending Documents & Official Letters" icon={FileText} bg="bg-red-700" link="/pending-documents">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
          <Stat value={overDocs.length}   label="Overdue"               border="border-red-500"/>
          <Stat value={reqDocs.length}    label="Requested – Awaiting"  border="border-amber-500"/>
          <Stat value={pendDocs.length}   label="Pending Request"       border="border-yellow-500"/>
          <Stat value={activeDocs.length} label="Total Active Pending"  border="border-slate-400"/>
        </div>
        <MiniTbl
          cols={['Doc ID','Employee','Department','Document Type','Due Date','Status','Follow-up']}
          rows={topDocs.map(d => {
            const emp = getEmployee(d.employeeId);
            return [
              d.documentRequirementId, emp?.employeeName??d.employeeCode, d.department,
              d.documentType, d.dueDate||'—', <Chip label={d.status}/>,
              d.followUpRequired?<span className="text-red-600 font-medium">Yes</span>:<span className="text-gray-400">No</span>,
            ];
          })}
          empty="No pending documents"
        />
      </Sec>

      {/* Section 3: Email Follow-ups */}
      <Sec title="Email Follow-ups" icon={Mail} bg="bg-blue-700" link="/email-log">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
          <Stat value={awaitEmp.length}        label="Awaiting Employee Response"   border="border-amber-500"/>
          <Stat value={awaitMgmt.length}       label="Awaiting Management Response" border="border-orange-500"/>
          <Stat value={fuDue.length+fuReq.length} label="Follow-up Due / Required"  border="border-red-500"/>
          <Stat value={activeEmails.length}    label="Total Active Emails"          border="border-slate-400"/>
        </div>
        <MiniTbl
          cols={['Email ID','Date Sent','Email Type','Employee','Subject','Status']}
          rows={topEmail.map(e => {
            const emp = getEmployee(e.relatedEmployeeId);
            return [
              e.emailLogId, e.dateSent,
              <span className="max-w-[160px] truncate block">{e.emailType}</span>,
              emp?.employeeName??e.relatedEmployeeCode,
              <span className="max-w-[220px] truncate block">{e.subject}</span>,
              <Chip label={e.status}/>,
            ];
          })}
          empty="No active emails requiring follow-up"
        />
      </Sec>

      {/* Section 4: Attendance Issues This Month */}
      <Sec title={`Attendance Issues — ${MONTH_NAMES[tm-1]} ${ty}`} icon={Clock} bg="bg-indigo-700" link="/attendance">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
          <Stat value={lates.length}  label="Late Entries"           border="border-amber-500"/>
          <Stat value={earlyL.length} label="Early Leaves"           border="border-blue-500"/>
          <Stat value={abs.length}    label="Absences"               border="border-red-500"/>
          <Stat value={pJust.length}  label="Pending Justifications" border="border-orange-500" sub="all months"/>
        </div>
        <MiniTbl
          cols={['Employee','Department','Date','Status','Justification Status']}
          rows={topAtt.map(a => {
            const emp = getEmployee(a.employeeId);
            return [
              emp?.employeeName??a.employeeCode, emp?.department??'—', a.date,
              <Chip label={a.status}/>, <Chip label={a.justificationStatus}/>,
            ];
          })}
          empty={`No pending justifications for ${MONTH_NAMES[tm-1]}`}
        />
      </Sec>

      {/* Section 5: Monthly Report Preparation */}
      <Sec title="Monthly Report Preparation" icon={TrendingUp} bg="bg-emerald-700" link="/reports">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
          <Stat value={tmAtt.length}           label="Attendance Records This Month" border="border-emerald-500"/>
          <Stat value={decThisMonth.length}    label="Open Decisions This Month"     border="border-amber-500"/>
          <Stat value={missDocs.length}        label="Missing / Overdue Documents"   border="border-red-500"/>
          <Stat value={awaitClose.length}      label="Cases Awaiting Closure"        border="border-orange-500"/>
        </div>
        <div className="border-t p-4">
          <p className="text-xs text-gray-500 mb-3 font-medium">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/reports"><button className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"><BarChart2 size={13}/> Generate Monthly Report</button></Link>
            <Link href="/pending-documents"><button className="flex items-center gap-1.5 bg-slate-700 text-white text-xs px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"><FileText size={13}/> Pending Documents Report</button></Link>
            <Link href="/email-log"><button className="flex items-center gap-1.5 bg-blue-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"><Mail size={13}/> Email Follow-up Report</button></Link>
          </div>
        </div>
      </Sec>

      {/* Charts: Attendance Trends & Analytics */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className={`flex items-center justify-between px-5 py-3 bg-slate-700`}>
          <div className="flex items-center gap-2 text-white font-semibold text-sm"><Activity size={16}/>Attendance Trends & Analytics</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* Bar: Attendance Status Breakdown */}
          <div className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">Attendance Status Breakdown — April 2025</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={(() => {
                const counts: Record<string,number> = {};
                store.attendanceRecords.forEach(a => { counts[a.status] = (counts[a.status]||0)+1; });
                return Object.entries(counts).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
              })()} margin={{top:0,right:10,left:-20,bottom:30}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="name" tick={{fontSize:10}} angle={-30} textAnchor="end" interval={0}/>
                <YAxis tick={{fontSize:10}} allowDecimals={false}/>
                <Tooltip contentStyle={{fontSize:12}}/>
                <Bar dataKey="value" name="Records" radius={[4,4,0,0]}>
                  {(() => {
                    const colors: Record<string,string> = {
                      Present:'#22c55e',Late:'#f59e0b','Early Leave':'#3b82f6',
                      Absent:'#ef4444','Late and Early Leave':'#f97316',
                      Leave:'#8b5cf6','Official Mission':'#06b6d4',
                    };
                    const counts: Record<string,number> = {};
                    store.attendanceRecords.forEach(a => { counts[a.status] = (counts[a.status]||0)+1; });
                    return Object.keys(counts).sort((a,b)=>counts[b]-counts[a]).map((name,i)=>(
                      <Cell key={name} fill={colors[name]??`hsl(${i*47},65%,55%)`}/>
                    ));
                  })()}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar: Pending Actions by Category */}
          <div className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">Pending Actions by Module</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                { name: 'Mgmt Decisions', value: openDec.length, fill: '#64748b' },
                { name: 'Pending Docs',   value: activeDocs.length, fill: '#dc2626' },
                { name: 'Email Follow-up',value: activeEmails.filter(e=>e.status!=='Sent'&&e.status!=='Response Received').length, fill: '#2563eb' },
                { name: 'Open Cases',     value: store.followUpCases.filter(c=>!['Closed','No Action Required'].includes(c.actionStatus)).length, fill: '#d97706' },
                { name: 'Pending Tasks',  value: pending.length, fill: '#7c3aed' },
              ]} margin={{top:0,right:10,left:-20,bottom:30}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="name" tick={{fontSize:10}} angle={-25} textAnchor="end" interval={0}/>
                <YAxis tick={{fontSize:10}} allowDecimals={false}/>
                <Tooltip contentStyle={{fontSize:12}}/>
                <Bar dataKey="value" name="Count" radius={[4,4,0,0]}>
                  {[
                    { name: 'Mgmt Decisions', fill: '#64748b' },
                    { name: 'Pending Docs',   fill: '#dc2626' },
                    { name: 'Email Follow-up',fill: '#2563eb' },
                    { name: 'Open Cases',     fill: '#d97706' },
                    { name: 'Pending Tasks',  fill: '#7c3aed' },
                  ].map(d=><Cell key={d.name} fill={d.fill}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line: Justification Status Overview */}
        <div className="border-t border-gray-100 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">Task Status Overview — All Tasks</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart layout="vertical" data={(() => {
              const counts: Record<string,number> = {};
              store.dailyTasks.forEach(t => { counts[t.status] = (counts[t.status]||0)+1; });
              return Object.entries(counts).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
            })()} margin={{top:0,right:20,left:20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
              <XAxis type="number" tick={{fontSize:10}} allowDecimals={false}/>
              <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={120}/>
              <Tooltip contentStyle={{fontSize:12}}/>
              <Bar dataKey="value" name="Tasks" radius={[0,4,4,0]}>
                {(() => {
                  const statusColors: Record<string,string> = {
                    Completed:'#22c55e','In Progress':'#3b82f6','Not Started':'#9ca3af',
                    Pending:'#f59e0b','Awaiting Employee':'#f97316','Awaiting Management':'#64748b',
                    'Carried Forward':'#8b5cf6',
                  };
                  const counts: Record<string,number> = {};
                  store.dailyTasks.forEach(t => { counts[t.status] = (counts[t.status]||0)+1; });
                  return Object.keys(counts).sort((a,b)=>counts[b]-counts[a]).map(name=>(
                    <Cell key={name} fill={statusColors[name]??'#6b7280'}/>
                  ));
                })()}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {[
              {label:'Completed',color:'#22c55e'},{label:'In Progress',color:'#3b82f6'},
              {label:'Pending',color:'#f59e0b'},{label:'Not Started',color:'#9ca3af'},
              {label:'Awaiting Employee',color:'#f97316'},{label:'Awaiting Management',color:'#64748b'},
            ].map(l=>(
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor:l.color}}/>
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 6: Daily Tasks */}
      <Sec title="Daily Tasks & Pending Follow-ups" icon={CheckSquare} bg="bg-violet-700" link="/tasks">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
          <Stat value={todayT.length}  label="Today's Tasks"          border="border-violet-500"/>
          <Stat value={urgent.length}  label="Urgent / High Priority" border="border-red-500"/>
          <Stat value={pending.length} label="Total Pending"          border="border-amber-500"/>
          <Stat value={carried.length} label="Carried Forward"        border="border-orange-500"/>
        </div>
        <MiniTbl
          cols={['Task ID','Date','Category','Title','Priority','Status']}
          rows={topTasks.map(t => {
            const pc: Record<string,string> = {Urgent:'text-red-600 font-bold',High:'text-orange-600 font-semibold',Normal:'text-gray-700',Low:'text-gray-400'};
            return [
              t.taskId, t.date, t.taskCategory,
              <span className="max-w-[200px] truncate block">{t.taskTitle}</span>,
              <span className={pc[t.priority]??''}>{t.priority}</span>,
              <Chip label={t.status}/>,
            ];
          })}
          empty="No pending tasks"
        />
      </Sec>
    </div>
  );
}
