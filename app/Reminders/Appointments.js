import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
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
// Day column width: divide remaining width by 7 (one column per weekday)
const DAY_COL_WIDTH = (width - TIME_COL_WIDTH) / 7;
// Make the month-day item match the column width so the day labels align
const DAY_ITEM_WIDTH = DAY_COL_WIDTH;
const HOUR_HEIGHT = 100;
const HEADER_HEIGHT = 40;

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
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
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

  const getMonthDays = (date) => {
    const days = [];
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    const month = d.getMonth();
    while (d.getMonth() === month) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  const monthDays = getMonthDays(visibleMonth || new Date());
  const monthScrollRef = useRef(null);

  // Center the month/day strip on the selected date (usually today) when the
  // screen is first opened. This ensures the current day is visible by default.
  useEffect(() => {
    if (!monthScrollRef.current) return;
    const index = monthDays.findIndex(d => isSelected(d) || isToday(d));
    if (index >= 0) {
      const x = index * DAY_ITEM_WIDTH - (width / 2) + (DAY_ITEM_WIDTH / 2);
      monthScrollRef.current.scrollTo({ x: Math.max(0, x), animated: false });
    }
  }, []);

  // When events load or selectedDate changes, ensure the time grid is scrolled
  // vertically so events for the selected day are visible. Scroll to the
  // earliest event of the day (with some top padding) or fall back to 8 AM.
  useEffect(() => {
    if (!scrollViewRef.current) return;
    const dayEvents = events.filter(e => {
      const eStart = new Date(e.startDate);
      return eStart.getDate() === selectedDate.getDate() &&
        eStart.getMonth() === selectedDate.getMonth() &&
        eStart.getFullYear() === selectedDate.getFullYear() &&
        !e.allDay;
    });

    if (dayEvents.length > 0) {
      const earliest = dayEvents.reduce((min, e) => {
        return new Date(e.startDate) < new Date(min.startDate) ? e : min;
      }, dayEvents[0]);
      const s = new Date(earliest.startDate);
      const top = (s.getHours() * HOUR_HEIGHT) + ((s.getMinutes() / 60) * HOUR_HEIGHT);
      const offset = Math.max(0, top - HOUR_HEIGHT); // show some context above
      scrollViewRef.current.scrollTo({ y: offset, animated: true });
    } else {
      scrollViewRef.current.scrollTo({ y: 8 * HOUR_HEIGHT, animated: false });
    }
  }, [events, selectedDate]);

  const setCurrentDateToWeekContaining = (date) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - newDate.getDay());
    setCurrentDate(newDate);
    // keep visible month in sync with selected date
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  useEffect(() => {
    if (selectedDate) {
      setCurrentDateToWeekContaining(selectedDate);
    }
  }, [selectedDate]);

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
    const newDate = new Date(visibleMonth);
    newDate.setDate(1);
    newDate.setMonth(newDate.getMonth() + offset);
    setVisibleMonth(newDate);
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

  const monthLabel = visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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

        <View style={styles.content}>
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <ThemedText type="subtitle" style={[styles.monthLabel, { fontFamily: uiFontFamily }]}>{monthLabel}</ThemedText>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Month Days Strip */}
          <View style={styles.monthDaysWrapper}>
            <ScrollView
              ref={monthScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.monthDaysScroll}
            >
              {monthDays.map((day, idx) => {
                const selected = isSelected(day);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.dayItem, selected && styles.dayItemSelected]}
                    onPress={() => { setSelectedDate(day); setCurrentDateToWeekContaining(day); }}
                  >
                    <Text style={[styles.dayItemWeekday, selected && styles.dayItemWeekdaySelected]}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <View style={[styles.dayNumberContainer, isToday(day) && styles.todayCircle, selected && !isToday(day) && styles.selectedCircle]}>
                      <Text style={[styles.dayNumber, isToday(day) && styles.todayText, selected && !isToday(day) && styles.selectedDayNumberText]}>{day.getDate()}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Scrollable Grid */}
          <ScrollView ref={scrollViewRef} style={styles.gridScrollView} contentContainerStyle={styles.gridContent}>
            <View style={styles.gridContainer}>
              {/* Time Column */}
              <View style={styles.timeColumn}>
                <View style={{ height: HEADER_HEIGHT }} />
                {hours.map((hour) => (
                  <View key={hour} style={styles.timeLabelContainer}>
                    <Text style={styles.timeLabel}>
                      {hour === 0 ? '' : hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Days Columns */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                {weekDays.map((day, dayIndex) => (
                  <View key={dayIndex} style={styles.dayColumn}>
                    {/* Header space removed (weekday labels duplicated above). Keep spacing for alignment */}
                    <View style={{ height: HEADER_HEIGHT }} />

                    <View style={{ position: 'relative' }}>
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
                  </View>
                ))}
              </ScrollView>
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
  monthDaysWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  monthDaysScroll: {
    // left padding matches the time column width to align month strip items with the day columns below
    paddingLeft: TIME_COL_WIDTH,
    paddingRight: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dayItem: {
    width: DAY_ITEM_WIDTH,
    alignItems: 'center',
    marginHorizontal: 0,
  },
  dayItemSelected: {
    // subtle background for selected day
  },
  dayItemWeekday: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
  },
  dayItemWeekdaySelected: {
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
    left: 2,
    right: 2,
    borderRadius: 6,
    padding: 4,
    overflow: 'hidden',
  },
  eventTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#000000',
    zIndex: 10,
  },
  currentTimeDot: {
    position: 'absolute',
    left: -4,
    top: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnHeader: {
    height: HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f9fafb',
  },
  columnHeaderDay: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  columnHeaderDateBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadge: {
    backgroundColor: '#10b981',
  },
  columnHeaderDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  todayDateText: {
    color: '#fff',
  },
});
