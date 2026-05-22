import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText, 
  Plus, 
  Download,
  ChevronRight,
  ChevronDown,
  Eye,
  Edit
} from 'lucide-react';
import { api } from '../services/api';
import { Catechumen, ReportCard } from '../types';
import { cn } from '../lib/utils';

const API_URL = '';

function getFileUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  return API_URL + url;
}
function ReportCardItem({ card, navigate }: { card: any; navigate: any; key?: any }) {
  const [expanded, setExpanded] = useState(false);
  const isAnnual = card.type === 'annual' || card.trimestre === 'Annuel';
  const toNum = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const avg = toNum(card.average);
  const mention = avg >= 16 ? 'Excellent' : avg >= 14 ? 'Très Bien' : avg >= 12 ? 'Bien' : 'Passable';
  return (
    <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors group">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-14 h-14 sm:w-12 sm:h-12 bg-brown-50 rounded-xl flex items-center justify-center text-brown-900 font-bold text-lg sm:text-base group-hover:bg-white group-hover:shadow-sm transition-all flex-shrink-0">
            {avg.toFixed(1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
              <h4 className="font-bold text-brown-900 text-sm sm:text-base truncate">{card.title}</h4>
              {card.trimestre && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase whitespace-nowrap">
                  {card.trimestre}
                </span>
              )}
              {isAnnual && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded uppercase whitespace-nowrap">Annuel</span>
              )}
            </div>
            <p className="text-xs text-slate-500">Session du {new Date(card.date).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mention</span>
          <span className={cn("text-sm font-bold", avg >= 12 ? "text-emerald-600" : "text-amber-600")}>
            {mention}
          </span>
        </div>
      </div>

      <div className="sm:hidden flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mention</span>
        <span className={cn("text-sm font-bold", avg >= 12 ? "text-emerald-600" : "text-amber-600")}>
          {mention}
        </span>
      </div>

      {(isAnnual || (card.grades && card.grades.length > 0)) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3 py-2 mb-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-xs font-medium text-slate-600"
        >
          <span>{expanded ? 'Masquer les notes' : (isAnnual ? 'Voir les moyennes trimestrielles' : 'Voir les notes par matière')}</span>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      )}

      {expanded && (
        <div className="mb-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider">
                <th className="px-4 py-2.5">{isAnnual ? 'Trimestre' : 'Matière'}</th>
                <th className="px-4 py-2.5 w-16 text-center">Note</th>
                {!isAnnual && <th className="px-4 py-2.5">Appréciation</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isAnnual ? (
                <>
                  {card.t1_average !== undefined && (
                    <tr className="hover:bg-amber-50/50">
                      <td className="px-4 py-2 font-medium text-slate-800">1er Trimestre</td>
                      <td className="px-4 py-2 text-center">
                        <span className={cn("inline-flex items-center justify-center w-10 h-7 rounded-lg font-bold", (Number(card.t1_average) || 0) >= 10 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
                          {(Number(card.t1_average) || 0).toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  )}
                  {card.t2_average !== undefined && (
                    <tr className="hover:bg-amber-50/50">
                      <td className="px-4 py-2 font-medium text-slate-800">2ème Trimestre</td>
                      <td className="px-4 py-2 text-center">
                        <span className={cn("inline-flex items-center justify-center w-10 h-7 rounded-lg font-bold", (Number(card.t2_average) || 0) >= 10 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
                          {(Number(card.t2_average) || 0).toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  )}
                  {card.t3_average !== undefined && (
                    <tr className="hover:bg-amber-50/50">
                      <td className="px-4 py-2 font-medium text-slate-800">3ème Trimestre</td>
                      <td className="px-4 py-2 text-center">
                        <span className={cn("inline-flex items-center justify-center w-10 h-7 rounded-lg font-bold", (Number(card.t3_average) || 0) >= 10 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
                          {(Number(card.t3_average) || 0).toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                card.grades && card.grades.map((grade: any, idx: number) => (
                  <tr key={grade.id || idx} className="hover:bg-amber-50/50">
                    <td className="px-4 py-2 font-medium text-slate-800">{grade.subject_name || 'N/A'}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center w-10 h-7 rounded-lg font-bold",
                        grade.score >= 10 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                      )}>
                        {Number.isFinite(grade.score) ? grade.score.toFixed(1) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2 italic text-slate-500">{grade.comment || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate(`/reports/${card.id}`)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-1.5 bg-amber-600 text-white text-xs sm:text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors min-h-[40px] sm:min-h-0"
          >
            <Eye size={14} />
            <span>Voir détails</span>
          </button>
          <button
            onClick={() => navigate(`/reports/${card.id}/edit`)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-1.5 bg-blue-600 text-white text-xs sm:text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors min-h-[40px] sm:min-h-0"
          >
            <Edit size={14} />
            <span>Modifier</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function CatechumenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<{ catechumen: Catechumen; report_cards: ReportCard[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.catechumens.get(id)
        .then((res: any) => {
          const { report_cards, ...catechumen } = res;
          const processedReportCards = report_cards.map((card: any) => {
            const avg = Number(card.average);
            if (card.type === 'annual' || card.trimestre === 'Annuel') {
              card.average = Number.isFinite(avg) ? avg : 0;
            } else if (card.grades && card.grades.length > 0) {
              const totalScore = card.grades.reduce((sum: number, grade: any) => sum + (Number(grade.score) || 0), 0);
              card.average = totalScore / card.grades.length;
            } else if (!Number.isFinite(avg)) {
              card.average = 0;
            }
            return card;
          });
          setData({ catechumen, report_cards: processedReportCards });
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Dossier introuvable</div>;

  const { catechumen, report_cards } = data;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={() => navigate('/catechumens')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={18} />
        Retour aux dossiers
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
            <div className="w-32 h-32 mx-auto rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-4xl mb-4 overflow-hidden border-2 border-white shadow-inner">
              {catechumen.photo_url ? (
                <img src={getFileUrl(catechumen.photo_url)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                catechumen.first_name[0] + catechumen.last_name[0]
              )}
            </div>
            <h2 className="text-xl font-bold text-brown-900 uppercase">{catechumen.last_name} {catechumen.first_name}</h2>
            <p className="text-slate-500 text-sm mt-1">Dossier créé le {new Date(catechumen.created_at).toLocaleDateString('fr-FR')}</p>
            
            <div className="mt-6 flex flex-col gap-3">
              <Link 
                to={`/catechumens/${id}/edit`}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all"
              >
                Modifier le dossier
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="font-bold text-brown-900 text-sm uppercase tracking-wider">Informations Personnelles</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail size={16} className="text-slate-400 shrink-0" />
                <span className="truncate">{catechumen.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={16} className="text-slate-400 shrink-0" />
                <span>{catechumen.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin size={16} className="text-slate-400 shrink-0" />
                <span>{catechumen.address || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Calendar size={16} className="text-slate-400 shrink-0" />
                <span>Né(e) le {new Date(catechumen.dob).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <span className="text-slate-400 shrink-0">Année:</span>
                <span className="font-medium text-slate-900">{catechumen.year || 'N/A'}</span>
              </div>
              {catechumen.niveau_scolaire && (
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="text-slate-400 shrink-0">Niveau Scolaire:</span>
                  <span className="font-medium text-slate-900">{catechumen.niveau_scolaire}</span>
                </div>
              )}
              {catechumen.quartier_ceb && (
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="text-slate-400 shrink-0">Quartier / CEB:</span>
                  <span className="font-medium text-slate-900">{catechumen.quartier_ceb}</span>
                </div>
              )}
              {catechumen.mouvement && (
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="text-slate-400 shrink-0">Mouvement:</span>
                  <span className="font-medium text-slate-900">{catechumen.mouvement}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-slate-600">
                <span className="text-slate-400 shrink-0">Baptisé:</span>
                <span className={cn("font-medium", catechumen.baptise ? "text-emerald-600" : "text-slate-500")}>
                  {catechumen.baptise ? 'Oui' : 'Non'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <span className="text-slate-400 shrink-0">Ancienneté:</span>
                <span className={cn("font-medium", catechumen.anciennete ? "text-emerald-600" : "text-slate-500")}>
                  {catechumen.anciennete ? 'Oui' : 'Non'}
                </span>
              </div>
            </div>
          </div>

          {catechumen.parent_name && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold text-brown-900 text-sm uppercase tracking-wider">Parents / Tuteurs</h3>
              <div className="space-y-3 text-sm">
                <div className="font-bold text-slate-800">{catechumen.parent_name}</div>
                {catechumen.parent_phone && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone size={14} className="text-slate-400" />
                    <span>{catechumen.parent_phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {catechumen.birth_certificate_url && (
            <div className="bg-amber-600 rounded-3xl p-6 text-white shadow-lg shadow-amber-600/20">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-4">Acte de Naissance</h3>
              <a 
                href={getFileUrl(catechumen.birth_certificate_url)}
                download={`acte_naissance_${catechumen.last_name}.png`}
                className="flex items-center justify-center gap-2 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition-all"
              >
                <Download size={18} />
                Télécharger le document
              </a>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <FileText size={20} />
                </div>
                <h3 className="font-bold text-brown-900">Historique des Bulletins</h3>
              </div>
              <Link 
                to={`/catechumens/${id}/add-report`}
                className="bg-brown-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brown-800 transition-all"
              >
                <Plus size={18} /> Créer un bulletin
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {report_cards.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <FileText size={48} className="mx-auto mb-4 opacity-10" />
                  <p>Aucun bulletin enregistré pour ce dossier</p>
                </div>
              ) : (
                report_cards.map((card) => (
                  <ReportCardItem key={card.id} card={card} navigate={navigate} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
