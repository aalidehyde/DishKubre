import { useState } from "react";
import "./App.css";
import HomePage from "./components/HomePage";

function App() {
  const [currentSlide, setCurrentSlide] = useState(1);

  // Slide 1
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [otherCondition, setOtherCondition] = useState("");

  // Slide 2
  const [selectedNutritionalNeeds, setSelectedNutritionalNeeds] = useState([]);
  const [otherNutritionalNeed, setOtherNutritionalNeed] = useState("");

  // Slide 3
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [otherIngredient, setOtherIngredient] = useState("");

  // Slide 4
  const [weeklyBudget, setWeeklyBudget] = useState("");

  // Slide 5
  const [selectedSex, setSelectedSex] = useState("");
  const [age, setAge] = useState("");

  // Slide 6
  const [firstName, setFirstName] = useState("");

  // Home page
  const [currentPage, setCurrentPage] = useState("onboarding");
  const [selectedCategory, setSelectedCategory] = useState("Tampok");

  const conditions = [
    {
      english: "Diabetes",
      tagalog: "Diyabetis",
    },
    {
      english: "High blood pressure",
      tagalog: "Altapresyon",
    },
    {
      english: "High cholesterol",
      tagalog: "Mataas na kolesterol",
    },
    {
      english: "Chronic kidney disease",
      tagalog: "Sakit sa bato",
    },
    {
      english: "Heart disease",
      tagalog: "Sakit sa puso",
    },
    {
      english: "Anemia",
      tagalog: "Kakulangan sa dugo",
    },
    {
      english: "None",
      tagalog: "Wala",
    },
  ];

  const nutritionalNeeds = [
    {
      english: "Low in iron",
      tagalog: "Kulang sa iron",
    },
    {
      english: "Low in vitamin D",
      tagalog: "Kulang sa bitamina D",
    },
    {
      english: "Low in calcium",
      tagalog: "Kulang sa calcium",
    },
    {
      english: "Low in vitamin B12",
      tagalog: "Kulang sa bitamina B12",
    },
    {
      english: "Low in folic acid",
      tagalog: "Kulang sa folic acid",
    },
    {
      english: "Need more protein",
      tagalog: "Kailangan pa ng protina",
    },
    {
      english: "None",
      tagalog: "Wala",
    },
  ];

  const ingredientCategories = [
    {
      category: "FRESH PRODUCE",
      ingredients: [
        {
          id: "rice",
          english: "Rice",
          tagalog: "Bigas",
          image: "/images/ingredients/rice.png",
        },
        {
          id: "tomato",
          english: "Tomato",
          tagalog: "Kamatis",
          image: "/images/ingredients/tomato.png",
        },
        {
          id: "garlic",
          english: "Garlic",
          tagalog: "Bawang",
          image: "/images/ingredients/garlic.png",
        },
        {
          id: "onion",
          english: "Onion",
          tagalog: "Sibuyas",
          image: "/images/ingredients/onion.png",
        },
        {
          id: "birds-eye-chili",
          english: "Bird's Eye Chili",
          tagalog: "Sili",
          image: "/images/ingredients/bird's eye chili.png",
        },
        {
          id: "green-beans",
          english: "Green Beans",
          tagalog: "Sitaw",
          image: "/images/ingredients/green beans.png",
        },
        {
          id: "monggo-seeds",
          english: "Monggo Seeds",
          tagalog: "Monggo",
          image: "/images/ingredients/monggo seeds.png",
        },
        {
          id: "ginger",
          english: "Ginger",
          tagalog: "Luya",
          image: "/images/ingredients/ginger.png",
        },
        {
          id: "bitter-gourd",
          english: "Bitter Gourd",
          tagalog: "Ampalaya",
          image: "/images/ingredients/bitter gourd.png",
        },
        {
          id: "carrots",
          english: "Carrots",
          tagalog: "Karot",
          image: "/images/ingredients/carrots.png",
        },
        {
          id: "potato",
          english: "Potato",
          tagalog: "Patatas",
          image: "/images/ingredients/potato.png",
        },
        {
          id: "moringo-leaves",
          english: "Moringo",
          tagalog: "Malunggay",
          image: "/images/ingredients/moringo.png",
        },
        {
          id: "water-spinach",
          english: "Water Spinach",
          tagalog: "Kangkong",
          image: "/images/ingredients/water spinach.png",
        },
        {
          id: "squash",
          english: "Squash",
          tagalog: "Kalabasa",
          image: "/images/ingredients/squash.png",
        },
        {
          id: "chayote",
          english: "Chayote",
          tagalog: "Sayote",
          image: "/images/ingredients/chayote.png",
        },
        {
          id: "okra",
          english: "Okra",
          tagalog: "",
          image: "/images/ingredients/okra.png",
        },
        {
          id: "eggplant",
          english: "Eggplant",
          tagalog: "Talong",
          image: "/images/ingredients/eggplant.png",
        },
        {
          id: "sweet-potato",
          english: "Sweet Potato",
          tagalog: "Kamote",
          image: "/images/ingredients/sweet potato.png",
        },
      ],
    },

    {
      category: "SAWSAWAN AT PAMPAALAT",
      ingredients: [
        {
          id: "soy-sauce",
          english: "Soy Sauce",
          tagalog: "Toyo",
          image: "/images/ingredients/soy sauce.png",
        },
        {
          id: "vinegar",
          english: "Vinegar",
          tagalog: "Suka",
          image: "/images/ingredients/vinegar.png",
        },
        {
          id: "fish-sauce",
          english: "Fish Sauce",
          tagalog: "Patis",
          image: "/images/ingredients/fish sauce.png",
        },
        {
          id: "bagoong",
          english: "Bagoong",
          tagalog: "",
          image: "/images/ingredients/bagoong.png",
        },
        {
          id: "cooking-oil",
          english: "Cooking Oil",
          tagalog: "",
          image: "/images/ingredients/cooking oil.png",
        },
        {
          id: "banana-ketchup",
          english: "Banana Ketchup",
          tagalog: "",
          image: "/images/ingredients/banana ketchup.png",
        },
        {
          id: "salt",
          english: "Salt",
          tagalog: "Asin",
          image: "/images/ingredients/salt.png",
        },
        {
          id: "pepper",
          english: "Pepper",
          tagalog: "Paminta",
          image: "/images/ingredients/pepper.png",
        },
      ],
    },
    {
      category: "INSANT FOODS",
      ingredients: [
        {
          id: "instant-noodles",
          english: "Instant Noodles",
          tagalog: "",
          image: "/images/ingredients/instant noodles.png",
        },
        {
          id: "canned-goods",
          english: "Canned Goods",
          tagalog: "Delata",
          image: "/images/ingredients/canned goods.png",
        },
        {
          id: "pancit-noodles",
          english: "Pancit Noodles",
          tagalog: "",
          image: "/images/ingredients/pancit noodles.png",
        },
        {
          id: "biscuits-and-crackers",
          english: "Biscuits and Crackers",
          tagalog: "",
          image: "/images/ingredients/biscuits and crackers.png",
        },
      ],
    },
    {
      category: "FLAVOR MIXES",
      ingredients: [
        {
          id: "sinigang-mix",
          english: "Sinigang Mix",
          tagalog: "",
          image: "/images/ingredients/sinigang mix.png",
        },
        {
          id: "annatto-seed",
          english: "Annatto Seed/Oil",
          tagalog: "",
          image: "/images/ingredients/annatto seed.png",
        },
        {
          id: "bouillon-cubes",
          english: "Bouillon Cubes",
          tagalog: "",
          image: "/images/ingredients/bouillon cubes.png",
        },
      ],
    },
    {
      category: "DAIRY & PROTEIN",
      ingredients: [
        {
          id: "eggs",
          english: "Eggs",
          tagalog: "Itlog",
          image: "/images/ingredients/eggs.png",
        },
        {
          id: "ground-meat",
          english: "Ground Meat",
          tagalog: "Giniling na Karne",
          image: "/images/ingredients/ground meat.png",
        },
        {
          id: "fresh-milk",
          english: "Fresh Milk",
          tagalog: "Gatas",
          image: "/images/ingredients/fresh milk.png",
        },
        {
          id: "poultry",
          english: "Poultry",
          tagalog: "Manok",
          image: "/images/ingredients/poultry.png",
        },
        {
          id: "tocino",
          english: "Tocino",
          tagalog: "",
          image: "/images/ingredients/tocino.png",
        },
        {
          id: "longganisa",
          english: "Longganisa",
          tagalog: "",
          image: "/images/ingredients/longganisa.png",
        },
        {
          id: "tapa",
          english: "Tapa",
          tagalog: "",
          image: "/images/ingredients/tapa.png",
        },
        {
          id: "hotdog",
          english: "Hotdog",
          tagalog: "",
          image: "/images/ingredients/hotdog.png",
        },
        {
          id: "dried-fish",
          english: "Fish",
          tagalog: "Daing, Bangus, atbp.",
          image: "/images/ingredients/dried fish.png",
        },
        {
          id: "cheese",
          english: "Cheese",
          tagalog: "",
          image: "/images/ingredients/cheese.png",
        },
        {
          id: "condensed-milk",
          english: "Condensed Milk",
          tagalog: "",
          image: "/images/ingredients/condensed milk.png",
        },
        {
          id: "evaporated-milk",
          english: "Evaporated Milk",
          tagalog: "",
          image: "/images/ingredients/evaporated milk.png",
        },
      ],
    },
    {
      category: "FRUITS",
      ingredients: [
        {
          id: "banana",
          english: "Banana",
          tagalog: "Saging",
          image: "/images/ingredients/banana.png",
        },
        {
          id: "watermelon",
          english: "Watermelon",
          tagalog: "Pakwan",
          image: "/images/ingredients/watermelon.png",
        },
        {
          id: "papaya",
          english: "Papaya",
          tagalog: "",
          image: "/images/ingredients/papaya.png",
        },
      ],
    },
    {
      category: "BREAD & SWEET SPREADS",
      ingredients: [
        {
          id: "pandesal",
          english: "Pandesal",
          tagalog: "",
          image: "/images/ingredients/pandesal.png",
        },
        {
          id: "wheat-bread",
          english: "Wheat Bread",
          tagalog: "",
          image: "/images/ingredients/wheat bread.png",
        },
        {
          id: "peanut-butter",
          english: "Peanut Butter",
          tagalog: "",
          image: "/images/ingredients/peanut butter.png",
        },
        {
          id: "spreads",
          english: "Spreads",
          tagalog: "Palaman",
          image: "/images/ingredients/cheez whiz.png",
        },
        {
          id: "ube-halaya",
          english: "Ube Halaya",
          tagalog: "",
          image: "/images/ingredients/ube halaya.png",
        },
        {
          id: "coffee",
          english: "Coffee",
          tagalog: "Kape",
          image: "/images/ingredients/coffee.png",
        },
      ],
    },
  ];

  const categories = [
    "Tampok",
    "Tipid Hits",
    "Gulay-Bida",
    "No Sugar",
    "Lutong Bahay Classics",
    "Iwas Asin",
    "Madaling Lutuin",
    "Kiddie Choice",
  ];

  const homeRecipes = [
    {
      name: "Adobong Manok",
      minutes: 25,
      ingredients: [
        "Chicken",
        "Soy sauce",
        "Vinegar",
        "Garlic",
        "Laurel leaves",
      ],
      benefits: [
        "High in protein",
        "Low in sugar",
        "Good source of iron",
      ],
    },
    {
      name: "Ginisang Kalabasa",
      minutes: 20,
      ingredients: [
        "Kalabasa",
        "Garlic",
        "Onion",
        "Tomato",
        "Egg",
      ],
      benefits: [
        "Good source of fiber",
        "Vitamin A source",
        "Low in sugar",
      ],
    },
    {
      name: "Tinolang Manok",
      minutes: 35,
      ingredients: [
        "Chicken",
        "Ginger",
        "Sayote",
        "Malunggay",
        "Onion",
      ],
      benefits: [
        "High in protein",
        "Good source of iron",
        "Vitamin A source",
      ],
    },
    {
      name: "Tortang Talong",
      minutes: 25,
      ingredients: [
        "Eggplant",
        "Egg",
        "Tomato",
        "Onion",
        "Garlic",
      ],
      benefits: [
        "Good source of fiber",
        "High in protein",
        "Vitamin A source",
      ],
    },
  ];

  const toggleCondition = (condition) => {
    setSelectedConditions((current) =>
      current.includes(condition)
        ? current.filter((item) => item !== condition)
        : [...current, condition]
    );
  };

  const toggleNutritionalNeed = (need) => {
    setSelectedNutritionalNeeds((current) =>
      current.includes(need)
        ? current.filter((item) => item !== need)
        : [...current, need]
    );
  };

  const toggleIngredient = (ingredientId) => {
    setSelectedIngredients((current) =>
      current.includes(ingredientId)
        ? current.filter((item) => item !== ingredientId)
        : [...current, ingredientId]
    );
  };

  const toggleCategoryIngredients = (categoryIngredients = []) => {
    const categoryIds = categoryIngredients
      .map((item) => item.id)
      .filter(Boolean);
    if (categoryIds.length === 0) return;

    setSelectedIngredients((current) => {
      const allSelected = categoryIds.every((id) => current.includes(id));
      if (allSelected) {
        return current.filter((id) => !categoryIds.includes(id));
      }
      return Array.from(new Set([...current, ...categoryIds]));
    });
  };

  if (currentPage === "home") {
    return (
      <HomePage
        firstName={firstName}
        selectedConditions={selectedConditions}
        otherCondition={otherCondition}
        selectedNutritionalNeeds={selectedNutritionalNeeds}
        otherNutritionalNeed={otherNutritionalNeed}
        selectedIngredients={selectedIngredients}
        otherIngredient={otherIngredient}
        weeklyBudget={weeklyBudget}
        selectedSex={selectedSex}
        age={age}
      />
    );
  }

  return (
    <div className="app">
      <div className="onboarding-card">
        {/* Progress */}
        <div className="progress">
          <div
            className="progress-bar"
            style={{ width: `${(currentSlide / 7) * 100}%` }}
          ></div>
        </div>

        <p className="step">{currentSlide} of 7</p>

        {/* ==================== SLIDE 1 ==================== */}
        {currentSlide === 1 && (
          <div className="slide-transition">
            <p className="section-label">ABOUT YOU</p>

            <h1>Let's get to know you!</h1>

            <p className="question">
              Do you have any health conditions?
            </p>

            <p className="translation question-translation">
              (Mayroon ka bang mga sakit?)
            </p>

            <p className="subtitle">
              Select all that apply.
            </p>

            <div className="options">
              {conditions.map((condition) => (
                <button
                  key={condition.english}
                  type="button"
                  className={`option ${
                    selectedConditions.includes(condition.english)
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => toggleCondition(condition.english)}
                >
                  <span className="condition-english">
                    {condition.english}
                  </span>

                  <span className="translation condition-filipino">
                    ({condition.tagalog})
                  </span>
                </button>
              ))}

              <div className="other">
                <span>Others:</span>

                <div className="other-input-area">
                  <input
                    id="otherCondition"
                    type="text"
                    value={otherCondition}
                    onChange={(e) => setOtherCondition(e.target.value)}
                  />

                  <p className="allergy-note">
                    If you have any allergies, also indicate them here.
                    <span>
                      Ilahad din ang iyong mga alerhiya dito kung meron man.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <button
              className="continue-button"
              onClick={() => setCurrentSlide(2)}
            >
              Continue
            </button>
          </div>
        )}

        {/* ==================== SLIDE 2 ==================== */}
        {currentSlide === 2 && (
          <div className="slide-transition">
            <p className="section-label">ABOUT YOU</p>

            <h1>Let's get to know you!</h1>

            <p className="question">
              Do you have any diagnosed nutritional deficiencies or needs?
            </p>

            <p className="translation question-translation">
              (Mayroon ka bang kakulangan o pangangailangang
              pangnutrisyong natukoy ng doktor?)
            </p>

            <p className="subtitle">
              Select all that apply.
            </p>

            <div className="options">
              {nutritionalNeeds.map((need) => (
                <button
                  key={need.english}
                  type="button"
                  className={`option ${
                    selectedNutritionalNeeds.includes(need.english)
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    toggleNutritionalNeed(need.english)
                  }
                >
                  <span className="condition-english">
                    {need.english}
                  </span>

                  <span className="translation condition-filipino">
                    ({need.tagalog})
                  </span>
                </button>
              ))}

              <div className="other">
                <span>Others:</span>

                <div className="other-input-area">
                  <input
                    id="otherNutritionalNeed"
                    type="text"
                    value={otherNutritionalNeed}
                    onChange={(e) =>
                      setOtherNutritionalNeed(e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="navigation-buttons">
              <button
                className="back-button"
                onClick={() => setCurrentSlide(1)}
              >
                Back
              </button>

              <button
                className="continue-button"
                onClick={() => setCurrentSlide(3)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 3 ==================== */}
        {currentSlide === 3 && (
          <div className="slide-transition">
            <p className="section-label">ABOUT YOU</p>

            <h1>Let's get to know you!</h1>

            <p className="question">
              What ingredients are easily available to you?
            </p>

            <p className="translation question-translation">
              (Anong mga sangkap ang madali mong makuha?)
            </p>

            <p className="subtitle">
              Select all that apply. (Tip: Click a category header or hold Shift + click any item to toggle the whole category.)
            </p>

            <div className="ingredient-categories">
              {ingredientCategories.map((category) => {
                const categoryIds = category.ingredients.map((item) => item.id);
                const allInCategorySelected =
                  categoryIds.length > 0 &&
                  categoryIds.every((id) => selectedIngredients.includes(id));

                return (
                  <div
                    className="ingredient-category"
                    key={category.category}
                  >
                    <button
                      type="button"
                      className={`category-header category-header-btn ${
                        allInCategorySelected ? "all-selected" : ""
                      }`}
                      onClick={() =>
                        toggleCategoryIngredients(category.ingredients)
                      }
                      title={`Click to ${
                        allInCategorySelected ? "deselect" : "select"
                      } all in ${category.category}`}
                    >
                      <span>{category.category}</span>
                      <span className="category-toggle-badge">
                        {allInCategorySelected ? "Clear All" : "Select All"}
                      </span>
                    </button>

                    <div className="ingredient-options">
                      {category.ingredients.map((ingredient, index) => (
                        <button
                          key={`${category.category}-${ingredient.id}-${index}`}
                          type="button"
                          className={`ingredient-option ${
                            selectedIngredients.includes(ingredient.id)
                              ? "selected"
                              : ""
                          }`}
                          onClick={(e) => {
                            if (e.shiftKey) {
                              e.preventDefault();
                              toggleCategoryIngredients(category.ingredients);
                              return;
                            }
                            toggleIngredient(ingredient.id);
                          }}
                        >
                          <img
                            src={ingredient.image}
                            alt={ingredient.english}
                            className="ingredient-image"
                          />

                          <span className="ingredient-name">
                            {ingredient.english}

                            {ingredient.tagalog && (
                              <span className="translation ingredient-translation">
                                ({ingredient.tagalog})
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="other">
                <span>Others:</span>

                <input
                  id="otherIngredient"
                  type="text"
                  value={otherIngredient}
                  onChange={(e) => setOtherIngredient(e.target.value)}
                />
              </div>
            </div>

            <div className="navigation-buttons">
              <button
                className="back-button"
                onClick={() => setCurrentSlide(2)}
              >
                Back
              </button>

              <button
                className="continue-button"
                onClick={() => setCurrentSlide(4)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 4 ==================== */}
        {currentSlide === 4 && (
          <div className="slide-transition">
            <p className="section-label">ABOUT YOU</p>

            <h1>Let's get to know you!</h1>

            <p className="question">
              How much is your estimated weekly budget for food?
            </p>

            <p className="translation question-translation">
              (Magkano ang iyong tinatayang lingguhang badyet para sa pagkain?)
            </p>

            <div className="budget-input-container">
              <input
                type="number"
                value={weeklyBudget}
                onChange={(e) => setWeeklyBudget(e.target.value)}
                className="budget-input"
                min="0"
                placeholder="0"
              />

              <span className="budget-currency">Php</span>
            </div>

            <div className="navigation-buttons">
              <button
                className="back-button"
                onClick={() => setCurrentSlide(3)}
              >
                Back
              </button>

              <button
                className="continue-button"
                onClick={() => setCurrentSlide(5)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 5 ==================== */}
        {currentSlide === 5 && (
          <div className="slide-transition">
            <p className="section-label">ABOUT YOU</p>

            <h1>Let's get to know you!</h1>

            <p className="question">
              What is your sex (male or female)?
            </p>

            <p className="translation question-translation">
              (Ano ang iyong kasarian (lalaki o babae)?)
            </p>

            <div className="sex-options">
              {/* Male */}
              <button
                type="button"
                className={`sex-option ${
                  selectedSex === "Male" ? "selected" : ""
                }`}
                onClick={() => setSelectedSex("Male")}
              >
                <img
                  src="/images/sex/male.png"
                  alt="Male"
                  className="sex-image"
                />

                <span className="sex-label">
                  <span className="sex-english">Male</span>
                  <span className="translation sex-tagalog">
                    (Lalaki)
                  </span>
                </span>
              </button>

              {/* Female */}
              <button
                type="button"
                className={`sex-option ${
                  selectedSex === "Female" ? "selected" : ""
                }`}
                onClick={() => setSelectedSex("Female")}
              >
                <img
                  src="/images/sex/female.png"
                  alt="Female"
                  className="sex-image"
                />

                <span className="sex-label">
                  <span className="sex-english">Female</span>
                  <span className="translation sex-tagalog">
                    (Babae)
                  </span>
                </span>
              </button>
            </div>

            <p className="question age-question">
              What is your age?
            </p>

            <p className="translation question-translation">
              (Ilang taon ka na?)
            </p>

            <div className="age-input-container">
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="age-input"
                min="1"
                placeholder="0"
              />

              <span className="age-label">
                years old
              </span>
            </div>

            <div className="navigation-buttons">
              <button
                className="back-button"
                onClick={() => setCurrentSlide(4)}
              >
                Back
              </button>

              <button
                className="continue-button"
                onClick={() => setCurrentSlide(6)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 6 ==================== */}
        {currentSlide === 6 && (
          <div className="slide-transition">
            <p className="section-label">ABOUT YOU</p>

            <div className="kubi-message">
              <img
                src="/images/kubi.png"
                alt="Kubi"
                className="kubi-image"
              />

              <div className="kubi-bubble">
                Mahusay! Malapit na tayong matapos.
              </div>
            </div>

            <h1 className="name-question">
              What should Kubi call you?
            </h1>

            <p className="translation question-translation">
              (Ano ang iyong pangalan?)
            </p>

            <p className="name-subtitle">
              Just your first name. Your plan will greet you with it.
            </p>

            <div className="name-input-container">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="name-input"
                placeholder="First name"
              />
            </div>

            <div className="navigation-buttons">
              <button
                className="back-button"
                onClick={() => setCurrentSlide(5)}
              >
                Back
              </button>

              <button
                className="continue-button"
                onClick={() => setCurrentSlide(7)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ==================== SLIDE 7 ==================== */}
        {currentSlide === 7 && (
          <div className="slide-transition">
            <p className="section-label">ABOUT YOU</p>

            <h1 className="welcome-heading">
              Welcome to DishKubre, <em>{firstName}</em>
            </h1>

            <p className="recap-subtitle">
              Here's a recap of your information.
            </p>

            <div className="identification-card">
              <div className="identification-main">
                {/* User Photo */}
                <div className="identification-photo">
                  <img
                    src={
                      selectedSex === "Male"
                        ? "/images/male_zoom.png"
                        : "/images/female_zoom.png"
                    }
                    alt={selectedSex === "Male" ? "Male" : "Female"}
                  />
                </div>

                {/* Right Side of Card */}
                <div className="identification-right">
                  {/* DishKubre Branding */}
                  <div className="identification-brand">
                    <div className="brand-row">
                      <img
                        src="/images/dishkubre_logo_transparent.png"
                        alt="DishKubre logo"
                        className="dishkubre-logo"
                      />

                      <img
                        src="/images/dishkubre text.png"
                        alt="DishKubre"
                        className="dishkubre-text"
                      />
                    </div>

                    <img
                      src="/images/identification_card_text.png"
                      alt="Identification Card"
                      className="identification-card-text"
                    />
                  </div>

                  {/* Blue divider */}
                  <div className="identification-divider"></div>

                  {/* Basic Information */}
                  <div className="basic-info">
                    <div className="info-row">
                      <span className="info-label">Name:</span>
                      <span className="info-value">
                        {firstName || "—"}
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Age:</span>
                      <span className="info-value">
                        {age || "—"}
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Sex:</span>
                      <span className="info-value">
                        {selectedSex || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="additional-info">
                <div className="info-row additional-row">
                  <span className="info-label">
                    Health Conditions:
                  </span>

                  <span className="info-value">
                    {[
                      ...selectedConditions,
                      ...(otherCondition.trim()
                        ? [otherCondition.trim()]
                        : []),
                    ].length > 0
                      ? [
                          ...selectedConditions,
                          ...(otherCondition.trim()
                            ? [otherCondition.trim()]
                            : []),
                        ].join(", ")
                      : "None"}
                  </span>
                </div>

                <div className="info-row additional-row">
                  <span className="info-label">
                    Nutritional Needs:
                  </span>

                  <span className="info-value">
                    {[
                      ...selectedNutritionalNeeds,
                      ...(otherNutritionalNeed.trim()
                        ? [otherNutritionalNeed.trim()]
                        : []),
                    ].length > 0
                      ? [
                          ...selectedNutritionalNeeds,
                          ...(otherNutritionalNeed.trim()
                            ? [otherNutritionalNeed.trim()]
                            : []),
                        ].join(", ")
                      : "None"}
                  </span>
                </div>
              </div>
            </div>

            <div className="navigation-buttons">
              <button
                className="back-button"
                onClick={() => setCurrentSlide(6)}
              >
                Back
              </button>

              <button
                className="continue-button"
                onClick={() => setCurrentPage("home")}
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;