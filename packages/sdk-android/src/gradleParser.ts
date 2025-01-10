import {
    OverridesOptions,
    ConfigPluginPlatformSchema,
    RnvContext,
    RnvPlugin,
    chalk,
    doResolve,
    doResolvePath,
    fsExistsSync,
    fsWriteFileSync,
    getAppFolder,
    getConfigProp,
    includesPluginPath,
    isSystemWin,
    logDebug,
    logDefault,
    logWarning,
    sanitizePluginPath,
    writeCleanFile,
} from '@rnv/core';
import path from 'path';
import { getBuildFilePath, getAppId, getAppVersion, getAppVersionCode, addSystemInjects } from '@rnv/sdk-utils';
import { Context, getContext } from './getContext';
import { TemplateAndroid } from './types';

const currentOs = process.platform === 'darwin' ? 'osx' : process.platform === 'win32' ? 'win64' : 'linux64';

export const parseBuildGradleSync = () => {
    const c = getContext();
    const appFolder = getAppFolder();

    const templateAndroid = getConfigProp('templateAndroid');
    const buildscript = templateAndroid?.build_gradle?.buildscript;

    const injects: OverridesOptions = [
        {
            pattern: '{{COMPILE_SDK_VERSION}}',
            override: c.payload.pluginConfigAndroid.compileSdkVersion,
        },
        {
            pattern: '{{TARGET_SDK_VERSION}}',
            override: c.payload.pluginConfigAndroid.targetSdkVersion,
        },
        {
            pattern: '{{INJECT_BUILD_TOOLS_VERSION}}',
            override: c.payload.pluginConfigAndroid.gradleBuildToolsVersion,
        },
        {
            pattern: '{{SUPPORT_LIB_VERSION}}',
            override: c.payload.pluginConfigAndroid.supportLibVersion,
        },
        {
            pattern: '{{BUILD_TOOLS_VERSION}}',
            override: c.payload.pluginConfigAndroid.buildToolsVersion,
        },
        {
            pattern: '{{INJECT_KOTLIN_VERSION}}',
            override: c.payload.pluginConfigAndroid.kotlinVersion,
        },
        {
            pattern: '{{INJECT_GOOGLE_SERVICES_VERSION}}',
            override: c.payload.pluginConfigAndroid.googleServicesVersion,
        },
        {
            pattern: '{{INJECT_PLUGINS}}',
            override: c.payload.pluginConfigAndroid.buildGradlePlugins,
        },
        {
            pattern: '{{MIN_SDK_VERSION}}',
            override: c.payload.pluginConfigAndroid.minSdkVersion,
        },
        {
            pattern: '{{NDK_VERSION}}',
            override: c.payload.pluginConfigAndroid.ndkVersion,
        },
        {
            pattern: '{{INJECT_AFTER_ALL}}',
            override: c.payload.pluginConfigAndroid.buildGradleAfterAll,
        },
        {
            pattern: '{{INJECT_REACT_NATIVE_ENGINE}}',
            override: c.payload.pluginConfigAndroid.injectReactNativeEngine,
        },
        {
            pattern: '{{PATH_REACT_NATIVE}}',
            override:
                doResolve(c.runtime.runtimeExtraProps?.reactNativePackageName || 'react-native', true, {
                    forceForwardPaths: true,
                }) || '',
        },
        {
            pattern: '{{PATH_REACT_NATIVE_CODEGEN}}',
            override: doResolve('@react-native/codegen', true, { forceForwardPaths: true }) || '',
        },
        {
            pattern: '{{PATH_REACT_NATIVE_CLI_ANDROID}}',
            override:
                doResolve('@react-native-community/cli-platform-android', true, {
                    forceForwardPaths: true,
                }) || '',
        },
        {
            pattern: '{{PATH_HERMESC}}',
            override: `${
                doResolve('react-native', true, { forceForwardPaths: true }) || 'react-native'
            }/sdks/hermesc/${currentOs}-bin/hermesc`,
        },
        {
            pattern: '{{INJECT_BUILDSCRIPT_EXT}}',
            override: buildscript?.ext?.join('\n') ?? '',
        },
        {
            pattern: '{{INJECT_BUILDSCRIPT_REPOSITORIES}}',
            override: buildscript?.repositories?.join('\n') ?? '',
        },
        {
            pattern: '{{INJECT_BUILDSCRIPT_CUSTOM}}',
            override: buildscript?.custom?.join('\n') ?? '',
        },
        {
            pattern: '{{INJECT_BUILDSCRIPT_DEPENDENCIES}}',
            override: buildscript?.dependencies?.join('\n') ?? '',
        },
        {
            pattern: '{{INJECT_GRADLE_AFTER_ALL}}',
            override: templateAndroid?.build_gradle?.injectAfterAll?.join('\n') ?? '',
        },
    ];

    addSystemInjects(injects);

    writeCleanFile(getBuildFilePath('build.gradle'), path.join(appFolder, 'build.gradle'), injects, undefined, c);
};

const setReactNativeEngineDefault = (c: Context) => {
    c.payload.pluginConfigAndroid.injectReactNativeEngine = `
maven { url "${doResolve('react-native', true, { forceForwardPaths: true })}/android" }
maven { url("${doResolve('jsc-android', true, { forceForwardPaths: true })}/dist") }
`;

    c.payload.pluginConfigAndroid.appBuildGradleImplementations += "    implementation 'org.webkit:android-jsc:+'\n";
};

const setReactNativeEngineHermes = (c: Context) => {
    // TODO review if we need this, IIRC hermes is enabled in gradle.properties and that's it
    c.payload.pluginConfigAndroid.injectReactNativeEngine = `
  maven { url "${doResolve('react-native', true, { forceForwardPaths: true })}/android" }
  maven { url("${doResolve('jsc-android', true, { forceForwardPaths: true })}/dist") }
  `;
};

const setReactNativeEngineV8 = (c: Context) => {
    c.payload.pluginConfigAndroid.injectReactNativeEngine = `
  maven { url "${doResolve('react-native', true, { forceForwardPaths: true })}/android" }
  maven { url("${doResolve('jsc-android', true, { forceForwardPaths: true })}/dist") }
  `;

    c.payload.pluginConfigAndroid.pluginApplicationImports += `import com.facebook.react.bridge.JavaScriptExecutorFactory
    import com.facebook.react.modules.systeminfo.AndroidInfoHelpers
    import io.csie.kudo.reactnative.v8.executor.V8ExecutorFactory`;

    c.payload.pluginConfigAndroid.reactNativeHostMethods += `override fun getJavaScriptExecutorFactory(): JavaScriptExecutorFactory {
            return V8ExecutorFactory(
                applicationContext,
                packageName,
                AndroidInfoHelpers.getFriendlyDeviceName(),
                getUseDeveloperSupport()
            )
        }`;

    c.payload.pluginConfigAndroid.packagingOptions += `
    exclude '**/libjsc.so'`;
};

export const parseAppBuildGradleSync = () => {
    const c = getContext();
    logDefault('parseAppBuildGradleSync');
    const appFolder = getAppFolder();
    const { platform } = c;

    if (!platform) return;

    // ANDROID PROPS
    c.payload.pluginConfigAndroid.minSdkVersion = getConfigProp('minSdkVersion') || 24;
    c.payload.pluginConfigAndroid.targetSdkVersion = getConfigProp('targetSdkVersion') || 34;
    c.payload.pluginConfigAndroid.compileSdkVersion = getConfigProp('compileSdkVersion') || 35;
    c.payload.pluginConfigAndroid.ndkVersion = getConfigProp('ndkVersion') || '26.1.10909125';
    c.payload.pluginConfigAndroid.gradleBuildToolsVersion = getConfigProp('gradleBuildToolsVersion') || '4.2.2';
    c.payload.pluginConfigAndroid.supportLibVersion = getConfigProp('supportLibVersion') || '28.0.0';
    c.payload.pluginConfigAndroid.buildToolsVersion = getConfigProp('buildToolsVersion') || '35.0.0';
    c.payload.pluginConfigAndroid.kotlinVersion = getConfigProp('kotlinVersion') || '1.9.24';
    c.payload.pluginConfigAndroid.googleServicesVersion = getConfigProp('googleServicesVersion') || '4.2.0';

    const reactNativeEngine = getConfigProp('reactNativeEngine') || 'hermes';

    switch (reactNativeEngine) {
        case 'jsc': {
            setReactNativeEngineDefault(c);
            break;
        }
        case 'v8-android': {
            setReactNativeEngineV8(c);
            break;
        }
        case 'v8-android-nointl': {
            setReactNativeEngineV8(c);
            break;
        }
        case 'v8-android-jit': {
            setReactNativeEngineV8(c);
            break;
        }
        case 'v8-android-jit-nointl': {
            setReactNativeEngineV8(c);
            break;
        }
        case 'hermes': {
            setReactNativeEngineHermes(c);
            break;
        }
        default: {
            logWarning(`Unsupported react native engine ${reactNativeEngine}. Will use default instead`);
            setReactNativeEngineHermes(c);
        }
    }

    // SIGNING CONFIGS
    const debugSigning = `
    debug {
        storeFile file('debug.keystore')
        storePassword "android"
        keyAlias "androiddebugkey"
        keyPassword "android"
    }`;

    c.payload.pluginConfigAndroid.appBuildGradleSigningConfigs = `${debugSigning}
    release`;
    c.payload.pluginConfigAndroid.localProperties = '';

    const storeFile = getConfigProp('storeFile');
    const keyAlias = getConfigProp('keyAlias');
    const storePassword = getConfigProp('storePassword');
    const keyPassword = getConfigProp('keyPassword');
    const minifyEnabled = getConfigProp('minifyEnabled');

    c.payload.pluginConfigAndroid.store = {
        storeFile: storeFile,
    };

    if (!!storeFile && !!keyAlias && !!storePassword && !!keyPassword) {
        const keystorePath = storeFile;
        let keystorePathFull = keystorePath;
        if (keystorePath) {
            if (keystorePath.startsWith('.') || !fsExistsSync(keystorePathFull)) {
                //NOTE: because of merged logic we don't know whether renative.private.json
                // values come from project or appConfig so we selectively check both
                keystorePathFull = path.join(c.paths.workspace.appConfig.dir, keystorePath);
                if (!fsExistsSync(keystorePathFull)) {
                    keystorePathFull = path.join(c.paths.workspace.project.dir, keystorePath);
                }
            }
            if (isSystemWin) {
                keystorePathFull = keystorePathFull.replace(/\\/g, '/');
            }
        }
        if (fsExistsSync(keystorePathFull)) {
            const genPropsPath = path.join(appFolder, 'keystore.properties');
            fsWriteFileSync(
                genPropsPath,
                `# auto generated by ReNative
storeFile=${keystorePathFull}
keyAlias=${keyAlias}
storePassword=${storePassword}
keyPassword=${keyPassword}`
            );

            c.payload.pluginConfigAndroid.appBuildGradleSigningConfigs = `${debugSigning}
          release {
              storeFile file(keystoreProps['storeFile'])
              storePassword keystoreProps['storePassword']
              keyAlias keystoreProps['keyAlias']
              keyPassword keystoreProps['keyPassword']
          }`;

            c.payload.pluginConfigAndroid.localProperties = `
def keystorePropsFile = rootProject.file("keystore.properties")
def keystoreProps = new Properties()
keystoreProps.load(new FileInputStream(keystorePropsFile))`;
        } else {
            logWarning(
                `Your ${chalk().bold.white(
                    keystorePathFull
                )} does not exist. You won't be able to make production releases without it!`
            );
        }
    } else if (storeFile) {
        const missingKeys = [];
        if (!keyAlias) missingKeys.push('keyAlias');
        if (!storePassword) missingKeys.push('storePassword');
        if (!keyPassword) missingKeys.push('keyPassword');
        logWarning(`You defined store file ${chalk().bold.white(
            storeFile
        )}, but you are missing following keys: ${chalk().red(missingKeys.join(', '))}
Check your private files at:
${chalk().bold.white(c.paths.workspace?.appConfig?.configsPrivate?.join('\n'))}`);
    }

    // BUILD_TYPES
    const templateAndroid = getConfigProp('templateAndroid');
    // const pluginConfig = c.buildConfig ?? {};
    const appBuildGradle = templateAndroid?.app_build_gradle;
    const debugBuildTypes = appBuildGradle?.buildTypes?.debug ?? [];
    const releaseBuildTypes: string[] = appBuildGradle?.buildTypes?.release ?? [];
    const isSigningDisabled = getConfigProp('disableSigning') === true;
    c.payload.pluginConfigAndroid.buildTypes = `
    debug {
        minifyEnabled ${minifyEnabled}
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        ${debugBuildTypes.join('\n        ')}
    }
    release {
        minifyEnabled ${minifyEnabled}
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        ${isSigningDisabled ? '' : 'signingConfig signingConfigs.release'}
        ${releaseBuildTypes.join('\n        ')}
    }`;

    // APP/BUILD.GRADLE
    _parseAppBuildGradleObject(appBuildGradle);

    // MULTI APK
    // const versionCodeOffset = getConfigProp('versionCodeOffset', 0);
    const isMultiApk = getConfigProp('multipleAPKs') === true;
    c.payload.pluginConfigAndroid.multiAPKs = '';
    if (isMultiApk) {
        // TODO migrate this to gradle.properties + it's enabled by default
        //     const multiSet = 'Integer.parseInt(Integer.toString(variant.versionCode) + Integer.toString(bavc))';
        //     c.payload.pluginConfigAndroid.multiAPKs = `
        //   ext.abiCodes = ["armeabi-v7a": 1, "x86": 2, "arm64-v8a": 3, "x86_64": 4]
        //   import com.android.build.OutputFile
        //   android.applicationVariants.all { variant ->
        //     variant.outputs.each { output ->
        //       def bavc = project.ext.abiCodes.get(output.getFilter(OutputFile.ABI))
        //       if (bavc != null) {
        //         output.versionCodeOverride = ${multiSet} + ${versionCodeOffset}
        //       }
        //     }
        //   }`;
    }

    // SPLITS
    c.payload.pluginConfigAndroid.splits = '';
    if (isMultiApk) {
        c.payload.pluginConfigAndroid.splits = `
    splits {
      abi {
          reset()
          enable true
          include "armeabi-v7a", "x86", "arm64-v8a", "x86_64"
          universalApk false
      }
    }
`;
    }

    // PACKAGING OPTIONS
    c.payload.pluginConfigAndroid.packagingOptions += `
    exclude 'META-INF/DEPENDENCIES.txt'
    exclude 'META-INF/DEPENDENCIES'
    exclude 'META-INF/dependencies.txt'
    exclude 'META-INF/LICENSE.txt'
    exclude 'META-INF/LICENSE'
    exclude 'META-INF/license.txt'
    exclude 'META-INF/LGPL2.1'
    exclude 'META-INF/NOTICE.txt'
    exclude 'META-INF/NOTICE'
    exclude 'META-INF/notice.txt'
    pickFirst 'lib/armeabi-v7a/libc++_shared.so'
    pickFirst 'lib/x86_64/libc++_shared.so'
    pickFirst 'lib/x86/libc++_shared.so'
    pickFirst 'lib/arm64-v8a/libc++_shared.so'
    pickFirst 'lib/arm64-v8a/libjsc.so'
    pickFirst 'lib/x86_64/libjsc.so'`;

    // COMPILE OPTIONS
    c.payload.pluginConfigAndroid.compileOptions = `
    sourceCompatibility 1.8
    targetCompatibility 1.8`;

    const injects = [
        {
            pattern: '{{PLUGIN_APPLY}}',
            override: c.payload.pluginConfigAndroid.applyPlugin,
        },
        { pattern: '{{APPLICATION_ID}}', override: getAppId() },
        {
            pattern: '{{VERSION_CODE}}',
            override: getAppVersionCode(),
        },
        {
            pattern: '{{VERSION_NAME}}',
            override: getAppVersion(),
        },
        {
            pattern: '{{PLUGIN_IMPLEMENTATIONS}}',
            override: c.payload.pluginConfigAndroid.appBuildGradleImplementations,
        },
        {
            pattern: '{{PLUGIN_AFTER_EVALUATE}}',
            override: c.payload.pluginConfigAndroid.appBuildGradleAfterEvaluate,
        },
        {
            pattern: '{{PLUGIN_SIGNING_CONFIGS}}',
            override: c.payload.pluginConfigAndroid.appBuildGradleSigningConfigs,
        },
        {
            pattern: '{{PLUGIN_SPLITS}}',
            override: c.payload.pluginConfigAndroid.splits,
        },
        {
            pattern: '{{PLUGIN_ANDROID_DEFAULT_CONFIG}}',
            override: c.payload.pluginConfigAndroid.defaultConfig,
        },
        {
            pattern: '{{PLUGIN_PACKAGING_OPTIONS}}',
            override: c.payload.pluginConfigAndroid.packagingOptions,
        },
        {
            pattern: '{{PLUGIN_BUILD_TYPES}}',
            override: c.payload.pluginConfigAndroid.buildTypes,
        },
        {
            pattern: '{{PLUGIN_MULTI_APKS}}',
            override: c.payload.pluginConfigAndroid.multiAPKs,
        },
        {
            pattern: '{{MIN_SDK_VERSION}}',
            override: c.payload.pluginConfigAndroid.minSdkVersion,
        },
        {
            pattern: '{{TARGET_SDK_VERSION}}',
            override: c.payload.pluginConfigAndroid.targetSdkVersion,
        },
        {
            pattern: '{{COMPILE_SDK_VERSION}}',
            override: c.payload.pluginConfigAndroid.compileSdkVersion,
        },
        {
            pattern: '{{PLUGIN_COMPILE_OPTIONS}}',
            override: c.payload.pluginConfigAndroid.compileOptions,
        },
        {
            pattern: '{{PLUGIN_LOCAL_PROPERTIES}}',
            override: c.payload.pluginConfigAndroid.localProperties,
        },
        {
            pattern: '{{PATH_REACT_NATIVE}}',
            override: doResolve(c.runtime.runtimeExtraProps?.reactNativePackageName || 'react-native', true, {
                forceForwardPaths: true,
            }),
        },
        {
            pattern: '{{PATH_HERMES_ENGINE}}',
            override: doResolve('hermes-engine', true, { forceForwardPaths: true }),
        },
        {
            pattern: '{{INJECT_KOTLIN_VERSION}}',
            override: c.payload.pluginConfigAndroid.kotlinVersion,
        },
        {
            pattern: '{{PATH_REACT_NATIVE_CODEGEN}}',
            override: doResolve('@react-native/codegen', true, { forceForwardPaths: true }) || '',
        },
        {
            pattern: '{{PATH_REACT_NATIVE_CLI_ANDROID}}',
            override:
                doResolve('@react-native-community/cli-platform-android', true, {
                    forceForwardPaths: true,
                }) || '',
        },
        {
            pattern: '{{PATH_HERMESC}}',
            override: `${
                doResolve('react-native', true, { forceForwardPaths: true }) || 'react-native'
            }/sdks/hermesc/${currentOs}-bin/hermesc`,
        },
    ];

    addSystemInjects(injects);
    writeCleanFile(
        getBuildFilePath('app/build.gradle'),
        path.join(appFolder, 'app/build.gradle'),
        injects,
        undefined,
        c
    );
};

export const parseSettingsGradleSync = () => {
    const c = getContext();
    const appFolder = getAppFolder();
    const rnCliLocation = doResolve('@react-native-community/cli-platform-android', true, { forceForwardPaths: true });
    const rnGradlePluginLocation = doResolve('@react-native/gradle-plugin', true, { forceForwardPaths: true });

    const rnCliRelativePath = (!!rnCliLocation && path.relative(appFolder, rnCliLocation).replace(/\\/g, '/')) || '';
    const rnGradlePluginRelativePath =
        (!!rnGradlePluginLocation && path.relative(appFolder, rnGradlePluginLocation).replace(/\\/g, '/')) || '';

    const injects = [
        {
            pattern: '{{PLUGIN_INCLUDES}}',
            override: c.payload.pluginConfigAndroid.pluginIncludes,
        },
        {
            pattern: '{{PLUGIN_PATHS}}',
            override: c.payload.pluginConfigAndroid.pluginPaths,
        },
        {
            pattern: '{{RN_CLI_LOCATION}}',
            override: rnCliRelativePath,
        },
        {
            pattern: '{{RN_GRADLE_PLUGIN_LOCATION}}',
            override: rnGradlePluginRelativePath,
        },
        {
            pattern: '{{RN_GRADLE_PROJECT_NAME}}',
            override: c.files.project.config?.projectName?.replace('/', '-'),
        },
        {
            pattern: '{{SETTINGS_GRADLE_INCLUDE}}',
            override: c.payload.pluginConfigAndroid.settingsGradleInclude,
        },
        {
            pattern: '{{SETTINGS_GRADLE_PROJECT}}',
            override: c.payload.pluginConfigAndroid.settingsGradleProject,
        },
    ];

    addSystemInjects(injects);

    writeCleanFile(getBuildFilePath('settings.gradle'), path.join(appFolder, 'settings.gradle'), injects, undefined, c);
};

export const parseGradlePropertiesSync = () => {
    const c = getContext();
    const appFolder = getAppFolder();
    const { platform } = c;

    if (!platform) return;
    // GRADLE.PROPERTIES
    let pluginGradleProperties = '';

    const templateAndroid = getConfigProp('templateAndroid');

    const gradleProps = templateAndroid?.gradle_properties;

    if (gradleProps) {
        Object.keys(gradleProps).forEach((key) => {
            pluginGradleProperties += `${key}=${gradleProps[key]}\n`;
        });
    }

    const gradleProperties = 'gradle.properties';

    const newArchEnabled = getConfigProp('newArchEnabled');
    const reactNativeEngine = getConfigProp('reactNativeEngine') || 'hermes';
    const enableJetifier = getConfigProp('enableJetifier') || true;
    const enableAndroidX = getConfigProp('enableAndroidX') || true;

    const injects = [
        {
            pattern: '{{PLUGIN_GRADLE_PROPERTIES}}',
            override: pluginGradleProperties,
        },
        {
            pattern: '{{NEW_ARCH_ENABLED}}',
            override: newArchEnabled ? 'true' : 'false',
        },
        {
            pattern: '{{INJECT_HERMES_ENABLED}}',
            override: reactNativeEngine === 'hermes' ? 'true' : 'false',
        },
        {
            pattern: '{{ENABLE_JETIFIER}}',
            override: enableJetifier ? 'true' : 'false',
        },
        {
            pattern: '{{ENABLE_ANDROID_X}}',
            override: enableAndroidX ? 'true' : 'false',
        },
    ];

    addSystemInjects(injects);

    writeCleanFile(getBuildFilePath(gradleProperties), path.join(appFolder, gradleProperties), injects, undefined, c);
};

export const injectPluginGradleSync = (pluginRoot: RnvPlugin, plugin: ConfigPluginPlatformSchema, key: string) => {
    // const keyFixed = key.replace(/\//g, '-').replace(/@/g, '');
    // const packagePath = plugin.path ?? `${key}/android`;
    // let pathAbsolute;
    // try {
    //     pathAbsolute = plugin.path
    //         ? doResolvePath(packagePath, true, { keepSuffix: true })
    //         : doResolvePath(packagePath, true, { keepSuffix: true });
    // } catch (err) {
    //     logWarning(
    //         `GradleParser: plugin ${packagePath} not resolvable and has been skipped`
    //     );
    //     return;
    // }
    // const modulePath = `../../${pathFixed}`;

    // let packageParams = '';
    // if (plugin.packageParams) {
    //     packageParams = plugin.packageParams.join(',');
    // }
    const c = getContext();
    const pathFixed = plugin.path ? `${plugin.path}` : `${key}/android`;
    const skipPathResolutions = pluginRoot.disableNpm;
    let pathAbsolute;

    if (!skipPathResolutions) {
        if (includesPluginPath(pathFixed)) {
            pathAbsolute = sanitizePluginPath(pathFixed, key, true, { forceForwardPaths: true });
        } else {
            pathAbsolute = doResolvePath(pathFixed, true, { forceForwardPaths: true });
        }
    }

    // APP/BUILD.GRADLE
    if (!plugin.skipImplementation && plugin.implementation) {
        c.payload.pluginConfigAndroid.appBuildGradleImplementations += `${plugin.implementation}\n`;
    }

    // SETTINGS.GRADLE
    // Make sure values by default are not undefined
    if (!c.payload.pluginConfigAndroid.settingsGradleInclude) c.payload.pluginConfigAndroid.settingsGradleInclude = '';
    if (!c.payload.pluginConfigAndroid.settingsGradleProject) c.payload.pluginConfigAndroid.settingsGradleProject = '';
    // Add the needed injections for the plugin
    if (plugin.templateAndroid?.settings_gradle) {
        if (
            plugin.templateAndroid?.settings_gradle.include &&
            Array.isArray(plugin.templateAndroid?.settings_gradle.include)
        )
            plugin.templateAndroid?.settings_gradle.include.forEach((prjLine: string) => {
                c.payload.pluginConfigAndroid.settingsGradleInclude += `, ${prjLine}`;
            });
        if (
            plugin.templateAndroid?.settings_gradle.project &&
            Array.isArray(plugin.templateAndroid?.settings_gradle.project)
        )
            plugin.templateAndroid?.settings_gradle.project.forEach((prjLine: string) => {
                c.payload.pluginConfigAndroid.settingsGradleProject += `${sanitizePluginPath(prjLine, key)}\n`;
            });
    }

    parseAndroidConfigObject(plugin, key);

    if (!skipPathResolutions && pathAbsolute) {
        _fixAndroidLegacy(c, pathAbsolute);
    }
};

export const parseAndroidConfigObject = (plugin?: ConfigPluginPlatformSchema, key = '') => {
    // APP/BUILD.GRADLE
    const c = getContext();
    const templateAndroid = plugin?.templateAndroid;

    const appBuildGradle = templateAndroid?.app_build_gradle;
    _parseAppBuildGradleObject(appBuildGradle, key);

    // BUILD.GRADLE
    const buildGradle = templateAndroid?.build_gradle;

    const plugins = buildGradle?.plugins;
    if (plugins?.forEach) {
        plugins.forEach((k) => {
            c.payload.pluginConfigAndroid.buildGradlePlugins += `${k}\n`;
        });
    }

    const injectAfterAll = buildGradle?.injectAfterAll;
    if (injectAfterAll?.forEach) {
        injectAfterAll.forEach((k) => {
            c.payload.pluginConfigAndroid.buildGradleAfterAll += `${sanitizePluginPath(k, key)}\n`;
        });
    }
};

const _fixAndroidLegacy = (c: RnvContext, modulePath: string) => {
    const buildGradle = path.join(c.paths.project.dir, modulePath, 'build.gradle');

    if (fsExistsSync(buildGradle)) {
        logDebug('FIX:', buildGradle);
        writeCleanFile(
            buildGradle,
            buildGradle,
            [
                { pattern: " compile '", override: "  implementation '" },
                { pattern: ' compile "', override: '  implementation "' },
                { pattern: ' testCompile "', override: '  testImplementation "' },
                { pattern: " provided '", override: "  compileOnly '" },
                { pattern: ' provided "', override: '  compileOnly "' },
                {
                    pattern: ' compile fileTree',
                    override: '  implementation fileTree',
                },
            ],
            undefined,
            c
        );
    }
};

const _parseAppBuildGradleObject = (appBuildGradle: TemplateAndroid['app_build_gradle'] | undefined, key = '') => {
    const c = getContext();
    if (appBuildGradle) {
        if (appBuildGradle.apply) {
            appBuildGradle.apply.forEach((v) => {
                c.payload.pluginConfigAndroid.applyPlugin += v.includes('apply')
                    ? `${sanitizePluginPath(v, key)}\n`
                    : `apply ${sanitizePluginPath(v, key)}\n`;
            });
        }

        if (appBuildGradle.defaultConfig) {
            appBuildGradle.defaultConfig.forEach((v) => {
                c.payload.pluginConfigAndroid.defaultConfig += `${sanitizePluginPath(v, key)}\n`;
            });
        }

        const { implementations } = appBuildGradle;
        if (implementations) {
            implementations.forEach((v) => {
                c.payload.pluginConfigAndroid.appBuildGradleImplementations += `    implementation ${sanitizePluginPath(
                    v,
                    key
                )}\n`;
            });
        }

        const afterEvaluate = appBuildGradle?.afterEvaluate;
        if (afterEvaluate) {
            afterEvaluate.forEach((v) => {
                c.payload.pluginConfigAndroid.appBuildGradleAfterEvaluate += ` ${sanitizePluginPath(v, key)}\n`;
            });
        }
    }
};
// const _getPrivateConfig = (c, platform) => {
//     let privateConfigFolder = path.join(c.paths.workspace.dir, c.files.project.package.name, c.buildConfig.id);
//     if (!fsExistsSync(privateConfigFolder)) {
//         privateConfigFolder = path.join(c.paths.workspace.dir, c.files.project.package.name, 'appConfigs', c.buildConfig.id);
//     }
//     const appConfigSPP = c.buildConfig.platforms[platform] ? c.buildConfig.platforms[platform].signingPropertiesPath : null;
//     const appConfigSPPClean = appConfigSPP ? appConfigSPP.replace('{globalConfigDir}', c.paths.workspace.dir) : null;
//     const privateConfigPath = appConfigSPPClean || path.join(privateConfigFolder, 'config.private.json');
//     c.paths.workspaceConfigPath = privateConfigPath;
//     c.paths.workspace.appConfig.dir = privateConfigPath.replace('/config.private.json', '');
//     if (fsExistsSync(privateConfigPath)) {
//         try {
//             const output = JSON.parse(fsReadFileSync(privateConfigPath));
//             output.parentFolder = c.paths.workspace.appConfig.dir;
//             output.path = privateConfigPath;
//             logInfo(
//                 `Found ${chalk().bold(privateConfigPath)}. Will use it for production releases!`,
//             );
//             return output;
//         } catch (e) {
//             logError(e);
//             return null;
//         }
//     } else {
//         logWarning(
//             `You're missing ${chalk().bold(privateConfigPath)} for this app: . You won't be able to make production releases without it!`,
//         );
//         return null;
//     }
// };
