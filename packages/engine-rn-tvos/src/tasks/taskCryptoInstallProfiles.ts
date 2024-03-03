import path from 'path';
import {
    RnvTaskFn,
    logWarning,
    logError,
    logTask,
    logDebug,
    getFileListSync,
    copyFileSync,
    mkdirSync,
    fsExistsSync,
    executeTask,
    shouldSkipTask,
    PARAMS,
    RnvTask,
    TaskKey,
} from '@rnv/core';

const taskRnvCryptoInstallProfiles: RnvTaskFn = async (c, _parentTask, originTask) => {
    logTask('taskRnvCryptoInstallProfiles');

    await executeTask(c, TaskKey.projectConfigure, TaskKey.cryptoInstallProfiles, originTask);

    if (shouldSkipTask(c, TaskKey.cryptoInstallProfiles, originTask)) return true;

    if (c.platform !== 'tvos') {
        logError(`taskRnvCryptoInstallProfiles: platform ${c.platform} not supported`);
        return true;
    }

    const ppFolder = path.join(c.paths.home.dir, 'Library/MobileDevice/Provisioning Profiles');

    if (!fsExistsSync(ppFolder)) {
        logWarning(`folder ${ppFolder} does not exist!`);
        mkdirSync(ppFolder);
    }

    const list = getFileListSync(c.paths.workspace.project.dir);
    const mobileprovisionArr = list.filter((v) => v.endsWith('.mobileprovision'));

    try {
        mobileprovisionArr.forEach((v) => {
            logDebug(`taskRnvCryptoInstallProfiles: Installing: ${v}`);
            copyFileSync(v, ppFolder);
        });
    } catch (e) {
        logError(e);
    }

    return true;
};

const Task: RnvTask = {
    description: 'Installs provisioning certificates found in your workspace (mac only)',
    fn: taskRnvCryptoInstallProfiles,
    task: TaskKey.cryptoInstallProfiles,
    params: PARAMS.withBase(),
    platforms: [],
    // skipPlatforms: true,
};

export default Task;
