import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { hapticSelection } from "@/services/haptics";
import { Image } from "expo-image";

const { width, height } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    image: require("../../assets/images/welcome_fomo_2.png"), // city journey - person running through city
    title: "Everyone Is Already Out",
    subtitle: "Your ends are moving without you. Find your pack. Hit the streets.",
  },
  {
    id: "2",
    image: require("../../assets/images/welcome_fomo_1.png"), // group street run
    title: "Run Clubs Are Taking Over",
    subtitle: "London's most active crews. Real people, real pace. Don't show up late.",
  },
  {
    id: "3",
    image: require("../../assets/images/welcome_fomo_3.png"), // neon runner
    title: "The Blocks Never Sleep",
    subtitle: "Check-ins, challenges, XP drops. The game's live 24/7. Are you on it?",
  },
  {
    id: "4",
    image: require("../../assets/images/welcome_fomo_4.png"), // urban background
    title: "Earn Your Reputation",
    subtitle: "Streak. Rank. Battle. Every road you run cements your name on the board.",
  },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = (event) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(xOffset / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
      hapticSelection();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" />

      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={{ width, height }}>
            <ImageBackground
              source={slide.image}
              style={{ flex: 1 }}
              resizeMode="cover"
            >
              {/* Top Logo */}
              <View style={{ paddingTop: insets.top + 20, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 6, textTransform: "uppercase" }}>
                  OUT HERE
                </Text>
              </View>

              {/* Gradient: rises much higher, goes full black by 55% from the bottom */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.92)", "#000"]}
                locations={[0, 0.3, 0.6, 0.85]}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: height * 0.72,
                  justifyContent: "flex-end",
                  paddingBottom: insets.bottom + 240,
                  paddingHorizontal: 28,
                }}
              >
                <Text style={{
                  color: "#fff",
                  fontSize: 32,
                  fontWeight: "900",
                  textAlign: "center",
                  marginBottom: 12,
                  letterSpacing: -0.8,
                  lineHeight: 38,
                }}>
                  {slide.title}
                </Text>
                <Text style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 15,
                  textAlign: "center",
                  lineHeight: 23,
                  fontWeight: "400",
                }}>
                  {slide.subtitle}
                </Text>
              </LinearGradient>
            </ImageBackground>
          </View>
        ))}
      </ScrollView>

      {/* Sticky Bottom Interface */}
      <View style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 20,
      }}>
        {/* Pagination Dots */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 30 }}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: currentIndex === index ? "#fff" : "rgba(255,255,255,0.3)",
                marginHorizontal: 4,
              }}
            />
          ))}
        </View>

        {/* Buttons */}
        <TouchableOpacity
          onPress={() => { hapticSelection(); router.push("/onboarding"); }}
          style={{
            backgroundColor: "#00ff7f", // Brand Green
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#000", fontSize: 16, fontWeight: "700" }}>
            Create Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { hapticSelection(); router.push("/onboarding"); }}
          style={{
            backgroundColor: "rgba(255,255,255,0.15)", // Translucent grey
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
