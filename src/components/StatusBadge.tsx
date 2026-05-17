import type {
  AttendanceStatus, CaseStatus, TaskStatus, TaskPriority,
  DisciplinaryCaseStatus, FinalStatus, JustificationStatus,
  ManagementDecisionStatus, EmailLogStatus, PendingDocumentStatus, LeaveRecordStatus,
} from '../types';

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'orange' | 'purple' | 'navy' | 'teal';

const variantClasses: Record<BadgeVariant, string> = {
  green:  'bg-green-100 text-green-800',
  red:    'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue:   'bg-blue-100 text-blue-800',
  gray:   'bg-gray-100 text-gray-700',
  orange: 'bg-orange-100 text-orange-800',
  purple: 'bg-purple-100 text-purple-800',
  navy:   'bg-sky-100 text-sky-800',
  teal:   'bg-teal-100 text-teal-800',
};

function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {label}
    </span>
  );
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, BadgeVariant> = {
    'Present': 'green', 'Late': 'yellow', 'Early Leave': 'orange',
    'Late and Early Leave': 'red', 'Absent': 'red', 'Leave': 'blue',
    'Official Mission': 'navy', 'Missing Punch': 'purple', 'Permission': 'orange', 'Holiday/Weekend': 'gray',
  };
  return <Badge label={status} variant={map[status] ?? 'gray'} />;
}

export function CaseBadge({ status }: { status: CaseStatus }) {
  const map: Record<CaseStatus, BadgeVariant> = {
    'Open': 'blue', 'Awaiting Employee': 'yellow', 'Awaiting Management': 'orange',
    'Justification Pending': 'yellow', 'Deduction Pending': 'red', 'Deduction Applied': 'purple',
    'Escalated': 'red', 'Closed': 'green', 'No Action Required': 'gray',
  };
  return <Badge label={status} variant={map[status] ?? 'gray'} />;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, BadgeVariant> = {
    'Not Started': 'gray', 'In Progress': 'blue', 'Completed': 'green',
    'Pending': 'yellow', 'Awaiting Employee': 'orange', 'Awaiting Management': 'red', 'Carried Forward': 'purple',
  };
  return <Badge label={status} variant={map[status] ?? 'gray'} />;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const map: Record<TaskPriority, BadgeVariant> = {
    'Low': 'gray', 'Normal': 'blue', 'High': 'orange', 'Urgent': 'red',
  };
  return <Badge label={priority} variant={map[priority] ?? 'gray'} />;
}

export function DisciplinaryBadge({ status }: { status: DisciplinaryCaseStatus }) {
  const map: Record<DisciplinaryCaseStatus, BadgeVariant> = {
    'Draft': 'gray', 'Awaiting Explanation': 'yellow', 'Awaiting Management': 'orange',
    'Approved': 'blue', 'Letter Issued': 'purple', 'Closed': 'green', 'Cancelled': 'gray',
  };
  return <Badge label={status} variant={map[status] ?? 'gray'} />;
}

export function FinalStatusBadge({ status }: { status: FinalStatus }) {
  const map: Record<FinalStatus, BadgeVariant> = {
    'Clear': 'green', 'Pending Action': 'yellow', 'Deduction Applied': 'red', 'Case Opened': 'orange', 'Closed': 'gray',
  };
  return <Badge label={status} variant={map[status] ?? 'gray'} />;
}

export function JustificationBadge({ status }: { status: JustificationStatus }) {
  const map: Record<JustificationStatus, BadgeVariant> = {
    'Not Required': 'gray', 'Pending': 'yellow', 'Received': 'green', 'Overdue': 'red',
  };
  return <Badge label={status} variant={map[status] ?? 'gray'} />;
}

export function ManagementDecisionBadge({ status }: { status: ManagementDecisionStatus }) {
  const map: Record<ManagementDecisionStatus, BadgeVariant> = {
    'Awaiting Management Instruction': 'yellow', 'No Further Instruction Received': 'orange',
    'Approved': 'green', 'Rejected': 'red', 'Monitor Only': 'blue',
    'Deduction Approved': 'purple', 'Warning Approved': 'teal', 'Closed': 'gray', 'Escalated': 'red',
  };
  return <Badge label={status} variant={map[status] ?? 'gray'} />;
}

export function EmailLogBadge({ status }: { status: EmailLogStatus }) {
  const map: Record<EmailLogStatus, BadgeVariant> = {
    'Sent': 'blue', 'Awaiting Employee Response': 'yellow', 'Awaiting Management Response': 'orange',
    'Response Received': 'green', 'Follow-up Required': 'red', 'Closed': 'gray',
  };
  return <Badge label={status} variant={map[status] ?? 'gray'} />;
}

export function PendingDocBadge({ status }: { status: PendingDocumentStatus }) {
  const map: Record<PendingDocumentStatus, BadgeVariant> = {
    'Pending': 'yellow', 'Requested': 'blue', 'Received': 'green',
    'Not Required': 'gray', 'Overdue': 'red', 'Escalated': 'orange', 'Closed': 'gray',
  };
  return <Badge label={status} variant={map[status] ?? 'gray'} />;
}

export function LeaveRecordBadge({ status }: { status: LeaveRecordStatus }) {
  const map: Record<LeaveRecordStatus, BadgeVariant> = {
    'Approved': 'green', 'Pending Approval': 'yellow', 'Document Pending': 'orange',
    'Document Received': 'teal', 'Awaiting Management Decision': 'red', 'Closed': 'gray', 'Cancelled': 'gray',
  };
  return <Badge label={status} variant={map[status] ?? 'gray'} />;
}

export function EmployeeCategoryBadge({ category }: { category: string }) {
  return <Badge label={category} variant={category === 'Main Employee' ? 'navy' : 'purple'} />;
}

export function EmployeeStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    'Active': 'green', 'Inactive': 'gray', 'Transferred': 'blue', 'Resigned': 'red',
  };
  return <Badge label={status} variant={map[status] ?? 'gray'} />;
}
