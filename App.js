import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';
import { COLORS, RADIUS } from './src/utils/theme';
import { getDB } from './src/utils/database';
import { requestPermissions, addResponseListener } from './src/utils/notifications';

import NotebooksScreen  from './src/screens/NotebooksScreen';
import NotesListScreen  from './src/screens/NotesListScreen';
import NoteEditorScreen from './src/screens/NoteEditorScreen';
import TasksScreen      from './src/screens/TasksScreen';
import SettingsScreen   from './src/screens/SettingsScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const NAV_THEME = {
  dark: true,
  colors: {
    primary:    COLORS.accent,
    background: COLORS.bg,
    card:       COLORS.surface,
    text:       COLORS.text,
    border:     COLORS.border,
    notification: COLORS.accent2,
  },
};

const SCREEN_OPTS = {
  headerStyle:       { backgroundColor: COLORS.surface },
  headerTintColor:   COLORS.text,
  headerTitleStyle:  { fontWeight: '700', color: COLORS.text },
  cardStyle:         { backgroundColor: COLORS.bg },
};

function NotesStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTS}>
      <Stack.Screen name="Notebooks" component={NotebooksScreen} options={{ title: 'NoteSync' }} />
      <Stack.Screen name="Notes"     component={NotesListScreen} options={({ route }) => ({ title: route.params?.notebookName || 'Notes' })} />
      <Stack.Screen name="NoteEditor" component={NoteEditorScreen} options={({ route }) => ({ title: 'Edit Note', headerBackTitle: 'Back' })} />
    </Stack.Navigator>
  );
}

function TabIcon({ emoji, label, focused }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
      <Text style={{ fontSize: 9, color: focused ? COLORS.accent : COLORS.textDim, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export default function App() {
  useEffect(() => {
    // Init DB
    getDB().catch(console.error);
    // Request notification permissions
    requestPermissions();
    // Handle notification tap
    const sub = addResponseListener(response => {
      const taskId = response.notification.request.content.data?.taskId;
      // Navigation to task detail can be added here via navigationRef
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={NAV_THEME}>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: COLORS.surface,
              borderTopColor: COLORS.border,
              borderTopWidth: 1,
              paddingBottom: 8,
              paddingTop: 6,
              height: 62,
            },
            tabBarShowLabel: false,
          }}
        >
          <Tab.Screen
            name="NotesTab"
            component={NotesStack}
            options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📓" label="Notes" focused={focused} /> }}
          />
          <Tab.Screen
            name="Tasks"
            component={TasksScreen}
            options={{
              tabBarIcon: ({ focused }) => <TabIcon emoji="✅" label="Tasks" focused={focused} />,
              header: () => null,
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="Settings" focused={focused} /> }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
