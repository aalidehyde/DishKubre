function BottomNavigation({ currentPage, onNavigate }) {
  const isUserActive = currentPage === "user" || currentPage === "profile";

  return (
    <div className="bottom-navigation">
      <button
        type="button"
        className={`bottom-nav-button ${
          currentPage === "home" ? "active" : ""
        }`}
        onClick={() => onNavigate("home")}
        aria-label="Home"
      >
        🏠
      </button>

      <button
        type="button"
        className={`bottom-nav-button ${
          currentPage === "saved" ? "active" : ""
        }`}
        onClick={() => onNavigate("saved")}
        aria-label="Saved Recipes"
      >
        ♡
      </button>

      <button
        type="button"
        className={`bottom-nav-button ${
          currentPage === "meal-plan" ? "active" : ""
        }`}
        onClick={() => onNavigate("meal-plan")}
        aria-label="Meal Plan"
      >
        📅
      </button>

      <button
        type="button"
        className={`bottom-nav-button ${isUserActive ? "active" : ""}`}
        onClick={() => onNavigate("user")}
        aria-label="About DishKubre"
      >
        ♙
      </button>
    </div>
  );
}

export default BottomNavigation;