import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { formatTime12, parseTime } from '@/lib/routine';
import { useTheme } from '@/theme/ThemeContext';
import { radii, weight650 } from '@/theme/tokens';

interface TimeStepperFieldProps {
  time: string;
  onChange: (time: string) => void;
  onClose?: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));
const MERIDIEMS = ['AM', 'PM'];

function to12(hour24: number): { hour12: number; meridiem: 'AM' | 'PM' } {
  const meridiem = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, meridiem };
}

function to24(hour12: number, meridiem: 'AM' | 'PM'): number {
  const h = hour12 % 12;
  return meridiem === 'PM' ? h + 12 : h;
}

// Tap-to-open drag wheel picker. Storage stays 24h "HH:MM" (for sorting and
// notifications), but the picker itself shows 12h + AM/PM since a wheel makes
// the format unambiguous without needing 24h to rule out guessing.
export function TimeStepperField({ time, onChange, onClose }: TimeStepperFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const parsed = parseTime(time);
  const hour24 = parsed ? parsed.hour : 0;
  const minute = parsed ? parsed.minute : 0;
  const { hour12, meridiem } = to12(hour24);

  function close() {
    setOpen(false);
    onClose?.();
  }

  function commitHour(idx: number) {
    onChange(`${pad(to24(idx + 1, meridiem))}:${pad(minute)}`);
  }
  function commitMinute(idx: number) {
    onChange(`${pad(hour24)}:${pad(idx)}`);
  }
  function commitMeridiem(idx: number) {
    const newMeridiem = idx === 0 ? 'AM' : 'PM';
    onChange(`${pad(to24(hour12, newMeridiem))}:${pad(minute)}`);
  }

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.pill, { backgroundColor: theme.s2, borderColor: theme.border2 }]}
      >
        <Text style={[styles.pillText, { color: theme.text }]}>{formatTime12(time)}</Text>
      </Pressable>
      <Modal transparent visible={open} animationType="none" onRequestClose={close}>
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={close} />
          <View style={[styles.centerWrap, { pointerEvents: 'box-none' }]}>
            <View style={[styles.card, { backgroundColor: theme.s1, borderColor: theme.border }]}>
              <View style={styles.wheelRow}>
                <View style={[styles.selectionBand, { backgroundColor: theme.greenDim, borderColor: theme.greenMid }]} />
                <WheelColumn items={HOURS} index={hour12 - 1} onCommit={commitHour} loop />
                <Text style={[styles.colon, { color: theme.muted }]}>:</Text>
                <WheelColumn items={MINUTES} index={minute} onCommit={commitMinute} loop />
                <WheelColumn items={MERIDIEMS} index={meridiem === 'AM' ? 0 : 1} onCommit={commitMeridiem} />
              </View>
              <Pressable
                onPress={close}
                style={[styles.doneBtn, { backgroundColor: theme.greenDim, borderColor: theme.greenMid }]}
              >
                <Text style={[styles.doneBtnText, { color: theme.green }]}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ITEM_HEIGHT = 60;
const VISIBLE_COUNT = 3;
const PAD_COUNT = Math.floor(VISIBLE_COUNT / 2);
// Looping columns render this many back-to-back copies of the values, giving
// enough buffer that a single strong fling never reaches the real start/end of
// the rendered list. Re-centering onto the middle copy only ever happens once
// scrolling has fully stopped (see handleScroll) — nudging scrollTop mid-fling,
// even onto pixel-identical content, visibly hitches the browser's own momentum.
const LOOP_COPIES = 11;
const MIDDLE_COPY = Math.floor(LOOP_COPIES / 2);

const wrapIndex = (raw: number, len: number) => ((raw % len) + len) % len;

function triggerTickHaptic() {
  Haptics.selectionAsync().catch(() => {});
}

interface WheelColumnProps {
  items: string[];
  index: number;
  onCommit: (index: number) => void;
  loop?: boolean;
}

function WheelColumn({ items, index, onCommit, loop = false }: WheelColumnProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const didInit = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTickIndex = useRef(index);

  function baseOffsetFor(i: number) {
    return loop ? (MIDDLE_COPY * items.length + i) * ITEM_HEIGHT : i * ITEM_HEIGHT;
  }

  // `onLayout` never fires for a ScrollView nested in a Modal on web in this RNW
  // version, so the initial position is set on mount instead — the offset is
  // computed purely from known constants, no measured layout is actually needed.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    scrollRef.current?.scrollTo({ y: baseOffsetFor(index), animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);

  // react-native-web's ScrollView never fires onMomentumScrollEnd/onScrollEndDrag
  // (dead props there) and ignores snapToInterval, so both the live commit and the
  // final snap are driven from onScroll alone, with our own debounce for "settled".
  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;

    const rawIndex = Math.round(y / ITEM_HEIGHT);
    const nearest = loop ? wrapIndex(rawIndex, items.length) : Math.max(0, Math.min(items.length - 1, rawIndex));

    if (nearest !== lastTickIndex.current) {
      lastTickIndex.current = nearest;
      triggerTickHaptic();
    }
    onCommit(nearest);

    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      // Only touch scrollTop once motion has fully stopped — nudging it mid-fling,
      // even onto pixel-identical content in another copy, visibly hitches momentum.
      if (loop) {
        const spanHeight = items.length * ITEM_HEIGHT;
        const relative = ((y % spanHeight) + spanHeight) % spanHeight;
        const recenteredY = MIDDLE_COPY * spanHeight + relative;
        if (recenteredY !== y) {
          scrollRef.current?.scrollTo({ y: recenteredY, animated: false });
        }
      }
      scrollRef.current?.scrollTo({ y: baseOffsetFor(nearest), animated: true });
    }, 120);
  }

  const renderedItems = loop ? Array.from({ length: LOOP_COPIES }, () => items).flat() : items;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.wheelCol}
      showsVerticalScrollIndicator={false}
      decelerationRate="normal"
      scrollEventThrottle={16}
      onScroll={handleScroll}
      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PAD_COUNT }}
    >
      {renderedItems.map((label, i) => (
        <View key={i} style={styles.wheelItem}>
          <Text style={[styles.wheelText, { color: theme.muted }]}>{label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pill: { minWidth: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 8 },
  pillText: { fontSize: 12.5, fontVariant: ['tabular-nums'], fontWeight: '500' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.6)' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { borderRadius: radii.card, borderWidth: 1, padding: 16, alignItems: 'center' },
  wheelRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  wheelCol: { height: ITEM_HEIGHT * VISIBLE_COUNT, width: 56 },
  wheelItem: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  wheelText: { fontSize: 26, fontWeight: weight650, fontVariant: ['tabular-nums'] },
  // A single hairline-bordered band spanning the whole row, not per-column —
  // the classic wheel-picker "selection lens" look, instead of glowing the text.
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * PAD_COUNT,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    pointerEvents: 'none',
  },
  colon: { fontSize: 24, fontWeight: '600', marginHorizontal: -4 },
  doneBtn: { marginTop: 14, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1 },
  doneBtnText: { fontSize: 13, fontWeight: '600' },
});
