import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("DishKubre AI server is running!");
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function extractJsonObject(rawText) {
  const cleaned = String(rawText || "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.error("Raw model output without JSON:", rawText);
    throw new Error("Model response did not contain a JSON object.");
  }

  const jsonSlice = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonSlice);
  } catch (firstErr) {
    const repaired = jsonSlice
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/}\s*{/g, "},{")
      .replace(/]\s*\[/g, "],[")
      .replace(/"\s*\n\s*"/g, '",\n"')
      .replace(/"\s+"/g, '", "');

    try {
      return JSON.parse(repaired);
    } catch {
      console.error("Failed JSON slice around error:", jsonSlice.slice(0, 1200));
      throw firstErr;
    }
  }
}

function cleanStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function collectListValues(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.flatMap((item) => collectListValues(item));
  }
  if (typeof val === "string") {
    return val.split(/,|;|\n/);
  }
  if (typeof val === "object") {
    return Object.entries(val)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);
  }
  return [];
}

function normalizeProfile(reqBody = {}) {
  const {
    firstName = "",
    selectedConditions = [],
    otherCondition = "",
    selectedNutritionalNeeds = [],
    otherNutritionalNeed = "",
    selectedIngredients = [],
    otherIngredient = "",
    weeklyBudget = "",
    selectedSex = "",
    age = "",
  } = reqBody;

  const conditionsList = [
    ...collectListValues(selectedConditions),
    ...collectListValues(otherCondition),
  ]
    .map((s) => String(s).trim())
    .filter((s) => s && s.toLowerCase() !== "none");

  const nutritionList = [
    ...collectListValues(selectedNutritionalNeeds),
    ...collectListValues(otherNutritionalNeed),
  ]
    .map((s) => String(s).trim())
    .filter((s) => s && s.toLowerCase() !== "none");

  const ingredientsList = Array.from(
    new Set(
      [...collectListValues(selectedIngredients), ...collectListValues(otherIngredient)]
        .map((s) => String(s).trim())
        .filter((s) => s.length >= 2)
    )
  );

  const numericBudget = Number(String(weeklyBudget || "").replace(/[^0-9.]/g, ""));

  return {
    firstName: String(firstName || "").trim() || "User",
    age: String(age || "").trim() || "Not specified",
    selectedSex: String(selectedSex || "").trim() || "Not specified",
    weeklyBudget: Number.isFinite(numericBudget) && numericBudget > 0 ? numericBudget : 0,
    weeklyBudgetRaw: String(weeklyBudget || "").trim(),
    conditionsList,
    nutritionList,
    ingredientsList,
  };
}

function buildProfilePromptBlock(profile) {
  return `
User Profile:
- Name: ${profile.firstName}
- Age: ${profile.age}
- Sex: ${profile.selectedSex}
- Weekly Food Budget: ${profile.weeklyBudget > 0 ? `${profile.weeklyBudget} Php` : "Not specified"}
- Health Conditions / Allergies: ${profile.conditionsList.length > 0 ? profile.conditionsList.join(", ") : "None"}
- Nutritional Needs: ${profile.nutritionList.length > 0 ? profile.nutritionList.join(", ") : "None"}
- Available Ingredients: ${profile.ingredientsList.length > 0 ? profile.ingredientsList.join(", ") : "Common household staples"}
`.trim();
}

function getConditionAvoidanceRules(healthConditions) {
  const text = healthConditions.join(" ").toLowerCase();
  const rules = [];

  if (
    text.includes("hypertension") ||
    text.includes("high blood") ||
    text.includes("hpn")
  ) {
    rules.push({
      label: "hypertension / high blood pressure",
      avoidTerms: ["bagoong", "tuyo", "daing", "patis", "soy sauce", "processed", "canned"],
    });
  }

  if (
    text.includes("diabetes") ||
    text.includes("blood sugar") ||
    text.includes("pre-diabetes") ||
    text.includes("prediabetes")
  ) {
    rules.push({
      label: "diabetes / blood sugar control",
      avoidTerms: ["condensed milk", "refined sugar", "white sugar", "syrup", "sweetened"],
    });
  }

  if (
    text.includes("cholesterol") ||
    text.includes("heart") ||
    text.includes("cardiovascular")
  ) {
    rules.push({
      label: "heart / cholesterol health",
      avoidTerms: ["chicharon", "lechon", "lard", "deep-fried", "deep fried", "heavy cream"],
    });
  }

  return rules;
}

function isTightWeeklyBudget(profile) {
  if (profile.weeklyBudget > 0 && profile.weeklyBudget < 1500) return true;
  const lower = `${profile.weeklyBudgetRaw} ${profile.weeklyBudget}`.toLowerCase();
  return ["low", "tight", "tipid", "budget"].some((k) => lower.includes(k));
}

async function callGroqJson(systemPrompt, userPrompt, maxTokens = 8192) {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  const groqModel = "openai/gpt-oss-20b";

  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY is missing in environment variables.");
  }

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: groqModel,
      temperature: 0.7,
      max_completion_tokens: maxTokens,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const groqData = await groqRes.json();
  if (!groqRes.ok) {
    if (groqData?.error?.failed_generation) {
      console.error("Groq failed_generation:", groqData.error.failed_generation);
    }
    throw new Error(groqData?.error?.message || `Groq API error (${groqRes.status})`);
  }

  return extractJsonObject(groqData.choices?.[0]?.message?.content);
}

// ==================== VERIFIED FILIPINO RECIPE BANK ====================
const VERIFIED_DISHES = [
  {
    id: "arroz-caldo",
    name: "Arroz Caldo",
    mealTypes: ["Breakfast", "Lunch", "Dinner"],
    minutes: 35,
    calories: 360,
    estimatedCostPhp: 50,
    macros: { protein_g: 18, carbs_g: 52, fat_g: 8, sodium_mg: 380 },
    tags: ["iron", "protein", "budget", "low-fat", "no-shrimp", "no-peanut"],
    allergens: [],
    avoidFor: [],
    benefits: ["Warm, easily digestible energy", "Good source of lean protein"],
    image: "/images/dishes/arroz-caldo.jpeg",
    ingredients: [
      "1 cup glutinous rice or regular white rice, washed",
      "200 g chicken breast or thigh, cut into bite-sized pieces",
      "1 thumb-sized ginger, peeled and julienned",
      "3 cloves garlic, minced",
      "1 medium onion, chopped",
      "5 cups water or low-sodium chicken broth",
      "1 tbsp cooking oil",
      "1 tbsp fish sauce (patis) or salt to taste",
      "2 hard-boiled eggs, halved",
      "2 stalks spring onions, chopped",
    ],
    instructions: [
      "Heat cooking oil in a pot over medium heat. Sauté garlic, onion, and ginger for 2 minutes until fragrant.",
      "Add the chicken pieces and cook for 4 to 5 minutes until lightly browned.",
      "Stir in the washed rice and sauté for 1 minute to coat with the aromatics.",
      "Pour in the water or broth, bring to a boil, then lower heat to a simmer.",
      "Simmer uncovered for 20 to 25 minutes, stirring occasionally so the rice does not stick, until thick and tender.",
      "Season with fish sauce or salt to taste, then serve hot topped with halved boiled eggs and spring onions.",
    ],
  },
  {
    id: "champorado",
    name: "Champorado",
    mealTypes: ["Breakfast"],
    minutes: 25,
    calories: 340,
    estimatedCostPhp: 35,
    macros: { protein_g: 7, carbs_g: 62, fat_g: 6, sodium_mg: 95 },
    tags: ["iron", "budget", "low-sodium", "low-fat", "no-shrimp", "no-peanut"],
    allergens: ["milk"],
    avoidFor: ["diabetes"],
    benefits: ["Quick morning energy", "Naturally low in sodium"],
    image: "/images/dishes/champorado.jpeg",
    ingredients: [
      "1 cup glutinous rice (malagkit), washed",
      "4 cups water",
      "3 tbsp unsweetened cocoa powder or 2 tablea tablets",
      "2 tbsp brown sugar (adjust to taste)",
      "2 tbsp evaporated milk (optional, for drizzle)",
    ],
    instructions: [
      "Combine glutinous rice and water in a pot and bring to a boil over medium heat.",
      "Lower heat and simmer for 15 to 18 minutes, stirring occasionally until the rice is soft and thick.",
      "Dissolve the cocoa powder or tablea in a little warm water, then stir into the pot.",
      "Add brown sugar and simmer for another 3 minutes until well blended.",
      "Serve warm in bowls with a light drizzle of evaporated milk.",
    ],
  },
  {
    id: "tortang-talong",
    name: "Tortang Talong",
    mealTypes: ["Breakfast", "Lunch", "Dinner"],
    minutes: 20,
    calories: 290,
    estimatedCostPhp: 40,
    macros: { protein_g: 14, carbs_g: 18, fat_g: 18, sodium_mg: 260 },
    tags: ["protein", "iron", "folic acid", "budget", "low-sodium", "no-shrimp", "no-peanut"],
    allergens: ["egg"],
    avoidFor: [],
    benefits: ["High-quality egg protein", "Good source of dietary fiber"],
    image: "/images/dishes/tortang-talong.jpg",
    ingredients: [
      "2 medium Asian eggplants (talong)",
      "2 large eggs, beaten",
      "1/4 tsp salt",
      "1/4 tsp ground black pepper",
      "2 tbsp cooking oil",
    ],
    instructions: [
      "Grill or broil the eggplants over open flame or in a pan for 8 to 10 minutes until the skin is charred and the flesh is soft.",
      "Let cool slightly, peel off the charred skin while keeping the stems intact, and flatten the flesh gently with a fork.",
      "Season the beaten eggs with salt and black pepper in a shallow bowl, then dip each flattened eggplant to coat.",
      "Heat cooking oil in a skillet over medium heat and pan-fry each eggplant for 2 to 3 minutes per side until golden brown.",
      "Drain on paper towels and serve warm with steamed rice.",
    ],
  },
  {
    id: "tapsilog",
    name: "Tapsilog (Beef Tapa with Egg & Garlic Rice)",
    mealTypes: ["Breakfast", "Lunch"],
    minutes: 25,
    calories: 480,
    estimatedCostPhp: 75,
    macros: { protein_g: 26, carbs_g: 52, fat_g: 18, sodium_mg: 520 },
    tags: ["protein", "iron", "vitamin b12", "no-shrimp", "no-peanut"],
    allergens: ["egg", "soy"],
    avoidFor: ["hypertension", "high blood"],
    benefits: ["Rich in iron and vitamin B12", "High protein for sustained energy"],
    image: "/images/dishes/default-silog.jpeg",
    ingredients: [
      "200 g thinly sliced beef sirloin (tapa)",
      "1 tbsp low-sodium soy sauce",
      "1 tbsp calamansi juice or vinegar",
      "3 cloves garlic, minced (divided)",
      "1/4 tsp ground black pepper",
      "1 egg",
      "1 cup cooked rice",
      "1 tbsp cooking oil",
    ],
    instructions: [
      "Marinate the sliced beef in soy sauce, calamansi juice, half of the minced garlic, and black pepper for at least 15 minutes.",
      "Heat 1/2 tbsp oil in a pan over medium heat, fry the egg sunny-side up, and set aside.",
      "In the same pan, sauté the remaining garlic until golden, add cooked rice, and toss for 2 minutes to make sinangag.",
      "Add the remaining oil and pan-fry the marinated beef tapa for 3 to 4 minutes until browned and tender.",
      "Serve the beef tapa alongside garlic rice and fried egg.",
    ],
  },
  {
    id: "ginisang-monggo",
    name: "Ginisang Munggo",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 40,
    calories: 380,
    estimatedCostPhp: 45,
    macros: { protein_g: 19, carbs_g: 54, fat_g: 9, sodium_mg: 340 },
    tags: ["protein", "iron", "folic acid", "fiber", "budget", "low-fat", "no-shrimp", "no-peanut"],
    allergens: [],
    avoidFor: [],
    benefits: ["High in plant protein and fiber", "Rich in iron and folate"],
    image: "/images/dishes/ginisang-monggo.jpg",
    ingredients: [
      "1 cup dried mung beans (monggo), rinsed",
      "4 cups water",
      "100 g ground pork or chicken (optional)",
      "2 cloves garlic, minced",
      "1 small onion, chopped",
      "1 medium tomato, diced",
      "1 cup malunggay leaves or spinach",
      "1 tbsp cooking oil",
      "1 tbsp fish sauce (patis) or salt to taste",
    ],
    instructions: [
      "Boil the mung beans in 4 cups of water for 25 to 30 minutes until soft and split open. Set aside with the cooking liquid.",
      "In a separate pot, heat cooking oil over medium heat and sauté garlic, onion, and tomato for 3 minutes until softened.",
      "Add the ground meat (if using) and cook for 4 minutes until lightly browned.",
      "Pour in the boiled mung beans along with their broth and simmer for 5 minutes.",
      "Season with fish sauce or salt, stir in the malunggay leaves, and cook for 1 minute before serving.",
    ],
  },
  {
    id: "tinolang-manok",
    name: "Tinolang Manok",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 35,
    calories: 390,
    estimatedCostPhp: 65,
    macros: { protein_g: 28, carbs_g: 22, fat_g: 18, sodium_mg: 390 },
    tags: ["protein", "iron", "vitamin d", "budget", "low-fat", "no-shrimp", "no-peanut"],
    allergens: [],
    avoidFor: [],
    benefits: ["Lean chicken protein", "Nutrient-dense greens from malunggay"],
    image: "/images/dishes/tinolang-manok.jpg",
    ingredients: [
      "300 g chicken pieces (bone-in or thigh)",
      "1 thumb-sized ginger, sliced into strips",
      "3 cloves garlic, crushed",
      "1 medium onion, sliced",
      "1 medium chayote (sayote), peeled and wedged",
      "1 cup malunggay leaves",
      "4 cups water",
      "1 tbsp cooking oil",
      "1 tbsp fish sauce (patis) or salt to taste",
    ],
    instructions: [
      "Heat oil in a pot over medium heat. Sauté ginger, garlic, and onion for 2 minutes until aromatic.",
      "Add the chicken pieces and sauté for 5 minutes until the outer color changes.",
      "Pour in water, bring to a boil, skim off any scum, then simmer covered for 15 minutes until chicken is tender.",
      "Add the chayote wedges and simmer for 5 to 7 minutes until fork-tender.",
      "Season with fish sauce or salt, add the malunggay leaves, simmer for 1 minute, and serve hot.",
    ],
  },
  {
    id: "ginisang-ampalaya",
    name: "Ginisang Ampalaya with Egg",
    mealTypes: ["Breakfast", "Lunch", "Dinner"],
    minutes: 20,
    calories: 260,
    estimatedCostPhp: 45,
    macros: { protein_g: 13, carbs_g: 16, fat_g: 15, sodium_mg: 290 },
    tags: ["iron", "folic acid", "protein", "budget", "diabetes-friendly", "low-sodium", "no-shrimp", "no-peanut"],
    allergens: ["egg"],
    avoidFor: [],
    benefits: ["Low-glycemic vegetable dish", "Provides iron and egg protein"],
    image: "/images/dishes/ginisang-ampalaya.jpg",
    ingredients: [
      "1 medium bitter gourd (ampalaya), halved, seeded, and thinly sliced",
      "2 large eggs, beaten",
      "2 cloves garlic, minced",
      "1 small onion, sliced",
      "1 medium tomato, diced",
      "1 tbsp cooking oil",
      "1/2 tsp salt (plus 1 tsp for rubbing ampalaya)",
      "1/4 tsp ground black pepper",
    ],
    instructions: [
      "Rub the sliced ampalaya with 1 tsp salt, let sit for 5 minutes, then rinse well and squeeze out excess liquid to reduce bitterness.",
      "Heat cooking oil in a skillet over medium heat and sauté garlic, onion, and tomato for 2 to 3 minutes.",
      "Add the ampalaya slices and stir-fry for 3 to 4 minutes until crisp-tender.",
      "Season with 1/2 tsp salt and black pepper, then pour the beaten eggs evenly over the vegetables.",
      "Let the eggs set slightly for 30 seconds, toss gently until cooked through, and serve warm.",
    ],
  },
  {
    id: "ginataang-kalabasa-sitaw",
    name: "Ginataang Kalabasa at Sitaw",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 30,
    calories: 370,
    estimatedCostPhp: 55,
    macros: { protein_g: 14, carbs_g: 34, fat_g: 20, sodium_mg: 320 },
    tags: ["iron", "folic acid", "fiber", "budget", "no-shrimp", "no-peanut"],
    allergens: [],
    avoidFor: ["cholesterol", "heart"],
    benefits: ["Rich in vitamin A and fiber", "Hearty vegetable stew"],
    image: "/images/dishes/ginataang-kalabasa.jpg",
    ingredients: [
      "2 cups squash (kalabasa), peeled and cubed",
      "1 cup string beans (sitaw), cut into 2-inch lengths",
      "100 g ground pork or chicken",
      "1 cup coconut milk (gata)",
      "1/2 cup water",
      "2 cloves garlic, minced",
      "1 small onion, chopped",
      "1 tbsp cooking oil",
      "1 tbsp fish sauce (patis) or salt to taste",
    ],
    instructions: [
      "Heat oil in a pan over medium heat and sauté garlic and onion for 2 minutes.",
      "Add the ground meat and cook for 4 minutes until browned.",
      "Pour in the water and coconut milk, bring to a gentle simmer, then add the cubed squash.",
      "Simmer uncovered for 8 to 10 minutes until the squash is nearly tender.",
      "Add the string beans and simmer for another 4 minutes until tender-crisp. Season with fish sauce or salt and serve.",
    ],
  },
  {
    id: "chicken-adobo",
    name: "Chicken Adobo",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 35,
    calories: 440,
    estimatedCostPhp: 70,
    macros: { protein_g: 30, carbs_g: 12, fat_g: 28, sodium_mg: 580 },
    tags: ["protein", "iron", "vitamin b12", "no-shrimp", "no-peanut"],
    allergens: ["soy"],
    avoidFor: ["hypertension", "high blood"],
    benefits: ["High protein meal", "Simple pantry ingredients"],
    image: "/images/dishes/adobo.jpg",
    ingredients: [
      "350 g chicken thighs or drumsticks",
      "3 tbsp low-sodium soy sauce",
      "2 tbsp cane vinegar",
      "4 cloves garlic, crushed",
      "1/2 tsp whole black peppercorns",
      "2 dried bay leaves",
      "1/2 cup water",
      "1 tbsp cooking oil",
    ],
    instructions: [
      "Combine chicken, soy sauce, crushed garlic, peppercorns, and bay leaves in a bowl and marinate for 15 minutes.",
      "Heat oil in a pan over medium heat and sear the chicken pieces for 3 minutes per side.",
      "Pour in the remaining marinade and water, bring to a boil, then lower heat and simmer covered for 15 minutes.",
      "Add the vinegar without stirring for 2 minutes, then uncover and simmer for 5 minutes until the sauce reduces.",
      "Serve hot with steamed rice.",
    ],
  },
  {
    id: "sinigang-na-baboy",
    name: "Sinigang na Baboy",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 45,
    calories: 430,
    estimatedCostPhp: 80,
    macros: { protein_g: 25, carbs_g: 24, fat_g: 24, sodium_mg: 540 },
    tags: ["protein", "iron", "folic acid", "vitamin b12", "no-shrimp", "no-peanut"],
    allergens: [],
    avoidFor: ["hypertension", "high blood"],
    benefits: ["Rich in vitamins from mixed vegetables", "Good source of protein and iron"],
    image: "/images/dishes/sinigang.jpeg",
    ingredients: [
      "300 g lean pork cubes",
      "4 cups water",
      "1 medium tomato, quartered",
      "1 medium onion, quartered",
      "1 packet tamarind soup base (sinigang mix)",
      "1 cup kangkong (water spinach) leaves",
      "6 pieces okra",
      "1 small eggplant, sliced",
      "1 tbsp fish sauce (patis) to taste",
    ],
    instructions: [
      "In a pot, combine pork, water, tomato, and onion. Bring to a boil, skim off scum, and simmer covered for 25 to 30 minutes until pork is tender.",
      "Stir in the tamarind soup base and fish sauce.",
      "Add the eggplant and okra and simmer for 4 minutes.",
      "Add the kangkong leaves, turn off the heat, cover for 1 minute to wilt, and serve hot.",
    ],
  },
  {
    id: "chop-suey",
    name: "Chop Suey",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 25,
    calories: 320,
    estimatedCostPhp: 60,
    macros: { protein_g: 18, carbs_g: 28, fat_g: 14, sodium_mg: 420 },
    tags: ["protein", "iron", "folic acid", "fiber", "budget", "no-shrimp", "no-peanut"],
    allergens: ["soy"],
    avoidFor: [],
    benefits: ["High fiber and micronutrients", "Balanced lean protein and vegetables"],
    image: "/images/dishes/chop-suey.jpg",
    ingredients: [
      "150 g chicken breast, thinly sliced",
      "1 cup cabbage, chopped",
      "1 medium carrot, sliced diagonally",
      "1/2 cup green beans (sitaw), cut into 2-inch pieces",
      "1/2 chayote (sayote), sliced",
      "3 cloves garlic, minced",
      "1 small onion, sliced",
      "3/4 cup water or broth",
      "1 tbsp low-sodium soy sauce",
      "1 tsp cornstarch dissolved in 2 tbsp water",
      "1 tbsp cooking oil",
    ],
    instructions: [
      "Heat cooking oil in a wok or large pan over medium-high heat. Sauté garlic and onion for 1 minute.",
      "Add the sliced chicken and stir-fry for 3 to 4 minutes until cooked through.",
      "Add carrots, green beans, and chayote; stir-fry for 3 minutes.",
      "Pour in water and soy sauce, bring to a simmer, then add cabbage and cook for 2 minutes.",
      "Stir in the cornstarch slurry and toss for 1 minute until the sauce lightly glazes the vegetables.",
    ],
  },
  {
    id: "pork-picadillo",
    name: "Pork Picadillo (Giniling with Potatoes & Carrots)",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 30,
    calories: 420,
    estimatedCostPhp: 60,
    macros: { protein_g: 23, carbs_g: 36, fat_g: 19, sodium_mg: 380 },
    tags: ["protein", "iron", "vitamin b12", "budget", "no-shrimp", "no-peanut"],
    allergens: ["soy"],
    avoidFor: [],
    benefits: ["Budget-friendly ground meat protein", "Good source of iron and potassium"],
    image: "/images/dishes/default-picadillo.jpg",
    ingredients: [
      "250 g ground pork or lean ground beef",
      "1 medium potato, diced",
      "1 medium carrot, diced",
      "1 medium tomato, diced",
      "3 cloves garlic, minced",
      "1 small onion, chopped",
      "1/2 cup water",
      "1 tbsp low-sodium soy sauce",
      "1 tbsp cooking oil",
      "1/4 tsp ground black pepper",
    ],
    instructions: [
      "Heat oil in a pan over medium heat and sauté garlic, onion, and tomato for 2 minutes until softened.",
      "Add the ground meat, breaking it apart with a spatula, and cook for 5 minutes until browned.",
      "Stir in soy sauce, black pepper, and water, then bring to a simmer.",
      "Add the diced potatoes and carrots, cover, and simmer for 10 to 12 minutes until vegetables are tender and sauce reduces.",
      "Serve warm with steamed rice.",
    ],
  },
  {
    id: "paksiw-na-bangus",
    name: "Paksiw na Bangus",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 25,
    calories: 370,
    estimatedCostPhp: 65,
    macros: { protein_g: 26, carbs_g: 14, fat_g: 22, sodium_mg: 360 },
    tags: ["protein", "vitamin d", "calcium", "vitamin b12", "low-fat", "no-shrimp", "no-peanut"],
    allergens: ["fish"],
    avoidFor: [],
    benefits: ["Rich in vitamin D and omega-3s", "Good source of calcium and protein"],
    image: "/images/dishes/default-fish.jpg",
    ingredients: [
      "2 slices milkfish (bangus), cleaned",
      "1/3 cup cane vinegar",
      "1/2 cup water",
      "1 thumb-sized ginger, crushed",
      "3 cloves garlic, crushed",
      "1 small onion, sliced",
      "1 small eggplant, sliced",
      "1/2 tsp whole black peppercorns",
      "1/2 tsp salt",
    ],
    instructions: [
      "Arrange the ginger, garlic, onion, and eggplant slices at the bottom of a wide pan, then place the bangus slices on top.",
      "Pour in the vinegar and water, and season with salt and peppercorns.",
      "Bring to a boil over medium heat without stirring, then lower heat and simmer covered for 12 to 15 minutes until fish and eggplant are cooked.",
      "Serve warm with steamed rice.",
    ],
  },
  {
    id: "sarciadong-isda",
    name: "Sarciadong Isda (Fish in Tomato-Egg Sauce)",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 30,
    calories: 400,
    estimatedCostPhp: 65,
    macros: { protein_g: 27, carbs_g: 18, fat_g: 24, sodium_mg: 370 },
    tags: ["protein", "vitamin d", "calcium", "vitamin b12", "no-shrimp", "no-peanut"],
    allergens: ["fish", "egg"],
    avoidFor: [],
    benefits: ["High protein and vitamin D", "Lycopene-rich tomato sauce"],
    image: "/images/dishes/default-fish.jpg",
    ingredients: [
      "2 pan-fried fish fillets or bangus slices",
      "2 large eggs, beaten",
      "3 medium tomatoes, diced",
      "3 cloves garlic, minced",
      "1 medium onion, sliced",
      "1/2 cup water",
      "1 tbsp cooking oil",
      "1/2 tsp salt and 1/4 tsp pepper",
    ],
    instructions: [
      "Heat oil in a pan over medium heat and sauté garlic, onion, and diced tomatoes for 4 minutes until tomatoes soften into a sauce.",
      "Pour in water, season with salt and pepper, and bring to a simmer.",
      "Gently place the pan-fried fish into the tomato sauce and simmer for 2 minutes.",
      "Pour the beaten eggs over the fish and sauce, stir gently until softly set, and serve warm.",
    ],
  },
  {
    id: "misua-with-patola",
    name: "Almondigas / Misua Soup with Patola & Ground Meat",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 25,
    calories: 340,
    estimatedCostPhp: 50,
    macros: { protein_g: 19, carbs_g: 42, fat_g: 10, sodium_mg: 390 },
    tags: ["protein", "iron", "budget", "low-fat", "no-shrimp", "no-peanut"],
    allergens: ["wheat"],
    avoidFor: [],
    benefits: ["Light, comforting broth", "Balanced carbs and lean protein"],
    image: "/images/dishes/default-soup.jpg",
    ingredients: [
      "150 g ground pork or chicken",
      "1 small bundle misua noodles",
      "1 medium sponge gourd (patola) or chayote, peeled and sliced",
      "3 cloves garlic, minced",
      "1 small onion, chopped",
      "4 cups water or low-sodium broth",
      "1 tbsp cooking oil",
      "1 tbsp fish sauce (patis) or salt to taste",
    ],
    instructions: [
      "Heat oil in a pot over medium heat and sauté garlic and onion for 2 minutes.",
      "Add the ground meat and cook for 4 minutes until browned.",
      "Pour in water or broth and bring to a boil, then add sliced patola and simmer for 3 minutes.",
      "Season with fish sauce or salt, drop in the misua noodles, and simmer for 1 to 2 minutes until noodles soften. Serve immediately.",
    ],
  },
  {
    id: "ginisang-sayote",
    name: "Ginisang Sayote",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 25,
    calories: 310,
    estimatedCostPhp: 50,
    macros: { protein_g: 17, carbs_g: 18, fat_g: 18, sodium_mg: 340 },
    tags: ["iron", "protein", "budget", "no-shrimp", "no-peanut"],
    allergens: [],
    avoidFor: [],
    benefits: ["Light, hydrating chayote vegetables", "Balanced with ground meat protein"],
    image: "/images/dishes/ginisang-sayote.jpeg",
    ingredients: [
      "2 medium chayote (sayote), peeled, seeded, and sliced",
      "150 g ground pork or chicken",
      "3 cloves garlic, crushed",
      "1 medium onion, sliced",
      "1 medium tomato, chopped",
      "1 tbsp cooking oil",
      "1/2 tsp salt",
      "1/4 tsp ground black pepper",
      "1/2 cup water",
    ],
    instructions: [
      "Heat cooking oil in a pan over medium heat and sauté garlic, onion, and tomato until the tomato softens.",
      "Add the ground meat and cook for 5 to 6 minutes until browned.",
      "Stir in the sliced chayote and pour in 1/2 cup water, then cover and simmer for 7 to 8 minutes until tender.",
      "Season with salt and ground black pepper, stir to combine, and serve warm with steamed rice.",
    ],
  },
  {
    id: "ginisang-pechay",
    name: "Ginisang Pechay",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 20,
    calories: 280,
    estimatedCostPhp: 45,
    macros: { protein_g: 16, carbs_g: 12, fat_g: 17, sodium_mg: 350 },
    tags: ["iron", "folic acid", "protein", "budget", "no-shrimp", "no-peanut"],
    allergens: [],
    avoidFor: [],
    benefits: ["Rich in leafy greens and iron", "Quick everyday stir-fry meal"],
    image: "/images/dishes/ginisang-pechay.jpg",
    ingredients: [
      "2 bunches pechay (bok choy), chopped",
      "150 g ground pork or chicken",
      "3 cloves garlic, minced",
      "1 medium onion, chopped",
      "1 medium tomato, diced",
      "1 tbsp cooking oil",
      "1/2 cup water",
      "1 tbsp fish sauce (patis) or salt to taste",
      "1/4 tsp ground black pepper",
    ],
    instructions: [
      "Heat cooking oil in a pan over medium heat and sauté garlic, onion, and tomato for 2 to 3 minutes.",
      "Add the ground meat and cook for 4 to 5 minutes until lightly browned.",
      "Pour in 1/2 cup water and bring to a boil, then season with fish sauce or salt and ground black pepper.",
      "Add the chopped pechay and cook for 2 to 3 minutes until wilted yet crisp, then serve hot.",
    ],
  },
  {
    id: "pritong-bangus",
    name: "Pritong Bangus (Pan-Fried Milkfish)",
    mealTypes: ["Breakfast", "Lunch", "Dinner"],
    minutes: 20,
    calories: 390,
    estimatedCostPhp: 70,
    macros: { protein_g: 28, carbs_g: 4, fat_g: 28, sodium_mg: 360 },
    tags: ["protein", "vitamin d", "calcium", "vitamin b12", "no-shrimp", "no-peanut"],
    allergens: ["fish"],
    avoidFor: [],
    benefits: ["High in protein and vitamin D", "Simple, classic Filipino staple"],
    image: "/images/dishes/pritong-bangus.jpeg",
    ingredients: [
      "2 slices or 1 butterflied milkfish (bangus), cleaned",
      "2 tbsp vinegar or calamansi juice",
      "3 cloves garlic, crushed",
      "1/2 tsp salt",
      "1/4 tsp whole or ground black pepper",
      "3 tbsp cooking oil",
    ],
    instructions: [
      "Combine vinegar or calamansi juice, crushed garlic, salt, and black pepper, then rub over the bangus and marinate for 10 to 15 minutes.",
      "Pat the fish lightly with a paper towel so oil splatters less during frying.",
      "Heat cooking oil in a skillet over medium heat and fry the bangus for 4 to 5 minutes per side until golden brown.",
      "Drain briefly on paper towels and serve with steamed rice or tomatoes.",
    ],
  },
  {
    id: "bistek-tagalog",
    name: "Bistek Tagalog",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 35,
    calories: 450,
    estimatedCostPhp: 85,
    macros: { protein_g: 29, carbs_g: 14, fat_g: 29, sodium_mg: 540 },
    tags: ["protein", "iron", "vitamin b12", "no-shrimp", "no-peanut"],
    allergens: ["soy"],
    avoidFor: ["hypertension", "high blood"],
    benefits: ["Rich source of heme iron and protein", "Classic savory-citrus beef dish"],
    image: "/images/dishes/bistek-tagalog.jpeg",
    ingredients: [
      "300 g thinly sliced beef sirloin",
      "3 tbsp low-sodium soy sauce",
      "2 tbsp calamansi juice or lemon juice",
      "1 medium onion, sliced into rings",
      "3 cloves garlic, minced",
      "1/2 cup water or beef broth",
      "1/4 tsp ground black pepper",
      "1 tbsp cooking oil",
    ],
    instructions: [
      "Marinate the sliced beef in soy sauce, calamansi or lemon juice, and ground black pepper for at least 15 minutes.",
      "Heat cooking oil in a pan over medium heat and sear the beef slices for 1 to 2 minutes per side, then set aside.",
      "In the same pan, sauté garlic for 30 seconds, pour in the leftover marinade and water or broth, and simmer for 12 to 15 minutes until beef is tender.",
      "Add the onion rings during the last 2 to 3 minutes until soft and translucent, then serve hot with rice.",
    ],
  },
  {
    id: "pinakbet",
    name: "Pinakbet (Mixed Vegetables)",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 30,
    calories: 330,
    estimatedCostPhp: 55,
    macros: { protein_g: 15, carbs_g: 32, fat_g: 16, sodium_mg: 360 },
    tags: ["iron", "folic acid", "fiber", "budget", "no-shrimp", "no-peanut"],
    allergens: [],
    avoidFor: [],
    benefits: ["Packed with mixed vegetables and fiber", "Provides iron and plant nutrients"],
    image: "/images/dishes/pinakbet.jpg",
    ingredients: [
      "1 cup kalabasa (squash), cubed",
      "1 cup sitaw (string beans), cut into 2-inch lengths",
      "6 pieces okra",
      "1 small eggplant, sliced",
      "1/2 bitter gourd (ampalaya), sliced",
      "100 g pork slices (optional)",
      "1 medium tomato, chopped",
      "1 small onion, chopped",
      "3 cloves garlic, crushed",
      "1/2 cup water",
      "1 tbsp cooking oil",
      "1 tbsp fish sauce (patis) or salt to taste",
    ],
    instructions: [
      "Heat cooking oil in a pot over medium heat and sauté garlic, onion, and tomato for 2 to 3 minutes.",
      "Add the pork slices (if using) and cook for 3 minutes, then pour in 1/2 cup water and season with fish sauce or salt.",
      "Add kalabasa first and cover for 5 minutes until partially tender, then layer sitaw, okra, eggplant, and ampalaya on top.",
      "Cover and simmer gently for 5 to 6 minutes until all vegetables are cooked through, then serve.",
    ],
  },
  {
    id: "lumpiang-toge",
    name: "Lumpiang Toge (Mung Bean Sprout Roll)",
    mealTypes: ["Lunch", "Dinner"],
    minutes: 25,
    calories: 310,
    estimatedCostPhp: 45,
    macros: { protein_g: 11, carbs_g: 36, fat_g: 13, sodium_mg: 340 },
    tags: ["iron", "folic acid", "fiber", "budget", "no-shrimp", "no-peanut"],
    allergens: ["wheat"],
    avoidFor: [],
    benefits: ["Budget-friendly vegetable filling", "Crisp texture with mung bean sprouts and carrots"],
    image: "/images/dishes/lumpiang-toge.jpg",
    ingredients: [
      "2 cups mung bean sprouts (toge), rinsed and drained",
      "1 medium carrot, julienned or grated",
      "3 cloves garlic, minced",
      "1 small onion, chopped",
      "1 tbsp fish sauce (patis) or salt to taste",
      "1/4 tsp ground black pepper",
      "1 tbsp cooking oil (for filling) plus oil for frying",
      "8 to 10 lumpia wrappers",
    ],
    instructions: [
      "Heat 1 tbsp oil in a pan over medium heat and sauté garlic and onion for 1 to 2 minutes.",
      "Add togue and julienned carrots, season with fish sauce or salt and black pepper, and stir-fry for 2 minutes until slightly softened, then cool and drain excess liquid.",
      "Spoon a small portion of filling onto each lumpia wrapper, fold the sides in, roll tightly, and seal the edge with a dab of water.",
      "Pan-fry or deep-fry the rolls in hot oil over medium heat for 2 to 3 minutes until golden brown, then drain and serve.",
    ],
  },
  {
    id: "lugaw-with-egg",
    name: "Lugaw with Boiled Egg",
    mealTypes: ["Breakfast", "Dinner"],
    minutes: 30,
    calories: 320,
    estimatedCostPhp: 35,
    macros: { protein_g: 12, carbs_g: 54, fat_g: 6, sodium_mg: 260 },
    tags: ["budget", "low-fat", "no-shrimp", "no-peanut"],
    allergens: ["egg"],
    avoidFor: [],
    benefits: ["Gentle, warm rice porridge", "Affordable breakfast or light dinner option"],
    image: "/images/dishes/lugaw-with-egg.jpg",
    ingredients: [
      "1 cup regular white or glutinous rice, washed",
      "4 to 5 cups water or broth",
      "1 thumb-sized ginger, sliced (optional)",
      "2 cloves garlic, minced",
      "1/2 tsp salt (adjust to taste)",
      "1 hard-boiled egg, sliced or halved",
      "1 stalk spring onion, chopped",
    ],
    instructions: [
      "Bring water or broth (and ginger, if using) to a boil in a pot over medium heat.",
      "Stir in the washed rice and lower heat to a simmer, cooking for 20 to 25 minutes while stirring occasionally until thick.",
      "In a small pan, briefly toast minced garlic in a teaspoon of oil until lightly golden if desired.",
      "Season the porridge with salt, ladle into a bowl, and top with the boiled egg and spring onions.",
    ],
  },
];

const CATEGORY_FALLBACK_IMAGES = [
  { keywords: ["silog", "tapa", "tocino", "longganisa"], path: "/images/dishes/default-silog.jpeg" },
  { keywords: ["picadillo", "giniling"], path: "/images/dishes/default-picadillo.jpg" },
  { keywords: ["sayote"], path: "/images/dishes/ginisang-sayote.jpeg" },
  { keywords: ["pechay", "bok choy"], path: "/images/dishes/ginisang-pechay.jpg" },
  { keywords: ["pinakbet", "pakbet"], path: "/images/dishes/pinakbet.jpg" },
  { keywords: ["lumpiang toge", "toge"], path: "/images/dishes/lumpiang-toge.jpg" },
  { keywords: ["lugaw"], path: "/images/dishes/lugaw-with-egg.jpg" },
  { keywords: ["soup", "sabaw", "nilaga", "tinola", "sinigang", "misua", "arroz"], path: "/images/dishes/default-soup.jpg" },
  { keywords: ["ginisang", "gulay", "chop suey", "kalabasa", "ampalaya"], path: "/images/dishes/ginisang-monggo.jpg" },
  { keywords: ["pritong bangus", "bangus"], path: "/images/dishes/pritong-bangus.jpeg" },
  { keywords: ["bistek"], path: "/images/dishes/bistek-tagalog.jpeg" },
  { keywords: ["paksiw", "isda", "tilapia", "fish", "sarciado"], path: "/images/dishes/default-fish.jpg" },
];

const DEFAULT_DISH_IMAGE = "/images/dishes/default-dish.jpg";

function resolveDishImageUrl(rawQuery) {
  const lower = String(rawQuery || "").trim().toLowerCase();
  if (!lower) {
    return DEFAULT_DISH_IMAGE;
  }

  const exactDish = VERIFIED_DISHES.find(
    (d) =>
      lower === d.name.toLowerCase() ||
      lower.includes(d.name.toLowerCase()) ||
      d.name.toLowerCase().includes(lower)
  );
  if (exactDish?.image) {
    return exactDish.image;
  }

  for (const group of CATEGORY_FALLBACK_IMAGES) {
    if (group.keywords.some((kw) => lower.includes(kw))) {
      return group.path;
    }
  }

  return DEFAULT_DISH_IMAGE;
}

function filterVerifiedDishesForProfile(profile) {
  const condText = profile.conditionsList.join(" ").toLowerCase();

  return VERIFIED_DISHES.filter((dish) => {
    if (condText.includes("shrimp") && dish.allergens.includes("shrimp")) return false;
    if (condText.includes("peanut") && dish.allergens.includes("peanut")) return false;
    if (condText.includes("egg") && dish.allergens.includes("egg")) return false;
    if ((condText.includes("milk") || condText.includes("lactose") || condText.includes("dairy")) && dish.allergens.includes("milk")) return false;
    if ((condText.includes("fish") || condText.includes("seafood")) && dish.allergens.includes("fish")) return false;

    if ((condText.includes("hypertension") || condText.includes("high blood")) && dish.avoidFor.includes("hypertension")) return false;
    if (condText.includes("diabetes") && dish.avoidFor.includes("diabetes")) return false;
    if ((condText.includes("cholesterol") || condText.includes("heart")) && dish.avoidFor.includes("cholesterol")) return false;

    return true;
  });
}

function scoreDishForProfile(dish, profile) {
  let score = 0;
  const pantry = profile.ingredientsList.map((i) => i.toLowerCase());
  const needs = profile.nutritionList.join(" ").toLowerCase();
  const dishIngText = dish.ingredients.join(" ").toLowerCase();

  for (const item of pantry) {
    const keyword = item.replace(/-/g, " ");
    if (dishIngText.includes(keyword)) score += 3;
    if (keyword === "ground meat" && (dishIngText.includes("ground pork") || dishIngText.includes("ground beef"))) score += 3;
    if (keyword === "poultry" && dishIngText.includes("chicken")) score += 3;
    if (keyword === "dried fish" && (dishIngText.includes("bangus") || dishIngText.includes("fish"))) score += 3;
  }

  if (needs.includes("iron") && dish.tags.includes("iron")) score += 4;
  if (needs.includes("vitamin d") && dish.tags.includes("vitamin d")) score += 4;
  if (needs.includes("calcium") && dish.tags.includes("calcium")) score += 4;
  if (needs.includes("b12") && dish.tags.includes("vitamin b12")) score += 4;
  if (needs.includes("folic") && dish.tags.includes("folic acid")) score += 4;
  if (needs.includes("protein") && dish.tags.includes("protein")) score += 4;

  if (profile.weeklyBudget > 0 && dish.estimatedCostPhp <= Math.round(profile.weeklyBudget / 21) + 15) {
    score += 2;
  }

  return score;
}

function buildSafetyNoteForDish(dish, profile) {
  const parts = [];
  if (profile.conditionsList.length > 0) {
    parts.push(`Aligned with ${profile.conditionsList.join(", ")}`);
  } else {
    parts.push("Balanced everyday Filipino home meal");
  }
  if (profile.nutritionList.length > 0) {
    parts.push(`supports ${profile.nutritionList[0].toLowerCase()}`);
  }
  return `${parts.join("; ")}.`;
}

app.post("/api/generate-recipe", async (req, res) => {
  try {
    const { prompt = "", previousRecipes: rawPreviousRecipes = [] } = req.body;
    const profile = normalizeProfile(req.body);

    const previousRecipes = Array.isArray(rawPreviousRecipes)
      ? rawPreviousRecipes.map((n) => String(n).trim()).filter(Boolean)
      : [];

    const recipeVarietyRules = `
- REAL NAMED DISHES ONLY (NO INVENTED DESCRIPTIVE TITLES): Suggest ONLY real, established dishes with their actual traditional/common names (e.g., Picadillo, Tortang Giniling, Ginisang Munggo, Ginataang Kalabasa, Pork Soboro Donburi, Nikujaga, Chicken Teriyaki, Mapo Tofu). NEVER invent generic descriptive titles like "Ground Meat and Vegetable Stir-Fry with Tomato-Vinegar Sauce".
- CUISINE & SOURCE PRIORITY: If the user asks for a specific cuisine (e.g., Japanese, Korean, Italian), suggest an authentic, budget-friendly home-cooked dish from that cuisine that fits their ingredients and health rules. Otherwise, draw primarily from well-known Panlasang Pinoy (panlasangpinoy.com) Filipino dishes—including vegetable-forward dishes (such as Ginisang Ampalaya, Ginataang Kalabasa at Sitaw, Chop Suey, Ginisang Monggo, or Tortang Talong). Do NOT invent or guess URLs.
- PRIORITIZE AVAILABLE INGREDIENTS: Pick a real dish that naturally uses the user's available ingredients. Up to 3 extra common ingredients not on their list are allowed (excluding water, salt, pepper, and cooking oil).
- GROUND MEAT FLEXIBILITY: If the user has "Ground Meat", use it in real ground-meat dishes (e.g., Picadillo, Tortang Giniling, Soboro Donburi, Mapo Tofu, Lettuce Wraps, Meatball Soup)—never force ground meat into dishes meant for whole cuts.
- FLEXIBLE NUTRITIONAL SUPPORT: Supporting even ONE listed nutritional need is enough, as long as it respects their health conditions and weekly budget.
- NO REPEATS: ${
      previousRecipes.length > 0
        ? `Do NOT repeat or generate variations of these already-suggested dishes: ${previousRecipes.join(", ")}. Pick a distinct dish.`
        : "Suggest a distinct, authentic dish suited to the user's request."
    }
`.trim();

    const systemInstruction = `
You are Kubi, a practical meal-planning assistant for DishKubre.
Generate ONE realistic, budget-friendly home-cooked recipe tailored to the user's profile and request.
Keep internal reasoning brief and output ONLY the final JSON object immediately.

Rules:
1. Respect the user's health conditions and allergies strictly (e.g., lower sodium/sugar/fat if relevant, avoid listed allergens).
2. Support at least one of their nutritional needs using practical, accessible ingredients.
3. Prioritize using their available ingredients whenever reasonable.
4. Keep the dish realistic for a home kitchen and mindful of their weekly food budget (in Php).
5. Do not claim the dish cures, treats, or prevents any disease.
${recipeVarietyRules}
6. Return ONLY valid JSON matching this exact structure (no markdown, no extra text):
{
  "id": "ai-lowercase-hyphenated-name",
  "name": "Actual Dish Name",
  "minutes": 30,
  "categories": ["Made for You ★"],
  "ingredients": ["Ingredient 1", "Ingredient 2"],
  "benefits": ["Factual nutritional benefit 1", "Factual nutritional benefit 2"],
  "instructions": ["Step 1...", "Step 2..."]
}
`.trim();

    const userMessage = `
${buildProfilePromptBlock(profile)}

User Request: ${prompt.trim() || "Suggest a healthy, budget-friendly meal using my available ingredients."}
`.trim();

    const groqApiKey = process.env.GROQ_API_KEY?.trim();
    const groqModel = "openai/gpt-oss-20b";
    let parsedRecipe;

    if (groqApiKey) {
      console.log(`Generating recipe with Groq model: ${groqModel}`);
      parsedRecipe = await callGroqJson(
        `${systemInstruction} Return only valid JSON matching the required recipe schema.`,
        userMessage,
        2048
      );
    } else {
      let response;
      const modelsToTry = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
      let lastError;

      for (const modelName of modelsToTry) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: userMessage,
              config: {
                systemInstruction,
                responseMimeType: "application/json",
              },
            });
            break;
          } catch (err) {
            lastError = err;
            console.warn(
              `Model ${modelName} (attempt ${attempt}) failed, retrying or falling back...`
            );
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
          }
        }
        if (response) break;
      }

      if (!response) {
        throw lastError;
      }

      parsedRecipe = JSON.parse(response.text);
    }

    function validateRecipe(recipe) {
      const errors = [];

      const name = typeof recipe?.name === "string" ? recipe.name.trim() : "";
      const minutes = Number(recipe?.minutes);
      const categories = cleanStringArray(recipe?.categories);
      const ingredients = cleanStringArray(recipe?.ingredients);
      const benefits = cleanStringArray(recipe?.benefits);
      const instructions = cleanStringArray(recipe?.instructions);

      if (!name) errors.push("Missing recipe name.");
      if (!Number.isFinite(minutes) || minutes <= 0) {
        errors.push("Invalid or missing cooking time (minutes).");
      }
      if (ingredients.length === 0) errors.push("Missing ingredients list.");
      if (benefits.length === 0) errors.push("Missing nutritional benefits.");
      if (instructions.length === 0) errors.push("Missing cooking instructions.");

      const recipeBodyText = `${name} ${ingredients.join(" ")} ${instructions.join(" ")}`.toLowerCase();

      if (profile.ingredientsList.length > 0 && ingredients.length > 0) {
        const ingredientsText = ingredients.join(" ").toLowerCase();
        const expandedIngredients = profile.ingredientsList.flatMap((item) => {
          const lower = item.toLowerCase();
          return lower === "ground meat"
            ? ["ground meat", "ground pork", "ground beef", "ground chicken", "giniling"]
            : [lower];
        });
        const usesOnboardingIngredient = expandedIngredients.some((item) =>
          ingredientsText.includes(item)
        );
        if (!usesOnboardingIngredient) {
          errors.push(
            `Recipe should use at least one available ingredient (${profile.ingredientsList.join(", ")}).`
          );
        }
      }

      const avoidanceRules = getConditionAvoidanceRules(profile.conditionsList);
      for (const rule of avoidanceRules) {
        const hit = rule.avoidTerms.find((term) => recipeBodyText.includes(term));
        if (hit) {
          errors.push(
            `Recipe contains "${hit}", which may not align with ${rule.label}.`
          );
        }
      }

      const prevLower = previousRecipes.map((n) => n.toLowerCase());
      if (name && prevLower.includes(name.toLowerCase())) {
        errors.push(`Recipe "${name}" was already generated. Choose a different dish.`);
      }

      const deficiencyTargets = profile.nutritionList
        .map((d) =>
          d
            .toLowerCase()
            .replace(/^(low in|lack of|deficiency in|need more|high)\s+/i, "")
            .replace(/\s+deficiency$/i, "")
            .trim()
        )
        .filter((d) => d.length >= 2);

      if (deficiencyTargets.length > 0 && benefits.length > 0) {
        const benefitsText = `${benefits.join(" ")} ${categories.join(" ")} ${name} ${ingredients.join(" ")}`.toLowerCase();
        const nutrientAliases = {
          iron: ["iron", "malunggay", "monggo", "mung", "kangkong", "spinach", "pechay", "beef", "liver", "minerals"],
          "vitamin d": ["vitamin d", "egg", "fish", "bangus", "milk"],
          calcium: ["calcium", "milk", "malunggay", "tofu", "bangus"],
          "vitamin b12": ["b12", "b-12", "meat", "pork", "beef", "chicken", "egg", "fish"],
          folic: ["folic", "folate", "monggo", "mung", "greens", "beans", "pechay"],
          protein: ["protein", "chicken", "pork", "beef", "egg", "monggo", "mung", "fish", "tofu"],
        };

        const addressesAtLeastOne = deficiencyTargets.some((def) => {
          if (benefitsText.includes(def)) return true;
          const matchingAliasKey = Object.keys(nutrientAliases).find((k) => def.includes(k));
          if (!matchingAliasKey) return false;
          return nutrientAliases[matchingAliasKey].some((alias) => benefitsText.includes(alias));
        });

        if (!addressesAtLeastOne) {
          errors.push(
            `Benefits should support at least one of the user's nutritional needs (${profile.nutritionList.join(", ")}).`
          );
        }
      }

      if (isTightWeeklyBudget(profile)) {
        const priceyTerms = ["salmon", "steak", "wagyu", "imported", "lobster", "shrimp paste imported"];
        const priceyHit = priceyTerms.find((term) => recipeBodyText.includes(term));
        if (priceyHit) {
          errors.push(
            `Ingredient "${priceyHit}" may not fit a tight weekly food budget (${profile.weeklyBudget || profile.weeklyBudgetRaw}).`
          );
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        sanitized: {
          id:
            typeof recipe?.id === "string" && recipe.id.trim()
              ? recipe.id.trim()
              : `ai-${Date.now()}`,
          name,
          minutes,
          categories,
          ingredients,
          benefits,
          instructions,
        },
      };
    }

    let validation = validateRecipe(parsedRecipe);

    if (!validation.valid && groqApiKey) {
      console.warn("Validation failed on first attempt, retrying once:", validation.errors);
      const retriedRecipe = await callGroqJson(
        `${systemInstruction} Return only valid JSON matching the required recipe schema.`,
        `${userMessage}\n\nFix these validation issues in your recipe: ${validation.errors.join(" ")}`,
        2048
      );
      const retryValidation = validateRecipe(retriedRecipe);
      if (retryValidation.valid) {
        validation = retryValidation;
      }
    }

    if (!validation.valid) {
      throw new Error(
        `Generated recipe failed validation: ${validation.errors.join(" ")}`
      );
    }

    const cleanedCategories = validation.sanitized.categories.filter(
      (cat) => !/^ai[\s-]?generated$/i.test(String(cat).trim())
    );

    const resolvedImage = resolveDishImageUrl(validation.sanitized.name);

    const formattedRecipe = {
      id: validation.sanitized.id,
      name: validation.sanitized.name,
      minutes: validation.sanitized.minutes,
      categories: Array.from(new Set(["Made for You ★", ...cleanedCategories])),
      image: resolvedImage,
      imageUrl: resolvedImage,
      ingredients: validation.sanitized.ingredients,
      benefits: validation.sanitized.benefits,
      instructions: validation.sanitized.instructions,
    };

    res.json({ recipe: formattedRecipe });
  } catch (error) {
    console.error("Error generating recipe:", error);

    try {
      const profile = normalizeProfile(req.body || {});
      const prevLower = new Set(
        (Array.isArray(req.body?.previousRecipes) ? req.body.previousRecipes : [])
          .map((n) => String(n).trim().toLowerCase())
      );
      const safePool = filterVerifiedDishesForProfile(profile).filter(
        (d) => !prevLower.has(d.name.toLowerCase())
      );
      const pool = safePool.length > 0 ? safePool : VERIFIED_DISHES;
      const ranked = [...pool].sort(
        (a, b) => scoreDishForProfile(b, profile) - scoreDishForProfile(a, profile)
      );
      const picked = ranked[0] || VERIFIED_DISHES[0];
      const fallbackImage = resolveDishImageUrl(picked.name);

      return res.json({
        recipe: {
          id: picked.id,
          name: picked.name,
          minutes: picked.minutes,
          categories: ["Made for You ★"],
          image: fallbackImage,
          imageUrl: fallbackImage,
          ingredients: [...picked.ingredients],
          benefits: [...picked.benefits],
          instructions: [...picked.instructions],
        },
      });
    } catch (fallbackErr) {
      console.error("Fallback recipe also failed:", fallbackErr);
      res.status(500).json({
        error: "Failed to generate recipe. Please check your server logs and API key.",
      });
    }
  }
});

app.post("/api/generate-meal-plan", async (req, res) => {
  try {
    const profile = normalizeProfile(req.body);
    const totalBudget = profile.weeklyBudget;

    const safePool = filterVerifiedDishesForProfile(profile);
    const candidateDishes = (safePool.length >= 6 ? safePool : VERIFIED_DISHES)
      .map((d) => ({ dish: d, score: scoreDishForProfile(d, profile) }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.dish);

    const catalogSummary = candidateDishes
      .map(
        (d) =>
          `${d.id} | ${d.name} | Types: ${d.mealTypes.join("/")} | Cost: ${d.estimatedCostPhp} Php | Tags: ${d.tags.join(",")}`
      )
      .join("\n");

    let selectedPlanIds = null;
    try {
      const selectorSystem = `
You are Kubi, the meal-planning assistant for DishKubre.
Select a 7-day meal plan (days 1 to 7, each with Breakfast, Lunch, Dinner) using ONLY dish "id" values from the Verified Catalog below.
Do NOT invent new dish IDs or names.
Aim for around 18–19 distinct dishes across the 21 slots so at most 2–3 dishes repeat across the entire 7-day week.
Never put the exact same dish in two consecutive meals on the same day.
Output ONLY valid JSON:
{
  "days": [
    { "day": 1, "Breakfast": "dish-id", "Lunch": "dish-id", "Dinner": "dish-id" }
  ]
}
`.trim();

      const selectorUser = `
${buildProfilePromptBlock(profile)}

Verified Catalog:
${catalogSummary}
`.trim();

      const aiChoice = await callGroqJson(selectorSystem, selectorUser, 2048);
      if (Array.isArray(aiChoice?.days) && aiChoice.days.length > 0) {
        selectedPlanIds = aiChoice.days;
      }
    } catch (aiErr) {
      console.warn("AI catalog selection fallback to deterministic ranking:", aiErr.message);
    }

    const byId = new Map(candidateDishes.map((d) => [d.id, d]));
    const breakfastPool = candidateDishes.filter((d) => d.mealTypes.includes("Breakfast"));
    const mainPool = candidateDishes.filter(
      (d) => d.mealTypes.includes("Lunch") || d.mealTypes.includes("Dinner")
    );
    const bPool = breakfastPool.length > 0 ? breakfastPool : candidateDishes;
    const mPool = mainPool.length > 0 ? mainPool : candidateDishes;

    const usedIds = new Set();

    function pickNextDish(preferredId, pool, fallbackIndex) {
      const preferred = preferredId ? byId.get(preferredId) : null;
      if (preferred && !usedIds.has(preferred.id)) {
        usedIds.add(preferred.id);
        return preferred;
      }

      const unused = pool.filter((d) => !usedIds.has(d.id));
      if (unused.length > 0) {
        const picked = unused[fallbackIndex % unused.length];
        usedIds.add(picked.id);
        return picked;
      }

      usedIds.clear();
      const picked = preferred || pool[fallbackIndex % pool.length];
      usedIds.add(picked.id);
      return picked;
    }

    const days = Array.from({ length: 7 }, (_, idx) => {
      const dayNum = idx + 1;
      const aiDay = selectedPlanIds?.find((d) => Number(d?.day) === dayNum) || {};

      const bDish = pickNextDish(aiDay.Breakfast, bPool, idx);
      const lDish = pickNextDish(aiDay.Lunch, mPool, idx * 2);
      const dDish = pickNextDish(aiDay.Dinner, mPool, idx * 2 + 1);

      const chosen = [
        { type: "Breakfast", dish: bDish },
        { type: "Lunch", dish: lDish },
        { type: "Dinner", dish: dDish },
      ];

      const meals = chosen.map(({ type, dish }, mIdx) => ({
        id: `${dish.id}-d${dayNum}-${mIdx}`,
        mealType: type,
        name: dish.name,
        minutes: dish.minutes,
        calories: dish.calories,
        estimatedCostPhp: dish.estimatedCostPhp,
        image: dish.image || resolveDishImageUrl(dish.name),
        macros: { ...dish.macros },
        safetyNote: buildSafetyNoteForDish(dish, profile),
        benefits: [...dish.benefits],
        ingredients: [...dish.ingredients],
        instructions: [...dish.instructions],
      }));

      const dayCalories = meals.reduce((sum, m) => sum + m.calories, 0);
      const dayCostPhp = meals.reduce((sum, m) => sum + m.estimatedCostPhp, 0);
      const dayMacros = meals.reduce(
        (acc, m) => ({
          protein_g: acc.protein_g + m.macros.protein_g,
          carbs_g: acc.carbs_g + m.macros.carbs_g,
          fat_g: acc.fat_g + m.macros.fat_g,
          sodium_mg: acc.sodium_mg + m.macros.sodium_mg,
        }),
        { protein_g: 0, carbs_g: 0, fat_g: 0, sodium_mg: 0 }
      );

      return {
        day: dayNum,
        label: `Day ${dayNum}`,
        meals,
        totals: {
          calories: dayCalories,
          estimatedCostPhp: dayCostPhp,
          macros: dayMacros,
        },
      };
    });

    const weeklyCostPhp = days.reduce((sum, d) => sum + d.totals.estimatedCostPhp, 0);

    res.json({
      days,
      weeklyCostPhp,
      weeklyBudgetPhp: totalBudget,
      remainingBudgetPhp: totalBudget > 0 ? totalBudget - weeklyCostPhp : null,
    });
  } catch (error) {
    console.error("Error generating 7-day meal plan:", error);
    res.status(500).json({ error: "Failed to generate 7-day meal plan." });
  }
});

app.post("/api/meal-details", async (req, res) => {
  const { mealName = "" } = req.body;
  const lower = String(mealName).trim().toLowerCase();
  const matched = VERIFIED_DISHES.find(
    (d) => d.name.toLowerCase() === lower || lower.includes(d.name.toLowerCase())
  );

  if (matched) {
    return res.json({
      ingredients: matched.ingredients,
      instructions: matched.instructions,
      image: matched.image || resolveDishImageUrl(matched.name),
    });
  }

  return res.json({
    ingredients: [
      "1 serving main protein/vegetable",
      "2 cloves garlic, minced",
      "1 small onion, chopped",
      "1 tbsp cooking oil",
    ],
    instructions: [
      "Sauté garlic and onion in oil until fragrant.",
      "Add main ingredients and simmer until tender. Season to taste and serve.",
    ],
    image: resolveDishImageUrl(mealName),
  });
});

app.post("/api/replace-meal", async (req, res) => {
  try {
    const {
      dayNumber = 1,
      mealType = "Lunch",
      existingMealNames = [],
      customNote = "",
    } = req.body;

    const profile = normalizeProfile(req.body);
    const avoided = existingMealNames.map((n) => String(n).trim().toLowerCase());
    const safePool = filterVerifiedDishesForProfile(profile);
    const pool = safePool.length > 0 ? safePool : VERIFIED_DISHES;

    const noteLower = String(customNote || "").toLowerCase();
    const candidates = pool
      .filter((d) => !avoided.includes(d.name.toLowerCase()))
      .sort((a, b) => {
        let sA = scoreDishForProfile(a, profile) + (a.mealTypes.includes(mealType) ? 3 : 0);
        let sB = scoreDishForProfile(b, profile) + (b.mealTypes.includes(mealType) ? 3 : 0);
        if (noteLower) {
          if (`${a.name} ${a.ingredients.join(" ")}`.toLowerCase().includes(noteLower)) sA += 6;
          if (`${b.name} ${b.ingredients.join(" ")}`.toLowerCase().includes(noteLower)) sB += 6;
        }
        return sB - sA;
      });

    const chosen = candidates[0] || pool[0];

    res.json({
      meal: {
        id: `${chosen.id}-rep-d${dayNumber}-${Date.now()}`,
        mealType,
        name: chosen.name,
        minutes: chosen.minutes,
        calories: chosen.calories,
        estimatedCostPhp: chosen.estimatedCostPhp,
        image: chosen.image || resolveDishImageUrl(chosen.name),
        macros: { ...chosen.macros },
        safetyNote: buildSafetyNoteForDish(chosen, profile),
        benefits: [...chosen.benefits],
        ingredients: [...chosen.ingredients],
        instructions: [...chosen.instructions],
      },
    });
  } catch (error) {
    console.error("Error replacing meal:", error);
    res.status(500).json({ error: "Failed to replace meal." });
  }
});

app.get("/api/dish-image", (req, res) => {
  return res.json({ imageUrl: resolveDishImageUrl(req.query.q) });
});

app.listen(PORT, () => {
  console.log(`DishKubre AI server running on http://localhost:${PORT}`);
});