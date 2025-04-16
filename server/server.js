const express = require('express');
const { execSync } = require('child_process');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// allow requests from frontend on port 3000
app.use(cors());
app.use(express.json());

app.get('/search', (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Missing search query' });
    }

    try {
        // run script with search query
        // TODO point to actual script
        // currently, return a dummy result with a hardcoded url
        // const result = [
        //     { url: 'http://example.com/item1', relevancy: 0.9 },
        //     { url: 'http://example.com/item2', relevancy: 0.8 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        // ];
        const scriptPath = path.resolve(__dirname, '../distribution/new-m6-query.js');
        console.log(scriptPath);
        console.log("sup");
        var result = "";
        try {
            console.log('trying query');
            result = execSync(`node "${scriptPath}" "${query}"`, { encoding: 'utf-8' });
            console.log(result);
        } catch (e) {
            console.error('eeee', e);
        }

        res.json({ result });
    } catch (error) {
        console.error('Search script failed:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
