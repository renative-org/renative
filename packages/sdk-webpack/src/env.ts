import { doResolvePath, getContext, includesPluginPath, parsePlugins, sanitizePluginPath } from '@rnv/core';
import path from 'path';

export type RnvModuleConfig = {
    modulePaths: Array<string>;
    moduleAliases: Record<string, string | undefined>;
    moduleAliasesArray: Array<string>;
};

export const getModuleConfigs = (): RnvModuleConfig => {
    const c = getContext();

    let modulePaths: Array<string> = [];
    const moduleAliases: Record<string, string | undefined> = {};

    const doNotResolveModulePaths: Array<string> = [];

    // PLUGINS
    parsePlugins(
        c,
        c.platform,
        (plugin, pluginPlat, key) => {
            const { webpackConfig } = plugin;

            if (webpackConfig) {
                if (webpackConfig.modulePaths) {
                    if (typeof webpackConfig.modulePaths === 'boolean') {
                        if (webpackConfig.modulePaths) {
                            modulePaths.push(`node_modules/${key}`);
                        }
                    } else {
                        webpackConfig.modulePaths.forEach((v) => {
                            modulePaths.push(v);
                        });
                    }
                }
                const wpMa = webpackConfig.moduleAliases;
                if (wpMa) {
                    if (typeof wpMa === 'boolean') {
                        moduleAliases[key] = doResolvePath(key, true, {}, c.paths.project.nodeModulesDir);
                    } else {
                        Object.keys(wpMa).forEach((aKey) => {
                            const mAlias = wpMa[aKey];
                            if (typeof mAlias === 'string') {
                                moduleAliases[key] = doResolvePath(mAlias, true, {}, c.paths.project.nodeModulesDir);
                                // DEPRECATED use => projectPath
                                // } else if (mAlias.path) {
                                //     moduleAliases[key] = path.join(c.paths.project.dir, mAlias.path);
                            } else if (includesPluginPath(mAlias.projectPath)) {
                                moduleAliases[key] = sanitizePluginPath(mAlias.projectPath, key);
                            } else if (mAlias.projectPath) {
                                moduleAliases[key] = path.join(c.paths.project.dir, mAlias.projectPath);
                            }
                        });
                    }
                }
            }
        },
        true
    );

    const moduleAliasesArray: Array<string> = [];
    Object.keys(moduleAliases).forEach((key) => {
        moduleAliasesArray.push(`${key}:${moduleAliases[key]}`);
    });

    modulePaths = modulePaths
        .map((v) => v && doResolvePath(v, true, {}, c.paths.project.dir)!)
        .concat(doNotResolveModulePaths)
        .concat([c.paths.project.assets.dir])
        .filter(Boolean);

    return { modulePaths, moduleAliases, moduleAliasesArray };
};

export const EnvVars = {
    RNV_MODULE_CONFIGS: () => {
        const configs = getModuleConfigs();

        return {
            RNV_MODULE_PATHS: configs.modulePaths,
            RNV_MODULE_ALIASES: configs.moduleAliasesArray,
        };
    },
};
