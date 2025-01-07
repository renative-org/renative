import path from 'path';
import { getConfigProp, fsWriteFileSync, getAppFolder, doResolve, logError, fsExistsSync } from '@rnv/core';
import { getAppFolderName } from './common';

export const parsePrivacyManifest = () => {
    return new Promise<void>((resolve) => {
        const privacyManifest = getConfigProp('privacyManifests');

        if (privacyManifest) {
            const apiTypes = privacyManifest.NSPrivacyAccessedAPITypes;

            const output = `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
    <dict>
        <key>NSPrivacyAccessedAPITypes</key>
        <array>
            ${apiTypes
                .map((api) => {
                    return `
                    <dict>
                        <key>NSPrivacyAccessedAPIType</key>
                        <string>${api.NSPrivacyAccessedAPIType}</string>
                        <array>
                        ${api.NSPrivacyAccessedAPITypeReasons?.map((reason) => {
                            return `<string>${reason}</string>`;
                        }).join('\n')}
                        </array>
                    </dict>
                `;
                })
                .join('')}
        </array>
    </dict>
</plist>
        `;

            const appFolder = getAppFolder();
            const appFolderName = getAppFolderName();

            const primaryPath = path.join(appFolder, 'PrivacyInfo.xcprivacy');
            const secondaryPath = path.join(appFolder, `${appFolderName}/PrivacyInfo.xcprivacy`);

            if (fsExistsSync(primaryPath) || fsExistsSync(secondaryPath)) {
                const existingFilePath = fsExistsSync(primaryPath) ? primaryPath : secondaryPath;
                fsWriteFileSync(existingFilePath, output);
                resolve();
            } else {
                const filePath = secondaryPath;
                fsWriteFileSync(filePath, output);

                const xcodePath = doResolve('xcode');
                if (!xcodePath) {
                    logError(`Cannot resolve xcode path`);
                    resolve();
                    return;
                }

                const xcode = require(xcodePath);
                const projectPath = path.join(appFolder, `${appFolderName}.xcodeproj/project.pbxproj`);
                const xcodeProj = xcode.project(projectPath);

                xcodeProj.parse(() => {
                    xcodeProj.addResourceFile(filePath);
                    fsWriteFileSync(projectPath, xcodeProj.writeSync());
                    resolve();
                });
            }
        } else {
            resolve();
        }
    });
};
