export * from './runner';
export * from './deviceManager';
export * from './constants';
export * from './installer';
export * from './jetifier';
import taskTargetLaunch from './tasks/taskTargetLaunch';
import taskTargetList from './tasks/taskTargetList';
import taskSdkConfigure from './tasks/taskSdkConfigure';
import taskLog from './tasks/taskLog';
import taskPackage from './tasks/taskPackage';
import taskConfigure from './tasks/taskConfigure';
import taskRun from './tasks/taskRun';
import taskBuild from './tasks/taskBuild';
import { GetContextType, createRnvModule } from '@rnv/core';

export const Tasks = [
    taskTargetLaunch,
    taskTargetList,
    taskSdkConfigure,
    taskLog,
    taskPackage,
    taskConfigure,
    taskRun,
    taskBuild,
];

const Sdk = createRnvModule({
    tasks: Tasks,
    name: '@rnv/sdk-android',
    type: 'internal',
});

export type GetContext = GetContextType<typeof Sdk.getContext>;
