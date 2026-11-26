import { useEffect, useState } from 'react';
import {
  Bike,
  BookOpen,
  Calculator,
  CheckSquare,
  Droplets,
  Leaf,
  Recycle,
  RotateCcw,
  Sparkles,
  Square,
  Wind,
  Zap,
} from 'lucide-react';
import type { AirQualityData, LocationInfo, UnitSystem, WeatherData } from '../types/environment';
import { formatTemp } from '../utils/weather';

interface EcoSmartPageProps {
  location: LocationInfo;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  units: UnitSystem;
}

const CHECKLIST_STORAGE_KEY = 'airclime_ecosmart_checklist';

const ECO_ACTIONS = [
  { id: 'transit', label: 'Walk, cycle, or use public transit for short local trips today', category: 'Transport' },
  { id: 'thermostat', label: 'Adjust cooling/heating setpoint by 1–2°C to trim peak grid demand', category: 'Energy' },
  { id: 'water', label: 'Run dishwashers or laundry only with full loads in cold-water cycle', category: 'Water' },
  { id: 'waste', label: 'Separate organic compostables from clean recyclables', category: 'Waste' },
  { id: 'standby', label: 'Power down idle chargers, monitors, and standby electronics', category: 'Energy' },
  { id: 'reusable', label: 'Carry a reusable bottle and cloth bag to avoid single-use plastics', category: 'Waste' },
];

const DAILY_FACTS = [
  'Urban tree canopies can lower local street-level temperatures by 1–3°C via evapotranspiration and shading while intercepting coarse particulate dust.',
  'Shifting short car trips under 3 km to walking or cycling cuts both tailpipe NO₂ emissions and brake/tire PM2.5 wear.',
  'Cold-water laundry cycles cut per-load washing machine energy consumption by roughly 75–85% compared to hot washes.',
  'Properly inflated vehicle tires improve fuel efficiency and reduce tire-rubber micro-particulate shedding.',
  'Air-drying clothes on mild, low-humidity days saves substantial household electricity while extending garment lifespan.',
];

const DAILY_CHALLENGES = [
  { title: 'Zero-Idle Day', detail: 'Turn off vehicle engines whenever parked over 30 seconds and combine errands into one trip.' },
  { title: 'Peak-Hour Shift', detail: 'Delay high-draw appliances (laundry, dishwasher) outside 17:00–21:00 evening grid peaks.' },
  { title: '4-Minute Shower Trim', detail: 'Reduce shower duration by 2–4 minutes today to save fresh water and water-heating energy.' },
  { title: 'Active Micro-Commute', detail: 'Replace one motorized trip under 2.5 km with walking or cycling.' },
];

export function EcoSmartPage({ location, weather, airQuality, units }: EcoSmartPageProps) {
  const [completed, setCompleted] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  // Water Conservation Calculator state
  const [showerTrimMin, setShowerTrimMin] = useState<number>(3);
  const [faucetAerators, setFaucetAerators] = useState<boolean>(true);
  const [coldLaundryLoadsPerWeek, setColdLaundryLoadsPerWeek] = useState<number>(3);

  // Electricity-Saving Calculator state
  const [ledBulbsSwapped, setLedBulbsSwapped] = useState<number>(6);
  const [acShiftHoursPerDay, setAcShiftHoursPerDay] = useState<number>(3);
  const [standbyOff, setStandbyOff] = useState<boolean>(true);

  // Transport Emission Estimator state
  const [dailyTripKm, setDailyTripKm] = useState<number>(8);
  const [targetMode, setTargetMode] = useState<'walk-bike' | 'bus-rail'>('bus-rail');

  useEffect(() => {
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(completed));
    } catch {
      // ignore
    }
  }, [completed]);

  const toggleAction = (id: string) => {
    setCompleted((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const dailyFact = DAILY_FACTS[dayOfYear % DAILY_FACTS.length];
  const dailyChallenge = DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];

  const tempC = weather?.current.temperature_2m ?? null;
  const usAqi = airQuality?.current.us_aqi ?? null;

  const contextualTip =
    usAqi != null && usAqi > 100
      ? `Local US AQI in ${location.name} is ${Math.round(usAqi)}. Avoid open waste or leaf burning, consolidate errands to minimize idling, and choose metro/rail transit where available.`
      : tempC != null && tempC >= 28
        ? `At ${formatTemp(tempC, units)}, shading sun-facing windows during afternoon hours reduces indoor heat gain and air-conditioning energy draw.`
        : `Moderate local conditions (${formatTemp(tempC, units)}) allow natural cross-ventilation during clean-air hours instead of mechanical climate control.`;

  // Water savings calculation (explicit assumptions: standard showerhead 9 L/min, aerator saves ~12 L/day, efficient full load saves ~15 L)
  const monthlyWaterSavedLiters = Math.round(
    showerTrimMin * 9 * 30 + (faucetAerators ? 12 * 30 : 0) + coldLaundryLoadsPerWeek * 15 * 4.3,
  );
  const monthlyWaterSavedGallons = Math.round(monthlyWaterSavedLiters * 0.264172);

  // Electricity savings calculation (explicit assumptions: LED saves ~0.045 kWh/hr * 4h/day, AC 1-2C setpoint trim saves ~0.25 kWh/hr, standby trim ~0.4 kWh/day; global grid avg ~0.45 kg CO2/kWh)
  const monthlyKwhSaved = Number(
    (ledBulbsSwapped * 0.045 * 4 * 30 + acShiftHoursPerDay * 0.25 * 30 + (standbyOff ? 0.4 * 30 : 0)).toFixed(1),
  );
  const monthlyGridCo2Kg = Number((monthlyKwhSaved * 0.45).toFixed(1));

  // Transport emission estimation (average passenger car 0.192 kg CO2/km, bus/rail 0.068 kg CO2/km, walk/bike 0 kg tailpipe CO2/km)
  const carMonthlyKg = Number((dailyTripKm * 22 * 0.192).toFixed(1));
  const altFactor = targetMode === 'walk-bike' ? 0 : 0.068;
  const altMonthlyKg = Number((dailyTripKm * 22 * altFactor).toFixed(1));
  const transportSavedKg = Number((carMonthlyKg - altMonthlyKg).toFixed(1));

  return (
    <div className="space-y-7">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Leaf className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
          <span>EcoSmart</span>
          <span aria-hidden="true">·</span>
          <span>Calculators, Daily Challenge &amp; Sustainability Literacy</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Environmental Awareness &amp; Everyday Sustainability
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Interactive water, electricity, and transport calculators with transparent methodology alongside daily eco-challenges and local tips.
        </p>
      </header>

      {/* Daily Fact + Challenge + Contextual Tip */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/70 dark:bg-emerald-950/30 p-5 space-y-2">
          <p className="text-xs font-semibold text-[#0F5132] dark:text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Daily Sustainability Challenge: {dailyChallenge.title}
          </p>
          <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed">{dailyChallenge.detail}</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Daily Environmental Fact
          </p>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{dailyFact}</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Location-Aware Tip for {location.name}
          </p>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{contextualTip}</p>
        </div>
      </section>

      {/* 3 Practical Sustainability Calculators */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
          <Calculator className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
          <span>Interactive Impact &amp; Resource Calculators</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Water Conservation Calculator */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Droplets className="w-4 h-4 text-sky-500" aria-hidden="true" />
              <span>Water Conservation Calculator</span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Shower trim (min/day)</span>
                  <strong className="font-mono">{showerTrimMin} min</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={showerTrimMin}
                  onChange={(e) => setShowerTrimMin(Number(e.target.value))}
                  className="w-full accent-[#0F5132]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Full-load laundry runs/week</span>
                  <strong className="font-mono">{coldLaundryLoadsPerWeek} loads</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={7}
                  value={coldLaundryLoadsPerWeek}
                  onChange={(e) => setColdLaundryLoadsPerWeek(Number(e.target.value))}
                  className="w-full accent-[#0F5132]"
                />
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={faucetAerators}
                  onChange={(e) => setFaucetAerators(e.target.checked)}
                  className="accent-[#0F5132]"
                />
                <span className="text-slate-700 dark:text-slate-200">Low-flow faucet aerators installed</span>
              </label>
            </div>

            <div className="rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 p-3.5 text-xs">
              <p className="text-slate-600 dark:text-slate-300">Estimated Monthly Water Saved</p>
              <p className="text-xl font-bold font-mono tabular-nums text-sky-700 dark:text-sky-300 mt-0.5">
                {monthlyWaterSavedLiters.toLocaleString()} L ({monthlyWaterSavedGallons.toLocaleString()} gal)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Assumes 9 L/min standard shower, 12 L/day aerator reduction, 15 L/full laundry load.
              </p>
            </div>
          </div>

          {/* Electricity-Saving Calculator */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Zap className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <span>Electricity-Saving Calculator</span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Bulbs switched to LED</span>
                  <strong className="font-mono">{ledBulbsSwapped} bulbs</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={ledBulbsSwapped}
                  onChange={(e) => setLedBulbsSwapped(Number(e.target.value))}
                  className="w-full accent-[#0F5132]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>AC/Heat eco setpoint hours/day</span>
                  <strong className="font-mono">{acShiftHoursPerDay} h</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={12}
                  value={acShiftHoursPerDay}
                  onChange={(e) => setAcShiftHoursPerDay(Number(e.target.value))}
                  className="w-full accent-[#0F5132]"
                />
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={standbyOff}
                  onChange={(e) => setStandbyOff(e.target.checked)}
                  className="accent-[#0F5132]"
                />
                <span className="text-slate-700 dark:text-slate-200">Power off idle standby devices overnight</span>
              </label>
            </div>

            <div className="rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3.5 text-xs">
              <p className="text-slate-600 dark:text-slate-300">Estimated Monthly Energy &amp; CO₂ Avoided</p>
              <p className="text-xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-300 mt-0.5">
                {monthlyKwhSaved} kWh · {monthlyGridCo2Kg} kg CO₂
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Assumes 45W saved/LED (4h/day), 0.25 kWh/h AC trim, and global avg 0.45 kg CO₂/kWh.
              </p>
            </div>
          </div>

          {/* Transport Emission Estimator */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Bike className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Transport Emission Estimator</span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Daily round-trip distance</span>
                  <strong className="font-mono">{dailyTripKm} km / day</strong>
                </span>
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={dailyTripKm}
                  onChange={(e) => setDailyTripKm(Number(e.target.value))}
                  className="w-full accent-[#0F5132]"
                />
              </label>

              <div className="space-y-1">
                <span className="text-slate-600 dark:text-slate-300 block">Shift from solo petrol car to:</span>
                <div className="inline-flex w-full p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setTargetMode('bus-rail')}
                    className={`flex-1 py-1.5 rounded text-xs font-medium cursor-pointer ${
                      targetMode === 'bus-rail'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Public Transit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('walk-bike')}
                    className={`flex-1 py-1.5 rounded text-xs font-medium cursor-pointer ${
                      targetMode === 'walk-bike'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Walk / Cycle
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3.5 text-xs">
              <p className="text-slate-600 dark:text-slate-300">Monthly Commute CO₂ Reduction (22 workdays)</p>
              <p className="text-xl font-bold font-mono tabular-nums text-[#0F5132] dark:text-emerald-300 mt-0.5">
                {transportSavedKg} kg CO₂ saved
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Factors: Solo car 0.192 kg/km vs. transit 0.068 kg/km vs. walk/bike 0 kg tailpipe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Personal Action Checklist */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Personal Eco-Friendly Action Checklist
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {completed.length} of {ECO_ACTIONS.length} actions checked (stored locally in your browser only)
            </p>
          </div>
          {completed.length > 0 && (
            <button
              type="button"
              onClick={() => setCompleted([])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset Checklist
            </button>
          )}
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ECO_ACTIONS.map((item) => {
            const done = completed.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggleAction(item.id)}
                  className={`w-full text-left rounded-lg border p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                    done
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  {done ? (
                    <CheckSquare className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-medium ${
                        done ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.category}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Environmental Awareness & Learning Cards */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
          <BookOpen className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
          <span>Environmental Awareness &amp; Learning Pillars</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Wind className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Pollution Reduction</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Never burn household plastics or garden waste, maintain vehicle emission filters, and use low-VOC paints and cleaning products indoors.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <span>Energy Conservation</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Switch to LED lighting, seal window/door drafts, clean AC filters monthly, and shift high-draw appliances away from evening peak grid hours.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Droplets className="w-4 h-4 text-sky-500" aria-hidden="true" />
              <span>Water Stewardship</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Install low-flow faucet aerators, water outdoor plants early morning to minimize evaporation, and repair dripping valves promptly.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Recycle className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Waste Management</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Rinse and sort dry recyclables, compost kitchen scraps where feasible, and drop e-waste and batteries at certified collection centers.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bike className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Sustainable Transport</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Combine errands into single trips, carpool for commutes, and prioritize walking, cycling, or electric rail/bus networks.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Leaf className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Climate Awareness</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Urban heat islands, shifting rainfall intensity, and air stagnation episodes are linked; local emissions cuts deliver immediate public health gains alongside climate mitigation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
