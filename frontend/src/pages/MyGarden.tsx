import React, { useEffect, useState } from 'react';
import {
  Sprout,
  Plus,
  Search,
  Filter,
  Droplets,
  Calendar,
  Sun,
  MapPin,
  Trash2,
  Edit,
  X,
  Check,
  Upload,
  Info,
  Clock,
  Waves,
} from 'lucide-react';
import {
  fetchPlants,
  createPlant,
  getPlant,
  updatePlant,
  deletePlant,
  logWatering,
  uploadPlantPhoto,
} from '../api';
import { Plant } from '../types';
import { useGarden } from '../context/GardenContext';

const QUICK_PLANTS = [
  { name: 'Tulsi (Holy Basil)', species: 'Ocimum sanctum', soil: 'loamy', water: 'low', sun: 'full sun' },
  { name: 'Tomato (ટામેટું)', species: 'Solanum lycopersicum', soil: 'loamy', water: 'moderate', sun: 'full sun' },
  { name: 'Chilli (મરચું)', species: 'Capsicum annuum', soil: 'sandy', water: 'moderate', sun: 'full sun' },
  { name: 'Okra (ભીંડા)', species: 'Abelmoschus esculentus', soil: 'loamy', water: 'moderate', sun: 'full sun' },
  { name: 'Coriander (ધાણા)', species: 'Coriandrum sativum', soil: 'loamy', water: 'moderate', sun: 'partial shade' },
  { name: 'Neem (લીમડો)', species: 'Azadirachta indica', soil: 'sandy', water: 'very low', sun: 'full sun' },
  { name: 'Marigold (ગલગોટા)', species: 'Tagetes erecta', soil: 'loamy', water: 'low', sun: 'full sun' },
  { name: 'Mint (ફુદીનો)', species: 'Mentha spicata', soil: 'loamy', water: 'high', sun: 'partial shade' },
  { name: 'Curry Leaf (કઢી લીમડો)', species: 'Murraya koenigii', soil: 'loamy', water: 'moderate', sun: 'full sun' },
  { name: 'Lemon (લીંબુ)', species: 'Citrus limon', soil: 'loamy', water: 'moderate', sun: 'full sun' },
];

export const MyGarden: React.FC = () => {
  const { t } = useGarden();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [search, setSearch] = useState('');
  const [soilFilter, setSoilFilter] = useState('');
  const [sunFilter, setSunFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [waterAmount, setWaterAmount] = useState(250);

  // Form state for creating plant
  const [form, setForm] = useState({
    name: '',
    species: '',
    location: 'Garden Bed',
    planting_date: new Date().toISOString().split('T')[0],
    soil_type: 'loamy',
    sunlight: 'full sun',
    container_type: 'ground',
    age_months: 1,
    watering_preference: 'moderate',
    notes: '',
  });

  const loadPlants = async () => {
    try {
      const data = await fetchPlants(search, soilFilter, sunFilter);
      setPlants(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlants();
  }, [search, soilFilter, sunFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await createPlant(form);
      setIsAddOpen(false);
      setForm({
        name: '',
        species: '',
        location: 'Garden Bed',
        planting_date: new Date().toISOString().split('T')[0],
        soil_type: 'loamy',
        sunlight: 'full sun',
        container_type: 'ground',
        age_months: 1,
        watering_preference: 'moderate',
        notes: '',
      });
      loadPlants();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDetail = async (id: number) => {
    try {
      const full = await getPlant(id);
      setSelectedPlant(full);
      setIsDetailOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this plant?')) return;
    try {
      await deletePlant(id);
      setIsDetailOpen(false);
      loadPlants();
    } catch (e) {
      console.error(e);
    }
  };

  const handleWaterPlant = async (plantId: number) => {
    try {
      await logWatering(plantId, waterAmount, 'Deep root soak', 'Logged from Garden Manager');
      const updated = await getPlant(plantId);
      setSelectedPlant(updated);
      loadPlants();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePhotoUpload = async (plantId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadPlantPhoto(plantId, file);
      const updated = await getPlant(plantId);
      setSelectedPlant(updated);
      loadPlants();
    } catch (err) {
      console.error(err);
    }
  };

  const applyQuickPreset = (preset: typeof QUICK_PLANTS[0]) => {
    setForm((prev) => ({
      ...prev,
      name: preset.name,
      species: preset.species,
      soil_type: preset.soil,
      watering_preference: preset.water,
      sunlight: preset.sun,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold font-heading text-stone-900">
            {t.myGarden}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Track individual plants, watering histories, and growth timelines privately.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="btn-primary text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addPlant}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="garden-card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by plant name, species, or location..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-sage text-xs bg-cream-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-nature-500/20"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={soilFilter}
            onChange={(e) => setSoilFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-sage text-xs bg-cream-50 text-stone-700"
          >
            <option value="">All Soils</option>
            <option value="sandy">Sandy Soil</option>
            <option value="loamy">Loamy Soil</option>
            <option value="clay">Clay Soil</option>
            <option value="potting mix">Potting Mix</option>
          </select>
          <select
            value={sunFilter}
            onChange={(e) => setSunFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-sage text-xs bg-cream-50 text-stone-700"
          >
            <option value="">All Sunlight</option>
            <option value="full sun">Full Sun</option>
            <option value="partial shade">Partial Shade</option>
            <option value="full shade">Full Shade</option>
          </select>
        </div>
      </div>

      {/* Plants Grid */}
      {plants.length === 0 ? (
        <div className="garden-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-nature-100 text-nature-700 mx-auto flex items-center justify-center">
            <Sprout className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900 font-heading">
            No plants in your garden yet
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Add your first plant to track its water requirements, receive personalized care tips,
            and monitor soil moisture.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="btn-primary text-xs font-bold mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Plant</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {plants.map((plant) => (
            <div
              key={plant.id}
              onClick={() => handleOpenDetail(plant.id)}
              className="garden-card p-5 cursor-pointer hover:border-nature-400 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-nature-100 text-nature-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                      {plant.photo_path ? (
                        <img
                          src={`/uploads/${plant.photo_path}`}
                          alt={plant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Sprout className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-stone-900 font-heading leading-tight">
                        {plant.name}
                      </h3>
                      {plant.species && (
                        <p className="text-[11px] text-stone-500 italic mt-0.5">
                          {plant.species}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cream-200 text-stone-700">
                    {plant.container_type}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-stone-600">
                  <div className="flex items-center gap-1.5 bg-cream-50 p-2 rounded-lg">
                    <MapPin className="w-3.5 h-3.5 text-nature-600" />
                    <span className="truncate">{plant.location || 'Garden'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-cream-50 p-2 rounded-lg">
                    <Sun className="w-3.5 h-3.5 text-amber-600" />
                    <span className="truncate">{plant.sunlight}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-sage flex items-center justify-between text-xs">
                <span className="text-[11px] text-stone-500 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-water-500" />
                  <span>Pref: {plant.watering_preference}</span>
                </span>
                <span className="text-nature-700 font-bold group-hover:underline text-[11px]">
                  View Details →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Plant Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sage">
              <h2 className="text-base font-bold font-heading text-stone-900">
                Add Plant to Garden
              </h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Regional Presets */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
                Quick Regional Presets (Gujarat & Indian Gardens)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PLANTS.map((qp) => (
                  <button
                    key={qp.name}
                    type="button"
                    onClick={() => applyQuickPreset(qp)}
                    className="text-[11px] px-2 py-1 bg-cream-100 hover:bg-nature-100 text-stone-800 rounded-lg border border-sage transition-colors font-medium"
                  >
                    {qp.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Plant Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Tulsi, Tomato, Lemon Tree"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Botanical / Species
                  </label>
                  <input
                    type="text"
                    value={form.species}
                    onChange={(e) => setForm({ ...form, species: e.target.value })}
                    placeholder="e.g. Ocimum sanctum"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Garden Location
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Front Balcony, Terrace, Garden Bed"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Soil Type
                  </label>
                  <select
                    value={form.soil_type}
                    onChange={(e) => setForm({ ...form, soil_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
                  >
                    <option value="loamy">Loamy (Balanced)</option>
                    <option value="sandy">Sandy (Fast-draining)</option>
                    <option value="clay">Clay (Moisture-retaining)</option>
                    <option value="potting mix">Potting Mix</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Container
                  </label>
                  <select
                    value={form.container_type}
                    onChange={(e) => setForm({ ...form, container_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
                  >
                    <option value="ground">In-ground bed</option>
                    <option value="pot">Potted container</option>
                    <option value="raised bed">Raised garden bed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Sunlight
                  </label>
                  <select
                    value={form.sunlight}
                    onChange={(e) => setForm({ ...form, sunlight: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
                  >
                    <option value="full sun">Full Sun (6+ hrs)</option>
                    <option value="partial shade">Partial Shade</option>
                    <option value="full shade">Full Shade</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Water Preference
                  </label>
                  <select
                    value={form.watering_preference}
                    onChange={(e) => setForm({ ...form, watering_preference: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
                  >
                    <option value="low">Low (Drought-tolerant)</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High (Moisture-loving)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Sown from seed in March; prone to whiteflies."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-sage">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs font-bold">
                  Save Plant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plant Detail Modal */}
      {isDetailOpen && selectedPlant && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-sage">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-nature-100 text-nature-700 flex items-center justify-center overflow-hidden">
                  {selectedPlant.photo_path ? (
                    <img
                      src={`/uploads/${selectedPlant.photo_path}`}
                      alt={selectedPlant.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Sprout className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold font-heading text-stone-900 leading-tight">
                    {selectedPlant.name}
                  </h2>
                  <p className="text-xs text-stone-500 italic">{selectedPlant.species}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick stats banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-cream-50 p-2.5 rounded-xl border border-sage">
                <span className="text-[10px] text-stone-500 font-bold uppercase">Soil</span>
                <p className="font-semibold text-stone-800 capitalize mt-0.5">
                  {selectedPlant.soil_type}
                </p>
              </div>
              <div className="bg-cream-50 p-2.5 rounded-xl border border-sage">
                <span className="text-[10px] text-stone-500 font-bold uppercase">Container</span>
                <p className="font-semibold text-stone-800 capitalize mt-0.5">
                  {selectedPlant.container_type}
                </p>
              </div>
              <div className="bg-cream-50 p-2.5 rounded-xl border border-sage">
                <span className="text-[10px] text-stone-500 font-bold uppercase">Sunlight</span>
                <p className="font-semibold text-stone-800 capitalize mt-0.5">
                  {selectedPlant.sunlight}
                </p>
              </div>
              <div className="bg-cream-50 p-2.5 rounded-xl border border-sage">
                <span className="text-[10px] text-stone-500 font-bold uppercase">Water Pref</span>
                <p className="font-semibold text-stone-800 capitalize mt-0.5">
                  {selectedPlant.watering_preference}
                </p>
              </div>
            </div>

            {/* Photo upload and Actions */}
            <div className="p-4 bg-nature-50 border border-nature-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <label className="text-xs font-semibold text-nature-900 flex items-center gap-2 cursor-pointer hover:underline">
                <Upload className="w-4 h-4 text-nature-700" />
                <span>Upload / Change Plant Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(selectedPlant.id, e)}
                  className="hidden"
                />
              </label>

              {/* Water logging quick action */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={waterAmount}
                  onChange={(e) => setWaterAmount(Number(e.target.value))}
                  className="w-20 px-2 py-1.5 text-xs rounded-lg border border-sage bg-white text-center"
                />
                <span className="text-xs text-stone-500">ml</span>
                <button
                  onClick={() => handleWaterPlant(selectedPlant.id)}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  <Droplets className="w-3.5 h-3.5" />
                  <span>Log Watering</span>
                </button>
              </div>
            </div>

            {/* Watering History */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2 font-heading">
                Recent Watering Log
              </h3>
              {!selectedPlant.watering_history || selectedPlant.watering_history.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No waterings logged yet.</p>
              ) : (
                <div className="divide-y divide-sage border border-sage rounded-xl max-h-40 overflow-y-auto">
                  {selectedPlant.watering_history.map((w) => (
                    <div key={w.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Droplets className="w-3.5 h-3.5 text-water-500" />
                        <span className="font-semibold text-stone-800">
                          {w.amount_ml ? `${w.amount_ml} ml` : 'Standard watering'}
                        </span>
                        {w.method && <span className="text-stone-500">({w.method})</span>}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {new Date(w.watered_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with Delete */}
            <div className="pt-3 border-t border-sage flex items-center justify-between">
              <button
                onClick={() => handleDelete(selectedPlant.id)}
                className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Plant</span>
              </button>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
