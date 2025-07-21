import puppeteer from 'puppeteer';
import { getChromeExecutablePath } from './config.js';

export class BrowserManager {
    constructor(options = {}) {
        this.headless = options.headless || false;
        this.browser = null;
        this.page = null;
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    async init() {
        console.log('BrowserManager.init() 진입');
        console.log(`🚀 브라우저를 시작합니다...`);

        let executablePath = getChromeExecutablePath();
        if (executablePath) {
            // Windows에서 경로 정리
            if (process.platform === 'win32') {
                executablePath = executablePath.trim().replace(/\s+/g, '');
            }
            console.log(`🟢 Chrome 실행 경로: ${executablePath}`);
        } else {
            console.log('⚠️  Chrome 실행 파일을 찾을 수 없습니다. 시스템 Chrome을 사용합니다.');
        }

        // Windows에서 메모리 부족 문제를 해결하기 위한 최소한의 인자들
        const browserArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-extensions',
            '--no-first-run',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-field-trial-config',
            '--disable-ipc-flooding-protection',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--mute-audio',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--allow-running-insecure-content',
            '--disable-background-networking',
            '--disable-client-side-phishing-detection',
            '--disable-component-extensions-with-background-pages',
            '--disable-features=TranslateUI',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--password-store=basic',
            '--use-mock-keychain',
            '--disable-blink-features=AutomationControlled',
            // 메모리 사용량 최소화를 위한 추가 인자들
            '--disable-javascript',
            '--disable-images',
            '--disable-plugins',
            '--disable-java',
            '--disable-logging',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--disable-background-networking',
            '--disable-client-side-phishing-detection',
            '--disable-component-extensions-with-background-pages',
            '--disable-features=TranslateUI',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--password-store=basic',
            '--use-mock-keychain',
            '--disable-blink-features=AutomationControlled',
            '--memory-pressure-off',
            '--max_old_space_size=512',
            '--js-flags=--max-old-space-size=512'
        ];

        try {
            // 브라우저 시작 - 메모리 사용량 최소화
            this.browser = await puppeteer.launch({
                headless: this.headless,
                executablePath,
                args: browserArgs,
                ignoreDefaultArgs: ['--enable-automation'],
                timeout: 60000,
                protocolTimeout: 60000,
                // 메모리 사용량 제한
                defaultViewport: { width: 800, height: 600 },
                // 프로세스 수 제한
                pipe: true
            });

            // 페이지 생성
            this.page = await this.browser.newPage();
            
            // 메모리 사용량 최소화를 위한 설정
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // 리소스 로딩 제한
            await this.page.setRequestInterception(true);
            this.page.on('request', (req) => {
                if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });
            
            console.log('✅ 브라우저 초기화 완료');
            this.isInitialized = true;
            
        } catch (error) {
            console.log('❌ 브라우저 실행 실패:', error.message);
            
            // 재시도 로직
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 재시도 ${this.retryCount}/${this.maxRetries}...`);
                
                // 잠시 대기 후 재시도
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // 더 간단한 설정으로 재시도
                try {
                    this.browser = await puppeteer.launch({
                        headless: this.headless,
                        args: [
                            '--no-sandbox', 
                            '--disable-setuid-sandbox', 
                            '--disable-dev-shm-usage',
                            '--disable-gpu',
                            '--disable-images',
                            '--disable-javascript',
                            '--memory-pressure-off',
                            '--max_old_space_size=256',
                            '--disable-background-timer-throttling',
                            '--disable-backgrounding-occluded-windows',
                            '--disable-renderer-backgrounding'
                        ],
                        timeout: 60000,
                        protocolTimeout: 60000,
                        pipe: true
                    });
                    
                    this.page = await this.browser.newPage();
                    console.log('✅ 대체 방법으로 브라우저 초기화 완료');
                    this.isInitialized = true;
                    
                } catch (secondError) {
                    console.log('❌ 재시도 실패:', secondError.message);
                    // 재귀적으로 다시 시도
                    return this.init();
                }
            } else {
                console.log('❌ 최대 재시도 횟수 초과');
                throw error;
            }
        }
    }

    async close() {
        if (this.browser) {
            try {
                await this.browser.close();
                console.log('🔚 브라우저 종료');
            } catch (error) {
                console.log('⚠️  브라우저 종료 중 오류:', error.message);
            } finally {
                this.browser = null;
                this.page = null;
                this.isInitialized = false;
            }
        }
    }

    getPage() {
        if (!this.isInitialized || !this.page) {
            throw new Error('브라우저가 초기화되지 않았습니다.');
        }
        return this.page;
    }

    getBrowser() {
        if (!this.isInitialized || !this.browser) {
            throw new Error('브라우저가 초기화되지 않았습니다.');
        }
        return this.browser;
    }

    isReady() {
        return this.isInitialized && this.browser && this.page;
    }
} 