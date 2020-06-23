# Blackboard Course Downloader

This tool downloads files and attachments from the **Course Outline**, **Course Materials** and **Assessment** pages in a Blackboard course, neatly organized into folders like they are on Blackboard. It will also download lecture videos from UONCapture (Ponopto).

Because [ain't](https://media.giphy.com/media/10PcMWwtZSYk2k/giphy.gif) [nobody](https://media.giphy.com/media/rX9dPaJHRJt7i/giphy.gif) [got](https://media.giphy.com/media/xT4uQdmP1oK1847R3G/giphy.gif) [time](https://media.giphy.com/media/3ov9jPDMzHPjTklNKw/giphy.gif) [for](https://media.giphy.com/media/xUPGcvWUuhxaQQMme4/giphy.gif) [that](https://media.giphy.com/media/yhKH6Qx7a330c/giphy.gif) manual download.

## Get the ish

- You'll need [Node](https://nodejs.org/en/) and [Yarn](https://yarnpkg.com/lang/en/)
- Clone the repo and `cd` into the cloned directory
- Run `yarn` to install dependencies

## Prep the ish

Since Blackboard doesn't have a (sane) API, we do some manual scraping. For that we need to authenticate. And for that we need to impersonate a browser with some login cookies ([mmmmm yum](https://media.giphy.com/media/Zk9mW5OmXTz9e/giphy.gif)):

- Open Chrome and sign in to Blackboard
- Go to the **Course Materials** page for the course to download
- Open the DevTools - <kbd>Ctrl/Cmd</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> - and go to the **Network** tab
- Refresh the page
- In the **Network** tab, find the request for the **Course Materials** page, right-click and select **Copy** > **Copy as cURL (bash)**
    - See this [screenshot](screenshot.jpg?raw=true) for reference
- Create a file in the repo folder called `yum.txt` and paste in the copied content

## Run the ish

- In the repo directory, run `node archive.js` to create a list of content in the course
- After the archive data is successfully created, run `node download.js` to download all content. Files downloaded from a previous run will be skipped. Delete them to force a re-download.
- Enjoy your [new-found efficiency](http://giphygifs.s3.amazonaws.com/media/DK3nPt4gDanRK/giphy.gif)!
