const path = require('path');
const fs = require('fs');

async function main() {
    try {
        await fs.promises.unlink(path.join(__dirname, '../api-schema.json'));
        console.log('Removed file "api-schema.json"');
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
    process.exit(0);
}

main();
