const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log(err));

// Define schema and model
const productSchema = new mongoose.Schema({
    id: Number,
    title: String,
    description: String,
    price: Number,
    category: String,
    dateOfSale: Date,
    sold: Boolean,
});

const Product = mongoose.model('Product', productSchema);

// API to initialize the database
app.get('/api/initialize', async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const data = response.data;

        await Product.deleteMany({}); // Clear existing data
        await Product.insertMany(data); // Seed new data
        res.status(200).send('Database initialized with seed data');
    } catch (error) {
        res.status(500).json({ message: 'Error initializing database', error });
    }
});

// Updated API to get transactions
app.get('/api/transactions', async (req, res) => {
    try {

        const { month, search, page = 1, perPage = 10 } = req.query;

        const queries = {};

        if (month) {
            queries.month = parseInt(month);
        }

        if (search) {
            queries.$or = [
                { title: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') },
                { price: new RegExp(search, 'i') }
            ];
        }

        const productAggregate = await Product.aggregate([
            {
                $addFields: {
                    month: { $month: "$dateOfSale" }
                }
            },
            {
                $match: {
                    ...queries
                }
            },
            {
                $facet: {
                    data: [
                        { $skip: (page - 1) * perPage },
                        { $limit: perPage }
                    ],
                    count: [
                        { $count: "count" }
                    ]
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: productAggregate?.[0]?.data || [],
            count: productAggregate?.[0]?.count?.[0]?.count || 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error });
    }
});

// Remaining statistics and chart endpoints...
app.get('/api/statistics', async (req, res) => {
    const { month } = req.query;

    const queries = {};
    if(month){
        queries.month = parseInt(month)
    }

    try {
        const totalSales = await Product.aggregate([
            {
                $addFields:{
                    month: { $month: "$dateOfSale" }
                }
            },
            {
                $match: {
                   ...queries
                }
            },
            // { $group: { _id: null, totalAmount: { $sum: "$price" }, totalItemsSold: { $sum: { $cond: ["$sold", 1, 0] } } } }
            {
                $facet : {
                    itemSold : [
                        { $group: { _id: null, totalAmount: { $sum: "$price" }, totalItemsSold: { $sum: { $cond: ["$sold", 1, 0] } } } }
                    ],
                    itemNotSold : [
                        {$match : {sold : false}},
                       { $group: { _id: null,   totalItemsNotSold: { $sum: 1 } ,totalItemsSold: { $sum: { $cond: ["$sold", 1, 0]  } } }}
                    ]
                }
            }      
        ]);

        // const totalNotSold = await Product.countDocuments({ sold: false, dateOfSale: { $gte: startDate, $lt: endDate } });
        res.json({ totalSales });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching statistics', error });
    }
});
// Bar chart endpoint
app.get('/api/bar-chart', async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`${month} 01, 2023`);
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);

    const priceRanges = [
        { range: "0-100", min: 0, max: 100 },
        { range: "101-200", min: 101, max: 200 },
        { range: "201-300", min: 201, max: 300 },
        { range: "301-400", min: 301, max: 400 },
        { range: "401-500", min: 401, max: 500 },
        { range: "501-600", min: 501, max: 600 },
        { range: "601-700", min: 601, max: 700 },
        { range: "701-800", min: 701, max: 800 },
        { range: "801-900", min: 801, max: 900 },
        { range: "901-above", min: 901, max: Number.MAX_SAFE_INTEGER },
    ];

    try {
        const result = [];
        for (const range of priceRanges) {
            const count = await Product.countDocuments({
                dateOfSale: { $gte: startDate, $lt: endDate },
                price: { $gte: range.min, $lte: range.max }
            });
            result.push({ range: range.range, count });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bar chart data', error });
    }
});
// Pie chart endpoint
app.get('/api/pie-chart', async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`${month} 01, 2023`);
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);

    try {
        const categories = await Product.aggregate([
            {
                $match: {
                    dateOfSale: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            }
        ]);
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pie chart data', error });
    }
});

// Combined data endpoint
app.get('/api/combined', async (req, res) => {
    const { month } = req.query;
    try {
        const transactionsResponse = await axios.get(`http://localhost:${PORT}/api/transactions?month=${month}`);
        const statisticsResponse = await axios.get(`http://localhost:${PORT}/api/statistics?month=${month}`);
        const barChartResponse = await axios.get(`http://localhost:${PORT}/api/bar-chart?month=${month}`);
        const pieChartResponse = await axios.get(`http://localhost:${PORT}/api/pie-chart?month=${month}`);

        res.json({
            transactions: transactionsResponse.data,
            statistics: statisticsResponse.data,
            barChart: barChartResponse.data,
            pieChart: pieChartResponse.data
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching combined data', error });
    }
});

const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
