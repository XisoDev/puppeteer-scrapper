console.log('스크립트 시작');

import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { URL } from 'url';
import { fileURLToPath } from 'url';

// ES 모듈에서 __dirname 사용을 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 윈도우용 Chrome 경로 자동감지 함수
function getChromeExecutablePath() {
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
function parseArguments() {
    console.log('parseArguments() 진입');
    const args = process.argv.slice(2);
    const options = {
        baseUrl: 'https://amuz.co.kr',
        outputDir: 'dist',
        maxDepth: 5,
        headless: false
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
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
        }
    }

    return options;
}

function showHelp() {
    console.log(`
🔍 Amuz Scraper - 웹사이트 크롤링 도구

사용법:
  node scraper.js [옵션]

옵션:
  -u, --url <URL>        크롤링할 기본 URL (기본값: https://amuz.co.kr)
  -o, --output <DIR>     출력 디렉토리 (기본값: dist)
  -d, --depth <NUMBER>   최대 크롤링 깊이 (기본값: 5)
  --headless             헤드리스 모드로 실행
  -h, --help             도움말 표시

예시:
  node scraper.js
  node scraper.js -u https://example.com -o ./output -d 3
  node scraper.js --url https://amuz.co.kr --output ./amuz-offline --depth 5
`);
}

class AmuzScraper {
    constructor(options = {}) {
        console.log('AmuzScraper 생성자 진입', options);
        this.baseUrl = options.baseUrl || 'https://amuz.co.kr';
        this.maxDepth = options.maxDepth || 5;
        this.outputDir = options.outputDir || 'dist';
        this.headless = options.headless || false;
        this.visitedUrls = new Set();
        this.urlQueue = [];
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log('init() 진입');
        console.log(`🚀 브라우저를 시작합니다...`);
        console.log(`📍 대상 URL: ${this.baseUrl}`);
        console.log(`📁 출력 디렉토리: ${this.outputDir}`);
        console.log(`🔍 최대 깊이: ${this.maxDepth}`);

        let executablePath = undefined;
        if (process.platform === 'win32') {
            executablePath = getChromeExecutablePath();
            if (executablePath) {
                console.log(`🟢 Chrome 실행 경로: ${executablePath}`);
            } else {
                console.log('⚠️  Chrome 실행 파일을 찾을 수 없습니다. 시스템 PATH에 등록되어 있거나, 환경변수 CHROME_PATH를 지정하세요.');
            }
        }

        try {
            this.browser = await puppeteer.launch({
                headless: this.headless,
                executablePath,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-field-trial-config',
                    '--disable-ipc-flooding-protection',
                    '--no-default-browser-check',
                    '--no-experiments',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--hide-scrollbars',
                    '--mute-audio',
                    '--no-first-run',
                    '--safebrowsing-disable-auto-update',
                    '--ignore-certificate-errors',
                    '--ignore-ssl-errors',
                    '--ignore-certificate-errors-spki-list',
                    '--allow-running-insecure-content',
                    '--disable-background-networking',
                    '--disable-client-side-phishing-detection',
                    '--disable-component-extensions-with-background-pages',
                    '--disable-features=TranslateUI',
                    '--force-color-profile=srgb',
                    '--metrics-recording-only',
                    '--no-first-run',
                    '--password-store=basic',
                    '--use-mock-keychain',
                    '--disable-blink-features=AutomationControlled'
                ],
                ignoreDefaultArgs: ['--enable-automation'],
                timeout: 30000
            });
        } catch (error) {
            console.log('❌ 기본 설정으로 브라우저 실행 실패, 대체 방법 시도...');
            this.browser = await puppeteer.launch({
                headless: this.headless,
                executablePath,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--ignore-certificate-errors',
                    '--ignore-ssl-errors',
                    '--no-first-run',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-field-trial-config',
                    '--disable-ipc-flooding-protection',
                    '--no-default-browser-check',
                    '--no-experiments',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--hide-scrollbars',
                    '--mute-audio',
                    '--safebrowsing-disable-auto-update',
                    '--allow-running-insecure-content',
                    '--disable-background-networking',
                    '--disable-client-side-phishing-detection',
                    '--disable-component-extensions-with-background-pages',
                    '--disable-features=TranslateUI',
                    '--force-color-profile=srgb',
                    '--metrics-recording-only',
                    '--password-store=basic',
                    '--use-mock-keychain'
                ],
                ignoreDefaultArgs: ['--enable-automation'],
                timeout: 30000
            });
        }

        this.page = await this.browser.newPage();
        
        // 사용자 에이전트 설정
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // 뷰포트 설정
        await this.page.setViewport({ width: 1920, height: 1080 });

        // 출력 디렉토리 생성
        await fs.ensureDir(this.outputDir);
        console.log(`📁 출력 디렉토리 생성: ${this.outputDir}`);
    }

    async extractLinks(pageUrl, depth = 0) {
        console.log(`extractLinks() 진입: url=${pageUrl}, depth=${depth}`);
        if (depth > this.maxDepth || this.visitedUrls.has(pageUrl)) {
            console.log(`extractLinks() 종료: depth 초과 또는 이미 방문함 (${pageUrl})`);
            return [];
        }

        const rootDomain = (new URL(this.baseUrl)).origin;
        console.log('extractLinks() rootDomain:', rootDomain);

        try {
            // 페이지 로드
            await this.page.goto(pageUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // CSR 렌더링을 위한 대기
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 모든 내부 링크 추출 (같은 도메인)
            const links = await this.page.evaluate((rootDomain) => {
                const anchors = document.querySelectorAll('a[href]');
                const extractedLinks = [];
                anchors.forEach(anchor => {
                    const href = anchor.href;
                    if (href && href.startsWith(rootDomain)) {
                        extractedLinks.push({
                            url: href,
                            text: anchor.textContent.trim(),
                            title: anchor.title || ''
                        });
                    }
                });
                return extractedLinks;
            }, rootDomain);

            console.log(`✅ ${pageUrl}에서 ${links.length}개의 링크 발견`);

            // 현재 페이지 저장
            await this.savePage(pageUrl, depth);

            // 다음 뎁스로 큐에 추가
            if (depth < this.maxDepth) {
                for (const link of links) {
                    if (!this.visitedUrls.has(link.url)) {
                        this.urlQueue.push({ url: link.url, depth: depth + 1 });
                    }
                }
            }

            return links;

        } catch (error) {
            console.error(`❌ ${pageUrl} 크롤링 실패:`, error.message);
            return [];
        }
    }

    async savePage(pageUrl, depth) {
        console.log(`savePage() 진입: url=${pageUrl}, depth=${depth}`);
        try {
            // 페이지 HTML 가져오기
            let html = await this.page.content();
            
            // URL을 파일 경로로 변환
            const urlObj = new URL(pageUrl);
            let filePath = urlObj.pathname;
            
            // 루트 경로 처리
            if (filePath === '/') {
                filePath = '/index.html';
            } else if (!filePath.endsWith('.html')) {
                // 디렉토리인 경우 index.html 추가
                if (filePath.endsWith('/')) {
                    filePath += 'index.html';
                } else {
                    filePath += '.html';
                }
            }
            
            // 전체 파일 경로 생성
            const fullFilePath = path.join(this.outputDir, filePath);
            await fs.ensureDir(path.dirname(fullFilePath));

            // 에셋 다운로드
            await this.downloadAssets(pageUrl);

            // HTML 내의 링크들을 상대경로로 변경
            html = await this.convertLinksToRelative(html, pageUrl, filePath);

            // HTML 저장
            await fs.writeFile(fullFilePath, html, 'utf8');
            console.log(`💾 저장됨: ${fullFilePath}`);

            // 메타데이터 저장
            const metadata = {
                url: pageUrl,
                depth: depth,
                savedAt: new Date().toISOString(),
                filePath: fullFilePath
            };

            const metadataPath = fullFilePath.replace('.html', '.json');
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

        } catch (error) {
            console.error(`❌ 페이지 저장 실패 (${pageUrl}):`, error.message);
        }
    }

    async convertLinksToRelative(html, baseUrl, currentPagePath) {
        console.log('convertLinksToRelative() 진입:', { baseUrl, currentPagePath });
        try {
            // 페이지에서 링크 변환 실행
            const convertedHtml = await this.page.evaluate((html, baseUrl, currentPagePath) => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // 현재 페이지의 깊이 계산
                const currentDepth = (currentPagePath.match(/\//g) || []).length - 1;
                const relativePrefix = '../'.repeat(Math.max(0, currentDepth));
                
                // 모든 링크를 상대경로로 변경
                const links = doc.querySelectorAll('a[href]');
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith(baseUrl)) {
                        const url = new URL(href);
                        let relativePath = url.pathname;
                        
                        // 루트 경로 처리
                        if (relativePath === '/') {
                            relativePath = relativePrefix + 'index.html';
                        } else if (!relativePath.endsWith('.html')) {
                            if (relativePath.endsWith('/')) {
                                relativePath += 'index.html';
                            } else {
                                relativePath += '.html';
                            }
                        }
                        
                        // 상대경로로 변경
                        link.setAttribute('href', relativePrefix + relativePath.substring(1));
                    }
                });

                // CSS 링크도 상대경로로 변경
                const cssLinks = doc.querySelectorAll('link[rel="stylesheet"]');
                cssLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('http')) {
                        const url = new URL(href);
                        if (url.origin === new URL(baseUrl).origin) {
                            link.setAttribute('href', relativePrefix + url.pathname.substring(1));
                        }
                    }
                });

                // 이미지 링크도 상대경로로 변경
                const images = doc.querySelectorAll('img[src]');
                images.forEach(img => {
                    const src = img.getAttribute('src');
                    if (src && src.startsWith('http')) {
                        const url = new URL(src);
                        if (url.origin === new URL(baseUrl).origin) {
                            img.setAttribute('src', relativePrefix + url.pathname.substring(1));
                        }
                    }
                });

                // 스크립트 링크도 상대경로로 변경
                const scripts = doc.querySelectorAll('script[src]');
                scripts.forEach(script => {
                    const src = script.getAttribute('src');
                    if (src && src.startsWith('http')) {
                        const url = new URL(src);
                        if (url.origin === new URL(baseUrl).origin) {
                            script.setAttribute('src', relativePrefix + url.pathname.substring(1));
                        }
                    }
                });

                return doc.documentElement.outerHTML;
            }, html, baseUrl, currentPagePath);

            return convertedHtml;
        } catch (error) {
            console.error('❌ 링크 변환 실패:', error.message);
            return html; // 변환 실패시 원본 반환
        }
    }

    async downloadAssets(pageUrl) {
        console.log('downloadAssets() 진입:', pageUrl);
        try {
            // 페이지의 모든 에셋 다운로드
            const assets = await this.page.evaluate((baseUrl) => {
                const assetUrls = new Set();
                
                // CSS 파일들
                document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('http')) {
                        const url = new URL(href);
                        if (url.origin === new URL(baseUrl).origin) {
                            assetUrls.add(href);
                        }
                    }
                });

                // 이미지들
                document.querySelectorAll('img[src]').forEach(img => {
                    const src = img.getAttribute('src');
                    if (src && src.startsWith('http')) {
                        const url = new URL(src);
                        if (url.origin === new URL(baseUrl).origin) {
                            assetUrls.add(src);
                        }
                    }
                });

                // 스크립트들
                document.querySelectorAll('script[src]').forEach(script => {
                    const src = script.getAttribute('src');
                    if (src && src.startsWith('http')) {
                        const url = new URL(src);
                        if (url.origin === new URL(baseUrl).origin) {
                            assetUrls.add(src);
                        }
                    }
                });

                // 폰트 파일들
                document.querySelectorAll('link[rel="preload"], link[rel="prefetch"]').forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('http')) {
                        const url = new URL(href);
                        if (url.origin === new URL(baseUrl).origin) {
                            assetUrls.add(href);
                        }
                    }
                });

                return Array.from(assetUrls);
            }, this.baseUrl);

            console.log(`📦 ${pageUrl}에서 ${assets.length}개의 에셋 발견`);

            // 각 에셋 다운로드
            for (const assetUrl of assets) {
                await this.downloadAsset(assetUrl);
            }

        } catch (error) {
            console.error(`❌ 에셋 다운로드 실패 (${pageUrl}):`, error.message);
        }
    }

    async downloadAsset(assetUrl) {
        console.log('downloadAsset() 진입:', assetUrl);
        try {
            const urlObj = new URL(assetUrl);
            const assetPath = urlObj.pathname;
            
            // 에셋 파일 경로 생성
            const fullAssetPath = path.join(this.outputDir, assetPath);
            await fs.ensureDir(path.dirname(fullAssetPath));

            // 이미 다운로드된 에셋인지 확인
            if (await fs.pathExists(fullAssetPath)) {
                return;
            }

            // 에셋 다운로드
            const response = await this.page.goto(assetUrl, { 
                waitUntil: 'networkidle0',
                timeout: 10000 
            });

            if (response && response.ok()) {
                const buffer = await response.buffer();
                await fs.writeFile(fullAssetPath, buffer);
                console.log(`💾 에셋 저장: ${fullAssetPath}`);
            }

        } catch (error) {
            console.error(`❌ 에셋 다운로드 실패 (${assetUrl}):`, error.message);
        }
    }

    async crawl() {
        console.log('crawl() 진입');
        console.log(`�� ${this.baseUrl} 크롤링 시작 (최대 ${this.maxDepth}뎁스)`);
        
        // 시작 URL을 큐에 추가
        this.urlQueue.push({ url: this.baseUrl, depth: 0 });

        while (this.urlQueue.length > 0) {
            const { url, depth } = this.urlQueue.shift();
            
            if (!this.visitedUrls.has(url)) {
                await this.extractLinks(url, depth);
                
                // 요청 간격 조절 (서버 부하 방지)
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`✅ 크롤링 완료! 총 ${this.visitedUrls.size}개 페이지 방문`);
    }

    async generateReport() {
        console.log('generateReport() 진입');
        const report = {
            totalPages: this.visitedUrls.size,
            maxDepth: this.maxDepth,
            baseUrl: this.baseUrl,
            outputDir: this.outputDir,
            crawledAt: new Date().toISOString(),
            visitedUrls: Array.from(this.visitedUrls)
        };

        const reportPath = path.join(this.outputDir, 'crawl-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`📊 크롤링 리포트 저장: ${reportPath}`);
    }

    async close() {
        console.log('close() 진입');
        if (this.browser) {
            await this.browser.close();
            console.log('🔚 브라우저 종료');
        }
    }
}

async function main() {
    console.log('main() 진입');
    const options = parseArguments();
    console.log('CLI 옵션:', options);
    const scraper = new AmuzScraper(options);
    
    try {
        console.log('scraper.init() 호출');
        await scraper.init();
        console.log('scraper.crawl() 호출');
        await scraper.crawl();
        console.log('scraper.generateReport() 호출');
        await scraper.generateReport();
    } catch (error) {
        console.error('❌ 크롤링 중 오류 발생:', error);
        console.error(error.stack);
        process.exit(1);
    } finally {
        console.log('scraper.close() 호출');
        await scraper.close();
    }
}

// main 함수 항상 실행 (실행 조건 단순화)
main().catch(console.error);

export default AmuzScraper; 