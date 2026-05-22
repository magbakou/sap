import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Info, Plus, Trash2, User as UserIcon, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { Subject, Catechumen } from '../types';
import { cn } from '../lib/utils';

export function ReportCardForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.pathname.includes('/edit');

  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [catechumens, setCatechumens] = useState<Catechumen[]>([]);
  const [selectedCatechumenId, setSelectedCatechumenId] = useState(id || '');
  const [title, setTitle] = useState('');
  const [trimestre, setTrimestre] = useState('1er Trimestre');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [comments, setComments] = useState('');
  const [grades, setGrades] = useState<{ subject_id: number; score: number; comment: string }[]>([]);
  const [t1Average, setT1Average] = useState(0);
  const [t2Average, setT2Average] = useState(0);
  const [t3Average, setT3Average] = useState(0);
  const [existingTrimestres, setExistingTrimestres] = useState<string[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  const isAnnual = trimestre === 'Annuel';

  const subjects = useMemo(() => {
    if (!selectedCatechumenId) return allSubjects;
    const cate = catechumens.find(c => c.id == selectedCatechumenId);
    if (!cate?.year) return allSubjects;
    return allSubjects.filter(s => s.year === cate.year);
  }, [allSubjects, catechumens, selectedCatechumenId]);

  useEffect(() => {
    api.subjects.list().then(setAllSubjects);
  }, []);

  useEffect(() => {
    if (!isEdit && !isAnnual && subjects.length > 0) {
      setGrades(subjects.map(s => ({ subject_id: s.id, score: 0, comment: '' })));
    }
  }, [subjects, isEdit, isAnnual]);

  useEffect(() => {
    if (isEdit && id) {
      api.reports.get(id).then((data: any) => {
        setTitle(data.title || '');
        setTrimestre(data.trimestre || '1er Trimestre');
        setDate(data.date ? data.date.split('T')[0] : new Date().toISOString().split('T')[0]);
        setComments(data.comments || '');
        setSelectedCatechumenId(data.catechumen_id || '');
        if (data.type === 'annual' || data.trimestre === 'Annuel') {
          setT1Average(data.t1_average || 0);
          setT2Average(data.t2_average || 0);
          setT3Average(data.t3_average || 0);
        } else if (data.grades && data.grades.length > 0) {
          setGrades(data.grades.map((g: any) => ({
            subject_id: g.subject_id,
            score: g.score || 0,
            comment: g.comment || ''
          })));
        }
      }).finally(() => setInitialLoading(false));

      api.catechumens.list().then(setCatechumens);
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (!id) {
      api.catechumens.list().then(setCatechumens);
    }
  }, [id]);

  const trimesterOrder = ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'];

  useEffect(() => {
    if (!isAnnual || !selectedCatechumenId || isEdit) return;
    setLoadingExisting(true);
    api.catechumens.get(selectedCatechumenId)
      .then((data: any) => {
        const reportCards = data.report_cards || [];
        const trimesterLabels = ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'];
        const existing = trimesterLabels.filter(t =>
          reportCards.some((rc: any) => rc.trimestre === t && rc.grades && rc.grades.length > 0)
        );
        setExistingTrimestres(existing);
        const getAvg = (label: string) => {
          const rc = reportCards.find((r: any) => r.trimestre === label);
          if (!rc) return 0;
          const avg = Number(rc.average);
          if (Number.isFinite(avg)) return avg;
          if (rc.grades && rc.grades.length > 0) {
            const total = rc.grades.reduce((sum: number, g: any) => sum + (Number(g.score) || 0), 0);
            return total / rc.grades.length;
          }
          return 0;
        };
        setT1Average(getAvg('1er Trimestre'));
        setT2Average(getAvg('2ème Trimestre'));
        setT3Average(getAvg('3ème Trimestre'));
      })
      .catch(() => setExistingTrimestres([]))
      .finally(() => setLoadingExisting(false));
  }, [isAnnual, selectedCatechumenId, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatechumenId) {
      alert('Veuillez sélectionner un catéchumène');
      return;
    }
    setLoading(true);
    try {
      const body: any = {
        title: title || `${trimestre} ${new Date().getFullYear()}`,
        trimestre,
        date,
        comments,
      };

      if (isAnnual) {
        const existing = existingTrimestres.length > 0 ? existingTrimestres : [];
        body.t1_average = existing.length === 0 || existing.includes('1er Trimestre') ? t1Average : undefined;
        body.t2_average = existing.length === 0 || existing.includes('2ème Trimestre') ? t2Average : undefined;
        body.t3_average = existing.length === 0 || existing.includes('3ème Trimestre') ? t3Average : undefined;
        body.type = 'annual';
        body.grades = [];
      } else {
        body.grades = grades;
      }

      if (isEdit && id) {
        await api.reports.update(id, body);
        navigate(`/reports/${id}`);
      } else {
        await api.catechumens.addReportCard(selectedCatechumenId, body);
        navigate(id ? `/catechumens/${id}` : '/all-reports');
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const updateGrade = (index: number, field: string, value: any) => {
    const newGrades = [...grades];
    (newGrades[index] as any)[field] = value;
    setGrades(newGrades);
  };

  const liveAverage = useMemo(() => {
    if (isAnnual) {
      const vals: number[] = [];
      if (existingTrimestres.includes('1er Trimestre')) vals.push(Number(t1Average) || 0);
      if (existingTrimestres.includes('2ème Trimestre')) vals.push(Number(t2Average) || 0);
      if (existingTrimestres.includes('3ème Trimestre')) vals.push(Number(t3Average) || 0);
      if (vals.length === 0) {
        const t1 = Number(t1Average) || 0;
        const t2 = Number(t2Average) || 0;
        const t3 = Number(t3Average) || 0;
        return (t1 + t2 + t3) / 3;
      }
      return vals.reduce((s, v) => s + v, 0) / vals.length;
    }
    if (grades.length === 0) return 0;
    const total = grades.reduce((sum, g) => sum + (Number(g.score) || 0), 0);
    return total / grades.length;
  }, [grades, isAnnual, t1Average, t2Average, t3Average, existingTrimestres]);

  const liveMention = liveAverage >= 16 ? 'Excellent' : liveAverage >= 14 ? 'Très Bien' : liveAverage >= 12 ? 'Bien' : liveAverage >= 10 ? 'Passable' : 'Insuffisant';
  const liveMentionColor = liveAverage >= 16 ? 'text-emerald-600 bg-emerald-50' : liveAverage >= 14 ? 'text-blue-600 bg-blue-50' : liveAverage >= 12 ? 'text-amber-600 bg-amber-50' : liveAverage >= 10 ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50';

  if (initialLoading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={18} />
        Retour
      </button>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="bg-brown-900 p-8 text-white">
          <h2 className="text-2xl font-bold">{isEdit ? 'Modifier le Bulletin' : isAnnual ? 'Nouveau Bulletin Annuel' : 'Nouveau Bulletin Trimestriel'}</h2>
          <p className="text-brown-200 mt-1">{isEdit ? 'Modifiez les notes et appréciations du bulletin' : isAnnual ? 'Saisissez les moyennes trimestrielles pour le bulletin annuel' : 'Saisissez les notes et appréciations pour le suivi du catéchumène'}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {!isEdit && !id && (
            <div className="space-y-2 pb-6 border-b border-slate-100">
              <label className="text-sm font-bold text-brown-900 ml-1 flex items-center gap-2">
                <UserIcon size={16} className="text-amber-500" />
                Sélectionner le Catéchumène
              </label>
              <select
                required
                className="w-full px-4 py-3 bg-brown-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-brown-900"
                value={selectedCatechumenId}
                onChange={e => setSelectedCatechumenId(e.target.value)}
              >
                <option value="">-- Choisir un dossier --</option>
                {catechumens.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.last_name.toUpperCase()} {c.first_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Trimestre</label>
              <select
                required
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                value={trimestre}
                onChange={e => setTrimestre(e.target.value)}
              >
                <option value="1er Trimestre">1er Trimestre</option>
                <option value="2ème Trimestre">2ème Trimestre</option>
                <option value="3ème Trimestre">3ème Trimestre</option>
                <option value="Annuel">Annuel</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Titre / Session (Optionnel)</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Ex: Examen Final"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Date d'évaluation</label>
              <input
                type="date"
                required
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          {isAnnual ? (
            <div className="space-y-4">
              <h3 className="font-bold text-brown-900 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                Moyennes Trimestrielles (sur 20)
              </h3>
              {selectedCatechumenId && loadingExisting && (
                <p className="text-sm text-slate-500 ml-1">Vérification des trimestres existants...</p>
              )}
              {selectedCatechumenId && !loadingExisting && existingTrimestres.length === 0 && (
                <p className="text-sm text-amber-600 ml-1">Aucun bulletin trimestriel trouvé pour ce catéchumène. Vous pouvez saisir les moyennes manuellement.</p>
              )}
              <div className="bg-slate-50 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100/50 text-left text-xs uppercase tracking-wider font-bold text-slate-500">
                      <th className="px-6 py-4">Trimestre</th>
                      <th className="px-6 py-4 w-48">Moyenne</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {trimesterOrder.map((t, i) => {
                      const vals = [t1Average, t2Average, t3Average];
                      const label = ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'][i];
                      const show = !selectedCatechumenId || loadingExisting || existingTrimestres.length === 0 || existingTrimestres.includes(label);
                      const isAutoFilled = existingTrimestres.includes(label);
                      if (!show) return null;
                      return (
                        <tr key={label}>
                          <td className="px-6 py-4 font-bold text-slate-800">{label}</td>
                          <td className="px-6 py-4">
                            {isAutoFilled ? (
                              <div className="w-full px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg font-bold text-amber-800 text-center">
                                {Number(vals[i]).toFixed(2)}
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                required
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                                value={vals[i]}
                                onChange={e => {
                                  const setters = [setT1Average, setT2Average, setT3Average];
                                  setters[i](parseFloat(e.target.value) || 0);
                                }}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {existingTrimestres.length > 0 && (
                <p className="text-xs text-slate-400 ml-1">Seuls les trimestres avec des bulletins existants sont affichés. La moyenne générale est calculée sur {existingTrimestres.length} trimestre(s).</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-bold text-brown-900 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                Notes par matières (sur 20)
              </h3>
              <div className="bg-slate-50 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100/50 text-left text-xs uppercase tracking-wider font-bold text-slate-500">
                      <th className="px-6 py-4">Matière</th>
                      <th className="px-6 py-4 w-32">Note</th>
                      <th className="px-6 py-4">Appréciation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {grades.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-400">Aucune matière disponible</td>
                      </tr>
                    ) : (
                      grades.map((grade, idx) => (
                        <tr key={grade.subject_id}>
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {subjects.find(s => s.id === grade.subject_id)?.name}
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              required
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                              value={grade.score}
                              onChange={e => updateGrade(idx, 'score', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                              placeholder="Commentaire..."
                              value={grade.comment}
                              onChange={e => updateGrade(idx, 'comment', e.target.value)}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {((isAnnual && (t1Average || t2Average || t3Average)) || (!isAnnual && grades.length > 0)) && (
            <div className="flex justify-end -mt-2">
              <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-brown-900 rounded-xl">
                <TrendingUp size={18} className="text-amber-400" />
                <span className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">Moyenne</span>
                <span className="text-2xl font-black text-white">{liveAverage.toFixed(2)}</span>
                <span className="text-xs text-amber-200/70">/ 20</span>
                <span className={cn("ml-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase", liveMentionColor)}>
                  {liveMention}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">{isAnnual ? 'Appréciation Générale' : 'Appréciation globale du catéchiste'}</label>
            <textarea
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none"
              placeholder={isAnnual ? "Saisissez l'appréciation générale pour l'année..." : "Saisissez vos commentaires sur la progression globale..."}
              value={comments}
              onChange={e => setComments(e.target.value)}
            ></textarea>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-amber-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Save size={20} />
              {loading ? 'Enregistrement...' : (isEdit ? 'Mettre à jour' : 'Enregistrer le bulletin')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
