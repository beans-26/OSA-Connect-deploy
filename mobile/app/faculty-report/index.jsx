import { ReportForm } from '../staff/dashboard';

// Faculty without an account: the report form, confirming the USTP email with a code before sending
export default function FacultyReportScreen() {
    return <ReportForm publicFaculty />;
}
