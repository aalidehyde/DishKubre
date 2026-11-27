import { useEffect, useState } from "react";
import "./RecipeDetails.css";
import BottomNavigation from "./BottomNavigation";

const DEFAULT_DISH_IMAGE = "/images/dishes/default-dish.jpg";

function RecipeDetails({
  recipe,
  onBack,
  onSave,
  isSaved,
  onNavigate,
}) {
  const [imgSrc, setImgSrc] = useState(
    recipe?.image || recipe?.imageUrl || DEFAULT_DISH_IMAGE
  );

  useEffect(() => {
    let cancelled = false;
    const initialSrc =
      recipe?.image || recipe?.imageUrl || DEFAULT_DISH_IMAGE;
    setImgSrc(initialSrc);

    if (!recipe?.image && !recipe?.imageUrl && recipe?.name) {
      fetch(
        `http://localhost:5001/api/dish-image?q=${encodeURIComponent(recipe.name)}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && data?.imageUrl) {
            setImgSrc(data.imageUrl);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [recipe]);

  return (
    <div className="recipe-details-page">
      {/* ==================== HEADER ==================== */}
      <div className="recipe-details-header">
        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          ←
        </button>

        <h1>Recipe Details</h1>

        <button
          type="button"
          className={`details-save-button ${isSaved ? "saved" : ""}`}
          onClick={onSave}
        >
          {isSaved ? "♥" : "♡"}
        </button>
      </div>

      {/* ==================== RECIPE IMAGE ==================== */}
      <div className="details-image-container">
        <img
          src={imgSrc}
          alt={recipe?.name || "Dish image"}
          className="details-recipe-image"
          onError={() => {
            if (imgSrc !== DEFAULT_DISH_IMAGE) {
              setImgSrc(DEFAULT_DISH_IMAGE);
            }
          }}
        />
      </div>

      {/* ==================== RECIPE INFORMATION ==================== */}
      <div className="recipe-details-content">
        <h2
          className="recipe-details-title"
          style={{
            color: "#1c1917",
            fontFamily: "inherit",
          }}
        >
          {recipe?.name}
        </h2>

        <p className="details-time">
          {recipe?.minutes} mins
        </p>

        {/* ==================== BENEFITS ==================== */}
        <section className="details-section">
          <h3>Nutritional Benefits</h3>

          <div className="details-benefits">
            {(recipe?.benefits || []).map((benefit) => (
              <span
                className="details-benefit-tag"
                key={benefit}
              >
                {benefit}
              </span>
            ))}
          </div>
        </section>

        {/* ==================== INGREDIENTS ==================== */}
        <section className="details-section">
          <h3>Main Ingredients</h3>

          <ul className="ingredients-list">
            {(recipe?.ingredients || []).map((ingredient) => (
              <li key={ingredient}>
                {ingredient}
              </li>
            ))}
          </ul>
        </section>

        {/* ==================== INSTRUCTIONS ==================== */}
        <section className="details-section">
          <h3>Instructions</h3>

          <ol className="instructions-list">
            {(recipe?.instructions || []).map((instruction, index) => (
              <li key={index}>
                {instruction}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <BottomNavigation
        currentPage="home"
        onNavigate={onNavigate}
      />
    </div>
  );
}

export default RecipeDetails;