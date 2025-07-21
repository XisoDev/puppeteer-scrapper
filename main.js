// Windows에서 메모리 부족 문제를 방지하기 위한 설정
if (process.platform === 'win32') {
    // Node.js 메모리 제한 증가
    const v8 = require('v8');
    v8.setFlagsFromString('--max-old-space-size=2048');
    
    console.log('🖥️  Windows 환경 감지 - 메모리 최적화 적용');
    console.log('💾 메모리 제한: 2GB');
}

console.log('🚀 병렬 스크래퍼 시작');

import fs from 'fs-extra';
import path from 'path';
import { parseArguments } from './src/config.js';
import { CrawlingManager } from './src/crawling-manager.js';
import { LinkCollector } from './src/link-collector.js';
import { ParallelProcessor } from './src/parallel-processor.js';

class ParallelScraper {
    constructor(options = {}) {
        this.options = options;
        this.crawlingManager = null;
        this.linkCollector = null;
        this.processor = null;
        
        console.log('🔧 병렬 스크래퍼 초기화');
        console.log(`📍 대상 URL: ${options.baseUrl}`);
        console.log(`📁 출력 디렉토리: ${options.outputDir}`);
        console.log(`🔍 최대 깊이: ${options.maxDepth}`);
        console.log(`⚡ 최대 동시 처리: ${options.maxConcurrency}`);
    }

    async init() {
        console.log('🔧 병렬 스크래퍼 초기화 중...');
        
        // 크롤링 매니저 초기화
        this.crawlingManager = new CrawlingManager({
            baseUrl: this.options.baseUrl,
            maxDepth: this.options.maxDepth,
            maxConcurrency: this.options.maxConcurrency,
            prefix: this.options.prefix
        });
        
        // 링크 수집기 초기화
        this.linkCollector = new LinkCollector({
            baseUrl: this.options.baseUrl,
            maxConcurrency: this.options.maxConcurrency,
            prefix: this.options.prefix
        });
        await this.linkCollector.init();
        
        // 병렬 프로세서 초기화
        this.processor = new ParallelProcessor({
            baseUrl: this.options.baseUrl,
            outputDir: this.options.outputDir,
            maxConcurrency: this.options.maxConcurrency,
            prefix: this.options.prefix
        });
        await this.processor.init();
        
        console.log('✅ 병렬 스크래퍼 초기화 완료');
    }

    async crawl() {
        console.log('🚀 병렬 크롤링 시작');
        
        // 1단계: 시작 URL에서 링크 수집
        console.log('\n📋 1단계: 시작 URL에서 링크 수집');
        this.crawlingManager.initializeQueue();
        
        let currentDepth = 0;
        let hasNewLinks = true;
        
        while (hasNewLinks && currentDepth <= this.options.maxDepth) {
            console.log(`\n🔍 ${currentDepth + 1}단계: 깊이 ${currentDepth}에서 링크 수집`);
            
            // 현재 큐에 있는 모든 URL 가져오기
            const currentUrls = [];
            while (!this.crawlingManager.isQueueEmpty()) {
                const item = this.crawlingManager.getNextUrl();
                if (item && item.depth === currentDepth) {
                    currentUrls.push(item.url);
                } else if (item) {
                    // 다른 깊이의 URL은 다시 큐에 넣기
                    this.crawlingManager.addToQueue(item.url, item.depth);
                }
            }
            
            if (currentUrls.length === 0) {
                console.log('📝 더 이상 처리할 URL이 없습니다.');
                break;
            }
            
            console.log(`📝 ${currentUrls.length}개 URL에서 링크 수집 시작`);
            
            // 병렬로 링크 수집
            const result = await this.linkCollector.collectFromUrls(currentUrls, currentDepth);
            
            // 방문한 URL로 표시
            currentUrls.forEach(url => this.crawlingManager.markAsVisited(url));
            
            // 새로운 링크들을 큐에 추가
            let newLinkCount = 0;
            result.links.forEach(link => {
                if (!this.crawlingManager.visitedUrls.has(this.crawlingManager.normalizeUrl(link))) {
                    this.crawlingManager.addToQueue(link, currentDepth + 1);
                    newLinkCount++;
                }
            });
            
            // 에셋 URL들 수집
            result.assets.forEach(asset => {
                this.crawlingManager.addAssetUrl(asset);
            });
            
            console.log(`✅ 깊이 ${currentDepth}: ${result.links.length}개 링크, ${result.assets.length}개 에셋 수집`);
            console.log(`📝 새로운 링크 ${newLinkCount}개 큐에 추가`);
            
            // 수집된 링크들 출력
            this.linkCollector.printCollectedLinks();
            this.linkCollector.printCollectedAssets();
            
            // Windows에서 메모리 정리
            if (process.platform === 'win32') {
                if (global.gc) {
                    global.gc();
                    console.log('🧹 가비지 컬렉션 실행');
                }
            }
            
            currentDepth++;
            
            // 새로운 링크가 없으면 종료
            if (newLinkCount === 0) {
                hasNewLinks = false;
            }
        }
        
        console.log('\n✅ 링크 수집 완료!');
        
        // 2단계: 모든 페이지와 에셋 병렬 저장
        console.log('\n💾 2단계: 모든 페이지와 에셋 병렬 저장');
        
        const allUrls = this.crawlingManager.getAllUrls();
        console.log(`📊 총 ${allUrls.visitedUrls.length}개 페이지, ${allUrls.assetUrls.length}개 에셋 저장 시작`);
        
        // 페이지들 병렬 저장
        const savedPages = await this.processor.savePages(allUrls.visitedUrls);
        
        // 에셋들 병렬 저장
        const savedAssets = await this.processor.saveAssets(allUrls.assetUrls);
        
        console.log(`✅ 저장 완료!`);
        console.log(`📄 페이지: ${savedPages.length}개`);
        console.log(`📦 에셋: ${savedAssets.length}개`);
        
        return {
            pages: savedPages,
            assets: savedAssets,
            totalPages: allUrls.visitedUrls.length,
            totalAssets: allUrls.assetUrls.length
        };
    }

    async generateReport(result) {
        console.log('📊 리포트 생성 중...');
        
        const report = {
            baseUrl: this.options.baseUrl,
            outputDir: this.options.outputDir,
            maxDepth: this.options.maxDepth,
            maxConcurrency: this.options.maxConcurrency,
            crawledAt: new Date().toISOString(),
            statistics: {
                totalPages: result.totalPages,
                totalAssets: result.totalAssets,
                savedPages: result.pages.length,
                savedAssets: result.assets.length
            },
            savedPages: result.pages,
            savedAssets: result.assets
        };
        
        const reportPath = path.join(this.options.outputDir, 'crawl-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`📊 리포트 저장: ${reportPath}`);
    }

    async close() {
        console.log('🔚 병렬 스크래퍼 종료 중...');
        
        if (this.linkCollector) {
            await this.linkCollector.close();
        }
        
        if (this.processor) {
            await this.processor.close();
        }
        
        console.log('✅ 병렬 스크래퍼 종료 완료');
    }
}

async function main() {
    console.log('main() 진입');
    const options = parseArguments();
    console.log('CLI 옵션:', options);
    
    const scraper = new ParallelScraper(options);
    
    try {
        console.log('scraper.init() 호출');
        await scraper.init();
        
        console.log('scraper.crawl() 호출');
        const result = await scraper.crawl();
        
        console.log('scraper.generateReport() 호출');
        await scraper.generateReport(result);
        
    } catch (error) {
        console.error('❌ 크롤링 중 오류 발생:', error);
        console.error(error.stack);
        process.exit(1);
    } finally {
        console.log('scraper.close() 호출');
        await scraper.close();
    }
}

// main 함수 실행
main().catch(console.error);

export default ParallelScraper; 