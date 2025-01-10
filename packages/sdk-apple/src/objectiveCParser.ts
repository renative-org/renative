import path from 'path';
import {
    type ConfigPluginPlatformSchema,
    getConfigProp,
    getFlavouredProp,
    chalk,
    logDefault,
    logDebug,
    logWarning,
    parsePlugins,
    writeCleanFile,
    type ConfigAppDelegateMethod,
} from '@rnv/core';
import {
    ObjectiveCAppDelegate,
    PayloadAppDelegateKey,
    PayloadAppDelegateMethod,
    PayloadAppDelegateSubKey,
    ObjectiveCAppDelegateKey,
    ObjectiveCAppDelegateSubKey,
    ObjectiveCMethod,
} from './types';
import { addSystemInjects, getAppTemplateFolder, sanitizeColor } from '@rnv/sdk-utils';
import { Context, getContext } from './getContext';

export const parseAppDelegate = (
    appFolder: string,
    appFolderName: string
    // isBundled = false,
) =>
    new Promise<void>((resolve) => {
        const c = getContext();
        logDefault('parseAppDelegateSync');
        const appDelegateMm = 'AppDelegate.mm';
        const appDelegateH = 'AppDelegate.h';
        const templateXcode = getConfigProp('templateXcode');

        // const entryFile = getEntryFile(c, platform);

        // const forceBundle = getGetJsBundleFile(c, platform);
        // let bundle;
        // if (forceBundle) {
        //     bundle = forceBundle;
        // } else if (isBundled) {
        //     bundle = `RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "${entryFile}", fallbackResource: nil)`;
        // } else {
        //     bundle = `URL(string: "http://${ip}:${newPort}/${entryFile}.bundle?platform=ios")`;
        // }

        // PLUGINS
        parsePlugins((plugin, pluginPlat, key) => {
            injectPluginObjectiveCSync(c, pluginPlat, key);
        });

        // BG COLOR
        // let pluginBgColor = 'vc.view.backgroundColor = UIColor.white';
        // const UI_COLORS = ['black', 'blue', 'brown', 'clear', 'cyan', 'darkGray', 'gray', 'green', 'lightGray', 'magneta', 'orange', 'purple', 'red', 'white', 'yellow'];
        // if (backgroundColor) {
        //     if (UI_COLORS.includes(backgroundColor)) {
        //         pluginBgColor = `vc.view.backgroundColor = UIColor.${backgroundColor}`;
        //     } else {
        //         logWarning(`Your choosen color in renative.json for platform ${chalk().bold(platform)} is not supported by UIColor. use one of the predefined ones: ${chalk().bold(UI_COLORS.join(','))}`);
        //     }
        // }

        const clr = sanitizeColor(getConfigProp('backgroundColor'), 'backgroundColor').rgbDecimal;
        const pluginBgColor = `vc.view.backgroundColor = UIColor(red: ${clr[0]}, green: ${clr[1]}, blue: ${clr[2]}, alpha: ${clr[3]})`;
        const methods: ObjectiveCAppDelegate = {
            application: {
                didFinishLaunchingWithOptions: {
                    isRequired: true,
                    func: '- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {',
                    begin: `
        self.moduleName = @"RNVApp";
        // You can add your custom initial props in the dictionary below.
        // They will be passed down to the ViewController used by React Native.
        self.initialProps = @{};
        bool didFinish=[super application:application didFinishLaunchingWithOptions:launchOptions];
                `,
                    render: (v) => `${v};`,
                    end: 'return didFinish;',
                },
                sourceURLForBridge: {
                    isRequired: true,
                    func: '- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge {',
                    begin: `
            return [self bundleURL];
        }
        - (NSURL *)bundleURL {
        #if DEBUG
            return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
        #else
            return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
        #endif
                    `,
                    render: (v) => `${v};`,
                    end: null,
                },
                applicationDidBecomeActive: {
                    func: '- (void)applicationDidBecomeActive:(UIApplication *)application {',
                    begin: null,
                    render: (v) => `${v};`,
                    end: null,
                },
                open: {
                    func: '- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options {',
                    begin: 'BOOL handled = false;',
                    render: (v) => `if(!handled) { handled = ${v}; }`,
                    end: 'return handled;',
                },
                continue: {
                    func: '- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> *restorableObjects))restorationHandler {',
                    begin: null,
                    render: (v) => `return ${v};`,
                    end: null,
                },
                supportedInterfaceOrientationsFor: {
                    func: ' - (UIInterfaceOrientationMask)application:(UIApplication *)application supportedInterfaceOrientationsForWindow:(UIWindow *)window {',
                    begin: null,
                    render: (v) => `return ${v};`,
                    end: null,
                },
                didConnectCarInterfaceController: {
                    //Deprecated
                    func: '- (void)application:(UIApplication *)application didConnectCarInterfaceController:(CPInterfaceController *)interfaceController toWindow:(CPWindow *)window {',
                    begin: null,
                    render: (v) => `${v};`,
                    end: null,
                },
                didDisconnectCarInterfaceController: {
                    //Deprecated
                    func: '- (void)application:(UIApplication *)application didDisconnectCarInterfaceController:(CPInterfaceController *)interfaceController fromWindow:(CPWindow *)window {',
                    begin: null,
                    render: (v) => `${v};`,
                    end: null,
                },
                didReceiveRemoteNotification: {
                    func: '- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult result))completionHandler {',
                    begin: null,
                    render: (v) => `${v};`,
                    end: null,
                },
                didFailToRegisterForRemoteNotificationsWithError: {
                    func: '- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {',
                    begin: null,
                    render: (v) => `${v};`,
                    end: null,
                },
                // didReceive: { //Deprecated
                //     func: 'func application(_ application: UIApplication, didReceive notification: UILocalNotification) {',
                //     begin: null,
                //     render: (v) => `${v}`,
                //     end: null,
                // },
                requestAuthorizationWithOptions: {
                    func: '- (void)requestAuthorizationWithOptions:(UNAuthorizationOptions)options completionHandler:(void (^)(BOOL granted, NSError *error))completionHandler {',
                    begin: null,
                    render: (v) => `${v};`,
                    end: null,
                },
                didRegisterForRemoteNotificationsWithDeviceToken: {
                    func: '- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {',
                    begin: null,
                    render: (v) => `${v};`,
                    end: null,
                },
            },
            userNotificationCenter: {
                willPresent: {
                    func: '- (void)userNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler {',
                    begin: null,
                    render: (v) => `${v};`,
                    end: null,
                },
                didReceiveNotificationResponse: {
                    func: '- (void)userNotificationCenter:(UNUserNotificationCenter *)center didReceiveNotificationResponse:(UNNotificationResponse *)response  withCompletionHandler:(void (^)(void))completionHandler {',
                    begin: null,
                    render: (v) => `${v};`,
                    end: null,
                },
            },
            custom: [],
        };

        const constructMethod = (lines: Array<string>, method: ObjectiveCMethod) => {
            let output = '';
            if (lines.length || method.isRequired) {
                output += `\n${method.func}\n`;
                if (method.begin) output += `   ${method.begin}\n`;
                lines.forEach((v) => {
                    output += `    ${method.render(v)}\n`;
                });
                if (method.end) output += `   ${method.end}\n`;
                output += '}\n';
            }
            return output;
        };

        // REORDER Injects
        const injectors: Array<{
            f: ObjectiveCMethod;
            lines: Array<string>;
        }> = [];
        let cleanedLinesArr;
        const mk = Object.keys(methods) as Array<ObjectiveCAppDelegateKey>;
        mk.forEach((key) => {
            const method = methods[key];
            const mk2 = Object.keys(method) as Array<ObjectiveCAppDelegateSubKey>;

            mk2.forEach((key2) => {
                const f = method[key2];
                const lines: Array<PayloadAppDelegateMethod> =
                    c.payload.pluginConfigiOS.appDelegateMmMethods[key][key2] || [];

                const cleanedLines: Record<string, PayloadAppDelegateMethod> = {};

                lines.forEach((l) => {
                    if (!cleanedLines[l.value]) {
                        cleanedLines[l.value] = l;
                    }

                    if (cleanedLines[l.value].weight < l.weight) {
                        cleanedLines[l.value] = l;
                    }
                });
                cleanedLinesArr = Object.values(cleanedLines)
                    .sort((a, b) => a.order - b.order)
                    .map((v) => v.value);

                injectors.push({
                    f,
                    lines: cleanedLinesArr,
                });
            });
        });
        injectors.forEach((v) => {
            c.payload.pluginConfigiOS.pluginAppDelegateMmMethods += constructMethod(v.lines, v.f);
        });

        if (c.payload.pluginConfigiOS.appDelegateMmMethods.custom) {
            c.payload.pluginConfigiOS.pluginAppDelegateMmMethods +=
                c.payload.pluginConfigiOS.appDelegateMmMethods.custom.join('\n ');
        }

        // Root renative.json injections
        injectPluginObjectiveCSync(c, null, '', true);

        if (templateXcode?.AppDelegate_mm?.appDelegateMethods?.custom) {
            c.payload.pluginConfigiOS.pluginAppDelegateMmMethods +=
                templateXcode.AppDelegate_mm.appDelegateMethods.custom.join('\n ');
        }
        // end

        const injectsMm = [
            // { pattern: '{{BUNDLE}}', override: bundle },
            // { pattern: '{{ENTRY_FILE}}', override: entryFile },
            // { pattern: '{{IP}}', override: ip },
            // { pattern: '{{PORT}}', override: newPort },
            { pattern: '{{BACKGROUND_COLOR}}', override: pluginBgColor },
            {
                pattern: '{{APPDELEGATE_MM_IMPORTS}}',
                override: c.payload.pluginConfigiOS.pluginAppDelegateMmImports,
            },
            {
                pattern: '{{APPDELEGATE_METHODS}}',
                override: `${c.payload.pluginConfigiOS.pluginAppDelegateMmMethods}`,
            },
        ];
        const injectsH = [
            {
                pattern: '{{APPDELEGATE_H_IMPORTS}}',
                override: c.payload.pluginConfigiOS.pluginAppDelegateHImports,
            },
            {
                pattern: '{{APPDELEGATE_H_METHODS}}',
                override: c.payload.pluginConfigiOS.pluginAppDelegateHMethods ?? '',
            },
            {
                pattern: '{{APPDELEGATE_H_EXTENSIONS}}',
                override: c.payload.pluginConfigiOS.pluginAppDelegateHExtensions
                    ? ` <${c.payload.pluginConfigiOS.pluginAppDelegateHExtensions}>`
                    : '',
            },
        ];
        addSystemInjects(injectsMm);

        writeCleanFile(
            path.join(getAppTemplateFolder()!, appFolderName, appDelegateMm),
            path.join(appFolder, appFolderName, appDelegateMm),
            injectsMm,
            undefined,
            c
        );
        addSystemInjects(injectsH);

        writeCleanFile(
            path.join(getAppTemplateFolder()!, appFolderName, appDelegateH),
            path.join(appFolder, appFolderName, appDelegateH),
            injectsH,
            undefined,
            c
        );
        resolve();
    });

export const injectPluginObjectiveCSync = (
    c: Context,
    plugin: ConfigPluginPlatformSchema | null,
    key: string,
    configProp = false
) => {
    logDebug(`injectPluginObjectiveCSync:${c.platform}:${key}`);
    const templateXcode = configProp ? getConfigProp('templateXcode') : getFlavouredProp(plugin!, 'templateXcode');
    const appDelegateMmImports = templateXcode?.AppDelegate_mm?.appDelegateImports;

    if (appDelegateMmImports) {
        addAppDelegateImports(c, appDelegateMmImports, 'pluginAppDelegateMmImports');
    }
    // if (plugin.appDelegateMethods instanceof Array) {
    //     c.payload.pluginConfigiOS.pluginAppDelegateMethods += `${plugin.appDelegateMethods.join('\n    ')}`;
    // }
    const appDelegateHhImports = templateXcode?.AppDelegate_h?.appDelegateImports;

    if (appDelegateHhImports) {
        addAppDelegateImports(c, appDelegateHhImports, 'pluginAppDelegateHImports');
    }
    const appDelegateHMethods = templateXcode?.AppDelegate_h?.appDelegateMethods;
    if (appDelegateHMethods) {
        c.payload.pluginConfigiOS['pluginAppDelegateHMethods'] += appDelegateHMethods.join('\n ');
    }
    const appDelegateExtensions = templateXcode?.AppDelegate_h?.appDelegateExtensions;
    if (appDelegateExtensions instanceof Array) {
        appDelegateExtensions.forEach((appDelegateExtension) => {
            // Avoid duplicate imports
            logDebug('appDelegateExtensions add');
            if (c.payload.pluginConfigiOS.pluginAppDelegateHExtensions.indexOf(appDelegateExtension) === -1) {
                logDebug('appDelegateExtensions add ok');
                c.payload.pluginConfigiOS.pluginAppDelegateHExtensions += c.payload.pluginConfigiOS
                    .pluginAppDelegateHExtensions.length
                    ? `${', '}${appDelegateExtension}`
                    : `${appDelegateExtension}`;
            }
        });
    }
    const appDelegateMethods = templateXcode?.AppDelegate_mm?.appDelegateMethods;
    if (appDelegateMethods) {
        const admk = Object.keys(appDelegateMethods) as Array<PayloadAppDelegateKey>;
        admk.forEach((delKey) => {
            const apDelMet = appDelegateMethods[delKey];
            if (apDelMet) {
                if (delKey === 'custom' && Array.isArray(apDelMet)) {
                    c.payload.pluginConfigiOS.appDelegateMmMethods[delKey] = apDelMet;
                } else {
                    const amdk2 = Object.keys(apDelMet) as Array<PayloadAppDelegateSubKey>;
                    amdk2.forEach((key2) => {
                        const plugArr: Array<ConfigAppDelegateMethod> =
                            c.payload.pluginConfigiOS.appDelegateMmMethods[delKey][key2];
                        if (!plugArr) {
                            logWarning(`appDelegateMethods.${delKey}.${chalk().red(key2)} not supported. SKIPPING.`);
                        } else {
                            const plugVal: Array<ConfigAppDelegateMethod> = apDelMet[key2];
                            if (plugVal) {
                                plugVal.forEach((v) => {
                                    const isString = typeof v === 'string';
                                    plugArr.push({
                                        order: isString ? 0 : v?.order || 0,
                                        value: isString ? v : v?.value,
                                        weight: isString ? 0 : v?.weight || 0,
                                    });
                                });
                            }
                        }
                    });
                }
            }
        });
    }
};

export const addAppDelegateImports = (
    c: Context,
    appDelegateImports: string[],
    target: 'pluginAppDelegateHImports' | 'pluginAppDelegateMmImports'
) => {
    appDelegateImports.forEach((appDelegateImport) => {
        // Avoid duplicate imports
        logDebug(`${target.replace('plugin', '')} add`);
        if (c.payload.pluginConfigiOS[target].indexOf(appDelegateImport) === -1) {
            logDebug(`${target.replace('plugin', '')} add ok`);
            c.payload.pluginConfigiOS[target] += appDelegateImport.trim().startsWith('<')
                ? `#import ${appDelegateImport}\n`
                : `#import "${appDelegateImport}"\n`;
        }
    });
};
