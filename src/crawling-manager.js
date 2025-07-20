import { EventEmitter } from 'events';
import { URL } from 'url';

export class CrawlingManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.baseUrl = options.baseUrl;
        this.maxDepth = options.maxDepth || 5;
        this.maxConcurrency = options.maxConcurrency || 10;
        this.prefix = options.prefix || null;
        this.visitedUrls = new Set();
        this.urlQueue = [];
        this.assetUrls = new Set();
        this.linkCollector = null;
        this.assetCollector = null;
        this.processor = null;
        
        // URL 정규화
        this.baseUrlObj = new URL(this.baseUrl);
        this.startUrl = this.baseUrl;
        
        // 시작 경로가 루트가 아닌 경우 처리
        if (this.baseUrlObj.pathname !== '/') {
            if (!this.baseUrlObj.pathname.endsWith('/')) {
                this.startUrl = this.baseUrl + '/';
            } else {
                this.startUrl = this.baseUrl;
            }
        }
        
        console.log('🔗 크롤링 매니저 초기화');
        console.log(`📍 시작 URL: ${this.startUrl}`);
        console.log(`🔍 최대 깊이: ${this.maxDepth}`);
        console.log(`⚡ 최대 동시 처리: ${this.maxConcurrency}`);
        if (this.prefix) {
            console.log(`🔍 Prefix 필터: ${this.prefix}`);
        }
    }

    // URL을 큐에 추가
    addToQueue(url, depth = 0) {
        const normalizedUrl = this.normalizeUrl(url);
        
        // prefix 필터 적용
        if (this.prefix) {
            const urlObj = new URL(normalizedUrl);
            // prefix로 시작하거나 prefix의 하위 경로인 경우 포함
            if (!urlObj.pathname.startsWith(this.prefix) && !urlObj.pathname.includes(this.prefix.substring(1))) {
                console.log(`🚫 Prefix 필터로 제외: ${normalizedUrl}`);
                return;
            }
        }
        
        if (!this.visitedUrls.has(normalizedUrl) && depth <= this.maxDepth) {
            this.urlQueue.push({ url: normalizedUrl, depth });
            console.log(`📝 큐에 추가: ${normalizedUrl} (깊이: ${depth})`);
        }
    }

    // URL 정규화
    normalizeUrl(url) {
        try {
            const u = new URL(url);
            u.hash = '';
            if (u.pathname !== '/' && u.pathname.endsWith('/')) {
                u.pathname = u.pathname.slice(0, -1);
            }
            return u.toString();
        } catch (e) {
            return url;
        }
    }

    // 큐에서 URL 가져오기
    getNextUrl() {
        return this.urlQueue.shift();
    }

    // 방문한 URL로 표시
    markAsVisited(url) {
        this.visitedUrls.add(this.normalizeUrl(url));
    }

    // 에셋 URL 추가
    addAssetUrl(url) {
        this.assetUrls.add(this.normalizeUrl(url));
    }

    // 링크 URL 추가
    addLinkUrl(url, depth) {
        const normalizedUrl = this.normalizeUrl(url);
        
        // prefix 필터 적용
        if (this.prefix) {
            const urlObj = new URL(normalizedUrl);
            // prefix로 시작하거나 prefix의 하위 경로인 경우 포함
            if (!urlObj.pathname.startsWith(this.prefix) && !urlObj.pathname.includes(this.prefix.substring(1))) {
                return;
            }
        }
        
        if (!this.visitedUrls.has(normalizedUrl) && depth <= this.maxDepth) {
            this.urlQueue.push({ url: normalizedUrl, depth });
        }
    }

    // 큐가 비어있는지 확인
    isQueueEmpty() {
        return this.urlQueue.length === 0;
    }

    // 큐 크기 반환
    getQueueSize() {
        return this.urlQueue.length;
    }

    // 방문한 URL 수 반환
    getVisitedCount() {
        return this.visitedUrls.size;
    }

    // 에셋 URL 수 반환
    getAssetCount() {
        return this.assetUrls.size;
    }

    // 상태 리포트
    getStatus() {
        return {
            visitedUrls: this.visitedUrls.size,
            queueSize: this.urlQueue.length,
            assetUrls: this.assetUrls.size,
            maxDepth: this.maxDepth,
            maxConcurrency: this.maxConcurrency
        };
    }

    // 모든 URL과 에셋 URL 반환
    getAllUrls() {
        return {
            visitedUrls: Array.from(this.visitedUrls),
            assetUrls: Array.from(this.assetUrls)
        };
    }

    // 큐 초기화
    initializeQueue() {
        this.urlQueue = [{ url: this.startUrl, depth: 0 }];
        console.log(`🚀 큐 초기화: ${this.startUrl}`);
    }
} 