import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GROQ_API_KEY?.trim();

if (!apiKey) {
  console.error("Set GROQ_API_KEY in server/.env before running this test.");
  process.exit(1);
}

const body = {
  model: "openai/gpt-oss-20b",
  messages: [
    {
      role: "system",
      content:
        "You are Kubi, a helpful Filipino meal-planning assistant. Return only valid JSON with keys: id (string), name (string), minutes (number), categories (array of strings), ingredients (array of strings), benefits (array of strings), instructions (array of strings).",
    },
    {
      role: "user",
      content:
        "Suggest one budget-friendly Filipino recipe for someone who needs more iron using eggs, spinach, and sardines.",
    },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "dishkubre_recipe",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "name",
          "minutes",
          "categories",
          "ingredients",
          "benefits",
          "instructions",
        ],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          minutes: { type: "number" },
          categories: { type: "array", items: { type: "string" } },
          ingredients: { type: "array", items: { type: "string" } },
          benefits: { type: "array", items: { type: "string" } },
          instructions: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify(body),
});

const data = await res.json();
if (!res.ok) {
  console.error("Groq error:", data);
  process.exit(1);
}

const recipe = JSON.parse(data.choices[0].message.content);
console.log(JSON.stringify(recipe, null, 2));