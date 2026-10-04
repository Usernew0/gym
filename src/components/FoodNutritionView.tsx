import React, { useState } from 'react';
import {
  Apple,
  Flame,
  Dumbbell,
  Droplets,
  Plus,
  CheckCircle2,
  Calendar,
  Utensils,
  Sparkles,
  Clock,
  Info,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { NutritionLog, NutritionMeal, UserProfile } from '../types';

interface FoodNutritionViewProps {
  userProfile: UserProfile;
  lang: 'en' | 'ar';
}

export const FoodNutritionView: React.FC<FoodNutritionViewProps> = ({
  userProfile,
  lang,
}) => {
  const isAr = lang === 'ar';

  // Default daily targets
  const [calorieTarget, setCalorieTarget] = useState(2500);
  const [proteinTarget, setProteinTarget] = useState(180);
  const [carbsTarget, setCarbsTarget] = useState(260);
  const [fatTarget, setFatTarget] = useState(70);
  const [waterTarget, setWaterTarget] = useState(3.5);

  // Sample initialized meals
  const [meals, setMeals] = useState<NutritionMeal[]>([
    {
      id: 'meal-1',
      name: isAr ? 'وجبة الإفطار (Breakfast)' : 'Breakfast',
      time: '08:30 AM',
      calories: 650,
      protein: 42,
      carbs: 68,
      fat: 18,
      items: [
        isAr ? '4 بيضات كاملة مع شوفان' : '4 Whole eggs with oats',
        isAr ? '1 ثمرة موز وحليب لوز' : '1 Banana with almond milk',
      ],
    },
    {
      id: 'meal-2',
      name: isAr ? 'وجبة بعد التمرين (Post-Workout)' : 'Post-Workout Fuel',
      time: '12:30 PM',
      calories: 520,
      protein: 48,
      carbs: 60,
      fat: 6,
      items: [
        isAr ? 'سكوب واي بروتين مع أرز أبيض' : 'Whey protein shake with white rice',
        isAr ? 'عسل نحل وتوت بري' : 'Honey and blueberries',
      ],
    },
    {
      id: 'meal-3',
      name: isAr ? 'وجبة الغداء (Lunch)' : 'High-Protein Lunch',
      time: '03:30 PM',
      calories: 720,
      protein: 55,
      carbs: 75,
      fat: 22,
      items: [
        isAr ? '250 جرام صدر دجاج مشوي' : '250g Grilled chicken breast',
        isAr ? 'بطاطا حلوة وسلطة خضراء مع زيت زيتون' : 'Sweet potato & green salad with olive oil',
      ],
    },
  ]);

  const [waterLogged, setWaterLogged] = useState(2.25);

  // New Meal Quick Add Modal / State
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [newMealCalories, setNewMealCalories] = useState('');
  const [newMealProtein, setNewMealProtein] = useState('');
  const [newMealCarbs, setNewMealCarbs] = useState('');
  const [newMealFat, setNewMealFat] = useState('');

  // Totals calculations
  const totalCalories = meals.reduce((acc, m) => acc + (m.calories || 0), 0);
  const totalProtein = meals.reduce((acc, m) => acc + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((acc, m) => acc + (m.carbs || 0), 0);
  const totalFat = meals.reduce((acc, m) => acc + (m.fat || 0), 0);

  const calPercent = Math.min(Math.round((totalCalories / calorieTarget) * 100), 100);
  const proteinPercent = Math.min(Math.round((totalProtein / proteinTarget) * 100), 100);
  const carbsPercent = Math.min(Math.round((totalCarbs / carbsTarget) * 100), 100);
  const fatPercent = Math.min(Math.round((totalFat / fatTarget) * 100), 100);
  const waterPercent = Math.min(Math.round((waterLogged / waterTarget) * 100), 100);

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealName.trim()) return;

    const newMeal: NutritionMeal = {
      id: `meal-${Date.now()}`,
      name: newMealName.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      calories: parseInt(newMealCalories, 10) || 0,
      protein: parseInt(newMealProtein, 10) || 0,
      carbs: parseInt(newMealCarbs, 10) || 0,
      fat: parseInt(newMealFat, 10) || 0,
      items: [],
    };

    setMeals([...meals, newMeal]);
    setNewMealName('');
    setNewMealCalories('');
    setNewMealProtein('');
    setNewMealCarbs('');
    setNewMealFat('');
    setShowAddMeal(false);
  };

  const handleAddWater = (liters: number) => {
    setWaterLogged((prev) => parseFloat(Math.min(prev + liters, 10).toFixed(2)));
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Notice / Placeholder banner indicating module is initialized and ready for discussion */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              <Apple className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {isAr ? 'التغذية والوجبات (Food & Nutrition)' : 'Food & Nutrition Hub'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                  {isAr ? 'جاهز للتهيئة' : 'Initialized & Ready'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {isAr
                  ? 'تم تجهيز تبويب الغذاء والتغذية الرياضية بالكامل، وهو جاهز لاستقبال كافة التفاصيل والتخصيصات الإضافية التي ستحددها لاحقاً.'
                  : 'This dedicated Food and Nutrition section is fully initialized and pre-configured for macronutrient tracking, meal logging, and your upcoming custom requirements.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              onClick={() => setShowAddMeal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة وجبة سريعة' : 'Quick Log Meal'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Daily Macro Progress Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Calories */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              {isAr ? 'السعرات الحرارية' : 'Daily Calories'}
            </span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                {totalCalories}
              </span>
              <span className="text-xs text-slate-400">/ {calorieTarget} kcal</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${calPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-amber-300 font-bold mt-1 inline-block">
              {calPercent}% {isAr ? 'مكتمل' : 'met'}
            </span>
          </div>
        </div>

        {/* Protein */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              {isAr ? 'البروتين' : 'Protein'}
            </span>
            <Dumbbell className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                {totalProtein}g
              </span>
              <span className="text-xs text-slate-400">/ {proteinTarget}g</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${proteinPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-emerald-300 font-bold mt-1 inline-block">
              {proteinPercent}% {isAr ? 'مكتمل' : 'met'}
            </span>
          </div>
        </div>

        {/* Carbs */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              {isAr ? 'الكربوهيدرات' : 'Carbohydrates'}
            </span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                {totalCarbs}g
              </span>
              <span className="text-xs text-slate-400">/ {carbsTarget}g</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${carbsPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-cyan-300 font-bold mt-1 inline-block">
              {carbsPercent}% {isAr ? 'مكتمل' : 'met'}
            </span>
          </div>
        </div>

        {/* Fat */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              {isAr ? 'الدهون الصحية' : 'Healthy Fats'}
            </span>
            <Utensils className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                {totalFat}g
              </span>
              <span className="text-xs text-slate-400">/ {fatTarget}g</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${fatPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-indigo-300 font-bold mt-1 inline-block">
              {fatPercent}% {isAr ? 'مكتمل' : 'met'}
            </span>
          </div>
        </div>

        {/* Water Intake */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              {isAr ? 'شرب الماء' : 'Water Intake'}
            </span>
            <Droplets className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                {waterLogged}L
              </span>
              <span className="text-xs text-slate-400">/ {waterTarget}L</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${waterPercent}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => handleAddWater(0.25)}
                className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold cursor-pointer"
              >
                +250ml
              </button>
              <button
                type="button"
                onClick={() => handleAddWater(0.5)}
                className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold cursor-pointer"
              >
                +500ml
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logged Meals List & Custom Nutrition Plan */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">
              {isAr ? 'جدول الوجبات اليومية' : "Today's Meal Schedule"}
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-700 text-slate-300">
              {meals.length} {isAr ? 'وجبات' : 'meals'}
            </span>
          </div>

          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="bg-slate-900/80 border border-slate-700/70 hover:border-emerald-500/50 rounded-xl p-4 space-y-3 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-white">{meal.name}</span>
                {meal.time && (
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{meal.time}</span>
                  </span>
                )}
              </div>

              {meal.items && meal.items.length > 0 && (
                <ul className="space-y-1 text-xs text-slate-300">
                  {meal.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="pt-2 border-t border-slate-800 grid grid-cols-4 gap-2 text-center">
                <div className="p-1 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{isAr ? 'سعرات' : 'Cals'}</div>
                  <div className="text-xs font-bold text-amber-400 font-mono">{meal.calories}</div>
                </div>
                <div className="p-1 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{isAr ? 'بروتين' : 'Prot'}</div>
                  <div className="text-xs font-bold text-emerald-400 font-mono">{meal.protein}g</div>
                </div>
                <div className="p-1 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{isAr ? 'كارب' : 'Carb'}</div>
                  <div className="text-xs font-bold text-cyan-400 font-mono">{meal.carbs}g</div>
                </div>
                <div className="p-1 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{isAr ? 'دهون' : 'Fat'}</div>
                  <div className="text-xs font-bold text-indigo-400 font-mono">{meal.fat}g</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Future Roadmap / Ready banner */}
      <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl p-4 sm:p-5 flex items-center gap-3">
        <Info className="w-5 h-5 text-emerald-400 shrink-0" />
        <p className="text-xs text-slate-400">
          {isAr
            ? 'ملاحظة: هذا القسم مخصص للتغذية وسنناقش كافة تفاصيله لاحقاً وفقاً لطلبك. جاهز لإضافة حاسبة السعرات، خطط الوجبات الأسبوعية، والربط بالتمارين.'
            : 'Note: As requested, this Food & Nutrition tab is initialized as a dedicated hub ready for your specific meal planning logic and future expansion.'}
        </p>
      </div>

      {/* Modal: Quick Add Meal */}
      {showAddMeal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-md space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'إضافة وجبة إلى اليوم' : 'Add Meal to Log'}</span>
              </h4>
              <button
                onClick={() => setShowAddMeal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMeal} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {isAr ? 'اسم الوجبة:' : 'Meal Name:'}
                </label>
                <input
                  type="text"
                  value={newMealName}
                  onChange={(e) => setNewMealName(e.target.value)}
                  placeholder={isAr ? 'مثال: وجبة عشاء بروتيني' : 'e.g. Steak & Jasmine Rice'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    {isAr ? 'السعرات:' : 'Calories:'}
                  </label>
                  <input
                    type="number"
                    value={newMealCalories}
                    onChange={(e) => setNewMealCalories(e.target.value)}
                    placeholder="500"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    {isAr ? 'بروتين (g):' : 'Protein (g):'}
                  </label>
                  <input
                    type="number"
                    value={newMealProtein}
                    onChange={(e) => setNewMealProtein(e.target.value)}
                    placeholder="40"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    {isAr ? 'كارب (g):' : 'Carbs (g):'}
                  </label>
                  <input
                    type="number"
                    value={newMealCarbs}
                    onChange={(e) => setNewMealCarbs(e.target.value)}
                    placeholder="50"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    {isAr ? 'دهون (g):' : 'Fat (g):'}
                  </label>
                  <input
                    type="number"
                    value={newMealFat}
                    onChange={(e) => setNewMealFat(e.target.value)}
                    placeholder="15"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddMeal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer shadow-md shadow-emerald-950/40"
                >
                  {isAr ? 'حفظ الوجبة' : 'Save Meal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
