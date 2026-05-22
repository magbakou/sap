import React, { useEffect, useState } from 'react';
import { 
  Users, 
  FileText, 
  Clock,
  ChevronRight,
  Plus,
  BookOpen,
  Church,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import { Link, useNavigate } from 'react-router-dom';

const sacramentLabels: Record<string, string> = {
  'baptême': 'Baptême',
  'communion': 'Communion',
  'confirmation': 'Confirmation',
};

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.stats.get()
      .then(setStats)
      .catch((err) => console.error('Dashboard stats error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brown-900 border-t-transparent" />
      </div>
    );
  }

  const cards = [
    { label: 'Catéchumènes', value: stats?.total ?? 0, icon: Users, color: 'bg-blue-600', link: '/catechumens' },
    { label: 'Bulletins', value: stats?.totalReportCards ?? 0, icon: FileText, color: 'bg-emerald-600', link: '/all-reports' },
    { label: 'Matières', value: stats?.totalSubjects ?? 0, icon: BookOpen, color: 'bg-amber-600', link: '/subjects' },
    { label: 'Sacraments', value: stats?.totalSacraments ?? 0, icon: Church, color: 'bg-indigo-600', link: '/catechumens' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brown-900">Tableau de Bord</h2>
          <p className="text-slate-500">Vue d'ensemble du secrétariat de la catéchèse</p>
        </div>
        <div className="flex gap-3">
          <Link 
            to="/catechumens/new"
            className="bg-white text-brown-900 border border-slate-200 px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all font-bold text-sm shadow-sm"
          >
            <Plus size={18} />
            Nouveau Dossier
          </Link>
          <button 
            onClick={() => navigate('/reports/new')}
            className="bg-brown-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brown-800 transition-all font-bold text-sm shadow-lg shadow-brown-900/20"
          >
            <FileText size={18} />
            Établir un Bulletin
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <Link key={i} to={card.link} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all group">
            <div className={`${card.color} p-3 rounded-xl text-white group-hover:scale-105 transition-transform`}>
              <card.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="text-2xl font-bold text-brown-900">{card.value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-brown-900">Activités Récentes</h3>
              <Link to="/all-reports" className="text-sm font-medium text-amber-600 hover:text-amber-700">Voir tout</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {stats?.activities?.length ? stats.activities.map((activity, i) => (
                <Link 
                  key={i}
                  to={activity.type === 'catéchumène' ? `/catechumens/${activity.id}` : `/reports/${activity.id}`}
                  className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${activity.type === 'catéchumène' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                     {activity.type === 'catéchumène' ? <Users size={18} /> : <FileText size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brown-900 truncate">
                      {activity.type === 'catéchumène' ? 'Nouveau catéchumène' : 'Nouveau bulletin'}: <span className="font-bold">{activity.name}</span>
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock size={12} /> {new Date(activity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 shrink-0" />
                </Link>
              )) : (
                <div className="p-8 text-center text-slate-400">
                  <BarChart3 size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune activité récente</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-brown-900">Répartition par Année</h3>
            </div>
            {stats?.catechumensByYear?.length ? (
              <div className="p-6">
                <div className="space-y-3">
                  {stats.catechumensByYear.map((item) => {
                    const max = Math.max(...stats.catechumensByYear.map(y => y.count));
                    const pct = Math.round((item.count / max) * 100);
                    return (
                      <div key={item.year}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600 font-medium">{item.year}</span>
                          <span className="text-brown-900 font-bold">{item.count}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div 
                            className="bg-amber-500 h-2.5 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <p className="text-sm">Aucune donnée disponible</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {stats?.sacraments?.length ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-brown-900">Sacraments</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {stats.sacraments.map((sac, i) => (
                  <div key={i} className="p-4 flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span className="flex-1 text-sm text-slate-600">{sacramentLabels[sac.type] || sac.type}</span>
                    <span className="text-brown-900 font-bold">{sac.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="bg-brown-900 rounded-3xl shadow-xl p-8 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-xl mb-2">Guide de Gestion</h3>
              <p className="text-brown-200 text-sm mb-6 leading-relaxed">
                Créez un bulletin directement ou ouvrez un dossier catéchumène pour voir les détails.
              </p>
              <Link 
                to="/reports/new"
                className="inline-flex items-center gap-2 bg-amber-500 text-brown-900 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-400 transition-all"
              >
                Établir un bulletin
                <ChevronRight size={18} />
              </Link>
            </div>
            <FileText size={120} className="absolute -right-8 -bottom-8 text-white/5 rotate-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
