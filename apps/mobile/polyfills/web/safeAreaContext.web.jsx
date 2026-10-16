export {
	SafeAreaProvider,
	SafeAreaInsetsContext,
	SafeAreaFrameContext,
	useSafeAreaFrame,
	initialWindowMetrics,
} from 'react-native-safe-area-context/lib/commonjs';
import { useSafeAreaInsets as useNativeSafeAreaInsets } from 'react-native-safe-area-context/lib/commonjs';

export { SafeAreaView } from './SafeAreaView.web';

// A desktop browser reports no status bar, so screens that sit at
// insets.top + 8 would touch the top edge. The prototype puts the first
// control 22px down (demo-v29 .m-top and .fl both use top:22px), so the web
// export reserves 14px: 14 plus TOP_GAP (8) is SCREEN_TOP (22), see
// components/ui/layout.jsx.
export const WEB_STATUS_BAR = 14;

export const useSafeAreaInsets = () => {
	const isTabletAndAbove =
		typeof window !== 'undefined' ? window.self !== window.top : true;
	const insets = useNativeSafeAreaInsets();
	if (isTabletAndAbove) {
		return {
			left: 0,
			right: 0,
			top: 64,
			bottom: 34,
		};
	}
	return insets.top >= WEB_STATUS_BAR ? insets : { ...insets, top: WEB_STATUS_BAR };
};
