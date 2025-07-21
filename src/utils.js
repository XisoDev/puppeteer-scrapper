import path from 'path';
import { URL } from 'url';

// URL을 파일 경로로 변환하는 함수 (쿼리스트링 포함)
export function urlToFilePath(url, baseUrl) {
    const urlObj = new URL(url);
    const baseUrlObj = new URL(baseUrl);
    
    // baseUrl과 같은 도메인이 아닌 경우 처리
    if (urlObj.origin !== baseUrlObj.origin) {
        return null;
    }
    
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
        const queryHash = require('crypto').createHash('md5').update(urlObj.search).digest('hex').substring(0, 8);
        const pathWithoutExt = filePath.replace(/\.html$/, '');
        filePath = `${pathWithoutExt}-${queryHash}.html`;
    }
    
    return filePath;
}

// 상대경로 계산 함수 (prefix 고려)
export function calculateRelativePath(fromPath, toPath) {
    // fromPath의 디렉토리 경로를 기준으로 toPath의 상대 경로를 계산
    const fromDir = path.posix.dirname(fromPath);
    let relativePath = path.posix.relative(fromDir, toPath);
    
    // 결과 경로가 비어있으면 현재 디렉토리를 가리키도록 설정
    if (relativePath === '') {
        relativePath = './';
    } else if (!relativePath.startsWith('../') && !relativePath.startsWith('./')) {
        // 같은 디렉토리 내의 파일인 경우 './' 추가
        relativePath = './' + relativePath;
    }
    
    return relativePath;
}

// HTML 내의 링크를 상대경로로 변환하는 함수
export function convertHtmlLinksToRelative(html, baseUrl, currentPagePath, prefix = null) {
    const baseUrlObj = new URL(baseUrl);
    
    // 정규식으로 링크 변환
    let convertedHtml = html;
    
    // a 태그 href 변환 (더 정확한 정규식)
    convertedHtml = convertedHtml.replace(
        /href=["'](https?:\/\/[^"']*?)["']/gi,
        (match, href) => {
            if (href && href.startsWith(baseUrl)) {
                const urlObj = new URL(href);
                let targetPath = urlObj.pathname;
                
                // 루트 경로 처리
                if (targetPath === '/') {
                    targetPath = '/index.html';
                } else if (!targetPath.endsWith('.html')) {
                    if (targetPath.endsWith('/')) {
                        targetPath += 'index.html';
                    } else {
                        // 파일명에 확장자가 없는 경우 디렉토리로 처리
                        targetPath += '/index.html';
                    }
                }
                
                // 쿼리스트링이 있는 경우 파일명에 포함
                if (urlObj.search) {
                    const queryHash = require('crypto').createHash('md5').update(urlObj.search).digest('hex').substring(0, 8);
                    const pathWithoutExt = targetPath.replace(/\.html$/, '');
                    targetPath = `${pathWithoutExt}-${queryHash}.html`;
                }
                
                // 상대경로 계산
                const relativeHref = calculateRelativePath(currentPagePath, targetPath);
                
                console.log(`링크 변환: ${href} -> ${relativeHref}`);
                return `href="${relativeHref}"`;
            }
            return match;
        }
    );
    
    // 절대경로 링크도 변환 (baseUrl과 같은 도메인이 아닌 경우)
    convertedHtml = convertedHtml.replace(
        /href=["']\/([^"']*?)["']/gi,
        (match, path) => {
            let targetPath = '/' + path;
            
            // 루트 경로 처리
            if (targetPath === '/') {
                targetPath = '/index.html';
            } else if (!targetPath.endsWith('.html')) {
                if (targetPath.endsWith('/')) {
                    targetPath += 'index.html';
                } else {
                    // 파일명에 확장자가 없는 경우 디렉토리로 처리
                    targetPath += '/index.html';
                }
            }
            
            // 상대경로 계산
            const relativeHref = calculateRelativePath(currentPagePath, targetPath);
            
            console.log(`절대경로 링크 변환: ${path} -> ${relativeHref}`);
            return `href="${relativeHref}"`;
        }
    );
    
    // CSS 링크 변환
    convertedHtml = convertedHtml.replace(
        /<link([^>]*?)href=["']([^"']*?)["']/gi,
        (match, before, href) => {
            if (!href) return match;
            try {
                const absoluteUrl = new URL(href, baseUrl).toString();
                if (absoluteUrl.startsWith(baseUrl)) {
                    const targetPath = urlToFilePath(absoluteUrl, baseUrl);
                    if (targetPath) {
                        const relativeHref = calculateRelativePath(currentPagePath, targetPath);
                        return `<link${before}href="${relativeHref}"`;
                    }
                }
            } catch (e) {
                // Ignore invalid URLs
            }
            return match;
        }
    );

    // 이미지 src 변환
    convertedHtml = convertedHtml.replace(
        /<img([^>]*?)src=["']([^"']*?)["']/gi,
        (match, before, src) => {
            if (!src) return match;
            try {
                const absoluteUrl = new URL(src, baseUrl).toString();
                if (absoluteUrl.startsWith(baseUrl)) {
                    const targetPath = urlToFilePath(absoluteUrl, baseUrl);
                    if (targetPath) {
                        const relativeSrc = calculateRelativePath(currentPagePath, targetPath);
                        return `<img${before}src="${relativeSrc}"`;
                    }
                }
            } catch (e) {
                // Ignore invalid URLs
            }
            return match;
        }
    );

    // 스크립트 src 변환
    convertedHtml = convertedHtml.replace(
        /<script([^>]*?)src=["']([^"']*?)["']/gi,
        (match, before, src) => {
            if (!src) return match;
            try {
                const absoluteUrl = new URL(src, baseUrl).toString();
                if (absoluteUrl.startsWith(baseUrl)) {
                    const targetPath = urlToFilePath(absoluteUrl, baseUrl);
                    if (targetPath) {
                        const relativeSrc = calculateRelativePath(currentPagePath, targetPath);
                        return `<script${before}src="${relativeSrc}"`;
                    }
                }
            } catch (e) {
                // Ignore invalid URLs
            }
            return match;
        }
    );
    
    return convertedHtml;
}

// URL 정규화 함수 (개선된 버전)
export function normalizeUrl(url) {
    try {
        const u = new URL(url);
        u.hash = '';
        // 쿼리스트링은 유지하되 정렬
        if (u.search) {
            const params = new URLSearchParams(u.search);
            const sortedParams = Array.from(params.entries()).sort();
            u.search = new URLSearchParams(sortedParams).toString();
        }
        // 경로 끝의 슬래시 제거 (단, 루트 경로는 유지)
        if (u.pathname !== '/' && u.pathname.endsWith('/')) {
            u.pathname = u.pathname.slice(0, -1);
        }
        return u.toString();
    } catch (e) {
        return url;
    }
} 