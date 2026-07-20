/**
 * Innovation 9: Progressive Onboarding with Gamification
 * XP system, badges, completion meter, streak tracking
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Achievement { id: string; title: string; description: string; icon: string; xp: number; unlocked: boolean; unlockedAt?: Date; }
interface OnboardingStep { id: string; title: string; description: string; xp: number; completed: boolean; action?: string; }

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-search', title: 'Explorer', description: 'Performed your first property search', icon: '🔍', xp: 50, unlocked: false },
  { id: 'first-save', title: 'Collector', description: 'Saved your first property', icon: '❤️', xp: 75, unlocked: false },
  { id: 'profile-complete', title: 'Identified', description: 'Completed your profile', icon: '✅', xp: 100, unlocked: false },
  { id: 'first-tour', title: 'Visitor', description: 'Scheduled your first property tour', icon: '🏠', xp: 150, unlocked: false },
  { id: 'kyc-complete', title: 'Verified', description: 'Completed KYC verification', icon: '🛡️', xp: 200, unlocked: false },
  { id: 'first-offer', title: 'Negotiator', description: 'Made your first offer', icon: '🤝', xp: 300, unlocked: false },
  { id: 'streak-7', title: 'Dedicated', description: '7-day login streak', icon: '🔥', xp: 250, unlocked: false },
  { id: 'power-user', title: 'Power User', description: 'Used 10 different features', icon: '⚡', xp: 500, unlocked: false },
];

const LEVELS = [
  { level: 1, title: 'Newcomer', minXP: 0, maxXP: 200 },
  { level: 2, title: 'Browser', minXP: 200, maxXP: 500 },
  { level: 3, title: 'Searcher', minXP: 500, maxXP: 1000 },
  { level: 4, title: 'Hunter', minXP: 1000, maxXP: 2000 },
  { level: 5, title: 'Investor', minXP: 2000, maxXP: 5000 },
  { level: 6, title: 'Expert', minXP: 5000, maxXP: Infinity },
];

function getCurrentLevel(xp: number) {
  return LEVELS.findLast(l => xp >= l.minXP) || LEVELS[0];
}

interface OnboardingGamificationProps {
  userId?: string;
  initialXP?: number;
  completedSteps?: string[];
  onStepComplete?: (stepId: string, xpEarned: number) => void;
}

export function OnboardingGamification({ userId, initialXP = 125, completedSteps = ['first-search'], onStepComplete }: OnboardingGamificationProps) {
  const [xp, setXp] = useState(initialXP);
  const [achievements, setAchievements] = useState<Achievement[]>(
    ACHIEVEMENTS.map(a => ({ ...a, unlocked: completedSteps.includes(a.id) }))
  );
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [streak, setStreak] = useState(3);
  const [showAll, setShowAll] = useState(false);

  const currentLevel = getCurrentLevel(xp);
  const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
  const levelProgress = nextLevel
    ? ((xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100
    : 100;

  const unlockAchievement = useCallback((achievementId: string) => {
    setAchievements(prev => prev.map(a => {
      if (a.id !== achievementId || a.unlocked) return a;
      const updated = { ...a, unlocked: true, unlockedAt: new Date() };
      setXp(x => x + a.xp);
      setNewAchievement(updated);
      setTimeout(() => setNewAchievement(null), 3000);
      onStepComplete?.(achievementId, a.xp);
      return updated;
    }));
  }, [onStepComplete]);

  const steps: OnboardingStep[] = [
    { id: 'first-search', title: 'Search for properties', description: 'Use the search bar to find your dream home', xp: 50, completed: achievements.find(a => a.id === 'first-search')?.unlocked || false, action: '/search' },
    { id: 'first-save', title: 'Save a property', description: 'Heart a property you like', xp: 75, completed: achievements.find(a => a.id === 'first-save')?.unlocked || false },
    { id: 'profile-complete', title: 'Complete your profile', description: 'Add your preferences and contact details', xp: 100, completed: achievements.find(a => a.id === 'profile-complete')?.unlocked || false, action: '/profile' },
    { id: 'first-tour', title: 'Schedule a tour', description: 'Book a viewing for a property', xp: 150, completed: achievements.find(a => a.id === 'first-tour')?.unlocked || false },
    { id: 'kyc-complete', title: 'Verify your identity', description: 'Complete KYC to unlock all features', xp: 200, completed: achievements.find(a => a.id === 'kyc-complete')?.unlocked || false, action: '/kyc' },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const overallProgress = (completedCount / steps.length) * 100;

  return (
    <div className="space-y-6">
      {/* Achievement unlock toast */}
      <AnimatePresence>
        {newAchievement && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 right-4 z-50 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-xl shadow-2xl max-w-xs"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{newAchievement.icon}</span>
              <div>
                <p className="font-bold text-sm">Achievement Unlocked!</p>
                <p className="font-semibold">{newAchievement.title}</p>
                <p className="text-xs opacity-90">+{newAchievement.xp} XP</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs opacity-80">Level {currentLevel.level}</p>
            <p className="text-xl font-bold">{currentLevel.title}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{xp.toLocaleString()}</p>
            <p className="text-xs opacity-80">XP</p>
          </div>
        </div>
        <Progress value={levelProgress} className="h-2 bg-white/20" aria-label={`Level progress: ${Math.round(levelProgress)}%`} />
        {nextLevel && (
          <p className="text-xs opacity-70 mt-1">{(nextLevel.minXP - xp).toLocaleString()} XP to {nextLevel.title}</p>
        )}

        {/* Streak */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/20">
          <span className="text-xl">🔥</span>
          <span className="text-sm font-semibold">{streak}-day streak</span>
          <span className="text-xs opacity-70 ml-auto">Come back tomorrow!</span>
        </div>
      </div>

      {/* Onboarding checklist */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Getting Started</h3>
          <span className="text-xs text-muted-foreground">{completedCount}/{steps.length} complete</span>
        </div>
        <Progress value={overallProgress} className="h-1.5 mb-3" aria-label={`Onboarding progress: ${completedCount} of ${steps.length} steps`} />
        <div className="space-y-2">
          {steps.map(step => (
            <motion.div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${step.completed ? 'bg-green-50 border-green-200' : 'bg-card border-border'}`}
              whileHover={{ scale: 1.01 }}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.completed ? 'bg-green-500 text-white' : 'border-2 border-muted-foreground'}`}>
                {step.completed ? '✓' : ''}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.completed ? 'line-through text-muted-foreground' : ''}`}>{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">+{step.xp} XP</Badge>
              {!step.completed && (
                <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => unlockAchievement(step.id)}>
                  {step.action ? 'Go' : 'Done'}
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Achievements</h3>
          <button onClick={() => setShowAll(!showAll)} className="text-xs text-primary">{showAll ? 'Show less' : 'Show all'}</button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {(showAll ? achievements : achievements.slice(0, 8)).map(a => (
            <motion.div
              key={a.id}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${a.unlocked ? 'bg-yellow-50 border-yellow-200' : 'bg-muted/50 border-transparent opacity-50'}`}
              title={`${a.title}: ${a.description}`}
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-2xl">{a.icon}</span>
              <p className="text-xs font-medium leading-tight">{a.title}</p>
              {a.unlocked && <Badge className="text-xs bg-yellow-400 text-yellow-900 py-0">+{a.xp}</Badge>}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OnboardingGamification;
