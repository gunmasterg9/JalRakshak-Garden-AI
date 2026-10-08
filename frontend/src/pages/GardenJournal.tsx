import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Filter,
  Calendar,
  Sprout,
  Droplets,
  Flower2,
  Bug,
  Sparkles,
  BarChart2,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchJournal, createJournalEntry, fetchPlants } from '../api';
import { JournalEntry, Plant } from '../types';
import { useGarden } from '../context/GardenContext';

export const GardenJournal: React.FC = () => {
  const { t } = useGarden();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlantFilter, setSelectedPlantFilter] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    plant_id: '',
    entry_type: 'note',
    title: '',
    note: '',
    moisture: 'slightly dry',
  });

  const loadData = async () => {
    try {
      const [jData, pData] = await Promise.all([
        fetchJournal(
          selectedPlantFilter ? Number(selectedPlantFilter) : undefined,
          selectedTypeFilter || undefined
        ),
        fetchPlants(),
      ]);
      setEntries(jData);
      setPlants(pData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPlantFilter, selectedTypeFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.note.trim()) return;
    try {
      await createJournalEntry({
        plant_id: form.plant_id ? Number(form.plant_id) : null,
        entry_type: form.entry_type as any,
        title: form.title,
        note: form.note,
        moisture: form.moisture,
      });
      setIsAddOpen(false);
      setForm({
        plant_id: '',
        entry_type: 'note',
        title: '',
        note: '',
        moisture: 'slightly dry',
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'watering':
        return <Droplets className="w-4 h-4 text-water-600" />;
      case 'flowering':
        return <Flower2 className="w-4 h-4 text-amber-600" />;
      case 'pest':
        return <Bug className="w-4 h-4 text-red-600" />;
      case 'growth':
        return <Sprout className="w-4 h-4 text-nature-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-stone-600" />;
    }
  };

  // Compute entry distribution data for Recharts
  const entryTypeCounts = [
    { name: 'Notes', count: entries.filter((e) => e.entry_type === 'note').length },
    { name: 'Watering', count: entries.filter((e) => e.entry_type === 'watering').length },
    { name: 'Growth', count: entries.filter((e) => e.entry_type === 'growth').length },
    { name: 'Flowering', count: entries.filter((e) => e.entry_type === 'flowering').length },
    { name: 'Pest/Health', count: entries.filter((e) => e.entry_type === 'pest').length },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold font-heading text-stone-900">
              {t.gardenJournal}
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Chronological field journal kept locally in SQLite. Record growth milestones and seasonal changes.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="btn-primary text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>Add Observation</span>
        </button>
      </div>

      {/* Chart & Stats summary */}
      <div className="garden-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 font-heading">
            Observation Activity by Category
          </span>
          <span className="text-xs font-bold text-nature-700 bg-nature-100 px-2 py-0.5 rounded-full">
            {entries.length} Total Records
          </span>
        </div>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={entryTypeCounts} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#8A968B" fontSize={11} tickLine={false} />
              <YAxis stroke="#8A968B" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#174A32',
                  borderRadius: '8px',
                  color: '#FFF',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" fill="#237A4B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="garden-card p-4 flex flex-col sm:flex-row gap-3 items-center">
        <Filter className="w-4 h-4 text-stone-400 hidden sm:block" />
        <select
          value={selectedPlantFilter}
          onChange={(e) => setSelectedPlantFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-xl border border-sage text-xs bg-cream-50"
        >
          <option value="">All Plants</option>
          {plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={selectedTypeFilter}
          onChange={(e) => setSelectedTypeFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-xl border border-sage text-xs bg-cream-50"
        >
          <option value="">All Entry Types</option>
          <option value="note">General Note</option>
          <option value="watering">Watering</option>
          <option value="growth">Growth Update</option>
          <option value="flowering">Flowering / Fruit</option>
          <option value="pest">Pest / Disease</option>
        </select>
      </div>

      {/* Timeline Entries */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="garden-card p-12 text-center text-xs text-stone-400">
            No journal entries match your selection. Start by recording what you observed in the garden today!
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="garden-card p-5 space-y-2 border-l-4 border-l-nature-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center">
                    {getTypeIcon(entry.entry_type)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 font-heading">
                      {entry.title || entry.plant_name || 'Garden Observation'}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-stone-500">
                      <span>{entry.plant_name ? `Plant: ${entry.plant_name}` : 'General'}</span>
                      <span>•</span>
                      <span className="capitalize">{entry.entry_type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-stone-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(entry.created_at).toLocaleString()}</span>
                </div>
              </div>

              <p className="text-xs text-stone-700 leading-relaxed pl-9 whitespace-pre-line">
                {entry.note}
              </p>

              {entry.recommendation && (
                <div className="ml-9 p-2.5 rounded-lg bg-nature-50 border border-nature-200 text-xs text-nature-900 font-medium">
                  <span className="font-bold">Recommendation:</span> {entry.recommendation}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Observation Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold font-heading text-stone-900 pb-2 border-b border-sage">
              Record Field Observation
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Associated Plant
                  </label>
                  <select
                    value={form.plant_id}
                    onChange={(e) => setForm({ ...form, plant_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
                  >
                    <option value="">General Garden</option>
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Entry Type
                  </label>
                  <select
                    value={form.entry_type}
                    onChange={(e) => setForm({ ...form, entry_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
                  >
                    <option value="note">General Note</option>
                    <option value="watering">Watering Event</option>
                    <option value="growth">Growth Progress</option>
                    <option value="flowering">Flowering / Fruit</option>
                    <option value="pest">Pest / Sickness</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. First flower buds opened!"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Observation Note *
                </label>
                <textarea
                  rows={4}
                  required
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="What did you touch, notice, smell, or see in your garden today?"
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
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
