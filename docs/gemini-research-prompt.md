# Gemini Deep Research Prompt — Quantitative & Algorithmic Trading

You are conducting an exhaustive research briefing for a developer building a real (paper-first, then live) algorithmic trading system targeting US equities (S&P 500 universe, daily bars). The system already exists as a working prototype with momentum, mean-reversion, and LLM sentiment signals. The goal of this research is to identify every edge, pitfall, technique, and institutional practice that could improve or break the system — from foundational theory through bleeding-edge approaches.

**Be exhaustive. Be specific. Cite sources. No hand-waving. If a claim lacks evidence, say so. If experts disagree, present both sides. Treat this like a PhD qualifying exam preparation document crossed with a practitioner's field manual.**

---

## PART 1: FOUNDATIONAL MARKET THEORY

### 1.1 Efficient Market Hypothesis — The Adversary

- State the three forms of EMH (weak, semi-strong, strong) with their exact implications for algorithmic trading
- What specific empirical evidence exists AGAINST each form? Name the papers, the datasets, the anomalies discovered
- Grossman-Stiglitz paradox: explain it precisely and what it means for the existence of trading alpha
- Adaptive Market Hypothesis (Andrew Lo): how does it reconcile EMH with observed anomalies? What are the practical implications for strategy design?
- What does "market efficiency" look like in practice for a retail/small quant trader vs. a Renaissance Technologies or Two Sigma? Where do the edges actually live for each?

### 1.2 Market Microstructure

- How does the US equity market actually work at the mechanical level? Describe the full lifecycle of a market order from submission to fill: exchanges (NYSE, NASDAQ, CBOE, IEX), SIPs, NBBO, order routing, dark pools, payment for order flow
- What is the actual fill quality a retail trader gets on a market order vs. a limit order? Quantify the slippage
- How do market makers operate? What is the bid-ask spread really paying for? How does this affect a daily-bar strategy vs. an intraday strategy?
- Latency: at what timescales does latency matter? Where is the threshold below which a daily-bar trader doesn't need to care?
- What is the actual transaction cost stack for a paper/retail trader using Alpaca? Commission, spread, slippage, market impact — quantify each for a $100k portfolio trading S&P 500 names

### 1.3 Risk-Free Rate and Benchmarks

- What should a trading strategy be benchmarked against? SPY buy-and-hold? Risk-free rate? A 60/40 portfolio?
- How to compute risk-adjusted returns properly: Sharpe, Sortino, Calmar, Information Ratio, Treynor — when to use each and their blind spots
- What Sharpe ratio is "good" for a retail quant strategy on daily bars? What do institutional quant funds actually achieve (cite sources)?
- How to account for the "Sharpe ratio of the alternative" — i.e., opportunity cost of capital deployed in the strategy vs. an index fund

---

## PART 2: SIGNAL TAXONOMY — EVERY KNOWN EDGE

For EACH signal category below, provide:
- The theoretical basis (WHY it should work)
- The seminal paper(s) that discovered/documented it (author, year, title)
- The most rigorous replication studies (and any that FAILED to replicate)
- Typical parameter values for daily-bar US equities
- Known decay/crowding effects — has the edge shrunk since publication?
- Practical implementation details (lookback windows, rebalance frequency, universe filters)
- Failure modes (when does this signal blow up?)
- How it interacts/correlates with other signals

### 2.1 Momentum Signals

- Cross-sectional momentum (Jegadeesh & Titman 1993): the 12-1 month standard, but also 6-1, 3-1, and their relative performance
- Time-series / absolute momentum (Moskowitz, Ooi, Pedersen 2012): go long when trailing return > 0
- Dual momentum (Gary Antonacci): combining cross-sectional and time-series
- Residual momentum (Blitz, Huij, Martens 2011): momentum after stripping out factor exposures
- Industry/sector momentum: rotating across sectors rather than individual stocks
- 52-week high momentum (George & Hwang 2004): proximity to 52-week high as a cleaner momentum proxy
- Earnings momentum / PEAD (Ball & Brown 1968, Bernard & Thomas 1989): post-earnings announcement drift
- Analyst revision momentum: following the direction of earnings estimate changes
- Momentum crashes (Daniel & Moskowitz 2016): when and why momentum reverses violently, and how to hedge it (optionality, dynamic hedging, volatility scaling)
- The interaction between momentum and value: Asness's "value and momentum everywhere"

### 2.2 Mean-Reversion Signals

- Short-term reversal (Jegadeesh 1990, Lehmann 1990): 1-week to 1-month reversal
- RSI-based mean reversion: RSI(2), RSI(5), Connors RSI — what actually has evidence vs. what is folklore
- Bollinger Band mean reversion: evidence for and against
- Pairs trading / statistical arbitrage: cointegration-based, distance-based, copula-based — which actually works on daily bars for retail?
- The critical importance of regime gating: why mean-reversion strategies must be filtered by market trend (the "catching falling knives" problem)
- Ornstein-Uhlenbeck models for mean-reversion: when are they appropriate, when are they misleading?

### 2.3 Value Signals

- Fama-French value factor (HML): book-to-market, earnings yield, cash flow yield
- The "death of value" debate (2010-2020): what happened, why, and is it back?
- Intangible-adjusted value (Eisfeldt, Kim, Papanikolaou 2022): adjusting book value for intangible assets
- Composite value metrics: combining multiple value indicators
- Value and momentum interaction: using value as a momentum crash hedge

### 2.4 Quality / Profitability Signals

- Gross profitability (Novy-Marx 2013): why gross profit / assets predicts returns
- Quality minus Junk (Asness, Frazzini, Pedersen 2019): the QMJ factor
- Piotroski F-Score: 9-point accounting quality score
- Accruals anomaly (Sloan 1996): firms with high accruals underperform
- ROE, ROA, ROIC as predictive signals: evidence and parameter choices

### 2.5 Volatility and Risk Signals

- Low-volatility anomaly (Baker, Bradley, Wurgler 2011): why low-vol stocks outperform on a risk-adjusted basis
- Betting against beta (Frazzini & Pedersen 2014): the leverage constraint explanation
- Volatility risk premium: selling vol vs. buying vol — what works for equity portfolios?
- VIX term structure as a regime indicator: contango = calm, backwardation = fear
- Realized vs. implied volatility spread as a trading signal
- GARCH-family models for volatility forecasting: do they add value over simple rolling estimates?

### 2.6 Sentiment and Alternative Data Signals

- News sentiment (Lopez-Lira & Tang 2023): LLM-based headline sentiment — real edge or noise?
- Social media sentiment (Twitter/X, Reddit, StockTwits): Chen et al., Bollen et al. — replication status
- Earnings call transcript analysis (Larcker & Zakolyukina 2012): detecting deception in CEO speech
- Insider trading signals (SEC Form 4): which insider transactions are predictive?
- Short interest as a signal: high short interest predicting underperformance
- Fund flow data: mutual fund flows predicting short-term returns
- Options market signals: put-call ratio, unusual options activity, implied volatility skew
- Satellite imagery, credit card data, web traffic — what alternative data actually has evidence for daily-bar equity strategies?
- LLM-specific considerations: prompt engineering for financial classification, model selection (GPT-4o-mini vs. Claude Haiku vs. open-source), zero-shot vs. few-shot, hallucination risk in financial contexts

### 2.7 Macro/Regime Signals

- Moving average regime filters (Faber 2007): 10-month SMA on indices — does it work, and how to implement
- Yield curve slope as a recession/regime indicator
- Credit spreads (investment grade vs. high yield) as a risk-on/risk-off signal
- Federal Reserve policy: interest rate decisions, quantitative easing/tightening — how to incorporate
- Economic surprise indices (Citigroup): actual vs. expected macro data
- Market breadth indicators: advance-decline line, percentage above 200-SMA, new highs/lows
- Sector rotation models: leading vs. lagging sectors through the business cycle

---

## PART 3: STRATEGY CONSTRUCTION — FROM SIGNALS TO PORTFOLIO

### 3.1 Signal Combination

- Linear combination (weighted sum): when is this sufficient, when does it break?
- Z-score normalization: cross-sectional z-scores for signal comparability
- Rank-based combination: ranking signals and averaging ranks — robustness advantages
- Machine learning combination: ridge regression, random forests, gradient boosting (XGBoost/LightGBM) for combining signals — evidence for and against overfitting risk
- Optimal weighting: mean-variance optimization of signal weights vs. equal weights vs. inverse volatility — what does the evidence say about which performs best out of sample?
- The "forecast combination puzzle": why simple equal-weight combination often beats optimal

### 3.2 Portfolio Construction

- Equal-weight vs. market-cap weight vs. signal-strength weight
- Volatility targeting (risk parity within a long-only portfolio): how to implement, evidence for Sharpe improvement
- Kelly criterion: full Kelly, half Kelly, fractional Kelly — practical application and dangers
- Maximum diversification portfolio (Choueifaty & Coignard 2008)
- Minimum variance portfolio: does it actually outperform?
- Black-Litterman for incorporating views into a mean-variance framework
- Transaction cost optimization: how to balance signal freshness against turnover cost
- Capacity: how much capital can a daily-bar S&P 500 strategy manage before market impact erodes the edge?

### 3.3 Execution

- Market orders vs. limit orders for a daily-bar rebalancer: which is better for a retail account?
- Time-of-day effects: is there a better time to submit daily rebalance orders? (MOO, MOC, VWAP, TWAP)
- Order splitting: when does a $100k portfolio need to worry about market impact?
- Implementation shortfall: how to measure and minimize it
- Alpaca-specific execution: what order types does Alpaca paper support? How does their routing work? Any known quirks?

### 3.4 Position Sizing

- Volatility-targeted sizing (target a fixed dollar risk per position): the standard approach — derive the formula, explain the assumptions
- ATR-based sizing: advantages over standard-deviation-based sizing
- Maximum position size constraints: what percentage of portfolio is too concentrated?
- Correlation-adjusted sizing: reducing size when positions are highly correlated
- Drawdown-based position reduction: scaling down after losses to protect capital

---

## PART 4: RISK MANAGEMENT — THE SURVIVAL LAYER

### 4.1 Stop Losses

- The great debate: do stop losses help or hurt? Present BOTH sides with evidence
- Fixed percentage stops vs. volatility-scaled stops (ATR) vs. trailing stops
- Time-based stops: closing positions after N days regardless
- Signal-based exits: exiting when the entry signal reverses — evidence for superiority over price-based stops
- The interaction between stop losses and mean-reversion strategies (stops fight mean-reversion)
- Optimal stop-loss placement research: any rigorous studies on where to place stops?

### 4.2 Drawdown Management

- Maximum drawdown as a risk metric: how to compute, what levels are acceptable
- Drawdown-triggered strategy shutdown: when to stop trading and when to resume
- Dynamic allocation based on recent performance: CPPI, constant proportion portfolio insurance
- Regime-based allocation: reducing exposure in bearish regimes, increasing in bullish

### 4.3 Tail Risk

- Black swan events: what happens to a momentum + mean-reversion strategy during a market crash?
- Fat tails in equity returns: how much fatter than normal are they? (kurtosis estimates)
- Correlation breakdown in crises: diversification disappears when you need it most
- Hedging tail risk: put options, VIX calls, managed futures — cost vs. benefit for a $100k portfolio
- Maximum loss scenarios: Monte Carlo simulation of worst-case paths given the strategy's return distribution

### 4.4 Overfitting and Data Snooping

- Multiple hypothesis testing: the Bonferroni correction, White's Reality Check, Romano-Wolf stepdown
- Harvey, Liu, Zhu (2016) "...and the Cross-Section of Expected Returns": how many factors are real?
- Out-of-sample testing: walk-forward analysis, expanding window, rolling window — best practices
- Cross-validation for time series: blocked time-series split, purged k-fold — when to use each
- The "backtest overfitting" problem (Bailey et al. 2014): probability of backtest overfitting (PBO)
- Combinatorial symmetric cross-validation (CSCV): the state of the art for detecting overfitting
- Minimum backtest length: how many years of data do you need to trust a Sharpe ratio estimate? (cite Lo's work on Sharpe ratio statistics)
- The role of economic intuition: strategies with a clear economic rationale are less likely to be data-mined

---

## PART 5: SPECIFIC ALGORITHMS AND STRATEGIES — DETAILED BLUEPRINTS

For each strategy below, provide enough detail to IMPLEMENT it: entry rules, exit rules, parameter values, rebalance frequency, universe filter, position sizing, expected Sharpe, maximum drawdown, and capacity.

### 5.1 Classic Momentum (12-1)

- Exact implementation: lookback period, skip period, cross-sectional percentile cutoffs, rebalance frequency
- Enhancement: volatility-scaling the momentum signal (Barroso & Santa-Clara 2015)
- Enhancement: time-series momentum overlay (go flat when index is below 200-SMA)
- Expected out-of-sample Sharpe on US large-cap daily bars (post-2010)

### 5.2 RSI Mean-Reversion with Regime Gate

- RSI(2) entry: buy when RSI < 10, sell when RSI > 90 — exact formula, period, overbought/oversold thresholds
- Regime gate: SPY > 200-SMA — why this specific gate, alternatives (50-SMA, 10-month SMA, yield curve)
- Expected performance degradation since HFT arbitrage of short-term reversal (post-2010 data)
- Position sizing for mean-reversion: different from momentum — explain why

### 5.3 Pairs Trading / Statistical Arbitrage

- Cointegration-based pairs: Engle-Granger two-step, Johansen test — step by step
- Distance-based pairs: formation period, trading period, entry/exit thresholds
- Kalman filter for dynamic hedge ratios
- Expected performance on S&P 500 pairs on daily bars — is it still viable for retail?

### 5.4 Factor-Based Portfolio

- Constructing a multi-factor portfolio: momentum + value + quality + low-vol
- Factor timing: can you time factor exposures? (Arnott et al., Asness "Fact, Fiction, and Factor Investing")
- Factor crowding: how to detect and avoid overcrowded factor bets
- Smart beta vs. alpha: what's truly alpha vs. repackaged factor exposure

### 5.5 Machine Learning Approaches

- Feature engineering for ML-based equity prediction: which features matter, which are noise
- Random forests for cross-sectional stock ranking: Gu, Kelly, Xiu (2020) "Empirical Asset Pricing via Machine Learning"
- Neural networks for return prediction: evidence, architectures, data requirements
- Reinforcement learning for portfolio management: current state of research, practical feasibility for retail
- The cardinal sin of ML in trading: training on future data (lookahead bias in feature construction)
- Ensemble methods: combining multiple ML models — does it help or just add complexity?
- Feature importance and interpretability: SHAP values, permutation importance — how to debug an ML strategy

### 5.6 LLM/NLP-Based Strategies

- Current state of LLM-based trading: what actually works vs. hype
- Prompt engineering for financial sentiment: best practices, few-shot examples, structured output
- FinBERT vs. GPT-4 vs. Claude for financial text classification: comparative performance
- News as a signal: headline-only vs. full article, aggregation methods, recency weighting
- Earnings transcript analysis: what linguistic features predict returns?
- Cost optimization: batching headlines, caching responses, model selection (cheapest model that works)
- Lookahead bias in NLP backtests: why news timestamp quality is the #1 killer

---

## PART 6: BACKTESTING — THE MINEFIELD

### 6.1 Backtesting Framework Design

- Event-driven vs. vectorized backtesting: tradeoffs for daily-bar strategies
- Point-in-time data: why you MUST use point-in-time fundamentals, universe membership, and prices
- Survivorship bias: what it is, how much it inflates returns (typically 1-2%/year), how to avoid
- Look-ahead bias: the 10 most common sources in practice (enumerate all of them)
- Fill assumptions: at what price should simulated orders fill? Open, close, VWAP? With what slippage model?
- Transaction costs: realistic cost model for Alpaca paper trading on S&P 500 names
- Benchmark comparison: always compare to buy-and-hold SPY, not zero

### 6.2 Statistical Validation

- Minimum number of trades for statistical significance
- Bootstrap methods for confidence intervals on Sharpe/return/drawdown
- Monte Carlo permutation tests: shuffling returns to test if performance is real
- Walk-forward optimization: rolling re-fit of parameters — step by step
- Paper trading as validation: how long must a paper-trading track record be to trust it?
- The "haircut" rule: what fraction of backtested Sharpe survives live trading? (cite Lopez de Prado, Bailey, and practitioner consensus)

### 6.3 Common Backtesting Mistakes (Exhaustive List)

Enumerate every known backtesting mistake, with a one-sentence explanation of each:
- Survivorship bias
- Look-ahead bias
- Selection bias (testing many strategies, reporting the best)
- Overfitting to in-sample period
- Ignoring transaction costs
- Ignoring market impact
- Ignoring slippage
- Using adjusted vs. unadjusted prices incorrectly
- Incorrect dividend handling
- Incorrect split handling
- Using end-of-day data as if it were available intraday
- Using point-in-time violating fundamental data (e.g., using restated earnings)
- Ignoring short-sale constraints
- Ignoring borrowing costs
- Assuming infinite liquidity
- Assuming instant execution
- Ignoring the bid-ask spread
- Ignoring overnight/weekend risk
- Not accounting for corporate actions (mergers, spinoffs, ticker changes)
- Using future index membership (e.g., current S&P 500 for historical backtests)
- Optimizing in-sample and testing on the same period
- Using too many parameters relative to observations
- Not reporting multiple testing adjustment
- Cherry-picking start/end dates
- Ignoring opportunity cost (comparing to 0% instead of benchmark)

---

## PART 7: INFRASTRUCTURE AND IMPLEMENTATION

### 7.1 Technology Stack for a Small Quant

- Best programming languages for quant trading: Python, TypeScript/Node, C++, Rust — tradeoffs for each at different latency requirements
- Data storage: SQLite vs. PostgreSQL vs. Parquet vs. Arctic/TimescaleDB for a solo trader
- Data vendors: free (Alpaca, Yahoo, EODHD) vs. paid (Quandl/Nasdaq, Bloomberg, Refinitiv) — what do you get for each price point?
- Scheduling: cron jobs vs. event-driven vs. cloud functions for a daily strategy
- Monitoring: what to monitor in a live trading system (fill quality, slippage, drift from backtest, drawdown)
- Version control for strategies: how to track strategy changes alongside code changes

### 7.2 Alpaca-Specific Implementation

- Alpaca paper trading API: capabilities, limitations, known issues
- Alpaca market data: IEX vs. SIP feed — what's the difference and does it matter for daily bars?
- Alpaca order types: market, limit, stop, stop-limit, trailing stop — which to use when
- Alpaca rate limits and how to stay within them
- Transitioning from paper to live on Alpaca: what changes, what doesn't
- Alpaca's fractional shares: implications for position sizing

### 7.3 Operational Risk

- Single points of failure in a solo quant setup and how to mitigate each
- What to do when: API is down, data is stale, strategy generates no signals, an order is stuck
- Kill switch design: how to emergency-halt a trading system
- Reconciliation: comparing expected vs. actual fills, positions, P&L
- Tax implications of algorithmic trading (US): wash sale rules, short-term vs. long-term capital gains, Section 1256 contracts

---

## PART 8: THE META-GAME — WHAT SEPARATES WINNERS FROM LOSERS

### 8.1 Why Most Quant Strategies Fail

- Strategy decay: how and why published edges disappear (crowding, arbitrage, regime change)
- The half-life of alpha: how quickly does a discovered edge decay? (cite research)
- Overfitting: the #1 killer — why smart people still overfit and how to build defenses
- Emotional override: even with a system, when does the human intervene and how to prevent it
- Undercapitalization: minimum capital for a viable S&P 500 daily strategy (compute the actual number accounting for diversification, transaction costs, and drawdown tolerance)

### 8.2 What the Professionals Do Differently

- How does Renaissance Technologies / Medallion Fund actually work? (what is publicly known)
- Two Sigma, DE Shaw, Citadel, AQR — different approaches, different edges
- What do these firms have that a retail quant doesn't? (data, latency, talent, capital, infrastructure)
- Where do they NOT have an edge, i.e., where can a small trader compete?
- The importance of research process: hypothesis → backtest → paper → small live → scale — how long does each phase take at a professional firm?

### 8.3 Realistic Expectations

- What annual return should a retail quant with a $100k portfolio and a daily-bar S&P 500 strategy realistically expect AFTER costs?
- What Sharpe ratio is realistic? (Be honest. Cite data.)
- What maximum drawdown should be expected and tolerated?
- How many years of live trading before you can statistically distinguish skill from luck?
- When should you quit: objective criteria for shutting down a strategy

---

## PART 9: EMERGING AND ADVANCED TOPICS

### 9.1 Deep Learning for Finance

- Transformer models for time series prediction: Temporal Fusion Transformers, Informer, PatchTST
- Graph neural networks for stock relationships
- Generative models for synthetic data augmentation in backtesting
- Foundation models for finance: BloombergGPT, FinGPT — practical utility?

### 9.2 Alternative Asset Classes

- How the same signals work (or don't) across: futures, forex, crypto, options
- Cross-asset momentum: does stock momentum carry information for bonds/commodities?
- Prediction markets: Polymarket, Kalshi — what edges exist for algorithmic trading?

### 9.3 Regulatory Considerations

- Pattern Day Trader rule: implications for a $100k paper-to-live transition
- SEC regulations on algorithmic trading for retail
- FINRA rules on automated trading
- Tax-loss harvesting as a systematic strategy overlay

---

## FORMAT REQUIREMENTS

- For every claim, cite the source (author, year, paper title or book chapter)
- For every strategy, give specific parameter values — not "a lookback period" but "252 trading days, skipping the most recent 21"
- For every edge claimed, state whether it has been replicated post-publication and on what data
- For any disagreement between researchers, present both sides
- Organize with clear headers matching this structure
- Use tables where comparison is needed (signal A vs. signal B, strategy A vs. strategy B)
- Total length: as long as needed. Do not summarize or truncate. This is meant to be exhaustive.
- If you are uncertain about something, say "uncertain" rather than guessing

---

## CONTEXT ABOUT THE EXISTING SYSTEM

The system you're advising on currently has:
- **Universe**: 10 S&P 500 stocks + SPY (AAPL, MSFT, NVDA, AMZN, GOOG, META, TSLA, JPM, V, UNH)
- **Signals**: 12-1 cross-sectional momentum, RSI(2) mean-reversion with SPY 200-SMA regime gate, optional LLM headline sentiment
- **Combination**: Weighted sum (40% momentum, 40% mean-reversion, 20% sentiment)
- **Sizing**: Volatility-targeted at 1% portfolio risk per position, max 5 positions
- **Stops**: Volatility-scaled (2× 20-day stdev × price)
- **Rebalance**: Monthly for entries, daily for exits/stops
- **Broker**: Alpaca paper trading
- **Data**: 3 years of daily OHLCV bars from Alpaca, locally stored in SQLite
- **Backtest results on real data**: +74.57% return, 1.28 Sharpe, -24.16% max drawdown, 479 trades over ~2 years

Given this context, the research should specifically address:
1. What's working and why (or if the results are likely overstated)
2. What signals/improvements would have the highest marginal value to add NEXT
3. What risks are not currently addressed
4. Whether the current parameter choices are reasonable or need adjustment
5. How to expand from 10 tickers to the full S&P 500 and what changes
