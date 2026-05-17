import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/store";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import DailyAttendanceUpload from "@/pages/DailyAttendanceUpload";
import Employees from "@/pages/Employees";
import EmployeeProfile from "@/pages/EmployeeProfile";
import AttendanceRecords from "@/pages/AttendanceRecords";
import LeaveRecords from "@/pages/LeaveRecords";
import ManagementDecisions from "@/pages/ManagementDecisions";
import EmailLog from "@/pages/EmailLog";
import PendingDocuments from "@/pages/PendingDocuments";
import FollowUpCases from "@/pages/FollowUpCases";
import DisciplinaryRegister from "@/pages/DisciplinaryRegister";
import DailyTaskLog from "@/pages/DailyTaskLog";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import OfficialLetters from "@/pages/OfficialLetters";
import MonthlyTasksReport from "@/pages/MonthlyTasksReport";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/upload" component={DailyAttendanceUpload} />
        <Route path="/employees/:id" component={EmployeeProfile} />
        <Route path="/employees" component={Employees} />
        <Route path="/attendance" component={AttendanceRecords} />
        <Route path="/leave" component={LeaveRecords} />
        <Route path="/decisions" component={ManagementDecisions} />
        <Route path="/email-log" component={EmailLog} />
        <Route path="/pending-documents" component={PendingDocuments} />
        <Route path="/cases" component={FollowUpCases} />
        <Route path="/disciplinary" component={DisciplinaryRegister} />
        <Route path="/tasks" component={DailyTaskLog} />
        <Route path="/reports" component={Reports} />
        <Route path="/official-letters" component={OfficialLetters} />
        <Route path="/monthly-tasks" component={MonthlyTasksReport} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StoreProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </StoreProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
