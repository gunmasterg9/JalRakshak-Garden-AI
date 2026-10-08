import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Droplets,
  BookOpen,
  Sprout,
  RefreshCw,
  Sparkles,
  X,
  Info,
} from 'lucide-react';
import { fetchPlants, analyzePlantPhoto, createJournalEntry } from '../api';
import { Plant, DiagnosisItem } from '../types';
import { useGarden } from '../context/GardenContext';

export const PlantDoctor: React.FC = () => {
  const { t } = useGarden();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [plantContext, setPlantContext] = useState<string>('Tomato');
  const [symptoms, setSymptoms] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisItem | null>(null);
  const [savedToJournal, setSavedToJournal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    fetchPlants()
      .then((data) => setPlants(data))
      .catch((e) => console.error(e));
  }, []);

  const handleSelectPlant = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPlantId(val);
    if (val) {
      const p = plants.find((x) => x.id === Number(val));
      if (p) setPlantContext(p.name);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 7 * 1024 * 1024) {
      alert('Please upload an image smaller than 7 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setDiagnosis(null);
    setErrorMessage('');
  };

  const handleAnalyze = async () => {
    if (!imagePreview && !symptoms.trim()) {
      setErrorMessage('Please either upload a plant photo or enter observed symptoms.');
      return;
    }
    setAnalyzing(true);
    setErrorMessage('');
    setDiagnosis(null);
    setSavedToJournal(false);

    try {
      const res = await analyzePlantPhoto({
        image_data_url: imagePreview,
        plant_id: selectedPlantId ? Number(selectedPlantId) : null,
        plant_context: plantContext,
        location: 'Gujarat, India',
        symptoms: symptoms,
      });
      setDiagnosis(res);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Diagnosis failed. Check that Ollama or backend is running.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveToJournal = async () => {
    if (!diagnosis) return;
    try {
      await createJournalEntry({
        plant_id: selectedPlantId ? Number(selectedPlantId) : null,
        entry_type: 'pest',
        title: `Doctor Diagnosis: ${diagnosis.plant_identification || plantContext}`,
        note: `Observed Symptoms: ${diagnosis.observed_symptoms}\nSuspected Causes: ${diagnosis.possible_causes}\nRemedies: ${diagnosis.recommended_actions}`,
        recommendation: diagnosis.watering_advice,
      });
      setSavedToJournal(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-nature-700 flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-stone-900">
            {t.plantDoctor}
          </h1>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Private, local AI plant diagnosis. Photo observations and symptom checks run on your own machine.
        </p>
      </div>

      {/* Safety Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <p className="font-bold">Cautionary Botanical AI Principle:</p>
          <p className="mt-0.5 text-amber-800">
            Photos cannot guarantee disease certainty. We distinguish visible symptoms from suspected causes
            and recommend safe, non-toxic organic practices (mulching, adjusting water, manual pruning).
            Never apply harsh pesticides based solely on automated image classification.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Upload & Inputs */}
        <div className="garden-card p-6 space-y-4">
          <h2 className="text-base font-bold font-heading text-stone-900">
            1. Plant & Symptoms Context
          </h2>

          {/* Plant selection */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Select Monitored Plant (or enter custom)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedPlantId}
                onChange={handleSelectPlant}
                className="px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
              >
                <option value="">-- Choose from Garden --</option>
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={plantContext}
                onChange={(e) => setPlantContext(e.target.value)}
                placeholder="or specify plant name..."
                className="px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50"
              />
            </div>
          </div>

          {/* Photo Dropzone */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Plant Photo (Leaves, Stem, or Soil)
            </label>
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-sage max-h-64 bg-black/5 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Plant preview"
                  className="max-h-64 w-auto object-contain"
                />
                <button
                  onClick={() => setImagePreview('')}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-900/60 text-white hover:bg-stone-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-sage hover:border-nature-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-cream-50 hover:bg-cream-100 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-nature-100 text-nature-700 flex items-center justify-center mb-2">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-stone-800">
                  Upload or Snap a Photo
                </span>
                <span className="text-[11px] text-stone-500 mt-1">
                  JPG, PNG, or WEBP up to 7 MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Symptoms description */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Observed Symptoms (What looks wrong?)
            </label>
            <textarea
              rows={3}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. Lower leaves are turning yellow with brown crunchy edges. Top soil is completely dry."
              className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50 focus:bg-white"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="btn-primary w-full text-xs font-bold py-3 justify-center"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing on Local AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-300" />
                <span>Run AI Diagnosis</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Structured Diagnosis Output */}
        <div className="space-y-4">
          {!diagnosis ? (
            <div className="garden-card p-12 text-center flex flex-col items-center justify-center h-full min-h-[380px] text-stone-400">
              <Stethoscope className="w-12 h-12 stroke-[1.5] mb-3 text-stone-300" />
              <h3 className="text-sm font-bold text-stone-700 font-heading">
                Diagnosis findings will appear here
              </h3>
              <p className="text-xs text-stone-400 max-w-xs mt-1">
                Upload a photo or describe symptoms. We'll run local inference and produce safe,
                actionable care recommendations.
              </p>
            </div>
          ) : (
            <div className="garden-card p-6 space-y-4 border-nature-300">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-sage">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-nature-100 text-nature-800 px-2 py-0.5 rounded-full">
                      {diagnosis.source || 'Local AI'}
                    </span>
                    {diagnosis.needs_expert_review && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        Needs Careful Monitoring
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold font-heading text-stone-900 mt-1">
                    {diagnosis.plant_identification || plantContext}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-500 uppercase font-semibold">
                    Confidence
                  </span>
                  <div className="text-xs font-bold capitalize text-nature-700">
                    {diagnosis.confidence || 'Moderate'}
                  </div>
                </div>
              </div>

              {diagnosis.vision_note && (
                <div className="p-3 rounded-xl bg-stone-50 text-stone-600 text-[11px] border border-stone-200">
                  <Info className="w-3.5 h-3.5 inline mr-1 text-stone-500" />
                  {diagnosis.vision_note}
                </div>
              )}

              {/* Observed Symptoms vs Possible Causes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-cream-50 p-3 rounded-xl border border-sage">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">
                    Visible Symptoms
                  </span>
                  <p className="text-stone-800 font-medium">
                    {diagnosis.observed_symptoms || 'Visual observation completed.'}
                  </p>
                </div>
                <div className="bg-cream-50 p-3 rounded-xl border border-sage">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">
                    Suspected Causes
                  </span>
                  <p className="text-stone-800 font-medium">
                    {diagnosis.possible_causes || 'Environmental or watering factor.'}
                  </p>
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="p-3.5 bg-nature-50 border border-nature-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-nature-900">
                  <CheckCircle2 className="w-4 h-4 text-nature-700" />
                  <span>Recommended Safe Actions</span>
                </div>
                <p className="text-xs text-nature-900 font-medium leading-relaxed pl-5 whitespace-pre-line">
                  {diagnosis.recommended_actions}
                </p>
              </div>

              {/* Watering Advice */}
              {diagnosis.watering_advice && (
                <div className="p-3.5 bg-water-50 border border-water-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-water-800">
                    <Droplets className="w-4 h-4 text-water-600" />
                    <span>Watering & Moisture Advice</span>
                  </div>
                  <p className="text-xs text-water-900 font-medium leading-relaxed pl-5">
                    {diagnosis.watering_advice}
                  </p>
                </div>
              )}

              {/* Prevention Tips */}
              {diagnosis.prevention_tips && (
                <div className="text-xs text-stone-600">
                  <span className="font-bold text-stone-800 block mb-0.5">
                    Prevention & Long-term Care:
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    {diagnosis.prevention_tips}
                  </p>
                </div>
              )}

              {/* Save to Journal */}
              <div className="pt-3 border-t border-sage flex items-center justify-between">
                <span className="text-[11px] text-stone-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-nature-600" /> Kept 100% on this device
                </span>

                {savedToJournal ? (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Saved in Journal
                  </span>
                ) : (
                  <button
                    onClick={handleSaveToJournal}
                    className="btn-secondary text-xs font-bold py-1.5 px-3"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Save to Journal</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
