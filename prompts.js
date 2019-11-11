const prompt = require('prompt');

module.exports = {
    getAuth: async function() {
        return new Promise((resolve, reject) => {
            const promptOptions = {
                properties: {
                    username: {
                        message: 'Enter username',
                        default: 'c3211849',
                        required: true,
                        warning: 'Username is required',
                    },
                    password: {
                        message: 'Enter password',
                        hidden: true,
                        required: true,
                        warning: 'Password is required',
                    },
                },
            };

            prompt.start();

            prompt.get(promptOptions, function(err, promptResult) {
                if (err) {
                    reject(err);
                    return;
                }

                const auth = {
                    username: promptResult.username,
                    password: promptResult.password,
                };

                resolve(auth);
            });
        });
    },
};
