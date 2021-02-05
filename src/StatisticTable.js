import React from 'react';
import { Table, Button, Modal, Input, Space } from 'antd';
import { compare } from 'array-sort-compare';
import { SearchOutlined } from '@ant-design/icons';
import cx from 'classnames';

import TradingView from './TradingView';

import styles from './StatisticTable.module.scss';
import { noop } from 'lodash';

const { shell, ipcRenderer } = window.require('electron');

const { format } = new Intl.NumberFormat('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
const { format: integerFormat } = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const { format: percentFormat } = new Intl.NumberFormat(
  'en-US',
  { style: 'percent', minimumFractionDigits: 3, maximumFractionDigits: 3 }
);
const comparer = compare();

class StatisticTable extends React.PureComponent {
  state = {
    marketAgg: [],
    searchText: '',
    searchedColumn: '',
  }
  marketAggIpc = noop

  columns = [
    {
      title: 'Coin / Ticker',
      dataIndex: 'ticker',
      key: 'ticker',
      onFilter: (value, record) => record.ticker.includes(value),
      sorter: (a, b) => comparer(a.ticker, b.ticker),
      sortDirections: ['descend'],
      fixed: 'left',
      ...((dataIndex) => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
          <div style={{ padding: 8 }}>
            <Input
              ref={node => {
                this.searchInput = node;
              }}
              placeholder={`Search ${dataIndex}`}
              value={selectedKeys[0]}
              onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
              onPressEnter={() => this.handleSearch(selectedKeys, confirm, dataIndex)}
              style={{ width: 188, marginBottom: 8, display: 'block' }}
            />
            <Space>
              <Button
                type="primary"
                onClick={() => this.handleSearch(selectedKeys, confirm, dataIndex)}
                icon={<SearchOutlined />}
                size="small"
                style={{ width: 90 }}
              >
                Search
              </Button>
              <Button onClick={() => this.handleReset(clearFilters)} size="small" style={{ width: 90 }}>
                Reset
              </Button>
            </Space>
          </div>
        ),
        filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
        onFilter: (value, record) =>
          record[dataIndex]
            ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase())
            : '',
        onFilterDropdownVisibleChange: visible => {
          if (visible) setTimeout(() => this.searchInput.select(), 100);
        },
      }))('ticker'),
    },
    {
      title: 'Current Price',
      dataIndex: 'price',
      key: 'price',
      sorter: (a, b) => comparer(a.price, b.price),
      render: (_, { price }) => format(price),
      className: styles.ResetCellStyle,
    },
    {
      title: '% 2hr Price Change',
      dataIndex: 'percentage2hrChange',
      key: 'percentage2hrChange',
      sorter: (a, b) => comparer(a.percentage2hrChange, b.percentage2hrChange),
      render: (_, { percentage2hrChange }) => ({
        props: {
          className: cx({
            [styles.PositiveValue]: percentage2hrChange > 0,
            [styles.NegativeValue]: percentage2hrChange < 0,
          }),
        },
        children: percentFormat(percentage2hrChange),
      }),
      className: styles.ResetCellStyle,
    },
    {
      title: '24hr Price Change',
      dataIndex: 'price24hrChange',
      key: 'price24hrChange',
      sorter: (a, b) => comparer(a.price24hrChange, b.price24hrChange),
      render: (_, { price24hrChange }) => ({
        props: {
          className: cx({
            [styles.PositiveValue]: price24hrChange > 0,
            [styles.NegativeValue]: price24hrChange < 0,
          }),
        },
        children: format(price24hrChange),
      }),
      className: styles.ResetCellStyle,
    },
    {
      title: '% 24hr Price Change',
      dataIndex: 'percentage24hrChange',
      key: 'percentage24hrChange',
      sorter: (a, b) => comparer(a.percentage24hrChange, b.percentage24hrChange),
      render: (_, { percentage24hrChange }) => ({
        props: {
          className: cx({
            [styles.PositiveValue]: percentage24hrChange > 0,
            [styles.NegativeValue]: percentage24hrChange < 0,
          }),
        },
        children: percentFormat(percentage24hrChange),
      }),
      className: styles.ResetCellStyle,
    },
    {
      title: '24hr Volume',
      dataIndex: 'volume24hr',
      key: 'volume24hr',
      sorter: (a, b) => comparer(a.volume24hr, b.volume24hr),
      render: (_, { volume24hr }) => integerFormat(volume24hr),
      className: styles.ResetCellStyle,
    },
    {
      title: '24hr USDT Volume',
      dataIndex: 'quoteVolume24hr',
      key: 'quoteVolume24hr',
      sorter: (a, b) => comparer(a.quoteVolume24hr, b.quoteVolume24hr),
      render: (_, { quoteVolume24hr }) => integerFormat(quoteVolume24hr),
      className: styles.ResetCellStyle,
    },
    {
      title: '',
      dataIndex: '',
      key: 'tradeButton',
      render: (_, { tradeLink, ticker }) => (
        <>
          <Button
            type="link"
            onClick={() => Modal.info({
              title: `${ticker} / USDT`,
              content: <TradingView ticker={ticker} />,
              className: styles.TradingViewModal,
            })}
          >
            View
          </Button>
          <Button type="link" onClick={() => shell.openExternal(tradeLink)}>Trade</Button>
        </>
      ),
    },
  ];

  componentDidMount() {
    this.marketAggIpc = (_, marketAgg) => this.setState({ marketAgg });
    ipcRenderer.on('marketAggData', this.marketAggIpc);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(this.marketAggIpc);
  }

  handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    this.setState({
      searchText: selectedKeys[0],
      searchedColumn: dataIndex,
    });
  };

  handleReset = clearFilters => {
    clearFilters();
    this.setState({ searchText: '' });
  };

  render() {
    const { marketAgg } = this.state;

    return <Table
      columns={this.columns}
      rowKey="ticker"
      pagination={false}
      dataSource={marketAgg}
      className={styles.FullWidthTable}
      loading={marketAgg.length === 0}
      bordered
      sticky
    />;
  }
}

export default StatisticTable;
