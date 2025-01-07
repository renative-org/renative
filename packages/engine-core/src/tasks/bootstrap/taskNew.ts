import {
    RnvTaskName,
    updateRenativeConfigs,
    logToSummary,
    applyTemplate,
    configureTemplateFiles,
    generateLocalJsonSchemas,
    createTask,
} from '@rnv/core';
import inquiryProjectFolder from './questions/projectFolder';
import inquiryBootstrapQuestions from './questions/bootstrapQuestions';
import inquiryGit from './questions/confirmGit';
import inquiryIsRenativeProject from './questions/isRenativeProject';
import inquiryHasNodeModules from './questions/hasNodeModules';
import inquiryProjectName from './questions/projectName';
import inquiryWorkspace from './questions/workspace';
import inquirySupportedPlatforms from './questions/supportedPlatforms';
import inquiryAppTitle from './questions/appTitle';
import inquiryAppID from './questions/appID';
import inquiryAppVersion from './questions/appVersion';
import inquiryInstallTemplate from './questions/installTemplate';
import inquiryApplyTemplate from './questions/applyTemplate';
import inquiryBookmarkTemplate from './questions/bookmarkTemplate';
import inquiryAppConfigs from './questions/appConfigs';
import inquiryConfigTemplates from './questions/configTemplates';
import inquiryProjectInstall from './questions/installProject';
import inquiryYarnVersion from './questions/configureYarnVersion';
import inquiryInstallEngines from './questions/installEngines';
import {
    configureConfigOverrides,
    generateProjectOverview,
    initNewProject,
    saveProgressIntoProjectConfig,
    telemetryNewProject,
    processChdirToProject,
} from './questionHelpers';
import { TaskOptions } from '../../taskOptions';

export default createTask({
    description: 'Create new ReNative project',
    fn: async () => {
        // Initialize Project
        const payload = await initNewProject();
        // Initial questions
        await inquiryProjectName(payload);
        await inquiryProjectFolder(payload);
        await inquiryIsRenativeProject(payload);
        await inquiryHasNodeModules(payload);
        await inquiryWorkspace(payload);
        await saveProgressIntoProjectConfig(payload);
        await inquiryYarnVersion(payload);
        // Switch execution context to new directory
        await processChdirToProject();
        // Install template only (this avoids whole npm project install)
        await inquiryInstallTemplate(payload);
        await inquiryConfigTemplates(payload);
        await inquiryApplyTemplate(payload);
        await saveProgressIntoProjectConfig(payload);
        // Gather project/app info
        await inquiryBookmarkTemplate(payload);
        await inquiryAppTitle(payload);
        await inquiryAppID(payload);
        await inquiryAppVersion(payload);
        await saveProgressIntoProjectConfig(payload);

        await inquirySupportedPlatforms(payload);
        await inquiryBootstrapQuestions(payload);
        await inquiryGit(payload);
        // Configure final config overrides
        await updateRenativeConfigs();
        await configureConfigOverrides(payload);
        await saveProgressIntoProjectConfig(payload);
        // Now we can apply template (required for appConfigs to be generated properly)
        await updateRenativeConfigs();
        await applyTemplate();
        await configureTemplateFiles();
        await generateLocalJsonSchemas();
        await inquiryAppConfigs(payload);
        await inquiryInstallEngines(payload);
        // Telementry
        await telemetryNewProject(payload);

        await inquiryProjectInstall(payload);

        logToSummary(generateProjectOverview(payload));

        return true;
    },
    task: RnvTaskName.new,
    options: [
        TaskOptions.gitEnabled,
        TaskOptions.answer,
        TaskOptions.workspace,
        TaskOptions.template,
        TaskOptions.projectName,
        TaskOptions.projectTemplate,
        TaskOptions.templateVersion,
        TaskOptions.localTemplatePath,
        TaskOptions.title,
        TaskOptions.appVersion,
        TaskOptions.id,
    ],
    isGlobalScope: true,
    isPriorityOrder: true,
});
