import { useState, useEffect } from "react";
import "./HomePage.css";
import recipes from "../data/recipes";
import RecipeDetails from "./RecipeDetails";
import SavedRecipes from "./SavedRecipes";
import BottomNavigation from "./BottomNavigation";
import MealPlanView from "./MealPlanView";
import UserPage from "./UserPage";

const DEFAULT_DISH_IMAGE = "/images/dishes/default-dish.jpg";

const DISH_IMAGE_LOOKUP = [
  { match: "chicken afritada", path: "/images/dishes/chicken-afritada.jpg" },
  { match: "chicken sotanghon", path: "/images/dishes/chicken-sotanghon.jpg" },
  { match: "chicken adobo", path: "/images/dishes/chicken-adobo.jpg" },
  { match: "adobo", path: "/images/dishes/adobo.jpg" },
  { match: "arroz caldo", path: "/images/dishes/arroz-caldo.jpeg" },
  { match: "beef tapa", path: "/images/dishes/beef-tapa.jpg" },
  { match: "bistek", path: "/images/dishes/bistek-tagalog.jpeg" },
  { match: "champorado", path: "/images/dishes/champorado.jpeg" },
  { match: "chop suey", path: "/images/dishes/chop-suey.jpg" },
  { match: "chopsuey", path: "/images/dishes/chop-suey.jpg" },
  { match: "corned beef", path: "/images/dishes/corned-beef-silog.jpg" },
  { match: "ensaladang talong", path: "/images/dishes/ensaladang-talong.jpg" },
  { match: "spaghetti", path: "/images/dishes/filipino-style-spaghetti.jpg" },
  { match: "kalabasa", path: "/images/dishes/ginataang-kalabasa.jpg" },
  { match: "ampalaya", path: "/images/dishes/ginisang-ampalaya.jpg" },
  { match: "monggo", path: "/images/dishes/ginisang-monggo.jpg" },
  { match: "munggo", path: "/images/dishes/ginisang-monggo.jpg" },
  { match: "pechay", path: "/images/dishes/ginisang-pechay.jpg" },
  { match: "sardinas", path: "/images/dishes/ginisang-sardinas.jpg" },
  { match: "sayote", path: "/images/dishes/ginisang-sayote.jpeg" },
  { match: "inihaw na bangus", path: "/images/dishes/inihaw-na-bangus.jpg" },
  { match: "kaldereta", path: "/images/dishes/kaldereta.jpg" },
  { match: "kare-kare", path: "/images/dishes/kare-kare.jpg" },
  { match: "kare kare", path: "/images/dishes/kare-kare.jpg" },
  { match: "lechon kawali", path: "/images/dishes/lechon-kawali.jpg" },
  { match: "lugaw", path: "/images/dishes/lugaw-with-egg.jpeg" },
  { match: "lumpiang shanghai", path: "/images/dishes/lumpiang-shanghai.jpg" },
  { match: "lumpiang toge", path: "/images/dishes/lumpiang-toge.jpeg" },
  { match: "macaroni salad", path: "/images/dishes/macaroni-salad.jpg" },
  { match: "menudo", path: "/images/dishes/menudo.jpg" },
  { match: "nilagang baboy", path: "/images/dishes/nilagang-baboy.jpg" },
  { match: "paksiw", path: "/images/dishes/paksiw-na-isda.jpg" },
  { match: "pancit bihon", path: "/images/dishes/pancit-bihon.jpg" },
  { match: "pansit bihon", path: "/images/dishes/pancit-bihon.jpg" },
  { match: "pinakbet", path: "/images/dishes/pinakbet.jpeg" },
  { match: "pritong bangus", path: "/images/dishes/pritong-bangus.jpeg" },
  { match: "pritong tilapia", path: "/images/dishes/pritong-tilapia.jpg" },
  { match: "sinigang na baboy with gabi", path: "/images/dishes/sinigang-na-baboy-with-gabi.jpg" },
  { match: "sinigang", path: "/images/dishes/sinigang.jpeg" },
  { match: "sopas", path: "/images/dishes/sopas.jpg" },
  { match: "tinolang manok", path: "/images/dishes/tinolang-manok.jpg" },
  { match: "tortang talong", path: "/images/dishes/tortang-talong.jpg" },
];

function getHomeRecipeImage(recipe) {
  if (recipe?.image) return recipe.image;
  if (recipe?.imageUrl) return recipe.imageUrl;

  const lowerName = String(recipe?.name || "").toLowerCase();
  const matched = DISH_IMAGE_LOOKUP.find((entry) => lowerName.includes(entry.match));
  return matched ? matched.path : DEFAULT_DISH_IMAGE;
}

function HomePage({
  firstName,
  selectedConditions = [],
  otherCondition = "",
  selectedNutritionalNeeds = [],
  otherNutritionalNeed = "",
  selectedIngredients = [],
  otherIngredient = "",
  weeklyBudget = "",
  selectedSex = "",
  age = "",
}) {
  const [profileState, setProfileState] = useState({
    firstName,
    selectedConditions,
    otherCondition,
    selectedNutritionalNeeds,
    otherNutritionalNeed,
    selectedIngredients,
    otherIngredient,
    weeklyBudget,
    selectedSex,
    age,
  });

  const [mealPlan, setMealPlan] = useState(null);
  const [aiRecipes, setAiRecipes] = useState([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

  const AI_CATEGORY = "Made for You ★";

  const categories = [
    ...(aiRecipes.length > 0 ? [AI_CATEGORY] : []),
    "Tampok",
    "Tipid Hits",
    "Gulay-Bida",
    "No Sugar",
    "Lutong Bahay Classics",
    "Iwas Asin",
    "Madaling Lutuin",
    "Kiddie Choice",
  ];

  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState("Tampok");

  const allRecipes = [...aiRecipes, ...recipes];

  useEffect(() => {
    let cancelled = false;
    const missingImages = aiRecipes.filter(
      (r) => !r.image && !r.imageUrl && r.name
    );

    if (missingImages.length === 0) return;

    Promise.all(
      missingImages.map(async (r) => {
        try {
          const res = await fetch(
            `http://localhost:5001/api/dish-image?q=${encodeURIComponent(r.name)}`
          );
          const data = await res.json();
          return { id: r.id, image: data?.imageUrl || DEFAULT_DISH_IMAGE };
        } catch {
          return { id: r.id, image: DEFAULT_DISH_IMAGE };
        }
      })
    ).then((resolvedList) => {
      if (cancelled) return;
      const imageById = new Map(resolvedList.map((item) => [item.id, item.image]));
      setAiRecipes((prev) =>
        prev.map((item) =>
          imageById.has(item.id)
            ? { ...item, image: imageById.get(item.id) }
            : item
        )
      );
    });

    return () => {
      cancelled = true;
    };
  }, [aiRecipes]);

  const handleGenerateRecipe = async (event) => {
    if (event) event.preventDefault();
    if (isGenerating) return;

    setIsGenerating(true);
    setAiError("");

    try {
      const response = await fetch("http://localhost:5001/api/generate-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          previousRecipes: aiRecipes.map((r) => r.name),
          ...profileState,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.recipe) {
        throw new Error(data?.error || "Failed to generate recipe.");
      }

      let resolvedImage =
        data.recipe.image || data.recipe.imageUrl || "";

      if (!resolvedImage && data.recipe.name) {
        try {
          const imgRes = await fetch(
            `http://localhost:5001/api/dish-image?q=${encodeURIComponent(data.recipe.name)}`
          );
          const imgData = await imgRes.json();
          resolvedImage = imgData?.imageUrl || DEFAULT_DISH_IMAGE;
        } catch {
          resolvedImage = DEFAULT_DISH_IMAGE;
        }
      }

      if (!resolvedImage) {
        resolvedImage = DEFAULT_DISH_IMAGE;
      }

      const normalizedRecipe = {
        ...data.recipe,
        image: resolvedImage,
        categories: Array.from(
          new Set([
            AI_CATEGORY,
            ...(Array.isArray(data.recipe.categories)
              ? data.recipe.categories.filter(
                  (cat) => !/^ai[\s-]?generated$/i.test(String(cat).trim())
                )
              : []),
          ])
        ),
      };

      setAiRecipes((prev) => [normalizedRecipe, ...prev]);
      setSelectedCategory(AI_CATEGORY);
      setAiPrompt("");
    } catch (error) {
      setAiError(
        error.message ||
          "Could not connect to Kubi's AI server. Make sure localhost:5001 is running."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNavigate = (page) => {
    setSelectedRecipe(null);
    setCurrentPage(page);
  };

  const handleOpenRecipe = (recipe) => {
    setSelectedRecipe({
      ...recipe,
      image: getHomeRecipeImage(recipe),
    });
    setCurrentPage("recipe");
  };

  const handleSelectSavedRecipe = (recipe) => {
    setSelectedRecipe({
      ...recipe,
      image: getHomeRecipeImage(recipe),
    });
    setCurrentPage("recipe");
  };

  const handleBackFromRecipe = () => {
    setSelectedRecipe(null);
    setCurrentPage("home");
  };

  const isSaved = selectedRecipe
    ? savedRecipes.some((recipe) => recipe.id === selectedRecipe.id)
    : false;

  if (currentPage === "meal-plan") {
    return (
      <MealPlanView
        profile={profileState}
        onUpdateProfile={setProfileState}
        mealPlan={mealPlan}
        setMealPlan={setMealPlan}
        onBack={() => setCurrentPage("home")}
        onNavigate={handleNavigate}
      />
    );
  }

  if (currentPage === "saved") {
    return (
      <SavedRecipes
        savedRecipes={savedRecipes}
        onSelectRecipe={handleSelectSavedRecipe}
        onNavigate={handleNavigate}
      />
    );
  }

  if (currentPage === "user") {
    return <UserPage onNavigate={handleNavigate} />;
  }

  if (currentPage === "recipe" && selectedRecipe) {
    return (
      <RecipeDetails
        recipe={selectedRecipe}
        onBack={handleBackFromRecipe}
        isSaved={isSaved}
        onNavigate={handleNavigate}
        onSave={() => {
          setSavedRecipes((currentSaved) => {
            if (
              currentSaved.some((recipe) => recipe.id === selectedRecipe.id)
            ) {
              return currentSaved.filter(
                (recipe) => recipe.id !== selectedRecipe.id
              );
            }

            return [...currentSaved, selectedRecipe];
          });
        }}
      />
    );
  }

  return (
    <div className="home-page">
      {/* ==================== HEADER ==================== */}
      <div className="home-header">
        <div className="user-greeting">
          <img
            src="/images/kubi.png"
            alt="Kubi"
            className="home-kubi"
          />

          <div className="greeting-text">
            <p>Good day,</p>
            <strong>{profileState.firstName || "there"}!</strong>
          </div>
        </div>

        <button
          type="button"
          className="meal-plan-button"
          onClick={() => setCurrentPage("meal-plan")}
        >
          MEAL PLAN 📅
        </button>
      </div>

      {/* ==================== MAIN HEADING ==================== */}
      <div className="home-heading">
        <p>Let's plan</p>
        <h1>your next feast!</h1>
      </div>

      {/* ==================== AI SEARCH ==================== */}
      <form className="ai-search-box" onSubmit={handleGenerateRecipe}>
        <div className="ai-search-placeholder" style={{ flex: 1 }}>
          <span className="ai-food-icon">🍲</span>

          <input
            type="text"
            className="ai-search-input"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="May nais ka bang lutuin..?"
            disabled={isGenerating}
          />
        </div>

        <button
          type="submit"
          className="ai-search-button"
          disabled={isGenerating}
          title="Ask Kubi for a personalized recipe"
        >
          {isGenerating ? "⏳" : "🔍"}
        </button>
      </form>

      {isGenerating && (
        <p className="ai-status-message">
          Kubi is cooking up a personalized recipe for you...
        </p>
      )}

      {aiError && <p className="ai-error-message">{aiError}</p>}

      {/* ==================== CATEGORIES ==================== */}
      <div className="category-scroll">
        {categories.map((category) => (
          <button
            key={category}
            className={`category-button ${
              selectedCategory === category ? "active" : ""
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* ==================== RECIPE SECTION ==================== */}
      <div className="recipe-section">
        <h2>{selectedCategory} Recipes</h2>

        <div className="recipe-scroll">
          {allRecipes
            .filter((recipe) => recipe.categories.includes(selectedCategory))
            .map((recipe) => {
              const resolvedRecipe = {
                ...recipe,
                image: getHomeRecipeImage(recipe),
              };

              return (
                <div className="home-recipe-card" key={resolvedRecipe.id}>
                  <div className="recipe-card-info">
                    <div className="recipe-card-top">
                      <h3>{resolvedRecipe.name}</h3>
                      <span className="recipe-time">{resolvedRecipe.minutes} mins</span>
                    </div>

                    <div className="benefit-tags">
                      {resolvedRecipe.benefits.slice(0, 2).map((benefit) => (
                        <span className="benefit-tag" key={benefit}>
                          {benefit}
                        </span>
                      ))}
                    </div>

                    <div className="recipe-ingredients-block">
                      <h4>Main Ingredients</h4>
                      <p className="main-ingredients">
                        {resolvedRecipe.ingredients.slice(0, 5).join(", ")}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="instructions-button"
                      onClick={() => handleOpenRecipe(resolvedRecipe)}
                    >
                      See Instructions →
                    </button>
                  </div>

                  <div className="recipe-image-container">
                    <img
                      src={resolvedRecipe.image}
                      alt={resolvedRecipe.name}
                      className="home-recipe-image"
                      onError={(e) => {
                        const fallbackUrl = `${window.location.origin}${DEFAULT_DISH_IMAGE}`;
                        if (e.currentTarget.src !== fallbackUrl) {
                          e.currentTarget.src = DEFAULT_DISH_IMAGE;
                        }
                      }}
                    />

                    <button
                      type="button"
                      className={`save-recipe-button ${
                        savedRecipes.some(
                          (savedRecipe) => savedRecipe.id === resolvedRecipe.id
                        )
                          ? "saved"
                          : ""
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();

                        setSavedRecipes((currentSaved) => {
                          if (
                            currentSaved.some(
                              (savedRecipe) => savedRecipe.id === resolvedRecipe.id
                            )
                          ) {
                            return currentSaved.filter(
                              (savedRecipe) => savedRecipe.id !== resolvedRecipe.id
                            );
                          }

                          return [...currentSaved, resolvedRecipe];
                        });
                      }}
                    >
                      {savedRecipes.some(
                        (savedRecipe) => savedRecipe.id === resolvedRecipe.id
                      )
                        ? "♥"
                        : "♡"}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <BottomNavigation currentPage="home" onNavigate={handleNavigate} />
    </div>
  );
}

export default HomePage;