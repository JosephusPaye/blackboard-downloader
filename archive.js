const cheerio = require('cheerio');
const filenamify = require('filenamify');
const fs = require('fs');
const path = require('path');
const request = require('request-promise');
const { URL } = require('url');

const log = require('./log');
const { getRequestOptions } = require('./auth');

async function getUrlContent(requestOptions) {
    try {
        return request.get(requestOptions);
    } catch (err) {
        log('failed to fetch url', err);
        return null;
    }
}

function toAbsolute(relativeUrl) {
    if (relativeUrl && relativeUrl.trim().match(/^https?:\/\//i)) {
        return relativeUrl;
    }

    return relativeUrl
        ? 'https://uonline.newcastle.edu.au' + relativeUrl
        : undefined;
}

function getType(iconSrc) {
    return iconSrc.includes('folder')
        ? 'folder'
        : iconSrc.includes('document')
        ? 'text'
        : iconSrc.includes('file')
        ? 'file'
        : 'unknown';
}

function getPagePath($, parentPath) {
    if (parentPath.length > 0) {
        return parentPath;
    }

    const courseTitle = $('.courseName').text() || '';
    const pageTitle = $('#pageTitleText').text() || '';

    const courseTitleSegment = filenamify(courseTitle, { replacement: '_' }).trim();
    const pageTitleSegment = filenamify(pageTitle, { replacement: '_' }).trim();

    return path.join(courseTitleSegment, pageTitleSegment);
}

async function getUonCaptureDetails(requestOptions, parentPath) {
    let html = await getUrlContent(requestOptions);

    if (!html) {
        return null;
    }

    const $ = cheerio.load(html);
    const uonCaptureUrl = new URL($('iframe[src^="https://uoncapture"]').attr('src'));
    const courseId = uonCaptureUrl.searchParams.get('folderID');

    return {
        title: 'UONCapture',
        path: getPagePath($, parentPath),
        rssUrl: `http://uoncapture.ap.panopto.com/Panopto/Podcast/Podcast.ashx?courseid=${courseId}&type=mp4`,
    };
}

async function getUonCapture(requestOptions, parentPath, resources) {
    console.log('\nprocessing UONCapture:', requestOptions.url);

    const details = await getUonCaptureDetails(requestOptions, parentPath);

    if (!details) {
        return;
    }

    const resource = {
        type: 'folder',
        title: details.title,
        path: details.path,
        attachments: [],
        children: [],
        downloadable: false,
    };

    let xml = await getUrlContent({ url: details.rssUrl });

    if (!xml) {
        return;
    }

    const $$ = cheerio.load(xml);
    const items = $$('item');

    for (let i = 0; i < items.length; i++) {
        const el = items[i];

        const title = $$(el).find('title').text().trim();
        const url = $$(el).find('enclosure').attr('url');

        resource.attachments.push({
            title,
            url,
            path: resource.path,
            filename: String(i).padStart(2, '0') + ' - ' + filenamify(title, { replacement: '_' }) + '.mp4',
            downloadable: true,
        });

        console.log('processed:', title);
    }

    resources.push(resource);
}

async function getPageResources(requestOptions, parentPath, resources) {
    console.log('\nprocessing page:', requestOptions.url);

    let html = await getUrlContent(requestOptions);

    if (!html) {
        return;
    }

    const $ = cheerio.load(html);
    const items = $('ul.contentList > li');

    parentPath = getPagePath($, parentPath);

    for (let i = 0; i < items.length; i++) {
        const el = items[i];

        const iconSrc = $(el)
            .find('.item_icon')
            .attr('src');

        const type = getType(iconSrc);

        const title = $(el)
            .find('h3')
            .text()
            .trim();

        const url = $(el)
            .find('h3 a')
            .attr('href');

        const content =
            type === 'text'
                ? $(el)
                      .find('.vtbegenerated')
                      .text()
                      .trim()
                : undefined;

        const currentPath = path.join(
            parentPath,
            String(i).padStart(2, '0') + ' - ' + filenamify(title, { replacement: '_' })
        );

        const resource = {
            type,
            title,
            url: toAbsolute(url),
            content,
            path: currentPath,
            attachments: [],
            children: [],
            downloadable: false,
        };

        if (resource.type === 'text' && content) {
            resource.path = currentPath;
            resource.filename = 'Notes.txt';
            resource.downloadable = true;
        }

        if (resource.type === 'file') {
            resource.attachments.push({
                title: resource.title,
                url: resource.url,
                path: resource.path,
                filename: filenamify(resource.title, { replacement: '_' }),
                downloadable: true,
            });
        }

        const attachments = $(el).find('ul.attachments > li > a');

        if (attachments.length > 0) {
            attachments.each((i, el) => {
                const title = $(el)
                    .text()
                    .trim();
                resource.attachments.push({
                    title,
                    url: toAbsolute($(el).attr('href')),
                    path: currentPath,
                    filename:
                        String(i).padStart(2, '0') + ' - ' + filenamify(title, { replacement: '_' }),
                });
            });
        }

        console.log('processed:', resource.title);

        resources.push(resource);

        if (resource.type === 'folder' && resource.url) {
            await getPageResources(
                { url: resource.url, headers: requestOptions.headers },
                resource.path,
                resources
            );
        }
    }
}

async function getDownloadableCoursePages(requestOptions) {
    let html = await getUrlContent(requestOptions);

    if (!html) {
        return [];
    }

    const $ = cheerio.load(html);
    const items = $('#courseMenuPalette_contents > li > a');

    const pages = [];

    for (let i = 0; i < items.length; i++) {
        const el = items[i];

        const title = $(el)
            .text()
            .trim();

        if (
            ['Course Outline', 'Course Materials', 'Assessment', 'UONCapture'].includes(title)
        ) {
            const url = toAbsolute($(el).attr('href'));
            pages.push({ title, url });
        }
    }

    return pages;
}

async function main() {
    const requestOptions = await getRequestOptions();

    if (!requestOptions) {
        console.log(
            'yum.txt file with Blackboard URL and cookie not found or invalid!'
        );
        process.exit();
    }

    const pages = await getDownloadableCoursePages(requestOptions);

    // Fallback to just processing the url from the curl request if we cound't find the
    // Course Outline, Course Materials, and Assessment pages
    if (pages.length == 0) {
        pages.push({ url: requestOptions.url, title: '' });
    }

    const resources = [];

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        if (page.title === 'UONCapture') {
            await getUonCapture({ url: page.url, headers: requestOptions.headers }, '', resources);
        } else {
            await getPageResources(
                { url: page.url, headers: requestOptions.headers },
                '',
                resources
            );
        }
    }

    const dir = path.join(__dirname, 'downloads');
    const filePath = path.join(dir, 'data.json');

    !fs.existsSync(dir) && fs.mkdirSync(dir);

    fs.writeFileSync(filePath, JSON.stringify(resources, null, '  '), 'utf8');

    console.log('\nArchive data downloaded to', filePath);
    console.log('\nRun `node download.js` to download content');
}

main();
