"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { SabarState, Action, Trade, Rule, BiasRuleSet } from "./types";
import { defaultPairs, defaultRules, sampleTrades } from "./seedData";

const today = new Date().toISOString().split("T")[0];

const STORAGE_KEY = "sabar-state";

const mkRule = (id: string, label: string, category: "BASIS"|"ENTRY", opts?: Partial<Rule>): Rule =>
  ({ id, label, category, checked: false, ...opts });

const defaultBiasRules: BiasRuleSet = {
  BULLISH: [
    mkRule("bb1", "Daily Order-flow +DOL",                     "BASIS"),
    mkRule("bb2", "Daily Order-flow +ICR",                     "BASIS", { tag: "EITHER_OR" }),
    mkRule("bb3", "Daily Order-flow +CRT",                     "BASIS", { tag: "EITHER_OR", indent: true }),
    mkRule("bb4", "Monday Up rule",                            "BASIS"),
    mkRule("bb5", "4H A to B + POI+ ERL",                     "BASIS", { tag: "EITHER_OR" }),
    mkRule("bb6", "A to B +LQ:Engineering+ POI+ ERL",         "BASIS", { tag: "EITHER_OR", indent: true }),
    mkRule("bb7", "4H Order-flow +CRT",                       "BASIS"),
    mkRule("be1", "A to B discount joogta",                   "ENTRY"),
    mkRule("be2", "Time window",                              "ENTRY"),
    mkRule("be3", "PDL/london L+ LQ isolation",               "ENTRY"),
    mkRule("be4", "SMT/3D",                                   "ENTRY", { note: "↳ Below the OP" }),
    mkRule("be5", "5 minute SHIFT+FVG/BB",                    "ENTRY", { tag: "EITHER_OR" }),
    mkRule("be6", "15m model #1",                             "ENTRY", { tag: "EITHER_OR", indent: true }),
    mkRule("be7", "SL Swing ka dabadiisa dhigo",              "ENTRY"),
    mkRule("be8", "BSLQ target",                              "ENTRY"),
  ],
  BEARISH: [
    mkRule("rb1", "Daily Order-flow bearish +DOL",            "BASIS"),
    mkRule("rb2", "Daily Order-flow +ICR",                    "BASIS", { tag: "EITHER_OR" }),
    mkRule("rb3", "Daily Order-flow +CRT",                    "BASIS", { tag: "EITHER_OR", indent: true }),
    mkRule("rb4", "Monday drop rule",                         "BASIS"),
    mkRule("rb5", "4H A to B + POI+ ERL",                    "BASIS", { tag: "EITHER_OR" }),
    mkRule("rb6", "A to B +LQ:Engineering+ POI+ ERL",        "BASIS", { tag: "EITHER_OR", indent: true }),
    mkRule("rb7", "4H Order-flow +CRT",                      "BASIS"),
    mkRule("re1", "A to B premium joogta",                   "ENTRY"),
    mkRule("re2", "Time window",                             "ENTRY"),
    mkRule("re3", "PDH/london H+ LQ isolation",              "ENTRY"),
    mkRule("re4", "SMT/3D",                                  "ENTRY", { note: "↳ Above the OP" }),
    mkRule("re5", "5 minute SHIFT+FVG/BB",                   "ENTRY", { tag: "EITHER_OR" }),
    mkRule("re6", "15m model #1",                            "ENTRY", { tag: "EITHER_OR", indent: true }),
    mkRule("re7", "SL Swing ka dabadiisa dhigo",             "ENTRY"),
    mkRule("re8", "SSLQ target",                             "ENTRY"),
  ],
};

const initialState: SabarState = {
  pairs: defaultPairs,
  rules: defaultRules,
  biasRules: defaultBiasRules,
  trades: sampleTrades,
  selectedDate: today,
  currentBias: "BULLISH",
  currentSession: "LONDON",
  currentPair: "EUR/USD",
  currentPsychology: [],
  accountBalance: 10000,
  riskPercent: 1,
};

function reducer(state: SabarState, action: Action): SabarState {
  switch (action.type) {
    case "SET_BIAS":
      return { ...state, currentBias: action.payload };

    case "SET_SESSION":
      return { ...state, currentSession: action.payload };

    case "SET_PAIR":
      return { ...state, currentPair: action.payload };

    case "TOGGLE_RULE":
      return {
        ...state,
        rules: state.rules.map((r) =>
          r.id === action.payload ? { ...r, checked: !r.checked } : r
        ),
      };

    case "ADD_RULE":
      return {
        ...state,
        rules: [
          ...state.rules,
          {
            id: `${action.payload.category.toLowerCase()}-${Date.now()}`,
            label: action.payload.label,
            category: action.payload.category,
            checked: false,
          },
        ],
      };

    case "TOGGLE_PSYCHOLOGY": {
      const tag = action.payload;
      const current = state.currentPsychology;
      const updated = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      return { ...state, currentPsychology: updated };
    }

    case "REMOVE_RULE":
      return {
        ...state,
        rules: state.rules.filter((r) => r.id !== action.payload),
      };

    case "REORDER_RULES": {
      const { category, fromIndex, toIndex } = action.payload;
      const catRules = state.rules.filter((r) => r.category === category);
      const otherRules = state.rules.filter((r) => r.category !== category);
      const reordered = [...catRules];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return { ...state, rules: [...otherRules, ...reordered] };
    }

    case "TOGGLE_BIAS_RULE": {
      const { bias, id } = action.payload;
      return { ...state, biasRules: { ...state.biasRules, [bias]: state.biasRules[bias].map(r => r.id === id ? { ...r, checked: !r.checked } : r) } };
    }

    case "ADD_BIAS_RULE": {
      const { bias, label, category } = action.payload;
      const newRule = mkRule(`${bias[0].toLowerCase()}${category[0].toLowerCase()}-${Date.now()}`, label, category);
      return { ...state, biasRules: { ...state.biasRules, [bias]: [...state.biasRules[bias], newRule] } };
    }

    case "REMOVE_BIAS_RULE": {
      const { bias, id } = action.payload;
      return { ...state, biasRules: { ...state.biasRules, [bias]: state.biasRules[bias].filter(r => r.id !== id) } };
    }

    case "REORDER_BIAS_RULES": {
      const { bias, category, fromIndex, toIndex } = action.payload;
      const catRules = state.biasRules[bias].filter(r => r.category === category);
      const other    = state.biasRules[bias].filter(r => r.category !== category);
      const reordered = [...catRules];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return { ...state, biasRules: { ...state.biasRules, [bias]: [...other, ...reordered] } };
    }

    case "RESET_CHECKLIST":
      return {
        ...state,
        rules: state.rules.map((r) => ({ ...r, checked: false })),
        biasRules: {
          BULLISH: state.biasRules.BULLISH.map(r => ({ ...r, checked: false })),
          BEARISH: state.biasRules.BEARISH.map(r => ({ ...r, checked: false })),
        },
        currentPsychology: [],
      };

    case "SET_ACCOUNT_BALANCE":
      return { ...state, accountBalance: action.payload };

    case "SET_RISK_PERCENT":
      return { ...state, riskPercent: action.payload };

    case "TAKE_TRADE":
    case "SKIP_TRADE": {
      const activeRules = state.biasRules?.[state.currentBias] ?? state.rules;
      const checkedRules = activeRules.filter((r) => r.checked);
      const missingRules = activeRules.filter((r) => !r.checked);
      const totalPnl = state.trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
      const currentBalance = state.accountBalance + totalPnl;
      const trade: Trade = {
        id: `trade-${Date.now()}`,
        date: state.selectedDate,
        session: state.currentSession,
        pair: state.currentPair,
        bias: state.currentBias,
        psychology: state.currentPsychology,
        rulesChecked: checkedRules.map((r) => r.id),
        totalRules: activeRules.length,
        checkedCount: checkedRules.length,
        missingRules: missingRules.map((r) => r.id),
        decision: action.type === "TAKE_TRADE" ? "TAKE" : "SKIP",
        accountBalance: currentBalance,
        riskPercent: state.riskPercent,
        riskAmount: (currentBalance * state.riskPercent) / 100,
        stopLossPips: 0,
        lotSize: 0,
        rr: 0,
        ...action.payload,
      };
      return {
        ...state,
        trades: [...state.trades, trade],
        rules: state.rules.map((r) => ({ ...r, checked: false })),
        biasRules: {
          BULLISH: state.biasRules.BULLISH.map(r => ({ ...r, checked: false })),
          BEARISH: state.biasRules.BEARISH.map(r => ({ ...r, checked: false })),
        },
        currentPsychology: [],
      };
    }

    case "SET_DATE":
      return { ...state, selectedDate: action.payload };

    case "ADD_PAIR": {
      const symbol = action.payload.toUpperCase();
      if (state.pairs.some((p) => p.symbol === symbol)) return state;
      return {
        ...state,
        pairs: [
          ...state.pairs,
          { id: `pair-${Date.now()}`, symbol, active: true, custom: true },
        ],
      };
    }

    case "TOGGLE_PAIR_ACTIVE":
      return {
        ...state,
        pairs: state.pairs.map((p) =>
          p.id === action.payload ? { ...p, active: !p.active } : p
        ),
      };

    case "REMOVE_PAIR":
      return {
        ...state,
        pairs: state.pairs.filter((p) => p.id !== action.payload),
      };

    case "DELETE_TRADE":
      return {
        ...state,
        trades: state.trades.filter((t) => t.id !== action.payload),
      };

    case "UPDATE_TRADE":
      return {
        ...state,
        trades: state.trades.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload } : t
        ),
      };

    case "HYDRATE": {
      const p = action.payload as Partial<SabarState>;
      return {
        ...state,
        ...p,
        biasRules: p.biasRules ?? defaultBiasRules,
      };
    }

    default:
      return state;
  }
}

interface SabarContextValue {
  state: SabarState;
  dispatch: React.Dispatch<Action>;
}

const SabarContext = createContext<SabarContextValue | null>(null);

export function SabarProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load from localStorage after hydration (avoids SSR mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", payload: JSON.parse(raw) });
    } catch {}
  }, []);

  // Save on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  return (
    <SabarContext.Provider value={{ state, dispatch }}>
      {children}
    </SabarContext.Provider>
  );
}

export function useSabar() {
  const ctx = useContext(SabarContext);
  if (!ctx) throw new Error("useSabar must be used within SabarProvider");
  return ctx;
}
