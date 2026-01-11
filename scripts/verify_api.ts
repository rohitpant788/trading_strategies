
async function verifyApi() {
    const url = 'http://localhost:3000/api/weekly-strategy/backtest';
    const body = {
        config: {
            symbol: 'BTC-USD',
            startDate: '2020-01-01',
            endDate: '2024-12-31',
            targetPercent: 6,
            initialCapital: 100000,
            allocationPerTrade: 10000
        },
        csvContent: null
    };

    try {
        console.log(`Sending POST to ${url}...`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
            console.log('[SUCCESS] API returned success!');
            console.log('Total Trades:', data.result.metrics.totalTrades);
            console.log('Total Profit:', data.result.metrics.totalProfit);
        } else {
            console.error('[FAILURE] API returned error:', data.error);
        }

    } catch (error) {
        console.error('[ERROR] Request failed:', error);
    }
}

verifyApi();
