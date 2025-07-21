import puppeteer from 'puppeteer';
import { getChromeExecutablePath } from './config.js';

export class BrowserManager {
    constructor(headless = false) {
        this.headless = headless;
        this.browser = null;
        this.page = null;
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

        // Windows에서 안정적으로 동작하는 최소한의 인자들
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
            '--disable-blink-features=AutomationControlled'
        ];

        try {
            // 브라우저 시작
            this.browser = await puppeteer.launch({
                headless: this.headless,
                executablePath,
                args: browserArgs,
                ignoreDefaultArgs: ['--enable-automation'],
                timeout: 60000,
                protocolTimeout: 60000
            });

            // 페이지 생성
            this.page = await this.browser.newPage();
            
            // 기본 설정만 적용 (안정성을 위해)
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            console.log('✅ 브라우저 초기화 완료');
            
        } catch (error) {
            console.log('❌ 브라우저 실행 실패:', error.message);
            
            // 대체 방법: 더 간단한 설정으로 재시도
            try {
                console.log('🔄 대체 방법으로 재시도...');
                this.browser = await puppeteer.launch({
                    headless: this.headless,
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
                    timeout: 60000,
                    protocolTimeout: 60000
                });
                
                this.page = await this.browser.newPage();
                console.log('✅ 대체 방법으로 브라우저 초기화 완료');
                
            } catch (secondError) {
                console.log('❌ 모든 방법 실패:', secondError.message);
                throw secondError;
            }
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔚 브라우저 종료');
        }
    }

    getPage() {
        return this.page;
    }

    getBrowser() {
        return this.browser;
    }
} 