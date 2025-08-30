import React, { useState, useCallback, useMemo } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ACTIVITY_LEVEL_FACTORS, GOAL_CALORIE_MODIFIERS, ACTIVITY_LEVEL_OPTIONS, GOAL_OPTIONS, FOCUS_AREA_OPTIONS } from './constants';
import { getDietaryAdvice, getCalorieEstimate } from './geminiService';
import type { UserData, CalculationResults, StructuredAdvice, ExerciseCategory, Meal, Exercise, CalorieResult, FoodLogItem } from './types';
import { Gender, ActivityLevel, Goal, FocusArea } from './types';

// --- UI Sub-components ---
interface InputProps {
  label: string;
  id: string;
  type: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  unit?: string;
}

const InputField: React.FC<InputProps> = ({ label, id, unit, ...props }) => (
  <div className="flex flex-col">
    <label htmlFor={id} className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
    <div className="relative">
      <input
        id={id}
        className={`w-full pl-3 py-2 text-slate-800 bg-white dark:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${unit ? 'pr-12' : 'pr-3'}`}
        {...props}
      />
      {unit && <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-500 dark:text-slate-400">{unit}</span>}
    </div>
  </div>
);

interface SelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}

const SelectField: React.FC<SelectProps> = ({ label, id, value, onChange, options }) => (
  <div className="flex flex-col">
    <label htmlFor={id} className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      className="w-full p-2 text-slate-800 bg-white dark:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition appearance-none bg-no-repeat"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: 'right 0.5rem center',
        backgroundSize: '1.5em 1.5em',
      }}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);

const Spinner: React.FC<{small?: boolean}> = ({ small = false }) => (
  <div className={`flex justify-center items-center ${small ? 'p-2' : 'p-8'}`}>
    <div className={`border-2 border-slate-200 rounded-full animate-spin ${small ? 'w-6 h-6 border-t-indigo-500' : 'w-12 h-12 border-4 border-t-indigo-600'}`}></div>
  </div>
);

const ExerciseIcon: React.FC<{ category: ExerciseCategory }> = ({ category }) => {
    let icon;
    switch (category) {
        case 'Cardio':
            icon = (
                <div className="bg-rose-100 dark:bg-rose-900/50 p-3 rounded-full">
                    <svg className="w-8 h-8 text-rose-600 dark:text-rose-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.648l.259 1.035L17.415 20.648a3.375 3.375 0 00-2.455-2.456L13.926 18l1.036.259a3.375 3.375 0 002.455 2.456z" />
                    </svg>
                </div>
            );
            break;
        case 'Strength':
            icon = (
                <div className="bg-sky-100 dark:bg-sky-900/50 p-3 rounded-full">
                    <svg className="w-8 h-8 text-sky-600 dark:text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                </div>
            );
            break;
        case 'Flexibility':
            icon = (
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-full">
                    <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                </div>
            );
            break;
        default:
            icon = (
                <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full">
                    <svg className="w-8 h-8 text-slate-600 dark:text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                </div>
            );
    }
    return icon;
};

const MealPlanTable: React.FC<{ plan: Meal[] }> = ({ plan }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-700">
                <tr>
                    <th className="p-3 text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-200">Meal</th>
                    <th className="p-3 text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-200">Suggestion</th>
                    <th className="p-3 text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-200 text-right">Calories (est.)</th>
                </tr>
            </thead>
            <tbody>
                {plan.map((meal, index) => (
                    <tr key={index} className="border-b border-slate-200 dark:border-slate-700">
                        <td className="p-3 text-sm font-medium text-slate-900 dark:text-slate-100">{meal.mealType}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-300">{meal.description}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-300 text-right">{meal.estimatedCalories}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const ExerciseCards: React.FC<{ recommendations: Exercise[]; onCardClick: (exercise: Exercise) => void; }> = ({ recommendations, onCardClick }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((rec, index) => (
            <button key={index} onClick={() => onCardClick(rec)} className="text-left bg-slate-50 dark:bg-slate-700/50 rounded-lg p-5 flex flex-col items-start space-y-3 hover:ring-2 hover:ring-indigo-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <ExerciseIcon category={rec.category} />
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">{rec.name}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">{rec.description}</p>
            </button>
        ))}
    </div>
);

const ExerciseModal: React.FC<{ exercise: Exercise | null; onClose: () => void; }> = ({ exercise, onClose }) => {
    if (!exercise) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{exercise.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{exercise.category}</p>
                        </div>
                        <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="space-y-4">
                        <p className="text-slate-600 dark:text-slate-300">{exercise.description}</p>
                        <div>
                            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Instructions:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-300">
                                {exercise.instructions.map((step, i) => <li key={i}>{step}</li>)}
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CalorieTracker: React.FC = () => {
    const [foodQuery, setFoodQuery] = useState('');
    const [foodLog, setFoodLog] = useState<FoodLogItem[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [calcError, setCalcError] = useState('');

    const handleCalcSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!foodQuery.trim()) return;
        setIsCalculating(true);
        setCalcError('');
        try {
            const result = await getCalorieEstimate(foodQuery);
            const newItem: FoodLogItem = { ...result, id: Date.now() };
            setFoodLog(prevLog => [...prevLog, newItem]);
            setFoodQuery(''); // Clear input after adding
        } catch (err: any) {
            setCalcError(err.message);
        } finally {
            setIsCalculating(false);
        }
    };

    const handleRemoveItem = (id: number) => {
        setFoodLog(prevLog => prevLog.filter(item => item.id !== id));
    };

    const handleClearAll = () => {
        setFoodLog([]);
        setFoodQuery('');
        setCalcError('');
    };

    const totalCalories = useMemo(() => {
        return foodLog.reduce((total, item) => total + item.estimatedCalories, 0);
    }, [foodLog]);
    
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8 mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Daily Calorie Tracker</h2>
        <form onSubmit={handleCalcSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-grow w-full">
            <InputField
              label="Food Item & Quantity"
              id="foodQuery"
              type="text"
              value={foodQuery}
              onChange={(e) => setFoodQuery(e.target.value)}
              placeholder="e.g., 1 apple"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button type="submit" disabled={isCalculating || !foodQuery} className="flex-grow h-10 inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition">
              {isCalculating ? <Spinner small /> : 'Add'}
            </button>
          </div>
        </form>
        {calcError && <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg text-sm">{calcError}</div>}
        
        {foodLog.length > 0 && (
            <div className="mt-6">
                <div className="flow-root">
                    <ul role="list" className="-my-4 divide-y divide-slate-200 dark:divide-slate-700">
                        {foodLog.map((item) => (
                            <li key={item.id} className="flex items-center justify-between py-4">
                                <p className="text-slate-800 dark:text-slate-200 capitalize">
                                    {item.foodItem}
                                </p>
                                <div className="flex items-center gap-4">
                                    <p className="font-semibold text-indigo-600 dark:text-indigo-400">{item.estimatedCalories} cal</p>
                                    <button onClick={() => handleRemoveItem(item.id)} className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition" aria-label={`Remove ${item.foodItem}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <button type="button" onClick={handleClearAll} className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition">
                      Clear All
                    </button>
                    <div className="text-right">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalCalories} Calories</p>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
};


// --- Main App Component ---
const App: React.FC = () => {
  const [userData, setUserData] = useState<UserData>({
    age: 25,
    gender: Gender.MALE,
    height: 180,
    weight: 75,
    activityLevel: ActivityLevel.MODERATE,
    goal: Goal.MAINTAIN,
    focusArea: FocusArea.OVERALL,
  });
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [advice, setAdvice] = useState<StructuredAdvice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setUserData(prev => ({ ...prev, [id]: e.target.type === 'number' ? parseFloat(value) || 0 : value }));
  }, []);

  const handleGenderChange = useCallback((gender: Gender) => {
    setUserData(prev => ({...prev, gender}));
  }, []);

  const handleReset = useCallback(() => {
    setUserData({
      age: 25,
      gender: Gender.MALE,
      height: 180,
      weight: 75,
      activityLevel: ActivityLevel.MODERATE,
      goal: Goal.MAINTAIN,
      focusArea: FocusArea.OVERALL,
    });
    setResults(null);
    setAdvice(null);
    setError('');
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResults(null);
    setAdvice(null);
    setError('');

    let bmr = (10 * userData.weight) + (6.25 * userData.height) - (5 * userData.age);
    bmr += (userData.gender === Gender.MALE ? 5 : -161);

    if (bmr <= 0) {
      setError("Please check your inputs. Calculated values are not realistic.");
      setIsLoading(false);
      return;
    }

    const tdee = bmr * ACTIVITY_LEVEL_FACTORS[userData.activityLevel];
    const targetCalories = tdee + GOAL_CALORIE_MODIFIERS[userData.goal];
    const newResults = { bmr, tdee, targetCalories };
    setResults(newResults);

    try {
      const aiAdvice = await getDietaryAdvice(userData, newResults);
      setAdvice(aiAdvice);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ExerciseModal exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-4 sm:p-6 lg:p-8 transition-colors duration-300">
        <main className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white">
              AI Fitness & Calorie <span className="text-indigo-600 dark:text-indigo-400">Advisor</span>
            </h1>
            <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
              Your personal AI-powered health and fitness companion.
            </p>
          </header>

          <CalorieTracker />

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Your Personalized Plan</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="Age" id="age" type="number" value={userData.age} onChange={handleInputChange} placeholder="e.g., 25" unit="years" />
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-md">
                    <button type="button" onClick={() => handleGenderChange(Gender.MALE)} className={`px-4 py-2 text-sm font-semibold rounded-md transition ${userData.gender === Gender.MALE ? 'bg-indigo-600 text-white shadow' : 'text-slate-700 dark:text-slate-200'}`}>Male</button>
                    <button type="button" onClick={() => handleGenderChange(Gender.FEMALE)} className={`px-4 py-2 text-sm font-semibold rounded-md transition ${userData.gender === Gender.FEMALE ? 'bg-indigo-600 text-white shadow' : 'text-slate-700 dark:text-slate-200'}`}>Female</button>
                  </div>
                </div>
                <InputField label="Height" id="height" type="number" value={userData.height} onChange={handleInputChange} placeholder="e.g., 180" unit="cm" />
                <InputField label="Weight" id="weight" type="number" value={userData.weight} onChange={handleInputChange} placeholder="e.g., 75" unit="kg" />
              </div>
              <SelectField label="Activity Level" id="activityLevel" value={userData.activityLevel} onChange={handleInputChange} options={ACTIVITY_LEVEL_OPTIONS} />
              <SelectField label="Your Goal" id="goal" value={userData.goal} onChange={handleInputChange} options={GOAL_OPTIONS} />
              <SelectField label="Focus Area" id="focusArea" value={userData.focusArea} onChange={handleInputChange} options={FOCUS_AREA_OPTIONS} />
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button type="submit" disabled={isLoading} className="w-full sm:w-auto flex-grow justify-center inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition">
                  {isLoading ? 'Calculating...' : 'Get My Plan'}
                </button>
                <button type="button" onClick={handleReset} className="w-full sm:w-auto justify-center inline-flex items-center px-6 py-3 border border-slate-300 dark:border-slate-600 text-base font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition">
                  Reset
                </button>
              </div>
            </form>
          </div>

          {error && <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg">{error}</div>}
          {isLoading && !results && <Spinner />}

          {results && (
            <div className="mt-8 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Your Results</h2>
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${userData.goal !== Goal.MAINTAIN ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 text-center`}>
                  <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">BMR</h3>
                    <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{Math.round(results.bmr)}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Calories/day</p>
                  </div>
                  <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">TDEE</h3>
                    <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{Math.round(results.tdee)}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Calories/day</p>
                  </div>
                   {userData.goal !== Goal.MAINTAIN && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/50 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <h3 className="text-sm font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider">Calorie Deficit</h3>
                      <p className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">{Math.abs(GOAL_CALORIE_MODIFIERS[userData.goal])}</p>
                      <p className="text-sm text-orange-500 dark:text-orange-500">Calories/day</p>
                    </div>
                  )}
                  <div className="p-4 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-lg">
                    <h3 className="text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">Target Intake</h3>
                    <p className="text-3xl font-extrabold text-green-600 dark:text-green-400">{Math.round(results.targetCalories)}</p>
                    <p className="text-sm text-green-500 dark:text-green-500">Calories/day</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Your AI-Powered Plan</h2>
                {isLoading && !advice ? <Spinner /> : advice ? (
                  <div className="space-y-8">
                    <p className="text-slate-600 dark:text-slate-300">{advice.introduction}</p>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">Sample Meal Plan</h3>
                      <MealPlanTable plan={advice.mealPlan} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">Exercise Recommendations</h3>
                      <ExerciseCards recommendations={advice.exerciseRecommendations} onCardClick={setSelectedExercise} />
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">{advice.disclaimer}</p>
                    </div>
                  </div>
                ) : error ? null : <p>Generating your personalized plan...</p>}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default App;