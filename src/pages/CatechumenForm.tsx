import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User as UserIcon, Camera, Upload } from 'lucide-react';
import { api } from '../services/api';

export function CatechumenForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dob: '',
    gender: 'Male',
    address: '',
    phone: '',
    email: '',
    photo_url: '',
    birth_certificate_url: '',
    parent_name: '',
    parent_phone: '',
    year: '1ere année',
    niveau_scolaire: '',
    baptise: false,
    quartier_ceb: '',
    mouvement: '',
    anciennete: false
  });
  const [error, setError] = useState<string | null>(null);
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [birthCertFile, setBirthCertFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [showCameraOption, setShowCameraOption] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (id) {
      api.catechumens.get(id).then(res => {
        setFormData({
          first_name: res.first_name,
          last_name: res.last_name,
          dob: res.dob,
          gender: res.gender,
          address: res.address || '',
          phone: res.phone,
          email: res.email,
          photo_url: res.photo_url || '',
          birth_certificate_url: res.birth_certificate_url || '',
          parent_name: res.parent_name || '',
          parent_phone: res.parent_phone || '',
          year: res.year || '1ere année',
          niveau_scolaire: res.niveau_scolaire || '',
          baptise: res.baptise || false,
          quartier_ceb: res.quartier_ceb || '',
          mouvement: res.mouvement || '',
          anciennete: res.anciennete || false
        });
        if (res.photo_url) setPhotoPreview(res.photo_url);
      }).catch(err => {
        console.error('Error loading catechumen:', err);
        setError('Erreur lors du chargement des données');
      });
    }
  }, [id]);

  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('first_name', formData.first_name);
      fd.append('last_name', formData.last_name);
      fd.append('dob', formData.dob);
      fd.append('gender', formData.gender);
      fd.append('address', formData.address || '');
      fd.append('phone', formData.phone || '');
      fd.append('email', formData.email || '');
      fd.append('parent_name', formData.parent_name || '');
      fd.append('parent_phone', formData.parent_phone || '');
      fd.append('year', formData.year);
      fd.append('niveau_scolaire', formData.niveau_scolaire || '');
      fd.append('baptise', String(formData.baptise));
      fd.append('quartier_ceb', formData.quartier_ceb || '');
      fd.append('mouvement', formData.mouvement || '');
      fd.append('anciennete', String(formData.anciennete));
      if (photoFile) fd.append('photo', photoFile);
      if (birthCertFile) fd.append('birth_certificate', birthCertFile);
      if (id) {
        await api.catechumens.update(id, fd);
      } else {
        await api.catechumens.create(fd);
      }
      navigate('/catechumens');
    } catch (err) {
      console.error(err);
      setError(id ? 'Erreur lors de la mise a jour' : 'Erreur lors de la creation');
    } finally {
      setLoading(false);
    }
  };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const field = e.target.name;
    if (file) {
      if (field === 'photo') {
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
      } else if (field === 'birth_certificate') {
        setBirthCertFile(file);
        setFormData(prev => ({ ...prev, birth_certificate_url: file.name }));
      }
    }
  };
  const startCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsCapturing(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Impossible d\'accéder à la caméra. Veuillez vérifier les permissions.');
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        const maxWidth = 800;
        const maxHeight = 800;
        let { width, height } = video;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(blob));
          }
          const stream = video.srcObject as MediaStream;
          if (stream) stream.getTracks().forEach(track => track.stop());
          setIsCapturing(false);
          setShowCameraOption(false);
        }, 'image/jpeg', 0.85);
      }
    }
  };
  const stopCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    let value: string | boolean = target.type === 'checkbox' ? target.checked : target.value;

    if (target.name === 'dob' && typeof value === 'string') {
      const today = new Date().toISOString().split('T')[0];
      if (value > today) {
        return;
      }
    }

    setFormData({ ...formData, [e.target.name]: value });
  };

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
        <div className="bg-amber-600 p-8 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{id ? 'Modifier' : 'Ajouter'} un Dossier</h2>
            <p className="text-amber-100 mt-1">Saisie des informations du fidèle et des contacts parents</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <UserIcon size={32} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-10">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-10">
            <div className="w-full md:w-1/3 flex flex-col items-center gap-4">
              <div className="w-48 h-48 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 overflow-hidden relative group">
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setShowCameraOption(true)}
                      className="absolute bottom-2 right-2 bg-amber-600 text-white p-2 rounded-full hover:bg-amber-700 transition-colors"
                      title="Prendre une nouvelle photo"
                    >
                      <Camera size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    {showCameraOption ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCameraOption(false);
                            fileInputRef.current?.click();
                          }}
                          className="w-full bg-slate-600 text-white p-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Upload size={16} />
                          <span>Importer depuis un fichier</span>
                        </button>
                        <button
                          type="button"
                          onClick={startCameraCapture}
                          className="w-full bg-amber-600 text-white p-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Camera size={16} />
                          <span>Prendre une photo</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <Camera size={48} className="mb-2" />
                        <span className="text-xs font-bold uppercase tracking-wider">Photo</span>
                      </>
                    )}
                  </>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-slate-600 text-white p-3 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Upload size={18} />
                <span>Importer une photo</span>
              </button>
              
              {/* Hidden elements for camera functionality */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                name="photo"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            
            <div className="flex-1 space-y-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                Identité du Catéchumène
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Nom</label>
                  <input
                    type="text" name="last_name" required value={formData.last_name} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none uppercase"
                    placeholder="DUPONT"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Prénom</label>
                  <input
                    type="text" name="first_name" required value={formData.first_name} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Jean"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Date de naissance</label>
                  <input
                    type="date" name="dob" required value={formData.dob} onChange={handleChange} max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Sexe</label>
                  <select 
                    name="gender" value={formData.gender} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none appearance-none"
                  >
                    <option value="Male">Masculin</option>
                    <option value="Female">Féminin</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Année de Catéchèse</label>
                  <select 
                    name="year" value={formData.year} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none appearance-none"
                  >
                    <option value="1ere année">1ère année</option>
                    <option value="2eme année">2ème année</option>
                    <option value="3eme année">3ème année</option>
                    <option value="4eme année">4ème année</option>
                    <option value="5eme année">5ème année</option>
                    <option value="6eme année">6ème année</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Niveau Scolaire</label>
                  <input
                    type="text" name="niveau_scolaire" value={formData.niveau_scolaire} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Ex: CP, CE1, 6ème..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Quartier / CEB</label>
                  <input
                    type="text" name="quartier_ceb" value={formData.quartier_ceb} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Ex: CEB Saint Jean, Quartier..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Mouvement</label>
                  <input
                    type="text" name="mouvement" value={formData.mouvement} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Ex: Scouts, JOC..."
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Camera capture modal - fixed positioning outside the normal flow */}
          {isCapturing && (
            <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
                <h3 className="text-lg font-bold mb-4">Prendre une photo</h3>
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg bg-black"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      <Camera size={20} className="inline mr-2" />
                      Capturer
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="bg-slate-600 text-white px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <hr className="border-slate-100" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                Coordonnées & Documents
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Email (Fidèle)</label>
                  <input
                    type="email" name="email" value={formData.email} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="email@exemple.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Téléphone (Fidèle)</label>
                  <input
                    type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="+229 ..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Acte de Naissance (Document)</label>
                  <div className="relative">
                    <input
                      type="file"
                      name="birth_certificate"
                      onChange={handleFileUpload}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 transition-all px-4 py-2.5 bg-slate-50 rounded-xl"
                    />
                    {formData.birth_certificate_url && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">Chargé</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                Contacts Parents / Tuteurs
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Nom Complet du Parent</label>
                  <input
                    type="text" name="parent_name" value={formData.parent_name} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Ex: M. DUPONT Jean"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">Téléphone Parent</label>
                  <input
                    type="tel" name="parent_phone" value={formData.parent_phone} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="+229 ..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">Adresse Géographique</label>
            <textarea
              name="address" rows={3} value={formData.address} onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none"
              placeholder="Quartier, Maison, Ville..."
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="baptise"
                  checked={formData.baptise}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-bold text-slate-700">Baptisé</span>
              </label>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="anciennete"
                  checked={formData.anciennete}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-bold text-slate-700">Ancienneté</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {id ? 'Mise à jour...' : 'Enregistrement...'}
                </div>
              ) : (
                <>
                  <Save size={20} />
                  {id ? 'Mettre à jour' : 'Enregistrer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
