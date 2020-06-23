const fs = require('fs');
const curlconverter = require('curlconverter');
const path = require('path');

module.exports = {
    getRequestOptions
};

async function getRequestOptions() {
    try {
        const curl = fs
            .readFileSync(path.join(__dirname, 'yum.txt'), 'utf8')
            .trim();
        const { raw_url: url, cookies, headers } = JSON.parse(
            curlconverter.toJsonString(curl)
        );

        delete headers['Accept-Encoding'];

        return {
            url,
            headers: {
                ...headers,
                Cookie: Object.keys(cookies)
                    .map(key => {
                        return `${key}=${cookies[key]}`;
                    })
                    .join('; '),
            },
        };
    } catch (err) {
        log(err);
        return undefined;
    }
}

