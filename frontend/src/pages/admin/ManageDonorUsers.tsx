import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { Plus, Trash2, RefreshCcw, Shield, Cpu, Ticket, Coins, Power } from 'lucide-react';

type DonorUser = {
  id: string;
  mcUuid: string;
  email?: string | null;
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

export default function ManageDonorUsers() {
  const [users, setUsers] = useState<DonorUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isSavingLicense, setIsSavingLicense] = useState(false);
  const [isAddingDonation, setIsAddingDonation] = useState(false);

  const [newUser, setNewUser] = useState<{ mcUuid: string; email: string }>({ mcUuid: '', email: '' });

  const [license, setLicense] = useState<License | null>(null);
  const [licenseDraft, setLicenseDraft] = useState({ tier: 'supporter', isBetaEnabled: false, status: 'active' });

  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationDraft, setDonationDraft] = useState({ amount: 10, currency: 'CNY', donatedAt: new Date().toISOString().slice(0, 10) });

  const [devices, setDevices] = useState<Device[]>([]);
  const [activations, setActivations] = useState<Activation[]>([]);

  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId) ?? null, [users, selectedUserId]);

  const cardClass =
    'p-6 bg-white/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5 rounded-2xl relative shadow-sm dark:shadow-none';
  const inputClass =
    'w-full px-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all text-sm';
  const labelClass = 'block text-xs font-bold text-neutral-500 dark:text-neutral-400 ml-1 mb-1.5';

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<DonorUser[]>('/admin/donor-users');
      setUsers(res.data);
      if (!selectedUserId && res.data.length > 0) setSelectedUserId(res.data[0].id);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    const [lic, dons, devs, acts] = await Promise.all([
      api.get<License | null>(`/admin/donor-users/${userId}/license`),
      api.get<Donation[]>(`/admin/donor-users/${userId}/donations`),
      api.get<Device[]>(`/admin/donor-users/${userId}/devices`),
      api.get<Activation[]>(`/admin/donor-users/${userId}/activations`),
    ]);
    setLicense(lic.data);
    if (lic.data) {
      setLicenseDraft({ tier: lic.data.tier, isBetaEnabled: lic.data.isBetaEnabled, status: lic.data.status });
    }
    setDonations(dons.data);
    setDevices(devs.data);
    setActivations(acts.data);
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    fetchUserDetails(selectedUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUser(true);
    try {
      const res = await api.post<DonorUser>('/admin/donor-users', {
        mcUuid: newUser.mcUuid.trim(),
        email: newUser.email.trim() || null,
      });
      setNewUser({ mcUuid: '', email: '' });
      await fetchUsers();
      setSelectedUserId(res.data.id);
    } catch (err: any) {
      alert(err?.response?.data ?? '创建失败');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('确认删除该捐赠用户？这会级联删除授权/设备/激活记录。')) return;
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
      alert('授权已保存');
    } catch (err: any) {
      alert(err?.response?.data ?? '保存失败');
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
      await fetchUserDetails(selectedUserId);
    } catch (err: any) {
      alert(err?.response?.data ?? '添加失败');
    } finally {
      setIsAddingDonation(false);
    }
  };

  const toggleDevice = async (deviceId: string) => {
    await api.put(`/admin/donor-devices/${deviceId}/toggle`);
    if (selectedUserId) await fetchUserDetails(selectedUserId);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-wide flex items-center gap-2">
          <Shield className="text-blue-500" /> 捐赠用户与授权管理
        </h2>
        <button
          onClick={() => {
            fetchUsers();
            if (selectedUserId) fetchUserDetails(selectedUserId);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/10 transition-all"
        >
          <RefreshCcw size={16} /> 刷新
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* 左侧：用户列表 & 新增 */}
        <div className={`${cardClass} xl:col-span-1 space-y-5`}>
          <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Plus size={18} className="text-emerald-500" /> 手动新增捐赠用户
          </h3>

          <form onSubmit={handleCreateUser} className="space-y-3">
            <div>
              <label className={labelClass}>Minecraft UUID</label>
              <input
                required
                value={newUser.mcUuid}
                onChange={e => setNewUser(prev => ({ ...prev, mcUuid: e.target.value }))}
                className={inputClass}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div>
              <label className={labelClass}>邮箱 (可选)</label>
              <input value={newUser.email} onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))} className={inputClass} placeholder="name@example.com" />
            </div>
            <button
              type="submit"
              disabled={isSavingUser}
              className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold rounded-xl transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50"
            >
              {isSavingUser ? '创建中...' : '创建用户'}
            </button>
          </form>

          <div className="border-t border-neutral-200/60 dark:border-white/5 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">用户列表</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-500">{users.length} 条</span>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-neutral-500 animate-pulse">读取中...</div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedUserId === u.id
                        ? 'border-orange-200 bg-orange-50/70 dark:bg-orange-500/10 dark:border-orange-500/20'
                        : 'border-neutral-200/60 dark:border-white/10 bg-white/50 dark:bg-white/[0.01] hover:bg-neutral-50 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="text-sm font-black text-neutral-900 dark:text-white">{u.mcUuid}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">{u.email ?? '无邮箱'} · {u.id.slice(0, 8)}…</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：选中用户详情 */}
        <div className="xl:col-span-2 space-y-8">
          {!selectedUser ? (
            <div className={`${cardClass} py-14 text-center text-neutral-500`}>请选择一个捐赠用户</div>
          ) : (
            <>
              <div className={cardClass}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">当前用户</div>
                    <div className="text-xl font-black text-neutral-900 dark:text-white mt-1">{selectedUser.mcUuid}</div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">{selectedUser.email ?? '无邮箱'} · ID: {selectedUser.id}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50/70 dark:bg-red-500/10 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 size={16} /> 删除用户
                  </button>
                </div>
              </div>

              {/* 授权 */}
              <div className={cardClass}>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Ticket size={18} className="text-purple-500" /> License 授权
                  </h3>
                  <div className="text-xs text-neutral-500 dark:text-neutral-500">
                    {license?.updatedAt ? `最近更新: ${license.updatedAt}` : '尚未配置'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Tier</label>
                    <select value={licenseDraft.tier} onChange={e => setLicenseDraft(prev => ({ ...prev, tier: e.target.value }))} className={inputClass}>
                      <option value="supporter">supporter</option>
                      <option value="vip">vip</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Status</label>
                    <select value={licenseDraft.status} onChange={e => setLicenseDraft(prev => ({ ...prev, status: e.target.value }))} className={inputClass}>
                      <option value="active">active</option>
                      <option value="expired">expired</option>
                      <option value="banned">banned</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-sm font-bold text-neutral-700 dark:text-neutral-200 w-full">
                      <input
                        type="checkbox"
                        checked={licenseDraft.isBetaEnabled}
                        onChange={e => setLicenseDraft(prev => ({ ...prev, isBetaEnabled: e.target.checked }))}
                      />
                      允许推送体验版 (beta)
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleSaveLicense}
                  disabled={isSavingLicense}
                  className="mt-4 w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSavingLicense ? '保存中...' : '保存授权'}
                </button>
              </div>

              {/* 捐赠记录 */}
              <div className={cardClass}>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Coins size={18} className="text-emerald-500" /> Donations 捐赠记录
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                  <div>
                    <label className={labelClass}>金额</label>
                    <input type="number" value={donationDraft.amount} onChange={e => setDonationDraft(prev => ({ ...prev, amount: Number(e.target.value) }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>币种</label>
                    <input value={donationDraft.currency} onChange={e => setDonationDraft(prev => ({ ...prev, currency: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>日期</label>
                    <input type="date" value={donationDraft.donatedAt} onChange={e => setDonationDraft(prev => ({ ...prev, donatedAt: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddDonation}
                      disabled={isAddingDonation}
                      className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isAddingDonation ? '添加中...' : '添加记录'}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-white/10 text-xs text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
                        <th className="py-3 px-2 font-medium">日期</th>
                        <th className="py-3 px-2 font-medium">金额</th>
                        <th className="py-3 px-2 font-medium">币种</th>
                        <th className="py-3 px-2 font-medium">ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donations.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-neutral-500">暂无记录</td>
                        </tr>
                      ) : (
                        donations.map(d => (
                          <tr key={d.id} className="border-b border-neutral-100 dark:border-white/5">
                            <td className="py-3 px-2 text-sm">{d.donatedAt}</td>
                            <td className="py-3 px-2 font-mono">{d.amount}</td>
                            <td className="py-3 px-2">{d.currency}</td>
                            <td className="py-3 px-2 font-mono text-xs text-neutral-500">{d.id.slice(0, 8)}…</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 设备 */}
              <div className={cardClass}>
                <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
                  <Cpu size={18} className="text-orange-500" /> Devices 设备列表
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-white/10 text-xs text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
                        <th className="py-3 px-2 font-medium">名称</th>
                        <th className="py-3 px-2 font-medium">UUID</th>
                        <th className="py-3 px-2 font-medium">Last Seen</th>
                        <th className="py-3 px-2 text-right font-medium">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-neutral-500">暂无设备</td>
                        </tr>
                      ) : (
                        devices.map(dev => (
                          <tr key={dev.id} className="border-b border-neutral-100 dark:border-white/5">
                            <td className="py-3 px-2 font-bold">{dev.deviceName}</td>
                            <td className="py-3 px-2 font-mono text-xs text-neutral-600 dark:text-neutral-400">{dev.deviceUuid}</td>
                            <td className="py-3 px-2 text-xs text-neutral-500">{dev.lastSeenAt ?? '-'}</td>
                            <td className="py-3 px-2 text-right">
                              <button
                                onClick={() => toggleDevice(dev.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold border transition-all ${
                                  dev.isActive
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                    : 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-white/5 dark:text-neutral-400 dark:border-white/10'
                                }`}
                              >
                                <Power size={12} /> {dev.isActive ? 'active' : 'disabled'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 激活 */}
              <div className={cardClass}>
                <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
                  <Ticket size={18} className="text-blue-500" /> Activations 激活令牌
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-white/10 text-xs text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
                        <th className="py-3 px-2 font-medium">Issued</th>
                        <th className="py-3 px-2 font-medium">Expires</th>
                        <th className="py-3 px-2 font-medium">Last Refresh</th>
                        <th className="py-3 px-2 font-medium">Activation ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activations.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-neutral-500">暂无激活</td>
                        </tr>
                      ) : (
                        activations.map(a => (
                          <tr key={a.id} className="border-b border-neutral-100 dark:border-white/5">
                            <td className="py-3 px-2 text-xs text-neutral-500">{a.issuedAt}</td>
                            <td className="py-3 px-2 text-xs text-neutral-500">{a.expiresAt}</td>
                            <td className="py-3 px-2 text-xs text-neutral-500">{a.lastRefreshAt ?? '-'}</td>
                            <td className="py-3 px-2 font-mono text-xs">{a.id}</td>
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

