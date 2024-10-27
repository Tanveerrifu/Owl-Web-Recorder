// const express = require("express");
// const { chromium } = require("playwright");
// const app = express();
// const path = require("path");

// // Middleware to parse JSON requests
// app.use(express.json());
// // Serve static files from the public directory
// app.use(express.static("public"));

// // Endpoint to record website pages
// app.post("/record", async (req, res) => {
//   const { url } = req.body;

//   if (!url) {
//     return res.status(400).json({ error: "URL is required" });
//   }

//   const browser = await chromium.launch();
//   const context = await browser.newContext({
//     recordVideo: {
//       dir: "videos/", // Directory to save videos
//       size: { width: 1280, height: 720 }, // Set video size
//     },
//   });

//   const recordedPages = [];

//   try {
//     const page = await context.newPage();

//     // Start recording for the main page
//     await page.goto(url);
//     const links = await page.evaluate(() =>
//       Array.from(document.querySelectorAll("a")).map((anchor) => anchor.href)
//     );

//     for (const link of links) {
//       if (link.startsWith(url)) {
//         const pageFileName =
//           link.replace(/https?:\/\/|www\.|\/$/g, "").replace(/\//g, "_") +
//           ".mp4";
//         await page.goto(link);
//         await page.waitForTimeout(3000); // Adjust the time as needed for recording
//         recordedPages.push(pageFileName);
//       }
//     }

//     res.json({ message: "Recording completed", recordedPages });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "An error occurred during recording" });
//   } finally {
//     await browser.close();
//   }
// });

// // Set the port for the server
// const PORT = process.env.PORT || 5000; // Adjusted to port 5000
// // Start the server
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

const express = require('express');
const { chromium } = require('playwright');
const app = express();
const path = require('path');

// Middleware to parse JSON requests
app.use(express.json());
// Serve static files from the public directory
app.use(express.static('public'));

// Endpoint to record website pages
app.post('/record', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const browser = await chromium.launch();
    const context = await browser.newContext({
        recordVideo: {
            dir: 'videos/', // Directory to save videos
            size: { width: 1280, height: 720 }, // Set video size
        },
    });

    const recordedPages = [];

    try {
        const page = await context.newPage();

        // Start recording for the main page
        await page.goto(url);
        const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(anchor => anchor.href));

        // Function to scroll the page
        const scrollPage = async (page) => {
            await page.evaluate(async () => {
                const scrollHeight = document.body.scrollHeight;
                for (let i = 0; i < scrollHeight; i += 100) {
                    window.scrollTo(0, i);
                    await new Promise(resolve => setTimeout(resolve, 100)); // Pause for a moment to load lazy images
                }
            });
        };

        await scrollPage(page);
        const mainPageFileName = url.replace(/https?:\/\/|www\.|\/$/g, '').replace(/\//g, '_') + '.mp4';
        recordedPages.push(mainPageFileName);

        for (const link of links) {
            if (link.startsWith(url)) {
                // Generate a valid filename from the URL
                const pageFileName = link.replace(/https?:\/\/|www\.|\/$/g, '').replace(/\//g, '_') + '.mp4';
                const newPage = await context.newPage();
                await newPage.goto(link);
                await scrollPage(newPage); // Scroll on the new page
                recordedPages.push(pageFileName);
                await newPage.close();
            }
        }

        res.json({ message: 'Recording completed', recordedPages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred during recording' });
    } finally {
        await context.close();
        await browser.close();
    }
});

// Endpoint to list recorded videos
app.get('/videos', (req, res) => {
    const fs = require('fs');
    const videoDir = path.join(__dirname, 'videos');

    fs.readdir(videoDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to list files' });
        }
        const videoFiles = files.filter(file => file.endsWith('.mp4'));
        res.json({ videos: videoFiles });
    });
});

// Set the port for the server
const PORT = process.env.PORT || 5000; // Adjusted to port 5000
// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
