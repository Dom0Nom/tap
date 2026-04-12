# tap — Quantitative Trading Deep Research Report

**Generated:** 2026-04-12
**System:** tap paper-trading bot (10 S&P 500 stocks, daily bars, momentum + RSI + LLM sentiment, Alpaca paper)
**Backtest results:** +74.57% return, 1.28 Sharpe, -24.16% max DD, 479 trades over ~2 years

> **CRITICAL FINDING: The 1.28 Sharpe is almost certainly overstated. Expect 0.5–0.8 live.** See Part 10 for full assessment.

---

## Key Takeaways (Read This First)

| What | Finding | Source |
|------|---------|--------|
| Your backtested Sharpe (1.28) | Likely overstated by 40–60% | McLean & Pontiff 2016, Bailey & de Prado 2014 |
| Realistic live Sharpe | 0.5–0.8 | Practitioner consensus, AQR factor data |
| Realistic annual return | 10–18% pre-tax | After costs, decay, regime change |
| After-tax return | 7–12% | Short-term capital gains at 35% |
| Years to confirm skill statistically | 6–15 years (at true Sharpe) | Lo 2002 |
| LLM sentiment on large-cap daily bars | Weakest signal — marginal alpha | Chen, Kelly, Xiu 2024 |
| #1 improvement to add | Expand universe to full S&P 500 | Kills survivorship bias |
| #1 risk not addressed | Sector concentration | 10 tickers likely tech-heavy |
| Time to go live responsibly | 6–12 months | Month-by-month roadmap in Part 10 |

---

## Table of Contents

- **Part 1:** Foundational Market Theory (EMH, microstructure, benchmarks)
- **Part 2:** Signal Taxonomy (every known edge with papers and parameters)
- **Part 3:** Strategy Construction (combination, portfolio, execution, sizing)
- **Part 4:** Risk Management (stops debate, drawdown, tail risk, overfitting)
- **Part 5:** Strategy Blueprints (6 implementable strategies with exact specs)
- **Part 6:** Backtesting Minefield (32 enumerated mistakes)
- **Part 7:** Infrastructure (tech stack, Alpaca specifics, ops risk)
- **Part 8:** The Meta-Game (RenTech, realistic expectations, when to quit)
- **Part 9:** Emerging Topics (transformers, prediction markets, regulatory)
- **Part 10:** Specific Advice for This System (honest assessment + 6-month roadmap)

---

*Full report content follows. Each part was researched independently by a dedicated agent and cross-referenced for consistency.*

*Report saved separately as individual part files for readability. See docs/research/ directory.*
