import {
    RnvTaskFn,
    logErrorPlatform,
    logTask,
    RnvTaskOptionPresets,
    executeOrSkipTask,
    shouldSkipTask,
    RnvTask,
    RnvTaskName,
} from '@rnv/core';
import { buildWeb } from '@rnv/sdk-webpack';
import { buildTizenProject } from '@rnv/sdk-tizen';
import { buildWebOSProject } from '@rnv/sdk-webos';
import { buildKaiOSProject } from '@rnv/sdk-kaios';
import { EnginePlatforms } from '../constants';

const fn: RnvTaskFn = async (c, parentTask, originTask) => {
    logTask('taskBuild', `parent:${parentTask}`);

    const { platform } = c;

    // Build aways bundles assets
    c.runtime.forceBundleAssets = true;

    await executeOrSkipTask(RnvTaskName.configure, RnvTaskName.build, originTask);

    if (shouldSkipTask(RnvTaskName.build, originTask)) return true;

    switch (platform) {
        case 'web':
        case 'webtv':
        case 'chromecast':
            await buildWeb();
            return;
        case 'kaios':
            await buildKaiOSProject();
            return;
        case 'tizen':
        case 'tizenmobile':
        case 'tizenwatch':
            await buildTizenProject();
            return;
        case 'webos':
            await buildWebOSProject();
            return;
        default:
            logErrorPlatform();
    }
};

const Task: RnvTask = {
    description: 'Build project binary',
    fn,
    task: RnvTaskName.build,
    options: RnvTaskOptionPresets.withConfigure(),
    platforms: EnginePlatforms,
};

export default Task;
