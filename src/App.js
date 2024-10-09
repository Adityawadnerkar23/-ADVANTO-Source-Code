import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(2);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [transactions, setTransactions] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:9999/api/transactions?month=${selectedMonth}&search=${searchText}&page=${currentPage}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');

      const data = await response.json();
      console.log('Transaction data:', data.data);


      if (data?.data?.length > 0) {
        setTransactions(data.data);
      } else {
        console.warn('No transactions found in the response');
        setTransactions([]); // Clear transactions if no data
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Could not load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  console.log("transactions", transactions)

  useEffect(() => {
    fetchTransactions();
  }, [selectedMonth, searchText, currentPage])

  const fetchStatistics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:9999/api/statistics?month=${selectedMonth}`);
      if (!response.ok) throw new Error('Failed to fetch statistics');

      const data = await response.json();
      console.log("STATISTICS:", data);

      if (data.totalSales && data.totalSales.length > 0) {
        setStatistics({
          totalSales: data.totalSales[0]?.totalAmount || 0,
          soldItems: data.totalSales[0]?.totalItemsSold || 0,
          unsoldItems: data.totalNotSold || 0
        });
      } else {
        console.warn('No statistics found in the response');
        setStatistics({ totalSales: 0, soldItems: 0, unsoldItems: 0 });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('Could not load statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [selectedMonth])

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:9999/api/bar-chart?month=${selectedMonth}`);
      if (!response.ok) throw new Error('Failed to fetch chart data');
      const data = await response.json();
      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setError('Could not load chart data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [selectedMonth])

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setCurrentPage(1);
    setSearchText(''); // Clear search text when changing month
  };

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    setCurrentPage(currentPage + 1);
  };

  return (
    <div className="container mx-auto p-4" style={{ backgroundColor: '#F0F4F8' }}>
      <h1 className="text-center font-bold mb-4">Transaction Dashboard</h1>

      {/* Controls */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <input
          type="text"
          className="form-control"
          placeholder="Search Transactions"
          value={searchText}
          onChange={handleSearchChange}
          aria-label="Search Transactions" // Accessibility feature
        />
        <select
          value={selectedMonth}
          onChange={handleMonthChange}
          className="btn btn-warning"
          aria-label="Select Month" // Accessibility feature
        >
          {months.map((month, index) => (
            <option key={month} value={index}>{month}</option>
          ))}
        </select>
      </div>

      {/* Loading and Error Messages */}
      {loading && <p>Loading...</p>}
      {error && <p className="text-danger">{error}</p>}

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Total Sales</h5>
              <p className="card-text">${statistics.totalSales}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Sold Items</h5>
              <p className="card-text">{statistics.soldItems}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Unsold Items</h5>
              <p className="card-text">{statistics.unsoldItems}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <table className="table table-bordered">
        <thead className="thead-light">
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Description</th>
            <th>Price</th>
            <th>Category</th>
            <th>Sold</th>
            <th>Image</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length > 0 ? (
            transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.id}</td>
                <td>{transaction.title}</td>
                <td>{transaction.description}</td>
                <td>${transaction.price}</td>
                <td>{transaction.category}</td>
                <td>{transaction.sold ? 'Yes' : 'No'}</td>
                <td>
                  <img src={transaction.image || 'placeholder_image_url'} alt="product" width="50" />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="text-center">No transactions found. Try adjusting your search criteria.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="d-flex justify-content-between mt-4">
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className="btn btn-primary"
          aria-label="Previous Page" // Accessibility feature
        >
          Previous
        </button>
        <button
          onClick={handleNextPage}
          className="btn btn-primary"
          aria-label="Next Page" // Accessibility feature
        >
          Next
        </button>
      </div>

      {/* Chart */}
      <div className="mt-4">
        <h2 className="text-center font-bold mb-4">Bar Chart Stats - {selectedMonth}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
