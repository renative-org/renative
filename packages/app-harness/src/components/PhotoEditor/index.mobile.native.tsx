import React, { forwardRef, useEffect } from 'react';
import { Text, Image, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { RNPhotoEditor } from 'react-native-photo-editor';
import RNFS from 'react-native-fs';
import RNFetchBlob from 'rn-fetch-blob';
import { useLoggerContext } from '../../context';
import { ICON_LOGO } from '../../config';
import styles from '../../styles';

type ButtonProps = TouchableOpacityProps;
export const PhotoEditorButton = forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
    ({ onBlur, onFocus, style }, ref) => {
        const { logDebug } = useLoggerContext();
        const photoPath = RNFS.DocumentDirectoryPath + ICON_LOGO;
        useEffect(() => {
            const fetchAndMovePhoto = async () => {
                const binaryFile = Image.resolveAssetSource(ICON_LOGO);
                try {
                    const resp = await RNFetchBlob.config({ fileCache: true }).fetch('GET', binaryFile.uri);
                    if (await RNFS.exists(photoPath)) {
                        await RNFS.unlink(photoPath);
                    }
                    await RNFS.moveFile(resp.path(), photoPath);
                    logDebug('FILE WRITTEN!');
                } catch (error) {
                    logDebug(`${error}`);
                }
            };
            fetchAndMovePhoto();
        }, []);
        const handlePhotoEditor = () => {
            RNPhotoEditor.Edit({
                path: photoPath,
                onDone: () => {
                    logDebug('on done');
                },
                onCancel: () => {
                    logDebug('on cancel');
                },
            });
        };
        return (
            <TouchableOpacity ref={ref} onPress={handlePhotoEditor} onFocus={onFocus} onBlur={onBlur} style={style}>
                <Text style={styles.buttonTitle}>Show PhotoEditor</Text>
            </TouchableOpacity>
        );
    }
);
