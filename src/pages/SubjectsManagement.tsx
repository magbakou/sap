import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  BookMarked,
  ChevronLeft,
  ChevronRight,
  Edit
} from 'lucide-react';
import { api } from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Subject } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function SubjectsManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newYear, setNewYear] = useState('1ere année');
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingYear, setEditingYear] = useState('1ere année');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const { user } = useAuth();

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = () => {
    setLoading(true);
    api.subjects.list()
      .then(setSubjects)
      .finally(() => setLoading(false));
  };

  // Filter subjects by selected year
  const filteredSubjects = selectedYear === 'all' 
    ? subjects 
    : subjects.filter(subject => subject.year === selectedYear);

  // Pagination logic
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredSubjects.slice(startIndex, startIndex + itemsPerPage);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.subjects.create({ name: newName, year: newYear });
      setNewName('');
      setNewYear('1ere année');
      loadSubjects();
    } catch (err) {
      alert('Erreur lors de la création');
    }
  };

  const handleUpdate = async (id: string | number) => {
    try {
      await api.subjects.update(id, { name: editingName, year: editingYear });
      setEditingId(null);
      setEditingName('');
      setEditingYear('1ere année');
      loadSubjects();
    } catch (err) {
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Voulez-vous vraiment supprimer cette matière ?')) return;
    try {
      await api.subjects.delete(id);
      loadSubjects();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-brown-900">Gestion des Matières</h2>
        <p className="text-slate-500">Configurez les matières enseignées lors de la catéchèse</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-8">
            <h3 className="font-bold text-brown-900 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-amber-500" />
              Ajouter une matière
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Nom de la matière (ex: Liturgie)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <select 
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="1ere année">1ère année</option>
                <option value="2eme année">2ème année</option>
                <option value="3eme année">3ème année</option>
                <option value="4eme année">4ème année</option>
                <option value="5eme année">5ème année</option>
                <option value="6eme année">6ème année</option>
              </select>
              <button
                type="submit"
                className="w-full bg-brown-900 text-white py-2.5 rounded-xl font-bold hover:bg-brown-800 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Enregistrer
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <BookMarked size={14} />
                Liste des matières configurées
              </div>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1); // Reset to first page when year changes
                }}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="all">Toutes les années</option>
                <option value="1ere année">1ère année</option>
                <option value="2eme année">2ème année</option>
                <option value="3eme année">3ème année</option>
                <option value="4eme année">4ème année</option>
                <option value="5eme année">5ème année</option>
                <option value="6eme année">6ème année</option>
              </select>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-400">Chargement...</div>
            ) : filteredSubjects.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Aucune matière enregistrée</div>
            ) : (
              <div>
                <div className="divide-y divide-slate-100">
                  {paginatedData.map((sub) => (
                    <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      {editingId === sub.id ? (
                        <div className="flex-1 flex gap-2 mr-4">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-3 py-1 bg-white border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <select 
                            value={editingYear}
                            onChange={(e) => setEditingYear(e.target.value)}
                            className="px-3 py-1 bg-white border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="1ere année">1ère année</option>
                            <option value="2eme année">2ème année</option>
                            <option value="3eme année">3ème année</option>
                            <option value="4eme année">4ème année</option>
                            <option value="5eme année">5ème année</option>
                            <option value="6eme année">6ème année</option>
                          </select>
                          <button 
                            onClick={() => handleUpdate(sub.id)}
                            className="bg-emerald-500 text-white p-2 rounded-lg hover:bg-emerald-600 transition-all"
                          >
                            <Save size={16} />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="bg-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-300 transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-bold">
                              {sub.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <span className="font-bold text-brown-900">{sub.name}</span>
                              <span className="ml-2 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                {sub.year || '1ere année'}
                              </span>
                            </div>
                          </div>
                          {user?.role === 'admin' && (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setEditingId(sub.id);
                                  setEditingName(sub.name);
                                }}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(sub.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-slate-700 text-center sm:text-left">
            Affichage de {startIndex + 1} à {Math.min(startIndex + itemsPerPage, filteredSubjects.length)} sur {filteredSubjects.length} matières
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-slate-700">
              {currentPage}/{totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
