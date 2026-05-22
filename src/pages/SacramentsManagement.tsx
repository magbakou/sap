import React, { useEffect, useState } from 'react';
import { 
  Church, 
  Search, 
  Filter, 
  Calendar, 
  User as UserIcon,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export function SacramentsManagement() {
  const [sacraments, setSacraments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.sacraments.listAll()
      .then(setSacraments)
      .finally(() => setLoading(false));
  }, []);

  const filtered = sacraments.filter(s => 
    `${s.catechumen?.first_name} ${s.catechumen?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestion des Sacrements</h2>
          <p className="text-slate-500">Suivi global des baptêmes, communions et confirmations</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom du catéchumène ou type de sacrement..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 h-11 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['baptême', 'communion', 'confirmation'].map(type => (
            <button 
              key={type}
              onClick={() => setSearchTerm(type)}
              className="px-3 py-1.5 text-xs font-bold uppercase rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider font-bold text-slate-500">
                <th className="px-6 py-4">Catéchumène</th>
                <th className="px-6 py-4">Sacrement</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date Prévue/Réelle</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Aucun enregistrement trouvé</td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold uppercase">
                          {s.catechumen?.first_name[0]}{s.catechumen?.last_name[0]}
                        </div>
                        <span className="font-bold text-slate-900 uppercase">{s.catechumen?.last_name} {s.catechumen?.first_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg font-bold uppercase text-[10px] tracking-wider">
                        {s.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {s.status === 'reçu' ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <Clock size={16} className="text-amber-500" />
                        )}
                        <span className={cn(
                          "text-sm font-medium capitalize",
                          s.status === 'reçu' ? "text-emerald-600" : "text-amber-600"
                        )}>
                          {s.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(s.date).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link 
                        to={`/catechumens/${s.catechumen_id}`}
                        className="text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1 group"
                      >
                        <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">Détails</span>
                        <ChevronRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
