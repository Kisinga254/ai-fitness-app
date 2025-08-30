export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export enum ActivityLevel {
  SEDENTARY = 'sedentary',
  LIGHT = 'light',
  MODERATE = 'moderate',
  ACTIVE = 'active',
  VERY_ACTIVE = 'very_active',
}

export enum Goal {
  MAINTAIN = 'maintain',
  MILD_LOSS = 'mild_loss',
  WEIGHT_LOSS = 'weight_loss',
  EXTREME_LOSS = 'extreme_loss',
}

export enum FocusArea {
  OVERALL = 'overall',
  CORE = 'core',
  ARMS = 'arms',
  LEGS = 'legs',
}

export interface UserData {
  age: number;
  gender: Gender;
  height: number;
  weight: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  focusArea: FocusArea;
}

export interface CalculationResults {
  bmr: number;
  tdee: number;
  targetCalories: number;
}

export type ExerciseCategory = 'Cardio' | 'Strength' | 'Flexibility' | 'Other';

export interface Meal {
  mealType: string;
  description: string;
  estimatedCalories: number;
}

export interface Exercise {
  name: string;
  description: string;
  category: ExerciseCategory;
  instructions: string[];
}

export interface StructuredAdvice {
  introduction: string;
  mealPlan: Meal[];
  exerciseRecommendations: Exercise[];
  disclaimer: string;
}

export interface CalorieResult {
    foodItem: string;
    estimatedCalories: number;
}

export interface FoodLogItem extends CalorieResult {
    id: number;
}