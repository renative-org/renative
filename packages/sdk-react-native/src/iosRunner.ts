import {
    executeAsync,
    getAppFolder,
    getConfigProp,
    doResolve,
    logDefault,
    RnvContext,
    CoreEnvVars,
    fsReadFileSync,
    fsExistsSync,
    logInfo,
    logDebug,
    fsWriteFileSync,
    getContext,
    getCurrentCommand,
    inquirerPrompt,
    RnvEnvContext,
    isOfflineMode,
    logWarning,
} from '@rnv/core';
import { EnvVars } from './env';
import shellQuote from 'shell-quote';
import path from 'path';
import crypto from 'crypto';
import { ObjectEncodingOptions } from 'fs';
import child_process, { ExecFileOptions } from 'child_process';

export const packageReactNativeIOS = (isDev = false) => {
    const c = getContext();
    logDefault('packageBundleForXcode');

    const entryFile = getConfigProp('entryFile');

    if (!c.platform) return;
    // const { maxErrorLength } = c.program.opts();
    const args = [
        'bundle',
        '--platform',
        'ios',
        '--dev',
        isDev,
        '--assets-dest',
        `platformBuilds/${c.runtime.appId}_${c.platform}${c.runtime._platformBuildsSuffix || ''}`,
        '--entry-file',
        // SECURITY-PATCH https://github.com/flexn-io/renative/security/code-scanning/112
        shellQuote.quote([`${entryFile}.js`]),
        '--bundle-output',
        `${getAppFolder()}/main.jsbundle`,
    ];

    if (getConfigProp('enableSourceMaps')) {
        args.push('--sourcemap-output');
        args.push(`${getAppFolder()}/main.jsbundle.map`);
    }

    if (c.program.opts().info) {
        args.push('--verbose');
    }
    return executeAsync(
        `node ${doResolve(c.runtime.runtimeExtraProps?.reactNativePackageName || 'react-native')}/cli.js ${args.join(
            ' '
        )} --config=${c.runtime.runtimeExtraProps?.reactNativeMetroConfigName || 'metro.config.js'}`,
        {
            env: {
                ...CoreEnvVars.BASE(),
                ...CoreEnvVars.RNV_EXTENSIONS(),
                ...EnvVars.RNV_REACT_NATIVE_PATH(),
                ...EnvVars.RNV_APP_ID(),
                ...EnvVars.RNV_SKIP_LINKING(),
            },
        }
    );
};

export const runReactNativeIOS = async (
    c: RnvContext,
    scheme: string,
    runScheme: string,
    extraParamsString: string
) => {
    logDefault('runReactNativeIOS', `scheme:${scheme} runScheme:${runScheme}`);
    // const cmd = `node ${doResolve(
    //     c.runtime.runtimeExtraProps?.reactNativePackageName || 'react-native'
    // )}/local-cli/cli.js run-ios --project-path ${appPath} --scheme ${scheme} --configuration ${runScheme} ${p}`;

    const cmd = `npx react-native run-ios --scheme=${scheme} --mode=${runScheme} --no-packager ${extraParamsString}`;
    const env: RnvEnvContext = {
        ...CoreEnvVars.BASE(),
        ...CoreEnvVars.RNV_EXTENSIONS(),
        ...EnvVars.RCT_METRO_PORT(),
        ...EnvVars.RNV_REACT_NATIVE_PATH(),
        ...EnvVars.RNV_APP_ID(),
        ...EnvVars.RNV_SKIP_LINKING(),
    };

    try {
        // Check if it's an older XCode and show a warning as xcrun commands used
        // to install and launch were introduced in xcode 15
        const opts: ObjectEncodingOptions & ExecFileOptions = { encoding: 'utf8' };
        const child = child_process.spawnSync('xcodebuild', ['-version'], opts);
        const xcodeVersion =
            JSON.stringify(child.stdout).substring(
                JSON.stringify(child.stdout).indexOf('Xcode ') + 6,
                JSON.stringify(child.stdout).indexOf('Build') - 2
            ) || '0';
        if (Number(xcodeVersion) < 15)
            logWarning('Installing application and launching it with an Xcode older than 15 may not work');

        // Inherit full logs
        // return executeAsync(c, cmd, { stdio: 'inherit', silent: true });
        return executeAsync(cmd, {
            env,
        });
    } catch (e) {
        if (typeof e === 'string') {
            return Promise.reject(e);
        } else if (e instanceof Error) {
            return Promise.reject(e.message);
        }
    }
};
export const generateChecksum = (str: string, algorithm?: string, encoding?: 'base64' | 'base64url' | 'hex') =>
    crypto
        .createHash(algorithm || 'md5')
        .update(str, 'utf8')
        .digest(encoding || 'hex');

const generateCombinedChecksum = () => {
    const c = getContext();
    const appFolder = getAppFolder();

    const podContentChecksum = generateChecksum(fsReadFileSync(path.join(appFolder, 'Podfile')).toString());
    const pluginVersionsChecksum = generateChecksum(JSON.stringify(c.runtime.pluginVersions));

    const combinedChecksum = podContentChecksum + pluginVersionsChecksum;
    return combinedChecksum;
};

const checkIfPodsIsRequired = (
    c: RnvContext,
    forceUpdatePods: boolean
): { result: boolean; reason: string; code: number } => {
    if (isOfflineMode()) {
        return { result: false, reason: 'You passed --offline option', code: 7 };
    }
    if (c.runtime._skipNativeDepResolutions) {
        return { result: false, reason: `Command ${getCurrentCommand(true)} explicitly skips pod checks`, code: 1 };
    }
    if (forceUpdatePods) {
        return { result: true, reason: 'You passed --updatePods option', code: 2 };
    }
    const appFolder = getAppFolder();

    const podLockPath = path.join(appFolder, 'Podfile.lock');
    if (!fsExistsSync(podLockPath)) {
        return { result: true, reason: 'Podfile.lock does not exist', code: 3 };
    }

    const podChecksumPath = path.join(appFolder, 'Podfile.checksum');
    if (!fsExistsSync(podChecksumPath)) {
        return { result: true, reason: 'Podfile.checksum does not exist', code: 4 };
    }
    const podChecksum = fsReadFileSync(podChecksumPath).toString();
    const combinedChecksum = generateCombinedChecksum();

    if (podChecksum !== combinedChecksum) {
        return { result: true, reason: 'Podfile and/or plugins versions have changed', code: 5 };
    }

    return { result: false, reason: 'Podfile.checksum matches current value', code: 6 };
};

const updatePodsChecksum = () => {
    logDefault('updatePodsChecksum');
    const appFolder = getAppFolder();
    const podChecksumPath = path.join(appFolder, 'Podfile.checksum');

    const combinedChecksum = generateCombinedChecksum();
    if (fsExistsSync(podChecksumPath)) {
        const existingContent = fsReadFileSync(podChecksumPath).toString();
        if (existingContent !== combinedChecksum) {
            logDebug(`updatePodsChecksum:${combinedChecksum}`);
            return fsWriteFileSync(podChecksumPath, combinedChecksum);
        }
        return true;
    }
    logDebug(`updatePodsChecksum:${combinedChecksum}`);
    return fsWriteFileSync(podChecksumPath, combinedChecksum);
};

export const runCocoaPods = async (forceUpdatePods: boolean) => {
    const c = getContext();
    logDefault('runCocoaPods', `forceUpdate:${!!forceUpdatePods}`);

    const checkResult = await checkIfPodsIsRequired(c, forceUpdatePods);

    if (!checkResult.result) {
        logInfo(`Skipping pod action. Reason: ${checkResult.reason}`);
        return false;
    }

    // logInfo(`Will execute pod command. Reason: ${checkResult.reason}`);

    const appFolder = getAppFolder();

    if (!fsExistsSync(appFolder)) {
        return Promise.reject(`Location ${appFolder} does not exists!`);
    }

    const option1 = 'Continue with pod action (recommended)';
    const option2 = 'Skip pod action';
    const option3 = "Skip and don't ask again";

    const runPods = async () => {
        await executeAsync('bundle install');

        const env = {
            ...CoreEnvVars.BASE(),
            ...EnvVars.RNV_REACT_NATIVE_PATH(),
            ...EnvVars.RCT_NEW_ARCH_ENABLED(),
            ...EnvVars.RNV_SKIP_LINKING(),
            ...EnvVars.RNV_FLIPPER_ENABLED(),
        };

        if (forceUpdatePods) {
            await executeAsync('bundle exec pod update', {
                cwd: appFolder,
                env,
            });
        } else {
            await executeAsync('bundle exec pod install', {
                cwd: appFolder,
                env,
            });
        }

        updatePodsChecksum();
    };

    if (checkResult.code === 3) {
        //If Podfile.lock does not exist let's not wait for confirmation
        logInfo(`${checkResult.reason}. Will execute pod actions...`);
        return runPods();
    }

    const { selectedOption } = await inquirerPrompt({
        name: 'selectedOption',
        type: 'list',
        message: `${checkResult.reason}`,
        choices: [option1, option2, option3],
        default: option1,
    });

    if (selectedOption === option1) {
        return runPods();
    } else if (selectedOption === option2) {
        return false;
    }

    updatePodsChecksum();
    return false;
};
