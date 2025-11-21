import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const tauriRoot = path.resolve(projectRoot, 'src-tauri');

const platform = process.platform;
// 从环境变量获取 Target，如果有的话
const targetTriple = process.env.TAURI_TARGET;

console.log(`🚀 Starting desktop build for platform: ${platform}`);
if (targetTriple) {
    console.log(`🎯 Targeting architecture: ${targetTriple}`);
}

// 根据是否有 target 参数决定输出目录
// 默认: src-tauri/target/release
// 指定Target: src-tauri/target/aarch64-pc-windows-msvc/release
const baseBuildDir = targetTriple
    ? path.join(tauriRoot, 'target', targetTriple, 'release')
    : path.join(tauriRoot, 'target', 'release');

try {
    // 构建命令
    let buildCmd = 'tauri build';
    if (targetTriple) {
        buildCmd += ` --target ${targetTriple}`;
    }

    // macOS 特殊处理 (用于构建 App Bundle 这一步)
    if (platform === 'darwin') {
        console.log('📦 Building .app bundle...');
        // macOS 下执行构建
        execSync(`${buildCmd} --bundles app`, { stdio: 'inherit', cwd: projectRoot });

        try {
            execSync('which create-dmg');
        } catch (e) {
            console.error('❌ Error: create-dmg is not installed.');
            process.exit(1);
        }

        const dmgDir = path.join(baseBuildDir, 'bundle/dmg');
        const macosDir = path.join(baseBuildDir, 'bundle/macos');

        if (fs.existsSync(dmgDir)) fs.rmSync(dmgDir, { recursive: true, force: true });

        const files = fs.readdirSync(macosDir);
        const appName = files.find(f => f.endsWith('.app'));
        if (!appName) throw new Error(`Could not find .app bundle in ${macosDir}`);

        const appPath = path.join(macosDir, appName);
        const version = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'))).version;

        // 根据架构命名 dmg
        const arch = targetTriple ? targetTriple.split('-')[0] : process.arch;
        const dmgName = `Tada_${version}_${arch}.dmg`;
        const dmgPath = path.join(baseBuildDir, 'bundle/dmg', dmgName);

        fs.mkdirSync(path.dirname(dmgPath), { recursive: true });

        console.log('💿 Creating custom DMG with create-dmg...');
        const bgImagePath = path.join(tauriRoot, 'icons/dmg-background.png');

        // 注意：如果路径中有空格，需要小心处理引号。这里假设路径安全。
        const createDmgCmd = [
            'create-dmg',
            `--volname "Tada Installer"`,
            `--background "${bgImagePath}"`,
            `--window-pos 200 120`,
            `--window-size 660 400`,
            `--icon-size 100`,
            `--icon "${appName}" 180 170`,
            `--app-drop-link 480 170`,
            `"${dmgPath}"`,
            `"${appPath}"`
        ].join(' ');

        execSync(createDmgCmd, { stdio: 'inherit' });
        console.log(`✅ DMG Created successfully: ${dmgPath}`);

    } else {
        // Windows / Linux
        console.log(`🪟🐧 Standard build...`);
        execSync(buildCmd, { stdio: 'inherit', cwd: projectRoot });
    }
} catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
}