import { formatMoodEntry } from '@/utils/formatMoodEntry';

describe('formatMoodEntry', () => {
  it('formats a basic mood entry correctly', () => {
    const entry = {
      mood: 'happy',
      intensity: 7,
      timestamp: new Date('2024-01-15T10:30:00Z'),
    };

    const formatted = formatMoodEntry(entry);

    expect(formatted).toMatch(/happy/i);
    expect(formatted).toContain('7');
  });

  it('handles different mood types', () => {
    const moods = ['happy', 'sad', 'anxious', 'calm', 'excited'];

    moods.forEach((mood) => {
      const entry = {
        mood,
        intensity: 5,
        timestamp: new Date(),
      };

      const formatted = formatMoodEntry(entry);
      expect(formatted).toMatch(new RegExp(mood, 'i'));
    });
  });

  it('formats intensity levels correctly', () => {
    const entry = {
      mood: 'happy',
      intensity: 10,
      timestamp: new Date(),
    };

    const formatted = formatMoodEntry(entry);
    expect(formatted).toContain('10');
  });

  it('includes timestamp in formatted string', () => {
    const timestamp = new Date('2024-01-15T10:30:00Z');
    const entry = {
      mood: 'happy',
      intensity: 7,
      timestamp,
    };

    const formatted = formatMoodEntry(entry);
    expect(formatted).toContain('2024');
  });

  it('handles entries with notes', () => {
    const entry = {
      mood: 'happy',
      intensity: 7,
      timestamp: new Date(),
      notes: 'Feeling great today!',
    };

    const formatted = formatMoodEntry(entry);
    expect(formatted).toContain('Feeling great today!');
  });

  it('handles missing optional fields', () => {
    const entry = {
      mood: 'happy',
      intensity: 7,
      timestamp: new Date(),
    };

    expect(() => formatMoodEntry(entry)).not.toThrow();
  });

  it('handles edge case intensity values', () => {
    const lowEntry = {
      mood: 'sad',
      intensity: 1,
      timestamp: new Date(),
    };

    const highEntry = {
      mood: 'excited',
      intensity: 10,
      timestamp: new Date(),
    };

    expect(() => formatMoodEntry(lowEntry)).not.toThrow();
    expect(() => formatMoodEntry(highEntry)).not.toThrow();
  });
});

