import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, BellRing, Gauge, LockKeyhole, CircleHelp, Info, ShieldCheck } from 'lucide-react';
import { useStudentShell } from '../../components/StudentShell';
import { Group, Row, ToggleRow } from '../../components/SettingsList';

// Same version as the Android app (mobile/app.json "version"); change both together
const APP_VERSION = '1.2.0';

// Laid out like a phone settings screen: plain cards of icon rows (no section labels), then a privacy card
// and Log out. The profile and contact details are on Personal Info.
const SettingsBody = () => {
    const navigate = useNavigate();
    const { isDarkMode, changeTheme, reminders, setReminders, dataSaver, setDataSaver, openLogout } = useStudentShell();
    return (
        <main className="mx-auto w-full max-w-xl px-4 pb-10 pt-4">
            <Group>
                <ToggleRow icon={Moon} title="Dark mode" checked={isDarkMode} onChange={(on) => changeTheme(on ? 'dark' : 'light')} />
                <ToggleRow icon={BellRing} title="Deadline reminders" checked={reminders} onChange={setReminders} />
                <ToggleRow icon={Gauge} title="Data saver" checked={dataSaver} onChange={setDataSaver} />
            </Group>
            <Group>
                <Row icon={LockKeyhole} title="Change password" onClick={() => navigate('/student/settings/password')} />
                <Row icon={CircleHelp} title="Help" onClick={() => navigate('/student/help')} />
                <Row icon={Info} title="About OSAConnect" value={`Version ${APP_VERSION}`} />
            </Group>

            <section className="mb-5 rounded-[20px] bg-[var(--s-card)] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-4">
                    <ShieldCheck size={52} strokeWidth={1.4} className="shrink-0 text-[var(--s-accent)]" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-[17px] font-semibold text-[var(--s-text)]">Your data is protected</p>
                        <p className="mt-1 text-[15px] leading-snug text-[var(--s-muted)]">
                            OSAConnect only keeps what OSA needs for your violations and community service. Your location is checked only while your timer runs.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/student/help')}
                    className="mt-4 w-full rounded-full bg-[var(--s-bg)] py-3 text-[15px] font-semibold text-[var(--s-text)] hover:brightness-95"
                >
                    Learn more
                </button>
            </section>

            <button
                onClick={openLogout}
                className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-[var(--s-card)] p-4 text-[17px] font-normal text-[var(--s-danger)] shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:bg-[var(--s-bg)]"
            >
                <LogOut size={20} strokeWidth={1.6} /> Log out
            </button>
        </main>
    );
};

export default SettingsBody;
