import { packageReactNativeIOS } from '../iosRunner';
import {
    executeAsync,
    getContext,
    getAppFolder,
    fsExistsSync,
    logInfo,
    inquirerPrompt,
    getCurrentCommand,
    fsWriteFileSync,
    fsReadFileSync,
} from '@rnv/core';
import { generateChecksum, runCocoaPods } from '../iosRunner';

const ctx = {
    platform: 'ios',
    runtime: {
        runtimeExtraProps: {
            reactNativePackageName: 'react-native',
            reactNativeMetroConfigName: 'metro.config.js',
        },
        appId: 'com.test',
    },
    buildConfig: {
        platforms: {
            ios: {
                entryFile: 'index',
            },
        },
    },
    program: {
        opts: jest.fn().mockReturnValue({}),
    },
};

jest.mock('../env', () => ({
    ...jest.requireActual('../env'),
    EnvVars: {
        ...jest.requireActual('../env').EnvVars,
        RNV_APP_ID: jest.fn(() => ({ RNV_APP_ID: 'mockedAppId' })),
        RNV_REACT_NATIVE_PATH: jest.fn(() => ({ RNV_REACT_NATIVE_PATH: 'mockedReactNativePath' })),
        RNV_SKIP_LINKING: jest.fn(() => ({ RNV_SKIP_LINKING: 'mockedSkipLinking' })),
    },
}));

jest.mock('@rnv/core', () => ({
    ...jest.requireActual('@rnv/core'),
    executeAsync: jest.fn(),
    getContext: jest.fn(),
    getConfigProp: jest.fn().mockImplementation((prop) => {
        if (prop === 'entryFile') return 'index';
        if (prop === 'enableSourceMaps') return true;
    }),
    getAppFolder: jest.fn().mockReturnValue('/mocked/app/folder'),
    CoreEnvVars: {
        BASE: jest.fn(() => ({ BASE_VAR: 'mockedBaseValue' })),
        RNV_EXTENSIONS: jest.fn(() => ({ EXTENSION_VAR: 'mockedExtensionValue' })),
    },
    doResolve: jest.fn().mockReturnValue('path/to/react-native'),
    fsReadFileSync: jest.fn(),
    fsExistsSync: jest.fn(),
    fsWriteFileSync: jest.fn(),
    logDefault: jest.fn(),
    logInfo: jest.fn(),
    inquirerPrompt: jest.fn(),
    getCurrentCommand: jest.fn(),
    isOfflineMode: jest.fn(),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('packageReactNativeIOS', () => {
    it('returns if platform isn`t specified', async () => {
        // GIVEN
        (getContext as jest.Mock).mockReturnValue({ ...ctx, platform: undefined });

        // WHEN
        packageReactNativeIOS(true);

        // THEN
        expect(executeAsync).not.toHaveBeenCalled();
    });

    it('calls executeAsync with correct arguments when isDev is true', async () => {
        // GIVEN
        (getContext as jest.Mock).mockReturnValue(ctx);
        // WHEN
        packageReactNativeIOS(true);

        // THEN
        expect(executeAsync).toHaveBeenCalledWith(
            'node path/to/react-native/cli.js bundle --platform ios --dev true --assets-dest platformBuilds/com.test_ios --entry-file index.js --bundle-output /mocked/app/folder/main.jsbundle --sourcemap-output /mocked/app/folder/main.jsbundle.map --config=metro.config.js',
            {
                env: {
                    BASE_VAR: 'mockedBaseValue',
                    EXTENSION_VAR: 'mockedExtensionValue',
                    RNV_APP_ID: 'mockedAppId',
                    RNV_REACT_NATIVE_PATH: 'mockedReactNativePath',
                    RNV_SKIP_LINKING: 'mockedSkipLinking',
                },
            }
        );
    });
    it('calls executeAsync with correct arguments when isDev is false', async () => {
        // GIVEN
        (getContext as jest.Mock).mockReturnValue(ctx);

        // WHEN
        packageReactNativeIOS(false);

        // THEN
        expect(executeAsync).toHaveBeenCalledWith(
            'node path/to/react-native/cli.js bundle --platform ios --dev false --assets-dest platformBuilds/com.test_ios --entry-file index.js --bundle-output /mocked/app/folder/main.jsbundle --sourcemap-output /mocked/app/folder/main.jsbundle.map --config=metro.config.js',
            {
                env: {
                    BASE_VAR: 'mockedBaseValue',
                    EXTENSION_VAR: 'mockedExtensionValue',
                    RNV_APP_ID: 'mockedAppId',
                    RNV_REACT_NATIVE_PATH: 'mockedReactNativePath',
                    RNV_SKIP_LINKING: 'mockedSkipLinking',
                },
            }
        );
    });
    it('should generate checksum of Podfile content and plugin versions', () => {
        // GIVEN
        const mockPodfileChecksum = 'podfilechecksum';
        const mockPluginVersionsChecksum = 'pluginversionschecksum';

        //THEN
        expect(`${generateChecksum(mockPodfileChecksum)}${generateChecksum(mockPluginVersionsChecksum)}`).toBe(
            '57ca0a750b367e0b100abae884b7b35151babb11c8c9c4de2375cf27cf03fd69'
        ); // expecting same input to always equal same checksum
    });
});

describe('runCocoaPods', () => {
    beforeEach(() => {
        (logInfo as jest.Mock).mockImplementation(jest.fn());
        (fsExistsSync as jest.Mock).mockReturnValue(false);
        (executeAsync as jest.Mock).mockImplementation(jest.fn());
        (inquirerPrompt as jest.Mock).mockResolvedValue({ selectedOption: 'Continue with pod action (recommended)' });
    });

    it('should skip pod action if checkIfPodsIsRequired returns false', async () => {
        //GIVEN
        (getCurrentCommand as jest.Mock).mockReturnValue('currentCommand');
        (getContext as jest.Mock).mockReturnValue({ runtime: { _skipNativeDepResolutions: true } });

        //WHEN
        const result = await runCocoaPods(false);

        //THEN
        expect(logInfo).toHaveBeenCalledWith(
            'Skipping pod action. Reason: Command currentCommand explicitly skips pod checks'
        );
        expect(result).toBe(false);
    });

    it('should reject if app folder does not exist', async () => {
        //GIVEN
        (fsExistsSync as jest.Mock).mockReturnValue(false);
        (getAppFolder as jest.Mock).mockReturnValue('/fake/app/folder');
        (getContext as jest.Mock).mockReturnValue({ runtime: { _skipNativeDepResolutions: false } });

        //THEN
        await expect(runCocoaPods(true)).rejects.toEqual('Location /fake/app/folder does not exists!');
    });

    it('should execute pod update if forceUpdatePods is true', async () => {
        //GIVEN
        (fsWriteFileSync as jest.Mock).mockReturnValue(true);
        (fsReadFileSync as jest.Mock).mockReturnValue('appFolder/Podfile');
        (fsExistsSync as jest.Mock).mockReturnValue(true);
        (getAppFolder as jest.Mock).mockReturnValue('/real/app/folder');
        (getContext as jest.Mock).mockReturnValue({
            runtime: { _skipNativeDepResolutions: false, pluginVersions: { 1: 1 } },
        });

        //WHEN
        await runCocoaPods(true);

        //THEN
        expect(executeAsync).toHaveBeenCalledWith('bundle install');
        expect(executeAsync).toHaveBeenLastCalledWith(
            'bundle exec pod update',
            expect.objectContaining({ cwd: '/real/app/folder' })
        );
    });

    it('should skip pod action, if chosing that in the inquirer prompt', async () => {
        //GIVEN
        (fsWriteFileSync as jest.Mock).mockReturnValue(true);
        (fsReadFileSync as jest.Mock).mockReturnValue('appFolder/Podfile');
        (fsExistsSync as jest.Mock).mockReturnValue(true);
        (getAppFolder as jest.Mock).mockReturnValue('/real/app/folder');
        (getContext as jest.Mock).mockReturnValue({
            runtime: { _skipNativeDepResolutions: false, pluginVersions: { 1: 1 } },
        });
        (inquirerPrompt as jest.Mock).mockResolvedValue({ selectedOption: 'Skip pod action' });

        //WHEN
        const run = await runCocoaPods(true);

        //THEN
        expect(run).toEqual(false);
        expect(executeAsync).not.toHaveBeenCalledWith('bundle install');
    });
});
