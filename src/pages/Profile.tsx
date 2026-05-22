import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User as UserIcon, Mail, Lock, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export function Profile() {
  const { user, login: updateAuth } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.auth.me()
      .then((data: any) => {
        setName(data.name || '');
        setEmail(data.email || '');
      })
      .finally(() => setProfileLoading(false));
  }, []);

  const handleSubmitInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name.trim()) { setError('Le nom est requis'); return; }
    if (!email.trim()) { setError('L\'email est requis'); return; }
    setLoading(true);
    try {
      const data = await api.auth.updateProfile({ name, email });
      updateAuth(localStorage.getItem('token') || '', { ...user!, name: data.name, email: data.email });
      localStorage.setItem('user', JSON.stringify({ ...user!, name: data.name, email: data.email }));
      setSuccess('Informations mises à jour avec succès');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!currentPassword) { setError('Veuillez entrer votre mot de passe actuel'); return; }
    if (!newPassword) { setError('Veuillez entrer un nouveau mot de passe'); return; }
    if (newPassword.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return; }
    if (newPassword !== confirmPassword) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    try {
      await api.auth.updateProfile({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Mot de passe modifié avec succès');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={18} />
        Retour
      </button>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-3 text-sm font-medium border border-emerald-200">
          <CheckCircle size={20} className="shrink-0" />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-200">
          <AlertCircle size={20} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brown-900 via-brown-800 to-amber-800 p-8 text-white">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Mon Profil</h2>
              <p className="text-amber-200/80 mt-1">Gérez vos informations personnelles et votre mot de passe</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-10">
          <div className="flex items-center gap-3 px-5 py-4 bg-amber-50/50 rounded-2xl border border-amber-100">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg font-bold">
              {user?.name?.substring(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-brown-900">{user?.name}</p>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Shield size={14} className="text-amber-500" />
                <span className="capitalize">{user?.role === 'admin' ? 'Administrateur' : 'Catéchiste / Secrétaire'}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitInfo} className="space-y-6">
            <h3 className="font-bold text-brown-900 flex items-center gap-2 text-lg">
              <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
              Informations personnelles
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Nom complet</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-amber-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Save size={18} />
                {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>

          <div className="border-t border-slate-200 pt-8">
            <form onSubmit={handleSubmitPassword} className="space-y-6">
              <h3 className="font-bold text-brown-900 flex items-center gap-2 text-lg">
                <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                Changer le mot de passe
              </h3>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Mot de passe actuel</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="Min. 6 caractères"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="Retaper le mot de passe"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-brown-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-brown-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
                >
                  <Lock size={18} />
                  {loading ? 'Modification...' : 'Modifier le mot de passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}