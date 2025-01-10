export type NpmPackageFile = {
    version?: string;
    devDependencies?: Record<string, string>;
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    resolutions?: Record<string, string>;
    author?: string;
    license?: string;
    description?: string;
    name?: string;
    main?: string;
    packageManager?: string;
};

export type NpmPackageFileKey = keyof NpmPackageFile;

export type NpmDepKey =
    | 'dependencies'
    | 'devDependencies'
    | 'peerDependencies'
    | 'optionalDependencies'
    | 'resolutions';
