import puppeteer from 'puppeteer';
import { BrowserManager } from './browser.js';

export class LinkCollector {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl;
        this.maxConcurrency = options.maxConcurrency || 10;
        this.prefix = options.prefix || null;
        this.browserManager = null;
        this.browsers = [];
        this.collectedLinks = new Set();
        this.collectedAssets = new Set();
        
        console.log('🔗 링크 수집기 초기화');
        console.log(`📍 기본 URL: ${this.baseUrl}`);
        console.log(`⚡ 최대 동시 처리: ${this.maxConcurrency}`);
        if (this.prefix) {
            console.log(`🔍 Prefix 필터: ${this.prefix}`);
        }
    }

    async init() {
        console.log('🔗 링크 수집기 초기화 중...');
        
        // 브라우저 풀 생성
        for (let i = 0; i < this.maxConcurrency; i++) {
            const browserManager = new BrowserManager({ headless: true });
            await browserManager.init();
            this.browsers.push(browserManager);
        }
        
        console.log(`✅ ${this.maxConcurrency}개의 브라우저 인스턴스 생성 완료`);
    }

    // 단일 페이지에서 링크와 에셋 수집
    async collectFromPage(url, depth = 0) {
        const browser = this.browsers[Math.floor(Math.random() * this.browsers.length)];
        const page = await browser.browser.newPage();
        
        try {
            console.log(`🔍 링크 수집 중: ${url}`);
            
            // 페이지 로드
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // CSR 렌더링을 위한 대기
            await new Promise(resolve => setTimeout(resolve, 2000));

            const rootDomain = (new URL(this.baseUrl)).origin;
            
            // 링크와 에셋 수집
            const result = await page.evaluate((rootDomain, prefix) => {
                const links = new Set();
                const assets = new Set();
                
                // 모든 링크 수집
                document.querySelectorAll('a[href]').forEach(anchor => {
                    const href = anchor.href;
                    if (href && href.startsWith(rootDomain)) {
                        // prefix 필터 적용
                        if (prefix) {
                            const urlObj = new URL(href);
                            // prefix로 시작하거나 prefix의 하위 경로인 경우 포함
                            if (!urlObj.pathname.startsWith(prefix) && !urlObj.pathname.includes(prefix.substring(1))) {
                                return; // prefix와 일치하지 않으면 건너뛰기
                            }
                        }
                        links.add(href);
                    }
                });
                
                // CSS 파일들
                document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                    let href = link.getAttribute('href');
                    if (href) {
                        if (href.startsWith('http')) {
                            assets.add(href);
                        } else if (href.startsWith('/')) {
                            assets.add(rootDomain + href);
                        }
                    }
                });
                
                // 이미지들
                document.querySelectorAll('img[src]').forEach(img => {
                    let src = img.getAttribute('src');
                    if (src) {
                        if (src.startsWith('http')) {
                            assets.add(src);
                        } else if (src.startsWith('/')) {
                            assets.add(rootDomain + src);
                        }
                    }
                });
                
                // 스크립트들
                document.querySelectorAll('script[src]').forEach(script => {
                    let src = script.getAttribute('src');
                    if (src) {
                        if (src.startsWith('http')) {
                            assets.add(src);
                        } else if (src.startsWith('/')) {
                            assets.add(rootDomain + src);
                        }
                    }
                });
                
                // 폰트 등 preload, prefetch
                document.querySelectorAll('link[rel="preload"], link[rel="prefetch"]').forEach(link => {
                    let href = link.getAttribute('href');
                    if (href) {
                        if (href.startsWith('http')) {
                            assets.add(href);
                        } else if (href.startsWith('/')) {
                            assets.add(rootDomain + href);
                        }
                    }
                });
                
                return {
                    links: Array.from(links),
                    assets: Array.from(assets)
                };
            }, rootDomain, this.prefix);

            // 결과 처리
            result.links.forEach(link => this.collectedLinks.add(link));
            result.assets.forEach(asset => this.collectedAssets.add(asset));
            
            console.log(`✅ ${url}에서 ${result.links.length}개 링크, ${result.assets.length}개 에셋 수집`);
            
            return {
                links: result.links,
                assets: result.assets
            };

        } catch (error) {
            console.error(`❌ ${url} 링크 수집 실패:`, error.message);
            return { links: [], assets: [] };
        } finally {
            await page.close();
        }
    }

    // 여러 페이지에서 병렬로 링크 수집
    async collectFromUrls(urls, depth = 0) {
        console.log(`🚀 ${urls.length}개 URL에서 병렬 링크 수집 시작`);
        
        const chunks = this.chunkArray(urls, this.maxConcurrency);
        let totalProcessed = 0;
        
        for (const chunk of chunks) {
            const promises = chunk.map(url => this.collectFromPage(url, depth));
            const results = await Promise.allSettled(promises);
            
            totalProcessed += chunk.length;
            console.log(`📊 진행률: ${totalProcessed}/${urls.length} (${Math.round(totalProcessed/urls.length*100)}%)`);
            
            // 요청 간격 조절
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`✅ 링크 수집 완료!`);
        console.log(`📊 총 수집된 링크: ${this.collectedLinks.size}개`);
        console.log(`📊 총 수집된 에셋: ${this.collectedAssets.size}개`);
        
        return {
            links: Array.from(this.collectedLinks),
            assets: Array.from(this.collectedAssets)
        };
    }

    // 배열을 청크로 분할
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    // 수집된 링크들 출력
    printCollectedLinks() {
        console.log('\n📋 수집된 링크 목록:');
        console.log('='.repeat(50));
        Array.from(this.collectedLinks).forEach((link, index) => {
            console.log(`${index + 1}. ${link}`);
        });
        console.log('='.repeat(50));
    }

    // 수집된 에셋들 출력
    printCollectedAssets() {
        console.log('\n📦 수집된 에셋 목록:');
        console.log('='.repeat(50));
        Array.from(this.collectedAssets).forEach((asset, index) => {
            console.log(`${index + 1}. ${asset}`);
        });
        console.log('='.repeat(50));
    }

    // 모든 브라우저 종료
    async close() {
        console.log('🔚 링크 수집기 종료 중...');
        for (const browser of this.browsers) {
            await browser.close();
        }
        console.log('✅ 링크 수집기 종료 완료');
    }
} 