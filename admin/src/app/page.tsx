'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Ban, Trash2, UserCheck, ShieldAlert } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  status: 'pending' | 'approved' | 'blocked';
  role: 'user' | 'admin';
  created_at: string;
}

export default function AdminDashboard() {
  const [session, setSession] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);

    if (session?.user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (prof && prof.role === 'admin') {
        setCurrentProfile(prof as Profile);
        fetchUsers();
      } else {
        setCurrentProfile(null);
      }
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    setUsers((data as Profile[]) || []);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      return;
    }
    checkSession();
  };

  const handleUpdateStatus = async (userId: string, newStatus: 'approved' | 'blocked' | 'pending') => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId);

    if (!error) {
      fetchUsers();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('İstifadəçini silməyinizə əminsiniz?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (!error) {
      fetchUsers();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentProfile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!session || !currentProfile || currentProfile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <ShieldAlert className="w-8 h-8 text-emerald-500" />
            <h1 className="text-2xl font-bold text-emerald-500">Admin Panel</h1>
          </div>

          {session && currentProfile?.role !== 'admin' && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-4 text-center">
              Bu hesabla admin panelə giriş icazəniz yoxdur.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Parol</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition duration-200"
            >
              Daxil Ol
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendingUsers = users.filter(u => u.status === 'pending');
  const approvedUsers = users.filter(u => u.status === 'approved');
  const blockedUsers = users.filter(u => u.status === 'blocked');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-emerald-500" />
          <h1 className="text-xl font-bold text-white">Messenger Admin Panel</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">Admin: <strong className="text-white">{currentProfile.full_name}</strong></span>
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 text-red-400 px-4 py-2 rounded-xl text-sm font-medium transition"
          >
            Çıxış
          </button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto space-y-12">
        {/* Pending Approvals */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-amber-400">Gözləyən Qeydiyyatlar</h2>
            <span className="bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs px-2.5 py-1 rounded-full font-bold">
              {pendingUsers.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingUsers.length === 0 ? (
              <p className="text-slate-500 text-sm italic">Gözləyən qeydiyyat yoxdur.</p>
            ) : (
              pendingUsers.map(user => (
                <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white">{user.full_name}</h3>
                    <p className="text-sm text-slate-400">@{user.username}</p>
                    <p className="text-xs text-slate-500 mt-2">Tarix: {new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleUpdateStatus(user.id, 'approved')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-2 rounded-xl flex items-center justify-center gap-1 transition"
                    >
                      <CheckCircle className="w-4 h-4" /> Təsdiqlə
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(user.id, 'blocked')}
                      className="flex-1 bg-slate-800 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-semibold py-2 rounded-xl flex items-center justify-center gap-1 transition"
                    >
                      <XCircle className="w-4 h-4" /> İmtina
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* User Management */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">Bütün İstifadəçilər ({users.length})</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
                <tr>
                  <th className="p-4">Ad Soyad</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4 text-right">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-semibold text-white">{u.full_name}</td>
                    <td className="p-4 text-slate-400">@{u.username}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        u.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : u.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{u.role}</td>
                    <td className="p-4 text-right space-x-2">
                      {u.status !== 'blocked' ? (
                        <button
                          onClick={() => handleUpdateStatus(u.id, 'blocked')}
                          className="p-2 bg-slate-800 hover:bg-amber-500/20 text-amber-400 rounded-lg transition"
                          title="Blokla"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(u.id, 'approved')}
                          className="p-2 bg-slate-800 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition"
                          title="Aç"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-2 bg-slate-800 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
