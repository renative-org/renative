import { ConfigFileRenative } from '../schema/types';

export const RnvFileName = {
    renative: 'renative.json',
    renativeLocal: 'renative.local.json',
    renativePrivate: 'renative.private.json',
    renativeTemplate: 'renative.template.json',
    renativeBuild: 'renative.build.json',
    renativeRuntime: 'renative.runtime.json',
    renativeWorkspaces: 'renative.workspaces.json',
    renativeTemplates: 'renative.templates.json',
    renativePlatforms: 'renative.platforms.json',
    renativeEngine: 'renative.engine.json',
    package: 'package.json',
    appliedOverride: 'applied_overrides.json',
    schema: 'renative-1.0.schema.json',
    rnv: 'rnv.json',
    rnvLocal: 'rnv.local.json',
    rnvPrivate: 'rnv.private.json',
    rnvRuntime: 'rnv.runtime.json',
    // renativeProject: 'renative.project.json',
} as const;

export const renativeKeys: (keyof ConfigFileRenative)[] = [
    'app',
    'project',
    'workspace',
    'local',
    'overrides',
    'integration',
    'engine',
    'plugin',
    'private',
    'integration',
    'template',
    'templates',
    'workspaces',
];
