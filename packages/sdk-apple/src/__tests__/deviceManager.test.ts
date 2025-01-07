import { createRnvContext, getContext } from '@rnv/core';
import { getAppleDevices } from '../deviceManager';
import listIOSDevices from '@react-native-community/cli-platform-apple/build/tools/listDevices';
import { DeviceType } from '../types';

const devices: DeviceType[] = [
    {
        isAvailable: true,
        name: 'My Mac',
        udid: 'D9B9188D-C38B-59D9-A1BD-5E4081F6EDA1',
        version: '14.2 (23C64)',
        availabilityError: undefined,
        type: 'device',
    },
    {
        isAvailable: true,
        name: 'iPhone 15',
        udid: 'ABF470AF-2538-4047-94A8-D72E22EB15BF',
        version: '17.4',
        availabilityError: undefined,
        type: 'device',
    },
    {
        isAvailable: true,
        name: 'iPhone 15 Pro',
        udid: '04264D6F-0223-4AC6-9D05-8449DFDC6C3B',
        version: '17.2 (21C62)',
        availabilityError: undefined,
        type: 'simulator',
    },
    {
        isAvailable: true,
        name: 'iPad Pro (11-inch) (4th generation)',
        udid: '59853D87-6F6C-4A6E-9F9C-A9C335F86647',
        version: '17.0 (21A328)',
        availabilityError: undefined,
        type: 'simulator',
    },
];

jest.mock('@react-native-community/cli-platform-apple/build/tools/listDevices');
jest.mock('@rnv/core');

beforeEach(() => {
    createRnvContext();
});

afterEach(() => {
    jest.resetAllMocks();
});

describe('getAppleDevices', () => {
    it('should return only available iOS simulators when ignoreDevices is true', async () => {
        // GIVEN
        const ctx = getContext();
        ctx.platform = 'ios';
        ctx.program.opts = jest.fn().mockReturnValue({ skipTargetCheck: true });
        jest.mocked(listIOSDevices).mockResolvedValueOnce(devices);
        // WHEN
        const result = await getAppleDevices(true, false);
        // THEN
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('iPhone 15 Pro');
        expect(result[0].isDevice).toBe(false);
    });
    it('should return only real devices when ignoreSimulators is true', async () => {
        // GIVEN
        const ctx = getContext();
        ctx.platform = 'ios';
        ctx.program.opts = jest.fn().mockReturnValue({ skipTargetCheck: true });
        jest.mocked(listIOSDevices).mockResolvedValueOnce(devices);
        // WHEN
        const result = await getAppleDevices(false, true);
        // THEN
        expect(result).toHaveLength(2);
        expect(result[1].name).toBe('iPhone 15');
        expect(result[1].isDevice).toBe(true);
    });
    it('should return only available iOS device when ignoreSimulators is true and skipTargetCheck is false', async () => {
        // GIVEN
        const ctx = getContext();
        ctx.platform = 'ios';
        ctx.program.opts = jest.fn().mockReturnValue({ skipTargetCheck: false });
        jest.mocked(listIOSDevices).mockResolvedValueOnce(devices);
        //WHEN
        const result = await getAppleDevices(false, true);
        // THEN
        expect(result).toHaveLength(1);
        expect(result.every((d) => d.isDevice)).toBe(true);
        expect(result[0].name).toBe('iPhone 15');
    });
    it('should handle when no devices are available', async () => {
        // GIVEN
        jest.mocked(listIOSDevices).mockResolvedValueOnce([]);
        // WHEN
        const result = await getAppleDevices(false, true);
        // THEN
        expect(result).toHaveLength(0);
    });
});
