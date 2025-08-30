import { GoogleGenAI, Type } from "@google/genai";
import type { UserData, CalculationResults, StructuredAdvice, CalorieResult } from './types';
import { ACTIVITY_LEVEL_OPTIONS, GOAL_OPTIONS, FOCUS_AREA_OPTIONS } from './constants';

const getLabel = (options: {value: string, label: string}[], value: string) => {
    return options.find(opt => opt.value === value)?.label || value;
};

export const getDietaryAdvice = async (
  userData: UserData,
  results: CalculationResults
): Promise<StructuredAdvice> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const activityLabel = getLabel(ACTIVITY_LEVEL_OPTIONS, userData.activityLevel);
  const goalLabel = getLabel(GOAL_OPTIONS, userData.goal);
  const focusLabel = getLabel(FOCUS_AREA_OPTIONS, userData.focusArea);

  const prompt = `
    Based on the user's data and calculated metabolic results, generate a personalized dietary and exercise plan in JSON format.
    The user's data is:
    - Age: ${userData.age}
    - Gender: ${userData.gender}
    - Height: ${userData.height} cm
    - Weight: ${userData.weight} kg
    - Activity Level: ${activityLabel}
    - Goal: ${goalLabel}
    - Fitness Focus Area: ${focusLabel}

    Their calculated metabolic results are:
    - Basal Metabolic Rate (BMR): ${Math.round(results.bmr)} calories/day
    - Total Daily Energy Expenditure (TDEE): ${Math.round(results.tdee)} calories/day
    - Target Daily Calorie Intake for Goal: ${Math.round(results.targetCalories)} calories/day

    Please adhere strictly to the JSON schema provided.

    **Important Instructions**:
    1.  Tailor the 'exerciseRecommendations' to the user's 'Fitness Focus Area'.
    2.  For each exercise, provide clear, numbered, step-by-step 'instructions' on how to perform it correctly.
    3.  If the user selects a specific focus area (not 'Overall Fat Loss'), the 'introduction' MUST include a brief, gentle explanation that spot reduction (losing fat from one specific area) is not possible, and the best strategy is overall fat loss combined with exercises to tone the target muscles.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      introduction: {
        type: Type.STRING,
        description: "A brief, encouraging introduction. If a specific focus area is chosen, this must explain that spot reduction is a myth and the plan combines overall fat loss with targeted toning."
      },
      mealPlan: {
        type: Type.ARRAY,
        description: "A sample one-day meal plan (Breakfast, Lunch, Dinner, Snacks) that aligns with the target calorie intake. Make the meal suggestions simple and healthy.",
        items: {
          type: Type.OBJECT,
          properties: {
            mealType: {
              type: Type.STRING,
              description: "The type of meal (e.g., 'Breakfast', 'Lunch', 'Dinner', 'Snack')."
            },
            description: {
              type: Type.STRING,
              description: "A description of the food for the meal."
            },
            estimatedCalories: {
              type: Type.NUMBER,
              description: "An estimated calorie count for the meal."
            }
          }
        }
      },
      exerciseRecommendations: {
        type: Type.ARRAY,
        description: "Suggest 3-4 types of exercises suitable for the user's goal and focus area. Briefly explain why each is beneficial.",
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "The name of the exercise or activity."
            },
            description: {
              type: Type.STRING,
              description: "A brief explanation of why this exercise is beneficial for the user's goal and focus area."
            },
            category: {
              type: Type.STRING,
              description: "The category of the exercise. Should be one of: 'Cardio', 'Strength', 'Flexibility', 'Other'."
            },
            instructions: {
              type: Type.ARRAY,
              description: "Step-by-step instructions on how to perform the exercise.",
              items: { type: Type.STRING }
            }
          }
        }
      },
      disclaimer: {
        type: Type.STRING,
        description: "A clear disclaimer that this is AI-generated advice, not medical advice, and the user should consult a healthcare professional before making significant lifestyle changes."
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error fetching or parsing dietary advice:", error);
    throw new Error("Sorry, I couldn't generate advice at this time. The model may have returned an invalid format. Please try again later.");
  }
};

export const getCalorieEstimate = async (foodQuery: string): Promise<CalorieResult> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Provide a calorie estimate for the following food item: "${foodQuery}". Return the result in a JSON object.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            foodItem: {
                type: Type.STRING,
                description: "The name of the food item, correctly identified from the user query."
            },
            estimatedCalories: {
                type: Type.NUMBER,
                description: "The estimated number of calories for the food item and quantity."
            }
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error fetching or parsing calorie estimate:", error);
        throw new Error("Sorry, I couldn't estimate the calories for that item. Please try a different query.");
    }
};