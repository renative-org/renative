import path from 'path';
import {
    copyFolderContentsRecursiveSync,
    copyFileSync,
    mergeObjects,
    readObjectSync,
    fsExistsSync,
    fsLstatSync,
} from '../system/fs';
import { chalk, logError, logInfo, logWarning, logDefault, logDebug } from '../logger';
import { doResolve } from '../system/resolve';
import { RnvContext } from '../context/types';
import { ConfigFileProject, ConfigFileTemplate } from '../schema/configFiles/types';
import { RnvFileName } from '../enums/fileName';
import { getContext } from '../context/provider';
import { RnvFolderName } from '../enums/folderName';
import { checkIfProjectAndNodeModulesExists } from '../projects/npm';

export const configureTemplateFiles = async () => {
    logDefault('configureTemplateFiles');

    const c = getContext();

    const templateConfig = readObjectSync<ConfigFileTemplate>(c.paths.template.configTemplate);

    let mergedObj = _getProjectTemplateMergedConfig(templateConfig);
    const includedPaths = mergedObj?.templateConfig?.includedPaths;

    if (includedPaths) {
        includedPaths.forEach((pth) => {
            if (c.paths.template.dir) {
                if (typeof pth === 'string') {
                    _copyIncludedPaths(c, pth);
                } else {
                    let matched: boolean = true;
                    const suPlats = c.buildConfig?.defaults?.supportedPlatforms || [];
                    if (pth.platforms && suPlats?.length) {
                        const match = pth.platforms.some((v) => suPlats.includes(v));
                        if (!match) {
                            matched = false;
                        }
                    } else if (pth.engines?.length) {
                        const engId = c.runtime.engine?.config?.id;
                        if (engId && !pth.engines?.includes?.(engId)) {
                            matched = false;
                        }
                    }
                    if (matched) {
                        pth.paths.forEach((pth) => {
                            _copyIncludedPaths(c, pth);
                        });
                    }
                }
            }
        });
    }
};

export const isTemplateInstalled = () => {
    const ctx = getContext();
    const tplName = ctx.buildConfig.templateConfig?.name;
    return tplName ? doResolve(tplName) : false;
};

export const applyTemplate = async () => {
    const c = getContext();
    logDefault('applyTemplate');
    if (c.buildConfig?.isTemplate) return true;
    if (!c.files.project.config) {
        logError('Project config not loaded. cannot apply template');
        return false;
    }
    if (!isTemplateInstalled()) {
        // We Need template to be installed before other dependency resolutions (due to scoping)
        await checkIfProjectAndNodeModulesExists();
    }
    await _applyTemplate(c);
};

const _applyTemplate = async (c: RnvContext) => {
    logDefault('_applyTemplate');

    const tplName = c.buildConfig.templateConfig?.name;
    c.paths.template.dir = doResolve(tplName) || 'Error: unresolved';

    if (c.paths.template.dir) {
        c.paths.template.configTemplate = path.join(c.paths.template.dir, RnvFileName.renativeTemplate);

        c.paths.template.config = path.join(c.paths.template.dir, RnvFileName.renative);
    }
    if (!fsExistsSync(c.paths.template.configTemplate)) {
        logWarning(
            `Template file ${chalk().bold(c.paths.template.configTemplate)} does not exist. check your ${chalk().bold(
                c.paths.template.dir
            )}. skipping`
        );
        return true;
    }
    logDebug(`_applyTemplate:${c.paths.template.dir}`);
    if (c.paths.template.dir) {
        c.paths.template.appConfigsDir = path.join(c.paths.template.dir, 'appConfigs');
    }
    c.paths.template.appConfigBase.dir = path.join(c.paths.template.appConfigsDir, 'base');
    c.runtime.currentTemplate = tplName;

    return true;
};

const _getProjectTemplateMergedConfig = (templateConfig: ConfigFileTemplate | null) => {
    const c = getContext();
    if (c.files.project.config_original && templateConfig) {
        const mergedObj = mergeObjects<ConfigFileTemplate & ConfigFileProject>(
            c,
            templateConfig || {},
            c.files.project.config_original,
            false,
            true
        );
        return mergedObj;
    }
    return null;
};

const _copyIncludedPaths = (c: RnvContext, name: string) => {
    const sourcePathOriginal = path.join(c.paths.template.dir, name);
    const sourceOverridePath = path.join(c.paths.template.dir, RnvFolderName.templateOverrides, name);
    const destPath = path.join(c.paths.project.dir, name);
    // If override exists use it, otherwise use original and continue with rest of the logic
    const sourcePath = fsExistsSync(sourceOverridePath) ? sourceOverridePath : sourcePathOriginal;
    if (!fsExistsSync(destPath) && fsExistsSync(sourcePath)) {
        try {
            if (fsLstatSync(sourcePath).isDirectory()) {
                logInfo(`Missing directory ${chalk().bold(`${destPath}.js`)}. COPYING from TEMPATE...DONE`);
                copyFolderContentsRecursiveSync(sourcePath, destPath);
            } else {
                logInfo(`Missing file ${chalk().bold(`${destPath}.js`)}. COPYING from TEMPATE...DONE`);
                copyFileSync(sourcePath, destPath);
            }
        } catch (e) {
            // Get some beer and order hookers
        }
    }
};
