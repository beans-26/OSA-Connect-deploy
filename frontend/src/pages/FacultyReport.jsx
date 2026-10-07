import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ReportViolation from './guard/ReportViolation';
import ThemeToggle from '../components/ThemeToggle';
import logo from '../assets/osaconnect-logo.png';
import logoDark from '../assets/osaconnect-logo-dark.png';

// Faculty without an account (/faculty/report, the "Report without an account" option on the /faculty login):
// the faculty member fills in the report and confirms their @ustp.edu.ph email with a code before it's sent;
// OSA checks the name and email against its faculty records in Pending Reviews.
export default function FacultyReport() {
    return (
        <div className="flo-type min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-3">
                    {/* Back to the faculty login (where "Report without an account" was chosen) */}
                    <Link to="/faculty" aria-label="Back to login" className="flex h-10 shrink-0 items-center gap-1 rounded-full pl-1.5 pr-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                        <ChevronLeft size={20} /> <span className="hidden sm:inline">Back</span>
                    </Link>
                    <img src={logo} alt="OSAConnect" className="hidden h-8 w-auto select-none sm:block dark:hidden" draggable="false" />
                    <img src={logoDark} alt="OSAConnect" className="hidden h-8 w-auto select-none dark:sm:block" draggable="false" />
                    <h1 className="flex-1 truncate text-center text-base font-bold text-slate-900 dark:text-white">Report a Violation</h1>
                    <ThemeToggle />
                </div>
            </div>
            <div className="page-enter">
                <p className="mx-auto max-w-4xl px-3 pt-4 text-xs font-medium text-slate-500 dark:text-slate-400 md:px-6">
                    For USTP faculty &amp; staff without an account: confirm your @ustp.edu.ph email before sending.
                    Have an account? <Link to="/faculty" className="font-bold text-ustp-blue hover:underline dark:text-blue-300">Log in</Link>.
                </p>
                <ReportViolation publicFaculty />
            </div>
        </div>
    );
}
