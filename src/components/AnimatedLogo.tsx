import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

// Googleロゴ風のカラー
const LOGO_COLORS = [
  '#4285F4', // 青
  '#EA4335', // 赤
  '#FBBC05', // 黄
  '#34A853', // 緑
  '#4285F4', // 青
  '#EA4335', // 赤
  '#FBBC05', // 黄
  '#34A853', // 緑
];

const LOGO_TEXT = '業界ニュース';

export const AnimatedLogo: React.FC = () => {
  // 各文字のアニメーション値
  const animatedValues = useRef(
    LOGO_TEXT.split('').map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // 波打つようなアニメーション
    const animations = animatedValues.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay((LOGO_TEXT.length - index - 1) * 100 + 1000),
        ])
      );
    });

    Animated.parallel(animations).start();
  }, []);

  return (
    <View style={styles.container}>
      {LOGO_TEXT.split('').map((char, index) => {
        const translateY = animatedValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        });

        const scale = animatedValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.1],
        });

        return (
          <Animated.Text
            key={index}
            style={[
              styles.letter,
              {
                color: LOGO_COLORS[index % LOGO_COLORS.length],
                transform: [{ translateY }, { scale }],
              },
            ]}
          >
            {char}
          </Animated.Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  letter: {
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});



