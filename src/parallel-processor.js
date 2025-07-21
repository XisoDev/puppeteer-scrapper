import fs from 'fs-extra';
import path from 'path';
import { BrowserManager } from './browser.js';
import { convertHtmlLinksToRelative } from './utils.js';

export class ParallelProcessor {
    constructor(options = {}) {
        this.outputDir = options.outputDir || 'dist';
        this.maxConcurrency = options.maxConcurrency || 10;
        this.browsers = [];
        this.baseUrl = options.baseUrl;
        this.prefix = options.prefix || null;
        
        console.log('⚡ 병렬 프로세서 초기화');
        console.log(`📁 출력 디렉토리: ${this.outputDir}`);
        console.log(`⚡ 최대 동시 처리: ${this.maxConcurrency}`);
        if (this.prefix) {
            console.log(`🔍 Prefix: ${this.prefix}`);
        }
    }

    async init() {
        console.log('⚡ 병렬 프로세서 초기화 중...');
        
        // 출력 디렉토리 생성
        await fs.ensureDir(this.outputDir);
        
        // Windows에서 메모리 부족 문제를 방지하기 위해 동시 처리 수 제한
        const adjustedConcurrency = process.platform === 'win32' ? Math.min(this.maxConcurrency, 3) : this.maxConcurrency;
        
        console.log(`🖥️  플랫폼: ${process.platform}`);
        console.log(`⚡ 조정된 동시 처리 수: ${adjustedConcurrency}`);
        
        // 브라우저 풀 생성 (Windows에서는 더 적은 수로)
        for (let i = 0; i < adjustedConcurrency; i++) {
            try {
                const browserManager = new BrowserManager({ headless: true });
                await browserManager.init();
                this.browsers.push(browserManager);
                console.log(`✅ 브라우저 ${i + 1}/${adjustedConcurrency} 초기화 완료`);
                
                // Windows에서 브라우저 간 간격 추가
                if (process.platform === 'win32') {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`❌ 브라우저 ${i + 1} 초기화 실패:`, error.message);
                // 실패한 브라우저는 건너뛰고 계속 진행
            }
        }
        
        console.log(`✅ ${this.browsers.length}개의 브라우저 인스턴스 생성 완료`);
    }

    // 단일 페이지 저장
    async savePage(url) {
        if (this.browsers.length === 0) {
            console.error('❌ 사용 가능한 브라우저가 없습니다.');
            return null;
        }
        
        const browser = this.browsers[Math.floor(Math.random() * this.browsers.length)];
        let page = null;
        
        try {
            console.log(`💾 페이지 저장 중: ${url}`);
            
            // 기존 페이지 재사용 또는 새 페이지 생성
            if (browser.isReady()) {
                page = browser.getPage();
            } else {
                page = await browser.getBrowser().newPage();
            }
            
            // 페이지 로드
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // CSR 렌더링을 위한 대기
            await new Promise(resolve => setTimeout(resolve, 2000));

            // HTML 가져오기
            let html = await page.content();
            
            // URL을 파일 경로로 변환 (쿼리스트링 포함)
            const urlObj = new URL(url);
            let filePath = urlObj.pathname;
            
            // 루트 경로 처리
            if (filePath === '/') {
                filePath = '/index.html';
            } else if (!filePath.endsWith('.html')) {
                // 확장자가 없는 경우 디렉토리로 간주하고 index.html 추가
                if (filePath.endsWith('/')) {
                    filePath += 'index.html';
                } else {
                    // 파일명에 확장자가 없는 경우 디렉토리로 처리
                    filePath += '/index.html';
                }
            }
            
            // 쿼리스트링이 있는 경우 파일명에 포함
            if (urlObj.search) {
                const crypto = require('crypto');
                const queryHash = crypto.createHash('md5').update(urlObj.search).digest('hex').substring(0, 8);
                const pathWithoutExt = filePath.replace(/\.html$/, '');
                filePath = `${pathWithoutExt}-${queryHash}.html`;
                console.log(`🔍 쿼리스트링 처리: ${url} -> ${filePath}`);
            }
            
            // Prefix가 있는 경우 경로에 추가
            if (this.prefix) {
                // prefix가 이미 포함되어 있는지 확인 후 추가
                if (!filePath.startsWith(this.prefix)) {
                    filePath = path.join(this.prefix, filePath.substring(1));
                }
            }

            // 전체 파일 경로 생성
            const fullFilePath = path.join(this.outputDir, filePath);
            await fs.ensureDir(path.dirname(fullFilePath));

            // HTML 내의 링크들을 상대경로로 변경
            html = convertHtmlLinksToRelative(html, this.baseUrl, filePath);

            // HTML 저장
            await fs.writeFile(fullFilePath, html, 'utf8');
            console.log(`✅ 페이지 저장 완료: ${fullFilePath}`);

            return fullFilePath;

        } catch (error) {
            console.error(`❌ 페이지 저장 실패 (${url}):`, error.message);
            return null;
        } finally {
            // 페이지를 닫지 않고 재사용 (메모리 절약)
            if (page && page.url() !== 'about:blank') {
                try {
                    await page.goto('about:blank');
                } catch (e) {
                    // 무시
                }
            }
        }
    }

    // 단일 에셋 저장
    async saveAsset(assetUrl) {
        if (this.browsers.length === 0) {
            console.error('❌ 사용 가능한 브라우저가 없습니다.');
            return null;
        }
        
        const browser = this.browsers[Math.floor(Math.random() * this.browsers.length)];
        let page = null;
        
        try {
            console.log(`💾 에셋 저장 중: ${assetUrl}`);
            
            // 기존 페이지 재사용 또는 새 페이지 생성
            if (browser.isReady()) {
                page = browser.getPage();
            } else {
                page = await browser.getBrowser().newPage();
            }
            
            const urlObj = new URL(assetUrl);
            let assetPath = urlObj.pathname;
            
            // Prefix가 있는 경우 경로에 추가
            if (this.prefix) {
                // prefix가 이미 포함되어 있는지 확인 후 추가
                if (!assetPath.startsWith(this.prefix)) {
                    assetPath = path.join(this.prefix, assetPath.substring(1));
                }
            }

            const fullAssetPath = path.join(this.outputDir, assetPath);
            await fs.ensureDir(path.dirname(fullAssetPath));

            if (await fs.pathExists(fullAssetPath)) {
                console.log(`⏭️  이미 존재하는 에셋: ${fullAssetPath}`);
                return fullAssetPath;
            }

            // 에셋 다운로드
            const response = await page.goto(assetUrl, { 
                timeout: 15000, 
                waitUntil: 'networkidle0' 
            });
            
            if (response && response.ok()) {
                const buffer = await response.buffer();
                await fs.writeFile(fullAssetPath, buffer);
                console.log(`✅ 에셋 저장 완료: ${fullAssetPath}`);
                return fullAssetPath;
            } else {
                console.log(`❌ 에셋 다운로드 실패: ${assetUrl}`);
                return null;
            }

        } catch (error) {
            console.error(`❌ 에셋 저장 실패 (${assetUrl}):`, error.message);
            return null;
        } finally {
            // 페이지를 닫지 않고 재사용 (메모리 절약)
            if (page && page.url() !== 'about:blank') {
                try {
                    await page.goto('about:blank');
                } catch (e) {
                    // 무시
                }
            }
        }
    }

    // 여러 페이지를 병렬로 저장
    async savePages(urls) {
        console.log(`🚀 ${urls.length}개 페이지 병렬 저장 시작`);
        
        // Windows에서 청크 크기 조정
        const chunkSize = process.platform === 'win32' ? Math.min(this.browsers.length, 2) : this.maxConcurrency;
        const chunks = this.chunkArray(urls, chunkSize);
        let totalProcessed = 0;
        const savedFiles = [];
        
        for (const chunk of chunks) {
            const promises = chunk.map(url => this.savePage(url));
            const results = await Promise.allSettled(promises);
            
            // 성공한 결과들 수집
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    savedFiles.push(result.value);
                }
            });
            
            totalProcessed += chunk.length;
            console.log(`📊 진행률: ${totalProcessed}/${urls.length} (${Math.round(totalProcessed/urls.length*100)}%)`);
            
            // Windows에서 더 긴 간격 조절
            const interval = process.platform === 'win32' ? 2000 : 500;
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        console.log(`✅ 페이지 저장 완료! 총 ${savedFiles.length}개 파일 저장`);
        return savedFiles;
    }

    // 여러 에셋을 병렬로 저장
    async saveAssets(assetUrls) {
        console.log(`🚀 ${assetUrls.length}개 에셋 병렬 저장 시작`);
        
        // Windows에서 청크 크기 조정
        const chunkSize = process.platform === 'win32' ? Math.min(this.browsers.length, 2) : this.maxConcurrency;
        const chunks = this.chunkArray(assetUrls, chunkSize);
        let totalProcessed = 0;
        const savedFiles = [];
        
        for (const chunk of chunks) {
            const promises = chunk.map(url => this.saveAsset(url));
            const results = await Promise.allSettled(promises);
            
            // 성공한 결과들 수집
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    savedFiles.push(result.value);
                }
            });
            
            totalProcessed += chunk.length;
            console.log(`📊 진행률: ${totalProcessed}/${assetUrls.length} (${Math.round(totalProcessed/assetUrls.length*100)}%)`);
            
            // Windows에서 더 긴 간격 조절
            const interval = process.platform === 'win32' ? 2000 : 500;
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        console.log(`✅ 에셋 저장 완료! 총 ${savedFiles.length}개 파일 저장`);
        return savedFiles;
    }

    // 배열을 청크로 분할
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    // 모든 브라우저 종료
    async close() {
        console.log('🔚 병렬 프로세서 종료 중...');
        for (const browser of this.browsers) {
            await browser.close();
        }
        console.log('✅ 병렬 프로세서 종료 완료');
    }
} 