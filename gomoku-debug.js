const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    const errors = [];
    const logs = [];
    page.on('console', msg => {
        const text = msg.text();
        logs.push(`[${msg.type()}] ${text}`);
        if (msg.type() === 'error') {
            errors.push(text);
        }
    });
    page.on('pageerror', err => {
        errors.push('PAGE ERROR: ' + err.message);
        console.log('PAGE ERROR:', err.message);
    });

    const filePath = 'file://' + path.join('D:', 'ZX-Codes', 'webpagegames2.0', 'games', 'gomoku', 'index.html');
    console.log('Opening:', filePath);
    await page.goto(filePath);
    await page.waitForTimeout(2000);

    // Log all console messages
    console.log('\n=== Console Logs ===');
    logs.forEach(l => console.log(l));

    // Check all window objects
    const windowKeys = await page.evaluate(() => {
        return {
            hasGame: typeof game !== 'undefined',
            hasBoardGameAI: typeof BoardGameAI !== 'undefined',
            hasGomoku: typeof Gomoku !== 'undefined',
            windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('game') || k.toLowerCase().includes('ai'))
        };
    });
    console.log('\n=== Window Objects ===');
    console.log(JSON.stringify(windowKeys, null, 2));

    // Check if scripts loaded
    const scriptsLoaded = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script');
        return Array.from(scripts).map(s => ({
            src: s.src,
            loaded: s.src ? true : 'inline'
        }));
    });
    console.log('\n=== Scripts ===');
    console.log(JSON.stringify(scriptsLoaded, null, 2));

    // Check HTML source
    const htmlContent = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
    console.log('\n=== Body Content (first 500 chars) ===');
    console.log(htmlContent);

    // Report errors
    if (errors.length > 0) {
        console.log('\n=== CONSOLE ERRORS ===');
        errors.forEach(e => console.log('ERROR:', e));
    } else {
        console.log('\nNo console errors detected.');
    }

    // Take a screenshot
    await page.screenshot({ path: 'gomoku-screenshot.png', fullPage: true });
    console.log('\nScreenshot saved to: gomoku-screenshot.png');

    await browser.close();
})();
