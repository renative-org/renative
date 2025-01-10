import { createTask, RnvTaskName, RnvTaskOptionPresets, doResolve } from '@rnv/core';
import { startReactNative } from '../metroRunner';
import { SdkPlatforms } from '../constants';

export default createTask({
    description: 'Starts react-native bundler',
    dependsOn: [RnvTaskName.configureSoft],
    //TODO: implement dependsOnTrigger
    // dependsOnTrigger: ({ parentTaskName }) => !parentTaskName,
    fn: async ({ ctx, parentTaskName }) => {
        const { hosted } = ctx.program.opts();
        if (hosted) {
            return Promise.reject('This platform does not support hosted mode');
        }
        // Disable reset for other commands (ie. cleaning platforms)
        ctx.runtime.disableReset = true;
        let customCliPath: string | undefined;
        let metroConfigName: string | undefined;
        const { reactNativePackageName, reactNativeMetroConfigName } = ctx.runtime?.runtimeExtraProps || {};
        if (reactNativePackageName) {
            customCliPath = `${doResolve(reactNativePackageName)}/cli.js`;
        }
        if (reactNativeMetroConfigName) {
            metroConfigName = reactNativeMetroConfigName;
        }
        return startReactNative({ waitForBundler: !parentTaskName, customCliPath, metroConfigName });
    },
    task: RnvTaskName.start,
    options: RnvTaskOptionPresets.withConfigure(),
    platforms: SdkPlatforms,
});
