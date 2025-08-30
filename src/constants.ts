import { ActivityLevel, Goal, FocusArea } from './types';

export const ACTIVITY_LEVEL_FACTORS: { [key in ActivityLevel]: number } = {
  [ActivityLevel.SEDENTARY]: 1.2,
  [ActivityLevel.LIGHT]: 1.375,
  [ActivityLevel.MODERATE]: 1.55,
  [ActivityLevel.ACTIVE]: 1.725,
  [ActivityLevel.VERY_ACTIVE]: 1.9,
};

export const GOAL_CALORIE_MODIFIERS: { [key in Goal]: number } = {
  [Goal.MAINTAIN]: 0,
  [Goal.MILD_LOSS]: -250,
  [Goal.WEIGHT_LOSS]: -500,
  [Goal.EXTREME_LOSS]: -1000,
};

export const ACTIVITY_LEVEL_OPTIONS = [
  { value: ActivityLevel.SEDENTARY, label: 'Sedentary (little or no exercise)' },
  { value: ActivityLevel.LIGHT, label: 'Lightly Active (1-3 days/week)' },
  { value: ActivityLevel.MODERATE, label: 'Moderately Active (3-5 days/week)' },
  { value: ActivityLevel.ACTIVE, label: 'Very Active (6-7 days/week)' },
  { value: ActivityLevel.VERY_ACTIVE, label: 'Extra Active (very hard exercise & physical job)' },
];

export const GOAL_OPTIONS = [
  { value: Goal.MAINTAIN, label: 'Maintain Weight' },
  { value: Goal.MILD_LOSS, label: 'Mild Weight Loss (~0.25 kg/week)' },
  { value: Goal.WEIGHT_LOSS, label: 'Weight Loss (~0.5 kg/week)' },
  { value: Goal.EXTREME_LOSS, label: 'Extreme Weight Loss (~1 kg/week)' },
];

export const FOCUS_AREA_OPTIONS = [
  { value: FocusArea.OVERALL, label: 'Overall Fat Loss' },
  { value: FocusArea.CORE, label: 'Core Strength & Toning (Belly Area)' },
  { value: FocusArea.ARMS, label: 'Arm & Shoulder Definition' },
  { value: FocusArea.LEGS, label: 'Leg Strength & Toning' },
];