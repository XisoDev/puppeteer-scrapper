import fs from 'fs-extra';
import path from 'path';

// 윈도우용 Chrome 경로 자동감지 함수
export function getChromeExecutablePath() {
    console.log('getChromeExecutablePath() 진입');
    if (process.env.CHROME_PATH) {
        console.log('CHROME_PATH 환경변수 발견:', process.env.CHROME_PATH);
        return process.env.CHROME_PATH;
    }
    // puppeteer가 설치한 chrome
    const user = process.env.USERPROFILE || process.env.HOME;
    console.log('USERPROFILE/HOME:', user);
    const puppeteerChrome = path.join(user, '.cache', 'puppeteer', 'chrome', 'win64-138.0.7204.94', 'chrome-win64', 'chrome.exe');
    console.log('puppeteerChrome 경로:', puppeteerChrome);
    if (fs.existsSync(puppeteerChrome)) {
        console.log('puppeteer가 설치한 Chrome 발견:', puppeteerChrome);
        return puppeteerChrome;
    }
    // 일반 설치 경로
    const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const p of candidates) {
        console.log('Chrome 경로 후보:', p);
        if (fs.existsSync(p)) {
            console.log('설치된 Chrome 발견:', p);
            return p;
        }
    }
    console.log('Chrome 실행 파일을 찾지 못함');
    return undefined;
}

// CLI 인자 파싱 함수
export function parseArguments() {
    console.log('parseArguments() 진입');
    const args = process.argv.slice(2);
    const options = {
        baseUrl: 'https://amuz.co.kr',
        outputDir: 'dist',
        maxDepth: 5,
        headless: false,
        prefix: null
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--url':
            case '-u':
                options.baseUrl = args[++i] || options.baseUrl;
                break;
            case '--output':
            case '-o':
                options.outputDir = args[++i] || options.outputDir;
                break;
            case '--depth':
            case '-d':
                const depth = parseInt(args[++i]);
                if (!isNaN(depth) && depth > 0) {
                    options.maxDepth = depth;
                }
                break;
            case '--headless':
                options.headless = true;
                break;
            case '--prefix':
            case '-p':
                options.prefix = args[++i] || null;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
        }
    }

    return options;
}

export function showHelp() {
    console.log(`
🔍 Amuz Scraper - 웹사이트 크롤링 도구

사용법:
  node scraper.js [옵션]

옵션:
  -u, --url <URL>        크롤링할 기본 URL (기본값: https://amuz.co.kr)
  -o, --output <DIR>     출력 디렉토리 (기본값: dist)
  -d, --depth <NUMBER>   최대 크롤링 깊이 (기본값: 5)
  -p, --prefix <PATH>    특정 경로 prefix만 크롤링 (예: /docs)
  --headless             헤드리스 모드로 실행
  -h, --help             도움말 표시

예시:
  node scraper.js
  node scraper.js -u https://example.com -o ./output -d 3
  node scraper.js --url https://amuz.co.kr --output ./amuz-offline --depth 5
  node scraper.js -u https://example.com -p /docs
`);
}

export function normalizeUrl(url) {
    try {
        const u = new URL(url);
        u.hash = '';
        // 쿼리스트링은 유지
        if (u.pathname !== '/' && u.pathname.endsWith('/')) {
            u.pathname = u.pathname.slice(0, -1);
        }
        return u.toString();
    } catch (e) {
        return url;
    }
} 