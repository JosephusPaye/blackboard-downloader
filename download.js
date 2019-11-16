const fs = require('fs');
const path = require('path');
const download = require('download');
const ProgressBar = require('progress');

const log = require('./log');
const { getAuth } = require('./prompts');

async function downloadFile(auth, url, dest, filename) {
    const dir = path.join(__dirname, 'downloads', dest);
    const bar = new ProgressBar('[:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: 0,
    });

    return download(url, dir, { auth, filename })
        .on('response', response => {
            bar.total = response.headers['content-length'] || 1;
            response.on('data', data => bar.tick(data.length));
        })
        .catch(err => {
            if (err.statusCode == 401) {
                console.log(
                    '\nerror: Blackboard rejected username and password, try again.'
                );
                process.exit();
            } else {
                log(err);
            }
        });
}

async function main() {
    const data = require('./downloads/data.json');

    const { username, password } = await getAuth();
    const auth = `${username}:${password}`;

    for (let i = 0; i < data.length; i++) {
        const resource = data[i];

        if (resource.downloadable && resource.content) {
            try {
                console.log('\nsaving notes: ', resource.title);
                const dir = path.join(__dirname, 'downloads', resource.path);
                fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(
                    path.join(dir, resource.filename),
                    resource.content,
                    'utf8'
                );
            } catch (err) {
                console.error('failed to write file', err);
            }
        }

        for (let j = 0; j < resource.attachments.length; j++) {
            const attachment = resource.attachments[j];

            try {
                console.log(
                    '\ndownloading file:',
                    attachment.title,
                    '(' + attachment.url + ')'
                );

                await downloadFile(
                    auth,
                    attachment.url,
                    attachment.path,
                    attachment.filename
                );
            } catch (err) {
                console.error('failed to download', err);
            }
        }
    }
}

main();
