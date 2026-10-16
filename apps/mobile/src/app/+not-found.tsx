import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>Nothing out here.</Text>
        <Text style={styles.body}>This page doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          Back to home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  body: { color: COLORS.textSecondary, fontSize: 16, marginBottom: 24 },
  link: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
});
