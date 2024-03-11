import {
    logErrorPlatform,
    logTask,
    RnvTaskFn,
    executeOrSkipTask,
    shouldSkipTask,
    logRaw,
    getConfigProp,
    logSummary,
    RnvTask,
    RnvTaskName,
    RnvTaskOptionPresets,
} from '@rnv/core';
import { packageAndroid, runAndroid, getAndroidDeviceToRunOn } from '@rnv/sdk-android';
import { runXcodeProject, getIosDeviceToRunOn } from '@rnv/sdk-apple';
import { startBundlerIfRequired, waitForBundlerIfRequired } from '@rnv/sdk-react-native';

const taskRun: RnvTaskFn = async (c, parentTask, originTask) => {
    const { platform } = c;
    const { port } = c.runtime;
    const { hosted } = c.program;
    logTask('taskRun', `parent:${parentTask} port:${port} hosted:${hosted}`);

    await executeOrSkipTask(RnvTaskName.configure, RnvTaskName.run, originTask);

    if (shouldSkipTask(RnvTaskName.run, originTask)) return true;

    const bundleAssets = getConfigProp(c, c.platform, 'bundleAssets', false);

    switch (platform) {
        case 'ios':
        case 'macos':
            // eslint-disable-next-line no-case-declarations
            const runDeviceArgs = await getIosDeviceToRunOn(c);
            if (!c.program.only) {
                await startBundlerIfRequired(RnvTaskName.run, originTask);
                await runXcodeProject(runDeviceArgs);
                if (!bundleAssets) {
                    logSummary('BUNDLER STARTED');
                }
                return waitForBundlerIfRequired();
            }
            return runXcodeProject(runDeviceArgs);
        case 'android':
        case 'androidtv':
        case 'firetv':
        case 'androidwear':
            // eslint-disable-next-line no-case-declarations
            const runDevice = await getAndroidDeviceToRunOn();
            if (runDevice) {
                c.runtime.target = runDevice?.name || runDevice?.udid;
            }
            if (!c.program.only) {
                await startBundlerIfRequired(RnvTaskName.run, originTask);
                if (bundleAssets || platform === 'androidwear') {
                    await packageAndroid();
                }
                await runAndroid(runDevice!);
                if (!bundleAssets) {
                    logSummary('BUNDLER STARTED');
                }
                return waitForBundlerIfRequired();
            }
            return runAndroid(runDevice!);
        default:
            return logErrorPlatform();
    }
};

const taskRunHelp = async () => {
    logRaw(`
More info at: https://renative.org/docs/api-cli
`);
};

const Task: RnvTask = {
    description: 'Run your rn app on target device or emulator',
    fn: taskRun,
    fnHelp: taskRunHelp,
    task: RnvTaskName.run,
    isPriorityOrder: true,
    // dependencies: {
    //     before: RnvTaskName.configure,
    // },
    options: RnvTaskOptionPresets.withBase(RnvTaskOptionPresets.withConfigure(RnvTaskOptionPresets.withRun())),
    platforms: ['ios', 'android', 'androidtv', 'androidwear', 'macos'],
};

export default Task;
