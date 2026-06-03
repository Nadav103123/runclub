import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { COLORS } from '../constants';

// ── Label ─────────────────────────────────────────────────────────────────────
export function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

// ── Text Input ────────────────────────────────────────────────────────────────
interface FInputProps {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
}

export function FInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  style,
}: FInputProps) {
  return (
    <View style={[styles.fieldWrap, style]}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.text.hint}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlign="right"
        style={[styles.input, multiline && { height: numberOfLines * 22 + 16, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

// ── Segmented Picker (replaces native select) ─────────────────────────────────
interface FPickerProps {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  accent?: string;
}

export function FPicker({ label, value, options, onChange, accent = COLORS.yellow }: FPickerProps) {
  return (
    <View style={styles.fieldWrap}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.pickerRow}>
          {options.map((opt) => {
            const active = value === opt;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => onChange(opt)}
                style={[
                  styles.pickerChip,
                  {
                    backgroundColor: active ? accent + '22' : 'rgba(255,255,255,0.05)',
                    borderColor: active ? accent : 'rgba(255,255,255,0.12)',
                  },
                ]}
              >
                <Text style={[styles.pickerChipText, { color: active ? accent : COLORS.text.secondary }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Submit Button ─────────────────────────────────────────────────────────────
export function SubmitButton({
  label,
  onPress,
  color = COLORS.yellow,
}: {
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.submitBtn, { backgroundColor: color }]}
    >
      <Text style={styles.submitText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Two-column row ────────────────────────────────────────────────────────────
export function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.twoCol}>{children}</View>;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fieldWrap: {
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    color: COLORS.text.muted,
    marginBottom: 3,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: COLORS.text.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 7,
  },
  pickerChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  pickerChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    width: '100%',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  submitText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 14,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 9,
  },
});
