import task from '../taskCryptoEncrypt';

import {
    logWarning,
    logSuccess,
    getRealPath,
    removeFilesSync,
    mkdirSync,
    fsWriteFileSync,
    fsExistsSync,
    fsReadFileSync,
    inquirerPrompt,
    createRnvContext,
} from '@rnv/core';

import { getEnvExportCmd, getEnvVar } from '../common';
import { getContext } from '../../../getContext';
const iocane = require('iocane');

jest.mock('@rnv/core');
jest.mock('path');
jest.mock('tar');
jest.mock('iocane');
jest.mock('util');
jest.mock('fs');
jest.mock('../common.ts');

const updateContext = () => {
    const ctx = getContext();
    ctx.paths.workspace.dir = 'workspace/path/.rnv';
    ctx.files.project.config = {
        projectName: 'testProject',
        crypto: { path: './secrets/privateConfigs.enc' },
    };
    ctx.paths.project.dir = 'project/path';
    ctx.files.project.config_original = {};
    ctx.program.opts = jest.fn().mockReturnValue({ key: 'testKey' });
    return ctx;
};

beforeEach(() => {
    createRnvContext();
    iocane.createSession.mockReturnValue({
        use: jest.fn().mockReturnValue({
            encrypt: jest.fn().mockResolvedValue('encryptedData'),
        }),
    });
});

afterEach(() => {
    jest.resetAllMocks();
});

describe('taskCryptoEncrypt tests', () => {
    it('should reject if projectName is missing', async () => {
        //GIVEN
        const ctx = getContext();
        //WHEN
        //THEN
        await expect(
            task.fn?.({
                ctx,
                taskName: 'MOCK_taskName',
                originTaskName: 'MOCK_originTaskName',
                parentTaskName: 'MOCK_parentTaskName',
                shouldSkip: false,
            })
        ).rejects.toEqual(
            `projectName is missing. Make sure you're in a ReNative project or integration and have projectName defined.`
        );
    });
    it('should log warning if crypto.path is not specificed', async () => {
        //GIVEN
        const ctx = getContext();
        ctx.files.project.config = {
            projectName: '@rnv/testProject',
        };
        ctx.paths.workspace.dir = 'workspace/dir';
        ctx.program.opts = jest.fn().mockReturnValue({ key: 'testKey' });
        jest.mocked(getEnvVar).mockReturnValue('mockEnvVar');
        //WHEN
        await task.fn?.({
            ctx,
            taskName: 'MOCK_taskName',
            originTaskName: 'MOCK_originTaskName',
            parentTaskName: 'MOCK_parentTaskName',
            shouldSkip: false,
        });
        //THEN
        expect(logWarning).toHaveBeenCalledWith(expect.stringContaining(`You don't have {{ crypto.path }} specificed`));
    });
    it('should encrypt files correctly', async () => {
        //GIVEN
        const ctx = updateContext();
        jest.mocked(getEnvVar).mockReturnValue('CRYPTO_RNV_TESTPROJECT');
        jest.mocked(fsExistsSync).mockReturnValue(true);
        jest.mocked(fsReadFileSync).mockReturnValue(Buffer.from('fileData'));
        jest.mocked(getRealPath).mockReturnValue(`${ctx.paths.project.dir}/secrets/privateConfigs.enc`);

        //WHEN
        await expect(
            task.fn?.({
                ctx,
                taskName: 'MOCK_taskName',
                originTaskName: 'MOCK_originTaskName',
                parentTaskName: 'MOCK_parentTaskName',
                shouldSkip: false,
            })
        ).resolves.toEqual(undefined);
        //THEN
        expect(removeFilesSync).toHaveBeenCalled();
        expect(fsWriteFileSync).toHaveBeenCalledTimes(3);
        expect(fsWriteFileSync).toHaveBeenCalledWith('project/path/secrets/privateConfigs.enc', 'encryptedData');
        expect(logSuccess).toHaveBeenCalledWith(
            `Files successfully encrypted into ${ctx.paths.project.dir}/secrets/privateConfigs.enc`
        );
    });
    it('should create destination folder if it does not exist', async () => {
        //GIVEN
        const ctx = updateContext();
        jest.mocked(getEnvVar).mockReturnValue('CRYPTO_RNV_TESTPROJECT');
        jest.mocked(fsExistsSync).mockReturnValueOnce(true).mockReturnValueOnce(false);
        jest.mocked(getRealPath).mockReturnValue(`${ctx.paths.project.dir}/secrets/privateConfigs.enc`);

        //WHEN
        await expect(
            task.fn?.({
                ctx,
                taskName: 'MOCK_taskName',
                originTaskName: 'MOCK_originTaskName',
                parentTaskName: 'MOCK_parentTaskName',
                shouldSkip: false,
            })
        ).resolves.toEqual(undefined);
        //THEN
        const destFolder = 'project/path/secrets';
        expect(mkdirSync).toHaveBeenCalledWith(destFolder);
        expect(fsWriteFileSync).toHaveBeenCalledWith('project/path/secrets/privateConfigs.enc', 'encryptedData');
        expect(logSuccess).toHaveBeenCalledWith(
            `Files successfully encrypted into ${ctx.paths.project.dir}/secrets/privateConfigs.enc`
        );
    });

    it('should handle missing encryption key and prompt to generate one', async () => {
        //GIVEN
        const ctx = updateContext();
        ctx.program.opts = jest.fn().mockReturnValue({});
        jest.mocked(getEnvVar).mockReturnValue('CRYPTO_RNV_TESTPROJECT');
        jest.mocked(fsExistsSync).mockReturnValueOnce(true).mockReturnValueOnce(true);
        jest.mocked(inquirerPrompt).mockResolvedValueOnce({ confirm: true });
        jest.mocked(getRealPath).mockReturnValue(`${ctx.paths.project.dir}/secrets/privateConfigs.enc`);
        //WHEN
        await expect(
            task.fn?.({
                ctx,
                taskName: 'MOCK_taskName',
                originTaskName: 'MOCK_originTaskName',
                parentTaskName: 'MOCK_parentTaskName',
                shouldSkip: false,
            })
        ).resolves.toEqual(undefined);
        //THEN
        expect(inquirerPrompt).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'confirm',
                message: expect.stringContaining("You haven't passed a key with --key or set an env variable named"),
            })
        );
        expect(getEnvExportCmd).toHaveBeenCalled();
        expect(logSuccess).toHaveBeenCalledWith(expect.stringContaining('The files were encrypted with key'));
    });
    it('should reject if encryption key is not provided and user does not confirm generation', async () => {
        //GIVEN
        const ctx = updateContext();
        ctx.program.opts = jest.fn().mockReturnValue({});
        jest.mocked(getEnvVar).mockReturnValue('CRYPTO_RNV_TESTPROJECT');
        jest.mocked(fsExistsSync).mockReturnValueOnce(true).mockReturnValueOnce(true);
        jest.mocked(inquirerPrompt).mockResolvedValueOnce({ confirm: false });
        //WHEN
        await expect(
            task.fn?.({
                ctx,
                taskName: 'MOCK_taskName',
                originTaskName: 'MOCK_originTaskName',
                parentTaskName: 'MOCK_parentTaskName',
                shouldSkip: false,
            })
        ).rejects.toEqual(expect.stringContaining('encrypt: You must pass --key or have env var defined:'));
        //THEN
        expect(inquirerPrompt).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'confirm',
                message: expect.stringContaining("You haven't passed a key with --key or set an env variable named"),
            })
        );
        expect(getEnvExportCmd).toHaveBeenCalled();
    });
});
