import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Modal, Pressable,
} from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';

// ── BUTTON ─────────────────────────────────────────────────
export function Btn({ label, onPress, color, variant = 'solid', icon, small, disabled, style }) {
  const bg    = variant === 'solid' ? (color || COLORS.accent) : 'transparent';
  const bd    = variant === 'outline' ? (color || COLORS.accent) : 'transparent';
  const cl    = variant === 'solid' ? '#fff' : (color || COLORS.accent);
  const pad   = small ? { paddingHorizontal: 14, paddingVertical: 7 } : { paddingHorizontal: 20, paddingVertical: 11 };
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[{
        backgroundColor: bg, borderWidth: 1, borderColor: bd,
        borderRadius: RADIUS.md, flexDirection: 'row', alignItems: 'center',
        gap: 6, opacity: disabled ? 0.5 : 1, ...pad,
      }, style]}
    >
      {icon && <Text style={{ fontSize: small ? 13 : 15 }}>{icon}</Text>}
      <Text style={{ color: cl, fontWeight: '700', fontSize: small ? 12 : 14 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── INPUT ──────────────────────────────────────────────────
export function Input({ label, value, onChangeText, placeholder, multiline, numberOfLines, style, inputStyle, secureTextEntry }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label && <Text style={s.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textDim}
        multiline={multiline}
        numberOfLines={numberOfLines}
        secureTextEntry={secureTextEntry}
        style={[s.input, multiline && { height: (numberOfLines || 4) * 22, textAlignVertical: 'top' }, inputStyle]}
      />
    </View>
  );
}

// ── SELECT PICKER (sheet-style) ────────────────────────────
export function Select({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={s.label}>{label}</Text>}
      <TouchableOpacity onPress={() => setOpen(true)} style={s.select}>
        <Text style={{ color: COLORS.text, fontSize: 14 }}>{current?.label || 'Select...'}</Text>
        <Text style={{ color: COLORS.textMuted }}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{label}</Text>
            {options.map(opt => (
              <TouchableOpacity key={opt.value} onPress={() => { onChange(opt.value); setOpen(false); }}
                style={[s.sheetOption, value === opt.value && { backgroundColor: COLORS.accent + '22' }]}>
                <Text style={{ color: value === opt.value ? COLORS.accent : COLORS.text, fontWeight: value === opt.value ? '700' : '400', fontSize: 15 }}>
                  {opt.label}
                </Text>
                {value === opt.value && <Text style={{ color: COLORS.accent }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── TAG ────────────────────────────────────────────────────
export function Tag({ label, color = COLORS.accent, onRemove }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: color + '22',
      borderWidth: 1, borderColor: color + '55', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginRight: 6, marginBottom: 4 }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} style={{ marginLeft: 5 }}>
          <Text style={{ color, opacity: 0.7, fontSize: 13 }}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── BADGE ──────────────────────────────────────────────────
export function Badge({ label, color }) {
  return (
    <View style={{ backgroundColor: color + '22', borderWidth: 1, borderColor: color + '55',
      borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

// ── LOADING ────────────────────────────────────────────────
export function Loader({ text }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      {text && <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>{text}</Text>}
    </View>
  );
}

// ── EMPTY STATE ────────────────────────────────────────────
export function Empty({ icon, title, subtitle, action, actionLabel }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
      <Text style={{ fontSize: 48, opacity: 0.3 }}>{icon || '📭'}</Text>
      <Text style={{ color: COLORS.textMuted, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
      {subtitle && <Text style={{ color: COLORS.textDim, fontSize: 13, textAlign: 'center' }}>{subtitle}</Text>}
      {action && <Btn label={actionLabel || 'Create'} onPress={action} color={COLORS.accent} style={{ marginTop: 8 }} />}
    </View>
  );
}

// ── DIVIDER ────────────────────────────────────────────────
export function Divider({ style }) {
  return <View style={[{ height: 1, backgroundColor: COLORS.border, marginVertical: 8 }, style]} />;
}

// ── CARD ───────────────────────────────────────────────────
export function Card({ children, style, onPress }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap activeOpacity={0.8} onPress={onPress}
      style={[{ backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 8 }, SHADOW, style]}>
      {children}
    </Wrap>
  );
}

// ── HEADER ─────────────────────────────────────────────────
export function ScreenHeader({ title, subtitle, left, right }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
      flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {left}
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '800' }}>{title}</Text>
        {subtitle && <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 11, color: COLORS.textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, color: COLORS.text, padding: 10, fontSize: 14,
  },
  select: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface2, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: 20, paddingBottom: 36,
  },
  sheetTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  sheetOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: RADIUS.sm, marginBottom: 2,
  },
});
