const debugging = process.argv.find(
    arg => arg.trim().toLowerCase() === '--debug'
);

module.exports = function log(...values) {
    if (debugging) {
        console.log(...values);
    }
};
