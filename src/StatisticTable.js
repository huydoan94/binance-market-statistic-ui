import React from 'react';
import { Table, Button, Modal, Input, Space, PageHeader, Row, Select, Tag } from 'antd';
import { UpOutlined, SearchOutlined } from '@ant-design/icons';
import { compare } from 'array-sort-compare';

import cx from 'classnames';
import { debounce, noop } from 'lodash';

import TradingView from './TradingView';

import styles from './StatisticTable.module.scss';

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
    isUpdate: true,
    selectedInterval: 'immediately',
    showScrollToTop: false
  }

  tableContainerRef = null

  marketAggIpc = noop

  updateInterval = [
    {
      key: 'immediately',
      value: 'Immediately'
    },
    {
      key: '1m',
      value: '1 minute',
      ms: 60000
    },
    {
      key: '5m',
      value: '5 minutes',
      ms: 300000
    },
    {
      key: '15m',
      value: '15 minutes',
      ms: 900000
    }
  ]

  columns = [
    {
      title: 'Coin / Ticker',
      dataIndex: 'ticker',
      key: 'ticker',
      onFilter: (value, record) => record.ticker.includes(value),
      sorter: (a, b) => comparer(a.ticker, b.ticker),
      width: 300,
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
        }
      }))('ticker')
    },
    {
      title: 'Current Price',
      dataIndex: 'price',
      key: 'price',
      sorter: (a, b) => comparer(a.price, b.price),
      width: 200,
      render: (_, { price }) => format(price),
      className: styles.ResetCellStyle
    },
    {
      title: '% 2hr Price Change',
      dataIndex: 'percentage2hrChange',
      key: 'percentage2hrChange',
      sorter: {
        compare: (a, b) => comparer(a.percentage2hrChange, b.percentage2hrChange),
        multiple: 2
      },
      width: 200,
      render: (_, { percentage2hrChange }) => ({
        props: {
          className: cx({
            [styles.PositiveValue]: percentage2hrChange > 0,
            [styles.NegativeValue]: percentage2hrChange < 0
          })
        },
        children: percentFormat(percentage2hrChange)
      }),
      className: styles.ResetCellStyle
    },
    {
      title: '24hr Price Change',
      dataIndex: 'price24hrChange',
      key: 'price24hrChange',
      sorter: (a, b) => comparer(a.price24hrChange, b.price24hrChange),
      width: 200,
      render: (_, { price24hrChange }) => ({
        props: {
          className: cx({
            [styles.PositiveValue]: price24hrChange > 0,
            [styles.NegativeValue]: price24hrChange < 0
          })
        },
        children: format(price24hrChange)
      }),
      className: styles.ResetCellStyle
    },
    {
      title: '% 24hr Price Change',
      dataIndex: 'percentage24hrChange',
      key: 'percentage24hrChange',
      sorter: {
        compare: (a, b) => comparer(a.percentage24hrChange, b.percentage24hrChange),
        multiple: 1
      },
      width: 200,
      render: (_, { percentage24hrChange }) => ({
        props: {
          className: cx({
            [styles.PositiveValue]: percentage24hrChange > 0,
            [styles.NegativeValue]: percentage24hrChange < 0
          })
        },
        children: percentFormat(percentage24hrChange)
      }),
      className: styles.ResetCellStyle
    },
    {
      title: '24hr Volume',
      dataIndex: 'volume24hr',
      key: 'volume24hr',
      sorter: (a, b) => comparer(a.volume24hr, b.volume24hr),
      width: 200,
      render: (_, { volume24hr }) => integerFormat(volume24hr),
      className: styles.ResetCellStyle
    },
    {
      title: '24hr USDT Volume',
      dataIndex: 'quoteVolume24hr',
      key: 'quoteVolume24hr',
      sorter: (a, b) => comparer(a.quoteVolume24hr, b.quoteVolume24hr),
      width: 200,
      render: (_, { quoteVolume24hr }) => integerFormat(quoteVolume24hr),
      className: styles.ResetCellStyle
    },
    {
      title: '',
      dataIndex: '',
      key: 'tradeButton',
      width: 180,
      render: (_, { tradeLink, ticker }) => (
        <>
          <Button
            type="link"
            onClick={() => Modal.info({
              title: `${ticker} / USDT`,
              content: <TradingView ticker={ticker} />,
              className: styles.TradingViewModal
            })}
          >
            View
          </Button>
          <Button type="link" onClick={() => shell.openExternal(tradeLink)}>Trade</Button>
        </>
      )
    }
  ];

  componentDidMount() {
    ipcRenderer.on('marketAggData', this.marketAggIpc);
    this.tableContainerRef.addEventListener('scroll', this.handleTableScroll);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('marketAggData', this.marketAggIpc);
    this.tableContainerRef.removeEventListener('scroll', this.handleTableScroll);
  }

  baseMarketAggIpc = (_, marketAgg) => {
    const { isUpdate } = this.state;
    if (!isUpdate) return;

    this.setState({ marketAgg });
  }

  marketAggIpc = this.baseMarketAggIpc

  handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    this.setState({
      searchText: selectedKeys[0],
      searchedColumn: dataIndex
    });
  };

  handleReset = clearFilters => {
    clearFilters();
    this.setState({ searchText: '' });
  };

  handleStartStopUpdate = () => this.setState(({ isUpdate }) => ({ isUpdate: !isUpdate }));

  handleIntervalChange = (value) => {
    if (this.marketAggIpc.cancel) this.marketAggIpc.cancel();
    ipcRenderer.removeListener('marketAggData', this.marketAggIpc);

    if (value === this.updateInterval[0].key) {
      this.marketAggIpc = this.baseMarketAggIpc;
    } else {
      const select = this.updateInterval.find(u => u.key === value);
      this.marketAggIpc = debounce(this.baseMarketAggIpc, select.ms, { maxWait: select.ms });
    }

    ipcRenderer.on('marketAggData', this.marketAggIpc);
    this.setState({ selectedInterval: value });
  }

  saveTableContainerRef = tableContainerRef => {
    this.tableContainerRef = tableContainerRef;
  }

  handleTableScroll = debounce(() => {
    this.setState({ showScrollToTop: this.tableContainerRef.scrollTop > 0 });
  }, 150)

  handleClickScrollToTop = () => {
    this.setState({ showScrollToTop: false });
    this.tableContainerRef.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  renderScrollToTop = () => {
    const { showScrollToTop } = this.state;
    return showScrollToTop && (
      <Button
        type="primary"
        shape="circle"
        icon={<UpOutlined />}
        size="large"
        className={styles.ScrollToTop}
        onClick={this.handleClickScrollToTop}
      />
    );
  }

  renderUpdateInterval = () => {
    const { selectedInterval, isUpdate } = this.state;
    const { Option } = Select;
    return (
      <>
        Update interval:
        <Select
          key="2"
          value={selectedInterval}
          onChange={this.handleIntervalChange}
          disabled={!isUpdate}
          className={styles.IntervalSelect}
        >
          {this.updateInterval.map(u => (
            <Option key={u.key} value={u.key}>{u.value}</Option>
          ))}
        </Select>
      </>
    );
  }

  render() {
    const { marketAgg, isUpdate } = this.state;

    return (
      <div className={styles.Page}>
        <PageHeader
          onBack={() => window.history.back()}
          title="Market Statistic Table"
          backIcon={false}
          tags={<Tag color={isUpdate ? 'blue' : 'red'}>{isUpdate ? 'Running' : 'Not Running'}</Tag>}
          extra={[
            this.renderUpdateInterval(),
            <Button
              key="1"
              onClick={this.handleStartStopUpdate}
              type="primary"
              danger={isUpdate}
            >
              {isUpdate ? 'Stop' : 'Start'} Update
            </Button>
          ]}
        />
        <Row className={styles.TableContainer} ref={this.saveTableContainerRef}>
          <Table
            columns={this.columns}
            rowKey="ticker"
            pagination={false}
            dataSource={marketAgg}
            loading={marketAgg.length === 0}
            className={styles.Table}
            scroll={{ x: true, y: '100%' }}
            bordered
            sticky
          />
          {this.renderScrollToTop()}
        </Row>
      </div>
    );
  }
}

export default StatisticTable;
