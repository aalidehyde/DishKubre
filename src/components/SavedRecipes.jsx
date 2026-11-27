import { useEffect, useState } from "react";
import "./SavedRecipes.css";
import BottomNavigation from "./BottomNavigation";

const DEFAULT_DISH_IMAGE = "/images/dishes/default-dish.jpg";

function SavedRecipeCard({ recipe, onSelectRecipe }) {
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
    <div
      className="saved-recipe-card"
      onClick={() => onSelectRecipe(recipe)}
    >
      <div className="saved-recipe-image-wrap">
        <img
          src={imgSrc}
          alt={recipe?.name || "Saved recipe"}
          className="saved-recipe-image"
          onError={() => {
            if (imgSrc !== DEFAULT_DISH_IMAGE) {
              setImgSrc(DEFAULT_DISH_IMAGE);
            }
          }}
        />
      </div>

      <div className="saved-recipe-info">
        <h2
          className="saved-recipe-title"
          style={{
            color: "#17251f",
            fontFamily: "inherit",
          }}
        >
          {recipe?.name}
        </h2>

        <p className="saved-recipe-time">
          {recipe?.minutes} mins
        </p>

        <div className="saved-recipe-benefits">
          {(recipe?.benefits || []).slice(0, 2).map((benefit) => (
            <span
              className="saved-benefit-tag"
              key={benefit}
            >
              {benefit}
            </span>
          ))}
        </div>
      </div>

      <span className="saved-arrow">
        →
      </span>
    </div>
  );
}

function SavedRecipes({
  savedRecipes,
  onSelectRecipe,
  onNavigate,
}) {
  return (
    <div className="saved-recipes-page">
      <div className="saved-recipes-header">
        <h1>Saved Recipes</h1>
        <p>Your favorite recipes in one place.</p>
      </div>

      {savedRecipes.length === 0 ? (
        <div className="empty-saved-recipes">
          <div className="empty-heart">♡</div>
          <h2>No saved recipes yet</h2>
          <p>
            Tap the heart on a recipe to save it here.
          </p>
        </div>
      ) : (
        <div className="saved-recipes-list">
          {savedRecipes.map((recipe) => (
            <SavedRecipeCard
              key={recipe.id}
              recipe={recipe}
              onSelectRecipe={onSelectRecipe}
            />
          ))}
        </div>
      )}

      <BottomNavigation
        currentPage="saved"
        onNavigate={onNavigate}
      />
    </div>
  );
}

export default SavedRecipes;