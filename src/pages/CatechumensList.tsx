import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  Eye,
  Edit,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../services/api';
import { Catechumen } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

const API_URL_STORAGE = '';

function getFileUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  return API_URL_STORAGE + url;
}

export function CatechumensList() {
  const [catechumens, setCatechumens] = useState<Catechumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    api.catechumens.list()
      .then(setCatechumens)
      .finally(() => setLoading(false));
  }, []);

  const filtered = catechumens.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const yearFiltered = selectedYear === 'all' 
    ? filtered 
    : filtered.filter(c => c.year === selectedYear);

  const sorted = [...yearFiltered].sort((a, b) => {
    let aValue = a[sortBy as keyof Catechumen];
    let bValue = b[sortBy as keyof Catechumen];
    
    if (sortBy === 'created_at') {
      aValue = new Date(a.created_at).getTime();
      bValue = new Date(b.created_at).getTime();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(yearFiltered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sorted.slice(startIndex, startIndex + itemsPerPage);

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Nom', 'Prénom', 'Sexe', 'Email', 'Téléphone', 'Date de naissance', 'Adresse'];
    const csvContent = [
      headers.join(','),
      ...filtered.map(c => [
        `"${c.last_name || ''}"`,
        `"${c.first_name || ''}"`,
        `"${c.gender === 'Male' ? 'Garçon' : 'Fille'}"`,
        `"${c.email || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.dob ? new Date(c.dob).toLocaleDateString('fr-FR') : ''}"`,
        `"${c.address || ''}"`
      ].join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `catechumenes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-brown-900">Catéchumènes</h2>
            <p className="text-slate-500 text-sm sm:text-base">Gérez les inscriptions et le suivi des fidèles</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-slate-600 text-white px-3 py-2 sm:px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors font-medium text-sm"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Exporter CSV</span>
            </button>
            <Link 
              to="/catechumens/new"
              className="bg-amber-600 text-white px-3 py-2 sm:px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nouveau Catéchumène</span>
            </Link>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 h-10 sm:h-11 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1); // Reset to first page when year changes
                }}
                className="px-3 py-2.5 h-10 sm:h-11 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
              >
                <option value="all">Toutes les années</option>
                <option value="1ere année">1ère année</option>
                <option value="2eme année">2ème année</option>
                <option value="3eme année">3ème année</option>
                <option value="4eme année">4ème année</option>
                <option value="5eme année">5ème année</option>
                <option value="6eme année">6ème année</option>
              </select>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="px-3 py-2.5 h-10 sm:h-11 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
              >
                <option value="created_at-desc">Plus récent</option>
                <option value="created_at-asc">Plus ancien</option>
                <option value="last_name-asc">Nom (A-Z)</option>
                <option value="last_name-desc">Nom (Z-A)</option>
                <option value="first_name-asc">Prénom (A-Z)</option>
                <option value="first_name-desc">Prénom (Z-A)</option>
              </select>
              <ArrowUpDown size={16} className="text-slate-400" />
            </div>
            <button className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors h-10 sm:h-11 text-sm">
              <Filter size={16} />
              <span>Filtres</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Photo</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prénom</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sexe</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">année</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedData.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
                        {c.photo_url ? (
                          <img src={getFileUrl(c.photo_url)} alt="" className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                        ) : (
                          c.first_name[0] + c.last_name[0]
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 uppercase">{c.last_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{c.first_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                        c.gender === 'Male' ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
                      )}>
                        {c.gender === 'Male' ? 'Garçon' : 'Fille'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{c.year || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/catechumens/${c.id}`)}
                          className="text-amber-600 hover:text-amber-900 p-1 rounded hover:bg-amber-50 transition-colors"
                          title="Voir détails"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/catechumens/${c.id}/edit`)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4 p-4">
            {paginatedData.map((c) => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
                      {c.photo_url ? (
                        <img src={getFileUrl(c.photo_url)} alt="" className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                      ) : (
                        c.first_name[0] + c.last_name[0]
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{c.last_name} {c.first_name}</h3>
                      <span className={cn(
                        "inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1",
                        c.gender === 'Male' ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
                      )}>
                        {c.gender === 'Male' ? 'Garçon' : 'Fille'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Année:</span>
                    <span className="text-slate-900 font-medium">{c.year || '-'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/catechumens/${c.id}`)}
                      className="text-amber-600 hover:text-amber-900 p-2 rounded-lg hover:bg-amber-50 transition-colors"
                      title="Voir détails"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => navigate(`/catechumens/${c.id}/edit`)}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Modifier"
                    >
                      <Edit size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-slate-700 text-center sm:text-left">
                Affichage de {startIndex + 1} à {Math.min(startIndex + itemsPerPage, filtered.length)} sur {filtered.length} résultats
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
      )}
    </div>
  );
}
