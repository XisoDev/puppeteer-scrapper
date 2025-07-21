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
            // Windows에서 경로 정리 - 더 강력한 정리
            if (process.platform === 'win32') {
                executablePath = executablePath.trim().replace(/\s+/g, '');
                // 경로가 올바른지 확인
                if (!executablePath.endsWith('chrome.exe')) {
                    console.log('⚠️  경로가 올바르지 않습니다. executablePath 없이 시도합니다.');
                    executablePath = undefined;
                }
            }
            console.log(`🟢 Chrome 실행 경로: ${executablePath}`);
        } else {
            console.log('⚠️  Chrome 실행 파일을 찾을 수 없습니다. Puppeteer가 올바르게 설치되었는지 확인하세요.');
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

        // Windows에서 더 간단한 설정으로 재시도할 때 사용할 인자들
        const simplifiedArgs = [
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
            this.browser = await puppeteer.launch({
                headless: this.headless,
                executablePath,
                args: browserArgs,
                ignoreDefaultArgs: ['--enable-automation'],
                timeout: 30000,
                protocolTimeout: 60000  // 프로토콜 타임아웃 증가
            });
        } catch (error) {
            console.log('❌ 기본 설정으로 브라우저 실행 실패, 대체 방법 시도...');
            try {
                this.browser = await puppeteer.launch({
                    headless: this.headless,
                    executablePath,
                    args: simplifiedArgs,
                    ignoreDefaultArgs: ['--enable-automation'],
                    timeout: 30000,
                    protocolTimeout: 60000  // 프로토콜 타임아웃 증가
                });
            } catch (secondError) {
                console.log('❌ 대체 방법도 실패, executablePath 없이 시도...');
                this.browser = await puppeteer.launch({
                    headless: this.headless,
                    args: simplifiedArgs,
                    ignoreDefaultArgs: ['--enable-automation'],
                    timeout: 30000,
                    protocolTimeout: 60000  // 프로토콜 타임아웃 증가
                });
            }
        }

        // 페이지 생성 시 더 안정적인 설정
        try {
            this.page = await this.browser.newPage();
            
            // 사용자 에이전트 설정
            await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // 뷰포트 설정
            await this.page.setViewport({ width: 1920, height: 1080 });

            console.log('✅ 브라우저 초기화 완료');
        } catch (pageError) {
            console.log('❌ 페이지 생성 실패:', pageError.message);
            throw pageError;
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