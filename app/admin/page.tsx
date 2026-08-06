'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';
import { useDialogAccessibility } from '@/lib/useDialogAccessibility';
import {
  Users,
  Code2,
  FileCode,
  Trophy,
  ShieldAlert,
  Plus,
  Search,
  Edit,
  Trash2,
  Lock,
  RefreshCw,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalProblems: number;
  totalSubmissions: number;
  totalContests: number;
}

interface AdminProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  topicTags: string[];
  companyTags: string[];
  createdAt: string;
  _count?: {
    submissions: number;
  };
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  rating: number;
  createdAt: string;
  _count?: {
    submissions: number;
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'problems' | 'users'>('overview');

  // Stats state
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  // Problems state
  const [problems, setProblems] = useState<AdminProblem[]>([]);
  const [isLoadingProblems, setIsLoadingProblems] = useState<boolean>(false);
  const [problemSearch, setProblemSearch] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const deleteDialogRef = useDialogAccessibility(Boolean(deleteTargetId), () => setDeleteTargetId(null));

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  // Fetch overview stats
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error loading admin stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch problem list
  const fetchProblems = useCallback(async () => {
    setIsLoadingProblems(true);
    try {
      const res = await fetch('/api/admin/problems');
      if (res.ok) {
        const data = await res.json();
        setProblems(data);
      }
    } catch (err) {
      console.error('Error loading admin problems:', err);
    } finally {
      setIsLoadingProblems(false);
    }
  }, []);

  // Fetch users list
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error loading admin users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    if (authLoading || user?.role !== 'ADMIN') return;
    fetchStats();
    fetchProblems();
    fetchUsers();
  }, [authLoading, user?.role, router, fetchStats, fetchProblems, fetchUsers]);

  // Handle problem delete
  const handleDeleteProblem = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/problems/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setProblems((prev) => prev.filter((p) => p.id !== id));
        setDeleteTargetId(null);
        showToast('Problem deleted successfully', 'success');
        fetchStats();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete problem', 'error');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error deleting problem', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle user role change
  const handleRoleChange = async (userId: string, newRole: string) => {
    setRoleUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        showToast(`User role updated to ${newRole}`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update user role', 'error');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error updating user role', 'error');
    } finally {
      setRoleUpdatingId(null);
    }
  };

  // Filter problems
  const filteredProblems = problems.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(problemSearch.toLowerCase()) ||
      p.slug.toLowerCase().includes(problemSearch.toLowerCase());
    const matchesDifficulty =
      difficultyFilter === 'ALL' || p.difficulty.toUpperCase() === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  // Filter users
  const filteredUsers = users.filter((u) => {
    return (
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
    );
  });

  if (authLoading || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 lg:p-10 space-y-8 max-w-7xl mx-auto"
    >
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 shadow-lg shadow-amber-950/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin Control Panel</h1>
          </div>
          <p className="text-xs text-slate-400">
            Manage system statistics, problem bank, and user permissions across CodeForge
          </p>
        </div>

        {/* Create Problem Button */}
        <Link
          href="/admin/problems/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-950/40 transition hover:scale-105"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Problem</span>
        </Link>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>System Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('problems')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'problems'
              ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Problems Bank ({problems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'users'
              ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management ({users.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW METRIC CARDS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Users Card */}
            <motion.div whileHover={{ y: -3 }} className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-amber-500/20 group-hover:text-amber-500/30 transition">
                <Users className="w-12 h-12" />
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</div>
              <div className="text-3xl font-extrabold text-white mt-2">
                {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-amber-400" /> : stats?.totalUsers ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-2">Registered platform accounts</div>
            </motion.div>

            {/* Problems Card */}
            <motion.div whileHover={{ y: -3 }} className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-emerald-500/20 group-hover:text-emerald-500/30 transition">
                <FileCode className="w-12 h-12" />
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Problems</div>
              <div className="text-3xl font-extrabold text-white mt-2">
                {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-emerald-400" /> : stats?.totalProblems ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-2">Active DSA problem set</div>
            </motion.div>

            {/* Submissions Card */}
            <motion.div whileHover={{ y: -3 }} className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-amber-500/20 group-hover:text-amber-500/30 transition">
                <Code2 className="w-12 h-12" />
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Submissions</div>
              <div className="text-3xl font-extrabold text-white mt-2">
                {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-amber-400" /> : stats?.totalSubmissions ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-2">Executed code evaluations</div>
            </motion.div>

            {/* Contests Card */}
            <motion.div whileHover={{ y: -3 }} className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-amber-500/20 group-hover:text-amber-500/30 transition">
                <Trophy className="w-12 h-12" />
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Contests</div>
              <div className="text-3xl font-extrabold text-white mt-2">
                {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin text-amber-400" /> : stats?.totalContests ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-2">Scheduled rated contests</div>
            </motion.div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Quick Management Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/admin/problems/new"
                className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition flex items-center justify-between text-xs font-semibold text-slate-200"
              >
                <span>Create New DSA Problem</span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </Link>
              <button
                onClick={() => setActiveTab('problems')}
                className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition flex items-center justify-between text-xs font-semibold text-slate-200 text-left"
              >
                <span>Inspect Problem Bank</span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition flex items-center justify-between text-xs font-semibold text-slate-200 text-left"
              >
                <span>Manage User Roles</span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROBLEM CRUD TABLE */}
      {activeTab === 'problems' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                aria-label="Search problems by title or slug"
                placeholder="Search problem title or slug..."
                value={problemSearch}
                onChange={(e) => setProblemSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                aria-label="Filter admin problems by difficulty"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="ALL">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>

              <button
                onClick={fetchProblems}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
                title="Refresh problems list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {isLoadingProblems ? (
              <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span>Loading problem set...</span>
              </div>
            ) : filteredProblems.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs font-medium">
                No problems match your search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Title & Slug</th>
                      <th className="py-3.5 px-4">Difficulty</th>
                      <th className="py-3.5 px-4">Topic Tags</th>
                      <th className="py-3.5 px-4">Submissions</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredProblems.map((prob) => (
                      <tr key={prob.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-xs">{prob.title}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{prob.slug}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <DifficultyBadge difficulty={prob.difficulty} />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {prob.topicTags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 text-[10px] bg-slate-950 text-slate-300 rounded border border-slate-800"
                              >
                                {tag}
                              </span>
                            ))}
                            {prob.topicTags.length > 3 && (
                              <span className="text-[10px] text-slate-500">+{prob.topicTags.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">
                          {prob._count?.submissions || 0}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/problems/${prob.id}/edit`}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition"
                              title="Edit Problem"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => setDeleteTargetId(prob.id)}
                              className="p-1.5 rounded bg-slate-800 hover:bg-rose-950/80 text-rose-400 border border-slate-700 hover:border-rose-800 transition"
                              title="Delete Problem"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT TABLE */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                aria-label="Search users by name or email"
                placeholder="Search user name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <button
              onClick={fetchUsers}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Refresh users"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {isLoadingUsers ? (
              <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span>Loading users...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs font-medium">
                No registered users found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Current Role</th>
                      <th className="py-3.5 px-4">Rating</th>
                      <th className="py-3.5 px-4">Joined Date</th>
                      <th className="py-3.5 px-4 text-right">Update Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-xs">{u.name}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                          {u.email}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              u.role === 'ADMIN'
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                                : u.role === 'REGISTERED'
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-400">{u.rating}</td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <select
                            aria-label={`Role for ${u.name}`}
                            value={u.role}
                            disabled={roleUpdatingId === u.id}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-slate-950 text-slate-200 border border-slate-700 text-[11px] rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                          >
                            <option value="GUEST">GUEST</option>
                            <option value="REGISTERED">REGISTERED</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div
            ref={deleteDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-problem-title"
            className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-400 font-bold text-base">
              <AlertCircle className="w-5 h-5" />
              <span id="delete-problem-title">Confirm Problem Deletion</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this problem and all associated test cases and code templates? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProblem(deleteTargetId)}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
