import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  PanResponder,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import RNCalendarEvents from 'react-native-calendar-events';

const { width } = Dimensions.get('window');
const TIME_COL_WIDTH = 50;
const DAY_COL_WIDTH = (width - TIME_COL_WIDTH) / 7;
const HOUR_HEIGHT = 60;

// Simple Appointments screen implementing the requirements from docs/reminder-redesign.md (section 5)
export default function Appointments() {
  const handleBack = () => router.back();

  const uiFontFamily = Platform.select({ ios: 'AtkinsonHyperlegible', android: 'AtkinsonHyperlegible', default: undefined });

  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  useEffect(() => {
    // Scroll to 8 AM roughly on mount
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollTo({ y: 8 * HOUR_HEIGHT, animated: false });
      }, 100);
    }
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50) {
          changeWeek(-1);
        } else if (gestureState.dx < -50) {
          changeWeek(1);
        }
      },
    })
  ).current;

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Request permissions if needed
      const permission = await RNCalendarEvents.requestPermissions();

      if (permission !== 'authorized') {
        Alert.alert(
          'Permission Required',
          'Calendar access is required to display your appointments. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        setLoading(false);
        return;
      }

      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const allEvents = await RNCalendarEvents.fetchAllEvents(
        startOfWeek.toISOString(),
        endOfWeek.toISOString()
      );
      setEvents(allEvents);
    } catch (e) {
      console.log('Error fetching events', e);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const days = [];
    const start = new Date(currentDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const changeWeek = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + offset);
    setCurrentDate(newDate);
  };

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setDate(1);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const renderEventsForDay = (day) => {
    const dayEvents = events.filter(e => {
      const eStart = new Date(e.startDate);
      return eStart.getDate() === day.getDate() &&
             eStart.getMonth() === day.getMonth() &&
             eStart.getFullYear() === day.getFullYear() &&
             !e.allDay;
    });

    return dayEvents.map((event, index) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const startHours = start.getHours();
      const startMinutes = start.getMinutes();
      const top = (startHours * HOUR_HEIGHT) + ((startMinutes / 60) * HOUR_HEIGHT);
      let duration = (end - start) / (1000 * 60); // minutes
      if (duration < 30) duration = 30; // Minimum visual height
      const height = (duration / 60) * HOUR_HEIGHT;

      return (
        <View
          key={index}
          style={[
            styles.eventCard,
            {
              top,
              height: height - 2,
              backgroundColor: event.calendar?.color || '#3b82f6',
            }
          ]}
        >
          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        </View>
      );
    });
  };

  const monthLabel = weekDays[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} accessibilityLabel="Back">
            <Ionicons name='arrow-back' size={24} color="#10b981" />
          </TouchableOpacity>
          <ThemedText type="title" style={[styles.headerTitle, { fontFamily: uiFontFamily }]}>Appointments</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content} {...panResponder.panHandlers}>
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <ThemedText type="subtitle" style={[styles.monthLabel, { fontFamily: uiFontFamily }]}>{monthLabel}</ThemedText>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {/* Week Header */}
          <View style={styles.weekHeader}>
            <View style={{ width: TIME_COL_WIDTH }} />
            {weekDays.map((day, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.dayHeader}
                onPress={() => {
                  setSelectedDate(day);
                  setCurrentDate(day);
                }}
              >
                <Text style={[styles.dayName, isSelected(day) && styles.selectedDayText]}>{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</Text>
                <View style={[
                  styles.dayNumberContainer, 
                  isToday(day) && styles.todayCircle,
                  isSelected(day) && !isToday(day) && styles.selectedCircle
                ]}>
                  <Text style={[styles.dayNumber, isToday(day) && styles.todayText, isSelected(day) && !isToday(day) && styles.selectedDayNumberText]}>{day.getDate()}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Scrollable Grid */}
          <ScrollView ref={scrollViewRef} style={styles.gridScrollView} contentContainerStyle={styles.gridContent}>
            <View style={styles.gridContainer}>
              {/* Time Column */}
              <View style={styles.timeColumn}>
                {hours.map((hour) => (
                  <View key={hour} style={styles.timeLabelContainer}>
                    <Text style={styles.timeLabel}>
                      {hour === 0 ? '' : hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Days Columns */}
              {weekDays.map((day, dayIndex) => (
                <View key={dayIndex} style={styles.dayColumn}>
                  {/* Grid Lines */}
                  {hours.map((hour) => (
                    <View key={hour} style={styles.gridCell} />
                  ))}
                  
                  {/* Events */}
                  {renderEventsForDay(day)}
                  
                  {/* Current Time Indicator (if today) */}
                  {isToday(day) && (
                    <View 
                      style={[
                        styles.currentTimeLine, 
                        { top: (new Date().getHours() * HOUR_HEIGHT) + ((new Date().getMinutes() / 60) * HOUR_HEIGHT) }
                      ]} 
                    >
                      <View style={styles.currentTimeDot} />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
          
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#10b981" />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    color: '#111827',
  },
  navButton: {
    padding: 4,
  },
  weekHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingVertical: 8,
  },
  dayHeader: {
    width: DAY_COL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayName: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayNumberContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: '#1a73e8',
  },
  dayNumber: {
    fontSize: 16,
    color: '#333',
  },
  todayText: {
    color: '#fff',
    fontWeight: '600',
  },
  selectedCircle: {
    backgroundColor: '#e0f2fe',
  },
  selectedDayText: {
    color: '#1a73e8',
    fontWeight: '600',
  },
  selectedDayNumberText: {
    color: '#1a73e8',
    fontWeight: '600',
  },
  gridScrollView: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 40,
  },
  gridContainer: {
    flexDirection: 'row',
  },
  timeColumn: {
    width: TIME_COL_WIDTH,
  },
  timeLabelContainer: {
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start', // Align time to top of line
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 10,
    color: '#666',
    transform: [{ translateY: -6 }], // Shift up to align with grid line
  },
  dayColumn: {
    width: DAY_COL_WIDTH,
    borderLeftWidth: 1,
    borderLeftColor: '#f0f0f0',
  },
  gridCell: {
    height: HOUR_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventCard: {
    position: 'absolute',
    left: 1,
    right: 1,
    borderRadius: 4,
    padding: 2,
    overflow: 'hidden',
  },
  eventTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#ea4335',
    zIndex: 10,
  },
  currentTimeDot: {
    position: 'absolute',
    left: -4,
    top: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea4335',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
