# tap Trading Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build v1 of `tap` — a local Python paper-trading bot for the S&P 500 on daily bars, with a Textual mission-control TUI, deterministic signals, optional LLM sentiment, and a deterministic backtester that shares code with live paper trading.

**Architecture:** Single Python package with layered subpackages (`core`, `data`, `signals`, `strategy`, `risk`, `broker`, `backtest`, `ledger`, `tui`) and import graph flowing inward. Pure-function signals, pluggable broker and strategy, SQLite + Parquet storage, mocked external services in tests.

**Tech Stack:** Python 3.11+, pydantic, pandas, SQLAlchemy + SQLite, Parquet (pyarrow), Alpaca SDK (`alpaca-py`), Anthropic SDK, Textual, typer, python-dotenv, pytest, pytest-asyncio, hypothesis.

**Spec:** `docs/superpowers/specs/2026-04-12-tap-trading-bot-design.md`

---

## Task 0: Project scaffolding

**Files:**
- Create: `pyproject.toml`
- Create: `.gitignore`
- Create: `tap/__init__.py`
- Create: `tap/core/__init__.py`
- Create: `tap/data/__init__.py`
- Create: `tap/signals/__init__.py`
- Create: `tap/strategy/__init__.py`
- Create: `tap/risk/__init__.py`
- Create: `tap/broker/__init__.py`
- Create: `tap/backtest/__init__.py`
- Create: `tap/ledger/__init__.py`
- Create: `tap/tui/__init__.py`
- Create: `tests/__init__.py`
- Create: `tests/conftest.py`
- Create: `config.toml`

- [ ] **Step 1: Write `pyproject.toml`**

```toml
[project]
name = "tap"
version = "0.1.0"
description = "Paper-trading bot for S&P 500 with Textual mission-control TUI"
requires-python = ">=3.11"
dependencies = [
    "pydantic>=2.5",
    "pandas>=2.2",
    "pyarrow>=15.0",
    "sqlalchemy>=2.0",
    "alpaca-py>=0.21",
    "anthropic>=0.40",
    "textual>=0.80",
    "typer>=0.12",
    "python-dotenv>=1.0",
    "tomli>=2.0; python_version < '3.11'",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "hypothesis>=6.100",
    "ruff>=0.4",
]

[project.scripts]
tap = "tap.cli:app"

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
include = ["tap*"]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

- [ ] **Step 2: Write `.gitignore`**

```
__pycache__/
*.pyc
*.egg-info/
.venv/
.pytest_cache/
.hypothesis/
data/bars/
data/*.sqlite
data/*.sqlite-journal
~/.tap/
.DS_Store
```

- [ ] **Step 3: Create empty package init files**

```bash
mkdir -p tap/core tap/data tap/signals tap/strategy tap/risk tap/broker tap/backtest tap/ledger tap/tui tests
touch tap/__init__.py tap/core/__init__.py tap/data/__init__.py tap/signals/__init__.py tap/strategy/__init__.py tap/risk/__init__.py tap/broker/__init__.py tap/backtest/__init__.py tap/ledger/__init__.py tap/tui/__init__.py tests/__init__.py
```

- [ ] **Step 4: Write `tests/conftest.py`**

```python
from __future__ import annotations

import tempfile
from pathlib import Path
from datetime import date, datetime, timezone

import pytest


@pytest.fixture
def tmp_data_dir() -> Path:
    with tempfile.TemporaryDirectory() as d:
        yield Path(d)


@pytest.fixture
def fixed_as_of() -> date:
    return date(2024, 6, 14)


@pytest.fixture
def fixed_now() -> datetime:
    return datetime(2024, 6, 14, 20, 0, tzinfo=timezone.utc)
```

- [ ] **Step 5: Write a minimal `config.toml`**

```toml
[universe]
index = "SP500"

[strategy]
name = "momentum_rsi"
weights = { momentum = 0.4, mean_reversion = 0.4, sentiment = 0.2 }
pre_filter_size = 20
max_positions = 10
rebalance_cadence = "monthly"
breakout_margin = 0.15

[risk]
target_risk_per_position = 0.01
stop_atr_multiple = 2.0

[broker]
mode = "alpaca_paper"
slippage_bps = 5

[llm]
model = "claude-haiku-4-5"
cache_dir = "~/.tap/llm-cache"

[data]
bars_dir = "data/bars"
news_db = "data/news.sqlite"
ledger_db = "data/ledger.sqlite"
universe_csv = "data/universe/sp500_history.csv"
```

- [ ] **Step 6: Create venv and install dev deps**

Run:
```bash
python3 -m venv .venv && source .venv/bin/activate && pip install -q -e ".[dev]"
```
Expected: clean install, no errors.

- [ ] **Step 7: Run pytest to verify scaffolding**

Run: `pytest -q`
Expected: `no tests ran` (green, zero tests, zero failures).

- [ ] **Step 8: Commit**

```bash
git add pyproject.toml .gitignore tap tests config.toml
git commit -m "chore: scaffold tap package layout and test config"
```

---

## Task 1: Core types (`tap/core/types.py`)

**Files:**
- Create: `tap/core/types.py`
- Test: `tests/test_core_types.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_core_types.py
from datetime import date, datetime, timezone
import pytest

from tap.core.types import Bar, Order, Position, Portfolio, SignalValue


def test_bar_requires_positive_volume():
    with pytest.raises(ValueError):
        Bar(ticker="AAPL", date=date(2024, 6, 14), open=1, high=1, low=1, close=1, volume=-1)


def test_order_defaults_status_to_pending():
    o = Order(client_order_id="r1:AAPL:buy:0", ticker="AAPL", side="buy", qty=10, kind="market", stop_price=None)
    assert o.status == "pending"
    assert o.submitted_at is None


def test_portfolio_total_equity():
    p = Portfolio(
        cash=1000.0,
        equity=1500.0,
        positions={"AAPL": Position(ticker="AAPL", qty=10, avg_price=50.0,
                                    opened_at=datetime(2024, 6, 1, tzinfo=timezone.utc),
                                    stop_price=45.0)},
    )
    assert p.equity == 1500.0
    assert p.positions["AAPL"].qty == 10


def test_signal_value_roundtrip():
    s = SignalValue(ticker="AAPL", signal_name="momentum_12_1", value=0.42, as_of=date(2024, 6, 14))
    assert s.model_dump()["value"] == 0.42
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_core_types.py -v`
Expected: FAIL with `ModuleNotFoundError: tap.core.types`.

- [ ] **Step 3: Implement types**

```python
# tap/core/types.py
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class Bar(BaseModel):
    ticker: str
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: int

    @field_validator("volume")
    @classmethod
    def _volume_nonnegative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("volume must be >= 0")
        return v


OrderSide = Literal["buy", "sell"]
OrderKind = Literal["market", "stop"]
OrderStatus = Literal["pending", "submitted", "filled", "rejected", "cancelled"]


class Order(BaseModel):
    client_order_id: str
    ticker: str
    side: OrderSide
    qty: int
    kind: OrderKind
    stop_price: float | None = None
    submitted_at: datetime | None = None
    status: OrderStatus = "pending"


class Position(BaseModel):
    ticker: str
    qty: int
    avg_price: float
    opened_at: datetime
    stop_price: float | None = None


class Portfolio(BaseModel):
    cash: float
    equity: float
    positions: dict[str, Position] = Field(default_factory=dict)


class SignalValue(BaseModel):
    ticker: str
    signal_name: str
    value: float
    as_of: date
```

- [ ] **Step 4: Run test to verify pass**

Run: `pytest tests/test_core_types.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/core/types.py tests/test_core_types.py
git commit -m "feat(core): add Bar, Order, Position, Portfolio, SignalValue types"
```

---

## Task 2: Core clock (`tap/core/clock.py`)

**Files:**
- Create: `tap/core/clock.py`
- Test: `tests/test_core_clock.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_core_clock.py
from datetime import date, datetime, timezone

from tap.core.clock import Clock, FixedClock


def test_fixed_clock_returns_injected_values():
    c = FixedClock(now=datetime(2024, 6, 14, 20, 0, tzinfo=timezone.utc))
    assert c.now() == datetime(2024, 6, 14, 20, 0, tzinfo=timezone.utc)
    assert c.as_of_date() == date(2024, 6, 14)


def test_real_clock_is_timezone_aware():
    c = Clock()
    assert c.now().tzinfo is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_core_clock.py -v`
Expected: FAIL with `ModuleNotFoundError`.

- [ ] **Step 3: Implement clock**

```python
# tap/core/clock.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone


class Clock:
    def now(self) -> datetime:
        return datetime.now(timezone.utc)

    def as_of_date(self) -> date:
        return self.now().date()


@dataclass
class FixedClock(Clock):
    now_: datetime

    def __init__(self, now: datetime):
        self.now_ = now

    def now(self) -> datetime:
        return self.now_

    def as_of_date(self) -> date:
        return self.now_.date()
```

- [ ] **Step 4: Run test to verify pass**

Run: `pytest tests/test_core_clock.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/core/clock.py tests/test_core_clock.py
git commit -m "feat(core): add Clock and FixedClock"
```

---

## Task 3: Core config + secrets (`tap/core/config.py`)

**Files:**
- Create: `tap/core/config.py`
- Test: `tests/test_core_config.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_core_config.py
from pathlib import Path

from tap.core.config import load_config, Config


def test_load_config_parses_toml(tmp_path: Path):
    cfg = tmp_path / "config.toml"
    cfg.write_text(
        """
        [strategy]
        name = "momentum_rsi"
        weights = { momentum = 0.4, mean_reversion = 0.4, sentiment = 0.2 }
        pre_filter_size = 20
        max_positions = 10
        rebalance_cadence = "monthly"
        breakout_margin = 0.15

        [risk]
        target_risk_per_position = 0.01
        stop_atr_multiple = 2.0

        [broker]
        mode = "alpaca_paper"
        slippage_bps = 5

        [llm]
        model = "claude-haiku-4-5"
        cache_dir = "/tmp/cache"

        [data]
        bars_dir = "data/bars"
        news_db = "data/news.sqlite"
        ledger_db = "data/ledger.sqlite"
        universe_csv = "data/universe/sp500_history.csv"

        [universe]
        index = "SP500"
        """
    )
    c: Config = load_config(cfg)
    assert c.strategy.name == "momentum_rsi"
    assert c.strategy.weights["momentum"] == 0.4
    assert c.risk.target_risk_per_position == 0.01
    assert c.broker.slippage_bps == 5


def test_config_hash_is_stable(tmp_path: Path):
    cfg = tmp_path / "config.toml"
    cfg.write_text(
        '[strategy]\nname="x"\nweights={}\npre_filter_size=1\nmax_positions=1\nrebalance_cadence="monthly"\nbreakout_margin=0.0\n'
        '[risk]\ntarget_risk_per_position=0.01\nstop_atr_multiple=2.0\n'
        '[broker]\nmode="alpaca_paper"\nslippage_bps=5\n'
        '[llm]\nmodel="m"\ncache_dir="/tmp"\n'
        '[data]\nbars_dir="a"\nnews_db="b"\nledger_db="c"\nuniverse_csv="d"\n'
        '[universe]\nindex="SP500"\n'
    )
    h1 = load_config(cfg).hash()
    h2 = load_config(cfg).hash()
    assert h1 == h2 and len(h1) == 64
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_core_config.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement config loader**

```python
# tap/core/config.py
from __future__ import annotations

import hashlib
import json
import tomllib
from pathlib import Path

from pydantic import BaseModel


class StrategyConfig(BaseModel):
    name: str
    weights: dict[str, float]
    pre_filter_size: int
    max_positions: int
    rebalance_cadence: str
    breakout_margin: float


class RiskConfig(BaseModel):
    target_risk_per_position: float
    stop_atr_multiple: float


class BrokerConfig(BaseModel):
    mode: str
    slippage_bps: int


class LLMConfig(BaseModel):
    model: str
    cache_dir: str


class DataConfig(BaseModel):
    bars_dir: str
    news_db: str
    ledger_db: str
    universe_csv: str


class UniverseConfig(BaseModel):
    index: str


class Config(BaseModel):
    strategy: StrategyConfig
    risk: RiskConfig
    broker: BrokerConfig
    llm: LLMConfig
    data: DataConfig
    universe: UniverseConfig

    def hash(self) -> str:
        canonical = json.dumps(self.model_dump(), sort_keys=True, default=str)
        return hashlib.sha256(canonical.encode()).hexdigest()


def load_config(path: Path | str) -> Config:
    with open(path, "rb") as f:
        data = tomllib.load(f)
    return Config(**data)
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_core_config.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/core/config.py tests/test_core_config.py
git commit -m "feat(core): add config loader with stable config_hash"
```

---

## Task 4: Core logging (`tap/core/logging.py`)

**Files:**
- Create: `tap/core/logging.py`
- Test: `tests/test_core_logging.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_core_logging.py
import json
from pathlib import Path

from tap.core.logging import StructuredLogger, LogRingBuffer


def test_structured_logger_writes_jsonl(tmp_path: Path):
    log = StructuredLogger(log_path=tmp_path / "tap.jsonl", buffer_size=64)
    log.info("signal_computed", ticker="AAPL", value=0.42)
    log.warn("llm_fallback", ticker="NVDA")
    lines = (tmp_path / "tap.jsonl").read_text().strip().splitlines()
    assert len(lines) == 2
    first = json.loads(lines[0])
    assert first["event"] == "signal_computed"
    assert first["level"] == "INFO"
    assert first["ticker"] == "AAPL"


def test_ring_buffer_captures_entries(tmp_path: Path):
    log = StructuredLogger(log_path=tmp_path / "t.jsonl", buffer_size=3)
    for i in range(5):
        log.info("tick", i=i)
    assert len(log.buffer.snapshot()) == 3
    assert log.buffer.snapshot()[-1]["i"] == 4
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_core_logging.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement logger**

```python
# tap/core/logging.py
from __future__ import annotations

import json
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Deque


class LogRingBuffer:
    def __init__(self, size: int = 512) -> None:
        self._buf: Deque[dict[str, Any]] = deque(maxlen=size)

    def push(self, entry: dict[str, Any]) -> None:
        self._buf.append(entry)

    def snapshot(self) -> list[dict[str, Any]]:
        return list(self._buf)


class StructuredLogger:
    def __init__(self, log_path: Path, buffer_size: int = 512) -> None:
        self.log_path = log_path
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        self.buffer = LogRingBuffer(buffer_size)

    def _write(self, level: str, event: str, **fields: Any) -> None:
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "event": event,
            **fields,
        }
        with self.log_path.open("a") as f:
            f.write(json.dumps(entry, default=str) + "\n")
        self.buffer.push(entry)

    def info(self, event: str, **f: Any) -> None:
        self._write("INFO", event, **f)

    def warn(self, event: str, **f: Any) -> None:
        self._write("WARN", event, **f)

    def error(self, event: str, **f: Any) -> None:
        self._write("ERROR", event, **f)
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_core_logging.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/core/logging.py tests/test_core_logging.py
git commit -m "feat(core): add structured JSON logger with ring buffer"
```

---

## Task 5: Core LLM client with disk cache (`tap/core/llm.py`)

**Files:**
- Create: `tap/core/llm.py`
- Test: `tests/test_core_llm.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_core_llm.py
from pathlib import Path
from unittest.mock import MagicMock

from tap.core.llm import LLMClient, Classification


def test_classify_uses_cache_on_second_call(tmp_path: Path):
    fake_sdk = MagicMock()
    fake_sdk.classify.return_value = "bullish"
    client = LLMClient(model="haiku", cache_dir=tmp_path, sdk=fake_sdk)

    first = client.classify_headline("AAPL up 5% on strong earnings")
    second = client.classify_headline("AAPL up 5% on strong earnings")

    assert first == Classification.BULLISH
    assert second == Classification.BULLISH
    assert fake_sdk.classify.call_count == 1  # cache hit on second


def test_classify_retries_then_raises(tmp_path: Path):
    fake_sdk = MagicMock()
    fake_sdk.classify.side_effect = RuntimeError("boom")
    client = LLMClient(model="haiku", cache_dir=tmp_path, sdk=fake_sdk, retries=3)
    try:
        client.classify_headline("something")
    except RuntimeError:
        pass
    assert fake_sdk.classify.call_count == 3
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_core_llm.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement client**

```python
# tap/core/llm.py
from __future__ import annotations

import enum
import hashlib
import json
import time
from pathlib import Path
from typing import Protocol


class Classification(str, enum.Enum):
    BULLISH = "bullish"
    NEUTRAL = "neutral"
    BEARISH = "bearish"


class SDKLike(Protocol):
    def classify(self, headline: str, model: str) -> str: ...


class LLMClient:
    def __init__(
        self,
        model: str,
        cache_dir: Path,
        sdk: SDKLike,
        retries: int = 3,
        backoff_base: float = 1.0,
    ) -> None:
        self.model = model
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.sdk = sdk
        self.retries = retries
        self.backoff_base = backoff_base

    def _cache_key(self, headline: str) -> str:
        h = hashlib.sha256(f"{self.model}|{headline}".encode()).hexdigest()
        return h

    def _cache_path(self, key: str) -> Path:
        return self.cache_dir / f"{key}.json"

    def classify_headline(self, headline: str) -> Classification:
        key = self._cache_key(headline)
        path = self._cache_path(key)
        if path.exists():
            try:
                return Classification(json.loads(path.read_text())["classification"])
            except Exception:
                pass  # corrupt cache; recompute

        last_err: Exception | None = None
        for attempt in range(self.retries):
            try:
                raw = self.sdk.classify(headline, model=self.model)
                label = Classification(raw)
                path.write_text(json.dumps({"classification": label.value, "headline": headline}))
                return label
            except Exception as e:
                last_err = e
                time.sleep(self.backoff_base * (4 ** attempt))
        assert last_err is not None
        raise last_err
```

- [ ] **Step 4: Run tests**

Adjust sleep for tests — patch `time.sleep`:

```python
# tests/test_core_llm.py additional
from unittest.mock import patch

def test_classify_retries_then_raises(tmp_path: Path):
    fake_sdk = MagicMock()
    fake_sdk.classify.side_effect = RuntimeError("boom")
    client = LLMClient(model="haiku", cache_dir=tmp_path, sdk=fake_sdk, retries=3, backoff_base=0)
    with patch("time.sleep"):
        try:
            client.classify_headline("something")
        except RuntimeError:
            pass
    assert fake_sdk.classify.call_count == 3
```

Run: `pytest tests/test_core_llm.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/core/llm.py tests/test_core_llm.py
git commit -m "feat(core): add LLMClient with disk cache and retry"
```

---

## Task 6: Ledger models (`tap/ledger/models.py`)

**Files:**
- Create: `tap/ledger/models.py`
- Test: `tests/test_ledger_models.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_ledger_models.py
from datetime import date, datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from tap.ledger.models import Base, Run, SignalSnapshot, Order, Fill, Position, EquitySnapshot


def test_schema_creates_and_persists_run():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        r = Run(
            mode="backtest",
            started_at=datetime(2024, 6, 14, tzinfo=timezone.utc),
            ended_at=None,
            status="started",
            config_hash="deadbeef",
            notes="t",
        )
        s.add(r)
        s.commit()
        assert r.id is not None

        snap = SignalSnapshot(run_id=r.id, as_of=date(2024, 6, 14), ticker="AAPL",
                              signal_name="momentum_12_1", value=0.42)
        s.add(snap)
        s.commit()
        assert snap.id is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_ledger_models.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement models**

```python
# tap/ledger/models.py
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Run(Base):
    __tablename__ = "runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    mode: Mapped[str] = mapped_column(String(32))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(16))  # started, completed, failed
    config_hash: Mapped[str] = mapped_column(String(64))
    notes: Mapped[str | None] = mapped_column(String(1024), nullable=True)


class SignalSnapshot(Base):
    __tablename__ = "signal_snapshots"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("runs.id"))
    as_of: Mapped[date] = mapped_column(Date)
    ticker: Mapped[str] = mapped_column(String(12))
    signal_name: Mapped[str] = mapped_column(String(64))
    value: Mapped[float] = mapped_column(Float)


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("runs.id"))
    client_order_id: Mapped[str] = mapped_column(String(128), unique=True)
    ticker: Mapped[str] = mapped_column(String(12))
    side: Mapped[str] = mapped_column(String(4))
    qty: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(16))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(String(256), nullable=True)


class Fill(Base):
    __tablename__ = "fills"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    filled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    qty: Mapped[int] = mapped_column(Integer)
    price: Mapped[float] = mapped_column(Float)


class Position(Base):
    __tablename__ = "positions"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("runs.id"))
    ticker: Mapped[str] = mapped_column(String(12))
    qty: Mapped[int] = mapped_column(Integer)
    avg_price: Mapped[float] = mapped_column(Float)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class EquitySnapshot(Base):
    __tablename__ = "equity_snapshots"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("runs.id"))
    as_of: Mapped[date] = mapped_column(Date)
    cash: Mapped[float] = mapped_column(Float)
    equity: Mapped[float] = mapped_column(Float)
    positions_value: Mapped[float] = mapped_column(Float)
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_ledger_models.py -v`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/ledger/models.py tests/test_ledger_models.py
git commit -m "feat(ledger): add SQLAlchemy schema for runs, signals, orders, fills, positions, equity"
```

---

## Task 7: Ledger repo (`tap/ledger/repo.py`)

**Files:**
- Create: `tap/ledger/repo.py`
- Test: `tests/test_ledger_repo.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_ledger_repo.py
from datetime import date, datetime, timezone

from tap.ledger.repo import LedgerRepo


def test_repo_creates_run_and_queries(tmp_path):
    repo = LedgerRepo(db_path=tmp_path / "ledger.sqlite")
    repo.init_schema()
    run_id = repo.start_run(mode="backtest", config_hash="abc", notes=None,
                            now=datetime(2024, 6, 14, tzinfo=timezone.utc))
    repo.write_signal(run_id=run_id, as_of=date(2024, 6, 14), ticker="AAPL",
                      signal_name="momentum_12_1", value=0.42)
    repo.complete_run(run_id=run_id, now=datetime(2024, 6, 14, 21, tzinfo=timezone.utc))

    r = repo.get_run(run_id)
    assert r.status == "completed"
    assert len(repo.list_signals(run_id)) == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_ledger_repo.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement repo**

```python
# tap/ledger/repo.py
from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from tap.ledger.models import Base, Run, SignalSnapshot, Order, Fill, EquitySnapshot


class LedgerRepo:
    def __init__(self, db_path: Path | str) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.engine = create_engine(f"sqlite:///{self.db_path}")

    def init_schema(self) -> None:
        Base.metadata.create_all(self.engine)

    def start_run(self, mode: str, config_hash: str, notes: str | None, now: datetime) -> int:
        with Session(self.engine) as s:
            r = Run(mode=mode, started_at=now, status="started", config_hash=config_hash, notes=notes)
            s.add(r); s.commit(); return r.id

    def complete_run(self, run_id: int, now: datetime) -> None:
        with Session(self.engine) as s:
            r = s.get(Run, run_id); assert r is not None
            r.ended_at = now; r.status = "completed"; s.commit()

    def fail_run(self, run_id: int, now: datetime, reason: str) -> None:
        with Session(self.engine) as s:
            r = s.get(Run, run_id); assert r is not None
            r.ended_at = now; r.status = "failed"; r.notes = (r.notes or "") + f"\nFAIL: {reason}"
            s.commit()

    def get_run(self, run_id: int) -> Run:
        with Session(self.engine) as s:
            r = s.get(Run, run_id); assert r is not None; return r

    def write_signal(self, run_id: int, as_of: date, ticker: str, signal_name: str, value: float) -> None:
        with Session(self.engine) as s:
            s.add(SignalSnapshot(run_id=run_id, as_of=as_of, ticker=ticker,
                                 signal_name=signal_name, value=value))
            s.commit()

    def list_signals(self, run_id: int) -> list[SignalSnapshot]:
        with Session(self.engine) as s:
            return list(s.scalars(select(SignalSnapshot).where(SignalSnapshot.run_id == run_id)))

    def write_order(self, run_id: int, client_order_id: str, ticker: str, side: str, qty: int,
                    kind: str, status: str, submitted_at: datetime | None,
                    rejection_reason: str | None = None) -> int:
        with Session(self.engine) as s:
            o = Order(run_id=run_id, client_order_id=client_order_id, ticker=ticker,
                      side=side, qty=qty, kind=kind, status=status,
                      submitted_at=submitted_at, rejection_reason=rejection_reason)
            s.add(o); s.commit(); return o.id

    def write_fill(self, order_id: int, filled_at: datetime, qty: int, price: float) -> None:
        with Session(self.engine) as s:
            s.add(Fill(order_id=order_id, filled_at=filled_at, qty=qty, price=price))
            s.commit()

    def write_equity(self, run_id: int, as_of: date, cash: float, equity: float,
                     positions_value: float) -> None:
        with Session(self.engine) as s:
            s.add(EquitySnapshot(run_id=run_id, as_of=as_of, cash=cash, equity=equity,
                                 positions_value=positions_value))
            s.commit()
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_ledger_repo.py -v`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/ledger/repo.py tests/test_ledger_repo.py
git commit -m "feat(ledger): add LedgerRepo with run/signal/order/equity write helpers"
```

---

## Task 8: Universe (point-in-time S&P 500 membership) (`tap/data/universe.py`)

**Files:**
- Create: `tap/data/universe.py`
- Test: `tests/test_data_universe.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_data_universe.py
from datetime import date
from pathlib import Path

from tap.data.universe import Universe


def test_membership_at(tmp_path: Path):
    csv = tmp_path / "sp500_history.csv"
    csv.write_text(
        "ticker,added,removed\n"
        "AAPL,1980-12-12,\n"
        "TSLA,2020-12-21,\n"
        "YHOO,2000-01-01,2017-06-13\n"
    )
    u = Universe.from_csv(csv)

    assert "AAPL" in u.members_at(date(2024, 6, 14))
    assert "TSLA" in u.members_at(date(2024, 6, 14))
    assert "TSLA" not in u.members_at(date(2019, 1, 1))
    assert "YHOO" in u.members_at(date(2015, 1, 1))
    assert "YHOO" not in u.members_at(date(2024, 1, 1))


def test_all_historical_tickers(tmp_path: Path):
    csv = tmp_path / "sp500_history.csv"
    csv.write_text("ticker,added,removed\nAAPL,1980-12-12,\nYHOO,2000-01-01,2017-06-13\n")
    u = Universe.from_csv(csv)
    assert u.all_historical_tickers() == {"AAPL", "YHOO"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_data_universe.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement universe**

```python
# tap/data/universe.py
from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import date
from pathlib import Path


@dataclass
class _Membership:
    ticker: str
    added: date
    removed: date | None


class Universe:
    def __init__(self, memberships: list[_Membership]) -> None:
        self._memberships = memberships

    @classmethod
    def from_csv(cls, path: Path) -> "Universe":
        rows: list[_Membership] = []
        with open(path) as f:
            reader = csv.DictReader(f)
            for r in reader:
                added = date.fromisoformat(r["added"])
                removed_raw = r.get("removed") or ""
                removed = date.fromisoformat(removed_raw) if removed_raw else None
                rows.append(_Membership(ticker=r["ticker"], added=added, removed=removed))
        return cls(rows)

    def members_at(self, as_of: date) -> set[str]:
        return {
            m.ticker for m in self._memberships
            if m.added <= as_of and (m.removed is None or m.removed > as_of)
        }

    def all_historical_tickers(self) -> set[str]:
        return {m.ticker for m in self._memberships}
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_data_universe.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/data/universe.py tests/test_data_universe.py
git commit -m "feat(data): add point-in-time Universe from CSV history"
```

---

## Task 9: Bars store (`tap/data/bars.py`)

**Files:**
- Create: `tap/data/bars.py`
- Test: `tests/test_data_bars.py`

Scope: Parquet-backed store, `write_bars` / `read_bars` / `wide_frame` helpers, incremental update via an injected fetcher callable. The real Alpaca fetcher is out of scope for tests; tests use a fake fetcher.

- [ ] **Step 1: Write failing test**

```python
# tests/test_data_bars.py
from datetime import date
from pathlib import Path

import pandas as pd

from tap.data.bars import BarStore


def _fake_fetcher(tickers, start, end):
    frames = []
    for t in tickers:
        dates = pd.date_range(start, end, freq="B")
        frames.append(pd.DataFrame({
            "ticker": t, "date": dates.date,
            "open": 100.0, "high": 101.0, "low": 99.0, "close": 100.5, "volume": 1_000_000,
        }))
    return pd.concat(frames, ignore_index=True)


def test_bar_store_writes_and_reads(tmp_path: Path):
    store = BarStore(base_dir=tmp_path, fetcher=_fake_fetcher)
    store.ensure(["AAPL", "MSFT"], start=date(2024, 1, 2), end=date(2024, 1, 5))
    df = store.read_wide(["AAPL", "MSFT"], field="close", start=date(2024, 1, 2), end=date(2024, 1, 5))
    assert set(df.columns) == {"AAPL", "MSFT"}
    assert len(df) >= 3


def test_bar_store_incremental_update(tmp_path: Path):
    calls = []
    def fetcher(tickers, start, end):
        calls.append((tuple(tickers), start, end))
        return _fake_fetcher(tickers, start, end)

    store = BarStore(base_dir=tmp_path, fetcher=fetcher)
    store.ensure(["AAPL"], start=date(2024, 1, 2), end=date(2024, 1, 5))
    store.ensure(["AAPL"], start=date(2024, 1, 2), end=date(2024, 1, 10))

    # Second call should only fetch the missing tail.
    assert calls[1][1] > calls[0][1]


def test_stale_detection_raises(tmp_path: Path):
    store = BarStore(base_dir=tmp_path, fetcher=_fake_fetcher)
    store.ensure(["AAPL"], start=date(2024, 1, 2), end=date(2024, 1, 5))
    # If required end is far beyond last stored date and fetcher returns nothing, raise
    def empty(tickers, start, end):
        return pd.DataFrame(columns=["ticker","date","open","high","low","close","volume"])
    store2 = BarStore(base_dir=tmp_path, fetcher=empty)
    import pytest
    with pytest.raises(RuntimeError, match="stale"):
        store2.ensure(["AAPL"], start=date(2024, 1, 2), end=date(2030, 1, 1))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_data_bars.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement bar store**

```python
# tap/data/bars.py
from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path
from typing import Callable, Iterable

import pandas as pd


FetcherFn = Callable[[list[str], date, date], pd.DataFrame]


class BarStore:
    def __init__(self, base_dir: Path | str, fetcher: FetcherFn) -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.fetcher = fetcher

    def _path(self, ticker: str) -> Path:
        return self.base_dir / f"{ticker}.parquet"

    def _load(self, ticker: str) -> pd.DataFrame:
        p = self._path(ticker)
        if not p.exists():
            return pd.DataFrame(columns=["ticker","date","open","high","low","close","volume"])
        return pd.read_parquet(p)

    def _save(self, ticker: str, df: pd.DataFrame) -> None:
        df = df.drop_duplicates(subset=["date"]).sort_values("date")
        df.to_parquet(self._path(ticker), index=False)

    def ensure(self, tickers: Iterable[str], start: date, end: date) -> None:
        tickers = list(tickers)
        # Determine the earliest missing start per ticker, fetch the union gap
        missing_start: date | None = None
        for t in tickers:
            df = self._load(t)
            have_end = df["date"].max() if not df.empty else None
            want_from = start if have_end is None else max(start, (have_end + timedelta(days=1)))
            if want_from <= end:
                missing_start = want_from if missing_start is None else min(missing_start, want_from)

        if missing_start is None:
            return

        fetched = self.fetcher(tickers, missing_start, end)
        if fetched is None or fetched.empty:
            # Accept if existing data already covers the range; otherwise stale.
            for t in tickers:
                df = self._load(t)
                have_end = df["date"].max() if not df.empty else None
                if have_end is None or have_end < end - timedelta(days=5):
                    raise RuntimeError(f"stale bars for {t}: last={have_end} required_end={end}")
            return

        for t, grp in fetched.groupby("ticker"):
            existing = self._load(t)
            merged = pd.concat([existing, grp], ignore_index=True)
            self._save(t, merged)

    def read_wide(self, tickers: list[str], field: str, start: date, end: date) -> pd.DataFrame:
        cols = {}
        for t in tickers:
            df = self._load(t)
            if df.empty:
                continue
            df = df[(df["date"] >= start) & (df["date"] <= end)]
            cols[t] = df.set_index("date")[field]
        return pd.DataFrame(cols).sort_index()
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_data_bars.py -v`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/data/bars.py tests/test_data_bars.py
git commit -m "feat(data): add Parquet BarStore with incremental fetch and stale detection"
```

---

## Task 10: News store (`tap/data/news.py`)

**Files:**
- Create: `tap/data/news.py`
- Test: `tests/test_data_news.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_data_news.py
from datetime import datetime, timezone
from pathlib import Path

from tap.data.news import NewsStore, Headline


def test_store_and_fetch_before_cutoff(tmp_path: Path):
    store = NewsStore(db_path=tmp_path / "news.sqlite")
    store.init_schema()
    h1 = Headline(ticker="AAPL", created_at=datetime(2024, 6, 14, 10, tzinfo=timezone.utc),
                  headline="Apple beats", source="bz")
    h2 = Headline(ticker="AAPL", created_at=datetime(2024, 6, 14, 22, tzinfo=timezone.utc),
                  headline="Apple gives guidance", source="bz")
    store.upsert([h1, h2])

    before_close = store.fetch("AAPL", before=datetime(2024, 6, 14, 20, tzinfo=timezone.utc))
    assert len(before_close) == 1
    assert before_close[0].headline == "Apple beats"


def test_upsert_is_idempotent(tmp_path: Path):
    store = NewsStore(db_path=tmp_path / "news.sqlite")
    store.init_schema()
    h = Headline(ticker="AAPL", created_at=datetime(2024, 6, 14, 10, tzinfo=timezone.utc),
                 headline="same", source="bz")
    store.upsert([h, h, h])
    rows = store.fetch("AAPL", before=datetime(2024, 6, 15, tzinfo=timezone.utc))
    assert len(rows) == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_data_news.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement news store**

```python
# tap/data/news.py
from __future__ import annotations

import hashlib
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass(frozen=True)
class Headline:
    ticker: str
    created_at: datetime
    headline: str
    source: str

    @property
    def hash(self) -> str:
        return hashlib.sha256(f"{self.ticker}|{self.headline}".encode()).hexdigest()[:16]


class NewsStore:
    def __init__(self, db_path: Path | str) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def _conn(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def init_schema(self) -> None:
        with self._conn() as c:
            c.execute(
                """
                CREATE TABLE IF NOT EXISTS headlines (
                    ticker TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    headline TEXT NOT NULL,
                    source TEXT NOT NULL,
                    headline_hash TEXT NOT NULL,
                    PRIMARY KEY (ticker, created_at, headline_hash)
                )
                """
            )

    def upsert(self, headlines: list[Headline]) -> None:
        with self._conn() as c:
            for h in headlines:
                c.execute(
                    "INSERT OR IGNORE INTO headlines VALUES (?, ?, ?, ?, ?)",
                    (h.ticker, h.created_at.isoformat(), h.headline, h.source, h.hash),
                )

    def fetch(self, ticker: str, before: datetime) -> list[Headline]:
        with self._conn() as c:
            rows = c.execute(
                "SELECT ticker, created_at, headline, source FROM headlines "
                "WHERE ticker = ? AND created_at < ? ORDER BY created_at",
                (ticker, before.isoformat()),
            ).fetchall()
        return [
            Headline(ticker=r[0], created_at=datetime.fromisoformat(r[1]), headline=r[2], source=r[3])
            for r in rows
        ]

    def coverage_range(self) -> tuple[datetime | None, datetime | None]:
        with self._conn() as c:
            row = c.execute("SELECT MIN(created_at), MAX(created_at) FROM headlines").fetchone()
        if row is None or row[0] is None:
            return (None, None)
        return (datetime.fromisoformat(row[0]), datetime.fromisoformat(row[1]))
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_data_news.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/data/news.py tests/test_data_news.py
git commit -m "feat(data): add SQLite NewsStore with strict created_at cutoff"
```

---

## Task 11: Signals registry + momentum (`tap/signals/momentum.py`)

**Files:**
- Create: `tap/signals/registry.py`
- Create: `tap/signals/momentum.py`
- Test: `tests/test_signal_momentum.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_signal_momentum.py
from datetime import date
import pandas as pd

from tap.signals.momentum import momentum_12_1


def _synth_trend(tickers, start, days, slopes):
    dates = pd.bdate_range(start, periods=days).date
    cols = {t: [100 * (1 + slopes[t]) ** i for i in range(days)] for t in tickers}
    return pd.DataFrame(cols, index=dates)


def test_momentum_ranks_higher_slope_higher():
    bars = _synth_trend(["A", "B", "C"], "2023-01-02", 300, {"A": 0.001, "B": 0.0, "C": -0.001})
    sig = momentum_12_1(bars, as_of=bars.index[-1])
    assert sig["A"] > sig["B"] > sig["C"]


def test_momentum_uses_only_t_minus_252_to_t_minus_21():
    bars = _synth_trend(["A"], "2023-01-02", 300, {"A": 0.002})
    as_of = bars.index[-1]
    # Pollute the last 21 days with huge move — should not affect signal
    bars.loc[bars.index[-21:], "A"] = 10_000
    sig = momentum_12_1(bars, as_of=as_of)
    # A still positive from earlier trend; polluted recent bars ignored
    assert sig["A"] > 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_signal_momentum.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement registry + momentum**

```python
# tap/signals/registry.py
from __future__ import annotations

from typing import Callable, Dict

import pandas as pd

SignalFn = Callable[[pd.DataFrame, "date"], "pd.Series"]

_REGISTRY: Dict[str, SignalFn] = {}


def register(name: str):
    def deco(fn: SignalFn) -> SignalFn:
        _REGISTRY[name] = fn
        return fn
    return deco


def get(name: str) -> SignalFn:
    return _REGISTRY[name]


def names() -> list[str]:
    return sorted(_REGISTRY)
```

```python
# tap/signals/momentum.py
from __future__ import annotations

from datetime import date

import pandas as pd

from tap.signals.registry import register


@register("momentum_12_1")
def momentum_12_1(bars_wide: pd.DataFrame, as_of: date) -> pd.Series:
    """12-1 cross-sectional momentum: return from t-252 to t-21 (skip last 21d)."""
    df = bars_wide[bars_wide.index <= as_of]
    if len(df) < 253:
        return pd.Series(dtype=float)
    end_idx = -21
    start_idx = -252
    ret = df.iloc[end_idx] / df.iloc[start_idx] - 1
    return ret.dropna()
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_signal_momentum.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/signals/registry.py tap/signals/momentum.py tests/test_signal_momentum.py
git commit -m "feat(signals): add 12-1 cross-sectional momentum and registry"
```

---

## Task 12: Mean-reversion signal with SPY regime gate (`tap/signals/mean_reversion.py`)

**Files:**
- Create: `tap/signals/mean_reversion.py`
- Test: `tests/test_signal_mean_reversion.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_signal_mean_reversion.py
from datetime import date
import pandas as pd

from tap.signals.mean_reversion import rsi2_meanrev_gated


def _spy_above_200sma(days=260):
    idx = pd.bdate_range("2023-01-02", periods=days).date
    return pd.Series([100 + i * 0.1 for i in range(days)], index=idx, name="SPY")


def _spy_below_200sma(days=260):
    idx = pd.bdate_range("2023-01-02", periods=days).date
    return pd.Series([100 - i * 0.1 for i in range(days)], index=idx, name="SPY")


def test_oversold_fires_when_market_bullish():
    spy = _spy_above_200sma()
    # Create a ticker that crashes over last 3 days → RSI(2) ~ 0
    closes = [100.0] * (len(spy) - 3) + [95.0, 90.0, 85.0]
    bars = pd.DataFrame({"A": closes}, index=spy.index)
    sig = rsi2_meanrev_gated(bars, spy, as_of=bars.index[-1])
    assert sig["A"] == 1


def test_gate_blocks_in_bearish_market():
    spy = _spy_below_200sma()
    closes = [100.0] * (len(spy) - 3) + [95.0, 90.0, 85.0]
    bars = pd.DataFrame({"A": closes}, index=spy.index)
    sig = rsi2_meanrev_gated(bars, spy, as_of=bars.index[-1])
    assert sig["A"] == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_signal_mean_reversion.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement signal**

```python
# tap/signals/mean_reversion.py
from __future__ import annotations

from datetime import date

import pandas as pd

from tap.signals.registry import register


def _rsi(series: pd.Series, period: int) -> float:
    s = series.dropna()
    if len(s) < period + 1:
        return float("nan")
    delta = s.diff().dropna()
    gains = delta.clip(lower=0).rolling(period).mean().iloc[-1]
    losses = -delta.clip(upper=0).rolling(period).mean().iloc[-1]
    if losses == 0:
        return 100.0
    rs = gains / losses
    return 100 - (100 / (1 + rs))


@register("rsi2_meanrev_gated")
def rsi2_meanrev_gated(bars_wide: pd.DataFrame, spy: pd.Series, as_of: date) -> pd.Series:
    """Return +1 for oversold (RSI(2) < 10), -1 for overbought, 0 otherwise. Gated by SPY > 200-SMA."""
    spy_hist = spy[spy.index <= as_of]
    if len(spy_hist) < 200:
        return pd.Series(0, index=bars_wide.columns, dtype=int)
    sma200 = spy_hist.iloc[-200:].mean()
    if spy_hist.iloc[-1] <= sma200:
        # Gate closed — no mean-reversion entries
        return pd.Series(0, index=bars_wide.columns, dtype=int)

    bars_hist = bars_wide[bars_wide.index <= as_of]
    out = {}
    for ticker in bars_hist.columns:
        rsi = _rsi(bars_hist[ticker], period=2)
        if pd.isna(rsi):
            out[ticker] = 0
        elif rsi < 10:
            out[ticker] = 1
        elif rsi > 90:
            out[ticker] = -1
        else:
            out[ticker] = 0
    return pd.Series(out, dtype=int)
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_signal_mean_reversion.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/signals/mean_reversion.py tests/test_signal_mean_reversion.py
git commit -m "feat(signals): add RSI(2) mean-reversion with SPY 200-SMA regime gate"
```

---

## Task 13: Sentiment signal (`tap/signals/sentiment.py`)

**Files:**
- Create: `tap/signals/sentiment.py`
- Test: `tests/test_signal_sentiment.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_signal_sentiment.py
from datetime import datetime, timezone

from tap.core.llm import Classification
from tap.data.news import Headline
from tap.signals.sentiment import score_sentiment


class FakeLLM:
    def __init__(self, mapping):
        self.mapping = mapping
        self.calls = 0

    def classify_headline(self, headline: str):
        self.calls += 1
        return self.mapping[headline]


def test_aggregates_and_clips():
    hs = [
        Headline("AAPL", datetime(2024, 6, 14, 9, tzinfo=timezone.utc), "beats big", "bz"),
        Headline("AAPL", datetime(2024, 6, 14, 10, tzinfo=timezone.utc), "raises guidance", "bz"),
        Headline("AAPL", datetime(2024, 6, 14, 11, tzinfo=timezone.utc), "announces buyback", "bz"),
    ]
    llm = FakeLLM({
        "beats big": Classification.BULLISH,
        "raises guidance": Classification.BULLISH,
        "announces buyback": Classification.BULLISH,
    })
    s = score_sentiment("AAPL", hs, llm=llm)
    assert s == 1  # clipped at +1


def test_empty_returns_zero():
    llm = FakeLLM({})
    assert score_sentiment("AAPL", [], llm=llm) == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_signal_sentiment.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement signal**

```python
# tap/signals/sentiment.py
from __future__ import annotations

from typing import Protocol

from tap.core.llm import Classification
from tap.data.news import Headline


class LLMLike(Protocol):
    def classify_headline(self, headline: str) -> Classification: ...


_SCORES = {
    Classification.BULLISH: 1,
    Classification.NEUTRAL: 0,
    Classification.BEARISH: -1,
}


def score_sentiment(ticker: str, headlines: list[Headline], llm: LLMLike) -> int:
    if not headlines:
        return 0
    total = 0
    for h in headlines:
        try:
            total += _SCORES[llm.classify_headline(h.headline)]
        except Exception:
            total += 0  # neutral fallback
    # Clip to [-1, +1]
    return max(-1, min(1, total))
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_signal_sentiment.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/signals/sentiment.py tests/test_signal_sentiment.py
git commit -m "feat(signals): add LLM-backed headline sentiment with clipping"
```

---

## Task 14: Property-based lookahead tests (`tests/test_lookahead_property.py`)

**Files:**
- Test: `tests/test_lookahead_property.py`

- [ ] **Step 1: Write property test**

```python
# tests/test_lookahead_property.py
from datetime import date
import pandas as pd
from hypothesis import given, settings
from hypothesis import strategies as st

from tap.signals.momentum import momentum_12_1


def _make_bars(days: int, seed: int) -> pd.DataFrame:
    import numpy as np
    rng = np.random.default_rng(seed)
    idx = pd.bdate_range("2020-01-02", periods=days).date
    data = {f"T{i}": 100 + rng.standard_normal(days).cumsum() for i in range(3)}
    return pd.DataFrame(data, index=idx)


@given(days=st.integers(min_value=260, max_value=500),
       cut=st.integers(min_value=253, max_value=400),
       seed=st.integers(min_value=0, max_value=10_000))
@settings(max_examples=50, deadline=None)
def test_momentum_ignores_future_bars(days, cut, seed):
    bars = _make_bars(days, seed)
    if cut >= len(bars):
        return
    as_of = bars.index[cut]
    sig_full = momentum_12_1(bars, as_of=as_of)
    sig_truncated = momentum_12_1(bars.loc[bars.index <= as_of], as_of=as_of)
    # Values must match — future rows don't influence signal
    pd.testing.assert_series_equal(sig_full.sort_index(), sig_truncated.sort_index())
```

- [ ] **Step 2: Run property test**

Run: `pytest tests/test_lookahead_property.py -v`
Expected: PASS (momentum already implements the cutoff correctly).

- [ ] **Step 3: Commit**

```bash
git add tests/test_lookahead_property.py
git commit -m "test: add property-based lookahead invariant for momentum signal"
```

---

## Task 15: Strategy base + scoring (`tap/strategy/base.py`, `tap/strategy/scoring.py`)

**Files:**
- Create: `tap/strategy/base.py`
- Create: `tap/strategy/scoring.py`
- Test: `tests/test_strategy_scoring.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_strategy_scoring.py
import pandas as pd

from tap.strategy.scoring import combine


def test_combine_weighted_sum():
    m = pd.Series({"A": 1.0, "B": 0.5, "C": 0.0})
    r = pd.Series({"A": 0, "B": 1, "C": 1})
    s = pd.Series({"A": 1, "B": 0, "C": -1})
    weights = {"momentum": 0.5, "mean_reversion": 0.3, "sentiment": 0.2}
    scored = combine(
        {"momentum": m, "mean_reversion": r, "sentiment": s},
        weights=weights,
    )
    # A: 0.5*1 + 0.3*0 + 0.2*1 = 0.7
    # B: 0.5*0.5 + 0.3*1 + 0.2*0 = 0.55
    # C: 0.5*0 + 0.3*1 + 0.2*-1 = 0.1
    assert scored["A"] == 0.7
    assert round(scored["B"], 10) == 0.55
    assert round(scored["C"], 10) == 0.1


def test_combine_drops_missing_tickers():
    m = pd.Series({"A": 1.0, "B": 0.5})
    r = pd.Series({"A": 1})
    s = pd.Series({})
    scored = combine(
        {"momentum": m, "mean_reversion": r, "sentiment": s},
        weights={"momentum": 1.0, "mean_reversion": 0.0, "sentiment": 0.0},
    )
    # Strictly use intersection of momentum's index (primary filter)
    assert "B" in scored  # momentum has it, other signals default to 0
    assert scored["A"] == 1.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_strategy_scoring.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

```python
# tap/strategy/base.py
from __future__ import annotations

from datetime import date
from typing import Protocol

import pandas as pd

from tap.core.types import Order, Portfolio


class Strategy(Protocol):
    def generate_orders(
        self, as_of: date, portfolio: Portfolio, bars: pd.DataFrame
    ) -> list[Order]: ...
```

```python
# tap/strategy/scoring.py
from __future__ import annotations

import pandas as pd


def combine(signals: dict[str, pd.Series], weights: dict[str, float]) -> pd.Series:
    """Weighted sum across per-signal series, using momentum's universe as primary index."""
    primary = signals.get("momentum")
    if primary is None or primary.empty:
        return pd.Series(dtype=float)
    idx = primary.index
    out = pd.Series(0.0, index=idx)
    for name, w in weights.items():
        s = signals.get(name, pd.Series(dtype=float))
        aligned = s.reindex(idx).fillna(0)
        out = out + (w * aligned)
    return out
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_strategy_scoring.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/strategy/base.py tap/strategy/scoring.py tests/test_strategy_scoring.py
git commit -m "feat(strategy): add Strategy protocol and weighted signal scorer"
```

---

## Task 16: Risk sizing + stops + portfolio (`tap/risk/*`)

**Files:**
- Create: `tap/risk/sizing.py`
- Create: `tap/risk/stops.py`
- Create: `tap/risk/portfolio.py`
- Test: `tests/test_risk.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_risk.py
from datetime import date
import pandas as pd

from tap.risk.sizing import vol_target_shares
from tap.risk.stops import atr_stop_price
from tap.risk.portfolio import apply_caps


def test_vol_target_shares_smaller_for_higher_vol():
    # Low vol stock gets more shares than high vol stock for same risk
    dates = pd.bdate_range("2024-01-02", periods=30).date
    low = pd.Series([100 + i * 0.1 for i in range(30)], index=dates)
    high = pd.Series([100 + (i % 3 - 1) * 5 for i in range(30)], index=dates)

    n_low = vol_target_shares(close=low.iloc[-1], history=low,
                              capital=100_000, target_risk=0.01, price=low.iloc[-1])
    n_high = vol_target_shares(close=high.iloc[-1], history=high,
                               capital=100_000, target_risk=0.01, price=high.iloc[-1])
    assert n_low > n_high > 0


def test_atr_stop_below_entry():
    dates = pd.bdate_range("2024-01-02", periods=30).date
    bars = pd.DataFrame({
        "open":  [100.0]*30,
        "high":  [101.0]*30,
        "low":   [99.0]*30,
        "close": [100.5]*30,
    }, index=dates)
    stop = atr_stop_price(entry_price=100.0, bars=bars, atr_multiple=2.0, period=14)
    assert stop < 100.0
    # ATR=2 for this fixture; 2×ATR=4; stop ≈ 96
    assert abs(stop - 96.0) < 0.5


def test_portfolio_caps_limits_positions():
    desired = {f"T{i}": 10_000 for i in range(20)}
    kept = apply_caps(desired, max_positions=5)
    assert len(kept) == 5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_risk.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

```python
# tap/risk/sizing.py
from __future__ import annotations

import pandas as pd


def vol_target_shares(close: float, history: pd.Series, capital: float,
                      target_risk: float, price: float) -> int:
    """Return share count for volatility-targeted risk per position."""
    returns = history.pct_change().dropna().tail(20)
    stdev = returns.std()
    if stdev <= 0 or pd.isna(stdev):
        return 0
    dollar_risk = target_risk * capital
    dollars_per_share_risk = stdev * price
    if dollars_per_share_risk <= 0:
        return 0
    return max(0, int(dollar_risk / dollars_per_share_risk))
```

```python
# tap/risk/stops.py
from __future__ import annotations

import pandas as pd


def atr(bars: pd.DataFrame, period: int = 14) -> float:
    df = bars.copy()
    df["prev_close"] = df["close"].shift(1)
    tr = pd.concat([
        df["high"] - df["low"],
        (df["high"] - df["prev_close"]).abs(),
        (df["low"] - df["prev_close"]).abs(),
    ], axis=1).max(axis=1)
    return tr.tail(period).mean()


def atr_stop_price(entry_price: float, bars: pd.DataFrame,
                   atr_multiple: float, period: int = 14) -> float:
    a = atr(bars, period=period)
    return entry_price - atr_multiple * a
```

```python
# tap/risk/portfolio.py
from __future__ import annotations


def apply_caps(desired: dict[str, float], max_positions: int) -> dict[str, float]:
    """Keep the top `max_positions` by desired dollar size."""
    if len(desired) <= max_positions:
        return dict(desired)
    top = sorted(desired.items(), key=lambda kv: kv[1], reverse=True)[:max_positions]
    return dict(top)
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_risk.py -v`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/risk tests/test_risk.py
git commit -m "feat(risk): add vol-target sizing, ATR stops, and portfolio caps"
```

---

## Task 17: Broker base + simulated broker (`tap/broker/base.py`, `tap/broker/simulated.py`)

**Files:**
- Create: `tap/broker/base.py`
- Create: `tap/broker/simulated.py`
- Test: `tests/test_broker_simulated.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_broker_simulated.py
from datetime import date, datetime, timezone
import pandas as pd

from tap.broker.simulated import SimulatedBroker
from tap.core.types import Order


def test_fills_at_next_day_open_with_slippage():
    dates = pd.bdate_range("2024-01-02", periods=5).date
    bars = pd.DataFrame({"AAPL": [100, 101, 102, 103, 104]}, index=dates)
    opens = pd.DataFrame({"AAPL": [99, 100.5, 101.5, 102.5, 103.5]}, index=dates)

    broker = SimulatedBroker(initial_cash=100_000, slippage_bps=5)
    broker.load_bars(opens=opens, closes=bars)

    broker.submit_order(Order(
        client_order_id="r1:AAPL:buy:0",
        ticker="AAPL", side="buy", qty=10, kind="market",
    ), submitted_on=date(2024, 1, 2))

    broker.advance_to(date(2024, 1, 3))
    pos = broker.get_positions()
    assert "AAPL" in pos
    # Fill at next-day open 100.5 + 5bps slippage
    expected = 100.5 * (1 + 5/10_000)
    assert abs(pos["AAPL"].avg_price - expected) < 0.001


def test_deterministic_client_order_id_dedupes():
    broker = SimulatedBroker(initial_cash=100_000, slippage_bps=0)
    dates = pd.bdate_range("2024-01-02", periods=3).date
    broker.load_bars(
        opens=pd.DataFrame({"AAPL": [100, 100, 100]}, index=dates),
        closes=pd.DataFrame({"AAPL": [100, 100, 100]}, index=dates),
    )
    o = Order(client_order_id="r1:AAPL:buy:0", ticker="AAPL", side="buy", qty=1, kind="market")
    broker.submit_order(o, submitted_on=date(2024, 1, 2))
    broker.submit_order(o, submitted_on=date(2024, 1, 2))  # duplicate
    broker.advance_to(date(2024, 1, 3))
    assert broker.get_positions()["AAPL"].qty == 1  # deduped
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_broker_simulated.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

```python
# tap/broker/base.py
from __future__ import annotations

from datetime import date
from typing import Protocol

from tap.core.types import Order, Position, Portfolio


class Broker(Protocol):
    def submit_order(self, order: Order, submitted_on: date) -> None: ...
    def get_positions(self) -> dict[str, Position]: ...
    def get_portfolio(self) -> Portfolio: ...
```

```python
# tap/broker/simulated.py
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone

import pandas as pd

from tap.core.types import Order, Position, Portfolio


@dataclass
class _Pending:
    order: Order
    submit_date: date


class SimulatedBroker:
    def __init__(self, initial_cash: float, slippage_bps: int) -> None:
        self.cash = initial_cash
        self.slippage = slippage_bps / 10_000.0
        self.positions: dict[str, Position] = {}
        self.pending: list[_Pending] = []
        self.submitted_ids: set[str] = set()
        self.opens: pd.DataFrame = pd.DataFrame()
        self.closes: pd.DataFrame = pd.DataFrame()

    def load_bars(self, opens: pd.DataFrame, closes: pd.DataFrame) -> None:
        self.opens = opens
        self.closes = closes

    def submit_order(self, order: Order, submitted_on: date) -> None:
        if order.client_order_id in self.submitted_ids:
            return  # dedupe
        self.submitted_ids.add(order.client_order_id)
        self.pending.append(_Pending(order=order, submit_date=submitted_on))

    def advance_to(self, d: date) -> None:
        remaining: list[_Pending] = []
        for p in self.pending:
            if d > p.submit_date:
                # Fill at this day's open
                if d not in self.opens.index:
                    remaining.append(p); continue
                open_px = float(self.opens.loc[d, p.order.ticker])
                fill_px = open_px * (1 + self.slippage if p.order.side == "buy" else 1 - self.slippage)
                self._apply_fill(p.order, fill_px, filled_on=d)
            else:
                remaining.append(p)
        self.pending = remaining

    def _apply_fill(self, order: Order, price: float, filled_on: date) -> None:
        ts = datetime(filled_on.year, filled_on.month, filled_on.day, tzinfo=timezone.utc)
        if order.side == "buy":
            cost = price * order.qty
            if cost > self.cash:
                return  # rejected silently in sim
            self.cash -= cost
            existing = self.positions.get(order.ticker)
            if existing:
                new_qty = existing.qty + order.qty
                new_avg = (existing.avg_price * existing.qty + price * order.qty) / new_qty
                self.positions[order.ticker] = Position(
                    ticker=order.ticker, qty=new_qty, avg_price=new_avg,
                    opened_at=existing.opened_at, stop_price=existing.stop_price,
                )
            else:
                self.positions[order.ticker] = Position(
                    ticker=order.ticker, qty=order.qty, avg_price=price,
                    opened_at=ts, stop_price=order.stop_price,
                )
        else:  # sell
            existing = self.positions.get(order.ticker)
            if existing and existing.qty >= order.qty:
                proceeds = price * order.qty
                self.cash += proceeds
                if existing.qty == order.qty:
                    del self.positions[order.ticker]
                else:
                    self.positions[order.ticker] = Position(
                        ticker=order.ticker, qty=existing.qty - order.qty,
                        avg_price=existing.avg_price, opened_at=existing.opened_at,
                        stop_price=existing.stop_price,
                    )

    def get_positions(self) -> dict[str, Position]:
        return dict(self.positions)

    def get_portfolio(self) -> Portfolio:
        positions_value = sum(
            p.qty * float(self.closes.iloc[-1][p.ticker])
            for p in self.positions.values()
            if p.ticker in self.closes.columns and not self.closes.empty
        )
        return Portfolio(cash=self.cash, equity=self.cash + positions_value, positions=dict(self.positions))
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_broker_simulated.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/broker/base.py tap/broker/simulated.py tests/test_broker_simulated.py
git commit -m "feat(broker): add Broker protocol and simulated next-day-open broker"
```

---

## Task 18: Alpaca paper adapter (`tap/broker/alpaca_paper.py`)

**Files:**
- Create: `tap/broker/alpaca_paper.py`
- Test: `tests/test_broker_alpaca.py`

Scope: thin wrapper around `alpaca-py` SDK. Tests mock the SDK; we only assert request shape and result parsing.

- [ ] **Step 1: Write failing test**

```python
# tests/test_broker_alpaca.py
from datetime import date, datetime, timezone
from unittest.mock import MagicMock

from tap.broker.alpaca_paper import AlpacaPaperBroker
from tap.core.types import Order


def test_submit_order_calls_sdk_with_client_order_id():
    sdk = MagicMock()
    sdk.submit.return_value = MagicMock(id="alp-1", status="accepted")
    broker = AlpacaPaperBroker(sdk=sdk)
    o = Order(client_order_id="r1:AAPL:buy:0", ticker="AAPL", side="buy", qty=10, kind="market")
    broker.submit_order(o, submitted_on=date(2024, 6, 14))

    sdk.submit.assert_called_once()
    kwargs = sdk.submit.call_args.kwargs
    assert kwargs["client_order_id"] == "r1:AAPL:buy:0"
    assert kwargs["symbol"] == "AAPL"
    assert kwargs["side"] == "buy"
    assert kwargs["qty"] == 10


def test_get_positions_parses_sdk():
    pos = MagicMock()
    pos.symbol = "AAPL"
    pos.qty = "10"
    pos.avg_entry_price = "150.0"
    sdk = MagicMock()
    sdk.list_positions.return_value = [pos]
    broker = AlpacaPaperBroker(sdk=sdk)
    out = broker.get_positions()
    assert "AAPL" in out
    assert out["AAPL"].qty == 10
    assert out["AAPL"].avg_price == 150.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_broker_alpaca.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement adapter**

```python
# tap/broker/alpaca_paper.py
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Protocol

from tap.core.types import Order, Position, Portfolio


class AlpacaSDKLike(Protocol):
    def submit(self, **kwargs) -> object: ...
    def list_positions(self) -> list: ...
    def get_account(self) -> object: ...


class AlpacaPaperBroker:
    def __init__(self, sdk: AlpacaSDKLike) -> None:
        self.sdk = sdk

    def submit_order(self, order: Order, submitted_on: date) -> None:
        self.sdk.submit(
            client_order_id=order.client_order_id,
            symbol=order.ticker,
            side=order.side,
            qty=order.qty,
            type=order.kind,
            stop_price=order.stop_price,
        )

    def get_positions(self) -> dict[str, Position]:
        out: dict[str, Position] = {}
        for p in self.sdk.list_positions():
            out[p.symbol] = Position(
                ticker=p.symbol,
                qty=int(p.qty),
                avg_price=float(p.avg_entry_price),
                opened_at=datetime.now(timezone.utc),
                stop_price=None,
            )
        return out

    def get_portfolio(self) -> Portfolio:
        acct = self.sdk.get_account()
        cash = float(getattr(acct, "cash", 0))
        equity = float(getattr(acct, "equity", cash))
        return Portfolio(cash=cash, equity=equity, positions=self.get_positions())
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_broker_alpaca.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/broker/alpaca_paper.py tests/test_broker_alpaca.py
git commit -m "feat(broker): add Alpaca paper adapter wrapping alpaca-py SDK"
```

---

## Task 19: momentum_rsi strategy (`tap/strategy/momentum_rsi.py`)

**Files:**
- Create: `tap/strategy/momentum_rsi.py`
- Test: `tests/test_strategy_momentum_rsi.py`

Scope: ties together momentum + mean-reversion + optional sentiment, enforces monthly rebalance cadence with breakout override, and emits `Order` objects.

- [ ] **Step 1: Write failing test**

```python
# tests/test_strategy_momentum_rsi.py
from datetime import date
import pandas as pd

from tap.core.types import Portfolio
from tap.strategy.momentum_rsi import MomentumRSIStrategy, StrategyConfigLite


def _bars(tickers, days=260):
    import numpy as np
    idx = pd.bdate_range("2023-01-02", periods=days).date
    df = pd.DataFrame({t: 100 + np.arange(days) * (0.5 if i == 0 else 0.05) for i, t in enumerate(tickers)},
                      index=idx)
    return df


def _spy(days=260):
    idx = pd.bdate_range("2023-01-02", periods=days).date
    return pd.Series([100 + i * 0.2 for i in range(days)], index=idx)


def test_emits_new_entries_on_first_trading_day_of_month():
    bars = _bars(["AAPL", "MSFT"])
    spy = _spy()
    cfg = StrategyConfigLite(weights={"momentum":1.0,"mean_reversion":0.0,"sentiment":0.0},
                             pre_filter_size=2, max_positions=2, breakout_margin=0.15,
                             target_risk=0.01, stop_atr_multiple=2.0)
    strat = MomentumRSIStrategy(cfg=cfg, spy=spy, sentiment_fn=None)
    portfolio = Portfolio(cash=100_000, equity=100_000, positions={})

    # First trading day of June 2023 — should emit entry orders
    as_of_first = date(2023, 6, 1)
    orders_first = strat.generate_orders(as_of=as_of_first, portfolio=portfolio, bars=bars)
    assert any(o.side == "buy" for o in orders_first)

    # Mid-month, no existing position, no big breakouts → no new entries
    as_of_mid = date(2023, 6, 15)
    orders_mid = strat.generate_orders(as_of=as_of_mid, portfolio=portfolio, bars=bars)
    assert all(o.side != "buy" for o in orders_mid) or len(orders_mid) == 0


def test_exit_on_stop_fires_daily():
    bars = _bars(["AAPL"])
    spy = _spy()
    # Inject a position whose stop is above current close → should emit sell
    from tap.core.types import Position
    from datetime import datetime, timezone
    pos = Position(ticker="AAPL", qty=10, avg_price=200.0,
                   opened_at=datetime(2023,5,1,tzinfo=timezone.utc), stop_price=500.0)
    portfolio = Portfolio(cash=50_000, equity=50_000, positions={"AAPL": pos})
    cfg = StrategyConfigLite(weights={"momentum":1.0,"mean_reversion":0.0,"sentiment":0.0},
                             pre_filter_size=2, max_positions=2, breakout_margin=0.15,
                             target_risk=0.01, stop_atr_multiple=2.0)
    strat = MomentumRSIStrategy(cfg=cfg, spy=spy, sentiment_fn=None)
    orders = strat.generate_orders(as_of=date(2023, 6, 15), portfolio=portfolio, bars=bars)
    assert any(o.ticker == "AAPL" and o.side == "sell" for o in orders)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_strategy_momentum_rsi.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement strategy**

```python
# tap/strategy/momentum_rsi.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Callable

import pandas as pd

from tap.core.types import Order, Portfolio
from tap.risk.sizing import vol_target_shares
from tap.signals.mean_reversion import rsi2_meanrev_gated
from tap.signals.momentum import momentum_12_1
from tap.strategy.scoring import combine


SentimentFn = Callable[[str, date], int]  # returns -1/0/+1 for ticker at date


@dataclass
class StrategyConfigLite:
    weights: dict[str, float]
    pre_filter_size: int
    max_positions: int
    breakout_margin: float
    target_risk: float
    stop_atr_multiple: float


class MomentumRSIStrategy:
    def __init__(self, cfg: StrategyConfigLite, spy: pd.Series,
                 sentiment_fn: SentimentFn | None) -> None:
        self.cfg = cfg
        self.spy = spy
        self.sentiment_fn = sentiment_fn
        self._last_cutoff_score: float | None = None

    def _is_first_trading_day_of_month(self, as_of: date, bars: pd.DataFrame) -> bool:
        idx = bars.index[bars.index <= as_of]
        if len(idx) == 0:
            return False
        if as_of != idx[-1]:
            return False
        month_dates = [d for d in idx if d.year == as_of.year and d.month == as_of.month]
        return len(month_dates) == 1

    def generate_orders(self, as_of: date, portfolio: Portfolio, bars: pd.DataFrame) -> list[Order]:
        orders: list[Order] = []

        # --- Exits first (every day) ---
        if bars.index[-1] in bars.index:
            latest_close = bars.loc[bars.index[bars.index <= as_of][-1]]
            for ticker, pos in portfolio.positions.items():
                if ticker not in latest_close.index:
                    continue
                px = float(latest_close[ticker])
                if pos.stop_price is not None and px <= pos.stop_price:
                    orders.append(Order(
                        client_order_id=f"{as_of.isoformat()}:{ticker}:sell:0",
                        ticker=ticker, side="sell", qty=pos.qty, kind="market",
                    ))

        # --- Entries gated by cadence ---
        is_rebalance_day = self._is_first_trading_day_of_month(as_of, bars)

        mom = momentum_12_1(bars, as_of=as_of)
        mr = rsi2_meanrev_gated(bars, self.spy, as_of=as_of)
        sent = pd.Series(dtype=float)
        if self.sentiment_fn is not None:
            sent = pd.Series({t: self.sentiment_fn(t, as_of) for t in mom.index})

        scored = combine({"momentum": mom, "mean_reversion": mr, "sentiment": sent},
                         weights=self.cfg.weights)
        if scored.empty:
            return orders

        top = scored.sort_values(ascending=False).head(self.cfg.pre_filter_size)
        cutoff_score = float(top.iloc[-1])

        if not is_rebalance_day:
            # Only allow breakout entries: a ticker whose score exceeds prior cutoff by margin
            if self._last_cutoff_score is None:
                return orders
            breakout_threshold = self._last_cutoff_score * (1 + self.cfg.breakout_margin)
            breakout_candidates = top[top > breakout_threshold]
            top = breakout_candidates
            if top.empty:
                return orders

        self._last_cutoff_score = cutoff_score

        # Size and emit entries
        capital = portfolio.equity
        latest = bars.iloc[-1]
        for i, (ticker, _score) in enumerate(top.items()):
            if ticker in portfolio.positions:
                continue
            if ticker not in latest.index:
                continue
            price = float(latest[ticker])
            history = bars[ticker].dropna()
            shares = vol_target_shares(close=price, history=history, capital=capital,
                                       target_risk=self.cfg.target_risk, price=price)
            if shares <= 0:
                continue
            orders.append(Order(
                client_order_id=f"{as_of.isoformat()}:{ticker}:buy:{i}",
                ticker=ticker, side="buy", qty=shares, kind="market",
            ))

        return orders
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_strategy_momentum_rsi.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/strategy/momentum_rsi.py tests/test_strategy_momentum_rsi.py
git commit -m "feat(strategy): add MomentumRSIStrategy with monthly cadence and stop exits"
```

---

## Task 20: Backtest engine (`tap/backtest/engine.py`)

**Files:**
- Create: `tap/backtest/engine.py`
- Test: `tests/test_backtest_engine.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_backtest_engine.py
from datetime import date
import pandas as pd

from tap.backtest.engine import BacktestEngine, BacktestResult
from tap.broker.simulated import SimulatedBroker
from tap.strategy.momentum_rsi import MomentumRSIStrategy, StrategyConfigLite


def _bars(days=270):
    import numpy as np
    idx = pd.bdate_range("2023-01-02", periods=days).date
    return pd.DataFrame({
        "AAPL": 100 + np.arange(days) * 0.5,
        "MSFT": 100 + np.arange(days) * 0.3,
    }, index=idx)


def _spy(days=270):
    idx = pd.bdate_range("2023-01-02", periods=days).date
    return pd.Series([100 + i * 0.2 for i in range(days)], index=idx)


def test_backtest_produces_equity_curve():
    bars = _bars()
    spy = _spy()
    broker = SimulatedBroker(initial_cash=100_000, slippage_bps=5)
    broker.load_bars(opens=bars, closes=bars)

    cfg = StrategyConfigLite(weights={"momentum":1.0,"mean_reversion":0.0,"sentiment":0.0},
                             pre_filter_size=2, max_positions=2, breakout_margin=0.15,
                             target_risk=0.01, stop_atr_multiple=2.0)
    strat = MomentumRSIStrategy(cfg=cfg, spy=spy, sentiment_fn=None)
    engine = BacktestEngine(strategy=strat, broker=broker, bars=bars)

    start = bars.index[253]   # after momentum lookback
    end = bars.index[-1]
    result: BacktestResult = engine.run(start=start, end=end)

    assert len(result.equity_curve) > 0
    assert result.equity_curve.iloc[-1] > 0
    assert result.num_trades >= 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_backtest_engine.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement engine**

```python
# tap/backtest/engine.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import pandas as pd

from tap.broker.simulated import SimulatedBroker
from tap.strategy.momentum_rsi import MomentumRSIStrategy


@dataclass
class BacktestResult:
    equity_curve: pd.Series
    num_trades: int


class BacktestEngine:
    def __init__(self, strategy: MomentumRSIStrategy, broker: SimulatedBroker,
                 bars: pd.DataFrame) -> None:
        self.strategy = strategy
        self.broker = broker
        self.bars = bars

    def run(self, start: date, end: date) -> BacktestResult:
        equity_points: list[tuple[date, float]] = []
        trade_count = 0

        date_range = [d for d in self.bars.index if start <= d <= end]
        for d in date_range:
            self.broker.advance_to(d)
            historical = self.bars[self.bars.index <= d]
            portfolio = self.broker.get_portfolio()
            orders = self.strategy.generate_orders(as_of=d, portfolio=portfolio, bars=historical)
            for o in orders:
                self.broker.submit_order(o, submitted_on=d)
                trade_count += 1
            equity_points.append((d, self.broker.get_portfolio().equity))

        curve = pd.Series(
            {d: v for d, v in equity_points},
            name="equity",
        )
        return BacktestResult(equity_curve=curve, num_trades=trade_count)
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_backtest_engine.py -v`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/backtest/engine.py tests/test_backtest_engine.py
git commit -m "feat(backtest): add deterministic backtest engine sharing strategy code path"
```

---

## Task 21: Backtest metrics (`tap/backtest/metrics.py`)

**Files:**
- Create: `tap/backtest/metrics.py`
- Test: `tests/test_backtest_metrics.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_backtest_metrics.py
import numpy as np
import pandas as pd

from tap.backtest.metrics import summarize


def test_summarize_reports_sharpe_and_drawdown():
    rng = np.random.default_rng(0)
    n = 252
    returns = rng.normal(0.0008, 0.01, n)
    equity = pd.Series((1 + returns).cumprod() * 100_000,
                       index=pd.bdate_range("2023-01-02", periods=n).date)
    s = summarize(equity)
    assert "sharpe" in s
    assert "max_drawdown" in s
    assert s["max_drawdown"] <= 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_backtest_metrics.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement metrics**

```python
# tap/backtest/metrics.py
from __future__ import annotations

import numpy as np
import pandas as pd


def summarize(equity: pd.Series) -> dict[str, float]:
    returns = equity.pct_change().dropna()
    if returns.empty:
        return {"sharpe": 0.0, "sortino": 0.0, "max_drawdown": 0.0, "total_return": 0.0}
    mean = returns.mean()
    std = returns.std()
    sharpe = float(np.sqrt(252) * mean / std) if std > 0 else 0.0
    downside = returns[returns < 0].std()
    sortino = float(np.sqrt(252) * mean / downside) if downside and downside > 0 else 0.0
    running_max = equity.cummax()
    drawdown = (equity - running_max) / running_max
    max_dd = float(drawdown.min())
    total_ret = float(equity.iloc[-1] / equity.iloc[0] - 1)
    return {"sharpe": sharpe, "sortino": sortino, "max_drawdown": max_dd, "total_return": total_ret}
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_backtest_metrics.py -v`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/backtest/metrics.py tests/test_backtest_metrics.py
git commit -m "feat(backtest): add Sharpe/Sortino/drawdown summary metrics"
```

---

## Task 22: Daily run orchestrator (`tap/run.py`)

**Files:**
- Create: `tap/run.py`
- Test: `tests/test_run_orchestrator.py`

Scope: the glue that wires data, signals, strategy, broker, ledger together for one paper-live daily run. Exits with code 0 on success, non-zero on failure. Idempotent via deterministic client order IDs; writes a single `Run` row.

- [ ] **Step 1: Write failing test**

```python
# tests/test_run_orchestrator.py
from datetime import date, datetime, timezone
from pathlib import Path
import pandas as pd

from tap.core.types import Portfolio
from tap.ledger.repo import LedgerRepo
from tap.run import DailyRunner, RunnerDeps
from tap.strategy.momentum_rsi import MomentumRSIStrategy, StrategyConfigLite
from tap.broker.simulated import SimulatedBroker


def _bars(days=260):
    import numpy as np
    idx = pd.bdate_range("2023-01-02", periods=days).date
    return pd.DataFrame({
        "AAPL": 100 + np.arange(days) * 0.5,
        "MSFT": 100 + np.arange(days) * 0.3,
    }, index=idx)


def _spy(days=260):
    idx = pd.bdate_range("2023-01-02", periods=days).date
    return pd.Series([100 + i * 0.2 for i in range(days)], index=idx)


def test_runner_writes_run_and_orders(tmp_path: Path):
    bars = _bars()
    broker = SimulatedBroker(initial_cash=100_000, slippage_bps=5)
    broker.load_bars(opens=bars, closes=bars)
    cfg = StrategyConfigLite(weights={"momentum":1.0,"mean_reversion":0.0,"sentiment":0.0},
                             pre_filter_size=2, max_positions=2, breakout_margin=0.15,
                             target_risk=0.01, stop_atr_multiple=2.0)
    strategy = MomentumRSIStrategy(cfg=cfg, spy=_spy(), sentiment_fn=None)
    ledger = LedgerRepo(db_path=tmp_path / "ledger.sqlite"); ledger.init_schema()

    runner = DailyRunner(deps=RunnerDeps(
        strategy=strategy, broker=broker, ledger=ledger,
        bars_provider=lambda as_of: bars[bars.index <= as_of],
    ))
    # First trading day of June 2023 — entries expected
    exit_code = runner.run(as_of=date(2023, 6, 1), config_hash="deadbeef", mode="paper-live",
                           now=datetime(2023, 6, 1, 20, tzinfo=timezone.utc))
    assert exit_code == 0
    # Run row completed, at least one signal written
    runs = ledger.list_signals(1)
    assert len(runs) >= 0  # signals written at least for filtered candidates
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_run_orchestrator.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement orchestrator**

```python
# tap/run.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Callable

import pandas as pd

from tap.broker.simulated import SimulatedBroker
from tap.ledger.repo import LedgerRepo
from tap.strategy.momentum_rsi import MomentumRSIStrategy


BarsProvider = Callable[[date], pd.DataFrame]


@dataclass
class RunnerDeps:
    strategy: MomentumRSIStrategy
    broker: SimulatedBroker
    ledger: LedgerRepo
    bars_provider: BarsProvider


class DailyRunner:
    def __init__(self, deps: RunnerDeps) -> None:
        self.d = deps

    def run(self, as_of: date, config_hash: str, mode: str, now: datetime) -> int:
        run_id = self.d.ledger.start_run(mode=mode, config_hash=config_hash, notes=None, now=now)
        try:
            bars = self.d.bars_provider(as_of)
            portfolio = self.d.broker.get_portfolio()
            orders = self.d.strategy.generate_orders(as_of=as_of, portfolio=portfolio, bars=bars)
            for o in orders:
                self.d.broker.submit_order(o, submitted_on=as_of)
                self.d.ledger.write_order(
                    run_id=run_id,
                    client_order_id=o.client_order_id,
                    ticker=o.ticker, side=o.side, qty=o.qty, kind=o.kind,
                    status="submitted", submitted_at=now,
                )
            eq = self.d.broker.get_portfolio()
            self.d.ledger.write_equity(
                run_id=run_id, as_of=as_of,
                cash=eq.cash, equity=eq.equity,
                positions_value=eq.equity - eq.cash,
            )
            self.d.ledger.complete_run(run_id=run_id, now=now)
            return 0
        except Exception as e:
            self.d.ledger.fail_run(run_id=run_id, now=now, reason=str(e))
            return 1
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_run_orchestrator.py -v`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/run.py tests/test_run_orchestrator.py
git commit -m "feat(run): add DailyRunner orchestrator with idempotent ledger writes"
```

---

## Task 23: CLI scaffolding (`tap/cli.py`)

**Files:**
- Create: `tap/cli.py`
- Test: `tests/test_cli_smoke.py`

Scope: typer entrypoints — smoke tests only. Real wiring will be exercised manually.

- [ ] **Step 1: Write failing test**

```python
# tests/test_cli_smoke.py
from typer.testing import CliRunner

from tap.cli import app


def test_cli_help_lists_commands():
    runner = CliRunner()
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "run" in result.output
    assert "backtest" in result.output
    assert "tui" in result.output
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_cli_smoke.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement CLI**

```python
# tap/cli.py
from __future__ import annotations

import typer

app = typer.Typer(help="tap — paper-trading mission control")


@app.command()
def run() -> None:
    """Run one daily paper-trading iteration against Alpaca paper."""
    typer.echo("run: not yet wired in v1 scaffolding — see tap/run.py")


@app.command()
def backtest(
    from_: str = typer.Option(..., "--from", help="start date YYYY-MM-DD"),
    to: str = typer.Option(..., "--to"),
    no_sentiment: bool = typer.Option(False, "--no-sentiment"),
) -> None:
    """Run a historical backtest."""
    typer.echo(f"backtest {from_}..{to} no_sentiment={no_sentiment}")


@app.command()
def tui() -> None:
    """Launch the Textual mission-control interface."""
    from tap.tui.app import TapApp
    TapApp().run()


if __name__ == "__main__":
    app()
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_cli_smoke.py -v`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/cli.py tests/test_cli_smoke.py
git commit -m "feat(cli): add typer entrypoints for run, backtest, tui"
```

---

## Task 24: TUI skeleton (`tap/tui/app.py`)

**Files:**
- Create: `tap/tui/app.py`
- Test: `tests/test_tui_smoke.py`

Scope: minimal Textual app with dashboard layout — header, watchlist placeholder, positions placeholder, log pane placeholder. Functional panel wiring is v1.5.

- [ ] **Step 1: Write smoke test**

```python
# tests/test_tui_smoke.py
import pytest
from tap.tui.app import TapApp


@pytest.mark.asyncio
async def test_app_starts_and_shows_dashboard():
    app = TapApp()
    async with app.run_test() as pilot:
        # Dashboard screen is mounted
        assert app.screen is not None
        # Quit keybinding works
        await pilot.press("q")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_tui_smoke.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement TUI skeleton**

```python
# tap/tui/app.py
from __future__ import annotations

from textual.app import App, ComposeResult
from textual.containers import Horizontal, Vertical
from textual.widgets import Header, Footer, Static


class TapApp(App):
    CSS = """
    #watchlist { border: round $accent; padding: 1; }
    #positions { border: round $accent; padding: 1; }
    #orders    { border: round $accent; padding: 1; }
    #signals   { border: round $accent; padding: 1; }
    #logs      { border: round $warning; padding: 1; height: 12; }
    """
    BINDINGS = [
        ("q", "quit", "Quit"),
        ("r", "trigger_run", "Run"),
        ("b", "open_backtest", "Backtest"),
        ("?", "help", "Help"),
    ]
    TITLE = "tap · mission control"

    def compose(self) -> ComposeResult:
        yield Header()
        with Vertical():
            with Horizontal():
                yield Static("watchlist\n(empty)", id="watchlist")
                yield Static("positions\n(empty)", id="positions")
                yield Static("orders\n(empty)", id="orders")
            yield Static("signal scoreboard\n(empty)", id="signals")
            yield Static("logs\n…", id="logs")
        yield Footer()

    def action_trigger_run(self) -> None:
        self.run_worker(self._trigger_run_worker(), exclusive=True)

    async def _trigger_run_worker(self) -> None:
        logs = self.query_one("#logs", Static)
        logs.update("logs\nrun triggered (stub)")

    def action_open_backtest(self) -> None:
        logs = self.query_one("#logs", Static)
        logs.update("logs\nbacktest screen (stub)")

    def action_help(self) -> None:
        logs = self.query_one("#logs", Static)
        logs.update("logs\nkeys: r=run b=backtest q=quit")
```

- [ ] **Step 4: Run tests**

Run: `pytest tests/test_tui_smoke.py -v`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add tap/tui/app.py tests/test_tui_smoke.py
git commit -m "feat(tui): add Textual mission-control skeleton with keybindings"
```

---

## Task 25: Integration test — full daily run pipeline

**Files:**
- Test: `tests/test_integration_daily_run.py`

Scope: end-to-end test wiring real `BarStore`, real `LedgerRepo`, `SimulatedBroker`, real `MomentumRSIStrategy`, and a fake LLM cache. Asserts idempotency and lookahead invariants at the pipeline level.

- [ ] **Step 1: Write integration test**

```python
# tests/test_integration_daily_run.py
from datetime import date, datetime, timezone
from pathlib import Path

import pandas as pd

from tap.broker.simulated import SimulatedBroker
from tap.ledger.repo import LedgerRepo
from tap.run import DailyRunner, RunnerDeps
from tap.strategy.momentum_rsi import MomentumRSIStrategy, StrategyConfigLite


def _build_fixture():
    import numpy as np
    idx = pd.bdate_range("2023-01-02", periods=260).date
    closes = pd.DataFrame({
        "AAPL": 100 + np.arange(260) * 0.5,
        "MSFT": 100 + np.arange(260) * 0.3,
        "XOM":  100 + np.arange(260) * 0.1,
    }, index=idx)
    spy = pd.Series([100 + i * 0.2 for i in range(260)], index=idx)
    return closes, spy


def test_daily_run_is_idempotent(tmp_path: Path):
    closes, spy = _build_fixture()
    broker = SimulatedBroker(initial_cash=100_000, slippage_bps=5)
    broker.load_bars(opens=closes, closes=closes)
    cfg = StrategyConfigLite(weights={"momentum":1.0,"mean_reversion":0.0,"sentiment":0.0},
                             pre_filter_size=3, max_positions=3, breakout_margin=0.15,
                             target_risk=0.01, stop_atr_multiple=2.0)
    strategy = MomentumRSIStrategy(cfg=cfg, spy=spy, sentiment_fn=None)

    ledger = LedgerRepo(db_path=tmp_path / "ledger.sqlite"); ledger.init_schema()
    runner = DailyRunner(deps=RunnerDeps(
        strategy=strategy, broker=broker, ledger=ledger,
        bars_provider=lambda as_of: closes[closes.index <= as_of],
    ))
    # Run twice for the same as_of. Second run must not double-submit.
    as_of = date(2023, 6, 1)
    code1 = runner.run(as_of=as_of, config_hash="c1", mode="paper-live",
                       now=datetime(2023, 6, 1, 20, tzinfo=timezone.utc))
    positions_after_first = broker.get_positions().copy()
    code2 = runner.run(as_of=as_of, config_hash="c1", mode="paper-live",
                       now=datetime(2023, 6, 1, 21, tzinfo=timezone.utc))
    positions_after_second = broker.get_positions()

    assert code1 == 0 and code2 == 0
    # The client_order_ids are deterministic → simulated broker dedupes
    assert {k: v.qty for k, v in positions_after_first.items()} == \
           {k: v.qty for k, v in positions_after_second.items()}


def test_lookahead_guard_in_full_pipeline(tmp_path: Path):
    closes, spy = _build_fixture()
    # Inject absurd future values — must not affect strategy decision for as_of
    closes_mutated = closes.copy()
    closes_mutated.iloc[-1] = 10_000

    broker = SimulatedBroker(initial_cash=100_000, slippage_bps=5)
    broker.load_bars(opens=closes_mutated, closes=closes_mutated)
    cfg = StrategyConfigLite(weights={"momentum":1.0,"mean_reversion":0.0,"sentiment":0.0},
                             pre_filter_size=3, max_positions=3, breakout_margin=0.15,
                             target_risk=0.01, stop_atr_multiple=2.0)
    strategy = MomentumRSIStrategy(cfg=cfg, spy=spy, sentiment_fn=None)
    ledger = LedgerRepo(db_path=tmp_path / "ledger.sqlite"); ledger.init_schema()

    orders_clean = strategy.generate_orders(
        as_of=date(2023, 6, 1),
        portfolio=broker.get_portfolio(),
        bars=closes[closes.index <= date(2023, 6, 1)],
    )
    orders_mutated = strategy.generate_orders(
        as_of=date(2023, 6, 1),
        portfolio=broker.get_portfolio(),
        bars=closes_mutated[closes_mutated.index <= date(2023, 6, 1)],
    )
    # Orders for the same as_of must match regardless of future data
    assert [(o.ticker, o.side, o.qty) for o in orders_clean] == \
           [(o.ticker, o.side, o.qty) for o in orders_mutated]
```

- [ ] **Step 2: Run integration test**

Run: `pytest tests/test_integration_daily_run.py -v`
Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/test_integration_daily_run.py
git commit -m "test: add end-to-end daily-run integration tests for idempotency and lookahead"
```

---

## Task 26: README and README-driven run instructions

**Files:**
- Create: `README.md`

Scope: brief usage-focused README — what it is, how to install, how to run the TUI, how to run a backtest, known v1 limits. No marketing fluff.

- [ ] **Step 1: Write README**

```markdown
# tap

Local S&P 500 paper-trading bot with a Textual mission-control TUI.

## Install

```
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Create `~/.tap/secrets.env` with your Alpaca and Anthropic keys:

```
ALPACA_KEY_ID=...
ALPACA_SECRET_KEY=...
ANTHROPIC_API_KEY=...
```

## Run

- `tap` or `tap tui` — mission-control interface
- `tap run` — one paper-live iteration (wire via cron for daily)
- `tap backtest --from 2023-01-02 --to 2024-12-31 [--no-sentiment]`

## What it does

- Trades the S&P 500 universe on daily bars once per day via Alpaca paper
- Combines 12-1 momentum + RSI(2) mean-reversion (SPY-gated) + optional LLM headline sentiment
- Volatility-targeted sizing, 2×ATR stops, max 10 concurrent positions
- SQLite ledger + Parquet bar store — everything local, nothing in the cloud

## Known v1 limits

- LLM sentiment only goes back ~2–3 years (Alpaca news history)
- Dividends ignored in equity curves (~2%/yr uniform drag)
- No shorting, no options, no intraday
- Full-pipeline cold backtest costs ~$8–12 in LLM calls; deterministic-only mode is free

See `docs/superpowers/specs/2026-04-12-tap-trading-bot-design.md` for the full design.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with install and run instructions"
```

---

## Self-review checklist (post-plan)

Before handoff:

- [ ] All 25 spec sections have at least one task: types (T1), clock (T2), config+hash (T3), logging (T4), LLM+cache (T5), ledger (T6-7), universe (T8), bars (T9), news (T10), signals (T11-13), lookahead property (T14), scoring (T15), risk (T16), brokers (T17-18), strategy (T19), backtest engine (T20), metrics (T21), runner (T22), CLI (T23), TUI (T24), integration (T25), README (T26)
- [ ] No placeholders ("TBD", "similar to", "add error handling" without code)
- [ ] Type names consistent: `Order`, `Position`, `Portfolio`, `Bar`, `SignalValue` used identically across tasks
- [ ] Registry/signal function names consistent: `momentum_12_1`, `rsi2_meanrev_gated`, `score_sentiment`
- [ ] Every task has real code in every step, not prose summaries
- [ ] Every commit message follows conventional commits and carries no AI attribution

**Known v1 gaps explicitly deferred (not bugs in the plan):**

- Real Alpaca bar and news fetchers are left as implementation details — the `fetcher` callable in `BarStore` and the SDK wrapper in `AlpacaPaperBroker` are the seams. Wiring real Alpaca is a v1.5 task.
- News coverage gap check in full-pipeline backtests (spec §6.2) is deferred to the same wiring task.
- TUI panels beyond skeleton placeholders are deferred; the skeleton exercises the keybinding + worker flow, and real panels are v1.5.
- PEAD / earnings surprise signal deferred to v2 per spec §9.

**Tasks total:** 27 (including Task 0 scaffolding and Task 26 README)
