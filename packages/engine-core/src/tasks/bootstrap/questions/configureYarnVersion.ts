import { executeAsync, getContext, inquirerPrompt, logInfo, DEFAULTS } from '@rnv/core';
import { NewProjectData } from '../types';

const Question = async (data: NewProjectData) => {
    const c = getContext();
    const { confirmSetYarnVersion } = await inquirerPrompt({
        name: 'confirmSetYarnVersion',
        type: 'confirm',
        message: `Renative project requires Yarn version ${DEFAULTS.yarnVersion} Would you like to configure it now?`,
    });

    if (!confirmSetYarnVersion) {
        logInfo('Yarn setup cancelled by user.');
        return;
    }

    await executeAsync(`npm install -g yarn`);

    await executeAsync(`yarn set version ${DEFAULTS.yarnVersion}`, {
        cwd: c.paths.project.dir,
    });
    await executeAsync(`yarn config set nodeLinker node-modules`, {
        cwd: c.paths.project.dir,
    });
    data.files.project.packageJson.packageManager = `yarn@${DEFAULTS.yarnVersion}`;
    logInfo('Yarn setup completed successfully.');
};

export default Question;
