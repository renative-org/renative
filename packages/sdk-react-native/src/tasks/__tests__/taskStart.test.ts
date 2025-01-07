import { RnvTaskName, createRnvContext, doResolve, getContext } from '@rnv/core';
import taskStart from '../taskStart';
import { startReactNative } from '../../metroRunner';

jest.mock('@rnv/core');
jest.mock('@rnv/sdk-utils');
jest.mock('../../metroRunner');

beforeEach(() => {
    createRnvContext();
});

afterEach(() => {
    jest.resetAllMocks();
});

describe('taskStart', () => {
    it('Execute task.rnv.start with no parent', async () => {
        // GIVEN
        const ctx = getContext();
        ctx.platform = 'ios';
        // WHEN
        await taskStart.fn?.({
            ctx,
            taskName: 'MOCK_taskName',
            originTaskName: 'MOCK_originTaskName',
            parentTaskName: undefined,
            shouldSkip: false,
        });
        // THEN
        expect(taskStart.dependsOn).toEqual([RnvTaskName.configureSoft]);
        expect(startReactNative).toHaveBeenCalledWith({ waitForBundler: true });
    });
    it('Execute task.rnv.start', async () => {
        // GIVEN
        const ctx = getContext();
        ctx.platform = 'ios';
        // WHEN
        await taskStart.fn?.({
            ctx,
            taskName: 'MOCK_taskName',
            originTaskName: 'MOCK_originTaskName',
            parentTaskName: 'MOCK_parentTaskName',
            shouldSkip: false,
        });
        // THEN
        expect(startReactNative).toHaveBeenCalledWith({ waitForBundler: false });
    });
    it('Execute task.rnv.start with no parent and custom customCliPath', async () => {
        // GIVEN
        const ctx = getContext();
        ctx.platform = 'tvos';
        ctx.runtime.runtimeExtraProps = {
            reactNativePackageName: 'MOCKED_NAME',
            reactNativeMetroConfigName: 'MOCKED_CONFIG',
        };
        jest.mocked(doResolve).mockReturnValueOnce('MOCKED_PATH');
        // WHEN
        await taskStart.fn?.({
            ctx,
            taskName: 'MOCK_taskName',
            originTaskName: 'MOCK_originTaskName',
            parentTaskName: undefined,
            shouldSkip: false,
        });
        // THEN
        expect(startReactNative).toHaveBeenCalledWith({
            waitForBundler: true,
            customCliPath: 'MOCKED_PATH/cli.js',
            metroConfigName: 'MOCKED_CONFIG',
        });
    });

    it('Execute task.rnv.start with customCliPath', async () => {
        // GIVEN
        const ctx = getContext();
        ctx.platform = 'tvos';
        ctx.runtime.runtimeExtraProps = {
            reactNativePackageName: 'MOCKED_NAME',
            reactNativeMetroConfigName: 'MOCKED_CONFIG',
        };
        jest.mocked(doResolve).mockReturnValueOnce('MOCKED_PATH');
        // WHEN
        await taskStart.fn?.({
            ctx,
            taskName: 'MOCK_taskName',
            originTaskName: 'MOCK_originTaskName',
            parentTaskName: 'MOCK_parentTaskName',
            shouldSkip: false,
        });
        // THEN
        expect(startReactNative).toHaveBeenCalledWith({
            waitForBundler: false,
            customCliPath: 'MOCKED_PATH/cli.js',
            metroConfigName: 'MOCKED_CONFIG',
        });
    });

    it('Execute task.rnv.start in hosted mode', async () => {
        // GIVEN
        const ctx = getContext();
        ctx.platform = 'tvos';
        ctx.program.opts().hosted = true;
        // WHEN // THEN
        await expect(
            taskStart.fn?.({
                ctx,
                taskName: 'MOCK_taskName',
                originTaskName: 'MOCK_originTaskName',
                parentTaskName: 'MOCK_parentTaskName',
                shouldSkip: false,
            })
        ).rejects.toBe('This platform does not support hosted mode');
    });
});
