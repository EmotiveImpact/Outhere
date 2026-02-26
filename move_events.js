const fs = require('fs');

// 1. READ INDEX.JSX
let indexFile = fs.readFileSync('apps/mobile/src/app/(tabs)/index.jsx', 'utf8');

const fallbackEventsBlock = `
const fallbackEvents = [
  {
    id: "event-1",
    title: "10k on Sunday",
    image_url:
      "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=600&h=300&fit=crop",
    participant_count: 35,
  },
  {
    id: "event-2",
    title: "Trail Run",
    image_url:
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=300&fit=crop",
    participant_count: 22,
  },
];`;

const eventsVarBlock = `
  const events = Array.isArray(data?.events) && data.events.length > 0
    ? data.events
    : fallbackEvents;`;

const eventsJsxBlock = `
        {/* ── EVENTS ── */}
        <View style={{ marginTop: 36 }}>
          <Text
            style={{
              color: "#fff",
              fontSize: 20,
              fontWeight: "700",
              paddingHorizontal: 20,
              marginBottom: 18,
            }}
          >
            Upcoming Events
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
          >
            {events.map((event, index) => (
              <View
                key={event.id || \`event-\${index}\`}
                style={{
                  width: 300,
                  height: 200,
                  borderRadius: 20,
                  overflow: "hidden",
                }}
              >
                <Image
                  source={{ uri: event.image_url || event.image }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.9)"]}
                  locations={[0.1, 1]}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: "space-between",
                    padding: 20,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>
                    {event.title}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#00ff7f",
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 25,
                      }}
                    >
                      <Text style={{ color: "#000", fontSize: 15, fontWeight: "800" }}>
                        Enroll now
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                      {(event.participant_count ?? event.participants ?? 0)} joined
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        </View>
`;

// Remove from index
indexFile = indexFile.replace(fallbackEventsBlock, '');
indexFile = indexFile.replace(eventsVarBlock, '');
indexFile = indexFile.replace(eventsJsxBlock, '');

// Clean up double newlines
indexFile = indexFile.replace(/\n\n\n/g, '\n\n');
fs.writeFileSync('apps/mobile/src/app/(tabs)/index.jsx', indexFile);


// 2. Add to challenges.jsx
let chalFile = fs.readFileSync('apps/mobile/src/app/(tabs)/challenges.jsx', 'utf8');

// Insert fallbackEvents below fallbackFriends
chalFile = chalFile.replace(
  `const fallbackFriends = [
  { id: "1", name: "Sarah", avatar_url: "https://i.pravatar.cc/150?img=1" },
  { id: "2", name: "Mike", avatar_url: "https://i.pravatar.cc/150?img=2" },
  { id: "3", name: "Jazz", avatar_url: "https://i.pravatar.cc/150?img=3" },
  { id: "4", name: "Kobe", avatar_url: "https://i.pravatar.cc/150?img=4" },
  { id: "5", name: "Lena", avatar_url: "https://i.pravatar.cc/150?img=5" },
];`,
  `const fallbackFriends = [
  { id: "1", name: "Sarah", avatar_url: "https://i.pravatar.cc/150?img=1" },
  { id: "2", name: "Mike", avatar_url: "https://i.pravatar.cc/150?img=2" },
  { id: "3", name: "Jazz", avatar_url: "https://i.pravatar.cc/150?img=3" },
  { id: "4", name: "Kobe", avatar_url: "https://i.pravatar.cc/150?img=4" },
  { id: "5", name: "Lena", avatar_url: "https://i.pravatar.cc/150?img=5" },
];

const fallbackEvents = [
  {
    id: "event-1",
    title: "10k on Sunday",
    image_url:
      "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=600&h=300&fit=crop",
    participant_count: 35,
  },
  {
    id: "event-2",
    title: "Trail Run",
    image_url:
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=300&fit=crop",
    participant_count: 22,
  },
];`
);

// We need LinearGradient import in challenges.jsx
if (!chalFile.includes('expo-linear-gradient')) {
  chalFile = chalFile.replace(
    'import { Image } from "expo-image";',
    'import { Image } from "expo-image";\nimport { LinearGradient } from "expo-linear-gradient";'
  );
}

// Insert events var definition
chalFile = chalFile.replace(
  'const challenges = [',
  `const events = fallbackEvents;

  const challenges = [`
);

// Insert JSX above <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.5, marginTop: 24, marginBottom: 16 }}>Daily Challenges</Text>
// Let's place it right before Daily Challenges.
chalFile = chalFile.replace(
  `        {/* ── DAILY CHALLENGES SECTION ── */}`,
  `        {/* ── EVENTS ── */}
        <View style={{ marginBottom: 36, marginTop: 12 }}>
          <Text
            style={{
              color: "#fff",
              fontSize: 20,
              fontWeight: "800",
              letterSpacing: -0.5,
              marginBottom: 16,
            }}
          >
            Upcoming Events
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 14 }}
            snapToInterval={314}
            decelerationRate="fast"
          >
            {events.map((event, index) => (
              <View
                key={event.id}
                style={{
                  width: 300,
                  height: 200,
                  borderRadius: 24,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                }}
              >
                <Image
                  source={{ uri: event.image_url || event.image }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.95)"]}
                  locations={[0.2, 1]}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: "space-between",
                    padding: 20,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: -0.5 }}>
                    {event.title}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                    }}
                  >
                    <View>
                      <Text style={{ color: "#00ff7f", fontSize: 13, fontWeight: "700", marginBottom: 4 }}>
                        {event.participant_count} joined
                      </Text>
                      <TouchableOpacity
                        style={{
                          backgroundColor: "#fff",
                          paddingHorizontal: 20,
                          paddingVertical: 10,
                          borderRadius: 20,
                        }}
                      >
                        <Text style={{ color: "#000", fontSize: 14, fontWeight: "800" }}>
                          Enroll →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── DAILY CHALLENGES SECTION ── */}`
);

fs.writeFileSync('apps/mobile/src/app/(tabs)/challenges.jsx', chalFile);
console.log('Script executed');
