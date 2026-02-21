import React, { memo, useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from 'react-native-svg';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type {
  BackgroundCurveProps,
  CurvedBottomTabsProps,
  FloatingButtonComponentProps,
  StyleConfig,
  Tab,
  CurvedTabBarNavigationProps,
} from './types';
import {
  calculateTabPosition,
  processGradient,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH,
} from './helper';

function FloatingButtonComponent({
  icon,
  gradient,
  scale,
  shadow,
  badge,
}: FloatingButtonComponentProps) {
  const buttonSize: number = VIEWPORT_HEIGHT * scale;
  const iconScale = useSharedValue(1);

  useEffect(() => {
    iconScale.value = withRepeat(
      withSequence(withTiming(1.045, { duration: 900 }), withTiming(0.98, { duration: 900 })),
      -1,
      true,
    );
    return () => {
      cancelAnimation(iconScale);
      iconScale.value = 1;
    };
  }, [iconScale]);

  const animatedIconStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        ...shadow,
      }}
    >
      <Svg width={buttonSize} height={buttonSize}>
        <Defs>
          <SvgGradient
            id="floatingButtonGradient"
            x1="0%"
            y1="25%"
            x2="80%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={gradient[0]} />
            <Stop offset="100%" stopColor={gradient[1]} />
          </SvgGradient>
        </Defs>
        <Circle
          cx={buttonSize / 2}
          cy={buttonSize / 2}
          r={buttonSize / 2}
          fill="url(#floatingButtonGradient)"
        />
      </Svg>
      <Animated.View
        style={[
          {
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
            width: buttonSize,
            height: buttonSize,
          },
          animatedIconStyle,
        ]}
      >
        {icon}
      </Animated.View>
      {badge !== undefined && badge > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -5,
            right: -10,
            backgroundColor: '#ff4444',
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: 10,
              fontWeight: 'bold',
            }}
          >
            {badge > 99 ? '99+' : badge.toString()}
          </Text>
        </View>
      )}
    </View>
  );
}

function BackgroundCurve({ position, gradient, height }: BackgroundCurveProps) {
  const screenWidth = Math.ceil(VIEWPORT_WIDTH * 100);
  const totalWidth = screenWidth * 3;
  const centerOffset = screenWidth;
  const origWidth = 394;
  const origHeight = 86;

  const curveWidth = screenWidth;
  const leftEdge = (133 / origWidth) * curveWidth;
  const rightEdge = (258 / origWidth) * curveWidth;
  const center = (197 / origWidth) * curveWidth;
  const notchHeight = (43.5 / origHeight) * height;
  const leftControl1 = (159.724 / origWidth) * curveWidth;
  const leftControl2 = (172.684 / origWidth) * curveWidth;
  const rightControl1 = (220.932 / origWidth) * curveWidth;
  const rightControl2 = (235.992 / origWidth) * curveWidth;

  const path = `
    M0 0
    L${centerOffset} 0
    C${centerOffset} 0 ${centerOffset + leftEdge * 0.8} 0 ${centerOffset + leftEdge} 0
    C${centerOffset + leftControl1} 0 ${centerOffset + leftControl2} ${notchHeight} ${centerOffset + center} ${notchHeight}
    C${centerOffset + rightControl1} ${notchHeight * 0.99} ${centerOffset + rightControl2} 0 ${centerOffset + rightEdge} 0
    C${centerOffset + rightEdge + (curveWidth - rightEdge) * 0.1} 0 ${centerOffset + curveWidth} 0 ${centerOffset + curveWidth} 0
    L${totalWidth} 0
    V${height}
    H0
    V0
    Z
  `;

  const animatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ translateX: position.value }],
  }));

  return (
    <View style={{ overflow: 'hidden', width: screenWidth }}>
      <Animated.View style={animatedStyle}>
        <Svg
          width={totalWidth}
          height={height}
          preserveAspectRatio="none"
          viewBox={`0 0 ${totalWidth} ${height}`}
          fill="none"
        >
          <Path d={path} fill="url(#curveGradient)" />
          <Defs>
            <SvgGradient
              id="curveGradient"
              x1={0}
              y1={height * 0.8}
              x2={totalWidth}
              y2={height * 0.8}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset={0.0576923} stopColor={gradient[0]} />
              <Stop offset={0.903846} stopColor={gradient[1]} />
            </SvgGradient>
          </Defs>
        </Svg>
      </Animated.View>
    </View>
  );
}

interface CurvedTabItemProps {
  tab: Tab;
  index: number;
  isActive: boolean;
  onPress: () => void;
  gradient: readonly [string, string];
  styles: ReturnType<typeof createStyles>;
  buttonScale: number;
  shadow: NonNullable<CurvedBottomTabsProps['shadow']>;
}

function CurvedTabItem({
  tab,
  isActive,
  onPress,
  gradient,
  styles,
  buttonScale,
  shadow,
}: CurvedTabItemProps) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(isActive ? -VIEWPORT_HEIGHT * 4.2 : 0, {
      damping: 10,
      stiffness: 100,
      mass: 0.5,
    });
  }, [isActive, translateY]);

  const animatedTabStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const hasLabel = tab.title.trim().length > 0;

  return (
    <Animated.View style={[styles.tabWrapper, animatedTabStyle]}>
      <TouchableOpacity onPress={onPress} style={styles.tabTouchable} activeOpacity={0.9}>
        {isActive ? (
          <FloatingButtonComponent
            icon={tab.icon}
            gradient={gradient}
            scale={buttonScale}
            shadow={shadow}
            badge={tab.badge}
          />
        ) : (
          <>
            <View style={styles.iconWrapper}>
              {tab.icon}
              {tab.badge !== undefined && tab.badge > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeLabel}>{tab.badge > 99 ? '99+' : tab.badge.toString()}</Text>
                </View>
              )}
            </View>
            {hasLabel && <Text style={styles.tabLabel}>{tab.title}</Text>}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function CurvedBottomTabsCore({
  tabs,
  currentIndex,
  onPress,
  gradient,
  barHeight = 9,
  buttonScale = 6,
  labelColor = '#cccccc',
  textSize = 12,
  fontFamily,
  hideWhenKeyboardShown = false,
  animation = { damping: 12, stiffness: 120, mass: 0.5 },
  shadow = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
}: CurvedBottomTabsProps) {
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);

  const curvePosition = useSharedValue<number>(0);
  const processedGradient = processGradient<string[]>(gradient);

  useEffect(() => {
    if (!hideWhenKeyboardShown) return;

    const showListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [hideWhenKeyboardShown]);

  useEffect(() => {
    const targetPosition = calculateTabPosition<number, number>(currentIndex, tabs.length);
    curvePosition.value = withTiming(targetPosition, {
      duration: 260,
    });
  }, [currentIndex, tabs.length, curvePosition, animation]);

  const styles = createStyles<StyleConfig>({
    barHeight,
    textSize,
    fontFamily,
    inactiveColor: '#cccccc',
    labelColor,
  });

  if (hideWhenKeyboardShown && keyboardVisible) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.backgroundContainer}>
        <BackgroundCurve
          position={curvePosition}
          gradient={processedGradient}
          height={Math.ceil(VIEWPORT_HEIGHT * barHeight)}
        />
      </View>

      {tabs.map((tab, index) => (
        <CurvedTabItem
          key={tab.id}
          tab={tab}
          index={index}
          isActive={currentIndex === index}
          onPress={() => onPress(index, tab)}
          gradient={processedGradient}
          styles={styles}
          buttonScale={buttonScale}
          shadow={shadow}
        />
      ))}
    </View>
  );
}

const createStyles = <T extends StyleConfig>({ barHeight, textSize, fontFamily, labelColor }: T) =>
  StyleSheet.create({
    wrapper: {
      position: 'absolute',
      bottom: 0,
      alignSelf: 'center',
      backgroundColor: 'transparent',
      justifyContent: 'space-between',
      height: Math.ceil(VIEWPORT_HEIGHT * barHeight),
      flexDirection: 'row',
      width: '100%',
    },
    backgroundContainer: {
      position: 'absolute',
      bottom: 0,
      zIndex: 20,
      width: '100%',
    },
    tabWrapper: {
      flex: 1,
      zIndex: 30,
    },
    tabTouchable: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      paddingBottom: Platform.OS === 'ios' ? VIEWPORT_HEIGHT * 0.98 : 0,
    },
    tabLabel: {
      fontSize: textSize,
      fontFamily,
      color: labelColor,
      textAlign: 'center',
      marginTop: 10,
    },
    iconWrapper: {
      position: 'relative',
    },
    badgeContainer: {
      position: 'absolute',
      top: -5,
      right: -10,
      backgroundColor: '#ff4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeLabel: {
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold',
    },
  });

const CurvedBottomTabsComponent: React.FC<BottomTabBarProps & CurvedTabBarNavigationProps> = ({
  state,
  descriptors,
  navigation,
  gradients = ['#121212', '#1A1A1A'],
}) => {
    const tabs: Tab[] = state.routes.map((route, index) => {
      const { options } = descriptors[route.key];
      const isActive = state.index === index;

      return {
        id: route.key,
        title:
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name,
        icon: options.tabBarIcon
          ? options.tabBarIcon({
              focused: isActive,
              color: isActive ? '#ffffff' : '#cccccc',
              size: 24,
            })
          : null,
        badge: typeof options.tabBarBadge === 'number' ? options.tabBarBadge : undefined,
      };
    });

    const handlePress = (index: number): void => {
      const route = state.routes[index];
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (state.index !== index && !event.defaultPrevented) {
        navigation.navigate(route.name as any, route.params as any);
      }
    };

    return (
      <CurvedBottomTabsCore
        tabs={tabs}
        currentIndex={state.index}
        onPress={handlePress}
        gradient={gradients}
      />
    );
};

export const CurvedBottomTabs = memo(CurvedBottomTabsComponent);
CurvedBottomTabs.displayName = 'CurvedBottomTabs';
