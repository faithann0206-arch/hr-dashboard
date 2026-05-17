// ─── Shared / Utility ────────────────────────────────────────────────────────

export type EmployeeCategory = 'Main Employee' | 'Support Staff';
export type EmployeeStatus = 'Active' | 'Inactive' | 'Transferred' | 'Resigned';

export type RelatedModule =
  | 'Attendance'
  | 'Leave'
  | 'Remote Work'
  | 'Official Mission'
  | 'Disciplinary'
  | 'Deduction'
  | 'Monthly Report'
  | 'Other';

// ─── Module 0: Employees ─────────────────────────────────────────────────────

export interface Employee {
  id: string;
  employeeCode: string;
  employeeName: string;
  employeeCategory: EmployeeCategory;
  department: string;
  designation: string;
  group: string; // 'A', 'B', 'Director', 'Support', '-'
  workTiming: string;
  monthlyPermissionBalance: number;
  status: EmployeeStatus;
  enableDisciplinary: boolean;
  notes: string;
}

// ─── Module 1: Attendance ────────────────────────────────────────────────────

export type AttendanceStatus =
  | 'Present'
  | 'Late'
  | 'Early Leave'
  | 'Late and Early Leave'
  | 'Absent'
  | 'Leave'
  | 'Official Mission'
  | 'Missing Punch'
  | 'Permission'
  | 'Holiday/Weekend';

export type JustificationStatus = 'Not Required' | 'Pending' | 'Received' | 'Overdue';
export type FinalStatus = 'Clear' | 'Pending Action' | 'Deduction Applied' | 'Case Opened' | 'Closed';

export interface AttendanceRecord {
  id: string;
  uploadId: string;
  employeeId: string;
  employeeCode: string;
  date: string;
  month: number;
  year: number;
  scheduledIn: string;
  scheduledOut: string;
  actualIn: string;
  actualOut: string;
  status: AttendanceStatus;
  leaveType: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  totalShortTime: number;
  permissionHoursUsed: number;
  justificationRequired: boolean;
  justificationStatus: JustificationStatus;
  linkedLeaveId: string;
  linkedCaseId: string;
  linkedEmailLogId: string;
  linkedPendingDocId: string;
  linkedManagementDecisionId: string;
  notes: string;
  finalStatus: FinalStatus;
}

export interface UploadLog {
  id: string;
  uploadDate: string;
  fileName: string;
  uploadedBy: string;
  rowsImported: number;
  duplicatesSkipped: number;
  errors: number;
  notes: string;
}

// ─── Module 2: Leave & Work Arrangements ────────────────────────────────────

export type LeaveType =
  | 'Annual Leave'
  | 'Sick Leave'
  | 'Maternity Leave'
  | 'Emergency Leave'
  | 'Unpaid Leave'
  | 'Permission Hours'
  | 'Official Mission'
  | 'Remote Work'
  | 'Partial Remote'
  | 'Military Leave'
  | 'Other';

export type LeaveRecordStatus =
  | 'Approved'
  | 'Pending Approval'
  | 'Document Pending'
  | 'Document Received'
  | 'Awaiting Management Decision'
  | 'Closed'
  | 'Cancelled';

export interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  department: string;
  employeeCategory: EmployeeCategory;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  numberOfDays: number;
  numberOfHours: number;
  status: LeaveRecordStatus;
  supportingDocumentRequired: boolean;
  supportingDocumentReceived: boolean;
  relatedPendingDocId: string;
  relatedEmailLogId: string;
  relatedManagementDecisionId: string;
  relatedTaskId: string;
  payrollImpact: boolean;
  attendanceImpact: boolean;
  notes: string;
}

// ─── Module 3: Management Decisions ─────────────────────────────────────────

export type ManagementDecisionStatus =
  | 'Awaiting Management Instruction'
  | 'No Further Instruction Received'
  | 'Approved'
  | 'Rejected'
  | 'Monitor Only'
  | 'Deduction Approved'
  | 'Warning Approved'
  | 'Closed'
  | 'Escalated';

export interface ManagementDecision {
  id: string;
  decisionId: string;
  dateReported: string;
  employeeId: string;
  employeeCode: string;
  department: string;
  relatedModule: RelatedModule;
  relatedRecordId: string;
  issueSummary: string;
  decisionRequired: string;
  emailReportSentReference: string;
  managementInstruction: string;
  decisionDate: string;
  followUpRequired: boolean;
  followUpDueDate: string;
  finalAction: string;
  status: ManagementDecisionStatus;
  relatedEmailLogId: string;
  relatedTaskId: string;
  notes: string;
}

// ─── Module 4: Email Log ─────────────────────────────────────────────────────

export type EmailType =
  | 'Attendance Issue Notification'
  | 'Justification Form Request'
  | 'Reminder for Justification Form'
  | 'Management Report'
  | 'Management Decision Request'
  | 'Deduction Notification'
  | 'Leave Documentation Request'
  | 'Remote Work Documentation Request'
  | 'Official Mission Documentation Request'
  | 'Monthly Attendance Report'
  | 'Disciplinary Follow-up'
  | 'General HR Follow-up'
  | 'Other';

export type EmailLogStatus =
  | 'Sent'
  | 'Awaiting Employee Response'
  | 'Awaiting Management Response'
  | 'Response Received'
  | 'Follow-up Required'
  | 'Closed';

export interface EmailLog {
  id: string;
  emailLogId: string;
  dateSent: string;
  emailType: EmailType;
  relatedEmployeeId: string;
  relatedEmployeeCode: string;
  department: string;
  relatedModule: RelatedModule | '';
  relatedRecordId: string;
  subject: string;
  recipient: string;
  cc: string;
  summary: string;
  actionRequested: string;
  responseRequired: boolean;
  responseReceived: boolean;
  responseDate: string;
  followUpRequired: boolean;
  followUpDueDate: string;
  status: EmailLogStatus;
  fileEmailLinkRef: string;
  notes: string;
}

// ─── Module 5: Pending Documents ─────────────────────────────────────────────

export type PendingDocumentType =
  | 'Leave Approval'
  | 'Sick Leave Certificate'
  | 'Maternity Leave Document'
  | 'Remote Work Approval'
  | 'Official Mission Approval'
  | 'Permission Approval'
  | 'Justification Form'
  | 'Deduction Approval'
  | 'Management Instruction'
  | 'Warning Letter'
  | 'Monthly Report Evidence'
  | 'Other';

export type PendingDocumentStatus =
  | 'Pending'
  | 'Requested'
  | 'Received'
  | 'Not Required'
  | 'Overdue'
  | 'Escalated'
  | 'Closed';

export interface PendingDocument {
  id: string;
  documentRequirementId: string;
  employeeId: string;
  employeeCode: string;
  department: string;
  relatedModule: RelatedModule | '';
  relatedRecordId: string;
  documentType: PendingDocumentType;
  relatedDate: string;
  requiredDocument: string;
  requestedDate: string;
  dueDate: string;
  received: boolean;
  receivedDate: string;
  status: PendingDocumentStatus;
  followUpRequired: boolean;
  relatedEmailLogId: string;
  relatedManagementDecisionId: string;
  notes: string;
}

// ─── Module 6: Daily Tasks ────────────────────────────────────────────────────

export type TaskCategory =
  | 'Attendance Review'
  | 'Late Entry Follow-up'
  | 'Early Leave Follow-up'
  | 'Absence Follow-up'
  | 'Leave Processing'
  | 'Justification Form Follow-up'
  | 'Employee Email'
  | 'Management Report'
  | 'Monthly Attendance Report'
  | 'Document Filing'
  | 'Official Letter Follow-up'
  | 'Management Decision Follow-up'
  | 'Disciplinary Follow-up'
  | 'Data Entry / Upload'
  | 'Policy / Compliance Review'
  | 'Meeting / Coordination'
  | 'Report Preparation'
  | 'Other';

export type TaskPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export type TaskStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Completed'
  | 'Pending'
  | 'Awaiting Employee'
  | 'Awaiting Management'
  | 'Carried Forward';

export interface DailyTask {
  id: string;
  taskId: string;
  date: string;
  month: number;
  year: number;
  taskCategory: TaskCategory;
  taskTitle: string;
  taskDetails: string;
  relatedEmployeeId: string;
  relatedModule: string;
  relatedRecordId: string;
  relatedAttendanceId: string;
  relatedLeaveId: string;
  relatedEmailLogId: string;
  relatedManagementDecisionId: string;
  relatedPendingDocId: string;
  relatedDisciplinaryId: string;
  priority: TaskPriority;
  status: TaskStatus;
  timeSpent: string;
  notes: string;
  addedBy: string;
  createdDate: string;
  lastUpdatedDate: string;
}

// ─── Legacy: Follow-up Cases & Disciplinary ──────────────────────────────────

export type CaseType =
  | 'Late Entry'
  | 'Early Leave'
  | 'Absence'
  | 'Missing Punch'
  | 'Permission Hours Exceeded'
  | 'Justification Pending'
  | 'Deduction Pending'
  | 'Repeated Attendance Issue'
  | 'Disciplinary Follow-up'
  | 'Other';

export type CaseStatus =
  | 'Open'
  | 'Awaiting Employee'
  | 'Awaiting Management'
  | 'Justification Pending'
  | 'Deduction Pending'
  | 'Deduction Applied'
  | 'Escalated'
  | 'Closed'
  | 'No Action Required';

export interface FollowUpCase {
  id: string;
  caseId: string;
  employeeId: string;
  employeeCode: string;
  caseType: CaseType;
  caseOpenedDate: string;
  issueDate: string;
  issueSummary: string;
  relatedAttendanceId: string;
  relatedLeaveId: string;
  relatedTaskId: string;
  relatedEmailLogId: string;
  relatedManagementDecisionId: string;
  justificationRequired: boolean;
  justificationStatus: JustificationStatus;
  emailSentDate: string;
  reminder1Date: string;
  reminder2Date: string;
  reportedToManagement: boolean;
  reportSentDate: string;
  managementDecisionStatus: string;
  actionStatus: CaseStatus;
  finalOutcome: string;
  closureDate: string;
  notes: string;
  linkedDocumentIds: string[];
}

export type ViolationType =
  | 'Repeated Late Entry'
  | 'Repeated Early Leave'
  | 'Repeated Absence'
  | 'Unapproved Absence'
  | 'Missing Justification'
  | 'Other';

export type ProposedAction =
  | 'Verbal Reminder'
  | 'Written Reminder'
  | 'Written Warning'
  | 'Deduction'
  | 'Suspension'
  | 'Final Warning'
  | 'Termination Recommendation'
  | 'No Action';

export type DisciplinaryCaseStatus =
  | 'Draft'
  | 'Awaiting Explanation'
  | 'Awaiting Management'
  | 'Approved'
  | 'Letter Issued'
  | 'Closed'
  | 'Cancelled';

export interface DisciplinaryRecord {
  id: string;
  disciplinaryCaseId: string;
  employeeId: string;
  employeeCode: string;
  relatedCaseIds: string[];
  relatedTaskId: string;
  violationType: ViolationType;
  previousIncidentsCount: number;
  explanationReceived: boolean;
  proposedAction: ProposedAction;
  approvedAction: ProposedAction | '';
  managementApprovalDate: string;
  letterIssued: boolean;
  letterDate: string;
  caseStatus: DisciplinaryCaseStatus;
  finalOutcome: string;
  linkedDocumentIds: string[];
  notes: string;
}

// ─── Settings & Store ─────────────────────────────────────────────────────────

export interface AppSettings {
  organizationName: string;
  // Work schedule
  workStartTime: string;
  workEndTime: string;
  weekdayEndTime: string;
  fridayEndTime: string;
  gracePeriodMinutes: number;
  defaultMonthlyPermissionBalance: number;
  // Late calculation
  lateThresholdTime: string;
  lateBaselineBeforeChange: string;
  lateBaselineAfterChange: string;
  lateBaselineChangeDate: string;
  // Personal time
  ptMonthlyAllowanceMinutes: number;
  ptPermissionRequiredFromDate: string;
  // Leave entitlements
  annualLeaveDays: number;
  maternityLeaveDays: number;
  paternityLeaveDays: number;
  hajjLeaveDays: number;
  compassionateLeaveDays: number;
  // Disciplinary thresholds
  consecutiveAbsenceWarning: number;
  consecutiveAbsenceTermination: number;
  nonConsecutiveAbsenceTermination: number;
  // Misc
  departments: string[];
  categories: EmployeeCategory[];
  supportStaffDisciplinaryEnabled: boolean;
  anthropicApiKey: string;
}

export interface AppStore {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  uploadLogs: UploadLog[];
  leaveRecords: LeaveRecord[];
  managementDecisions: ManagementDecision[];
  emailLogs: EmailLog[];
  pendingDocuments: PendingDocument[];
  followUpCases: FollowUpCase[];
  disciplinaryRecords: DisciplinaryRecord[];
  dailyTasks: DailyTask[];
  settings: AppSettings;
}
