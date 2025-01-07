import { Env, fsExistsSync } from '@rnv/core';
import { withMetroConfig, mergeConfig, InputConfig } from '@rnv/sdk-react-native';

const path = require('path');
const os = require('os');
const { doResolve } = require('@rnv/core');

const sharedExclusions = [
    /node_modules\/react\/dist\/.*/,
    /website\/node_modules\/.*/,
    /heapCapture\/bundle\.js/,
    /.*\/__tests__\/.*/,
];

const env: Env = process?.env;

function escapeRegExp(pattern: RegExp | string) {
    if (typeof pattern === 'string') {
        // eslint-disable-next-line
        const escaped = pattern.replace(/[\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'); // convert the '/' into an escaped local file separator

        return escaped.replace(/\//g, `\\${path.sep}`);
    } else if (Object.prototype.toString.call(pattern) === '[object RegExp]') {
        return pattern.source.replace(/\//g, path.sep);
    }
    throw new Error(`Unexpected exclusion pattern: ${pattern}`);
}

function exclusionList(additionalExclusions: RegExp[]) {
    return [...additionalExclusions, ...sharedExclusions].map((regexp) => new RegExp(escapeRegExp(regexp)));
}

export const withRNVMetro = (config: InputConfig) => {
    const projectPath = env.RNV_PROJECT_ROOT || process.cwd();

    const defaultConfig = withMetroConfig(projectPath);
    const projectNodeModulesPath = path.resolve(projectPath, 'node_modules');
    const watchFolders = fsExistsSync(projectNodeModulesPath) ? [projectNodeModulesPath] : [];

    const metroCache = require(require.resolve('metro-cache', { paths: [projectPath] }));

    const { FileStore } = metroCache;

    if (env.RNV_IS_MONOREPO === 'true' || env.RNV_IS_MONOREPO === true) {
        const monoRootPath = env.RNV_MONO_ROOT || projectPath;
        watchFolders.push(path.resolve(monoRootPath, 'node_modules'));
        watchFolders.push(path.resolve(monoRootPath, 'packages'));
    }
    if (config?.watchFolders?.length) {
        watchFolders.push(...config.watchFolders);
    }

    const exts: string = env.RNV_EXTENSIONS || '';

    const cnfRnv: InputConfig = {
        cacheStores: (metroCache) => {
            let cacheStores: ReturnType<Extract<InputConfig['cacheStores'], (...args: any[]) => any>> = [];

            if (typeof config?.cacheStores === 'function') {
                cacheStores = config.cacheStores(metroCache);
            } else if (config?.cacheStores?.length) {
                // eslint-disable-next-line prefer-destructuring
                cacheStores = config.cacheStores;
            }

            cacheStores = [
                ...cacheStores,
                new FileStore({
                    root: path.join(os.tmpdir(), 'metro-cache-tvos'),
                }),
            ];

            return cacheStores;
        },
        transformer: {
            getTransformOptions: async (entryPoints, options, getDependenciesOf) => {
                const transformOptions =
                    (await config?.transformer?.getTransformOptions?.(entryPoints, options, getDependenciesOf)) || {};

                return {
                    ...transformOptions,
                    transform: {
                        experimentalImportSupport: false,
                        // this defeats the RCTDeviceEventEmitter is not a registered callable module
                        inlineRequires: true,
                        ...(transformOptions?.transform || {}),
                    },
                };
            },
            assetRegistryPath:
                config?.transformer?.assetRegistryPath ||
                path.resolve(`${doResolve('react-native-tvos')}/Libraries/Image/AssetRegistry.js`),
        },
        resolver: {
            resolveRequest: (context: any, moduleName: any, platform: any) => {
                if (moduleName.startsWith('react-native/')) {
                    return context.resolveRequest(
                        context,
                        moduleName.replace('react-native/', 'react-native-tvos/'),
                        platform
                    );
                }

                // Chain to the custom config resolver if provided.
                if (typeof config?.resolver?.resolveRequest === 'function') {
                    return config.resolver.resolveRequest(context, moduleName, platform);
                }

                // Optionally, chain to the standard Metro resolver.
                return context.resolveRequest(context, moduleName, platform);
            },
            blockList: exclusionList(
                [
                    /platformBuilds\/.*/,
                    /buildHooks\/.*/,
                    /projectConfig\/.*/,
                    /website\/.*/,
                    /appConfigs\/.*/,
                    /renative.local.*/,
                    /metro.config.local.*/,
                    /.expo\/.*/,
                    /.rollup.cache\/.*/,
                ]
                    .concat(config?.resolver?.blockList || [])
                    .concat(config?.resolver?.blacklistRE || [])
            ),
            blacklistRE: undefined, // must be reset to prevent it from being processed by metro
            sourceExts: [...(config?.resolver?.sourceExts || []), ...exts.split(',')],
        },
        watchFolders,
        projectRoot: config?.projectRoot || path.resolve(projectPath),
    };

    const cnf = mergeConfig(defaultConfig, config, cnfRnv);

    return cnf;
};
