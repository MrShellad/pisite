import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import {
  Coins,
  Cpu,
  Eye,
  EyeOff,
  HeartHandshake,
  Link2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Shield,
  Ticket,
  Trash2,
  UserRoundSearch,
} from 'lucide-react';

type DonorUser = {
  id: string;
  mcUuid: string;
  mcName?: string | null;
  email?: string | null;
  afdianUserId?: string | null;
  totalSponsoredAmount: number;
  firstSponsoredAt?: string | null;
  lastSponsoredAt?: string | null;
  isVisible: boolean;
  createdAt?: string | null;
};

type License = {
  id: string;
  userId: string;
  tier: string;
  isBetaEnabled: boolean;
  status: string;
  updatedAt?: string | null;
};

type Donation = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  donatedAt: string;
};

type Device = {
  id: string;
  userId: string;
  deviceUuid: string;
  deviceName: string;
  lastSeenAt?: string | null;
  createdAt?: string | null;
  isActive: boolean;
};

type Activation = {
  id: string;
  userId: string;
  deviceId: string;
  issuedAt: string;
  expiresAt: string;
  lastRefreshAt?: string | null;
};

type AfdianSponsorSnapshot = {
  userId: string;
  allSumAmount: number;
  firstPayTime?: number | null;
  lastPayTime?: number | null;
  syncedAt?: string | null;
};

type DonorAfdianBinding = {
  afdianUserId?: string | null;
  sponsor?: AfdianSponsorSnapshot | null;
};

type AfdianConfig = {
  creatorUserId?: string | null;
  hasToken: boolean;
  tokenPreview?: string | null;
  updatedAt?: string | null;
};

const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatUnixTime(value?: number | null) {
  if (!value) return '-';
  return new Date(value * 1000).toLocaleString();
}

function formatAmount(value?: number | null) {
  return moneyFormatter.format(value ?? 0);
}

export default function ManageDonorUsers() {
  const [users, setUsers] = useState<DonorUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSavingCreate, setIsSavingCreate] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isSavingLicense, setIsSavingLicense] = useState(false);
  const [isAddingDonation, setIsAddingDonation] = useState(false);
  const [isSavingAfdianConfig, setIsSavingAfdianConfig] = useState(false);
  const [isSavingAfdianBinding, setIsSavingAfdianBinding] = useState(false);
  const [isSyncingAfdian, setIsSyncingAfdian] = useState(false);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);

  const [newUser, setNewUser] = useState({
    mcUuid: '',
    email: '',
    isVisible: true,
  });
  const [editUser, setEditUser] = useState({
    mcUuid: '',
    email: '',
    isVisible: true,
  });

  const [license, setLicense] = useState<License | null>(null);
  const [licenseDraft, setLicenseDraft] = useState({
    tier: 'supporter',
    isBetaEnabled: false,
    status: 'active',
  });

  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationDraft, setDonationDraft] = useState({
    amount: 10,
    currency: 'CNY',
    donatedAt: new Date().toISOString().slice(0, 10),
  });

  const [devices, setDevices] = useState<Device[]>([]);
  const [activations, setActivations] = useState<Activation[]>([]);

  const [afdianConfig, setAfdianConfig] = useState<AfdianConfig | null>(null);
  const [afdianConfigDraft, setAfdianConfigDraft] = useState({
    creatorUserId: '',
    token: '',
  });
  const [afdianBinding, setAfdianBinding] = useState<DonorAfdianBinding | null>(null);
  const [afdianBindingDraft, setAfdianBindingDraft] = useState({
    afdianUserId: '',
  });

  const autoSyncedUsers = useRef(new Set<string>());

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const filteredUsers = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) =>
      [user.mcUuid, user.mcName, user.email, user.afdianUserId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [searchQuery, users]);

  const cardClass =
    'rounded-2xl border border-neutral-200/60 bg-white/80 p-6 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none';
  const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-neutral-100/50 px-4 py-3 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-blue-500/50 focus:bg-blue-50/50 focus:outline-none dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-neutral-600 dark:focus:bg-blue-500/5';
  const labelClass = 'mb-1.5 ml-1 block text-xs font-bold text-neutral-500 dark:text-neutral-400';
  const buttonClass =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50';

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await api.get<DonorUser[]>('/admin/donor-users');
      setUsers(res.data);
      if (!selectedUserId && res.data.length > 0) {
        setSelectedUserId(res.data[0].id);
      }
      if (selectedUserId && !res.data.some((user) => user.id === selectedUserId)) {
        setSelectedUserId(res.data[0]?.id ?? null);
      }
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchAfdianConfig = async () => {
    const res = await api.get<AfdianConfig>('/admin/donation-settings/afdian');
    setAfdianConfig(res.data);
    setAfdianConfigDraft({
      creatorUserId: res.data.creatorUserId ?? '',
      token: '',
    });
  };

  const fetchUserDetails = async (userId: string) => {
    const [licenseRes, donationsRes, devicesRes, activationsRes, afdianRes] = await Promise.all([
      api.get<License | null>(`/admin/donor-users/${userId}/license`),
      api.get<Donation[]>(`/admin/donor-users/${userId}/donations`),
      api.get<Device[]>(`/admin/donor-users/${userId}/devices`),
      api.get<Activation[]>(`/admin/donor-users/${userId}/activations`),
      api.get<DonorAfdianBinding>(`/admin/donor-users/${userId}/afdian`),
    ]);

    setLicense(licenseRes.data);
    setLicenseDraft(
      licenseRes.data
        ? {
            tier: licenseRes.data.tier,
            isBetaEnabled: licenseRes.data.isBetaEnabled,
            status: licenseRes.data.status,
          }
        : {
            tier: 'supporter',
            isBetaEnabled: false,
            status: 'active',
          },
    );
    setDonations(donationsRes.data);
    setDevices(devicesRes.data);
    setActivations(activationsRes.data);
    setAfdianBinding(afdianRes.data);
    setAfdianBindingDraft({
      afdianUserId: afdianRes.data.afdianUserId ?? '',
    });
  };

  useEffect(() => {
    void Promise.all([fetchUsers(), fetchAfdianConfig()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    void fetchUserDetails(selectedUserId);
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedUser) return;
    setEditUser({
      mcUuid: selectedUser.mcUuid,
      email: selectedUser.email ?? '',
      isVisible: selectedUser.isVisible,
    });
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUserId || !selectedUser || selectedUser.mcName) return;
    if (autoSyncedUsers.current.has(selectedUserId)) return;

    autoSyncedUsers.current.add(selectedUserId);
    setIsSyncingProfile(true);
    void api
      .post<DonorUser>(`/admin/donor-users/${selectedUserId}/mc-profile/sync`)
      .then((res) => {
        setUsers((prev) => prev.map((user) => (user.id === res.data.id ? res.data : user)));
      })
      .catch(() => {
        autoSyncedUsers.current.delete(selectedUserId);
      })
      .finally(() => {
        setIsSyncingProfile(false);
      });
  }, [selectedUser, selectedUserId]);

  const refreshSelectedUser = async () => {
    if (!selectedUserId) return;
    await Promise.all([fetchUsers(), fetchUserDetails(selectedUserId)]);
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingCreate(true);
    try {
      const res = await api.post<DonorUser>('/admin/donor-users', {
        mcUuid: newUser.mcUuid,
        email: newUser.email || null,
        isVisible: newUser.isVisible,
      });
      setNewUser({ mcUuid: '', email: '', isVisible: true });
      await fetchUsers();
      setSelectedUserId(res.data.id);
    } catch (error: any) {
      alert(error?.response?.data ?? '创建用户失败');
    } finally {
      setIsSavingCreate(false);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUserId) return;
    setIsSavingUser(true);
    try {
      const res = await api.put<DonorUser>(`/admin/donor-users/${selectedUserId}`, {
        mcUuid: editUser.mcUuid,
        email: editUser.email || null,
        isVisible: editUser.isVisible,
      });
      setUsers((prev) => prev.map((user) => (user.id === res.data.id ? res.data : user)));
      setEditUser({
        mcUuid: res.data.mcUuid,
        email: res.data.email ?? '',
        isVisible: res.data.isVisible,
      });
    } catch (error: any) {
      alert(error?.response?.data ?? '保存用户失败');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSyncProfile = async () => {
    if (!selectedUserId) return;
    setIsSyncingProfile(true);
    try {
      const res = await api.post<DonorUser>(`/admin/donor-users/${selectedUserId}/mc-profile/sync`);
      setUsers((prev) => prev.map((user) => (user.id === res.data.id ? res.data : user)));
    } catch (error: any) {
      alert(error?.response?.data ?? '同步角色名失败');
    } finally {
      setIsSyncingProfile(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('确认删除该捐赠用户吗？授权、设备和激活记录会一并删除。')) return;
    await api.delete(`/admin/donor-users/${userId}`);
    setSelectedUserId(null);
    await fetchUsers();
  };

  const handleSaveLicense = async () => {
    if (!selectedUserId) return;
    setIsSavingLicense(true);
    try {
      const res = await api.put<License>(`/admin/donor-users/${selectedUserId}/license`, licenseDraft);
      setLicense(res.data);
    } catch (error: any) {
      alert(error?.response?.data ?? '保存授权失败');
    } finally {
      setIsSavingLicense(false);
    }
  };

  const handleAddDonation = async () => {
    if (!selectedUserId) return;
    setIsAddingDonation(true);
    try {
      await api.post('/admin/donor-donations', {
        userId: selectedUserId,
        amount: Number(donationDraft.amount),
        currency: donationDraft.currency,
        donatedAt: donationDraft.donatedAt,
      });
      await refreshSelectedUser();
    } catch (error: any) {
      alert(error?.response?.data ?? '新增捐赠记录失败');
    } finally {
      setIsAddingDonation(false);
    }
  };

  const handleToggleDevice = async (deviceId: string) => {
    await api.put(`/admin/donor-devices/${deviceId}/toggle`);
    if (selectedUserId) {
      await fetchUserDetails(selectedUserId);
    }
  };

  const handleSaveAfdianConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingAfdianConfig(true);
    try {
      const res = await api.put<AfdianConfig>('/admin/donation-settings/afdian', {
        creatorUserId: afdianConfigDraft.creatorUserId,
        token: afdianConfigDraft.token || null,
      });
      setAfdianConfig(res.data);
      setAfdianConfigDraft((prev) => ({ ...prev, token: '' }));
    } catch (error: any) {
      alert(error?.response?.data ?? '保存爱发电配置失败');
    } finally {
      setIsSavingAfdianConfig(false);
    }
  };

  const handleSaveAfdianBinding = async () => {
    if (!selectedUserId) return;
    setIsSavingAfdianBinding(true);
    try {
      const res = await api.put<DonorAfdianBinding>(`/admin/donor-users/${selectedUserId}/afdian`, {
        afdianUserId: afdianBindingDraft.afdianUserId || null,
      });
      setAfdianBinding(res.data);
      await fetchUsers();
    } catch (error: any) {
      alert(error?.response?.data ?? '保存爱发电绑定失败');
    } finally {
      setIsSavingAfdianBinding(false);
    }
  };

  const handleSyncAfdian = async () => {
    if (!selectedUserId) return;
    setIsSyncingAfdian(true);
    try {
      const res = await api.post<DonorAfdianBinding>(`/admin/donor-users/${selectedUserId}/afdian/sync`);
      setAfdianBinding(res.data);
      await refreshSelectedUser();
    } catch (error: any) {
      alert(error?.response?.data ?? '同步爱发电数据失败');
    } finally {
      setIsSyncingAfdian(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-wide text-neutral-900 dark:text-white">
          <Shield className="text-blue-500" /> 捐赠用户与历史赞助管理
        </h2>
        <button
          onClick={() =>
            void Promise.all([
              fetchUsers(),
              fetchAfdianConfig(),
              selectedUserId ? fetchUserDetails(selectedUserId) : Promise.resolve(),
            ])
          }
          className={`${buttonClass} border border-neutral-200 bg-white/70 text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10`}
        >
          <RefreshCcw size={16} /> 刷新
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-1">
          <div className={cardClass}>
            <h3 className="mb-4 flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
              <Plus size={16} className="text-emerald-500" /> 新建捐赠用户
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className={labelClass}>Minecraft UUID</label>
                <input
                  required
                  value={newUser.mcUuid}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, mcUuid: event.target.value }))}
                  className={inputClass}
                  placeholder="支持带横线，后端会自动去掉"
                />
              </div>
              <div>
                <label className={labelClass}>邮箱</label>
                <input
                  value={newUser.email}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                  className={inputClass}
                  placeholder="name@example.com"
                />
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/60 px-4 py-3 text-sm font-bold text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200">
                <input
                  type="checkbox"
                  checked={newUser.isVisible}
                  onChange={(event) =>
                    setNewUser((prev) => ({ ...prev, isVisible: event.target.checked }))
                  }
                />
                默认展示到历史赞助者 API
              </label>
              <button
                type="submit"
                disabled={isSavingCreate}
                className={`${buttonClass} w-full bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200`}
              >
                {isSavingCreate ? '创建中...' : '创建用户'}
              </button>
            </form>
          </div>

          <div className={cardClass}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                <HeartHandshake size={16} className="text-pink-500" /> 爱发电 Token 管理
              </h3>
              <div className="text-[11px] text-neutral-500">
                {afdianConfig?.updatedAt ? `上次更新 ${formatDateTime(afdianConfig.updatedAt)}` : '未配置'}
              </div>
            </div>
            <form onSubmit={handleSaveAfdianConfig} className="space-y-4">
              <div>
                <label className={labelClass}>创作者 user_id</label>
                <input
                  required
                  value={afdianConfigDraft.creatorUserId}
                  onChange={(event) =>
                    setAfdianConfigDraft((prev) => ({ ...prev, creatorUserId: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="爱发电开发者 user_id"
                />
              </div>
              <div>
                <label className={labelClass}>Token</label>
                <input
                  type="password"
                  value={afdianConfigDraft.token}
                  onChange={(event) =>
                    setAfdianConfigDraft((prev) => ({ ...prev, token: event.target.value }))
                  }
                  className={inputClass}
                  placeholder={
                    afdianConfig?.hasToken
                      ? `已保存 ${afdianConfig.tokenPreview ?? ''}，留空则不覆盖`
                      : '首次保存必须填写'
                  }
                />
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                后端会加密保存 token。请确保服务端设置了 `DATA_ENCRYPTION_KEY` 或固定的 `JWT_SECRET`。
              </div>
              <button
                type="submit"
                disabled={isSavingAfdianConfig}
                className={`${buttonClass} w-full bg-blue-600 text-white hover:bg-blue-700`}
              >
                <Save size={16} /> {isSavingAfdianConfig ? '保存中...' : '保存爱发电配置'}
              </button>
            </form>
          </div>

          <div className={cardClass}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-neutral-900 dark:text-white">用户列表</h3>
              <span className="text-xs text-neutral-500">
                {filteredUsers.length} / {users.length}
              </span>
            </div>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className={`${inputClass} pl-10`}
                placeholder="搜索 UUID / 角色名 / 邮箱 / 爱发电 user_id"
              />
            </div>
            {isLoadingUsers ? (
              <div className="py-8 text-center text-neutral-500">加载中...</div>
            ) : (
              <div className="max-h-[620px] space-y-2 overflow-auto pr-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      selectedUserId === user.id
                        ? 'border-orange-200 bg-orange-50/70 dark:border-orange-500/20 dark:bg-orange-500/10'
                        : 'border-neutral-200/60 bg-white/50 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/[0.01] dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-neutral-900 dark:text-white">
                          {user.mcName || '未同步角色名'}
                        </div>
                        <div className="mt-1 break-all font-mono text-[11px] text-neutral-500">
                          {user.mcUuid}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${
                          user.isVisible
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'border-neutral-200 bg-neutral-100 text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400'
                        }`}
                      >
                        {user.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                        {user.isVisible ? '展示' : '隐藏'}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-neutral-500">
                      {user.email || '无邮箱'} · 累计 ¥{formatAmount(user.totalSponsoredAmount)}
                    </div>
                    {user.afdianUserId ? (
                      <div className="mt-1 text-[11px] text-neutral-500">爱发电: {user.afdianUserId}</div>
                    ) : null}
                  </button>
                ))}
                {filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-sm text-neutral-500">没有匹配的用户</div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8 xl:col-span-2">
          {!selectedUser ? (
            <div className={`${cardClass} py-16 text-center text-neutral-500`}>请选择一个捐赠用户</div>
          ) : (
            <>
              <div className={cardClass}>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      当前用户
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-2xl font-black text-neutral-900 dark:text-white">
                      <UserRoundSearch size={20} className="text-blue-500" />
                      {selectedUser.mcName || '未同步角色名'}
                    </div>
                    <div className="mt-2 break-all font-mono text-sm text-neutral-500">
                      {selectedUser.mcUuid}
                    </div>
                    <div className="mt-1 text-sm text-neutral-500">
                      {selectedUser.email || '无邮箱'} · 创建于 {formatDateTime(selectedUser.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => void handleDeleteUser(selectedUser.id)}
                    className={`${buttonClass} border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20`}
                  >
                    <Trash2 size={16} /> 删除用户
                  </button>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="text-xs text-neutral-500">累计赞助</div>
                    <div className="mt-2 text-xl font-black text-neutral-900 dark:text-white">
                      ¥{formatAmount(selectedUser.totalSponsoredAmount)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="text-xs text-neutral-500">开始赞助</div>
                    <div className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">
                      {formatDateTime(selectedUser.firstSponsoredAt)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="text-xs text-neutral-500">最后赞助</div>
                    <div className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">
                      {formatDateTime(selectedUser.lastSponsoredAt)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="text-xs text-neutral-500">历史 API 展示</div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white">
                      {selectedUser.isVisible ? (
                        <Eye size={14} className="text-emerald-500" />
                      ) : (
                        <EyeOff size={14} className="text-neutral-500" />
                      )}
                      {selectedUser.isVisible ? '已展示' : '已隐藏'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Minecraft UUID</label>
                    <input
                      value={editUser.mcUuid}
                      onChange={(event) => setEditUser((prev) => ({ ...prev, mcUuid: event.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>邮箱</label>
                    <input
                      value={editUser.email}
                      onChange={(event) => setEditUser((prev) => ({ ...prev, email: event.target.value }))}
                      className={inputClass}
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/70 px-4 py-3 text-sm font-bold text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={editUser.isVisible}
                      onChange={(event) =>
                        setEditUser((prev) => ({ ...prev, isVisible: event.target.checked }))
                      }
                    />
                    展示到历史赞助者 API
                  </label>
                  <button
                    onClick={() => void handleSaveUser()}
                    disabled={isSavingUser}
                    className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
                  >
                    <Save size={16} /> {isSavingUser ? '保存中...' : '保存用户资料'}
                  </button>
                  <button
                    onClick={() => void handleSyncProfile()}
                    disabled={isSyncingProfile}
                    className={`${buttonClass} border border-neutral-200 bg-white/70 text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10`}
                  >
                    <UserRoundSearch size={16} /> {isSyncingProfile ? '同步中...' : '同步 Mojang 角色名'}
                  </button>
                </div>
              </div>

              <div className={cardClass}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                    <Ticket size={18} className="text-purple-500" /> License 授权
                  </h3>
                  <div className="text-xs text-neutral-500">
                    {license?.updatedAt ? `最近更新 ${formatDateTime(license.updatedAt)}` : '尚未配置'}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className={labelClass}>Tier</label>
                    <select
                      value={licenseDraft.tier}
                      onChange={(event) =>
                        setLicenseDraft((prev) => ({ ...prev, tier: event.target.value }))
                      }
                      className={inputClass}
                    >
                      <option value="supporter">supporter</option>
                      <option value="vip">vip</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Status</label>
                    <select
                      value={licenseDraft.status}
                      onChange={(event) =>
                        setLicenseDraft((prev) => ({ ...prev, status: event.target.value }))
                      }
                      className={inputClass}
                    >
                      <option value="active">active</option>
                      <option value="expired">expired</option>
                      <option value="banned">banned</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-white/70 px-4 py-3 text-sm font-bold text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200">
                      <input
                        type="checkbox"
                        checked={licenseDraft.isBetaEnabled}
                        onChange={(event) =>
                          setLicenseDraft((prev) => ({
                            ...prev,
                            isBetaEnabled: event.target.checked,
                          }))
                        }
                      />
                      允许 beta 推送
                    </label>
                  </div>
                </div>

                <button
                  onClick={() => void handleSaveLicense()}
                  disabled={isSavingLicense}
                  className={`${buttonClass} mt-4 w-full bg-blue-600 text-white hover:bg-blue-700`}
                >
                  {isSavingLicense ? '保存中...' : '保存授权'}
                </button>
              </div>

              <div className={cardClass}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                    <Coins size={18} className="text-emerald-500" /> 捐赠记录与爱发电
                  </h3>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="mb-3 font-bold text-neutral-900 dark:text-white">手动新增捐赠</div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div>
                        <label className={labelClass}>金额</label>
                        <input
                          type="number"
                          value={donationDraft.amount}
                          onChange={(event) =>
                            setDonationDraft((prev) => ({
                              ...prev,
                              amount: Number(event.target.value),
                            }))
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>币种</label>
                        <input
                          value={donationDraft.currency}
                          onChange={(event) =>
                            setDonationDraft((prev) => ({ ...prev, currency: event.target.value }))
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>日期</label>
                        <input
                          type="date"
                          value={donationDraft.donatedAt}
                          onChange={(event) =>
                            setDonationDraft((prev) => ({ ...prev, donatedAt: event.target.value }))
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => void handleAddDonation()}
                      disabled={isAddingDonation}
                      className={`${buttonClass} mt-4 w-full bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200`}
                    >
                      {isAddingDonation ? '提交中...' : '新增捐赠记录'}
                    </button>
                  </div>

                  <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="font-bold text-neutral-900 dark:text-white">爱发电绑定与同步</div>
                      <div className="text-[11px] text-neutral-500">
                        {afdianBinding?.sponsor?.syncedAt
                          ? `上次同步 ${formatDateTime(afdianBinding.sponsor.syncedAt)}`
                          : '未同步'}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className={labelClass}>爱发电 user_id</label>
                        <input
                          value={afdianBindingDraft.afdianUserId}
                          onChange={(event) =>
                            setAfdianBindingDraft({ afdianUserId: event.target.value })
                          }
                          className={inputClass}
                          placeholder="绑定赞助者的爱发电 user_id"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-neutral-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                          <div className="text-[11px] text-neutral-500">爱发电累计金额</div>
                          <div className="mt-1 text-lg font-black text-neutral-900 dark:text-white">
                            ¥{formatAmount(afdianBinding?.sponsor?.allSumAmount)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-neutral-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                          <div className="text-[11px] text-neutral-500">首次支付</div>
                          <div className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">
                            {formatUnixTime(afdianBinding?.sponsor?.firstPayTime)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-neutral-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                          <div className="text-[11px] text-neutral-500">最后支付</div>
                          <div className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">
                            {formatUnixTime(afdianBinding?.sponsor?.lastPayTime)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => void handleSaveAfdianBinding()}
                          disabled={isSavingAfdianBinding}
                          className={`${buttonClass} border border-neutral-200 bg-white/70 text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10`}
                        >
                          <Link2 size={16} /> {isSavingAfdianBinding ? '保存中...' : '保存绑定'}
                        </button>
                        <button
                          onClick={() => void handleSyncAfdian()}
                          disabled={isSyncingAfdian}
                          className={`${buttonClass} bg-pink-600 text-white hover:bg-pink-700`}
                        >
                          <RefreshCcw size={16} /> {isSyncingAfdian ? '同步中...' : '同步爱发电赞助'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse whitespace-nowrap text-left">
                    <thead>
                      <tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500 dark:border-white/10 dark:text-neutral-500">
                        <th className="px-2 py-3 font-medium">日期</th>
                        <th className="px-2 py-3 font-medium">金额</th>
                        <th className="px-2 py-3 font-medium">币种</th>
                        <th className="px-2 py-3 font-medium">ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donations.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-2 py-6 text-center text-neutral-500">
                            暂无手动捐赠记录
                          </td>
                        </tr>
                      ) : (
                        donations.map((donation) => (
                          <tr key={donation.id} className="border-b border-neutral-100 dark:border-white/5">
                            <td className="px-2 py-3 text-sm">{donation.donatedAt}</td>
                            <td className="px-2 py-3 font-mono">{donation.amount}</td>
                            <td className="px-2 py-3">{donation.currency}</td>
                            <td className="px-2 py-3 font-mono text-xs text-neutral-500">{donation.id}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={cardClass}>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                  <Cpu size={18} className="text-orange-500" /> 设备列表
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse whitespace-nowrap text-left text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500 dark:border-white/10 dark:text-neutral-500">
                        <th className="px-2 py-3 font-medium">设备名</th>
                        <th className="px-2 py-3 font-medium">UUID</th>
                        <th className="px-2 py-3 font-medium">最近在线</th>
                        <th className="px-2 py-3 text-right font-medium">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-2 py-6 text-center text-neutral-500">
                            暂无设备
                          </td>
                        </tr>
                      ) : (
                        devices.map((device) => (
                          <tr key={device.id} className="border-b border-neutral-100 dark:border-white/5">
                            <td className="px-2 py-3 font-bold">{device.deviceName}</td>
                            <td className="px-2 py-3 font-mono text-xs text-neutral-500">{device.deviceUuid}</td>
                            <td className="px-2 py-3 text-xs text-neutral-500">{formatDateTime(device.lastSeenAt)}</td>
                            <td className="px-2 py-3 text-right">
                              <button
                                onClick={() => void handleToggleDevice(device.id)}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                                  device.isActive
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                                    : 'border-neutral-200 bg-neutral-100 text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400'
                                }`}
                              >
                                {device.isActive ? 'active' : 'disabled'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={cardClass}>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                  <Ticket size={18} className="text-blue-500" /> 激活记录
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse whitespace-nowrap text-left text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500 dark:border-white/10 dark:text-neutral-500">
                        <th className="px-2 py-3 font-medium">签发时间</th>
                        <th className="px-2 py-3 font-medium">过期时间</th>
                        <th className="px-2 py-3 font-medium">最后刷新</th>
                        <th className="px-2 py-3 font-medium">Activation ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activations.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-2 py-6 text-center text-neutral-500">
                            暂无激活记录
                          </td>
                        </tr>
                      ) : (
                        activations.map((activation) => (
                          <tr key={activation.id} className="border-b border-neutral-100 dark:border-white/5">
                            <td className="px-2 py-3 text-xs text-neutral-500">{activation.issuedAt}</td>
                            <td className="px-2 py-3 text-xs text-neutral-500">{activation.expiresAt}</td>
                            <td className="px-2 py-3 text-xs text-neutral-500">
                              {activation.lastRefreshAt ?? '-'}
                            </td>
                            <td className="px-2 py-3 font-mono text-xs">{activation.id}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
