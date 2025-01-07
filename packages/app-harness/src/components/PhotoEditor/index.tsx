import React, { forwardRef } from 'react';
import { useLoggerContext } from '../../context';
import { Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import styles from '../../styles';

type ButtonProps = TouchableOpacityProps;
export const PhotoEditorButton = forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
    ({ onBlur, onFocus, style }, ref) => {
        const { logDebug } = useLoggerContext();
        const handlePhotoEditor = () => {
            logDebug('PhotoEditor not supported on this platform');
        };

        return (
            <TouchableOpacity ref={ref} onPress={handlePhotoEditor} onFocus={onFocus} onBlur={onBlur} style={style}>
                <Text style={styles.buttonTitle}>Show PhotoEditor</Text>
            </TouchableOpacity>
        );
    }
);
