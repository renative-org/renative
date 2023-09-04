import {
    logTask,
    PARAMS,
    RnvTaskFn,
    executeTask,
    shouldSkipTask,
    executeAsync,
    logError,
    TASK_PROJECT_CONFIGURE,
    TASK_CRYPTO_INSTALL_CERTS,
    getFileListSync,
    logWarning,
} from 'rnv';

export const taskRnvCryptoInstallCerts: RnvTaskFn = async (c, _parentTask, originTask) => {
    logTask('taskRnvCryptoInstallCerts');

    await executeTask(c, TASK_PROJECT_CONFIGURE, TASK_CRYPTO_INSTALL_CERTS, originTask);

    if (shouldSkipTask(c, TASK_CRYPTO_INSTALL_CERTS, originTask)) return true;

    if (c.platform !== 'ios') {
        logError(`_installTempCerts: platform ${c.platform} not supported`);
        return true;
    }
    const kChain = c.program.keychain || 'ios-build.keychain';

    const list = getFileListSync(c.paths.workspace.project.dir);
    const cerArr = list.filter((v) => v.endsWith('.cer'));

    try {
        Promise.all(cerArr.map((v) => executeAsync(c, `security import ${v} -k ${kChain} -A`)));
    } catch (e: any) {
        logWarning(e);
        return true;
    }
};

export default {
    description: '',
    fn: taskRnvCryptoInstallCerts,
    task: TASK_CRYPTO_INSTALL_CERTS,
    params: PARAMS.withBase(),
    platforms: [],
    skipPlatforms: true,
};
