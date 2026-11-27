import "./UserPage.css";
import BottomNavigation from "./BottomNavigation";

function UserPage({ onNavigate }) {
  return (
    <div className="user-page">
      <div className="user-page-header">
        <h1>About DishKubre</h1>
        <p>Mula sa Kusina Mo, Planado ang Kalusugan Mo</p>
      </div>

      <div className="dishkubre-info-card">
        <div className="dishkubre-card-top">
          <img
            src="/images/kubi.png"
            alt="Kubi"
            className="dishkubre-kubi-avatar"
          />
          <div>
            <h2>DishKubre</h2>
            <span className="dishkubre-badge">Filipino Meal-Planning Suite</span>
          </div>
        </div>

        <p className="dishkubre-description">
          DishKubre helps you plan everyday Filipino meals around your available
          ingredients, weekly food budget, and health or nutritional preferences—combining
          curated local recipes with Kubi recipe suggestions and 7-day meal planning.
        </p>

        <div className="dishkubre-highlights">
          <span className="dishkubre-pill">Budget-Friendly (Php)</span>
          <span className="dishkubre-pill">Health &amp; Pantry Aware</span>
          <span className="dishkubre-pill">7-Day Meal Planner</span>
        </div>
      </div>

      <BottomNavigation currentPage="user" onNavigate={onNavigate} />
    </div>
  );
}

export default UserPage;