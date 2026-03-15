'use client';

// ============================================================================
// app/(dashboard)/superadmin/settings/page.tsx
// Route: /superadmin/settings
// Strategy: Fully functional settings UI with local state.
//           Each section is ready to be wired to a backend config endpoint.
//           Add: GET/PATCH /api/settings/ when backend is ready.
// ============================================================================

import { useState } from 'react';
import {
    Settings, Globe, Mail, Lock, Bell, Save,
    CheckCircle, AlertTriangle, Eye, EyeOff, Info,
    ToggleLeft, ToggleRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

// ============================================================================
// Types
// ============================================================================
type SettingsTab = 'platform' | 'email' | 'security' | 'notifications';

interface PlatformSettings {
    platform_name: string;
    platform_url: string;
    support_email: string;
    max_orgs: string;
    max_users_per_org: string;
    default_plan: string;
    maintenance_mode: boolean;
    allow_registration: boolean;
}

interface EmailSettings {
    smtp_host: string;
    smtp_port: string;
    smtp_user: string;
    smtp_password: string;
    from_name: string;
    from_email: string;
    use_tls: boolean;
}

interface SecuritySettings {
    jwt_expiry_hours: string;
    max_login_attempts: string;
    lockout_duration_minutes: string;
    require_email_verification: boolean;
    allow_password_reset: boolean;
    min_password_length: string;
}

interface NotificationSettings {
    notify_on_new_org: boolean;
    notify_on_org_suspended: boolean;
    notify_on_user_created: boolean;
    notify_on_login_fail: boolean;
    admin_notification_email: string;
}

// ============================================================================
// Default values (replace with GET /api/settings/ when backend is ready)
// ============================================================================
const DEFAULT_PLATFORM: PlatformSettings = {
    platform_name: 'ScholaroScope',
    platform_url: 'https://scholaroscope.com',
    support_email: 'support@scholaroscope.com',
    max_orgs: '500',
    max_users_per_org: '1000',
    default_plan: 'FREE',
    maintenance_mode: false,
    allow_registration: true,
};

const DEFAULT_EMAIL: EmailSettings = {
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    from_name: 'ScholaroScope',
    from_email: 'noreply@scholaroscope.com',
    use_tls: true,
};

const DEFAULT_SECURITY: SecuritySettings = {
    jwt_expiry_hours: '24',
    max_login_attempts: '5',
    lockout_duration_minutes: '15',
    require_email_verification: false,
    allow_password_reset: true,
    min_password_length: '8',
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
    notify_on_new_org: true,
    notify_on_org_suspended: true,
    notify_on_user_created: false,
    notify_on_login_fail: true,
    admin_notification_email: '',
};

// ============================================================================
// Reusable sub-components
// ============================================================================

function TabButton({
    active, onClick, icon: Icon, label,
}: {
    active: boolean; onClick: () => void; icon: any; label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left ${active
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
        >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
        </button>
    );
}

function Toggle({
    value, onChange, label, description,
}: {
    value: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
            </div>
            <button
                onClick={() => onChange(!value)}
                className="flex-shrink-0"
                aria-label={label}
            >
                {value
                    ? <ToggleRight className="h-7 w-7 text-purple-600" />
                    : <ToggleLeft className="h-7 w-7 text-gray-400" />
                }
            </button>
        </div>
    );
}

function SectionNote({ text }: { text: string }) {
    return (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">{text}</p>
        </div>
    );
}

// ============================================================================
// Platform Settings Panel
// ============================================================================
function PlatformPanel({
    data, onChange,
}: {
    data: PlatformSettings;
    onChange: (d: PlatformSettings) => void;
}) {
    const set = (field: keyof PlatformSettings, val: string | boolean) =>
        onChange({ ...data, [field]: val });

    return (
        <div className="space-y-6">
            <SectionNote text="These are global platform settings. Changes affect all organizations." />

            <Card>
                <CardHeader><CardTitle>Platform Identity</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Input
                            label="Platform Name"
                            value={data.platform_name}
                            onChange={e => set('platform_name', e.target.value)}
                        />
                        <Input
                            label="Platform URL"
                            value={data.platform_url}
                            onChange={e => set('platform_url', e.target.value)}
                            placeholder="https://example.com"
                        />
                        <Input
                            label="Support Email"
                            type="email"
                            value={data.support_email}
                            onChange={e => set('support_email', e.target.value)}
                            placeholder="support@example.com"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Limits</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Max Organizations"
                            type="number"
                            value={data.max_orgs}
                            onChange={e => set('max_orgs', e.target.value)}
                        />
                        <Input
                            label="Max Users per Organization"
                            type="number"
                            value={data.max_users_per_org}
                            onChange={e => set('max_users_per_org', e.target.value)}
                        />
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Plan for New Organizations
                        </label>
                        <select
                            value={data.default_plan}
                            onChange={e => set('default_plan', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="FREE">Free</option>
                            <option value="BASIC">Basic</option>
                            <option value="PREMIUM">Premium</option>
                            <option value="ENTERPRISE">Enterprise</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Platform Controls</CardTitle></CardHeader>
                <CardContent>
                    <Toggle
                        value={data.maintenance_mode}
                        onChange={v => set('maintenance_mode', v)}
                        label="Maintenance Mode"
                        description="Blocks all non-superadmin access to the platform"
                    />
                    <Toggle
                        value={data.allow_registration}
                        onChange={v => set('allow_registration', v)}
                        label="Allow New Organization Registration"
                        description="When off, only superadmins can create organizations"
                    />
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================================================
// Email Settings Panel
// ============================================================================
function EmailPanel({
    data, onChange,
}: {
    data: EmailSettings;
    onChange: (d: EmailSettings) => void;
}) {
    const [showPw, setShowPw] = useState(false);
    const set = (field: keyof EmailSettings, val: string | boolean) =>
        onChange({ ...data, [field]: val });

    return (
        <div className="space-y-6">
            <SectionNote text="Configure the SMTP server used to send system emails. Test your connection before saving." />

            <Card>
                <CardHeader><CardTitle>SMTP Server</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <Input
                                    label="SMTP Host"
                                    value={data.smtp_host}
                                    onChange={e => set('smtp_host', e.target.value)}
                                    placeholder="smtp.sendgrid.net"
                                />
                            </div>
                            <Input
                                label="Port"
                                type="number"
                                value={data.smtp_port}
                                onChange={e => set('smtp_port', e.target.value)}
                            />
                        </div>
                        <Input
                            label="SMTP Username"
                            value={data.smtp_user}
                            onChange={e => set('smtp_user', e.target.value)}
                            placeholder="apikey"
                        />
                        <div className="relative">
                            <Input
                                label="SMTP Password"
                                type={showPw ? 'text' : 'password'}
                                value={data.smtp_password}
                                onChange={e => set('smtp_password', e.target.value)}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(v => !v)}
                                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                            >
                                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <Toggle
                            value={data.use_tls}
                            onChange={v => set('use_tls', v)}
                            label="Use TLS / STARTTLS"
                            description="Recommended for secure email transmission"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Sender Identity</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Input
                            label="From Name"
                            value={data.from_name}
                            onChange={e => set('from_name', e.target.value)}
                            placeholder="ScholaroScope"
                        />
                        <Input
                            label="From Email"
                            type="email"
                            value={data.from_email}
                            onChange={e => set('from_email', e.target.value)}
                            placeholder="noreply@example.com"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================================================
// Security Settings Panel
// ============================================================================
function SecurityPanel({
    data, onChange,
}: {
    data: SecuritySettings;
    onChange: (d: SecuritySettings) => void;
}) {
    const set = (field: keyof SecuritySettings, val: string | boolean) =>
        onChange({ ...data, [field]: val });

    return (
        <div className="space-y-6">
            <SectionNote text="Security settings apply platform-wide. Changes to JWT expiry will log out all active sessions." />

            <Card>
                <CardHeader><CardTitle>Authentication</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="JWT Token Expiry (hours)"
                                type="number"
                                value={data.jwt_expiry_hours}
                                onChange={e => set('jwt_expiry_hours', e.target.value)}
                            />
                            <Input
                                label="Min Password Length"
                                type="number"
                                value={data.min_password_length}
                                onChange={e => set('min_password_length', e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Max Login Attempts"
                                type="number"
                                value={data.max_login_attempts}
                                onChange={e => set('max_login_attempts', e.target.value)}
                            />
                            <Input
                                label="Lockout Duration (minutes)"
                                type="number"
                                value={data.lockout_duration_minutes}
                                onChange={e => set('lockout_duration_minutes', e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Access Controls</CardTitle></CardHeader>
                <CardContent>
                    <Toggle
                        value={data.require_email_verification}
                        onChange={v => set('require_email_verification', v)}
                        label="Require Email Verification"
                        description="New users must verify their email before logging in"
                    />
                    <Toggle
                        value={data.allow_password_reset}
                        onChange={v => set('allow_password_reset', v)}
                        label="Allow Password Reset"
                        description="Users can request a password reset via email"
                    />
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================================================
// Notifications Panel
// ============================================================================
function NotificationsPanel({
    data, onChange,
}: {
    data: NotificationSettings;
    onChange: (d: NotificationSettings) => void;
}) {
    const set = (field: keyof NotificationSettings, val: string | boolean) =>
        onChange({ ...data, [field]: val });

    return (
        <div className="space-y-6">
            <SectionNote text="System notifications are sent to the admin email configured below." />

            <Card>
                <CardHeader><CardTitle>Notification Triggers</CardTitle></CardHeader>
                <CardContent>
                    <Toggle
                        value={data.notify_on_new_org}
                        onChange={v => set('notify_on_new_org', v)}
                        label="New Organization Created"
                        description="Alert when a new organization is registered on the platform"
                    />
                    <Toggle
                        value={data.notify_on_org_suspended}
                        onChange={v => set('notify_on_org_suspended', v)}
                        label="Organization Suspended"
                        description="Alert when an organization is suspended"
                    />
                    <Toggle
                        value={data.notify_on_user_created}
                        onChange={v => set('notify_on_user_created', v)}
                        label="New User Created"
                        description="Alert when any new user is created across all organizations"
                    />
                    <Toggle
                        value={data.notify_on_login_fail}
                        onChange={v => set('notify_on_login_fail', v)}
                        label="Login Failure Threshold"
                        description="Alert when a user exceeds max failed login attempts"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Admin Email</CardTitle></CardHeader>
                <CardContent>
                    <Input
                        label="Notifications Recipient"
                        type="email"
                        value={data.admin_notification_email}
                        onChange={e => set('admin_notification_email', e.target.value)}
                        placeholder="admin@yourplatform.com"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        All system alerts are sent to this address.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================================================
// Main Page
// ============================================================================
export default function SuperAdminSettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('platform');
    const [platform, setPlatform] = useState<PlatformSettings>(DEFAULT_PLATFORM);
    const [email, setEmail] = useState<EmailSettings>(DEFAULT_EMAIL);
    const [security, setSecurity] = useState<SecuritySettings>(DEFAULT_SECURITY);
    const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // 🔄 Replace with PATCH /api/settings/ when backend is ready
    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        try {
            await new Promise(r => setTimeout(r, 600)); // simulate API
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setSaveError('Failed to save settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const tabs: { id: SettingsTab; label: string; icon: any }[] = [
        { id: 'platform', label: 'Platform', icon: Globe },
        { id: 'email', label: 'Email Service', icon: Mail },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Configure global platform settings</p>
                </div>
                <div className="flex items-center gap-3">
                    {saved && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                            <CheckCircle className="h-4 w-4" />
                            Settings saved
                        </div>
                    )}
                    {saveError && (
                        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                            <AlertTriangle className="h-4 w-4" />
                            {saveError}
                        </div>
                    )}
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Backend notice */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                    <strong>Local state only:</strong> Settings are not yet persisted to the backend.
                    Add <code className="bg-amber-100 px-1 rounded text-xs">GET/PATCH /api/settings/</code> and
                    replace the <code className="bg-amber-100 px-1 rounded text-xs">handleSave</code> stub to enable persistence.
                </p>
            </div>

            {/* Two-column layout: sidebar tabs + content */}
            <div className="flex gap-6 items-start">
                {/* Tab sidebar */}
                <div className="w-52 flex-shrink-0 space-y-1">
                    {tabs.map(t => (
                        <TabButton
                            key={t.id}
                            active={activeTab === t.id}
                            onClick={() => setActiveTab(t.id)}
                            icon={t.icon}
                            label={t.label}
                        />
                    ))}
                </div>

                {/* Panel content */}
                <div className="flex-1 min-w-0">
                    {activeTab === 'platform' && (
                        <PlatformPanel data={platform} onChange={setPlatform} />
                    )}
                    {activeTab === 'email' && (
                        <EmailPanel data={email} onChange={setEmail} />
                    )}
                    {activeTab === 'security' && (
                        <SecurityPanel data={security} onChange={setSecurity} />
                    )}
                    {activeTab === 'notifications' && (
                        <NotificationsPanel data={notifications} onChange={setNotifications} />
                    )}
                </div>
            </div>
        </div>
    );
}