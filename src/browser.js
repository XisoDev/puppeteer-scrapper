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

        let executablePath = undefined;
        if (process.platform === 'win32') {
            executablePath = getChromeExecutablePath();
            if (executablePath) {
                console.log(`🟢 Chrome 실행 경로: ${executablePath}`);
            } else {
                console.log('⚠️  Chrome 실행 파일을 찾을 수 없습니다. 시스템 PATH에 등록되어 있거나, 환경변수 CHROME_PATH를 지정하세요.');
            }
        }

        const browserArgs = [
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
            '--password-store=basic',
            '--use-mock-keychain',
            '--disable-blink-features=AutomationControlled'
        ];

        try {
            this.browser = await puppeteer.launch({
                headless: this.headless,
                executablePath,
                args: browserArgs,
                ignoreDefaultArgs: ['--enable-automation'],
                timeout: 30000
            });
        } catch (error) {
            console.log('❌ 기본 설정으로 브라우저 실행 실패, 대체 방법 시도...');
            this.browser = await puppeteer.launch({
                headless: this.headless,
                executablePath,
                args: browserArgs.slice(0, 15), // 간소화된 인자들
                ignoreDefaultArgs: ['--enable-automation'],
                timeout: 30000
            });
        }

        this.page = await this.browser.newPage();
        
        // 사용자 에이전트 설정
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // 뷰포트 설정
        await this.page.setViewport({ width: 1920, height: 1080 });

        console.log('✅ 브라우저 초기화 완료');
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