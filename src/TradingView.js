import { useEffect } from 'react';

function TradingView({ ticker }) {
  useEffect(() => {
    new window.TradingView.widget(
      {
        autosize: true,
        symbol: `BINANCE:${ticker}USDT`,
        interval: 'D',
        timezone: 'Asia/Ho_Chi_Minh',
        theme: 'light',
        style: '1',
        locale: 'en',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        save_image: false,
        hidevolume: true,
        container_id: `tradingViewChart-${ticker}`,
      },
    );
  }, [ticker]);

  return <div id={`tradingViewChart-${ticker}`} style={{ width: '100%', height: 'calc(100vh - 300px)' }} />;
}

export default TradingView;
