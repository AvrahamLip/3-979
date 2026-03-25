const https = require('https');

const url = 'https://151.145.89.228.sslip.io/webhook/hapak-eligible';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('--- RAW RESPONSE START ---');
        console.log(data);
        console.log('--- RAW RESPONSE END ---');
        try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
                console.log('Result is an array with', json.length, 'items.');
                const team2G = json.map(row => ({
                    role: row['תפקיד'],
                    person: row['2ג']
                })).filter(r => r.person && r.person.trim() !== '');
                console.log('Team 2G:', team2G);
            } else {
                console.log('Result is a single object.');
                console.log('Team 2G Commander:', json['2ג']);
            }
        } catch (e) {
            console.error('Failed to parse JSON:', e.message);
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
