let cash = 10000;
let startingCash = 10000;
let selected = "ZEUS3";
let mode = "BUY";
let trades = [];
let priceHistory = {};
let animationTimer = null;
let countdownTimer = null;
let openTrade = null;

const payoutRate = 0.87;

const stocks = {
  ZEUS3: { name: "Zeus Holding ON", price: 84.72, open: 84.72, volatility: 0.85 },
  ATLN4: { name: "Atlas Energia PN", price: 31.46, open: 31.46, volatility: 0.55 },
  NEXA3: { name: "Nexa Tecnologia ON", price: 52.19, open: 52.19, volatility: 0.75 },
  BRAV4: { name: "Bravus Bank PN", price: 18.93, open: 18.93, volatility: 0.42 },
  KOCH3: { name: "Kochi Entertainment ON", price: 11.82, open: 11.82, volatility: 0.38 }
};

Object.keys(stocks).forEach(symbol => {
  priceHistory[symbol] = Array.from({ length: 42 }, (_, i) => {
    const stock = stocks[symbol];
    return stock.price + Math.sin(i / 3) * stock.volatility * 2 + (Math.random() - 0.5) * stock.volatility;
  });
});

function brl(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function stockChange(symbol) {
  const s = stocks[symbol];
  return ((s.price - s.open) / s.open) * 100;
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  updateUI();
}

function renderStocks() {
  const box = document.getElementById("stocks");
  box.innerHTML = "";

  Object.entries(stocks).forEach(([symbol, stock]) => {
    const change = stockChange(symbol);
    const item = document.createElement("div");
    item.className = "stock-item" + (symbol === selected ? " selected" : "");
    item.onclick = () => {
      if (openTrade) {
        toast("Aguarde a operação atual finalizar.");
        return;
      }
      selectStock(symbol);
    };

    item.innerHTML = `
      <strong>${symbol}</strong>
      <small>${stock.name}</small>
      <div class="stock-row">
        <span>${brl(stock.price)}</span>
        <span class="${change >= 0 ? "positive" : "negative"}">
          ${change >= 0 ? "+" : ""}${change.toFixed(2)}%
        </span>
      </div>
    `;

    box.appendChild(item);
  });
}

function selectStock(symbol) {
  selected = symbol;
  renderStocks();
  updateSelectedAsset();
  drawChart();
}

function setMode(newMode) {
  if (openTrade) {
    toast("Aguarde a operação atual finalizar.");
    return;
  }

  mode = newMode;
  document.getElementById("buyBtn").classList.toggle("active-mode", mode === "BUY");
  document.getElementById("sellBtn").classList.toggle("active-mode", mode === "SELL");
}

function updateSelectedAsset() {
  const stock = stocks[selected];
  const changeValue = stockChange(selected);

  document.getElementById("selectedSymbol").textContent = selected;
  document.getElementById("selectedName").textContent = stock.name;
  document.getElementById("selectedPrice").textContent = brl(stock.price);

  const change = document.getElementById("selectedChange");
  change.textContent = `${changeValue >= 0 ? "+" : ""}${changeValue.toFixed(2)}%`;
  change.className = changeValue >= 0 ? "positive" : "negative";

  document.getElementById("priceBadge").textContent = brl(stock.price);
}

function executeTrade() {
  if (openTrade) {
    toast("Já existe uma operação em andamento.");
    return;
  }

  const amount = Number(document.getElementById("capitalInput").value || 0);
  const duration = Number(document.getElementById("durationInput").value || 60);

  if (amount <= 0) {
    toast("Informe um capital válido.");
    return;
  }

  if (amount > cash) {
    toast("Saldo insuficiente.");
    return;
  }

  cash -= amount;

  const entryPrice = stocks[selected].price;
  const forceWin = document.getElementById("forceWin").checked;

  openTrade = {
    symbol: selected,
    direction: mode,
    amount,
    duration,
    remaining: duration,
    entryPrice,
    forceWin
  };

  document.getElementById("executeBtn").disabled = true;
  document.getElementById("capitalInput").disabled = true;
  document.getElementById("durationInput").disabled = true;

  updateOpenTradeBox();
  showEntryLine();
  updateUI();

  countdownTimer = setInterval(() => {
    if (!openTrade) return;

    openTrade.remaining -= 1;
    updateOpenTradeBox();

    if (openTrade.remaining <= 0) {
      finishTrade();
    }
  }, 1000);

  toast(`${mode} aberto em ${selected}. Expiração em ${duration}s.`);
}

function updateOpenTradeBox() {
  const box = document.getElementById("openTradeBox");

  if (!openTrade) {
    box.classList.add("hidden");
    document.getElementById("homeOpenTrade").textContent = "Nenhuma";
    return;
  }

  box.classList.remove("hidden");
  document.getElementById("openTradeText").textContent = `${openTrade.direction} ${openTrade.symbol}`;
  document.getElementById("entryPriceText").textContent = brl(openTrade.entryPrice);
  document.getElementById("countdownText").textContent = `${openTrade.remaining}s`;
  document.getElementById("expiryLabel").textContent = `${openTrade.remaining}s`;
  document.getElementById("homeOpenTrade").textContent = `${openTrade.direction} ${openTrade.symbol}`;
}

function showEntryLine() {
  const values = priceHistory[selected];
  const min = Math.min(...values, openTrade.entryPrice);
  const max = Math.max(...values, openTrade.entryPrice);
  const range = max - min || 1;
  const y = 300 - ((openTrade.entryPrice - min) / range) * 260;
  const topPercent = (y / 330) * 100;

  const entryLine = document.getElementById("entryLine");
  const entryBadge = document.getElementById("entryBadge");

  entryLine.style.display = "block";
  entryBadge.style.display = "block";
  entryLine.style.top = `${topPercent}%`;
  entryBadge.style.top = `${topPercent}%`;
  entryBadge.textContent = `Entrada ${brl(openTrade.entryPrice)}`;
}

function hideEntryLine() {
  document.getElementById("entryLine").style.display = "none";
  document.getElementById("entryBadge").style.display = "none";
}

function finishTrade() {
  clearInterval(countdownTimer);

  const finalPrice = stocks[openTrade.symbol].price;
  let won = false;

  if (openTrade.direction === "BUY") {
    won = finalPrice > openTrade.entryPrice;
  }

  if (openTrade.direction === "SELL") {
    won = finalPrice < openTrade.entryPrice;
  }

  if (openTrade.forceWin) {
    won = true;
  }

  const profit = won ? openTrade.amount * payoutRate : -openTrade.amount;
  const returned = won ? openTrade.amount + (openTrade.amount * payoutRate) : 0;

  cash += returned;

  trades.unshift({
    symbol: openTrade.symbol,
    direction: openTrade.direction,
    amount: openTrade.amount,
    entryPrice: openTrade.entryPrice,
    finalPrice,
    won,
    profit,
    forced: openTrade.forceWin
  });

  showResultModal(won, profit, openTrade.entryPrice, finalPrice, openTrade.forceWin);

  openTrade = null;

  document.getElementById("executeBtn").disabled = false;
  document.getElementById("capitalInput").disabled = false;
  document.getElementById("durationInput").disabled = false;
  document.getElementById("expiryLabel").textContent = `${document.getElementById("durationInput").value}s`;

  hideEntryLine();
  updateOpenTradeBox();
  updateUI();
}

function showResultModal(won, profit, entryPrice, finalPrice, forced) {
  const modal = document.getElementById("resultModal");
  const title = document.getElementById("modalTitle");
  const text = document.getElementById("modalText");

  title.textContent = won ? "OPERAÇÃO VENCEDORA" : "OPERAÇÃO PERDEDORA";
  title.className = won ? "win" : "loss";

  text.innerHTML = `
    Entrada: <strong>${brl(entryPrice)}</strong><br>
    Final: <strong>${brl(finalPrice)}</strong><br>
    Resultado: <strong>${brl(profit)}</strong>
    ${forced ? "<br><br><small>Resultado forçado pelo modo demonstração.</small>" : ""}
  `;

  modal.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("resultModal").classList.add("hidden");
}

function totalProfit() {
  return cash - startingCash;
}

function updateUI() {
  const profit = totalProfit();

  document.getElementById("cashDisplay").textContent = brl(cash);
  document.getElementById("homeCash").textContent = brl(cash);
  document.getElementById("homeProfit").textContent = brl(profit);
  document.getElementById("homeProfit").className = profit >= 0 ? "win" : "loss";
  document.getElementById("homeTrades").textContent = trades.length;

  document.getElementById("rCash").textContent = brl(cash);
  document.getElementById("rProfit").textContent = brl(profit);
  document.getElementById("rProfit").className = profit >= 0 ? "win" : "loss";
  document.getElementById("rTrades").textContent = trades.length;

  renderHistory();
  renderStocks();
  updateSelectedAsset();
}

function renderHistory() {
  const box = document.getElementById("historyList");

  if (trades.length === 0) {
    box.className = "positions-empty";
    box.innerHTML = "Nenhuma operação finalizada.";
    return;
  }

  box.className = "";
  box.innerHTML = trades.map(t => `
    <div class="history-item">
      <div class="history-name">
        <strong>${t.won ? "WIN" : "LOSS"} — ${t.direction} ${t.symbol}</strong>
        <small>Entrada ${brl(t.entryPrice)} · Final ${brl(t.finalPrice)} ${t.forced ? "· Demo" : ""}</small>
      </div>
      <div class="history-value ${t.won ? "win" : "loss"}">${brl(t.profit)}</div>
    </div>
  `).join("");
}

function drawChart() {
  const values = priceHistory[selected];
  const extra = openTrade && openTrade.symbol === selected ? [openTrade.entryPrice] : [];
  const min = Math.min(...values, ...extra);
  const max = Math.max(...values, ...extra);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 900;
    const y = 300 - ((v - min) / range) * 260;
    return [x, y];
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L900 330 L0 330 Z`;
  const isPositive = stockChange(selected) >= 0;

  document.getElementById("chartLine").setAttribute("d", path);
  document.getElementById("chartArea").setAttribute("d", area);
  document.getElementById("chartLine").setAttribute("stroke", isPositive ? "#19c37d" : "#ff4d4d");
  document.getElementById("chartArea").setAttribute("fill", isPositive ? "rgba(25,195,125,.10)" : "rgba(255,77,77,.10)");

  const lastY = points[points.length - 1][1];
  const topPercent = (lastY / 330) * 100;

  document.getElementById("priceLine").style.top = `${topPercent}%`;
  document.getElementById("priceBadge").style.top = `${topPercent}%`;

  if (openTrade && openTrade.symbol === selected) {
    showEntryLine();
  }
}

function tickMarket() {
  Object.entries(stocks).forEach(([symbol, stock]) => {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const movement = direction * (Math.random() * stock.volatility);
    const drift = Math.sin(Date.now() / 3000 + stock.price) * stock.volatility * 0.12;

    stock.price = Math.max(1, stock.price + movement + drift);
    stock.price = Number(stock.price.toFixed(2));

    priceHistory[symbol].push(stock.price);
    if (priceHistory[symbol].length > 42) priceHistory[symbol].shift();
  });

  drawChart();
  updateUI();
}

function startLiveMarket() {
  if (animationTimer) clearInterval(animationTimer);
  animationTimer = setInterval(tickMarket, 900);
}

function toggleAdmin() {
  document.getElementById("adminPanel").classList.toggle("show");
}

function toast(message) {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

document.getElementById("durationInput").addEventListener("change", () => {
  if (!openTrade) {
    document.getElementById("expiryLabel").textContent = `${document.getElementById("durationInput").value}s`;
  }
});

renderStocks();
updateSelectedAsset();
drawChart();
updateUI();
startLiveMarket();
