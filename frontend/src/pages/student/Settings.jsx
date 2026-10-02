import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useStudentShell } from '../../components/StudentShell';
import { Group, Row, ToggleRow } from '../../components/SettingsList';

const APP_VERSION = '1.0';

// Mirrors mobile/app/student/settings.jsx: Appearance, Notifications, Security, Support, Log out.
// The profile and contact details are on Personal Info.
const SettingsBody = () => {
    const navigate = useNavigate();
    const { isDarkMode, changeTheme, reminders, setReminders, dataSaver, setDataSaver, openLogout } = useStudentShell();
    return (
        <main className="mx-auto w-full max-w-xl px-4 pb-10 pt-4">
            <Group label="Appearance">
                <ToggleRow title="Dark mode" subtitle="Easier on the eyes at night" checked={isDarkMode} onChange={(on) => changeTheme(on ? 'dark' : 'light')} />
            </Group>
            <Group label="Notifications">
                <ToggleRow title="Deadline reminders" subtitle="Remind me if I haven't served" checked={reminders} onChange={setReminders} />
            </Group>
            <Group label="Data">
                <ToggleRow title="Data saver" subtitle="Load the map only when tapped and refresh less often" checked={dataSaver} onChange={setDataSaver} />
            </Group>
            <Group label="Security">
                <Row title="Change password" onClick={() => navigate('/student/settings/password')} />
            </Group>
            <Group label="Support">
                <Row title="Help & Support" subtitle="FAQ, penalties, troubleshooting and contact info" onClick={() => navigate('/student/help')} />
                <Row title="About OSAConnect" value={`Version ${APP_VERSION}`} />
            </Group>
            <button
                onClick={openLogout}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--s-border)] bg-[var(--s-card)] p-4 text-[15px] font-semibold text-[var(--s-danger)] hover:bg-[var(--s-bg)]"
            >
                <LogOut size={18} /> Log out
            </button>
        </main>
    );
};

export default SettingsBody;
