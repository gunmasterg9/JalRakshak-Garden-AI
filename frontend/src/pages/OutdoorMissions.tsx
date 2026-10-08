import React, { useEffect, useState } from 'react';
import {
  Compass,
  CheckCircle2,
  Flame,
  Award,
  Clock,
  Sparkles,
  TreePine,
  Sun,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { fetchTodayMission, completeMission, fetchBadges } from '../api';
import { DailyMissionResponse, Badge, Mission } from '../types';
import { useGarden } from '../context/GardenContext';

export const OutdoorMissions: React.FC = () => {
  const { t } = useGarden();
  const [todayData, setTodayData] = useState<DailyMissionResponse | null>(null);
  const [badgesData, setBadgesData] = useState<{ badges: Badge[]; total_completions: number } | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadMissions = async () => {
    try {
      const [tData, bData] = await Promise.all([fetchTodayMission(), fetchBadges()]);
      setTodayData(tData);
      setBadgesData(bData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadMissions();
  }, []);

  const handleComplete = async () => {
    if (!todayData?.mission || todayData.completed) return;
    setSubmitting(true);
    try {
      const updated = await completeMission(todayData.mission.id, notes);
      setTodayData(updated);
      setNotes('');
      // Reload badges
      const bData = await fetchBadges();
      setBadgesData(bData);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero: Touch Grass Theme */}
      <div className="bg-gradient-to-br from-emerald-800 to-nature-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-semibold mb-3 border border-white/10">
            <Compass className="w-3.5 h-3.5" />
            <span>Theme: Touch Grass · Screen-Free Challenge</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight">
            Step Outside. Feel the Soil.
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed">
            The core philosophy of JalRakshak is to make the screen the shortest part of your day.
            Spend 5-10 mindful minutes in the open air with your plants, inspect real leaves, and enjoy the sun.
          </p>

          <div className="mt-5 flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold">{todayData?.streak || 0} Day Streak</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
              <Award className="w-4 h-4 text-emerald-300" />
              <span className="text-xs font-bold">{badgesData?.total_completions || 0} Missions Completed</span>
            </div>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Today's Mission Card */}
      <div className="garden-card p-6 sm:p-8 space-y-5 border-2 border-nature-300 shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-sage">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold font-heading text-stone-900">
              Today's Outdoor Mission ({todayData?.date})
            </h2>
          </div>
          <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-emerald-100 text-nature-800">
            {todayData?.completed ? 'Completed Today!' : 'Pending Action'}
          </span>
        </div>

        {todayData?.mission ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-nature-700 font-bold uppercase tracking-wider">
                <span>{todayData.mission.category}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {todayData.mission.duration_minutes} minutes
                </span>
                <span>•</span>
                <span className="capitalize">{todayData.mission.difficulty}</span>
              </div>
              <h3 className="text-xl font-extrabold font-heading text-stone-900 mt-1">
                {todayData.mission.title}
              </h3>
              <p className="text-sm text-stone-700 mt-2 leading-relaxed">
                {todayData.mission.description}
              </p>
            </div>

            {todayData.completed ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-xs">Mission completed for today!</h4>
                  <p className="text-[11px] text-emerald-800">
                    You stepped away from the screen and connected with nature. Great job!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional: How did it go? Notice any pollinators, soil moisture, or new buds?"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-sage bg-cream-50 focus:bg-white"
                />
                <button
                  onClick={handleComplete}
                  disabled={submitting}
                  className="btn-primary w-full text-xs font-bold py-3 justify-center"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Recording...' : 'Mark Mission as Completed'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-stone-400">Loading daily mission...</div>
        )}
      </div>

      {/* Badges and Achievements */}
      <div className="garden-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600" />
          <h2 className="text-base font-bold font-heading text-stone-900">
            Gardening Badges & Milestones
          </h2>
        </div>
        <p className="text-xs text-stone-500">
          Gentle positive reinforcement with zero manipulative or guilt-based notifications.
        </p>

        {!badgesData?.badges || badgesData.badges.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-400 border border-dashed border-sage rounded-xl">
            Complete your first daily mission to unlock your first gardening badge!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {badgesData.badges.map((b) => (
              <div
                key={b.name}
                className="p-3.5 bg-cream-50 border border-sage rounded-2xl flex flex-col items-center text-center gap-1.5 shadow-sm"
              >
                <div className="text-2xl">{b.icon}</div>
                <span className="font-bold text-xs text-stone-800 font-heading">
                  {b.name}
                </span>
                <p className="text-[10px] text-stone-500 leading-tight">
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
