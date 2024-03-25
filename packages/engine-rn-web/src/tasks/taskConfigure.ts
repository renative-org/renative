import {
    RnvTaskFn,
    logErrorPlatform,
    copySharedPlatforms,
    logTask,
    RnvTaskOptionPresets,
    executeTask,
    shouldSkipTask,
    configureEntryPoint,
    RnvTask,
    RnvTaskName,
} from '@rnv/core';
import { configureWebProject, configureChromecastProject } from '@rnv/sdk-webpack';
import { configureKaiOSProject } from '@rnv/sdk-kaios';
import { configureWebOSProject } from '@rnv/sdk-webos';
import { configureTizenProject } from '@rnv/sdk-tizen';
import { EnginePlatforms } from '../constants';

const fn: RnvTaskFn = async (c, parentTask, originTask) => {
    logTask('taskConfigure');

    await executeTask(RnvTaskName.platformConfigure, RnvTaskName.configure, originTask);
    if (shouldSkipTask(RnvTaskName.configure, originTask)) return true;
    await configureEntryPoint(c.platform);

    await copySharedPlatforms();

    if (c.program.opts().only && !!parentTask) {
        return true;
    }

    switch (c.platform) {
        case 'web':
        case 'webtv':
            return configureWebProject();
        case 'tizen':
        case 'tizenmobile':
        case 'tizenwatch':
            return configureTizenProject();
        case 'webos':
            return configureWebOSProject();
        case 'chromecast':
            return configureChromecastProject();
        case 'kaios':
            return configureKaiOSProject();
        default:
            return logErrorPlatform();
    }
};

const Task: RnvTask = {
    description: 'Configure current project',
    fn,
    task: RnvTaskName.configure,
    options: RnvTaskOptionPresets.withConfigure(),
    platforms: EnginePlatforms,
};

export default Task;
