const path = require('path');
const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({path: path.join(__dirname, '../.env')});

async function main() {
    try {
        const openApiResponse = await axios.get('http://localhost:8000/openapi.json', {
            auth: {
                username: 'admin',
                password: 'password',
            },
        });

        console.log('Downloaded open api JSON successfully');

        await fs.promises.writeFile(path.join(__dirname, '../api-schema.json'), JSON.stringify(openApiResponse.data));

        console.log('Saved open api JSON file to "api-schema.json"');
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
    process.exit(0);
}

main();
