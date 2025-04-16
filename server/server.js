const express = require('express');
const { execSync } = require('child_process');
const cors = require('cors');

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
        const result = [
            { url: 'http://example.com/item1' },
            { url: 'http://example.com/item2' },
            { url: 'http://example.com/item3' },
            { url: 'http://example.com/item3' },
            { url: 'http://example.com/item3' },
            { url: 'http://example.com/item3' },
            { url: 'http://example.com/item3' },
            { url: 'http://example.com/item3' },
            { url: 'http://example.com/item3' },
            { url: 'http://example.com/item3' },
            { url: 'http://example.com/item3' },
            { url: 'http://example.com/item3' },
            { url: 'http://example.com/item3' },
            { url: 'http://example.com/item3' },
            { url: 'http://example.com/item3' },
            { url: 'http://example.com/item3' },
        ];
        // const result = execSync(`./search.sh "${query}"`, { encoding: 'utf-8' });
        res.json({ result });
    } catch (error) {
        console.error('Search script failed:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
