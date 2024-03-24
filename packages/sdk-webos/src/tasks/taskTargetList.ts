import { isPlatformSupported, logTask, executeTask, RnvTaskFn, RnvTask, RnvTaskName, RnvTaskOptions } from '@rnv/core';
import { checkAndConfigureWebosSdks, checkWebosSdk } from '../installer';
import { listWebOSTargets } from '../deviceManager';
import { SdkPlatforms } from '../constants';

const fn: RnvTaskFn = async (c, _parentTask, originTask) => {
    logTask('taskTargetList');

    await isPlatformSupported(true);
    await checkAndConfigureWebosSdks();
    await executeTask(RnvTaskName.workspaceConfigure, RnvTaskName.targetList, originTask);
    await checkWebosSdk();

    return listWebOSTargets();
};

const Task: RnvTask = {
    description: 'List all available targets for specific platform',
    fn,
    task: RnvTaskName.targetList,
    options: [RnvTaskOptions.target],
    platforms: SdkPlatforms,
    isGlobalScope: true,
};

export default Task;
