const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const { URL } = require('url');

// CLI 인자 파싱 함수
function parseArguments() {
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
        console.log('🚀 브라우저를 시작합니다...');
        console.log(`📍 대상 URL: ${this.baseUrl}`);
        console.log(`📁 출력 디렉토리: ${this.outputDir}`);
        console.log(`🔍 최대 깊이: ${this.maxDepth}`);
        
        this.browser = await puppeteer.launch({
            headless: this.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

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
        if (depth > this.maxDepth || this.visitedUrls.has(pageUrl)) {
            return [];
        }

        console.log(`🔍 ${depth}뎁스 - ${pageUrl} 크롤링 중...`);
        this.visitedUrls.add(pageUrl);

        try {
            // 페이지 로드
            await this.page.goto(pageUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // CSR 렌더링을 위한 대기
            await this.page.waitForTimeout(3000);

            // 모든 링크 추출
            const links = await this.page.evaluate((baseUrl) => {
                const anchors = document.querySelectorAll('a[href]');
                const extractedLinks = [];

                anchors.forEach(anchor => {
                    const href = anchor.href;
                    if (href && href.startsWith(baseUrl)) {
                        extractedLinks.push({
                            url: href,
                            text: anchor.textContent.trim(),
                            title: anchor.title || ''
                        });
                    }
                });

                return extractedLinks;
            }, this.baseUrl);

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
        try {
            // 페이지 HTML 가져오기
            const html = await this.page.content();
            
            // URL을 파일명으로 변환
            const urlObj = new URL(pageUrl);
            let fileName = urlObj.pathname;
            if (fileName === '/') fileName = '/index';
            if (!fileName.endsWith('.html')) fileName += '.html';
            
            // 파일 경로 생성
            const filePath = path.join(this.outputDir, `${depth}_depth`, fileName);
            await fs.ensureDir(path.dirname(filePath));

            // HTML 저장
            await fs.writeFile(filePath, html, 'utf8');
            console.log(`💾 저장됨: ${filePath}`);

            // 메타데이터 저장
            const metadata = {
                url: pageUrl,
                depth: depth,
                savedAt: new Date().toISOString(),
                filePath: filePath
            };

            const metadataPath = filePath.replace('.html', '.json');
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

        } catch (error) {
            console.error(`❌ 페이지 저장 실패 (${pageUrl}):`, error.message);
        }
    }

    async crawl() {
        console.log(`🎯 ${this.baseUrl} 크롤링 시작 (최대 ${this.maxDepth}뎁스)`);
        
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
        if (this.browser) {
            await this.browser.close();
            console.log('🔚 브라우저 종료');
        }
    }
}

async function main() {
    const options = parseArguments();
    const scraper = new AmuzScraper(options);
    
    try {
        await scraper.init();
        await scraper.crawl();
        await scraper.generateReport();
    } catch (error) {
        console.error('❌ 크롤링 중 오류 발생:', error);
        process.exit(1);
    } finally {
        await scraper.close();
    }
}

// 스크립트 실행
if (require.main === module) {
    main().catch(console.error);
}

module.exports = AmuzScraper; 