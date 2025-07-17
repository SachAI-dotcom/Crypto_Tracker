const { useState, useEffect, useContext, createContext, useCallback, useMemo, useRef } = React;

// Context for global state management
const CryptoContext = createContext();

// ------------------ Utility Functions ------------------ //
const formatPrice = (price) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(price);
};

const formatNumber = (num) => {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

const formatPercentage = (percentage) => `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;

// ------------------ Custom Hook for API ------------------ //
const useApi = (url, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!url) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const json = await response.json();
      setData(json);
    } catch (err) {
      console.error('API Error', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return { data, loading, error, refetch: fetchData };
};

// ------------------ Generic Components ------------------ //
const LoadingSpinner = () => (
  <div className="loading">
    <div className="loading-spinner"></div>
    <span>Loading...</span>
  </div>
);

const ErrorMessage = ({ message, onRetry }) => (
  <div className="error">
    <h3>Error</h3>
    <p>{message}</p>
    {onRetry && (
      <button className="btn btn--primary" onClick={onRetry}>
        Try Again
      </button>
    )}
  </div>
);

// ------------------ Header ------------------ //
const Header = ({ currentView, onViewChange, searchTerm, onSearchChange }) => (
  <header className="header">
    <div className="header-content">
      <a href="#" className="logo" onClick={() => onViewChange('dashboard')}>
        CryptoTracker
      </a>
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search cryptocurrencies..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <nav className="nav-links">
        <a
          href="#"
          className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onViewChange('dashboard')}
        >
          Dashboard
        </a>
        <a
          href="#"
          className={`nav-link ${currentView === 'watchlist' ? 'active' : ''}`}
          onClick={() => onViewChange('watchlist')}
        >
          Watchlist
        </a>
      </nav>
    </div>
  </header>
);

// ------------------ Price Chart ------------------ //
const PriceChart = ({ coinId }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(7); // default 7 days
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  // fetch chart data
  useEffect(() => {
    const fetchChart = async () => {
      if (!coinId) return;
      setLoading(true);
      try {
        const resp = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${selectedPeriod}`
        );
        const json = await resp.json();
        setChartData(json);
      } catch (err) {
        console.error('Chart Fetch Error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChart();
  }, [coinId, selectedPeriod]);

  // render chart when data changes
  useEffect(() => {
    if (!chartData || !chartData.prices) return;

    const labels = chartData.prices.map((p) => {
      const date = new Date(p[0]);
      return selectedPeriod <= 1 ? date.toLocaleTimeString() : date.toLocaleDateString();
    });
    const datapoints = chartData.prices.map((p) => p[1]);

    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Price (USD)',
            data: datapoints,
            borderColor: '#42a5f5',
            backgroundColor: 'rgba(66, 165, 245, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => formatPrice(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.7)' }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: 'rgba(255,255,255,0.7)',
              callback: (val) => formatPrice(val)
            }
          }
        }
      }
    });
  }, [chartData]);

  // cleanup
  useEffect(() => {
    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, []);

  const periods = [
    { value: 1, label: '24H' },
    { value: 7, label: '7D' },
    { value: 30, label: '30D' },
    { value: 90, label: '90D' }
  ];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">Price Chart</h3>
        <div className="chart-controls">
          {periods.map((p) => (
            <button
              key={p.value}
              className={`chart-btn ${selectedPeriod === p.value ? 'active' : ''}`}
              onClick={() => setSelectedPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="chart-canvas">
          <canvas ref={canvasRef}></canvas>
        </div>
      )}
    </div>
  );
};

// ------------------ Crypto Card ------------------ //
const CryptoCard = ({ coin, onCoinClick, isInWatchlist, onWatchlistToggle }) => {
  const changeClass = coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative';

  return (
    <div className="crypto-card fade-in" onClick={() => onCoinClick(coin)}>
      <div className="crypto-header">
        <div className="crypto-info">
          <img
            src={coin.image}
            alt={coin.name}
            className="crypto-logo"
            onError={(e) => (e.target.style.display = 'none')}
          />
          <div>
            <h3 className="crypto-name">{coin.name}</h3>
            <p className="crypto-symbol">{coin.symbol}</p>
          </div>
        </div>
        <button
          className={`watchlist-btn ${isInWatchlist ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onWatchlistToggle(coin.id);
          }}
        >
          {isInWatchlist ? '★' : '☆'}
        </button>
      </div>
      <div className="crypto-price">{formatPrice(coin.current_price)}</div>
      <div className={`crypto-change ${changeClass}`}>{formatPercentage(coin.price_change_percentage_24h)}</div>
      <div className="crypto-stats">
        <div className="stat-item">
          <span className="stat-label">Market Cap</span>
          <span className="stat-value">{formatNumber(coin.market_cap)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Volume</span>
          <span className="stat-value">{formatNumber(coin.total_volume)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Rank</span>
          <span className="stat-value">#{coin.market_cap_rank}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Supply</span>
          <span className="stat-value">{formatNumber(coin.circulating_supply)}</span>
        </div>
      </div>
    </div>
  );
};

// ------------------ Coin Detail ------------------ //
const CoinDetail = ({ coinId, onBack }) => {
  const { data: coin, loading, error } = useApi(
    coinId ? `https://api.coingecko.com/api/v3/coins/${coinId}` : null,
    [coinId]
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  if (!coin) return null;

  const changeClass = coin.market_data.price_change_percentage_24h >= 0 ? 'positive' : 'negative';

  return (
    <div className="coin-detail fade-in">
      <button className="btn btn--outline" style={{ marginBottom: '24px' }} onClick={onBack}>
        ← Back to Dashboard
      </button>
      <div className="coin-detail-header">
        <div className="coin-detail-info">
          <img
            src={coin.image.large}
            alt={coin.name}
            className="coin-detail-logo"
            onError={(e) => (e.target.style.display = 'none')}
          />
          <div>
            <h1 className="coin-detail-name">{coin.name}</h1>
            <p className="coin-detail-symbol">{coin.symbol}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="coin-detail-price">{formatPrice(coin.market_data.current_price.usd)}</div>
          <div className={`coin-detail-change ${changeClass}`}>{formatPercentage(coin.market_data.price_change_percentage_24h)}</div>
        </div>
      </div>
      <div className="coin-detail-stats">
        <div className="detail-stat-card">
          <div className="detail-stat-value">{formatNumber(coin.market_data.market_cap.usd)}</div>
          <div className="detail-stat-label">Market Cap</div>
        </div>
        <div className="detail-stat-card">
          <div className="detail-stat-value">{formatNumber(coin.market_data.total_volume.usd)}</div>
          <div className="detail-stat-label">24h Volume</div>
        </div>
        <div className="detail-stat-card">
          <div className="detail-stat-value">#{coin.market_cap_rank}</div>
          <div className="detail-stat-label">Market Rank</div>
        </div>
        <div className="detail-stat-card">
          <div className="detail-stat-value">{formatNumber(coin.market_data.circulating_supply)}</div>
          <div className="detail-stat-label">Circulating Supply</div>
        </div>
        <div className="detail-stat-card">
          <div className="detail-stat-value">{formatPrice(coin.market_data.ath.usd)}</div>
          <div className="detail-stat-label">All-Time High</div>
        </div>
        <div className="detail-stat-card">
          <div className="detail-stat-value">{formatPercentage(coin.market_data.ath_change_percentage.usd)}</div>
          <div className="detail-stat-label">ATH Change</div>
        </div>
      </div>
      <PriceChart coinId={coinId} />
    </div>
  );
};

// ------------------ Dashboard ------------------ //
const Dashboard = ({ coins, loading, error, onRefresh, onCoinClick, searchTerm, sortBy, onSortChange, watchlist, onWatchlistToggle }) => {
  const filteredCoins = useMemo(() => {
    if (!coins) return [];
    let result = coins.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.symbol.toLowerCase().includes(searchTerm.toLowerCase()));
    result.sort((a, b) => {
      switch (sortBy) {
        case 'market_cap':
          return b.market_cap - a.market_cap;
        case 'price':
          return b.current_price - a.current_price;
        case 'volume':
          return b.total_volume - a.total_volume;
        case 'change':
          return b.price_change_percentage_24h - a.price_change_percentage_24h;
        default:
          return a.market_cap_rank - b.market_cap_rank;
      }
    });
    return result;
  }, [coins, searchTerm, sortBy]);

  const marketStats = useMemo(() => {
    if (!coins) return null;
    const totalMarketCap = coins.reduce((acc, c) => acc + c.market_cap, 0);
    const totalVolume = coins.reduce((acc, c) => acc + c.total_volume, 0);
    const gainers = coins.filter((c) => c.price_change_percentage_24h > 0).length;
    const losers = coins.filter((c) => c.price_change_percentage_24h < 0).length;
    return { totalMarketCap, totalVolume, gainers, losers };
  }, [coins]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={onRefresh} />;

  return (
    <div className="dashboard">
      <div className="hero-section">
        <h1 className="hero-title">CryptoTracker</h1>
        <p className="hero-subtitle">Track real-time cryptocurrency prices and market data</p>
      </div>
      {marketStats && (
        <div className="market-stats">
          <div className="stat-card">
            <div className="stat-value">{formatNumber(marketStats.totalMarketCap)}</div>
            <div className="stat-label">Total Market Cap</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatNumber(marketStats.totalVolume)}</div>
            <div className="stat-label">24h Volume</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{marketStats.gainers}</div>
            <div className="stat-label">Gainers</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{marketStats.losers}</div>
            <div className="stat-label">Losers</div>
          </div>
        </div>
      )}

      <div className="controls">
        <div className="sort-controls">
          <span style={{ color: 'white', marginRight: '12px' }}>Sort by:</span>
          {[
            { key: 'rank', label: 'Rank' },
            { key: 'price', label: 'Price' },
            { key: 'market_cap', label: 'Market Cap' },
            { key: 'volume', label: 'Volume' },
            { key: 'change', label: '24h Change' }
          ].map((opt) => (
            <button key={opt.key} className={`sort-btn ${sortBy === opt.key ? 'active' : ''}`} onClick={() => onSortChange(opt.key)}>
              {opt.label}
            </button>
          ))}
        </div>
        <button className="refresh-btn" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      {filteredCoins.length ? (
        <div className="crypto-grid">
          {filteredCoins.map((coin) => (
            <CryptoCard
              key={coin.id}
              coin={coin}
              onCoinClick={onCoinClick}
              isInWatchlist={watchlist.includes(coin.id)}
              onWatchlistToggle={onWatchlistToggle}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No cryptocurrencies found</h3>
          <p>Try changing your search or refresh the data.</p>
        </div>
      )}
    </div>
  );
};

// ------------------ Watchlist ------------------ //
const Watchlist = ({ coins, onCoinClick, watchlist, onWatchlistToggle }) => {
  const listCoins = coins ? coins.filter((c) => watchlist.includes(c.id)) : [];

  if (!listCoins.length) {
    return (
      <div className="empty-state">
        <h3>Your watchlist is empty</h3>
        <p>Add cryptocurrencies to track them here.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="hero-section">
        <h1 className="hero-title">My Watchlist</h1>
        <p className="hero-subtitle">Track your favorite cryptocurrencies</p>
      </div>
      <div className="crypto-grid">
        {listCoins.map((coin) => (
          <CryptoCard
            key={coin.id}
            coin={coin}
            onCoinClick={onCoinClick}
            isInWatchlist={true}
            onWatchlistToggle={onWatchlistToggle}
          />
        ))}
      </div>
    </div>
  );
};

// ------------------ Main App ------------------ //
const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rank');
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem('crypto-watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { data: coins, loading, error, refetch } = useApi(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1'
  );

  // auto-refresh 30s
  useEffect(() => {
    const id = setInterval(() => {
      if (currentView === 'dashboard' || currentView === 'watchlist') refetch();
    }, 30000);
    return () => clearInterval(id);
  }, [currentView, refetch]);

  // persist watchlist
  useEffect(() => {
    localStorage.setItem('crypto-watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const handleCoinClick = (coin) => {
    setSelectedCoin(coin.id);
    setCurrentView('detail');
  };

  const toggleWatchlist = (id) => {
    setWatchlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const renderView = () => {
    switch (currentView) {
      case 'detail':
        return <CoinDetail coinId={selectedCoin} onBack={() => setCurrentView('dashboard')} />;
      case 'watchlist':
        return <Watchlist coins={coins} onCoinClick={handleCoinClick} watchlist={watchlist} onWatchlistToggle={toggleWatchlist} />;
      default:
        return (
          <Dashboard
            coins={coins}
            loading={loading}
            error={error}
            onRefresh={refetch}
            onCoinClick={handleCoinClick}
            searchTerm={searchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
            watchlist={watchlist}
            onWatchlistToggle={toggleWatchlist}
          />
        );
    }
  };

  return (
    <CryptoContext.Provider value={{ coins, watchlist }}>
      <Header currentView={currentView} onViewChange={setCurrentView} searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      <main className="main-container">{renderView()}</main>
    </CryptoContext.Provider>
  );
};

// ------------------ Render ------------------ //
ReactDOM.render(<App />, document.getElementById('root'));