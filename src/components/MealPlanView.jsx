import { useEffect, useState } from "react";
import "./MealPlanView.css";
import BottomNavigation from "./BottomNavigation";

const CONDITION_OPTIONS = [
  "Diabetes",
  "High blood pressure",
  "High cholesterol",
  "Chronic kidney disease",
  "Heart disease",
  "Anemia",
];

const NUTRITIONAL_OPTIONS = [
  "Low in iron",
  "Low in vitamin D",
  "Low in calcium",
  "Low in vitamin B12",
  "Low in folic acid",
  "Need more protein",
];

const COMMON_PANTRY_OPTIONS = [
  "rice",
  "eggs",
  "poultry",
  "ground-meat",
  "dried-fish",
  "tomato",
  "garlic",
  "onion",
  "moringo-leaves",
  "water-spinach",
  "squash",
  "chayote",
  "eggplant",
  "monggo-seeds",
  "bitter-gourd",
  "carrots",
  "potato",
];

function DishThumbnail({ dishName, className = "mp-meal-thumb" }) {
  const [imgSrc, setImgSrc] = useState("");
  const [loading, setLoading] = useState(Boolean(dishName));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setImgSrc("");
    setFailed(false);

    if (!dishName) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    fetch(
      `http://localhost:5001/api/dish-image?q=${encodeURIComponent(dishName)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data?.imageUrl) {
          setImgSrc(data.imageUrl);
          setFailed(false);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dishName]);

  if (loading && !imgSrc) {
    return <span className="mp-meal-thumb-fallback">⏳</span>;
  }

  if (!imgSrc || failed) {
    return <span className="mp-meal-thumb-fallback">🍽️</span>;
  }

  return (
    <img
      src={imgSrc}
      alt={dishName}
      className={className}
      onError={() => {
        setFailed(true);
        setLoading(false);
      }}
    />
  );
}

function formatIngredientLabel(id) {
  return String(id || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function MealPlanView({
  profile,
  onUpdateProfile,
  mealPlan,
  setMealPlan,
  onBack,
  onNavigate,
}) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [replacingSlotKey, setReplacingSlotKey] = useState("");
  const [planError, setPlanError] = useState("");
  const [activeMealDetail, setActiveMealDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const handleOpenMealDetail = async (dayNumber, meal) => {
    setActiveMealDetail(meal);
    if (Array.isArray(meal.instructions) && meal.instructions.length > 0) {
      return;
    }

    setIsLoadingDetail(true);
    try {
      const response = await fetch("http://localhost:5001/api/meal-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          mealName: meal.name,
          mealType: meal.mealType,
        }),
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data?.instructions)) {
        const enrichedMeal = {
          ...meal,
          ingredients:
            data.ingredients?.length > 0 ? data.ingredients : meal.ingredients,
          instructions: data.instructions,
        };
        setActiveMealDetail(enrichedMeal);
        setMealPlan((prev) => {
          if (!prev?.days) return prev;
          return {
            ...prev,
            days: prev.days.map((d) =>
              d.day !== dayNumber
                ? d
                : {
                    ...d,
                    meals: d.meals.map((m) =>
                      m.mealType === meal.mealType ? enrichedMeal : m
                    ),
                  }
            ),
          };
        });
      }
    } catch (err) {
      console.error("Could not load meal instructions:", err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Quick-Edit Preferences & Budget Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [draftBudget, setDraftBudget] = useState(profile.weeklyBudget || "");
  const [draftConditions, setDraftConditions] = useState(
    profile.selectedConditions || []
  );
  const [draftOtherCondition, setDraftOtherCondition] = useState(
    profile.otherCondition || ""
  );
  const [draftNeeds, setDraftNeeds] = useState(
    profile.selectedNutritionalNeeds || []
  );
  const [draftOtherNeed, setDraftOtherNeed] = useState(
    profile.otherNutritionalNeed || ""
  );
  const [draftIngredients, setDraftIngredients] = useState(
    profile.selectedIngredients || []
  );
  const [draftOtherIngredient, setDraftOtherIngredient] = useState(
    profile.otherIngredient || ""
  );

  const openEditModal = () => {
    setDraftBudget(profile.weeklyBudget || "");
    setDraftConditions(profile.selectedConditions || []);
    setDraftOtherCondition(profile.otherCondition || "");
    setDraftNeeds(profile.selectedNutritionalNeeds || []);
    setDraftOtherNeed(profile.otherNutritionalNeed || "");
    setDraftIngredients(profile.selectedIngredients || []);
    setDraftOtherIngredient(profile.otherIngredient || "");
    setIsEditModalOpen(true);
  };

  const toggleDraftItem = (setter, value) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );
  };

  const displayConditions = [
    ...(profile.selectedConditions || []).filter((c) => c !== "None"),
    ...(profile.otherCondition?.trim() ? [profile.otherCondition.trim()] : []),
  ];

  const displayNeeds = [
    ...(profile.selectedNutritionalNeeds || []).filter((n) => n !== "None"),
    ...(profile.otherNutritionalNeed?.trim()
      ? [profile.otherNutritionalNeed.trim()]
      : []),
  ];

  const displayIngredients = [
    ...(profile.selectedIngredients || []).map(formatIngredientLabel),
    ...(profile.otherIngredient?.trim()
      ? profile.otherIngredient
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []),
  ];

  const generateWeeklyPlan = async (overrideProfile = null) => {
    if (isGeneratingPlan) return;
    const activeProfile = overrideProfile || profile;

    setIsGeneratingPlan(true);
    setPlanError("");

    try {
      const response = await fetch(
        "http://localhost:5001/api/generate-meal-plan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activeProfile),
        }
      );

      const data = await response.json();
      if (!response.ok || !Array.isArray(data?.days)) {
        throw new Error(data?.error || "Failed to generate 7-day meal plan.");
      }

      setMealPlan(data);
      setSelectedDay(1);
    } catch (err) {
      setPlanError(
        err.message ||
          "Could not connect to Kubi's AI server. Make sure localhost:5001 is running."
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSavePreferences = async (shouldRegenerate) => {
    const updated = {
      ...profile,
      weeklyBudget: draftBudget,
      selectedConditions: draftConditions,
      otherCondition: draftOtherCondition,
      selectedNutritionalNeeds: draftNeeds,
      otherNutritionalNeed: draftOtherNeed,
      selectedIngredients: draftIngredients,
      otherIngredient: draftOtherIngredient,
    };

    onUpdateProfile(updated);
    setIsEditModalOpen(false);

    if (shouldRegenerate) {
      await generateWeeklyPlan(updated);
    }
  };

  const handleReplaceSingleMeal = async (dayNumber, mealType) => {
    const slotKey = `${dayNumber}-${mealType}`;
    if (replacingSlotKey) return;

    setReplacingSlotKey(slotKey);
    setPlanError("");

    try {
      const existingMealNames = (mealPlan?.days || []).flatMap((d) =>
        (d.meals || []).map((m) => m.name)
      );

      const response = await fetch("http://localhost:5001/api/replace-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          dayNumber,
          mealType,
          existingMealNames,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.meal) {
        throw new Error(data?.error || "Failed to replace meal.");
      }

      setMealPlan((prev) => {
        if (!prev?.days) return prev;
        const updatedDays = prev.days.map((d) => {
          if (d.day !== dayNumber) return d;
          const updatedMeals = d.meals.map((m) =>
            m.mealType.toLowerCase() === mealType.toLowerCase() ? data.meal : m
          );
          const calories = updatedMeals.reduce((s, m) => s + m.calories, 0);
          const estimatedCostPhp = updatedMeals.reduce(
            (s, m) => s + m.estimatedCostPhp,
            0
          );
          const macros = updatedMeals.reduce(
            (acc, m) => ({
              protein_g: acc.protein_g + (m.macros?.protein_g || 0),
              carbs_g: acc.carbs_g + (m.macros?.carbs_g || 0),
              fat_g: acc.fat_g + (m.macros?.fat_g || 0),
              sodium_mg: acc.sodium_mg + (m.macros?.sodium_mg || 0),
            }),
            { protein_g: 0, carbs_g: 0, fat_g: 0, sodium_mg: 0 }
          );

          return {
            ...d,
            meals: updatedMeals,
            totals: { calories, estimatedCostPhp, macros },
          };
        });

        const weeklyCostPhp = updatedDays.reduce(
          (s, d) => s + d.totals.estimatedCostPhp,
          0
        );
        const budgetNum = Number(
          String(profile.weeklyBudget || "").replace(/[^0-9.]/g, "")
        );

        return {
          ...prev,
          days: updatedDays,
          weeklyCostPhp,
          weeklyBudgetPhp: budgetNum > 0 ? budgetNum : 0,
          remainingBudgetPhp: budgetNum > 0 ? budgetNum - weeklyCostPhp : null,
        };
      });
    } catch (err) {
      setPlanError(err.message || "Could not replace this meal.");
    } finally {
      setReplacingSlotKey("");
    }
  };

  const numericBudget = Number(
    String(profile.weeklyBudget || "").replace(/[^0-9.]/g, "")
  );
  const weeklyCostPhp = mealPlan?.weeklyCostPhp || 0;
  const remainingBudgetPhp =
    numericBudget > 0 ? numericBudget - weeklyCostPhp : null;
  const isOverBudget =
    remainingBudgetPhp !== null && remainingBudgetPhp < 0;
  const budgetUsagePct =
    numericBudget > 0
      ? Math.min(100, Math.round((weeklyCostPhp / numericBudget) * 100))
      : 0;

  const currentDayObj =
    mealPlan?.days?.find((d) => d.day === selectedDay) ||
    mealPlan?.days?.[0] ||
    null;

  return (
    <div className="meal-plan-page">
      {/* ==================== TOP BAR ==================== */}
      <div className="mp-top-bar">
        <button type="button" className="mp-back-btn" onClick={onBack}>
          ← Home
        </button>

        <div className="mp-title-block">
          <h1>7-Day Meal Plan</h1>
          <p>
            Personalized for {profile.firstName || "You"}
            {profile.age ? ` • ${profile.age} yrs` : ""}
            {profile.selectedSex ? ` • ${profile.selectedSex}` : ""}
          </p>
        </div>

        <button
          type="button"
          className="mp-edit-profile-btn"
          onClick={openEditModal}
        >
          ✏️ Edit Preferences
        </button>
      </div>

      {/* ==================== PRE-LOADED PROFILE SUMMARY ==================== */}
      <div className="mp-profile-card">
        <div className="mp-profile-header">
          <h2>Your DishKubre Profile & Pantry</h2>
          <span className="mp-profile-badge">Synced from ID Card</span>
        </div>

        <div className="mp-profile-grid">
          <div className="mp-profile-item">
            <span className="mp-profile-label">Health Conditions / Allergies</span>
            <span className="mp-profile-value">
              {displayConditions.length > 0
                ? displayConditions.join(", ")
                : "None"}
            </span>
          </div>

          <div className="mp-profile-item">
            <span className="mp-profile-label">Nutritional Needs</span>
            <span className="mp-profile-value">
              {displayNeeds.length > 0 ? displayNeeds.join(", ") : "None"}
            </span>
          </div>

          <div className="mp-profile-item">
            <span className="mp-profile-label">Available Ingredients</span>
            {displayIngredients.length > 0 ? (
              <div className="mp-ingredients-vertical">
                {displayIngredients.map((item, idx) => (
                  <span key={`${item}-${idx}`} className="mp-ingredient-line">
                    • {item}
                  </span>
                ))}
              </div>
            ) : (
              <span className="mp-profile-value">
                Common household staples
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ==================== WEEKLY BUDGET TRACKER ==================== */}
      <div className="mp-budget-card">
        <div className="mp-budget-top">
          <div className="mp-budget-metrics">
            <div className="mp-metric">
              <span className="mp-metric-label">Weekly Food Budget</span>
              <span className="mp-metric-value">
                {numericBudget > 0 ? `₱${numericBudget.toLocaleString()}` : "Not set"}
              </span>
            </div>

            {mealPlan && (
              <>
                <div className="mp-metric">
                  <span className="mp-metric-label">7-Day Plan Cost</span>
                  <span className="mp-metric-value">
                    ₱{weeklyCostPhp.toLocaleString()}
                  </span>
                </div>

                {remainingBudgetPhp !== null && (
                  <div className="mp-metric">
                    <span className="mp-metric-label">Remaining Budget</span>
                    <span
                      className={`mp-metric-value ${
                        isOverBudget ? "over" : "ok"
                      }`}
                    >
                      {isOverBudget
                        ? `-₱${Math.abs(remainingBudgetPhp).toLocaleString()} (Over)`
                        : `₱${remainingBudgetPhp.toLocaleString()}`}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            className="mp-generate-btn"
            onClick={() => generateWeeklyPlan()}
            disabled={isGeneratingPlan}
          >
            {isGeneratingPlan
              ? "⏳ Kubi is planning 7 days..."
              : mealPlan
              ? "🔄 Regenerate 7-Day Plan"
              : "✨ Generate 7-Day Meal Plan"}
          </button>
        </div>

        {mealPlan && numericBudget > 0 && (
          <div className="mp-budget-bar-track">
            <div
              className={`mp-budget-bar-fill ${isOverBudget ? "over" : ""}`}
              style={{ width: `${budgetUsagePct}%` }}
            />
          </div>
        )}
      </div>

      {planError && <p className="ai-error-message">{planError}</p>}

      {/* ==================== EMPTY STATE OR 7-DAY PLAN ==================== */}
      {!mealPlan ? (
        <div className="mp-empty-state">
          <img src="/images/kubi.png" alt="Kubi" />
          <h3>Ready to build your 7-day plan, {profile.firstName || "friend"}!</h3>
          <p>
            Kubi already loaded your health conditions, nutritional needs, pantry
            ingredients, and ₱{numericBudget || "weekly"} budget above. Tap{" "}
            <strong>Generate 7-Day Meal Plan</strong> to create Breakfast, Lunch,
            and Dinner for Days 1–7.
          </p>
          <button
            type="button"
            className="mp-generate-btn"
            onClick={() => generateWeeklyPlan()}
            disabled={isGeneratingPlan}
          >
            {isGeneratingPlan
              ? "⏳ Generating your week..."
              : "✨ Generate 7-Day Meal Plan"}
          </button>
        </div>
      ) : (
        <>
          {/* Day 1 - Day 7 Tabs */}
          <div className="mp-day-scroll">
            {mealPlan.days.map((d) => (
              <button
                key={d.day}
                type="button"
                className={`mp-day-pill ${
                  selectedDay === d.day ? "active" : ""
                }`}
                onClick={() => setSelectedDay(d.day)}
              >
                <span className="mp-day-pill-label">Day</span>
                <span className="mp-day-pill-num">{d.day}</span>
                <span className="mp-day-pill-cost">
                  ₱{d.totals.estimatedCostPhp}
                </span>
              </button>
            ))}
          </div>

          {currentDayObj && (
            <>
              {/* Daily Nutrition & Dietary Safety Summary */}
              <div className="mp-day-summary-card">
                <div className="mp-day-summary-top">
                  <h3>
                    Nutrition Summary (Day {currentDayObj.day}) •{" "}
                    {currentDayObj.meals.length} meals
                  </h3>
                  <span className="mp-day-kcal-badge">
                    {currentDayObj.totals.calories} kcal • ₱
                    {currentDayObj.totals.estimatedCostPhp}
                  </span>
                </div>

                <div className="mp-macro-grid">
                  <div className="mp-macro-box">
                    <span>Protein</span>
                    <strong>{currentDayObj.totals.macros.protein_g}g</strong>
                  </div>
                  <div className="mp-macro-box">
                    <span>Carbs</span>
                    <strong>{currentDayObj.totals.macros.carbs_g}g</strong>
                  </div>
                  <div className="mp-macro-box">
                    <span>Fat</span>
                    <strong>{currentDayObj.totals.macros.fat_g}g</strong>
                  </div>
                  <div className="mp-macro-box">
                    <span>Sodium</span>
                    <strong>{currentDayObj.totals.macros.sodium_mg}mg</strong>
                  </div>
                </div>

                <div className="mp-safety-banner">
                  ✓ Dietary Safety Check:{" "}
                  {displayConditions.length > 0
                    ? `Filtered & adapted for ${displayConditions.join(", ")}.`
                    : "Balanced for everyday household nutrition."}
                </div>
              </div>

              {/* Breakfast, Lunch, Dinner Slots */}
              <div className="mp-meals-list">
                {currentDayObj.meals.map((meal) => {
                  const slotKey = `${currentDayObj.day}-${meal.mealType}`;
                  const isReplacing = replacingSlotKey === slotKey;

                  return (
                    <div key={slotKey}>
                      <div className="mp-meal-slot-header">
                        <span className="mp-meal-type-label">
                          {meal.mealType}
                        </span>
                        <button
                          type="button"
                          className="mp-replace-btn"
                          disabled={Boolean(replacingSlotKey)}
                          onClick={() =>
                            handleReplaceSingleMeal(
                              currentDayObj.day,
                              meal.mealType
                            )
                          }
                        >
                          {isReplacing ? "Replacing..." : "⇄ Replace"}
                        </button>
                      </div>

                      <div
                        className="mp-meal-card"
                        onClick={() => handleOpenMealDetail(currentDayObj.day, meal)}
                      >
                        <div className="mp-meal-card-body">
                          <div className="mp-meal-card-top">
                            <h4>{meal.name}</h4>
                            <span className="mp-meal-cost">
                              ₱{meal.estimatedCostPhp}
                            </span>
                          </div>

                          <div className="mp-meal-meta">
                            <span>⏱ {meal.minutes} mins</span>
                            <span>🔥 {meal.calories} kcal</span>
                            <span>
                              P: {meal.macros?.protein_g}g • C:{" "}
                              {meal.macros?.carbs_g}g • F: {meal.macros?.fat_g}g
                            </span>
                          </div>

                          {meal.safetyNote && (
                            <p className="mp-meal-safety">✓ {meal.safetyNote}</p>
                          )}

                          {meal.benefits?.length > 0 && (
                            <div className="mp-meal-tags">
                              {meal.benefits.map((b) => (
                                <span className="mp-meal-tag" key={b}>
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}

                          <span className="mp-view-details-link">
                            View Nutrition, Benefits & Recipe →
                          </span>
                        </div>

                        <div className="mp-meal-thumb-wrap">
                          <DishThumbnail dishName={meal.name} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ==================== QUICK-EDIT PREFERENCES & BUDGET MODAL ==================== */}
      {isEditModalOpen && (
        <div
          className="mp-modal-backdrop"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div className="mp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h2>Edit Budget, Conditions & Pantry</h2>
              <button
                type="button"
                className="mp-modal-close"
                onClick={() => setIsEditModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mp-field-group">
              <label>Weekly Food Budget (Php)</label>
              <input
                type="number"
                className="mp-text-input"
                value={draftBudget}
                onChange={(e) => setDraftBudget(e.target.value)}
                placeholder="e.g. 1200"
              />
              <div className="mp-preset-row">
                {["500", "800", "1000", "1500", "2000"].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`mp-preset-chip ${
                      String(draftBudget) === amt ? "active" : ""
                    }`}
                    onClick={() => setDraftBudget(amt)}
                  >
                    ₱{amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="mp-field-group">
              <label>Health Conditions & Allergies</label>
              <div className="mp-chip-grid">
                {CONDITION_OPTIONS.map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    className={`mp-toggle-chip ${
                      draftConditions.includes(cond) ? "selected" : ""
                    }`}
                    onClick={() => toggleDraftItem(setDraftConditions, cond)}
                  >
                    {cond}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="mp-text-input"
                style={{ marginTop: "8px" }}
                value={draftOtherCondition}
                onChange={(e) => setDraftOtherCondition(e.target.value)}
                placeholder="Other conditions or allergies (e.g. Peanuts, Shrimp)"
              />
            </div>

            <div className="mp-field-group">
              <label>Nutritional Needs</label>
              <div className="mp-chip-grid">
                {NUTRITIONAL_OPTIONS.map((need) => (
                  <button
                    key={need}
                    type="button"
                    className={`mp-toggle-chip ${
                      draftNeeds.includes(need) ? "selected" : ""
                    }`}
                    onClick={() => toggleDraftItem(setDraftNeeds, need)}
                  >
                    {need}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="mp-text-input"
                style={{ marginTop: "8px" }}
                value={draftOtherNeed}
                onChange={(e) => setDraftOtherNeed(e.target.value)}
                placeholder="Other nutritional needs"
              />
            </div>

            <div className="mp-field-group">
              <label>Available Pantry Ingredients</label>
              <div className="mp-chip-grid">
                {COMMON_PANTRY_OPTIONS.map((ing) => (
                  <button
                    key={ing}
                    type="button"
                    className={`mp-toggle-chip ${
                      draftIngredients.includes(ing) ? "selected" : ""
                    }`}
                    onClick={() => toggleDraftItem(setDraftIngredients, ing)}
                  >
                    {formatIngredientLabel(ing)}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="mp-text-input"
                style={{ marginTop: "8px" }}
                value={draftOtherIngredient}
                onChange={(e) => setDraftOtherIngredient(e.target.value)}
                placeholder="Extra ingredients (comma-separated, e.g. tofu, cabbage)"
              />
            </div>

            <div className="mp-modal-actions">
              <button
                type="button"
                className="mp-secondary-btn"
                onClick={() => handleSavePreferences(false)}
              >
                Save Only
              </button>
              <button
                type="button"
                className="mp-primary-btn"
                onClick={() => handleSavePreferences(true)}
              >
                Save & Regenerate Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MEAL NUTRITION & RECIPE DETAIL MODAL ==================== */}
      {activeMealDetail && (
        <div
          className="mp-modal-backdrop"
          onClick={() => setActiveMealDetail(null)}
        >
          <div className="mp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h2>{activeMealDetail.name}</h2>
              <button
                type="button"
                className="mp-modal-close"
                onClick={() => setActiveMealDetail(null)}
              >
                ✕
              </button>
            </div>

            <DishThumbnail
              dishName={activeMealDetail.name}
              className="mp-modal-dish-img"
            />

            <p style={{ margin: "0 0 12px", color: "#718078", fontWeight: 700 }}>
              {activeMealDetail.mealType} • ⏱ {activeMealDetail.minutes} mins •
              Est. Cost: ₱{activeMealDetail.estimatedCostPhp}
            </p>

            {/* Objective 4: Clear Nutritional Breakdown */}
            <div className="mp-macro-grid">
              <div className="mp-macro-box">
                <span>Calories</span>
                <strong>{activeMealDetail.calories} kcal</strong>
              </div>
              <div className="mp-macro-box">
                <span>Protein</span>
                <strong>{activeMealDetail.macros?.protein_g}g</strong>
              </div>
              <div className="mp-macro-box">
                <span>Carbs</span>
                <strong>{activeMealDetail.macros?.carbs_g}g</strong>
              </div>
              <div className="mp-macro-box">
                <span>Fat / Sodium</span>
                <strong>
                  {activeMealDetail.macros?.fat_g}g /{" "}
                  {activeMealDetail.macros?.sodium_mg}mg
                </strong>
              </div>
            </div>

            {/* Objective 3: Dietary Safety Note */}
            {activeMealDetail.safetyNote && (
              <div className="mp-safety-banner">
                ✓ Dietary Safety: {activeMealDetail.safetyNote}
              </div>
            )}

            {/* Objective 4: Health Benefits */}
            {activeMealDetail.benefits?.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: "16px" }}>
                  Nutritional & Health Benefits
                </h3>
                <div className="mp-meal-tags">
                  {activeMealDetail.benefits.map((b) => (
                    <span className="mp-meal-tag" key={b}>
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients */}
            {activeMealDetail.ingredients?.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: "16px" }}>
                  Ingredients
                </h3>
                <ul style={{ paddingLeft: "20px", margin: 0 }}>
                  {activeMealDetail.ingredients.map((item, i) => (
                    <li key={i} style={{ marginBottom: "6px" }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instructions */}
            <div style={{ marginTop: "16px" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "16px" }}>
                Cooking Instructions
              </h3>
              {isLoadingDetail ? (
                <p style={{ color: "#718078", fontWeight: 700 }}>
                  ⏳ Loading step-by-step recipe instructions...
                </p>
              ) : activeMealDetail.instructions?.length > 0 ? (
                <ol style={{ paddingLeft: "20px", margin: 0 }}>
                  {activeMealDetail.instructions.map((step, i) => (
                    <li key={i} style={{ marginBottom: "8px", lineHeight: 1.45 }}>
                      {step}
                    </li>
                  ))}
                </ol>
              ) : (
                <p style={{ color: "#718078" }}>No instructions available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNavigation currentPage="meal-plan" onNavigate={onNavigate} />
    </div>
  );
}

export default MealPlanView;