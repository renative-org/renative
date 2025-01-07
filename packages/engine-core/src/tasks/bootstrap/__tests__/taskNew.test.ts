import { getContext, createRnvContext } from '@rnv/core';
import taskNew from '../taskNew';
import {
    initNewProject,
    saveProgressIntoProjectConfig,
    telemetryNewProject,
    processChdirToProject,
} from '../questionHelpers';
import { NewProjectData } from '../types';
import appConfigs from '../questions/appConfigs';
import bootstrapQuestions from '../questions/bootstrapQuestions';
import confirmGit from '../questions/confirmGit';
import isRenativeProject from '../questions/isRenativeProject';
import hasNodeModules from '../questions/hasNodeModules';
import projectName from '../questions/projectName';
import workspace from '../questions/workspace';
import supportedPlatforms from '../questions/supportedPlatforms';
import appTitle from '../questions/appTitle';
import appID from '../questions/appID';
import appVersion from '../questions/appVersion';
import installTemplate from '../questions/installTemplate';
import applyTemplate from '../questions/applyTemplate';
import bookmarkTemplate from '../questions/bookmarkTemplate';
import configTemplates from '../questions/configTemplates';
import projectFolder from '../questions/projectFolder';
import installProject from '../questions/installProject';
import inquiryYarnVersion from '../questions/configureYarnVersion';

jest.mock('@rnv/core');
jest.mock('lodash/set');
jest.mock('path');
jest.mock('semver');
jest.mock('../questions/bootstrapQuestions');
jest.mock('../questions/appTitle');
jest.mock('../questions/installTemplate');
jest.mock('../questions/applyTemplate');
jest.mock('../questions/bookmarkTemplate');
jest.mock('../questions/appID');
jest.mock('../questions/appVersion');
jest.mock('../questions/workspace');
jest.mock('../questions/hasNodeModules');
jest.mock('../questions/isRenativeProject');
jest.mock('../questions/projectName');
jest.mock('../questions/supportedPlatforms');
jest.mock('../questions/confirmGit');
jest.mock('../questions/configTemplates');
jest.mock('../questions/projectFolder');
jest.mock('../questions/installProject');
jest.mock('../questionHelpers');
jest.mock('../questions/appConfigs');
jest.mock('../questions/configureYarnVersion');

beforeEach(() => {
    createRnvContext();
});

afterEach(() => {
    jest.resetAllMocks();
});

describe('taskNew tests', () => {
    it('Execute task.rnv.new', async () => {
        // GIVEN
        const ctx = getContext();
        const payload: NewProjectData = {
            defaults: {
                appVersion: 'MOCK_VERSION',
                templateName: 'MOCK_TEMPLATE',
                projectName: 'MOCK_PROJECT_NAME',
                appTitle: 'MOCK_APP_TITLE',
                workspaceID: 'MOCK_WORKSPACE',
            },
            inputs: {},
            files: {
                project: {
                    renativeConfig: {},
                    packageJson: {},
                },
                configTemplates: {},
                template: {
                    renativeTemplateConfig: {},
                    renativeConfig: {},
                },
            },
        };
        jest.mocked(initNewProject).mockResolvedValue(payload);
        // WHEN
        const result = await taskNew.fn?.({
            ctx,
            taskName: 'MOCK_taskName',
            originTaskName: 'MOCK_originTaskName',
            parentTaskName: 'MOCK_parentTaskName',
            shouldSkip: false,
        });
        // THEN
        expect(result).toEqual(true);
        expect(initNewProject).toHaveBeenCalled();
        expect(projectName).toHaveBeenCalledWith(payload);
        expect(processChdirToProject).toHaveBeenCalled();
        expect(isRenativeProject).toHaveBeenCalledWith(payload);
        expect(hasNodeModules).toHaveBeenCalledWith(payload);
        expect(installTemplate).toHaveBeenCalledWith(payload);
        expect(applyTemplate).toHaveBeenCalledWith(payload);
        expect(saveProgressIntoProjectConfig).toHaveBeenCalledWith(payload);
        expect(appTitle).toHaveBeenCalledWith(payload);
        expect(appID).toHaveBeenCalledWith(payload);
        expect(appVersion).toHaveBeenCalledWith(payload);
        expect(workspace).toHaveBeenCalledWith(payload);
        expect(supportedPlatforms).toHaveBeenCalledWith(payload);
        expect(bootstrapQuestions).toHaveBeenCalledWith(payload);
        expect(confirmGit).toHaveBeenCalledWith(payload);
        expect(bookmarkTemplate).toHaveBeenCalledWith(payload);
        expect(appConfigs).toHaveBeenCalledWith(payload);
        expect(telemetryNewProject).toHaveBeenCalledWith(payload);
        expect(configTemplates).toHaveBeenCalled();
        expect(projectFolder).toHaveBeenCalled();
        expect(installProject).toHaveBeenCalled();
        expect(inquiryYarnVersion).toHaveBeenCalled();
    });
});
