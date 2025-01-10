import React, { forwardRef } from 'react';
import { TouchableOpacityProps, TouchableOpacity, Text } from 'react-native';
import { useLoggerContext } from '../../context';
import styles from '../../styles';
import { testProps } from '../../config';

type ButtonProps = TouchableOpacityProps;
export const NewModuleButton = forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
    ({ onBlur, onFocus, style }, ref) => {
        const { logDebug } = useLoggerContext();
        const onPress = () => {
            logDebug('NativeModules not supported in web');
        };
        return (
            <TouchableOpacity ref={ref} onPress={onPress} onFocus={onFocus} onBlur={onBlur} style={style}>
                <Text style={styles.buttonTitle} {...testProps('app-harness-home-native-call-button')}>
                    Click to invoke native module!
                </Text>
            </TouchableOpacity>
        );
    }
);
